import { apiDelete, apiGet, apiPut } from '@/lib/fetch';
import type {
  DatasourceGrantDTO,
  DatasourceGrantsResponse,
  DatasourceGrantSubjectsResponse,
  GrantSubjectType,
  UpsertDatasourceGrantDto,
} from '@/types/api';

export async function fetchDatasourceGrants(
  datasourceId: number,
): Promise<DatasourceGrantsResponse> {
  return apiGet<DatasourceGrantsResponse>(`/datasources/${datasourceId}/grants`);
}

export async function fetchDatasourceGrantSubjects(
  datasourceId: number,
): Promise<DatasourceGrantSubjectsResponse> {
  return apiGet<DatasourceGrantSubjectsResponse>(`/datasources/${datasourceId}/grant-subjects`);
}

export async function upsertDatasourceGrant(
  datasourceId: number,
  data: UpsertDatasourceGrantDto,
): Promise<DatasourceGrantDTO> {
  return apiPut<DatasourceGrantDTO>(`/datasources/${datasourceId}/grants`, data);
}

export async function deleteDatasourceGrant(
  datasourceId: number,
  subjectType: GrantSubjectType,
  subjectId: string,
): Promise<void> {
  await apiDelete(
    `/datasources/${datasourceId}/grants/${encodeURIComponent(subjectType)}/${encodeURIComponent(
      subjectId,
    )}`,
  );
}
