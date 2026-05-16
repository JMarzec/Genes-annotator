import { createContext, useContext, useState, type ReactNode } from "react";
import type { UploadedData, GeneAnnotation } from "@/data/sampleData";

interface GeneDataContextType {
  data: UploadedData | null;
  annotations: GeneAnnotation[];
  liveLoading: boolean;
  setData: (data: UploadedData | null) => void;
  setAnnotations: (annotations: GeneAnnotation[]) => void;
  setLiveLoading: (v: boolean) => void;
}

const GeneDataContext = createContext<GeneDataContextType | null>(null);

export const GeneDataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<UploadedData | null>(null);
  const [annotations, setAnnotations] = useState<GeneAnnotation[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);

  return (
    <GeneDataContext.Provider value={{ data, annotations, liveLoading, setData, setAnnotations, setLiveLoading }}>
      {children}
    </GeneDataContext.Provider>
  );
};

export const useGeneData = () => {
  const ctx = useContext(GeneDataContext);
  if (!ctx) throw new Error("useGeneData must be used within GeneDataProvider");
  return ctx;
};
