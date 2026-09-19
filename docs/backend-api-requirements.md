# Backend API Requirements

This document lists the backend APIs needed to replace all mock and page-local data in the actuarial platform frontend.

Current mock sources:

- `src/lib/api.ts`: main mock service layer used by most pages.
- `src/lib/mock-data.ts`: static files, products, runs, reports, model versions, users, and activity.
- `src/lib/table-data.ts`: table registry, editable 1D/2D/3D tables, inforce records, and assumption records.
- Page-local mocks in `DashboardPage.tsx`, `ProductDetailPage.tsx`, `RunPages.tsx`, `ReportPages.tsx`, `DataPages.tsx`, and `SettingsPages.tsx`.

Recommended base path: `/api/v1`.

## Shared API Rules

All endpoints should return JSON unless the endpoint is explicitly for file upload or export.

Use ISO-8601 strings for timestamps and `YYYY-MM-DD` strings for actuarial/effective dates. Money and counts should be numeric, not pre-formatted strings. The frontend will handle display formatting.

Recommended list response shape:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 0
  }
}
```

The current frontend can also consume raw arrays during the first integration, but the backend should prefer the wrapper above if pagination will be needed.

Recommended error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": {}
  }
}
```

## Core Enums

```ts
type FileStatus = 'pending' | 'uploaded' | 'validating' | 'validated' | 'failed';
type ProductType = 'MYGA' | 'SPIA' | 'FIA' | 'RILA' | 'Disability';
type RunStatus = 'draft' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
type ProjectionFrequency = 'monthly' | 'quarterly' | 'annual';
type OutputGranularity = 'policy' | 'cohort' | 'product' | 'portfolio';
type UserRole = 'admin' | 'actuary' | 'analyst' | 'viewer';
```

## Authentication And Current User

The app currently has no real auth API, but backend integration should include auth before replacing user mocks.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/auth/login` | Start a session. |
| `POST` | `/auth/logout` | End a session. |
| `GET` | `/auth/me` | Return the current user, role, permissions, and tenant/company context. |
| `POST` | `/auth/refresh` | Refresh session token/cookie if token auth is used. |

`GET /auth/me` should return:

```ts
{
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  permissions: string[];
}
```

## Data Files

These replace `getInforceFiles`, `getAssumptionTables`, `getScenarioFiles`, `getFactorFiles`, `uploadFile`, `validateFile`, and `deleteFile`.

### Shared File Shape

```ts
interface DataFile {
  id: string;
  name: string;
  type: 'inforce' | 'assumption' | 'scenario' | 'factor' | 'asset' | 'product_mapping';
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  status: FileStatus;
  validationErrors?: string[];
  recordCount?: number;
  version: string;
  description?: string;
  tags?: string[];
}
```

### File Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/files?type=inforce` | List inforce files. |
| `GET` | `/files?type=assumption` | List assumption tables/files. |
| `GET` | `/files?type=scenario` | List scenario files. |
| `GET` | `/files?type=factor` | List factor files. |
| `GET` | `/files?type=asset` | List asset portfolio files. |
| `GET` | `/files/{fileId}` | Fetch file metadata/detail. |
| `POST` | `/files` | Multipart upload for any supported file type. |
| `PATCH` | `/files/{fileId}` | Update editable metadata such as name, version, description, tags, product, basis, etc. |
| `POST` | `/files/{fileId}/validate` | Start validation or revalidation. |
| `GET` | `/files/{fileId}/validation` | Return validation state, errors, warnings, and record counts. |
| `DELETE` | `/files/{fileId}` | Delete/archive a file. |
| `GET` | `/files/{fileId}/download` | Download original uploaded file. |

### Specialized File Shapes

```ts
interface InforceFile extends DataFile {
  type: 'inforce';
  product: ProductType;
  policyCount: number;
  effectiveDate: string;
  premiumAmount: number;
}

interface AssumptionTable extends DataFile {
  type: 'assumption';
  assumptionType: 'mortality' | 'lapse' | 'interest' | 'expense' | 'policyholder_behavior' | 'mixed';
  basis: 'company' | 'industry' | 'reinsurance';
}

interface ScenarioFile extends DataFile {
  type: 'scenario';
  scenarioCount: number;
  scenarioType: 'deterministic' | 'stochastic' | 'stress';
  interestRatePath: string;
}

interface FactorFile extends DataFile {
  type: 'factor';
  factorType: 'crediting_rate' | 'mortality_improvement' | 'shock_lapse' | 'spread';
}
```

## File Record Viewers

