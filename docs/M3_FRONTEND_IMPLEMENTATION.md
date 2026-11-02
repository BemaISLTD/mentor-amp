# M3 Frontend Workflows

The M3 governance screens are available in the left navigation:

- **Formula Studio**: select a model/version or open it from the Formula Library or Model Workspace. A selected version is addressable at `/models/{modelId}/versions/{versionId}/formulas`.
- **Benchmarks**: manage expected-result datasets for the active project at `/projects/{projectId}/benchmarks`.
- **Reconciliation**: choose a recent run or enter a run ID. A selected run is addressable at `/runs/{runId}/reconciliation`.

The workflows use the configured `VITE_API_BASE_URL`, the signed-in user's existing API token, and project-scoped backend permissions. The backend remains authoritative for authorization, version mutability, input validation, product/timing compatibility, and reconciliation outcomes.

## Formula Studio

Formula expressions are validated against the selected model version after a 300 ms debounce. The editor highlights DSL functions, numbers, operators, and `prior(...)`; current-step and prior-step variable dependencies are displayed separately. Current and prior input JSON is evaluated through the live preview endpoint after edits. Formula creation and updates save governed test cases; tests run against the saved definition. The dependency modal renders same-step dependencies as solid directed edges and prior-step dependencies as dashed feedback edges.

The app does not currently include Monaco or another editor package. Formula Studio uses a lightweight, syntax-highlighted code textarea to avoid adding a large editor dependency; it supports editing and validation but does not provide Monaco's language services or full IDE conveniences.

## Expected Results

Upload supports CSV and JSON files up to 10 MB and 50,000 data rows. CSV uses the backend multipart contract. JSON is sent as `{name, product_code, version_label, granularity, timing_convention, rows, source_reference}`. The backend validates and fingerprints the dataset. Data preview requests include rows and displays at most the first 50.

Benchmark lifecycle status is shown as validated, approved, or superseded. Authorized reviewers can approve validated sets, except that a creator cannot approve their own set; the UI explains and disables self-approval. Superseding a set requires selecting another benchmark in the same project and product. The backend remains authoritative, and its governance error messages are shown to the user.

Governance actions use `POST /v1/expected-results/{id}/approve` and `POST /v1/expected-results/{id}/supersede` (body: `{ "superseded_by_id": "..." }`).

## Reconciliation and review

Runs can be selected from recent Run Sets or entered by ID. Known product mismatches are filtered from benchmark choices; the backend performs final compatibility checks. Report status, comparison breakdowns, source-to-output verification, retained failure cells, benchmark snapshots, and disposition history are displayed from the persisted report.

`PASS`, `FAIL`, and `NOT_VERIFIABLE` are displayed as distinct report states. Only `PASS` reports can be normally approved; `FAIL` and `NOT_VERIFIABLE` require an exception disposition or rejection. Report evidence includes the expected-result set/version, scenario when available, timing and granularity, source verification, failure count, tolerances, disposition, and reviewer. Values are read from backend responses; the frontend does not recalculate actuarial results.

Review actions are shown for roles recognized by the existing frontend review-permission helper; the backend enforces `models:approve` or admin access. The UI offers `exception_noted` because the M3 API accepts it in addition to the three primary modal choices. Exception notes are required to contain at least three characters, matching the backend minimum.

## Backend contract notes

The API schemas were checked against backend commit `f6708d1471e344e0cd6474387fb2ba4f1dce5ce6`:

- API failures use `{ "error": { "code": "...", "message": "...", "details": ... } }`; the frontend also accepts the documented `detail` shape for compatibility.
- Formula groups are loaded from `GET /v1/model-versions/{id}/formula-groups`; formula details come from `GET /v1/formulas/{id}/detail`.
- Formula creation is `POST /v1/model-versions/{id}/formulas`; updates use `PUT /v1/formulas/{id}`.
- Expected-result upload accepts multipart CSV and JSON with a `rows` array.
- Reconciliation reports are persisted and read from `GET /v1/reconciliations/{id}`. The report's summary includes the three-state source check and indicates when retained failures are truncated.
- The backend accepts `exception_noted` and requires notes for both exception dispositions.

## Validation and release checks

The M3 Playwright tests mock backend responses and cover formula workflows, benchmark upload/view/approval/four-eyes/supersede, reconciliation `PASS`/`FAIL`/`NOT_VERIFIABLE` and dispositions, project isolation, and backend error display. Before release, smoke-test the configured backend deployment: the workspace confirms the backend source revision but cannot confirm which revision is deployed. The upload UI shows an accessible busy state, not percentage-based transfer progress.
