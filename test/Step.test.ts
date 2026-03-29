import { Step } from '../src/workflow/Step';
import { Context } from '../src/types';

describe('Step', () => {
  it('should have pending status initially', () => {
    const step = new Step({ name: 'test-step' }, async () => 'result');
    expect(step.status).toBe('pending');
  });

  it('should execute successfully and return output', async () => {
    const step = new Step({ name: 'add-step' }, async (ctx: Context) => {
      const a = ctx['a'] as number;
      const b = ctx['b'] as number;
      return a + b;
    });

    const result = await step.execute({ a: 2, b: 3 });

    expect(result.status).toBe('success');
    expect(result.output).toBe(5);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.logs.some(l => l.level === 'info')).toBe(true);
  });

  it('should capture errors and return failed status', async () => {
    const step = new Step({ name: 'failing-step' }, async () => {
      throw new Error('something went wrong');
    });

    const result = await step.execute({});

    expect(result.status).toBe('failed');
    expect(result.error?.message).toBe('something went wrong');
    expect(result.logs.some(l => l.level === 'error')).toBe(true);
  });

  it('should reset status back to pending', async () => {
    const step = new Step({ name: 'reset-step' }, async () => 'ok');
    await step.execute({});
    expect(step.status).toBe('success');
    step.reset();
    expect(step.status).toBe('pending');
  });

  it('should timeout when execution exceeds configured limit', async () => {
    const step = new Step(
      { name: 'slow-step', timeout: 50 },
      () => new Promise(resolve => setTimeout(() => resolve('done'), 500))
    );

    const result = await step.execute({});

    expect(result.status).toBe('failed');
    expect(result.error?.message).toContain('timed out');
  });
});
