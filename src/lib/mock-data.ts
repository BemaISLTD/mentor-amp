import type {
  InforceFile, AssumptionTable, ScenarioFile, FactorFile,
  Product, ProjectionRun, RunStatusEvent, ModelVersion,
  SystemUser, RecentActivity, CashflowRow, ReserveRow,
  AccountValueRow, ClaimRow, DataFile,
} from './types';

// ── Inforce Files ────────────────────────────────────────────────────────────

export const mockInforceFiles: InforceFile[] = [
  {
    id: 'inf-001', name: 'MYGA_Inforce_Q42024.csv', type: 'inforce',
    product: 'MYGA', size: 4_820_480, uploadedAt: '2024-12-15T09:23:00Z',
    uploadedBy: 'sarah.chen@company.com', status: 'validated',
    recordCount: 18_452, policyCount: 18_452, version: '1.0',
    effectiveDate: '2024-12-31', premiumAmount: 2_140_000_000,
    description: 'Q4 2024 MYGA inforce extract from admin system',
    tags: ['production', 'Q4-2024'],
  },
  {
    id: 'inf-002', name: 'SPIA_Inforce_Q42024.csv', type: 'inforce',
    product: 'SPIA', size: 1_234_567, uploadedAt: '2024-12-15T10:05:00Z',
    uploadedBy: 'james.park@company.com', status: 'validated',
    recordCount: 5_233, policyCount: 5_233, version: '1.0',
    effectiveDate: '2024-12-31', premiumAmount: 780_000_000,
    description: 'Q4 2024 SPIA inforce extract',
    tags: ['production', 'Q4-2024'],
  },
  {
    id: 'inf-003', name: 'FIA_Inforce_Q42024.csv', type: 'inforce',
    product: 'FIA', size: 6_100_000, uploadedAt: '2024-12-16T08:45:00Z',
    uploadedBy: 'sarah.chen@company.com', status: 'validated',
    recordCount: 22_187, policyCount: 22_187, version: '1.0',
    effectiveDate: '2024-12-31', premiumAmount: 3_450_000_000,
    description: 'Q4 2024 FIA inforce extract including index riders',
    tags: ['production', 'Q4-2024'],
  },
  {
    id: 'inf-004', name: 'RILA_Inforce_Q42024.csv', type: 'inforce',
    product: 'RILA', size: 2_890_000, uploadedAt: '2024-12-16T11:30:00Z',
    uploadedBy: 'michael.ross@company.com', status: 'validating',
    recordCount: 8_764, policyCount: 8_764, version: '1.0',
    effectiveDate: '2024-12-31', premiumAmount: 1_220_000_000,
    description: 'Q4 2024 RILA inforce — validation in progress',
    tags: ['production', 'Q4-2024'],
  },
  {
    id: 'inf-005', name: 'Disability_Inforce_Q42024.csv', type: 'inforce',
    product: 'Disability', size: 950_000, uploadedAt: '2024-12-17T14:00:00Z',
    uploadedBy: 'lisa.tran@company.com', status: 'failed',
    recordCount: 0, policyCount: 0, version: '1.0',
    effectiveDate: '2024-12-31', premiumAmount: 0,
    description: 'Q4 2024 DI inforce — failed schema validation',
    validationErrors: [
      'Column "ISSUE_DATE" missing from header row',
      'Invalid premium format in rows 1023–1098',
    ],
    tags: ['production', 'Q4-2024'],
  },
  {
    id: 'inf-006', name: 'MYGA_Inforce_Q32024.csv', type: 'inforce',
    product: 'MYGA', size: 4_650_000, uploadedAt: '2024-09-30T09:00:00Z',
    uploadedBy: 'sarah.chen@company.com', status: 'validated',
    recordCount: 17_890, policyCount: 17_890, version: '1.0',
    effectiveDate: '2024-09-30', premiumAmount: 2_080_000_000,
    description: 'Q3 2024 MYGA inforce — prior quarter',
    tags: ['archive', 'Q3-2024'],
  },
];

// ── Assumption Tables ────────────────────────────────────────────────────────

