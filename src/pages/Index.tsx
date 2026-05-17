import { useState } from "react";
import { Dna, FlaskConical, FileText, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import UploadArea from "@/components/UploadArea";
import ParsedReportedCounter from "@/components/ParsedReportedCounter";
import GeneStats from "@/components/GeneStats";
import SchemaPreview from "@/components/SchemaPreview";
import GeneTable from "@/components/GeneTable";
import ReportBuilder from "@/components/ReportBuilder";
import { SAMPLE_DATA, annotateGenes } from "@/data/sampleData";
import type { UploadedData, GeneRole } from "@/data/sampleData";
import { useGeneData } from "@/contexts/GeneDataContext";
import { fetchLiveSignals } from "@/lib/geneApis";
import type { ParseStats } from "@/contexts/GeneDataContext";

const Index = () => {
  const { data, annotations, liveLoading, parseStats, setData, setAnnotations, setLiveLoading, setParseStats } = useGeneData();
  const [selectedRoles, setSelectedRoles] = useState<GeneRole[]>([]);
  const toggleRole = (r: GeneRole) =>
    setSelectedRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  const filteredAnnotations = selectedRoles.length === 0
    ? annotations
    : annotations.filter((a) => selectedRoles.includes(a.role));

  const handleData = async (d: UploadedData, stats: ParseStats) => {
    setData(d);
    setParseStats(stats);
    const annotated = annotateGenes(d);
    setAnnotations(annotated);
    setLiveLoading(true);
    try {
      const live = await fetchLiveSignals(annotated.map((a) => a.symbol));
      const merged = annotated.map((a) => {
        const s = live.get(a.symbol.toUpperCase());
        if (!s) return { ...a, liveFetched: true };
        const liveDescription = s.description
          ? `${s.fullName ? `${s.fullName}. ` : ""}${s.description}`
          : s.fullName;
        return {
          ...a,
          liveFetched: true,
          symbol: s.officialSymbol ?? a.symbol,
          ensemblId: a.ensemblId !== "—" ? a.ensemblId : s.ensemblId ?? a.ensemblId,
          entrezId: a.entrezId !== "—" ? a.entrezId : s.entrezId ?? a.entrezId,
          role: a.role !== "Unknown" ? a.role : s.inferredRole ?? a.role,
          description: a.description !== "No annotation available." ? a.description : liveDescription ?? a.description,
          cancerRelevance: a.cancerRelevance !== "Unknown"
            ? a.cancerRelevance
            : s.description ?? (s.metadataFound ? `${s.officialSymbol ?? a.symbol} is annotated in public human gene metadata${s.geneType ? ` as ${s.geneType}` : ""}.` : (s.civicEvidenceCount > 0 ? `${a.symbol} has curated clinical evidence in CIViC.` : a.cancerRelevance)),
          civicEvidenceCount: s.civicEvidenceCount,
          dgidbDrugs: s.dgidbDrugs,
          civicEvidence: s.civicEvidenceCount > 0 || a.civicEvidence,
          dgidbInteractions: s.dgidbDrugs.length > 0 || a.dgidbInteractions,
        };
      });
      setAnnotations(merged);
    } finally {
      setLiveLoading(false);
    }
  };

  const loadDemo = () => handleData(SAMPLE_DATA, {
    totalRows: SAMPLE_DATA.genes.length,
    parsedUnique: SAMPLE_DATA.genes.length,
    duplicates: 0,
    skipped: 0,
    duplicateExamples: [],
    skippedExamples: [],
    source: "demo",
  });

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>OncoGene Annotator — Cancer Gene Annotation Dashboard</title>
        <meta name="description" content="Upload gene expression JSON to annotate cancer genes with clinical evidence, druggability signals, and per-sample expression context." />
        <meta property="og:title" content="OncoGene Annotator — Cancer Gene Annotation Dashboard" />
        <meta property="og:description" content="Upload gene expression JSON to annotate cancer genes with clinical evidence, druggability signals, and per-sample expression context." />
        <link rel="canonical" href="https://accelbio-genes-annotator.lovable.app/" />
      </Helmet>
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container max-w-6xl py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Dna className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground tracking-tight">OncoGene Annotator</div>
              <p className="text-xs text-muted-foreground">Cancer Gene Annotation Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FlaskConical className="h-3.5 w-3.5" />
            Research Use Only
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container max-w-6xl py-8 space-y-6">
        <DisclaimerBanner />

        {!data ? (
          <div className="max-w-lg mx-auto py-12">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground">Upload Gene Expression Data — OncoGene Annotator</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Upload a JSON file with genes and expression data to get cancer-focused annotations,
                identifier mapping, and actionability signals.
              </p>
            </div>
            <UploadArea onDataLoaded={handleData} onLoadDemo={loadDemo} />
          </div>
        ) : (
          <div className="space-y-6">
            {parseStats && (
              <ParsedReportedCounter stats={parseStats} annotations={annotations} liveLoading={liveLoading} />
            )}
            <SchemaPreview data={data} />
            <GeneStats annotations={annotations} />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-foreground">Gene List Overview — Annotated Cancer Genes</h1>
                <div className="flex items-center gap-3">
                  {liveLoading && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Fetching CIViC + DGIdb…
                    </span>
                  )}
                  <button
                    onClick={() => { setData(null); setAnnotations([]); setParseStats(null); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                  >
                    Upload new file
                  </button>
                </div>
              </div>
              <GeneTable genes={annotations} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Report Builder</h2>
              </div>
              <ReportBuilder />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Powered by{" "}
        <a
          href="https://accelbio.pt/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          AccelBio
        </a>
      </footer>
    </div>
  );
};

export default Index;
