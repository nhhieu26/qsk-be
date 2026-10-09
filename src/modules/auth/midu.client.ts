import axios from "axios";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import { SessionModel } from "./session.model.js";

export const midu = axios.create({
  baseURL: env.AUTH_SERVICE_URL,
  timeout: 10_000,
});

export function toAppError(
  err: unknown,
  fallback = "Đăng nhập thất bại",
): never {
  if (axios.isAxiosError(err) && err.response) {
    const status = err.response.status < 500 ? err.response.status : 502;
    throw new AppError(
      status,
      err.response.data?.error ?? err.response.data?.message ?? fallback,
    );
  }
  throw new AppError(502, "Không kết nối được dịch vụ xác thực");
}

function isUnauthorized(err: unknown) {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

function readRefreshCookie(setCookie: string[] | undefined) {
  for (const cookie of setCookie ?? []) {
    const match = /^refreshToken=([^;]+)/.exec(cookie);
    if (match) return match[1];
  }
  return null;
}

const SESSION_EXPIRED_MESSAGE = "Phiên MIDU đã hết hạn, vui lòng đăng nhập lại";

// MIDU xoay vòng refresh token: token cũ bị huỷ, token mới nằm trong Set-Cookie
async function refreshSession(sessionId: string, refreshToken: string) {
  const res = await midu
    .post<{ data: { accessToken: string } }>(
      "/auth/refresh",
      {},
      { headers: { Cookie: `refreshToken=${refreshToken}` } },
    )
    .catch(() => {
      throw AppError.unauthorized(SESSION_EXPIRED_MESSAGE);
    });

  const accessToken = res.data.data.accessToken;
  const newRefreshToken = readRefreshCookie(res.headers["set-cookie"]);
  if (!accessToken || !newRefreshToken) {
    throw AppError.unauthorized(SESSION_EXPIRED_MESSAGE);
  }

  await SessionModel.updateOne(
    { sessionId },
    { miduAccessToken: accessToken, miduRefreshToken: newRefreshToken },
  );
  return accessToken;
}

// Gọi MIDU bằng access token của session; hết hạn thì refresh và thử lại 1 lần
export async function withMiduToken<T>(
  sessionId: string,
  fn: (accessToken: string) => Promise<T>,
) {
  const session = await SessionModel.findOne({ sessionId });
  if (!session) throw AppError.unauthorized(SESSION_EXPIRED_MESSAGE);

  try {
    return await fn(session.miduAccessToken);
  } catch (err) {
    if (!isUnauthorized(err)) throw err;
  }

  const accessToken = await refreshSession(sessionId, session.miduRefreshToken);
  try {
    return await fn(accessToken);
  } catch (err) {
    if (isUnauthorized(err)) throw AppError.unauthorized(SESSION_EXPIRED_MESSAGE);
    throw err;
  }
}

export async function setAppRoles(
  accessToken: string,
  accountId: string,
  roles: string[],
) {
  await midu.put(
    `/admin/accounts/${encodeURIComponent(accountId)}/roles`,
    { appId: env.SSO_CLIENT_ID, roles },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

export function toRoleUpdateError(err: unknown): never {
  if (err instanceof AppError) throw err;
  if (axios.isAxiosError(err) && err.response?.status === 403) {
    throw AppError.forbidden(
      "Tài khoản MIDU của bạn không có quyền cập nhật role",
    );
  }
  toAppError(err, "Cập nhật role trên MIDU thất bại");
}
