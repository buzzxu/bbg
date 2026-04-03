import { join } from "node:path";
import { serializeConfig } from "../config/read-write.js";
import { buildDefaultRuntimeConfig } from "../runtime/schema.js";
import { writeTextFile } from "../utils/fs.js";
import type { EvalDatasetDocument, EvalExperimentDocument } from "./schema.js";

export interface SeedEvalArtifactsResult {
  datasetFile: string;
  experimentFile: string;
  fixtureDirectory: string;
}

export function createStarterDatasetDocument(): EvalDatasetDocument {
  return {
    version: 1,
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
    ],
  };
}

export function createStarterExperimentDocument(): EvalExperimentDocument {
  return {
    version: 1,
    name: "starter-runtime",
    dataset: "./starter.dataset.json",
    reportFile: "./reports/starter-runtime.report.json",
  };
}

async function seedRuntimeFixture(cwd: string, fixtureDirectory: string): Promise<void> {
  const runtime = buildDefaultRuntimeConfig();
  const fixtureRoot = join(cwd, fixtureDirectory);

  await writeTextFile(join(fixtureRoot, "README.md"), "# Runtime starter\n");
  await writeTextFile(join(fixtureRoot, "package.json"), `${JSON.stringify({
    name: "bbg-eval-runtime-starter",
    private: true,
    type: "module",
    scripts: {
      build: 'node -e "process.exit(0)"',
      typecheck: 'node -e "process.exit(0)"',
      test: 'node -e "process.exit(0)"',
      lint: 'node -e "process.exit(0)"',
    },
  }, null, 2)}\n`);
  await writeTextFile(join(fixtureRoot, ".bbg", "config.json"), serializeConfig({
    version: "0.1.0",
    projectName: "runtime-starter",
    projectDescription: "deterministic runtime eval fixture",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    repos: [],
    governance: {
      riskThresholds: {
        high: { grade: "A+", minScore: 99 },
        medium: { grade: "A", minScore: 95 },
        low: { grade: "B", minScore: 85 },
      },
      enableRedTeam: true,
      enableCrossAudit: true,
    },
    context: {},
    runtime,
  }));
}

export async function seedEvalArtifacts(input: { cwd: string }): Promise<SeedEvalArtifactsResult> {
  const datasetFile = "evals/starter.dataset.json";
  const experimentFile = "evals/starter.experiment.json";
  const fixtureDirectory = "evals/fixtures/runtime-starter";

  await writeTextFile(join(input.cwd, datasetFile), `${JSON.stringify(createStarterDatasetDocument(), null, 2)}\n`);
  await writeTextFile(join(input.cwd, experimentFile), `${JSON.stringify(createStarterExperimentDocument(), null, 2)}\n`);
  await seedRuntimeFixture(input.cwd, fixtureDirectory);

  return {
    datasetFile,
    experimentFile,
    fixtureDirectory,
  };
}
