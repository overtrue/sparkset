import type { IBotAdapter, AdapterFactory } from '../types/bot_adapter.js';
import { AdapterType } from '../types/bot_adapter.js';

/**
 * Bot 适配器注册表
 * 管理所有平台的 Bot 适配器工厂函数
 */
class BotAdapterRegistry {
  private adapters: Map<AdapterType, AdapterFactory> = new Map<AdapterType, AdapterFactory>();

  /**
   * 注册适配器工厂函数
   */
  register(type: AdapterType, factory: AdapterFactory): void {
    if (this.adapters.has(type)) {
      throw new Error(`Adapter for type '${type}' is already registered`);
    }
    this.adapters.set(type, factory);
  }

  /**
   * 获取适配器工厂函数
   */
  get(type: AdapterType): AdapterFactory | undefined {
    return this.adapters.get(type);
  }

  /**
   * 检查适配器是否已注册
   */
  has(type: AdapterType): boolean {
    return this.adapters.has(type);
  }

  /**
   * 创建适配器实例
   */
  async create(type: AdapterType, config?: unknown): Promise<IBotAdapter> {
    const factory = this.get(type);
    if (!factory) {
      throw new Error(`Adapter for type '${type}' is not registered`);
    }

    const adapter = factory(config);
    if (config) {
      await adapter.init(config);
    }
    return adapter;
  }

  /**
   * 获取所有已注册的适配器类型
   */
  getRegisteredTypes(): AdapterType[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * 清除所有适配器 (用于测试)
   */
  clear(): void {
    this.adapters.clear();
  }
}

// 单例导出
export const botAdapterRegistry = new BotAdapterRegistry();
