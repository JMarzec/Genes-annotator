export interface GeneExpression {
  gene: string;
  values: Record<string, number>;
}

export interface UploadedData {
  genes: string[];
  expressions: GeneExpression[];
}

// Alternate format: expressions as { gene, samples: [{ sampleId, value }] }
interface AltExpression {
  gene: string;
  samples: { sampleId: string; value: number; [key: string]: unknown }[];
}

interface RawUploadedData {
  genes: string[];
  expressions: (GeneExpression | AltExpression)[];
  [key: string]: unknown;
}

export function normalizeUploadedData(raw: RawUploadedData): UploadedData {
  const expressions: GeneExpression[] = raw.expressions.map((expr) => {
    // Already in { gene, values } format
    if ('values' in expr && typeof expr.values === 'object' && expr.values !== null) {
      return expr as GeneExpression;
    }
    // Alternate { gene, samples: [{ sampleId, value }] } format
    if ('samples' in expr && Array.isArray((expr as AltExpression).samples)) {
      const alt = expr as AltExpression;
      const values: Record<string, number> = {};
      alt.samples.forEach((s) => {
        values[s.sampleId] = s.value;
      });
      return { gene: alt.gene, values };
    }
    // Fallback: empty values
    return { gene: (expr as any).gene ?? 'unknown', values: {} };
  });
  return { genes: raw.genes, expressions };
}

export type GeneRole = "Oncogene" | "Tumor Suppressor" | "Kinase" | "DNA Repair" | "TF" | "Immune" | "Unknown";

export interface GeneAnnotation {
  symbol: string;
  ensemblId: string;
  entrezId: string;
  role: GeneRole;
  description: string;
  cancerRelevance: string;
  civicEvidence: boolean;
  dgidbInteractions: boolean;
  expressionStats?: {
    mean: number;
    median: number;
    min: number;
    max: number;
    outlierPct: number;
  };
}

export const SAMPLE_DATA: UploadedData = {
  genes: ["TP53", "BRCA1", "EGFR", "KRAS", "MYC", "PTEN", "PIK3CA", "BRAF", "CDK4", "RB1", "APC", "VEGFA"],
  expressions: [
    { gene: "TP53", values: { S1: 5.2, S2: 3.1, S3: 8.7, S4: 4.5, S5: 2.9, S6: 6.1, S7: 11.3, S8: 4.8 } },
    { gene: "BRCA1", values: { S1: 2.1, S2: 1.8, S3: 3.4, S4: 2.7, S5: 1.5, S6: 2.9, S7: 4.1, S8: 2.3 } },
    { gene: "EGFR", values: { S1: 7.8, S2: 12.3, S3: 6.5, S4: 15.2, S5: 8.1, S6: 9.4, S7: 7.2, S8: 18.6 } },
    { gene: "KRAS", values: { S1: 4.5, S2: 5.1, S3: 3.8, S4: 4.2, S5: 6.7, S6: 4.9, S7: 5.3, S8: 4.1 } },
    { gene: "MYC", values: { S1: 9.2, S2: 11.5, S3: 8.7, S4: 14.3, S5: 10.1, S6: 9.8, S7: 12.6, S8: 15.8 } },
    { gene: "PTEN", values: { S1: 3.5, S2: 1.2, S3: 4.1, S4: 0.8, S5: 3.9, S6: 2.1, S7: 3.7, S8: 1.5 } },
    { gene: "PIK3CA", values: { S1: 6.1, S2: 7.3, S3: 5.8, S4: 8.9, S5: 6.5, S6: 7.1, S7: 6.8, S8: 9.2 } },
    { gene: "BRAF", values: { S1: 3.2, S2: 4.5, S3: 3.8, S4: 5.1, S5: 3.5, S6: 4.2, S7: 3.9, S8: 4.8 } },
    { gene: "CDK4", values: { S1: 5.8, S2: 6.2, S3: 7.1, S4: 5.5, S5: 8.3, S6: 6.9, S7: 5.4, S8: 7.7 } },
    { gene: "RB1", values: { S1: 4.1, S2: 2.3, S3: 3.8, S4: 1.9, S5: 4.5, S6: 3.2, S7: 4.0, S8: 2.1 } },
    { gene: "APC", values: { S1: 3.9, S2: 2.8, S3: 4.2, S4: 2.1, S5: 3.5, S6: 4.8, S7: 3.1, S8: 2.5 } },
    { gene: "VEGFA", values: { S1: 8.5, S2: 10.2, S3: 7.8, S4: 12.1, S5: 9.3, S6: 8.9, S7: 11.5, S8: 13.7 } },
  ],
};

