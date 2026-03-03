import type { UploadedData } from "@/data/sampleData";
import { FileJson, Hash, Users } from "lucide-react";

interface SchemaPreviewProps {
  data: UploadedData;
}

const SchemaPreview = ({ data }: SchemaPreviewProps) => {
  const firstExpr = data.expressions?.[0];
  const sampleKeys = firstExpr?.values ? Object.keys(firstExpr.values) : [];
  const sampleCount = sampleKeys.length;

  return (
    <div className="surface-card p-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <FileJson className="h-4 w-4 text-primary" />
        Schema Summary
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-sunken rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-primary font-mono">{data.genes.length}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Hash className="h-3 w-3" /> Genes
          </div>
        </div>
        <div className="bg-surface-sunken rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-accent font-mono">{sampleCount}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Users className="h-3 w-3" /> Samples
          </div>
        </div>
        <div className="bg-surface-sunken rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-foreground font-mono">{data.expressions.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Expression rows</div>
        </div>
      </div>
      {sampleKeys.length > 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          <span>Samples: </span>
          {sampleKeys.length <= 10 ? (
            <span className="font-mono">{sampleKeys.join(", ")}</span>
          ) : (
            <details className="inline">
              <summary className="cursor-pointer text-primary hover:underline inline">
                {sampleKeys.length} samples — click to expand
              </summary>
              <span className="font-mono block mt-1 max-h-32 overflow-y-auto text-[11px] leading-relaxed">
                {sampleKeys.join(", ")}
              </span>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default SchemaPreview;
