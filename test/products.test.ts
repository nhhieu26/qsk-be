import { describe, expect, it } from "vitest";
import { api, createProduct, loginAs, sampleProduct } from "./helpers.js";

describe("auth & quyền", () => {
  it("chặn khi chưa đăng nhập", async () => {
    const res = await api("sid=none").get("/products");
    expect(res.status).toBe(401);
  });

  it("chặn tài khoản chưa gắn quầy", async () => {
    const { cookie } = await loginAs({ shopId: null });
    const res = await api(cookie).get("/products");
    expect(res.status).toBe(403);
  });

  it("chặn role không có quyền quầy (midu)", async () => {
    const { cookie } = await loginAs({ role: "midu" });
    const res = await api(cookie).post("/products", sampleProduct);
    expect(res.status).toBe(403);
  });
});

describe("POST /products", () => {
  it("tạo sản phẩm và trả đúng hình dạng Product của frontend", async () => {
    const { cookie } = await loginAs();
    const res = await api(cookie).post("/products", sampleProduct);

    expect(res.status).toBe(201);
    const product = res.body.data.product;
    expect(product).toMatchObject({
      name: "Canxi Nano MK7",
      customerGroup: "Cả ba nhóm",
      category: "supplement",
      price: 350_000,
      costPrice: 210_000,
      stock: 20,
      threshold: 10,
      registrationNo: "2780/2021/ĐKSP",
      shelfLife: "36 tháng",
      documents: [],
      claims: [],
      loans: [],
    });
    expect(typeof product.id).toBe("string");
    expect(product).not.toHaveProperty("_id");
    expect(product).not.toHaveProperty("shopId");
  });

  it("ghi dòng thẻ kho tồn đầu khi initialStock > 0", async () => {
    const { cookie } = await loginAs();
    const product = await createProduct(cookie);
    const res = await api(cookie).get(`/stock/movements?productId=${product.id}`);

    expect(res.body.data.movements).toHaveLength(1);
    expect(res.body.data.movements[0]).toMatchObject({
      productId: product.id,
      productName: "Canxi Nano MK7",
      type: "import",
      quantity: 20,
      before: 0,
      after: 20,
      actor: "Chủ quầy Test",
      reason: "Tồn đầu khi tạo sản phẩm",
    });
  });

  it("không ghi thẻ kho khi initialStock = 0", async () => {
    const { cookie } = await loginAs();
    const product = await createProduct(cookie, { initialStock: 0 });
    const res = await api(cookie).get(`/stock/movements?productId=${product.id}`);
    expect(res.body.data.movements).toHaveLength(0);
  });

  it("trả 400 kèm lỗi từng field khi dữ liệu sai", async () => {
    const { cookie } = await loginAs();
    const res = await api(cookie).post("/products", {
      name: "A",
      price: -1,
      threshold: 1.5,
      category: "khong-co",
      initialStock: 0,
    });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details)).toEqual(
      expect.arrayContaining(["name", "price", "threshold", "category"]),
    );
  });
});

