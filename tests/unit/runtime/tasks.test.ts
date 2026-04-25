import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readTextFile, writeTextFile } from "../../../src/utils/fs.js";

const tempDirs: string[] = [];

const workflowState = vi.hoisted(() => ({ runWorkflowCommand: vi.fn() }));
const taskEnvState = vi.hoisted(() => ({ runTaskEnvCommand: vi.fn() }));
const observeState = vi.hoisted(() => ({ runObserveCommand: vi.fn() }));
const hermesState = vi.hoisted(() => ({ runHermesCommand: vi.fn() }));
const runnerState = vi.hoisted(() => ({ launchConfiguredAgentRunner: vi.fn() }));

vi.mock("../../../src/commands/workflow.js", () => ({
  runWorkflowCommand: workflowState.runWorkflowCommand,
}));
vi.mock("../../../src/commands/task-env.js", () => ({
  runTaskEnvCommand: taskEnvState.runTaskEnvCommand,
}));
vi.mock("../../../src/commands/observe.js", () => ({
  runObserveCommand: observeState.runObserveCommand,
}));
vi.mock("../../../src/commands/hermes.js", () => ({
  runHermesCommand: hermesState.runHermesCommand,
}));
vi.mock("../../../src/runtime/agent-runner.js", () => ({
  launchConfiguredAgentRunner: runnerState.launchConfiguredAgentRunner,
}));

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-tasks-runtime-"));
  tempDirs.push(dir);
  return dir;
}

async function initializeWorkspace(cwd: string): Promise<void> {
  await writeTextFile(
    join(cwd, ".bbg", "config.json"),
    JSON.stringify({
      version: "1.0.0",
      projectName: "demo",
      projectDescription: "demo project",
      createdAt: "2026-04-17T16:00:00.000Z",
      updatedAt: "2026-04-17T16:00:00.000Z",
      repos: [
        {
          name: "app",
          gitUrl: "git@example.com:demo/app.git",
          branch: "main",
          type: "backend",
          stack: {
            language: "typescript",
            framework: "node",
            buildTool: "npm",
            testFramework: "vitest",
            packageManager: "npm",
          },
          description: "demo app",
        },
      ],
      governance: {
        riskThresholds: {
          high: { grade: "A", minScore: 90 },
          medium: { grade: "B", minScore: 75 },
          low: { grade: "C", minScore: 60 },
        },
        enableRedTeam: false,
        enableCrossAudit: false,
      },
      context: {},
    }),
  );
  await writeTextFile(join(cwd, "docs", "architecture", "languages", "README.md"), "# Language Guides\n");
  await writeTextFile(
    join(cwd, "docs", "architecture", "languages", "typescript", "application-patterns.md"),
    "# TypeScript Application Patterns\n",
  );
  await writeTextFile(
    join(cwd, "docs", "architecture", "languages", "typescript", "type-boundaries.md"),
    "# TypeScript Type Boundaries\n",
  );
  await writeTextFile(
    join(cwd, "docs", "architecture", "languages", "typescript", "testing-and-runtime-boundaries.md"),
    "# TypeScript Testing and Runtime Boundaries\n",
  );
}

