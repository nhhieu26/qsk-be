import type { UpdateQuery } from "mongoose";
import { AppError } from "../../utils/app-error.js";
import type { ActorContext } from "../access/access.middleware.js";
import { customerService } from "../customer/customer.service.js";
import { stockLedger } from "../stock/stock-ledger.js";
import { OrderModel, type Order, type OrderDocument } from "./order.model.js";
import { availableActions, type OrderActions } from "./order.rules.js";
import { awardPoints, findOwnOrder } from "./order.service.js";
import { toOrderView } from "./order.view.js";

/**
 * Chuyển trạng thái có kiểm tra luật (`availableActions`, giống frontend) và
 * khoá lạc quan: chỉ ghi khi trạng thái chưa bị ai đổi kể từ lúc đọc, nên bấm
 * hai lần / hai máy cùng bấm không cộng điểm hay hoàn kho hai lần.
 */
async function transition(
  actor: ActorContext,
  id: string,
  guard: keyof OrderActions,
  message: string,
  update: (o: OrderDocument) => UpdateQuery<Order>,
): Promise<OrderDocument> {
  const order = await findOwnOrder(actor, id);
  const actions = availableActions({
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    isDelivery: order.shipping.method !== "pickup",
  });
  if (!actions[guard]) throw AppError.badRequest(message);

  const updated = await OrderModel.findOneAndUpdate(
    { _id: order._id, status: order.status, paymentStatus: order.paymentStatus },
    update(order),
    { returnDocument: "after", runValidators: true },
  );
  if (!updated) throw AppError.conflict("Đơn vừa được cập nhật ở nơi khác, tải lại để xem");
  return updated;
}

async function markPaid(actor: ActorContext, id: string) {
  const order = await transition(actor, id, "canMarkPaid", "Đơn này không cần xác nhận thanh toán", () => ({
    $set: { paymentStatus: "paid", paidAt: new Date() },
  }));
  return toOrderView(order);
}

async function approve(actor: ActorContext, id: string) {
  const order = await transition(
    actor,
    id,
    "canApprove",
    "Chưa duyệt được: đơn chuyển khoản cần xác nhận đã nhận tiền trước",
    () => ({ $set: { status: "approved" } }),
  );
  return toOrderView(order);
}

/** Bàn giao đơn vị vận chuyển: ghi mã vận đơn, chờ shipper đến lấy. */
async function handOver(actor: ActorContext, id: string, trackingCode: string) {
  const order = await transition(actor, id, "canHandOver", "Chỉ bàn giao được đơn giao hàng đã duyệt", () => ({
    $set: { status: "awaitingPickup", "shipping.trackingCode": trackingCode },
  }));
  return toOrderView(order);
}

async function markShipping(actor: ActorContext, id: string) {
  const order = await transition(actor, id, "canMarkShipping", "Đơn chưa bàn giao cho đơn vị vận chuyển", () => ({
    $set: { status: "shipping" },
  }));
  return toOrderView(order);
}

async function markReady(actor: ActorContext, id: string) {
  const order = await transition(actor, id, "canMarkReady", "Chỉ đơn nhận tại quầy đã duyệt mới báo khách đến lấy", () => ({
    $set: { status: "readyForPickup" },
  }));
  return toOrderView(order);
}

/** Hoàn tất: COD coi như đã thu tiền; cộng điểm tích luỹ cho khách. */
async function complete(actor: ActorContext, id: string) {
  const order = await transition(actor, id, "canComplete", "Đơn chưa thể hoàn tất: tại quầy cần thu tiền trước", (o) => ({
    $set: { status: "completed", paymentStatus: "paid", paidAt: o.paidAt ?? new Date() },
  }));
  await awardPoints(actor, order);
  return toOrderView(order);
}

/** Huỷ: hoàn kho từng dòng (thẻ kho `orderCancel`) và hoàn điểm đã dùng. */
async function cancel(actor: ActorContext, id: string, reason: string) {
  const order = await transition(
    actor,
    id,
    "canCancel",
    "Hàng đã rời quầy hoặc đơn đã xong, không huỷ được",
    (o) => ({
      $set: {
        status: "cancelled",
        cancelReason: reason,
        ...(o.paymentStatus === "paid" && { paymentStatus: "refunded" }),
      },
    }),
  );

  for (const line of order.lines) {
    await stockLedger.changeStock(actor, line.product, line.quantity, {
      type: "orderCancel",
      reference: order.code,
      reason,
    });
  }
  await customerService.addPoints(actor, order.customer.ref, order.pointsUsed);
  return toOrderView(order);
}

export const orderTransitions = {
  markPaid,
  approve,
  handOver,
  markShipping,
  markReady,
  complete,
  cancel,
};
