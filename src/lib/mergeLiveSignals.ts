import type { GeneAnnotation } from "@/data/sampleData";
import type { LiveSignals } from "@/lib/geneApis";

/**
 * Merge live CIViC/DGIdb/MyGene signals into the per-row annotations.
 *
 * Key invariant: each input row stays as a distinct row. The official HGNC
 * symbol is only adopted when it does not collide with another symbol already
 * present in the cohort (or with a symbol another row has already claimed in
 * this pass). This prevents silent merging of duplicates such as
 * `CD45 → PTPRC` when `PTPRC` is also present in the input list.
 */
export function mergeLiveSignals(
  annotated: GeneAnnotation[],
  live: Map<string, LiveSignals>,
): GeneAnnotation[] {
  const existingSymbols = new Set(annotated.map((a) => a.symbol.toUpperCase()));
  const claimed = new Set<string>();

  return annotated.map((a) => {
    const s = live.get(a.symbol.toUpperCase());
    if (!s) return { ...a, liveFetched: true };

    const liveDescription = s.description
      ? `${s.fullName ? `${s.fullName}. ` : ""}${s.description}`
      : s.fullName;

    let resolvedSymbol = a.symbol;
    if (s.officialSymbol) {
      const off = s.officialSymbol.toUpperCase();
      const sameAsInput = off === a.symbol.toUpperCase();
      const wouldCollide = !sameAsInput && (existingSymbols.has(off) || claimed.has(off));
      if (!wouldCollide) {
        resolvedSymbol = s.officialSymbol;
        claimed.add(off);
      }
    }

    return {
      ...a,
      liveFetched: true,
      symbol: resolvedSymbol,
      ensemblId: a.ensemblId !== "—" ? a.ensemblId : s.ensemblId ?? a.ensemblId,
      entrezId: a.entrezId !== "—" ? a.entrezId : s.entrezId ?? a.entrezId,
      role: a.role !== "Unknown" ? a.role : s.inferredRole ?? a.role,
      description:
        a.description !== "No annotation available."
          ? a.description
          : liveDescription ?? a.description,
      cancerRelevance:
        a.cancerRelevance !== "Unknown"
          ? a.cancerRelevance
          : s.description ??
            (s.metadataFound
              ? `${s.officialSymbol ?? a.symbol} is annotated in public human gene metadata${
                  s.geneType ? ` as ${s.geneType}` : ""
                }.`
              : s.civicEvidenceCount > 0
              ? `${a.symbol} has curated clinical evidence in CIViC.`
              : a.cancerRelevance),
      civicEvidenceCount: s.civicEvidenceCount,
      dgidbDrugs: s.dgidbDrugs,
      civicEvidence: s.civicEvidenceCount > 0 || a.civicEvidence,
      dgidbInteractions: s.dgidbDrugs.length > 0 || a.dgidbInteractions,
    };
  });
}
