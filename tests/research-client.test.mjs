import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchResearch } from '../apps/desktop/src/domain/researchClient.ts';

test('no consent means no network request', async () => {
  let calls = 0;
  await assert.rejects(fetchResearch('Licht', {consent: false, fetcher: async () => {calls++; throw Error('Must not run');}}), /freigegeben/);
  assert.equal(calls, 0);
});

test('consented research filters and deduplicates real response shapes and omits credentials', async () => {
  const requests = [];
  const fetcher = async (url, init) => {
    requests.push({url: String(url), init});
    const kind = new URL(url).searchParams.get('filter').split(':')[1];
    return new Response(JSON.stringify({message: {items: [
      {DOI: '10.1234/common', type: kind, title: ['Forschung']},
      {DOI: `10.1234/${kind}`, type: kind, title: ['Weitere Forschung']},
      {DOI: '10.1234/book', type: 'book', title: ['Nicht erlaubt']},
    ]}}), {status: 200, headers: {'Content-Type': 'application/json'}});
  };
  const result = await fetchResearch('Licht', {consent: true, fetcher});
  assert.equal(requests.length, 2);
  assert.equal(result.length, 3);
  assert.equal(requests[0].init.credentials, 'omit');
  assert.equal(requests[0].init.referrerPolicy, 'no-referrer');
  assert.ok(requests[0].init.signal instanceof AbortSignal);
  assert.ok(requests.every(r => new URL(r.url).searchParams.get('query.title') === 'Licht'));
});

test('large responses fail at the byte boundary and pre-aborted requests never start', async () => {
  await assert.rejects(fetchResearch('Licht', {consent: true, fetcher: async () => new Response('x'.repeat(300_001))}), /groß|300/);
  let calls = 0;
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(fetchResearch('Licht', {consent: true, signal: controller.signal, fetcher: async () => {calls++; return new Response('{}');}}));
  assert.equal(calls, 0);
});
