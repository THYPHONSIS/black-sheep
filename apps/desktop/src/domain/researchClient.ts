import { scholarlyQuery, selectResearch } from './research.ts';
import type { ResearchItem } from './research.ts';
export type ResearchOptions = { consent: boolean; signal?: AbortSignal; fetcher?: typeof fetch };
export async function fetchResearch(topic: string, options: ResearchOptions): Promise<ResearchItem[]> {
  if (!options.consent) throw new Error('Recherche ist nicht freigegeben.');
  options.signal?.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener('abort', abort, {once: true});
  const timeout = setTimeout(() => controller.abort(new Error('Die Recherche hat zu lange gedauert. Bitte erneut versuchen.')), 9_000);
  try {
    const fetcher = options.fetcher ?? fetch;
    const results = await Promise.all((['journal-article', 'dissertation'] as const).map(async kind => {
      const response = await fetcher(scholarlyQuery(topic, kind), {signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', headers: {Accept: 'application/json'}});
      if (!response.ok) throw new Error(response.status === 429 ? 'Crossref ist ausgelastet. Bitte später erneut versuchen.' : `Crossref antwortet mit HTTP ${response.status}.`);
      if (Number(response.headers.get('content-length')) > 300_000) { await response.body?.cancel(); throw new Error('Die Forschungsantwort ist zu groß (maximal 300 kB).'); }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Crossref hat keine lesbare Antwort geliefert.');
      const decoder = new TextDecoder();
      let text = '';
      let size = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          controller.signal.throwIfAborted();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > 300_000) { await reader.cancel(); throw new Error('Die Forschungsantwort ist zu groß (maximal 300 kB).'); }
          text += decoder.decode(chunk.value, {stream: true});
        }
        text += decoder.decode();
      } finally { reader.releaseLock(); }
      return selectResearch(JSON.parse(text) as unknown);
    }));
    controller.signal.throwIfAborted();
    return [...new Map(results.flat().map(item => [item.doi.toLowerCase(), item])).values()].slice(0, 10);
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}
