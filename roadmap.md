# Approved review repairs
- [x] Validate ingestion, preserve duplicate rows and measurements, confirm ambiguous columns.
- [x] Protect current upload from stale requests; preserve selection/filter state.
- [x] Share lookup logic, preserve uploaded symbols, resolve aliases and source failures explicitly.
- [x] Correct detail navigation, source displays, exports, and statistics; consolidate shared utilities.
- [x] Repair OAuth and MCP identity, extract manifest, update documentation and lint scope.
- [x] Run regression tests and real upload/detail/export checks; request fresh security scan.

## External verification blocker
- [ ] Complete hosted OAuth approve/deny and social sign-in end-to-end after the user creates an account and republishes; this app currently has no auth users. Return-path and decision failures are covered by tests, and the hosted OAuth configuration check passed.
