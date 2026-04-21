import { join } from "node:path";
import type { RepoTechnicalAnalysis } from "./types.js";
import { writeTextFile } from "../utils/fs.js";

type LanguageKey = "java" | "typescript" | "golang" | "python" | "rust";

interface LanguageDocSpec {
  directory: LanguageKey;
  displayName: string;
  categories: Array<{
    fileName: string;
    title: string;
    must: string[];
    recommended: string[];
    avoid: string[];
    checklist: string[];
  }>;
  sources: string[];
}

const LANGUAGE_SPECS: Record<LanguageKey, LanguageDocSpec> = {
  java: {
    directory: "java",
    displayName: "Java",
    categories: [
      {
        fileName: "application-patterns.md",
        title: "Java Application Patterns",
        must: [
          "Keep controller, application/service, domain, and repository responsibilities separate.",
          "Keep public contract and transaction orchestration out of repository classes.",
          "Map external transport models to domain models before business logic runs.",
        ],
        recommended: [
          "Use application services for orchestration and domain services for business rules that span entities.",
          "Prefer records for transport/value-shaped data and semantically named domain types for business state.",
          "Keep dependency direction inward toward domain logic.",
        ],
        avoid: [
          "Fat controllers or god services.",
          "Returning JPA entities directly from API boundaries.",
          "Framework annotations leaking across every layer without a boundary reason.",
        ],
        checklist: [
          "Does each class have a single architectural role?",
          "Is orchestration kept out of repositories and controllers?",
          "Are domain invariants enforced away from transport models?",
          "Can the core logic be tested without the web adapter?",
        ],
      },
      {
        fileName: "domain-modeling-guide.md",
        title: "Java Domain Modeling Guide",
        must: [
          "Separate DTOs, persistence entities, and domain objects when invariants matter.",
          "Keep validation and invariants close to the domain model or domain service.",
          "Use explicit exception semantics for domain failures versus infrastructure failures.",
        ],
        recommended: [
          "Prefer value objects for constrained concepts and identifiers.",
          "Use sealed classes or interfaces when a domain hierarchy is intentionally closed.",
          "Prefer immutable domain state when mutation is not required.",
        ],
        avoid: [
          "Anemic domain models for behavior-rich workflows.",
          "Treating persistence entities as API contracts.",
          "Mixing serialization concerns into core domain types.",
        ],
        checklist: [
          "Are invariants explicit and enforced?",
          "Are entity and DTO boundaries clear?",
          "Are domain exceptions distinct from transport exceptions?",
          "Is object construction explicit enough to prevent invalid state?",
        ],
      },
      {
        fileName: "transaction-boundaries.md",
        title: "Java Transaction Boundaries",
        must: [
          "Define transaction boundaries in application/service layers, not controllers.",
          "Make rollback semantics explicit for checked and unchecked failures.",
          "Keep external I/O and long-running orchestration outside broad transactions where possible.",
        ],
        recommended: [
          "Prefer smaller command-oriented transactions over coarse request-sized ones.",
          "Separate read flows from write flows when consistency rules differ.",
          "Document any cross-service consistency assumptions.",
        ],
        avoid: [
          "Opening transactions in repositories by default.",
          "Hiding consistency-critical behavior behind framework magic.",
          "Using one transaction to cover unrelated side effects.",
        ],
        checklist: [
          "Is the transaction boundary on the right service method?",
          "Is rollback behavior explicit?",
          "Are long-running or remote calls kept out of critical transactions?",
          "Are concurrency and consistency assumptions documented?",
        ],
      },
    ],
    sources: [
      "https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html",
      "https://docs.spring.io/spring-framework/reference/data-access/transaction.html",
      "https://docs.spring.io/spring-boot/3.5/appendix/test-auto-configuration/slices.html",
      "https://docs.hibernate.org/orm/5.1/userguide/html_single/chapters/domain/DomainModel.html",
    ],
  },
  typescript: {
    directory: "typescript",
    displayName: "TypeScript",
    categories: [
      {
        fileName: "application-patterns.md",
        title: "TypeScript Application Patterns",
        must: [
          "Keep domain, transport, and UI/runtime boundaries explicit.",
          "Use runtime validation at external boundaries; static types alone are not enough.",
          "Treat shared packages as contract surfaces, not dumping grounds.",
        ],
        recommended: [
          "Use project references in multi-package workspaces.",
          "Prefer discriminated unions and constrained domain types for workflow state.",
          "Use the `satisfies` operator to validate structural intent without widening useful inference.",
        ],
        avoid: [
          "Type-only safety with unchecked JSON or API payloads.",
          "Shared type soup across server, client, and persistence layers.",
          "Implicit any-like escape hatches around important boundaries.",
        ],
        checklist: [
          "Are runtime boundaries validated?",
          "Are domain and transport types separate where behavior differs?",
          "Are shared packages small and intentional?",
          "Is the type system helping readability rather than obscuring it?",
        ],
      },
      {
        fileName: "type-boundaries.md",
        title: "TypeScript Type Boundaries",
        must: [
          "Model external inputs separately from internal domain types.",
          "Prefer built-up narrow types over broad object maps for important flows.",
          "Keep unsafe casts localized and justified.",
        ],
        recommended: [
          "Prefer `satisfies`, `as const`, and discriminated unions over repetitive assertion chains.",
          "Use schema validators to align runtime and static contracts.",
          "Keep return types concrete at implementation boundaries.",
        ],
        avoid: [
          "Unchecked `any` and deep assertion cascades.",
          "Leaking persistence shapes or UI-only state across layers.",
          "Using union returns where a stable result model would be clearer.",
        ],
        checklist: [
          "Do public types describe reality at runtime?",
          "Are unsafe casts minimal?",
          "Do shared types preserve invariants instead of erasing them?",
          "Are domain types more precise than transport types?",
        ],
      },
      {
        fileName: "testing-and-runtime-boundaries.md",
        title: "TypeScript Testing and Runtime Boundaries",
        must: [
          "Test domain logic without framework/runtime coupling when possible.",
          "Keep integration tests around adapters, not every internal helper.",
          "Make async side effects explicit and observable in tests.",
        ],
        recommended: [
          "Use slice tests for server modules and component tests for UI modules.",
          "Keep test doubles at process or network boundaries, not inside pure domain code.",
          "Keep environment-dependent logic in isolated adapters.",
        ],
        avoid: [
          "Mocking every module in the path to a result.",
          "Letting runtime configuration leak into pure code.",
          "Using e2e tests as the only protection for core business logic.",
        ],
        checklist: [
          "Are unit, integration, and end-to-end boundaries clear?",
          "Can side effects be observed and asserted deterministically?",
          "Is runtime configuration isolated?",
          "Are framework assumptions minimized in core tests?",
        ],
      },
    ],
    sources: [
      "https://www.typescriptlang.org/docs/handbook/intro.html",
      "https://www.typescriptlang.org/docs/handbook/project-references",
      "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html",
    ],
  },
  golang: {
    directory: "golang",
    displayName: "Go",
    categories: [
      {
        fileName: "application-patterns.md",
        title: "Go Application Patterns",
        must: [
          "Keep package ownership explicit and dependency flow one-way.",
          "Keep orchestration in services/use cases rather than handlers or storage adapters.",
          "Favor concrete types until an interface is needed by a consumer boundary.",
        ],
        recommended: [
          "Use small packages with cohesive responsibilities.",
          "Prefer composition over framework-style inheritance or Java-style layering copies.",
          "Design zero values and constructors so the happy path is simple.",
        ],
        avoid: [
          "Large cross-cutting interfaces declared far from their consumers.",
          "Handlers that embed domain logic.",
          "Package cycles or hidden mutable shared state.",
        ],
        checklist: [
          "Is package ownership obvious?",
          "Are interfaces declared near their use?",
          "Is orchestration out of handlers?",
          "Can domain logic be tested without network or storage?",
        ],
      },
      {
        fileName: "interface-and-error-boundaries.md",
        title: "Go Interface and Error Boundaries",
        must: [
          "Wrap errors with context and preserve sentinel/typed checks with `errors.Is` and `errors.As`.",
          "Define interfaces where they are consumed, not where implementations live.",
          "Keep error messages lower-case and actionable.",
        ],
        recommended: [
          "Return concrete collections and structs from concrete implementations.",
          "Use typed errors or sentinel errors only when callers must branch on them.",
          "Translate infrastructure errors at adapter boundaries.",
        ],
        avoid: [
          "String matching on errors.",
          "Wide interfaces that exist only to enable mocking.",
          "Leaking low-level storage or transport errors into domain layers.",
        ],
        checklist: [
          "Can callers branch on errors without brittle strings?",
          "Are interfaces small and local?",
          "Are infrastructure errors translated appropriately?",
          "Do return types stay concrete where possible?",
        ],
      },
      {
        fileName: "concurrency-guide.md",
        title: "Go Concurrency Guide",
        must: [
          "Propagate `context.Context` through request-scoped operations.",
          "Make goroutine ownership and shutdown paths explicit.",
          "Bound worker pools and background fan-out.",
        ],
        recommended: [
          "Use channels for coordination only when they clarify ownership.",
          "Prefer simple synchronization primitives over ad hoc channel protocols.",
          "Document cancellation, timeout, and retry behavior.",
        ],
        avoid: [
          "Leaking goroutines or hidden background work.",
          "Unbounded fan-out under request load.",
          "Ignoring context cancellation in I/O-heavy paths.",
        ],
        checklist: [
          "Is every goroutine owned and stoppable?",
          "Is context propagated correctly?",
          "Are fan-out and worker counts bounded?",
          "Is concurrency chosen for clarity, not novelty?",
        ],
      },
    ],
    sources: ["https://go.dev/doc/effective_go", "https://go.dev/wiki/CodeReviewComments"],
  },
  python: {
    directory: "python",
    displayName: "Python",
    categories: [
      {
        fileName: "application-patterns.md",
        title: "Python Application Patterns",
        must: [
          "Keep service, domain, and framework adapter boundaries explicit.",
          "Keep business logic out of route handlers, views, and ORM models when orchestration grows.",
          "Keep configuration and side effects centralized.",
        ],
        recommended: [
          "Use typed service boundaries and explicit settings objects.",
          "Prefer narrow modules over script-like sprawl.",
          "Model durable workflows with explicit state rather than ad hoc dictionaries.",
        ],
        avoid: [
          "Hidden global state.",
          "Mixing transport parsing, validation, and business logic in one function.",
          "Unstructured dictionary payloads crossing every layer.",
        ],
        checklist: [
          "Are framework concerns kept out of core logic?",
          "Are services/modules cohesive?",
          "Are side effects isolated?",
          "Can domain logic run without web/ORM setup?",
        ],
      },
      {
        fileName: "type-boundaries.md",
        title: "Python Type Boundaries",
        must: [
          "Use concrete return types and protocol/abstract parameter types deliberately.",
          "Keep external I/O models distinct from domain objects.",
          "Treat `Any` as an escape hatch, not a default.",
        ],
        recommended: [
          "Use modern built-in generics and `X | Y` union syntax where supported.",
          "Use protocols for consumer-side abstraction.",
          "Use dataclasses or explicit models when shape matters.",
        ],
        avoid: [
          "Dynamic dict soup across layers.",
          "Unannotated important service boundaries.",
          "Using structural typing where nominal contracts are clearer.",
        ],
        checklist: [
          "Are key boundaries typed?",
          "Is `Any` constrained?",
          "Are protocols used at consumer seams instead of everywhere?",
          "Are dataclasses/models used intentionally rather than by default?",
        ],
      },
      {
        fileName: "testing-and-service-boundaries.md",
        title: "Python Testing and Service Boundaries",
        must: [
          "Keep deterministic tests around service/domain seams.",
          "Keep database and network coupling out of pure unit tests.",
          "Make async behavior explicit in tests when present.",
        ],
        recommended: [
          "Use layered fixtures and focused integration tests.",
          "Keep framework startup out of fast unit tests.",
          "Assert behavior at boundary seams rather than private helpers.",
        ],
        avoid: [
          "Relying only on full-stack tests for business logic.",
          "Mutating global fixture state across tests.",
          "Implicit environment coupling in every test.",
        ],
        checklist: [
          "Are unit and integration seams clear?",
          "Are async flows isolated correctly?",
          "Do fixtures stay local and predictable?",
          "Is business logic tested without framework boot when possible?",
        ],
      },
    ],
    sources: [
      "https://typing.python.org/en/latest/reference/best_practices.html",
      "https://typing.python.org/en/latest/reference/protocols.html",
      "https://docs.python.org/3/library/dataclasses.html",
    ],
  },
  rust: {
    directory: "rust",
    displayName: "Rust",
    categories: [
      {
        fileName: "application-patterns.md",
        title: "Rust Application Patterns",
        must: [
          "Keep crate and module boundaries explicit and cohesive.",
          "Use domain-specific types where ownership or invariants matter.",
          "Keep orchestration thin around domain and adapter modules.",
        ],
        recommended: [
          "Use newtypes and meaningful enums to encode invariants.",
          "Minimize shared mutable state and make ownership transitions obvious.",
          "Prefer explicit module APIs over broad re-export surfaces.",
        ],
        avoid: [
          "Oversized modules with mixed concerns.",
          "Exposing internal representation details without need.",
          "Stringly typed APIs for important domain concepts.",
        ],
        checklist: [
          "Are module and crate boundaries clear?",
          "Do types encode key invariants?",
          "Is ownership easy to reason about?",
          "Is orchestration thin and explicit?",
        ],
      },
      {
        fileName: "type-and-api-guidelines.md",
        title: "Rust Type and API Guidelines",
        must: [
          "Use standard conversion traits and meaningful error types.",
          "Keep public APIs future-proof with conservative surface area.",
          "Prefer explicit trait and type semantics over implicit conventions.",
        ],
        recommended: [
          "Implement common standard traits when semantics are clear.",
          "Use private fields and constructors to protect invariants.",
          "Prefer typed builders or constructors over ad hoc maps.",
        ],
        avoid: [
          "Weakly typed configuration or result channels.",
          "Overly clever trait hierarchies without user value.",
          "Leaking internal types as public API accidentally.",
        ],
        checklist: [
          "Are conversions idiomatic?",
          "Are error types meaningful?",
          "Is the public API surface deliberate?",
          "Do traits serve a real reuse boundary?",
        ],
      },
      {
        fileName: "async-and-concurrency-guide.md",
        title: "Rust Async and Concurrency Guide",
        must: [
          "Keep blocking work out of async contexts.",
          "Make shutdown and cancellation semantics explicit.",
          "Keep concurrency ownership and synchronization simple.",
        ],
        recommended: [
          "Choose async for coordination-heavy I/O, not as a default replacement for all threading.",
          "Prefer message passing or narrowly scoped synchronization over broad shared state.",
          "Document runtime assumptions and executor coupling.",
        ],
        avoid: [
          "Hidden contention around shared mutable state.",
          "Mixing blocking calls into async paths without isolation.",
          "Executor-specific behavior leaking across the whole design.",
        ],
        checklist: [
          "Are async boundaries justified?",
          "Is blocking work isolated?",
          "Is shared state minimized?",
          "Can shutdown/cancellation be reasoned about clearly?",
        ],
      },
    ],
    sources: [
      "https://rust-lang.github.io/api-guidelines/checklist.html",
      "https://doc.rust-lang.org/std/keyword.async.html",
      "https://doc.rust-lang.org/beta/book/ch17-00-async-await.html",
    ],
  },
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function normalizeLanguageKey(language: string): LanguageKey | null {
  switch (language.toLowerCase()) {
    case "java":
      return "java";
    case "typescript":
      return "typescript";
    case "go":
      return "golang";
    case "python":
      return "python";
    case "rust":
      return "rust";
    default:
      return null;
  }
}

function parseVersionParts(version: string | undefined): number[] {
  return (version ?? "")
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}

function compareVersions(left: string | undefined, right: string | undefined): number {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }
  return 0;
}

