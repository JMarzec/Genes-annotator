import { useState, useCallback } from "react";
import { Upload, FileJson, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeUploadedData } from "@/data/sampleData";
import type { UploadedData } from "@/data/sampleData";

interface UploadAreaProps {
  onDataLoaded: (data: UploadedData) => void;
  onLoadDemo: () => void;
}

const UploadArea = ({ onDataLoaded, onLoadDemo }: UploadAreaProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const parseFile = useCallback((file: File) => {
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        // Validate structure
        if (!json.genes || !Array.isArray(json.genes)) {
          setError("JSON must contain a 'genes' array.");
          return;
        }
        if (!json.expressions || !Array.isArray(json.expressions)) {
          setError("JSON must contain an 'expressions' array.");
          return;
        }
        const normalized = normalizeUploadedData(json);
        onDataLoaded(normalized);
      } catch {
        setError("Invalid JSON file. Please check the format.");
      }
    };
    reader.readAsText(file);
  }, [onDataLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }, [parseFile]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div
        className={`upload-zone cursor-pointer ${dragOver ? "upload-zone-active" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input id="file-input" type="file" accept=".json" className="hidden" onChange={handleFileInput} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-base font-medium text-foreground">
              Drop your JSON file here or click to browse
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Expected: <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{"{ genes: [...], expressions: [...] }"}</code>
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {fileName && !error && (
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          <span>Loaded: <span className="font-mono">{fileName}</span></span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" className="w-full gap-2" onClick={onLoadDemo}>
        <FileJson className="h-4 w-4" />
        Load Demo Dataset (12 cancer genes, 8 samples)
      </Button>
    </div>
  );
};

export default UploadArea;
