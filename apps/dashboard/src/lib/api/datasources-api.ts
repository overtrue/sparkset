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

const normalizeDatasource = <T extends Datasource>(datasource: T): T => ({
  ...datasource,
  isDefault: Number(datasource.isDefault) === 1,
});

// API functions - can be used in both server and client components
export async function fetchDatasources(): Promise<ApiListResponse<Datasource>> {
  const response = await apiGet<ApiListResponse<Datasource>>('/datasources');
  return {
    ...response,
    items: response.items?.map(normalizeDatasource) ?? [],
  };
}

export async function fetchDatasourceById(id: number): Promise<Datasource> {
  const datasource = await apiGet<Datasource>(`/datasources/${id}`);
  return normalizeDatasource(datasource);
}

export async function createDatasource(data: CreateDatasourceDto): Promise<Datasource> {
  const datasource = await apiPost<Datasource>('/datasources', data);
  return normalizeDatasource(datasource);
}

export async function updateDatasource(
  id: number,
  data: Partial<CreateDatasourceDto>,
): Promise<Datasource> {
  const datasource = await apiPut<Datasource>(`/datasources/${id}`, data);
  return normalizeDatasource(datasource);
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
  const datasource = await apiGet<DatasourceDetailDTO>(`/datasources/${id}`);
  return normalizeDatasource(datasource);
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
  const datasource = await apiPost<Datasource>(`/datasources/${id}/set-default`);
  return normalizeDatasource(datasource);
}
