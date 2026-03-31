import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { StackInfo } from "../config/schema.js";
import { exists, readIfExists } from "../utils/fs.js";

async function detectNodeStack(repoPath: string): Promise<StackInfo> {
  const packageJsonPath = resolve(repoPath, "package.json");
  const tsconfigPath = resolve(repoPath, "tsconfig.json");
  const packageJsonText = await readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(packageJsonText) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const deps = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };

  let framework = "unknown";
  if (deps.next) {
    framework = "next";
  } else if (deps.nuxt) {
    framework = "nuxt";
  } else if (deps.vue) {
    framework = "vue";
  } else if (deps.react) {
    framework = "react";
  }

  let testFramework = "unknown";
  if (deps.vitest) {
    testFramework = "vitest";
  } else if (deps.jest) {
    testFramework = "jest";
  }

  let packageManager = "npm";
  if (await exists(resolve(repoPath, "pnpm-lock.yaml"))) {
    packageManager = "pnpm";
  } else if (await exists(resolve(repoPath, "yarn.lock"))) {
    packageManager = "yarn";
  } else if (await exists(resolve(repoPath, "package-lock.json"))) {
    packageManager = "npm";
  }

  return {
    language: (await exists(tsconfigPath)) ? "typescript" : "javascript",
    framework,
    buildTool: packageManager,
    testFramework,
    packageManager,
  };
}

export async function detectStack(repoPath: string): Promise<StackInfo> {
  const pomPath = resolve(repoPath, "pom.xml");
  if (await exists(pomPath)) {
    const content = await readFile(pomPath, "utf8");

    return {
      language: "java",
      framework: content.includes("spring-boot") ? "spring-boot" : "unknown",
      buildTool: "maven",
      testFramework: content.includes("junit") ? "junit" : "unknown",
      packageManager: "maven",
    };
  }

  const gradlePath = resolve(repoPath, "build.gradle");
  const gradleKtsPath = resolve(repoPath, "build.gradle.kts");
  if ((await exists(gradlePath)) || (await exists(gradleKtsPath))) {
    const content = await readIfExists(gradlePath) || (await readIfExists(gradleKtsPath));

    return {
      language: content.includes("kotlin") ? "kotlin" : "java",
      framework: content.includes("spring") ? "spring-boot" : "unknown",
      buildTool: "gradle",
      testFramework: content.includes("junit") ? "junit" : "unknown",
      packageManager: "gradle",
    };
  }

  const packageJsonPath = resolve(repoPath, "package.json");
  if (await exists(packageJsonPath)) {
    return detectNodeStack(repoPath);
  }

  const requirementsPath = resolve(repoPath, "requirements.txt");
  const pyprojectPath = resolve(repoPath, "pyproject.toml");
  const setupPyPath = resolve(repoPath, "setup.py");
  if ((await exists(requirementsPath)) || (await exists(pyprojectPath)) || (await exists(setupPyPath))) {
    const text = `${await readIfExists(requirementsPath)}\n${await readIfExists(pyprojectPath)}`;

    return {
      language: "python",
      framework: text.includes("fastapi") ? "fastapi" : text.includes("django") ? "django" : text.includes("flask") ? "flask" : "unknown",
      buildTool: (await exists(pyprojectPath)) ? "poetry" : (await exists(setupPyPath)) ? "setuptools" : "pip",
      testFramework: text.includes("pytest") ? "pytest" : "unknown",
      packageManager: (await exists(pyprojectPath)) ? "poetry" : (await exists(setupPyPath)) ? "setuptools" : "pip",
    };
  }

  const goModPath = resolve(repoPath, "go.mod");
  if (await exists(goModPath)) {
    const content = await readFile(goModPath, "utf8");

    return {
      language: "go",
      framework: content.includes("gin") ? "gin" : content.includes("echo") ? "echo" : content.includes("fiber") ? "fiber" : "unknown",
      buildTool: "go",
      testFramework: "go-test",
      packageManager: "go",
    };
  }

  return {
    language: "unknown",
    framework: "unknown",
    buildTool: "unknown",
    testFramework: "unknown",
    packageManager: "unknown",
  };
}
