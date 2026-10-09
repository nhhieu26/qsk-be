import { z } from "zod";
import {
  DOCUMENT_TYPES,
  PRODUCT_CATEGORIES,
  PRODUCT_LIMITS,
} from "./product.constants.js";

const money = z.number().int("Phải là số nguyên").min(0, "Không được âm");
const quantity = z.number().int("Phải là số nguyên").min(0, "Không được âm");

/** Chuỗi tuỳ chọn: cắt khoảng trắng, chuỗi rỗng coi như không gửi. */
const optionalText = (max: number = PRODUCT_LIMITS.textMax) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const productInputShape = {
  name: z
    .string()
    .trim()
    .min(PRODUCT_LIMITS.nameMin, "Tên sản phẩm cần ít nhất 2 ký tự")
    .max(PRODUCT_LIMITS.nameMax),
  customerGroup: optionalText(),
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  price: money,
  costPrice: money.optional(),
  threshold: quantity,
  registrationNo: optionalText(),
  shelfLife: optionalText(),
  /**
   * Hai field thêm sau, form cũ chưa gửi nên KHÔNG theo luật "không gửi là xoá":
   * không gửi thì giữ nguyên; `menuGroup: ""` mới là xoá mục lục.
   */
  menuGroup: z.string().trim().max(PRODUCT_LIMITS.textMax).optional(),
  priceOnRequest: z.boolean().optional(),
  /** Cân nặng một đơn vị (gram). Cùng luật với hai field trên: không gửi thì giữ nguyên. */
  weight: z.number().int().min(1).max(PRODUCT_LIMITS.weightMaxGrams).optional(),
};

/**
 * PATCH gửi đủ bộ thông tin như form sửa; field tuỳ chọn không gửi nghĩa là
 * xoá giá trị đó (vd bỏ phân loại). `stock` không nằm ở đây: tồn chỉ đổi qua kho.
 */
export const productInputSchema = z.object(productInputShape);
export type ProductInput = z.infer<typeof productInputSchema>;

export const createProductSchema = z.object({
  ...productInputShape,
  initialStock: quantity.default(0),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateClaimsSchema = z.object({
  claims: z
    .array(z.string().max(PRODUCT_LIMITS.claimMax))
    .max(PRODUCT_LIMITS.claimsMax)
    .transform((lines) => lines.map((l) => l.trim()).filter(Boolean)),
});
export type UpdateClaimsInput = z.infer<typeof updateClaimsSchema>;

export const addDocumentSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  url: z.string().trim().min(1, "Cần đường dẫn tới tệp").max(PRODUCT_LIMITS.urlMax),
  fileName: optionalText(),
  expiresAt: z.iso.date("Ngày dạng YYYY-MM-DD").optional(),
  note: optionalText(PRODUCT_LIMITS.noteMax),
});
export type AddDocumentInput = z.infer<typeof addDocumentSchema>;

export const documentTypeParamSchema = z.enum(DOCUMENT_TYPES);
