import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerModel } from "../src/modules/customer/customer.model.js";
import { viettelPostClient } from "../src/modules/shipping/viettelpost/viettelpost.client.js";
import { api, createProduct, loginAs } from "./helpers.js";

const HA_DONG = { province: "Thành phố Hà Nội", ward: "Phường Hà Đông", street: "12 Quang Trung" };
const DA_NANG = { province: "Thành phố Đà Nẵng", ward: "Phường Hải Châu", street: "1 Trần Phú" };

type Client = ReturnType<typeof api>;

async function setup() {
  const { cookie } = await loginAs();
  const client = api(cookie);
  const tea = await createProduct(cookie, { name: "Trà thảo mộc", category: "food", price: 95_000, initialStock: 40, weight: 200 });
  const milk = await createProduct(cookie, { name: "Sữa bột 800g", category: "food", price: 620_000, initialStock: 0 });
  return { client, cookie, tea, milk };
}

function pickupOrder(productId: string, overrides: Record<string, unknown> = {}) {
  return {
    lines: [{ productId, quantity: 2 }],
    customer: { name: "Nguyễn Thị Lan", phone: "0912 345 678" },
    shipping: { method: "pickup" },
    payment: { method: "transfer", pointsUsed: 0, collectedNow: false },
    expectedTotal: 190_000,
    ...overrides,
  };
}

async function stockOf(client: Client, productId: string) {
  return (await client.get(`/products/${productId}`)).body.data.product.stock as number;
}

async function pointsOf(phone: string) {
  return (await CustomerModel.findOne({ phone }))?.points ?? 0;
}

describe("POST /orders", () => {
  it("chuyển khoản chưa thu, lấy tại quầy: new/unpaid, trừ kho, ghi thẻ kho bán", async () => {
    const { client, tea } = await setup();
    const res = await client.post("/orders", pickupOrder(tea.id));

    expect(res.status).toBe(201);
    const order = res.body.data.order;
    expect(order).toMatchObject({
      status: "new",
      paymentStatus: "unpaid",
      paymentMethod: "transfer",
      createdBy: "Chủ quầy Test",
      customer: { name: "Nguyễn Thị Lan", phone: "0912345678" },
      shipping: { method: "pickup", fee: 0 },
      lines: [{ productId: tea.id, name: "Trà thảo mộc", price: 95_000, quantity: 2 }],
      pointsUsed: 0,
      totals: { subtotal: 190_000, shippingFee: 0, pointsDiscount: 0, total: 190_000, earnedPoints: 19_000 },
    });
    expect(order.code).toMatch(/^DH\d{6}\d{3}$/);
    expect(await stockOf(client, tea.id)).toBe(38);

    const moves = (await client.get(`/stock/movements?productId=${tea.id}`)).body.data.movements;
    expect(moves[0]).toMatchObject({ type: "sale", quantity: -2, reference: order.code, counterparty: "Nguyễn Thị Lan" });
  });

  it("lưu khách mới theo số điện thoại, tìm lại được qua /customers", async () => {
    const { client, tea } = await setup();
    await client.post("/orders", pickupOrder(tea.id));
    const res = await client.get("/customers?q=lan");
    expect(res.body.data.customers).toHaveLength(1);
    expect(res.body.data.customers[0]).toMatchObject({ name: "Nguyễn Thị Lan", phone: "0912345678", points: 0 });
  });

  it("expectedTotal lệch thì 409 và không trừ kho", async () => {
    const { client, tea } = await setup();
    const res = await client.post("/orders", pickupOrder(tea.id, { expectedTotal: 1 }));
    expect(res.status).toBe(409);
    expect(res.body.message).toContain("thay đổi");
    expect(await stockOf(client, tea.id)).toBe(40);
  });

  it("vượt tồn thì 400 'chỉ còn'", async () => {
    const { client, milk } = await setup();
    const res = await client.post("/orders", pickupOrder(milk.id, { lines: [{ productId: milk.id, quantity: 1 }], expectedTotal: 620_000 }));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("chỉ còn 0");
  });

  it("chặn hàng giá liên hệ", async () => {
    const { cookie, client } = await setup();
    const booklet = await createProduct(cookie, { name: "Cẩm nang Magie", price: 0, priceOnRequest: true, initialStock: 5 });
    const res = await client.post("/orders", pickupOrder(booklet.id, { lines: [{ productId: booklet.id, quantity: 1 }], expectedTotal: 0 }));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("giá liên hệ");
  });

  it("tiền mặt đã thu + dùng điểm: hoàn tất ngay, trừ điểm dùng và cộng điểm tích", async () => {
    const { client, tea } = await setup();
    await client.post("/orders", pickupOrder(tea.id));
    await CustomerModel.updateOne({ phone: "0912345678" }, { points: 45_000 });

    const res = await client.post("/orders", pickupOrder(tea.id, {
      payment: { method: "cash", pointsUsed: 10_000, collectedNow: true },
      expectedTotal: 180_000,
    }));

    expect(res.status).toBe(201);
    expect(res.body.data.order).toMatchObject({ status: "completed", paymentStatus: "paid", pointsUsed: 10_000 });
    expect(res.body.data.order.paidAt).toBeTypeOf("string");
    expect(await pointsOf("0912345678")).toBe(45_000 - 10_000 + 18_000);
  });

  it("điểm của khách vừa bị dùng hết thì 409 và hoàn lại kho", async () => {
    const { client, tea } = await setup();
    await client.post("/orders", pickupOrder(tea.id));
    await CustomerModel.updateOne({ phone: "0912345678" }, { points: 10_000 });
    const payload = pickupOrder(tea.id, {
      payment: { method: "cash", pointsUsed: 10_000, collectedNow: true },
      expectedTotal: 180_000,
    });

    const [a, b] = await Promise.all([client.post("/orders", payload), client.post("/orders", payload)]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await pointsOf("0912345678")).toBe(18_000);
    expect(await stockOf(client, tea.id)).toBe(40 - 2 - 2);
  });

  it("COD với lấy tại quầy bị từ chối", async () => {
    const { client, tea } = await setup();
    const res = await client.post("/orders", pickupOrder(tea.id, { payment: { method: "cod", pointsUsed: 0, collectedNow: false } }));
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty("payment.method");
  });
});

