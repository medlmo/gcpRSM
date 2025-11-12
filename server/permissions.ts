import type { Request, Response, NextFunction } from "express";
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

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as Omit<User, "password"> | undefined;
    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const role = user.role as UserRole;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }
    
    next();
  };
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as Omit<User, "password"> | undefined;
    
    if (!user || !hasPermission(user, permission)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }
    
    next();
  };
}

export function canAddResource(user: Omit<User, "password"> | null, resource: string): boolean {
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
  
  const perm = permissionMap[resource];
  return perm ? hasPermission(user, perm) : false;
}

export function requireResourcePermission(resource: string, action: "add" | "edit" | "delete") {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as Omit<User, "password"> | undefined;
    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const role = user.role as UserRole;
    
    if (role === "ordonnateur" && (action === "add" || action === "edit" || action === "delete")) {
      return res.status(403).json({ error: "Forbidden: Read-only access" });
    }
    
    if (role === "technical_service") {
      const allowedResources = ["service_order", "amendment", "invoice"];
      if (!allowedResources.includes(resource)) {
        return res.status(403).json({ error: "Forbidden: Can only modify execution resources" });
      }
    }
    
    if (role === "marches_manager" && resource === "invoice" && action === "add") {
      return res.status(403).json({ error: "Forbidden: Cannot add invoices" });
    }
    
    const permissionMap: Record<string, Permission> = {
      [`add_${resource}`]: `add_${resource}` as Permission,
      [`edit_${resource}`]: `edit_${resource}` as Permission,
      [`delete_${resource}`]: `delete_${resource}` as Permission,
    };
    
    const permission = permissionMap[`${action}_${resource}`];
    if (permission && !hasPermission(user, permission)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }
    
    next();
  };
}
