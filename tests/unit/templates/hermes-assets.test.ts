import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = join(import.meta.dirname, "../../..");

describe("Hermes K6 governance assets", () => {
  it("keeps Hermes candidate lifecycle local-only in the schema and command docs", async () => {
    const [schema, candidatesCommand] = await Promise.all([
      readFile(join(packageRoot, "templates/generic/.bbg/scripts/hermes-schema.sql"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-candidates.md"), "utf8"),
    ]);
    const normalizedCommand = candidatesCommand.toLowerCase();

    expect(schema).toContain("CHECK (status IN ('pending', 'local_only', 'rejected', 'superseded'))");
    expect(schema).not.toContain("org_level");
    expect(schema).not.toContain("global_bbg");
    expect(candidatesCommand).toContain("refined into canonical local knowledge");
    expect(normalizedCommand).toContain("promotion beyond the local project is out of scope for k6");
  });

  it("documents Hermes schema application for existing knowledge databases", async () => {
    const [knowledgeReadme, runtimeDoc] = await Promise.all([
      readFile(join(packageRoot, "templates/generic/.bbg/knowledge/README.md"), "utf8"),
      readFile(join(packageRoot, "templates/generic/docs/wiki/processes/hermes-runtime.md"), "utf8"),
    ]);
    const normalizedKnowledgeReadme = knowledgeReadme.replace(/\s+/g, " ");

    expect(knowledgeReadme).toContain("Existing projects must apply `.bbg/scripts/hermes-schema.sql`");
    expect(normalizedKnowledgeReadme).toContain("before using Hermes-backed workflows");
    expect(runtimeDoc).toContain("apply `.bbg/scripts/hermes-schema.sql` to the existing database");
  });
});
