# Architecture rules
- Keep cohort state and navigation-persistent selections in GeneDataContext; reset them only when replacing the cohort.
- Use stable per-upload row IDs for annotations, expressions, navigation and reporting because symbols can be duplicated or resolved independently.
- Preserve uploaded gene symbols and store canonical resolution separately; identity changes must not disconnect uploaded measurements.
- Share environment-neutral gene lookup logic between browser enrichment and MCP tools; retain per-source status so failures are never negative findings.
- Validate complete upload data before committing state and require column confirmation when inference is ambiguous.
- Keep ingestion, statistics, role presentation and download formatting in focused shared modules so views do not implement divergent rules.
- Treat generated integration files as SDK-owned; author MCP tools in source and extract the manifest after changes.
