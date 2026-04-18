import { join } from "node:path";
import type { AnalyzeKnowledgeArtifacts, RepoBusinessAnalysis, RepoTechnicalAnalysis, WorkspaceFusionResult } from "./types.js";
import { writeTextFile } from "../utils/fs.js";

export async function writeAnalyzeKnowledge(input: {
  cwd: string;
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  fusion: WorkspaceFusionResult;
}): Promise<AnalyzeKnowledgeArtifacts> {
  const updatedAt = new Date().toISOString();
  const knowledgeUpdated: string[] = [];
  const businessByRepo = new Map(input.business.map((entry) => [entry.repoName, entry] as const));

  for (const technical of input.technical) {
    const technicalKnowledgePath = `.bbg/knowledge/repos/${technical.repo.name}/technical.json`;
    const businessKnowledgePath = `.bbg/knowledge/repos/${technical.repo.name}/business.json`;
    const patternsKnowledgePath = `.bbg/knowledge/repos/${technical.repo.name}/patterns.json`;
    const business = businessByRepo.get(technical.repo.name);

    await writeTextFile(
      join(input.cwd, technicalKnowledgePath),
      `${JSON.stringify({
        version: 1,
        repo: technical.repo.name,
        updatedAt,
        stack: technical.stack,
        structure: technical.structure,
        deps: technical.deps,
        testing: technical.testing,
      }, null, 2)}\n`,
    );
    await writeTextFile(
      join(input.cwd, businessKnowledgePath),
      `${JSON.stringify({
        version: 1,
        repo: technical.repo.name,
        updatedAt,
        description: technical.repo.description,
        type: technical.repo.type,
        responsibilities: business?.responsibilities ?? [],
        flowHints: business?.flowHints ?? [],
      }, null, 2)}\n`,
    );
    await writeTextFile(
      join(input.cwd, patternsKnowledgePath),
      `${JSON.stringify({
        version: 1,
        repo: technical.repo.name,
        updatedAt,
        patterns: technical.structure,
        dependencySignals: technical.deps,
      }, null, 2)}\n`,
    );
    knowledgeUpdated.push(technicalKnowledgePath, businessKnowledgePath, patternsKnowledgePath);
  }

  const workspaceTopologyPath = ".bbg/knowledge/workspace/topology.json";
  await writeTextFile(
    join(input.cwd, workspaceTopologyPath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      repos: input.fusion.repos.map((repo) => ({
        name: repo.name,
        type: repo.type,
        stack: repo.stack,
        deps: repo.deps,
      })),
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceTopologyPath);

  const workspaceIntegrationMapPath = ".bbg/knowledge/workspace/integration-map.json";
  await writeTextFile(
    join(input.cwd, workspaceIntegrationMapPath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      edges: input.fusion.integrationEdges,
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceIntegrationMapPath);

  const workspaceBusinessModulesPath = ".bbg/knowledge/workspace/business-modules.json";
  await writeTextFile(
    join(input.cwd, workspaceBusinessModulesPath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      repos: input.fusion.businessModules,
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceBusinessModulesPath);

  return { knowledgeUpdated };
}
