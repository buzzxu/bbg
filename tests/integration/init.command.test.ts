import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const promptState = vi.hoisted(() => ({
  promptInput: vi.fn(),
  promptConfirm: vi.fn(),
  promptSelect: vi.fn(),
}));

const gitState = vi.hoisted(() => ({
  ensureGitAvailable: vi.fn(),
  listRemoteBranches: vi.fn(),
  cloneRepo: vi.fn(),
}));

const analyzerState = vi.hoisted(() => ({
  analyzeRepo: vi.fn(),
}));

const doctorState = vi.hoisted(() => ({
  runDoctor: vi.fn(),
}));

const runtimePathState = vi.hoisted(() => ({
  overridePaths: undefined as
    | undefined
    | (() => {
        telemetry: string;
        evaluation: string;
        policy: string;
        repoMap: string;
        sessionHistory: string;
      }),
}));

vi.mock("../../src/utils/prompts.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/utils/prompts.js")>();
  return {
    promptInput: promptState.promptInput,
    promptConfirm: promptState.promptConfirm,
    promptSelect: promptState.promptSelect,
    sanitizePromptValue: actual.sanitizePromptValue,
    collectStackInfo: async (detectedStack: Record<string, string>) => {
      const useDetected = await promptState.promptConfirm({ message: "Use detected stack info?", default: true });
      if (useDetected) return detectedStack;
      return {
        language: actual.sanitizePromptValue(await promptState.promptInput({ message: "Stack language", default: detectedStack.language }), detectedStack.language),
        framework: actual.sanitizePromptValue(await promptState.promptInput({ message: "Stack framework", default: detectedStack.framework }), detectedStack.framework),
        buildTool: actual.sanitizePromptValue(await promptState.promptInput({ message: "Stack build tool", default: detectedStack.buildTool }), detectedStack.buildTool),
        testFramework: actual.sanitizePromptValue(await promptState.promptInput({ message: "Stack test framework", default: detectedStack.testFramework }), detectedStack.testFramework),
        packageManager: actual.sanitizePromptValue(await promptState.promptInput({ message: "Stack package manager", default: detectedStack.packageManager }), detectedStack.packageManager),
      };
    },
  };
});

vi.mock("../../src/utils/git.js", () => ({
  ensureGitAvailable: gitState.ensureGitAvailable,
  listRemoteBranches: gitState.listRemoteBranches,
  cloneRepo: gitState.cloneRepo,
}));

vi.mock("../../src/analyzers/index.js", () => ({
  analyzeRepo: analyzerState.analyzeRepo,
}));

vi.mock("../../src/commands/doctor.js", () => ({
  runDoctor: doctorState.runDoctor,
}));

vi.mock("../../src/runtime/paths.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/runtime/paths.js")>();
  return {
    resolveRuntimePaths: (cwd: string, runtime: Parameters<typeof actual.resolveRuntimePaths>[1]) =>
      runtimePathState.overridePaths?.() ?? actual.resolveRuntimePaths(cwd, runtime),
  };
});

import { runInit } from "../../src/commands/init.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-init-test-"));
  tempDirs.push(dir);
  return dir;
}

