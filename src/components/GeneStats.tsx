import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
} from "recharts";
import { BarChart3, Pill, FileSearch, Database, Download, FileJson, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GeneAnnotation, GeneRole } from "@/data/sampleData";

const ROLE_COLORS: Record<GeneRole, string> = {
  Oncogene: "hsl(var(--oncogene))",
  "Tumor Suppressor": "hsl(var(--tumor-suppressor))",
  Kinase: "hsl(var(--kinase))",
  "DNA Repair": "hsl(var(--dna-repair))",
  TF: "hsl(var(--tf))",
  Immune: "hsl(var(--immune))",
  Unknown: "hsl(var(--unknown))",
};

const ROLE_ORDER: GeneRole[] = [
  "Oncogene",
  "Tumor Suppressor",
  "Kinase",
  "DNA Repair",
  "TF",
  "Immune",
  "Unknown",
];

const COVERAGE_COLORS: Record<string, string> = {
  Both: "hsl(var(--primary))",
  "CIViC only": "hsl(var(--info))",
  "DGIdb only": "hsl(var(--success))",
  Neither: "hsl(var(--unknown))",
};

interface Props {
  annotations: GeneAnnotation[];
  selectedRoles: GeneRole[];
  onToggleRole: (role: GeneRole) => void;
  onClearRoles: () => void;
}

const MetricCard = ({
  icon: Icon,
  label,
  value,
  total,
  hint,
}: {
  icon: typeof Pill;
  label: string;
  value: number;
  total: number;
  hint?: string;
}) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="surface-card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono tabular-nums text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">/ {total} ({pct}%)</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} aria-hidden />
      </div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
};

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 6,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
};

