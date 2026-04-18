import { beforeEach, describe, expect, it, vi } from "vitest";

const runInitState = vi.hoisted(() => ({
  runInit: vi.fn(),
}));

const runAddRepoState = vi.hoisted(() => ({
  runAddRepo: vi.fn(),
}));

const runSyncState = vi.hoisted(() => ({
  runSync: vi.fn(),
}));

const runHarnessAuditState = vi.hoisted(() => ({
  runHarnessAuditCommand: vi.fn(),
}));

const runTaskStartState = vi.hoisted(() => ({
  runTaskStartCommand: vi.fn(),
}));

const runRepairAdaptersState = vi.hoisted(() => ({
  runRepairAdapters: vi.fn(),
}));

const runHermesState = vi.hoisted(() => ({
  runHermesCommand: vi.fn(),
}));

const runTaskEnvState = vi.hoisted(() => ({
  runTaskEnvCommand: vi.fn(),
}));

const runDocGardenState = vi.hoisted(() => ({
  runDocGardenCommand: vi.fn(),
}));

const runObserveState = vi.hoisted(() => ({
  runObserveCommand: vi.fn(),
}));

const runWorkflowState = vi.hoisted(() => ({
  runWorkflowCommand: vi.fn(),
}));

const runStartState = vi.hoisted(() => ({
  runStartCommand: vi.fn(),
}));

const runResumeState = vi.hoisted(() => ({
  runResumeCommand: vi.fn(),
}));

const runStatusState = vi.hoisted(() => ({
  runStatusCommand: vi.fn(),
}));

const runLoopStartState = vi.hoisted(() => ({
  runLoopStartCommand: vi.fn(),
}));

const runLoopStatusState = vi.hoisted(() => ({
  runLoopStatusCommand: vi.fn(),
}));

const runAnalyzeState = vi.hoisted(() => ({
  runAnalyzeCommand: vi.fn(),
}));

const runAnalyzeRepoState = vi.hoisted(() => ({
  runAnalyzeRepoCommand: vi.fn(),
}));

const runDeliverState = vi.hoisted(() => ({
  runDeliverCommand: vi.fn(),
}));

const runCrossAuditState = vi.hoisted(() => ({
  runCrossAuditCommand: vi.fn(),
}));

const commandState = vi.hoisted(() => {
  const name = vi.fn().mockReturnThis();
  const description = vi.fn().mockReturnThis();
  const version = vi.fn().mockReturnThis();
  const parse = vi.fn();
  const parseAsync = vi.fn();
  type CommandAction = (options: Record<string, unknown>) => Promise<void>;
  type CommandMock = {
    description: ReturnType<typeof vi.fn>;
    option: ReturnType<typeof vi.fn>;
    command: ReturnType<typeof vi.fn>;
    action: ReturnType<typeof vi.fn>;
    getActionHandler: () => CommandAction | undefined;
    reset: () => void;
  };

  const commandMocks = new Map<string, CommandMock>();

  const createCommandMock = (commandPath: string): CommandMock => {
    let actionHandler: CommandAction | undefined;
    const commandBuilder = {
      description: vi.fn(() => commandBuilder),
      option: vi.fn(() => commandBuilder),
      command: vi.fn((subcommandName: string) => {
        const nestedCommandPath = `${commandPath} ${subcommandName}`;
        if (!commandMocks.has(nestedCommandPath)) {
          commandMocks.set(nestedCommandPath, createCommandMock(nestedCommandPath));
        }

        return commandMocks.get(nestedCommandPath);
      }),
      action: vi.fn((handler: CommandAction) => {
        actionHandler = handler;
        return commandBuilder;
      }),
    };

    return {
      ...commandBuilder,
      getActionHandler: () => actionHandler,
      reset: () => {
        actionHandler = undefined;
        commandBuilder.description.mockClear();
        commandBuilder.option.mockClear();
        commandBuilder.command.mockClear();
        commandBuilder.action.mockClear();
      },
    };
  };

  const command = vi.fn((commandName: string) => {
    if (!commandMocks.has(commandName)) {
      commandMocks.set(commandName, createCommandMock(commandName));
    }

    return commandMocks.get(commandName);
  });

  const getCommandMock = (commandName: string) => commandMocks.get(commandName);
  const resetCommandMocks = () => {
    commandMocks.forEach((commandMock) => commandMock.reset());
    commandMocks.clear();
  };

  return {
    Command: vi.fn(() => ({
      name,
      description,
      version,
      command,
      parse,
      parseAsync,
    })),
    name,
    description,
    version,
    command,
    parse,
    parseAsync,
    getCommandMock,
    resetCommandMocks,
  };
});

vi.mock("commander", () => ({ Command: commandState.Command }));

vi.mock("../../../src/commands/init.js", () => ({
  runInit: runInitState.runInit,
}));