describe("init command", () => {
  beforeEach(() => {
    promptState.promptInput.mockReset();
    promptState.promptConfirm.mockReset();
    promptState.promptSelect.mockReset();
    gitState.ensureGitAvailable.mockReset();
    gitState.listRemoteBranches.mockReset();
    gitState.cloneRepo.mockReset();
    analyzerState.analyzeRepo.mockReset();
    doctorState.runDoctor.mockReset();
    runtimePathState.overridePaths = undefined;

    promptState.promptInput.mockResolvedValue("ignored");
    promptState.promptConfirm.mockResolvedValue(false);
    promptState.promptSelect.mockResolvedValue("other");
    gitState.ensureGitAvailable.mockResolvedValue(undefined);
    gitState.listRemoteBranches.mockResolvedValue({ branches: ["main"], credentials: null });
    gitState.cloneRepo.mockResolvedValue(undefined);
    analyzerState.analyzeRepo.mockResolvedValue({
      stack: {
        language: "typescript",
        framework: "react",
        buildTool: "npm",
        testFramework: "vitest",
        packageManager: "npm",
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
      checks: [{ checkId: "config-shape", severity: "error", passed: true, message: "ok" }],
    });
  });

  afterEach(async () => {
    const { rm } = await import("node:fs/promises");
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("creates baseline config/root files and doctor summary", async () => {
    const cwd = await makeTempDir();

    const result = await runInit({ cwd, yes: true, dryRun: false });

    expect(result.createdFiles).toContain(join(cwd, ".bbg", "config.json"));
    expect(result.createdFiles).toContain(join(cwd, ".bbg", "file-hashes.json"));
    expect(result.createdFiles).toContain(join(cwd, ".bbg", "sessions", "history.json"));
    expect(result.createdFiles).toContain(join(cwd, ".bbg", "context", "repo-map.json"));
    expect(result.createdFiles).toContain(join(cwd, ".gitignore"));
    expect(result.createdFiles).toContain(join(cwd, "AGENTS.md"));
    expect(result.createdFiles).toContain(join(cwd, "README.md"));
    expect(result.createdFiles).toContain(join(cwd, "docs", "workflows", "code-review-policy.md"));
    expect(result.createdFiles).toContain(join(cwd, "docs", "architecture", "order-lifecycle.md"));
    expect(result.createdFiles).toContain(join(cwd, "docs", "workflows", "development-standards.md"));
    expect(result.createdFiles).toContain(join(cwd, "scripts", "doctor.py"));
    expect(result.createdFiles).toContain(join(cwd, ".githooks", "pre-commit"));

    const configText = await readFile(join(cwd, ".bbg", "config.json"), "utf8");
    const config = JSON.parse(configText) as {
      governance: {
        riskThresholds: {
          high: { grade: string; minScore: number };
          medium: { grade: string; minScore: number };
          low: { grade: string; minScore: number };
        };
        enableRedTeam: boolean;
        enableCrossAudit: boolean;
      };
      runtime: {
        telemetry: { enabled: boolean; file: string };
        evaluation: { enabled: boolean; file: string };
        policy: { enabled: boolean; file: string };
        context: {
          enabled: boolean;
          repoMapFile: string;
          sessionHistoryFile: string;
        };
      };
    };

    expect(config.governance.riskThresholds).toEqual({
      high: { grade: "A+", minScore: 99 },
      medium: { grade: "A", minScore: 95 },
      low: { grade: "B", minScore: 85 },
    });
    expect(config.governance.enableRedTeam).toBe(true);
    expect(config.governance.enableCrossAudit).toBe(true);
    expect(config.runtime).toEqual({
      telemetry: {
        enabled: false,
        file: ".bbg/telemetry/events.json",
      },
      evaluation: {
        enabled: true,
        file: ".bbg/evaluations/history.json",
      },
      policy: {
        enabled: true,
        file: ".bbg/policy/decisions.json",
      },
      context: {
        enabled: true,
        repoMapFile: ".bbg/context/repo-map.json",
        sessionHistoryFile: ".bbg/sessions/history.json",
      },
    });

    expect(JSON.parse(await readFile(join(cwd, ".bbg", "sessions", "history.json"), "utf8"))).toEqual({
      version: 1,
      sessions: [],
    });
    expect(JSON.parse(await readFile(join(cwd, ".bbg", "context", "repo-map.json"), "utf8"))).toEqual({
      version: 1,
      repos: [],
    });

    expect(promptState.promptInput).not.toHaveBeenCalled();
    expect(promptState.promptConfirm).not.toHaveBeenCalled();
    expect(promptState.promptSelect).not.toHaveBeenCalled();

    const gitignoreText = await readFile(join(cwd, ".gitignore"), "utf8");
    expect(gitignoreText).not.toContain("poster-project/");
    expect(gitignoreText).not.toContain("poster-admin-web/");
    expect(gitignoreText).not.toContain("mxbc-poster-h5/");

    const hashRecord = JSON.parse(await readFile(join(cwd, ".bbg", "file-hashes.json"), "utf8")) as Record<
      string,
      { generatedHash: string }
    >;
    expect(Object.keys(hashRecord)).toContain(".bbg/config.json");
    expect(Object.keys(hashRecord)).toContain("AGENTS.md");
    expect(Object.keys(hashRecord)).toContain("README.md");
    expect(Object.keys(hashRecord)).toContain("docs/architecture/order-lifecycle.md");
    expect(Object.keys(hashRecord)).not.toContain(".bbg/file-hashes.json");

    for (const key of Object.keys(hashRecord)) {
      expect(key.startsWith(cwd)).toBe(false);
    }

    for (const key of Object.keys(hashRecord)) {
      const snapshotPath = join(cwd, ".bbg", "generated-snapshots", `${key}.gen`);
      const generatedPath = join(cwd, key);
      const snapshotContent = await readFile(snapshotPath, "utf8");
      const generatedContent = await readFile(generatedPath, "utf8");
      expect(snapshotContent).toBe(generatedContent);
    }

    await expect(readFile(join(cwd, ".bbg", "generated-snapshots", ".bbg", "file-hashes.json.gen"), "utf8")).rejects.toThrow();

    if (process.platform !== "win32") {
      const preCommitMode = (await stat(join(cwd, ".githooks", "pre-commit"))).mode;
      const prePushMode = (await stat(join(cwd, ".githooks", "pre-push"))).mode;
      expect(preCommitMode & 0o111).toBeGreaterThan(0);
      expect(prePushMode & 0o111).toBeGreaterThan(0);
    }

    expect(result.clonedRepos).toEqual([]);
    expect(result.doctor.ok).toBe(true);
    expect(result.doctor.mode).toBe("full");
    expect(doctorState.runDoctor).toHaveBeenCalledTimes(1);
    expect(doctorState.runDoctor).toHaveBeenCalledWith({ cwd });
  });

  it("returns planned files without writing in dry-run mode", async () => {
    const cwd = await makeTempDir();

    const result = await runInit({ cwd, yes: true, dryRun: true });

    expect(result.createdFiles).toEqual(
      expect.arrayContaining([
        join(cwd, ".bbg", "config.json"),
        join(cwd, ".bbg", "file-hashes.json"),
        join(cwd, ".bbg", "sessions", "history.json"),
        join(cwd, ".bbg", "context", "repo-map.json"),
        join(cwd, ".gitignore"),
        join(cwd, "AGENTS.md"),
        join(cwd, "README.md"),
        join(cwd, "docs", "workflows", "code-review-policy.md"),
        join(cwd, "docs", "workflows", "cross-audit-policy.md"),
        join(cwd, "docs", "workflows", "harness-engineering-playbook.md"),
        join(cwd, "docs", "workflows", "ai-task-prompt-template.md"),
        join(cwd, "docs", "workflows", "requirement-template.md"),
        join(cwd, "docs", "workflows", "regression-checklist.md"),
        join(cwd, "docs", "tasks", "TEMPLATE.md"),
        join(cwd, "docs", "changes", "TEMPLATE.md"),
        join(cwd, "docs", "handoffs", "TEMPLATE.md"),
        join(cwd, "docs", "reports", "cross-audit-report-TEMPLATE.md"),
        join(cwd, "docs", "cleanup", "secrets-and-config-governance.md"),
        join(cwd, "docs", "environments", "env-overview.md"),
        join(cwd, "docs", "architecture", "order-lifecycle.md"),
        join(cwd, "docs", "system-architecture-and-ai-workflow.md"),
        join(cwd, "docs", "workflows", "development-standards.md"),
        join(cwd, "docs", "workflows", "release-checklist.md"),
        join(cwd, ".githooks", "pre-commit"),
        join(cwd, ".githooks", "pre-push"),
        join(cwd, "scripts", "doctor.py"),
        join(cwd, "scripts", "sync_versions.py"),
      ]),
    );

    await expect(stat(join(cwd, ".bbg"))).rejects.toThrow();
    await expect(stat(join(cwd, "AGENTS.md"))).rejects.toThrow();
    await expect(stat(join(cwd, "README.md"))).rejects.toThrow();
    await expect(stat(join(cwd, ".gitignore"))).rejects.toThrow();

    expect(promptState.promptInput).not.toHaveBeenCalled();
    expect(promptState.promptConfirm).not.toHaveBeenCalled();
    expect(promptState.promptSelect).not.toHaveBeenCalled();
    expect(doctorState.runDoctor).not.toHaveBeenCalled();
  });

  it("dry-run includes planned child AGENTS files for planned repositories", async () => {
    const cwd = await makeTempDir();

    promptState.promptInput
      .mockResolvedValueOnce("custom-project")
      .mockResolvedValueOnce("custom description")
      .mockResolvedValueOnce("https://example.com/repo-a.git")
      .mockResolvedValueOnce("repo-a description");

    promptState.promptConfirm
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    promptState.promptSelect
      .mockResolvedValueOnce("main")
      .mockResolvedValueOnce("backend");

    const result = await runInit({ cwd, yes: false, dryRun: true });

    expect(result.createdFiles).toContain(join(cwd, "repo-a", "AGENTS.md"));
    expect(gitState.cloneRepo).not.toHaveBeenCalled();
    expect(analyzerState.analyzeRepo).not.toHaveBeenCalled();
    expect(doctorState.runDoctor).not.toHaveBeenCalled();
    await expect(stat(join(cwd, ".bbg"))).rejects.toThrow();
  });

  it("reports only the runtime files init writes", async () => {
    const cwd = await makeTempDir();

    runtimePathState.overridePaths = () => ({
      telemetry: join(cwd, ".bbg", "telemetry", "events.json"),
      evaluation: join(cwd, ".bbg", "custom", "history.json"),
      policy: join(cwd, ".bbg", "custom", "repo-map.json"),
      repoMap: join(cwd, ".bbg", "context", "repo-map.json"),
      sessionHistory: join(cwd, ".bbg", "sessions", "history.json"),
    });

    const result = await runInit({ cwd, yes: true, dryRun: false });

    expect(result.createdFiles).toContain(join(cwd, ".bbg", "sessions", "history.json"));
    expect(result.createdFiles).toContain(join(cwd, ".bbg", "context", "repo-map.json"));
    expect(result.createdFiles).not.toContain(join(cwd, ".bbg", "custom", "history.json"));
    expect(result.createdFiles).not.toContain(join(cwd, ".bbg", "custom", "repo-map.json"));
  });

  it("rejects init when .bbg already exists with upgrade hint", async () => {
    const cwd = await makeTempDir();
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(cwd, ".bbg"), { recursive: true });

    await expect(runInit({ cwd, yes: true, dryRun: false })).rejects.toThrow(
      "Initialization aborted: .bbg already exists. Run `bbg upgrade` to refresh generated files.",
    );
  });

  it("runs full prompt loop for repos and governance when yes is false", async () => {
    const cwd = await makeTempDir();

    promptState.promptInput
      .mockResolvedValueOnce("custom-project")
      .mockResolvedValueOnce("custom description")
      .mockResolvedValueOnce("https://example.com/repo-a.git")
      .mockResolvedValueOnce("repo-a description")
      .mockResolvedValueOnce("A+:98")
      .mockResolvedValueOnce("A:94")
      .mockResolvedValueOnce("B:84");

    promptState.promptConfirm
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    promptState.promptSelect
      .mockResolvedValueOnce("main")
      .mockResolvedValueOnce("backend");

    gitState.listRemoteBranches.mockResolvedValue({ branches: ["main", "develop"], credentials: null });

    analyzerState.analyzeRepo.mockResolvedValue({
      stack: {
        language: "java",
        framework: "spring-boot",
        buildTool: "maven",
        testFramework: "junit",
        packageManager: "maven",
      },
      structure: ["has-src-main-java"],
      deps: ["spring-boot-starter-web"],
      testing: {
        framework: "junit",
        hasTestDir: true,
        testPattern: "src/test/**",
      },
    });

    const result = await runInit({ cwd, yes: false, dryRun: false });

    expect(promptState.promptInput).toHaveBeenCalledTimes(7);
    expect(promptState.promptInput).toHaveBeenNthCalledWith(1, {
      message: "Project name",
      default: "bbg-project",
    });
    expect(promptState.promptInput).toHaveBeenNthCalledWith(2, {
      message: "Project description",
      default: "Generated by bbg init",
    });
    expect(promptState.promptInput).toHaveBeenNthCalledWith(3, {
      message: "Repository git URL",
    });
    expect(promptState.promptInput).toHaveBeenNthCalledWith(4, {
      message: "Repository description",
      default: "",
    });
    expect(promptState.promptInput).toHaveBeenNthCalledWith(5, {
      message: "High risk threshold (GRADE:score)",
      default: "A+:99",
    });
    expect(promptState.promptInput).toHaveBeenNthCalledWith(6, {
      message: "Medium risk threshold (GRADE:score)",
      default: "A:95",
    });
    expect(promptState.promptInput).toHaveBeenNthCalledWith(7, {
      message: "Low risk threshold (GRADE:score)",
      default: "B:85",
    });

    expect(promptState.promptConfirm).toHaveBeenCalledTimes(6);
    expect(promptState.promptConfirm).toHaveBeenNthCalledWith(1, {
      message: "Add repository now?",
      default: true,
    });
    expect(promptState.promptConfirm).toHaveBeenNthCalledWith(2, {
      message: "Use detected stack info?",
      default: true,
    });
    expect(promptState.promptConfirm).toHaveBeenNthCalledWith(3, {
      message: "Add another repository?",
      default: false,
    });
    expect(promptState.promptConfirm).toHaveBeenNthCalledWith(4, {
      message: "Override default governance risk thresholds?",
      default: false,
    });
    expect(promptState.promptConfirm).toHaveBeenNthCalledWith(5, {
      message: "Enable red-team workflow?",
      default: true,
    });
    expect(promptState.promptConfirm).toHaveBeenNthCalledWith(6, {
      message: "Enable cross-audit workflow?",
      default: true,
    });

    expect(promptState.promptSelect).toHaveBeenCalledTimes(2);
    expect(promptState.promptSelect).toHaveBeenNthCalledWith(1, {
      message: "Select default branch",
      choices: [
        { name: "main", value: "main" },
        { name: "develop", value: "develop" },
      ],
      default: "main",
    });
    expect(promptState.promptSelect).toHaveBeenNthCalledWith(2, {
      message: "Repository type",
      choices: [
        { name: "backend", value: "backend" },
        { name: "frontend-pc", value: "frontend-pc" },
        { name: "frontend-h5", value: "frontend-h5" },
        { name: "frontend-web", value: "frontend-web" },
        { name: "other", value: "other" },
      ],
      default: "other",
    });

    expect(gitState.listRemoteBranches).toHaveBeenCalledTimes(1);
    expect(gitState.listRemoteBranches).toHaveBeenCalledWith("https://example.com/repo-a.git");
    expect(gitState.cloneRepo).toHaveBeenCalledTimes(1);
    expect(gitState.cloneRepo).toHaveBeenCalledWith({
      url: "https://example.com/repo-a.git",
      branch: "main",
      targetDir: join(cwd, "repo-a"),
    });
    expect(analyzerState.analyzeRepo).toHaveBeenCalledTimes(1);
    expect(analyzerState.analyzeRepo).toHaveBeenCalledWith(join(cwd, "repo-a"));

    const configText = await readFile(join(cwd, ".bbg", "config.json"), "utf8");
    const config = JSON.parse(configText) as {
      projectName: string;
      projectDescription: string;
      repos: Array<{
        name: string;
        gitUrl: string;
        branch: string;
        type: string;
        description: string;
        stack: { language: string; framework: string };
      }>;
      governance: {
        riskThresholds: {
          high: { grade: string; minScore: number };
          medium: { grade: string; minScore: number };
          low: { grade: string; minScore: number };
        };
        enableRedTeam: boolean;
        enableCrossAudit: boolean;
      };
      runtime: {
        context: {
          repoMapFile: string;
          sessionHistoryFile: string;
        };
      };
    };

    expect(config.projectName).toBe("custom-project");
    expect(config.projectDescription).toBe("custom description");
    expect(config.repos).toEqual([
      {
        name: "repo-a",
        gitUrl: "https://example.com/repo-a.git",
        branch: "main",
        type: "backend",
        description: "repo-a description",
        stack: {
          language: "java",
          framework: "spring-boot",
          buildTool: "maven",
          testFramework: "junit",
          packageManager: "maven",
        },
      },
    ]);
    expect(config.governance.riskThresholds).toEqual({
      high: { grade: "A+", minScore: 98 },
      medium: { grade: "A", minScore: 94 },
      low: { grade: "B", minScore: 84 },
    });
    expect(config.governance.enableRedTeam).toBe(false);
    expect(config.governance.enableCrossAudit).toBe(true);
    expect(config.runtime.context).toEqual({
      enabled: true,
      repoMapFile: ".bbg/context/repo-map.json",
      sessionHistoryFile: ".bbg/sessions/history.json",
    });

    expect(result.clonedRepos).toEqual([join(cwd, "repo-a")]);

    const childAgents = await readFile(join(cwd, "repo-a", "AGENTS.md"), "utf8");
    expect(childAgents).toContain("# repo-a -- Agent Rules");
    expect(childAgents).toContain("**Type:** backend");
    expect(childAgents).toContain("**Description:** repo-a description");

    const gitignoreText = await readFile(join(cwd, ".gitignore"), "utf8");
    expect(gitignoreText).toContain("repo-a/");
  });

  it("rejects invalid repository URL before remote branch lookup", async () => {
    const cwd = await makeTempDir();

    promptState.promptInput
      .mockResolvedValueOnce("custom-project")
      .mockResolvedValueOnce("custom description")
      .mockResolvedValueOnce("not-a-git-url");

    promptState.promptConfirm.mockResolvedValueOnce(true);

    await expect(runInit({ cwd, yes: false, dryRun: false })).rejects.toThrow("Repository git URL is invalid");
    expect(gitState.listRemoteBranches).not.toHaveBeenCalled();
  });

  it("fails early when git is unavailable before remote operations", async () => {
    const cwd = await makeTempDir();
    const gitUnavailableError = new Error("spawn git ENOENT");
    gitState.ensureGitAvailable.mockRejectedValue(gitUnavailableError);

    await expect(runInit({ cwd, yes: false, dryRun: false })).rejects.toThrow("spawn git ENOENT");

    expect(gitState.ensureGitAvailable).toHaveBeenCalledTimes(1);
    expect(gitState.listRemoteBranches).not.toHaveBeenCalled();
    expect(gitState.cloneRepo).not.toHaveBeenCalled();
  });

  it("allows overriding detected stack info before saving repo", async () => {
    const cwd = await makeTempDir();

    promptState.promptInput
      .mockResolvedValueOnce("custom-project")
      .mockResolvedValueOnce("custom description")
      .mockResolvedValueOnce("https://example.com/repo-a.git")
      .mockResolvedValueOnce("python")
      .mockResolvedValueOnce("django")
      .mockResolvedValueOnce("poetry")
      .mockResolvedValueOnce("pytest")
      .mockResolvedValueOnce("pip")
      .mockResolvedValueOnce("repo-a description");

    promptState.promptConfirm
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    promptState.promptSelect
      .mockResolvedValueOnce("main")
      .mockResolvedValueOnce("backend");

    await runInit({ cwd, yes: false, dryRun: false });

    const configText = await readFile(join(cwd, ".bbg", "config.json"), "utf8");
    const config = JSON.parse(configText) as {
      repos: Array<{
        stack: {
          language: string;
          framework: string;
          buildTool: string;
          testFramework: string;
          packageManager: string;
        };
      }>;
    };

    expect(config.repos[0]?.stack).toEqual({
      language: "python",
      framework: "django",
      buildTool: "poetry",
      testFramework: "pytest",
      packageManager: "pip",
    });
  });
});
