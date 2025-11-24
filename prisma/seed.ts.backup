// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROLES = [
  { name: "Owner / Super Admin", slug: "owner-super-admin" },
  { name: "General Manager", slug: "general-manager" },
  { name: "Warehouse Lead", slug: "warehouse-lead" },
  { name: "Marketing Manager", slug: "marketing-manager" },
  { name: "Logistics Coordinator", slug: "logistics-coordinator" },
  { name: "QA / Food Safety Officer", slug: "qa-food-safety-officer" },
  { name: "Finance / Accountant", slug: "finance-accountant" },
  { name: "Customer Support", slug: "customer-support" },
  { name: "HR / People Ops", slug: "hr-people-ops" },
  { name: "Store Manager", slug: "store-manager" },
  { name: "Procurement / Buyer", slug: "procurement-buyer" },
  { name: "Production Manager", slug: "production-manager" },
  { name: "Packers / Warehouse Staff", slug: "packers-warehouse-staff" },
  { name: "Kitchen Assistant / Cooks", slug: "kitchen-assistant-cooks" },
  { name: "POS Operator", slug: "pos-operator" },
];

// RBAC Matrix based on the provided access matrix
const PERMISSIONS_MATRIX: Record<string, Record<string, string>> = {
  "owner-super-admin": {
    dashboard: "Yes",
    orders: "Yes",
    production_batches: "Yes",
    qc: "Yes",
    inventory: "Yes",
    warehouse: "Yes",
    shipments: "Yes",
    crm: "Yes",
    pos_store: "Yes",
    hr: "Yes",
    checklists: "Yes",
    marketing: "Yes",
    events: "Yes",
    sales_channels: "Yes",
    finance: "Yes",
    settings: "Yes",
    users: "Yes",
    audit_logs: "Yes",
    rules_engine: "Yes",
  },
  "general-manager": {
    dashboard: "Yes",
    orders: "Yes",
    production_batches: "Yes",
    qc: "Partial",
    inventory: "Yes",
    warehouse: "Yes",
    shipments: "Yes",
    crm: "Yes",
    pos_store: "Partial",
    hr: "Partial",
    checklists: "Yes",
    marketing: "Yes",
    events: "Yes",
    sales_channels: "Yes",
    finance: "Partial",
    settings: "Partial",
    users: "No",
    audit_logs: "Partial",
    rules_engine: "Partial",
  },
  "warehouse-lead": {
    dashboard: "Yes",
    orders: "Yes",
    production_batches: "Partial",
    qc: "No",
    inventory: "Yes",
    warehouse: "Yes",
    shipments: "Yes",
    crm: "No",
    pos_store: "No",
    hr: "No",
    checklists: "Partial",
    marketing: "Yes",
    events: "No",
    sales_channels: "No",
    finance: "Partial",
    settings: "No",
    users: "No",
    audit_logs: "No",
    rules_engine: "No",
  },
  "marketing-manager": {
    dashboard: "Yes",
    orders: "Partial",
    production_batches: "No",
    qc: "No",
    inventory: "No",
    warehouse: "No",
    shipments: "No",
    crm: "Yes",
    pos_store: "No",
    hr: "No",
    checklists: "No",
    marketing: "Yes",
    events: "Yes",
    sales_channels: "Yes",
    finance: "Partial",
    settings: "Partial",
    users: "No",
    audit_logs: "No",
    rules_engine: "No",
  },
  "logistics-coordinator": {
    dashboard: "Yes",
    orders: "Yes",
    production_batches: "Partial",
    qc: "No",
    inventory: "Partial",
    warehouse: "Yes",
    shipments: "Yes",
    crm: "No",
    pos_store: "No",
    hr: "No",
    checklists: "Yes",
    marketing: "No",
    events: "No",
    sales_channels: "Partial",
    finance: "Partial",
    settings: "No",
    users: "No",
    audit_logs: "No",
    rules_engine: "No",
  },
  "qa-food-safety-officer": {
    dashboard: "Yes",
    orders: "Partial",
    production_batches: "Yes",
    qc: "Yes",
    inventory: "Partial",
    warehouse: "No",
    shipments: "No",
    crm: "No",
    pos_store: "No",
    hr: "No",
    checklists: "Partial",
    marketing: "Yes",
    events: "No",
    sales_channels: "No",
    finance: "No",
    settings: "Partial",
    users: "No",
    audit_logs: "Partial",
    rules_engine: "Yes",
  },
  "finance-accountant": {
    dashboard: "Yes",
    orders: "Partial",
    production_batches: "No",
    qc: "No",
    inventory: "Partial",
    warehouse: "No",
    shipments: "Partial",
    crm: "No",
    pos_store: "No",
    hr: "No",
    checklists: "Partial",
    marketing: "Yes",
    events: "No",
    sales_channels: "No",
    finance: "Yes",
    settings: "Yes",
    users: "Partial",
    audit_logs: "No",
    rules_engine: "Yes",
  },
  "customer-support": {
    dashboard: "Yes",
    orders: "Yes",
    production_batches: "No",
    qc: "No",
    inventory: "Partial",
    warehouse: "Partial",
    shipments: "Partial",
    crm: "Yes",
    pos_store: "No",
    hr: "No",
    checklists: "No",
    marketing: "Yes",
    events: "No",
    sales_channels: "Partial",
    finance: "No",
    settings: "No",
    users: "No",
    audit_logs: "No",
    rules_engine: "No",
  },
  "hr-people-ops": {
    dashboard: "Yes",
    orders: "No",
    production_batches: "No",
    qc: "No",
    inventory: "No",
    warehouse: "No",
    shipments: "No",
    crm: "No",
    pos_store: "No",
    hr: "Yes",
    checklists: "Yes",
    marketing: "No",
    events: "No",
    sales_channels: "No",
    finance: "No",
    settings: "Partial",
    users: "Partial",
    audit_logs: "Yes",
    rules_engine: "Partial",
  },
  "store-manager": {
    dashboard: "Yes",
    orders: "Partial",
    production_batches: "No",
    qc: "No",
    inventory: "Partial",
    warehouse: "No",
    shipments: "No",
    crm: "Yes",
    pos_store: "Yes",
    hr: "Partial",
    checklists: "Yes",
    marketing: "Partial",
    events: "Partial",
    sales_channels: "No",
    finance: "Partial",
    settings: "No",
    users: "No",
    audit_logs: "No",
    rules_engine: "No",
  },
  "procurement-buyer": {
    dashboard: "Yes",
    orders: "No",
    production_batches: "Partial",
    qc: "No",
    inventory: "Yes",
    warehouse: "Partial",
    shipments: "No",
    crm: "No",
    pos_store: "No",
    hr: "No",
    checklists: "No",
    marketing: "Yes",
    events: "No",
    sales_channels: "No",
    finance: "No",
    settings: "Partial",
    users: "No",
    audit_logs: "No",
    rules_engine: "No",
  },
  "production-manager": {
    dashboard: "Yes",
    orders: "Partial",
    production_batches: "Yes",
    qc: "Partial",
    inventory: "Partial",
    warehouse: "No",
    shipments: "No",
    crm: "No",
    pos_store: "No",
    hr: "No",
    checklists: "Partial",
    marketing: "Yes",
    events: "No",
    sales_channels: "No",
    finance: "No",
    settings: "No",
    users: "No",
    audit_logs: "No",
    rules_engine: "Partial",
  },
  "packers-warehouse-staff": {
    dashboard: "Partial",
    orders: "Yes",
    production_batches: "Partial",
    qc: "No",
    inventory: "Partial",
    warehouse: "Yes",
    shipments: "Partial",
    crm: "No",
    pos_store: "No",
    hr: "No",
    checklists: "Partial",
    marketing: "Yes",
    events: "No",
    sales_channels: "No",
    finance: "No",
    settings: "No",
    users: "No",
    audit_logs: "No",
    rules_engine: "No",
  },
  "kitchen-assistant-cooks": {
    dashboard: "Yes",
    orders: "Partial",
    production_batches: "Yes",
    qc: "Partial",
    inventory: "Partial",
    warehouse: "Partial",
    shipments: "No",
    crm: "No",
    pos_store: "No",
    hr: "No",
    checklists: "Partial",
    marketing: "Yes",
    events: "No",
    sales_channels: "No",
    finance: "No",
    settings: "No",
    users: "No",
    audit_logs: "No",
    rules_engine: "No",
  },
  "pos-operator": {
    dashboard: "Partial",
    orders: "Partial",
    production_batches: "No",
    qc: "No",
    inventory: "Partial",
    warehouse: "No",
    shipments: "No",
    crm: "Partial",
    pos_store: "Yes",
    hr: "No",
    checklists: "Partial",
    marketing: "Yes",
    events: "No",
    sales_channels: "No",
    finance: "No",
    settings: "No",
    users: "No",
    audit_logs: "No",
    rules_engine: "No",
  },
};

