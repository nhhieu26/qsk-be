import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ViettelPostTokenModel } from "../src/modules/shipping/viettelpost/viettelpost-token.model.js";
import { viettelPostClient } from "../src/modules/shipping/viettelpost/viettelpost.client.js";

const PORT = 39876;

/** Giả lập ViettelPost: token hợp lệ là `long-<n>`, đếm số lần đăng nhập. */
const fake = {
  logins: 0,
  validToken: "",
  priceCalls: 0,
  rejectLogin: false,
  lastLoginUser: "",
  lastOwnerConnectUser: "",
};

function reply(res: http.ServerResponse, body: object, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const ok = (data: unknown) => ({ status: 200, error: false, message: "OK", data });

const server = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", () => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
    const token = req.headers.token;
    switch (url.pathname) {
      case "/v2/user/Login": {
        const body = JSON.parse(Buffer.concat(chunks).toString() || "{}") as { USERNAME?: string };
        fake.lastLoginUser = body.USERNAME ?? "";
        if (fake.rejectLogin) return reply(res, { status: 205, error: true, message: "Username or password is not valid!", data: null });
        return reply(res, ok({ token: "short" }));
      }
      case "/v2/user/ownerconnect": {
        const body = JSON.parse(Buffer.concat(chunks).toString() || "{}") as { USERNAME?: string };
        fake.lastOwnerConnectUser = body.USERNAME ?? "";
        fake.logins += 1;
        fake.validToken = `long-${fake.logins}`;
        return reply(res, ok({ token: fake.validToken }));
      }
      case "/v2/order/getPriceNlp":
        fake.priceCalls += 1;
        if (token !== fake.validToken) return reply(res, { status: 202, error: true, message: "Token invalid", data: null });
        return reply(res, ok({ MONEY_TOTAL: 30_000 }));
      case "/v3/categories/listWardsNew":
        return reply(res, ok([{ WARDS_ID: 1, WARDS_NAME: `Phường của ${url.searchParams.get("provinceId")}`, PROVINCE_ID: 1 }]));
      default:
        return reply(res, { message: "not found" }, 404);
    }
  });
});

const priceBody = {
  PRODUCT_WEIGHT: 500,
  PRODUCT_PRICE: 100_000,
  MONEY_COLLECTION: 0,
  ORDER_SERVICE_ADD: null,
  ORDER_SERVICE: "VSL6",
  SENDER_ADDRESS: "A",
  RECEIVER_ADDRESS: "B",
  PRODUCT_LENGTH: 0,
  PRODUCT_WIDTH: 0,
  PRODUCT_HEIGHT: 0,
  PRODUCT_TYPE: "HH" as const,
  NATIONAL_TYPE: 1 as const,
};

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  expect((server.address() as AddressInfo).port).toBe(PORT);
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
beforeEach(() => {
  fake.priceCalls = 0;
  fake.rejectLogin = false;
});

describe("viettelPostClient", () => {
  it("lần đầu đăng nhập (Login + ownerconnect), lưu token vào DB", async () => {
    const result = await viettelPostClient.getPrice(priceBody);
    expect(result.MONEY_TOTAL).toBe(30_000);
    const saved = await ViettelPostTokenModel.findOne({ username: "test-vtp-user" });
    expect(saved?.token).toBe(fake.validToken);
  });

  it("token hết hạn (status 202) thì đăng nhập lại một lần rồi gửi lại", async () => {
    await viettelPostClient.getPrice(priceBody);
    const loginsBefore = fake.logins;
    fake.validToken = "token-moi-chua-ai-co";

    const result = await viettelPostClient.getPrice(priceBody);
    expect(result.MONEY_TOTAL).toBe(30_000);
    expect(fake.logins).toBe(loginsBefore + 1);
    expect(fake.priceCalls).toBe(3);
  });

  it("nhiều request cùng lúc gặp token hỏng chỉ đăng nhập lại một lần", async () => {
    await viettelPostClient.getPrice(priceBody);
    const loginsBefore = fake.logins;
    fake.validToken = "het-han";

    const results = await Promise.all(Array.from({ length: 5 }, () => viettelPostClient.getPrice(priceBody)));
    expect(results.every((r) => r.MONEY_TOTAL === 30_000)).toBe(true);
    expect(fake.logins).toBe(loginsBefore + 1);
  });

  it("đăng nhập bị từ chối thì báo lỗi 502 rõ ràng", async () => {
    fake.validToken = "het-han-nua";
    fake.rejectLogin = true;
    await expect(viettelPostClient.getPrice(priceBody)).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining("Username or password is not valid"),
    });
  });

  it("Login bằng tài khoản đối tác, ownerconnect bằng tài khoản chủ hàng", async () => {
    fake.validToken = "buoc-dang-nhap-lai";
    await viettelPostClient.getPrice(priceBody);
    expect(fake.lastLoginUser).toBe("test-vtp-partner");
    expect(fake.lastOwnerConnectUser).toBe("test-vtp-user");
  });

  it("danh mục phường gửi provinceId", async () => {
    const wards = await viettelPostClient.listWards(7);
    expect(wards[0]?.WARDS_NAME).toBe("Phường của 7");
  });
});
