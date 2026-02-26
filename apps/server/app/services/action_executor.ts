import { ActionExecutor } from '@sparkset/core';
import type { Action } from '../models/types.js';
import type Bot from '../models/bot.js';
import type BotEvent from '../models/bot_event.js';
import { ActionService } from './action_service.js';
import { DatasetService } from './dataset_service.js';

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
  ) {
    void _datasetService; // Reserved for future use in Phase 2.3
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
      if (action) {
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
): BotActionExecutor {
  return new BotActionExecutor(actionService, datasetService, coreExecutor);
}