export const mockAssumptionTables: AssumptionTable[] = [
  {
    id: 'asmp-001', name: 'BaseAssumptions_2024.xlsx', type: 'assumption',
    assumptionType: 'mixed', basis: 'company',
    size: 890_000, uploadedAt: '2024-11-01T09:00:00Z',
    uploadedBy: 'james.park@company.com', status: 'validated',
    recordCount: 1_240, version: '3.2',
    description: 'Company best estimate assumptions — all products 2024 basis',
    tags: ['BE', '2024-basis'],
  },
  {
    id: 'asmp-002', name: 'Mortality_2015VBT.xlsx', type: 'assumption',
    assumptionType: 'mortality', basis: 'industry',
    size: 450_000, uploadedAt: '2024-06-15T10:30:00Z',
    uploadedBy: 'sarah.chen@company.com', status: 'validated',
    recordCount: 2_048, version: '1.0',
    description: '2015 VBT ultimate mortality table with improvement',
    tags: ['mortality', 'VBT2015'],
  },
  {
    id: 'asmp-003', name: 'LapseAssumptions_PH_Behavior.xlsx', type: 'assumption',
    assumptionType: 'policyholder_behavior', basis: 'company',
    size: 320_000, uploadedAt: '2024-08-20T14:15:00Z',
    uploadedBy: 'michael.ross@company.com', status: 'validated',
    recordCount: 780, version: '2.1',
    description: 'Dynamic lapse and surrender rates by product / duration',
    tags: ['lapse', 'behavior'],
  },
  {
    id: 'asmp-004', name: 'ExpenseAssumptions_2024.xlsx', type: 'assumption',
    assumptionType: 'expense', basis: 'company',
    size: 185_000, uploadedAt: '2024-10-10T11:00:00Z',
    uploadedBy: 'lisa.tran@company.com', status: 'validated',
    recordCount: 340, version: '1.3',
    description: 'Per policy and per premium expense assumptions',
    tags: ['expense'],
  },
  {
    id: 'asmp-005', name: 'ReinsuranceAssumptions_Treaty_A.xlsx', type: 'assumption',
    assumptionType: 'mixed', basis: 'reinsurance',
    size: 265_000, uploadedAt: '2024-09-05T09:45:00Z',
    uploadedBy: 'james.park@company.com', status: 'validated',
    recordCount: 520, version: '1.0',
    description: 'Reinsurance treaty assumptions — Treaty A YRT rates',
    tags: ['reinsurance', 'treaty-A'],
  },
];

// ── Scenario Files ───────────────────────────────────────────────────────────

export const mockScenarioFiles: ScenarioFile[] = [
  {
    id: 'scen-001', name: 'ACLI_Prescribed_200_Scenarios.csv', type: 'scenario',
    scenarioCount: 200, scenarioType: 'stochastic', interestRatePath: 'ACLI',
    size: 12_500_000, uploadedAt: '2024-11-15T10:00:00Z',
    uploadedBy: 'sarah.chen@company.com', status: 'validated',
    recordCount: 200, version: '2024-Q4',
    description: 'ACLI prescribed 200 stochastic interest rate scenarios for AG43/VM-21',
    tags: ['ACLI', 'prescribed', 'stochastic'],
  },
  {
    id: 'scen-002', name: 'BaseScenario_SingleDeterministic.csv', type: 'scenario',
    scenarioCount: 1, scenarioType: 'deterministic', interestRatePath: 'flat_forward',
    size: 45_000, uploadedAt: '2024-10-01T08:30:00Z',
    uploadedBy: 'james.park@company.com', status: 'validated',
    recordCount: 1, version: '1.0',
    description: 'Single deterministic best estimate scenario — flat forward curve',
    tags: ['deterministic', 'base'],
  },
  {
    id: 'scen-003', name: 'StressScenarios_IRRate_Shock.csv', type: 'scenario',
    scenarioCount: 12, scenarioType: 'stress', interestRatePath: 'shocked',
    size: 780_000, uploadedAt: '2024-11-20T14:00:00Z',
    uploadedBy: 'michael.ross@company.com', status: 'validated',
    recordCount: 12, version: '1.0',
    description: '+/- 50/100/200/300 bps parallel shift stress scenarios',
    tags: ['stress', 'interest-rate'],
  },
  {
    id: 'scen-004', name: 'ESG_1000_Scenarios_Q4.csv', type: 'scenario',
    scenarioCount: 1000, scenarioType: 'stochastic', interestRatePath: 'ESG',
    size: 62_000_000, uploadedAt: '2024-12-01T09:00:00Z',
    uploadedBy: 'sarah.chen@company.com', status: 'validating',
    recordCount: 1000, version: '2024-Q4',
    description: 'ESG-generated 1000 scenarios for EV / ICS capital calculation',
    tags: ['ESG', 'EV', 'ICS'],
  },
];

