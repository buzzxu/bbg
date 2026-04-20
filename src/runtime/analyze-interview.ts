import { unlink } from "node:fs/promises";
import { join } from "node:path";
import type { AnalyzeInterviewQuestionKey, AnalyzeInterviewSummary, AnalyzeKnowledgeGap } from "../analyze/types.js";
import { RuntimeStoreError, readJsonStore, writeJsonStore } from "./store.js";
import { exists } from "../utils/fs.js";
import { pruneAnalyzeQuarantine, quarantineAnalyzeRuntimeStore } from "./analyze-quarantine.js";

export interface AnalyzeInterviewState {
  version: number;
  runId: string;
  updatedAt: string;
  summary: AnalyzeInterviewSummary;
}

export interface AnalyzeInterviewPendingState {
  version: number;
  mode: "guided" | "deep";
  createdAt: string;
  updatedAt: string;
  questions: AnalyzeKnowledgeGap[];
  answers: Partial<Record<AnalyzeInterviewQuestionKey, string>>;
}

const ANALYZE_INTERVIEW_PENDING_PATH = ".bbg/analyze/interview/pending.json";

function getAnalyzeInterviewRunPath(cwd: string, runId: string): string {
  return join(cwd, ".bbg", "analyze", "interview", "runs", `${runId}.json`);
}

function getLatestAnalyzeInterviewPath(cwd: string): string {
  return join(cwd, ".bbg", "analyze", "interview", "latest.json");
}

function getPendingAnalyzeInterviewPath(cwd: string): string {
  return join(cwd, ANALYZE_INTERVIEW_PENDING_PATH);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAnalyzeInterviewState(value: unknown): value is AnalyzeInterviewState {
  return isRecord(value)
    && typeof value.version === "number"
    && typeof value.runId === "string"
    && typeof value.updatedAt === "string"
    && isRecord(value.summary);
}

function isAnalyzeInterviewPendingState(value: unknown): value is AnalyzeInterviewPendingState {
  return isRecord(value)
    && value.version === 1
    && (value.mode === "guided" || value.mode === "deep")
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string"
    && Array.isArray(value.questions)
    && isRecord(value.answers);
}

export async function writeAnalyzeInterviewState(cwd: string, state: AnalyzeInterviewState): Promise<void> {
  await Promise.all([
    writeJsonStore(getAnalyzeInterviewRunPath(cwd, state.runId), state),
    writeJsonStore(getLatestAnalyzeInterviewPath(cwd), state),
  ]);
}

export async function readLatestAnalyzeInterviewState(cwd: string): Promise<AnalyzeInterviewState | null> {
  const pathValue = getLatestAnalyzeInterviewPath(cwd);
  await pruneAnalyzeQuarantine(cwd);
  if (!(await exists(pathValue))) {
    return null;
  }
  try {
    return await readJsonStore<AnalyzeInterviewState>(
      pathValue,
      {
        version: 1,
        runId: "",
        updatedAt: "",
        summary: {
          mode: "off",
          interactive: false,
          asked: 0,
          answered: 0,
          gaps: [],
          assumptionsApplied: [],
          pendingQuestions: [],
          pendingQuestionsPath: null,
          unresolvedGaps: [],
          confidenceBefore: {
            businessGoal: 0,
            criticalFlows: 0,
            systemBoundaries: 0,
            nonNegotiableConstraints: 0,
            failureHotspots: 0,
            decisionHistory: 0,
          },
          confidenceAfter: {
            businessGoal: 0,
            criticalFlows: 0,
            systemBoundaries: 0,
            nonNegotiableConstraints: 0,
            failureHotspots: 0,
            decisionHistory: 0,
          },
          context: {
            businessGoal: null,
            criticalFlows: [],
            systemBoundaries: [],
            nonNegotiableConstraints: [],
            failureHotspots: [],
            decisionHistory: [],
          },
          artifactsUpdated: [],
        },
      },
      isAnalyzeInterviewState,
    );
  } catch (error: unknown) {
    if (error instanceof RuntimeStoreError) {
      await quarantineAnalyzeRuntimeStore(cwd, pathValue);
      return null;
    }
    throw error;
  }
}

export function getAnalyzeInterviewPendingPath(cwd: string): string {
  void cwd;
  return ANALYZE_INTERVIEW_PENDING_PATH;
}

export async function writeAnalyzeInterviewPendingState(
  cwd: string,
  state: AnalyzeInterviewPendingState,
): Promise<void> {
  await writeJsonStore(getPendingAnalyzeInterviewPath(cwd), state);
}

export async function readAnalyzeInterviewPendingState(cwd: string): Promise<AnalyzeInterviewPendingState | null> {
  const pathValue = getPendingAnalyzeInterviewPath(cwd);
  await pruneAnalyzeQuarantine(cwd);
  if (!(await exists(pathValue))) {
    return null;
  }
  try {
    return await readJsonStore<AnalyzeInterviewPendingState>(
      pathValue,
      {
        version: 1,
        mode: "guided",
        createdAt: "",
        updatedAt: "",
        questions: [],
        answers: {},
      },
      isAnalyzeInterviewPendingState,
    );
  } catch (error: unknown) {
    if (error instanceof RuntimeStoreError) {
      await quarantineAnalyzeRuntimeStore(cwd, pathValue);
      return null;
    }
    throw error;
  }
}

export async function clearAnalyzeInterviewPendingState(cwd: string): Promise<void> {
  const pathValue = getPendingAnalyzeInterviewPath(cwd);
  if (!(await exists(pathValue))) {
    return;
  }
  await unlink(pathValue);
}