// Define all permissions
const ALL_PERMISSIONS = [
  // Dashboard
  { name: "View Dashboard", slug: "dashboard.view", category: "dashboard" },
  { name: "Dashboard Analytics", slug: "dashboard.analytics", category: "dashboard" },

  // Orders
  { name: "View Orders", slug: "orders.view", category: "orders" },
  { name: "Create Order", slug: "orders.create", category: "orders" },
  { name: "Update Order", slug: "orders.update", category: "orders" },
  { name: "Delete Order", slug: "orders.delete", category: "orders" },
  { name: "Export Orders", slug: "orders.export", category: "orders" },

  // Production/Batches
  { name: "View Batches", slug: "production.view", category: "production" },
  { name: "Create Batch", slug: "production.create", category: "production" },
  { name: "Update Batch", slug: "production.update", category: "production" },
  { name: "Start Batch", slug: "production.start", category: "production" },
  { name: "Complete Batch", slug: "production.complete", category: "production" },

  // QC
  { name: "View QC", slug: "qc.view", category: "qc" },
  { name: "Create QC Check", slug: "qc.create", category: "qc" },
  { name: "Report Nonconformance", slug: "qc.report", category: "qc" },
  { name: "Approve QC", slug: "qc.approve", category: "qc" },

  // Inventory
  { name: "View Inventory", slug: "inventory.view", category: "inventory" },
  { name: "Adjust Inventory", slug: "inventory.adjust", category: "inventory" },
  { name: "Set Reorder Levels", slug: "inventory.reorder", category: "inventory" },

  // Warehouse
  { name: "View Warehouse", slug: "warehouse.view", category: "warehouse" },
  { name: "Manage Pick Lists", slug: "warehouse.pick", category: "warehouse" },
  { name: "Manage Pack Jobs", slug: "warehouse.pack", category: "warehouse" },

  // Shipments
  { name: "View Shipments", slug: "shipments.view", category: "shipments" },
  { name: "Create Shipment", slug: "shipments.create", category: "shipments" },
  { name: "Dispatch Shipment", slug: "shipments.dispatch", category: "shipments" },

  // CRM
  { name: "View CRM", slug: "crm.view", category: "crm" },
  { name: "Manage Customers", slug: "crm.manage", category: "crm" },
  { name: "View Interactions", slug: "crm.interactions", category: "crm" },

  // POS/Store
  { name: "View POS", slug: "pos.view", category: "pos" },
  { name: "Create POS Order", slug: "pos.order", category: "pos" },
  { name: "Process Payment", slug: "pos.payment", category: "pos" },

  // HR
  { name: "View HR", slug: "hr.view", category: "hr" },
  { name: "Manage Employees", slug: "hr.manage", category: "hr" },
  { name: "View Attendance", slug: "hr.attendance", category: "hr" },
  { name: "Manage Infractions", slug: "hr.infractions", category: "hr" },

  // Checklists
  { name: "View Checklists", slug: "checklists.view", category: "checklists" },
  { name: "Execute Checklist", slug: "checklists.execute", category: "checklists" },
  { name: "Create Checklist", slug: "checklists.create", category: "checklists" },

  // Marketing
  { name: "View Marketing", slug: "marketing.view", category: "marketing" },
  { name: "Manage Campaigns", slug: "marketing.campaigns", category: "marketing" },
  { name: "View Analytics", slug: "marketing.analytics", category: "marketing" },

  // Events
  { name: "View Events", slug: "events.view", category: "events" },
  { name: "Manage Events", slug: "events.manage", category: "events" },

  // Sales Channels
  { name: "View Sales Channels", slug: "sales_channels.view", category: "sales_channels" },
  { name: "Manage Integrations", slug: "sales_channels.manage", category: "sales_channels" },
  { name: "View Settlements", slug: "sales_channels.settlements", category: "sales_channels" },

  // Finance
  { name: "View Finance", slug: "finance.view", category: "finance" },
  { name: "Manage Invoices", slug: "finance.invoices", category: "finance" },
  { name: "View Reports", slug: "finance.reports", category: "finance" },
  { name: "Export Financial Data", slug: "finance.export", category: "finance" },

  // Settings
  { name: "View Settings", slug: "settings.view", category: "settings" },
  { name: "Manage Settings", slug: "settings.manage", category: "settings" },
  { name: "Configure Integrations", slug: "settings.integrations", category: "settings" },

  // Users
  { name: "View Users", slug: "users.view", category: "users" },
  { name: "Manage Users", slug: "users.manage", category: "users" },
  { name: "Invite Users", slug: "users.invite", category: "users" },

  // Audit Logs
  { name: "View Audit Logs", slug: "audit_logs.view", category: "audit_logs" },
  { name: "Export Audit Logs", slug: "audit_logs.export", category: "audit_logs" },

  // Rules Engine
  { name: "View Rules", slug: "rules_engine.view", category: "rules_engine" },
  { name: "Create Rules", slug: "rules_engine.create", category: "rules_engine" },
  { name: "Approve Rules", slug: "rules_engine.approve", category: "rules_engine" },
];

