import { ROLE_STYLES, ROLE_ORDER, ROLE_COLORS } from "@/lib/roles";
import { toCSV, downloadFile } from "@/lib/download";
import { buildHtmlReport } from "@/lib/html-report";
import { useState, useMemo } from "react";
import { Check, Download, FileJson, FileSpreadsheet, Search, X, FileText, ChevronDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useGeneData } from "@/contexts/GeneDataContext";
import type { GeneAnnotation } from "@/data/sampleData";

interface ExportFields {
  symbol: boolean;
  ensemblId: boolean;
  entrezId: boolean;
  role: boolean;
  description: boolean;
  cancerRelevance: boolean;
  civicEvidence: boolean;
  dgidbInteractions: boolean;
  expressionMean: boolean;
  expressionMedian: boolean;
  expressionMin: boolean;
  expressionMax: boolean;
  outlierPct: boolean;
}

const DEFAULT_FIELDS: ExportFields = {
  symbol: true,
  ensemblId: true,
  entrezId: true,
  role: true,
  description: true,
  cancerRelevance: true,
  civicEvidence: true,
  dgidbInteractions: true,
  expressionMean: true,
  expressionMedian: true,
  expressionMin: false,
  expressionMax: false,
  outlierPct: true,
};

const FIELD_LABELS: Record<keyof ExportFields, string> = {
  symbol: "Gene Symbol",
  ensemblId: "Ensembl ID",
  entrezId: "Entrez ID",
  role: "Role",
  description: "Description",
  cancerRelevance: "Cancer Relevance",
  civicEvidence: "CIViC Evidence",
  dgidbInteractions: "DGIdb Interactions",
  expressionMean: "Expression Mean",
  expressionMedian: "Expression Median",
  expressionMin: "Expression Min",
  expressionMax: "Expression Max",
  outlierPct: "Outlier %",
};

function buildRow(gene: GeneAnnotation, fields: ExportFields): Record<string, string | number | boolean> {
  const row: Record<string, string | number | boolean> = {};
  if (fields.symbol) { row["Gene Symbol"] = gene.symbol; row["Resolved Symbol"] = gene.officialSymbol ?? ""; row["Row ID"] = gene.rowId ?? ""; }
  row["CIViC Status"] = gene.sourceStatus?.civic ?? "not checked";
  row["DGIdb Status"] = gene.sourceStatus?.dgidb ?? "not checked";
  row["CIViC Evidence Count"] = gene.civicEvidenceCount ?? "";
  row["DGIdb Drugs"] = (gene.dgidbDrugs ?? []).join("; ");
  if (fields.ensemblId) row["Ensembl ID"] = gene.ensemblId;
  if (fields.entrezId) row["Entrez ID"] = gene.entrezId;
  if (fields.role) row["Role"] = gene.role;
  if (fields.description) row["Description"] = gene.description;
  if (fields.cancerRelevance) row["Cancer Relevance"] = gene.cancerRelevance;
  if (fields.civicEvidence) row["CIViC Evidence"] = gene.civicEvidence;
  if (fields.dgidbInteractions) row["DGIdb Interactions"] = gene.dgidbInteractions;
  if (fields.expressionMean) row["Expression Mean"] = gene.expressionStats?.mean ?? "";
  if (fields.expressionMedian) row["Expression Median"] = gene.expressionStats?.median ?? "";
  if (fields.expressionMin) row["Expression Min"] = gene.expressionStats?.min ?? "";
  if (fields.expressionMax) row["Expression Max"] = gene.expressionStats?.max ?? "";
  if (fields.outlierPct) row["Outlier %"] = gene.expressionStats?.outlierPct ?? "";
  return row;
}

