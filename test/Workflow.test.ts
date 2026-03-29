import { Workflow } from '../src/workflow/Workflow';
import { Step } from '../src/workflow/Step';

describe('Workflow', () => {
  it('should run all steps in order', async () => {
    const order: string[] = [];

    const workflow = new Workflow({ name: 'test-workflow' });
    workflow
      .addStep(new Step({ name: 'step-1' }, async () => { order.push('step-1'); return 1; }))
      .addStep(new Step({ name: 'step-2' }, async () => { order.push('step-2'); return 2; }))
      .addStep(new Step({ name: 'step-3' }, async () => { order.push('step-3'); return 3; }));

    const result = await workflow.run();

    expect(result.status).toBe('success');
    expect(order).toEqual(['step-1', 'step-2', 'step-3']);
    expect(result.stepResults.size).toBe(3);
  });

  it('should propagate step output via context', async () => {
    const workflow = new Workflow({ name: 'context-workflow' });
    workflow
      .addStep(new Step({ name: 'produce' }, async () => 42))
      .addStep(new Step({ name: 'consume' }, async (ctx) => {
        return (ctx['produce'] as number) * 2;
      }));

    const result = await workflow.run();

    expect(result.status).toBe('success');
    expect(result.stepResults.get('consume')?.output).toBe(84);
  });

  it('should stop on error by default and mark remaining steps as skipped', async () => {
    const workflow = new Workflow({ name: 'stop-on-error' });
    workflow
      .addStep(new Step({ name: 'step-ok' }, async () => 'ok'))
      .addStep(new Step({ name: 'step-fail' }, async () => { throw new Error('boom'); }))
      .addStep(new Step({ name: 'step-after' }, async () => 'after'));

    const result = await workflow.run();

    expect(result.status).toBe('failed');
    expect(result.stepResults.get('step-ok')?.status).toBe('success');
    expect(result.stepResults.get('step-fail')?.status).toBe('failed');
    expect(result.stepResults.get('step-after')?.status).toBe('skipped');
  });

  it('should continue past a failing step when continueOnError is set', async () => {
    const workflow = new Workflow({ name: 'continue-on-error', stopOnError: false });
    workflow
      .addStep(new Step({ name: 'step-ok' }, async () => 'ok'))
      .addStep(new Step({ name: 'step-fail' }, async () => { throw new Error('non-fatal'); }))
      .addStep(new Step({ name: 'step-after' }, async () => 'after'));

    const result = await workflow.run();

    expect(result.status).toBe('failed');
    expect(result.stepResults.get('step-after')?.status).toBe('success');
  });

  it('should merge initial context into workflow context', async () => {
    const workflow = new Workflow({ name: 'init-ctx' });
    workflow.addStep(new Step({ name: 'reader' }, async (ctx) => ctx['seed']));

    const result = await workflow.run({ seed: 'hello' });

    expect(result.stepResults.get('reader')?.output).toBe('hello');
  });
});
