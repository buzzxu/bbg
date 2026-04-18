import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { writeTextFile } from "../../../src/utils/fs.js";

const execaState = vi.hoisted(() => ({
  execa: vi.fn(),
}));

vi.mock("execa", () => ({
  execa: execaState.execa,
}));

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-task-env-command-"));
  tempDirs.push(dir);
  return dir;
}

async function seedConfig(cwd: string): Promise<void> {
  await writeTextFile(
    join(cwd, ".bbg", "config.json"),
    `${JSON.stringify(
      {
        version: "1.0.0",
        projectName: "test",
        projectDescription: "test",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        repos: [],
        governance: {
          riskThresholds: {
            high: { grade: "A", minScore: 90 },
            medium: { grade: "B", minScore: 70 },
            low: { grade: "C", minScore: 50 },
          },
          enableRedTeam: false,
          enableCrossAudit: false,
        },
        context: {},
      },
      null,
      2,
    )}\n`,
  );
}

describe("task-env command", () => {
  afterEach(async () => {
    execaState.execa.mockReset();
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("creates and lists a task environment", async () => {
    const cwd = await makeTempDir();
    await seedConfig(cwd);
    execaState.execa.mockImplementation(async (_command: string, args?: string[]) => {
      if (args?.[0] === "rev-parse") {
        return { stdout: cwd };
      }
      return { stdout: "" };
    });

    const { runTaskEnvCommand } = await import("../../../src/commands/task-env.js");
    const created = await runTaskEnvCommand({ cwd, mode: "start", task: "Ship feature", baseRef: "main" });

    expect(created.env?.id).toBe("ship-feature");
    expect(created.env?.worktreePath).toBe(".bbg/task-envs/ship-feature/worktree");

    const status = await runTaskEnvCommand({ cwd, mode: "status" });
    expect(status.envs?.map((env) => env.id)).toEqual(["ship-feature"]);
  });

  it("marks a task environment finished", async () => {
    const cwd = await makeTempDir();
    await seedConfig(cwd);
    execaState.execa.mockImplementation(async (_command: string, args?: string[]) => {
      if (args?.[0] === "rev-parse") {
        return { stdout: cwd };
      }
      return { stdout: "" };
    });

    const { runTaskEnvCommand } = await import("../../../src/commands/task-env.js");
    await runTaskEnvCommand({ cwd, mode: "start", task: "Ship feature" });
    await mkdir(join(cwd, ".bbg", "task-envs", "ship-feature", "worktree"), { recursive: true });

    const finished = await runTaskEnvCommand({ cwd, mode: "finish", id: "ship-feature" });
    expect(finished.env?.status).toBe("finished");
  });

  it("attaches an active task environment and repairs a stale one", async () => {
    const cwd = await makeTempDir();
    await seedConfig(cwd);
    execaState.execa.mockImplementation(async (_command: string, args?: string[]) => {
      if (args?.[0] === "rev-parse") {
        return { stdout: cwd };
      }
      return { stdout: "" };
    });

    const { runTaskEnvCommand } = await import("../../../src/commands/task-env.js");
    await runTaskEnvCommand({ cwd, mode: "start", task: "Ship feature" });
    await mkdir(join(cwd, ".bbg", "task-envs", "ship-feature", "worktree"), { recursive: true });

    const attached = await runTaskEnvCommand({ cwd, mode: "attach", id: "ship-feature" });
    expect(attached.env?.status).toBe("active");

    await rm(join(cwd, ".bbg", "task-envs", "ship-feature", "worktree"), { recursive: true, force: true });
    const stale = await runTaskEnvCommand({ cwd, mode: "attach", id: "ship-feature" });
    expect(stale.env?.status).toBe("stale");

    const repaired = await runTaskEnvCommand({ cwd, mode: "repair", id: "ship-feature" });
    expect(repaired.env?.status).toBe("active");
    expect(execaState.execa).toHaveBeenCalledWith(
      "git",
      ["worktree", "add", "--detach", join(cwd, ".bbg", "task-envs", "ship-feature", "worktree"), "HEAD"],
      { cwd },
    );
  });
});
