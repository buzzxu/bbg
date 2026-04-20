import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearAnalyzeInterviewPendingState,
  readAnalyzeInterviewPendingState,
  writeAnalyzeInterviewPendingState,
} from "../../../src/runtime/analyze-interview.js";
import { writeTextFile } from "../../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-analyze-interview-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("runtime/analyze-interview", () => {
  it("writes, reads, and clears pending interview state", async () => {
    const cwd = await makeTempDir();

    await writeAnalyzeInterviewPendingState(cwd, {
      version: 1,
      mode: "guided",
      createdAt: "2026-04-19T12:00:00.000Z",
      updatedAt: "2026-04-19T12:00:00.000Z",
      questions: [
        {
          key: "businessGoal",
          question: "What is the core business goal of this system?",
          reason: "confidence 0.28 is below 0.65",
          priority: 1,
        },
      ],
      answers: {
        businessGoal: "Support account management and checkout.",
      },
    });

    const stored = await readAnalyzeInterviewPendingState(cwd);
    expect(stored?.mode).toBe("guided");
    expect(stored?.questions).toHaveLength(1);
    expect(stored?.answers.businessGoal).toContain("checkout");

    await clearAnalyzeInterviewPendingState(cwd);
    expect(await readAnalyzeInterviewPendingState(cwd)).toBeNull();
  });

  it("ignores invalid persisted pending interview state", async () => {
    const cwd = await makeTempDir();
    await writeTextFile(join(cwd, ".bbg", "analyze", "interview", "pending.json"), '{"mode":"guided"}');

    await expect(readAnalyzeInterviewPendingState(cwd)).resolves.toBeNull();
    expect(await readdir(join(cwd, ".bbg", "quarantine", "analyze"))).toHaveLength(1);
  });
});
