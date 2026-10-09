import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { validateBody } from "../../middlewares/validate.js";
import { sendSuccess } from "../../utils/api-response.js";
import { AppError } from "../../utils/app-error.js";
import { requirePermission, requireShop } from "../access/access.middleware.js";
import { PERMISSIONS } from "../access/access.permissions.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { orderController } from "../order/order.controller.js";
import { shippingQuoteSchema } from "../order/order.schema.js";
import { shippingService } from "./shipping.service.js";

const provinceIdSchema = z.coerce.number().int().positive();

async function provinces(_req: Request, res: Response) {
  sendSuccess(res, { provinces: await shippingService.listProvinces() });
}

async function wards(req: Request<{ provinceId: string }>, res: Response) {
  const provinceId = provinceIdSchema.safeParse(req.params.provinceId);
  if (!provinceId.success) throw AppError.badRequest("Mã tỉnh/thành không hợp lệ");
  sendSuccess(res, { wards: await shippingService.listWards(provinceId.data) });
}

export const shippingRouter = Router();

shippingRouter.use(requireAuth, requireShop);

const canSell = requirePermission(PERMISSIONS.salesCreate, PERMISSIONS.ordersView);

shippingRouter.get("/provinces", canSell, provinces);
shippingRouter.get("/provinces/:provinceId/wards", canSell, wards);
shippingRouter.post(
  "/quote",
  requirePermission(PERMISSIONS.salesCreate),
  validateBody(shippingQuoteSchema),
  orderController.quoteShipping,
);
