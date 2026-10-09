export const ROLES = ["superadmin", "midu", "agency", "customer"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "profile:read",
  "users:read",
  "users:update-role",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  superadmin: PERMISSIONS,
  midu: ["profile:read", "users:read"], // Công ty Midu
  agency: ["profile:read"], // đại lý
  customer: ["profile:read"], // khách lẻ
};

const MIDU_ROLE: Record<Role, string> = {
  superadmin: "ADMIN",
  midu: "STAFFMIDU",
  agency: "AGENCY",
  customer: "USER",
};

export function toMiduRole(role: Role) {
  return MIDU_ROLE[role];
}

export function fromMiduRoles(miduRoles: string[] = []): Role {
  if (
    miduRoles.includes(MIDU_ROLE.superadmin) ||
    miduRoles.includes("SUPERADMIN")
  ) {
    return "superadmin";
  }
  if (miduRoles.includes(MIDU_ROLE.midu)) return "midu";
  return "customer";
}

export function getPermissions(role: Role) {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: Role, permission: Permission) {
  return getPermissions(role).includes(permission);
}
