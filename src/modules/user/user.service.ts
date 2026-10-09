import { isValidObjectId } from "mongoose";
import { buildPagination } from "../../utils/api-response.js";
import { AppError } from "../../utils/app-error.js";
import {
  setAppRoles,
  toRoleUpdateError,
  withMiduToken,
} from "../auth/midu.client.js";
import {
  getPermissions,
  toMiduRole,
  type Role,
} from "../rbac/rbac.constants.js";
import type { ListUsersQuery } from "./user.schema.js";
import { UserModel, type UserDocument } from "./user.model.js";

function toUserResponse(user: UserDocument) {
  return { ...user.toObject(), permissions: getPermissions(user.role) };
}

const MEMBER_ROLES: Role[] = ["customer", "agency"];

async function list({ role, search, page, limit }: ListUsersQuery) {
  const filter: Record<string, unknown> = { role: role ?? { $in: MEMBER_ROLES } };
  if (search) {
    const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ fullName: pattern }, { phoneNumber: pattern }];
  }

  const [users, total, grouped] = await Promise.all([
    UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    UserModel.countDocuments(filter),
    UserModel.aggregate<{ _id: Role; count: number }>([
      { $match: { role: { $in: MEMBER_ROLES } } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
  ]);

  const counts = { customer: 0, agency: 0 };
  for (const { _id, count } of grouped) {
    if (_id === "customer" || _id === "agency") counts[_id] = count;
  }

  return {
    users: users.map(toUserResponse),
    counts,
    pagination: buildPagination(page, limit, total),
  };
}

async function updateRole(
  actor: UserDocument,
  sessionId: string,
  userId: string,
  role: Role,
) {
  if (!isValidObjectId(userId)) {
    throw AppError.notFound("Không tìm thấy người dùng");
  }
  if (actor._id.equals(userId)) {
    throw AppError.badRequest("Không thể tự thay đổi role của chính mình");
  }

  const user = await UserModel.findById(userId);
  if (!user) throw AppError.notFound("Không tìm thấy người dùng");

  await withMiduToken(sessionId, (accessToken) =>
    setAppRoles(accessToken, user.accountId, [toMiduRole(role)]),
  ).catch(toRoleUpdateError);

  user.role = role;
  return user.save();
}

export const userService = { toUserResponse, list, updateRole };
