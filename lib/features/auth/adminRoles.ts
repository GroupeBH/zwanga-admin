import type { UserRole } from "../admin/types";

export const ADMIN_ROLES: UserRole[] = ["admin", "super_admin"];

export const isAdminRole = (role?: string | null): role is "admin" | "super_admin" =>
  role === "admin" || role === "super_admin";

export const isSuperAdminRole = (role?: string | null): role is "super_admin" =>
  role === "super_admin";

export const isMarketerRole = (role?: string | null): role is "marketer" =>
  role === "marketer";

export const isBackOfficeRole = (role?: string | null) =>
  isAdminRole(role) || isMarketerRole(role);

export const getAdminRoleLabel = (role?: string | null) => {
  if (role === "super_admin") {
    return "Super admin";
  }
  if (role === "admin") {
    return "Admin";
  }
  if (role === "marketer") {
    return "Marketeur";
  }
  return "Compte non admin";
};
