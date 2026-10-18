import { auth, defineMcp } from "@lovable.dev/mcp-js";
import lookupGeneTool from "./tools/lookup-gene";
import lookupGenesBatchTool from "./tools/lookup-genes-batch";

// The OAuth issuer must be the direct Supabase host (not the .lovable.cloud proxy).
// Read the project ref from Vite's build-time inlined env so the entry stays
// import-safe (no runtime env reads at module top level).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "gene-annotator",
  title: "Gene Annotator",
  version: "0.1.0",
  instructions:
    "Cancer-gene annotation tools. Use `lookup_gene` for a single HGNC symbol (full metadata + CIViC evidence + DGIdb drugs). Use `lookup_genes_batch` for compact counts across up to 40 symbols. Unavailable source results are null, not zero. Preserve input rows; ambiguous aliases are unresolved. Data comes from public sources (CIViC, DGIdb, MyGene.info) and is for research use only.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
    requireOAuthClientClaim: true,
  }),
  tools: [lookupGeneTool, lookupGenesBatchTool],
});
