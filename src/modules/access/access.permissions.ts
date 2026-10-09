import type { Role } from "../rbac/rbac.constants.js";

/**
 * Quyền `<module>.<hành động>`, giữ đồng bộ với
 * frontend/src/features/access/permissions.ts (chỉ khai báo phần backend dùng).
 * Hỗ trợ wildcard: `*` (toàn quyền), `products.*` (mọi quyền một module).
 */
export const PERMISSIONS = {
  stockView: "stock.view",
  stockImport: "stock.import",
  stockAdjust: "stock.adjust",
  stockStocktake: "stock.stocktake",

  productsView: "products.view",
  productsCreate: "products.create",
  productsUpdate: "products.update",
  productsDocuments: "products.documents",

  salesView: "sales.view",
  salesCreate: "sales.create",

  ordersView: "orders.view",
  ordersUpdate: "orders.update",
  ordersCancel: "orders.cancel",

  settingsView: "settings.view",
  settingsUpdate: "settings.update",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const WILDCARD = "*";

const OWNER_PERMISSIONS: readonly string[] = Object.values(PERMISSIONS);

/**
 * Quyền quầy theo role (rbac.constants.ts), khớp
 * frontend/src/features/access/roles.ts. Mọi tài khoản SSO mới đều là
 * `customer` nên tạm cho đủ quyền chủ quầy; `midu` (nhân viên công ty) chưa có
 * quyền quầy.
 */
export const POS_ROLE_PERMISSIONS: Readonly<Record<Role, readonly string[]>> = {
  superadmin: [WILDCARD],
  midu: [],
  agency: OWNER_PERMISSIONS,
  customer: OWNER_PERMISSIONS,
};
