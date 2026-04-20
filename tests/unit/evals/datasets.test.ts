import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createStarterDatasetDocument,
  createStarterExperimentDocument,
  createHermesControlTaskflowDatasetDocument,
  createHermesControlTaskflowExperimentDocument,
  createHermesStrategySuiteDocument,
  createHermesTreatmentTaskflowDatasetDocument,
  createHermesTreatmentTaskflowExperimentDocument,
  createAutonomyTaskflowDatasetDocument,
  createAutonomyTaskflowExperimentDocument,
  createStarterSuiteDocument,
  createStarterTaskflowDatasetDocument,
  createStarterTaskflowExperimentDocument,
  seedEvalArtifacts,
} from "../../../src/evals/datasets.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-evals-datasets-"));
  tempDirs.push(dir);
  return dir;
}

describe("eval datasets", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("builds a deterministic starter dataset for runtime-backed commands", () => {
    expect(createStarterDatasetDocument()).toEqual({
      version: 1,
      kind: "command",
      name: "starter-runtime",
      description: "Deterministic offline evals for runtime-backed BBG commands.",
      cases: [
        {
          id: "quality-gate-pass",
          description: "quality-gate passes in the seeded fixture workspace",
          workspace: "./fixtures/runtime-starter",
          command: {
            name: "quality-gate",
          },
          expect: {
            ok: true,
            failedChecks: [],
          },
        },
        {
          id: "checkpoint-creates-baseline",
          description: "checkpoint creates a named baseline in the seeded fixture workspace",
          workspace: "./fixtures/runtime-starter",
          command: {
            name: "checkpoint",
            options: {
              name: "baseline",
            },
          },
          expect: {
            ok: true,
            checkpointFile: ".bbg/checkpoints/baseline.json",
          },
        },
        {
          id: "verify-detects-readme-drift",
          description: "verify reports drift after the fixture README changes",
          workspace: "./fixtures/runtime-starter",
          setup: [
            {
              type: "run-command",
              command: {
                name: "checkpoint",
                options: {
                  name: "baseline",
                },
              },
            },
            {
              type: "write-file",
              path: "README.md",
              content: "# Runtime starter changed\n",
            },
          ],
          command: {
            name: "verify",
            options: {
              checkpoint: "baseline",
            },
          },
          expect: {
            ok: false,
            changedFiles: ["README.md"],
          },
        },
        {
          id: "analyze-fuses-workspace-multi-repo-artifacts",
          description: "analyze produces workspace-level docs and knowledge for a multi-repo fixture",
          workspace: "./fixtures/workspace-starter",
          command: {
            name: "analyze",
          },
          expect: {
            ok: true,
            scope: "workspace",
            analyzedRepos: ["web", "api"],
            docsUpdated: [
              "docs/architecture/technical-architecture.md",
              "docs/architecture/business-architecture.md",
              "docs/architecture/repo-dependency-graph.md",
              "docs/business/capability-map.md",
              "docs/business/critical-flows.md",
              "docs/architecture/integration-contracts.md",
              "docs/architecture/runtime-constraints.md",
              "docs/architecture/risk-surface.md",
              "docs/architecture/decision-history.md",
              "docs/architecture/change-impact-map.md",
              "docs/architecture/workspace-topology.md",
              "docs/architecture/integration-map.md",
              "docs/business/module-map.md",
              "docs/business/core-flows.md",
              "docs/business/project-context.md",
              "docs/business/domain-model.md",
              "docs/architecture/repos/web.md",
              "docs/repositories/web.md",
              "docs/architecture/repos/api.md",
              "docs/repositories/api.md",
              "docs/architecture/index.md",
              "docs/architecture/languages/README.md",
              "docs/architecture/languages/typescript/application-patterns.md",
              "docs/architecture/languages/typescript/type-boundaries.md",
              "docs/architecture/languages/typescript/testing-and-runtime-boundaries.md",
              "docs/wiki/index.md",
              "docs/wiki/log.md",
              "docs/wiki/reports/workspace-analysis-summary.md",
              "docs/wiki/concepts/repo-web-overview.md",
              "docs/wiki/concepts/repo-api-overview.md",
              "docs/wiki/concepts/project-context.md",
            ],
            knowledgeUpdated: [
              ".bbg/knowledge/repos/web/technical.json",
              ".bbg/knowledge/repos/web/business.json",
              ".bbg/knowledge/repos/web/patterns.json",
              ".bbg/knowledge/repos/api/technical.json",
              ".bbg/knowledge/repos/api/business.json",
              ".bbg/knowledge/repos/api/patterns.json",
              ".bbg/knowledge/workspace/topology.json",
              ".bbg/knowledge/workspace/integration-map.json",
              ".bbg/knowledge/workspace/business-modules.json",
              ".bbg/knowledge/workspace/capabilities.json",
              ".bbg/knowledge/workspace/critical-flows.json",
              ".bbg/knowledge/workspace/contracts.json",
              ".bbg/knowledge/workspace/domain-model.json",
              ".bbg/knowledge/workspace/business-context.json",
              ".bbg/knowledge/workspace/constraints.json",
              ".bbg/knowledge/workspace/risk-surface.json",
              ".bbg/knowledge/workspace/decisions.json",
              ".bbg/knowledge/workspace/change-impact.json",
            ],
          },
        },
      ],
    });
  });

  it("builds a starter experiment that references the starter dataset", () => {
    expect(createStarterExperimentDocument()).toEqual({
      version: 1,
      name: "starter-runtime",
      dataset: "./starter.dataset.json",
      reportFile: "./reports/starter-runtime.report.json",
    });
  });

  it("builds a starter taskflow dataset and experiment", () => {
    expect(createStarterTaskflowDatasetDocument()).toEqual({
      version: 1,
      kind: "taskflow",
      name: "starter-taskflow",
      description: "Taskflow evals covering start/resume/status and recovery behavior.",
      cases: expect.arrayContaining([
        expect.objectContaining({
          id: "start-creates-primary-task-session",
          workspace: "./fixtures/runtime-starter",
        }),
        expect.objectContaining({
          id: "resume-recovers-observation-evidence-path",
          workspace: "./fixtures/runtime-starter",
        }),
        expect.objectContaining({
          id: "workspace-analyze-prepares-cross-repo-task-context",
          workspace: "./fixtures/workspace-starter",
        }),
      ]),
    });
    expect(createStarterTaskflowExperimentDocument()).toEqual({
      version: 1,
      name: "starter-taskflow",
      dataset: "./taskflow.dataset.json",
      reportFile: "./reports/starter-taskflow.report.json",
    });
  });

  it("builds Hermes control/treatment datasets and suite", () => {
    expect(createHermesControlTaskflowDatasetDocument()).toEqual({
      version: 1,
      kind: "taskflow",
      name: "hermes-control-taskflow",
      description: "Baseline taskflow evals with Hermes explicitly disabled.",
      cases: expect.arrayContaining([
        expect.objectContaining({ id: "control-start-disables-hermes-query" }),
        expect.objectContaining({ id: "control-verify-does-not-inherit-hermes-influence" }),
      ]),
    });
    expect(createHermesControlTaskflowExperimentDocument()).toEqual({
      version: 1,
      name: "hermes-control-taskflow",
      dataset: "./hermes-control.taskflow.dataset.json",
      reportFile: "./reports/hermes-control-taskflow.report.json",
    });
    expect(createHermesTreatmentTaskflowDatasetDocument()).toEqual({
      version: 1,
      kind: "taskflow",
      name: "hermes-treatment-taskflow",
      description: "Treatment taskflow evals with Hermes enabled and forced into task recovery.",
      cases: expect.arrayContaining([
        expect.objectContaining({ id: "treatment-start-carries-hermes-query-and-workflow-influence" }),
        expect.objectContaining({ id: "treatment-verify-records-hermes-recovery-and-verification-influence" }),
      ]),
    });
    expect(createHermesTreatmentTaskflowExperimentDocument()).toEqual({
      version: 1,
      name: "hermes-treatment-taskflow",
      dataset: "./hermes-treatment.taskflow.dataset.json",
      reportFile: "./reports/hermes-treatment-taskflow.report.json",
    });
    expect(createHermesStrategySuiteDocument()).toEqual({
      version: 1,
      name: "hermes-strategy-suite",
      experiments: [
        "./hermes-control.taskflow.experiment.json",
        "./hermes-treatment.taskflow.experiment.json",
      ],
      reportFile: "./reports/hermes-strategy-suite.report.json",
    });
  });

  it("builds autonomy guardrail taskflow dataset and experiment", () => {
    expect(createAutonomyTaskflowDatasetDocument()).toEqual({
      version: 1,
      kind: "taskflow",
      name: "autonomy-guardrails-taskflow",
      description: "Taskflow evals covering attempt, verification, and duration guardrails.",
      cases: expect.arrayContaining([
        expect.objectContaining({ id: "autonomy-attempt-budget-escalates-to-manual-review" }),
        expect.objectContaining({ id: "autonomy-verify-failure-budget-escalates-on-verify" }),
        expect.objectContaining({ id: "autonomy-duration-budget-escalates-on-resume" }),
      ]),
    });
    expect(createAutonomyTaskflowExperimentDocument()).toEqual({
      version: 1,
      name: "autonomy-guardrails-taskflow",
      dataset: "./autonomy.taskflow.dataset.json",
      reportFile: "./reports/autonomy-guardrails-taskflow.report.json",
    });
  });

  it("builds a starter suite that references command and taskflow experiments", () => {
    expect(createStarterSuiteDocument()).toEqual({
      version: 1,
      name: "starter-runtime-suite",
      experiments: [
        "./starter.experiment.json",
        "./taskflow.experiment.json",
        "./recovery.taskflow.experiment.json",
        "./autonomy.taskflow.experiment.json",
        "./hermes-control.taskflow.experiment.json",
        "./hermes-treatment.taskflow.experiment.json",
      ],
      reportFile: "./reports/starter-suite.report.json",
    });
  });

  it("seeds the starter dataset, experiment, and fixture workspace", async () => {
    const cwd = await makeTempDir();

    const result = await seedEvalArtifacts({ cwd });

    expect(result.datasetFile).toBe("evals/starter.dataset.json");
    expect(result.experimentFile).toBe("evals/starter.experiment.json");
    expect(result.taskflowDatasetFile).toBe("evals/taskflow.dataset.json");
    expect(result.taskflowExperimentFile).toBe("evals/taskflow.experiment.json");
    expect(result.recoveryTaskflowDatasetFile).toBe("evals/recovery.taskflow.dataset.json");
    expect(result.recoveryTaskflowExperimentFile).toBe("evals/recovery.taskflow.experiment.json");
    expect(result.autonomyTaskflowDatasetFile).toBe("evals/autonomy.taskflow.dataset.json");
    expect(result.autonomyTaskflowExperimentFile).toBe("evals/autonomy.taskflow.experiment.json");
    expect(result.hermesControlTaskflowDatasetFile).toBe("evals/hermes-control.taskflow.dataset.json");
    expect(result.hermesControlTaskflowExperimentFile).toBe("evals/hermes-control.taskflow.experiment.json");
    expect(result.hermesTreatmentTaskflowDatasetFile).toBe("evals/hermes-treatment.taskflow.dataset.json");
    expect(result.hermesTreatmentTaskflowExperimentFile).toBe("evals/hermes-treatment.taskflow.experiment.json");
    expect(result.hermesStrategySuiteFile).toBe("evals/hermes-strategy.suite.json");
    expect(result.suiteFile).toBe("evals/starter.suite.json");
    expect(result.fixtureDirectory).toBe("evals/fixtures/runtime-starter");
    expect(result.workspaceFixtureDirectory).toBe("evals/fixtures/workspace-starter");

    const dataset = JSON.parse(await readFile(join(cwd, result.datasetFile), "utf8")) as { name: string };
    expect(dataset.name).toBe("starter-runtime");

    const experiment = JSON.parse(await readFile(join(cwd, result.experimentFile), "utf8")) as { dataset: string };
    expect(experiment.dataset).toBe("./starter.dataset.json");

    const taskflowExperiment = JSON.parse(
      await readFile(join(cwd, result.taskflowExperimentFile), "utf8"),
    ) as { dataset: string };
    expect(taskflowExperiment.dataset).toBe("./taskflow.dataset.json");

    const hermesTreatmentExperiment = JSON.parse(
      await readFile(join(cwd, result.hermesTreatmentTaskflowExperimentFile), "utf8"),
    ) as { dataset: string };
    expect(hermesTreatmentExperiment.dataset).toBe("./hermes-treatment.taskflow.dataset.json");

    const suite = JSON.parse(await readFile(join(cwd, result.suiteFile), "utf8")) as { experiments: string[] };
    expect(suite.experiments).toEqual([
      "./starter.experiment.json",
      "./taskflow.experiment.json",
      "./recovery.taskflow.experiment.json",
      "./autonomy.taskflow.experiment.json",
      "./hermes-control.taskflow.experiment.json",
      "./hermes-treatment.taskflow.experiment.json",
    ]);

    const hermesSuite = JSON.parse(
      await readFile(join(cwd, result.hermesStrategySuiteFile), "utf8"),
    ) as { experiments: string[] };
    expect(hermesSuite.experiments).toEqual([
      "./hermes-control.taskflow.experiment.json",
      "./hermes-treatment.taskflow.experiment.json",
    ]);

    const fixturePackage = JSON.parse(await readFile(join(cwd, result.fixtureDirectory, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(fixturePackage.scripts).toEqual({
      build: 'node -e "process.exit(0)"',
      typecheck: 'node -e "process.exit(0)"',
      test: 'node -e "process.exit(0)"',
      lint: 'node -e "process.exit(0)"',
    });

    const fixtureReadme = await readFile(join(cwd, result.fixtureDirectory, "README.md"), "utf8");
    expect(fixtureReadme).toBe("# Runtime starter\n");

    const workspaceConfig = JSON.parse(
      await readFile(join(cwd, result.workspaceFixtureDirectory, ".bbg", "config.json"), "utf8"),
    ) as { repos: Array<{ name: string }> };
    expect(workspaceConfig.repos.map((repo) => repo.name)).toEqual(["web", "api"]);
  });
});
