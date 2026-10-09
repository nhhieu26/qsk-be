/**
 * Loại hàng theo Nghị định 15/2018/NĐ-CP (thực phẩm) và 98/2021/NĐ-CP
 * (trang thiết bị y tế). Key khớp frontend/src/features/products/constants.ts;
 * nhãn hiển thị do frontend giữ.
 */
export const PRODUCT_CATEGORIES = [
  "supplement",
  "infantNutrition",
  "fortifiedFood",
  "food",
  "medicalDevice",
  "equipment",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const DOCUMENT_TYPES = [
  "registration",
  "advertising",
  "testing",
  "factory",
  "label",
  "consulting",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const PRODUCT_LIMITS = {
  nameMin: 2,
  nameMax: 200,
  textMax: 200,
  noteMax: 500,
  urlMax: 2000,
  claimMax: 500,
  claimsMax: 50,
  weightMaxGrams: 100_000,
} as const;

/** Cân nặng tạm tính (gram/đơn vị) cho sản phẩm chưa nhập cân nặng. */
export const DEFAULT_PRODUCT_WEIGHT_GRAMS = 500;