These replace `inforceRecords`, `assumptionRecords`, `scenarioRows`, and `factorRows`. They are used by spreadsheet-style modals and need row-level edit support.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/files/{fileId}/records` | Return parsed records for a file. Supports pagination/filtering. |
| `PATCH` | `/files/{fileId}/records/{recordId}` | Update one parsed record/cell row. |
| `DELETE` | `/files/{fileId}/records/{recordId}` | Delete one parsed record. |
| `POST` | `/files/{fileId}/records` | Add one parsed record if manual entry is allowed. |
| `POST` | `/files/{fileId}/records/bulk` | Bulk update parsed records. |

Suggested query params: `page`, `pageSize`, `search`, `sort`, `section`, `scenarioId`, `product`, `status`.

### Inforce Record Shape

```ts
{
  id: string;
  policyNo: string;
  insuredName: string;
  product: string;
  issueDate: string;
  issueAge: number;
  gender: 'M' | 'F' | 'U';
  smokerStatus: 'SM' | 'NS' | string;
  stateName: string;
  premium: number;
  accountValue: number;
  surrenderValue: number;
  guaranteedRate: number;
  guaranteePeriod: number;
  surrenderChargeYr: number;
  status: 'Active' | 'Surrender' | 'Death' | string;
  beneficiaryName?: string;
  agentCode?: string;
}
```

### Assumption Record Shape

```ts
{
  id: string;
  tableId: string;
  section: string;
  subType: string;
  age: number | 'N/A';
  duration: string;
  value: number;
  unit: string;
  basis: string;
  effectiveDate: string;
}
```

### Scenario Record Shape

```ts
{
  id: string;
  scenarioId: string;
  type: 'Base' | 'Stress' | 'Stochastic' | string;
  description: string;
  yr1Rate: number;
  yr5Rate: number;
  yr10Rate: number;
  yr20Rate: number;
  yr30Rate: number;
  equity: number;
  credit: number;
  inflation: number;
}
```

### Factor Record Shape

```ts
{
  id: string;
  product: string;
  duration: string;
  rateGroup: string;
  factor: number;
  unit: string;
  effectiveDate: string;
  expiryDate: string;
  notes?: string;
}
```

## Asset Positions

These replace `mockAssets` in `DataPages.tsx`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/assets/positions` | List asset portfolio positions/files. |
| `GET` | `/assets/positions/{assetId}` | Fetch one asset record. |
| `POST` | `/assets/positions/upload` | Upload asset portfolio file. |
| `PATCH` | `/assets/positions/{assetId}` | Update asset metadata. |
| `DELETE` | `/assets/positions/{assetId}` | Delete/archive asset record. |
| `GET` | `/assets/summary` | Return total market value, average duration, average yield, and breakdowns. |

Shape:

```ts
{
  id: string;
  name: string;
  type: 'Treasury' | 'IG Corporate' | 'High Yield' | 'MBS/ABS' | 'Municipal' | 'Equity' | string;
  marketValue: number;
  bookValue: number;
  duration: number;
  yield_pct: number;
  date: string;
  cusip?: string;
  quantity?: number;
}
```

## Product Mapping

These replace `mockMappings` in `DataPages.tsx`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/product-mappings` | List mappings from admin system products to actuarial model codes. |
| `POST` | `/product-mappings` | Create a mapping. |
| `GET` | `/product-mappings/{mappingId}` | Fetch one mapping. |
| `PATCH` | `/product-mappings/{mappingId}` | Update a mapping. |
| `DELETE` | `/product-mappings/{mappingId}` | Delete/deactivate a mapping. |

Shape:

```ts
{
  id: string;
  adminCode: string;
  productCode: ProductType;
  modelCode: string;
  rateGroup: string;
  description?: string;
  active: boolean;
}
```

## Actuarial Table Registry

These replace `allTables` and editable 1D/2D/3D table data in `table-data.ts`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/tables` | List all actuarial tables. |
| `GET` | `/tables/{tableId}` | Fetch one table including full rows/data. |
| `POST` | `/tables` | Create a vector/matrix/cube table. |
| `PATCH` | `/tables/{tableId}` | Update table metadata. |
| `PUT` | `/tables/{tableId}/data` | Replace table data after edits. |
| `PATCH` | `/tables/{tableId}/cells` | Patch one or more cells. |
| `DELETE` | `/tables/{tableId}` | Delete/archive a table. |
| `POST` | `/tables/{tableId}/versions` | Save a new version. |
| `GET` | `/tables/{tableId}/versions` | List historical versions. |

