# Sam — MentorAMP M3 Frontend Handoff

**Status:** M3 governance integration corrections implemented and verified
**Scope:** Formula Studio, Expected Results benchmark management, Run Reconciliation, and M3 visual styling

## Summary

The M3 frontend workflows have been implemented and connected to the backend API. The screens are available in the main navigation and support their API-backed workflows, loading/error states, deep links, and role-aware review actions.

The M3 visual design was subsequently aligned with the existing MentorAMP workspace: duplicated page headers are hidden on these screens, the project context slug is displayed as a compact pill at the top-left of the top bar, and tabs, buttons, tables, and panels use the app's established lime-accented visual language. These refinements are scoped to the M3 screens.

## Delivered workflows

### Formula Studio

- Select a model and version, including draft versions; deep-link to a model/version's formulas.
- Browse formulas by group and create or edit formulas where the user's role and version status allow it.
- Edit the Python-like formula DSL in a lightweight syntax-highlighted editor.
- Validate expressions after a 300 ms debounce, show dependencies and unknown variables, and preview current/prior inputs.
- Run saved governed test cases and inspect individual results.
- Inspect dependency analysis, execution order, and same-step versus prior-step dependencies.

### Expected Results benchmarks

- Upload CSV or JSON benchmark data with product, version, granularity, and timing metadata.
- Support drag-and-drop or file browsing; enforce the 10 MB and 50,000-row limits in the UI.
- List benchmark metadata and fingerprints, copy fingerprints, and inspect up to 50 preview rows.
- Approve validated sets as a non-creator reviewer; show validated/approved/superseded states and backend governance errors.
- Supersede a benchmark with a selected same-project, same-product successor.
- Refresh the list and surface upload, validation, and preview errors.

### Run Reconciliation

- Select a recent run or enter a run ID; show run and project context and filter benchmarks by product.
- Configure comparison level and tolerances, with optional variable and policy filters.
- Display persisted PASS/FAIL/NOT_VERIFIABLE reports as distinct states, with summary metrics, variable/level breakdowns, source verification, and failure cells.
- Preserve expected-result set/version, scenario, timing/granularity, failure count, tolerances, disposition, and reviewer evidence from backend responses.
- Open a role-gated actuary sign-off dialog; permit ordinary approval only for PASS reports. Record supported exception dispositions and rejection to audit history.
- Map the live backend report's summary aliases and source-verification shape into the UI.


## Important implementation notes

- Formula Studio uses a lightweight syntax-highlighted textarea rather than Monaco. Monaco was not installed, and no new editor dependency was introduced.
- Benchmark uploads show an accessible busy state, not percentage-based progress.
- The backend remains authoritative for authorization, input validation, version mutability, compatibility, and reconciliation outcomes.
- The frontend recognizes reviewer roles through the existing permission helper; the backend enforces approval permissions.
- Exception notes require at least three characters, matching the backend minimum.

## Latest E2E coverage

The M3 Playwright suite covers Formula Studio validation/preview/test/graph flows; benchmark upload/view, approval, four-eyes self-approval prevention, supersede, and backend error display; reconciliation PASS/FAIL/NOT_VERIFIABLE and disposition restrictions; and project isolation/error handling.

Verification: production build and lint pass; all 14 M3 Playwright tests pass. The production bundler still emits its existing advisory that the main JavaScript chunk exceeds 500 kB; the build succeeds. Branch, commit SHA, clean status, and changed-file inventory are reported alongside this handoff.
