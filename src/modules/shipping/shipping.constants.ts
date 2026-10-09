/**
 * Phương thức giao, key khớp frontend/src/features/sales/constants.ts.
 * - viettel: phí thật từ ViettelPost; đơn từ `freeFrom` thì quầy chịu, khách trả 0.
 * - express: phí cố định, chỉ giao trong tỉnh đặt quầy.
 */
export const SHIPPING_METHODS = {
  pickup: { requiresAddress: false },
  viettel: { requiresAddress: true, freeFrom: 500_000 },
  express: { requiresAddress: true, flatFee: 50_000, sameProvinceOnly: true },
} as const;

export type ShippingMethod = keyof typeof SHIPPING_METHODS;

export const SHIPPING_METHOD_KEYS = Object.keys(SHIPPING_METHODS) as [
  ShippingMethod,
  ...ShippingMethod[],
];

/** Danh mục tỉnh/phường ít đổi: giữ trong bộ nhớ 24 giờ. */
export const ADDRESS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
