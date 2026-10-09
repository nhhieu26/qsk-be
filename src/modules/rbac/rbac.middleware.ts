import type { RequestHandler } from "express";
import { AppError } from "../../utils/app-error.js";
import { hasPermission, type Permission, type Role } from "./rbac.constants.js";

const FORBIDDEN_MESSAGE = "Bạn không có quyền thực hiện thao tác này";

// Dùng sau requireAuth
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw AppError.forbidden(FORBIDDEN_MESSAGE);
    }
    next();
  };
}

// Dùng sau requireAuth; yêu cầu có đủ tất cả permission
export function requirePermission(...permissions: Permission[]): RequestHandler {
  return (req, _res, next) => {
    const user = req.user;
    if (!user || !permissions.every((p) => hasPermission(user.role, p))) {
      throw AppError.forbidden(FORBIDDEN_MESSAGE);
    }
    next();
  };
}
