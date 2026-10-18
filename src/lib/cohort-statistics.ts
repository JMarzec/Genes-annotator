import type { GeneAnnotation } from '@/data/sampleData';
import { ROLE_ORDER, ROLE_COLORS } from '@/lib/roles';
export const COVERAGE_COLORS: Record<string, string> = { Both: 'hsl(var(--primary))', 'CIViC only': 'hsl(var(--info))', 'DGIdb only': 'hsl(var(--success))', Neither: 'hsl(var(--unknown))', 'Not fully checked': 'hsl(var(--warning))' };
export function cohortStatistics(annotations: GeneAnnotation[]) {
  const roleData = ROLE_ORDER.map(role => {
    const rows = annotations.filter(a => a.role === role);
    const withCivic = rows.filter(a => a.sourceStatus?.civic === 'success' && a.civicEvidence).length;
    const withoutCivic = rows.filter(a => a.sourceStatus?.civic === 'success' && !a.civicEvidence).length;
    return { role, count: rows.length, withCivic, withoutCivic, unavailableCivic: rows.length - withCivic - withoutCivic, fill: ROLE_COLORS[role] };
  }).filter(r => r.count);
  const coverage = { Both: 0, 'CIViC only': 0, 'DGIdb only': 0, Neither: 0, 'Not fully checked': 0 };
  const pairs = new Set<string>();
  let civic = 0, dgidb = 0, ids = 0, drugs = 0;
  annotations.forEach(a => {
    if (a.sourceStatus?.civic === 'success' && a.civicEvidence) civic++;
    if (a.sourceStatus?.dgidb === 'success' && a.dgidbInteractions) dgidb++;
    const checked = a.sourceStatus?.civic === 'success' && a.sourceStatus?.dgidb === 'success';
    const category = !checked ? 'Not fully checked' : a.civicEvidence && a.dgidbInteractions ? 'Both' : a.civicEvidence ? 'CIViC only' : a.dgidbInteractions ? 'DGIdb only' : 'Neither';
    coverage[category]++;
    if (a.ensemblId !== '—' || a.entrezId !== '—') ids++;
    if (a.dgidbDrugs?.length) drugs++;
    (a.dgidbDrugs ?? []).forEach(d => pairs.add(`${(a.officialSymbol ?? a.symbol).toUpperCase()}\u0000${d}`));
  });
  const coverageData = Object.entries(coverage).map(([name, value]) => ({ name, value }));
  const overlapData = coverageData.map(d => ({ category: d.name, value: d.value, fill: COVERAGE_COLORS[d.name] }));
  return { roleData, coverageData, overlapData, civic, dgidb, ids, drugs, drugCount: pairs.size, both: coverage.Both, civicOnly: coverage['CIViC only'], dgidbOnly: coverage['DGIdb only'], neither: coverage.Neither, notChecked: coverage['Not fully checked'] };
}
export function cohortCSVRows(annotations: GeneAnnotation[]) {
  const s = cohortStatistics(annotations);
  return [
    ...[{ name: 'Total rows', value: annotations.length }, { name: 'CIViC present', value: s.civic }, { name: 'DGIdb present', value: s.dgidb }, { name: 'External IDs', value: s.ids }, { name: 'Rows with drugs', value: s.drugs }, { name: 'Unique gene-drug pairs', value: s.drugCount }].map(m => ({ section: 'summary', category: m.name, count: m.value, with_civic: '', without_civic: '', unchecked_civic: '' })),
    ...s.roleData.map(r => ({ section: 'role', category: r.role, count: r.count, with_civic: r.withCivic, without_civic: r.withoutCivic, unchecked_civic: r.unavailableCivic })),
    ...s.coverageData.map(c => ({ section: 'coverage', category: c.name, count: c.value, with_civic: '', without_civic: '', unchecked_civic: '' })),
  ];
}
