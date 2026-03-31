import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import fg from "fast-glob";
import { exists, readIfExists } from "../utils/fs.js";

export interface TestingInfo {
  framework: string;
  hasTestDir: boolean;
  testPattern: string;
}

export async function detectTesting(repoPath: string): Promise<TestingInfo> {
  let framework = "unknown";

  const packageJsonPath = resolve(repoPath, "package.json");
  if (await exists(packageJsonPath)) {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {}),
    };
    const hasVitest = Boolean(deps.vitest);
    const hasJest = Boolean(deps.jest);
    const hasTestingLibrary = Object.keys(deps).some((name) => name.startsWith("@testing-library/"));

    if (hasVitest) {
      framework = hasTestingLibrary ? "vitest+testing-library" : "vitest";
    } else if (hasJest) {
      framework = hasTestingLibrary ? "jest+testing-library" : "jest";
    } else if (hasTestingLibrary) {
      framework = "testing-library";
    }
  }

  if (framework === "unknown") {
    const pomPath = resolve(repoPath, "pom.xml");
    const gradlePath = resolve(repoPath, "build.gradle");
    const gradleKtsPath = resolve(repoPath, "build.gradle.kts");
    const content = `${await readIfExists(pomPath)}\n${await readIfExists(gradlePath)}\n${await readIfExists(gradleKtsPath)}`;
    if (content.includes("junit")) {
      framework = "junit";
    }
  }

  if (framework === "unknown") {
    const requirementsPath = resolve(repoPath, "requirements.txt");
    const pyprojectPath = resolve(repoPath, "pyproject.toml");
    const content = `${await readIfExists(requirementsPath)}\n${await readIfExists(pyprojectPath)}`;
    if (content.includes("pytest")) {
      framework = "pytest";
    }
  }

  const goModPath = resolve(repoPath, "go.mod");
  const goTests = await fg("**/*_test.go", { cwd: repoPath, dot: true, onlyFiles: true });
  if (framework === "unknown" && (await exists(goModPath)) && goTests.length > 0) {
    framework = "go-test";
  }

  const hasNamedTestDir =
    (await exists(resolve(repoPath, "__tests__"))) ||
    (await exists(resolve(repoPath, "test"))) ||
    (await exists(resolve(repoPath, "tests"))) ||
    (await exists(resolve(repoPath, "src/test")));

  const hasSpecOrTest =
    (await fg(["**/*.test.*", "**/*.spec.*"], { cwd: repoPath, dot: true, onlyFiles: true })).length > 0;
  const hasPyTestPattern = (await fg(["**/test_*.py"], { cwd: repoPath, dot: true, onlyFiles: true })).length > 0;

  const hasTestDir = hasNamedTestDir || hasSpecOrTest || hasPyTestPattern || goTests.length > 0;

  let testPattern = "none";
  if (await exists(resolve(repoPath, "src/test"))) {
    testPattern = "src/test/**";
  } else if (goTests.length > 0) {
    testPattern = "*_test.go";
  } else if (hasPyTestPattern) {
    testPattern = "test_*.py";
  } else if (hasSpecOrTest) {
    testPattern = "*.test.*";
  } else if (await exists(resolve(repoPath, "__tests__"))) {
    testPattern = "__tests__/**";
  }

  return { framework, hasTestDir, testPattern };
}
