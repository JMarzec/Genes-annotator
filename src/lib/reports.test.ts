import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import { annotateGenes } from '@/data/sampleData';
import { buildHtmlReport } from './html-report';
import { cohortStatistics, cohortCSVRows } from './cohort-statistics';
import { toCSV } from './download';
import { mergeLiveSignals } from './mergeLiveSignals';
describe('complete exports and confirmed cohort statistics', () => {
  it('exports all 61 drugs without truncation', () => {
    const row = annotateGenes({genes:['TP53'],expressions:[]})[0];
    row.dgidbDrugs = Array.from({length:61},(_,i)=>`DRUG_${i}`);
    const document = new DOMParser().parseFromString(buildHtmlReport([row]), 'text/html');
    expect(document.querySelectorAll('.drug').length).toBe(61);
    expect([...document.querySelectorAll('.drug')].map(e=>e.textContent)).toContain('DRUG_60');
  });
  it('does not count unavailable sources as neither', () => {
    const rows = mergeLiveSignals(annotateGenes({genes:['MAP2'],expressions:[]}),new Map());
    const s = cohortStatistics(rows); expect(s.neither).toBe(0); expect(s.notChecked).toBe(1);
  });
  it('counts unique canonical gene-drug pairs, not duplicate rows', () => {
    const rows = annotateGenes({genes:['HER2','ERBB2'],expressions:[]}).map(a=>({...a,officialSymbol:'ERBB2',dgidbDrugs:['D1','D2']}));
    expect(cohortStatistics(rows).drugCount).toBe(2);
  });
  it('exports one rectangular CSV dataset', () => {
    const rows = annotateGenes({genes:['TP53'],expressions:[]});
    const parsed = Papa.parse<string[]>(toCSV(cohortCSVRows(rows)));
    expect(parsed.errors).toEqual([]); expect(new Set(parsed.data.map(r=>r.length))).toEqual(new Set([6]));
  });
});
