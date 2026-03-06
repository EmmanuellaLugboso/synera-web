import test from 'node:test';
import assert from 'node:assert/strict';
import { increment, serverTimestamp } from 'firebase/firestore';

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

test('sanitizeForFirestore preserves Firestore FieldValue sentinels', () => {
  const ts = serverTimestamp();
  const inc = increment(2);

  const out = sanitizeForFirestore({
    updatedAt: ts,
    stats: {
      streak: inc,
    },
  });

  assert.equal(out.updatedAt, ts);
  assert.equal(out.stats.streak, inc);
});