describe("GET /products", () => {
  it("chỉ thấy sản phẩm của quầy mình, sắp theo tên", async () => {
    const shopA = await loginAs({ shopId: "shop-a" });
    const shopB = await loginAs({ shopId: "shop-b" });
    await createProduct(shopA.cookie, { name: "Vitamin C" });
    await createProduct(shopA.cookie, { name: "Canxi" });
    await createProduct(shopB.cookie, { name: "Của quầy khác" });

    const res = await api(shopA.cookie).get("/products");
    expect(res.status).toBe(200);
    expect(res.body.data.products.map((p: { name: string }) => p.name)).toEqual([
      "Canxi",
      "Vitamin C",
    ]);
  });

  it("không đọc được sản phẩm quầy khác theo id", async () => {
    const shopA = await loginAs({ shopId: "shop-a" });
    const shopB = await loginAs({ shopId: "shop-b" });
    const product = await createProduct(shopA.cookie);

    const res = await api(shopB.cookie).get(`/products/${product.id}`);
    expect(res.status).toBe(404);
  });

  it("id sai định dạng trả 404", async () => {
    const { cookie } = await loginAs();
    const res = await api(cookie).get("/products/khong-phai-id");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /products/:id", () => {
  it("cập nhật thông tin, bỏ field tuỳ chọn không gửi, không đổi tồn", async () => {
    const { cookie } = await loginAs();
    const product = await createProduct(cookie);

    const res = await api(cookie).patch(`/products/${product.id}`, {
      name: "Canxi Nano MK7 mới",
      price: 360_000,
      threshold: 5,
    });

    expect(res.status).toBe(200);
    const updated = res.body.data.product;
    expect(updated).toMatchObject({ name: "Canxi Nano MK7 mới", price: 360_000, threshold: 5, stock: 20 });
    expect(updated).not.toHaveProperty("category");
    expect(updated).not.toHaveProperty("costPrice");
    expect(updated).not.toHaveProperty("registrationNo");
  });

  it("bỏ qua field stock gửi lên, tồn chỉ đổi qua kho", async () => {
    const { cookie } = await loginAs();
    const product = await createProduct(cookie);
    const res = await api(cookie).patch(`/products/${product.id}`, {
      name: "Canxi",
      price: 1,
      threshold: 1,
      stock: 999,
    });
    expect(res.body.data.product.stock).toBe(20);
  });
});

describe("mục lục & giá liên hệ", () => {
  it("mặc định không có mục lục, priceOnRequest = false", async () => {
    const { cookie } = await loginAs();
    const product = await createProduct(cookie);
    expect(product).not.toHaveProperty("menuGroup");
    expect(product).toMatchObject({ priceOnRequest: false });
  });

  it("tạo với mục lục và giá liên hệ", async () => {
    const { cookie } = await loginAs();
    const product = await createProduct(cookie, {
      price: 0,
      menuGroup: "Cẩm nang và tài liệu",
      priceOnRequest: true,
    });
    expect(product).toMatchObject({ menuGroup: "Cẩm nang và tài liệu", priceOnRequest: true });
  });

  it("PATCH không gửi hai field này thì giữ nguyên", async () => {
    const { cookie } = await loginAs();
    const product = await createProduct(cookie, { menuGroup: "Nước uống", priceOnRequest: true });
    const res = await api(cookie).patch(`/products/${product.id}`, {
      name: "Tên mới",
      price: 1,
      threshold: 1,
    });
    expect(res.body.data.product).toMatchObject({ menuGroup: "Nước uống", priceOnRequest: true });
  });

  it("PATCH gửi menuGroup rỗng thì xoá, gửi priceOnRequest false thì tắt", async () => {
    const { cookie } = await loginAs();
    const product = await createProduct(cookie, { menuGroup: "Nước uống", priceOnRequest: true });
    const res = await api(cookie).patch(`/products/${product.id}`, {
      name: "Tên mới",
      price: 1,
      threshold: 1,
      menuGroup: "",
      priceOnRequest: false,
    });
    expect(res.body.data.product).not.toHaveProperty("menuGroup");
    expect(res.body.data.product.priceOnRequest).toBe(false);
  });
});

describe("claims & documents", () => {
  it("PUT /claims thay toàn bộ câu công dụng, bỏ dòng trống", async () => {
    const { cookie } = await loginAs();
    const product = await createProduct(cookie);
    const res = await api(cookie).put(`/products/${product.id}/claims`, {
      claims: ["  Bổ sung canxi  ", "", "Hỗ trợ xương chắc khoẻ"],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.product.claims).toEqual(["Bổ sung canxi", "Hỗ trợ xương chắc khoẻ"]);
  });

  it("POST /documents thêm giấy, gửi lại cùng loại thì thay thế", async () => {
    const { cookie } = await loginAs();
    const product = await createProduct(cookie);
    const client = api(cookie);

    await client.post(`/products/${product.id}/documents`, {
      type: "registration",
      url: "https://drive.example.com/cb-cu.pdf",
    });
    const res = await client.post(`/products/${product.id}/documents`, {
      type: "registration",
      url: "https://drive.example.com/cb-moi.pdf",
      fileName: "cb-moi.pdf",
      expiresAt: "2027-01-31",
      note: "Số 123/ATTP",
    });

    expect(res.status).toBe(200);
    const docs = res.body.data.product.documents;
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      type: "registration",
      url: "https://drive.example.com/cb-moi.pdf",
      fileName: "cb-moi.pdf",
      expiresAt: "2027-01-31",
      note: "Số 123/ATTP",
      uploadedBy: "Chủ quầy Test",
    });
    expect(typeof docs[0].uploadedAt).toBe("string");
  });

  it("POST /documents từ chối loại giấy và ngày sai", async () => {
    const { cookie } = await loginAs();
    const product = await createProduct(cookie);
    const res = await api(cookie).post(`/products/${product.id}/documents`, {
      type: "giay-gi-do",
      url: "",
      expiresAt: "31/01/2027",
    });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details)).toEqual(
      expect.arrayContaining(["type", "url", "expiresAt"]),
    );
  });

  it("DELETE /documents/:type gỡ giấy", async () => {
    const { cookie } = await loginAs();
    const product = await createProduct(cookie);
    const client = api(cookie);
    await client.post(`/products/${product.id}/documents`, { type: "label", url: "https://x.test/nhan.png" });

    const res = await client.delete(`/products/${product.id}/documents/label`);
    expect(res.status).toBe(200);
    expect(res.body.data.product.documents).toEqual([]);
  });
});
