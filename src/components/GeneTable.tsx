import { ROLE_STYLES } from "@/lib/roles";
import { useGeneData } from "@/contexts/GeneDataContext";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Search, ExternalLink, Shield, Pill, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { GeneAnnotation, GeneRole } from "@/data/sampleData";

interface GeneTableProps {
  genes: GeneAnnotation[];
}

type SortKey = "symbol" | "role" | "mean" | "outlierPct";
type SortDir = "asc" | "desc";

const GeneTable = ({ genes }: GeneTableProps) => {
  const navigate = useNavigate();
  const { tableSearch: search, setTableSearch: setSearch, tableRole: roleFilter, setTableRole: setRoleFilter, tableSort, setTableSort } = useGeneData();
  const sortKey = tableSort.key, sortDir = tableSort.direction;
  const toggleSort = (key: SortKey) => setTableSort(prev => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));

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
    <Button variant="ghost" size="sm"
      onClick={() => toggleSort(sortKeyName)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === sortKeyName ? "text-primary" : ""}`} />
    </Button>
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
              <Button variant="ghost" size="sm"
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`data-chip transition-colors ${
                  roleFilter === role
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-secondary"
                }`}
              >
                {role}
              </Button>
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
                  key={gene.rowId ?? i}
                  className={`border-b last:border-0 hover:bg-muted/50 transition-colors ${i % 2 === 0 ? "" : "bg-surface-sunken/50"}`}
                >
                  <td className="px-4 py-3">
                    <div
                      className="cursor-pointer group"
                      onClick={() => navigate(`/gene/${encodeURIComponent(gene.symbol)}?row=${encodeURIComponent(gene.rowId ?? String(i))}`)}
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
                    <div className="flex gap-1.5 flex-wrap">
                      {gene.sourceStatus?.civic === "unavailable" && <span className="text-xs text-warning">CIViC unavailable</span>}
                      {gene.sourceStatus?.dgidb === "unavailable" && <span className="text-xs text-warning">DGIdb unavailable</span>}
                      {(gene.civicEvidenceCount ?? 0) > 0 ? (
                        <a
                          href={`https://civicdb.org/links/entrez_name/${gene.symbol}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="data-chip bg-info/15 text-info hover:bg-info/25"
                          title={`${gene.civicEvidenceCount} CIViC evidence items`}
                        >
                          <Shield className="h-3 w-3 mr-1" />CIViC {gene.civicEvidenceCount}
                        </a>
                      ) : gene.civicEvidence && (
                        <span className="data-chip bg-info/15 text-info" title="CIViC evidence (curated)">
                          <Shield className="h-3 w-3 mr-1" />CIViC
                        </span>
                      )}
                      {(gene.dgidbDrugs?.length ?? 0) > 0 ? (
                        <a
                          href={`https://www.dgidb.org/genes/${gene.symbol}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="data-chip bg-accent/15 text-accent hover:bg-accent/25"
                          title={(gene.dgidbDrugs ?? []).slice(0, 10).join(", ") + ((gene.dgidbDrugs ?? []).length > 10 ? "…" : "")}
                        >
                          <Pill className="h-3 w-3 mr-1" />{(gene.dgidbDrugs ?? []).length} drugs
                        </a>
                      ) : gene.dgidbInteractions && (
                        <span className="data-chip bg-accent/15 text-accent" title="DGIdb interactions (curated)">
                          <Pill className="h-3 w-3 mr-1" />DGIdb
                        </span>
                      )}
                      {gene.liveFetched && !gene.civicEvidence && !gene.dgidbInteractions && gene.sourceStatus?.civic === "success" && gene.sourceStatus?.dgidb === "success" && (
                        <span className="text-xs text-muted-foreground">No signals</span>
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
                        title={`View ${gene.symbol} on GeneCards`}
                        aria-label={`View ${gene.symbol} on GeneCards (opens in new tab)`}
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
