import { useState, useMemo } from "react";
import { Check, Download, FileJson, FileSpreadsheet, Search, X, FileText, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useGeneData } from "@/contexts/GeneDataContext";
import type { GeneAnnotation } from "@/data/sampleData";

const ROLE_STYLES: Record<string, string> = {
  Oncogene: "bg-oncogene/15 text-oncogene",
  "Tumor Suppressor": "bg-tumor-suppressor/15 text-tumor-suppressor",
  Kinase: "bg-kinase/15 text-kinase",
  "DNA Repair": "bg-dna-repair/15 text-dna-repair",
  TF: "bg-tf/15 text-tf",
  Immune: "bg-immune/15 text-immune",
  Unknown: "bg-unknown/15 text-unknown",
};

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
  if (fields.symbol) row["Gene Symbol"] = gene.symbol;
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

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCSV(rows: Record<string, string | number | boolean>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(escape).join(","), ...rows.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
}

const ReportBuilder = () => {
  const { annotations } = useGeneData();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [fields, setFields] = useState<ExportFields>(DEFAULT_FIELDS);
  const [showFields, setShowFields] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return annotations;
    const q = search.toLowerCase();
    return annotations.filter(g => g.symbol.toLowerCase().includes(q) || g.description.toLowerCase().includes(q));
  }, [annotations, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(g => selected.has(g.symbol));

  const toggleAll = () => {
    if (allFilteredSelected) {
      const next = new Set(selected);
      filtered.forEach(g => next.delete(g.symbol));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach(g => next.add(g.symbol));
      setSelected(next);
    }
  };

  const toggle = (symbol: string) => {
    const next = new Set(selected);
    next.has(symbol) ? next.delete(symbol) : next.add(symbol);
    setSelected(next);
  };

  const selectedGenes = annotations.filter(g => selected.has(g.symbol));
  const activeFieldCount = Object.values(fields).filter(Boolean).length;

  const exportJSON = () => {
    const rows = selectedGenes.map(g => buildRow(g, fields));
    downloadFile(JSON.stringify(rows, null, 2), "gene_report.json", "application/json");
  };

  const exportCSV = () => {
    const rows = selectedGenes.map(g => buildRow(g, fields));
    downloadFile(toCSV(rows), "gene_report.csv", "text/csv");
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
          {filtered.map(gene => (
            <label
              key={gene.symbol}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-muted/50 ${
                selected.has(gene.symbol) ? "bg-primary/5" : ""
              }`}
            >
              <Checkbox checked={selected.has(gene.symbol)} onCheckedChange={() => toggle(gene.symbol)} />
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
        <button
          onClick={() => setShowFields(!showFields)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors"
        >
          <span>Export Fields ({activeFieldCount}/{Object.keys(fields).length})</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showFields ? "rotate-180" : ""}`} />
        </button>
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
        <Button onClick={exportJSON} disabled={selected.size === 0} className="gap-2 flex-1">
          <FileJson className="h-4 w-4" />
          Export as JSON ({selected.size} gene{selected.size !== 1 ? "s" : ""})
        </Button>
        <Button onClick={exportCSV} disabled={selected.size === 0} variant="outline" className="gap-2 flex-1">
          <FileSpreadsheet className="h-4 w-4" />
          Export as CSV ({selected.size} gene{selected.size !== 1 ? "s" : ""})
        </Button>
      </div>
    </div>
  );
};

export default ReportBuilder;