// ── Factor Files ─────────────────────────────────────────────────────────────

export const mockFactorFiles: FactorFile[] = [
  {
    id: 'fac-001', name: 'CreditingRates_MYGA_2025Q1.xlsx', type: 'factor',
    factorType: 'crediting_rate', size: 145_000,
    uploadedAt: '2024-12-10T10:00:00Z', uploadedBy: 'lisa.tran@company.com',
    status: 'validated', recordCount: 360, version: '1.0',
    description: 'MYGA declared crediting rates by product / duration — 2025 Q1',
    tags: ['crediting', 'MYGA', '2025-Q1'],
  },
  {
    id: 'fac-002', name: 'MortalityImprovement_MP2023.xlsx', type: 'factor',
    factorType: 'mortality_improvement', size: 220_000,
    uploadedAt: '2024-08-01T09:00:00Z', uploadedBy: 'james.park@company.com',
    status: 'validated', recordCount: 2_400, version: '1.0',
    description: 'MP-2023 mortality improvement scale',
    tags: ['mortality', 'MP2023'],
  },
  {
    id: 'fac-003', name: 'ShockLapseFactors_FIA.xlsx', type: 'factor',
    factorType: 'shock_lapse', size: 98_000,
    uploadedAt: '2024-09-15T11:00:00Z', uploadedBy: 'michael.ross@company.com',
    status: 'validated', recordCount: 480, version: '2.0',
    description: 'FIA shock lapse factors at end of surrender charge period',
    tags: ['lapse', 'FIA'],
  },
  {
    id: 'fac-004', name: 'SpreadFactors_2024_Grading.xlsx', type: 'factor',
    factorType: 'spread', size: 175_000,
    uploadedAt: '2024-11-01T13:00:00Z', uploadedBy: 'lisa.tran@company.com',
    status: 'validated', recordCount: 860, version: '1.1',
    description: 'Asset spread assumption grading factors by asset class',
    tags: ['spread', 'assets'],
  },
];

// ── Products ─────────────────────────────────────────────────────────────────

export const mockProducts: Product[] = [
  {
    id: 'prod-001', code: 'MYGA', name: 'Multi-Year Guaranteed Annuity',
    description: 'Fixed annuity with guaranteed crediting rate for a specified period',
    launchDate: '2018-01-01', status: 'active',
    policyCount: 18_452, totalPremium: 2_140_000_000, totalReserve: 2_215_000_000,
    defaultAssumptionTable: 'asmp-001', modelVersion: 'v3.2',
  },
  {
    id: 'prod-002', code: 'SPIA', name: 'Single Premium Immediate Annuity',
    description: 'Immediate income annuity with payments starting within one month',
    launchDate: '2015-06-01', status: 'active',
    policyCount: 5_233, totalPremium: 780_000_000, totalReserve: 892_000_000,
    defaultAssumptionTable: 'asmp-001', modelVersion: 'v3.2',
  },
  {
    id: 'prod-003', code: 'FIA', name: 'Fixed Indexed Annuity',
    description: 'Annuity with interest credited based on equity index performance',
    launchDate: '2019-03-01', status: 'active',
    policyCount: 22_187, totalPremium: 3_450_000_000, totalReserve: 3_680_000_000,
    defaultAssumptionTable: 'asmp-001', modelVersion: 'v3.1',
  },
  {
    id: 'prod-004', code: 'RILA', name: 'Registered Index-Linked Annuity',
    description: 'Variable annuity with buffer/floor protection against market losses',
    launchDate: '2021-09-01', status: 'active',
    policyCount: 8_764, totalPremium: 1_220_000_000, totalReserve: 1_318_000_000,
    defaultAssumptionTable: 'asmp-001', modelVersion: 'v2.4',
  },
  {
    id: 'prod-005', code: 'Disability', name: 'Individual Disability Income',
    description: 'Monthly income replacement benefit for non-occupational disability',
    launchDate: '2016-01-01', status: 'active',
    policyCount: 3_890, totalPremium: 145_000_000, totalReserve: 312_000_000,
    defaultAssumptionTable: 'asmp-001', modelVersion: 'v2.1',
  },
];