function minVersion(versions: Array<string | undefined>): string | undefined {
  const normalized = versions.filter((value): value is string => Boolean(value));
  if (normalized.length === 0) {
    return undefined;
  }

  return normalized.sort(compareVersions)[0];
}

function maxVersion(versions: Array<string | undefined>): string | undefined {
  const normalized = versions.filter((value): value is string => Boolean(value));
  if (normalized.length === 0) {
    return undefined;
  }

  return normalized.sort(compareVersions).at(-1);
}

function frontmatter(input: {
  title: string;
  language: LanguageKey | "multi";
  category: string;
  minimumSupportedVersion?: string;
  detectedVersion?: string;
  frameworks: string[];
  frameworkVersions: string[];
  sources: string[];
}): string {
  return [
    "---",
    `title: ${input.title}`,
    `language: ${input.language}`,
    `category: ${input.category}`,
    "status: active",
    `minimum_supported_version: ${input.minimumSupportedVersion ?? "review-manually"}`,
    `detected_version: ${input.detectedVersion ?? "unknown"}`,
    "recommended_version_track: modern-stable",
    "frameworks:",
    ...(input.frameworks.length > 0 ? input.frameworks.map((framework) => `  - ${framework}`) : ["  - unknown"]),
    "framework_versions:",
    ...(input.frameworkVersions.length > 0
      ? input.frameworkVersions.map((version) => `  - ${version}`)
      : ["  - unknown"]),
    `last_reviewed: ${new Date().toISOString().slice(0, 10)}`,
    "sources:",
    ...input.sources.map((source) => `  - ${source}`),
    "---",
    "",
  ].join("\n");
}