Shapes:

```ts
type AnyTable = VectorTable | Matrix2DTable | Cube3DTable;

interface VectorTable {
  id: string;
  name: string;
  dimension: '1D';
  description: string;
  rowLabel: string;
  valueLabel: string;
  unit: string;
  rows: { key: string; value: number }[];
}

interface Matrix2DTable {
  id: string;
  name: string;
  dimension: '2D';
  description: string;
  rowLabel: string;
  colLabel: string;
  valueLabel: string;
  unit: string;
  rows: string[];
  cols: string[];
  data: number[][];
}

interface Cube3DTable {
  id: string;
  name: string;
  dimension: '3D';
  description: string;
  axisLabels: [string, string, string];
  valueLabel: string;
  unit: string;
  axes: [string[], string[], string[]];
  data: number[][][];
}
```

## Products

These replace `getProducts`, `getProduct`, static product descriptions, product cohort chart data, and lapse curve data.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/products` | List products. |
| `GET` | `/products/{productCodeOrId}` | Fetch product detail. |
| `POST` | `/products` | Create a product if product management is required. |
| `PATCH` | `/products/{productId}` | Update product metadata. |
| `GET` | `/products/{productCode}/metrics` | Product KPI metrics. |
| `GET` | `/products/{productCode}/cohort-cashflows` | Product detail cohort chart/table. |
| `GET` | `/products/{productCode}/lapse-curve` | Product detail base/stress lapse curves. |
| `GET` | `/products/{productCode}/regulatory-framework` | Product regulatory/accounting framework bullets. |

Product shape:

```ts
{
  id: string;
  code: ProductType;
  name: string;
  description: string;
  launchDate: string;
  status: 'active' | 'discontinued' | 'in_development';
  policyCount: number;
  totalPremium: number;
  totalReserve: number;
  defaultAssumptionTable?: string;
  modelVersion: string;
  features?: string[];
  regulatoryFramework?: string[];
}
```

## Projection Runs

These replace `getRuns`, `getRun`, `createRun`, `submitRun`, `cancelRun`, `deleteRun`, `getRunEvents`, and `summaryMetricsData`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/runs` | List projection runs. Supports filters by status, product, createdBy, date range. |
| `POST` | `/runs` | Create a draft run from selected input files and projection config. |
| `GET` | `/runs/{runId}` | Fetch run detail. |
| `PATCH` | `/runs/{runId}` | Update draft run metadata/config. |
| `POST` | `/runs/{runId}/submit` | Submit draft run to queue. |
| `POST` | `/runs/{runId}/cancel` | Cancel queued/running run. |
| `DELETE` | `/runs/{runId}` | Delete/archive run. |
| `GET` | `/runs/{runId}/events` | Run status timeline. |
| `GET` | `/runs/{runId}/summary` | Summary metrics used by run detail result chart. |
| `GET` | `/runs/{runId}/downloads/results` | Download complete result package. |
| `GET` | `/runs/active` | List queued/running runs for status monitor. |

Run shape:

```ts
{
  id: string;
  name: string;
  description?: string;
  product: ProductType;
  inforceFileId: string;
  inforceFileName: string;
  assumptionTableId: string;
  assumptionTableName: string;
  scenarioFileId: string;
  scenarioFileName: string;
  factorFileId?: string;
  factorFileName?: string;
  projectionFrequency: ProjectionFrequency;
  projectionStartDate: string;
  projectionEndDate: string;
  outputGranularity: OutputGranularity;
  status: RunStatus;
  createdAt: string;
  createdBy: string;
  startedAt?: string;
  completedAt?: string;
  progressPct?: number;
  errorMessage?: string;
  scenarioCount: number;
  policyCount: number;
  duration?: number;
  modelVersion: string;
  tags?: string[];
}
```

Create run request:

```ts
{
  name: string;
  description?: string;
  product: ProductType;
  inforceFileId: string;
  assumptionTableId: string;
  scenarioFileId: string;
  factorFileId?: string;
  projectionFrequency: ProjectionFrequency;
  projectionStartDate: string;
  projectionEndDate: string;
  outputGranularity: OutputGranularity;
}
```

Run event shape:

```ts
{
  id: string;
  runId: string;
  timestamp: string;
  status: RunStatus;
  message: string;
  detail?: string;
}
```

Run summary row:

```ts
{
  period: string;
  reserve: number;
  cashflow: number;
  av: number;
}
```

## Reports And Exports

