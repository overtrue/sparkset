/**
 * Bot adapter interfaces and types
 * 支持多平台 Webhook 集成 (企业微信, Discord, Telegram, Slack 等)
 */

/**
 * 解析后的消息对象
 */
export interface ParsedMessage {
  // 外部用户标识
  externalUserId: string;
  externalUserName?: string;

  // 消息内容
  text: string;
  messageType: 'text' | 'image' | 'file' | 'rich';
  messageId?: string;

  // 原始负载 (用于后续处理)
  rawPayload: unknown;
}

/**
 * 富文本消息结构 (用于回复)
 */
export interface RichMessage {
  type: 'text' | 'markdown' | 'card' | 'json';
  content: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Bot 适配器接口
 * 每个平台实现此接口来处理 Webhook 消息
 */
export interface IBotAdapter {
  /**
   * 初始化适配器
   * @param config 平台特定的配置对象
   */
  init(config: unknown): Promise<void>;

  /**
   * 验证 Webhook 签名 (安全性)
   * @param payload 请求负载
   * @param signature 签名值
   * @param timestamp 时间戳
   */
  verifySignature(payload: unknown, signature: string, timestamp: string): boolean;

  /**
   * 处理 Webhook 挑战 (某些平台需要验证端点)
   * 例如：企业微信首次 Webhook 验证
   * @param payload 请求负载
   * @returns 如果是挑战请求,返回响应文本,否则返回 null
   */
  handleChallenge?(payload: unknown): string | null;

  /**
   * 解析消息负载为统一格式
   * @param payload 原始 Webhook 负载
   * @returns 解析后的消息,如果无法解析返回 null
   */
  parseMessage(payload: unknown): ParsedMessage | null;

  /**
   * 发送文本回复
   * @param externalUserId 外部用户标识
   * @param text 回复文本
   */
  sendReply(externalUserId: string, text: string): Promise<void>;

  /**
   * 发送富文本消息 (卡片, markdown 等)
   * @param externalUserId 外部用户标识
   * @param message 富文本消息对象
   */
  sendRichMessage(externalUserId: string, message: RichMessage): Promise<void>;

  /**
   * 发送错误消息
   * @param externalUserId 外部用户标识
   * @param error 错误信息
   */
  sendError(externalUserId: string, error: string | Error): Promise<void>;
}

/**
 * 适配器类型枚举
 */
export enum AdapterType {
  WECOM = 'wecom',
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  SLACK = 'slack',
  CUSTOM = 'custom',
}

/**
 * 适配器工厂函数类型
 */
export type AdapterFactory = (config?: unknown) => IBotAdapter;

/**
 * 适配器注册配置
 */
export interface AdapterRegistry {
  register(type: AdapterType, factory: AdapterFactory): void;
  get(type: AdapterType): AdapterFactory | undefined;
  has(type: AdapterType): boolean;
}