describe("vòng đời đơn", () => {
  it("huỷ đơn: hoàn kho, hoàn điểm, đã trả thì chuyển hoàn tiền", async () => {
    const { client, tea } = await setup();
    await client.post("/orders", pickupOrder(tea.id));
    await CustomerModel.updateOne({ phone: "0912345678" }, { points: 20_000 });
    const created = (await client.post("/orders", pickupOrder(tea.id, {
      payment: { method: "transfer", pointsUsed: 20_000, collectedNow: false },
      expectedTotal: 170_000,
    }))).body.data.order;
    await client.post(`/orders/${created.id}/mark-paid`);

    const res = await client.post(`/orders/${created.id}/cancel`, { reason: "Khách đổi ý" });
    expect(res.body.data.order).toMatchObject({ status: "cancelled", paymentStatus: "refunded", cancelReason: "Khách đổi ý" });
    expect(await stockOf(client, tea.id)).toBe(38);
    expect(await pointsOf("0912345678")).toBe(20_000);

    const moves = (await client.get(`/stock/movements?productId=${tea.id}`)).body.data.movements;
    expect(moves[0]).toMatchObject({ type: "orderCancel", quantity: 2, reference: created.code });
  });

  it("hoàn tất hai lần cùng lúc chỉ cộng điểm một lần", async () => {
    const { client, tea } = await setup();
    const created = (await client.post("/orders", pickupOrder(tea.id))).body.data.order;
    await client.post(`/orders/${created.id}/mark-paid`);
    await client.post(`/orders/${created.id}/approve`);
    await client.post(`/orders/${created.id}/mark-ready`);

    const results = await Promise.all([
      client.post(`/orders/${created.id}/complete`),
      client.post(`/orders/${created.id}/complete`),
    ]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await pointsOf("0912345678")).toBe(19_000);
  });

  it("không huỷ được đơn đã hoàn tất", async () => {
    const { client, tea } = await setup();
    const created = (await client.post("/orders", pickupOrder(tea.id, {
      payment: { method: "cash", pointsUsed: 0, collectedNow: true },
    }))).body.data.order;
    const res = await client.post(`/orders/${created.id}/cancel`, { reason: "x" });
    expect(res.status).toBe(400);
  });

  it("thông tin thanh toán: số tiền, nội dung CK = mã đơn, có VietQR", async () => {
    const { client, tea } = await setup();
    const created = (await client.post("/orders", pickupOrder(tea.id))).body.data.order;
    const res = await client.get(`/orders/${created.id}/payment`);
    expect(res.body.data.payment).toMatchObject({
      orderCode: created.code,
      amount: 190_000,
      transferContent: created.code,
      bankBin: "970436",
      accountNumber: "0011001234567",
    });
    expect(res.body.data.payment.qrPayload).toContain(created.code);
  });

  it("GET /orders mới nhất trước, lọc theo trạng thái, chỉ của quầy mình", async () => {
    const { client, tea } = await setup();
    const first = (await client.post("/orders", pickupOrder(tea.id))).body.data.order;
    const second = (await client.post("/orders", pickupOrder(tea.id, {
      payment: { method: "cash", pointsUsed: 0, collectedNow: true },
    }))).body.data.order;
    const other = await loginAs({ shopId: "shop-khac" });

    const all = (await client.get("/orders")).body.data.orders;
    expect(all.map((o: { code: string }) => o.code)).toEqual([second.code, first.code]);
    const fresh = (await client.get("/orders?status=new")).body.data.orders;
    expect(fresh.map((o: { id: string }) => o.id)).toEqual([first.id]);
    expect((await api(other.cookie).get("/orders")).body.data.orders).toEqual([]);
    expect((await api(other.cookie).get(`/orders/${first.id}`)).status).toBe(404);
  });
});

