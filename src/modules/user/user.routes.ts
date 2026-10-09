import { Router } from "express";
import { validateBody, validateQuery } from "../../middlewares/validate.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { requirePermission } from "../rbac/rbac.middleware.js";
import { userController } from "./user.controller.js";
import { listUsersQuerySchema, updateRoleSchema } from "./user.schema.js";

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get(
  "/",
  requirePermission("users:read"),
  validateQuery(listUsersQuerySchema),
  userController.list,
);

userRouter.patch(
  "/:id/role",
  requirePermission("users:update-role"),
  validateBody(updateRoleSchema),
  userController.updateRole,
);
