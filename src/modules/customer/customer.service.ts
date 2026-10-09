import type { Types } from "mongoose";
import { AppError } from "../../utils/app-error.js";
import { escapeRegExp, normalizePhone, normalizeSearch } from "../../utils/text.js";
import type { ActorContext } from "../access/access.middleware.js";
import { CustomerModel, type CustomerDocument } from "./customer.model.js";

const SEARCH_LIMIT = 10;
const ADDRESSES_KEPT = 5;

export type AddressInput = {
  province: string;
  ward: string;
  street: string;
  provinceId?: number;
  wardId?: number;
};

export type InvoiceInput = {
  buyerType: "personal" | "company";
  buyerName: string;
  taxCode?: string;
  address: string;
  email: string;
};

function buildSearchText(name: string, memberCode?: string | null) {
  return normalizeSearch([name, memberCode].filter(Boolean).join(" "));
}

export function toCustomerView(c: CustomerDocument) {
  return {
    id: c.id as string,
    name: c.name,
    phone: c.phone,
    ...(c.email && { email: c.email }),
    ...(c.memberCode && { memberCode: c.memberCode }),
    points: c.points,
    addresses: c.addresses.map((a) => ({
      province: a.province,
      ward: a.ward,
      street: a.street,
      ...(a.provinceId && { provinceId: a.provinceId }),
      ...(a.wardId && { wardId: a.wardId }),
    })),
    ...(c.lastInvoice && {
      lastInvoice: {
        buyerType: c.lastInvoice.buyerType,
        buyerName: c.lastInvoice.buyerName,
        ...(c.lastInvoice.taxCode && { taxCode: c.lastInvoice.taxCode }),
        address: c.lastInvoice.address,
        email: c.lastInvoice.email,
      },
    }),
  };
}

/** Tìm theo tên/mã hội viên (không phân biệt dấu) hoặc một phần số điện thoại. */
async function search(actor: ActorContext, query: string) {
  const text = normalizeSearch(query);
  const digits = query.replace(/\D/g, "");
  const conditions = [
    ...(text ? [{ searchText: { $regex: escapeRegExp(text) } }] : []),
    ...(digits.length >= 2 ? [{ phone: { $regex: escapeRegExp(normalizePhone(digits)) } }] : []),
  ];
  const customers = await CustomerModel.find({
    shopId: actor.shopId,
    ...(conditions.length > 0 && { $or: conditions }),
  })
    .sort({ updatedAt: -1 })
    .limit(SEARCH_LIMIT);
  return customers.map(toCustomerView);
}

/**
 * Khách của đơn xác định theo số điện thoại (cùng khoá với upsert), để điểm Mi
 * đọc ra đúng là điểm của khách sẽ bị trừ.
 */
async function findForOrder(actor: ActorContext, ref: { phone: string }) {
  return CustomerModel.findOne({ shopId: actor.shopId, phone: normalizePhone(ref.phone) });
}

/**
 * Tạo hoặc cập nhật khách theo số điện thoại khi lên đơn: đổi tên, giữ email cũ
 * nếu không gửi, đưa địa chỉ vừa dùng lên đầu, nhớ thông tin hoá đơn.
 */
async function upsertForOrder(
  actor: ActorContext,
  input: {
    name: string;
    phone: string;
    email?: string;
    address?: AddressInput;
    invoice?: InvoiceInput;
  },
): Promise<CustomerDocument> {
  const phone = normalizePhone(input.phone);
  const current = await CustomerModel.findOne({ shopId: actor.shopId, phone });
  const addresses = input.address
    ? [
        input.address,
        ...(current?.addresses ?? []).filter(
          (a) => !(a.street === input.address?.street && a.ward === input.address?.ward),
        ),
      ].slice(0, ADDRESSES_KEPT)
    : undefined;

  const customer = await CustomerModel.findOneAndUpdate(
    { shopId: actor.shopId, phone },
    {
      $set: {
        name: input.name,
        searchText: buildSearchText(input.name, current?.memberCode),
        ...(input.email && { email: input.email }),
        ...(addresses && { addresses }),
        ...(input.invoice && { lastInvoice: input.invoice }),
      },
      $setOnInsert: { shopId: actor.shopId, phone, points: 0 },
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  );
  return customer;
}

/** Trừ điểm nguyên tử, không bao giờ âm. Không đủ điểm thì 409. */
async function spendPoints(actor: ActorContext, customerId: Types.ObjectId, points: number) {
  if (points <= 0) return;
  const updated = await CustomerModel.findOneAndUpdate(
    { _id: customerId, shopId: actor.shopId, points: { $gte: points } },
    { $inc: { points: -points } },
  );
  if (!updated) throw AppError.conflict("Điểm Mi của khách vừa thay đổi, kiểm tra lại đơn");
}

async function addPoints(actor: ActorContext, customerId: Types.ObjectId, points: number) {
  if (points <= 0) return;
  await CustomerModel.updateOne(
    { _id: customerId, shopId: actor.shopId },
    { $inc: { points } },
  );
}

export const customerService = {
  search,
  findForOrder,
  upsertForOrder,
  spendPoints,
  addPoints,
};
