import { Dna, FlaskConical } from "lucide-react";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import UploadArea from "@/components/UploadArea";
import SchemaPreview from "@/components/SchemaPreview";
import GeneTable from "@/components/GeneTable";
import { SAMPLE_DATA, annotateGenes } from "@/data/sampleData";
import type { UploadedData } from "@/data/sampleData";
import { useGeneData } from "@/contexts/GeneDataContext";

const Index = () => {
  const { data, annotations, setData, setAnnotations } = useGeneData();

  const handleData = (d: UploadedData) => {
    setData(d);
    setAnnotations(annotateGenes(d));
  };

  const loadDemo = () => handleData(SAMPLE_DATA);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container max-w-6xl py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Dna className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">OncoGene Annotator</h1>
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
              <h2 className="text-2xl font-bold text-foreground">Upload Gene Expression Data</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Upload a JSON file with genes and expression data to get cancer-focused annotations,
                identifier mapping, and actionability signals.
              </p>
            </div>
            <UploadArea onDataLoaded={handleData} onLoadDemo={loadDemo} />
          </div>
        ) : (
          <div className="space-y-6">
            <SchemaPreview data={data} />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">Gene List Overview</h2>
                <button
                  onClick={() => { setData(null); setAnnotations([]); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                >
                  Upload new file
                </button>
              </div>
              <GeneTable genes={annotations} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
