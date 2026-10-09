import type { QueryFilter } from "mongoose";
import { settingsService } from "../settings/settings.service.js";
import { AppError } from "../../utils/app-error.js";
import { buildPagination } from "../../utils/api-response.js";
import { dayRangeInAppTimeZone, todayInAppTimeZone } from "../../utils/date.js";
import { escapeRegExp, normalizeSearch } from "../../utils/text.js";
import { buildVietQrPayload } from "../../utils/vietqr.js";
import type { ActorContext } from "../access/access.middleware.js";
import { nextSequence } from "../counter/counter.model.js";
import { customerService } from "../customer/customer.service.js";
import { shippingService } from "../shipping/shipping.service.js";
import { stockLedger } from "../stock/stock-ledger.js";
import { OrderModel, type Order, type OrderDocument } from "./order.model.js";
import { priceLines, summarizeLines, type PricedLine } from "./order.pricing.js";
import { calculateTotals, initialState, ORDER_STATUSES, type OrderStatus } from "./order.rules.js";
import type { CreateOrderInput, ListOrdersQuery, ShippingQuoteInput } from "./order.schema.js";
import { toOrderView } from "./order.view.js";

const ROLLBACK_SALE_REASON = "Tạo đơn lỗi, hoàn lại kho";

/** Thu hộ: ViettelPost tính phí thu hộ theo tiền hàng. */
function codAmountOf(paymentMethod: string, subtotal: number) {
  return paymentMethod === "cod" ? subtotal : 0;
}

async function nextOrderCode(actor: ActorContext) {
  const day = todayInAppTimeZone().slice(2).replaceAll("-", "");
  const seq = await nextSequence(`order:${actor.shopId}:${day}`);
  return `DH${day}${String(seq).padStart(3, "0")}`;
}

export async function findOwnOrder(actor: ActorContext, id: string): Promise<OrderDocument> {
  const order = await OrderModel.findOne({ _id: id, shopId: actor.shopId });
  if (!order) throw AppError.notFound("Không tìm thấy đơn hàng");
  return order;
}

/** Cộng điểm tích luỹ đúng một lần cho đơn (cờ `pointsAwarded` đổi nguyên tử). */
export async function awardPoints(actor: ActorContext, order: OrderDocument) {
  const claimed = await OrderModel.findOneAndUpdate(
    { _id: order._id, pointsAwarded: false },
    { $set: { pointsAwarded: true } },
  );
  if (claimed) {
    await customerService.addPoints(actor, order.customer.ref, order.totals.earnedPoints);
  }
}

export function buildOrderSearchText(code: string, customerName: string, phone: string): string {
  return normalizeSearch(`${code} ${customerName} ${phone}`);
}

/** Điều kiện lọc chung (trừ trạng thái), dùng cho cả danh sách lẫn số đếm mỗi tab. */
function baseFilter(actor: ActorContext, query: ListOrdersQuery): QueryFilter<Order> {
  const q = normalizeSearch(query.q);
  const createdAt = dayRangeInAppTimeZone(query.from, query.to);
  return {
    shopId: actor.shopId,
    ...(query.paymentStatus && { paymentStatus: query.paymentStatus }),
    ...(query.paymentMethod && { paymentMethod: query.paymentMethod }),
    ...(query.shippingMethod && { "shipping.method": query.shippingMethod }),
    ...(q && { searchText: { $regex: escapeRegExp(q) } }),
    ...(Object.keys(createdAt).length > 0 && { createdAt }),
  };
}

type StatusCounts = Record<OrderStatus | "all", number>;

async function countByStatus(filter: QueryFilter<Order>): Promise<StatusCounts> {
  const rows = await OrderModel.aggregate<{ _id: OrderStatus; n: number }>([
    { $match: filter },
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]);
  const zero = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  const byStatus = rows.reduce((acc, r) => ({ ...acc, [r._id]: r.n }), zero);
  return { ...byStatus, all: rows.reduce((sum, r) => sum + r.n, 0) };
}

/** Danh sách đơn có lọc + phân trang; `counts` là số đơn mỗi trạng thái theo cùng bộ lọc. */
async function list(actor: ActorContext, query: ListOrdersQuery) {
  const base = baseFilter(actor, query);
  const filter = query.status ? { ...base, status: query.status } : base;
  const [orders, total, counts] = await Promise.all([
    OrderModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    OrderModel.countDocuments(filter),
    countByStatus(base),
  ]);
  return {
    orders: orders.map(toOrderView),
    pagination: buildPagination(query.page, query.limit, total),
    counts,
  };
}

/** Ghi chú nội bộ sửa được ở mọi trạng thái; chuỗi rỗng là xoá ghi chú. */
async function updateNote(actor: ActorContext, id: string, note: string) {
  const order = await OrderModel.findOneAndUpdate(
    { _id: id, shopId: actor.shopId },
    note === "" ? { $unset: { note: 1 } } : { $set: { note } },
    { returnDocument: "after", runValidators: true },
  );
  if (!order) throw AppError.notFound("Không tìm thấy đơn hàng");
  return toOrderView(order);
}

async function get(actor: ActorContext, id: string) {
  return toOrderView(await findOwnOrder(actor, id));
}

