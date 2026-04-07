import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { seedEvalArtifacts } from "../../../src/evals/datasets.js";
import { writeJsonStore } from "../../../src/runtime/store.js";
import { writeTextFile } from "../../../src/utils/fs.js";
import { runEvalExperiment } from "../../../src/evals/runner.js";

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
    expect(report.passed).toBe(3);
    expect(report.failed).toBe(0);
    expect(report.results.map((result: { id: string; passed: boolean }) => ({ id: result.id, passed: result.passed }))).toEqual([
      { id: "quality-gate-pass", passed: true },
      { id: "checkpoint-creates-baseline", passed: true },
      { id: "verify-detects-readme-drift", passed: true },
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
