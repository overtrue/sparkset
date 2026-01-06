/**
 * Unified API Type Definitions
 * All API-related types are centralized here for consistency and maintainability
 *
 * This file consolidates types from:
 * - lib/api.ts (legacy)
 * - types/chart.ts
 * - types/dashboard.ts
 * - lib/auth.ts
 * - lib/query.ts
 * - Various API modules
 */

// ============================================================================
// Common Types
// ============================================================================

export interface TestConnectionResult {
  success: boolean;
  message: string;
  timestamp?: string;
}

export interface ApiListResponse<T> {
  items: T[];
  pagination?: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
  };
}

export interface ApiListResponseWithTotal<T> extends ApiListResponse<T> {
  total: number;
}

// ============================================================================
// Datasource Types
// ============================================================================

export interface Datasource {
  id: number;
  name: string;
  type: 'mysql' | 'postgres' | 'sqlite' | 'mariadb';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  isDefault: boolean;
  lastSyncAt: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
}

export interface CreateDatasourceDto {
  name: string;
  type: 'mysql' | 'postgres' | 'sqlite' | 'mariadb';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  description?: string;
}

export interface TestConnectionDto {
  type: 'mysql' | 'postgres' | 'sqlite' | 'mariadb';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface TableColumnDTO {
  id?: number;
  name: string;
  type: string;
  comment?: string;
  semanticDescription?: string;
}

export interface TableSchemaDTO {
  id: number;
  tableName: string;
  tableComment?: string;
  semanticDescription?: string;
  columns: TableColumnDTO[];
}

export interface DatasourceDetailDTO extends Datasource {
  tables: TableSchemaDTO[];
}

// Legacy types from api.ts (for backward compatibility)
export interface DatasourceDTO {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  database: string;
  isDefault: boolean;
  lastSyncAt?: string;
}

export type CreateDatasourceInput = Omit<DatasourceDTO, 'id' | 'lastSyncAt'> & {
  password: string;
};

// ============================================================================
// Dataset Types
// ============================================================================

export interface Dataset {
  id: number;
  datasourceId: number;
  datasourceName: string;
  name: string;
  description?: string;
  querySql: string;
  schemaJson: { name: string; type: string }[];
  schemaHash: string;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDatasetDto {
  datasourceId: number;
  name: string;
  description?: string;
  querySql: string;
  schemaJson: { name: string; type: string }[];
}

export interface ResultSet {
  schema: {
    columns: { name: string; type: string }[];
  };
  rows: Record<string, unknown>[];
  rowCount: number;
}

// ============================================================================
// Chart Types
// ============================================================================

// Extended chart types with radar and radial support
export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'radar' | 'radial' | 'table';

// Chart variant types
export type ChartVariant =
  | 'area-default'
  | 'area-linear'
  | 'area-step'
  | 'area-stacked'
  | 'area-gradient'
  | 'bar-default'
  | 'bar-horizontal'
  | 'bar-stacked'
  | 'bar-grouped'
  | 'bar-negative'
  | 'line-default'
  | 'line-linear'
  | 'line-step'
  | 'line-dots'
  | 'line-multiple'
  | 'pie-default'
  | 'pie-donut'
  | 'pie-donut-text'
  | 'pie-label'
  | 'pie-legend'
  | 'radar-default'
  | 'radar-dots'
  | 'radar-grid-circle'
  | 'radar-grid-filled'
  | 'radar-multiple'
  | 'radial-default'
  | 'radial-label'
  | 'radial-grid'
  | 'radial-text'
  | 'radial-stacked'
  | 'table-default';

export interface Chart {
  id: number;
  datasetId: number;
  title: string;
  description?: string;
  chartType: ChartType;
  specJson: ChartSpec;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChartStyleConfig {
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  stacked?: boolean;
  smooth?: boolean;
  aspectRatio?: number;
  curveType?: 'monotone' | 'linear' | 'step' | 'natural';
  showDots?: boolean;
  gradient?: boolean;
  horizontal?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  paddingAngle?: number;
  showLabels?: boolean;
  gridType?: 'polygon' | 'circle';
  fillOpacity?: number;
}

export interface ChartSpec {
  specVersion: '1.0';
  chartType: ChartType;
  variant?: ChartVariant;
  encoding: {
    x?: { field: string; type: string; label?: string };
    y?: {
      field: string;
      type: 'quantitative';
      agg: 'sum' | 'avg' | 'min' | 'max' | 'count';
      label?: string;
      color?: string;
    }[];
    series?: { field: string; type: string };
    category?: { field: string; label?: string };
    value?: { field: string; label?: string };
  };
  transform?: { op: string; [key: string]: unknown }[];
  style?: ChartStyleConfig;
  rechartsOverrides?: Record<string, unknown>;
}

export interface ChartRenderResult {
  chartType: ChartType;
  variant?: ChartVariant;
  data: unknown[];
  config: Record<string, { label: string; color?: string }>;
  rechartsProps: Record<string, unknown>;
  style?: ChartStyleConfig;
  warnings?: string[];
}

export type ChartConfig = Record<
  string,
  {
    label: string;
    color?: string;
    theme?: { light: string; dark: string };
  }
>;

export interface CreateChartDto {
  datasetId: number;
  title: string;
  description?: string;
  chartType: ChartType;
  spec: ChartSpec;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface Dashboard {
  id: number;
  title: string;
  description: string | null;
  ownerId: number | null;
  createdAt: string;
  updatedAt: string;
}

export type WidgetType = 'chart' | 'dataset' | 'text';

export interface DashboardWidget {
  id: number;
  dashboardId: number;
  title: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config: ChartWidgetConfig | DatasetWidgetConfig | TextWidgetConfig;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChartWidgetConfig {
  chartId: number;
}

export interface DatasetWidgetConfig {
  datasetId: number;
  maxRows?: number;
}

export interface TextWidgetConfig {
  content: string;
}

export interface WidgetLayout {
  i: string; // widget id
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CreateDashboardDto {
  title: string;
  description?: string;
}

export interface CreateWidgetDto {
  title: string;
  type: 'chart' | 'dataset' | 'text';
  x: number;
  y: number;
  w: number;
  h: number;
  config: ChartWidgetConfig | DatasetWidgetConfig | TextWidgetConfig;
  order?: number;
}

export interface UpdateLayoutDto {
  layouts: {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
  }[];
}

// ============================================================================
// Action Types
// ============================================================================

export interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: unknown;
  description?: string;
  label?: string;
}

export interface ActionInputSchema {
  parameters: ParameterDefinition[];
}

export interface ActionDTO {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  payload: unknown;
  parameters?: unknown;
  inputSchema?: ActionInputSchema | null;
  updatedAt?: string;
  createdAt?: string;
}

export interface CreateActionInput {
  name: string;
  description?: string;
  type: string;
  payload: unknown;
  parameters?: unknown;
  inputSchema?: ActionInputSchema;
}

export type UpdateActionInput = Partial<CreateActionInput> & {
  id: number;
};

export interface GenerateActionSQLInput {
  name: string;
  description: string;
  datasourceId: number;
  aiProviderId?: number;
}

export interface GenerateActionSQLResult {
  sql: string;
  inputSchema: ActionInputSchema;
}

// ============================================================================
// AI Provider Types
// ============================================================================

export interface AIProviderDTO {
  id: number;
  name: string;
  type: string;
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateAIProviderInput = Omit<AIProviderDTO, 'id' | 'createdAt' | 'updatedAt'> & {
  apiKey?: string;
};

// ============================================================================
// Conversation Types
// ============================================================================

export interface ConversationDTO {
  id: number;
  userId?: number | null;
  title?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDTO {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: unknown;
  createdAt: string;
}

export interface ConversationDetailDTO extends ConversationDTO {
  messages: MessageDTO[];
}

// ============================================================================
// Query Types
// ============================================================================

export interface QueryRequest {
  question: string;
  datasource?: number;
  action?: number;
  limit?: number;
  aiProvider?: number;
}

export interface QueryResponse {
  sql: string;
  rows: Record<string, unknown>[];
  summary?: string;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface AuthUser {
  id: number;
  uid: string;
  provider: 'header' | 'oidc' | 'local' | 'system';
  username: string;
  email: string | null;
  displayName: string | null;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  authenticated: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  displayName?: string;
}

// ============================================================================
// Bot Types
// ============================================================================

export type BotPlatform = 'wecom' | 'discord' | 'slack' | 'telegram' | 'custom';

export interface Bot {
  id: number;
  name: string;
  description?: string;
  type: BotPlatform;
  webhookToken: string;
  webhookUrl: string;
  enabledActions: number[];
  enableQuery: boolean;
  aiProviderId?: number;
  aiProvider?: AIProviderDTO;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBotDto {
  name: string;
  description?: string;
  type: BotPlatform;
  webhookUrl: string;
  enabledActions?: number[];
  enableQuery?: boolean;
  aiProviderId?: number;
  adapterConfig?: unknown;
  rateLimit?: number;
  maxRetries?: number;
  requestTimeout?: number;
}

export interface UpdateBotDto {
  name?: string;
  description?: string;
  enabledActions?: number[];
  enableQuery?: boolean;
  aiProviderId?: number;
  adapterConfig?: unknown;
  isActive?: boolean;
  isVerified?: boolean;
  rateLimit?: number;
  maxRetries?: number;
  requestTimeout?: number;
}

export interface BotEvent {
  id: number;
  botId: number;
  externalEventId: string;
  externalUserId: string;
  externalUserName?: string;
  content: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  internalUserId?: number;
  actionResult?: Record<string, unknown>;
  errorMessage?: string;
  processingTimeMs?: number;
  retryCount?: number;
  platformDetails?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BotLog {
  id: number;
  botId: number;
  eventId?: number;
  action: string;
  performedBy?: number;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