describe("nhận tại quầy", () => {
  it("tiền mặt trả lúc nhận: duyệt ngay, báo khách đến, thu tiền rồi mới hoàn tất", async () => {
    const { client, tea } = await setup();
    const created = (await client.post("/orders", pickupOrder(tea.id, {
      payment: { method: "cash", pointsUsed: 0, collectedNow: false },
    }))).body.data.order;
    expect(created).toMatchObject({ status: "new", paymentStatus: "unpaid" });

    await client.post(`/orders/${created.id}/approve`);
    expect((await client.post(`/orders/${created.id}/hand-over`, { trackingCode: "X" })).status).toBe(400);
    const ready = await client.post(`/orders/${created.id}/mark-ready`);
    expect(ready.body.data.order.status).toBe("readyForPickup");

    expect((await client.post(`/orders/${created.id}/complete`)).status).toBe(400);
    await client.post(`/orders/${created.id}/mark-paid`);
    const done = await client.post(`/orders/${created.id}/complete`);
    expect(done.body.data.order).toMatchObject({ status: "completed", paymentStatus: "paid" });
  });

  it("chuyển khoản gửi kèm 'đã thu' vẫn là chưa thanh toán", async () => {
    const { client, tea } = await setup();
    const created = (await client.post("/orders", pickupOrder(tea.id, {
      payment: { method: "transfer", pointsUsed: 0, collectedNow: true },
    }))).body.data.order;
    expect(created).toMatchObject({ status: "new", paymentStatus: "unpaid" });
  });

  it("thu tiền mặt ngay khi giao hàng thì đơn vào thẳng trạng thái đã duyệt", async () => {
    vi.spyOn(viettelPostClient, "getPrice").mockResolvedValue({ MONEY_TOTAL: 24_639 });
    const { client, tea } = await setup();
    const created = (await client.post("/orders", {
      ...pickupOrder(tea.id, { payment: { method: "cash", pointsUsed: 0, collectedNow: true } }),
      shipping: { method: "viettel", recipient: { name: "Lan", phone: "0912345678", address: DA_NANG } },
      expectedTotal: 190_000 + 24_639,
    })).body.data.order;
    expect(created).toMatchObject({ status: "approved", paymentStatus: "paid" });
    vi.restoreAllMocks();
  });
});

describe("GET /orders lọc, phân trang, đếm theo trạng thái", () => {
  async function seedOrders() {
    const ctx = await setup();
    const lan = (await ctx.client.post("/orders", pickupOrder(ctx.tea.id))).body.data.order;
    const minh = (await ctx.client.post("/orders", pickupOrder(ctx.tea.id, {
      customer: { name: "Trần Văn Minh", phone: "0987654321" },
      payment: { method: "cash", pointsUsed: 0, collectedNow: true },
    }))).body.data.order;
    return { ...ctx, lan, minh };
  }

  it("tìm không dấu theo tên, theo một phần SĐT và theo mã đơn", async () => {
    const { client, lan, minh } = await seedOrders();
    const codes = async (q: string) =>
      (await client.get(`/orders?q=${encodeURIComponent(q)}`)).body.data.orders.map((o: { code: string }) => o.code);
    expect(await codes("van minh")).toEqual([minh.code]);
    expect(await codes("345678")).toEqual([lan.code]);
    expect(await codes(lan.code.toLowerCase())).toEqual([lan.code]);
  });

  it("đếm theo trạng thái cùng bộ lọc, bỏ qua tab đang chọn", async () => {
    const { client } = await seedOrders();
    const body = (await client.get("/orders?status=new&paymentMethod=transfer")).body.data;
    expect(body.orders).toHaveLength(1);
    expect(body.counts).toMatchObject({ all: 1, new: 1, completed: 0 });
    const all = (await client.get("/orders")).body.data.counts;
    expect(all).toMatchObject({ all: 2, new: 1, completed: 1, approved: 0 });
  });

  it("phân trang", async () => {
    const { client, lan } = await seedOrders();
    const page2 = (await client.get("/orders?limit=1&page=2")).body.data;
    expect(page2.orders.map((o: { code: string }) => o.code)).toEqual([lan.code]);
    expect(page2.pagination).toMatchObject({ page: 2, limit: 1, total: 2, totalPages: 2, hasPrev: true, hasNext: false });
  });

  it("lọc theo ngày đặt (giờ VN) và chặn khoảng ngày ngược", async () => {
    const { client } = await seedOrders();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
    expect((await client.get(`/orders?from=${today}&to=${today}`)).body.data.orders).toHaveLength(2);
    expect((await client.get("/orders?to=2020-01-01")).body.data.orders).toHaveLength(0);
    expect((await client.get("/orders?from=2026-02-01&to=2026-01-01")).status).toBe(400);
  });
});

