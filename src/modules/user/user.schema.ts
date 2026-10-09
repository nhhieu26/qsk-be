import { z } from "zod";
import { ROLES } from "../rbac/rbac.constants.js";

export const updateRoleSchema = z.object({
  role: z.enum(ROLES),
});

export type UpdateRoleBody = z.infer<typeof updateRoleSchema>;

export const listUsersQuerySchema = z.object({
  role: z.enum(["customer", "agency"]).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
