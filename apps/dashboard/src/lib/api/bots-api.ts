import type {
  Bot,
  CreateBotDto,
  UpdateBotDto,
  BotEvent,
  BotLog,
  ApiListResponse,
} from '@/types/api';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/fetch';

// Bot CRUD Operations
export async function fetchBots(
  page = 1,
  limit = 10,
  search?: string,
): Promise<ApiListResponse<Bot>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (search) {
    params.append('search', search);
  }

  return apiGet(`/bots?${params.toString()}`);
}

export async function fetchBotById(id: number): Promise<Bot> {
  return apiGet(`/bots/${id}`);
}

export async function createBot(data: CreateBotDto): Promise<Bot> {
  return apiPost('/bots', data);
}

export async function updateBot(id: number, data: UpdateBotDto): Promise<Bot> {
  return apiPut(`/bots/${id}`, data);
}

export async function deleteBot(id: number): Promise<void> {
  return apiDelete(`/bots/${id}`);
}

export async function regenerateToken(id: number): Promise<{ token: string }> {
  return apiPost(`/bots/${id}/regenerate-token`, {});
}

// Bot Events
export async function fetchBotEvents(
  botId: number,
  page = 1,
  limit = 20,
  status?: string,
): Promise<ApiListResponse<BotEvent>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (status) {
    params.append('status', status);
  }

  return apiGet(`/bots/${botId}/events?${params.toString()}`);
}

// Bot Logs
export async function fetchBotLogs(
  botId: number,
  page = 1,
  limit = 20,
  action?: string,
): Promise<ApiListResponse<BotLog>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (action) {
    params.append('action', action);
  }

  return apiGet(`/bots/${botId}/logs?${params.toString()}`);
}