const GENE_DB: Record<string, Partial<GeneAnnotation>> = {
  TP53: { ensemblId: "ENSG00000141510", entrezId: "7157", role: "Tumor Suppressor", description: "Tumor protein p53 — guardian of the genome. Key tumor suppressor regulating cell cycle arrest, apoptosis, and DNA repair.", cancerRelevance: "Most frequently mutated gene in human cancers (~50%). Loss-of-function and gain-of-function mutations drive tumorigenesis across virtually all cancer types.", civicEvidence: true, dgidbInteractions: true },
  BRCA1: { ensemblId: "ENSG00000012048", entrezId: "672", role: "DNA Repair", description: "BRCA1 DNA repair associated. Critical for homologous recombination repair of double-strand breaks.", cancerRelevance: "Germline mutations confer high risk of breast and ovarian cancer. Deficiency sensitizes to PARP inhibitors (synthetic lethality).", civicEvidence: true, dgidbInteractions: true },
  EGFR: { ensemblId: "ENSG00000146648", entrezId: "1956", role: "Oncogene", description: "Epidermal growth factor receptor. Transmembrane receptor tyrosine kinase driving cell proliferation.", cancerRelevance: "Amplified/mutated in NSCLC, glioblastoma, colorectal cancer. Target of erlotinib, gefitinib, osimertinib, cetuximab.", civicEvidence: true, dgidbInteractions: true },
  KRAS: { ensemblId: "ENSG00000133703", entrezId: "3845", role: "Oncogene", description: "KRAS proto-oncogene, GTPase. Key signal transducer in RAS/MAPK pathway.", cancerRelevance: "Mutated in ~25% of all cancers. G12C mutation targetable with sotorasib/adagrasib in NSCLC.", civicEvidence: true, dgidbInteractions: true },
  MYC: { ensemblId: "ENSG00000136997", entrezId: "4609", role: "Oncogene", description: "MYC proto-oncogene, bHLH transcription factor. Master regulator of cell growth and proliferation.", cancerRelevance: "Amplified in many cancers including Burkitt lymphoma, breast, lung. Drives metabolic reprogramming and immune evasion.", civicEvidence: true, dgidbInteractions: false },
  PTEN: { ensemblId: "ENSG00000171862", entrezId: "5728", role: "Tumor Suppressor", description: "Phosphatase and tensin homolog. Lipid phosphatase that antagonizes PI3K/AKT signaling.", cancerRelevance: "Frequently deleted/mutated in prostate, endometrial, brain cancers. Loss activates PI3K/AKT/mTOR pathway.", civicEvidence: true, dgidbInteractions: true },
  PIK3CA: { ensemblId: "ENSG00000121879", entrezId: "5290", role: "Kinase", description: "Phosphatidylinositol-4,5-bisphosphate 3-kinase catalytic subunit alpha. Key kinase in PI3K/AKT pathway.", cancerRelevance: "Hotspot mutations (E545K, H1047R) in breast, colorectal, endometrial cancers. Target of alpelisib.", civicEvidence: true, dgidbInteractions: true },
  BRAF: { ensemblId: "ENSG00000157764", entrezId: "673", role: "Kinase", description: "B-Raf proto-oncogene, serine/threonine kinase. Central kinase in MAPK signaling cascade.", cancerRelevance: "V600E mutation in melanoma (50%), colorectal, thyroid cancers. Target of vemurafenib, dabrafenib.", civicEvidence: true, dgidbInteractions: true },
  CDK4: { ensemblId: "ENSG00000135446", entrezId: "1019", role: "Kinase", description: "Cyclin dependent kinase 4. Key regulator of G1/S cell cycle transition.", cancerRelevance: "Amplified in sarcoma, glioblastoma. Target of palbociclib, ribociclib, abemaciclib in HR+ breast cancer.", civicEvidence: true, dgidbInteractions: true },
  RB1: { ensemblId: "ENSG00000139687", entrezId: "5925", role: "Tumor Suppressor", description: "RB transcriptional corepressor 1. Master regulator of cell cycle entry.", cancerRelevance: "Loss-of-function in retinoblastoma, small cell lung cancer, osteosarcoma. RB loss may predict CDK4/6 inhibitor resistance.", civicEvidence: true, dgidbInteractions: false },
  APC: { ensemblId: "ENSG00000134982", entrezId: "324", role: "Tumor Suppressor", description: "APC regulator of WNT signaling pathway. Key negative regulator of Wnt/beta-catenin signaling.", cancerRelevance: "Truncating mutations initiate >80% of colorectal cancers. Gatekeeper gene in adenoma-carcinoma sequence.", civicEvidence: true, dgidbInteractions: false },
  VEGFA: { ensemblId: "ENSG00000112715", entrezId: "7422", role: "Immune", description: "Vascular endothelial growth factor A. Key regulator of angiogenesis and vascular permeability.", cancerRelevance: "Major driver of tumor angiogenesis. Target of bevacizumab (anti-VEGF), critical in RCC, CRC, ovarian cancer.", civicEvidence: true, dgidbInteractions: true },
  // Housekeeping / validation genes
  ACTB: { ensemblId: "ENSG00000075624", entrezId: "60", role: "Unknown", description: "Actin beta. Ubiquitous cytoskeletal structural protein, commonly used as a housekeeping reference gene.", cancerRelevance: "Used as internal control in expression studies. Expression can vary in some cancer types, potentially confounding normalization.", civicEvidence: false, dgidbInteractions: false },
  B2M: { ensemblId: "ENSG00000166710", entrezId: "567", role: "Immune", description: "Beta-2-microglobulin. Component of MHC class I molecules, essential for antigen presentation.", cancerRelevance: "Mutations cause immune evasion in melanoma, colorectal, and lung cancers. Loss disrupts MHC-I-mediated T-cell recognition.", civicEvidence: true, dgidbInteractions: false },
  CDH1: { ensemblId: "ENSG00000039068", entrezId: "999", role: "Tumor Suppressor", description: "Cadherin 1 (E-cadherin). Calcium-dependent cell-cell adhesion glycoprotein critical for epithelial integrity.", cancerRelevance: "Germline mutations cause hereditary diffuse gastric cancer. Loss promotes epithelial-mesenchymal transition and metastasis in lobular breast, gastric cancers.", civicEvidence: true, dgidbInteractions: true },
  EEF1A1: { ensemblId: "ENSG00000156508", entrezId: "1915", role: "Unknown", description: "Eukaryotic translation elongation factor 1 alpha 1. Essential component of the translational machinery.", cancerRelevance: "Overexpressed in multiple cancers. Moonlighting roles in apoptosis, cytoskeletal organization. Used as housekeeping reference gene.", civicEvidence: false, dgidbInteractions: false },
  KRT8: { ensemblId: "ENSG00000170421", entrezId: "3856", role: "Unknown", description: "Keratin 8. Type II intermediate filament protein expressed in simple epithelia.", cancerRelevance: "Biomarker for epithelial cancers. Overexpression associated with poor prognosis in breast, colorectal, and hepatocellular carcinoma.", civicEvidence: false, dgidbInteractions: false },
  RPL13A: { ensemblId: "ENSG00000142541", entrezId: "23521", role: "Unknown", description: "Ribosomal protein L13a. Component of the 60S ribosomal subunit with extra-ribosomal regulatory functions.", cancerRelevance: "Commonly used housekeeping gene. Involved in translational silencing of inflammatory genes via GAIT complex.", civicEvidence: false, dgidbInteractions: false },
  RPLP0: { ensemblId: "ENSG00000089157", entrezId: "6175", role: "Unknown", description: "Ribosomal protein lateral stalk subunit P0. Essential component of the ribosomal stalk for translation.", cancerRelevance: "Standard reference gene for qPCR normalization. Overexpression reported in breast and liver cancers.", civicEvidence: false, dgidbInteractions: false },
  UBC: { ensemblId: "ENSG00000150991", entrezId: "7316", role: "Unknown", description: "Ubiquitin C. Encodes polyubiquitin precursor, essential for proteasome-mediated protein degradation.", cancerRelevance: "Ubiquitin pathway is heavily exploited by cancers. Proteasome inhibitors (bortezomib) target downstream ubiquitin signaling.", civicEvidence: false, dgidbInteractions: true },
  ALDH1A1: { ensemblId: "ENSG00000165092", entrezId: "216", role: "Unknown", description: "Aldehyde dehydrogenase 1 family member A1. Detoxifying enzyme involved in retinoid metabolism.", cancerRelevance: "Cancer stem cell marker in breast, ovarian, lung cancers. High ALDH1A1 activity associated with chemoresistance and poor prognosis.", civicEvidence: true, dgidbInteractions: true },
};

