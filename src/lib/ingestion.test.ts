import { describe, it, expect } from 'vitest';
import { normalizeDataset, parseGeneList, sampleNames } from './ingestion';
import { annotateGenes, computeExpressionStats } from '@/data/sampleData';
describe('ingestion and measurements', () => {
  it('removes a single-column symbol header', () => expect(parseGeneList('symbol\nTP53\nBRCA1').genes).toEqual(['TP53', 'BRCA1']));
  it('requires confirmation for an unrecognized multi-column header and rejects numeric IDs', () => {
    const parsed = parseGeneList('id,name\n1,TP53\n2,BRCA2');
    expect(parsed.ambiguous).toBe(true);
    expect(parsed.genes).toEqual(['TP53', 'BRCA2']);
    expect(parseGeneList('id,name\n1,TP53\n2,BRCA2', 0).genes).toEqual([]);
  });
  it('respects quoted delimiters', () => expect(parseGeneList('description,symbol\n"note, text",TP53\n"other, text",BRCA2').genes).toEqual(['TP53', 'BRCA2']));
  it('preserves repeated rows and uploaded case', () => {
    const parsed = parseGeneList('MAP2\nMAP2\nMap2');
    expect(parsed.genes).toEqual(['MAP2', 'MAP2', 'Map2']); expect(parsed.duplicates).toBe(2);
  });
  it('links duplicate expression occurrences independently', () => {
    const data = normalizeDataset({ genes: ['TP53','TP53'], expressions: [{ gene:'TP53',values:{S1:1} }, {gene:'TP53',values:{S1:99}}] });
    const rows = annotateGenes(data);
    expect(rows.map(r => r.expressionStats?.mean)).toEqual([1,99]);
    expect(rows.map(r => r.rowId)).toEqual(['0','1']);
  });
  it('rejects a measurement shared ambiguously between duplicate rows', () => expect(() => normalizeDataset({ genes:['TP53','TP53'], expressions:[{gene:'TP53',values:{S1:1}}] })).toThrow('one expression row per occurrence'));
  it.each([null, '5', NaN, Infinity])('rejects invalid measurement %s', value => expect(() => normalizeDataset({ genes:['MAP2'], expressions:[{gene:'MAP2',values:{S1:value}}] })).toThrow('finite number'));
  it('rejects repeated sample IDs', () => expect(() => normalizeDataset({genes:['MAP2'],expressions:[{gene:'MAP2',samples:[{sampleId:'S1',value:1},{sampleId:'S1',value:2}]}]})).toThrow('Duplicate sample'));
  it('counts the union of samples', () => expect(sampleNames({genes:['TP53','MAP2'],expressions:[{gene:'TP53',values:{S1:1}},{gene:'MAP2',values:{S1:2,S2:3}}]})).toEqual(['S1','S2']));
  it('detects both low and high outliers', () => {
    expect(computeExpressionStats({S1:-100,S2:0,S3:0,S4:0,S5:0,S6:0,S7:0,S8:0})?.outlierPct).toBe(13);
    expect(computeExpressionStats({S1:100,S2:0,S3:0,S4:0,S5:0,S6:0,S7:0,S8:0})?.outlierPct).toBe(13);
  });
});
