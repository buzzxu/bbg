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
        gaps: ["runtime-telemetry: missing telemetry store", "policy: Approval required for 'harness-audit': review first."],
      },
    });
  });

  it("wires command metadata and parses argv", { timeout: 30000 }, async () => {
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
    expect(initCommand?.description).toHaveBeenCalledWith(
      "Initialize bbg project files in current directory",
    );
    expect(initCommand?.option).toHaveBeenNthCalledWith(
      1,
      "-y, --yes",
      "Accept defaults and skip prompts",
      false,
    );
    expect(initCommand?.option).toHaveBeenNthCalledWith(
      2,
      "--dry-run",
      "Show files that would be created",
      false,
    );
    expect(initCommand?.action).toHaveBeenCalledTimes(1);
    const evalCommand = commandState.getCommandMock("eval");
    const evalSeedCommand = commandState.getCommandMock("eval seed");
    const evalRunCommand = commandState.getCommandMock("eval run");
    expect(evalCommand?.command).toHaveBeenNthCalledWith(1, "seed");
    expect(evalCommand?.command).toHaveBeenNthCalledWith(2, "run");
    expect(evalSeedCommand?.description).toHaveBeenCalledWith(
      "Seed starter eval dataset, experiment, and fixture workspace",
    );
    expect(evalRunCommand?.option).toHaveBeenNthCalledWith(1, "--dataset <path>", "Dataset JSON path");
    expect(evalRunCommand?.option).toHaveBeenNthCalledWith(2, "--experiment <path>", "Experiment JSON path");
    expect(commandState.parse).not.toHaveBeenCalled();
    expect(commandState.parseAsync).toHaveBeenCalledTimes(1);
    expect(commandState.parseAsync).toHaveBeenCalledWith(process.argv);
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
});
