import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseStringPromise } from "xml2js";
import type { StackInfo } from "../config/schema.js";
import { exists, readIfExists } from "../utils/fs.js";

function normalizeVersion(raw: string | undefined | null): string | undefined {
  if (!raw) {
    return undefined;
  }

  const match = raw.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) {
    return undefined;
  }

  return [match[1], match[2], match[3]].filter((value) => value !== undefined).join(".");
}

function dependencyVersion(
  deps: Record<string, string>,
  names: string[],
): string | undefined {
  for (const name of names) {
    const raw = deps[name];
    const normalized = normalizeVersion(raw);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function detectNodeFramework(deps: Record<string, string>): {
  framework: string;
  frameworkVersion?: string;
} {
  if (deps.next) {
    return { framework: "next", frameworkVersion: normalizeVersion(deps.next) };
  }
  if (deps.nuxt) {
    return { framework: "nuxt", frameworkVersion: normalizeVersion(deps.nuxt) };
  }
  if (deps.vue) {
    return { framework: "vue", frameworkVersion: normalizeVersion(deps.vue) };
  }
  if (deps.react) {
    return { framework: "react", frameworkVersion: normalizeVersion(deps.react) };
  }

  return { framework: "unknown", frameworkVersion: undefined };
}

async function detectNodeStack(repoPath: string): Promise<StackInfo> {
  const packageJsonPath = resolve(repoPath, "package.json");
  const tsconfigPath = resolve(repoPath, "tsconfig.json");
  const packageJsonText = await readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(packageJsonText) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    engines?: Record<string, string>;
  };

  const deps = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };

  const { framework, frameworkVersion } = detectNodeFramework(deps);

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

  const language = (await exists(tsconfigPath)) ? "typescript" : "javascript";
  const languageVersion = language === "typescript"
    ? dependencyVersion(deps, ["typescript"])
    : normalizeVersion(packageJson.engines?.node);

  return {
    language,
    framework,
    buildTool: packageManager,
    testFramework,
    packageManager,
    languageVersion,
    frameworkVersion,
  };
}

function firstString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

async function detectMavenStack(repoPath: string): Promise<StackInfo> {
  const content = await readFile(resolve(repoPath, "pom.xml"), "utf8");
  const parsed = await parseStringPromise(content);
  const project = parsed?.project ?? {};
  const properties = project.properties?.[0] ?? {};
  const parent = project.parent?.[0] ?? {};

  const parentArtifactId = firstString(parent.artifactId);
  const framework = content.includes("spring-boot") ? "spring-boot" : "unknown";
  const frameworkVersion = parentArtifactId === "spring-boot-starter-parent"
    ? normalizeVersion(firstString(parent.version))
    : normalizeVersion(firstString(properties["spring-boot.version"]));
  const languageVersion = normalizeVersion(
    firstString(properties["java.version"])
      ?? firstString(properties["maven.compiler.release"])
      ?? firstString(properties["maven.compiler.source"])
      ?? firstString(properties["maven.compiler.target"]),
  );

  return {
    language: "java",
    framework,
    buildTool: "maven",
    testFramework: content.includes("junit") ? "junit" : "unknown",
    packageManager: "maven",
    languageVersion,
    frameworkVersion,
  };
}

