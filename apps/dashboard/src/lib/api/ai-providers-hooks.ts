import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import {
  fetchAIProviders,
  fetchAIProviderById,
  createAIProvider,
  updateAIProvider,
  deleteAIProvider,
  setDefaultAIProvider,
  testAIProviderConnection,
  testAIProviderConnectionByConfig,
  CreateAIProviderInput,
} from './ai-providers-api';

// SWR Hooks - only for client components
export function useAIProviders() {
  return useSWR('/ai-providers', fetchAIProviders);
}

export function useAIProvider(id: number | null) {
  return useSWR(id ? `/ai-providers/${id}` : null, () => fetchAIProviderById(id!));
}

// Mutations
export function useCreateAIProvider() {
  return useSWRMutation('/ai-providers', async (_, { arg }: { arg: CreateAIProviderInput }) => {
    return createAIProvider(arg);
  });
}

export function useUpdateAIProvider() {
  return useSWRMutation(
    '/ai-providers',
    async (_, { arg }: { arg: { id: number; data: Partial<CreateAIProviderInput> } }) => {
      return updateAIProvider(arg.id, arg.data);
    },
  );
}

export function useDeleteAIProvider() {
  return useSWRMutation('/ai-providers', async (_, { arg }: { arg: number }) => {
    return deleteAIProvider(arg);
  });
}

export function useSetDefaultAIProvider() {
  return useSWRMutation('/ai-providers/set-default', async (_, { arg }: { arg: number }) => {
    return setDefaultAIProvider(arg);
  });
}

export function useTestAIProviderConnection() {
  return useSWRMutation('/ai-providers/test-connection', async (_, { arg }: { arg: number }) => {
    return testAIProviderConnection(arg);
  });
}

export function useTestAIProviderConnectionByConfig() {
  return useSWRMutation(
    '/ai-providers/test-connection',
    async (_, { arg }: { arg: Omit<CreateAIProviderInput, 'name' | 'isDefault'> }) => {
      return testAIProviderConnectionByConfig(arg);
    },
  );
}
