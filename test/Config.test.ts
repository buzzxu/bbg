import { Config } from '../src/config/Config';

describe('Config', () => {
  it('should return the initial configuration', () => {
    const config = new Config({ projectName: 'my-project', environment: 'development' });
    expect(config.get().projectName).toBe('my-project');
    expect(config.get().environment).toBe('development');
  });

  it('should merge partial updates', () => {
    const config = new Config({ projectName: 'my-project' });
    config.update({ environment: 'production' });
    expect(config.get().environment).toBe('production');
    expect(config.get().projectName).toBe('my-project');
  });

  it('should store and retrieve typed settings', () => {
    const config = new Config({ projectName: 'test' });
    config.setSetting('maxRetries', 3);
    expect(config.getSetting<number>('maxRetries')).toBe(3);
  });

  it('should return undefined for missing settings', () => {
    const config = new Config({ projectName: 'test' });
    expect(config.getSetting('nonexistent')).toBeUndefined();
  });
});