// ── Projection Runs ──────────────────────────────────────────────────────────

export const mockRuns: ProjectionRun[] = [
  {
    id: 'run-001', name: 'Q4-2024 GAAP Reserve — MYGA Base',
    description: 'Q4 statutory reserve run — MYGA best estimate scenario',
    product: 'MYGA', inforceFileId: 'inf-001', inforceFileName: 'MYGA_Inforce_Q42024.csv',
    assumptionTableId: 'asmp-001', assumptionTableName: 'BaseAssumptions_2024.xlsx',
    scenarioFileId: 'scen-002', scenarioFileName: 'BaseScenario_SingleDeterministic.csv',
    factorFileId: 'fac-001', factorFileName: 'CreditingRates_MYGA_2025Q1.xlsx',
    projectionFrequency: 'monthly', projectionStartDate: '2024-12-31',
    projectionEndDate: '2054-12-31', outputGranularity: 'cohort',
    status: 'completed', createdAt: '2024-12-18T08:00:00Z', createdBy: 'sarah.chen@company.com',
    startedAt: '2024-12-18T08:05:00Z', completedAt: '2024-12-18T08:47:00Z',
    progressPct: 100, scenarioCount: 1, policyCount: 18_452, duration: 2520,
    modelVersion: 'v3.2',
  },
  {
    id: 'run-002', name: 'Q4-2024 VM-21 Stochastic — FIA Portfolio',
    description: 'ACLI 200-scenario stochastic VM-21 reserve for FIA block',
    product: 'FIA', inforceFileId: 'inf-003', inforceFileName: 'FIA_Inforce_Q42024.csv',
    assumptionTableId: 'asmp-001', assumptionTableName: 'BaseAssumptions_2024.xlsx',
    scenarioFileId: 'scen-001', scenarioFileName: 'ACLI_Prescribed_200_Scenarios.csv',
    factorFileId: 'fac-003', factorFileName: 'ShockLapseFactors_FIA.xlsx',
    projectionFrequency: 'monthly', projectionStartDate: '2024-12-31',
    projectionEndDate: '2054-12-31', outputGranularity: 'cohort',
    status: 'running', createdAt: '2024-12-19T07:00:00Z', createdBy: 'james.park@company.com',
    startedAt: '2024-12-19T07:15:00Z',
    progressPct: 63, scenarioCount: 200, policyCount: 22_187,
    modelVersion: 'v3.1',
  },
  {
    id: 'run-003', name: 'Interest Rate Stress — All Products',
    description: '12 stress scenarios +/-50/100/200/300 bps',
    product: 'MYGA', inforceFileId: 'inf-001', inforceFileName: 'MYGA_Inforce_Q42024.csv',
    assumptionTableId: 'asmp-001', assumptionTableName: 'BaseAssumptions_2024.xlsx',
    scenarioFileId: 'scen-003', scenarioFileName: 'StressScenarios_IRRate_Shock.csv',
    projectionFrequency: 'quarterly', projectionStartDate: '2024-12-31',
    projectionEndDate: '2044-12-31', outputGranularity: 'product',
    status: 'queued', createdAt: '2024-12-19T09:30:00Z', createdBy: 'michael.ross@company.com',
    progressPct: 0, scenarioCount: 12, policyCount: 18_452,
    modelVersion: 'v3.2',
  },
  {
    id: 'run-004', name: 'SPIA GAAP Reserve — Q4 2024',
    description: 'Quarterly GAAP reserve for SPIA block',
    product: 'SPIA', inforceFileId: 'inf-002', inforceFileName: 'SPIA_Inforce_Q42024.csv',
    assumptionTableId: 'asmp-001', assumptionTableName: 'BaseAssumptions_2024.xlsx',
    scenarioFileId: 'scen-002', scenarioFileName: 'BaseScenario_SingleDeterministic.csv',
    projectionFrequency: 'annual', projectionStartDate: '2024-12-31',
    projectionEndDate: '2064-12-31', outputGranularity: 'cohort',
    status: 'completed', createdAt: '2024-12-17T14:00:00Z', createdBy: 'lisa.tran@company.com',
    startedAt: '2024-12-17T14:05:00Z', completedAt: '2024-12-17T14:22:00Z',
    progressPct: 100, scenarioCount: 1, policyCount: 5_233, duration: 1020,
    modelVersion: 'v3.2',
  },
  {
    id: 'run-005', name: 'RILA Embedded Value — Full Portfolio',
    description: 'EV run using 1000 ESG scenarios — awaiting inforce validation',
    product: 'RILA', inforceFileId: 'inf-004', inforceFileName: 'RILA_Inforce_Q42024.csv',
    assumptionTableId: 'asmp-001', assumptionTableName: 'BaseAssumptions_2024.xlsx',
    scenarioFileId: 'scen-004', scenarioFileName: 'ESG_1000_Scenarios_Q4.csv',
    projectionFrequency: 'quarterly', projectionStartDate: '2024-12-31',
    projectionEndDate: '2054-12-31', outputGranularity: 'policy',
    status: 'draft', createdAt: '2024-12-19T10:00:00Z', createdBy: 'sarah.chen@company.com',
    progressPct: 0, scenarioCount: 1000, policyCount: 8_764,
    modelVersion: 'v2.4',
  },
  {
    id: 'run-006', name: 'DI Reserve — Failed Run',
    description: 'Q4 DI reserve — failed due to invalid inforce data',
    product: 'Disability', inforceFileId: 'inf-005', inforceFileName: 'Disability_Inforce_Q42024.csv',
    assumptionTableId: 'asmp-001', assumptionTableName: 'BaseAssumptions_2024.xlsx',
    scenarioFileId: 'scen-002', scenarioFileName: 'BaseScenario_SingleDeterministic.csv',
    projectionFrequency: 'monthly', projectionStartDate: '2024-12-31',
    projectionEndDate: '2054-12-31', outputGranularity: 'cohort',
    status: 'failed', createdAt: '2024-12-18T16:00:00Z', createdBy: 'lisa.tran@company.com',
    startedAt: '2024-12-18T16:05:00Z', completedAt: '2024-12-18T16:08:00Z',
    progressPct: 4, scenarioCount: 1, policyCount: 0, duration: 180,
    errorMessage: 'Inforce file failed schema validation: missing ISSUE_DATE column',
    modelVersion: 'v2.1',
  },
];

