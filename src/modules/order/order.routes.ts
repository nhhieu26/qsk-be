import { Router } from "express";
import { validateBody, validateQuery } from "../../middlewares/validate.js";
import { requirePermission, requireShop } from "../access/access.middleware.js";
import { PERMISSIONS } from "../access/access.permissions.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { orderController } from "./order.controller.js";
import {
  cancelOrderSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  handOverOrderSchema,
  updateOrderNoteSchema,
} from "./order.schema.js";

export const orderRouter = Router();

orderRouter.use(requireAuth, requireShop);

const canView = requirePermission(PERMISSIONS.ordersView, PERMISSIONS.salesCreate);
const canUpdate = requirePermission(PERMISSIONS.ordersUpdate);

orderRouter.get("/", canView, validateQuery(listOrdersQuerySchema), orderController.list);
orderRouter.post(
  "/",
  requirePermission(PERMISSIONS.salesCreate),
  validateBody(createOrderSchema),
  orderController.create,
);
orderRouter.get("/:id", canView, orderController.get);
orderRouter.get("/:id/payment", canView, orderController.payment);
orderRouter.post("/:id/mark-paid", canUpdate, orderController.markPaid);
orderRouter.post("/:id/approve", canUpdate, orderController.approve);
orderRouter.post("/:id/hand-over", canUpdate, validateBody(handOverOrderSchema), orderController.handOver);
orderRouter.post("/:id/mark-shipping", canUpdate, orderController.markShipping);
orderRouter.post("/:id/mark-ready", canUpdate, orderController.markReady);
orderRouter.patch("/:id/note", canUpdate, validateBody(updateOrderNoteSchema), orderController.updateNote);
orderRouter.post("/:id/complete", canUpdate, orderController.complete);
orderRouter.post(
  "/:id/cancel",
  requirePermission(PERMISSIONS.ordersCancel),
  validateBody(cancelOrderSchema),
  orderController.cancel,
);
