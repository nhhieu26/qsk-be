import { Router } from "express";
import { validateBody } from "../../middlewares/validate.js";
import {
  requirePermission,
  requireShop,
} from "../access/access.middleware.js";
import { PERMISSIONS } from "../access/access.permissions.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { productController } from "./product.controller.js";
import {
  addDocumentSchema,
  createProductSchema,
  productInputSchema,
  updateClaimsSchema,
} from "./product.schema.js";

export const productRouter = Router();

productRouter.use(requireAuth, requireShop);

// Màn Kho cũng đọc danh sách sản phẩm nên quyền xem kho cũng được đọc.
const canView = requirePermission(PERMISSIONS.productsView, PERMISSIONS.stockView);

productRouter.get("/", canView, productController.list);
productRouter.get("/:id", canView, productController.get);
productRouter.post(
  "/",
  requirePermission(PERMISSIONS.productsCreate),
  validateBody(createProductSchema),
  productController.create,
);
productRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.productsUpdate),
  validateBody(productInputSchema),
  productController.update,
);
productRouter.put(
  "/:id/claims",
  requirePermission(PERMISSIONS.productsUpdate),
  validateBody(updateClaimsSchema),
  productController.updateClaims,
);
productRouter.post(
  "/:id/documents",
  requirePermission(PERMISSIONS.productsDocuments),
  validateBody(addDocumentSchema),
  productController.addDocument,
);
productRouter.delete(
  "/:id/documents/:type",
  requirePermission(PERMISSIONS.productsDocuments),
  productController.removeDocument,
);
