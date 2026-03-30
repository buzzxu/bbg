import { detectDeps } from "./detect-deps.js";
import { detectStack } from "./detect-stack.js";
import { detectStructure } from "./detect-structure.js";
import { detectTesting } from "./detect-testing.js";

export async function analyzeRepo(repoPath: string): Promise<{
  stack: Awaited<ReturnType<typeof detectStack>>;
  structure: Awaited<ReturnType<typeof detectStructure>>;
  deps: Awaited<ReturnType<typeof detectDeps>>;
  testing: Awaited<ReturnType<typeof detectTesting>>;
}> {
  const [stack, structure, deps, testing] = await Promise.all([
    detectStack(repoPath),
    detectStructure(repoPath),
    detectDeps(repoPath),
    detectTesting(repoPath),
  ]);

  return { stack, structure, deps, testing };
}
