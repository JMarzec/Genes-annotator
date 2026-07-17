import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const CIVIC_URL = "https://civicdb.org/api/graphql";
const DGIDB_URL = "https://dgidb.org/api/graphql";
const MYGENE_URL = "https://mygene.info/v3/query";

async function gql<T>(url: string, query: string, variables: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.errors) return null;
    return json.data as T;
  } catch {
    return null;
  }
}

export default defineTool({
  name: "lookup_gene",
  title: "Look up gene annotations",
  description:
    "Fetch cancer-focused annotations for a human gene symbol (HGNC). Returns metadata (name, Entrez/Ensembl IDs, summary), CIViC clinical-evidence count, and DGIdb drug interactions.",
  inputSchema: {
    symbol: z.string().min(1).describe("HGNC gene symbol, e.g. TP53, BRCA1, EGFR."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ symbol }) => {
    const sym = symbol.trim().toUpperCase();

    const [civic, dgidb, mygeneRes] = await Promise.all([
      gql<{ genes: { nodes: { name: string; fullName?: string; description?: string; entrezId?: number; stats: { evidenceItemCount: number } }[] } }>(
        CIVIC_URL,
        `query ($s: [String!]) { genes(entrezSymbols: $s, first: 5) { nodes { name fullName description entrezId stats { evidenceItemCount } } } }`,
        { s: [sym] },
      ),
      gql<{ genes: { nodes: { name: string; longName?: string; geneCategories: { name: string }[]; interactions: { drug: { name: string } }[] }[] } }>(
        DGIDB_URL,
        `query ($n: [String!]!) { genes(names: $n) { nodes { name longName geneCategories { name } interactions { drug { name } } } } }`,
        { n: [sym] },
      ),
      fetch(
        `${MYGENE_URL}?q=symbol:"${sym}"&species=human&fields=symbol,name,summary,entrezgene,ensembl.gene,type_of_gene&size=1`,
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    const civicNode = civic?.genes.nodes.find((n) => n.name.toUpperCase() === sym) ?? civic?.genes.nodes[0];
    const dgidbNode = dgidb?.genes.nodes.find((n) => n.name.toUpperCase() === sym) ?? dgidb?.genes.nodes[0];
    const mygeneHit = mygeneRes?.hits?.[0];

    const drugs = Array.from(new Set((dgidbNode?.interactions ?? []).map((i) => i.drug.name).filter(Boolean)));
    const categories = Array.from(new Set((dgidbNode?.geneCategories ?? []).map((c) => c.name).filter(Boolean)));
    const ensemblId =
      mygeneHit?.ensembl && (Array.isArray(mygeneHit.ensembl) ? mygeneHit.ensembl[0]?.gene : mygeneHit.ensembl.gene);

    const result = {
      symbol: sym,
      officialSymbol: mygeneHit?.symbol ?? civicNode?.name ?? sym,
      fullName: mygeneHit?.name ?? civicNode?.fullName ?? dgidbNode?.longName ?? null,
      description: mygeneHit?.summary ?? civicNode?.description ?? null,
      entrezId: mygeneHit?.entrezgene ? String(mygeneHit.entrezgene) : civicNode?.entrezId ? String(civicNode.entrezId) : null,
      ensemblId: ensemblId ?? null,
      geneType: mygeneHit?.type_of_gene ?? null,
      civicEvidenceCount: civicNode?.stats.evidenceItemCount ?? 0,
      dgidbDrugCount: drugs.length,
      dgidbDrugs: drugs.slice(0, 50),
      dgidbCategories: categories,
      externalLinks: {
        civic: civicNode ? `https://civicdb.org/genes/${civicNode.name}` : null,
        dgidb: dgidbNode ? `https://dgidb.org/genes/${dgidbNode.name}` : null,
        ncbi: mygeneHit?.entrezgene ? `https://www.ncbi.nlm.nih.gov/gene/${mygeneHit.entrezgene}` : null,
        ensembl: ensemblId ? `https://www.ensembl.org/id/${ensemblId}` : null,
        genecards: `https://www.genecards.org/cgi-bin/carddisp.pl?gene=${sym}`,
      },
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
