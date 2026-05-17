import { FileInput, Filter, FileCheck2, Sparkles, AlertTriangle } from "lucide-react";
import type { ParseStats } from "@/contexts/GeneDataContext";
import type { GeneAnnotation } from "@/data/sampleData";

interface Props {
  stats: ParseStats;
  annotations: GeneAnnotation[];
  liveLoading: boolean;
}

const Step = ({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof FileInput;
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "warning" | "success";
}) => {
  const toneClass =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
      ? "text-success"
      : "text-primary";
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${toneClass}`} />
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold font-mono text-foreground tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{hint}</div>}
    </div>
  );
};

const ParsedReportedCounter = ({ stats, annotations, liveLoading }: Props) => {
  const annotated = annotations.filter((a) =>
    a.role !== "Unknown" ||
    a.civicEvidence ||
    a.dgidbInteractions ||
    (a.ensemblId && a.ensemblId !== "—") ||
    (a.entrezId && a.entrezId !== "—") ||
    (a.description && a.description !== "No annotation available.")
  ).length;
  const reportable = annotations.length;
  const droppedFromInput = Math.max(0, stats.totalRows - stats.parsedUnique);
  const droppedFromParsed = Math.max(0, stats.parsedUnique - reportable);
  const noAnnotation = Math.max(0, reportable - annotated);

  const reasons: string[] = [];
  if (stats.duplicates > 0) {
    reasons.push(
      `${stats.duplicates} duplicate symbol${stats.duplicates !== 1 ? "s" : ""} merged (case-insensitive)${
        stats.duplicateExamples.length ? `: ${stats.duplicateExamples.join(", ")}${stats.duplicates > stats.duplicateExamples.length ? "…" : ""}` : ""
      }`
    );
  }
  if (stats.skipped > 0) {
    reasons.push(
      `${stats.skipped} non-HGNC token${stats.skipped !== 1 ? "s" : ""} skipped${
        stats.skippedExamples.length ? `: ${stats.skippedExamples.map((s) => `"${s}"`).join(", ")}${stats.skipped > stats.skippedExamples.length ? "…" : ""}` : ""
      }`
    );
  }
  if (droppedFromParsed > 0) {
    reasons.push(`${droppedFromParsed} symbol${droppedFromParsed !== 1 ? "s" : ""} could not be normalized into reportable rows`);
  }
  if (noAnnotation > 0) {
    reasons.push(
      `${noAnnotation} reportable gene${noAnnotation !== 1 ? "s" : ""} have no curated annotation${liveLoading ? " yet (live lookup in progress)" : " from CIViC / DGIdb / MyGene.info"}`
    );
  }

  return (
    <section className="surface-card p-5 animate-fade-in" aria-labelledby="parsed-reported-heading">
      <div className="flex items-center justify-between mb-4">
        <h2 id="parsed-reported-heading" className="text-sm font-semibold text-foreground">
          Parsed vs Reported
        </h2>
        <span className="text-[11px] text-muted-foreground">
          Source: {stats.source === "demo" ? "Demo dataset" : stats.fileName ?? "Uploaded file"}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <Step icon={FileInput} label="Input rows" value={stats.totalRows} hint="Lines/items in source after header" />
        <span className="text-muted-foreground text-lg pb-2">→</span>
        <Step
          icon={Filter}
          label="Parsed (unique)"
          value={stats.parsedUnique}
          hint={
            droppedFromInput > 0
              ? `${droppedFromInput} dropped (duplicates / invalid)`
              : "All input rows passed validation"
          }
          tone={droppedFromInput > 0 ? "warning" : "default"}
        />
        <span className="text-muted-foreground text-lg pb-2">→</span>
        <Step
          icon={FileCheck2}
          label="Reportable"
          value={reportable}
          hint={droppedFromParsed > 0 ? `${droppedFromParsed} not represented in report` : "Every parsed gene is reportable"}
          tone={droppedFromParsed > 0 ? "warning" : "success"}
        />
        <span className="text-muted-foreground text-lg pb-2">→</span>
        <Step
          icon={Sparkles}
          label="With annotations"
          value={liveLoading ? `${annotated}…` : annotated}
          hint={
            liveLoading
              ? "Live CIViC + DGIdb lookup running"
              : noAnnotation > 0
              ? `${noAnnotation} gene${noAnnotation !== 1 ? "s" : ""} without any signal`
              : "All reportable genes have signals"
          }
          tone={!liveLoading && noAnnotation > 0 ? "warning" : "success"}
        />
      </div>

      {reasons.length > 0 && (
        <div className="mt-4 border-t pt-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            Why the numbers differ
          </div>
          <ul className="text-xs text-foreground space-y-1 pl-5 list-disc marker:text-muted-foreground">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default ParsedReportedCounter;
