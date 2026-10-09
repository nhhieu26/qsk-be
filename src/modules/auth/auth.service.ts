import { env } from "../../config/env.js";
import { randomString, sha256Base64url } from "../../utils/crypto.js";
import { fromMiduRoles } from "../rbac/rbac.constants.js";
import { UserModel } from "../user/user.model.js";
import { midu, toAppError } from "./midu.client.js";
import { SessionModel } from "./session.model.js";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface MiduTokenResponse {
  data: {
    access_token: string;
    refresh_token: string;
    account: {
      accountId: string;
      phoneNumber: string;
      fullName?: string;
      email?: string;
      shopId?: string;
      roles?: Record<string, string[]>;
    };
  };
}

function createLoginUrl() {
  const state = randomString();
  const codeVerifier = randomString();
  const codeChallenge = sha256Base64url(codeVerifier);

  const params = new URLSearchParams({
    client_id: env.SSO_CLIENT_ID,
    redirect_uri: env.SSO_REDIRECT_URI,
    response_type: "code",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return {
    state,
    codeVerifier,
    url: `${env.AUTH_FRONTEND_URL}/login?${params}`,
  };
}

async function loginWithCode(code: string, codeVerifier: string) {
  const res = await midu
    .post<MiduTokenResponse>("/auth/token", {
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      client_id: env.SSO_CLIENT_ID,
      client_secret: env.SSO_CLIENT_SECRET,
      redirect_uri: env.SSO_REDIRECT_URI,
    })
    .catch(toAppError);

  const { access_token, refresh_token, account } = res.data.data;

  const user = await UserModel.findOneAndUpdate(
    { accountId: account.accountId },
    {
      phoneNumber: account.phoneNumber,
      fullName: account.fullName,
      email: account.email,
      shopId: account.shopId,
      role: fromMiduRoles(account.roles?.[env.SSO_CLIENT_ID]),
      lastLoginAt: new Date(),
    },
    { upsert: true, new: true },
  );

  const session = await SessionModel.create({
    sessionId: randomString(),
    user: user._id,
    miduAccessToken: access_token,
    miduRefreshToken: refresh_token,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });

  return { user, session };
}

async function getUserBySession(sessionId: string) {
  const session = await SessionModel.findOne({
    sessionId,
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;

  return UserModel.findById(session.user);
}

async function logout(sessionId: string) {
  const session = await SessionModel.findOneAndDelete({ sessionId });
  if (!session) return;

  await midu
    .post(
      "/auth/logout",
      {},
      {
        headers: { Cookie: `refreshToken=${session.miduRefreshToken}` },
      },
    )
    .catch(() => {});
}

export const authService = {
  createLoginUrl,
  loginWithCode,
  getUserBySession,
  logout,
};
