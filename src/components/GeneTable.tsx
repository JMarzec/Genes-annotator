import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Search, ExternalLink, Shield, Pill, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { GeneAnnotation, GeneRole } from "@/data/sampleData";

interface GeneTableProps {
  genes: GeneAnnotation[];
}

const ROLE_STYLES: Record<GeneRole, string> = {
  Oncogene: "bg-oncogene/15 text-oncogene",
  "Tumor Suppressor": "bg-tumor-suppressor/15 text-tumor-suppressor",
  Kinase: "bg-kinase/15 text-kinase",
  "DNA Repair": "bg-dna-repair/15 text-dna-repair",
  TF: "bg-tf/15 text-tf",
  Immune: "bg-immune/15 text-immune",
  Unknown: "bg-unknown/15 text-unknown",
};

type SortKey = "symbol" | "role" | "mean" | "outlierPct";
type SortDir = "asc" | "desc";

const GeneTable = ({ genes }: GeneTableProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [roleFilter, setRoleFilter] = useState<GeneRole | "All">("All");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const roles = useMemo(() => {
    const set = new Set(genes.map(g => g.role));
    return ["All", ...Array.from(set)] as (GeneRole | "All")[];
  }, [genes]);

  const filtered = useMemo(() => {
    let result = genes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(g =>
        g.symbol.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "All") {
      result = result.filter(g => g.role === roleFilter);
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "symbol": cmp = a.symbol.localeCompare(b.symbol); break;
        case "role": cmp = a.role.localeCompare(b.role); break;
        case "mean": cmp = (a.expressionStats?.mean || 0) - (b.expressionStats?.mean || 0); break;
        case "outlierPct": cmp = (a.expressionStats?.outlierPct || 0) - (b.expressionStats?.outlierPct || 0); break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [genes, search, sortKey, sortDir, roleFilter]);

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <button
      onClick={() => toggleSort(sortKeyName)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === sortKeyName ? "text-primary" : ""}`} />
    </button>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search genes..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1 flex-wrap">
            {roles.map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`data-chip transition-colors ${
                  roleFilter === role
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-secondary"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-surface-sunken">
                <th className="text-left px-4 py-3"><SortHeader label="Gene" sortKeyName="symbol" /></th>
                <th className="text-left px-4 py-3 hidden md:table-cell">IDs</th>
                <th className="text-left px-4 py-3"><SortHeader label="Role" sortKeyName="role" /></th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Signals</th>
                <th className="text-right px-4 py-3"><SortHeader label="Mean Expr" sortKeyName="mean" /></th>
                <th className="text-right px-4 py-3 hidden sm:table-cell"><SortHeader label="Outlier %" sortKeyName="outlierPct" /></th>
                <th className="text-right px-4 py-3">Links</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((gene, i) => (
                <tr
                  key={gene.symbol}
                  className={`border-b last:border-0 hover:bg-muted/50 transition-colors ${i % 2 === 0 ? "" : "bg-surface-sunken/50"}`}
                >
                  <td className="px-4 py-3">
                    <div
                      className="cursor-pointer group"
                      onClick={() => navigate(`/gene/${gene.symbol}`)}
                    >
                      <span className="gene-symbol text-sm group-hover:underline">{gene.symbol}</span>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[240px]">{gene.description.split('.')[0]}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-xs text-muted-foreground font-mono space-y-0.5">
                      <div>{gene.ensemblId}</div>
                      <div>Entrez: {gene.entrezId}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`data-chip ${ROLE_STYLES[gene.role]}`}>
                      {gene.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-1.5">
                      {gene.civicEvidence && (
                        <span className="data-chip bg-info/15 text-info" title="CIViC evidence available">
                          <Shield className="h-3 w-3 mr-1" />CIViC
                        </span>
                      )}
                      {gene.dgidbInteractions && (
                        <span className="data-chip bg-accent/15 text-accent" title="Drug interactions found">
                          <Pill className="h-3 w-3 mr-1" />DGIdb
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {gene.expressionStats ? gene.expressionStats.mean.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs hidden sm:table-cell">
                    {gene.expressionStats ? (
                      <span className={gene.expressionStats.outlierPct > 0 ? "text-warning font-semibold" : ""}>
                        {gene.expressionStats.outlierPct}%
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <a
                        href={`https://www.genecards.org/cgi-bin/carddisp.pl?gene=${gene.symbol}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="GeneCards"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No genes match your search.
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {filtered.length} of {genes.length} genes
      </div>
    </div>
  );
};

export default GeneTable;
