import { useState } from 'react';
import { Upload, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { normalizeDataset, parseGeneList, sampleSetWarning } from '@/lib/ingestion';
import type { ParsedList } from '@/lib/ingestion';
import type { UploadedData } from '@/data/sampleData';
import type { ParseStats } from '@/contexts/GeneDataContext';
interface Props { onDataLoaded: (data: UploadedData, stats: ParseStats) => void; onLoadDemo: () => void }
const UploadArea = ({ onDataLoaded, onLoadDemo }: Props) => {
  const [error, setError] = useState<string | null>(null), [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState<{ text: string; name: string; parsed: ParsedList } | null>(null);
  const acceptList = (parsed: ParsedList, name: string) => {
    if (!parsed.genes.length) throw new Error('No valid gene symbols in the selected column.');
    onDataLoaded({ genes: parsed.genes, expressions: [] }, { ...parsed, parsedUnique: new Set(parsed.genes.map(g => g.toUpperCase())).size, parsedRows: parsed.genes.length, source: 'file', fileName: name, warnings: parsed.warnings, columnInfo: `${parsed.delimiter === '\t' ? 'TAB' : parsed.delimiter === '\n' ? 'Single column' : parsed.delimiter} · ${parsed.labels[parsed.column]}` });
    setPending(null);
  };
  const read = async (file: File) => {
    setError(null); setPending(null);
    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith('.json')) {
        const data = normalizeDataset(JSON.parse(text) as unknown);
        const distinct = new Set(data.genes.map(g => g.toUpperCase())).size;
        const warnings = [sampleSetWarning(data), data.genes.length > distinct ? `${data.genes.length - distinct} repeated symbols retained as separate rows.` : null].filter((v): v is string => Boolean(v));
        onDataLoaded(data, { totalRows: data.genes.length, parsedUnique: distinct, parsedRows: data.genes.length, duplicates: data.genes.length - distinct, skipped: 0, duplicateExamples: [], skippedExamples: [], source: 'file', fileName: file.name, warnings });
      } else {
        const parsed = parseGeneList(text);
        if (parsed.ambiguous) setPending({ text, name: file.name, parsed }); else acceptList(parsed, file.name);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to read this file.'); }
  };
  const updateColumn = (column: number, hasHeader: boolean) => {
    if (!pending) return;
    try { setPending({ ...pending, parsed: parseGeneList(pending.text, column, hasHeader) }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to parse column.'); }
  };
  return <div className="space-y-6 animate-fade-in">
    <div className={`upload-zone cursor-pointer ${dragOver ? 'upload-zone-active' : ''}`} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) void read(file); }}>
      <label htmlFor="file-input" className="flex flex-col items-center gap-3 cursor-pointer">
        <Upload className="h-8 w-8 text-primary" />
        <span className="text-base font-medium">Drop your file here or click to browse</span>
        <span className="text-sm text-muted-foreground">JSON expression data · TXT, CSV or TSV gene lists</span>
      </label>
      <input id="file-input" type="file" accept=".json,.txt,.csv,.tsv" className="hidden" aria-label="Upload gene expression JSON or gene list file" onChange={e => { const file = e.target.files?.[0]; if (file) void read(file); e.target.value = ''; }} />
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {pending && <section className="border rounded-lg p-4 space-y-3">
      <h2 className="font-semibold">Confirm gene column</h2>
      <Select value={String(pending.parsed.column)} onValueChange={v => updateColumn(Number(v), pending.parsed.hasHeader)}><SelectTrigger aria-label="Gene column"><SelectValue /></SelectTrigger><SelectContent>{pending.parsed.labels.map((label, i) => <SelectItem key={i} value={String(i)}>{label} (column {i + 1})</SelectItem>)}</SelectContent></Select>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={pending.parsed.hasHeader} onCheckedChange={v => updateColumn(pending.parsed.column, v === true)} />First row is a header</label>
      <p className="font-mono text-sm break-words">{pending.parsed.genes.slice(0, 12).join(', ') || 'No valid gene symbols'}</p>
      <Button onClick={() => { try { acceptList(pending.parsed, pending.name); } catch (e) { setError(e instanceof Error ? e.message : 'Invalid column'); } }}>Use this column</Button>
    </section>}
    <Button variant="outline" className="w-full gap-2" onClick={onLoadDemo}><FileJson className="h-4 w-4" />Load Demo Dataset (12 cancer genes, 8 samples)</Button>
  </div>;
};
export default UploadArea;
