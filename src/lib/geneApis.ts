// Live lookups against public CIViC + DGIdb GraphQL endpoints (CORS-enabled).
// Both endpoints accept batched queries — we chunk to keep payloads reasonable.

export interface LiveSignals {
  civicEvidenceCount: number;
  dgidbDrugs: string[];
  fetched: boolean;
}

const CIVIC_URL = "https://civicdb.org/api/graphql";
const DGIDB_URL = "https://dgidb.org/api/graphql";
const CHUNK = 40;

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

async function gql<T>(url: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data as T;
}

export async function fetchCivicCounts(symbols: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const q = `query ($s: [String!]) { genes(entrezSymbols: $s, first: 200) { nodes { name stats { evidenceItemCount } } } }`;
  await Promise.all(
    chunk(symbols, CHUNK).map(async (batch) => {
      try {
        const data = await gql<{ genes: { nodes: { name: string; stats: { evidenceItemCount: number } }[] } }>(
          CIVIC_URL, q, { s: batch }
        );
        for (const n of data.genes.nodes) map.set(n.name.toUpperCase(), n.stats.evidenceItemCount);
      } catch (e) {
        console.warn("CIViC batch failed", e);
      }
    })
  );
  return map;
}

export async function fetchDgidbDrugs(symbols: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  const q = `query ($n: [String!]!) { genes(names: $n) { nodes { name interactions { drug { name } } } } }`;
  await Promise.all(
    chunk(symbols, CHUNK).map(async (batch) => {
      try {
        const data = await gql<{ genes: { nodes: { name: string; interactions: { drug: { name: string } }[] }[] } }>(
          DGIDB_URL, q, { n: batch }
        );
        for (const n of data.genes.nodes) {
          const drugs = Array.from(new Set(n.interactions.map((i) => i.drug.name).filter(Boolean)));
          map.set(n.name.toUpperCase(), drugs);
        }
      } catch (e) {
        console.warn("DGIdb batch failed", e);
      }
    })
  );
  return map;
}

export async function fetchLiveSignals(symbols: string[]): Promise<Map<string, LiveSignals>> {
  const [civic, dgidb] = await Promise.all([fetchCivicCounts(symbols), fetchDgidbDrugs(symbols)]);
  const out = new Map<string, LiveSignals>();
  for (const s of symbols) {
    const key = s.toUpperCase();
    out.set(key, {
      civicEvidenceCount: civic.get(key) ?? 0,
      dgidbDrugs: dgidb.get(key) ?? [],
      fetched: true,
    });
  }
  return out;
}
