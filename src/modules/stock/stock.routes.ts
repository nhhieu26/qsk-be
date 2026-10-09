import { Router } from "express";
import { validateBody, validateQuery } from "../../middlewares/validate.js";
import {
  requirePermission,
  requireShop,
} from "../access/access.middleware.js";
import { PERMISSIONS } from "../access/access.permissions.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { stockController } from "./stock.controller.js";
import {
  adjustStockSchema,
  importStockSchema,
  listMovementsQuerySchema,
  returnLoanSchema,
  stocktakeSchema,
} from "./stock.schema.js";

export const stockRouter = Router();

stockRouter.use(requireAuth, requireShop);

stockRouter.get(
  "/movements",
  requirePermission(PERMISSIONS.stockView),
  validateQuery(listMovementsQuerySchema),
  stockController.listMovements,
);
stockRouter.post(
  "/imports",
  requirePermission(PERMISSIONS.stockImport),
  validateBody(importStockSchema),
  stockController.importStock,
);
stockRouter.post(
  "/adjustments",
  requirePermission(PERMISSIONS.stockAdjust),
  validateBody(adjustStockSchema),
  stockController.adjust,
);
stockRouter.post(
  "/stocktakes",
  requirePermission(PERMISSIONS.stockStocktake),
  validateBody(stocktakeSchema),
  stockController.stocktake,
);
stockRouter.post(
  "/loans/:loanId/returns",
  requirePermission(PERMISSIONS.stockAdjust),
  validateBody(returnLoanSchema),
  stockController.returnLoan,
);