function renderBulletSection(title: string, values: string[]): string[] {
  return [`## ${title}`, "", ...(values.length > 0 ? values.map((value) => `- ${value}`) : ["- (none)"]), ""];
}

function versionUpgradeCandidates(language: LanguageKey, detectedVersion: string | undefined): string[] {
  if (!detectedVersion) {
    return [
      "Version was not detected automatically. Re-run `bbg analyze --refresh` after build metadata is available.",
    ];
  }

  switch (language) {
    case "java": {
      const candidates: string[] = [];
      if (compareVersions(detectedVersion, "17") < 0) {
        candidates.push("Upgrade to Java 17+ to unlock sealed hierarchies for stricter domain modeling.");
      }
      if (compareVersions(detectedVersion, "21") < 0) {
        candidates.push("Upgrade to Java 21+ before adopting virtual-thread-first concurrency guidance.");
      }
      return candidates.length > 0
        ? candidates
        : ["Current Java baseline already supports the documented modern features."];
    }
    case "typescript": {
      const candidates: string[] = [];
      if (compareVersions(detectedVersion, "4.9") < 0) {
        candidates.push("Upgrade to TypeScript 4.9+ before standardizing on the `satisfies` operator.");
      }
      if (compareVersions(detectedVersion, "5.0") < 0) {
        candidates.push("Upgrade to TypeScript 5.x for current project-reference and narrowing ergonomics.");
      }
      return candidates.length > 0
        ? candidates
        : ["Current TypeScript baseline already supports the documented modern features."];
    }
    case "golang":
      return compareVersions(detectedVersion, "1.18") < 0
        ? ["Upgrade to Go 1.18+ before adopting generics-aware guidance."]
        : ["Current Go baseline already supports the documented modern features."];
    case "python": {
      const candidates: string[] = [];
      if (compareVersions(detectedVersion, "3.10") < 0) {
        candidates.push(
          "Upgrade to Python 3.10+ before standardizing on `X | Y` unions and dataclass keyword-only guidance.",
        );
      }
      if (compareVersions(detectedVersion, "3.11") < 0) {
        candidates.push("Upgrade to Python 3.11+ before relying on dataclass `slots=True` as a default pattern.");
      }
      return candidates.length > 0
        ? candidates
        : ["Current Python baseline already supports the documented modern features."];
    }
    case "rust":
      return compareVersions(detectedVersion, "2021") < 0
        ? ["Upgrade the crate edition to 2021+ before standardizing async-heavy module guidance."]
        : ["Current Rust edition already supports the documented modern features."];
  }
}