vi.mock("../../../src/commands/add-repo.js", () => ({
  runAddRepo: runAddRepoState.runAddRepo,
}));

vi.mock("../../../src/commands/sync.js", () => ({
  runSync: runSyncState.runSync,
}));

vi.mock("../../../src/commands/harness-audit.js", () => ({
  runHarnessAuditCommand: runHarnessAuditState.runHarnessAuditCommand,
}));

vi.mock("../../../src/commands/repair-adapters.js", () => ({
  runRepairAdapters: runRepairAdaptersState.runRepairAdapters,
}));

vi.mock("../../../src/commands/hermes.js", () => ({
  runHermesCommand: runHermesState.runHermesCommand,
}));

vi.mock("../../../src/commands/task-env.js", () => ({
  runTaskEnvCommand: runTaskEnvState.runTaskEnvCommand,
}));

vi.mock("../../../src/commands/doc-garden.js", () => ({
  runDocGardenCommand: runDocGardenState.runDocGardenCommand,
}));

vi.mock("../../../src/commands/observe.js", () => ({
  runObserveCommand: runObserveState.runObserveCommand,
}));

vi.mock("../../../src/commands/task-start.js", () => ({
  runTaskStartCommand: runTaskStartState.runTaskStartCommand,
}));

vi.mock("../../../src/commands/workflow.js", () => ({
  runWorkflowCommand: runWorkflowState.runWorkflowCommand,
}));

vi.mock("../../../src/commands/start.js", () => ({
  runStartCommand: runStartState.runStartCommand,
}));

vi.mock("../../../src/commands/resume.js", () => ({
  runResumeCommand: runResumeState.runResumeCommand,
}));

vi.mock("../../../src/commands/status.js", () => ({
  runStatusCommand: runStatusState.runStatusCommand,
}));

vi.mock("../../../src/commands/analyze.js", () => ({
  runAnalyzeCommand: runAnalyzeState.runAnalyzeCommand,
}));

vi.mock("../../../src/commands/analyze-repo.js", () => ({
  runAnalyzeRepoCommand: runAnalyzeRepoState.runAnalyzeRepoCommand,
}));

vi.mock("../../../src/commands/deliver.js", () => ({
  runDeliverCommand: runDeliverState.runDeliverCommand,
}));

vi.mock("../../../src/commands/cross-audit.js", () => ({
  runCrossAuditCommand: runCrossAuditState.runCrossAuditCommand,
}));

vi.mock("../../../src/commands/doctor.js", () => ({ runDoctor: vi.fn() }));
vi.mock("../../../src/commands/release.js", () => ({ runRelease: vi.fn() }));
vi.mock("../../../src/commands/upgrade.js", () => ({ runUpgrade: vi.fn() }));
vi.mock("../../../src/commands/quality-gate.js", () => ({ runQualityGateCommand: vi.fn() }));
vi.mock("../../../src/commands/checkpoint.js", () => ({ runCheckpointCommand: vi.fn() }));
vi.mock("../../../src/commands/verify.js", () => ({ runVerifyCommand: vi.fn() }));
vi.mock("../../../src/commands/sessions.js", () => ({ runSessionsCommand: vi.fn() }));
vi.mock("../../../src/commands/eval.js", () => ({ runEvalCommand: vi.fn() }));
vi.mock("../../../src/commands/model-route.js", () => ({ runModelRouteCommand: vi.fn() }));
vi.mock("../../../src/commands/loop-start.js", () => ({ runLoopStartCommand: runLoopStartState.runLoopStartCommand }));
vi.mock("../../../src/commands/loop-status.js", () => ({ runLoopStatusCommand: runLoopStatusState.runLoopStatusCommand }));

