import { 
  users, 
  suppliers, 
  tenders, 
  bids, 
  contracts, 
  serviceOrders, 
  amendments, 
  invoices, 
  notifications,
  type User, 
  type InsertUser,
  type Supplier,
  type InsertSupplier,
  type Tender,
  type InsertTender,
  type Bid,
  type InsertBid,
  type Contract,
  type InsertContract,
  type ServiceOrder,
  type InsertServiceOrder,
  type Amendment,
  type InsertAmendment,
  type Invoice,
  type InsertInvoice,
  type Notification,
  type InsertNotification
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, or } from "drizzle-orm";

// Helper function to convert string dates to Date objects
function convertDates<T extends Record<string, any>>(data: T): T {
  const result = { ...data };
  for (const key in result) {
    if (result[key] && typeof result[key] === 'string') {
      const dateValue = new Date(result[key] as string);
      if (!isNaN(dateValue.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(result[key] as string)) {
        result[key] = dateValue as any;
      }
    }
  }
  return result;
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Suppliers
  getSupplier(id: string): Promise<Supplier | undefined>;
  getAllSuppliers(): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<boolean>;

  // Tenders
  getTender(id: string): Promise<Tender | undefined>;
  getAllTenders(): Promise<Tender[]>;
  getTendersByStatus(status: string): Promise<Tender[]>;
  createTender(tender: InsertTender): Promise<Tender>;
  updateTender(id: string, tender: Partial<InsertTender>): Promise<Tender | undefined>;
  deleteTender(id: string): Promise<boolean>;

  // Bids
  getBid(id: string): Promise<Bid | undefined>;
  getAllBids(): Promise<Bid[]>;
  getBidsByTender(tenderId: string): Promise<Bid[]>;
  getBidsBySupplier(supplierId: string): Promise<Bid[]>;
  createBid(bid: InsertBid): Promise<Bid>;
  updateBid(id: string, bid: Partial<InsertBid>): Promise<Bid | undefined>;
  deleteBid(id: string): Promise<boolean>;

  // Contracts
  getContract(id: string): Promise<Contract | undefined>;
  getAllContracts(): Promise<Contract[]>;
  getContractsByStatus(status: string): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: string): Promise<boolean>;

  // Service Orders
  getServiceOrder(id: string): Promise<ServiceOrder | undefined>;
  getAllServiceOrders(): Promise<ServiceOrder[]>;
  getServiceOrdersByContract(contractId: string): Promise<ServiceOrder[]>;
  createServiceOrder(order: InsertServiceOrder): Promise<ServiceOrder>;
  updateServiceOrder(id: string, order: Partial<InsertServiceOrder>): Promise<ServiceOrder | undefined>;
  deleteServiceOrder(id: string): Promise<boolean>;

  // Amendments
  getAmendment(id: string): Promise<Amendment | undefined>;
  getAllAmendments(): Promise<Amendment[]>;
  getAmendmentsByContract(contractId: string): Promise<Amendment[]>;
  createAmendment(amendment: InsertAmendment): Promise<Amendment>;
  updateAmendment(id: string, amendment: Partial<InsertAmendment>): Promise<Amendment | undefined>;
  deleteAmendment(id: string): Promise<boolean>;

  // Invoices
  getInvoice(id: string): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByContract(contractId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;

  // Notifications
  getNotification(id: string): Promise<Notification | undefined>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<boolean>;
  deleteNotification(id: string): Promise<boolean>;

  // Dashboard Stats
  getDashboardStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Suppliers
  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    return db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(insertSupplier).returning();
    return supplier;
  }

  async updateSupplier(id: string, supplierData: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [supplier] = await db.update(suppliers).set(supplierData).where(eq(suppliers.id, id)).returning();
    return supplier || undefined;
  }

  async deleteSupplier(id: string): Promise<boolean> {
    const result = await db.delete(suppliers).where(eq(suppliers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Tenders
  async getTender(id: string): Promise<Tender | undefined> {
    const [tender] = await db.select().from(tenders).where(eq(tenders.id, id));
    return tender || undefined;
  }

  async getAllTenders(): Promise<Tender[]> {
    return db.select().from(tenders).orderBy(desc(tenders.createdAt));
  }

  async getTendersByStatus(status: string): Promise<Tender[]> {
    return db.select().from(tenders).where(eq(tenders.status, status)).orderBy(desc(tenders.createdAt));
  }

  async createTender(insertTender: InsertTender): Promise<Tender> {
    const [tender] = await db.insert(tenders).values(convertDates(insertTender) as any).returning();
    return tender;
  }

  async updateTender(id: string, tenderData: Partial<InsertTender>): Promise<Tender | undefined> {
    const [tender] = await db.update(tenders)
      .set({ ...convertDates(tenderData), updatedAt: new Date() } as any)
      .where(eq(tenders.id, id))
      .returning();
    return tender || undefined;
  }

  async deleteTender(id: string): Promise<boolean> {
    const result = await db.delete(tenders).where(eq(tenders.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Bids
  async getBid(id: string): Promise<Bid | undefined> {
    const [bid] = await db.select().from(bids).where(eq(bids.id, id));
    return bid || undefined;
  }

  async getAllBids(): Promise<Bid[]> {
    return db.select().from(bids).orderBy(desc(bids.submissionDate));
  }

  async getBidsByTender(tenderId: string): Promise<Bid[]> {
    return db.select().from(bids)
      .where(eq(bids.tenderId, tenderId))
      .orderBy(desc(bids.submissionDate));
  }

  async getBidsBySupplier(supplierId: string): Promise<Bid[]> {
    return db.select().from(bids)
      .where(eq(bids.supplierId, supplierId))
      .orderBy(desc(bids.submissionDate));
  }

  async createBid(insertBid: InsertBid): Promise<Bid> {
    const [bid] = await db.insert(bids).values(insertBid).returning();
    return bid;
  }

  async updateBid(id: string, bidData: Partial<InsertBid>): Promise<Bid | undefined> {
    const [bid] = await db.update(bids).set(bidData).where(eq(bids.id, id)).returning();
    return bid || undefined;
  }

  async deleteBid(id: string): Promise<boolean> {
    const result = await db.delete(bids).where(eq(bids.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Contracts
  async getContract(id: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract || undefined;
  }

  async getAllContracts(): Promise<Contract[]> {
    return db.select().from(contracts).orderBy(desc(contracts.createdAt));
  }

  async getContractsByStatus(status: string): Promise<Contract[]> {
    return db.select().from(contracts)
      .where(eq(contracts.status, status))
      .orderBy(desc(contracts.createdAt));
  }

  async createContract(insertContract: InsertContract): Promise<Contract> {
    const [contract] = await db.insert(contracts).values(convertDates(insertContract) as any).returning();
    return contract;
  }

  async updateContract(id: string, contractData: Partial<InsertContract>): Promise<Contract | undefined> {
    const [contract] = await db.update(contracts)
      .set({ ...convertDates(contractData), updatedAt: new Date() } as any)
      .where(eq(contracts.id, id))
      .returning();
    return contract || undefined;
  }

  async deleteContract(id: string): Promise<boolean> {
    const result = await db.delete(contracts).where(eq(contracts.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Service Orders
  async getServiceOrder(id: string): Promise<ServiceOrder | undefined> {
    const [order] = await db.select().from(serviceOrders).where(eq(serviceOrders.id, id));
    return order || undefined;
  }

  async getAllServiceOrders(): Promise<ServiceOrder[]> {
    return db.select().from(serviceOrders).orderBy(desc(serviceOrders.createdAt));
  }

  async getServiceOrdersByContract(contractId: string): Promise<ServiceOrder[]> {
    return db.select().from(serviceOrders)
      .where(eq(serviceOrders.contractId, contractId))
      .orderBy(desc(serviceOrders.createdAt));
  }

  async createServiceOrder(insertOrder: InsertServiceOrder): Promise<ServiceOrder> {
    const [order] = await db.insert(serviceOrders).values(convertDates(insertOrder) as any).returning();
    return order;
  }

  async updateServiceOrder(id: string, orderData: Partial<InsertServiceOrder>): Promise<ServiceOrder | undefined> {
    const [order] = await db.update(serviceOrders).set(convertDates(orderData) as any).where(eq(serviceOrders.id, id)).returning();
    return order || undefined;
  }

  async deleteServiceOrder(id: string): Promise<boolean> {
    const result = await db.delete(serviceOrders).where(eq(serviceOrders.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Amendments
  async getAmendment(id: string): Promise<Amendment | undefined> {
    const [amendment] = await db.select().from(amendments).where(eq(amendments.id, id));
    return amendment || undefined;
  }

  async getAllAmendments(): Promise<Amendment[]> {
    return db.select().from(amendments).orderBy(desc(amendments.createdAt));
  }

  async getAmendmentsByContract(contractId: string): Promise<Amendment[]> {
    return db.select().from(amendments)
      .where(eq(amendments.contractId, contractId))
      .orderBy(desc(amendments.createdAt));
  }

  async createAmendment(insertAmendment: InsertAmendment): Promise<Amendment> {
    const [amendment] = await db.insert(amendments).values(convertDates(insertAmendment) as any).returning();
    return amendment;
  }

  async updateAmendment(id: string, amendmentData: Partial<InsertAmendment>): Promise<Amendment | undefined> {
    const [amendment] = await db.update(amendments).set(convertDates(amendmentData) as any).where(eq(amendments.id, id)).returning();
    return amendment || undefined;
  }

  async deleteAmendment(id: string): Promise<boolean> {
    const result = await db.delete(amendments).where(eq(amendments.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Invoices
  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByContract(contractId: string): Promise<Invoice[]> {
    return db.select().from(invoices)
      .where(eq(invoices.contractId, contractId))
      .orderBy(desc(invoices.createdAt));
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(convertDates(insertInvoice) as any).returning();
    return invoice;
  }

  async updateInvoice(id: string, invoiceData: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [invoice] = await db.update(invoices).set(convertDates(invoiceData) as any).where(eq(invoices.id, id)).returning();
    return invoice || undefined;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Notifications
  async getNotification(id: string): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification || undefined;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const result = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<any> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [allTenders] = await db.select({ count: sql<number>`count(*)` }).from(tenders);
    const [activeTenders] = await db.select({ count: sql<number>`count(*)` })
      .from(tenders)
      .where(eq(tenders.status, 'publié'));
    
    const [allContracts] = await db.select({ count: sql<number>`count(*)` }).from(contracts);
    const [activeContracts] = await db.select({ count: sql<number>`count(*)` })
      .from(contracts)
      .where(eq(contracts.status, 'in_progress'));
    
    const [allSuppliers] = await db.select({ count: sql<number>`count(*)` }).from(suppliers);
    
    const [budgetResult] = await db.select({ 
      total: sql<number>`COALESCE(SUM(CAST(${contracts.contractAmount} AS DECIMAL)), 0)` 
    }).from(contracts);

    const upcomingTenderDeadlines = await db.select({
      id: tenders.id,
      reference: tenders.reference,
      title: tenders.title,
      deadline: tenders.submissionDeadline,
    })
    .from(tenders)
    .where(
      and(
        eq(tenders.status, 'publié'),
        gte(tenders.submissionDeadline, now),
        lte(tenders.submissionDeadline, sevenDaysFromNow)
      )
    )
    .orderBy(tenders.submissionDeadline)
    .limit(5);

    return {
      totalTenders: allTenders.count || 0,
      activeTenders: activeTenders.count || 0,
      totalContracts: allContracts.count || 0,
      activeContracts: activeContracts.count || 0,
      totalSuppliers: allSuppliers.count || 0,
      totalBudget: budgetResult.total || 0,
      upcomingDeadlines: upcomingTenderDeadlines.map(t => ({
        id: t.id,
        reference: t.reference,
        title: t.title,
        deadline: t.deadline?.toISOString() || '',
        type: 'tender' as const,
      })),
      recentActivity: [],
    };
  }
}

export const storage = new DatabaseStorage();
