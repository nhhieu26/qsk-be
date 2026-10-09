import {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";
import { MOVEMENT_TYPES } from "./stock.constants.js";

/** Một dòng thẻ kho. Chỉ thêm, không sửa/xoá: đây là vết kiểm toán của tồn. */
const stockMovementSchema = new Schema(
  {
    shopId: { type: String, required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    /** Tên sản phẩm lúc phát sinh, để thẻ kho vẫn đọc được khi đổi tên. */
    productName: { type: String, required: true },
    type: { type: String, enum: MOVEMENT_TYPES, required: true },
    /** Số thay đổi có dấu, âm là giảm; luôn bằng `after - before`. */
    quantity: { type: Number, required: true },
    before: { type: Number, required: true },
    after: { type: Number, required: true },
    actor: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    reason: { type: String },
    /** Số chứng từ, vd số phiếu nhập. */
    reference: { type: String },
    /** Người mượn / người trả / nhà cung cấp. */
    counterparty: { type: String },
    /** Đơn giá tại thời điểm phát sinh (giá nhập khi nhập kho). */
    unitPrice: { type: Number },
    loan: { type: Schema.Types.ObjectId, ref: "Loan" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stockMovementSchema.index({ shopId: 1, createdAt: -1, _id: -1 });
stockMovementSchema.index({ shopId: 1, product: 1, createdAt: -1, _id: -1 });

export type StockMovement = InferSchemaType<typeof stockMovementSchema>;
export type StockMovementDocument = HydratedDocument<StockMovement>;

export const StockMovementModel = model("StockMovement", stockMovementSchema);