describe("cli bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    commandState.Command.mockClear();
    commandState.name.mockClear();
    commandState.description.mockClear();
    commandState.version.mockClear();
    commandState.command.mockClear();
    commandState.resetCommandMocks();
    commandState.parse.mockClear();
    commandState.parseAsync.mockClear();
    runInitState.runInit.mockReset();
    runAddRepoState.runAddRepo.mockReset();
    runSyncState.runSync.mockReset();
    runHarnessAuditState.runHarnessAuditCommand.mockReset();
    runTaskStartState.runTaskStartCommand.mockReset();
    runRepairAdaptersState.runRepairAdapters.mockReset();
    runHermesState.runHermesCommand.mockReset();
    runTaskEnvState.runTaskEnvCommand.mockReset();
    runDocGardenState.runDocGardenCommand.mockReset();
    runObserveState.runObserveCommand.mockReset();
    runWorkflowState.runWorkflowCommand.mockReset();
    runStartState.runStartCommand.mockReset();
    runResumeState.runResumeCommand.mockReset();
    runStatusState.runStatusCommand.mockReset();
    runLoopStartState.runLoopStartCommand.mockReset();
    runLoopStatusState.runLoopStatusCommand.mockReset();
    runAnalyzeState.runAnalyzeCommand.mockReset();
    runAnalyzeRepoState.runAnalyzeRepoCommand.mockReset();
    runDeliverState.runDeliverCommand.mockReset();
    runCrossAuditState.runCrossAuditCommand.mockReset();
    runInitState.runInit.mockResolvedValue({
      createdFiles: ["/tmp/workspace/.bbg/config.json"],
      clonedRepos: ["/tmp/workspace/repo-a"],
      doctor: { ok: true, mode: "full", checks: [] },
    });
    runAddRepoState.runAddRepo.mockResolvedValue({
      addedRepoName: "repo-a",
    });
    runSyncState.runSync.mockResolvedValue({
      repoStatuses: [],
      orphanRepos: [],
      drift: [],
    });
    runHarnessAuditState.runHarnessAuditCommand.mockResolvedValue({
      runtime: {
        configured: true,
        policyEnabled: true,
        policyFile: ".bbg/policy/decisions.json",
        telemetryEnabled: true,
        telemetryFile: ".bbg/telemetry/events.json",
        evaluationEnabled: true,
        evaluationFile: ".bbg/evals/results.json",
        contextEnabled: true,
        repoMapFile: ".bbg/context/repo-map.json",
        sessionHistoryFile: ".bbg/context/session-history.json",
      },
      policy: {
        source: "authored",
        explicitCommands: ["verify"],
        defaultedCommands: ["quality-gate"],
        blockedCommands: [],
        approvalRequiredCommands: ["harness-audit"],
        auditState: "approval-required",
        auditMessage: "Approval required for 'harness-audit': review first.",
      },
      checks: [],
      summary: {
        warnings: 2,
        gaps: [
          "runtime-telemetry: missing telemetry store",
          "policy: Approval required for 'harness-audit': review first.",
        ],
      },
    });
    runTaskStartState.runTaskStartCommand.mockResolvedValue({
      taskId: "TASK-20260409-120000",
      workflow: "full-feature",
      specPath: "docs/specs/2026/04/sample.md",
      wikiPath: "docs/wiki/concepts/sample.md",
    });
    runRepairAdaptersState.runRepairAdapters.mockResolvedValue({
      repaired: ["CLAUDE.md"],
      created: [".gemini/settings.json"],
    });
    runHermesState.runHermesCommand.mockResolvedValue({
      kind: "query",
      topic: "rollout process",
      commandSpecPath: "commands/hermes-query.md",
      summary: "Answer questions using the K8 local Hermes memory router: local canonical wiki memory before local candidate memory, and raw/runtime artifacts only when the local layers are insufficient.",
      references: ["AGENTS.md", "commands/hermes-query.md", "skills/hermes-memory-router/SKILL.md"],
    });
    runTaskEnvState.runTaskEnvCommand.mockResolvedValue({
      mode: "start",
      env: {
        version: 1,
        id: "ship-feature",
        task: "ship feature",
        slug: "ship-feature",
        createdAt: "2026-04-09T12:00:00.000Z",
        updatedAt: "2026-04-09T12:00:00.000Z",
        gitRoot: ".",
        baseRef: "HEAD",
        worktreePath: ".bbg/task-envs/ship-feature/worktree",
        artifactRoot: ".bbg/task-envs/ship-feature/artifacts",
        uiArtifactsPath: ".bbg/task-envs/ship-feature/artifacts/ui",
        logArtifactsPath: ".bbg/task-envs/ship-feature/artifacts/logs",
        metricArtifactsPath: ".bbg/task-envs/ship-feature/artifacts/metrics",
        traceArtifactsPath: ".bbg/task-envs/ship-feature/artifacts/traces",
        notesPath: ".bbg/task-envs/ship-feature/notes.md",
        status: "active",
      },
    });
    runDocGardenState.runDocGardenCommand.mockResolvedValue({
      mode: "scan",
      report: {
        version: 1,
        generatedAt: "2026-04-09T12:00:00.000Z",
        docsScanned: 4,
        findings: [{ docPath: "docs/guide.md", type: "stale-reference", reference: "src/app.ts", message: "stale" }],
      },
    });
    runObserveState.runObserveCommand.mockResolvedValue({
      mode: "report",
      report: {
        version: 1,
        id: "checkout-latency",
        topic: "checkout latency",
        createdAt: "2026-04-09T12:00:00.000Z",
        updatedAt: "2026-04-09T12:00:00.000Z",
        envId: null,
        rootPath: ".bbg/observations/checkout-latency",
        uiArtifactsPath: ".bbg/observations/checkout-latency/ui",
        logArtifactsPath: ".bbg/observations/checkout-latency/logs",
        metricArtifactsPath: ".bbg/observations/checkout-latency/metrics",
        traceArtifactsPath: ".bbg/observations/checkout-latency/traces",
        notesPath: ".bbg/observations/checkout-latency/notes.md",
        uiArtifacts: 1,
        logArtifacts: 2,
        metricArtifacts: 0,
        traceArtifacts: 0,
      },
    });
    runWorkflowState.runWorkflowCommand.mockResolvedValue({
      kind: "plan",
      task: "ship feature",
      commandSpecPath: "commands/plan.md",
      summary: "Create an implementation plan from canonical repo guidance before making changes.",
      references: ["AGENTS.md", "RULES.md", "skills/tdd-workflow/SKILL.md"],
      hermesRecommendations: ["If similar work may already exist, run `bbg hermes query` before planning from scratch."],
      decisions: {
        taskEnv: { decision: "required", reasons: ["debug-or-stabilization-task"] },
        observe: { decision: "optional", reasons: ["runtime-evidence-useful"] },
        tdd: { decision: "required", reasons: ["workflow-requested-tdd"] },
        security: { decision: "not-required", reasons: [] },
        loop: { decision: "optional", reasons: ["runtime-checks-may-repeat"] },
        hermesQuery: { decision: "recommended", reasons: ["plan-benefits-from-local-history"] },
      },
      nextActions: ["implement", "verify"],
    });
    runStartState.runStartCommand.mockResolvedValue({
      session: {
        version: 1,
        taskId: "ship-feature",
        task: "ship feature",
        status: "implementing",
        entrypoint: "start",
        tool: "claude",
        startedAt: "2026-04-09T12:00:00.000Z",
        updatedAt: "2026-04-09T12:00:00.000Z",
        workflowKind: "plan",
        taskEnvId: "ship-feature",
        observeSessionIds: ["ship-feature"],
        loopId: null,
        nextActions: ["implement", "verify"],
        lastError: null,
        lastErrorAt: null,
        blockedReason: null,
        currentStep: "implement",
        attemptCount: 1,
        runner: {
          mode: "current",
          tool: "claude",
          launched: true,
          command: null,
          args: [],
          launchedAt: "2026-04-09T12:00:00.000Z",
          lastAttemptAt: "2026-04-09T12:00:00.000Z",
          lastLaunchError: null,
        },
        lastVerification: null,
        lastRecoveryAction: null,
        autonomy: {
          maxAttempts: 5,
          maxVerifyFailures: 3,
          maxDurationMs: 3600000,
          verifyFailureCount: 0,
          escalated: false,
          escalationReason: null,
          escalatedAt: null,
        },
      },
      decisions: {
        taskEnv: { decision: "required", reasons: ["debug-or-stabilization-task"] },
        observe: { decision: "optional", reasons: ["runtime-evidence-useful"] },
        tdd: { decision: "required", reasons: ["workflow-requested-tdd"] },
        security: { decision: "not-required", reasons: [] },
        loop: { decision: "optional", reasons: ["runtime-checks-may-repeat"] },
        hermesQuery: { decision: "recommended", reasons: ["plan-benefits-from-local-history"] },
      },
      context: {
        version: 1,
        taskId: "ship-feature",
        analyzeRunId: null,
        references: ["AGENTS.md", "RULES.md"],
        commandSpecPath: "commands/plan.md",
        summary: "Create an implementation plan from canonical repo guidance before making changes.",
        hermesRecommendations: ["If similar work may already exist, run `bbg hermes query` before planning from scratch."],
      },
      handoffPath: ".bbg/tasks/ship-feature/handoff.md",
      contextPath: ".bbg/tasks/ship-feature/context.json",
      decisionsPath: ".bbg/tasks/ship-feature/decisions.json",
    });
    runResumeState.runResumeCommand.mockResolvedValue({
      session: {
        version: 1,
        taskId: "ship-feature",
        task: "ship feature",
        status: "implementing",
        entrypoint: "resume",
        tool: "codex",
        startedAt: "2026-04-09T12:00:00.000Z",
        updatedAt: "2026-04-09T12:10:00.000Z",
        workflowKind: "plan",
        taskEnvId: "ship-feature",
        observeSessionIds: ["ship-feature"],
        loopId: null,
        nextActions: ["implement", "verify"],
        lastError: null,
        lastErrorAt: null,
        blockedReason: null,
        currentStep: "implement",
        attemptCount: 2,
        runner: {
          mode: "current",
          tool: "codex",
          launched: true,
          command: null,
          args: [],
          launchedAt: "2026-04-09T12:10:00.000Z",
          lastAttemptAt: "2026-04-09T12:10:00.000Z",
          lastLaunchError: null,
        },
        lastVerification: null,
        lastRecoveryAction: null,
        autonomy: {
          maxAttempts: 5,
          maxVerifyFailures: 3,
          maxDurationMs: 3600000,
          verifyFailureCount: 0,
          escalated: false,
          escalationReason: null,
          escalatedAt: null,
        },
      },
      decisions: {
        taskEnv: { decision: "required", reasons: ["debug-or-stabilization-task"] },
        observe: { decision: "optional", reasons: ["runtime-evidence-useful"] },
        tdd: { decision: "required", reasons: ["workflow-requested-tdd"] },
        security: { decision: "not-required", reasons: [] },
        loop: { decision: "optional", reasons: ["runtime-checks-may-repeat"] },
        hermesQuery: { decision: "recommended", reasons: ["plan-benefits-from-local-history"] },
      },
      context: {
        version: 1,
        taskId: "ship-feature",
        analyzeRunId: null,
        references: ["AGENTS.md", "RULES.md"],
        commandSpecPath: "commands/plan.md",
        summary: "Create an implementation plan from canonical repo guidance before making changes.",
        hermesRecommendations: ["If similar work may already exist, run `bbg hermes query` before planning from scratch."],
      },
      handoffPath: ".bbg/tasks/ship-feature/handoff.md",
      contextPath: ".bbg/tasks/ship-feature/context.json",
      decisionsPath: ".bbg/tasks/ship-feature/decisions.json",
    });
    runStatusState.runStatusCommand.mockResolvedValue({
      analyze: {
        runId: "20260409T120000Z-a1b2c3",
        status: "completed",
        scope: "workspace",
      },
      tasks: [
        {
          version: 1,
          taskId: "ship-feature",
          task: "ship feature",
          status: "implementing",
          entrypoint: "start",
          tool: "claude",
          startedAt: "2026-04-09T12:00:00.000Z",
          updatedAt: "2026-04-09T12:00:00.000Z",
          workflowKind: "plan",
          currentStep: "implement",
          attemptCount: 1,
          taskEnvId: "ship-feature",
          observeSessionIds: [],
          loopId: null,
          nextActions: ["implement", "verify"],
          lastError: null,
          lastErrorAt: null,
          blockedReason: null,
          runner: {
            mode: "current",
            tool: "claude",
            launched: true,
            command: null,
            args: [],
            launchedAt: "2026-04-09T12:00:00.000Z",
            lastAttemptAt: "2026-04-09T12:00:00.000Z",
            lastLaunchError: null,
          },
          lastRecoveryAction: null,
          autonomy: {
            maxAttempts: 5,
            maxVerifyFailures: 3,
            maxDurationMs: 3600000,
            verifyFailureCount: 0,
            escalated: false,
            escalationReason: null,
            escalatedAt: null,
          },
          lastVerification: {
            ok: true,
            verifiedAt: "2026-04-09T12:05:00.000Z",
            reasons: [],
            missingEvidence: [],
            observeRequired: false,
            observationReadiness: "not-required",
          },
          resumeStrategy: {
            kind: "last-runner",
            preferredTool: "claude",
            fallbackTool: null,
            reason: "continue with the most recent successful runner",
          },
          recoveryPlan: {
            kind: "retry-implement",
            actions: ["implement", "verify"],
            reason: "task should continue implementation and then re-run verification",
          },
        },
      ],
      taskEnvs: [
        {
          version: 1,
          id: "ship-feature",
          task: "ship feature",
          slug: "ship-feature",
          createdAt: "2026-04-09T12:00:00.000Z",
          updatedAt: "2026-04-09T12:00:00.000Z",
          gitRoot: ".",
          baseRef: "HEAD",
          worktreePath: ".bbg/task-envs/ship-feature/worktree",
          artifactRoot: ".bbg/task-envs/ship-feature/artifacts",
          uiArtifactsPath: ".bbg/task-envs/ship-feature/artifacts/ui",
          logArtifactsPath: ".bbg/task-envs/ship-feature/artifacts/logs",
          metricArtifactsPath: ".bbg/task-envs/ship-feature/artifacts/metrics",
          traceArtifactsPath: ".bbg/task-envs/ship-feature/artifacts/traces",
          notesPath: ".bbg/task-envs/ship-feature/notes.md",
          status: "active",
        },
      ],
      observations: [
        {
          id: "checkout-latency",
          topic: "checkout latency",
          envId: "ship-feature",
          rootPath: ".bbg/task-envs/ship-feature/artifacts",
          uiArtifacts: 1,
          logArtifacts: 2,
          metricArtifacts: 0,
          traceArtifacts: 0,
          evidenceKinds: ["ui", "logs"],
          totalArtifacts: 3,
          readiness: "ready",
        },
      ],
      loops: [
        {
          id: "main-loop",
          taskId: "ship-feature",
          taskEnvId: "ship-feature",
          status: "waiting-for-change",
          iterations: 1,
          updatedAt: "2026-04-09T12:00:00.000Z",
        },
      ],
    });
    runLoopStartState.runLoopStartCommand.mockResolvedValue({
      version: 1,
      id: "main-loop",
      taskId: "ship-feature",
      taskEnvId: "ship-feature",
      startedAt: "2026-04-09T12:00:00.000Z",
      updatedAt: "2026-04-09T12:00:00.000Z",
      status: "waiting-for-change",
      checks: ["build", "tests", "typecheck"],
      maxIterations: 5,
      pollIntervalMs: 1000,
      idleTimeoutMs: 5000,
      iterations: [],
    });
    runLoopStatusState.runLoopStatusCommand.mockResolvedValue({
      version: 1,
      id: "main-loop",
      taskId: "ship-feature",
      taskEnvId: "ship-feature",
      startedAt: "2026-04-09T12:00:00.000Z",
      updatedAt: "2026-04-09T12:00:00.000Z",
      status: "waiting-for-change",
      checks: ["build", "tests", "typecheck"],
      maxIterations: 5,
      pollIntervalMs: 1000,
      idleTimeoutMs: 5000,
      iterations: [{ iteration: 1, timestamp: "2026-04-09T12:00:00.000Z", changedFiles: [], checks: {} }],
    });
    runAnalyzeState.runAnalyzeCommand.mockResolvedValue({
      analyzedRepos: ["repo-a"],
      technicalArchitecturePath: "docs/architecture/technical-architecture.md",
      businessArchitecturePath: "docs/architecture/business-architecture.md",
      dependencyGraphPath: "docs/architecture/repo-dependency-graph.md",
      repoDocs: ["docs/architecture/repos/repo-a.md"],
    });
    runAnalyzeRepoState.runAnalyzeRepoCommand.mockResolvedValue({
      repo: "repo-a",
      repoDocPath: "docs/architecture/repos/repo-a.md",
    });
    runDeliverState.runDeliverCommand.mockResolvedValue({
      taskId: "TASK-20260409-120000",
      reportPath: "docs/delivery/2026/04/sample-delivery.md",
      diagramPaths: ["docs/delivery/2026/04/diagrams/sample-flow.svg"],
    });
    runCrossAuditState.runCrossAuditCommand.mockResolvedValue({
      reportPath: "docs/reports/2026/04/cross-audit-2026-04-09.md",
      verdict: "PASS",
      agreementRate: 0.9,
      conflicts: 1,
      unresolvedCriticalOrHigh: 0,
    });
  });

  it("wires command metadata and parses argv", { timeout: 45000 }, async () => {
    const [{ CLI_NAME, CLI_VERSION }, packageJson] = await Promise.all([
      import("../../../src/constants.js"),
      import("../../../package.json", { with: { type: "json" } }),
    ]);

    const cliModule = await import("../../../src/cli.js");
    await cliModule.runCli();

    expect(commandState.Command).toHaveBeenCalledTimes(1);
    expect(commandState.name).toHaveBeenCalledWith(CLI_NAME);
    expect(commandState.description).toHaveBeenCalledWith("BadBoy Genesis CLI");
    expect(CLI_VERSION).toBe(packageJson.default.version);
    expect(commandState.version).toHaveBeenCalledWith(CLI_VERSION);

    const initCommand = commandState.getCommandMock("init");
    expect(initCommand).toBeDefined();
    expect(commandState.command).toHaveBeenCalledWith("init");
    expect(initCommand?.description).toHaveBeenCalledWith("Initialize bbg project files in current directory");
    expect(initCommand?.option).toHaveBeenNthCalledWith(1, "-y, --yes", "Accept defaults and skip prompts", false);
    expect(initCommand?.option).toHaveBeenNthCalledWith(2, "--dry-run", "Show files that would be created", false);
    expect(initCommand?.action).toHaveBeenCalledTimes(1);
    const evalCommand = commandState.getCommandMock("eval");
    const evalSeedCommand = commandState.getCommandMock("eval seed");
    const evalRunCommand = commandState.getCommandMock("eval run");
    const evalHistoryCommand = commandState.getCommandMock("eval history");
    const evalBenchmarkCommand = commandState.getCommandMock("eval benchmark");
    expect(evalCommand?.command).toHaveBeenNthCalledWith(1, "seed");
    expect(evalCommand?.command).toHaveBeenNthCalledWith(2, "run");
    expect(evalCommand?.command).toHaveBeenNthCalledWith(3, "suite");
    expect(evalCommand?.command).toHaveBeenNthCalledWith(4, "compare");
    expect(evalCommand?.command).toHaveBeenNthCalledWith(5, "history");
    expect(evalCommand?.command).toHaveBeenNthCalledWith(6, "benchmark");
    expect(evalSeedCommand?.description).toHaveBeenCalledWith(
      "Seed starter eval dataset, experiment, and fixture workspace",
    );
    expect(evalRunCommand?.option).toHaveBeenNthCalledWith(1, "--dataset <path>", "Dataset JSON path");
    expect(evalRunCommand?.option).toHaveBeenNthCalledWith(2, "--experiment <path>", "Experiment JSON path");
    expect(evalHistoryCommand?.option).toHaveBeenNthCalledWith(1, "--limit <count>", "Number of recent history entries to print", "5");
    expect(evalBenchmarkCommand?.option).toHaveBeenNthCalledWith(1, "--limit <count>", "Number of recent history entries to summarize", "10");
    expect(evalBenchmarkCommand?.option).toHaveBeenNthCalledWith(2, "--file <path>", "Optional output path for the benchmark JSON report");
    expect(commandState.parse).not.toHaveBeenCalled();
    expect(commandState.parseAsync).toHaveBeenCalledTimes(1);
    expect(commandState.parseAsync).toHaveBeenCalledWith(process.argv);
  });

  it("prints start summary", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/tmp/workspace");

    const cliModule = await import("../../../src/cli.js");
    cliModule.buildProgram();

    const startCommand = commandState.getCommandMock("start [task...]");
    const handler = startCommand?.getActionHandler();
    expect(handler).toBeTypeOf("function");

    await handler?.(["ship", "feature"], {});

    expect(runStartState.runStartCommand).toHaveBeenCalledWith({
      cwd: "/tmp/workspace",
      task: "ship feature",
    });
    expect(stdoutSpy).toHaveBeenCalledWith("Start: ship-feature\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Task environment: ship-feature\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Handoff: .bbg/tasks/ship-feature/handoff.md\n");

    stdoutSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it("prints resume summary", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/tmp/workspace");

    const cliModule = await import("../../../src/cli.js");
    cliModule.buildProgram();

    const resumeCommand = commandState.getCommandMock("resume <taskId>");
    const handler = resumeCommand?.getActionHandler();
    expect(handler).toBeTypeOf("function");

    await handler?.("ship-feature", {});

    expect(runResumeState.runResumeCommand).toHaveBeenCalledWith({
      cwd: "/tmp/workspace",
      taskId: "ship-feature",
    });
    expect(stdoutSpy).toHaveBeenCalledWith("Resume: ship-feature\n");

    stdoutSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it("prints status summary", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/tmp/workspace");

    const cliModule = await import("../../../src/cli.js");
    cliModule.buildProgram();

    const statusCommand = commandState.getCommandMock("status");
    const handler = statusCommand?.getActionHandler();
    expect(handler).toBeTypeOf("function");

    await handler?.({});

    expect(runStatusState.runStatusCommand).toHaveBeenCalledWith({ cwd: "/tmp/workspace" });
    expect(stdoutSpy).toHaveBeenCalledWith("Analyze: completed (workspace, 20260409T120000Z-a1b2c3)\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Tasks: 1\n");
    expect(stdoutSpy).toHaveBeenCalledWith("  runner: current (tool=claude, launched=yes, command=none)\n");
    expect(stdoutSpy).toHaveBeenCalledWith("  resume: last-runner (preferred=claude, fallback=none)\n");
    expect(stdoutSpy).toHaveBeenCalledWith("  resume reason: continue with the most recent successful runner\n");
    expect(stdoutSpy).toHaveBeenCalledWith("  recovery: retry-implement (implement, verify)\n");
    expect(stdoutSpy).toHaveBeenCalledWith("  recovery reason: task should continue implementation and then re-run verification\n");
    expect(stdoutSpy).toHaveBeenCalledWith("  next: implement, verify\n");
    expect(stdoutSpy).toHaveBeenCalledWith("  verification: pass (readiness=not-required, missing=none)\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Loops: 1\n");
    expect(stdoutSpy).toHaveBeenCalledWith(
      "- main-loop: waiting-for-change (iterations=1, task=ship-feature, env=ship-feature)\n",
    );

    stdoutSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it("prints init summary with files, repos and doctor", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/tmp/workspace");

    const cliModule = await import("../../../src/cli.js");
    cliModule.buildProgram();

    const initCommand = commandState.getCommandMock("init");
    const handler = initCommand?.getActionHandler();
    expect(handler).toBeTypeOf("function");

    await handler?.({ yes: true, dryRun: false });

    expect(runInitState.runInit).toHaveBeenCalledWith({ cwd: "/tmp/workspace", yes: true, dryRun: false });
    expect(stdoutSpy).toHaveBeenCalledWith("Created files (1):\n");
    expect(stdoutSpy).toHaveBeenCalledWith("- /tmp/workspace/.bbg/config.json\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Cloned repositories (1):\n");
    expect(stdoutSpy).toHaveBeenCalledWith("- /tmp/workspace/repo-a\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Doctor status: OK (full)\n");
    expect(runSyncState.runSync).not.toHaveBeenCalled();

    stdoutSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it("prints actionable harness audit details", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/tmp/workspace");

    const cliModule = await import("../../../src/cli.js");
    cliModule.buildProgram();

    const auditCommand = commandState.getCommandMock("harness-audit");
    const handler = auditCommand?.getActionHandler();
    expect(handler).toBeTypeOf("function");

    await handler?.({});

    expect(runHarnessAuditState.runHarnessAuditCommand).toHaveBeenCalledWith({ cwd: "/tmp/workspace" });
    expect(stdoutSpy).toHaveBeenCalledWith("Audit state: approval-required\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Audit detail: Approval required for 'harness-audit': review first.\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Harness gaps: 2\n");
    expect(stdoutSpy).toHaveBeenCalledWith("- runtime-telemetry: missing telemetry store\n");
    expect(stdoutSpy).toHaveBeenCalledWith("- policy: Approval required for 'harness-audit': review first.\n");

    stdoutSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it("prints repair-adapters summary", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/tmp/workspace");

    const cliModule = await import("../../../src/cli.js");
    cliModule.buildProgram();

    const repairCommand = commandState.getCommandMock("repair-adapters");
    const handler = repairCommand?.getActionHandler();
    expect(handler).toBeTypeOf("function");

    await handler?.({});

    expect(runRepairAdaptersState.runRepairAdapters).toHaveBeenCalledWith({ cwd: "/tmp/workspace" });
    expect(stdoutSpy).toHaveBeenCalledWith("Repaired: 1\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Created: 1\n");

    stdoutSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it("prints task environment summary", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/tmp/workspace");

    const cliModule = await import("../../../src/cli.js");
    cliModule.buildProgram();

    const taskEnvCommand = commandState.getCommandMock("task-env start [task...]");
    const handler = taskEnvCommand?.getActionHandler();
    expect(handler).toBeTypeOf("function");

    await handler?.(["ship", "feature"], { base: "main" });

    expect(runTaskEnvState.runTaskEnvCommand).toHaveBeenCalledWith({
      cwd: "/tmp/workspace",
      mode: "start",
      task: "ship feature",
      baseRef: "main",
    });
    expect(stdoutSpy).toHaveBeenCalledWith("Task environment: ship-feature\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Worktree: .bbg/task-envs/ship-feature/worktree\n");

    stdoutSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it("prints Hermes guidance summary", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/tmp/workspace");

    const cliModule = await import("../../../src/cli.js");
    cliModule.buildProgram();

    const hermesCommand = commandState.getCommandMock("hermes query [topic...]");
    const handler = hermesCommand?.getActionHandler();
    expect(handler).toBeTypeOf("function");

    await handler?.(["rollout", "process"]);

    expect(runHermesState.runHermesCommand).toHaveBeenCalledWith({
      cwd: "/tmp/workspace",
      kind: "query",
      topic: "rollout process",
    });
    expect(stdoutSpy).toHaveBeenCalledWith("Hermes: query\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Topic: rollout process\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Spec: commands/hermes-query.md\n");

    stdoutSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it("prints loop start summary", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/tmp/workspace");

    const cliModule = await import("../../../src/cli.js");
    cliModule.buildProgram();

    const loopCommand = commandState.getCommandMock("loop-start");
    const handler = loopCommand?.getActionHandler();
    expect(handler).toBeTypeOf("function");

    await handler?.({ id: "main-loop", checks: "build,tests", maxIterations: "3" });

    expect(runLoopStartState.runLoopStartCommand).toHaveBeenCalledWith({
      cwd: "/tmp/workspace",
      id: "main-loop",
      taskId: undefined,
      envId: undefined,
      checks: ["build", "tests"],
      maxIterations: 3,
      pollIntervalMs: undefined,
      idleTimeoutMs: undefined,
    });
    expect(stdoutSpy).toHaveBeenCalledWith("Loop: main-loop\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Status: waiting-for-change\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Task: ship-feature\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Task environment: ship-feature\n");

    stdoutSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it("prints workflow guidance summary", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/tmp/workspace");

    const cliModule = await import("../../../src/cli.js");
    cliModule.buildProgram();

    const workflowCommand = commandState.getCommandMock("workflow plan [task...]");
    const handler = workflowCommand?.getActionHandler();
    expect(handler).toBeTypeOf("function");

    await handler?.(["ship", "feature"]);

    expect(runWorkflowState.runWorkflowCommand).toHaveBeenCalledWith({
      cwd: "/tmp/workspace",
      kind: "plan",
      task: "ship feature",
    });
    expect(stdoutSpy).toHaveBeenCalledWith("Workflow: plan\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Task: ship feature\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Spec: commands/plan.md\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Hermes recommendations:\n");
    expect(stdoutSpy).toHaveBeenCalledWith(
      "- If similar work may already exist, run `bbg hermes query` before planning from scratch.\n",
    );
    expect(stdoutSpy).toHaveBeenCalledWith("Decisions:\n");
    expect(stdoutSpy).toHaveBeenCalledWith("- taskEnv: required (debug-or-stabilization-task)\n");
    expect(stdoutSpy).toHaveBeenCalledWith("Next: implement, verify\n");

    stdoutSpy.mockRestore();
    cwdSpy.mockRestore();
  });
});
