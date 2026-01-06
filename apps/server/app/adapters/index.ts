import { botAdapterRegistry } from './bot_adapter_registry.js';
import { AdapterType } from '../types/bot_adapter.js';
import { createWeChatWorkAdapter } from './wecom_adapter.js';

/**
 * Initialize and register all available Bot adapters
 * This should be called during application startup
 */
export function registerBotAdapters(): void {
  // Register WeChat Work adapter
  botAdapterRegistry.register(AdapterType.WECOM, (config) => {
    const adapter = createWeChatWorkAdapter(config);
    return adapter;
  });

  // TODO: Phase 2.2 - Register other adapters
  // botAdapterRegistry.register(AdapterType.DISCORD, (config) => {
  //   const adapter = createDiscordAdapter(config);
  //   return adapter;
  // });
  //
  // botAdapterRegistry.register(AdapterType.TELEGRAM, (config) => {
  //   const adapter = createTelegramAdapter(config);
  //   return adapter;
  // });
  //
  // botAdapterRegistry.register(AdapterType.SLACK, (config) => {
  //   const adapter = createSlackAdapter(config);
  //   return adapter;
  // });
}
