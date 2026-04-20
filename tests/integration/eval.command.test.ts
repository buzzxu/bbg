import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runEvalCommand } from "../../src/commands/eval.js";

const execaState = vi.hoisted(() => ({
  execa: vi.fn(),
}));

vi.mock("execa", () => ({
  execa: execaState.execa,
}));

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-eval-command-"));
  tempDirs.push(dir);
  return dir;
}

describe("eval command", () => {
  beforeEach(() => {
    delete process.env.BBG_CURRENT_TOOL;
    delete process.env.CODEX_THREAD_ID;
    delete process.env.CODEX_CI;
    delete process.env.CODEX_MANAGED_BY_NPM;
    delete process.env.CODEX_SANDBOX;
    delete process.env.CODEX_SANDBOX_NETWORK_DISABLED;

    execaState.execa.mockReset();
    execaState.execa.mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 });
  });

  afterEach(async () => {
    delete process.env.BBG_CURRENT_TOOL;
    delete process.env.CODEX_THREAD_ID;
    delete process.env.CODEX_CI;
    delete process.env.CODEX_MANAGED_BY_NPM;
    delete process.env.CODEX_SANDBOX;
    delete process.env.CODEX_SANDBOX_NETWORK_DISABLED;
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("seeds starter eval artifacts", async () => {
    const cwd = await makeTempDir();

    const result = await runEvalCommand({
      cwd,
      mode: "seed",
    });

    expect(result).toEqual({
      mode: "seed",
      datasetFile: "evals/starter.dataset.json",
      experimentFile: "evals/starter.experiment.json",
      taskflowDatasetFile: "evals/taskflow.dataset.json",
      taskflowExperimentFile: "evals/taskflow.experiment.json",
      recoveryTaskflowDatasetFile: "evals/recovery.taskflow.dataset.json",
      recoveryTaskflowExperimentFile: "evals/recovery.taskflow.experiment.json",
      autonomyTaskflowDatasetFile: "evals/autonomy.taskflow.dataset.json",
      autonomyTaskflowExperimentFile: "evals/autonomy.taskflow.experiment.json",
      hermesControlTaskflowDatasetFile: "evals/hermes-control.taskflow.dataset.json",
      hermesControlTaskflowExperimentFile: "evals/hermes-control.taskflow.experiment.json",
      hermesTreatmentTaskflowDatasetFile: "evals/hermes-treatment.taskflow.dataset.json",
      hermesTreatmentTaskflowExperimentFile: "evals/hermes-treatment.taskflow.experiment.json",
      hermesStrategySuiteFile: "evals/hermes-strategy.suite.json",
      suiteFile: "evals/starter.suite.json",
      fixtureDirectory: "evals/fixtures/runtime-starter",
      workspaceFixtureDirectory: "evals/fixtures/workspace-starter",
    });

    await expect(readFile(join(cwd, "evals", "starter.dataset.json"), "utf8")).resolves.toContain('"name": "starter-runtime"');
    await expect(readFile(join(cwd, "evals", "starter.experiment.json"), "utf8")).resolves.toContain('"dataset": "./starter.dataset.json"');
    await expect(readFile(join(cwd, "evals", "taskflow.dataset.json"), "utf8")).resolves.toContain('"name": "starter-taskflow"');
    await expect(readFile(join(cwd, "evals", "starter.suite.json"), "utf8")).resolves.toContain('"name": "starter-runtime-suite"');
  });

  it("runs the seeded starter experiment and writes a report", async () => {
    const cwd = await makeTempDir();

    await runEvalCommand({ cwd, mode: "seed" });

    const result = await runEvalCommand({
      cwd,
      mode: "run",
      experiment: "evals/starter.experiment.json",
    });

    expect(result.mode).toBe("run");
    if (result.mode !== "run") {
      throw new Error("Expected run mode result.");
    }
    expect(result.report.failed).toBe(0);
    expect(result.report.reportFile).toBe("evals/reports/starter-runtime.report.json");

    const savedReport = JSON.parse(await readFile(join(cwd, "evals", "reports", "starter-runtime.report.json"), "utf8")) as {
      datasetName: string;
      failed: number;
      metrics: { passRate: number };
    };
    expect(savedReport).toEqual(expect.objectContaining({
      datasetName: "starter-runtime",
      failed: 0,
      metrics: expect.objectContaining({ passRate: 1 }),
    }));
  });

  it("runs the seeded starter suite and writes an aggregate report", async () => {
    const cwd = await makeTempDir();

    await runEvalCommand({ cwd, mode: "seed" });

    const result = await runEvalCommand({
      cwd,
      mode: "suite",
      suite: "evals/starter.suite.json",
    });

    expect(result.mode).toBe("suite");
    if (result.mode !== "suite") {
      throw new Error("Expected suite mode result.");
    }
    expect(result.report.failed).toBe(0);
    expect(result.report.reports).toHaveLength(6);
    expect(result.report.metrics.workspaceAnalysisRate).toBeGreaterThan(0);
    expect(result.report.metrics.workspaceKnowledgeRate).toBeGreaterThan(0);
    expect(result.report.metrics.hermesWorkflowInfluenceRate).toBeGreaterThan(0);
    expect(result.report.metrics.collectEvidenceRecoveryRate).toBeGreaterThan(0);
    expect(result.report.metrics.retryImplementRecoveryRate).toBeGreaterThan(0);
    expect(result.report.metrics.manualReviewRate).toBeGreaterThan(0);
    expect(result.report.metrics.autoRecoveryActionRate).toBeGreaterThan(0);
    expect(result.report.metrics.autonomyGuardrailRate).toBeGreaterThan(0);
    expect(result.report.metrics.budgetEscalationRate).toBeGreaterThan(0);
    expect(result.report.metrics.manualHandoffRate).toBeGreaterThan(0);
    expect(result.report.metrics.loopBoundRate).toBeGreaterThan(0);
    expect(result.report.metrics.verificationRecordedRate).toBeGreaterThan(0);
    expect(result.report.metrics.hermesContextUsageRate).toBeGreaterThan(0);
    expect(result.report.metrics.hermesRecoveryInfluenceRate).toBeGreaterThan(0);
    expect(result.report.metrics.hermesVerificationInfluenceRate).toBeGreaterThan(0);
    expect(result.report.metrics.crossToolResumeRate).toBeGreaterThan(0);
    expect(result.report.reportFile).toBe("evals/reports/starter-suite.report.json");
  });

  it("compares two eval reports", async () => {
    const cwd = await makeTempDir();

    await runEvalCommand({ cwd, mode: "seed" });
    const runResult = await runEvalCommand({
      cwd,
      mode: "run",
      experiment: "evals/starter.experiment.json",
    });
    const suiteResult = await runEvalCommand({
      cwd,
      mode: "suite",
      suite: "evals/starter.suite.json",
    });
    if (runResult.mode !== "run" || suiteResult.mode !== "suite") {
      throw new Error("Expected run and suite results.");
    }

    const comparison = await runEvalCommand({
      cwd,
      mode: "compare",
      base: runResult.report.reportFile,
      head: suiteResult.report.reportFile,
    });

    expect(comparison.mode).toBe("compare");
    if (comparison.mode !== "compare") {
      throw new Error("Expected compare mode result.");
    }
    expect(comparison.comparison.baseName).toBe("starter-runtime");
    expect(comparison.comparison.headName).toBe("starter-runtime-suite");
  });

  it("prints eval history after recorded runs", async () => {
    const cwd = await makeTempDir();

    await runEvalCommand({ cwd, mode: "seed" });
    await runEvalCommand({
      cwd,
      mode: "run",
      experiment: "evals/starter.experiment.json",
    });
    await runEvalCommand({
      cwd,
      mode: "suite",
      suite: "evals/starter.suite.json",
    });

    const history = await runEvalCommand({
      cwd,
      mode: "history",
      limit: 5,
    });

    expect(history.mode).toBe("history");
    if (history.mode !== "history") {
      throw new Error("Expected history mode result.");
    }
    expect(history.history.totalEntries).toBeGreaterThanOrEqual(3);
    expect(history.history.latest?.name).toBe("starter-runtime-suite");
    expect(history.history.entries[0]?.name).toBe("starter-runtime-suite");
    expect(Array.isArray(history.history.trend.regressions)).toBe(true);
    expect(Array.isArray(history.history.trend.improvements)).toBe(true);
  });

  it("builds a benchmark report from eval history", async () => {
    const cwd = await makeTempDir();

    await runEvalCommand({ cwd, mode: "seed" });
    await runEvalCommand({
      cwd,
      mode: "run",
      experiment: "evals/starter.experiment.json",
    });
    await runEvalCommand({
      cwd,
      mode: "suite",
      suite: "evals/starter.suite.json",
    });

    const benchmark = await runEvalCommand({
      cwd,
      mode: "benchmark",
      limit: 5,
      reportFile: "evals/reports/benchmark.report.json",
    });

    expect(benchmark.mode).toBe("benchmark");
    if (benchmark.mode !== "benchmark") {
      throw new Error("Expected benchmark mode result.");
    }
    expect(benchmark.report.latest).toBe("starter-runtime-suite");
    expect(benchmark.report.metrics.passRate.latest).toBeGreaterThan(0);
    expect(benchmark.report.metrics.workspaceAnalysisRate.latest).toBeGreaterThan(0);
    expect(benchmark.report.metrics.hermesContextUsageRate.latest).toBeGreaterThan(0);
    expect(benchmark.report.recoveryPlanCoverage.collectEvidenceRate).toBeGreaterThan(0);
    expect(benchmark.report.recoveryPlanCoverage.retryImplementRate).toBeGreaterThan(0);
    expect(benchmark.report.recoveryPlanCoverage.manualReviewRate).toBeGreaterThan(0);
    expect(benchmark.report.recoveryPlanCoverage.autonomyGuardrailRate).toBeGreaterThan(0);
    expect(benchmark.report.recoveryPlanCoverage.budgetEscalationRate).toBeGreaterThan(0);
    expect(benchmark.report.recoveryPlanCoverage.manualHandoffRate).toBeGreaterThan(0);
    expect(benchmark.report.hermesStrategyComparison.control).toBe("hermes-control-taskflow");
    expect(benchmark.report.hermesStrategyComparison.treatment).toBe("hermes-treatment-taskflow");
    expect(benchmark.report.hermesStrategyComparison.metricDiffs.hermesContextUsageRate).toBeGreaterThanOrEqual(0);

    const saved = JSON.parse(
      await readFile(join(cwd, "evals", "reports", "benchmark.report.json"), "utf8"),
    ) as { latest: string | null; hermesStrategyComparison: { treatment: string | null } };
    expect(saved.latest).toBe("starter-runtime-suite");
    expect(saved.hermesStrategyComparison.treatment).toBe("hermes-treatment-taskflow");
  });

  it("surfaces missing experiment files clearly", async () => {
    const cwd = await makeTempDir();

    await expect(runEvalCommand({
      cwd,
      mode: "run",
      experiment: "evals/missing.experiment.json",
    })).rejects.toThrow("Eval experiment not found: evals/missing.experiment.json");
  });

  it("rejects dataset paths outside the current repository", async () => {
    const cwd = await makeTempDir();

    await expect(runEvalCommand({
      cwd,
      mode: "run",
      dataset: "../outside.dataset.json",
    })).rejects.toThrow("Eval dataset path must stay within the current repository");
  });
});
