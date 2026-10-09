import type { CookieOptions, Request, Response } from "express";
import { env } from "../../config/env.js";
import { sendSuccess } from "../../utils/api-response.js";
import { AppError } from "../../utils/app-error.js";
import { userService } from "../user/user.service.js";
import type { SsoCallbackBody } from "./auth.schema.js";
import { authService } from "./auth.service.js";

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
};

async function ssoLogin(_req: Request, res: Response) {
  const { state, codeVerifier, url } = authService.createLoginUrl();

  const tenMinutes = 10 * 60 * 1000;
  res.cookie("sso_state", state, { ...cookieOptions, maxAge: tenMinutes });
  res.cookie("sso_verifier", codeVerifier, {
    ...cookieOptions,
    maxAge: tenMinutes,
  });

  res.redirect(url);
}

async function ssoCallback(req: Request, res: Response) {
  const { code, state } = req.body as SsoCallbackBody;
  const savedState = req.cookies.sso_state;
  const codeVerifier = req.cookies.sso_verifier;

  res.clearCookie("sso_state", cookieOptions);
  res.clearCookie("sso_verifier", cookieOptions);

  if (!savedState || !codeVerifier || state !== savedState) {
    throw AppError.badRequest("Phiên đăng nhập không hợp lệ, vui lòng thử lại");
  }

  const { user, session } = await authService.loginWithCode(code, codeVerifier);

  res.cookie("sid", session.sessionId, {
    ...cookieOptions,
    expires: session.expiresAt,
  });
  sendSuccess(res, { user: userService.toUserResponse(user) });
}

async function me(req: Request, res: Response) {
  sendSuccess(res, { user: userService.toUserResponse(req.user!) });
}

async function logout(req: Request, res: Response) {
  if (req.cookies.sid) {
    await authService.logout(req.cookies.sid);
  }

  res.clearCookie("sid", cookieOptions);
  sendSuccess(res, null, { message: "Đã đăng xuất" });
}

export const authController = { ssoLogin, ssoCallback, me, logout };
