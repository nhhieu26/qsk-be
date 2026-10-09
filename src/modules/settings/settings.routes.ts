import { Router, type Request, type Response } from "express";
import { validateBody } from "../../middlewares/validate.js";
import { sendSuccess } from "../../utils/api-response.js";
import { getActor, requirePermission, requireShop } from "../access/access.middleware.js";
import { PERMISSIONS } from "../access/access.permissions.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  updatePaymentAccountSchema,
  updateStoreSchema,
  type UpdatePaymentAccountInput,
  type UpdateStoreInput,
} from "./settings.schema.js";
import { settingsService } from "./settings.service.js";

async function get(req: Request, res: Response) {
  sendSuccess(res, { settings: await settingsService.get(getActor(req)) });
}

async function updateStore(req: Request, res: Response) {
  const settings = await settingsService.updateStore(getActor(req), req.body as UpdateStoreInput);
  sendSuccess(res, { settings }, { message: "Đã lưu thông tin điểm" });
}

async function updatePaymentAccount(req: Request, res: Response) {
  const settings = await settingsService.updatePaymentAccount(
    getActor(req),
    req.body as UpdatePaymentAccountInput,
  );
  sendSuccess(res, { settings }, { message: "Đã lưu tài khoản nhận tiền" });
}

export const settingsRouter = Router();

settingsRouter.use(requireAuth, requireShop);

const canUpdate = requirePermission(PERMISSIONS.settingsUpdate);

settingsRouter.get("/", requirePermission(PERMISSIONS.settingsView), get);
settingsRouter.put("/store", canUpdate, validateBody(updateStoreSchema), updateStore);
settingsRouter.put(
  "/payment-account",
  canUpdate,
  validateBody(updatePaymentAccountSchema),
  updatePaymentAccount,
);