function modernFeaturePreferences(language: LanguageKey, detectedVersion: string | undefined): string[] {
  switch (language) {
    case "java":
      return [
        "Prefer records for transport/value-shaped data when the repo baseline supports them.",
        "Use sealed hierarchies when the domain is intentionally closed.",
        "Adopt virtual threads only on Java 21+ and only for I/O-heavy request concurrency.",
      ];
    case "typescript":
      return [
        "Prefer the `satisfies` operator for structural validation without losing inference on TS 4.9+.",
        "Use project references for multi-package workspaces.",
        "Prefer discriminated unions over stringly workflow state.",
      ];
    case "golang":
      return [
        "Prefer consumer-owned interfaces and explicit composition.",
        "Use generics sparingly and only when they remove duplication without obscuring API clarity.",
        "Treat context propagation and goroutine ownership as first-class design concerns.",
      ];
    case "python":
      return [
        "Prefer built-in generics and `X | Y` unions when the repo baseline supports them.",
        "Use protocols at consumer seams instead of broad nominal abstraction trees.",
        "Use dataclasses deliberately for typed, local model shapes rather than as a global default.",
      ];
    case "rust":
      return [
        "Use newtypes and enums to encode invariants before reaching for comments or conventions.",
        "Adopt async only when it clarifies I/O concurrency and keep blocking code isolated.",
        "Prefer trait and API designs that stay close to standard-library conventions.",
      ];
  }
}

