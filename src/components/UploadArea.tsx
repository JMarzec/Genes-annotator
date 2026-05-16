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

  const parseGeneList = (text: string): string[] => {
    // Split by lines, commas, tabs, or semicolons; strip quotes/whitespace
    const tokens = text
      .split(/[\r\n,;\t]+/)
      .map((t) => t.trim().replace(/^["']|["']$/g, ""))
      .filter((t) => t.length > 0);
    // Filter: valid gene symbols (alphanumeric + - . _), max 20 chars, dedupe, skip common headers
    const seen = new Set<string>();
    const headers = new Set(["gene", "genes", "symbol", "gene_symbol", "genesymbol", "hgnc"]);
    const result: string[] = [];
    for (const t of tokens) {
      if (t.length > 20 || !/^[A-Za-z0-9._-]+$/.test(t)) continue;
      if (headers.has(t.toLowerCase())) continue;
      const upper = t.toUpperCase();
      if (seen.has(upper)) continue;
      seen.add(upper);
      result.push(upper);
    }
    return result;
  };

  const parseFile = useCallback((file: File) => {
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    const isJson = file.name.toLowerCase().endsWith(".json");
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (isJson) {
        try {
          const json = JSON.parse(text);
          if (!json.genes || !Array.isArray(json.genes)) {
            setError("JSON must contain a 'genes' array.");
            return;
          }
          if (!json.expressions || !Array.isArray(json.expressions)) {
            setError("JSON must contain an 'expressions' array.");
            return;
          }
          onDataLoaded(normalizeUploadedData(json));
        } catch {
          setError("Invalid JSON file. Please check the format.");
        }
      } else {
        const genes = parseGeneList(text);
        if (genes.length === 0) {
          setError("No valid gene symbols found in file.");
          return;
        }
        onDataLoaded({
          genes,
          expressions: genes.map((g) => ({ gene: g, values: {} })),
        });
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
        <label htmlFor="file-input" className="sr-only">Upload gene expression JSON or gene list (TXT/CSV) file</label>
        <input id="file-input" type="file" accept=".json,.txt,.csv,.tsv,text/plain,text/csv" className="hidden" onChange={handleFileInput} aria-label="Upload gene expression JSON or gene list file" />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-base font-medium text-foreground">
              Drop your file here or click to browse
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium">JSON</span> with expression data, or <span className="font-medium">TXT/CSV</span> with one gene symbol per line
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
