import { BaseConfig, Context, ExecutionResult } from '../types';

/** Capability exposed by an AI agent */
export interface AgentCapability {
  name: string;
  description: string;
}

/** Configuration for an AI agent */
export interface AgentConfig extends BaseConfig {
  capabilities?: AgentCapability[];
  /** Maximum number of concurrent tasks this agent can handle */
  concurrency?: number;
}

/** Handler invoked when the agent processes a task */
export type AgentTaskHandler = (task: string, context: Context) => Promise<unknown>;

/** An AI agent that can be assigned tasks within a workflow */
export class Agent {
  readonly config: AgentConfig;
  private readonly taskHandler: AgentTaskHandler;
  private activeTasks = 0;

  constructor(config: AgentConfig, taskHandler: AgentTaskHandler) {
    this.config = config;
    this.taskHandler = taskHandler;
  }

  get name(): string {
    return this.config.name;
  }

  get isAvailable(): boolean {
    const maxConcurrency = this.config.concurrency ?? 1;
    return this.activeTasks < maxConcurrency;
  }

  get capabilities(): ReadonlyArray<AgentCapability> {
    return this.config.capabilities ?? [];
  }

  /** Run a task and return an execution result */
  async runTask(task: string, context: Context = {}): Promise<ExecutionResult> {
    const startedAt = new Date();
    this.activeTasks++;

    try {
      const output = await this.taskHandler(task, context);
      const finishedAt = new Date();
      return {
        status: 'success',
        output,
        logs: [
          {
            level: 'info',
            message: `Agent "${this.name}" completed task: ${task}`,
            timestamp: finishedAt,
          },
        ],
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      };
    } catch (err) {
      const finishedAt = new Date();
      const error = err instanceof Error ? err : new Error(String(err));
      return {
        status: 'failed',
        error,
        logs: [
          {
            level: 'error',
            message: `Agent "${this.name}" failed task: ${task} — ${error.message}`,
            timestamp: finishedAt,
          },
        ],
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      };
    } finally {
      this.activeTasks--;
    }
  }
}