describe("PATCH /orders/:id/note", () => {
  it("sửa và xoá ghi chú ở mọi trạng thái", async () => {
    const { client, tea } = await setup();
    const created = (await client.post("/orders", pickupOrder(tea.id, {
      payment: { method: "cash", pointsUsed: 0, collectedNow: true },
    }))).body.data.order;
    expect(created.status).toBe("completed");

    const saved = await client.patch(`/orders/${created.id}/note`, { note: "  Khách quen, gọi trước  " });
    expect(saved.body.data.order.note).toBe("Khách quen, gọi trước");
    const cleared = await client.patch(`/orders/${created.id}/note`, { note: "" });
    expect(cleared.body.data.order.note).toBeUndefined();
  });

  it("không sửa được đơn của quầy khác", async () => {
    const { client, tea } = await setup();
    const created = (await client.post("/orders", pickupOrder(tea.id))).body.data.order;
    const other = await loginAs({ shopId: "shop-khac" });
    expect((await api(other.cookie).patch(`/orders/${created.id}/note`, { note: "x" })).status).toBe(404);
  });
});

describe("giao Viettel Post", () => {
  beforeEach(() => {
    vi.spyOn(viettelPostClient, "getPrice").mockResolvedValue({ MONEY_TOTAL: 24_639 });
  });
  afterEach(() => vi.restoreAllMocks());

  const viettelOrder = (productId: string, expectedTotal: number, payment = { method: "transfer", pointsUsed: 0, collectedNow: false }) => ({
    lines: [{ productId, quantity: 2 }],
    customer: { name: "Nguyễn Thị Lan", phone: "0912345678" },
    shipping: { method: "viettel", recipient: { name: "Lan", phone: "0912345678", address: DA_NANG } },
    payment,
    expectedTotal,
  });

  it("báo phí thật từ ViettelPost với cân nặng sản phẩm", async () => {
    const { client, tea } = await setup();
    const res = await client.post("/shipping/quote", {
      method: "viettel",
      address: DA_NANG,
      lines: [{ productId: tea.id, quantity: 2 }],
      paymentMethod: "cod",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.quote).toMatchObject({ method: "viettel", fee: 24_639, carrierFee: 24_639, freeShipping: false, weight: 400 });
    expect(viettelPostClient.getPrice).toHaveBeenCalledWith(expect.objectContaining({
      PRODUCT_WEIGHT: 400,
      PRODUCT_PRICE: 190_000,
      MONEY_COLLECTION: 190_000,
      RECEIVER_ADDRESS: "1 Trần Phú, Phường Hải Châu, Thành phố Đà Nẵng",
    }));
  });

  it("đơn từ 500.000đ miễn phí ship, không gọi ViettelPost", async () => {
    const { client, tea } = await setup();
    const res = await client.post("/shipping/quote", {
      method: "viettel",
      address: DA_NANG,
      lines: [{ productId: tea.id, quantity: 6 }],
    });
    expect(res.body.data.quote).toMatchObject({ fee: 0, freeShipping: true });
    expect(viettelPostClient.getPrice).not.toHaveBeenCalled();
  });

  it("sản phẩm chưa có cân nặng tính 500g/đơn vị", async () => {
    const { cookie, client } = await setup();
    const noWeight = await createProduct(cookie, { name: "Hộp quà", category: "food", price: 10_000, initialStock: 9 });
    const res = await client.post("/shipping/quote", {
      method: "viettel",
      address: DA_NANG,
      lines: [{ productId: noWeight.id, quantity: 3 }],
    });
    expect(res.body.data.quote.weight).toBe(1500);
  });

  it("vòng đời giao hàng: chưa trả chưa duyệt được → duyệt → bàn giao → đang giao → hoàn tất", async () => {
    const { client, tea } = await setup();
    const created = (await client.post("/orders", viettelOrder(tea.id, 190_000 + 24_639))).body.data.order;
    expect(created.shipping).toMatchObject({ method: "viettel", fee: 24_639, recipient: { name: "Lan", address: DA_NANG } });

    expect((await client.post(`/orders/${created.id}/approve`)).status).toBe(400);
    await client.post(`/orders/${created.id}/mark-paid`);
    expect((await client.post(`/orders/${created.id}/approve`)).body.data.order.status).toBe("approved");

    const handed = await client.post(`/orders/${created.id}/hand-over`, { trackingCode: " VT123 " });
    expect(handed.body.data.order).toMatchObject({ status: "awaitingPickup", shipping: { trackingCode: "VT123" } });
    expect((await client.post(`/orders/${created.id}/complete`)).status).toBe(400);

    const shipped = await client.post(`/orders/${created.id}/mark-shipping`);
    expect(shipped.body.data.order.status).toBe("shipping");
    expect((await client.post(`/orders/${created.id}/cancel`, { reason: "x" })).status).toBe(400);

    const done = await client.post(`/orders/${created.id}/complete`);
    expect(done.body.data.order).toMatchObject({ status: "completed", paymentStatus: "paid" });
  });

  it("COD giao được khi chưa trả, hoàn tất thì thành đã thanh toán", async () => {
    const { client, tea } = await setup();
    const created = (await client.post("/orders", viettelOrder(tea.id, 190_000 + 24_639, { method: "cod", pointsUsed: 0, collectedNow: true }))).body.data.order;
    expect(created).toMatchObject({ status: "new", paymentStatus: "unpaid" });
    await client.post(`/orders/${created.id}/approve`);
    await client.post(`/orders/${created.id}/hand-over`, { trackingCode: "VT9" });
    await client.post(`/orders/${created.id}/mark-shipping`);
    const done = await client.post(`/orders/${created.id}/complete`);
    expect(done.body.data.order.paymentStatus).toBe("paid");
  });

  it("hoả tốc chỉ giao trong tỉnh quầy, phí 50.000đ", async () => {
    const { client, tea } = await setup();
    const quote = (addr: typeof HA_DONG) =>
      client.post("/shipping/quote", { method: "express", address: addr, lines: [{ productId: tea.id, quantity: 1 }] });
    expect((await quote(HA_DONG)).body.data.quote.fee).toBe(50_000);
    expect((await quote(DA_NANG)).status).toBe(400);
  });

  it("ViettelPost lỗi thì tạo đơn báo lỗi và không trừ kho", async () => {
    const { client, tea } = await setup();
    vi.mocked(viettelPostClient.getPrice).mockRejectedValueOnce(new Error("timeout"));
    const res = await client.post("/orders", viettelOrder(tea.id, 214_639));
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(await stockOf(client, tea.id)).toBe(40);
  });
});

describe("danh mục địa chỉ", () => {
  afterEach(() => vi.restoreAllMocks());

  it("trả tỉnh và phường theo ViettelPost, sắp theo tên", async () => {
    vi.spyOn(viettelPostClient, "listProvinces").mockResolvedValue([
      { PROVINCE_ID: 2, PROVINCE_NAME: "Thành phố Hồ Chí Minh" },
      { PROVINCE_ID: 1, PROVINCE_NAME: "Thành phố Hà Nội" },
    ]);
    vi.spyOn(viettelPostClient, "listWards").mockResolvedValue([
      { WARDS_ID: 11, WARDS_NAME: "Phường Hà Đông", PROVINCE_ID: 1 },
      { WARDS_ID: 10, WARDS_NAME: "Phường Ba Đình", PROVINCE_ID: 1 },
    ]);
    const { client } = await setup();

    const provinces = (await client.get("/shipping/provinces")).body.data.provinces;
    expect(provinces).toEqual([{ id: 1, name: "Thành phố Hà Nội" }, { id: 2, name: "Thành phố Hồ Chí Minh" }]);
    const wards = (await client.get("/shipping/provinces/1/wards")).body.data.wards;
    expect(wards).toEqual([{ id: 10, name: "Phường Ba Đình" }, { id: 11, name: "Phường Hà Đông" }]);
    expect((await client.get("/shipping/provinces/abc/wards")).status).toBe(400);
  });
});
