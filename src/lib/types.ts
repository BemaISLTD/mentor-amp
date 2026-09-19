// ── File / Data Management ──────────────────────────────────────────────────

export type FileStatus = 'pending' | 'uploaded' | 'validating' | 'validated' | 'failed';

export interface DataFile {
  id: string;
  name: string;
  type: 'inforce' | 'assumption' | 'scenario' | 'factor' | 'asset' | 'product_mapping';
  size: number; // bytes
  uploadedAt: string;
  uploadedBy: string;
  status: FileStatus;
  validationErrors?: string[];
  recordCount?: number;
  version: string;
  description?: string;
  tags?: string[];
}

export interface InforceFile extends DataFile {
  type: 'inforce';
  product: ProductType;
  policyCount: number;
  effectiveDate: string;
  premiumAmount: number;
}

export interface AssumptionTable extends DataFile {
  type: 'assumption';
  assumptionType: 'mortality' | 'lapse' | 'interest' | 'expense' | 'policyholder_behavior' | 'mixed';
  basis: 'company' | 'industry' | 'reinsurance';
}

export interface ScenarioFile extends DataFile {
  type: 'scenario';
  scenarioCount: number;
  scenarioType: 'deterministic' | 'stochastic' | 'stress';
  interestRatePath: string;
}

export interface FactorFile extends DataFile {
  type: 'factor';
  factorType: 'crediting_rate' | 'mortality_improvement' | 'shock_lapse' | 'spread';
}

// ── Products ────────────────────────────────────────────────────────────────

export type ProductType = 'MYGA' | 'SPIA' | 'FIA' | 'RILA' | 'Disability';

export interface Product {
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
}

// ── Projection Runs ─────────────────────────────────────────────────────────

export type RunStatus = 'draft' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ProjectionFrequency = 'monthly' | 'quarterly' | 'annual';
export type OutputGranularity = 'policy' | 'cohort' | 'product' | 'portfolio';

export interface ProjectionRun {
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
  duration?: number; // seconds
  modelVersion: string;
  tags?: string[];
}

export interface RunStatusEvent {
  id: string;
  runId: string;
  timestamp: string;
  status: RunStatus;
  message: string;
  detail?: string;
}

export interface RunMetric {
  label: string;
  value: string | number;
  unit?: string;
  change?: number; // % vs prior run
}

// ── Reports / Results ───────────────────────────────────────────────────────

export interface CashflowRow {
  period: string;
  premiums: number;
  benefits: number;
  claims: number;
  expenses: number;
  netCashflow: number;
  reserves: number;
  scenario: string;
}

export interface ReserveRow {
  period: string;
  product: ProductType;
  grossReserve: number;
  cededReserve: number;
  netReserve: number;
  policyCount: number;
  scenario: string;
}

export interface AccountValueRow {
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

export interface ClaimRow {
  period: string;
  product: ProductType;
  deathClaims: number;
  disabilityClaims: number;
  surrenderValues: number;
  maturityBenefits: number;
  totalClaims: number;
  scenario: string;
}

// ── Settings ────────────────────────────────────────────────────────────────

export interface ModelVersion {
  id: string;
  version: string;
  name: string;
  releaseDate: string;
  status: 'current' | 'deprecated' | 'beta';
  changes: string[];
  products: ProductType[];
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'actuary' | 'analyst' | 'viewer';
  lastLogin: string;
  status: 'active' | 'inactive';
  department: string;
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStat {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: string;
}

export interface RecentActivity {
  id: string;
  type: 'run_completed' | 'run_failed' | 'file_uploaded' | 'file_validated' | 'run_created';
  message: string;
  timestamp: string;
  user: string;
  entityId?: string;
}
