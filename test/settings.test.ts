import { describe, expect, it } from "vitest";
import { api, createProduct, loginAs } from "./helpers.js";

describe("GET /settings", () => {
  it("quầy mới: thông tin điểm trống, chưa có tài khoản nhận tiền, có quy tắc", async () => {
    const { cookie } = await loginAs();
    const res = await api(cookie).get("/settings");

    expect(res.status).toBe(200);
    const { settings } = res.body.data;
    expect(settings.store).toEqual({ name: "", phone: "", address: "", code: "" });
    expect(settings).not.toHaveProperty("paymentAccount");
    expect(settings.rules.length).toBeGreaterThan(0);
    expect(settings.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Tích điểm Mi khi mua hàng", value: "10% tiền hàng khách trả" }),
        expect.objectContaining({ label: "Miễn phí giao Viettel Post", value: "Đơn từ 500.000đ" }),
      ]),
    );
  });

  it("cần quyền và cần gắn quầy", async () => {
    const noRole = await loginAs({ role: "midu" });
    expect((await api(noRole.cookie).get("/settings")).status).toBe(403);
    expect((await api("sid=x").get("/settings")).status).toBe(401);
  });
});

describe("PUT /settings/store", () => {
  it("lưu thông tin điểm, mã điểm viết hoa bỏ ký tự lạ", async () => {
    const { cookie } = await loginAs();
    const client = api(cookie);
    const res = await client.put("/settings/store", {
      name: "Quầy Sức Khỏe Văn Phúc",
      phone: "0912 345 678",
      address: "12 Văn Phúc, Hà Đông, Hà Nội",
      code: "vp-01",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.settings.store).toEqual({
      name: "Quầy Sức Khỏe Văn Phúc",
      phone: "0912345678",
      address: "12 Văn Phúc, Hà Đông, Hà Nội",
      code: "VP01",
    });
    expect((await client.get("/settings")).body.data.settings.store.code).toBe("VP01");
  });

  it("từ chối tên điểm quá ngắn và mã điểm quá 6 ký tự", async () => {
    const { cookie } = await loginAs();
    const res = await api(cookie).put("/settings/store", { name: "Q", code: "ABCDEFG" });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details)).toEqual(expect.arrayContaining(["name", "code"]));
  });

  it("mỗi quầy một bộ cài đặt riêng", async () => {
    const a = await loginAs({ shopId: "shop-a" });
    const b = await loginAs({ shopId: "shop-b" });
    await api(a.cookie).put("/settings/store", { name: "Quầy A" });
    expect((await api(b.cookie).get("/settings")).body.data.settings.store.name).toBe("");
  });
});

describe("PUT /settings/payment-account", () => {
  it("lưu tài khoản, tên ngân hàng suy từ BIN, chủ TK viết hoa", async () => {
    const { cookie } = await loginAs();
    const res = await api(cookie).put("/settings/payment-account", {
      bankBin: "970436",
      accountNumber: "0011 0012 34567",
      accountName: "Quay Suc Khoe Van Phuc",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.settings.paymentAccount).toMatchObject({
      bankBin: "970436",
      bankName: "Vietcombank",
      accountNumber: "0011001234567",
      accountName: "QUAY SUC KHOE VAN PHUC",
      updatedBy: "Chủ quầy Test",
    });
  });

  it("thông tin thanh toán của đơn dùng tài khoản đã cài, không dùng env", async () => {
    const { cookie } = await loginAs();
    const client = api(cookie);
    await client.put("/settings/payment-account", {
      bankBin: "970422",
      accountNumber: "8888999977",
      accountName: "QUAY VAN PHUC",
    });
    const tea = await createProduct(cookie, { name: "Trà thảo mộc", category: "food", price: 95_000, initialStock: 5 });
    const created = await client.post("/orders", {
      lines: [{ productId: tea.id, quantity: 1 }],
      customer: { name: "Nguyễn Thị Lan", phone: "0912345678" },
      shipping: { method: "pickup" },
      payment: { method: "transfer", pointsUsed: 0, collectedNow: false },
      expectedTotal: 95_000,
    });
    expect(created.status).toBe(201);

    const res = await client.get(`/orders/${created.body.data.order.id}/payment`);
    expect(res.body.data.payment).toMatchObject({
      bankBin: "970422",
      bankName: "MB Bank",
      accountNumber: "8888999977",
      accountName: "QUAY VAN PHUC",
      amount: 95_000,
    });
    expect(res.body.data.payment.qrPayload).toContain("8888999977");
  });

  it("từ chối ngân hàng lạ và số tài khoản sai", async () => {
    const { cookie } = await loginAs();
    const res = await api(cookie).put("/settings/payment-account", {
      bankBin: "123",
      accountNumber: "12",
      accountName: "",
    });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details)).toEqual(
      expect.arrayContaining(["bankBin", "accountNumber", "accountName"]),
    );
  });
});