function displayLanguage(language: LanguageKey): string {
  return LANGUAGE_SPECS[language].displayName;
}

function buildLanguageReadme(input: { groupedRepos: Map<LanguageKey, RepoTechnicalAnalysis[]> }): string {
  const minimumSupportedVersion = minVersion(
    [...input.groupedRepos.values()].flatMap((repos) => repos.map((repo) => repo.stack.languageVersion)),
  );
  const sources = unique([...input.groupedRepos.keys()].flatMap((language) => LANGUAGE_SPECS[language].sources));
  const lines = [
    frontmatter({
      title: "Language Architecture Guides",
      language: "multi",
      category: "index",
      minimumSupportedVersion,
      detectedVersion: undefined,
      frameworks: [],
      frameworkVersions: [],
      sources,
    }),
    "# Language Architecture Guides",
    "",
    "This directory groups repo-level language patterns by language so analyze, start, review, and doctor can load only the relevant guidance.",
    "",
    "## Repo Language Map",
    "",
  ];

  for (const [language, repos] of input.groupedRepos.entries()) {
    const frameworks = unique(repos.map((repo) => repo.stack.framework).filter((value) => value !== "unknown"));
    lines.push(
      `- ${displayLanguage(language)}: ${repos.map((repo) => repo.repo.name).join(", ")}` +
        (frameworks.length > 0 ? ` (${frameworks.join(", ")})` : ""),
    );
  }

  lines.push("", "## Default Documents", "");

  for (const [language, spec] of Object.entries(LANGUAGE_SPECS) as Array<[LanguageKey, LanguageDocSpec]>) {
    if (!input.groupedRepos.has(language)) {
      continue;
    }

    lines.push(`### ${spec.displayName}`, "");
    for (const category of spec.categories) {
      lines.push(`- [${category.title}](./${language}/${category.fileName})`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function getLanguageGuidePathsForLanguages(languages: string[]): string[] {
  const normalized = unique(
    languages.map((language) => normalizeLanguageKey(language)).filter((value): value is LanguageKey => value !== null),
  );
  const paths = normalized.flatMap((language) => {
    const spec = LANGUAGE_SPECS[language];
    return spec.categories.map((category) => `docs/architecture/languages/${spec.directory}/${category.fileName}`);
  });

  return normalized.length > 0 ? ["docs/architecture/languages/README.md", ...paths] : [];
}

export function getAllManagedLanguageGuidePaths(): string[] {
  const paths = (Object.entries(LANGUAGE_SPECS) as Array<[LanguageKey, LanguageDocSpec]>).flatMap(([, spec]) =>
    spec.categories.map((category) => `docs/architecture/languages/${spec.directory}/${category.fileName}`),
  );

  return ["docs/architecture/languages/README.md", ...paths];
}

export async function writeLanguageGuideDocs(input: {
  cwd: string;
  technical: RepoTechnicalAnalysis[];
}): Promise<string[]> {
  const groupedRepos = new Map<LanguageKey, RepoTechnicalAnalysis[]>();

  for (const technical of input.technical) {
    const language = normalizeLanguageKey(technical.stack.language);
    if (!language) {
      continue;
    }

    const current = groupedRepos.get(language) ?? [];
    current.push(technical);
    groupedRepos.set(language, current);
  }

  if (groupedRepos.size === 0) {
    return [];
  }

  const updated: string[] = [];
  const readmePath = "docs/architecture/languages/README.md";
  await writeTextFile(join(input.cwd, readmePath), buildLanguageReadme({ groupedRepos }));
  updated.push(readmePath);

  for (const [language, repos] of groupedRepos.entries()) {
    const spec = LANGUAGE_SPECS[language];
    const detectedLanguageVersion = maxVersion(repos.map((repo) => repo.stack.languageVersion));
    const minimumSupportedVersion = minVersion(repos.map((repo) => repo.stack.languageVersion));
    const frameworks = unique(repos.map((repo) => repo.stack.framework).filter((value) => value !== "unknown"));
    const frameworkVersions = unique(
      repos.map((repo) => repo.stack.frameworkVersion).filter((value): value is string => Boolean(value)),
    );

    for (const category of spec.categories) {
      const pathValue = `docs/architecture/languages/${spec.directory}/${category.fileName}`;
      const content = [
        frontmatter({
          title: category.title,
          language,
          category: category.fileName.replace(/\.md$/, ""),
          minimumSupportedVersion,
          detectedVersion: detectedLanguageVersion,
          frameworks,
          frameworkVersions,
          sources: spec.sources,
        }),
        `# ${category.title}`,
        "",
        ...renderBulletSection("Scope", [
          `Applies to repos using ${spec.displayName}${frameworks.length > 0 ? ` (${frameworks.join(", ")})` : ""}.`,
          `Current analyzed repos: ${repos.map((repo) => repo.repo.name).join(", ")}.`,
        ]),
        ...renderBulletSection("Version Baseline", [
          `Detected repo baseline: ${detectedLanguageVersion ?? "unknown"}.`,
          `Minimum supported version seen across analyzed repos: ${minimumSupportedVersion ?? "unknown"}.`,
          `Detected framework versions: ${frameworkVersions.length > 0 ? frameworkVersions.join(", ") : "unknown"}.`,
        ]),
        ...renderBulletSection(
          "Modern Features We Prefer",
          modernFeaturePreferences(language, detectedLanguageVersion),
        ),
        ...renderBulletSection("Must", category.must),
        ...renderBulletSection("Recommended", category.recommended),
        ...renderBulletSection("Avoid", category.avoid),
        ...renderBulletSection("Review Checklist", category.checklist),
        ...renderBulletSection(
          "Version Upgrade Candidates",
          versionUpgradeCandidates(language, detectedLanguageVersion),
        ),
        ...renderBulletSection("Sources", spec.sources),
      ].join("\n");

      await writeTextFile(join(input.cwd, pathValue), `${content}\n`);
      updated.push(pathValue);
    }
  }

  return updated;
}
