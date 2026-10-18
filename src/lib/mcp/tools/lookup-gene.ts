import { defineTool } from '@lovable.dev/mcp-js';
import { z } from 'zod';
import { fetchLiveSignals } from '../../geneApis';
const symbolSchema = z.string().trim().regex(/^(?=.*[A-Za-z])[A-Za-z0-9._-]{1,40}$/, 'Use a nonempty human gene symbol.');
export default defineTool({
  name: 'lookup_gene', title: 'Look up gene annotations',
  description: 'Fetch human gene metadata, CIViC evidence and complete DGIdb drug lists, with explicit source availability and alias resolution.',
  inputSchema: { symbol: symbolSchema.describe('HGNC gene symbol, e.g. TP53, BRCA1, EGFR.') },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ symbol }, ctx) => {
    const sym = symbol.toUpperCase();
    const signals = (await fetchLiveSignals([sym], ctx.signal)).get(sym);
    if (!signals) return { isError: true, content: [{ type: 'text' as const, text: 'Gene lookup did not return a result.' }] };
    const s = signals;
    const result = {
      symbol, officialSymbol: s.officialSymbol ?? null, resolution: s.resolution ?? 'unavailable',
      fullName: s.fullName ?? null, description: s.description ?? null, entrezId: s.entrezId ?? null, ensemblId: s.ensemblId ?? null, geneType: s.geneType ?? null,
      civicEvidenceCount: s.sourceStatus?.civic === 'success' ? s.civicEvidenceCount : null,
      dgidbDrugCount: s.sourceStatus?.dgidb === 'success' ? s.dgidbDrugs.length : null,
      dgidbDrugs: s.dgidbDrugs, dgidbCategories: s.dgidbCategories ?? [],
      sourceStatus: { civic: s.sourceStatus?.civic ?? 'unavailable', dgidb: s.sourceStatus?.dgidb ?? 'unavailable', metadata: s.sourceStatus?.metadata ?? 'unavailable' },
      externalLinks: {
        civic: `https://civicdb.org/links/entrez_name/${encodeURIComponent(s.officialSymbol ?? symbol)}`,
        dgidb: `https://dgidb.org/genes/${encodeURIComponent(s.officialSymbol ?? symbol)}`,
        ncbi: s.entrezId ? `https://www.ncbi.nlm.nih.gov/gene/${s.entrezId}` : null,
        ensembl: s.ensemblId ? `https://www.ensembl.org/id/${s.ensemblId}` : null,
        genecards: `https://www.genecards.org/cgi-bin/carddisp.pl?gene=${encodeURIComponent(s.officialSymbol ?? symbol)}`,
      },
    };
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }], structuredContent: result };
  },
});
