import { BaseConfig, Context, ExecutionResult, LogEntry, Status } from '../types';

/** Configuration for a single workflow step */
export interface StepConfig extends BaseConfig {
  /** Optional timeout in milliseconds */
  timeout?: number;
  /** Whether to continue workflow execution if this step fails */
  continueOnError?: boolean;
}

/** The handler function executed for a step */
export type StepHandler = (context: Context, logs: LogEntry[]) => Promise<unknown>;

/** A single unit of work within a workflow */
export class Step {
  readonly config: StepConfig;
  private readonly handler: StepHandler;
  private _status: Status = 'pending';

  constructor(config: StepConfig, handler: StepHandler) {
    this.config = config;
    this.handler = handler;
  }

  get status(): Status {
    return this._status;
  }

  get name(): string {
    return this.config.name;
  }

  async execute(context: Context): Promise<ExecutionResult> {
    const logs: LogEntry[] = [];
    const startedAt = new Date();
    this._status = 'running';

    const addLog = (level: LogEntry['level'], message: string, metadata?: Context): void => {
      logs.push({ level, message, timestamp: new Date(), metadata });
    };

    addLog('info', `Step "${this.config.name}" started`);

    try {
      const timeoutMs = this.config.timeout;
      let outputPromise = this.handler(context, logs);

      if (timeoutMs !== undefined) {
        outputPromise = Promise.race([
          outputPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Step "${this.config.name}" timed out after ${timeoutMs}ms`)), timeoutMs)
          ),
        ]);
      }

      const output = await outputPromise;
      const finishedAt = new Date();
      this._status = 'success';
      addLog('info', `Step "${this.config.name}" completed successfully`);

      return {
        status: 'success',
        output,
        logs,
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      };
    } catch (err) {
      const finishedAt = new Date();
      const error = err instanceof Error ? err : new Error(String(err));
      this._status = 'failed';
      addLog('error', `Step "${this.config.name}" failed: ${error.message}`);

      return {
        status: 'failed',
        error,
        logs,
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      };
    }
  }

  reset(): void {
    this._status = 'pending';
  }
}
