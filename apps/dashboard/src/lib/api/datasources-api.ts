import type {
  Datasource,
  CreateDatasourceDto,
  TestConnectionDto,
  TableSchemaDTO,
  DatasourceDetailDTO,
  ApiListResponse,
  TestConnectionResult,
} from '@/types/api';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/fetch';

// API functions - can be used in both server and client components
export async function fetchDatasources(): Promise<ApiListResponse<Datasource>> {
  return apiGet('/datasources');
}

export async function fetchDatasourceById(id: number): Promise<Datasource> {
  return apiGet(`/datasources/${id}`);
}

// Alias for backward compatibility
export const fetchDatasource = fetchDatasourceById;

export async function createDatasource(data: CreateDatasourceDto): Promise<Datasource> {
  return apiPost('/datasources', data);
}

export async function updateDatasource(
  id: number,
  data: Partial<CreateDatasourceDto>,
): Promise<Datasource> {
  return apiPut(`/datasources/${id}`, data);
}

export async function deleteDatasource(id: number): Promise<void> {
  return apiDelete(`/datasources/${id}`);
}

export async function testConnection(data: TestConnectionDto): Promise<TestConnectionResult> {
  return apiPost('/datasources/test-connection', data);
}

export async function syncDatasource(id: number): Promise<{ success: boolean; message?: string }> {
  return apiPost(`/datasources/${id}/sync`);
}

export async function fetchDatasourceDetail(id: number): Promise<DatasourceDetailDTO> {
  return apiGet(`/datasources/${id}`);
}

export async function fetchSchema(datasourceId: number): Promise<TableSchemaDTO[]> {
  const res = await apiGet<{ tables: TableSchemaDTO[] }>(`/datasources/${datasourceId}/schema`);
  return res.tables ?? [];
}

export async function updateTableMetadata(
  datasourceId: number,
  tableId: number,
  data: { tableComment?: string | null; semanticDescription?: string | null },
): Promise<{ success: boolean }> {
  return apiPut(`/datasources/${datasourceId}/tables/${tableId}`, data);
}

export async function updateColumnMetadata(
  datasourceId: number,
  columnId: number,
  data: { columnComment?: string | null; semanticDescription?: string | null },
): Promise<{ success: boolean }> {
  return apiPut(`/datasources/${datasourceId}/columns/${columnId}`, data);
}

export async function generateSemanticDescriptions(
  datasourceId: number,
): Promise<{ success: boolean }> {
  return apiPost(`/datasources/${datasourceId}/semantic-descriptions`);
}

export async function setDefaultDatasource(id: number): Promise<Datasource> {
  return apiPost(`/datasources/${id}/set-default`);
}

// Legacy API object for backward compatibility - safe for server components
export const datasourcesApi = {
  list: fetchDatasources,
  get: fetchDatasourceById,
  create: createDatasource,
  update: updateDatasource,
  delete: deleteDatasource,
  testConnection,
  sync: syncDatasource,
  setDefault: setDefaultDatasource,
};
