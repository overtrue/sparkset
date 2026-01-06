import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import type { CreateBotDto, UpdateBotDto } from '@/types/api';
import {
  fetchBots,
  fetchBotById,
  createBot,
  updateBot,
  deleteBot,
  regenerateToken,
  fetchBotEvents,
  fetchBotLogs,
} from './bots-api';

// SWR Hooks - only for client components
export function useBots(page = 1, limit = 10, search?: string) {
  return useSWR(
    search
      ? `/bots?page=${page}&limit=${limit}&search=${search}`
      : `/bots?page=${page}&limit=${limit}`,
    () => fetchBots(page, limit, search),
  );
}

export function useBot(id: number | null) {
  return useSWR(id ? `/bots/${id}` : null, () => fetchBotById(id!));
}

export function useBotEvents(botId: number | null, page = 1, limit = 20) {
  return useSWR(botId ? `/bots/${botId}/events?page=${page}&limit=${limit}` : null, () =>
    fetchBotEvents(botId!, page, limit),
  );
}

export function useBotLogs(botId: number | null, page = 1, limit = 20) {
  return useSWR(botId ? `/bots/${botId}/logs?page=${page}&limit=${limit}` : null, () =>
    fetchBotLogs(botId!, page, limit),
  );
}

// Mutations
export function useCreateBot() {
  return useSWRMutation('/bots', async (_, { arg }: { arg: CreateBotDto }) => {
    return createBot(arg);
  });
}

export function useUpdateBot() {
  return useSWRMutation(
    '/bots',
    async (_, { arg }: { arg: { id: number; data: UpdateBotDto } }) => {
      return updateBot(arg.id, arg.data);
    },
  );
}

export function useDeleteBot() {
  return useSWRMutation('/bots', async (_, { arg }: { arg: number }) => {
    return deleteBot(arg);
  });
}

export function useRegenerateToken() {
  return useSWRMutation('/bots', async (_, { arg }: { arg: number }) => {
    return regenerateToken(arg);
  });
}
