/**
 * Core type definitions for the bbg AI workflow governance toolkit.
 */

/** Execution status of a workflow or step */
export type Status = 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'cancelled';

/** Log level for workflow events */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Key-value context object passed between workflow steps */
export type Context = Record<string, unknown>;

/** A log entry produced during workflow execution */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  metadata?: Context;
}

/** Result returned after executing a step or workflow */
export interface ExecutionResult {
  status: Status;
  output?: unknown;
  error?: Error;
  logs: LogEntry[];
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
}

/** Configuration options shared across components */
export interface BaseConfig {
  name: string;
  description?: string;
  tags?: string[];
  metadata?: Context;
}
