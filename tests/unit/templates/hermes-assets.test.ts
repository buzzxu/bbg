import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = join(import.meta.dirname, "../../..");

describe("Hermes governance assets", () => {
  it("keeps Hermes candidate lifecycle local-only in the schema and command docs", async () => {
    const [schema, candidatesCommand] = await Promise.all([
      readFile(join(packageRoot, "templates/generic/.bbg/scripts/hermes-schema.sql"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-candidates.md"), "utf8"),
    ]);
    const normalizedCommand = candidatesCommand.toLowerCase();

    expect(schema).toContain("CHECK (status IN ('pending', 'distilled', 'local_only', 'rejected', 'superseded'))");
    expect(schema).not.toContain("org_level");
    expect(schema).not.toContain("global_bbg");
    expect(candidatesCommand).toContain(
      "distilled into draft wiki/process outputs or resolved as local-only, rejected, or superseded",
    );
    expect(normalizedCommand).toContain("canonical promotion beyond the local project draft workflow is out of scope for k7a");
  });

  it("keeps Hermes distillation local-only and draft-oriented for K7A", async () => {
    const schema = await readFile(join(packageRoot, "templates/generic/.bbg/scripts/hermes-schema.sql"), "utf8");
    const normalizedSchema = schema.replace(/\s+/g, " ");

    expect(normalizedSchema).toContain("draft_kind TEXT CHECK (draft_kind IN ('wiki', 'process'))");
    expect(normalizedSchema).toContain("draft_path TEXT");
    expect(normalizedSchema).toContain("distilled_at TEXT");
    expect(normalizedSchema).toContain("CHECK (status IN ('pending', 'distilled', 'local_only', 'rejected', 'superseded'))");
    expect(schema).not.toContain("org_level");
    expect(schema).not.toContain("global_bbg");
  });

  it("documents Hermes schema migration steps for existing K7A databases", async () => {
    const schema = await readFile(join(packageRoot, "templates/generic/.bbg/scripts/hermes-schema.sql"), "utf8");

    expect(schema).toContain("ALTER TABLE hermes_candidates ADD COLUMN draft_kind TEXT;");
    expect(schema).toContain("ALTER TABLE hermes_candidates ADD COLUMN draft_path TEXT;");
    expect(schema).toContain("ALTER TABLE hermes_candidates ADD COLUMN distilled_at TEXT;");
    expect(schema).toContain("need `distilled` enforced at the database level for upgraded installs, rebuild");
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

  it("documents K7A distillation as local draft creation before canonical promotion", async () => {
    const [distillCommand, refineCommand, distillationSkill, distillationProcess, candidatesCommand] = await Promise.all([
      readFile(join(packageRoot, "commands/hermes-distill.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-refine.md"), "utf8"),
      readFile(join(packageRoot, "skills/hermes-distillation/SKILL.md"), "utf8"),
      readFile(join(packageRoot, "templates/generic/docs/wiki/processes/hermes-distillation.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-candidates.md"), "utf8"),
    ]);
    const normalizedCandidatesCommand = candidatesCommand.toLowerCase();

    expect(distillCommand).toContain("distilled into local wiki or process drafts");
    expect(refineCommand).toContain("before canonical wiki promotion");
    expect(distillationSkill).toContain("Create local draft outputs, not canonical edits");
    expect(distillationProcess).toContain("Canonical wiki promotion remains a separate review step");
    expect(normalizedCandidatesCommand).toContain("distill strong local candidates into draft wiki/process outputs");
  });

  it("documents K7A as local draft distillation before canonical wiki promotion", async () => {
    const knowledgeReadme = await readFile(join(packageRoot, "templates/generic/.bbg/knowledge/README.md"), "utf8");
    const normalized = knowledgeReadme.replace(/\s+/g, " ").toLowerCase();

    expect(normalized).toContain("local wiki or process drafts");
    expect(normalized).toContain("canonical wiki promotion remains a separate review step");
    expect(normalized).not.toContain("automatic global promotion");
  });
});
