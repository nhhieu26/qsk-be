import { describe, expect, it } from "vitest";
import { api, createProduct, loginAs } from "./helpers.js";

async function setup(initialStock = 20) {
  const { cookie } = await loginAs();
  const product = await createProduct(cookie, { initialStock });
  return { client: api(cookie), cookie, product };
}

describe("POST /stock/imports", () => {
  it("cộng tồn, ghi thẻ kho với số phiếu và ghi chú", async () => {
    const { client, product } = await setup();
    const res = await client.post("/stock/imports", {
      productId: product.id,
      quantity: 10,
      reference: "PN-001",
      note: "Nhập từ công ty đợt 1",
      supplier: "Công ty Midu",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.product.stock).toBe(30);

    const moves = (await client.get(`/stock/movements?productId=${product.id}`)).body.data.movements;
    expect(moves[0]).toMatchObject({
      type: "import",
      quantity: 10,
      before: 20,
      after: 30,
      reference: "PN-001",
      reason: "Nhập từ công ty đợt 1",
      counterparty: "Công ty Midu",
    });
  });

  it("có đơn giá nhập thì cập nhật giá nhập của sản phẩm", async () => {
    const { client, product } = await setup();
    const res = await client.post("/stock/imports", {
      productId: product.id,
      quantity: 5,
      unitPrice: 220_000,
    });
    expect(res.body.data.product.costPrice).toBe(220_000);
  });

  it("từ chối số lượng <= 0 hoặc lẻ", async () => {
    const { client, product } = await setup();
    const zero = await client.post("/stock/imports", { productId: product.id, quantity: 0 });
    const decimal = await client.post("/stock/imports", { productId: product.id, quantity: 1.5 });
    expect(zero.status).toBe(400);
    expect(decimal.status).toBe(400);
  });

  it("sản phẩm không tồn tại trả 404", async () => {
    const { client } = await setup();
    const res = await client.post("/stock/imports", {
      productId: "65f000000000000000000000",
      quantity: 1,
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /stock/adjustments", () => {
  it("huỷ hàng trừ tồn", async () => {
    const { client, product } = await setup();
    const res = await client.post("/stock/adjustments", {
      productId: product.id,
      type: "disposal",
      quantity: 3,
      reason: "Hộp bị móp",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.product.stock).toBe(17);
  });

  it("không cho trừ quá tồn, tồn giữ nguyên", async () => {
    const { client, product } = await setup(5);
    const res = await client.post("/stock/adjustments", {
      productId: product.id,
      type: "gift",
      quantity: 6,
      reason: "Tặng khách",
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain("còn 5");

    const after = await client.get(`/products/${product.id}`);
    expect(after.body.data.product.stock).toBe(5);
  });

  it("cho mượn trừ tồn và tạo lượt mượn trên sản phẩm", async () => {
    const { client, product } = await setup();
    const res = await client.post("/stock/adjustments", {
      productId: product.id,
      type: "loan",
      quantity: 2,
      reason: "Trưng bày",
      counterparty: "Điểm Hà Đông",
    });

    expect(res.status).toBe(200);
    const updated = res.body.data.product;
    expect(updated.stock).toBe(18);
    expect(updated.loans).toHaveLength(1);
    expect(updated.loans[0]).toMatchObject({ borrower: "Điểm Hà Đông", quantity: 2, note: "Trưng bày" });
    expect(updated.loans[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("cho mượn bắt buộc có người mượn", async () => {
    const { client, product } = await setup();
    const res = await client.post("/stock/adjustments", {
      productId: product.id,
      type: "loan",
      quantity: 2,
      reason: "Trưng bày",
    });
    expect(res.status).toBe(400);
  });

  it("bắt buộc ghi lý do", async () => {
    const { client, product } = await setup();
    const res = await client.post("/stock/adjustments", {
      productId: product.id,
      type: "disposal",
      quantity: 1,
      reason: "  ",
    });
    expect(res.status).toBe(400);
  });

  it("kiểm kê đặt tồn bằng số đếm được", async () => {
    const { client, product } = await setup();
    const res = await client.post("/stock/adjustments", {
      productId: product.id,
      type: "stocktake",
      countedQuantity: 17,
      reason: "Đếm lại thiếu 3",
    });
    expect(res.body.data.product.stock).toBe(17);

    const moves = (await client.get(`/stock/movements?productId=${product.id}`)).body.data.movements;
    expect(moves[0]).toMatchObject({ type: "stocktake", quantity: -3, before: 20, after: 17 });
  });

  it("kiểm kê không lệch thì báo lỗi, không ghi thẻ kho", async () => {
    const { client, product } = await setup();
    const res = await client.post("/stock/adjustments", {
      productId: product.id,
      type: "stocktake",
      countedQuantity: 20,
      reason: "Đếm lại",
    });
    expect(res.status).toBe(400);
  });

  it("các lệnh trừ đồng thời không làm tồn âm", async () => {
    const { client, product } = await setup(5);
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        client.post("/stock/adjustments", {
          productId: product.id,
          type: "disposal",
          quantity: 1,
          reason: "Hỏng",
        }),
      ),
    );

    expect(results.filter((r) => r.status === 200)).toHaveLength(5);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);
    const after = await client.get(`/products/${product.id}`);
    expect(after.body.data.product.stock).toBe(0);
  });
});

describe("POST /stock/loans/:loanId/returns", () => {
  async function withLoan() {
    const ctx = await setup();
    const res = await ctx.client.post("/stock/adjustments", {
      productId: ctx.product.id,
      type: "loan",
      quantity: 3,
      reason: "Trưng bày",
      counterparty: "Điểm Hà Đông",
    });
    return { ...ctx, loanId: res.body.data.product.loans[0].id as string };
  }

  it("trả một phần: cộng tồn, giảm số đang mượn", async () => {
    const { client, product, loanId } = await withLoan();
    const res = await client.post(`/stock/loans/${loanId}/returns`, {
      productId: product.id,
      quantity: 1,
      note: "Hộp còn nguyên",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.product.stock).toBe(18);
    expect(res.body.data.product.loans[0].quantity).toBe(2);

    const moves = (await client.get(`/stock/movements?productId=${product.id}`)).body.data.movements;
    expect(moves[0]).toMatchObject({ type: "return", quantity: 1, counterparty: "Điểm Hà Đông" });
  });

  it("trả hết thì lượt mượn biến mất", async () => {
    const { client, product, loanId } = await withLoan();
    const res = await client.post(`/stock/loans/${loanId}/returns`, {
      productId: product.id,
      quantity: 3,
    });
    expect(res.body.data.product.loans).toEqual([]);
    expect(res.body.data.product.stock).toBe(20);
  });

  it("không trả quá số đang mượn", async () => {
    const { client, product, loanId } = await withLoan();
    const res = await client.post(`/stock/loans/${loanId}/returns`, {
      productId: product.id,
      quantity: 4,
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("1 đến 3");
  });
});

describe("POST /stock/stocktakes", () => {
  it("chỉ điều chỉnh mặt hàng lệch, trả số mặt đã chỉnh", async () => {
    const { cookie } = await loginAs();
    const client = api(cookie);
    const a = await createProduct(cookie, { name: "Sản phẩm A", initialStock: 10 });
    const b = await createProduct(cookie, { name: "Sản phẩm B", initialStock: 5 });

    const res = await client.post("/stock/stocktakes", {
      counts: [
        { productId: a.id, countedQuantity: 8 },
        { productId: b.id, countedQuantity: 5 },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ adjustedCount: 1 });
    const products = (await client.get("/products")).body.data.products;
    expect(products.map((p: { stock: number }) => p.stock)).toEqual([8, 5]);

    const moves = (await client.get(`/stock/movements?productId=${a.id}`)).body.data.movements;
    expect(moves[0]).toMatchObject({ type: "stocktake", quantity: -2, reason: "Kiểm kê cả kho" });
  });

  it("từ chối danh sách trùng sản phẩm", async () => {
    const { cookie } = await loginAs();
    const a = await createProduct(cookie);
    const res = await api(cookie).post("/stock/stocktakes", {
      counts: [
        { productId: a.id, countedQuantity: 1 },
        { productId: a.id, countedQuantity: 2 },
      ],
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /stock/movements", () => {
  it("mới nhất trước, lọc theo quầy", async () => {
    const shopA = await loginAs({ shopId: "shop-a" });
    const shopB = await loginAs({ shopId: "shop-b" });
    const product = await createProduct(shopA.cookie, { initialStock: 1 });
    await createProduct(shopB.cookie, { initialStock: 1 });
    await api(shopA.cookie).post("/stock/imports", { productId: product.id, quantity: 2 });

    const res = await api(shopA.cookie).get("/stock/movements");
    expect(res.status).toBe(200);
    const moves = res.body.data.movements;
    expect(moves).toHaveLength(2);
    expect(moves.map((m: { quantity: number }) => m.quantity)).toEqual([2, 1]);
  });
});
