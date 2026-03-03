# AccelBio Gene Annotator

**A browser-based gene annotation and clinical evidence explorer for cancer genomics research.**

> ⚠️ **Disclaimer**: This tool is for **research and educational purposes only**. It is not a diagnostic or clinical decision-making tool. All annotations are derived from curated public databases and sample data.

**Live App**: [accelbio-genes-annotator.lovable.app](https://accelbio-genes-annotator.lovable.app/)

---

## 🎯 Purpose

AccelBio Gene Annotator helps researchers quickly annotate a list of genes with:

- **Genomic identifiers** (Ensembl, Entrez)
- **Functional roles** (Oncogene, Tumor Suppressor, Kinase, DNA Repair, TF, Immune)
- **Cancer relevance** narratives
- **Clinical evidence** status (CIViC, DGIdb)
- **Expression statistics** (mean, median, min, max, outlier %)

Upload your own gene expression data or explore a built-in demo dataset of 12 well-characterized cancer genes.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **JSON Upload** | Drag-and-drop or browse to load your gene expression data |
| **Demo Dataset** | One-click load of 12 cancer genes × 8 samples |
| **Gene Annotation Table** | Sortable, filterable table with role badges and expression stats |
| **Gene Detail View** | Tabbed layout: Summary, Clinical Evidence, Druggability, Expression Context |
| **Expression Charts** | Per-gene bar charts with mean reference line (Recharts) |
| **Report Builder** | Select genes, toggle fields, export as CSV or JSON |
| **Schema Preview** | Instant preview of uploaded data structure |
| **External Links** | Direct links to GeneCards, NCBI, OncoKB, CIViC, DGIdb |

---

## 📦 Installation

Requires [Node.js](https://nodejs.org/) (v18+) and npm.

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd accelbio-genes-annotator

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📂 Expected Input File Format

The app accepts a **JSON file** with two top-level keys:

### Format A — `values` object (recommended)

```json
{
  "genes": ["TP53", "BRCA1", "EGFR"],
  "expressions": [
    { "gene": "TP53",  "values": { "Sample_1": 5.2, "Sample_2": 3.1, "Sample_3": 8.7 } },
    { "gene": "BRCA1", "values": { "Sample_1": 2.1, "Sample_2": 1.8, "Sample_3": 3.4 } },
    { "gene": "EGFR",  "values": { "Sample_1": 7.8, "Sample_2": 12.3, "Sample_3": 6.5 } }
  ]
}
```

### Format B — `samples` array (also supported)

```json
{
  "genes": ["TP53", "BRCA1"],
  "expressions": [
    {
      "gene": "TP53",
      "samples": [
        { "sampleId": "Sample_1", "value": 5.2 },
        { "sampleId": "Sample_2", "value": 3.1 }
      ]
    }
  ]
}
```

### Field Reference

| Field | Type | Description |
|---|---|---|
| `genes` | `string[]` | Array of gene symbols (e.g., `"TP53"`, `"EGFR"`) |
| `expressions` | `object[]` | One entry per gene with expression values per sample |
| `expressions[].gene` | `string` | Gene symbol (must match an entry in `genes`) |
| `expressions[].values` | `Record<string, number>` | Sample ID → expression value mapping |

---

## 🧬 Generating Input from R

If you have an expression matrix (genes in rows, samples in columns), use this R script to convert it to the expected JSON format:

```r
# install.packages("jsonlite")  # if not already installed
library(jsonlite)

# --- Option 1: From a file (TSV/CSV with gene symbols in first column) ---
expr_matrix <- read.delim("expression_matrix.tsv", row.names = 1, check.names = FALSE)

# --- Option 2: From a Bioconductor SummarizedExperiment ---
# expr_matrix <- as.data.frame(assay(se))

# Build the JSON structure
genes <- rownames(expr_matrix)
expressions <- lapply(genes, function(g) {
  vals <- as.list(expr_matrix[g, ])
  list(gene = g, values = vals)
})

output <- list(
  genes = genes,
  expressions = expressions
)

# Write to file
write_json(output, "gene_data.json", auto_unbox = TRUE, pretty = TRUE)

cat("Wrote", length(genes), "genes ×", ncol(expr_matrix), "samples to gene_data.json\n")
```

### Example input matrix (`expression_matrix.tsv`)

```
        Sample_1  Sample_2  Sample_3
TP53    5.2       3.1       8.7
BRCA1   2.1       1.8       3.4
EGFR    7.8       12.3      6.5
```

---

## 🗂️ Project Structure

```
├── public/                     # Static assets
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives (Button, Card, Tabs, etc.)
│   │   ├── DisclaimerBanner.tsx # Research-use-only banner
│   │   ├── GeneTable.tsx       # Main gene annotation table
│   │   ├── NavLink.tsx         # Navigation link component
│   │   ├── ReportBuilder.tsx   # Export gene reports as CSV/JSON
│   │   ├── SchemaPreview.tsx   # Uploaded data structure preview
│   │   └── UploadArea.tsx      # Drag-and-drop JSON upload
│   ├── contexts/
│   │   └── GeneDataContext.tsx # Shared state for gene data & annotations
│   ├── data/
│   │   └── sampleData.ts      # Gene database, annotation logic, demo data
│   ├── hooks/                  # Custom React hooks
│   ├── lib/
│   │   └── utils.ts           # Utility functions (cn, etc.)
│   ├── pages/
│   │   ├── GeneDetail.tsx     # Gene detail view with tabbed layout
│   │   ├── Index.tsx          # Main dashboard page
│   │   └── NotFound.tsx       # 404 page
│   ├── App.tsx                # Router & layout
│   ├── index.css              # Design tokens & global styles
│   └── main.tsx               # Entry point
├── tailwind.config.ts          # Tailwind configuration
├── vite.config.ts              # Vite build configuration
└── package.json
```

---

## 🛠️ Tech Stack

- **React 18** + **TypeScript** — UI framework
- **Vite** — Build tool with HMR
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Accessible component primitives
- **Recharts** — Expression data visualization
- **React Router** — Client-side routing

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🔗 Powered by [AccelBio](https://accelbio.pt/)
