import type { Dataset, CreateDatasetDto, ResultSet, ApiListResponse } from '@/types/api';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/fetch';

// API functions - can be used in both server and client components
export async function fetchDatasets(): Promise<ApiListResponse<Dataset>> {
  return apiGet('/api/datasets');
}

export async function fetchDatasetById(id: number): Promise<Dataset> {
  return apiGet(`/api/datasets/${id}`);
}

export async function createDataset(data: CreateDatasetDto): Promise<Dataset> {
  return apiPost('/api/datasets', data);
}

export async function updateDataset(id: number, data: Partial<CreateDatasetDto>): Promise<Dataset> {
  return apiPut(`/api/datasets/${id}`, data);
}

export async function deleteDataset(id: number): Promise<void> {
  return apiDelete(`/api/datasets/${id}`);
}

export async function previewDataset(
  id: number,
  params?: Record<string, unknown>,
): Promise<ResultSet> {
  return apiPost(`/api/datasets/${id}/preview`, { params });
}
