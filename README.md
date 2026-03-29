# bbg

**AI Development Automation Workflow Governance Toolkit**

A TypeScript library for building, orchestrating, and governing AI development workflows.

## Features

- **Workflow Engine** — Define ordered sequences of steps, share context between them, and handle errors gracefully.
- **Step Execution** — Individual units of work with timeout support, error handling, and execution logging.
- **Agent Registry** — Register and manage AI agents with capability declarations and concurrency control.
- **Configuration** — Centralized, typed configuration for AI providers and runtime settings.

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```

## Project Structure

```
bbg/
├── src/
│   ├── index.ts          # Public API re-exports
│   ├── types/            # Shared TypeScript type definitions
│   ├── config/           # Configuration management
│   ├── workflow/         # Workflow and Step classes
│   └── agent/            # Agent and AgentRegistry classes
├── test/                 # Jest unit tests
├── tsconfig.json
├── package.json
└── .eslintrc.js
```

## Quick Example

```typescript
import { Workflow, Step, AgentRegistry, Config } from './dist';

// Configure the project
const config = new Config({
  projectName: 'my-ai-project',
  environment: 'development',
  logLevel: 'info',
});

// Register an AI agent
const registry = new AgentRegistry();
registry.register({ name: 'summarizer' }, async (task, ctx) => {
  // Call your AI provider here
  return `Summary of: ${task}`;
});

// Build and run a workflow
const workflow = new Workflow({ name: 'summarize-pipeline' });
workflow
  .addStep(new Step({ name: 'fetch-data' }, async () => 'raw document text'))
  .addStep(new Step({ name: 'summarize' }, async (ctx) => {
    const agent = registry.get('summarizer')!;
    const result = await agent.runTask(ctx['fetch-data'] as string);
    return result.output;
  }));

const result = await workflow.run();
console.log(result.status); // 'success'
```

## License

Apache-2.0