function toCSV(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const GeneStats = ({ annotations, selectedRoles, onToggleRole, onClearRoles }: Props) => {
  const stats = useMemo(() => {
    const counts = new Map<GeneRole, number>();
    ROLE_ORDER.forEach((r) => counts.set(r, 0));
    const roleByCivic = new Map<GeneRole, { withCivic: number; withoutCivic: number }>();
    ROLE_ORDER.forEach((r) => roleByCivic.set(r, { withCivic: 0, withoutCivic: 0 }));
    let civic = 0;
    let dgidb = 0;
    let both = 0;
    let civicOnly = 0;
    let dgidbOnly = 0;
    let neither = 0;
    let ids = 0;
    let drugs = 0;
    let drugCount = 0;
    annotations.forEach((a) => {
      counts.set(a.role, (counts.get(a.role) ?? 0) + 1);
      const bucket = roleByCivic.get(a.role)!;
      if (a.civicEvidence) bucket.withCivic++;
      else bucket.withoutCivic++;
      if (a.civicEvidence) civic++;
      if (a.dgidbInteractions) dgidb++;
      if (a.civicEvidence && a.dgidbInteractions) both++;
      else if (a.civicEvidence) civicOnly++;
      else if (a.dgidbInteractions) dgidbOnly++;
      else neither++;
      if ((a.ensemblId && a.ensemblId !== "—") || (a.entrezId && a.entrezId !== "—")) ids++;
      const dl = a.dgidbDrugs?.length ?? 0;
      if (dl > 0) {
        drugs++;
        drugCount += dl;
      }
    });

    const roleData = ROLE_ORDER.map((role) => ({
      role,
      count: counts.get(role) ?? 0,
      withCivic: roleByCivic.get(role)!.withCivic,
      withoutCivic: roleByCivic.get(role)!.withoutCivic,
      fill: ROLE_COLORS[role],
    })).filter((d) => d.count > 0);

    const coverageData = [
      { name: "Both", value: both },
      { name: "CIViC only", value: civicOnly },
      { name: "DGIdb only", value: dgidbOnly },
      { name: "Neither", value: neither },
    ];

    const overlapData = [
      { category: "CIViC only", value: civicOnly, fill: COVERAGE_COLORS["CIViC only"] },
      { category: "Both", value: both, fill: COVERAGE_COLORS.Both },
      { category: "DGIdb only", value: dgidbOnly, fill: COVERAGE_COLORS["DGIdb only"] },
      { category: "Neither", value: neither, fill: COVERAGE_COLORS.Neither },
    ];

    return { roleData, coverageData, overlapData, civic, dgidb, both, civicOnly, dgidbOnly, neither, ids, drugs, drugCount };
  }, [annotations]);

  const total = annotations.length;
  if (total === 0) return null;

  const exportCSV = () => {
    const sections: string[] = [];
    sections.push("# Summary metrics");
    sections.push(toCSV([
      { metric: "Total genes", value: total },
      { metric: "With CIViC evidence", value: stats.civic },
      { metric: "With DGIdb interactions", value: stats.dgidb },
      { metric: "With external IDs (Ensembl/Entrez)", value: stats.ids },
      { metric: "Genes with ≥1 drug", value: stats.drugs },
      { metric: "Total drug interactions", value: stats.drugCount },
    ]));
    sections.push("\n# Genes by role (with CIViC breakdown)");
    sections.push(toCSV(stats.roleData.map((r) => ({
      role: r.role, total: r.count, with_civic: r.withCivic, without_civic: r.withoutCivic,
    }))));
    sections.push("\n# Annotation coverage overlap");
    sections.push(toCSV(stats.coverageData.map((c) => ({ category: c.name, gene_count: c.value }))));
    download(sections.join("\n"), "cohort_stats.csv", "text/csv");
  };

  const exportJSON = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      totalGenes: total,
      summary: {
        withCivic: stats.civic,
        withDgidb: stats.dgidb,
        withExternalIds: stats.ids,
        genesWithDrugs: stats.drugs,
        totalDrugInteractions: stats.drugCount,
      },
      byRole: stats.roleData.map((r) => ({
        role: r.role, total: r.count, withCivic: r.withCivic, withoutCivic: r.withoutCivic,
      })),
      coverage: stats.coverageData.map((c) => ({ category: c.name, geneCount: c.value })),
    };
    download(JSON.stringify(payload, null, 2), "cohort_stats.json", "application/json");
  };

  return (
    <section className="surface-card p-5 animate-fade-in space-y-6" aria-labelledby="gene-stats-heading">
      <div className="flex items-center gap-2 flex-wrap">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 id="gene-stats-heading" className="text-sm font-semibold text-foreground">
          Cohort Statistics
        </h2>
        <span className="text-[11px] text-muted-foreground">{total} genes</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={exportJSON}>
            <FileJson className="h-3.5 w-3.5" /> JSON
          </Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={FileSearch} label="CIViC evidence" value={stats.civic} total={total} hint="Curated clinical variants" />
        <MetricCard icon={Pill} label="DGIdb druggable" value={stats.dgidb} total={total} hint={stats.drugCount > 0 ? `${stats.drugCount} drug interactions total` : "Drug–gene interactions"} />
        <MetricCard icon={Database} label="With external IDs" value={stats.ids} total={total} hint="Ensembl or Entrez mapped" />
        <MetricCard icon={Pill} label="Genes with drugs" value={stats.drugs} total={total} hint="≥1 DGIdb drug listed" />
      </div>

      {/* Role filter chips */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filter table by role
          </h3>
          {selectedRoles.length > 0 && (
            <button
              onClick={onClearRoles}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear ({selectedRoles.length})
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {stats.roleData.map((r) => {
            const active = selectedRoles.includes(r.role);
            return (
              <button
                key={r.role}
                onClick={() => onToggleRole(r.role)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                  active
                    ? "border-transparent text-white shadow-sm"
                    : "border-border text-foreground hover:bg-muted"
                }`}
                style={active ? { background: r.fill } : { borderColor: r.fill + "55" }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: r.fill }}
                  aria-hidden
                />
                {r.role}
                <span className={`font-mono tabular-nums ${active ? "opacity-90" : "text-muted-foreground"}`}>
                  {r.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Stacked: role × CIViC */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Genes by role — CIViC present vs absent
          </h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.roleData} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="role" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.3)" }} contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="withCivic" stackId="r" name="CIViC present" fill="hsl(var(--info))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="withoutCivic" stackId="r" name="CIViC absent" fill="hsl(var(--unknown))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overlap categories bar */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            CIViC × DGIdb overlap
          </h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.overlapData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.3)" }} contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v} gene${v !== 1 ? "s" : ""}`, "Count"]} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {stats.overlapData.map((d) => <Cell key={d.category} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut: annotation coverage */}
        <div className="lg:col-span-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Annotation coverage
          </h3>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n) => [`${v} gene${v !== 1 ? "s" : ""} (${Math.round((v / total) * 100)}%)`, n as string]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Pie
                  data={stats.coverageData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  label={(e: { name: string; value: number }) => e.value > 0 ? `${e.name}: ${e.value}` : ""}
                  labelLine={false}
                >
                  {stats.coverageData.map((c) => (
                    <Cell key={c.name} fill={COVERAGE_COLORS[c.name]} stroke="hsl(var(--background))" strokeWidth={2} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GeneStats;
