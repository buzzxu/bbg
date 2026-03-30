import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import { beforeAll, describe, expect, it } from "vitest";

const testFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(testFilePath), "../..");
const distCliPath = path.join(repoRoot, "dist", "cli.js");

async function ensureBuiltCli(): Promise<void> {
  try {
    await access(distCliPath);
  } catch {
    await execa("npm", ["run", "build"], { cwd: repoRoot });
  }
}

describe("cli smoke", () => {
  beforeAll(async () => {
    await ensureBuiltCli();
  });

  it("prints v1 command list in --help output", async () => {
    const { stdout } = await execa("node", [distCliPath, "--help"], { cwd: repoRoot });

    expect(stdout).toContain("Usage: bbg");
    expect(stdout).toContain("init");
    expect(stdout).toContain("add-repo");
    expect(stdout).toContain("doctor");
    expect(stdout).toContain("sync");
    expect(stdout).toContain("release");
    expect(stdout).toContain("upgrade");
  });
});
