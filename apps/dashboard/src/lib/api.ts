const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3333';

async function request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
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

export interface TableColumnDTO {
  name: string;
  type: string;
  comment?: string;
}

export interface TableSchemaDTO {
  tableName: string;
  columns: TableColumnDTO[];
}

export async function fetchSchema(datasourceId: number): Promise<TableSchemaDTO[]> {
  const res = await request<{ tables: TableSchemaDTO[] }>(`/datasources/${datasourceId}/schema`, {
    cache: 'no-store',
  });
  return res.tables ?? [];
}