These replace `getCashflows`, `getReserves`, `getAccountValues`, `getClaims`, plus page-local benefits, fees, reconciliation, downloadable reports, and export buttons.

All report endpoints should support at least `runId`, `scenario`, `product`, `fromPeriod`, `toPeriod`, and `format` where relevant.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/runs/{runId}/reports/cashflows` | Cashflow rows and scenario-specific data. |
| `GET` | `/runs/{runId}/reports/reserves` | Gross/ceded/net reserves. |
| `GET` | `/runs/{runId}/reports/account-values` | Account value rollforward. |
| `GET` | `/runs/{runId}/reports/claims` | Claim rows. |
| `GET` | `/runs/{runId}/reports/benefits` | Benefits report. |
| `GET` | `/runs/{runId}/reports/fees` | Fees report. |
| `GET` | `/runs/{runId}/reports/reconciliation` | Reserve bridge/reconciliation report. |
| `GET` | `/runs/{runId}/reports/scenario-comparison` | Cross-scenario comparison for download/report list. |
| `GET` | `/runs/{runId}/reports` | List available reports for run detail page. |
| `GET` | `/runs/{runId}/reports/{reportType}/export?format=csv` | Export report as CSV. |
| `GET` | `/runs/{runId}/reports/{reportType}/export?format=xlsx` | Export report as Excel. |

Cashflow row:

```ts
{
  period: string;
  premiums: number;
  benefits: number;
  claims: number;
  expenses: number;
  netCashflow: number;
  reserves: number;
  scenario: string;
}
```

Reserve row:

```ts
{
  period: string;
  product: ProductType;
  grossReserve: number;
  cededReserve: number;
  netReserve: number;
  policyCount: number;
  scenario: string;
}
```

Account value row:

```ts
{
  period: string;
  beginningAV: number;
  premiums: number;
  credited: number;
  withdrawals: number;
  surrenders: number;
  deaths: number;
  endingAV: number;
  scenario: string;
}
```

Claim row:

```ts
{
  period: string;
  product: ProductType;
  deathClaims: number;
  disabilityClaims: number;
  surrenderValues: number;
  maturityBenefits: number;
  totalClaims: number;
  scenario: string;
}
```

Benefits row:

```ts
{
  period: string;
  guaranteedBenefits: number;
  livingBenefits: number;
  deathBenefits: number;
  annuityPayments: number;
}
```

Fees row:

```ts
{
  period: string;
  adminFees: number;
  mortalityCharges: number;
  surrenderCharges: number;
  riderCharges: number;
  investmentMgmt: number;
}
```

Reconciliation row:

```ts
{
  label: string;
  prior: number;
  current: number;
  variance: number;
  pct: number | null;
  commentary?: string;
}
```

## Dashboard

These replace `getDashboardStats`, `getRecentActivity`, `chartData`, and `productMix`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/dashboard/stats` | KPI cards. |
| `GET` | `/dashboard/activity` | Recent activity feed. |
| `GET` | `/dashboard/reserve-premium-trend` | 6-month reserve/premium/cashflow trend chart. |
| `GET` | `/dashboard/product-mix` | Reserve/premium/policy breakdown by product. |
| `GET` | `/dashboard/recent-runs` | Latest runs, or frontend can use `/runs?limit=5`. |

Dashboard stats:

```ts
{
  totalRuns: number;
  completedRuns: number;
  activeRuns: number;
  totalPolicies: number;
  totalReserve: number;
  totalPremium: number;
  failedRuns: number;
  reserveChangePct?: number;
  premiumChangePct?: number;
  newPoliciesCount?: number;
}
```

Activity:

```ts
{
  id: string;
  type: 'run_completed' | 'run_failed' | 'file_uploaded' | 'file_validated' | 'run_created';
  message: string;
  timestamp: string;
  user: string;
  entityId?: string;
}
```

Trend row:

```ts
{
  period: string;
  reserve: number;
  premium: number;
  cashflow: number;
}
```

Product mix row:

```ts
{
  product: ProductType | 'DI';
  reserve: number;
  premium: number;
  policies: number;
}
```

## Settings: Product Assumptions

