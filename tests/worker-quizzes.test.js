const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

let workerModulePromise;

async function loadWorkerModule() {
  if (!workerModulePromise) {
    workerModulePromise = fs.readFile(path.join(__dirname, '..', 'cloudflare', 'worker.js'), 'utf8')
      .then((source) => import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`));
  }
  return workerModulePromise;
}

function makeBucketObject(key, extra = {}) {
  return {
    key,
    size: extra.size ?? 1,
    uploaded: extra.uploaded ?? '2026-03-19T00:00:00.000Z',
    customMetadata: extra.customMetadata ?? {},
  };
}

function makePagedList(objects) {
  const calls = [];

  return {
    calls,
    async list(options = {}) {
      calls.push(options);
      const prefix = options.prefix || '';
      const filtered = objects.filter((obj) => obj.key.startsWith(prefix));
      const start = Number(options.cursor || 0);
      const limit = Number(options.limit || filtered.length || 100);
      const page = filtered.slice(start, start + limit);
      const nextOffset = start + page.length;

      return {
        objects: page,
        truncated: nextOffset < filtered.length,
        cursor: nextOffset < filtered.length ? String(nextOffset) : undefined,
      };
    },
  };
}

describe('worker /api/quizzes listing', () => {
  it('lists saved quizzes even when the bucket contains many non-manifest media objects', async () => {
    const { default: worker } = await loadWorkerModule();
    const mediaObjects = [];

    for (let i = 0; i < 180; i += 1) {
      mediaObjects.push(makeBucketObject(`quiz-${i}/audio/question-${i}.mp3`));
      mediaObjects.push(makeBucketObject(`quiz-${i}/images/question-${i}.png`));
    }

    const manifestObjects = [
      makeBucketObject('quizzes/quiz-alpha.json', {
        size: 210,
        customMetadata: { title: 'Alpha Quiz', questionCount: '5' },
      }),
      makeBucketObject('quizzes/quiz-beta.json', {
        size: 310,
        customMetadata: { title: 'Beta Quiz', questionCount: '8' },
      }),
      makeBucketObject('quizzes/quiz-gamma.json', {
        size: 410,
        customMetadata: { title: 'Gamma Quiz', questionCount: '12' },
      }),
    ];

    const quizMedia = makePagedList([...mediaObjects, ...manifestObjects]);
    const response = await worker.fetch(
      new Request('https://example.com/api/quizzes', { method: 'GET' }),
      { QUIZ_MEDIA: quizMedia }
    );
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(payload, {
      quizzes: [
        {
          key: 'quizzes/quiz-alpha.json',
          pin: 'quiz-alpha',
          size: 210,
          uploaded: '2026-03-19T00:00:00.000Z',
          title: 'Alpha Quiz',
          questionCount: 5,
        },
        {
          key: 'quizzes/quiz-beta.json',
          pin: 'quiz-beta',
          size: 310,
          uploaded: '2026-03-19T00:00:00.000Z',
          title: 'Beta Quiz',
          questionCount: 8,
        },
        {
          key: 'quizzes/quiz-gamma.json',
          pin: 'quiz-gamma',
          size: 410,
          uploaded: '2026-03-19T00:00:00.000Z',
          title: 'Gamma Quiz',
          questionCount: 12,
        },
      ],
    });
    assert.ok(quizMedia.calls.length >= 1);
    assert.ok(quizMedia.calls.every((options) => options.prefix === 'quizzes/'));
  });

  it('follows paginated manifest listings until all saved quizzes are returned', async () => {
    const { default: worker } = await loadWorkerModule();
    const manifestObjects = Array.from({ length: 105 }, (_, index) => makeBucketObject(`quizzes/quiz-${index + 1}.json`, {
      size: index + 1,
      customMetadata: {
        title: `Quiz ${index + 1}`,
        questionCount: String((index % 10) + 1),
      },
    }));

    const quizMedia = makePagedList(manifestObjects);
    const response = await worker.fetch(
      new Request('https://example.com/api/quizzes', { method: 'GET' }),
      { QUIZ_MEDIA: quizMedia }
    );
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.quizzes.length, 105);
    assert.equal(payload.quizzes[0].key, 'quizzes/quiz-1.json');
    assert.equal(payload.quizzes.at(-1).key, 'quizzes/quiz-105.json');
    assert.ok(quizMedia.calls.length >= 2);
    assert.deepEqual(
      quizMedia.calls.map((options) => options.cursor || null),
      [null, '100']
    );
  });
});