export function computeExpressionStats(values: Record<string, number>) {
  const nums = Object.values(values);
  if (nums.length === 0) return undefined;
  const sorted = [...nums].sort((a, b) => a - b);
  const mean = nums.reduce((s, v) => s + v, 0) / nums.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const iqr = sorted[Math.floor(sorted.length * 0.75)] - sorted[Math.floor(sorted.length * 0.25)];
  const outlierThreshold = median + 1.5 * iqr;
  const outlierCount = nums.filter(v => v > outlierThreshold).length;
  const outlierPct = Math.round((outlierCount / nums.length) * 100);
  return { mean: +mean.toFixed(2), median: +median.toFixed(2), min: +min.toFixed(2), max: +max.toFixed(2), outlierPct };
}

export function annotateGenes(data: UploadedData): GeneAnnotation[] {
  return data.genes.map(gene => {
    const db = GENE_DB[gene] || {};
    const expr = data.expressions.find(e => e.gene === gene);
    const stats = expr ? computeExpressionStats(expr.values) : undefined;
    return {
      symbol: gene,
      ensemblId: db.ensemblId || "—",
      entrezId: db.entrezId || "—",
      role: db.role || "Unknown",
      description: db.description || "No annotation available.",
      cancerRelevance: db.cancerRelevance || "Unknown",
      civicEvidence: db.civicEvidence || false,
      dgidbInteractions: db.dgidbInteractions || false,
      expressionStats: stats,
    };
  });
}
