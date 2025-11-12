import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword, sanitizeUser, verifyPassword } from "./auth";
import { 
  insertUserSchema, 
  insertSupplierSchema, 
  insertTenderSchema, 
  insertBidSchema,
  insertContractSchema,
  insertServiceOrderSchema,
  insertAmendmentSchema,
  insertInvoiceSchema,
  insertNotificationSchema
} from "@shared/schema";
import { z } from "zod";
import { requireRole, requireResourcePermission } from "./permissions";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

async function attachUser(req: Request, res: Response, next: NextFunction) {
  if (req.session.userId) {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        (req as any).user = sanitizeUser(user);
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Attach user to request for all API routes
  app.use("/api", attachUser);
  
  // Global auth middleware for all API routes except /api/auth
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/auth")) {
      return next();
    }
    return requireAuth(req, res, next);
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const users = await storage.getAllUsers();
      const user = users.find(u => u.email === email);
      
      if (!user || !(await verifyPassword(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ error: "Session error" });
        }
        
        req.session.userId = user.id;
        
        req.session.save((err) => {
          if (err) {
            return res.status(500).json({ error: "Session save error" });
          }
          res.json(sanitizeUser(user));
        });
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.status(204).send();
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Unauthorized" });
      }
      res.json(sanitizeUser(user));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dashboard
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Users (Admin only)
  app.get("/api/users", requireRole("admin"), async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      const sanitizedUsers = users.map(sanitizeUser);
      res.json(sanitizedUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:id", requireRole("admin"), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(sanitizeUser(user));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users", requireRole("admin"), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(userData.password);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });
      res.status(201).json(sanitizeUser(user));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id", requireRole("admin"), async (req, res) => {
    try {
      const updateData = req.body;
      if (updateData.password) {
        updateData.password = await hashPassword(updateData.password);
      }
      const user = await storage.updateUser(req.params.id, updateData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(sanitizeUser(user));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/users/:id", requireRole("admin"), async (req, res) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Suppliers
  app.get("/api/suppliers", async (_req, res) => {
    try {
      const suppliers = await storage.getAllSuppliers();
      res.json(suppliers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/suppliers/:id", async (req, res) => {
    try {
      const supplier = await storage.getSupplier(req.params.id);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/suppliers", requireResourcePermission("supplier", "add"), async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/suppliers/:id", requireResourcePermission("supplier", "edit"), async (req, res) => {
    try {
      const supplier = await storage.updateSupplier(req.params.id, req.body);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/suppliers/:id", requireResourcePermission("supplier", "delete"), async (req, res) => {
    try {
      const deleted = await storage.deleteSupplier(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Tenders
  app.get("/api/tenders", async (req, res) => {
    try {
      const { status } = req.query;
      const tenders = status 
        ? await storage.getTendersByStatus(status as string)
        : await storage.getAllTenders();
      res.json(tenders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tenders/:id", async (req, res) => {
    try {
      const tender = await storage.getTender(req.params.id);
      if (!tender) {
        return res.status(404).json({ error: "Tender not found" });
      }
      res.json(tender);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tenders", requireResourcePermission("tender", "add"), async (req, res) => {
    try {
      const tenderData = insertTenderSchema.parse(req.body);
      const tender = await storage.createTender(tenderData);
      res.status(201).json(tender);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/tenders/:id", requireResourcePermission("tender", "edit"), async (req, res) => {
    try {
      const tender = await storage.updateTender(req.params.id, req.body);
      if (!tender) {
        return res.status(404).json({ error: "Tender not found" });
      }
      res.json(tender);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/tenders/:id", requireResourcePermission("tender", "delete"), async (req, res) => {
    try {
      const deleted = await storage.deleteTender(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Tender not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Bids
  app.get("/api/bids", async (req, res) => {
    try {
      const { tenderId, supplierId } = req.query;
      let bids;
      if (tenderId) {
        bids = await storage.getBidsByTender(tenderId as string);
      } else if (supplierId) {
        bids = await storage.getBidsBySupplier(supplierId as string);
      } else {
        bids = await storage.getAllBids();
      }
      res.json(bids);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/bids/:id", async (req, res) => {
    try {
      const bid = await storage.getBid(req.params.id);
      if (!bid) {
        return res.status(404).json({ error: "Bid not found" });
      }
      res.json(bid);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/bids", requireResourcePermission("bid", "add"), async (req, res) => {
    try {
      const bidData = insertBidSchema.parse(req.body);
      const bid = await storage.createBid(bidData);
      res.status(201).json(bid);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/bids/:id", requireResourcePermission("bid", "edit"), async (req, res) => {
    try {
      const bid = await storage.updateBid(req.params.id, req.body);
      if (!bid) {
        return res.status(404).json({ error: "Bid not found" });
      }
      res.json(bid);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/bids/:id", requireResourcePermission("bid", "delete"), async (req, res) => {
    try {
      const deleted = await storage.deleteBid(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Bid not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Contracts
  app.get("/api/contracts", async (req, res) => {
    try {
      const { status } = req.query;
      const contracts = status 
        ? await storage.getContractsByStatus(status as string)
        : await storage.getAllContracts();
      res.json(contracts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/contracts/:id", async (req, res) => {
    try {
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json(contract);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/contracts", requireResourcePermission("contract", "add"), async (req, res) => {
    try {
      const contractData = insertContractSchema.parse(req.body);
      const contract = await storage.createContract(contractData);
      res.status(201).json(contract);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/contracts/:id", requireResourcePermission("contract", "edit"), async (req, res) => {
    try {
      const contract = await storage.updateContract(req.params.id, req.body);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json(contract);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/contracts/:id", requireResourcePermission("contract", "delete"), async (req, res) => {
    try {
      const deleted = await storage.deleteContract(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Service Orders
  app.get("/api/service-orders", async (req, res) => {
    try {
      const { contractId } = req.query;
      const orders = contractId
        ? await storage.getServiceOrdersByContract(contractId as string)
        : await storage.getAllServiceOrders();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/service-orders/:id", async (req, res) => {
    try {
      const order = await storage.getServiceOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Service order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/service-orders", requireResourcePermission("service_order", "add"), async (req, res) => {
    try {
      const orderData = insertServiceOrderSchema.parse(req.body);
      const order = await storage.createServiceOrder(orderData);
      res.status(201).json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/service-orders/:id", requireResourcePermission("service_order", "edit"), async (req, res) => {
    try {
      const order = await storage.updateServiceOrder(req.params.id, req.body);
      if (!order) {
        return res.status(404).json({ error: "Service order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/service-orders/:id", requireResourcePermission("service_order", "delete"), async (req, res) => {
    try {
      const deleted = await storage.deleteServiceOrder(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Service order not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Amendments
  app.get("/api/amendments", async (req, res) => {
    try {
      const { contractId } = req.query;
      const amendments = contractId
        ? await storage.getAmendmentsByContract(contractId as string)
        : await storage.getAllAmendments();
      res.json(amendments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/amendments/:id", async (req, res) => {
    try {
      const amendment = await storage.getAmendment(req.params.id);
      if (!amendment) {
        return res.status(404).json({ error: "Amendment not found" });
      }
      res.json(amendment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/amendments", requireResourcePermission("amendment", "add"), async (req, res) => {
    try {
      const amendmentData = insertAmendmentSchema.parse(req.body);
      const amendment = await storage.createAmendment(amendmentData);
      res.status(201).json(amendment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/amendments/:id", requireResourcePermission("amendment", "edit"), async (req, res) => {
    try {
      const amendment = await storage.updateAmendment(req.params.id, req.body);
      if (!amendment) {
        return res.status(404).json({ error: "Amendment not found" });
      }
      res.json(amendment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/amendments/:id", requireResourcePermission("amendment", "delete"), async (req, res) => {
    try {
      const deleted = await storage.deleteAmendment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Amendment not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      const { contractId } = req.query;
      const invoices = contractId
        ? await storage.getInvoicesByContract(contractId as string)
        : await storage.getAllInvoices();
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/invoices", requireResourcePermission("invoice", "add"), async (req, res) => {
    try {
      const invoiceData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/invoices/:id", requireResourcePermission("invoice", "edit"), async (req, res) => {
    try {
      const invoice = await storage.updateInvoice(req.params.id, req.body);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/invoices/:id", requireResourcePermission("invoice", "delete"), async (req, res) => {
    try {
      const deleted = await storage.deleteInvoice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Notifications
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.params.userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const updated = await storage.markNotificationAsRead(req.params.id);
      if (!updated) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteNotification(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