// ── Run Status Timeline ──────────────────────────────────────────────────────

export const mockRunEvents: RunStatusEvent[] = [
  { id: 'evt-001', runId: 'run-001', timestamp: '2024-12-18T08:00:00Z', status: 'draft', message: 'Run created' },
  { id: 'evt-002', runId: 'run-001', timestamp: '2024-12-18T08:02:00Z', status: 'queued', message: 'Run submitted to queue' },
  { id: 'evt-003', runId: 'run-001', timestamp: '2024-12-18T08:05:00Z', status: 'running', message: 'Run started — loading inforce data', detail: '18,452 policies loaded in 45s' },
  { id: 'evt-004', runId: 'run-001', timestamp: '2024-12-18T08:12:00Z', status: 'running', message: 'Assumptions applied', detail: 'Mortality, lapse, expense tables loaded' },
  { id: 'evt-005', runId: 'run-001', timestamp: '2024-12-18T08:47:00Z', status: 'completed', message: 'Projection completed successfully', detail: '18,452 policies × 361 periods computed' },
];

// ── Model Versions ───────────────────────────────────────────────────────────

export const mockModelVersions: ModelVersion[] = [
  {
    id: 'mv-001', version: 'v3.2', name: 'Actuarial Model Suite 3.2',
    releaseDate: '2024-09-01', status: 'current',
    changes: ['LDTI shadow reserve implementation', 'Improved shock lapse algorithm', 'RILA buffer/floor fix', 'Performance 15% faster'],
    products: ['MYGA', 'SPIA', 'FIA', 'RILA', 'Disability'],
  },
  {
    id: 'mv-002', version: 'v3.1', name: 'Actuarial Model Suite 3.1',
    releaseDate: '2024-03-01', status: 'deprecated',
    changes: ['VM-21 stochastic reserve', 'FIA index crediting rework', 'AG43 compliance update'],
    products: ['MYGA', 'SPIA', 'FIA', 'RILA'],
  },
  {
    id: 'mv-003', version: 'v4.0-beta', name: 'Actuarial Model Suite 4.0 Beta',
    releaseDate: '2025-01-15', status: 'beta',
    changes: ['IFRS 17 CSM module', 'GPU-accelerated stochastic engine', 'Real-time monitoring API'],
    products: ['MYGA', 'SPIA', 'FIA', 'RILA', 'Disability'],
  },
];

