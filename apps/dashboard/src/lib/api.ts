const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3333';

async function request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: hasBody
      ? {
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        }
      : init.headers,
    ...init,
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : undefined;
  if (!res.ok) {
    const message =
      typeof json === 'object' && json && 'message' in (json as any)
        ? (json as any).message
        : `API error ${res.status}`;
    throw new Error(message);
  }
  return json as T;
}

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

export async function fetchDatasources(): Promise<DatasourceDTO[]> {
  const json = await request<{ items: DatasourceDTO[] }>('/datasources', { cache: 'no-store' });
  return json.items ?? [];
}

export type CreateDatasourceInput = Omit<DatasourceDTO, 'id' | 'lastSyncAt'> & { password: string };

export async function createDatasource(payload: CreateDatasourceInput): Promise<DatasourceDTO> {
  return request<DatasourceDTO>('/datasources', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function syncDatasource(id: number): Promise<{ id: number; lastSyncAt?: string }> {
  return request(`/datasources/${id}/sync`, { method: 'POST' });
}

export async function removeDatasource(id: number): Promise<void> {
  await request(`/datasources/${id}`, { method: 'DELETE' });
}

export async function updateDatasource(
  id: number,
  payload: Partial<CreateDatasourceInput>,
): Promise<DatasourceDTO> {
  return request<DatasourceDTO>(`/datasources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  timestamp?: string;
}

export async function testDatasourceConnection(id: number): Promise<TestConnectionResult> {
  return request<TestConnectionResult>(`/datasources/${id}/test-connection`, {
    method: 'POST',
  });
}

export async function testConnectionByConfig(
  config: Omit<CreateDatasourceInput, 'name' | 'isDefault'>,
): Promise<TestConnectionResult> {
  return request<TestConnectionResult>(`/datasources/test-connection`, {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function testDatasourceConnectionWithPassword(
  id: number,
  password: string,
): Promise<TestConnectionResult> {
  return request<TestConnectionResult>(`/datasources/${id}/test-connection`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function setDefaultDatasource(id: number): Promise<{ success: boolean }> {
  return request(`/datasources/${id}/set-default`, { method: 'POST' });
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

export interface DatasourceDetailDTO extends DatasourceDTO {
  tables: TableSchemaDTO[];
}

export async function fetchSchema(datasourceId: number): Promise<TableSchemaDTO[]> {
  const res = await request<{ tables: TableSchemaDTO[] }>(`/datasources/${datasourceId}/schema`, {
    cache: 'no-store',
  });
  return res.tables ?? [];
}

export async function fetchDatasourceDetail(id: number): Promise<DatasourceDetailDTO> {
  return request<DatasourceDetailDTO>(`/datasources/${id}`, { cache: 'no-store' });
}

export async function updateTableMetadata(
  datasourceId: number,
  tableId: number,
  data: { tableComment?: string | null; semanticDescription?: string | null },
): Promise<{ success: boolean }> {
  return request(`/datasources/${datasourceId}/tables/${tableId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateColumnMetadata(
  datasourceId: number,
  columnId: number,
  data: { columnComment?: string | null; semanticDescription?: string | null },
): Promise<{ success: boolean }> {
  return request(`/datasources/${datasourceId}/columns/${columnId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function generateSemanticDescriptions(
  datasourceId: number,
): Promise<{ success: boolean }> {
  return request(`/datasources/${datasourceId}/semantic-descriptions`, { method: 'POST' });
}

// Actions
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

export async function fetchActions(): Promise<ActionDTO[]> {
  const res = await request<{ items: ActionDTO[] }>('/actions', { cache: 'no-store' });
  return res.items ?? [];
}

export async function executeAction(id: number, parameters?: unknown) {
  return request(`/actions/${id}/execute`, {
    method: 'POST',
    body: parameters ? JSON.stringify({ parameters }) : undefined,
  });
}

export type CreateActionInput = {
  name: string;
  description?: string;
  type: string;
  payload: unknown;
  parameters?: unknown;
  inputSchema?: ActionInputSchema;
};

export type UpdateActionInput = Partial<CreateActionInput> & {
  id: number;
};

export async function createAction(payload: CreateActionInput): Promise<ActionDTO> {
  return request<ActionDTO>('/actions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAction(payload: UpdateActionInput): Promise<ActionDTO> {
  const { id, ...data } = payload;
  return request<ActionDTO>(`/actions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAction(id: number): Promise<void> {
  await request(`/actions/${id}`, { method: 'DELETE' });
}

export async function getAction(id: number): Promise<ActionDTO> {
  return request<ActionDTO>(`/actions/${id}`, { cache: 'no-store' });
}

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

export async function generateActionSQL(
  input: GenerateActionSQLInput,
): Promise<GenerateActionSQLResult> {
  return request<GenerateActionSQLResult>('/actions/generate-sql', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// AI Providers
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

export async function fetchAIProviders(): Promise<AIProviderDTO[]> {
  const json = await request<{ items: AIProviderDTO[] }>('/ai-providers', { cache: 'no-store' });
  return json.items ?? [];
}

export async function createAIProvider(payload: CreateAIProviderInput): Promise<AIProviderDTO> {
  return request<AIProviderDTO>('/ai-providers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAIProvider(
  id: number,
  payload: Partial<CreateAIProviderInput>,
): Promise<AIProviderDTO> {
  return request<AIProviderDTO>(`/ai-providers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function removeAIProvider(id: number): Promise<void> {
  await request(`/ai-providers/${id}`, { method: 'DELETE' });
}

export async function setDefaultAIProvider(id: number): Promise<{ success: boolean }> {
  return request(`/ai-providers/${id}/set-default`, { method: 'POST' });
}

export async function testAIProviderConnection(id: number): Promise<TestConnectionResult> {
  return request<TestConnectionResult>(`/ai-providers/${id}/test-connection`, {
    method: 'POST',
  });
}

export async function testAIProviderConnectionByConfig(
  config: Omit<CreateAIProviderInput, 'name' | 'isDefault'>,
): Promise<TestConnectionResult> {
  return request<TestConnectionResult>(`/ai-providers/test-connection`, {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

// Conversations
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

export async function fetchConversations(): Promise<ConversationDTO[]> {
  const res = await request<{ items: ConversationDTO[] }>('/conversations', { cache: 'no-store' });
  return res.items ?? [];
}

export async function fetchConversation(id: number): Promise<ConversationDetailDTO> {
  return request<ConversationDetailDTO>(`/conversations/${id}`, { cache: 'no-store' });
}
