import { BaseConfig, Context, ExecutionResult, Status } from '../types';
import { Step } from './Step';

/** Configuration for a workflow */
export interface WorkflowConfig extends BaseConfig {
  /** Whether to stop workflow execution on the first failed step */
  stopOnError?: boolean;
}

/** Result of running an entire workflow */
export interface WorkflowResult {
  status: Status;
  stepResults: Map<string, ExecutionResult>;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
}

/** An ordered sequence of steps that constitute an AI automation workflow */
export class Workflow {
  readonly config: WorkflowConfig;
  private readonly steps: Step[] = [];

  constructor(config: WorkflowConfig) {
    this.config = config;
  }

  get name(): string {
    return this.config.name;
  }

  /** Add a step to the end of the workflow */
  addStep(step: Step): this {
    this.steps.push(step);
    return this;
  }

  /** Return a read-only copy of the registered steps */
  getSteps(): ReadonlyArray<Step> {
    return this.steps;
  }

  /** Execute all steps in order, sharing a mutable context object */
  async run(initialContext: Context = {}): Promise<WorkflowResult> {
    const context: Context = { ...initialContext };
    const stepResults = new Map<string, ExecutionResult>();
    const startedAt = new Date();
    let workflowStatus: Status = 'success';
    const stopOnError = this.config.stopOnError ?? true;

    for (const step of this.steps) {
      const result = await step.execute(context);
      stepResults.set(step.name, result);

      if (result.status === 'success' && result.output !== undefined) {
        context[step.name] = result.output;
      }

      if (result.status === 'failed') {
        workflowStatus = 'failed';
        if (stopOnError && !step.config.continueOnError) {
          // Mark remaining steps as skipped
          const remaining = this.steps.slice(this.steps.indexOf(step) + 1);
          for (const skipped of remaining) {
            const skippedAt = new Date();
            stepResults.set(skipped.name, {
              status: 'skipped',
              logs: [],
              startedAt: skippedAt,
              finishedAt: skippedAt,
              durationMs: 0,
            });
          }
          break;
        }
      }
    }

    const finishedAt = new Date();
    return {
      status: workflowStatus,
      stepResults,
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    };
  }
}
