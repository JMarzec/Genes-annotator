import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Dna, FlaskConical, ExternalLink, Shield, Pill, Activity, TrendingUp, BarChart3, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useGeneData } from "@/contexts/GeneDataContext";
import type { GeneAnnotation } from "@/data/sampleData";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from "recharts";

const ROLE_STYLES: Record<string, string> = {
  Oncogene: "bg-oncogene/15 text-oncogene",
  "Tumor Suppressor": "bg-tumor-suppressor/15 text-tumor-suppressor",
  Kinase: "bg-kinase/15 text-kinase",
  "DNA Repair": "bg-dna-repair/15 text-dna-repair",
  TF: "bg-tf/15 text-tf",
  Immune: "bg-immune/15 text-immune",
  Unknown: "bg-unknown/15 text-unknown",
};

const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="bg-surface-sunken rounded-lg p-4 text-center">
    <div className="text-2xl font-bold font-mono text-primary">{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
    {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
  </div>
);

const ExternalLinkButton = ({ href, label, icon: Icon }: { href: string; label: string; icon: typeof ExternalLink }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors"
  >
    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    {label}
    <ExternalLink className="h-3 w-3 text-muted-foreground" />
  </a>
);

/* ── Tab: Summary ── */
const SummaryTab = ({ gene }: { gene: GeneAnnotation }) => (
  <div className="space-y-6 animate-fade-in">
    <div className="surface-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Info className="h-4 w-4 text-primary" /> Gene Information
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{gene.description}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ensembl</span>
          <p className="font-mono text-xs mt-0.5">{gene.ensemblId}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Entrez</span>
          <p className="font-mono text-xs mt-0.5">{gene.entrezId}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Role</span>
          <p className="mt-0.5"><span className={`data-chip ${ROLE_STYLES[gene.role]}`}>{gene.role}</span></p>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Signals</span>
          <div className="flex gap-1 mt-1">
            {gene.civicEvidence && <span className="data-chip bg-info/15 text-info"><Shield className="h-3 w-3 mr-1" />CIViC</span>}
            {gene.dgidbInteractions && <span className="data-chip bg-accent/15 text-accent"><Pill className="h-3 w-3 mr-1" />DGIdb</span>}
            {!gene.civicEvidence && !gene.dgidbInteractions && <span className="text-xs text-muted-foreground">None</span>}
          </div>
        </div>
      </div>
    </div>

    {gene.expressionStats && (
      <div className="surface-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Expression Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Mean" value={gene.expressionStats.mean.toFixed(2)} />
          <StatCard label="Median" value={gene.expressionStats.median.toFixed(2)} />
          <StatCard label="Min" value={gene.expressionStats.min.toFixed(2)} />
          <StatCard label="Max" value={gene.expressionStats.max.toFixed(2)} />
          <StatCard label="Outlier %" value={`${gene.expressionStats.outlierPct}%`} />
        </div>
      </div>
    )}

    <div className="surface-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-3">External Resources</h3>
      <div className="flex flex-wrap gap-2">
        <ExternalLinkButton href={`https://www.genecards.org/cgi-bin/carddisp.pl?gene=${gene.symbol}`} label="GeneCards" icon={Dna} />
        <ExternalLinkButton href={`https://www.ncbi.nlm.nih.gov/gene/${gene.entrezId}`} label="NCBI Gene" icon={Dna} />
        <ExternalLinkButton href={`https://ensembl.org/Homo_sapiens/Gene/Summary?g=${gene.ensemblId}`} label="Ensembl" icon={Dna} />
      </div>
    </div>
  </div>
);

/* ── Tab: Clinical Evidence ── */
const ClinicalEvidenceTab = ({ gene }: { gene: GeneAnnotation }) => (
  <div className="space-y-6 animate-fade-in">
    <div className="surface-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Shield className="h-4 w-4 text-info" /> Cancer Relevance
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{gene.cancerRelevance}</p>
    </div>

    <div className="surface-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Evidence Databases</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className={`rounded-lg border p-4 ${gene.civicEvidence ? "border-info/30 bg-info/5" : "border-border bg-muted/30"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className={`h-4 w-4 ${gene.civicEvidence ? "text-info" : "text-muted-foreground"}`} />
            <span className="text-sm font-semibold">CIViC</span>
            <span className={`ml-auto data-chip ${gene.civicEvidence ? "bg-info/15 text-info" : "bg-muted text-muted-foreground"}`}>
              {gene.civicEvidence ? "Evidence Found" : "No Data"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Clinical Interpretation of Variants in Cancer</p>
          {gene.civicEvidence && (
            <a
              href={`https://civicdb.org/links/entrez_name/${gene.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-info hover:underline mt-2"
            >
              View in CIViC <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className={`rounded-lg border p-4 ${gene.dgidbInteractions ? "border-accent/30 bg-accent/5" : "border-border bg-muted/30"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Pill className={`h-4 w-4 ${gene.dgidbInteractions ? "text-accent" : "text-muted-foreground"}`} />
            <span className="text-sm font-semibold">DGIdb</span>
            <span className={`ml-auto data-chip ${gene.dgidbInteractions ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>
              {gene.dgidbInteractions ? "Interactions Found" : "No Data"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Drug Gene Interaction Database</p>
          {gene.dgidbInteractions && (
            <a
              href={`https://www.dgidb.org/genes/${gene.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-2"
            >
              View in DGIdb <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  </div>
);

/* ── Tab: Druggability ── */
const DruggabilityTab = ({ gene }: { gene: GeneAnnotation }) => {
  const isDruggable = gene.dgidbInteractions;
  const hasTherapyRelevance = gene.role === "Oncogene" || gene.role === "Kinase";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="surface-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Pill className="h-4 w-4 text-accent" /> Druggability Assessment
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className={`rounded-lg border p-4 text-center ${isDruggable ? "border-accent/30 bg-accent/5" : "border-border"}`}>
            <Pill className={`h-8 w-8 mx-auto mb-2 ${isDruggable ? "text-accent" : "text-muted-foreground"}`} />
            <div className="text-sm font-semibold">{isDruggable ? "Druggable" : "Not Annotated"}</div>
            <div className="text-xs text-muted-foreground mt-1">DGIdb interactions</div>
          </div>
          <div className={`rounded-lg border p-4 text-center ${hasTherapyRelevance ? "border-warning/30 bg-warning/5" : "border-border"}`}>
            <Activity className={`h-8 w-8 mx-auto mb-2 ${hasTherapyRelevance ? "text-warning" : "text-muted-foreground"}`} />
            <div className="text-sm font-semibold">{hasTherapyRelevance ? "Therapy-Relevant" : "Indirect Target"}</div>
            <div className="text-xs text-muted-foreground mt-1">Based on gene role ({gene.role})</div>
          </div>
          <div className={`rounded-lg border p-4 text-center ${gene.civicEvidence ? "border-info/30 bg-info/5" : "border-border"}`}>
            <TrendingUp className={`h-8 w-8 mx-auto mb-2 ${gene.civicEvidence ? "text-info" : "text-muted-foreground"}`} />
            <div className="text-sm font-semibold">{gene.civicEvidence ? "Clinical Evidence" : "Pre-clinical"}</div>
            <div className="text-xs text-muted-foreground mt-1">CIViC evidence level</div>
          </div>
        </div>
      </div>

      <div className="surface-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Drug Interaction Lookup</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Explore known drug-gene interactions and potential therapeutic targets for <span className="gene-symbol">{gene.symbol}</span>.
        </p>
        <div className="flex flex-wrap gap-2">
          <ExternalLinkButton href={`https://www.dgidb.org/genes/${gene.symbol}`} label="DGIdb Interactions" icon={Pill} />
          <ExternalLinkButton href={`https://www.mycancergenome.org/content/gene/${gene.symbol}/`} label="My Cancer Genome" icon={Dna} />
          <ExternalLinkButton href={`https://www.oncokb.org/gene/${gene.symbol}`} label="OncoKB" icon={Shield} />
        </div>
      </div>
    </div>
  );
};

/* ── Tab: Expression Context ── */
const ExpressionContextTab = ({ gene, sampleValues }: { gene: GeneAnnotation; sampleValues: Record<string, number> | null }) => {
  const entries = sampleValues ? Object.entries(sampleValues) : [];
  const chartData = entries.map(([sample, value]) => ({ sample, value: +value.toFixed(3) }));
  const mean = gene.expressionStats?.mean ?? 0;

  if (chartData.length === 0) {
    return (
      <div className="surface-card p-8 text-center text-muted-foreground animate-fade-in">
        <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm">No expression data available for this gene.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="surface-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Per-Sample Expression
        </h3>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
              <XAxis
                dataKey="sample"
                tick={{ fontSize: 10, fill: "hsl(215 12% 50%)" }}
                angle={-45}
                textAnchor="end"
                interval={chartData.length > 30 ? Math.floor(chartData.length / 20) : 0}
              />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215 12% 50%)" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(0 0% 100%)",
                  border: "1px solid hsl(214 20% 88%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <ReferenceLine y={mean} stroke="hsl(199 89% 48%)" strokeDasharray="4 4" label={{ value: `Mean: ${mean.toFixed(2)}`, position: "right", fontSize: 10, fill: "hsl(199 89% 48%)" }} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.value > mean ? "hsl(199 89% 48%)" : "hsl(199 89% 48% / 0.4)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {gene.expressionStats && (
        <div className="surface-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Distribution Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard label="Mean" value={gene.expressionStats.mean.toFixed(2)} />
            <StatCard label="Median" value={gene.expressionStats.median.toFixed(2)} />
            <StatCard label="Min" value={gene.expressionStats.min.toFixed(2)} />
            <StatCard label="Max" value={gene.expressionStats.max.toFixed(2)} />
            <StatCard label="Outlier %" value={`${gene.expressionStats.outlierPct}%`} />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {entries.length} samples · Range: {gene.expressionStats.min.toFixed(2)} – {gene.expressionStats.max.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
};

/* ── Main Page ── */
const GeneDetail = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { data, annotations } = useGeneData();

  const gene = annotations.find(a => a.symbol === symbol);
  const expressionEntry = data?.expressions?.find(e => e.gene === symbol);
  const sampleValues = expressionEntry?.values ?? null;

  if (!gene) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container max-w-6xl py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Dna className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">OncoGene Annotator</h1>
            </div>
          </div>
        </header>
        <main className="container max-w-6xl py-16 text-center">
          <Dna className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Gene Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            No annotation data for "<span className="font-mono">{symbol}</span>". Load a dataset first.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </main>
      </div>
    );
  }

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

      {/* Breadcrumb + Title */}
      <main className="container max-w-6xl py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Dna className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold gene-symbol">{gene.symbol}</h2>
              <span className={`data-chip ${ROLE_STYLES[gene.role]}`}>{gene.role}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{gene.description.split('.')[0]}.</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="w-full justify-start bg-surface-sunken border border-border rounded-lg p-1 h-auto flex-wrap">
            <TabsTrigger value="summary" className="gap-1.5 text-xs sm:text-sm">
              <Info className="h-3.5 w-3.5" /> Summary
            </TabsTrigger>
            <TabsTrigger value="clinical" className="gap-1.5 text-xs sm:text-sm">
              <Shield className="h-3.5 w-3.5" /> Clinical Evidence
            </TabsTrigger>
            <TabsTrigger value="druggability" className="gap-1.5 text-xs sm:text-sm">
              <Pill className="h-3.5 w-3.5" /> Druggability
            </TabsTrigger>
            <TabsTrigger value="expression" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5" /> Expression Context
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-6">
            <SummaryTab gene={gene} />
          </TabsContent>
          <TabsContent value="clinical" className="mt-6">
            <ClinicalEvidenceTab gene={gene} />
          </TabsContent>
          <TabsContent value="druggability" className="mt-6">
            <DruggabilityTab gene={gene} />
          </TabsContent>
          <TabsContent value="expression" className="mt-6">
            <ExpressionContextTab gene={gene} sampleValues={sampleValues} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default GeneDetail;
