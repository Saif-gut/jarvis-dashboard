import { describe, expect, it } from 'vitest';

import { DisconnectedJarvisAdapter } from './jarvis-adapter';

describe('Jarvis adapter boundary', () => {
  it('reports the prepared disconnected state', async () => {
    const adapter = new DisconnectedJarvisAdapter();
    await expect(adapter.getStatus()).resolves.toBe('nicht_verbunden');
    await expect(adapter.connect()).rejects.toThrow('noch nicht eingerichtet');
    await expect(adapter.ask('Hallo')).rejects.toThrow('nicht verbunden');
  });
});
