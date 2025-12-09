// Shared config loader placeholder.
export interface AIProviderConfig {
  provider: string;
  model: string;
}

export interface AppConfig {
  ai?: AIProviderConfig;
}

export const loadConfig = (): AppConfig => {
  return {};
};
