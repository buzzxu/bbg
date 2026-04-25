import { beforeEach, describe, expect, it, vi } from "vitest";

type CommandInstance = {
  name: ReturnType<typeof vi.fn>;
  description: ReturnType<typeof vi.fn>;
  version: ReturnType<typeof vi.fn>;
  command: ReturnType<typeof vi.fn>;
  parse: ReturnType<typeof vi.fn>;
  parseAsync: ReturnType<typeof vi.fn>;
};

const commanderState = vi.hoisted(() => {
  const instances: CommandInstance[] = [];
  let nextParseAsyncError: unknown;

  const createCommandBuilder = () => {
    const builder = {
      description: vi.fn(() => builder),
      option: vi.fn(() => builder),
      requiredOption: vi.fn(() => builder),
      hideHelp: vi.fn(() => builder),
      command: vi.fn(() => createCommandBuilder()),
      action: vi.fn(() => builder),
    };

    return builder;
  };

  const Command = vi.fn(() => {
    const instance: CommandInstance = {
      name: vi.fn(),
      description: vi.fn(),
      version: vi.fn(),
      command: vi.fn(() => createCommandBuilder()),
      parse: vi.fn(),
      parseAsync: vi.fn(async () => {
        if (nextParseAsyncError !== undefined) {
          throw nextParseAsyncError;
        }
      }),
    };

    instance.name.mockReturnValue(instance);
    instance.description.mockReturnValue(instance);
    instance.version.mockReturnValue(instance);
    instances.push(instance);
    return instance;
  });

  const setNextParseAsyncError = (error: unknown) => {
    nextParseAsyncError = error;
  };

  const reset = () => {
    nextParseAsyncError = undefined;
    instances.length = 0;
    Command.mockClear();
  };

  return {
    Command,
    instances,
    setNextParseAsyncError,
    reset,
  };
});

vi.mock("commander", () => ({ Command: commanderState.Command }));
vi.mock("chalk", () => ({
  default: {
    red: (value: string) => `[red]${value}[/red]`,
    yellow: (value: string) => `[yellow]${value}[/yellow]`,
  },
}));
vi.mock("../../../src/commands/init.js", () => ({ runInit: vi.fn() }));
vi.mock("../../../src/commands/add-repo.js", () => ({ runAddRepo: vi.fn() }));
vi.mock("../../../src/commands/doctor.js", () => ({ runDoctor: vi.fn() }));
vi.mock("../../../src/commands/sync.js", () => ({ runSync: vi.fn() }));
vi.mock("../../../src/commands/release.js", () => ({ runRelease: vi.fn() }));
vi.mock("../../../src/commands/upgrade.js", () => ({ runUpgrade: vi.fn() }));
vi.mock("../../../src/commands/uninstall.js", () => ({ runUninstall: vi.fn() }));
vi.mock("../../../src/commands/quality-gate.js", () => ({ runQualityGateCommand: vi.fn() }));
vi.mock("../../../src/commands/checkpoint.js", () => ({ runCheckpointCommand: vi.fn() }));
vi.mock("../../../src/commands/verify.js", () => ({ runVerifyCommand: vi.fn() }));
vi.mock("../../../src/commands/review-record.js", () => ({ runReviewRecordCommand: vi.fn() }));
vi.mock("../../../src/commands/sessions.js", () => ({ runSessionsCommand: vi.fn() }));
vi.mock("../../../src/commands/eval.js", () => ({ runEvalCommand: vi.fn() }));
vi.mock("../../../src/commands/harness-audit.js", () => ({ runHarnessAuditCommand: vi.fn() }));
vi.mock("../../../src/commands/model-route.js", () => ({ runModelRouteCommand: vi.fn() }));
vi.mock("../../../src/commands/repair-adapters.js", () => ({ runRepairAdapters: vi.fn() }));
vi.mock("../../../src/commands/hermes.js", () => ({ runHermesCommand: vi.fn() }));
vi.mock("../../../src/commands/task-env.js", () => ({ runTaskEnvCommand: vi.fn() }));
vi.mock("../../../src/commands/doc-garden.js", () => ({ runDocGardenCommand: vi.fn() }));
vi.mock("../../../src/commands/observe.js", () => ({ runObserveCommand: vi.fn() }));
vi.mock("../../../src/commands/loop-start.js", () => ({ runLoopStartCommand: vi.fn() }));
vi.mock("../../../src/commands/loop-status.js", () => ({ runLoopStatusCommand: vi.fn() }));
vi.mock("../../../src/commands/task-start.js", () => ({ runTaskStartCommand: vi.fn() }));
vi.mock("../../../src/commands/workflow.js", () => ({ runWorkflowCommand: vi.fn() }));
vi.mock("../../../src/commands/start.js", () => ({ runStartCommand: vi.fn() }));
vi.mock("../../../src/commands/resume.js", () => ({ runResumeCommand: vi.fn() }));
vi.mock("../../../src/commands/status.js", () => ({ runStatusCommand: vi.fn() }));
vi.mock("../../../src/commands/analyze.js", () => ({ runAnalyzeCommand: vi.fn() }));
vi.mock("../../../src/commands/analyze-repo.js", () => ({ runAnalyzeRepoCommand: vi.fn() }));
vi.mock("../../../src/commands/deliver.js", () => ({ runDeliverCommand: vi.fn() }));
vi.mock("../../../src/commands/cross-audit.js", () => ({ runCrossAuditCommand: vi.fn() }));

