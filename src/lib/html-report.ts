import type { GeneAnnotation } from "@/data/sampleData";
import { ROLE_COLORS } from "@/lib/roles";
function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildHtmlReport(genes: GeneAnnotation[]): string {
  const generated = new Date().toISOString();
  const roleColors = ROLE_COLORS;
  const cards = genes.map((g) => {
    const drugs = g.dgidbDrugs ?? [];
    const stats = g.expressionStats;
    const links: Array<[string, string]> = [
      ["NCBI", g.entrezId && g.entrezId !== "—" ? `https://www.ncbi.nlm.nih.gov/gene/${g.entrezId}` : `https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(g.officialSymbol ?? g.symbol)}`],
      ["Ensembl", g.ensemblId && g.ensemblId !== "—" ? `https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${g.ensemblId}` : `https://www.ensembl.org/Multi/Search/Results?q=${encodeURIComponent(g.officialSymbol ?? g.symbol)}`],
      ["CIViC", `https://civicdb.org/search/genes/${encodeURIComponent(g.officialSymbol ?? g.symbol)}`],
      ["DGIdb", `https://www.dgidb.org/results?searchType=gene&searchTerms=${encodeURIComponent(g.officialSymbol ?? g.symbol)}`],
      ["GeneCards", `https://www.genecards.org/cgi-bin/carddisp.pl?gene=${encodeURIComponent(g.officialSymbol ?? g.symbol)}`],
      ["UniProt", `https://www.uniprot.org/uniprotkb?query=gene:${encodeURIComponent(g.officialSymbol ?? g.symbol)}+AND+organism_id:9606`],
      ["OMIM", `https://www.omim.org/search?search=${encodeURIComponent(g.officialSymbol ?? g.symbol)}`],
      ["COSMIC", `https://cancer.sanger.ac.uk/cosmic/gene/analysis?ln=${encodeURIComponent(g.officialSymbol ?? g.symbol)}`],
      ["cBioPortal", `https://www.cbioportal.org/results/cancerTypesSummary?gene_list=${encodeURIComponent(g.officialSymbol ?? g.symbol)}`],
    ];
    return `
    <article class="card" data-symbol="${escapeHtml(g.symbol)}" data-role="${escapeHtml(g.role)}">
      <header>
        <h2>${escapeHtml(g.symbol)}</h2>
        <span class="chip" style="background:${roleColors[g.role]};color:var(--card-foreground)">${escapeHtml(g.role)}</span>
        ${g.civicEvidence ? `<span class="chip civic">CIViC${g.civicEvidenceCount ? ` · ${g.civicEvidenceCount}` : ""}</span>` : ""}
        ${g.dgidbInteractions ? `<span class="chip dgidb">DGIdb${drugs.length ? ` · ${drugs.length}` : ""}</span>` : ""}
      </header>
      <dl class="ids">
        <div><dt>Ensembl</dt><dd>${escapeHtml(g.ensemblId)}</dd></div>
        <div><dt>Entrez</dt><dd>${escapeHtml(g.entrezId)}</dd></div>
      </dl>
      ${g.officialSymbol ? `<p class="rel">Resolved symbol: ${escapeHtml(g.officialSymbol)}</p>` : ""}
      ${g.resolution === "ambiguous" ? `<p class="rel">Ambiguous alias — not resolved</p>` : ""}
      <p class="rel">CIViC: ${g.sourceStatus?.civic === "unavailable" ? "unavailable" : g.civicEvidenceCount ?? "not checked"} · DGIdb: ${g.sourceStatus?.dgidb === "unavailable" ? "unavailable" : g.dgidbDrugs?.length ?? "not checked"}</p>
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
  :root { color-scheme: light;     --background: 210 20% 98%;
    --foreground: 215 25% 15%;

    --card: 0 0% 100%;
    --card-foreground: 215 25% 15%;

    --popover: 0 0% 100%;
    --popover-foreground: 215 25% 15%;

    --primary: 199 89% 32%;
    --primary-foreground: 0 0% 100%;

    --secondary: 210 18% 93%;
    --secondary-foreground: 215 25% 15%;

    --muted: 210 14% 95%;
    --muted-foreground: 215 16% 38%;

    --accent: 173 58% 39%;
    --accent-foreground: 0 0% 100%;

    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;

    --border: 214 20% 88%;
    --input: 214 20% 88%;
    --ring: 199 89% 32%;

    --radius: 0.5rem;

    /* Custom tokens */
    --oncogene: 0 72% 55%;
    --tumor-suppressor: 220 70% 55%;
    --kinase: 280 60% 55%;
    --dna-repair: 45 85% 50%;
    --immune: 160 60% 42%;
    --tf: 310 55% 50%;
    --unknown: 215 10% 65%;

    --success: 152 60% 40%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;
    --info: 199 89% 48%;
    --info-foreground: 0 0% 100%;

    --surface-elevated: 0 0% 100%;
    --surface-sunken: 210 20% 96%;

    --sidebar-background: 215 25% 12%;
    --sidebar-foreground: 210 14% 85%;
    --sidebar-primary: 199 89% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 215 20% 18%;
    --sidebar-accent-foreground: 210 14% 85%;
    --sidebar-border: 215 18% 22%;
    --sidebar-ring: 199 89% 48%;

    --font-sans: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
    --font-mono: 'IBM Plex Mono', 'SF Mono', 'Fira Code', monospace;
   }
  * { box-sizing: border-box; }
  body { font: 14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; margin:0; background:hsl(var(--background)); color:hsl(var(--foreground)); }
  header.top { position:sticky; top:0; z-index:10; background:hsl(var(--foreground)); color:hsl(var(--background)); padding:16px 24px; box-shadow:0 1px 3px hsl(var(--foreground) / .1); }
  header.top h1 { margin:0 0 4px; font-size:18px; }
  header.top .meta { font-size:12px; opacity:.7; }
  .controls { padding:16px 24px; background:hsl(var(--card)); border-bottom:1px solid hsl(var(--border)); display:flex; flex-wrap:wrap; gap:12px; align-items:center; position:sticky; top:64px; z-index:9; }
  .controls input, .controls select { padding:8px 12px; border:1px solid hsl(var(--border)); border-radius:6px; font:inherit; }
  .controls input { flex:1; min-width:200px; }
  .count { font-size:12px; color:hsl(var(--muted-foreground)); margin-left:auto; }
  main { padding:24px; max-width:1400px; margin:0 auto; display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr)); gap:16px; }
  .card { background:hsl(var(--card)); border:1px solid hsl(var(--border)); border-radius:8px; padding:16px; display:flex; flex-direction:column; gap:10px; }
  .card header { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
  .card h2 { margin:0; font-size:18px; font-family:ui-monospace,Menlo,monospace; }
  .chip { font-size:11px; padding:2px 8px; border-radius:999px; font-weight:600; }
  .chip.civic { background:hsl(var(--info) / .15); color:hsl(var(--info)); }
  .chip.dgidb { background:hsl(var(--accent) / .15); color:hsl(var(--accent)); }
  .ids { display:flex; gap:16px; margin:0; font-size:11px; color:hsl(var(--muted-foreground)); }
  .ids dt { display:inline; font-weight:600; margin-right:4px; }
  .ids dd { display:inline; margin:0; font-family:ui-monospace,Menlo,monospace; }
  .desc, .rel { margin:0; font-size:13px; color:hsl(var(--muted-foreground)); }
  .stats { display:flex; flex-wrap:wrap; gap:10px; font-size:11px; color:hsl(var(--muted-foreground)); padding:8px; background:hsl(var(--surface-sunken)); border-radius:6px; }
  .stats b { color:hsl(var(--foreground)); }
  .drugs { font-size:12px; }
  .drug { display:inline-block; background:hsl(var(--surface-sunken)); padding:1px 6px; border-radius:4px; margin:2px; font-size:11px; }
  .links { display:flex; flex-wrap:wrap; gap:6px; margin-top:auto; padding-top:8px; border-top:1px solid hsl(var(--surface-sunken)); }
  .links a { font-size:11px; padding:3px 8px; background:hsl(var(--foreground)); color:hsl(var(--background)); border-radius:4px; text-decoration:none; }
  .links a:hover { background:hsl(var(--muted-foreground)); }
  .hidden { display:none !important; }
  footer { text-align:center; padding:24px; font-size:11px; color:hsl(var(--muted-foreground)); }
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
<footer>Powered by <a href="https://accelbio.pt/" target="_blank" rel="noopener noreferrer">AccelBio</a> · CIViC + DGIdb + MyGene.info</footer>
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

