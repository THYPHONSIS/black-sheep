export type ResearchKind = 'journal-article' | 'dissertation';
export type ResearchItem = { doi: string; title: string; kind: ResearchKind; year?: number; url: string };
export function scholarlyQuery(topic: string, kind: ResearchKind): string {
  const title = topic.trim();
  if (!title || title.length > 180 || !['journal-article', 'dissertation'].includes(kind)) throw new Error('Ungültiges Forschungsthema oder Dokumenttyp.');
  const query = new URL('https://api.crossref.org/works');
  query.searchParams.set('query.title', title);
  query.searchParams.set('filter', `type:${kind}`);
  query.searchParams.set('rows', '6');
  query.searchParams.set('select', 'DOI,title,type,issued,author');
  return query.href;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export function selectResearch(payload: unknown): ResearchItem[] {
  const items = record(record(payload)?.message)?.items;
  if (!Array.isArray(items)) return [];
  const output: ResearchItem[] = [];
  const seen = new Set<string>();
  for (const value of items.slice(0, 100)) {
    const item = record(value);
    if (!item || !['journal-article', 'dissertation'].includes(String(item.type))) continue;
    const doi = typeof item.DOI === 'string' ? item.DOI.trim() : '';
    if (!/^10\.\d{4,9}\/[A-Za-z0-9._;()/:+\-]{1,190}$/.test(doi) || doi.split('/').some(s => s === '.' || s === '..') || seen.has(doi.toLowerCase())) continue;
    const title = Array.isArray(item.title) && typeof item.title[0] === 'string' ? item.title[0].trim().slice(0, 500) : '';
    if (!title) continue;
    const date = record(item.issued)?.['date-parts'];
    const year = Array.isArray(date) && Array.isArray(date[0]) && Number.isInteger(date[0][0]) && date[0][0] >= 1000 && date[0][0] <= 3000 ? date[0][0] as number : undefined;
    output.push({doi, title, kind: item.type as ResearchKind, ...(year ? {year} : {}), url: `https://doi.org/${encodeURIComponent(doi)}`});
    seen.add(doi.toLowerCase());
    if (output.length === 10) break;
  }
  return output;
}