/** Báo phí ship cho trang đặt hàng; cùng công thức với lúc tạo đơn. */
async function quoteShipping(actor: ActorContext, input: ShippingQuoteInput) {
  const priced = await priceLines(actor, input.lines);
  const { subtotal, weight } = summarizeLines(priced);
  return shippingService.quote(input.method, input.address, {
    subtotal,
    weight,
    codAmount: codAmountOf(input.paymentMethod, subtotal),
  });
}

type Undo = () => Promise<unknown>;

async function runUndo(steps: readonly Undo[]) {
  for (const step of [...steps].reverse()) {
    await step().catch((err: unknown) => console.error("Hoàn tác tạo đơn lỗi:", err));
  }
}

async function deductStock(actor: ActorContext, lines: readonly PricedLine[], code: string, customerName: string, undo: Undo[]) {
  for (const line of lines) {
    await stockLedger.changeStock(actor, line.product._id, -line.quantity, {
      type: "sale",
      reference: code,
      counterparty: customerName,
      unitPrice: line.price,
    });
    undo.push(() =>
      stockLedger.changeStock(actor, line.product._id, line.quantity, {
        type: "orderCancel",
        reference: code,
        reason: ROLLBACK_SALE_REASON,
      }),
    );
  }
}

/**
 * Tạo đơn: chốt giá + phí ship ở server, so `expectedTotal`, rồi trừ điểm, trừ
 * kho, lưu đơn. Không có transaction nên mỗi bước có tác dụng phụ đều ghi bước
 * hoàn tác; lỗi giữa chừng thì hoàn lại theo thứ tự ngược.
 */
async function create(actor: ActorContext, input: CreateOrderInput) {
  const priced = await priceLines(actor, input.lines);
  const { subtotal, weight } = summarizeLines(priced);
  const recipient = input.shipping.recipient;
  const quote = await shippingService.quote(input.shipping.method, recipient?.address, {
    subtotal,
    weight,
    codAmount: codAmountOf(input.payment.method, subtotal),
  });

  const existing = await customerService.findForOrder(actor, input.customer);
  const totals = calculateTotals({
    subtotal,
    shippingFee: quote.fee,
    pointsUsed: input.payment.pointsUsed,
    availablePoints: existing?.points ?? 0,
  });
  if (totals.total !== input.expectedTotal) {
    throw AppError.conflict("Giá, phí ship hoặc điểm đã thay đổi, kiểm tra lại đơn trước khi đặt");
  }

  const customer = await customerService.upsertForOrder(actor, {
    ...input.customer,
    address: recipient?.address,
    invoice: input.invoice,
  });
  const code = await nextOrderCode(actor);
  const undo: Undo[] = [];

  try {
    await customerService.spendPoints(actor, customer._id, totals.pointsDiscount);
    undo.push(() => customerService.addPoints(actor, customer._id, totals.pointsDiscount));
    await deductStock(actor, priced, code, customer.name, undo);

    const isDelivery = input.shipping.method !== "pickup";
    const state = initialState({
      collectedNow: input.payment.collectedNow,
      paymentMethod: input.payment.method,
      isDelivery,
    });
    const order = await OrderModel.create({
      shopId: actor.shopId,
      code,
      ...state,
      paymentMethod: input.payment.method,
      ...(state.paymentStatus === "paid" && { paidAt: new Date() }),
      customer: { ref: customer._id, name: customer.name, phone: customer.phone, email: customer.email },
      shipping: {
        method: input.shipping.method,
        fee: quote.fee,
        carrierFee: quote.carrierFee,
        weight: quote.weight,
        recipient,
        note: isDelivery ? input.shipping.note : undefined,
      },
      invoice: input.invoice,
      lines: priced.map((l) => ({ product: l.product._id, name: l.name, price: l.price, quantity: l.quantity })),
      pointsUsed: totals.pointsDiscount,
      totals,
      note: input.note,
      searchText: buildOrderSearchText(code, customer.name, customer.phone),
      createdBy: actor.actorName,
      createdById: actor.actorId,
    });

    if (order.status === "completed") await awardPoints(actor, order);
    return toOrderView(order);
  } catch (err) {
    await runUndo(undo);
    throw err;
  }
}

/** Thông tin chuyển khoản (VietQR) cho khách; nội dung CK = mã đơn để đối soát. */
async function paymentInfo(actor: ActorContext, id: string) {
  const order = await findOwnOrder(actor, id);
  // Tài khoản nhận tiền cài ở màn Cài đặt; chưa cài thì dùng env PAYMENT_*.
  const account = await settingsService.getPaymentAccount(actor.shopId);
  if (!account) {
    throw new AppError(503, "Quầy chưa cài tài khoản nhận thanh toán (Cài đặt → Tài khoản nhận thanh toán)");
  }
  const { bankBin, bankName, accountNumber, accountName } = account;
  const amount = order.totals.total;
  return {
    orderCode: order.code,
    amount,
    bankBin,
    bankName,
    accountNumber,
    accountName,
    transferContent: order.code,
    qrPayload: buildVietQrPayload({ bankBin, accountNumber, amount, content: order.code }),
  };
}

export const orderService = { list, get, create, quoteShipping, paymentInfo, updateNote };
