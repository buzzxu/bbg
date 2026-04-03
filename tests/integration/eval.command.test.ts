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
    execaState.execa.mockReset();
    execaState.execa.mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 });
  });

  afterEach(async () => {
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
      fixtureDirectory: "evals/fixtures/runtime-starter",
    });

    await expect(readFile(join(cwd, "evals", "starter.dataset.json"), "utf8")).resolves.toContain('"name": "starter-runtime"');
    await expect(readFile(join(cwd, "evals", "starter.experiment.json"), "utf8")).resolves.toContain('"dataset": "./starter.dataset.json"');
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
    };
    expect(savedReport).toEqual(expect.objectContaining({ datasetName: "starter-runtime", failed: 0 }));
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
