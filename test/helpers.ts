import request from "supertest";
import { app } from "../src/app.js";
import { SessionModel } from "../src/modules/auth/session.model.js";
import type { Role } from "../src/modules/rbac/rbac.constants.js";
import { UserModel } from "../src/modules/user/user.model.js";
import { randomString } from "../src/utils/crypto.js";

type TestUserOptions = {
  shopId?: string | null;
  role?: Role;
  fullName?: string;
};

/** Tạo user + session thật trong DB test, trả cookie `sid` để gọi API. */
export async function loginAs(options: TestUserOptions = {}) {
  const { shopId = "shop-1", role = "customer", fullName = "Chủ quầy Test" } =
    options;
  const user = await UserModel.create({
    accountId: randomString(8),
    phoneNumber: "0900000000",
    fullName,
    ...(shopId !== null && { shopId }),
    role,
  });
  const sessionId = randomString();
  await SessionModel.create({
    sessionId,
    user: user._id,
    miduAccessToken: "access",
    miduRefreshToken: "refresh",
    expiresAt: new Date(Date.now() + 60_000),
  });
  return { user, cookie: `sid=${sessionId}` };
}

export function api(cookie: string) {
  return {
    get: (url: string) => request(app).get(`/api${url}`).set("Cookie", cookie),
    post: (url: string, body?: object) =>
      request(app).post(`/api${url}`).set("Cookie", cookie).send(body),
    patch: (url: string, body?: object) =>
      request(app).patch(`/api${url}`).set("Cookie", cookie).send(body),
    put: (url: string, body?: object) =>
      request(app).put(`/api${url}`).set("Cookie", cookie).send(body),
    delete: (url: string) =>
      request(app).delete(`/api${url}`).set("Cookie", cookie),
  };
}

export const sampleProduct = {
  name: "Canxi Nano MK7",
  customerGroup: "Cả ba nhóm",
  category: "supplement",
  price: 350_000,
  costPrice: 210_000,
  threshold: 10,
  registrationNo: "2780/2021/ĐKSP",
  shelfLife: "36 tháng",
  initialStock: 20,
};

export async function createProduct(
  cookie: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await api(cookie).post("/products", {
    ...sampleProduct,
    ...overrides,
  });
  if (res.status !== 201) {
    throw new Error(`createProduct failed: ${res.status} ${res.text}`);
  }
  return res.body.data.product as {
    id: string;
    stock: number;
    menuGroup?: string;
    priceOnRequest: boolean;
  };
}