// ── System Users ─────────────────────────────────────────────────────────────

export const mockUsers: SystemUser[] = [
  { id: 'usr-001', name: 'Sarah Chen', email: 'sarah.chen@company.com', role: 'actuary', lastLogin: '2024-12-19T08:00:00Z', status: 'active', department: 'Actuarial Science' },
  { id: 'usr-002', name: 'James Park', email: 'james.park@company.com', role: 'actuary', lastLogin: '2024-12-19T07:30:00Z', status: 'active', department: 'Product Development' },
  { id: 'usr-003', name: 'Michael Ross', email: 'michael.ross@company.com', role: 'analyst', lastLogin: '2024-12-18T17:00:00Z', status: 'active', department: 'Risk Management' },
  { id: 'usr-004', name: 'Lisa Tran', email: 'lisa.tran@company.com', role: 'analyst', lastLogin: '2024-12-18T16:30:00Z', status: 'active', department: 'Finance & Reporting' },
  { id: 'usr-005', name: 'David Kim', email: 'david.kim@company.com', role: 'admin', lastLogin: '2024-12-17T09:00:00Z', status: 'active', department: 'IT / Model Governance' },
  { id: 'usr-006', name: 'Rachel Wong', email: 'rachel.wong@company.com', role: 'viewer', lastLogin: '2024-12-10T11:00:00Z', status: 'inactive', department: 'Finance & Reporting' },
];

// ── Recent Activity ──────────────────────────────────────────────────────────

export const mockRecentActivity: RecentActivity[] = [
  { id: 'act-001', type: 'run_completed', message: 'Run "Q4-2024 GAAP Reserve — MYGA Base" completed', timestamp: '2024-12-18T08:47:00Z', user: 'sarah.chen@company.com', entityId: 'run-001' },
  { id: 'act-002', type: 'run_created', message: 'Run "VM-21 Stochastic — FIA Portfolio" submitted', timestamp: '2024-12-19T07:15:00Z', user: 'james.park@company.com', entityId: 'run-002' },
  { id: 'act-003', type: 'file_validated', message: 'Inforce file "MYGA_Inforce_Q42024.csv" passed validation', timestamp: '2024-12-15T09:45:00Z', user: 'sarah.chen@company.com', entityId: 'inf-001' },
  { id: 'act-004', type: 'run_failed', message: 'Run "DI Reserve — Failed Run" terminated with error', timestamp: '2024-12-18T16:08:00Z', user: 'lisa.tran@company.com', entityId: 'run-006' },
  { id: 'act-005', type: 'file_uploaded', message: 'Scenario file "ESG_1000_Scenarios_Q4.csv" uploaded', timestamp: '2024-12-01T09:00:00Z', user: 'sarah.chen@company.com', entityId: 'scen-004' },
  { id: 'act-006', type: 'file_validated', message: 'Assumption table "BaseAssumptions_2024.xlsx" validated', timestamp: '2024-11-01T09:30:00Z', user: 'james.park@company.com', entityId: 'asmp-001' },
];

