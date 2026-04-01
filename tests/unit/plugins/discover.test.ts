import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeTextFile } from "../../../src/utils/fs.js";
import { discoverPlugins } from "../../../src/plugins/discover.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-plugin-discover-"));
  tempDirs.push(dir);
  return dir;
}

describe("plugins/discover", () => {
  afterEach(async () => {
    const { rm } = await import("node:fs/promises");
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("returns empty array when no plugin directories exist", async () => {
    const cwd = await makeTempDir();
    const plugins = await discoverPlugins(cwd);
    expect(plugins).toEqual([]);
  });

  it("discovers plugins in .bbg/plugins/ directory", async () => {
    const cwd = await makeTempDir();
    const pluginDir = join(cwd, ".bbg", "plugins", "my-plugin");
    await writeTextFile(
      join(pluginDir, "plugin.json"),
      JSON.stringify({
        name: "my-plugin",
        version: "1.0.0",
        description: "A test plugin",
        agents: ["custom-agent"],
      }),
    );
    await writeTextFile(join(pluginDir, "agents", "custom-agent.md"), "# Custom Agent\n");

    const plugins = await discoverPlugins(cwd);

    expect(plugins).toHaveLength(1);
    expect(plugins[0].manifest.name).toBe("my-plugin");
    expect(plugins[0].source).toBe("local");
  });

  it("discovers plugins from custom directories", async () => {
    const cwd = await makeTempDir();
    const customDir = join(cwd, "custom-plugins");
    const pluginDir = join(customDir, "extra-plugin");
    await writeTextFile(
      join(pluginDir, "plugin.json"),
      JSON.stringify({
        name: "extra-plugin",
        version: "1.0.0",
        description: "Extra",
      }),
    );

    const plugins = await discoverPlugins(cwd, [customDir]);

    expect(plugins).toHaveLength(1);
    expect(plugins[0].manifest.name).toBe("extra-plugin");
  });

  it("skips plugin directories without plugin.json", async () => {
    const cwd = await makeTempDir();
    const pluginDir = join(cwd, ".bbg", "plugins", "incomplete");
    await writeTextFile(join(pluginDir, "agents", "something.md"), "# No manifest\n");

    const plugins = await discoverPlugins(cwd);

    expect(plugins).toEqual([]);
  });
});
