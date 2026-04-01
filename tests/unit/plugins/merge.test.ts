import { describe, expect, it } from "vitest";
import { mergePluginTemplates } from "../../../src/plugins/merge.js";
import type { LoadedPlugin } from "../../../src/plugins/types.js";
import type { RenderTemplateTask } from "../../../src/templates/render.js";

describe("plugins/merge", () => {
  it("appends plugin templates to built-in templates", () => {
    const builtinTemplates: RenderTemplateTask[] = [
      { source: "agents/planner.md", destination: "agents/planner.md", mode: "copy" },
    ];

    const plugins: LoadedPlugin[] = [
      {
        manifest: {
          name: "my-plugin",
          version: "1.0.0",
          description: "Test",
          agents: ["custom-reviewer"],
        },
        root: "/path/to/plugin",
        source: "local",
      },
    ];

    const result = mergePluginTemplates(builtinTemplates, plugins);

    expect(result.length).toBeGreaterThan(builtinTemplates.length);
    const customAgent = result.find((t) => t.destination === "agents/custom-reviewer.md");
    expect(customAgent).toBeDefined();
    expect(customAgent!.mode).toBe("copy");
  });

  it("returns built-in templates unchanged when no plugins", () => {
    const builtinTemplates: RenderTemplateTask[] = [
      { source: "agents/planner.md", destination: "agents/planner.md", mode: "copy" },
    ];

    const result = mergePluginTemplates(builtinTemplates, []);

    expect(result).toEqual(builtinTemplates);
  });

  it("does not duplicate existing built-in templates", () => {
    const builtinTemplates: RenderTemplateTask[] = [
      { source: "agents/planner.md", destination: "agents/planner.md", mode: "copy" },
    ];

    const plugins: LoadedPlugin[] = [
      {
        manifest: {
          name: "my-plugin",
          version: "1.0.0",
          description: "Test",
          agents: ["planner"], // conflicts with built-in
        },
        root: "/path/to/plugin",
        source: "local",
      },
    ];

    const result = mergePluginTemplates(builtinTemplates, plugins);

    const plannerTasks = result.filter((t) => t.destination === "agents/planner.md");
    expect(plannerTasks).toHaveLength(1); // No duplicates
  });

  it("merges skills from plugins", () => {
    const builtinTemplates: RenderTemplateTask[] = [];

    const plugins: LoadedPlugin[] = [
      {
        manifest: {
          name: "my-plugin",
          version: "1.0.0",
          description: "Test",
          skills: ["custom-debugging"],
        },
        root: "/path/to/plugin",
        source: "local",
      },
    ];

    const result = mergePluginTemplates(builtinTemplates, plugins);

    const customSkill = result.find((t) => t.destination === "skills/custom-debugging/SKILL.md");
    expect(customSkill).toBeDefined();
  });
});
