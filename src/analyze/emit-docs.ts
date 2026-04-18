import { join } from "node:path";
import type { AnalyzeDocArtifacts, RepoBusinessAnalysis, RepoTechnicalAnalysis, WorkspaceFusionResult } from "./types.js";
import { writeTextFile } from "../utils/fs.js";

function toBulletList(values: string[]): string {
  if (values.length === 0) {
    return "- (none)";
  }
  return values.map((value) => `- ${value}`).join("\n");
}

export async function writeAnalyzeDocs(input: {
  cwd: string;
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  fusion: WorkspaceFusionResult;
}): Promise<AnalyzeDocArtifacts> {
  const updatedAt = new Date().toISOString();
  const technicalArchitecturePath = "docs/architecture/technical-architecture.md";
  const businessArchitecturePath = "docs/architecture/business-architecture.md";
  const dependencyGraphPath = "docs/architecture/repo-dependency-graph.md";
  const workspaceTopologyPath = "docs/architecture/workspace-topology.md";
  const integrationMapPath = "docs/architecture/integration-map.md";
  const moduleMapPath = "docs/business/module-map.md";
  const coreFlowsPath = "docs/business/core-flows.md";
  const repoDocs: string[] = [];
  const repositoryDocs: string[] = [];
  const docsUpdated: string[] = [
    technicalArchitecturePath,
    businessArchitecturePath,
    dependencyGraphPath,
    workspaceTopologyPath,
    integrationMapPath,
    moduleMapPath,
    coreFlowsPath,
  ];

  const technicalContent = [
    "# Technical Architecture",
    "",
    `Updated at: ${updatedAt}`,
    "",
    "## Repositories",
    "",
    ...input.fusion.repos.map((repo) =>
      [
        `### ${repo.name}`,
        "",
        `- Type: ${repo.type}`,
        `- Stack: ${repo.stack.language} / ${repo.stack.framework}`,
        `- Build: ${repo.stack.buildTool}`,
        `- Test: ${repo.testing.framework}`,
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const businessContent = [
    "# Business Architecture",
    "",
    `Updated at: ${updatedAt}`,
    "",
    "## Module Responsibilities",
    "",
    ...input.fusion.businessModules.map((module) =>
      [
        `### ${module.name}`,
        "",
        `- Description: ${module.description || "(not provided)"}`,
        `- Ownership hint: ${module.type}`,
        ...module.responsibilities.map((responsibility) => `- Responsibility: ${responsibility}`),
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const dependencyContent = [
    "# Repo Dependency Graph",
    "",
    `Updated at: ${updatedAt}`,
    "",
    "## Dependencies",
    "",
    toBulletList(input.fusion.integrationEdges.map((edge) => `${edge.from} -> ${edge.to}`)),
    "",
  ].join("\n");

  const workspaceTopologyContent = [
    "# Workspace Topology",
    "",
    `Updated at: ${updatedAt}`,
    "",
    "## Repositories",
    "",
    ...input.fusion.repos.map((repo) =>
      [
        `### ${repo.name}`,
        "",
        `- Type: ${repo.type}`,
        `- Stack: ${repo.stack.language} / ${repo.stack.framework}`,
        `- Direct dependencies: ${repo.deps.length > 0 ? repo.deps.join(", ") : "(none)"}`,
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const integrationMapContent = [
    "# Integration Map",
    "",
    `Updated at: ${updatedAt}`,
    "",
    "## Repo Edges",
    "",
    toBulletList(input.fusion.integrationEdges.map((edge) => `${edge.from} -> ${edge.to}`)),
    "",
  ].join("\n");

  const moduleMapContent = [
    "# Module Map",
    "",
    `Updated at: ${updatedAt}`,
    "",
    "## Repositories",
    "",
    ...input.fusion.repos.map((repo) =>
      [
        `### ${repo.name}`,
        "",
        `- Description: ${repo.description || "(not provided)"}`,
        `- Structure markers: ${repo.structure.length > 0 ? repo.structure.join(", ") : "(none)"}`,
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const coreFlowsContent = [
    "# Core Flows",
    "",
    `Updated at: ${updatedAt}`,
    "",
    "## Current Flow Hypotheses",
    "",
    ...input.fusion.businessModules.map((module) =>
      [
        `### ${module.name}`,
        "",
        `- Current responsibility: ${module.description || module.type}`,
        ...(module.flowHints.length > 0 ? module.flowHints.map((hint) => `- Flow hint: ${hint}`) : []),
        "",
      ].join("\n"),
    ),
  ].join("\n");

  await writeTextFile(join(input.cwd, technicalArchitecturePath), technicalContent);
  await writeTextFile(join(input.cwd, businessArchitecturePath), businessContent);
  await writeTextFile(join(input.cwd, dependencyGraphPath), dependencyContent);
  await writeTextFile(join(input.cwd, workspaceTopologyPath), workspaceTopologyContent);
  await writeTextFile(join(input.cwd, integrationMapPath), integrationMapContent);
  await writeTextFile(join(input.cwd, moduleMapPath), moduleMapContent);
  await writeTextFile(join(input.cwd, coreFlowsPath), coreFlowsContent);

  for (const technical of input.technical) {
    const repoDocPath = `docs/architecture/repos/${technical.repo.name}.md`;
    const repositoryDocPath = `docs/repositories/${technical.repo.name}.md`;
    const repoContent = [
      `# ${technical.repo.name} Architecture`,
      "",
      `Updated at: ${updatedAt}`,
      "",
      "## Technical Summary",
      "",
      `- Stack: ${technical.stack.language} / ${technical.stack.framework}`,
      `- Build: ${technical.stack.buildTool}`,
      `- Testing: ${technical.testing.framework}`,
      "",
      "## Structure Markers",
      "",
      toBulletList(technical.structure),
      "",
      "## Dependency Markers",
      "",
      toBulletList(technical.deps),
      "",
    ].join("\n");
    const repositorySummaryContent = [
      `# ${technical.repo.name}`,
      "",
      `Updated at: ${updatedAt}`,
      "",
      "## Summary",
      "",
      `- Type: ${technical.repo.type}`,
      `- Description: ${technical.repo.description || "(not provided)"}`,
      `- Stack: ${technical.stack.language} / ${technical.stack.framework}`,
      "",
      "## Signals",
      "",
      `- Structure markers: ${technical.structure.length > 0 ? technical.structure.join(", ") : "(none)"}`,
      `- Dependency markers: ${technical.deps.length > 0 ? technical.deps.join(", ") : "(none)"}`,
      "",
    ].join("\n");
    await writeTextFile(join(input.cwd, repoDocPath), repoContent);
    await writeTextFile(join(input.cwd, repositoryDocPath), repositorySummaryContent);
    repoDocs.push(repoDocPath);
    repositoryDocs.push(repositoryDocPath);
    docsUpdated.push(repoDocPath, repositoryDocPath);
  }

  const architectureIndexPath = "docs/architecture/index.md";
  const architectureIndex = [
    "# Architecture Index",
    "",
    "- [Technical Architecture](technical-architecture.md)",
    "- [Business Architecture](business-architecture.md)",
    "- [Repo Dependency Graph](repo-dependency-graph.md)",
    "",
    "## Repo Files",
    "",
    ...repoDocs.map(
      (docPath) => `- [${docPath.split("/").at(-1) ?? docPath}](repos/${docPath.split("/").at(-1) ?? ""})`,
    ),
    "",
  ].join("\n");
  await writeTextFile(join(input.cwd, architectureIndexPath), architectureIndex);
  docsUpdated.push(architectureIndexPath);

  return {
    technicalArchitecturePath,
    businessArchitecturePath,
    dependencyGraphPath,
    repoDocs,
    repositoryDocs,
    workspaceTopologyPath,
    integrationMapPath,
    moduleMapPath,
    coreFlowsPath,
    docsUpdated,
  };
}
