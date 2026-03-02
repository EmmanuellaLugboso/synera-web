import test from 'node:test';
import assert from 'node:assert/strict';

const { sanitizeForFirestore } = await import('../app/services/firestoreSanitize.js');

test('sanitizeForFirestore removes undefined deeply', () => {
  const data = {
    a: 1,
    b: undefined,
    c: {
      d: undefined,
      e: 'ok',
    },
    f: [1, undefined, { g: undefined, h: 2 }],
  };

  const out = sanitizeForFirestore(data);
  assert.deepEqual(out, {
    a: 1,
    c: { e: 'ok' },
    f: [1, { h: 2 }],
  });
});
