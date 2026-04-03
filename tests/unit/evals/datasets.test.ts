import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createStarterDatasetDocument,
  createStarterExperimentDocument,
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

  it("seeds the starter dataset, experiment, and fixture workspace", async () => {
    const cwd = await makeTempDir();

    const result = await seedEvalArtifacts({ cwd });

    expect(result.datasetFile).toBe("evals/starter.dataset.json");
    expect(result.experimentFile).toBe("evals/starter.experiment.json");
    expect(result.fixtureDirectory).toBe("evals/fixtures/runtime-starter");

    const dataset = JSON.parse(await readFile(join(cwd, result.datasetFile), "utf8")) as { name: string };
    expect(dataset.name).toBe("starter-runtime");

    const experiment = JSON.parse(await readFile(join(cwd, result.experimentFile), "utf8")) as { dataset: string };
    expect(experiment.dataset).toBe("./starter.dataset.json");

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
  });
});
