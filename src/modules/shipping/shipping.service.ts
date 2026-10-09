import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import { isSameProvince } from "../../utils/text.js";
import { DEFAULT_PRODUCT_WEIGHT_GRAMS } from "../product/product.constants.js";
import {
  ADDRESS_CACHE_TTL_MS,
  SHIPPING_METHODS,
  type ShippingMethod,
} from "./shipping.constants.js";
import { viettelPostClient } from "./viettelpost/viettelpost.client.js";

export type AreaOption = { id: number; name: string };

type CacheEntry<T> = { value: T; expiresAt: number };
const areaCache = new Map<string, CacheEntry<AreaOption[]>>();

async function cached(key: string, load: () => Promise<AreaOption[]>) {
  const hit = areaCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const value = await load();
  areaCache.set(key, { value, expiresAt: Date.now() + ADDRESS_CACHE_TTL_MS });
  return value;
}

const byVietnameseName = (a: AreaOption, b: AreaOption) => a.name.localeCompare(b.name, "vi");

function listProvinces(): Promise<AreaOption[]> {
  return cached("provinces", async () =>
    (await viettelPostClient.listProvinces())
      .map((p) => ({ id: p.PROVINCE_ID, name: p.PROVINCE_NAME }))
      .sort(byVietnameseName),
  );
}

function listWards(provinceId: number): Promise<AreaOption[]> {
  return cached(`wards:${provinceId}`, async () =>
    (await viettelPostClient.listWards(provinceId))
      .filter((w) => w.PROVINCE_ID === provinceId)
      .map((w) => ({ id: w.WARDS_ID, name: w.WARDS_NAME }))
      .sort(byVietnameseName),
  );
}

export type ShippingAddress = { province: string; ward: string; street: string };

export type ShippingParcel = {
  /** Tiền hàng trước khi trừ điểm (để xét miễn phí ship và khai giá trị hàng). */
  subtotal: number;
  /** Tổng cân nặng (gram). */
  weight: number;
  /** Số tiền ViettelPost thu hộ (COD), 0 nếu không thu hộ. */
  codAmount: number;
};

export type ShippingQuote = {
  method: ShippingMethod;
  /** Phí khách trả. */
  fee: number;
  /** Cước đơn vị vận chuyển báo (có khi đã gọi ViettelPost). */
  carrierFee?: number;
  /** Được miễn phí ship theo mức đơn. */
  freeShipping: boolean;
  weight: number;
};

export function parcelWeight(items: readonly { weight?: number | null; quantity: number }[]) {
  return items.reduce(
    (sum, i) => sum + (i.weight ?? DEFAULT_PRODUCT_WEIGHT_GRAMS) * i.quantity,
    0,
  );
}

function formatReceiverAddress(a: ShippingAddress) {
  return [a.street, a.ward, a.province].map((p) => p.trim()).filter(Boolean).join(", ");
}

async function quoteViettel(address: ShippingAddress, parcel: ShippingParcel): Promise<ShippingQuote> {
  const base = { method: "viettel" as const, weight: parcel.weight };
  if (parcel.subtotal >= SHIPPING_METHODS.viettel.freeFrom) {
    return { ...base, fee: 0, freeShipping: true };
  }
  if (!env.VIETTELPOST_SENDER_ADDRESS) {
    throw new AppError(503, "Chưa cấu hình địa chỉ gửi hàng ViettelPost");
  }
  const price = await viettelPostClient.getPrice({
    PRODUCT_WEIGHT: parcel.weight,
    PRODUCT_PRICE: parcel.subtotal,
    MONEY_COLLECTION: parcel.codAmount,
    ORDER_SERVICE_ADD: null,
    ORDER_SERVICE: env.VIETTELPOST_SERVICE,
    SENDER_ADDRESS: env.VIETTELPOST_SENDER_ADDRESS,
    RECEIVER_ADDRESS: formatReceiverAddress(address),
    PRODUCT_LENGTH: 0,
    PRODUCT_WIDTH: 0,
    PRODUCT_HEIGHT: 0,
    PRODUCT_TYPE: "HH",
    NATIONAL_TYPE: 1,
  });
  const fee = Math.round(price.MONEY_TOTAL);
  return { ...base, fee, carrierFee: fee, freeShipping: false };
}

/**
 * Phí ship khách trả. Dùng chung cho API báo phí và lúc tạo đơn để hai nơi luôn
 * ra cùng một số (frontend gửi `expectedTotal` theo phí đã báo).
 */
async function quote(
  method: ShippingMethod,
  address: ShippingAddress | undefined,
  parcel: ShippingParcel,
): Promise<ShippingQuote> {
  if (method === "pickup") {
    return { method, fee: 0, freeShipping: false, weight: parcel.weight };
  }
  if (!address) throw AppError.badRequest("Cần địa chỉ người nhận để giao hàng");

  if (method === "express") {
    if (!isSameProvince(address.province, env.STORE_PROVINCE)) {
      throw AppError.badRequest(`Giao hoả tốc chỉ giao trong ${env.STORE_PROVINCE}`);
    }
    return {
      method,
      fee: SHIPPING_METHODS.express.flatFee,
      freeShipping: false,
      weight: parcel.weight,
    };
  }
  return quoteViettel(address, parcel);
}

export const shippingService = { listProvinces, listWards, quote };

/** Chỉ dùng trong test. */
export function clearAreaCache() {
  areaCache.clear();
}
