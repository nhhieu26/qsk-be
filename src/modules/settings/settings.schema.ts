import { z } from "zod";
import { isValidPhone, normalizePhone } from "../../utils/text.js";
import { BANK_BINS, SETTINGS_LIMITS } from "./settings.constants.js";

const text = z.string().trim().max(SETTINGS_LIMITS.textMax);

export const updateStoreSchema = z.object({
  name: text.min(SETTINGS_LIMITS.nameMin, "Nhập tên điểm"),
  phone: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || isValidPhone(v), "Số điện thoại chưa đúng")
    .transform((v) => (v ? normalizePhone(v) : "")),
  address: text.default(""),
  code: z
    .string()
    .default("")
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .refine((v) => v.length <= SETTINGS_LIMITS.codeMax, "Mã điểm tối đa 6 ký tự"),
});
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;

export const updatePaymentAccountSchema = z.object({
  bankBin: z.enum(BANK_BINS, "Chọn ngân hàng"),
  accountNumber: z
    .string()
    .transform((v) => v.replace(/\s+/g, ""))
    .refine((v) => /^[0-9A-Za-z]{4,19}$/.test(v), "Số tài khoản chưa đúng"),
  accountName: z
    .string()
    .trim()
    .min(2, "Nhập tên chủ tài khoản")
    .max(SETTINGS_LIMITS.textMax)
    .transform((v) => v.toUpperCase()),
});
export type UpdatePaymentAccountInput = z.infer<typeof updatePaymentAccountSchema>;
