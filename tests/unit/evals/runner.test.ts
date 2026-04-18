import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { seedEvalArtifacts } from "../../../src/evals/datasets.js";
import { readEvalHistory, summarizeEvalHistory } from "../../../src/evals/history.js";
import { writeJsonStore } from "../../../src/runtime/store.js";
import { writeTextFile } from "../../../src/utils/fs.js";
import { compareEvalReports, runEvalExperiment, runEvalSuite } from "../../../src/evals/runner.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-evals-runner-"));
  tempDirs.push(dir);
  return dir;
}

describe("eval runner", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("runs a dataset directly and grades deterministic runtime-backed commands", { timeout: 20000 }, async () => {
    const cwd = await makeTempDir();
    const seeded = await seedEvalArtifacts({ cwd });

    const report = await runEvalExperiment({
      cwd,
      datasetPath: seeded.datasetFile,
    });

    expect(report.datasetName).toBe("starter-runtime");
    expect(report.experimentName).toBe("starter-runtime");
    expect(report.passed).toBe(4);
    expect(report.failed).toBe(0);
    expect(report.metrics.totalCases).toBe(4);
    expect(report.metrics.passRate).toBe(1);
    expect(report.metrics.workspaceAnalysisRate).toBeGreaterThan(0);
    expect(report.metrics.workspaceKnowledgeRate).toBeGreaterThan(0);
    expect(report.results.map((result: { id: string; passed: boolean }) => ({ id: result.id, passed: result.passed }))).toEqual([
      { id: "quality-gate-pass", passed: true },
      { id: "checkpoint-creates-baseline", passed: true },
      { id: "verify-detects-readme-drift", passed: true },
      { id: "analyze-fuses-workspace-multi-repo-artifacts", passed: true },
    ]);
  });

  it("runs an experiment file and persists the report to the configured output path", async () => {
    const cwd = await makeTempDir();
    const seeded = await seedEvalArtifacts({ cwd });

    const report = await runEvalExperiment({
      cwd,
      experimentPath: join(cwd, seeded.experimentFile),
    });

    expect(report.reportFile).toBe("evals/reports/starter-runtime.report.json");
    expect(report.failed).toBe(0);

    const history = await readEvalHistory(cwd);
    expect(history.entries[0]).toEqual(expect.objectContaining({
      kind: "experiment",
      name: "starter-runtime",
      datasetName: "starter-runtime",
    }));
  });

  it("runs a taskflow experiment and captures task metrics", async () => {
    const cwd = await makeTempDir();
    const seeded = await seedEvalArtifacts({ cwd });

    const report = await runEvalExperiment({
      cwd,
      experimentPath: join(cwd, seeded.taskflowExperimentFile),
    });

    expect(report.datasetName).toBe("starter-taskflow");
    expect(report.failed).toBe(0);
    expect(report.metrics.totalCases).toBe(6);
    expect(report.metrics.workspaceAnalysisRate).toBeGreaterThan(0);
    expect(report.metrics.workspaceKnowledgeRate).toBeGreaterThan(0);
    expect(report.metrics.hermesWorkflowInfluenceRate).toBeGreaterThan(0);
    expect(report.metrics.recoveryRate).toBeGreaterThan(0);
    expect(report.metrics.evidenceRecoveryRate).toBeGreaterThan(0);
    expect(report.metrics.hermesContextUsageRate).toBeGreaterThan(0);
    expect(report.metrics.hermesRecoveryInfluenceRate).toBeGreaterThanOrEqual(0);
    expect(report.metrics.hermesVerificationInfluenceRate).toBeGreaterThanOrEqual(0);
    expect(report.metrics.loopBoundRate).toBeGreaterThan(0);
    expect(report.metrics.loopCompletionRate).toBeGreaterThan(0);
    expect(report.metrics.verificationRecordedRate).toBeGreaterThan(0);
    expect(report.metrics.crossToolResumeRate).toBeGreaterThan(0);
    expect(report.results.map((result) => result.category)).toEqual([
      "taskflow",
      "taskflow",
      "taskflow",
      "taskflow",
      "taskflow",
      "taskflow",
    ]);
  });

  it("runs the recovery experiment and captures recovery-plan metrics", async () => {
    const cwd = await makeTempDir();
    const seeded = await seedEvalArtifacts({ cwd });

    const report = await runEvalExperiment({
      cwd,
      experimentPath: join(cwd, seeded.recoveryTaskflowExperimentFile),
    });

    expect(report.datasetName).toBe("recovery-taskflow");
    expect(report.failed).toBe(0);
    expect(report.metrics.totalCases).toBe(3);
    expect(report.metrics.collectEvidenceRecoveryRate).toBeGreaterThan(0);
    expect(report.metrics.retryImplementRecoveryRate).toBeGreaterThan(0);
    expect(report.metrics.manualReviewRate).toBeGreaterThan(0);
    expect(report.metrics.autoRecoveryActionRate).toBeGreaterThan(0);
    expect(report.metrics.crossToolResumeRate).toBeGreaterThan(0);
  });

  it("runs the autonomy guardrail experiment and captures budget metrics", async () => {
    const cwd = await makeTempDir();
    const seeded = await seedEvalArtifacts({ cwd });

    const report = await runEvalExperiment({
      cwd,
      experimentPath: join(cwd, seeded.autonomyTaskflowExperimentFile),
    });

    expect(report.datasetName).toBe("autonomy-guardrails-taskflow");
    expect(report.failed).toBe(0);
    expect(report.metrics.totalCases).toBe(3);
    expect(report.metrics.autonomyGuardrailRate).toBeGreaterThan(0);
    expect(report.metrics.budgetEscalationRate).toBeGreaterThan(0);
    expect(report.metrics.manualHandoffRate).toBeGreaterThan(0);
    expect(report.metrics.manualReviewRate).toBeGreaterThan(0);
  });

  it("runs a suite and aggregates metrics across experiments", async () => {
    const cwd = await makeTempDir();
    const seeded = await seedEvalArtifacts({ cwd });

    const report = await runEvalSuite({
      cwd,
      suitePath: seeded.suiteFile,
    });

    expect(report.suiteName).toBe("starter-runtime-suite");
    expect(report.reports).toHaveLength(6);
    expect(report.metrics.totalCases).toBe(20);
    expect(report.failed).toBe(0);
    expect(report.reportFile).toBe("evals/reports/starter-suite.report.json");

    const summary = await summarizeEvalHistory(cwd, 5);
    expect(summary.totalEntries).toBeGreaterThanOrEqual(3);
    expect(summary.latest?.kind).toBe("suite");
    expect(summary.latest?.name).toBe("starter-runtime-suite");
    expect(summary.entries[0]?.name).toBe("starter-runtime-suite");
  });

  it("compares two reports and highlights regressions", async () => {
    const cwd = await makeTempDir();
    await writeJsonStore(join(cwd, "evals", "base.report.json"), {
      experimentName: "base",
      datasetName: "base",
      passed: 2,
      failed: 0,
      generatedAt: "2026-04-18T00:00:00.000Z",
      metrics: {
        totalCases: 2,
        passRate: 1,
        workspaceAnalysisRate: 1,
        workspaceKnowledgeRate: 1,
        hermesWorkflowInfluenceRate: 1,
        hermesRecoveryInfluenceRate: 1,
        hermesVerificationInfluenceRate: 1,
        collectEvidenceRecoveryRate: 1,
        retryImplementRecoveryRate: 1,
        manualReviewRate: 0,
        autoRecoveryActionRate: 1,
        autonomyGuardrailRate: 0,
        budgetEscalationRate: 0,
        manualHandoffRate: 0,
        taskCompletionRate: 1,
        firstPassVerificationRate: 1,
        verificationRecordedRate: 1,
        recoveryRate: 1,
        blockedRate: 0,
        evidenceRecoveryRate: 1,
        hermesContextUsageRate: 1,
        loopBoundRate: 1,
        loopCompletionRate: 1,
        runnerLaunchRate: 1,
        runnerFallbackSuccessRate: 1,
        crossToolResumeRate: 1,
      },
      results: [],
    });
    await writeJsonStore(join(cwd, "evals", "head.report.json"), {
      experimentName: "head",
      datasetName: "head",
      passed: 1,
      failed: 1,
      generatedAt: "2026-04-18T00:00:00.000Z",
      metrics: {
        totalCases: 2,
        passRate: 0.5,
        workspaceAnalysisRate: 0.5,
        workspaceKnowledgeRate: 0.5,
        hermesWorkflowInfluenceRate: 0.5,
        hermesRecoveryInfluenceRate: 0.5,
        hermesVerificationInfluenceRate: 0.5,
        collectEvidenceRecoveryRate: 0.5,
        retryImplementRecoveryRate: 0.5,
        manualReviewRate: 0.5,
        autoRecoveryActionRate: 0.5,
        autonomyGuardrailRate: 0.5,
        budgetEscalationRate: 0.5,
        manualHandoffRate: 0.5,
        taskCompletionRate: 0.5,
        firstPassVerificationRate: 0.5,
        verificationRecordedRate: 0.5,
        recoveryRate: 0.5,
        blockedRate: 0.5,
        evidenceRecoveryRate: 0.5,
        hermesContextUsageRate: 0.5,
        loopBoundRate: 0.5,
        loopCompletionRate: 0.5,
        runnerLaunchRate: 0.5,
        runnerFallbackSuccessRate: 0.5,
        crossToolResumeRate: 0.5,
      },
      results: [],
    });

    const comparison = await compareEvalReports({
      cwd,
      basePath: "evals/base.report.json",
      headPath: "evals/head.report.json",
    });

    expect(comparison.baseName).toBe("base");
    expect(comparison.headName).toBe("head");
    expect(comparison.metricDiffs.passRate).toBe(-0.5);
    expect(comparison.regressions).toContain("passRate regressed by -0.5");
    expect(comparison.regressions).toContain("blockedRate regressed by +0.5");
  });

  it("rejects malformed dataset and experiment documents", async () => {
    const cwd = await makeTempDir();
    const seeded = await seedEvalArtifacts({ cwd });
    const datasetPath = seeded.datasetFile;
    const experimentPath = join(cwd, seeded.experimentFile);

    await writeTextFile(join(cwd, datasetPath), "{not-json}\n");

    await expect(runEvalExperiment({ cwd, datasetPath })).rejects.toThrow("Invalid runtime store JSON");

    await writeJsonStore(join(cwd, datasetPath), {
      version: 1,
      name: "starter-runtime",
      description: "dataset",
      cases: [],
    });
    await writeJsonStore(experimentPath, {
      version: 1,
      name: "starter-runtime",
      dataset: 123,
    });

    await expect(runEvalExperiment({ cwd, experimentPath })).rejects.toThrow("Invalid runtime store contents");
  });

  it("rejects traversal-like workspace and setup write paths", async () => {
    const cwd = await makeTempDir();
    const seeded = await seedEvalArtifacts({ cwd });
    const datasetPath = seeded.datasetFile;

    await writeJsonStore(join(cwd, datasetPath), {
      version: 1,
      name: "sandbox-checks",
      description: "sandbox validation",
      cases: [
        {
          id: "workspace-traversal",
          description: "rejects workspaces outside fixtures",
          workspace: "../outside",
          command: { name: "quality-gate" },
          expect: { ok: true },
        },
      ],
    });

    await expect(runEvalExperiment({ cwd, datasetPath })).rejects.toThrow("Eval workspace must stay within the dataset directory");

    await writeJsonStore(join(cwd, datasetPath), {
      version: 1,
      name: "sandbox-checks",
      description: "sandbox validation",
      cases: [
        {
          id: "write-traversal",
          description: "rejects writes outside the cloned workspace",
          workspace: "./fixtures/runtime-starter",
          setup: [
            {
              type: "write-file",
              path: "../escape.txt",
              content: "nope",
            },
          ],
          command: { name: "quality-gate" },
          expect: { ok: true },
        },
      ],
    });

    await expect(runEvalExperiment({ cwd, datasetPath })).rejects.toThrow("Eval setup write path must stay within the cloned workspace");
  });

  it("rejects missing experiments and repo-external report paths", async () => {
    const cwd = await makeTempDir();
    const seeded = await seedEvalArtifacts({ cwd });
    const experimentPath = join(cwd, seeded.experimentFile);

    await expect(runEvalExperiment({ cwd, experimentPath: "evals/missing.experiment.json" })).rejects.toThrow(
      "Eval experiment not found: evals/missing.experiment.json",
    );

    await writeJsonStore(experimentPath, {
      version: 1,
      name: "starter-runtime",
      dataset: "./starter.dataset.json",
      reportFile: "../../outside.report.json",
    });

    await expect(runEvalExperiment({ cwd, experimentPath })).rejects.toThrow("Eval report path must stay within the current repository");

    await expect(runEvalExperiment({ cwd, experimentPath: "../outside.experiment.json" })).rejects.toThrow(
      "Eval experiment path must stay within the current repository",
    );
  });

  it("rejects dataset paths outside the current repository", async () => {
    const cwd = await makeTempDir();
    const seeded = await seedEvalArtifacts({ cwd });

    await expect(runEvalExperiment({ cwd, datasetPath: `../${seeded.datasetFile}` })).rejects.toThrow(
      "Eval dataset path must stay within the current repository",
    );

    await expect(runEvalExperiment({ cwd, datasetPath: join(cwd, seeded.datasetFile) })).rejects.toThrow(
      "Eval dataset path must stay within the current repository",
    );
  });

  it("does not leak absolute paths when a dataset is missing", async () => {
    const cwd = await makeTempDir();

    await expect(runEvalExperiment({ cwd, datasetPath: "evals/missing.dataset.json" })).rejects.toThrow(
      "Eval dataset not found: evals/missing.dataset.json",
    );
  });

  it("stops when a setup command fails", async () => {
    const cwd = await makeTempDir();
    const seeded = await seedEvalArtifacts({ cwd });
    const datasetPath = seeded.datasetFile;

    await writeTextFile(join(cwd, seeded.fixtureDirectory, "package.json"), `${JSON.stringify({
      name: "bbg-eval-runtime-starter",
      private: true,
      type: "module",
      scripts: {
        build: 'node -e "process.exit(1)"',
        typecheck: 'node -e "process.exit(0)"',
        test: 'node -e "process.exit(0)"',
        lint: 'node -e "process.exit(0)"',
      },
    }, null, 2)}\n`);
    await writeJsonStore(join(cwd, datasetPath), {
      version: 1,
      name: "setup-failure",
      description: "setup command failure",
      cases: [
        {
          id: "setup-command-fails",
          description: "fails fast when setup commands fail",
          workspace: "./fixtures/runtime-starter",
          setup: [
            {
              type: "run-command",
              command: {
                name: "checkpoint",
                options: { name: "baseline" },
              },
            },
          ],
          command: { name: "quality-gate" },
          expect: { ok: true },
        },
      ],
    });

    await expect(runEvalExperiment({ cwd, datasetPath })).rejects.toThrow("Eval setup command failed: checkpoint");
  });
});
