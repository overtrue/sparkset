import type {
  AIProviderDTO,
  CreateAIProviderInput,
  TestConnectionResult,
  ApiListResponse,
} from '@/types/api';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/fetch';

// API functions - can be used in both server and client components
export async function fetchAIProviders(): Promise<ApiListResponse<AIProviderDTO>> {
  return apiGet('/ai-providers');
}

export async function fetchAIProviderById(id: number): Promise<AIProviderDTO> {
  return apiGet(`/ai-providers/${id}`);
}

export async function createAIProvider(payload: CreateAIProviderInput): Promise<AIProviderDTO> {
  return apiPost('/ai-providers', payload);
}

export async function updateAIProvider(
  id: number,
  payload: Partial<CreateAIProviderInput>,
): Promise<AIProviderDTO> {
  return apiPut(`/ai-providers/${id}`, payload);
}

export async function deleteAIProvider(id: number): Promise<void> {
  return apiDelete(`/ai-providers/${id}`);
}

export async function setDefaultAIProvider(id: number): Promise<{ success: boolean }> {
  return apiPost(`/ai-providers/${id}/set-default`);
}

export async function testAIProviderConnection(id: number): Promise<TestConnectionResult> {
  return apiPost(`/ai-providers/${id}/test-connection`);
}

export async function testAIProviderConnectionByConfig(
  config: Omit<CreateAIProviderInput, 'name' | 'isDefault'>,
): Promise<TestConnectionResult> {
  return apiPost('/ai-providers/test-connection', config);
}

// Legacy API object for backward compatibility - safe for server components
export const aiProvidersApi = {
  list: fetchAIProviders,
  get: fetchAIProviderById,
  create: createAIProvider,
  update: updateAIProvider,
  delete: deleteAIProvider,
  setDefault: setDefaultAIProvider,
  testConnection: testAIProviderConnection,
  testConnectionByConfig: testAIProviderConnectionByConfig,
};
