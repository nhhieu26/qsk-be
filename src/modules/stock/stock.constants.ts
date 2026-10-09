/**
 * Loại biến động thẻ kho, key khớp frontend/src/features/stock/constants.ts.
 * `direction`: +1 tăng tồn, -1 giảm tồn, 0 tuỳ số đếm (kiểm kê).
 * `sale`/`orderCancel` dành cho module bán hàng, chưa có endpoint ở đây.
 */
export const MOVEMENT_DIRECTIONS = {
  sale: -1,
  import: 1,
  loan: -1,
  return: 1,
  disposal: -1,
  gift: -1,
  stocktake: 0,
  orderCancel: 1,
} as const;

export type MovementType = keyof typeof MOVEMENT_DIRECTIONS;

export const MOVEMENT_TYPES = Object.keys(MOVEMENT_DIRECTIONS) as [
  MovementType,
  ...MovementType[],
];

/** Lý do được chọn trong form "Điều chỉnh tay" (trừ kiểm kê, xử lý riêng). */
export const DIRECTIONAL_ADJUST_TYPES = ["loan", "return", "disposal", "gift"] as const;

export const OPENING_STOCK_REASON = "Tồn đầu khi tạo sản phẩm";
export const STOCKTAKE_ALL_REASON = "Kiểm kê cả kho";

export const MOVEMENT_LIST_LIMIT = { default: 1000, max: 5000 } as const;

export const STOCK_LIMITS = {
  textMax: 200,
  noteMax: 500,
  stocktakeItemsMax: 2000,
} as const;
