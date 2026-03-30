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
    action: ReturnType<typeof vi.fn>;
    getActionHandler: () => CommandAction | undefined;
    reset: () => void;
  };

  const commandMocks = new Map<string, CommandMock>();

  const createCommandMock = (): CommandMock => {
    let actionHandler: CommandAction | undefined;
    const commandBuilder = {
      description: vi.fn(() => commandBuilder),
      option: vi.fn(() => commandBuilder),
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
        commandBuilder.action.mockClear();
      },
    };
  };

  const command = vi.fn((commandName: string) => {
    if (!commandMocks.has(commandName)) {
      commandMocks.set(commandName, createCommandMock());
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
  });

  it("wires command metadata and parses argv", async () => {
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
});
