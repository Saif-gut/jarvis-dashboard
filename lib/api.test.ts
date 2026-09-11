import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './api';

describe('dashboard API Unicode handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps German UTF-8 text unchanged when reading Jarvis JSON', async () => {
    const question = 'Grüße aus Köln – schön, dass du da bist.';
    const answer = 'dafür persönlich: Präzise Unterstützung. ÄÖÜ äöü ß';
    const payload = {
      status: 'spricht',
      connected: true,
      managed: true,
      pid: 123,
      started_at: null,
      runtime_seconds: 1,
      logs: [`Frage: ${question}`, `Antwort: ${answer}`],
      message: null,
      last_user_text: question,
      last_response: answer,
    };
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
      ),
    );

    const result = await api.jarvisStatus();

    expect(result.last_user_text).toBe(question);
    expect(result.last_response).toBe(answer);
    expect(result.logs).toEqual(payload.logs);
    expect(result.last_response).not.toContain(String.fromCodePoint(0xfffd));
  });
});
