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
} from "recharts";
import { BarChart3, Pill, FileSearch, Database } from "lucide-react";
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

interface Props {
  annotations: GeneAnnotation[];
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
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
};

const GeneStats = ({ annotations }: Props) => {
  const { roleData, withCivic, withDgidb, withIds, withDrugs, totalDrugs } = useMemo(() => {
    const counts = new Map<GeneRole, number>();
    ROLE_ORDER.forEach((r) => counts.set(r, 0));
    let civic = 0;
    let dgidb = 0;
    let ids = 0;
    let drugs = 0;
    let drugCount = 0;
    annotations.forEach((a) => {
      counts.set(a.role, (counts.get(a.role) ?? 0) + 1);
      if (a.civicEvidence) civic++;
      if (a.dgidbInteractions) dgidb++;
      if ((a.ensemblId && a.ensemblId !== "—") || (a.entrezId && a.entrezId !== "—")) ids++;
      const dl = a.dgidbDrugs?.length ?? 0;
      if (dl > 0) {
        drugs++;
        drugCount += dl;
      }
    });
    return {
      roleData: ROLE_ORDER
        .map((role) => ({ role, count: counts.get(role) ?? 0, fill: ROLE_COLORS[role] }))
        .filter((d) => d.count > 0),
      withCivic: civic,
      withDgidb: dgidb,
      withIds: ids,
      withDrugs: drugs,
      totalDrugs: drugCount,
    };
  }, [annotations]);

  const total = annotations.length;
  if (total === 0) return null;

  return (
    <section className="surface-card p-5 animate-fade-in" aria-labelledby="gene-stats-heading">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 id="gene-stats-heading" className="text-sm font-semibold text-foreground">
          Cohort Statistics
        </h2>
        <span className="ml-auto text-[11px] text-muted-foreground">{total} genes</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricCard icon={FileSearch} label="CIViC evidence" value={withCivic} total={total} hint="Curated clinical variants" />
        <MetricCard icon={Pill} label="DGIdb druggable" value={withDgidb} total={total} hint={totalDrugs > 0 ? `${totalDrugs} drug interactions total` : "Drug–gene interactions"} />
        <MetricCard icon={Database} label="With external IDs" value={withIds} total={total} hint="Ensembl or Entrez mapped" />
        <MetricCard icon={Pill} label="Genes with drugs" value={withDrugs} total={total} hint="≥1 DGIdb drug listed" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Genes by role
          </h3>
        </div>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roleData} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="role"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={(v: number) => [`${v} gene${v !== 1 ? "s" : ""}`, "Count"]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {roleData.map((d) => (
                  <Cell key={d.role} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};

export default GeneStats;
