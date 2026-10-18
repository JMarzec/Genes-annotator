import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from 'react';
import type { UploadedData, GeneAnnotation, GeneRole } from '@/data/sampleData';
import { annotateGenes } from '@/data/sampleData';
import { fetchLiveSignals } from '@/lib/geneApis';
import { mergeLiveSignals } from '@/lib/mergeLiveSignals';
import { LatestRequest } from '@/lib/latest-request';
export interface ParseStats {
  totalRows: number; parsedUnique: number; parsedRows?: number; duplicates: number; skipped: number;
  duplicateExamples: string[]; skippedExamples: string[]; source: 'file' | 'demo'; fileName?: string;
  warnings?: string[]; columnInfo?: string;
}
interface Context {
  data: UploadedData | null; annotations: GeneAnnotation[]; liveLoading: boolean; parseStats: ParseStats | null;
  setData: (data: UploadedData | null) => void; setAnnotations: (annotations: GeneAnnotation[]) => void;
  setLiveLoading: (v: boolean) => void; setParseStats: (s: ParseStats | null) => void;
  loadData: (data: UploadedData, stats: ParseStats) => Promise<void>; resetData: () => void; retryLive: () => Promise<void>;
  selectedRoles: GeneRole[]; setSelectedRoles: React.Dispatch<React.SetStateAction<GeneRole[]>>;
  reportSelected: Set<number>; setReportSelected: React.Dispatch<React.SetStateAction<Set<number>>>;
  reportSearch: string; setReportSearch: (v: string) => void;
  tableSearch: string; setTableSearch: (v: string) => void;
  tableRole: GeneRole | 'All'; setTableRole: (v: GeneRole | 'All') => void;
  tableSort: { key: 'symbol' | 'role' | 'mean' | 'outlierPct'; direction: 'asc' | 'desc' };
  setTableSort: React.Dispatch<React.SetStateAction<Context['tableSort']>>;
}
const GeneDataContext = createContext<Context | null>(null);
export const GeneDataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<UploadedData | null>(null), [annotations, setAnnotations] = useState<GeneAnnotation[]>([]);
  const [liveLoading, setLiveLoading] = useState(false), [parseStats, setParseStats] = useState<ParseStats | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<GeneRole[]>([]), [reportSelected, setReportSelected] = useState(new Set<number>());
  const [reportSearch, setReportSearch] = useState(''), [tableSearch, setTableSearch] = useState('');
  const [tableRole, setTableRole] = useState<GeneRole | 'All'>('All');
  const [tableSort, setTableSort] = useState<Context['tableSort']>({ key: 'symbol', direction: 'asc' });
  const latest = useRef(new LatestRequest());
  useEffect(() => { const requests = latest.current; return () => requests.cancel(); }, []);
  const enrich = async (base: GeneAnnotation[]) => {
    const request = latest.current.begin(); setLiveLoading(true);
    try {
      const live = await fetchLiveSignals(base.map(a => a.symbol), request.signal);
      if (latest.current.isCurrent(request)) setAnnotations(mergeLiveSignals(base, live));
    } catch {
      if (latest.current.isCurrent(request)) setAnnotations(mergeLiveSignals(base, new Map()));
    } finally { if (latest.current.isCurrent(request)) setLiveLoading(false); }
  };
  const resetView = () => { setSelectedRoles([]); setReportSelected(new Set()); setReportSearch(''); setTableSearch(''); setTableRole('All'); setTableSort({ key: 'symbol', direction: 'asc' }); };
  const resetData = () => { latest.current.cancel(); setData(null); setAnnotations([]); setParseStats(null); setLiveLoading(false); resetView(); };
  const loadData = async (next: UploadedData, stats: ParseStats) => {
    const base = annotateGenes(next); // May reject invalid measurements; do not commit partially validated data.
    latest.current.cancel(); resetView(); setData(next); setParseStats(stats); setAnnotations(base);
    await enrich(base);
  };
  const retryLive = () => enrich(annotations);
  return <GeneDataContext.Provider value={{ data, annotations, liveLoading, parseStats, setData, setAnnotations, setLiveLoading, setParseStats, loadData, resetData, retryLive, selectedRoles, setSelectedRoles, reportSelected, setReportSelected, reportSearch, setReportSearch, tableSearch, setTableSearch, tableRole, setTableRole, tableSort, setTableSort }}>{children}</GeneDataContext.Provider>;
};
export const useGeneData = () => { const ctx = useContext(GeneDataContext); if (!ctx) throw new Error('useGeneData must be used within GeneDataProvider'); return ctx; };
