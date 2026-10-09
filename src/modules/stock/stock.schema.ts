import { isValidObjectId } from "mongoose";
import { z } from "zod";
import {
  DIRECTIONAL_ADJUST_TYPES,
  MOVEMENT_LIST_LIMIT,
  STOCK_LIMITS,
} from "./stock.constants.js";

const objectId = z
  .string()
  .refine((v) => isValidObjectId(v), "Mã không hợp lệ");

const positiveQuantity = z.number().int("Phải là số nguyên").min(1, "Ít nhất là 1");
const countedQuantity = z.number().int("Phải là số nguyên").min(0, "Không được âm");

const optionalText = (max: number = STOCK_LIMITS.textMax) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const requiredReason = z
  .string()
  .trim()
  .min(1, "Ghi lý do, người sau cần đọc hiểu")
  .max(STOCK_LIMITS.noteMax);

export const importStockSchema = z.object({
  productId: objectId,
  quantity: positiveQuantity,
  /** Số phiếu nhập. */
  reference: optionalText(),
  note: optionalText(STOCK_LIMITS.noteMax),
  supplier: optionalText(),
  /** Đơn giá nhập, có thì cập nhật giá nhập của sản phẩm. */
  unitPrice: z.number().int().min(0).optional(),
});
export type ImportStockInput = z.infer<typeof importStockSchema>;

export const adjustStockSchema = z.discriminatedUnion("type", [
  z
    .object({
      productId: objectId,
      type: z.enum(DIRECTIONAL_ADJUST_TYPES),
      quantity: positiveQuantity,
      reason: requiredReason,
      counterparty: optionalText(),
    })
    .refine((v) => v.type !== "loan" || v.counterparty !== undefined, {
      message: "Ghi tên người mượn",
      path: ["counterparty"],
    }),
  z.object({
    productId: objectId,
    type: z.literal("stocktake"),
    countedQuantity,
    reason: requiredReason,
  }),
]);
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export const stocktakeSchema = z.object({
  counts: z
    .array(z.object({ productId: objectId, countedQuantity }))
    .min(1, "Chưa có số đếm nào")
    .max(STOCK_LIMITS.stocktakeItemsMax)
    .refine(
      (counts) => new Set(counts.map((c) => c.productId)).size === counts.length,
      "Mỗi mặt hàng chỉ ghi một số đếm",
    ),
});
export type StocktakeInput = z.infer<typeof stocktakeSchema>;

export const returnLoanSchema = z.object({
  productId: objectId,
  quantity: positiveQuantity,
  note: optionalText(STOCK_LIMITS.noteMax),
});
export type ReturnLoanInput = z.infer<typeof returnLoanSchema>;

export const listMovementsQuerySchema = z.object({
  productId: objectId.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MOVEMENT_LIST_LIMIT.max)
    .default(MOVEMENT_LIST_LIMIT.default),
});
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
