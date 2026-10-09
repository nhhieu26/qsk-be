import {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";
import { DOCUMENT_TYPES, PRODUCT_CATEGORIES } from "./product.constants.js";

const documentSchema = new Schema(
  {
    type: { type: String, enum: DOCUMENT_TYPES, required: true },
    url: { type: String, required: true },
    fileName: { type: String },
    /** Ngày hết hiệu lực dạng `YYYY-MM-DD` (chỉ ngày, không múi giờ). */
    expiresAt: { type: String },
    note: { type: String },
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, required: true },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    shopId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    customerGroup: { type: String },
    category: { type: String, enum: PRODUCT_CATEGORIES },
    /** Giá bán niêm yết, VND. */
    price: { type: Number, required: true, min: 0 },
    /** Giá nhập cho điểm, VND; cập nhật theo lần nhập kho có đơn giá. */
    costPrice: { type: Number, min: 0 },
    /** Tồn hiện tại. Chỉ thay đổi qua stock-ledger để luôn có dòng thẻ kho. */
    stock: { type: Number, required: true, min: 0, default: 0 },
    /** Ngưỡng tồn an toàn. */
    threshold: { type: Number, required: true, min: 0, default: 10 },
    registrationNo: { type: String },
    shelfLife: { type: String },
    /** Mục lục hiển thị (vd "Hộp Chuyên Gia Nhí"), dùng nhóm hàng ở màn bán. */
    menuGroup: { type: String },
    /** Giá liên hệ: không bán theo `price` niêm yết. */
    priceOnRequest: { type: Boolean, required: true, default: false },
    /** Cân nặng một đơn vị (gram) để báo phí ship; chưa có thì dùng mặc định. */
    weight: { type: Number, min: 1 },
    documents: { type: [documentSchema], default: [] },
    claims: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

productSchema.index({ shopId: 1, name: 1 });

export type Product = InferSchemaType<typeof productSchema>;
export type ProductDocument = HydratedDocument<Product>;

export const ProductModel = model("Product", productSchema);
