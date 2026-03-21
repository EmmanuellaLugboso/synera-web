import test from 'node:test';
import assert from 'node:assert/strict';

const { emitLogLine, logEvent } = await import('../app/lib/logging.js');

test('emitLogLine falls back to console when stderr.write is unavailable', () => {
  const calls = [];
  const out = emitLogLine('error', '{"event":"x"}', {
    stderr: null,
    consoleTarget: {
      error: (line) => calls.push(['error', line]),
    },
  });

  assert.equal(out, 'error');
  assert.deepEqual(calls, [['error', '{"event":"x"}']]);
});

test('logEvent redacts secrets before writing logs', () => {
  const writes = [];
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';

  const originalStderrWrite = process.stderr.write;
  process.stderr.write = (chunk) => {
    writes.push(String(chunk));
    return true;
  };

  try {
    logEvent('info', 'auth.test', {
      apiKey: 'abc123',
      password: 'hunter2',
      safe: 'ok',
    });
  } finally {
    process.stderr.write = originalStderrWrite;
    process.env.NODE_ENV = originalEnv;
  }

  assert.equal(writes.length, 1);
  const parsed = JSON.parse(writes[0]);
  assert.equal(parsed.event, 'auth.test');
  assert.equal(parsed.apiKey, '[REDACTED]');
  assert.equal(parsed.password, '[REDACTED]');
  assert.equal(parsed.safe, 'ok');
});
