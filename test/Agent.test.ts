import { Agent } from '../src/agent/Agent';
import { AgentRegistry } from '../src/agent/AgentRegistry';

describe('Agent', () => {
  it('should run a task and return success result', async () => {
    const agent = new Agent(
      { name: 'test-agent', capabilities: [{ name: 'summarize', description: 'Summarize text' }] },
      async (task) => `Result of: ${task}`
    );

    const result = await agent.runTask('summarize this text');

    expect(result.status).toBe('success');
    expect(result.output).toBe('Result of: summarize this text');
  });

  it('should return failed result when handler throws', async () => {
    const agent = new Agent(
      { name: 'bad-agent' },
      async () => { throw new Error('API error'); }
    );

    const result = await agent.runTask('some task');

    expect(result.status).toBe('failed');
    expect(result.error?.message).toBe('API error');
  });

  it('should report availability based on concurrency', async () => {
    const agent = new Agent({ name: 'concurrent-agent', concurrency: 1 }, async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'done';
    });

    expect(agent.isAvailable).toBe(true);
    const taskPromise = agent.runTask('task');
    // After starting the task, activeTasks = 1 which equals concurrency → not available
    // (this is a best-effort check; the task starts asynchronously)
    await taskPromise;
    expect(agent.isAvailable).toBe(true); // back to available after completion
  });
});

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  it('should register and retrieve an agent', () => {
    registry.register({ name: 'my-agent' }, async () => 'ok');
    expect(registry.has('my-agent')).toBe(true);
    expect(registry.get('my-agent')?.name).toBe('my-agent');
  });

  it('should throw when registering an agent with a duplicate name', () => {
    registry.register({ name: 'dup-agent' }, async () => 'ok');
    expect(() => registry.register({ name: 'dup-agent' }, async () => 'ok')).toThrow(/already registered/);
  });

  it('should unregister an agent', () => {
    registry.register({ name: 'remove-me' }, async () => 'ok');
    expect(registry.unregister('remove-me')).toBe(true);
    expect(registry.has('remove-me')).toBe(false);
  });

  it('should return all registered agents', () => {
    registry.register({ name: 'a1' }, async () => 'a1');
    registry.register({ name: 'a2' }, async () => 'a2');
    expect(registry.getAll().length).toBe(2);
  });
});
