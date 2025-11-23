-- supabase/rls-policies.sql
-- Row-Level Security Policies for The Dough House System
-- All tables must have RLS enabled before these policies are applied

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Permission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserOrgMap" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserLocationMap" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Warehouse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sku" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryLot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SkuMapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChannelSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChannelOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChannelSettlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChannelFee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductionBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BatchIngredient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QcTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QcCheck" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NonconformanceReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PickList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PackJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Courier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Manifest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShiftsRoster" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShiftAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PenaltiesCatalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RewardsCatalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Infraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PenaltiesLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RewardsLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppealRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrainingRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Checklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChecklistRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChecklistEvidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sop" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarketingCampaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentCalendarItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InfluencerContract" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialMetric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerInteraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoyaltyWallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerSegment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GstReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialExport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RuleRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RuleAction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomationLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user org context
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS UUID AS $$
BEGIN
  -- This would be set via a context variable or JWT claim
  -- Example: RETURN (current_setting('app.org_id')::uuid);
  -- For now, return NULL and rely on application layer
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check if user has role in org
CREATE OR REPLACE FUNCTION user_has_role_in_org(
  user_id UUID,
  org_id UUID,
  role_slug TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "UserRole"."userId" = user_id
    AND "UserRole"."orgId" = org_id
    AND "UserRole"."roleId" = (SELECT id FROM "Role" WHERE slug = role_slug)
  );
END;
$$ LANGUAGE plpgsql;

-- Organizations: Users can see their own orgs
CREATE POLICY "Users can view their organizations"
  ON "Organization"
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "UserOrgMap"
    WHERE "UserOrgMap"."userId" = auth.uid()
    AND "UserOrgMap"."orgId" = "Organization".id
  ));

-- Locations: Users can see locations in their orgs
CREATE POLICY "Users can view locations in their orgs"
  ON "Location"
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "UserOrgMap"
    WHERE "UserOrgMap"."userId" = auth.uid()
    AND "UserOrgMap"."orgId" = "Location"."orgId"
  ));

-- Orders: Users can see/manage orders in their assigned org/location
CREATE POLICY "Users can view orders in their org/location"
  ON "Order"
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "UserRole"."userId" = auth.uid()
    AND "UserRole"."orgId" = "Order"."orgId"
    AND ("UserRole"."locationId" IS NULL OR "UserRole"."locationId" = "Order"."locationId")
  ));

CREATE POLICY "Users can create orders in their location"
  ON "Order"
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "UserRole"."userId" = auth.uid()
    AND "UserRole"."orgId" = "Order"."orgId"
    AND ("UserRole"."locationId" IS NULL OR "UserRole"."locationId" = "Order"."locationId")
  ));

CREATE POLICY "Users can update orders in their location"
  ON "Order"
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "UserRole"."userId" = auth.uid()
    AND "UserRole"."orgId" = "Order"."orgId"
    AND ("UserRole"."locationId" IS NULL OR "UserRole"."locationId" = "Order"."locationId")
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "UserRole"."userId" = auth.uid()
    AND "UserRole"."orgId" = "Order"."orgId"
    AND ("UserRole"."locationId" IS NULL OR "UserRole"."locationId" = "Order"."locationId")
  ));

-- Inventory: Users can access inventory in their locations
CREATE POLICY "Users can view inventory in their locations"
  ON "Inventory"
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "UserRole"."userId" = auth.uid()
    AND "UserRole"."orgId" = "Inventory"."orgId"
    AND ("UserRole"."locationId" IS NULL OR "UserRole"."locationId" = "Inventory"."locationId")
  ));

CREATE POLICY "Users can update inventory in their locations"
  ON "Inventory"
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "UserRole"."userId" = auth.uid()
    AND "UserRole"."orgId" = "Inventory"."orgId"
    AND ("UserRole"."locationId" IS NULL OR "UserRole"."locationId" = "Inventory"."locationId")
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "UserRole"."userId" = auth.uid()
    AND "UserRole"."orgId" = "Inventory"."orgId"
    AND ("UserRole"."locationId" IS NULL OR "UserRole"."locationId" = "Inventory"."locationId")
  ));

-- Batches: Access control based on org and location
CREATE POLICY "Users can view batches in their org"
  ON "ProductionBatch"
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "UserRole"."userId" = auth.uid()
    AND "UserRole"."orgId" = "ProductionBatch"."orgId"
  ));

CREATE POLICY "Users can create/update batches in their org"
  ON "ProductionBatch"
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "UserRole"."userId" = auth.uid()
    AND "UserRole"."orgId" = "ProductionBatch"."orgId"
  ));

-- Employees: Users can access employee records in their org
CREATE POLICY "Users can view employees in their org"
  ON "Employee"
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "UserRole"."userId" = auth.uid()
    AND "UserRole"."orgId" = "Employee"."orgId"
  ));

-- Customers: Users can access customer records in their org
CREATE POLICY "Users can view customers in their org"
  ON "Customer"
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "UserRole"."userId" = auth.uid()
    AND "UserRole"."orgId" = "Customer"."orgId"
  ));

-- Invoices: Users can access invoices in their org
CREATE POLICY "Users can view invoices in their org"
  ON "Invoice"
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "UserRole"."userId" = auth.uid()
    AND "UserRole"."orgId" = "Invoice"."orgId"
  ));

-- Audit Logs: Users can view audit logs only for their org
CREATE POLICY "Users can view audit logs for their org"
  ON "AuditLog"
  FOR SELECT
  USING (
    -- Allow Super Admins to view all audit logs
    user_has_role_in_org(auth.uid(), (
      SELECT "orgId" FROM "UserRole"
      WHERE "userId" = auth.uid()
      LIMIT 1
    ), 'owner-super-admin')
  );

-- Rules: Users can manage rules in their org
CREATE POLICY "Users can view rules in their org"
  ON "Rule"
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "UserRole"."userId" = auth.uid()
    AND "UserRole"."orgId" = "Rule"."orgId"
  ));

-- Checklists: Users can view and execute checklists assigned to their roles
CREATE POLICY "Users can view checklists"
  ON "Checklist"
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "UserRole"."userId" = auth.uid()
    AND (
      "Checklist"."orgId" = "UserRole"."orgId"
      OR ("Checklist"."locationId" IS NOT NULL 
          AND "Checklist"."locationId" = "UserRole"."locationId")
    )
    -- Check if role is in the checklist's accessible roles
    AND ("Checklist".roles::text LIKE '%' || (
      SELECT "Role".slug FROM "Role"
      WHERE "Role".id = "UserRole"."roleId"
    ) || '%')
  ));

-- Create indexes for RLS policy performance
CREATE INDEX idx_user_role_org ON "UserRole"("userId", "orgId");
CREATE INDEX idx_user_role_location ON "UserRole"("userId", "locationId");
CREATE INDEX idx_user_org_map ON "UserOrgMap"("userId", "orgId");
CREATE INDEX idx_order_org_location ON "Order"("orgId", "locationId");
CREATE INDEX idx_inventory_org_location ON "Inventory"("orgId", "locationId");
CREATE INDEX idx_batch_org ON "ProductionBatch"("orgId");
CREATE INDEX idx_employee_org ON "Employee"("orgId");
CREATE INDEX idx_customer_org ON "Customer"("orgId");
CREATE INDEX idx_invoice_org ON "Invoice"("orgId");
CREATE INDEX idx_rule_org ON "Rule"("orgId");
