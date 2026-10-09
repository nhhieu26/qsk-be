import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { isValidPhone, normalizePhone } from "../../utils/text.js";
import { SHIPPING_METHOD_KEYS, SHIPPING_METHODS } from "../shipping/shipping.constants.js";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from "./order.rules.js";

const TEXT_MAX = 200;
const NOTE_MAX = 500;
const LINES_MAX = 100;
const TAX_CODE = /^(?:\d{10}(?:-\d{3})?|\d{12})$/;

const objectId = z.string().refine((v) => isValidObjectId(v), "Mã không hợp lệ");
const text = (min: number, message: string) => z.string().trim().min(min, message).max(TEXT_MAX);
const optionalText = (max = TEXT_MAX) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));
const phone = z
  .string()
  .refine(isValidPhone, "Số điện thoại chưa đúng (10 số, đầu 03/05/07/08/09)")
  .transform(normalizePhone);

export const addressInputSchema = z.object({
  province: text(1, "Chọn tỉnh/thành phố"),
  ward: text(1, "Chọn phường/xã"),
  street: text(1, "Nhập số nhà, tên đường"),
  provinceId: z.number().int().positive().optional(),
  wardId: z.number().int().positive().optional(),
});

export const orderLinesSchema = z
  .array(z.object({ productId: objectId, quantity: z.number().int().min(1, "Số lượng ít nhất là 1") }))
  .min(1, "Đơn chưa có sản phẩm")
  .max(LINES_MAX)
  .refine(
    (lines) => new Set(lines.map((l) => l.productId)).size === lines.length,
    "Mỗi sản phẩm chỉ một dòng",
  );

const invoiceSchema = z
  .object({
    buyerType: z.enum(["personal", "company"]),
    buyerName: text(2, "Nhập tên người mua hoặc đơn vị"),
    taxCode: optionalText(20),
    address: text(5, "Nhập địa chỉ xuất hoá đơn"),
    email: z.email("Nhập email nhận hoá đơn"),
  })
  .refine((v) => v.taxCode === undefined || TAX_CODE.test(v.taxCode), {
    message: "Mã số thuế gồm 10, 13 (dạng 10-3) hoặc 12 số",
    path: ["taxCode"],
  })
  .refine((v) => v.buyerType !== "company" || v.taxCode !== undefined, {
    message: "Đơn vị cần mã số thuế",
    path: ["taxCode"],
  });

export const createOrderSchema = z
  .object({
    lines: orderLinesSchema,
    customer: z.object({
      id: objectId.optional(),
      name: text(2, "Nhập họ tên người đặt"),
      phone,
      email: z.union([z.literal(""), z.email("Email chưa đúng")]).optional().transform((v) => v || undefined),
    }),
    shipping: z.object({
      method: z.enum(SHIPPING_METHOD_KEYS),
      recipient: z
        .object({ name: text(2, "Nhập tên người nhận"), phone, address: addressInputSchema })
        .optional(),
      note: optionalText(NOTE_MAX),
    }),
    invoice: invoiceSchema.optional(),
    payment: z.object({
      method: z.enum(PAYMENT_METHODS),
      pointsUsed: z.number().int().min(0, "Không được âm"),
      collectedNow: z.boolean(),
    }),
    note: optionalText(NOTE_MAX),
    expectedTotal: z.number().int().min(0),
  })
  .refine((v) => !SHIPPING_METHODS[v.shipping.method].requiresAddress || v.shipping.recipient, {
    message: "Cần thông tin người nhận để giao hàng",
    path: ["shipping", "recipient"],
  })
  .refine((v) => v.payment.method !== "cod" || v.shipping.method !== "pickup", {
    message: "Thu hộ chỉ dùng khi giao hàng",
    path: ["payment", "method"],
  });
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const shippingQuoteSchema = z.object({
  method: z.enum(SHIPPING_METHOD_KEYS),
  address: addressInputSchema.optional(),
  lines: orderLinesSchema,
  paymentMethod: z.enum(PAYMENT_METHODS).default("cash"),
});
export type ShippingQuoteInput = z.infer<typeof shippingQuoteSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày dạng YYYY-MM-DD");
const ORDER_PAGE_MAX = 100;

export const listOrdersQuerySchema = z
  .object({
    status: z.enum(ORDER_STATUSES).optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    shippingMethod: z.enum(SHIPPING_METHOD_KEYS).optional(),
    /** Mã đơn, tên hoặc SĐT khách. */
    q: z.string().trim().max(100).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(ORDER_PAGE_MAX).default(20),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: "Ngày bắt đầu phải trước ngày kết thúc",
    path: ["to"],
  });
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export const handOverOrderSchema = z.object({
  trackingCode: z.string().trim().min(1, "Nhập mã vận đơn").max(50),
});
export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(1, "Ghi lý do huỷ đơn").max(NOTE_MAX),
});

export const updateOrderNoteSchema = z.object({
  note: z.string().trim().max(NOTE_MAX),
});
