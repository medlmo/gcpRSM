import type { User } from "@shared/schema";

export type UserRole = "admin" | "marches_manager" | "ordonnateur" | "technical_service";

export type Permission = 
  | "view_admin"
  | "manage_users"
  | "manage_settings"
  | "add_tender"
  | "add_supplier"
  | "add_bid"
  | "add_contract"
  | "add_service_order"
  | "add_amendment"
  | "add_invoice"
  | "edit_tender"
  | "edit_supplier"
  | "edit_bid"
  | "edit_contract"
  | "edit_service_order"
  | "edit_amendment"
  | "edit_invoice"
  | "delete_tender"
  | "delete_supplier"
  | "delete_bid"
  | "delete_contract"
  | "delete_service_order"
  | "delete_amendment"
  | "delete_invoice";

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "view_admin",
    "manage_users",
    "manage_settings",
    "add_tender",
    "add_supplier",
    "add_bid",
    "add_contract",
    "add_service_order",
    "add_amendment",
    "add_invoice",
    "edit_tender",
    "edit_supplier",
    "edit_bid",
    "edit_contract",
    "edit_service_order",
    "edit_amendment",
    "edit_invoice",
    "delete_tender",
    "delete_supplier",
    "delete_bid",
    "delete_contract",
    "delete_service_order",
    "delete_amendment",
    "delete_invoice",
  ],
  marches_manager: [
    "add_tender",
    "add_supplier",
    "add_bid",
    "add_contract",
    "add_service_order",
    "add_amendment",
    "edit_tender",
    "edit_supplier",
    "edit_bid",
    "edit_contract",
    "edit_service_order",
    "edit_amendment",
    "edit_invoice",
    "delete_tender",
    "delete_supplier",
    "delete_bid",
  ],
  technical_service: [
    "add_service_order",
    "add_amendment",
    "add_invoice",
    "edit_service_order",
    "edit_amendment",
    "edit_invoice",
  ],
  ordonnateur: [],
};

export function hasPermission(user: Omit<User, "password"> | null, permission: Permission): boolean {
  if (!user) return false;
  const role = user.role as UserRole;
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function canAccessAdmin(user: Omit<User, "password"> | null): boolean {
  return hasPermission(user, "view_admin");
}

export function canAdd(user: Omit<User, "password"> | null, resource: string): boolean {
  if (!user) return false;
  
  const role = user.role as UserRole;
  
  if (role === "ordonnateur") {
    return false;
  }
  
  if (role === "technical_service") {
    return ["service_order", "amendment", "invoice"].includes(resource);
  }
  
  if (role === "marches_manager") {
    if (resource === "invoice") {
      return false;
    }
  }
  
  const permissionMap: Record<string, Permission> = {
    tender: "add_tender",
    supplier: "add_supplier",
    bid: "add_bid",
    contract: "add_contract",
    service_order: "add_service_order",
    amendment: "add_amendment",
    invoice: "add_invoice",
  };
  
  const permission = permissionMap[resource];
  return permission ? hasPermission(user, permission) : false;
}

export function canEdit(user: Omit<User, "password"> | null, resource: string): boolean {
  if (!user) return false;
  
  const role = user.role as UserRole;
  
  if (role === "ordonnateur") {
    return false;
  }
  
  const permissionMap: Record<string, Permission> = {
    tender: "edit_tender",
    supplier: "edit_supplier",
    bid: "edit_bid",
    contract: "edit_contract",
    service_order: "edit_service_order",
    amendment: "edit_amendment",
    invoice: "edit_invoice",
  };
  
  const permission = permissionMap[resource];
  return permission ? hasPermission(user, permission) : false;
}

export function canDelete(user: Omit<User, "password"> | null, resource: string): boolean {
  if (!user) return false;
  
  const role = user.role as UserRole;
  
  if (role === "ordonnateur") {
    return false;
  }
  
  const permissionMap: Record<string, Permission> = {
    tender: "delete_tender",
    supplier: "delete_supplier",
    bid: "delete_bid",
    contract: "delete_contract",
    service_order: "delete_service_order",
    amendment: "delete_amendment",
    invoice: "delete_invoice",
  };
  
  const permission = permissionMap[resource];
  return permission ? hasPermission(user, permission) : false;
}