describe("cli command registration", () => {
  beforeEach(() => {
    vi.resetModules();
    commanderState.reset();
    process.exitCode = undefined;
  });

  it("exports buildProgram and registers runtime-backed quality commands", { timeout: 20000 }, async () => {
    const cliModule = await import("../../../src/cli.js");

    expect(cliModule.buildProgram).toBeTypeOf("function");
    cliModule.buildProgram();

    const latestInstance = commanderState.instances.at(-1);
    expect(latestInstance).toBeDefined();
    expect(latestInstance?.command.mock.calls.map(([name]) => name)).toEqual([
      "init",
      "add-repo-agent [source]",
      "start-agent [task...]",
      "resume-agent <taskId>",
      "status",
      "doctor",
      "sync",
      "release",
      "upgrade",
      "uninstall",
      "repair-adapters",
      "task-env",
      "doc-garden",
      "observe",
      "workflow-agent",
      "hermes-agent",
      "loop-start",
      "loop-status",
      "quality-gate",
      "checkpoint",
      "verify",
      "review-record <taskId>",
      "sessions",
      "eval",
      "harness-audit",
      "model-route-agent [task...]",
      "task-start-agent [requirement...]",
      "analyze-agent [focus...]",
      "analyze-repo-agent <repo>",
      "deliver-agent",
      "cross-audit-agent",
    ]);
  });

  it.each([
    ["config", 2],
    ["config-parse", 2],
    ["config-validation", 2],
    ["git", 3],
    ["template", 4],
    ["sigint", 130],
    ["unknown", 1],
  ] as const)("maps global error boundary to exit code %s", async (errorKind, expectedExitCode) => {
    const errorsModule = await import("../../../src/utils/errors.js");
    const configReadWriteModule = await import("../../../src/config/read-write.js");
    const errorByKind = {
      config: new errorsModule.BbgConfigError("config", "BBG_CONFIG"),
      "config-parse": new configReadWriteModule.ConfigParseError("Invalid config JSON", new Error("bad json")),
      "config-validation": new configReadWriteModule.ConfigValidationError("Config JSON does not match required shape"),
      git: new errorsModule.BbgGitError("git", "BBG_GIT"),
      template: new errorsModule.BbgTemplateError("template", "BBG_TEMPLATE"),
      sigint: Object.assign(new Error("Interrupted"), { code: "SIGINT" }),
      unknown: new Error("unknown"),
    };
    const error = errorByKind[errorKind];

    commanderState.setNextParseAsyncError(error);

    const cliModule = await import("../../../src/cli.js");
    await cliModule.runCli().catch(cliModule.handleCliError);

    const firstInstance = commanderState.instances[0];
    expect(firstInstance?.parseAsync).toHaveBeenCalledWith(process.argv);
    expect(process.exitCode).toBe(expectedExitCode);
  });

  it("prints BbgError details with code and hint to stderr", async () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const errorsModule = await import("../../../src/utils/errors.js");
    const error = new errorsModule.BbgConfigError("missing config", "BBG_CONFIG_MISSING", "run bbg init");

    commanderState.setNextParseAsyncError(error);

    const cliModule = await import("../../../src/cli.js");
    await cliModule.runCli().catch(cliModule.handleCliError);

    expect(stderrSpy).toHaveBeenCalledWith("[red][BBG_CONFIG_MISSING] missing config[/red]\n");
    expect(stderrSpy).toHaveBeenCalledWith("[yellow]Hint: run bbg init[/yellow]\n");

    stderrSpy.mockRestore();
  });

  it("prints Error message to stderr for non-BbgError", async () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const error = new Error("boom");

    commanderState.setNextParseAsyncError(error);

    const cliModule = await import("../../../src/cli.js");
    await cliModule.runCli().catch(cliModule.handleCliError);

    expect(stderrSpy).toHaveBeenCalledWith("[red]boom[/red]\n");

    stderrSpy.mockRestore();
  });
});
