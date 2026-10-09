import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/app-error.js";
import type { UserDocument } from "../user/user.model.js";
import { authService } from "./auth.service.js";

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const sessionId = req.cookies.sid;
  const user = sessionId ? await authService.getUserBySession(sessionId) : null;

  if (!user) {
    throw AppError.unauthorized("Chưa đăng nhập hoặc phiên đã hết hạn");
  }

  req.user = user;
  next();
}
