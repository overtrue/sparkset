// AI provider abstraction around Vercel AI SDK (placeholder).
export interface ModelCallOptions {
  model?: string;
  provider?: string;
  prompt: string;
}

export interface AIClient {
  generateSQL: (options: ModelCallOptions) => Promise<string>;
}

export class StubAIClient implements AIClient {
  async generateSQL(options: ModelCallOptions): Promise<string> {
    return `-- generated SQL for prompt: ${options.prompt}`;
  }
}
