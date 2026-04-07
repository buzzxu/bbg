import { describe, expect, it } from "vitest";

// collectStackInfo requires mocking @inquirer/prompts — test the wrapper behavior
describe("utils/prompts", () => {
  it("exports promptInput, promptSelect, promptConfirm, sanitizePromptValue", { timeout: 20000 }, async () => {
    const mod = await import("../../../src/utils/prompts.js");
    expect(typeof mod.promptInput).toBe("function");
    expect(typeof mod.promptSelect).toBe("function");
    expect(typeof mod.promptConfirm).toBe("function");
    expect(typeof mod.sanitizePromptValue).toBe("function");
  });

  it("exports collectStackInfo", async () => {
    const mod = await import("../../../src/utils/prompts.js");
    expect(typeof mod.collectStackInfo).toBe("function");
  });
});
