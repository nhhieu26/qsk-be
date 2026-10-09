import {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";
import { addressSchema, invoiceSchema } from "../customer/customer.model.js";
import { SHIPPING_METHOD_KEYS } from "../shipping/shipping.constants.js";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from "./order.rules.js";

const lineSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    /** Tên và giá chốt lúc bán, không đổi khi sản phẩm đổi sau này. */
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

/** Thông tin khách chốt lúc đặt; `ref` trỏ hồ sơ khách để cộng/trừ điểm. */
const customerSnapshotSchema = new Schema(
  {
    ref: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
  },
  { _id: false },
);

const recipientSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: addressSchema, required: true },
  },
  { _id: false },
);

const shippingSchema = new Schema(
  {
    method: { type: String, enum: SHIPPING_METHOD_KEYS, required: true },
    /** Phí khách trả. */
    fee: { type: Number, required: true, min: 0 },
    /** Cước ViettelPost báo lúc tạo đơn (không có khi được miễn phí ship). */
    carrierFee: { type: Number },
    /** Tổng cân nặng (gram) dùng để báo phí. */
    weight: { type: Number },
    recipient: { type: recipientSchema },
    trackingCode: { type: String },
    note: { type: String },
  },
  { _id: false },
);

const totalsSchema = new Schema(
  {
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, required: true },
    pointsDiscount: { type: Number, required: true },
    total: { type: Number, required: true },
    earnedPoints: { type: Number, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    shopId: { type: String, required: true },
    /** DH + YYMMDD + số thứ tự trong ngày; cũng là nội dung chuyển khoản. */
    code: { type: String, required: true },
    status: { type: String, enum: ORDER_STATUSES, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paidAt: { type: Date },
    customer: { type: customerSnapshotSchema, required: true },
    shipping: { type: shippingSchema, required: true },
    invoice: { type: invoiceSchema },
    lines: { type: [lineSchema], required: true },
    pointsUsed: { type: Number, required: true, min: 0 },
    totals: { type: totalsSchema, required: true },
    /** Đã cộng điểm tích luỹ cho khách chưa (chống cộng 2 lần). */
    pointsAwarded: { type: Boolean, required: true, default: false },
    note: { type: String },
    /** Mã đơn + tên + SĐT khách, bỏ dấu, để tìm kiếm (xem `buildOrderSearchText`). */
    searchText: { type: String, default: "" },
    cancelReason: { type: String },
    createdBy: { type: String, required: true },
    createdById: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

orderSchema.index({ shopId: 1, code: 1 }, { unique: true });
orderSchema.index({ shopId: 1, createdAt: -1 });
orderSchema.index({ shopId: 1, status: 1, createdAt: -1 });

export type Order = InferSchemaType<typeof orderSchema>;
export type OrderDocument = HydratedDocument<Order>;

export const OrderModel = model("Order", orderSchema);