// ── Cashflow Report Data ─────────────────────────────────────────────────────

function generateCashflows(scenarioLabel = 'Base'): CashflowRow[] {
  const rows: CashflowRow[] = [];
  let reserve = 2_215_000_000;
  for (let y = 2025; y <= 2035; y++) {
    const premiums = 180_000_000 * (1 - (y - 2025) * 0.04);
    const benefits = 120_000_000 * (1 + (y - 2025) * 0.06);
    const claims = 45_000_000 * (1 + (y - 2025) * 0.03);
    const expenses = 22_000_000;
    const netCashflow = premiums - benefits - claims - expenses;
    reserve = reserve + netCashflow * 0.5;
    rows.push({
      period: `${y}-12-31`, premiums, benefits, claims, expenses, netCashflow, reserves: reserve,
      scenario: scenarioLabel,
    });
  }
  return rows;
}

export const mockCashflows: CashflowRow[] = [
  ...generateCashflows('Base'),
  ...generateCashflows('+200 bps').map(r => ({
    ...r, premiums: r.premiums * 0.97, benefits: r.benefits * 0.95, netCashflow: r.netCashflow * 1.05,
    scenario: '+200 bps',
  })),
  ...generateCashflows('-200 bps').map(r => ({
    ...r, premiums: r.premiums * 1.02, benefits: r.benefits * 1.08, netCashflow: r.netCashflow * 0.88,
    scenario: '-200 bps',
  })),
];

// ── Reserve Report Data ──────────────────────────────────────────────────────

export const mockReserves: ReserveRow[] = Array.from({ length: 11 }, (_, i) => ({
  period: `${2025 + i}-12-31`,
  product: 'MYGA' as const,
  grossReserve: 2_215_000_000 - i * 120_000_000,
  cededReserve: 180_000_000 - i * 8_000_000,
  netReserve: 2_035_000_000 - i * 112_000_000,
  policyCount: 18_452 - i * 820,
  scenario: 'Base',
}));

// ── Account Value Report Data ─────────────────────────────────────────────────

export const mockAccountValues: AccountValueRow[] = Array.from({ length: 11 }, (_, i) => ({
  period: `${2025 + i}-12-31`,
  beginningAV: 2_100_000_000 - i * 80_000_000,
  premiums: 180_000_000 * (1 - i * 0.04),
  credited: (2_100_000_000 - i * 80_000_000) * 0.048,
  withdrawals: 95_000_000 + i * 8_000_000,
  surrenders: 180_000_000 + i * 15_000_000,
  deaths: 22_000_000 + i * 1_500_000,
  endingAV: 2_100_000_000 - (i + 1) * 80_000_000,
  scenario: 'Base',
}));

// ── Claims Report Data ────────────────────────────────────────────────────────

export const mockClaims: ClaimRow[] = Array.from({ length: 11 }, (_, i) => ({
  period: `${2025 + i}-12-31`,
  product: 'MYGA' as const,
  deathClaims: 22_000_000 + i * 1_500_000,
  disabilityClaims: 0,
  surrenderValues: 180_000_000 + i * 15_000_000,
  maturityBenefits: i > 4 ? 45_000_000 + i * 5_000_000 : 0,
  totalClaims: 202_000_000 + i * 17_000_000 + (i > 4 ? 45_000_000 + i * 5_000_000 : 0),
  scenario: 'Base',
}));

// ── All Files (combined) ──────────────────────────────────────────────────────

export const allDataFiles: DataFile[] = [
  ...mockInforceFiles,
  ...mockAssumptionTables,
  ...mockScenarioFiles,
  ...mockFactorFiles,
];
