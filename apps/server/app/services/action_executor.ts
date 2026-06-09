import { ActionExecutor } from '@sparkset/core';
import type { Action } from '../models/types.js';
import type Bot from '../models/bot.js';
import type BotEvent from '../models/bot_event.js';
import User from '#models/user';
import { ActionService } from './action_service.js';
import { AuthorizationService } from './authorization_service.js';
import { DatasetService } from './dataset_service.js';
import type { AuthorizationUser } from '../types/authorization.js';

/**
 * Result of action execution
 */
export interface ActionExecutionResult {
  success: boolean;
  data?: unknown;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Action Executor for Bot-invoked actions
 * Executes actions in the context of a bot interaction
 *
 * Flow:
 * 1. Verify action is enabled for this bot
 * 2. Validate parameters against action's input schema
 * 3. Execute the action using ActionExecutor from @sparkset/core
 * 4. Format result for bot response
 */
export class BotActionExecutor {
  constructor(
    private actionService: ActionService,
    _datasetService: DatasetService,
    private coreExecutor: ActionExecutor,
    private authorization?: AuthorizationService,
  ) {
    void _datasetService; // Reserved for future use in Phase 2.3
  }

  private isSqlAction(type: unknown): boolean {
    return String(type).toLowerCase() === 'sql';
  }

  private datasourceIdFromPayload(payload: unknown): number | null {
    if (!payload || typeof payload !== 'object') return null;
    const datasourceId = (payload as { datasourceId?: unknown }).datasourceId;
    const parsed = Number(datasourceId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private async botCreatorUser(bot: Bot): Promise<AuthorizationUser | null> {
    if (!bot.creatorId) return null;
    const user = await User.find(bot.creatorId);
    if (!user?.isActive) return null;
    return {
      id: user.id,
      roles: user.roles ?? [],
      permissions: user.permissions ?? [],
      isActive: user.isActive,
    };
  }

  private async canExecuteAction(
    bot: Bot,
    action: Pick<Action, 'type' | 'payload'>,
  ): Promise<{ allowed: boolean; code?: string; message?: string }> {
    if (!this.authorization) {
      return {
        allowed: false,
        code: 'ACTION_NOT_AUTHORIZED',
        message: 'Action authorization is not configured',
      };
    }

    const user = await this.botCreatorUser(bot);
    if (!user) {
      return {
        allowed: false,
        code: 'BOT_OWNER_UNAVAILABLE',
        message: 'Bot creator is unavailable or inactive',
      };
    }

    if (!this.isSqlAction(action.type)) {
      return this.authorization.canPerformGlobalAction(user, 'action:execute')
        ? { allowed: true }
        : {
            allowed: false,
            code: 'ACTION_NOT_AUTHORIZED',
            message: 'Missing permission: action:execute',
          };
    }

    const datasourceId = this.datasourceIdFromPayload(action.payload);
    if (!datasourceId) {
      return {
        allowed: false,
        code: 'ACTION_DATASOURCE_NOT_CONFIGURED',
        message: 'SQL actions must include payload.datasourceId',
      };
    }

    const allowed = await this.authorization.can(user, 'datasource:manage', {
      type: 'datasource',
      id: datasourceId,
    });
    return allowed
      ? { allowed: true }
      : {
          allowed: false,
          code: 'ACTION_NOT_AUTHORIZED',
          message: 'Missing permission: datasource:manage',
        };
  }

  /**
   * Execute an action in the context of a bot
   */
  async execute(bot: Bot, event: BotEvent, action: Action): Promise<ActionExecutionResult> {
    try {
      // 1. Verify action is enabled for this bot
      if (!bot.enabledActions || !bot.enabledActions.includes(action.id)) {
        return {
          success: false,
          error: {
            message: 'Action is not enabled for this bot',
            code: 'ACTION_NOT_ENABLED',
          },
        };
      }

      const authorization = await this.canExecuteAction(bot, action);
      if (!authorization.allowed) {
        return {
          success: false,
          error: {
            message: authorization.message ?? 'Action is not authorized for this bot',
            code: authorization.code,
          },
        };
      }

      // 2. Validate parameters (basic validation)
      // In a real implementation, we'd validate against action.inputSchema
      // For now, we'll skip parameter validation since it depends on the action type
      void event; // Use event in a real implementation for logging/tracking

      // 3. Execute the action using core executor
      // Construct the execution payload from the action's stored payload
      const result = await this.coreExecutor.run({
        id: action.id,
        type: action.type,
        payload: action.payload,
        parameters: action.parameters,
      });

      if (!result.success) {
        return {
          success: false,
          error: {
            message: result.error?.message ?? 'Action execution failed',
            code: 'EXECUTION_ERROR',
          },
        };
      }

      // 4. Format result for bot response
      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'INTERNAL_ERROR',
        },
      };
    }
  }

  /**
   * Get action details for the bot
   * Used to prepare action metadata for the message dispatcher
   */
  async getActionForBot(bot: Bot, actionId: number): Promise<Action | null> {
    // Verify action is enabled for this bot
    if (!bot.enabledActions || !bot.enabledActions.includes(actionId)) {
      return null;
    }

    return this.actionService.get(actionId);
  }

  /**
   * List all enabled actions for a bot with metadata
   */
  async listEnabledActions(bot: Bot): Promise<Action[]> {
    if (!bot.enabledActions || bot.enabledActions.length === 0) {
      return [];
    }

    const actions: Action[] = [];
    for (const actionId of bot.enabledActions) {
      const action = await this.actionService.get(actionId);
      if (action && (await this.canExecuteAction(bot, action)).allowed) {
        actions.push(action);
      }
    }

    return actions;
  }
}

// Export factory function for DI
export function createBotActionExecutor(
  actionService: ActionService,
  datasetService: DatasetService,
  coreExecutor: ActionExecutor,
  authorization?: AuthorizationService,
): BotActionExecutor {
  return new BotActionExecutor(actionService, datasetService, coreExecutor, authorization);
}
