import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const CIVIC_URL = "https://civicdb.org/api/graphql";
const DGIDB_URL = "https://dgidb.org/api/graphql";

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
  name: "lookup_genes_batch",
  title: "Look up multiple genes (compact)",
  description:
    "Return compact CIViC evidence counts and DGIdb drug counts for up to 40 HGNC gene symbols in one call. Useful for triaging a cohort of genes.",
  inputSchema: {
    symbols: z
      .array(z.string().min(1))
      .min(1)
      .max(40)
      .describe("Up to 40 HGNC gene symbols."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ symbols }) => {
    const syms = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()))).filter(Boolean);

    const [civic, dgidb] = await Promise.all([
      gql<{ genes: { nodes: { name: string; stats: { evidenceItemCount: number } }[] } }>(
        CIVIC_URL,
        `query ($s: [String!]) { genes(entrezSymbols: $s, first: 200) { nodes { name stats { evidenceItemCount } } } }`,
        { s: syms },
      ),
      gql<{ genes: { nodes: { name: string; interactions: { drug: { name: string } }[] }[] } }>(
        DGIDB_URL,
        `query ($n: [String!]!) { genes(names: $n) { nodes { name interactions { drug { name } } } } }`,
        { n: syms },
      ),
    ]);

    const civicMap = new Map<string, number>();
    for (const n of civic?.genes.nodes ?? []) civicMap.set(n.name.toUpperCase(), n.stats.evidenceItemCount);
    const dgidbMap = new Map<string, number>();
    for (const n of dgidb?.genes.nodes ?? []) {
      const drugs = new Set(n.interactions.map((i) => i.drug.name).filter(Boolean));
      dgidbMap.set(n.name.toUpperCase(), drugs.size);
    }

    const results = syms.map((s) => ({
      symbol: s,
      civicEvidenceCount: civicMap.get(s) ?? 0,
      dgidbDrugCount: dgidbMap.get(s) ?? 0,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      structuredContent: { results },
    };
  },
});
