import { defineTool } from '@lovable.dev/mcp-js';
import { z } from 'zod';
import { fetchLiveSignals } from '../../geneApis';
export default defineTool({
  name: 'lookup_genes_batch', title: 'Look up multiple genes (compact)',
  description: 'Return compact human gene evidence and distinct drug counts for up to 40 input rows, preserving duplicates and reporting unavailable sources.',
  inputSchema: { symbols: z.array(z.string().trim().regex(/^(?=.*[A-Za-z])[A-Za-z0-9._-]{1,40}$/, 'Use a nonempty gene symbol.')).min(1).max(40).describe('Up to 40 HGNC gene symbols.') },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ symbols }, ctx) => {
    const live = await fetchLiveSignals(symbols, ctx.signal);
    const results = symbols.map((symbol, row) => {
      const s = live.get(symbol.toUpperCase());
      return { row, symbol, officialSymbol: s?.officialSymbol ?? null, resolution: s?.resolution ?? 'unavailable',
        civicEvidenceCount: s?.sourceStatus?.civic === 'success' ? s.civicEvidenceCount : null,
        dgidbDrugCount: s?.sourceStatus?.dgidb === 'success' ? s.dgidbDrugs.length : null,
        sourceStatus: { civic: s?.sourceStatus?.civic ?? 'unavailable', dgidb: s?.sourceStatus?.dgidb ?? 'unavailable', metadata: s?.sourceStatus?.metadata ?? 'unavailable' },
      };
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }], structuredContent: { results } };
  },
});