async function seed() {
  console.log("🌱 Starting seed...");

  // Create roles
  console.log("Creating roles...");
  const createdRoles = await Promise.all(
    ROLES.map((role) =>
      prisma.role.upsert({
        where: { slug: role.slug },
        update: {},
        create: {
          name: role.name,
          slug: role.slug,
        },
      })
    )
  );

  // Create permissions
  console.log("Creating permissions...");
  const createdPermissions = await Promise.all(
    ALL_PERMISSIONS.map((perm) =>
      prisma.permission.upsert({
        where: { slug: perm.slug },
        update: {},
        create: {
          name: perm.name,
          slug: perm.slug,
          category: perm.category,
        },
      })
    )
  );

  // Create role-permission mappings based on RBAC matrix
  console.log("Creating role-permission mappings...");

  for (const [roleSlug, permMap] of Object.entries(PERMISSIONS_MATRIX)) {
    const role = createdRoles.find((r) => r.slug === roleSlug);
    if (!role) continue;

    for (const [category, access] of Object.entries(permMap)) {
      if (access === "No") continue; // Skip "No" access

      // Find permissions for this category
      const categoryPerms = createdPermissions.filter((p) => p.category === category);

      // For "Partial", only give view and execute permissions
      const permsToAssign =
        access === "Partial"
          ? categoryPerms.filter((p) =>
              p.slug.includes(".view") || p.slug.includes(".execute") || p.slug.includes(".read")
            )
          : categoryPerms;

      for (const perm of permsToAssign) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }

  console.log("✅ Seed completed successfully!");
}

seed()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
