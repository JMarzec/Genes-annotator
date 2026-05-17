import { useState, useMemo } from "react";
import { Check, Download, FileJson, FileSpreadsheet, Search, X, FileText, ChevronDown, Globe } from "lucide-react";
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

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtmlReport(genes: GeneAnnotation[]): string {
  const generated = new Date().toISOString();
  const roleColors: Record<string, string> = {
    Oncogene: "#dc2626",
    "Tumor Suppressor": "#2563eb",
    Kinase: "#7c3aed",
    "DNA Repair": "#0891b2",
    TF: "#ea580c",
    Immune: "#16a34a",
    Unknown: "#64748b",
  };
  const cards = genes.map((g) => {
    const drugs = (g.dgidbDrugs ?? []).slice(0, 30);
    const stats = g.expressionStats;
    const links: Array<[string, string]> = [
      ["NCBI", g.entrezId && g.entrezId !== "—" ? `https://www.ncbi.nlm.nih.gov/gene/${g.entrezId}` : `https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(g.symbol)}`],
      ["Ensembl", g.ensemblId && g.ensemblId !== "—" ? `https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${g.ensemblId}` : `https://www.ensembl.org/Multi/Search/Results?q=${encodeURIComponent(g.symbol)}`],
      ["CIViC", `https://civicdb.org/search/genes/${encodeURIComponent(g.symbol)}`],
      ["DGIdb", `https://www.dgidb.org/results?searchType=gene&searchTerms=${encodeURIComponent(g.symbol)}`],
      ["GeneCards", `https://www.genecards.org/cgi-bin/carddisp.pl?gene=${encodeURIComponent(g.symbol)}`],
      ["UniProt", `https://www.uniprot.org/uniprotkb?query=gene:${encodeURIComponent(g.symbol)}+AND+organism_id:9606`],
      ["OMIM", `https://www.omim.org/search?search=${encodeURIComponent(g.symbol)}`],
      ["COSMIC", `https://cancer.sanger.ac.uk/cosmic/gene/analysis?ln=${encodeURIComponent(g.symbol)}`],
      ["cBioPortal", `https://www.cbioportal.org/results/cancerTypesSummary?gene_list=${encodeURIComponent(g.symbol)}`],
    ];
    return `
    <article class="card" data-symbol="${escapeHtml(g.symbol)}" data-role="${escapeHtml(g.role)}">
      <header>
        <h2>${escapeHtml(g.symbol)}</h2>
        <span class="chip" style="background:${roleColors[g.role] || "#64748b"}1a;color:${roleColors[g.role] || "#64748b"}">${escapeHtml(g.role)}</span>
        ${g.civicEvidence ? `<span class="chip civic">CIViC${g.civicEvidenceCount ? ` · ${g.civicEvidenceCount}` : ""}</span>` : ""}
        ${g.dgidbInteractions ? `<span class="chip dgidb">DGIdb${drugs.length ? ` · ${drugs.length}` : ""}</span>` : ""}
      </header>
      <dl class="ids">
        <div><dt>Ensembl</dt><dd>${escapeHtml(g.ensemblId)}</dd></div>
        <div><dt>Entrez</dt><dd>${escapeHtml(g.entrezId)}</dd></div>
      </dl>
      <p class="desc">${escapeHtml(g.description)}</p>
      <p class="rel"><strong>Cancer relevance:</strong> ${escapeHtml(g.cancerRelevance)}</p>
      ${stats ? `<div class="stats">
        <span>mean <b>${stats.mean}</b></span>
        <span>median <b>${stats.median}</b></span>
        <span>min <b>${stats.min}</b></span>
        <span>max <b>${stats.max}</b></span>
        <span>outliers <b>${stats.outlierPct}%</b></span>
      </div>` : ""}
      ${drugs.length ? `<div class="drugs"><strong>DGIdb drugs:</strong> ${drugs.map(d => `<span class="drug">${escapeHtml(d)}</span>`).join("")}</div>` : ""}
      <nav class="links">
        ${links.map(([label, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`).join("")}
      </nav>
    </article>`;
  }).join("");

  const roles = Array.from(new Set(genes.map(g => g.role))).sort();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>OncoGene Annotator Report — ${genes.length} genes</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { font: 14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; margin:0; background:#f8fafc; color:#0f172a; }
  header.top { position:sticky; top:0; z-index:10; background:#0f172a; color:#f8fafc; padding:16px 24px; box-shadow:0 1px 3px rgba(0,0,0,.1); }
  header.top h1 { margin:0 0 4px; font-size:18px; }
  header.top .meta { font-size:12px; opacity:.7; }
  .controls { padding:16px 24px; background:#fff; border-bottom:1px solid #e2e8f0; display:flex; flex-wrap:wrap; gap:12px; align-items:center; position:sticky; top:64px; z-index:9; }
  .controls input, .controls select { padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font:inherit; }
  .controls input { flex:1; min-width:200px; }
  .count { font-size:12px; color:#64748b; margin-left:auto; }
  main { padding:24px; max-width:1400px; margin:0 auto; display:grid; grid-template-columns:repeat(auto-fill,minmax(360px,1fr)); gap:16px; }
  .card { background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:16px; display:flex; flex-direction:column; gap:10px; }
  .card header { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
  .card h2 { margin:0; font-size:18px; font-family:ui-monospace,Menlo,monospace; }
  .chip { font-size:11px; padding:2px 8px; border-radius:999px; font-weight:600; }
  .chip.civic { background:#dbeafe; color:#1e40af; }
  .chip.dgidb { background:#dcfce7; color:#166534; }
  .ids { display:flex; gap:16px; margin:0; font-size:11px; color:#64748b; }
  .ids dt { display:inline; font-weight:600; margin-right:4px; }
  .ids dd { display:inline; margin:0; font-family:ui-monospace,Menlo,monospace; }
  .desc, .rel { margin:0; font-size:13px; color:#334155; }
  .stats { display:flex; flex-wrap:wrap; gap:10px; font-size:11px; color:#64748b; padding:8px; background:#f1f5f9; border-radius:6px; }
  .stats b { color:#0f172a; }
  .drugs { font-size:12px; }
  .drug { display:inline-block; background:#f1f5f9; padding:1px 6px; border-radius:4px; margin:2px; font-size:11px; }
  .links { display:flex; flex-wrap:wrap; gap:6px; margin-top:auto; padding-top:8px; border-top:1px solid #f1f5f9; }
  .links a { font-size:11px; padding:3px 8px; background:#0f172a; color:#f8fafc; border-radius:4px; text-decoration:none; }
  .links a:hover { background:#334155; }
  .hidden { display:none !important; }
  footer { text-align:center; padding:24px; font-size:11px; color:#64748b; }
</style>
</head>
<body>
<header class="top">
  <h1>OncoGene Annotator — Interactive Report</h1>
  <div class="meta">${genes.length} genes · Generated ${generated} · Research use only</div>
</header>
<div class="controls">
  <input id="q" type="search" placeholder="Filter by symbol or description…" />
  <select id="role">
    <option value="">All roles</option>
    ${roles.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("")}
  </select>
  <label style="font-size:12px;display:flex;align-items:center;gap:6px;"><input type="checkbox" id="civicOnly" /> CIViC only</label>
  <label style="font-size:12px;display:flex;align-items:center;gap:6px;"><input type="checkbox" id="dgidbOnly" /> DGIdb only</label>
  <span class="count" id="count"></span>
</div>
<main id="grid">${cards}</main>
<footer>Powered by AccelBio · CIViC + DGIdb + MyGene.info</footer>
<script>
  const q = document.getElementById('q');
  const role = document.getElementById('role');
  const civicOnly = document.getElementById('civicOnly');
  const dgidbOnly = document.getElementById('dgidbOnly');
  const count = document.getElementById('count');
  const cards = Array.from(document.querySelectorAll('.card'));
  function apply() {
    const term = q.value.trim().toLowerCase();
    const r = role.value;
    const co = civicOnly.checked;
    const dgo = dgidbOnly.checked;
    let visible = 0;
    cards.forEach(c => {
      const text = c.textContent.toLowerCase();
      const matchText = !term || text.includes(term);
      const matchRole = !r || c.dataset.role === r;
      const matchCivic = !co || c.querySelector('.chip.civic');
      const matchDg = !dgo || c.querySelector('.chip.dgidb');
      const show = matchText && matchRole && matchCivic && matchDg;
      c.classList.toggle('hidden', !show);
      if (show) visible++;
    });
    count.textContent = visible + ' / ' + cards.length + ' shown';
  }
  [q, role, civicOnly, dgidbOnly].forEach(el => el.addEventListener('input', apply));
  apply();
</script>
</body>
</html>`;
}

const ReportBuilder = () => {
  const { annotations } = useGeneData();
  // Key selections by row index so duplicate symbols (rare, but possible after
  // live symbol normalization) still count as distinct rows.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
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
    next.has(idx) ? next.delete(idx) : next.add(idx);
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

      {/* Interactive HTML report — always all genes */}
      <Button onClick={exportHTML} variant="secondary" className="gap-2 w-full">
        <Globe className="h-4 w-4" />
        Export Interactive HTML Report (all {annotations.length} genes)
      </Button>
    </div>
  );
};

export default ReportBuilder;
