const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3333';

export interface QueryRequest {
  question: string;
  datasource?: number;
  action?: number;
  limit?: number;
  aiProvider?: number;
}

export interface QueryResponse {
  sql: string;
  rows: Record<string, unknown>[];
  summary?: string;
}

export async function runQuery(body: QueryRequest): Promise<QueryResponse> {
  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return (await res.json()) as QueryResponse;
}
