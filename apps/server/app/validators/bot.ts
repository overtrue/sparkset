import { z } from 'zod';

/**
 * 创建 Bot 验证 schema
 */
export const createBotValidator = z.object({
  name: z.string().min(1).max(191),
  description: z.string().optional(),
  type: z.enum(['wecom', 'discord', 'telegram', 'slack', 'custom']),
  webhookUrl: z.string().url(),
  adapterConfig: z.unknown().optional(),
  enabledActions: z.array(z.number()).optional(),
  enabledDataSources: z.array(z.number()).optional(),
  defaultDataSourceId: z.number().optional(),
  aiProviderId: z.number().optional(),
  enableQuery: z.boolean().optional(),
  rateLimit: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).optional(),
  requestTimeout: z.number().int().min(100).optional(),
});

/**
 * 更新 Bot 验证 schema
 */
export const updateBotValidator = z.object({
  name: z.string().min(1).max(191).optional(),
  description: z.string().optional(),
  adapterConfig: z.unknown().optional(),
  enabledActions: z.array(z.number()).optional(),
  enabledDataSources: z.array(z.number()).optional(),
  defaultDataSourceId: z.number().optional(),
  aiProviderId: z.number().optional(),
  enableQuery: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  rateLimit: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).optional(),
  requestTimeout: z.number().int().min(100).optional(),
});
