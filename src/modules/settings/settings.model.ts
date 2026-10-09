import {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

const storeSchema = new Schema(
  {
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    /** Mã điểm, đầu mã hội viên (chữ hoa + số, tối đa 6). */
    code: { type: String, default: "" },
  },
  { _id: false },
);

const paymentAccountSchema = new Schema(
  {
    bankBin: { type: String, required: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },
    updatedBy: { type: String, required: true },
    updatedAt: { type: Date, required: true },
  },
  { _id: false },
);

/** Cài đặt của một quầy, mỗi `shopId` một bản ghi. */
const shopSettingsSchema = new Schema(
  {
    shopId: { type: String, required: true, unique: true },
    store: { type: storeSchema, default: () => ({}) },
    paymentAccount: { type: paymentAccountSchema },
  },
  { timestamps: true },
);

export type ShopSettings = InferSchemaType<typeof shopSettingsSchema>;
export type ShopSettingsDocument = HydratedDocument<ShopSettings>;

export const ShopSettingsModel = model("ShopSettings", shopSettingsSchema);
