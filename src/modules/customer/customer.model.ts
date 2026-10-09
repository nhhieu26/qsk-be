import {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

/** Địa chỉ 2 cấp (từ 01/07/2025): tỉnh/thành → phường/xã. Id theo danh mục ViettelPost. */
export const addressSchema = new Schema(
  {
    province: { type: String, required: true },
    ward: { type: String, required: true },
    /** Số nhà, tên đường, thôn/xóm. */
    street: { type: String, required: true },
    provinceId: { type: Number },
    wardId: { type: Number },
  },
  { _id: false },
);

export const invoiceSchema = new Schema(
  {
    buyerType: { type: String, enum: ["personal", "company"], required: true },
    buyerName: { type: String, required: true },
    taxCode: { type: String },
    address: { type: String, required: true },
    email: { type: String, required: true },
  },
  { _id: false },
);

const customerSchema = new Schema(
  {
    shopId: { type: String, required: true },
    name: { type: String, required: true },
    /** Số di động dạng 0xxxxxxxxx, duy nhất trong một quầy. */
    phone: { type: String, required: true },
    email: { type: String },
    memberCode: { type: String },
    /** Điểm Mi hiện có, 1 điểm = 1đ. Chỉ đổi bằng lệnh $inc có điều kiện. */
    points: { type: Number, required: true, min: 0, default: 0 },
    /** Mới dùng gần nhất đứng đầu. */
    addresses: { type: [addressSchema], default: [] },
    lastInvoice: { type: invoiceSchema },
    /** Tên + mã hội viên bỏ dấu, chữ thường: để tìm kiếm không phân biệt dấu. */
    searchText: { type: String, required: true },
  },
  { timestamps: true },
);

customerSchema.index({ shopId: 1, phone: 1 }, { unique: true });
customerSchema.index({ shopId: 1, searchText: 1 });

export type Customer = InferSchemaType<typeof customerSchema>;
export type CustomerDocument = HydratedDocument<Customer>;

export const CustomerModel = model("Customer", customerSchema);
