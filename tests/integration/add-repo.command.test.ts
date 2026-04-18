import { access, mkdtemp, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const promptState = vi.hoisted(() => ({
  promptInput: vi.fn(),
  promptSelect: vi.fn(),
  promptConfirm: vi.fn(),
}));

const gitState = vi.hoisted(() => ({
  listRemoteBranches: vi.fn(),
  cloneRepo: vi.fn(),
}));

const analyzerState = vi.hoisted(() => ({
  analyzeRepo: vi.fn(),
}));

const doctorState = vi.hoisted(() => ({
  runDoctor: vi.fn(),
}));

vi.mock("../../src/utils/prompts.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/utils/prompts.js")>();
  return {
    promptInput: promptState.promptInput,
    promptSelect: promptState.promptSelect,
    promptConfirm: promptState.promptConfirm,
    sanitizePromptValue: actual.sanitizePromptValue,
    collectStackInfo: async (detectedStack: Record<string, string>) => {
      const useDetected = await promptState.promptConfirm({ message: "Use detected stack info?", default: true });
      if (useDetected) return detectedStack;
      return {
        language: actual.sanitizePromptValue(
          await promptState.promptInput({ message: "Stack language", default: detectedStack.language }),
          detectedStack.language,
        ),
        framework: actual.sanitizePromptValue(
          await promptState.promptInput({ message: "Stack framework", default: detectedStack.framework }),
          detectedStack.framework,
        ),
        buildTool: actual.sanitizePromptValue(
          await promptState.promptInput({ message: "Stack build tool", default: detectedStack.buildTool }),
          detectedStack.buildTool,
        ),
        testFramework: actual.sanitizePromptValue(
          await promptState.promptInput({ message: "Stack test framework", default: detectedStack.testFramework }),
          detectedStack.testFramework,
        ),
        packageManager: actual.sanitizePromptValue(
          await promptState.promptInput({ message: "Stack package manager", default: detectedStack.packageManager }),
          detectedStack.packageManager,
        ),
      };
    },
  };
});

vi.mock("../../src/utils/git.js", () => ({
  listRemoteBranches: gitState.listRemoteBranches,
  cloneRepo: gitState.cloneRepo,
}));

vi.mock("../../src/analyzers/index.js", () => ({
  analyzeRepo: analyzerState.analyzeRepo,
}));

vi.mock("../../src/commands/doctor.js", () => ({
  runDoctor: doctorState.runDoctor,
}));

import { runAddRepo } from "../../src/commands/add-repo.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-add-repo-test-"));
  tempDirs.push(dir);
  return dir;
}

async function writeSeededConfig(cwd: string): Promise<void> {
  const bbgDir = join(cwd, ".bbg");
  await mkdir(bbgDir, { recursive: true });
  await mkdir(join(cwd, "existing-repo"), { recursive: true });

  const config = {
    version: "0.1.0",
    projectName: "bbg-project",
    projectDescription: "test workspace",
    createdAt: "2026-03-29T00:00:00.000Z",
    updatedAt: "2026-03-29T00:00:00.000Z",
    repos: [
      {
        name: "existing-repo",
        gitUrl: "https://example.com/existing-repo.git",
        branch: "main",
        type: "backend",
        stack: {
          language: "typescript",
          framework: "node",
          buildTool: "npm",
          testFramework: "vitest",
          packageManager: "npm",
        },
        description: "already registered",
      },
    ],
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
  };

  await mkdir(join(cwd, ".bbg"), { recursive: true });
  await mkdir(join(cwd, ".githooks"), { recursive: true });
  await mkdir(join(cwd, "docs", "workflows"), { recursive: true });
  await mkdir(join(cwd, "docs", "architecture"), { recursive: true });

  await Promise.all([
    import("../../src/utils/fs.js").then(({ writeTextFile }) =>
      writeTextFile(join(cwd, ".bbg", "config.json"), `${JSON.stringify(config, null, 2)}\n`),
    ),
    import("../../src/utils/fs.js").then(({ writeTextFile }) =>
      writeTextFile(join(cwd, ".bbg", "file-hashes.json"), "{}\n"),
    ),
    import("../../src/utils/fs.js").then(({ writeTextFile }) => writeTextFile(join(cwd, "AGENTS.md"), "seeded\n")),
    import("../../src/utils/fs.js").then(({ writeTextFile }) => writeTextFile(join(cwd, "README.md"), "seeded\n")),
    import("../../src/utils/fs.js").then(({ writeTextFile }) =>
      writeTextFile(join(cwd, "docs", "workflows", "code-review-policy.md"), "seeded\n"),
    ),
    import("../../src/utils/fs.js").then(({ writeTextFile }) =>
      writeTextFile(join(cwd, "docs", "architecture", "order-lifecycle.md"), "seeded\n"),
    ),
  ]);
}

