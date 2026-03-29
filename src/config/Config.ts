/** Supported AI provider identifiers */
export type AIProvider = 'openai' | 'anthropic' | 'azure-openai' | 'custom';

/** Configuration for connecting to an AI provider */
export interface ProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/** Global configuration for the bbg workflow engine */
export interface BbgConfig {
  /** Human-readable project name */
  projectName: string;
  /** Current environment */
  environment?: 'development' | 'staging' | 'production';
  /** Default AI provider configuration */
  defaultProvider?: ProviderConfig;
  /** Logging verbosity */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Additional arbitrary settings */
  settings?: Record<string, unknown>;
}

/** Configuration manager for the bbg toolkit */
export class Config {
  private data: BbgConfig;

  constructor(initial: BbgConfig) {
    this.data = { ...initial };
  }

  /** Return the current configuration snapshot */
  get(): Readonly<BbgConfig> {
    return this.data;
  }

  /** Merge partial updates into the current configuration */
  update(partial: Partial<BbgConfig>): void {
    this.data = { ...this.data, ...partial };
  }

  /** Retrieve a typed value from the settings bag */
  getSetting<T>(key: string): T | undefined {
    return this.data.settings?.[key] as T | undefined;
  }

  /** Store a value in the settings bag */
  setSetting(key: string, value: unknown): void {
    if (!this.data.settings) {
      this.data.settings = {};
    }
    this.data.settings[key] = value;
  }
}
