import test from 'node:test';
import assert from 'node:assert/strict';
import { scholarlyQuery, selectResearch } from '../apps/desktop/src/domain/research.ts';

test('research queries send only the selected title to a fixed, type-filtered Crossref endpoint', () => {
  const query = new URL(scholarlyQuery('Optische Interferenz', 'dissertation'));
  assert.equal(query.origin, 'https://api.crossref.org');
  assert.equal(query.pathname, '/works');
  assert.equal(query.searchParams.get('query.title'), 'Optische Interferenz');
  assert.equal(query.searchParams.get('filter'), 'type:dissertation');
  assert.equal(query.searchParams.get('rows'), '6');
  assert.throws(() => scholarlyQuery('', 'journal-article'));
  assert.throws(() => scholarlyQuery('A', 'book'));
});

test('metadata validation rejects unsupported types and unsafe DOI/URL values', () => {
  const items = selectResearch({ message: { items: [
    { DOI: '10.1234/valid-paper', type: 'journal-article', title: ['Licht'], URL: 'javascript:alert(1)', issued: {'date-parts': [[2024]]} },
    { DOI: '10.1234/thesis', type: 'dissertation', title: ['Dissertation'] },
    { DOI: '10.1234/book', type: 'book', title: ['Buch'] },
    { DOI: '10.1234/../secret', type: 'journal-article', title: ['Flucht'] },
    { DOI: 'javascript:alert(1)', type: 'journal-article', title: ['Angriff'] },
    { DOI: '10.1234/empty', type: 'journal-article', title: [] },
  ] }});
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'Licht');
  assert.equal(items[0].year, 2024);
  assert.equal(items[0].url, 'https://doi.org/10.1234%2Fvalid-paper');
  assert.equal(items[1].kind, 'dissertation');
  assert.deepEqual(selectResearch({message: {items: 'bad'}}), []);
});
