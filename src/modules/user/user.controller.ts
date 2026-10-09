import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import type { ListUsersQuery, UpdateRoleBody } from "./user.schema.js";
import { userService } from "./user.service.js";

async function list(_req: Request, res: Response) {
  const result = await userService.list(res.locals.query as ListUsersQuery);
  sendSuccess(res, result);
}

async function updateRole(req: Request<{ id: string }>, res: Response) {
  const { role } = req.body as UpdateRoleBody;
  const user = await userService.updateRole(
    req.user!,
    req.cookies.sid,
    req.params.id,
    role,
  );
  sendSuccess(res, { user }, { message: "Đã cập nhật role" });
}

export const userController = { list, updateRole };
