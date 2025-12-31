import type { Datasource } from '@/types/chart';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/fetch';

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

// API functions - can be used in both server and client components
export async function fetchDatasources(): Promise<{ items: Datasource[] }> {
  return apiGet('/datasources');
}

export async function fetchDatasource(id: number): Promise<Datasource> {
  return apiGet(`/datasources/${id}`);
}

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

export async function testConnection(
  data: TestConnectionDto,
): Promise<{ success: boolean; message?: string }> {
  return apiPost('/datasources/test-connection', data);
}

export async function syncDatasource(id: number): Promise<{ success: boolean; message?: string }> {
  return apiPost(`/datasources/${id}/sync`);
}

export async function setDefaultDatasource(id: number): Promise<Datasource> {
  return apiPost(`/datasources/${id}/set-default`);
}

// Legacy API object for backward compatibility - safe for server components
export const datasourcesApi = {
  list: fetchDatasources,
  get: fetchDatasource,
  create: createDatasource,
  update: updateDatasource,
  delete: deleteDatasource,
  testConnection,
  sync: syncDatasource,
  setDefault: setDefaultDatasource,
};
