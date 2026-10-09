/**
 * Công thức tiền và luật chuyển trạng thái, port từ
 * frontend/src/features/sales/lib/{order-totals,order-workflow}.ts.
 * Phải giữ y hệt frontend, nếu không mọi đơn sẽ lệch `expectedTotal` (409).
 */

/** Tỷ lệ tích điểm Mi trên tiền hàng khách thực trả (không tính phí ship). */
export const POINT_EARN_RATE = 0.1;

/**
 * Vòng đời đơn:
 *   new → approved → (giao) awaitingPickup → shipping → completed
 *                  → (tại quầy) readyForPickup → completed
 * Huỷ được trước khi hàng rời quầy.
 */
export const ORDER_STATUSES = [
  "new",
  "approved",
  "awaitingPickup",
  "readyForPickup",
  "shipping",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["cash", "transfer", "cod"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type OrderTotals = {
  subtotal: number;
  shippingFee: number;
  pointsDiscount: number;
  total: number;
  earnedPoints: number;
};

export function subtotalOf(lines: readonly { price: number; quantity: number }[]): number {
  return lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
}

/** Điểm dùng tối đa: không quá điểm đang có, không quá tiền hàng (không trừ vào phí ship). */
export function maxUsablePoints(availablePoints: number, subtotal: number): number {
  return Math.max(0, Math.min(availablePoints, subtotal));
}

export function calculateTotals(params: {
  subtotal: number;
  shippingFee: number;
  pointsUsed: number;
  availablePoints: number;
}): OrderTotals {
  const { subtotal, shippingFee } = params;
  const pointsDiscount = Math.min(
    Math.max(0, Math.round(params.pointsUsed)),
    maxUsablePoints(params.availablePoints, subtotal),
  );
  const goodsPaid = subtotal - pointsDiscount;
  return {
    subtotal,
    shippingFee,
    pointsDiscount,
    total: goodsPaid + shippingFee,
    earnedPoints: Math.round(goodsPaid * POINT_EARN_RATE),
  };
}

export type WorkflowState = {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  isDelivery: boolean;
};

export type OrderActions = {
  canMarkPaid: boolean;
  canApprove: boolean;
  /** Bàn giao đơn vị vận chuyển (có mã vận đơn) → chờ lấy hàng. */
  canHandOver: boolean;
  /** Đơn vị vận chuyển đã lấy hàng → đang giao. */
  canMarkShipping: boolean;
  /** Hàng đã sẵn sàng, báo khách đến quầy nhận. */
  canMarkReady: boolean;
  canComplete: boolean;
  canCancel: boolean;
};

const CANCELLABLE: readonly OrderStatus[] = ["new", "approved", "awaitingPickup", "readyForPickup"];

export function availableActions(o: WorkflowState): OrderActions {
  const isOpen = o.status !== "completed" && o.status !== "cancelled";
  const isPaid = o.paymentStatus === "paid";
  // Duyệt khi tiền đã chắc chắn: đã trả, thu hộ, hoặc khách trả tiền mặt lúc nhận tại quầy.
  const isPaymentSecured =
    isPaid || o.paymentMethod === "cod" || (!o.isDelivery && o.paymentMethod === "cash");
  return {
    canMarkPaid: isOpen && o.paymentStatus === "unpaid",
    canApprove: o.status === "new" && isPaymentSecured,
    canHandOver: o.isDelivery && o.status === "approved",
    canMarkShipping: o.isDelivery && o.status === "awaitingPickup",
    canMarkReady: !o.isDelivery && o.status === "approved",
    canComplete: o.isDelivery ? o.status === "shipping" : o.status === "readyForPickup" && isPaid,
    canCancel: CANCELLABLE.includes(o.status),
  };
}

/**
 * Trạng thái lúc tạo đơn. Chỉ tiền mặt mới được "thu ngay"; chuyển khoản luôn
 * chờ xác nhận nhận tiền (`mark-paid`), COD thu khi giao.
 * Thu ngay: tại quầy hoàn tất luôn, giao hàng thì đã duyệt.
 */
export function initialState(params: {
  collectedNow: boolean;
  paymentMethod: PaymentMethod;
  isDelivery: boolean;
}): { status: OrderStatus; paymentStatus: PaymentStatus } {
  const isPaid = params.collectedNow && params.paymentMethod === "cash";
  if (!isPaid) return { status: "new", paymentStatus: "unpaid" };
  return { status: params.isDelivery ? "approved" : "completed", paymentStatus: "paid" };
}