describe("add-repo command", () => {
  beforeEach(() => {
    promptState.promptInput.mockReset();
    promptState.promptSelect.mockReset();
    promptState.promptConfirm.mockReset();
    gitState.listRemoteBranches.mockReset();
    gitState.cloneRepo.mockReset();
    analyzerState.analyzeRepo.mockReset();
    doctorState.runDoctor.mockReset();

    promptState.promptInput.mockResolvedValue("new repo description");
    promptState.promptSelect.mockResolvedValue("other");
    promptState.promptConfirm.mockResolvedValue(true);
    gitState.listRemoteBranches.mockResolvedValue({ branches: ["main", "develop"], credentials: null });
    gitState.cloneRepo.mockResolvedValue(undefined);
    analyzerState.analyzeRepo.mockResolvedValue({
      stack: {
        language: "typescript",
        framework: "react",
        buildTool: "vite",
        testFramework: "vitest",
        packageManager: "pnpm",
      },
      structure: [],
      deps: [],
      testing: {
        framework: "vitest",
        hasTestDir: true,
        testPattern: "*.test.ts",
      },
    });
    doctorState.runDoctor.mockResolvedValue({
      ok: true,
      mode: "full",
      checks: [],
    });
  });

  afterEach(async () => {
    const { rm } = await import("node:fs/promises");
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("adds repository, regenerates AGENTS files, updates config hashes, and runs doctor", async () => {
    const cwd = await makeTempDir();
    await writeSeededConfig(cwd);

    const result = await runAddRepo({
      cwd,
      url: "https://example.com/new-repo.git",
      branch: "main",
    });

    expect(result).toEqual({ addedRepoName: "new-repo" });

    const config = JSON.parse(await readFile(join(cwd, ".bbg", "config.json"), "utf8")) as {
      repos: Array<{ name: string; branch: string; type: string; description: string }>;
    };
    expect(config.repos).toHaveLength(2);
    expect(config.repos[1]).toEqual(
      expect.objectContaining({
        name: "new-repo",
        branch: "main",
        type: "other",
        description: "new repo description",
      }),
    );

    const rootAgents = await readFile(join(cwd, "AGENTS.md"), "utf8");
    const childAgents = await readFile(join(cwd, "new-repo", "AGENTS.md"), "utf8");
    expect(rootAgents).toContain("new-repo");
    expect(childAgents).toContain("# new-repo -- Agent Rules");

    const hashes = JSON.parse(await readFile(join(cwd, ".bbg", "file-hashes.json"), "utf8")) as Record<
      string,
      { generatedHash: string; generatedAt: string; templateVersion: string }
    >;

    expect(hashes["AGENTS.md"]?.generatedHash).toBeTruthy();
    expect(hashes["new-repo/AGENTS.md"]?.generatedHash).toBeTruthy();
    expect(hashes[".bbg/config.json"]?.generatedHash).toBeTruthy();
    expect(doctorState.runDoctor).toHaveBeenCalledWith({ cwd });
    expect(gitState.listRemoteBranches).toHaveBeenCalledWith("https://example.com/new-repo.git");
    expect(gitState.cloneRepo).toHaveBeenCalledWith({
      url: "https://example.com/new-repo.git",
      branch: "main",
      targetDir: join(cwd, "new-repo"),
      credentials: undefined,
    });
    const registration = JSON.parse(
      await readFile(join(cwd, ".bbg", "repos", "new-repo", "registration.json"), "utf8"),
    ) as { analyzeStatus: string; workspaceFusionStatus: string };
    expect(registration).toEqual(
      expect.objectContaining({
        analyzeStatus: "completed",
        workspaceFusionStatus: "completed",
      }),
    );
  });

  it("allows overriding detected stack fields before persisting", async () => {
    const cwd = await makeTempDir();
    await writeSeededConfig(cwd);

    promptState.promptConfirm.mockResolvedValueOnce(false);
    promptState.promptInput
      .mockResolvedValueOnce("typescript")
      .mockResolvedValueOnce("next")
      .mockResolvedValueOnce("turbopack")
      .mockResolvedValueOnce("vitest")
      .mockResolvedValueOnce("pnpm")
      .mockResolvedValueOnce("custom description");

    await runAddRepo({
      cwd,
      url: "https://example.com/new-repo.git",
      branch: "main",
    });

    const config = JSON.parse(await readFile(join(cwd, ".bbg", "config.json"), "utf8")) as {
      repos: Array<{
        name: string;
        stack: {
          language: string;
          framework: string;
          buildTool: string;
          testFramework: string;
          packageManager: string;
        };
      }>;
    };
    expect(config.repos[1]).toEqual(
      expect.objectContaining({
        name: "new-repo",
        stack: {
          language: "typescript",
          framework: "next",
          buildTool: "turbopack",
          testFramework: "vitest",
          packageManager: "pnpm",
        },
      }),
    );
    expect(promptState.promptConfirm).toHaveBeenCalledWith({
      message: "Use detected stack info?",
      default: true,
    });
  });

  it("rolls back config, templates, and hash file when doctor fails", async () => {
    const cwd = await makeTempDir();
    await writeSeededConfig(cwd);

    const beforeConfig = await readFile(join(cwd, ".bbg", "config.json"), "utf8");
    const beforeRootAgents = await readFile(join(cwd, "AGENTS.md"), "utf8");
    const beforeHashes = await readFile(join(cwd, ".bbg", "file-hashes.json"), "utf8");

    doctorState.runDoctor.mockResolvedValueOnce({
      ok: false,
      mode: "full",
      checks: [{ checkId: "x", severity: "error", passed: false, message: "boom" }],
    });

    await expect(
      runAddRepo({
        cwd,
        url: "https://example.com/new-repo.git",
        branch: "main",
      }),
    ).rejects.toThrow("add-repo validation failed");

    const afterConfig = await readFile(join(cwd, ".bbg", "config.json"), "utf8");
    const afterRootAgents = await readFile(join(cwd, "AGENTS.md"), "utf8");
    const afterHashes = await readFile(join(cwd, ".bbg", "file-hashes.json"), "utf8");

    expect(afterConfig).toBe(beforeConfig);
    expect(afterRootAgents).toBe(beforeRootAgents);
    expect(afterHashes).toBe(beforeHashes);
    await expect(access(join(cwd, "new-repo", "AGENTS.md"))).rejects.toThrow();
  });

  it("removes cloned repository directory on failure after clone", async () => {
    const cwd = await makeTempDir();
    await writeSeededConfig(cwd);

    gitState.cloneRepo.mockImplementationOnce(async ({ targetDir }: { targetDir: string }) => {
      await mkdir(targetDir, { recursive: true });
    });
    doctorState.runDoctor.mockResolvedValueOnce({
      ok: false,
      mode: "full",
      checks: [{ checkId: "x", severity: "error", passed: false, message: "boom" }],
    });

    await expect(
      runAddRepo({
        cwd,
        url: "https://example.com/new-repo.git",
        branch: "main",
      }),
    ).rejects.toThrow("add-repo validation failed");

    await expect(access(join(cwd, "new-repo"))).rejects.toThrow();
  });

  it("normalizes SCP-style git URL to basename repo name", async () => {
    const cwd = await makeTempDir();
    await writeSeededConfig(cwd);

    const result = await runAddRepo({
      cwd,
      url: "git@host:group/repo.git",
      branch: "main",
    });

    expect(result).toEqual({ addedRepoName: "repo" });
    expect(gitState.listRemoteBranches).toHaveBeenCalledWith("git@host:group/repo.git");
    expect(gitState.cloneRepo).toHaveBeenCalledWith({
      url: "git@host:group/repo.git",
      branch: "main",
      targetDir: join(cwd, "repo"),
      credentials: undefined,
    });

    const config = JSON.parse(await readFile(join(cwd, ".bbg", "config.json"), "utf8")) as {
      repos: Array<{ name: string }>;
    };
    expect(config.repos.some((repo) => repo.name === "repo")).toBe(true);
  });
});
