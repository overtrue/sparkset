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
  isDefault: number;
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

export interface Chart {
  id: number;
  datasetId: number;
  title: string;
  description?: string;
  chartType: 'line' | 'bar' | 'area' | 'pie' | 'table';
  specJson: ChartSpec;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChartSpec {
  specVersion: '1.0';
  chartType: 'line' | 'bar' | 'area' | 'pie' | 'table';
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
  };
  transform?: { op: string; [key: string]: unknown }[];
  style?: {
    showLegend?: boolean;
    showTooltip?: boolean;
    showGrid?: boolean;
    stacked?: boolean;
    smooth?: boolean;
    aspectRatio?: number;
  };
  rechartsOverrides?: Record<string, unknown>;
}

export interface ChartRenderResult {
  chartType: ChartSpec['chartType'];
  data: unknown[];
  config: Record<string, { label: string; color?: string }>;
  rechartsProps: Record<string, unknown>;
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
  chartType: ChartSpec['chartType'];
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
