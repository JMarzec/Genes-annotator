import { createContext, useContext, useState, type ReactNode } from "react";
import type { UploadedData, GeneAnnotation } from "@/data/sampleData";

export interface ParseStats {
  totalRows: number;
  parsedUnique: number;
  duplicates: number;
  skipped: number;
  duplicateExamples: string[];
  skippedExamples: string[];
  source: "file" | "demo";
  fileName?: string;
}

interface GeneDataContextType {
  data: UploadedData | null;
  annotations: GeneAnnotation[];
  liveLoading: boolean;
  parseStats: ParseStats | null;
  setData: (data: UploadedData | null) => void;
  setAnnotations: (annotations: GeneAnnotation[]) => void;
  setLiveLoading: (v: boolean) => void;
  setParseStats: (s: ParseStats | null) => void;
}

const GeneDataContext = createContext<GeneDataContextType | null>(null);

export const GeneDataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<UploadedData | null>(null);
  const [annotations, setAnnotations] = useState<GeneAnnotation[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [parseStats, setParseStats] = useState<ParseStats | null>(null);

  return (
    <GeneDataContext.Provider value={{ data, annotations, liveLoading, parseStats, setData, setAnnotations, setLiveLoading, setParseStats }}>
      {children}
    </GeneDataContext.Provider>
  );
};

export const useGeneData = () => {
  const ctx = useContext(GeneDataContext);
  if (!ctx) throw new Error("useGeneData must be used within GeneDataProvider");
  return ctx;
};
