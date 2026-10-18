import Papa from 'papaparse';
import type { UploadedData, GeneExpression } from '@/data/sampleData';

export const HEADER_LABELS = ['gene', 'genes', 'symbol', 'gene_symbol', 'genesymbol', 'hgnc', 'hgnc_symbol', 'gene_name'];
export const validGeneToken = (value: unknown): value is string => typeof value === 'string' && /^(?=.*[A-Za-z])[A-Za-z0-9._-]{1,40}$/.test(value.trim());
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function normalizeDataset(raw: unknown): UploadedData {
  if (!record(raw) || !Array.isArray(raw.genes) || !Array.isArray(raw.expressions)) throw new Error("JSON must contain 'genes' and 'expressions' arrays.");
  const genes = raw.genes.map((g, i) => {
    if (!validGeneToken(g)) throw new Error(`Invalid gene symbol at row ${i + 1}.`);
    return g.trim();
  });
  if (!genes.length) throw new Error('The gene list is empty.');
  const expressions: GeneExpression[] = raw.expressions.map((e, i) => {
    if (!record(e) || !validGeneToken(e.gene)) throw new Error(`Invalid expression row ${i + 1}.`);
    const gene = e.gene.trim();
    if (!genes.includes(gene)) throw new Error(`Expression gene ${gene} is not in the gene list.`);
    const values: Record<string, number> = {};
    const add = (sample: string, value: unknown) => {
      if (!sample.trim()) throw new Error(`Missing sample name for ${gene}.`);
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid measurement for ${gene}, sample ${sample}: a finite number is required.`);
      if (Object.hasOwn(values, sample)) throw new Error(`Duplicate sample ${sample} for ${gene}.`);
      Object.defineProperty(values, sample, { value, enumerable: true, configurable: true, writable: true });
    };
    if (record(e.values)) Object.entries(e.values).forEach(([sample, value]) => add(sample, value));
    else if (Array.isArray(e.samples)) e.samples.forEach(s => {
      if (!record(s) || typeof s.sampleId !== 'string') throw new Error(`Invalid sample for ${gene}.`);
      add(s.sampleId, s.value);
    });
    else throw new Error(`Expression row for ${gene} needs a values object or samples array.`);
    return { gene, values };
  });
  const occurrences = new Map<string, number>();
  for (const e of expressions) occurrences.set(e.gene, (occurrences.get(e.gene) ?? 0) + 1);
  for (const [g, count] of occurrences) {
    const rows = genes.filter(x => x === g).length;
    if (count > rows || (rows > 1 && count > 0 && count !== rows)) throw new Error(`${g} has ${rows} gene rows and ${count} expression rows. Supply one expression row per occurrence, or none.`);
  }
  return { genes, expressions };
}

export interface ParsedList {
  rows: string[][];
  labels: string[];
  column: number;
  ambiguous: boolean;
  hasHeader: boolean;
  delimiter: string;
  genes: string[];
  warnings: string[];
  totalRows: number;
  duplicates: number;
  skipped: number;
  duplicateExamples: string[];
  skippedExamples: string[];
}
export function parseGeneList(text: string, selectedColumn?: number, headerOverride?: boolean): ParsedList {
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: 'greedy', delimitersToGuess: ['\t', ',', ';'], delimiter: /[\t,;]/.test(text) ? '' : '\n' });
  const errors = result.errors.filter(e => e.code !== 'UndetectableDelimiter');
  if (errors.length) throw new Error(`Cannot read the delimited file: ${errors[0].message}`);
  const rows = result.data.map(row => row.map(cell => cell.trim()));
  if (!rows.length) throw new Error('File is empty.');
  const first = rows[0];
  const hit = first.findIndex(c => HEADER_LABELS.includes(c.toLowerCase()));
  const inferredHeader = hit >= 0 || first.some(c => /^(id|name|description|index|row|score|logfc|p.?value)$/i.test(c));
  const hasHeader = headerOverride ?? inferredHeader;
  const data = hasHeader ? rows.slice(1) : rows;
  const columns = Math.max(...rows.map(r => r.length));
  const scores = Array.from({ length: columns }, (_, c) => data.filter(r => validGeneToken(r[c])).length);
  const max = Math.max(...scores);
  const best = scores.flatMap((s, i) => s === max ? [i] : []);
  const column = selectedColumn ?? (hit >= 0 ? hit : best[0] ?? 0);
  if (!Number.isInteger(column) || column < 0 || column >= columns) throw new Error('Choose a valid gene column.');
  const ambiguous = selectedColumn === undefined && columns > 1 && (hit < 0 || best.length > 1 || scores[column] < max);
  const genes: string[] = [], skippedExamples: string[] = [], duplicateExamples: string[] = [];
  const seen = new Set<string>();
  let skipped = 0, duplicates = 0;
  data.forEach(r => {
    const token = r[column] ?? '';
    if (!validGeneToken(token)) { skipped++; if (skippedExamples.length < 3) skippedExamples.push(token); return; }
    const key = token.toUpperCase();
    if (seen.has(key)) { duplicates++; if (duplicateExamples.length < 3) duplicateExamples.push(token); }
    seen.add(key);
    genes.push(token);
  });
  const warnings: string[] = [];
  if (skipped) warnings.push(`${skipped} invalid or empty gene tokens skipped.`);
  if (duplicates) warnings.push(`${duplicates} repeated symbols retained as separate rows.`);
  if (data.some(r => r.length !== columns)) warnings.push('Rows have inconsistent column counts; check the delimiter and selected column.');
  return { rows, labels: Array.from({ length: columns }, (_, c) => hasHeader ? first[c] || `Column ${c + 1}` : `Column ${c + 1}`), column, ambiguous, hasHeader, delimiter: result.meta.delimiter, genes, warnings, totalRows: data.length, duplicates, skipped, duplicateExamples, skippedExamples };
}
export const sampleNames = (data: UploadedData) => [...new Set(data.expressions.flatMap(e => Object.keys(e.values)))];
export const sampleSetWarning = (data: UploadedData) => {
  const populated = data.expressions.filter(e => Object.keys(e.values).length);
  const signatures = new Set(populated.map(e => Object.keys(e.values).sort().join('\u0000')));
  return signatures.size > 1 ? 'Sample sets differ between expression rows; statistics use each row’s available samples.' : null;
};
