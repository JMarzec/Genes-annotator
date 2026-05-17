import { describe, it, expect } from "vitest";
import { mergeLiveSignals } from "@/lib/mergeLiveSignals";
import type { GeneAnnotation } from "@/data/sampleData";
import type { LiveSignals } from "@/lib/geneApis";

const baseAnnotation = (symbol: string, overrides: Partial<GeneAnnotation> = {}): GeneAnnotation => ({
  symbol,
  ensemblId: "—",
  entrezId: "—",
  role: "Unknown",
  description: "No annotation available.",
  cancerRelevance: "Unknown",
  civicEvidence: false,
  dgidbInteractions: false,
  ...overrides,
});

const baseSignal = (overrides: Partial<LiveSignals> = {}): LiveSignals => ({
  civicEvidenceCount: 0,
  dgidbDrugs: [],
  fetched: true,
  ...overrides,
});

describe("mergeLiveSignals — HGNC canonicalization safety", () => {
  it("keeps duplicate input rows separate when one alias canonicalizes to a symbol that is already present", () => {
    // User uploads both "CD45" (an alias) and "PTPRC" (official symbol).
    const annotated = [baseAnnotation("CD45"), baseAnnotation("PTPRC")];
    const live = new Map<string, LiveSignals>([
      ["CD45", baseSignal({ officialSymbol: "PTPRC", entrezId: "5788" })],
      ["PTPRC", baseSignal({ officialSymbol: "PTPRC", entrezId: "5788" })],
    ]);

    const merged = mergeLiveSignals(annotated, live);

    expect(merged).toHaveLength(2);
    // The alias row must NOT be rewritten to "PTPRC" — that would silently
    // collide with the existing PTPRC row and shrink the reportable count.
    expect(merged[0].symbol).toBe("CD45");
    expect(merged[1].symbol).toBe("PTPRC");
    // Distinct symbols (case-insensitive) means both remain selectable.
    const uniqueSymbols = new Set(merged.map((m) => m.symbol.toUpperCase()));
    expect(uniqueSymbols.size).toBe(2);
  });

  it("only allows the first row to claim a given official symbol when multiple aliases map to it", () => {
    const annotated = [baseAnnotation("HER2"), baseAnnotation("NEU"), baseAnnotation("ERBB2")];
    const live = new Map<string, LiveSignals>([
      ["HER2", baseSignal({ officialSymbol: "ERBB2" })],
      ["NEU", baseSignal({ officialSymbol: "ERBB2" })],
      ["ERBB2", baseSignal({ officialSymbol: "ERBB2" })],
    ]);

    const merged = mergeLiveSignals(annotated, live);

    expect(merged).toHaveLength(3);
    // ERBB2 already exists in the cohort, so neither alias can adopt it.
    expect(merged[0].symbol).toBe("HER2");
    expect(merged[1].symbol).toBe("NEU");
    expect(merged[2].symbol).toBe("ERBB2");
  });

  it("does adopt the official symbol when there is no collision", () => {
    const annotated = [baseAnnotation("p53")];
    const live = new Map<string, LiveSignals>([
      ["P53", baseSignal({ officialSymbol: "TP53" })],
    ]);

    const merged = mergeLiveSignals(annotated, live);
    expect(merged[0].symbol).toBe("TP53");
  });

  it("marks every input row as liveFetched even when no live data is returned", () => {
    const annotated = [baseAnnotation("FOO"), baseAnnotation("BAR")];
    const merged = mergeLiveSignals(annotated, new Map());
    expect(merged.map((m) => m.liveFetched)).toEqual([true, true]);
    expect(merged.map((m) => m.symbol)).toEqual(["FOO", "BAR"]);
  });
});
