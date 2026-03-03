import type { UploadedData } from "@/data/sampleData";
import { FileJson, Hash, Users } from "lucide-react";

interface SchemaPreviewProps {
  data: UploadedData;
}

const SchemaPreview = ({ data }: SchemaPreviewProps) => {
  const sampleCount = data.expressions.length > 0
    ? Object.keys(data.expressions[0].values).length
    : 0;

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
      <div className="mt-3 text-xs text-muted-foreground">
        Samples: <span className="font-mono">{data.expressions.length > 0 ? Object.keys(data.expressions[0].values).join(", ") : "—"}</span>
      </div>
    </div>
  );
};

export default SchemaPreview;
