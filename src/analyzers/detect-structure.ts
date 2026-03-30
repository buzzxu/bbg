import { access } from "node:fs/promises";
import { resolve } from "node:path";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function detectStructure(repoPath: string): Promise<string[]> {
  const markers: string[] = [];

  if (await exists(resolve(repoPath, "src/main/java"))) {
    markers.push("has-src-main-java");
  }

  if ((await exists(resolve(repoPath, "src/components"))) || (await exists(resolve(repoPath, "components")))) {
    markers.push("has-src-components");
  }

  if ((await exists(resolve(repoPath, "pages"))) || (await exists(resolve(repoPath, "views")))) {
    markers.push("has-pages-or-views");
  }

  if (
    (await exists(resolve(repoPath, "api"))) ||
    (await exists(resolve(repoPath, "controllers"))) ||
    (await exists(resolve(repoPath, "src/api"))) ||
    (await exists(resolve(repoPath, "src/controllers")))
  ) {
    markers.push("has-api-or-controllers");
  }

  if (
    (await exists(resolve(repoPath, "store"))) ||
    (await exists(resolve(repoPath, "state"))) ||
    (await exists(resolve(repoPath, "src/store"))) ||
    (await exists(resolve(repoPath, "src/state")))
  ) {
    markers.push("has-store-or-state");
  }

  if (
    (await exists(resolve(repoPath, "public"))) ||
    (await exists(resolve(repoPath, "static"))) ||
    (await exists(resolve(repoPath, "src/public")))
  ) {
    markers.push("has-public-or-static");
  }

  if (
    (await exists(resolve(repoPath, "Dockerfile"))) ||
    (await exists(resolve(repoPath, "docker-compose.yml"))) ||
    (await exists(resolve(repoPath, "docker-compose.yaml")))
  ) {
    markers.push("has-docker");
  }

  if (
    (await exists(resolve(repoPath, ".github/workflows"))) ||
    (await exists(resolve(repoPath, ".gitlab-ci.yml"))) ||
    (await exists(resolve(repoPath, "Jenkinsfile")))
  ) {
    markers.push("has-ci");
  }

  return markers.sort((a, b) => a.localeCompare(b));
}
