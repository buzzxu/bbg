import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeAnalyzeHermesIntake } from "../../../src/analyze/hermes-intake.js";
import { readTextFile, writeTextFile } from "../../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-hermes-intake-"));
  tempDirs.push(dir);
  return dir;
}

describe("analyze Hermes intake", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("carries evidence-index and code references into Hermes candidates", async () => {
    const cwd = await makeTempDir();
    const runId = "run-1";
    const knowledgeItemId = "ak:analysis-dimension:repo-a:checkout:123";
    const snapshotPath = `.bbg/analyze/runs/${runId}/knowledge-snapshot.json`;

    await writeTextFile(
      join(cwd, ".bbg", "knowledge", "workspace", "knowledge-items.json"),
      `${JSON.stringify(
        {
          items: [
            {
              id: knowledgeItemId,
              runId,
              scope: "workspace",
              repo: "repo-a",
              kind: "analysis-dimension",
              title: "Checkout",
              summary: "Checkout capability",
              payloadPath: ".bbg/knowledge/workspace/capabilities.json",
              payloadPointer: "/capabilities/0",
              confidence: 0.82,
              status: "inferred",
              tags: ["capability", "repo-a"],
              relatedIds: [],
              provenance: [
                {
                  source: "business-signal",
                  ref: "analyze:capability",
                  description: "Derived from evidence.",
                  confidenceImpact: 0.12,
                  codeRefs: [],
                },
              ],
              freshness: {
                createdAt: "2026-04-24T00:00:00.000Z",
                updatedAt: "2026-04-24T00:00:00.000Z",
                lastValidatedAt: null,
                lastSourceChangeAt: null,
                freshnessStatus: "fresh",
              },
              history: {
                firstSeenRunId: runId,
                lastSeenRunId: runId,
                changeKind: "new",
                supersedes: [],
                supersededBy: null,
              },
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    await writeTextFile(
      join(cwd, ".bbg", "knowledge", "workspace", "run-diff.json"),
      `${JSON.stringify({ changes: [{ knowledgeItemId, changeKind: "new" }] }, null, 2)}\n`,
    );
    await writeTextFile(
      join(cwd, ".bbg", "knowledge", "workspace", "evidence-index.json"),
      `${JSON.stringify(
        {
          evidence: [
            {
              id: "ev:api-entrypoint:checkout",
              relatedKnowledgeIds: [knowledgeItemId],
              sourceRefs: ["repo:repo-a"],
              codeRefs: [
                {
                  repo: "repo-a",
                  file: "src/api/checkout.ts",
                  lineRange: [7, 7],
                  snippet: "client API /api/checkout",
                },
              ],
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    await writeTextFile(
      join(cwd, snapshotPath),
      `${JSON.stringify(
        {
          version: 1,
          runId,
          createdAt: "2026-04-24T00:00:00.000Z",
          scope: "workspace",
          repos: ["repo-a"],
          focusQuery: null,
          interviewMode: "off",
          paths: {
            knowledgeItems: ".bbg/knowledge/workspace/knowledge-items.json",
            evidenceIndex: ".bbg/knowledge/workspace/evidence-index.json",
            lifecycle: ".bbg/knowledge/workspace/lifecycle.json",
            runDiff: ".bbg/knowledge/workspace/run-diff.json",
            wikiSummaryPaths: [],
            domainFiles: [],
          },
          counts: {
            knowledgeItems: 1,
            evidenceItems: 1,
            candidateEligibleItems: 1,
          },
          confidenceProfile: {
            high: 1,
            medium: 0,
            low: 0,
          },
        },
        null,
        2,
      )}\n`,
    );

    const result = await writeAnalyzeHermesIntake({ cwd, runId, snapshotPath });

    expect(result.candidatesAdded).toBe(1);
    const candidates = JSON.parse(
      await readTextFile(join(cwd, ".bbg", "knowledge", "hermes", "analyze-candidates.json")),
    ) as { candidates: Array<{ evidenceRefs: string[]; codeRefs: string[] }> };
    expect(candidates.candidates[0]?.evidenceRefs).toEqual(
      expect.arrayContaining(["analyze:capability", "ev:api-entrypoint:checkout", "repo:repo-a"]),
    );
    expect(candidates.candidates[0]?.codeRefs).toEqual(expect.arrayContaining(["repo-a:src/api/checkout.ts:7-7"]));
  });
});
