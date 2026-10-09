import axios, { isAxiosError, type AxiosResponse } from "axios";
import { env } from "../../../config/env.js";
import { AppError } from "../../../utils/app-error.js";
import { ViettelPostTokenModel } from "./viettelpost-token.model.js";
import type {
  VtpEnvelope,
  VtpPriceRequest,
  VtpPriceResult,
  VtpProvince,
  VtpWard,
} from "./viettelpost.types.js";

/**
 * Client ViettelPost, port từ D:\prm (config.viettelPost.js).
 *
 * - Đăng nhập 2 bước: /v2/user/Login lấy token ngắn hạn (bằng tài khoản đối
 *   tác nếu có cấu hình), rồi /v2/user/ownerconnect đổi sang token dài hạn
 *   của tài khoản chủ hàng.
 * - Token lưu DB (sống qua restart) + bộ nhớ.
 * - ViettelPost báo token hỏng bằng HTTP 200 + `status` 201/202 (hoặc HTTP 401):
 *   đăng nhập lại MỘT lần rồi gửi lại; nhiều request cùng lúc dùng chung một
 *   lần đăng nhập.
 */

const REQUEST_TIMEOUT_MS = 10_000;
const TOKEN_ERROR_STATUSES = new Set([201, 202]);

const PATHS = {
  login: "/v2/user/Login",
  ownerConnect: "/v2/user/ownerconnect",
  price: "/v2/order/getPriceNlp",
  provinces: "/v3/categories/listProvinceNew",
  wards: "/v3/categories/listWardsNew",
} as const;

const http = axios.create({
  baseURL: env.VIETTELPOST_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

let memoryToken: string | undefined;
let refreshing: Promise<string> | undefined;

/** Tài khoản chủ hàng: dùng cho ownerconnect, token cấp ra là của tài khoản này. */
function credentials() {
  const { VIETTELPOST_USERNAME: username, VIETTELPOST_PASSWORD: password } = env;
  if (!username || !password) {
    throw new AppError(503, "Chưa cấu hình tài khoản ViettelPost");
  }
  return { USERNAME: username, PASSWORD: password };
}

/** Tài khoản gọi /Login: tài khoản đối tác nếu có, không thì chính chủ hàng. */
function loginCredentials() {
  const { VIETTELPOST_PARTNER_USERNAME: username, VIETTELPOST_PARTNER_PASSWORD: password } = env;
  return username && password ? { USERNAME: username, PASSWORD: password } : credentials();
}

function upstreamError(step: string, err: unknown): AppError {
  const detail = isAxiosError(err) ? err.message : String(err);
  console.error(`ViettelPost ${step} lỗi:`, detail);
  return new AppError(502, "Không kết nối được ViettelPost, thử lại sau");
}

function assertOk<T>(step: string, body: VtpEnvelope<T> | undefined): T {
  if (!body || body.error || body.status !== 200) {
    console.error(`ViettelPost ${step} từ chối:`, body?.status, body?.message);
    throw new AppError(502, `ViettelPost: ${body?.message ?? "phản hồi không hợp lệ"}`);
  }
  return body.data;
}

async function login(): Promise<string> {
  const creds = credentials();
  try {
    const short = await http.post<VtpEnvelope<{ token: string }>>(PATHS.login, loginCredentials());
    const shortToken = assertOk("Login", short.data).token;
    const long = await http.post<VtpEnvelope<{ token: string }>>(PATHS.ownerConnect, creds, {
      headers: { Token: shortToken, Cookie: "SERVERID=A" },
    });
    const token = assertOk("OwnerConnect", long.data).token;
    await ViettelPostTokenModel.updateOne(
      { username: creds.USERNAME },
      { $set: { token } },
      { upsert: true },
    );
    memoryToken = token;
    return token;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw upstreamError("Login", err);
  }
}

/** Đăng nhập lại, gộp các lời gọi đồng thời vào một lần. */
function refreshToken(): Promise<string> {
  refreshing ??= login().finally(() => {
    refreshing = undefined;
  });
  return refreshing;
}

async function currentToken(): Promise<string> {
  if (memoryToken) return memoryToken;
  const saved = await ViettelPostTokenModel.findOne({ username: credentials().USERNAME });
  if (saved) {
    memoryToken = saved.token;
    return saved.token;
  }
  return refreshToken();
}

function isTokenRejected(res: AxiosResponse<VtpEnvelope<unknown>>): boolean {
  return res.status === 401 || TOKEN_ERROR_STATUSES.has(res.data?.status);
}

async function authedPost<T>(step: string, path: string, body: unknown): Promise<T> {
  const send = (token: string) =>
    http.post<VtpEnvelope<T>>(path, body, {
      headers: { Token: token },
      validateStatus: (s) => s < 500,
    });
  try {
    let res = await send(await currentToken());
    if (isTokenRejected(res)) res = await send(await refreshToken());
    return assertOk(step, res.data);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw upstreamError(step, err);
  }
}

async function publicGet<T>(step: string, path: string, params?: object): Promise<T> {
  try {
    const res = await http.get<VtpEnvelope<T>>(path, { params });
    return assertOk(step, res.data);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw upstreamError(step, err);
  }
}

export const viettelPostClient = {
  getPrice: (body: VtpPriceRequest) =>
    authedPost<VtpPriceResult>("getPriceNlp", PATHS.price, body),
  listProvinces: () => publicGet<VtpProvince[]>("listProvinceNew", PATHS.provinces),
  listWards: (provinceId: number) =>
    publicGet<VtpWard[]>("listWardsNew", PATHS.wards, { provinceId }),
};
