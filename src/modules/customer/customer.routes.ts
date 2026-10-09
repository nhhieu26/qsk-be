import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { validateQuery } from "../../middlewares/validate.js";
import { sendSuccess } from "../../utils/api-response.js";
import { getActor, requirePermission, requireShop } from "../access/access.middleware.js";
import { PERMISSIONS } from "../access/access.permissions.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { customerService } from "./customer.service.js";

const searchQuerySchema = z.object({ q: z.string().trim().max(100).default("") });

async function search(req: Request, res: Response) {
  const { q } = req.query as unknown as z.infer<typeof searchQuerySchema>;
  const customers = await customerService.search(getActor(req), q);
  sendSuccess(res, { customers });
}

export const customerRouter = Router();

customerRouter.use(requireAuth, requireShop);

customerRouter.get(
  "/",
  requirePermission(PERMISSIONS.salesCreate, PERMISSIONS.ordersView),
  validateQuery(searchQuerySchema),
  search,
);
