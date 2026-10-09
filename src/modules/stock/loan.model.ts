import {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

/** Một lượt cho mượn hàng; `remaining` về 0 khi đã nhận trả đủ. */
const loanSchema = new Schema(
  {
    shopId: { type: String, required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    borrower: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    remaining: { type: Number, required: true, min: 0 },
    /** Ngày cho mượn `YYYY-MM-DD` theo giờ Việt Nam. */
    date: { type: String, required: true },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

loanSchema.index({ shopId: 1, product: 1, remaining: 1 });

export type Loan = InferSchemaType<typeof loanSchema>;
export type LoanDocument = HydratedDocument<Loan>;

export const LoanModel = model("Loan", loanSchema);
