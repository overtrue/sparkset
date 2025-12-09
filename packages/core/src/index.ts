// Core orchestrates action execution and dispatch to concrete tools.
export type ActionType = 'sql' | 'api' | 'file' | string;

export interface ActionContext {
  id: number;
  type: ActionType;
  payload: unknown;
  parameters?: unknown;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface ActionHandler {
  type: ActionType;
  execute: (ctx: ActionContext) => Promise<ActionResult>;
}

export class ActionRegistry {
  private handlers = new Map<ActionType, ActionHandler>();

  register(handler: ActionHandler) {
    this.handlers.set(handler.type, handler);
  }

  get(type: ActionType) {
    return this.handlers.get(type);
  }
}

export class ActionExecutor {
  constructor(private registry: ActionRegistry) {}

  async run(ctx: ActionContext): Promise<ActionResult> {
    const handler = this.registry.get(ctx.type);
    if (!handler) {
      return { success: false, error: new Error(`No handler for type ${ctx.type}`) };
    }
    return handler.execute(ctx);
  }
}
