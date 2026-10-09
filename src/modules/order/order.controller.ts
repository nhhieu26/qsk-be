import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "../../utils/api-response.js";
import { getActor } from "../access/access.middleware.js";
import type { CreateOrderInput, ListOrdersQuery, ShippingQuoteInput } from "./order.schema.js";
import { orderService } from "./order.service.js";
import { orderTransitions } from "./order.transitions.js";

type IdParams = { id: string };

async function list(req: Request, res: Response) {
  sendSuccess(res, await orderService.list(getActor(req), req.query as unknown as ListOrdersQuery));
}

async function get(req: Request<IdParams>, res: Response) {
  sendSuccess(res, { order: await orderService.get(getActor(req), req.params.id) });
}

async function create(req: Request, res: Response) {
  const order = await orderService.create(getActor(req), req.body as CreateOrderInput);
  sendCreated(res, { order }, `Đã tạo đơn ${order.code}`);
}

async function quoteShipping(req: Request, res: Response) {
  const quote = await orderService.quoteShipping(getActor(req), req.body as ShippingQuoteInput);
  sendSuccess(res, { quote });
}

async function payment(req: Request<IdParams>, res: Response) {
  sendSuccess(res, { payment: await orderService.paymentInfo(getActor(req), req.params.id) });
}

async function markPaid(req: Request<IdParams>, res: Response) {
  const order = await orderTransitions.markPaid(getActor(req), req.params.id);
  sendSuccess(res, { order }, { message: "Đã xác nhận thu tiền" });
}

async function approve(req: Request<IdParams>, res: Response) {
  const order = await orderTransitions.approve(getActor(req), req.params.id);
  sendSuccess(res, { order }, { message: "Đã duyệt đơn" });
}

async function handOver(req: Request<IdParams>, res: Response) {
  const { trackingCode } = req.body as { trackingCode: string };
  const order = await orderTransitions.handOver(getActor(req), req.params.id, trackingCode);
  sendSuccess(res, { order }, { message: "Đã bàn giao, chờ đơn vị vận chuyển lấy hàng" });
}

async function markShipping(req: Request<IdParams>, res: Response) {
  const order = await orderTransitions.markShipping(getActor(req), req.params.id);
  sendSuccess(res, { order }, { message: "Đã chuyển sang đang giao" });
}

async function markReady(req: Request<IdParams>, res: Response) {
  const order = await orderTransitions.markReady(getActor(req), req.params.id);
  sendSuccess(res, { order }, { message: "Đơn sẵn sàng, chờ khách đến nhận" });
}

async function updateNote(req: Request<IdParams>, res: Response) {
  const { note } = req.body as { note: string };
  sendSuccess(res, { order: await orderService.updateNote(getActor(req), req.params.id, note) }, { message: "Đã lưu ghi chú" });
}

async function complete(req: Request<IdParams>, res: Response) {
  const order = await orderTransitions.complete(getActor(req), req.params.id);
  sendSuccess(res, { order }, { message: "Đơn đã hoàn tất" });
}

async function cancel(req: Request<IdParams>, res: Response) {
  const { reason } = req.body as { reason: string };
  const order = await orderTransitions.cancel(getActor(req), req.params.id, reason);
  sendSuccess(res, { order }, { message: "Đã huỷ đơn" });
}

export const orderController = {
  list,
  get,
  create,
  quoteShipping,
  payment,
  markPaid,
  approve,
  handOver,
  markShipping,
  markReady,
  updateNote,
  complete,
  cancel,
};