These replace `assumptionSettings` in `SettingsPages.tsx`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/settings/product-assumptions` | List product-level assumption settings. |
| `POST` | `/settings/product-assumptions` | Create an assumption set. |
| `PATCH` | `/settings/product-assumptions/{setId}` | Update set metadata. |
| `POST` | `/settings/product-assumptions/{setId}/items` | Add assumption item. |
| `PATCH` | `/settings/product-assumptions/{setId}/items/{itemId}` | Update assumption item. |
| `DELETE` | `/settings/product-assumptions/{setId}/items/{itemId}` | Delete assumption item. |

Shape:

```ts
{
  id: string;
  product: ProductType;
  table: string;
  tableId?: string;
  version: string;
  lastUpdated: string;
  assumptions: {
    id: string;
    name: string;
    basis: string;
    status: 'current' | 'review' | 'deprecated';
    value: string;
    effectiveDate: string;
  }[];
}
```

## Settings: Model Versions

These replace `getModelVersions`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/model-versions` | List model versions. |
| `POST` | `/model-versions` | Create/register a model version. |
| `GET` | `/model-versions/{modelVersionId}` | Fetch model version detail. |
| `PATCH` | `/model-versions/{modelVersionId}` | Update model version metadata/status. |
| `DELETE` | `/model-versions/{modelVersionId}` | Delete/archive model version. |
| `POST` | `/model-versions/{modelVersionId}/activate` | Mark as current production version. |
| `POST` | `/model-versions/{modelVersionId}/beta-access` | Request/enable beta access. |

Shape:

```ts
{
  id: string;
  version: string;
  name: string;
  releaseDate: string;
  status: 'current' | 'deprecated' | 'beta';
  changes: string[];
  products: ProductType[];
}
```

## Settings: Users, Roles, System

These replace `getUsers`, the invite dialog local state, the role matrix, and static system cards.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/users` | List users. |
| `POST` | `/users/invitations` | Invite a user. |
| `GET` | `/users/{userId}` | Fetch user detail. |
| `PATCH` | `/users/{userId}` | Update user profile, role, department, or status. |
| `DELETE` | `/users/{userId}` | Deactivate/delete user. |
| `GET` | `/roles` | List roles. |
| `GET` | `/roles/permissions-matrix` | Return role permissions table. |
| `GET` | `/settings/system` | System settings cards: compute, retention, integrations, governance. |
| `PATCH` | `/settings/system` | Update editable system settings if supported. |

User shape:

```ts
{
  id: string;
  name: string;
  email: string;
  role: UserRole;
  lastLogin: string;
  status: 'active' | 'inactive';
  department: string;
}
```

Invitation request:

```ts
{
  email: string;
  role: UserRole;
}
```

Permission matrix shape:

```ts
{
  permissions: {
    key: string;
    label: string;
    viewer: boolean;
    analyst: boolean;
    actuary: boolean;
    admin: boolean;
  }[];
}
```

System settings shape:

```ts
{
  sections: {
    id: string;
    title: string;
    items: {
      key: string;
      label: string;
      value: string | number | boolean;
      editable?: boolean;
    }[];
  }[];
}
```

## Backend-Powered Derived Values

Several screens currently compute summary cards from local arrays. The backend can either return raw rows and let the frontend compute totals, or provide summary endpoints. Prefer backend summaries for large datasets.

Required summaries:

- Scenario file counts by scenario type.
- Asset total market value, average duration, average yield.
- Run counts by status.
- Report totals for premiums, benefits, claims, expenses, reserves, account values, fees, and reconciliation.
- Product-level policy count, premium, reserve, average premium per policy, reserve-to-premium ratio.
- Dashboard period-over-period changes.

## Integration Priority

1. Auth/current user, products, files, runs, and dashboard stats.
2. File upload, validation, records, and table registry.
3. Run execution lifecycle and report result endpoints.
4. Settings APIs for users, roles, model versions, system settings, and product assumptions.
5. Export/download endpoints and historical versioning/audit endpoints.

## Minimum API Set To Remove The Main Mock Layer

If the first backend milestone is only to replace `src/lib/api.ts`, implement these first:

- `GET /files?type=inforce`
- `GET /files?type=assumption`
- `GET /files?type=scenario`
- `GET /files?type=factor`
- `POST /files`
- `POST /files/{fileId}/validate`
- `DELETE /files/{fileId}`
- `GET /products`
- `GET /products/{productId}`
- `GET /runs`
- `POST /runs`
- `GET /runs/{runId}`
- `POST /runs/{runId}/submit`
- `POST /runs/{runId}/cancel`
- `DELETE /runs/{runId}`
- `GET /runs/{runId}/events`
- `GET /runs/{runId}/reports/cashflows`
- `GET /runs/{runId}/reports/reserves`
- `GET /runs/{runId}/reports/account-values`
- `GET /runs/{runId}/reports/claims`
- `GET /model-versions`
- `GET /users`
- `GET /dashboard/activity`
- `GET /dashboard/stats`
