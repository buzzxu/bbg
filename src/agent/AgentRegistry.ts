import { Agent, AgentConfig } from './Agent';
import { AgentTaskHandler } from './Agent';

/** Registry that manages a collection of agents */
export class AgentRegistry {
  private readonly agents = new Map<string, Agent>();

  /** Register an agent */
  register(config: AgentConfig, handler: AgentTaskHandler): Agent {
    if (this.agents.has(config.name)) {
      throw new Error(`Agent "${config.name}" is already registered`);
    }
    const agent = new Agent(config, handler);
    this.agents.set(config.name, agent);
    return agent;
  }

  /** Retrieve a registered agent by name */
  get(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  /** Check whether an agent with the given name is registered */
  has(name: string): boolean {
    return this.agents.has(name);
  }

  /** Return all registered agents */
  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  /** Unregister an agent by name */
  unregister(name: string): boolean {
    return this.agents.delete(name);
  }
}
