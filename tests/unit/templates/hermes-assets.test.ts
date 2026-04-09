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

    expect(normalizedSchema).toContain("draft_kind TEXT CHECK (draft_kind IN ('wiki', 'process', 'skill', 'rule'))");
    expect(normalizedSchema).toContain("draft_path TEXT");
    expect(normalizedSchema).toContain("distilled_at TEXT");
    expect(normalizedSchema).toContain("CHECK (status IN ('pending', 'distilled', 'local_only', 'rejected', 'superseded'))");
    expect(schema).not.toContain("org_level");
    expect(schema).not.toContain("global_bbg");
  });

  it("extends K7 draft kinds to include local skill/rule drafts without changing local-only status", async () => {
    const schema = await readFile(join(packageRoot, "templates/generic/.bbg/scripts/hermes-schema.sql"), "utf8");
    const normalized = schema.replace(/\s+/g, " ").toLowerCase();

    expect(normalized).toContain("draft_kind text check (draft_kind in ('wiki', 'process', 'skill', 'rule'))");
    expect(normalized).toContain("status in ('pending', 'distilled', 'local_only', 'rejected', 'superseded')");
    expect(normalized).not.toContain("org_level");
    expect(normalized).not.toContain("global_bbg");
  });

  it("documents Hermes schema migration steps for existing K7A databases", async () => {
    const [schema, knowledgeReadme, distillCommand, distillationProcess] = await Promise.all([
      readFile(join(packageRoot, "templates/generic/.bbg/scripts/hermes-schema.sql"), "utf8"),
      readFile(join(packageRoot, "templates/generic/.bbg/knowledge/README.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-distill.md"), "utf8"),
      readFile(join(packageRoot, "templates/generic/docs/wiki/processes/hermes-distillation.md"), "utf8"),
    ]);
    const normalizedSchema = schema.replace(/\s+/g, " ").toLowerCase();
    const normalizedKnowledgeReadme = knowledgeReadme.replace(/\s+/g, " ").toLowerCase();
    const normalizedDistillCommand = distillCommand.replace(/\s+/g, " ").toLowerCase();
    const normalizedDistillationProcess = distillationProcess.replace(/\s+/g, " ").toLowerCase();

    expect(schema).toContain("ALTER TABLE hermes_candidates ADD COLUMN draft_kind TEXT;");
    expect(schema).toContain("ALTER TABLE hermes_candidates ADD COLUMN draft_path TEXT;");
    expect(schema).toContain("ALTER TABLE hermes_candidates ADD COLUMN distilled_at TEXT;");
    expect(normalizedSchema).toContain("alter table alone is insufficient for upgraded installs");
    expect(normalizedSchema).toContain("rebuild or export-import hermes_candidates from the latest schema");
    expect(normalizedSchema).toContain("old status check still blocks distilled");
    expect(normalizedKnowledgeReadme).toContain("upgraded installs must rebuild or export-import hermes_candidates from the latest schema before using k7a local distillation workflows");
    expect(normalizedDistillCommand).toContain("upgraded installs must rebuild or export-import hermes_candidates from the latest schema before using k7a local distillation workflows");
    expect(normalizedDistillationProcess).toContain("alter table alone is insufficient for upgraded installs because the old status check still blocks distilled");
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

  it("documents K7A candidate boundaries without narrowing the stored taxonomy", async () => {
    const [schema, knowledgeReadme, distillCommand, distillationProcess] = await Promise.all([
      readFile(join(packageRoot, "templates/generic/.bbg/scripts/hermes-schema.sql"), "utf8"),
      readFile(join(packageRoot, "templates/generic/.bbg/knowledge/README.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-distill.md"), "utf8"),
      readFile(join(packageRoot, "templates/generic/docs/wiki/processes/hermes-distillation.md"), "utf8"),
    ]);
    const normalizedSchema = schema.replace(/\s+/g, " ").toLowerCase();
    const normalizedKnowledgeReadme = knowledgeReadme.replace(/\s+/g, " ").toLowerCase();
    const normalizedDistillCommand = distillCommand.replace(/\s+/g, " ").toLowerCase();
    const normalizedDistillationProcess = distillationProcess.replace(/\s+/g, " ").toLowerCase();

    expect(normalizedSchema).toContain("candidate_type in ('wiki', 'skill', 'rule', 'workflow', 'eval', 'memory')");
    expect(normalizedSchema).toContain("k7a distills wiki/process drafts, and k7b adds local skill/rule drafts");
    expect(normalizedSchema).toContain("other candidate types remain reserved for later phases");
    expect(normalizedKnowledgeReadme).toContain("k7a only distills wiki/process drafts");
    expect(normalizedKnowledgeReadme).toContain("other candidate types remain reserved for later phases");
    expect(normalizedDistillCommand).toContain("only wiki/process draft targets are distillable in k7a");
    expect(normalizedDistillCommand).toContain("other candidate types remain reserved for later phases");
    expect(normalizedDistillationProcess).toContain("only wiki/process draft targets are distillable in k7a");
    expect(normalizedDistillationProcess).toContain("other candidate types remain reserved for later phases");
  });

  it("documents K7A as local draft distillation before canonical wiki promotion", async () => {
    const knowledgeReadme = await readFile(join(packageRoot, "templates/generic/.bbg/knowledge/README.md"), "utf8");
    const normalized = knowledgeReadme.replace(/\s+/g, " ").toLowerCase();

    expect(normalized).toContain("local wiki or process drafts");
    expect(normalized).toContain("canonical wiki promotion remains a separate review step");
    expect(normalized).not.toContain("automatic global promotion");
  });

  it("documents K8 local memory routing in the knowledge README", async () => {
    const knowledgeReadme = await readFile(join(packageRoot, "templates/generic/.bbg/knowledge/README.md"), "utf8");
    const normalized = knowledgeReadme.replace(/\s+/g, " ").toLowerCase();

    expect(normalized).toContain("local canonical wiki memory is consulted before local candidate draft memory");
    expect(normalized).toContain("candidate memory remains reviewable draft memory");
    expect(normalized).toContain("raw/runtime artifacts are a fallback layer");
  });

  it("documents K8 local memory routing order and canonical-over-candidate priority", async () => {
    const [queryCommand, routerSkill, routingProcess, wikiIndex] = await Promise.all([
      readFile(join(packageRoot, "commands/hermes-query.md"), "utf8"),
      readFile(join(packageRoot, "skills/hermes-memory-router/SKILL.md"), "utf8"),
      readFile(join(packageRoot, "templates/generic/docs/wiki/processes/hermes-memory-routing.md"), "utf8"),
      readFile(join(packageRoot, "templates/generic/docs/wiki/index.md"), "utf8"),
    ]);
    const normalizedCommand = queryCommand.replace(/\s+/g, " ").toLowerCase();
    const normalizedSkill = routerSkill.replace(/\s+/g, " ").toLowerCase();
    const normalizedProcess = routingProcess.replace(/\s+/g, " ").toLowerCase();
    const normalizedIndex = wikiIndex.replace(/\s+/g, " ").toLowerCase();

    expect(normalizedCommand).toContain("local canonical wiki memory before local candidate memory");
    expect(normalizedCommand).toContain("state whether raw/runtime evidence resolved the answer when fallback reaches that layer");
    expect(normalizedSkill).toContain("canonical over candidate");
    expect(normalizedSkill).toContain("local over raw/runtime evidence");
    expect(normalizedProcess).toContain("1. local canonical wiki memory");
    expect(normalizedProcess).toContain("2. local candidate draft memory");
    expect(normalizedProcess).toContain("3. raw/runtime artifacts only when needed");
    expect(normalizedIndex).toContain("[hermes memory routing](./processes/hermes-memory-routing.md)");
  });

  it("documents K7B local skill/rule draft generation boundaries", async () => {
    const [
      draftSkillCommand,
      draftRuleCommand,
      skillDraftingSkill,
      ruleDraftingSkill,
      draftingProcess,
      distillCommand,
    ] = await Promise.all([
      readFile(join(packageRoot, "commands/hermes-draft-skill.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-draft-rule.md"), "utf8"),
      readFile(join(packageRoot, "skills/hermes-skill-drafting/SKILL.md"), "utf8"),
      readFile(join(packageRoot, "skills/hermes-rule-drafting/SKILL.md"), "utf8"),
      readFile(join(packageRoot, "templates/generic/docs/wiki/processes/hermes-skill-rule-drafting.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-distill.md"), "utf8"),
    ]);
    const normalizedProcess = draftingProcess.toLowerCase();

    expect(draftSkillCommand).toContain("local skill drafts");
    expect(draftRuleCommand).toContain("local rule drafts");
    expect(skillDraftingSkill).toContain("drafts remain non-canonical until separately promoted");
    expect(ruleDraftingSkill).toContain("drafts remain non-canonical until separately promoted");
    expect(normalizedProcess).toContain("k7b adds local skill/rule draft generation");
    expect(normalizedProcess).toContain("canonical promotion remains a separate review step");
    expect(distillCommand).toContain("skill/rule draft targets");
  });

  it("documents K7B skill/rule draft boundaries in the knowledge README", async () => {
    const knowledgeReadme = await readFile(join(packageRoot, "templates/generic/.bbg/knowledge/README.md"), "utf8");
    const normalized = knowledgeReadme.replace(/\s+/g, " ").toLowerCase();

    expect(normalized).toContain("in k7b, local skill/rule draft generation is added alongside wiki/process drafts");
    expect(normalized).toContain("draft skill/rule outputs remain non-canonical until separately promoted");
    expect(normalized).toContain("global promotion remains out of scope in k7b");
  });

  it("keeps K8 query workflows canonical-first and candidate-aware without auto-promotion", async () => {
    const [wikiQueryCommand, wikiQuerySkill, hermesCandidatesCommand, hermesDistillationSkill] = await Promise.all([
      readFile(join(packageRoot, "commands/wiki-query.md"), "utf8"),
      readFile(join(packageRoot, "skills/wiki-query/SKILL.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-candidates.md"), "utf8"),
      readFile(join(packageRoot, "skills/hermes-distillation/SKILL.md"), "utf8"),
    ]);
    const normalizedWikiCommand = wikiQueryCommand.replace(/\s+/g, " ").toLowerCase();
    const normalizedWikiSkill = wikiQuerySkill.replace(/\s+/g, " ").toLowerCase();
    const normalizedCandidates = hermesCandidatesCommand.replace(/\s+/g, " ").toLowerCase();
    const normalizedDistillation = hermesDistillationSkill.replace(/\s+/g, " ").toLowerCase();

    expect(normalizedWikiCommand).toContain("canonical wiki memory before local candidate draft memory");
    expect(normalizedWikiSkill).toContain("candidate memory is a lower-priority fallback than canonical wiki memory");
    expect(normalizedCandidates).toContain("candidate memory is queryable but not canonical");
    expect(normalizedDistillation).toContain("distilled drafts become candidate memory until separately promoted");
  });

  it("adds K9 intake schema without introducing promotion states", async () => {
    const schema = await readFile(join(packageRoot, "templates/generic/.bbg/scripts/hermes-schema.sql"), "utf8");
    const normalized = schema.replace(/\s+/g, " ").toLowerCase();

    expect(normalized).toContain("create table if not exists hermes_source_projects");
    expect(normalized).toContain("create table if not exists hermes_candidate_intake_runs");
    expect(normalized).toContain("create table if not exists hermes_intake_candidates");
    expect(normalized).toContain(
      "normalized_status text not null check (normalized_status in ('pending_review', 'duplicate', 'conflict', 'accepted_local_only', 'rejected'))",
    );
    expect(normalized).toContain("check (imported_count >= 0 and rejected_count >= 0 and conflict_count >= 0)");
    expect(normalized).toContain("unique (intake_run_id, source_candidate_id)");
    expect(normalized).toContain(
      "foreign key (source_project_id) references hermes_source_projects(source_project_id) on delete cascade",
    );
    expect(normalized).toContain(
      "foreign key (intake_run_id) references hermes_candidate_intake_runs(intake_run_id) on delete cascade",
    );
    expect(normalized).toContain("create index if not exists idx_hermes_candidate_intake_runs_source_project_id");
    expect(normalized).toContain("create index if not exists idx_hermes_intake_candidates_intake_run_id");
    expect(normalized).toContain("create index if not exists idx_hermes_intake_candidates_normalized_status");
    expect(normalized).toContain("create index if not exists idx_hermes_intake_candidates_normalized_hash");
    expect(normalized).not.toContain("promoted_global");
    expect(normalized).not.toContain("verified_global");
  });

  it("documents K9 intake as collect-and-normalize without global promotion", async () => {
    const [
      intakeCommand,
      intakeReviewCommand,
      intakeSkill,
      intakeProcess,
      queryCommand,
    ] = await Promise.all([
      readFile(join(packageRoot, "commands/hermes-intake.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-intake-review.md"), "utf8"),
      readFile(join(packageRoot, "skills/hermes-intake/SKILL.md"), "utf8"),
      readFile(join(packageRoot, "templates/generic/docs/wiki/processes/hermes-intake.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-query.md"), "utf8"),
    ]);

    expect(intakeCommand).toContain("collect and normalize candidate objects from multiple projects");
    expect(intakeReviewCommand).toContain("review normalized intake candidates for duplicates and conflicts");
    expect(intakeSkill).toContain("intake records remain non-canonical until K10 verification");
    expect(intakeProcess).toContain("k9 collects and normalizes cross-project candidates");
    expect(intakeProcess).toContain("global promotion is out of scope in k9");
    expect(queryCommand).toContain("intake records are not a canonical memory layer");
  });

  it("documents K9 intake boundaries in knowledge README", async () => {
    const knowledgeReadme = await readFile(join(packageRoot, "templates/generic/.bbg/knowledge/README.md"), "utf8");
    const normalized = knowledgeReadme.replace(/\s+/g, " ").toLowerCase();

    expect(normalized).toContain("in k9, hermes collects and normalizes cross-project candidates");
    expect(normalized).toContain("intake records remain non-canonical until k10 verification");
    expect(normalized).toContain("global promotion remains out of scope in k9");
  });

  it("adds K10 verification and promotion schema without introducing meta-learning automation", async () => {
    const schema = await readFile(join(packageRoot, "templates/generic/.bbg/scripts/hermes-schema.sql"), "utf8");
    const normalized = schema.replace(/\s+/g, " ").toLowerCase();

    expect(normalized).toContain("create table if not exists hermes_verification_runs");
    expect(normalized).toContain("create table if not exists hermes_verification_results");
    expect(normalized).toContain("create table if not exists hermes_promotion_decisions");
    expect(normalized).toContain(
      "decision_status text not null check (decision_status in ('approved', 'rejected', 'deferred'))",
    );
    expect(normalized).not.toContain("auto_promote");
    expect(normalized).not.toContain("meta_learning_score");
  });

  it("documents K10 verification and promotion as evidence-gated and K11-separate", async () => {
    const [verifyCmd, promoteCmd, verifySkill, promoteSkill, processDoc, intakeReviewCmd] = await Promise.all([
      readFile(join(packageRoot, "commands/hermes-verify.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-promote.md"), "utf8"),
      readFile(join(packageRoot, "skills/hermes-verification/SKILL.md"), "utf8"),
      readFile(join(packageRoot, "skills/hermes-promotion/SKILL.md"), "utf8"),
      readFile(join(packageRoot, "templates/generic/docs/wiki/processes/hermes-verification-promotion.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-intake-review.md"), "utf8"),
    ]);
    const normalizedProcess = processDoc.replace(/\s+/g, " ").toLowerCase();

    expect(verifyCmd).toContain("verify intake candidates with explicit evidence checks");
    expect(promoteCmd).toContain("record promotion decisions for verified candidates");
    expect(verifySkill).toContain("verification must be evidence-gated");
    expect(promoteSkill).toContain("promotion decisions must reference verification results");
    expect(normalizedProcess).toContain("k10 verifies candidates before promotion decisions");
    expect(normalizedProcess).toContain("k11 meta-learning remains out of scope");
    expect(intakeReviewCmd).toContain("handoff verified candidates to /hermes-verify");
  });

  it("documents K10 verification/promotion boundaries in knowledge README", async () => {
    const readme = await readFile(join(packageRoot, "templates/generic/.bbg/knowledge/README.md"), "utf8");
    const normalized = readme.replace(/\s+/g, " ").toLowerCase();

    expect(normalized).toContain("k10 verifies candidates before promotion decisions");
    expect(normalized).toContain("promotion decisions remain evidence-gated and auditable");
    expect(normalized).toContain("k11 meta-learning remains out of scope in k10");
  });

  it("adds K11 learning and strategy schema as advisory-only recommendations", async () => {
    const schema = await readFile(join(packageRoot, "templates/generic/.bbg/scripts/hermes-schema.sql"), "utf8");
    const normalized = schema.replace(/\s+/g, " ").toLowerCase();

    expect(normalized).toContain("create table if not exists hermes_learning_runs");
    expect(normalized).toContain("create table if not exists hermes_learning_signals");
    expect(normalized).toContain("create table if not exists hermes_strategy_recommendations");
    expect(normalized).toContain(
      "recommendation_status text not null check (recommendation_status in ('proposed', 'accepted', 'rejected', 'superseded'))",
    );
    expect(normalized).not.toContain("auto_apply_strategy");
    expect(normalized).not.toContain("self_edit_patch");
  });

  it("documents K11 meta-learning as advisory and human-reviewed", async () => {
    const [learnCmd, strategyCmd, learningSkill, strategySkill, processDoc, queryCmd, promoteCmd] = await Promise.all([
      readFile(join(packageRoot, "commands/hermes-learn.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-strategy.md"), "utf8"),
      readFile(join(packageRoot, "skills/hermes-meta-learning/SKILL.md"), "utf8"),
      readFile(join(packageRoot, "skills/hermes-strategy-selection/SKILL.md"), "utf8"),
      readFile(join(packageRoot, "templates/generic/docs/wiki/processes/hermes-meta-learning.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-query.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-promote.md"), "utf8"),
    ]);
    const normalizedProcess = processDoc.replace(/\s+/g, " ").toLowerCase();
    const normalizedPromote = promoteCmd.toLowerCase();

    expect(learnCmd).toContain("derive advisory recommendations from Hermes evidence history");
    expect(strategyCmd).toContain("review and decide Hermes strategy recommendations with human approval");
    expect(learningSkill).toContain("meta-learning outputs are advisory, not auto-applied");
    expect(strategySkill).toContain("strategy changes require explicit human approval");
    expect(normalizedProcess).toContain("k11 computes advisory strategy recommendations from prior evidence");
    expect(normalizedProcess).toContain("k11 does not auto-edit workflows, skills, or rules");
    expect(queryCmd).toContain("k11 recommendations are advisory and do not bypass canonical routing order");
    expect(normalizedPromote).toContain("k11 may consume promotion evidence but does not auto-promote assets");
  });

  it("documents K11 advisory boundaries in knowledge README", async () => {
    const readme = await readFile(join(packageRoot, "templates/generic/.bbg/knowledge/README.md"), "utf8");
    const normalized = readme.replace(/\s+/g, " ").toLowerCase();

    expect(normalized).toContain("k11 derives advisory strategy recommendations from historical evidence");
    expect(normalized).toContain("strategy changes require explicit human approval");
    expect(normalized).toContain("k11 does not auto-edit workflows, skills, rules, or routing policy");
  });

  it("adds K12 strategy adoption and outcomes schema with evidence lineage", async () => {
    const schema = await readFile(join(packageRoot, "templates/generic/.bbg/scripts/hermes-schema.sql"), "utf8");
    const normalized = schema.replace(/\s+/g, " ").toLowerCase();

    expect(normalized).toContain("create table if not exists hermes_strategy_adoptions");
    expect(normalized).toContain("create table if not exists hermes_strategy_outcomes");
    expect(normalized).toContain(
      "adoption_status text not null check (adoption_status in ('planned', 'active', 'rolled_back', 'completed'))",
    );
    expect(normalized).toContain(
      "outcome_verdict text not null check (outcome_verdict in ('improved', 'unchanged', 'regressed', 'inconclusive'))",
    );
    expect(normalized).not.toContain("auto_adopt");
    expect(normalized).not.toContain("autonomous_rollout");
  });
});
