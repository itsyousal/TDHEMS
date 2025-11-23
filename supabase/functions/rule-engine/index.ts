// supabase/functions/rule-engine/index.ts
// Deno-based Supabase Edge Function for Rule Engine
// Deploy: supabase functions deploy rule-engine

import { createClient } from "@supabase/supabase-js";

interface RuleCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";
  value: any;
}

interface RuleAction {
  type:
    | "create_infraction"
    | "apply_penalty"
    | "allocate_stock"
    | "send_notification"
    | "create_po"
    | "update_status"
    | "custom";
  data: Record<string, any>;
}

interface Rule {
  id: string;
  name: string;
  trigger: "event" | "cron" | "threshold";
  triggerConfig: Record<string, any>;
  conditions: RuleCondition[];
  actions: RuleAction[];
  approvalRequired: boolean;
  dryRunMode: boolean;
  isActive: boolean;
}

interface RuleContext {
  orgId: string;
  userId?: string;
  data: Record<string, any>;
  metadata: Record<string, any>;
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(condition: RuleCondition, data: any): boolean {
  const value = data[condition.field];

  switch (condition.operator) {
    case "eq":
      return value === condition.value;
    case "neq":
      return value !== condition.value;
    case "gt":
      return value > condition.value;
    case "gte":
      return value >= condition.value;
    case "lt":
      return value < condition.value;
    case "lte":
      return value <= condition.value;
    case "in":
      return condition.value.includes(value);
    case "contains":
      return String(value).includes(String(condition.value));
    default:
      return false;
  }
}

/**
 * Evaluate all conditions (AND logic)
 */
function evaluateConditions(conditions: RuleCondition[], data: any): boolean {
  return conditions.every((condition) => evaluateCondition(condition, data));
}

/**
 * Execute a single action
 */
async function executeAction(
  action: RuleAction,
  context: RuleContext,
  client: ReturnType<typeof createClient>,
  dryRun: boolean = false
): Promise<Record<string, any>> {
  const result: Record<string, any> = {
    actionType: action.type,
    dryRun,
    timestamp: new Date().toISOString(),
  };

  if (dryRun) {
    result.status = "DRY_RUN";
    result.simulatedData = action.data;
    return result;
  }

  try {
    switch (action.type) {
      case "create_infraction":
        const infractionResult = await client.from("infractions").insert([
          {
            employee_id: action.data.employeeId,
            type: action.data.type,
            description: action.data.description,
            severity: action.data.severity || "low",
            recorded_date: new Date().toISOString(),
            org_id: context.orgId,
          },
        ]);
        result.status = infractionResult.error ? "FAILED" : "SUCCESS";
        result.data = infractionResult.data;
        break;

      case "apply_penalty":
        // Retrieve infraction and apply penalty
        const penaltyResult = await client.from("penalties_log").insert([
          {
            infraction_id: action.data.infractionId,
            catalog_id: action.data.catalogId,
            status: "pending",
            org_id: context.orgId,
          },
        ]);
        result.status = penaltyResult.error ? "FAILED" : "SUCCESS";
        result.data = penaltyResult.data;
        break;

      case "allocate_stock":
        // Update inventory allocation
        const allocationResult = await client
          .from("inventory")
          .update({
            reserved_quantity: (currentReserved: number) =>
              currentReserved + action.data.quantity,
          })
          .eq("sku_id", action.data.skuId)
          .eq("location_id", action.data.locationId);
        result.status = allocationResult.error ? "FAILED" : "SUCCESS";
        result.data = allocationResult.data;
        break;

      case "send_notification":
        // Queue notification (would integrate with email/SMS service)
        result.status = "QUEUED";
        result.notificationType = action.data.type;
        result.recipient = action.data.recipient;
        break;

      case "create_po":
        // Create purchase order suggestion
        // This would typically go to a separate workflow
        result.status = "CREATED";
        result.poData = action.data;
        break;

      case "update_status":
        const statusResult = await client
          .from(action.data.table)
          .update({ status: action.data.newStatus })
          .eq("id", action.data.resourceId);
        result.status = statusResult.error ? "FAILED" : "SUCCESS";
        result.data = statusResult.data;
        break;

      default:
        result.status = "UNKNOWN_ACTION";
    }
  } catch (error) {
    result.status = "ERROR";
    result.error = String(error);
  }

  return result;
}

/**
 * Main handler for rule engine
 */
async function handleRuleExecution(rule: Rule, context: RuleContext, dryRun: boolean = false) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

  // Create rule run record
  const { data: ruleRun, error: runError } = await supabase.from("rule_runs").insert([
    {
      rule_id: rule.id,
      triggered_by: context.metadata.triggeredBy,
      status: "executing",
      input: context.data,
      started_at: new Date().toISOString(),
    },
  ]);

  if (runError) {
    console.error("Failed to create rule run:", runError);
    throw runError;
  }

  const ruleRunId = (ruleRun as any)[0]?.id;

  try {
    // Check conditions
    const conditionsMet = evaluateConditions(rule.conditions, context.data);

    if (!conditionsMet) {
      // Conditions not met, skip actions
      await supabase.from("rule_runs").update({ status: "completed" }).eq("id", ruleRunId);
      return {
        success: true,
        message: "Conditions not met",
        conditionsMet: false,
      };
    }

    // Execute actions
    const actionResults = [];
    for (const action of rule.actions) {
      const actionResult = await executeAction(action, context, supabase, dryRun || rule.dryRunMode);
      actionResults.push(actionResult);

      // Create action record
      await supabase.from("rule_actions").insert([
        {
          rule_run_id: ruleRunId,
          action_type: action.type,
          action_data: action.data,
          status: actionResult.status,
          result: actionResult,
        },
      ]);
    }

    // If approval required and not dry run, set status to pending approval
    if (rule.approvalRequired && !dryRun) {
      await supabase
        .from("rule_runs")
        .update({
          status: "pending",
          approval_status: "pending",
          output: { actions: actionResults },
        })
        .eq("id", ruleRunId);
    } else {
      // Update rule run with completion
      await supabase
        .from("rule_runs")
        .update({
          status: "completed",
          output: { actions: actionResults },
          completed_at: new Date().toISOString(),
        })
        .eq("id", ruleRunId);
    }

    return {
      success: true,
      message: "Rule executed successfully",
      ruleRunId,
      actions: actionResults,
      requiresApproval: rule.approvalRequired && !dryRun,
    };
  } catch (error) {
    console.error("Error executing rule:", error);

    // Update rule run with error
    await supabase
      .from("rule_runs")
      .update({
        status: "failed",
        error: String(error),
        completed_at: new Date().toISOString(),
      })
      .eq("id", ruleRunId);

    throw error;
  }
}

/**
 * HTTP Handler
 */
async function handler(req: Request): Promise<Response> {
  try {
    // Parse request
    const { rule, context, dryRun } = await req.json() as {
      rule: Rule;
      context: RuleContext;
      dryRun?: boolean;
    };

    // Validate
    if (!rule || !context) {
      return new Response(JSON.stringify({ error: "Missing rule or context" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Execute rule
    const result = await handleRuleExecution(rule, context, dryRun);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Handler error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

Deno.serve(handler);
