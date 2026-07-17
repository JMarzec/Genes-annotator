import { auth, defineMcp } from "@lovable.dev/mcp-js";
import lookupGeneTool from "./tools/lookup-gene";
import lookupGenesBatchTool from "./tools/lookup-genes-batch";

// The OAuth issuer must be the direct Supabase host (not the .lovable.cloud proxy).
// Read the project ref from Vite's build-time inlined env so the entry stays
// import-safe (no runtime env reads at module top level).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "oncogene-annotator-mcp",
  title: "OncoGene Annotator",
  version: "0.1.0",
  instructions:
    "Cancer-gene annotation tools. Use `lookup_gene` for a single HGNC symbol (full metadata + CIViC evidence + DGIdb drugs). Use `lookup_genes_batch` for compact counts across up to 40 symbols. Data comes from public sources (CIViC, DGIdb, MyGene.info) and is for research use only.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [lookupGeneTool, lookupGenesBatchTool],
});
