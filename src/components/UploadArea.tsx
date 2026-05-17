import { useState, useCallback } from "react";
import { Upload, FileJson, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeUploadedData } from "@/data/sampleData";
import type { UploadedData } from "@/data/sampleData";

interface UploadAreaProps {
  onDataLoaded: (data: UploadedData) => void;
  onLoadDemo: () => void;
}

interface ParseResult {
  genes: string[];
  warnings: string[];
  info: string[];
}

const HEADER_LABELS = ["gene", "genes", "symbol", "gene_symbol", "genesymbol", "hgnc", "hgnc_symbol", "gene_name"];
const SYMBOL_RE = /^[A-Za-z0-9._-]+$/;

const isValidSymbol = (t: string) => !!t && t.length <= 20 && SYMBOL_RE.test(t);

const parseGeneList = (text: string): ParseResult => {
  const warnings: string[] = [];
  const info: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return { genes: [], warnings: ["File is empty."], info };

  const sample = lines.slice(0, Math.min(5, lines.length)).join("\n");
  const counts: Record<string, number> = {
    "\t": (sample.match(/\t/g) || []).length,
    ",": (sample.match(/,/g) || []).length,
    ";": (sample.match(/;/g) || []).length,
  };
  let delim: string | null = null;
  if (counts["\t"] > 0) delim = "\t";
  else if (counts[","] > 0) delim = ",";
  else if (counts[";"] > 0) delim = ";";

  let geneCol = 0;
  let startIdx = 0;
  let detectedBy = "single column";

  if (delim) {
    const headerCells = lines[0].split(delim).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const headerLower = headerCells.map((c) => c.toLowerCase());
    const headerHit = headerLower.findIndex((c) => HEADER_LABELS.includes(c));
    const looksLikeHeader = headerHit >= 0 || headerLower.every((c) => !isValidSymbol(c));

    if (headerHit >= 0) {
      geneCol = headerHit;
      startIdx = 1;
      detectedBy = `header "${headerCells[headerHit]}" (column ${headerHit + 1})`;
    } else {
      const dataLines = looksLikeHeader ? lines.slice(1) : lines;
      const colCount = lines[0].split(delim).length;
      let bestCol = 0;
      let bestScore = -1;
      for (let c = 0; c < colCount; c++) {
        const valid = dataLines.filter((l) =>
          isValidSymbol((l.split(delim!)[c] ?? "").trim().replace(/^["']|["']$/g, ""))
        ).length;
        if (valid > bestScore) { bestScore = valid; bestCol = c; }
      }
      geneCol = bestCol;
      startIdx = looksLikeHeader ? 1 : 0;
      detectedBy = `auto-detected column ${bestCol + 1} (no recognized header)`;
      if (!looksLikeHeader) warnings.push("No header row detected — first row treated as data.");
    }

    info.push(
      `Delimiter: ${delim === "\t" ? "TAB" : delim === "," ? "comma" : "semicolon"}. Gene column: ${detectedBy}.`
    );

    const colCount = lines[0].split(delim).length;
    if (colCount > 1) {
      const dataLines = lines.slice(startIdx);
      const scores = Array.from({ length: colCount }, (_, c) =>
        dataLines.filter((l) =>
          isValidSymbol((l.split(delim!)[c] ?? "").trim().replace(/^["']|["']$/g, ""))
        ).length
      );
      const max = Math.max(...scores);
      const bestCols = scores.map((s, i) => (s === max ? i : -1)).filter((i) => i >= 0);
      if (max > scores[geneCol] && bestCols.length === 1) {
        warnings.push(
          `Column ${bestCols[0] + 1} has more gene-like values (${max}) than the selected column ${geneCol + 1} (${scores[geneCol]}). Wrong header label?`
        );
      }
    }
  } else {
    info.push("Delimiter: none (treating each line as a single gene symbol).");
  }

  const seen = new Set<string>();
  const genes: string[] = [];
  let skipped = 0;
  let duplicates = 0;
  const skippedExamples: string[] = [];
  const duplicateExamples: string[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const raw = delim ? (lines[i].split(delim)[geneCol] ?? "") : lines[i];
    const t = raw.trim().replace(/^["']|["']$/g, "");
    if (!isValidSymbol(t)) {
      skipped++;
      if (t && skippedExamples.length < 3) skippedExamples.push(t);
      continue;
    }
    const upper = t.toUpperCase();
    if (seen.has(upper)) {
      duplicates++;
      if (duplicateExamples.length < 3) duplicateExamples.push(upper);
      continue;
    }
    seen.add(upper);
    genes.push(upper);
  }
  const totalRows = lines.length - startIdx;
  info.push(`Parsed ${genes.length} unique gene symbol${genes.length !== 1 ? "s" : ""} from ${totalRows} data row${totalRows !== 1 ? "s" : ""}.`);
  if (duplicates > 0) {
    warnings.push(
      `${duplicates} duplicate symbol${duplicates !== 1 ? "s" : ""} merged (case-insensitive)${duplicateExamples.length ? `: ${duplicateExamples.join(", ")}${duplicates > duplicateExamples.length ? "…" : ""}` : ""}.`
    );
  }
  if (skipped > 0) {
    warnings.push(
      `${skipped} row${skipped !== 1 ? "s" : ""} skipped as non-HGNC tokens${skippedExamples.length ? `: ${skippedExamples.map(s => `"${s}"`).join(", ")}${skipped > skippedExamples.length ? "…" : ""}` : ""}.`
    );
  }

  if (genes.length === 0) {
    warnings.push("No valid gene symbols found. Check delimiter and column selection.");
  }

  return { genes, warnings, info };
};

const UploadArea = ({ onDataLoaded, onLoadDemo }: UploadAreaProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [info, setInfo] = useState<string[]>([]);

  const parseFile = useCallback((file: File) => {
    setError(null);
    setWarnings([]);
    setInfo([]);
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
        const result = parseGeneList(text);
        setInfo(result.info);
        setWarnings(result.warnings);
        if (result.genes.length === 0) {
          setError("No valid gene symbols found in file.");
          return;
        }
        onDataLoaded({
          genes: result.genes,
          expressions: result.genes.map((g) => ({ gene: g, values: {} })),
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

      {info.length > 0 && !error && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-xs text-foreground space-y-1">
          {info.map((m, i) => <div key={i}>{m}</div>)}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-warning/10 border border-warning/40 rounded-lg px-4 py-3 text-xs text-foreground space-y-1.5">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-warning" />
              <span>{w}</span>
            </div>
          ))}
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