const ReportBuilder = () => {
  const { annotations, reportSelected: selected, setReportSelected: setSelected, reportSearch: search, setReportSearch: setSearch } = useGeneData();
  // Key selections by row index so duplicate symbols (rare, but possible after
  // live symbol normalization) still count as distinct rows.
  const [fields, setFields] = useState<ExportFields>(DEFAULT_FIELDS);
  const [showFields, setShowFields] = useState(false);

  const indexed = useMemo(
    () => annotations.map((gene, idx) => ({ gene, idx })),
    [annotations]
  );

  const filtered = useMemo(() => {
    if (!search) return indexed;
    const q = search.toLowerCase();
    return indexed.filter(({ gene }) => gene.symbol.toLowerCase().includes(q) || gene.description.toLowerCase().includes(q));
  }, [indexed, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(({ idx }) => selected.has(idx));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allFilteredSelected) filtered.forEach(({ idx }) => next.delete(idx));
    else filtered.forEach(({ idx }) => next.add(idx));
    setSelected(next);
  };

  const toggle = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setSelected(next);
  };

  const selectedGenes = annotations.filter((_, idx) => selected.has(idx));
  const activeFieldCount = Object.values(fields).filter(Boolean).length;

  const exportJSON = () => {
    const rows = selectedGenes.map(g => buildRow(g, fields));
    downloadFile(JSON.stringify(rows, null, 2), "gene_report.json", "application/json");
  };

  const exportCSV = () => {
    const rows = selectedGenes.map(g => buildRow(g, fields));
    downloadFile(toCSV(rows), "gene_report.csv", "text/csv");
  };

  const exportHTML = () => {
    downloadFile(buildHtmlReport(annotations), "gene_report.html", "text/html");
  };

  if (annotations.length === 0) {
    return (
      <div className="surface-card p-8 text-center animate-fade-in">
        <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Load a dataset first to build a report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Selection controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter genes..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5" />
          <span className="font-mono font-semibold text-foreground">{selected.size}</span> of {annotations.length} selected
        </div>
      </div>

      {/* Gene selection grid */}
      <div className="surface-card overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-surface-sunken">
          <Checkbox id="report-select-all" checked={allFilteredSelected} onCheckedChange={toggleAll} aria-label="Select all filtered genes" />
          <label htmlFor="report-select-all" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer">
            {allFilteredSelected ? "Deselect all" : "Select all"}
          </label>
        </div>
        <div className="max-h-[320px] overflow-y-auto divide-y divide-border">
          {filtered.map(({ gene, idx }) => (
            <label
              key={idx}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-muted/50 ${
                selected.has(idx) ? "bg-primary/5" : ""
              }`}
            >
              <Checkbox checked={selected.has(idx)} onCheckedChange={() => toggle(idx)} />
              <span className="gene-symbol text-sm">{gene.symbol}</span>
              <span className={`data-chip ${ROLE_STYLES[gene.role]}`}>{gene.role}</span>
              <span className="text-xs text-muted-foreground ml-auto hidden sm:inline line-clamp-1 max-w-[280px]">
                {gene.description.split('.')[0]}
              </span>
            </label>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">No genes match your filter.</div>
        )}
      </div>

      {/* Field selector */}
      <div className="surface-card">
        <Button variant="ghost"
          onClick={() => setShowFields(!showFields)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors"
        >
          <span>Export Fields ({activeFieldCount}/{Object.keys(fields).length})</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showFields ? "rotate-180" : ""}`} />
        </Button>
        {showFields && (
          <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {(Object.keys(fields) as (keyof ExportFields)[]).map(key => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                <Checkbox
                  checked={fields[key]}
                  onCheckedChange={(checked) => setFields(prev => ({ ...prev, [key]: !!checked }))}
                />
                <span className={fields[key] ? "text-foreground" : "text-muted-foreground"}>{FIELD_LABELS[key]}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Export buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={exportJSON} disabled={selected.size === 0 || activeFieldCount === 0} className="gap-2 flex-1">
          <FileJson className="h-4 w-4" />
          Export as JSON ({selected.size} gene{selected.size !== 1 ? "s" : ""})
        </Button>
        <Button onClick={exportCSV} disabled={selected.size === 0 || activeFieldCount === 0} variant="outline" className="gap-2 flex-1">
          <FileSpreadsheet className="h-4 w-4" />
          Export as CSV ({selected.size} gene{selected.size !== 1 ? "s" : ""})
        </Button>
      </div>

      {/* Interactive HTML report — always all genes */}
      <Button onClick={exportHTML} variant="secondary" className="gap-2 w-full">
        <Globe className="h-4 w-4" />
        Export Interactive HTML Report (all {annotations.length} genes)
      </Button>
    </div>
  );
};

export default ReportBuilder;
