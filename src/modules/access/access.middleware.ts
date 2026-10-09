import type { NextFunction, Request, Response } from "express";
import type { Types } from "mongoose";
import { AppError } from "../../utils/app-error.js";
import type { UserDocument } from "../user/user.model.js";
import {
  POS_ROLE_PERMISSIONS,
  WILDCARD,
  type Permission,
} from "./access.permissions.js";

/** Ai đang thao tác và trên quầy nào; mọi dữ liệu hàng hoá/kho lọc theo `shopId`. */
export type ActorContext = {
  shopId: string;
  actorId: Types.ObjectId;
  actorName: string;
};

function grantedPermissions(user: UserDocument): ReadonlySet<string> {
  return new Set(POS_ROLE_PERMISSIONS[user.role] ?? []);
}

function hasPermission(granted: ReadonlySet<string>, permission: Permission) {
  if (granted.has(WILDCARD) || granted.has(permission)) return true;
  const moduleName = permission.split(".")[0];
  return granted.has(`${moduleName}.${WILDCARD}`);
}

/** Cho qua khi user có ÍT NHẤT MỘT trong các quyền. Đặt sau `requireAuth`. */
export function requirePermission(...anyOf: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw AppError.unauthorized();
    const granted = grantedPermissions(req.user);
    if (!anyOf.some((p) => hasPermission(granted, p))) {
      throw AppError.forbidden("Bạn không có quyền thực hiện thao tác này");
    }
    next();
  };
}

/** Chặn tài khoản chưa gắn quầy. Đặt sau `requireAuth`. */
export function requireShop(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.shopId) {
    throw AppError.forbidden("Tài khoản chưa được gắn với quầy nào");
  }
  next();
}

export function getActor(req: Request): ActorContext {
  const user = req.user;
  if (!user?.shopId) throw AppError.forbidden("Tài khoản chưa được gắn với quầy nào");
  return {
    shopId: user.shopId,
    actorId: user._id,
    actorName: user.fullName || user.phoneNumber,
  };
}
