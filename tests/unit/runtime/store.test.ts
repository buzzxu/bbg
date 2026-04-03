import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildDefaultRuntimeConfig } from "../../../src/runtime/schema.js";
import { appendTelemetryEvent } from "../../../src/runtime/telemetry.js";
import { RuntimeStoreError, readJsonStore, writeJsonStore } from "../../../src/runtime/store.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-runtime-store-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("runtime store", () => {
  it("writes json with indentation and trailing newline", async () => {
    const cwd = await makeTempDir();
    const filePath = join(cwd, "state.json");

    await writeJsonStore(filePath, {
      version: 1,
      items: ["a"],
    });

    await expect(readFile(filePath, "utf8")).resolves.toBe('{' + '\n' + '  "version": 1,' + '\n' + '  "items": [' + '\n' + '    "a"' + '\n' + '  ]' + '\n' + '}' + '\n');
  });

  it("returns the fallback value when the file does not exist", async () => {
    const cwd = await makeTempDir();
    const fallback = { version: 1, items: [] as string[] };

    await expect(readJsonStore(join(cwd, "missing.json"), fallback)).resolves.toEqual(fallback);
  });

  it("throws a runtime store error for invalid json", async () => {
    const cwd = await makeTempDir();
    const filePath = join(cwd, "broken.json");

    await writeJsonStore(filePath, { version: 1 });
    await rm(filePath);
    await import("../../../src/utils/fs.js").then(({ writeTextFile }) => writeTextFile(filePath, "not-json\n"));

    await expect(readJsonStore(filePath, { version: 1 })).rejects.toThrow(RuntimeStoreError);
    await expect(readJsonStore(filePath, { version: 1 })).rejects.not.toThrow(filePath);
  });

  it("throws a runtime store error for malformed telemetry documents", async () => {
    const cwd = await makeTempDir();
    const runtime = {
      ...buildDefaultRuntimeConfig(),
      telemetry: {
        ...buildDefaultRuntimeConfig().telemetry,
        enabled: true,
      },
    };
    const telemetryPath = join(cwd, ".bbg", "telemetry", "events.json");

    await import("../../../src/utils/fs.js").then(({ writeTextFile }) =>
      writeTextFile(telemetryPath, '{\n  "version": 1,\n  "events": {}\n}\n'),
    );

    await expect(
      appendTelemetryEvent(cwd, runtime, {
        type: "command.run",
        details: {},
      }),
    ).rejects.toThrow(RuntimeStoreError);
  });
});
