import { Button } from "@/components/ui/button";
import { Dna, FlaskConical, FileText, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import UploadArea from "@/components/UploadArea";
import ParsedReportedCounter from "@/components/ParsedReportedCounter";
import GeneStats from "@/components/GeneStats";
import SchemaPreview from "@/components/SchemaPreview";
import GeneTable from "@/components/GeneTable";
import ReportBuilder from "@/components/ReportBuilder";
import { SAMPLE_DATA } from "@/data/sampleData";
import type { UploadedData, GeneRole } from "@/data/sampleData";
import { useGeneData } from "@/contexts/GeneDataContext";
import type { ParseStats } from "@/contexts/GeneDataContext";

const Index = () => {
  const { data, annotations, liveLoading, parseStats, loadData, resetData, retryLive, selectedRoles, setSelectedRoles } = useGeneData();
  const toggleRole = (r: GeneRole) =>
    setSelectedRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  const filteredAnnotations = selectedRoles.length === 0
    ? annotations
    : annotations.filter((a) => selectedRoles.includes(a.role));

  const handleData = (d: UploadedData, stats: ParseStats) => { void loadData(d, stats); };
  const unavailable = annotations.some(a => a.sourceStatus && Object.values(a.sourceStatus).includes("unavailable"));

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
            {parseStats?.columnInfo && <p className="text-sm text-muted-foreground">Gene column: {parseStats.columnInfo}</p>}
            {parseStats?.warnings?.map(w => <p key={w} role="status" className="text-sm text-warning">{w}</p>)}
            {unavailable && !liveLoading && <div role="status" className="flex flex-wrap items-center gap-3 text-sm text-warning"><span>Some annotation sources are unavailable. Missing results are not confirmed negatives.</span><Button variant="outline" size="sm" onClick={() => void retryLive()}>Retry lookups</Button></div>}
            <SchemaPreview data={data} />
            <GeneStats
              annotations={annotations}
              selectedRoles={selectedRoles}
              onToggleRole={toggleRole}
              onClearRoles={() => setSelectedRoles([])}
            />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-foreground">
                  Gene List Overview — Annotated Cancer Genes
                  {selectedRoles.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({filteredAnnotations.length} of {annotations.length} shown · filtered by {selectedRoles.join(", ")})
                    </span>
                  )}
                </h1>
                <div className="flex items-center gap-3">
                  {liveLoading && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Fetching CIViC + DGIdb…
                    </span>
                  )}
                  {selectedRoles.length > 0 && (
                    <Button variant="ghost" size="sm"
                      onClick={() => setSelectedRoles([])}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                    >
                      Clear role filter
                    </Button>
                  )}
                  <Button variant="ghost" size="sm"
                    onClick={resetData}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                  >
                    Upload new file
                  </Button>
                </div>
              </div>
              <GeneTable genes={filteredAnnotations} />
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

      <footer className="border-t py-4 text-center text-xs text-muted-foreground space-x-3">
        <a href="/connect" className="font-medium text-primary hover:underline">
          Connect an AI assistant
        </a>
        <span>·</span>
        <span>
          Powered by{" "}
          <a
            href="https://accelbio.pt/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            AccelBio
          </a>
        </span>
      </footer>
    </div>
  );
};

export default Index;
