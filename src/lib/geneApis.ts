// Live lookups against public CIViC + DGIdb GraphQL endpoints (CORS-enabled).
// Both endpoints accept batched queries — we chunk to keep payloads reasonable.

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
  inferredRole?: "Oncogene" | "Tumor Suppressor" | "Kinase" | "DNA Repair" | "TF" | "Immune" | "Unknown";
  fetched: boolean;
}

interface CivicGeneSignal {
  evidenceCount: number;
  entrezId?: string;
  fullName?: string;
  description?: string;
}

interface DgidbGeneSignal {
  drugs: string[];
  longName?: string;
  categories: string[];
}

interface GeneMetadataSignal {
  entrezId?: string;
  ensemblId?: string;
  officialSymbol?: string;
  fullName?: string;
  description?: string;
  geneType?: string;
}

interface MyGeneHit {
  _score?: number;
  symbol?: string;
  name?: string;
  summary?: string;
  entrezgene?: string | number;
  ensembl?: { gene?: string } | { gene?: string }[];
  type_of_gene?: string;
  alias?: string | string[];
}

const CIVIC_URL = "https://civicdb.org/api/graphql";
const DGIDB_URL = "https://dgidb.org/api/graphql";
const MYGENE_URL = "https://mygene.info/v3/query";
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

const inferRole = (text: string): LiveSignals["inferredRole"] => {
  const t = text.toLowerCase();
  if (/kinase|tyrosine kinase|serine\/threonine/.test(t)) return "Kinase";
  if (/dna repair|homologous recombination|mismatch repair|repair associated|brca/.test(t)) return "DNA Repair";
  if (/immune|cytokine|chemokine|interleukin|hla|antigen presentation/.test(t)) return "Immune";
  if (/transcription factor|transcriptional regulator|bhlh|zinc finger/.test(t)) return "TF";
  if (/tumou?r suppressor|loss-of-function|caretaker gene|gatekeeper gene/.test(t)) return "Tumor Suppressor";
  if (/oncogene|proto-oncogene|driver gene|gain-of-function/.test(t)) return "Oncogene";
  return "Unknown";
};

export async function fetchCivicGeneSignals(symbols: string[]): Promise<Map<string, CivicGeneSignal>> {
  const map = new Map<string, CivicGeneSignal>();
  const q = `query ($s: [String!]) { genes(entrezSymbols: $s, first: 200) { nodes { name fullName description entrezId stats { evidenceItemCount } } } }`;
  await Promise.all(
    chunk(symbols, CHUNK).map(async (batch) => {
      try {
        const data = await gql<{ genes: { nodes: { name: string; fullName?: string; description?: string; entrezId?: number; stats: { evidenceItemCount: number } }[] } }>(
          CIVIC_URL, q, { s: batch }
        );
        for (const n of data.genes.nodes) {
          map.set(n.name.toUpperCase(), {
            evidenceCount: n.stats.evidenceItemCount,
            entrezId: n.entrezId ? String(n.entrezId) : undefined,
            fullName: n.fullName,
            description: n.description,
          });
        }
      } catch (e) {
        console.warn("CIViC batch failed", e);
      }
    })
  );
  return map;
}

export async function fetchCivicCounts(symbols: string[]): Promise<Map<string, number>> {
  const signals = await fetchCivicGeneSignals(symbols);
  const map = new Map<string, number>();
  signals.forEach((value, key) => map.set(key, value.evidenceCount));
  return map;
}

export async function fetchDgidbGeneSignals(symbols: string[]): Promise<Map<string, DgidbGeneSignal>> {
  const map = new Map<string, DgidbGeneSignal>();
  const q = `query ($n: [String!]!) { genes(names: $n) { nodes { name longName geneCategories { name } interactions { drug { name } } } } }`;
  await Promise.all(
    chunk(symbols, CHUNK).map(async (batch) => {
      try {
        const data = await gql<{ genes: { nodes: { name: string; longName?: string; geneCategories: { name: string }[]; interactions: { drug: { name: string } }[] }[] } }>(
          DGIDB_URL, q, { n: batch }
        );
        for (const n of data.genes.nodes) {
          const drugs = Array.from(new Set(n.interactions.map((i) => i.drug.name).filter(Boolean)));
          const categories = Array.from(new Set(n.geneCategories.map((c) => c.name).filter(Boolean)));
          map.set(n.name.toUpperCase(), { drugs, longName: n.longName, categories });
        }
      } catch (e) {
        console.warn("DGIdb batch failed", e);
      }
    })
  );
  return map;
}

export async function fetchDgidbDrugs(symbols: string[]): Promise<Map<string, string[]>> {
  const signals = await fetchDgidbGeneSignals(symbols);
  const map = new Map<string, string[]>();
  signals.forEach((value, key) => map.set(key, value.drugs));
  return map;
}

export async function fetchLiveSignals(symbols: string[]): Promise<Map<string, LiveSignals>> {
  const [civic, dgidb] = await Promise.all([fetchCivicGeneSignals(symbols), fetchDgidbGeneSignals(symbols)]);
  const out = new Map<string, LiveSignals>();
  for (const s of symbols) {
    const key = s.toUpperCase();
    const civicSignal = civic.get(key);
    const dgidbSignal = dgidb.get(key);
    const roleText = [civicSignal?.fullName, civicSignal?.description, dgidbSignal?.longName, ...(dgidbSignal?.categories ?? [])].join(" ");
    out.set(key, {
      civicEvidenceCount: civicSignal?.evidenceCount ?? 0,
      dgidbDrugs: dgidbSignal?.drugs ?? [],
      entrezId: civicSignal?.entrezId,
      fullName: civicSignal?.fullName ?? dgidbSignal?.longName,
      description: civicSignal?.description,
      dgidbCategories: dgidbSignal?.categories ?? [],
      inferredRole: inferRole(roleText),
      fetched: true,
    });
  }
  return out;
}
