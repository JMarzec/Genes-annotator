import type { GeneAnnotation } from '@/data/sampleData';
import type { LiveSignals } from '@/lib/geneApis';
export function mergeLiveSignals(annotated: GeneAnnotation[], live: Map<string, LiveSignals>): GeneAnnotation[] {
  return annotated.map(a => {
    const s = live.get(a.symbol.toUpperCase());
    if (!s) return { ...a, liveFetched: true, sourceStatus: { civic: 'unavailable', dgidb: 'unavailable', metadata: 'unavailable' } };
    const status = s.sourceStatus ?? { civic: 'success', dgidb: 'success', metadata: 'success' };
    return {
      ...a, liveFetched: true, officialSymbol: s.officialSymbol, resolution: s.resolution, sourceStatus: status,
      ensemblId: a.ensemblId !== '—' ? a.ensemblId : s.ensemblId ?? a.ensemblId,
      entrezId: a.entrezId !== '—' ? a.entrezId : s.entrezId ?? a.entrezId,
      role: a.role !== 'Unknown' ? a.role : s.inferredRole ?? a.role,
      description: a.description !== 'No annotation available.' ? a.description : s.description ?? s.fullName ?? a.description,
      cancerRelevance: a.cancerRelevance !== 'Unknown' ? a.cancerRelevance : s.civicEvidenceCount > 0 ? `${s.officialSymbol ?? a.symbol} has curated evidence in CIViC.` : a.cancerRelevance,
      civicEvidenceCount: status.civic === 'success' ? s.civicEvidenceCount : undefined,
      dgidbDrugs: status.dgidb === 'success' ? s.dgidbDrugs : undefined,
      civicEvidence: status.civic === 'success' ? s.civicEvidenceCount > 0 : a.civicEvidence,
      dgidbInteractions: status.dgidb === 'success' ? s.dgidbDrugs.length > 0 : a.dgidbInteractions,
    };
  });
}
