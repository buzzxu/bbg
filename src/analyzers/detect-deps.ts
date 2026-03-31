import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseStringPromise } from "xml2js";
import { exists } from "../utils/fs.js";

function toSortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function parseRequirementsLine(line: string): string {
  return line.split(/[<>=!~]/, 1)[0]?.trim() ?? "";
}

export async function detectDeps(repoPath: string): Promise<string[]> {
  const packageJsonPath = resolve(repoPath, "package.json");
  if (await exists(packageJsonPath)) {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    return toSortedUnique([
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
    ]);
  }

  const pomPath = resolve(repoPath, "pom.xml");
  if (await exists(pomPath)) {
    const parsed = await parseStringPromise(await readFile(pomPath, "utf8"));
    const deps = (((parsed ?? {}).project ?? {}).dependencies ?? [])[0]?.dependency ?? [];
    const artifactIds = deps
      .map((dep: { artifactId?: string[] }) => dep.artifactId?.[0] ?? "")
      .filter((value: string) => value.length > 0);

    return toSortedUnique(artifactIds);
  }

  const gradlePaths = [resolve(repoPath, "build.gradle"), resolve(repoPath, "build.gradle.kts")];
  for (const gradlePath of gradlePaths) {
    if (!(await exists(gradlePath))) {
      continue;
    }

    const content = await readFile(gradlePath, "utf8");
    const depNames: string[] = [];
    const regex = /(?:implementation|testImplementation|api|compileOnly|runtimeOnly)\s*\(?["']([^:"']+):([^:"']+)/g;

    let match = regex.exec(content);
    while (match) {
      depNames.push(match[2]);
      match = regex.exec(content);
    }

    return toSortedUnique(depNames);
  }

  const requirementsPath = resolve(repoPath, "requirements.txt");
  if (await exists(requirementsPath)) {
    const lines = (await readFile(requirementsPath, "utf8")).split(/\r?\n/);
    const deps = lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map(parseRequirementsLine)
      .filter((line) => line.length > 0);

    return toSortedUnique(deps);
  }

  const pyprojectPath = resolve(repoPath, "pyproject.toml");
  if (await exists(pyprojectPath)) {
    const content = await readFile(pyprojectPath, "utf8");
    const match = content.match(/dependencies\s*=\s*\[(?<deps>[\s\S]*?)\]/);
    if (!match?.groups?.deps) {
      return [];
    }

    const deps = [...match.groups.deps.matchAll(/["']([^"']+)["']/g)]
      .map((item) => parseRequirementsLine(item[1]))
      .filter((item) => item.length > 0);

    return toSortedUnique(deps);
  }

  return [];
}
