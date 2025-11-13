import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users Table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("user"), // admin, marches_manager, ordonnateur, technical_service
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Suppliers/Fournisseurs Table
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  registrationNumber: text("registration_number").unique(), // RC, ICE
  taxId: text("tax_id"),
  address: text("address"),
  city: text("city"),
  phone: text("phone"),
  email: text("email"),
  contactPerson: text("contact_person"),
  category: text("category"), // travaux, fournitures, services
  status: text("status").notNull().default("active"), // active, suspended, blacklisted
  performanceScore: decimal("performance_score", { precision: 3, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tenders/Appels d'offres Table
export const tenders = pgTable("tenders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reference: text("reference").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  masterAgency: text("master_agency").notNull(), // Maître d'ouvrage
  procedureType: text("procedure_type").notNull(), // AO ouvert, restreint, concours, consultation
  category: text("category").notNull(), // travaux, fournitures, services
  estimatedBudget: decimal("estimated_budget", { precision: 15, scale: 2 }),
  currency: text("currency").notNull().default("MAD"),
  publicationDate: timestamp("publication_date"),
  submissionDeadline: timestamp("submission_deadline").notNull(),
  openingDate: timestamp("opening_date"),
  technicalCriteria: jsonb("technical_criteria"), // Weighted criteria
  financialCriteria: jsonb("financial_criteria"),
  status: text("status").notNull().default("en cours d'étude"), // en cours d'étude, publié, en cours de jugement, attribué, annulé
  documentUrl: text("document_url"), // Link to DCE
  importedFrom: text("imported_from"), // marchespublics.gov.ma or manual
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lotsNumber: integer("lots_number"),
  provisionalGuaranteeAmount: decimal("provisional_guarantee_amount", { precision: 15, scale: 2 }),
  openingLocation: text("opening_location"),
  executionLocation: text("execution_location"),
});

// Bids/Offres Table
export const bids = pgTable("bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenderId: varchar("tender_id").notNull().references(() => tenders.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id),
  submissionDate: timestamp("submission_date").notNull().defaultNow(),
  technicalScore: decimal("technical_score", { precision: 5, scale: 2 }),
  financialScore: decimal("financial_score", { precision: 5, scale: 2 }),
  totalScore: decimal("total_score", { precision: 5, scale: 2 }),
  proposedAmount: decimal("proposed_amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("MAD"),
  discount: decimal("discount", { precision: 5, scale: 2 }).default("0"), // Percentage
  finalAmount: decimal("final_amount", { precision: 15, scale: 2 }).notNull(),
  deliveryTime: integer("delivery_time"), // in days
  technicalDocuments: jsonb("technical_documents"), // Array of document refs
  financialDocuments: jsonb("financial_documents"),
  status: text("status").notNull().default("submitted"), // submitted, under_review, qualified, disqualified, awarded, rejected
  disqualificationReason: text("disqualification_reason"),
  rank: integer("rank"), // Ranking after evaluation
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Contracts/Marchés Table
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractNumber: text("contract_number").notNull().unique(),
  tenderId: varchar("tender_id").notNull().references(() => tenders.id),
  bidId: varchar("bid_id").notNull().references(() => bids.id),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id),
  title: text("title").notNull(),
  contractAmount: decimal("contract_amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("MAD"),
  signatureDate: timestamp("signature_date").notNull(),
  startDate: timestamp("start_date").notNull(),
  plannedEndDate: timestamp("planned_end_date").notNull(),
  actualEndDate: timestamp("actual_end_date"),
  executionDelay: integer("execution_delay"), // in days
  status: text("status").notNull().default("signed"), // signed, in_progress, suspended, completed, terminated
  guaranteeAmount: decimal("guarantee_amount", { precision: 15, scale: 2 }),
  guaranteeType: text("guarantee_type"), // cautionnement, retenue de garantie
  retentionPercentage: decimal("retention_percentage", { precision: 5, scale: 2 }).default("10"),
  advancePaymentPercentage: decimal("advance_payment_percentage", { precision: 5, scale: 2 }),
  penaltyRatePerDay: decimal("penalty_rate_per_day", { precision: 5, scale: 4 }).default("0.001"), // 0.1% per day
  accumulatedPenalties: decimal("accumulated_penalties", { precision: 15, scale: 2 }).default("0"),
  pvDocumentUrl: text("pv_document_url"), // Procès-verbal d'adjudication
  contractDocumentUrl: text("contract_document_url"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Service Orders/Ordres de service Table
export const serviceOrders = pgTable("service_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  orderNumber: text("order_number").notNull().unique(),
  orderType: text("order_type").notNull(), // start, suspension, resumption, modification
  orderDate: timestamp("order_date").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  description: text("description").notNull(),
  documentUrl: text("document_url"),
  issuedBy: varchar("issued_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Amendments/Avenants Table
export const amendments = pgTable("amendments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  amendmentNumber: text("amendment_number").notNull().unique(),
  amendmentDate: timestamp("amendment_date").notNull(),
  amendmentType: text("amendment_type").notNull(), // delay_extension, price_revision, scope_change
  description: text("description").notNull(),
  amountAdjustment: decimal("amount_adjustment", { precision: 15, scale: 2 }).default("0"),
  delayExtension: integer("delay_extension").default(0), // in days
  newEndDate: timestamp("new_end_date"),
  justification: text("justification"),
  documentUrl: text("document_url"),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Invoices/Décomptes Table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull().unique(),
  invoiceType: text("invoice_type").notNull(), // advance, provisional, final
  invoiceDate: timestamp("invoice_date").notNull(),
  workDescription: text("work_description"),
  grossAmount: decimal("gross_amount", { precision: 15, scale: 2 }).notNull(),
  retentionAmount: decimal("retention_amount", { precision: 15, scale: 2 }).default("0"),
  penaltiesAmount: decimal("penalties_amount", { precision: 15, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
  cumulativeAmount: decimal("cumulative_amount", { precision: 15, scale: 2 }),
  progressPercentage: decimal("progress_percentage", { precision: 5, scale: 2 }),
  status: text("status").notNull().default("draft"), // draft, submitted, approved, paid, rejected
  submissionDate: timestamp("submission_date"),
  approvalDate: timestamp("approval_date"),
  paymentDate: timestamp("payment_date"),
  documentUrl: text("document_url"),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Notifications/Alertes Table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // deadline_approaching, payment_due, contract_expiring, new_tender
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedEntityType: text("related_entity_type"), // tender, contract, invoice
  relatedEntityId: varchar("related_entity_id"),
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  isRead: boolean("is_read").notNull().default(false),
  emailSent: boolean("email_sent").notNull().default(false),
  scheduledFor: timestamp("scheduled_for"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Import Logs for marchespublics.gov.ma scraping
export const importLogs = pgTable("import_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  importDate: timestamp("import_date").notNull().defaultNow(),
  source: text("source").notNull().default("marchespublics.gov.ma"),
  tendersFound: integer("tenders_found").default(0),
  tendersImported: integer("tenders_imported").default(0),
  tendersUpdated: integer("tenders_updated").default(0),
  status: text("status").notNull(), // success, partial, failed
  errorMessage: text("error_message"),
  executionTime: integer("execution_time"), // in seconds
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tenders: many(tenders),
  contracts: many(contracts),
  notifications: many(notifications),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  bids: many(bids),
  contracts: many(contracts),
}));

export const tendersRelations = relations(tenders, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [tenders.createdBy],
    references: [users.id],
  }),
  bids: many(bids),
  contracts: many(contracts),
}));

export const bidsRelations = relations(bids, ({ one }) => ({
  tender: one(tenders, {
    fields: [bids.tenderId],
    references: [tenders.id],
  }),
  supplier: one(suppliers, {
    fields: [bids.supplierId],
    references: [suppliers.id],
  }),
  contract: one(contracts),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  tender: one(tenders, {
    fields: [contracts.tenderId],
    references: [tenders.id],
  }),
  bid: one(bids, {
    fields: [contracts.bidId],
    references: [bids.id],
  }),
  supplier: one(suppliers, {
    fields: [contracts.supplierId],
    references: [suppliers.id],
  }),
  createdBy: one(users, {
    fields: [contracts.createdBy],
    references: [users.id],
  }),
  serviceOrders: many(serviceOrders),
  amendments: many(amendments),
  invoices: many(invoices),
}));

export const serviceOrdersRelations = relations(serviceOrders, ({ one }) => ({
  contract: one(contracts, {
    fields: [serviceOrders.contractId],
    references: [contracts.id],
  }),
  issuedBy: one(users, {
    fields: [serviceOrders.issuedBy],
    references: [users.id],
  }),
}));

export const amendmentsRelations = relations(amendments, ({ one }) => ({
  contract: one(contracts, {
    fields: [amendments.contractId],
    references: [contracts.id],
  }),
  approvedBy: one(users, {
    fields: [amendments.approvedBy],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  contract: one(contracts, {
    fields: [invoices.contractId],
    references: [contracts.id],
  }),
  approvedBy: one(users, {
    fields: [invoices.approvedBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Zod Schemas for Validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  performanceScore: true,
}).extend({
  registrationNumber: z.string().optional().or(z.literal("")),
  taxId: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")),
  contactPerson: z.string().optional().or(z.literal("")),
  category: z.string().optional(),
  status: z.string().optional(),
});

export const insertTenderSchema = createInsertSchema(tenders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  submissionDeadline: z.string().or(z.date()),
  openingDate: z.string().or(z.date()).optional(),
  publicationDate: z.string().or(z.date()).optional(),
  lotsNumber: z.coerce.number().int().min(0).optional(),
  provisionalGuaranteeAmount: z.string().optional(),
  openingLocation: z.string().optional(),
  executionLocation: z.string().optional(),
  status: z.enum([
    "en cours d'étude",
    "publié",
    "en cours de jugement",
    "attribué",
    "annulé",
  ]),
});

export const insertBidSchema = createInsertSchema(bids).omit({
  id: true,
  createdAt: true,
  submissionDate: true,
  rank: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  accumulatedPenalties: true,
}).extend({
  signatureDate: z.string().or(z.date()),
  startDate: z.string().or(z.date()),
  plannedEndDate: z.string().or(z.date()),
  actualEndDate: z.string().or(z.date()).optional(),
});

export const insertServiceOrderSchema = createInsertSchema(serviceOrders).omit({
  id: true,
  createdAt: true,
}).extend({
  orderDate: z.string().or(z.date()),
  effectiveDate: z.string().or(z.date()),
});

export const insertAmendmentSchema = createInsertSchema(amendments).omit({
  id: true,
  createdAt: true,
}).extend({
  amendmentDate: z.string().or(z.date()),
  newEndDate: z.string().or(z.date()).optional(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
}).extend({
  invoiceDate: z.string().or(z.date()),
  submissionDate: z.string().or(z.date()).optional(),
  approvalDate: z.string().or(z.date()).optional(),
  paymentDate: z.string().or(z.date()).optional(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// TypeScript Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export type InsertTender = z.infer<typeof insertTenderSchema>;
export type Tender = typeof tenders.$inferSelect;

export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bids.$inferSelect;

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export type InsertServiceOrder = z.infer<typeof insertServiceOrderSchema>;
export type ServiceOrder = typeof serviceOrders.$inferSelect;

export type InsertAmendment = z.infer<typeof insertAmendmentSchema>;
export type Amendment = typeof amendments.$inferSelect;

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type ImportLog = typeof importLogs.$inferSelect;
