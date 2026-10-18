// Environment-neutral public gene lookups shared by the browser and MCP.
export type SourceState = 'success' | 'unavailable';
export interface LiveSignals {
  civicEvidenceCount: number;
  dgidbDrugs: string[];
  entrezId?: string;
  ensemblId?: string;
  officialSymbol?: string;
  fullName?: string;
  description?: string;
  geneType?: string;
  metadataFound?: boolean;
  dgidbCategories?: string[];
  inferredRole?: 'Oncogene' | 'Tumor Suppressor' | 'Kinase' | 'DNA Repair' | 'TF' | 'Immune' | 'Unknown';
  resolution?: 'exact' | 'alias' | 'ambiguous' | 'not-found' | 'unavailable';
  sourceStatus?: { civic: SourceState; dgidb: SourceState; metadata: SourceState };
  fetched: boolean;
}
interface MyGeneHit { symbol?: string; name?: string; summary?: string; entrezgene?: string | number; ensembl?: { gene?: string } | { gene?: string }[]; type_of_gene?: string; alias?: string | string[] }
interface CivicNode { name: string; fullName?: string; description?: string; entrezId?: number; stats: { evidenceItemCount: number } }
interface DgidbNode { name: string; longName?: string; geneCategories: { name: string }[]; interactions: { drug: { name: string } }[] }
const CIVIC_URL = 'https://civicdb.org/api/graphql', DGIDB_URL = 'https://dgidb.org/api/graphql', MYGENE_URL = 'https://mygene.info/v3/query';
const chunk = <T,>(a: T[], size: number) => Array.from({ length: Math.ceil(a.length / size) }, (_, i) => a.slice(i * size, (i + 1) * size));
async function boundedMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency = 4): Promise<R[]> {
  const results: R[] = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) { const index = next++; results[index] = await fn(items[index]); }
  }));
  return results;
}
async function request(url: string, init: RequestInit, signal?: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 15000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`Source returned ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
async function gql<T>(url: string, query: string, variables: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const json = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) }, signal);
  if (json.errors || !json.data) throw new Error('Source query failed');
  return json.data as T;
}
const inferRole = (text: string): LiveSignals['inferredRole'] => {
  const t = text.toLowerCase();
  if (/kinase/.test(t)) return 'Kinase';
  if (/dna repair|homologous recombination|mismatch repair|repair associated|brca/.test(t)) return 'DNA Repair';
  if (/immune|cytokine|chemokine|interleukin|hla|antigen presentation/.test(t)) return 'Immune';
  if (/transcription factor|transcriptional regulator|bhlh|zinc finger/.test(t)) return 'TF';
  if (/tumou?r suppressor/.test(t)) return 'Tumor Suppressor';
  if (/oncogene|proto-oncogene/.test(t)) return 'Oncogene';
  return 'Unknown';
};
export function selectMetadataHit(hits: MyGeneHit[], symbol: string) {
  const key = symbol.toUpperCase();
  const exact = hits.find(h => h.symbol?.toUpperCase() === key);
  if (exact) return { hit: exact, resolution: 'exact' as const };
  const candidates = hits.filter(h => (Array.isArray(h.alias) ? h.alias : h.alias ? [h.alias] : []).some(a => a.toUpperCase() === key));
  const distinct = new Map(candidates.filter(h => h.symbol).map(h => [h.symbol?.toUpperCase(), h]));
  if (distinct.size > 1) return { resolution: 'ambiguous' as const };
  const hit = [...distinct.values()][0];
  return { hit, resolution: hit ? 'alias' as const : 'not-found' as const };
}
async function metadataForSymbol(symbol: string, signal?: AbortSignal) {
  try {
    // Fetch exact matches separately: broad alias results cannot evict a valid symbol.
    const fields = 'symbol,name,summary,entrezgene,ensembl.gene,type_of_gene,alias';
    const term = `"${symbol.replace(/["\\]/g, '')}"`;
    const query = async (q: string) => {
      const params = new URLSearchParams({ q, species: 'human', fields, size: '100' });
      const json = await request(`${MYGENE_URL}?${params}`, {}, signal) as { hits?: MyGeneHit[]; total?: number };
      return { hits: json.hits ?? [], truncated: (json.total ?? 0) > (json.hits?.length ?? 0) };
    };
    const exact = await query(`symbol:${term}`);
    const exactHit = exact.hits.find(h => h.symbol?.toUpperCase() === symbol.toUpperCase());
    if (exactHit) return { hit: exactHit, resolution: 'exact' as const, status: 'success' as const };
    const aliases = await query(`alias:${term}`);
    const selected = selectMetadataHit(aliases.hits, symbol);
    return { ...selected, resolution: aliases.truncated ? 'ambiguous' as const : selected.resolution, hit: aliases.truncated ? undefined : selected.hit, status: 'success' as const };
  } catch { return { hit: undefined, resolution: 'unavailable' as const, status: 'unavailable' as const }; }
}
export async function fetchLiveSignals(symbols: string[], signal?: AbortSignal): Promise<Map<string, LiveSignals>> {
  const unique = [...new Set(symbols.map(s => s.trim().toUpperCase()))];
  const metadataResults = await boundedMap(unique, s => metadataForSymbol(s, signal), 6);
  if (signal?.aborted) throw new DOMException('Lookup cancelled', 'AbortError');
  const metadata = new Map(unique.map((s, i) => [s, metadataResults[i]]));
  const canonical = [...new Set(unique.filter(s => metadata.get(s)?.resolution !== 'ambiguous').map(s => metadata.get(s)?.hit?.symbol?.toUpperCase() ?? s))];
  const civic = new Map<string, CivicNode>(), dgidb = new Map<string, DgidbNode>();
  const civicStatus = new Map<string, SourceState>(), dgidbStatus = new Map<string, SourceState>();
  await Promise.all([
    boundedMap(chunk(canonical, 40), async batch => {
      try {
        const data = await gql<{ genes: { nodes: CivicNode[] } }>(CIVIC_URL, `query ($s: [String!]) { genes(entrezSymbols: $s, first: 200) { nodes { name fullName description entrezId stats { evidenceItemCount } } } }`, { s: batch }, signal);
        data.genes.nodes.forEach(n => civic.set(n.name.toUpperCase(), n));
        batch.forEach(s => civicStatus.set(s, 'success'));
      } catch { batch.forEach(s => civicStatus.set(s, 'unavailable')); }
    }),
    boundedMap(chunk(canonical, 40), async batch => {
      try {
        const data = await gql<{ genes: { nodes: DgidbNode[] } }>(DGIDB_URL, `query ($n: [String!]!) { genes(names: $n) { nodes { name longName geneCategories { name } interactions { drug { name } } } } }`, { n: batch }, signal);
        data.genes.nodes.forEach(n => dgidb.set(n.name.toUpperCase(), n));
        batch.forEach(s => dgidbStatus.set(s, 'success'));
      } catch { batch.forEach(s => dgidbStatus.set(s, 'unavailable')); }
    }),
  ]);
  if (signal?.aborted) throw new DOMException('Lookup cancelled', 'AbortError');
  return new Map(unique.map(s => {
    const meta = metadata.get(s), hit = meta?.hit, key = hit?.symbol?.toUpperCase() ?? s;
    const c = civic.get(key), d = dgidb.get(key);
    const drugs = [...new Set((d?.interactions ?? []).map(i => i.drug.name).filter(Boolean))];
    const categories = [...new Set((d?.geneCategories ?? []).map(c => c.name))];
    const ensembl = Array.isArray(hit?.ensembl) ? hit.ensembl.find(e => e.gene)?.gene : hit?.ensembl?.gene;
    const entry: LiveSignals = {
      civicEvidenceCount: c?.stats.evidenceItemCount ?? 0, dgidbDrugs: drugs,
      entrezId: hit?.entrezgene ? String(hit.entrezgene) : c?.entrezId ? String(c.entrezId) : undefined,
      ensemblId: ensembl, officialSymbol: hit?.symbol, fullName: hit?.name ?? c?.fullName ?? d?.longName,
      description: hit?.summary ?? c?.description, geneType: hit?.type_of_gene, metadataFound: Boolean(hit), dgidbCategories: categories,
      inferredRole: inferRole([hit?.name, hit?.summary, c?.description, ...categories].join(' ')),
      resolution: meta?.resolution ?? 'unavailable',
      sourceStatus: { civic: civicStatus.get(key) ?? 'unavailable', dgidb: dgidbStatus.get(key) ?? 'unavailable', metadata: meta?.status ?? 'unavailable' },
      fetched: true,
    };
    return [s, entry];
  }));
}
export async function fetchCivicCounts(symbols: string[]) { const live = await fetchLiveSignals(symbols); return new Map([...live].map(([s, v]) => [s, v.civicEvidenceCount])); }
export async function fetchDgidbDrugs(symbols: string[]) { const live = await fetchLiveSignals(symbols); return new Map([...live].map(([s, v]) => [s, v.dgidbDrugs])); }