function extractGradleVersion(content: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    const normalized = normalizeVersion(match?.[1]);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

async function detectGradleStack(repoPath: string): Promise<StackInfo> {
  const gradlePath = resolve(repoPath, "build.gradle");
  const gradleKtsPath = resolve(repoPath, "build.gradle.kts");
  const content = await readIfExists(gradlePath) || (await readIfExists(gradleKtsPath));
  const language = content.includes("kotlin") ? "kotlin" : "java";

  return {
    language,
    framework: content.includes("spring") ? "spring-boot" : "unknown",
    buildTool: "gradle",
    testFramework: content.includes("junit") ? "junit" : "unknown",
    packageManager: "gradle",
    languageVersion: extractGradleVersion(content, [
      /JavaLanguageVersion\.of\((\d+)\)/,
      /VERSION_(\d+)/,
      /sourceCompatibility\s*=\s*['"]?(\d+(?:\.\d+)?)['"]?/,
      /targetCompatibility\s*=\s*['"]?(\d+(?:\.\d+)?)['"]?/,
    ]),
    frameworkVersion: extractGradleVersion(content, [
      /org\.springframework\.boot["']?\)?\s+version\s+["']([^"']+)["']/,
      /id\s*\(?["']org\.springframework\.boot["']\)?\s+version\s+["']([^"']+)["']/,
    ]),
  };
}

function detectPythonFramework(text: string): {
  framework: string;
  frameworkVersion?: string;
} {
  if (text.includes("fastapi")) {
    return {
      framework: "fastapi",
      frameworkVersion: normalizeVersion(text.match(/fastapi[^0-9]*(\d+(?:\.\d+){0,2})/)?.[1]),
    };
  }
  if (text.includes("django")) {
    return {
      framework: "django",
      frameworkVersion: normalizeVersion(text.match(/django[^0-9]*(\d+(?:\.\d+){0,2})/i)?.[1]),
    };
  }
  if (text.includes("flask")) {
    return {
      framework: "flask",
      frameworkVersion: normalizeVersion(text.match(/flask[^0-9]*(\d+(?:\.\d+){0,2})/i)?.[1]),
    };
  }

  return { framework: "unknown", frameworkVersion: undefined };
}

async function detectPythonStack(repoPath: string): Promise<StackInfo> {
  const requirementsPath = resolve(repoPath, "requirements.txt");
  const pyprojectPath = resolve(repoPath, "pyproject.toml");
  const setupPyPath = resolve(repoPath, "setup.py");
  const requirementsText = await readIfExists(requirementsPath);
  const pyprojectText = await readIfExists(pyprojectPath);
  const setupText = await readIfExists(setupPyPath);
  const text = `${requirementsText}\n${pyprojectText}\n${setupText}`;
  const { framework, frameworkVersion } = detectPythonFramework(text);

  const languageVersion = normalizeVersion(
    pyprojectText.match(/requires-python\s*=\s*["']([^"']+)["']/)?.[1]
      ?? pyprojectText.match(/python\s*=\s*["']([^"']+)["']/)?.[1],
  );

  return {
    language: "python",
    framework,
    buildTool: (await exists(pyprojectPath)) ? "poetry" : (await exists(setupPyPath)) ? "setuptools" : "pip",
    testFramework: text.includes("pytest") ? "pytest" : "unknown",
    packageManager: (await exists(pyprojectPath)) ? "poetry" : (await exists(setupPyPath)) ? "setuptools" : "pip",
    languageVersion,
    frameworkVersion,
  };
}

async function detectGoStack(repoPath: string): Promise<StackInfo> {
  const content = await readFile(resolve(repoPath, "go.mod"), "utf8");
  const framework = content.includes("github.com/gin-gonic/gin")
    ? "gin"
    : content.includes("github.com/labstack/echo")
      ? "echo"
      : content.includes("github.com/gofiber/fiber")
        ? "fiber"
        : "unknown";
  const frameworkVersion = framework === "gin"
    ? normalizeVersion(content.match(/github\.com\/gin-gonic\/gin\s+(?:v)?([0-9][^\s]*)/)?.[1])
    : framework === "echo"
      ? normalizeVersion(content.match(/github\.com\/labstack\/echo\/v?\d*\s+(?:v)?([0-9][^\s]*)/)?.[1])
      : framework === "fiber"
        ? normalizeVersion(content.match(/github\.com\/gofiber\/fiber\/v?\d*\s+(?:v)?([0-9][^\s]*)/)?.[1])
        : undefined;

  return {
    language: "go",
    framework,
    buildTool: "go",
    testFramework: "go-test",
    packageManager: "go",
    languageVersion: normalizeVersion(content.match(/^go\s+([0-9.]+)/m)?.[1]),
    frameworkVersion,
  };
}

async function detectRustStack(repoPath: string): Promise<StackInfo> {
  const content = await readFile(resolve(repoPath, "Cargo.toml"), "utf8");
  const framework = content.includes("axum")
    ? "axum"
    : content.includes("actix-web")
      ? "actix-web"
      : content.includes("rocket")
        ? "rocket"
        : "unknown";
  const frameworkVersion = framework === "axum"
    ? normalizeVersion(content.match(/axum\s*=\s*["']([^"']+)["']/)?.[1] ?? content.match(/axum\s*=\s*\{[^}]*version\s*=\s*["']([^"']+)["']/)?.[1])
    : framework === "actix-web"
      ? normalizeVersion(content.match(/actix-web\s*=\s*["']([^"']+)["']/)?.[1] ?? content.match(/actix-web\s*=\s*\{[^}]*version\s*=\s*["']([^"']+)["']/)?.[1])
      : framework === "rocket"
        ? normalizeVersion(content.match(/rocket\s*=\s*["']([^"']+)["']/)?.[1] ?? content.match(/rocket\s*=\s*\{[^}]*version\s*=\s*["']([^"']+)["']/)?.[1])
        : undefined;

  return {
    language: "rust",
    framework,
    buildTool: "cargo",
    testFramework: "cargo-test",
    packageManager: "cargo",
    languageVersion: normalizeVersion(content.match(/edition\s*=\s*["']([^"']+)["']/)?.[1]),
    frameworkVersion,
  };
}

export async function detectStack(repoPath: string): Promise<StackInfo> {
  const pomPath = resolve(repoPath, "pom.xml");
  if (await exists(pomPath)) {
    return detectMavenStack(repoPath);
  }

  const gradlePath = resolve(repoPath, "build.gradle");
  const gradleKtsPath = resolve(repoPath, "build.gradle.kts");
  if ((await exists(gradlePath)) || (await exists(gradleKtsPath))) {
    return detectGradleStack(repoPath);
  }

  const packageJsonPath = resolve(repoPath, "package.json");
  if (await exists(packageJsonPath)) {
    return detectNodeStack(repoPath);
  }

  const requirementsPath = resolve(repoPath, "requirements.txt");
  const pyprojectPath = resolve(repoPath, "pyproject.toml");
  const setupPyPath = resolve(repoPath, "setup.py");
  if ((await exists(requirementsPath)) || (await exists(pyprojectPath)) || (await exists(setupPyPath))) {
    return detectPythonStack(repoPath);
  }

  const goModPath = resolve(repoPath, "go.mod");
  if (await exists(goModPath)) {
    return detectGoStack(repoPath);
  }

  const cargoTomlPath = resolve(repoPath, "Cargo.toml");
  if (await exists(cargoTomlPath)) {
    return detectRustStack(repoPath);
  }

  return {
    language: "unknown",
    framework: "unknown",
    buildTool: "unknown",
    testFramework: "unknown",
    packageManager: "unknown",
  };
}
