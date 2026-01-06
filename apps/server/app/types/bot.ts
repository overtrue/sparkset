/**
 * Bot system types and interfaces
 */

/**
 * Bot 创建请求数据
 */
export interface CreateBotRequest {
  name: string;
  description?: string;
  type: 'wecom' | 'discord' | 'telegram' | 'slack' | 'custom';
  webhookUrl: string;
  adapterConfig?: unknown;
  enabledActions?: number[];
  enabledDataSources?: number[];
  defaultDataSourceId?: number;
  aiProviderId?: number;
  enableQuery?: boolean;
  rateLimit?: number;
  maxRetries?: number;
  requestTimeout?: number;
}

/**
 * Bot 更新请求数据
 */
export interface UpdateBotRequest {
  name?: string;
  description?: string;
  adapterConfig?: unknown;
  enabledActions?: number[];
  enabledDataSources?: number[];
  defaultDataSourceId?: number;
  aiProviderId?: number;
  enableQuery?: boolean;
  isActive?: boolean;
  isVerified?: boolean;
  rateLimit?: number;
  maxRetries?: number;
  requestTimeout?: number;
}

/**
 * Bot 响应数据 (列表/详情)
 */
export interface BotResponse {
  id: number;
  name: string;
  description: string | null;
  type: 'wecom' | 'discord' | 'telegram' | 'slack' | 'custom';
  webhookUrl: string;
  webhookToken: string;
  adapterConfig: Record<string, unknown> | null;
  enabledActions: number[];
  enabledDataSources: number[];
  defaultDataSourceId: number | null;
  aiProviderId: number | null;
  enableQuery: boolean;
  isActive: boolean;
  isVerified: boolean;
  rateLimit: number | null;
  maxRetries: number;
  requestTimeout: number;
  creatorId: number | null;
  updaterId: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 分页列表响应
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  };
}

/**
 * API 错误响应
 */
export interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}