describe("tasks runtime", () => {
  beforeEach(() => {
    delete process.env.BBG_CURRENT_TOOL;
    delete process.env.CODEX_THREAD_ID;
    delete process.env.CODEX_CI;
    delete process.env.CODEX_MANAGED_BY_NPM;
    delete process.env.CODEX_SANDBOX;
    delete process.env.CODEX_SANDBOX_NETWORK_DISABLED;

    vi.resetModules();
    workflowState.runWorkflowCommand.mockReset();
    taskEnvState.runTaskEnvCommand.mockReset();
    observeState.runObserveCommand.mockReset();
    hermesState.runHermesCommand.mockReset();
    runnerState.launchConfiguredAgentRunner.mockReset();

    workflowState.runWorkflowCommand.mockResolvedValue({
      kind: "plan",
      task: "Fix checkout timeout",
      commandSpecPath: ".bbg/harness/commands/plan.md",
      summary: "Plan the fix from canonical guidance.",
      references: ["AGENTS.md", "RULES.md"],
      hermesRecommendations: ["If similar work exists, consult Hermes first."],
      decisions: {
        taskEnv: { decision: "required", reasons: ["debug-or-stabilization-task"] },
        observe: { decision: "required", reasons: ["runtime-evidence-useful"] },
        tdd: { decision: "required", reasons: ["testing-or-regression-signal"] },
        security: { decision: "not-required", reasons: [] },
        loop: { decision: "optional", reasons: ["runtime-checks-may-repeat"] },
        hermesQuery: { decision: "recommended", reasons: ["plan-benefits-from-local-history"] },
      },
      nextActions: ["implement", "add-tests", "verify"],
    });
    taskEnvState.runTaskEnvCommand.mockResolvedValue({
      mode: "start",
      env: {
        version: 1,
        id: "fix-checkout-timeout",
        task: "Fix checkout timeout",
        slug: "fix-checkout-timeout",
        createdAt: "2026-04-17T16:00:00.000Z",
        updatedAt: "2026-04-17T16:00:00.000Z",
        gitRoot: ".",
        baseRef: "HEAD",
        worktreePath: ".bbg/task-envs/fix-checkout-timeout/worktree",
        artifactRoot: ".bbg/task-envs/fix-checkout-timeout/artifacts",
        uiArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/ui",
        logArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/logs",
        metricArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/metrics",
        traceArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/traces",
        notesPath: ".bbg/task-envs/fix-checkout-timeout/notes.md",
        status: "active",
      },
    });
    observeState.runObserveCommand.mockResolvedValue({
      mode: "start",
      session: {
        version: 1,
        id: "fix-checkout-timeout",
        topic: "Fix checkout timeout",
        createdAt: "2026-04-17T16:00:00.000Z",
        updatedAt: "2026-04-17T16:00:00.000Z",
        envId: "fix-checkout-timeout",
        rootPath: ".bbg/task-envs/fix-checkout-timeout/artifacts",
        uiArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/ui",
        logArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/logs",
        metricArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/metrics",
        traceArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/traces",
        notesPath: ".bbg/task-envs/fix-checkout-timeout/observations/fix-checkout-timeout/notes.md",
      },
    });
    hermesState.runHermesCommand.mockResolvedValue({
      kind: "query",
      topic: "Fix checkout timeout",
      commandSpecPath: ".bbg/harness/commands/hermes-query.md",
      summary: "Check similar incidents in Hermes.",
      references: [".bbg/harness/commands/hermes-query.md"],
    });
    runnerState.launchConfiguredAgentRunner.mockResolvedValue(null);
  });

  afterEach(async () => {
    delete process.env.BBG_CURRENT_TOOL;
    delete process.env.CODEX_THREAD_ID;
    delete process.env.CODEX_CI;
    delete process.env.CODEX_MANAGED_BY_NPM;
    delete process.env.CODEX_SANDBOX;
    delete process.env.CODEX_SANDBOX_NETWORK_DISABLED;
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("creates task session artifacts and auto-runs low-risk preparation steps", { timeout: 20000 }, async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    process.env.BBG_CURRENT_TOOL = "claude";

    const { startTask, readTaskStatusSummary } = await import("../../../src/runtime/tasks.js");
    const result = await startTask(cwd, "Fix checkout timeout");

    expect(result.session.taskId).toBe("fix-checkout-timeout");
    expect(result.session.status).toBe("implementing");
    expect(result.session.tool).toBe("claude");
    expect(result.session.currentStep).toBe("implement");
    expect(result.session.attemptCount).toBe(1);
    expect(result.session.runner).toEqual({
      mode: "current",
      tool: "claude",
      launched: true,
      command: null,
      args: [],
      launchedAt: expect.any(String),
      lastAttemptAt: expect.any(String),
      lastLaunchError: null,
    });
    expect(result.session.taskEnvId).toBe("fix-checkout-timeout");
    expect(result.session.observeSessionIds).toEqual(["fix-checkout-timeout"]);
    expect(taskEnvState.runTaskEnvCommand).toHaveBeenCalledWith({
      cwd,
      mode: "start",
      task: "Fix checkout timeout",
    });
    expect(observeState.runObserveCommand).toHaveBeenCalledWith({
      cwd,
      mode: "start",
      topic: "Fix checkout timeout",
      envId: "fix-checkout-timeout",
    });
    expect(hermesState.runHermesCommand).toHaveBeenCalledWith({
      cwd,
      kind: "query",
      topic: "Fix checkout timeout",
    });
    expect(result.context.hermesQuery).toEqual({
      executed: true,
      topic: "Fix checkout timeout",
      summary: "Check similar incidents in Hermes.",
      commandSpecPath: ".bbg/harness/commands/hermes-query.md",
      references: [".bbg/harness/commands/hermes-query.md"],
      strategy: "default",
      influencedWorkflow: true,
      influencedRecovery: false,
      influencedVerification: false,
    });
    expect(result.context.references).toEqual(
      expect.arrayContaining([
        "AGENTS.md",
        "RULES.md",
        "docs/architecture/languages/README.md",
        "docs/architecture/languages/typescript/application-patterns.md",
        "docs/wiki/index.md",
        "docs/wiki/concepts/fix-checkout-timeout.md",
      ]),
    );
    expect(result.context.languageGuidance).toEqual({
      languages: ["typescript"],
      guideReferences: [
        "docs/architecture/languages/README.md",
        "docs/architecture/languages/typescript/application-patterns.md",
        "docs/architecture/languages/typescript/type-boundaries.md",
        "docs/architecture/languages/typescript/testing-and-runtime-boundaries.md",
      ],
      reviewerAgents: ["typescript-reviewer"],
      reviewHint: "Prefer typescript-reviewer for language-specific design and implementation review.",
    });
    expect(result.context.executionRoute).toEqual({
      classification: {
        domain: "debugging",
        complexity: "simple",
        context: "medium",
        targetCommand: null,
        languages: ["typescript"],
      },
      recommendation: {
        profileClass: "balanced",
        reason:
          "debugging work with simple complexity and medium context fits the balanced execution profile. Language focus: typescript.",
        telemetryNote: "No local telemetry feedback available.",
        reviewerAgents: ["typescript-reviewer"],
        guideReferences: [
          "docs/architecture/languages/README.md",
          "docs/architecture/languages/typescript/application-patterns.md",
          "docs/architecture/languages/typescript/type-boundaries.md",
          "docs/architecture/languages/typescript/testing-and-runtime-boundaries.md",
        ],
      },
    });
    expect(result.context.reviewGate).toEqual({
      level: "recommended",
      reviewers: ["typescript-reviewer"],
      guideReferences: [
        "docs/architecture/languages/README.md",
        "docs/architecture/languages/typescript/application-patterns.md",
        "docs/architecture/languages/typescript/type-boundaries.md",
        "docs/architecture/languages/typescript/testing-and-runtime-boundaries.md",
      ],
      reviewPack: ["type-boundaries", "runtime-validation", "module-ownership", "testing-boundaries"],
      stopConditions: [
        "public-api-contract-change",
        "shared-type-boundary-change",
        "runtime-validation-gap",
        "auth-or-permission-boundary-change",
      ],
      reason: "Language-specific review is recommended to preserve architecture and implementation quality.",
    });
    expect(result.context.taskState).toMatchObject({
      status: "implementing",
      currentStep: "implement",
      taskEnvId: "fix-checkout-timeout",
      observeSessionIds: ["fix-checkout-timeout"],
      nextActions: ["review-hermes-context", "implement", "add-tests", "verify"],
      lastVerification: null,
      lastRecoveryAction: null,
    });
    expect(result.context.recovery).toMatchObject({
      resumeStrategy: null,
      recoveryPlan: null,
    });

    const handoff = await readTextFile(join(cwd, result.handoffPath));
    expect(handoff).toContain("Task ID: fix-checkout-timeout");
    expect(handoff).toContain("## Task State");
    expect(handoff).toContain("- Status: implementing");
    expect(handoff).toContain("- Current Step: implement");
    expect(handoff).toContain("Task Environment: fix-checkout-timeout");
    expect(handoff).toContain("## Hermes Query");
    expect(handoff).toContain("- Executed: yes");
    expect(handoff).toContain("- Summary: Check similar incidents in Hermes.");
    expect(handoff).toContain("## Language Guidance");
    expect(handoff).toContain("- Languages: typescript");
    expect(handoff).toContain("- Reviewers: typescript-reviewer");
    expect(handoff).toContain("docs/architecture/languages/typescript/application-patterns.md");
    expect(handoff).toContain("## Execution Route");
    expect(handoff).toContain("- Profile Class: balanced");
    expect(handoff).toContain("- Route Reviewers: typescript-reviewer");
    expect(handoff).toContain("## Review Gate");
    expect(handoff).toContain("- Level: recommended");
    expect(handoff).toContain("- Reviewers: typescript-reviewer");
    expect(handoff).toContain("shared-type-boundary-change");
    const wikiConcept = await readTextFile(join(cwd, "docs", "wiki", "concepts", "fix-checkout-timeout.md"));
    expect(wikiConcept).toContain("# fix-checkout-timeout Task Knowledge");
    expect(wikiConcept).toContain("- Hermes Summary: Check similar incidents in Hermes.");

    const status = await readTaskStatusSummary(cwd);
    expect(status.tasks).toHaveLength(1);
    expect(status.tasks[0]?.taskId).toBe("fix-checkout-timeout");
  });

  it("derives impact guidance from analyze knowledge and elevates review gating", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    process.env.BBG_CURRENT_TOOL = "claude";

    await writeTextFile(
      join(cwd, ".bbg", "knowledge", "workspace", "capabilities.json"),
      JSON.stringify({
        capabilities: [
          {
            name: "checkout",
            description: "Checkout timeout recovery capability",
            owningRepos: ["app"],
            responsibilities: ["Handle checkout timeout retries"],
            evidence: { summary: "Derived from flow analysis.", signals: ["repo:app"] },
            confidence: 0.91,
          },
        ],
      }),
    );
    await writeTextFile(
      join(cwd, ".bbg", "knowledge", "workspace", "critical-flows.json"),
      JSON.stringify({
        flows: [
          {
            name: "flow-1",
            summary: "checkout timeout handling",
            participatingRepos: ["app"],
            participatingModules: ["app"],
            contracts: ["app HTTP/API contract surface"],
            failurePoints: ["checkout timeout pipeline"],
            steps: [],
            evidence: { summary: "Traced from checkout markers.", signals: ["repo:app", "flow:checkout-timeout"] },
            confidence: 0.84,
          },
        ],
      }),
    );
    await writeTextFile(
      join(cwd, ".bbg", "knowledge", "workspace", "contracts.json"),
      JSON.stringify({
        contracts: [
          {
            name: "app HTTP/API contract surface",
            type: "http-api",
            owners: ["app"],
            consumers: ["web"],
            boundary: "service and API boundary",
            evidence: { summary: "Derived from API markers.", signals: ["repo:app", "contract:http-api"] },
            confidence: 0.8,
          },
        ],
      }),
    );
    await writeTextFile(
      join(cwd, ".bbg", "knowledge", "workspace", "risk-surface.json"),
      JSON.stringify({
        risks: [
          {
            title: "checkout timeout pipeline",
            severity: "high",
            affectedRepos: ["app"],
            reasons: ["Timeout handling is historically fragile."],
            evidence: {
              summary: "Derived from prior flow risk analysis.",
              signals: ["repo:app", "risk:checkout-timeout"],
            },
            confidence: 0.83,
          },
        ],
      }),
    );
    await writeTextFile(
      join(cwd, ".bbg", "knowledge", "workspace", "decisions.json"),
      JSON.stringify({
        decisions: [
          {
            statement: "Checkout fixes must preserve API compatibility.",
            status: "confirmed",
            rationale: "Existing clients depend on the current response contract.",
            evidence: { summary: "Recorded decision history.", signals: ["repo:app", "decision:api-compatibility"] },
            confidence: 0.74,
          },
        ],
      }),
    );
    await writeTextFile(
      join(cwd, ".bbg", "knowledge", "workspace", "change-impact.json"),
      JSON.stringify({
        entries: [
          {
            target: "checkout",
            impactedRepos: ["app"],
            impactedContracts: ["app HTTP/API contract surface"],
            impactedTests: ["app: vitest (has tests)"],
            reviewerHints: ["typescript-reviewer"],
            evidence: { summary: "Computed from change impact analysis.", signals: ["repo:app", "impact:checkout"] },
            confidence: 0.88,
          },
        ],
      }),
    );

    const { startTask, readTaskStatusSummary } = await import("../../../src/runtime/tasks.js");
    const result = await startTask(cwd, "Fix checkout timeout");

    expect(result.context.impactGuidance).toEqual({
      matchedKnowledgeItemIds: [],
      matchedCapabilities: ["checkout"],
      matchedFlows: ["checkout timeout handling"],
      impactedRepos: ["app"],
      impactedContracts: ["app HTTP/API contract surface"],
      impactedTests: ["app: vitest (has tests)"],
      riskHotspots: ["checkout timeout pipeline"],
      reviewerHints: ["typescript-reviewer"],
      decisionNotes: ["Checkout fixes must preserve API compatibility."],
      evidenceSignals: expect.arrayContaining([
        "repo:app",
        "flow:checkout-timeout",
        "risk:checkout-timeout",
        "decision:api-compatibility",
        "impact:checkout",
      ]),
      references: [
        "docs/business/capability-map.md",
        "docs/business/critical-flows.md",
        "docs/architecture/risk-surface.md",
        "docs/architecture/decision-history.md",
        "docs/architecture/change-impact-map.md",
      ],
      confidence: expect.any(Number),
      rationale: expect.arrayContaining([
        expect.stringContaining("capability"),
        expect.stringContaining("critical flow"),
        expect.stringContaining("contract surface"),
      ]),
      reviewHint: "Review impacted repos (app) and contracts (app HTTP/API contract surface) before implementation.",
    });
    expect(result.context.reviewGate.level).toBe("required");
    expect(result.context.reviewGate.stopConditions).toEqual(
      expect.arrayContaining([
        "cross-repo-contract-impact",
        "known-risk-hotspot-change",
        "critical-flow-regression-risk",
        "decision-history-conflict",
      ]),
    );
    expect(result.session.nextActions).toEqual([
      "review-impact-surface",
      "review-hermes-context",
      "implement",
      "add-tests",
      "verify",
    ]);
    const handoff = await readTextFile(join(cwd, result.handoffPath));
    expect(handoff).toContain("## Impact Guidance");
    expect(handoff).toContain("- Capabilities: checkout");
    expect(handoff).toContain("- Critical Flows: checkout timeout handling");
    expect(handoff).toContain("- Impacted Contracts: app HTTP/API contract surface");
    expect(handoff).toContain("- Risk Hotspots: checkout timeout pipeline");

    const status = await readTaskStatusSummary(cwd);
    expect(status.tasks[0]?.impactGuidance.impactedContracts).toContain("app HTTP/API contract surface");
    expect(status.tasks[0]?.reviewGate.level).toBe("required");
  });

  it("resumes an existing task session and refreshes the handoff", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);

    const { startTask, resumeTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    process.env.BBG_CURRENT_TOOL = "codex";

    const resumed = await resumeTask(cwd, created.session.taskId);

    expect(resumed.session.entrypoint).toBe("resume");
    expect(resumed.session.tool).toBe("codex");
    expect(resumed.session.taskId).toBe(created.session.taskId);
    expect(resumed.session.attemptCount).toBe(2);
    expect(resumed.session.currentStep).toBe("implement");
  });

  it("launches the configured default runner when no current tool is active", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    runnerState.launchConfiguredAgentRunner.mockResolvedValue({
      tool: "claude",
      command: "claude",
      args: ["resume", "fix-checkout-timeout"],
    });

    const { startTask } = await import("../../../src/runtime/tasks.js");
    const result = await startTask(cwd, "Fix checkout timeout");

    expect(result.session.status).toBe("implementing");
    expect(result.session.tool).toBe("claude");
    expect(result.session.runner).toEqual({
      mode: "agent",
      tool: "claude",
      launched: true,
      command: "claude",
      args: ["resume", "fix-checkout-timeout"],
      launchedAt: expect.any(String),
      lastAttemptAt: expect.any(String),
      lastLaunchError: null,
    });
    expect(runnerState.launchConfiguredAgentRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd,
        taskId: "fix-checkout-timeout",
        task: "Fix checkout timeout",
        taskStatus: "prepared",
        currentStep: "handoff",
        reviewGateLevel: "recommended",
        reviewGateReviewers: ["typescript-reviewer"],
        reviewGatePack: ["type-boundaries", "runtime-validation", "module-ownership", "testing-boundaries"],
        reviewGateStopConditions: [
          "public-api-contract-change",
          "shared-type-boundary-change",
          "runtime-validation-gap",
          "auth-or-permission-boundary-change",
        ],
      }),
    );
  });

  it("blocks resume when task environment recovery fails", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);

    const { startTask, resumeTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    taskEnvState.runTaskEnvCommand.mockImplementation(async (input: { mode: string }) => {
      if (input.mode === "attach") {
        throw new Error("worktree missing");
      }
      return {
        mode: "repair",
        env: undefined,
      };
    });

    const resumed = await resumeTask(cwd, created.session.taskId);

    expect(resumed.session.status).toBe("blocked");
    expect(resumed.session.blockedReason).toBe("task-env recovery failed");
    expect(resumed.session.lastError).toContain("worktree missing");
  });

  it("recovers a blocked task when resumed from the current tool", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);

    const { startTask, resumeTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "tasks", created.session.taskId, "session.json"),
      JSON.stringify(
        {
          ...created.session,
          status: "blocked",
          blockedReason: "runner launch failed",
          lastError: "launcher unavailable",
          lastErrorAt: "2026-04-17T16:10:00.000Z",
        },
        null,
        2,
      ),
    );
    process.env.BBG_CURRENT_TOOL = "codex";

    const resumed = await resumeTask(cwd, created.session.taskId);

    expect(resumed.session.status).toBe("implementing");
    expect(resumed.session.blockedReason).toBeNull();
    expect(resumed.session.lastError).toBeNull();
    expect(resumed.session.runner).toEqual({
      mode: "current",
      tool: "codex",
      launched: true,
      command: null,
      args: [],
      launchedAt: expect.any(String),
      lastAttemptAt: expect.any(String),
      lastLaunchError: null,
    });
  });

  it("resumes an observation-driven retry into verifying with evidence collection actions", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);

    const { startTask, resumeTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "tasks", created.session.taskId, "session.json"),
      JSON.stringify(
        {
          ...created.session,
          status: "retrying",
          currentStep: "verify",
          observeSessionIds: [],
          nextActions: ["collect-evidence", "verify"],
          lastError: "observation-empty: no UI or log artifacts were collected",
          lastErrorAt: "2026-04-17T16:10:00.000Z",
        },
        null,
        2,
      ),
    );
    process.env.BBG_CURRENT_TOOL = "codex";

    const resumed = await resumeTask(cwd, created.session.taskId);

    expect(resumed.session.status).toBe("verifying");
    expect(resumed.session.currentStep).toBe("verify");
    expect(resumed.session.observeSessionIds).toEqual(["fix-checkout-timeout"]);
    expect(resumed.session.lastRecoveryAction).toEqual({
      kind: "auto-observe-start",
      at: expect.any(String),
      detail: "started observation session 'fix-checkout-timeout' for recovery",
    });
    expect(resumed.context.taskState).toMatchObject({
      status: "verifying",
      currentStep: "verify",
      observeSessionIds: ["fix-checkout-timeout"],
    });
    expect(resumed.context.recovery).toMatchObject({
      resumeStrategy: {
        kind: "last-runner",
        preferredTool: "codex",
      },
      recoveryPlan: {
        kind: "collect-evidence",
        actions: ["collect-evidence", "verify"],
      },
    });
    expect(resumed.session.nextActions).toEqual(["collect-evidence", "verify"]);
    expect(resumed.session.lastError).toBeNull();
    expect(observeState.runObserveCommand).toHaveBeenLastCalledWith({
      cwd,
      mode: "start",
      topic: "Fix checkout timeout",
      envId: "fix-checkout-timeout",
    });
    const handoff = await readTextFile(join(cwd, resumed.handoffPath));
    expect(handoff).toContain("## Recovery");
    expect(handoff).toContain("- Last Recovery Action: auto-observe-start");
    expect(handoff).toContain("- Resume Strategy: last-runner");
    expect(handoff).toContain("- Recovery Plan: collect-evidence");
    expect(resumed.session.runner).toEqual({
      mode: "current",
      tool: "codex",
      launched: true,
      command: null,
      args: [],
      launchedAt: expect.any(String),
      lastAttemptAt: expect.any(String),
      lastLaunchError: null,
    });
  });

  it("resumes a runtime verification retry into implementing with investigation actions", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);

    const { startTask, resumeTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "tasks", created.session.taskId, "session.json"),
      JSON.stringify(
        {
          ...created.session,
          status: "retrying",
          currentStep: "implement",
          nextActions: ["investigate-failures", "implement", "verify"],
          lastError: "checkpoint-or-runtime-verification-failed",
          lastErrorAt: "2026-04-17T16:10:00.000Z",
        },
        null,
        2,
      ),
    );
    process.env.BBG_CURRENT_TOOL = "codex";

    const resumed = await resumeTask(cwd, created.session.taskId);

    expect(resumed.session.status).toBe("implementing");
    expect(resumed.session.currentStep).toBe("implement");
    expect(resumed.session.nextActions).toEqual(["investigate-failures", "implement", "verify"]);
    expect(resumed.session.lastError).toBeNull();
    expect(resumed.session.runner).toEqual({
      mode: "current",
      tool: "codex",
      launched: true,
      command: null,
      args: [],
      launchedAt: expect.any(String),
      lastAttemptAt: expect.any(String),
      lastLaunchError: null,
    });
  });

  it("prefers the last successful runner tool and falls back to the default runner on resume", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    await writeTextFile(
      join(cwd, ".bbg", "config.json"),
      JSON.stringify({
        version: "1.0.0",
        projectName: "demo",
        projectDescription: "demo project",
        createdAt: "2026-04-17T16:00:00.000Z",
        updatedAt: "2026-04-17T16:00:00.000Z",
        repos: [
          {
            name: "app",
            gitUrl: "git@example.com:demo/app.git",
            branch: "main",
            type: "backend",
            stack: {
              language: "typescript",
              framework: "node",
              buildTool: "npm",
              testFramework: "vitest",
              packageManager: "npm",
            },
            description: "demo app",
          },
        ],
        governance: {
          riskThresholds: {
            high: { grade: "A", minScore: 90 },
            medium: { grade: "B", minScore: 75 },
            low: { grade: "C", minScore: 60 },
          },
          enableRedTeam: false,
          enableCrossAudit: false,
        },
        context: {},
        agentRunner: {
          defaultTool: "claude",
          tools: {
            claude: { command: "claude", args: ["resume", "{taskId}"] },
            codex: { command: "codex", args: ["resume", "{taskId}"] },
          },
        },
      }),
    );

    const { startTask, resumeTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "tasks", created.session.taskId, "session.json"),
      JSON.stringify(
        {
          ...created.session,
          status: "blocked",
          blockedReason: "runner launch failed",
          lastError: "launcher unavailable",
          lastErrorAt: "2026-04-17T16:10:00.000Z",
          tool: null,
          runner: {
            mode: "agent",
            tool: "codex",
            launched: true,
            command: "codex",
            args: ["resume", "fix-checkout-timeout"],
            launchedAt: "2026-04-17T16:05:00.000Z",
            lastAttemptAt: "2026-04-17T16:10:00.000Z",
            lastLaunchError: "launcher unavailable",
          },
        },
        null,
        2,
      ),
    );
    runnerState.launchConfiguredAgentRunner.mockClear();
    runnerState.launchConfiguredAgentRunner.mockResolvedValueOnce(null).mockResolvedValueOnce({
      tool: "claude",
      command: "claude",
      args: ["resume", "fix-checkout-timeout"],
    });

    const resumed = await resumeTask(cwd, created.session.taskId);

    expect(runnerState.launchConfiguredAgentRunner).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        preferredTool: "codex",
        taskStatus: "retrying",
        currentStep: "implement",
        resumeStrategyKind: "last-runner",
        recoveryPlanKind: "resume-runner",
        recoveryActions: ["resume"],
        reviewGateLevel: "recommended",
        reviewGateReviewers: ["typescript-reviewer"],
      }),
    );
    expect(runnerState.launchConfiguredAgentRunner).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        preferredTool: "claude",
        taskStatus: "retrying",
        currentStep: "implement",
        resumeStrategyKind: "last-runner",
        recoveryPlanKind: "resume-runner",
        recoveryActions: ["resume"],
        reviewGateLevel: "recommended",
        reviewGateReviewers: ["typescript-reviewer"],
      }),
    );
    expect(resumed.session.status).toBe("implementing");
    expect(resumed.session.tool).toBe("claude");
    expect(resumed.session.runner).toEqual({
      mode: "agent",
      tool: "claude",
      launched: true,
      command: "claude",
      args: ["resume", "fix-checkout-timeout"],
      launchedAt: expect.any(String),
      lastAttemptAt: expect.any(String),
      lastLaunchError: null,
    });
  });

  it("records reviewer results and keeps review findings in task state", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    process.env.BBG_CURRENT_TOOL = "claude";

    const { startTask, recordTaskReviewResult, readTaskSession } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");

    const failed = await recordTaskReviewResult({
      cwd,
      taskId: created.session.taskId,
      reviewer: "typescript-reviewer",
      status: "failed",
      summary: "Type boundaries leak across module seams.",
      findings: ["shared-type-boundary-change", "runtime-validation-gap"],
    });

    expect(failed.lastReviewResult).toEqual({
      reviewer: "typescript-reviewer",
      status: "failed",
      recordedAt: expect.any(String),
      summary: "Type boundaries leak across module seams.",
      findings: ["shared-type-boundary-change", "runtime-validation-gap"],
    });
    expect(failed.lastError).toBe("review-gate-failed: typescript-reviewer");
    expect(failed.nextActions).toEqual(expect.arrayContaining(["address-review-findings", "implement", "verify"]));

    const passed = await recordTaskReviewResult({
      cwd,
      taskId: created.session.taskId,
      reviewer: "typescript-reviewer",
      status: "passed",
      summary: "Review findings addressed.",
      findings: [],
    });

    expect(passed.lastReviewResult).toEqual({
      reviewer: "typescript-reviewer",
      status: "passed",
      recordedAt: expect.any(String),
      summary: "Review findings addressed.",
      findings: [],
    });
    expect(passed.nextActions).not.toContain("address-review-findings");

    const persisted = await readTaskSession(cwd, created.session.taskId);
    expect(persisted.lastReviewResult?.status).toBe("passed");
  });

  it("includes task environment health and observation summaries in status", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    process.env.BBG_CURRENT_TOOL = "claude";

    const { startTask, readTaskStatusSummary } = await import("../../../src/runtime/tasks.js");
    const result = await startTask(cwd, "Fix checkout timeout");

    await mkdir(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "worktree"), { recursive: true });
    await mkdir(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "ui"), { recursive: true });
    await mkdir(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "logs"), { recursive: true });
    await mkdir(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "metrics"), { recursive: true });
    await mkdir(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "traces"), { recursive: true });
    await mkdir(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "observations", "fix-checkout-timeout"), {
      recursive: true,
    });
    await writeTextFile(
      join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "manifest.json"),
      JSON.stringify(
        {
          version: 1,
          id: "fix-checkout-timeout",
          task: "Fix checkout timeout",
          slug: "fix-checkout-timeout",
          createdAt: "2026-04-17T16:00:00.000Z",
          updatedAt: "2026-04-17T16:00:00.000Z",
          gitRoot: ".",
          baseRef: "HEAD",
          worktreePath: ".bbg/task-envs/fix-checkout-timeout/worktree",
          artifactRoot: ".bbg/task-envs/fix-checkout-timeout/artifacts",
          uiArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/ui",
          logArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/logs",
          metricArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/metrics",
          traceArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/traces",
          notesPath: ".bbg/task-envs/fix-checkout-timeout/notes.md",
          status: "active",
        },
        null,
        2,
      ),
    );
    await writeTextFile(
      join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "observations", "fix-checkout-timeout", "manifest.json"),
      JSON.stringify(
        {
          version: 1,
          id: "fix-checkout-timeout",
          topic: "Fix checkout timeout",
          createdAt: "2026-04-17T16:00:00.000Z",
          updatedAt: "2026-04-17T16:00:00.000Z",
          envId: "fix-checkout-timeout",
          rootPath: ".bbg/task-envs/fix-checkout-timeout/artifacts",
          uiArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/ui",
          logArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/logs",
          metricArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/metrics",
          traceArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/traces",
          notesPath: ".bbg/task-envs/fix-checkout-timeout/observations/fix-checkout-timeout/notes.md",
        },
        null,
        2,
      ),
    );
    await writeTextFile(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "ui", "screen.png"), "");
    await writeTextFile(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "logs", "app.log"), "");

    const status = await readTaskStatusSummary(cwd);

    expect(status.tasks).toHaveLength(1);
    expect(status.taskEnvs).toEqual([
      expect.objectContaining({
        id: "fix-checkout-timeout",
        status: "active",
      }),
    ]);
    expect(status.observations).toEqual([
      expect.objectContaining({
        id: "fix-checkout-timeout",
        envId: "fix-checkout-timeout",
        uiArtifacts: 1,
        logArtifacts: 1,
        metricArtifacts: 0,
        traceArtifacts: 0,
        evidenceKinds: ["ui", "logs"],
        totalArtifacts: 2,
        readiness: "ready",
      }),
    ]);
    expect(result.session.observeSessionIds).toEqual(["fix-checkout-timeout"]);
    expect(status.tasks[0]?.resumeStrategy).toEqual({
      kind: "last-runner",
      preferredTool: "claude",
      fallbackTool: null,
      reason: "continue with the most recent successful runner",
    });
    expect(status.tasks[0]?.recoveryPlan).toEqual({
      kind: "retry-implement",
      actions: ["review-hermes-context", "implement", "add-tests", "verify"],
      reason: "task should continue implementation and then re-run verification",
    });
    expect(status.tasks[0]?.lastRecoveryAction).toBeNull();
  });

  it("writes loop runtime details into task context and handoff after loop assignment", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    process.env.BBG_CURRENT_TOOL = "claude";

    const { startTask, assignLoopToTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "loops", "main-loop.json"),
      JSON.stringify(
        {
          version: 1,
          id: "main-loop",
          taskId: created.session.taskId,
          taskEnvId: "fix-checkout-timeout",
          startedAt: "2026-04-17T16:00:00.000Z",
          updatedAt: "2026-04-17T16:10:00.000Z",
          status: "waiting-for-change",
          checks: ["build", "tests"],
          maxIterations: 5,
          pollIntervalMs: 1000,
          idleTimeoutMs: 5000,
          iterations: [
            {
              iteration: 1,
              timestamp: "2026-04-17T16:05:00.000Z",
              changedFiles: [],
              checks: {},
            },
          ],
        },
        null,
        2,
      ),
    );

    await assignLoopToTask({
      cwd,
      taskId: created.session.taskId,
      loopId: "main-loop",
    });

    const context = JSON.parse(await readTextFile(join(cwd, created.contextPath))) as {
      taskState: {
        loopId: string | null;
        loop: {
          id: string;
          taskEnvId: string | null;
          status: string;
          iterations: number;
          updatedAt: string;
        } | null;
      };
    };
    expect(context.taskState.loopId).toBe("main-loop");
    expect(context.taskState.loop).toEqual({
      id: "main-loop",
      taskEnvId: "fix-checkout-timeout",
      status: "waiting-for-change",
      iterations: 1,
      updatedAt: "2026-04-17T16:10:00.000Z",
    });

    const handoff = await readTextFile(join(cwd, created.handoffPath));
    expect(handoff).toContain("- Loop: main-loop");
    expect(handoff).toContain("- Loop Status: waiting-for-change");
    expect(handoff).toContain("- Loop Iterations: 1");
  });

  it("derives a default-runner resume strategy when no successful runner is recorded", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    await writeTextFile(
      join(cwd, ".bbg", "config.json"),
      JSON.stringify({
        version: "1.0.0",
        projectName: "demo",
        projectDescription: "demo project",
        createdAt: "2026-04-17T16:00:00.000Z",
        updatedAt: "2026-04-17T16:00:00.000Z",
        repos: [
          {
            name: "app",
            gitUrl: "git@example.com:demo/app.git",
            branch: "main",
            type: "backend",
            stack: {
              language: "typescript",
              framework: "node",
              buildTool: "npm",
              testFramework: "vitest",
              packageManager: "npm",
            },
            description: "demo app",
          },
        ],
        governance: {
          riskThresholds: {
            high: { grade: "A", minScore: 90 },
            medium: { grade: "B", minScore: 75 },
            low: { grade: "C", minScore: 60 },
          },
          enableRedTeam: false,
          enableCrossAudit: false,
        },
        context: {},
        agentRunner: {
          defaultTool: "claude",
          tools: {
            claude: { command: "claude", args: ["resume", "{taskId}"] },
          },
        },
      }),
    );
    process.env.BBG_CURRENT_TOOL = "claude";
    const { startTask, readTaskStatusSummary } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "tasks", created.session.taskId, "session.json"),
      JSON.stringify(
        {
          ...created.session,
          tool: null,
          runner: {
            mode: "prepare",
            tool: null,
            launched: false,
            command: null,
            args: [],
            launchedAt: null,
            lastAttemptAt: "2026-04-17T16:10:00.000Z",
            lastLaunchError: "claude missing",
          },
        },
        null,
        2,
      ),
    );

    const status = await readTaskStatusSummary(cwd);

    expect(status.tasks[0]?.resumeStrategy).toEqual({
      kind: "default-runner",
      preferredTool: "claude",
      fallbackTool: null,
      reason: "no successful runner recorded; use the configured default runner",
    });
    expect(status.tasks[0]?.recoveryPlan).toEqual({
      kind: "retry-implement",
      actions: ["review-hermes-context", "implement", "add-tests", "verify"],
      reason: "task should continue implementation and then re-run verification",
    });
    expect(status.tasks[0]?.lastRecoveryAction).toBeNull();
  });

  it("escalates to manual review when the attempt budget is exceeded on resume", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    process.env.BBG_CURRENT_TOOL = "claude";
    const { startTask, resumeTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "tasks", created.session.taskId, "session.json"),
      JSON.stringify(
        {
          ...created.session,
          attemptCount: 6,
          status: "retrying",
          currentStep: "implement",
          nextActions: ["implement", "verify"],
        },
        null,
        2,
      ),
    );

    const resumed = await resumeTask(cwd, created.session.taskId);

    expect(resumed.session.status).toBe("blocked");
    expect(resumed.session.blockedReason).toBe("autonomy budget exceeded");
    expect(resumed.session.autonomy.escalated).toBe(true);
    expect(resumed.session.lastRecoveryAction).toEqual({
      kind: "autonomy-budget-escalation",
      at: expect.any(String),
      detail: expect.stringContaining("attempt budget exceeded"),
    });
    expect(resumed.context.recovery.recoveryPlan).toMatchObject({
      kind: "manual-review",
      actions: ["manual-review"],
    });
  });

  it("escalates to manual review when verification failure budget is exceeded", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    process.env.BBG_CURRENT_TOOL = "claude";
    const { startTask, updateTaskSessionAfterVerify } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "tasks", created.session.taskId, "session.json"),
      JSON.stringify(
        {
          ...created.session,
          autonomy: {
            ...created.session.autonomy,
            maxVerifyFailures: 1,
          },
        },
        null,
        2,
      ),
    );

    const updated = await updateTaskSessionAfterVerify({
      cwd,
      taskId: created.session.taskId,
      ok: false,
      failureReason: "checkpoint-or-runtime-verification-failed",
      summary: {
        ok: false,
        reasons: ["checkpoint-or-runtime-verification-failed"],
        missingEvidence: [],
        observeRequired: false,
        observationReadiness: "not-required",
      },
    });

    expect(updated.status).toBe("blocked");
    expect(updated.blockedReason).toBe("autonomy budget exceeded");
    expect(updated.autonomy.escalated).toBe(true);
    expect(updated.lastRecoveryAction?.kind).toBe("autonomy-budget-escalation");
  });

  it("includes analyze quarantine summary in task status output", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    await writeTextFile(
      join(cwd, ".bbg", "analyze", "latest.json"),
      `${JSON.stringify(
        {
          runId: "run-1",
          status: "partial",
          scope: "workspace",
        },
        null,
        2,
      )}\n`,
    );
    await writeTextFile(join(cwd, ".bbg", "quarantine", "analyze", "invalid-handoff.json"), "{}\n");

    const { readTaskStatusSummary } = await import("../../../src/runtime/tasks.js");
    const status = await readTaskStatusSummary(cwd);

    expect(status.analyze.quarantine.count).toBe(1);
    expect(status.analyze.quarantine.latestQuarantinedAt).toEqual(expect.any(String));
    expect(await readdir(join(cwd, ".bbg", "quarantine", "analyze"))).toEqual(["invalid-handoff.json"]);
  });
});
