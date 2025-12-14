// src/lib/validation.ts
import { z } from "zod";

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const createOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  channelSourceId: z.string().uuid(),
  items: z.array(
    z.object({
      skuId: z.string().uuid(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
    })
  ),
  totalAmount: z.number().positive(),
  taxAmount: z.number().nonnegative().default(0),
  discountAmount: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

export const createBatchSchema = z.object({
  batchNumber: z.string(),
  bomId: z.string().uuid().optional(),
  plannedDate: z.string().datetime(),
  ingredients: z.array(
    z.object({
      skuId: z.string().uuid(),
      requiredQuantity: z.number().positive(),
    })
  ),
});

export const createChecklistSchema = z.object({
  name: z.string(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  requiresPhotoEvidence: z.boolean().default(false),
  items: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      isRequired: z.boolean().default(true),
    })
  ),
  roles: z.array(z.string()),
});

export const createRuleSchema = z.object({
  name: z.string(),
  trigger: z.enum(["event", "cron", "threshold"]),
  triggerConfig: z.record(z.string(), z.any()),
  conditions: z.array(z.record(z.string(), z.any())),
  actions: z.array(z.record(z.string(), z.any())),
  approvalRequired: z.boolean().default(false),
});

export const createCampaignSchema = z.object({
  name: z.string(),
  type: z.enum(["email", "sms", "social", "in_app", "offline"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  budget: z.number().positive().optional(),
});

export const createCustomerSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

// Export types
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;
export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
