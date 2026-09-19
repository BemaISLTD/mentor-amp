// ── Extended mock table data for viewer/editor sub-pages ─────────────────────
// This file provides realistic actuarial tabular data for 1D, 2D and 3D tables

export type VectorTable = {
  id: string;
  name: string;
  dimension: '1D';
  description: string;
  rowLabel: string;
  valueLabel: string;
  unit: string;
  rows: { key: string; value: number }[];
};

export type Matrix2DTable = {
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
};

export type Cube3DTable = {
  id: string;
  name: string;
  dimension: '3D';
  description: string;
  axisLabels: [string, string, string];
  valueLabel: string;
  unit: string;
  axes: [string[], string[], string[]];
  data: number[][][];
};

export type AnyTable = VectorTable | Matrix2DTable | Cube3DTable;

// ── 1D: Mortality improvement scale (by year) ────────────────────────────────
export const mortalityImprovementVector: VectorTable = {
  id: 'vec-001', name: 'MP-2023 Improvement Scale (Male Age 65)', dimension: '1D',
  description: 'Annual mortality improvement factors for male lives age 65 — MP-2023 projection scale',
  rowLabel: 'Calendar Year', valueLabel: 'Improvement Factor', unit: '%',
  rows: Array.from({ length: 20 }, (_, i) => ({
    key: String(2024 + i),
    value: parseFloat((1.8 - i * 0.04 + Math.sin(i) * 0.05).toFixed(3)),
  })),
};

// ── 1D: Declared crediting rates by guarantee period ────────────────────────
export const creditingRateVector: VectorTable = {
  id: 'vec-002', name: 'MYGA Declared Crediting Rates — Q1 2025', dimension: '1D',
  description: 'Declared annual crediting rates by guarantee period for MYGA product line',
  rowLabel: 'Guarantee Period', valueLabel: 'Crediting Rate', unit: '%',
  rows: [
    { key: '3-Year', value: 5.10 },
    { key: '4-Year', value: 5.25 },
    { key: '5-Year', value: 5.40 },
    { key: '6-Year', value: 5.50 },
    { key: '7-Year', value: 5.60 },
    { key: '10-Year', value: 5.75 },
  ],
};

// ── 1D: Expense per-policy loads ─────────────────────────────────────────────
export const expenseVector: VectorTable = {
  id: 'vec-003', name: 'Per-Policy Expense Load by Duration', dimension: '1D',
  description: 'Annual per-policy expense loads (USD) grading over the projection period',
  rowLabel: 'Policy Duration', valueLabel: 'Annual Expense', unit: '$',
  rows: Array.from({ length: 15 }, (_, i) => ({
    key: `Year ${i + 1}`,
    value: parseFloat((45 + i * 1.2).toFixed(2)),
  })),
};

// ── 2D: Lapse rates by duration × product ────────────────────────────────────
export const lapseTable2D: Matrix2DTable = {
  id: 'mat-001', name: 'Lapse Rates by Duration × Product', dimension: '2D',
  description: 'Annual base lapse rates (%) by policy duration and product type. Shock lapse visible at end of surrender charge period.',
  rowLabel: 'Policy Duration (Year)', colLabel: 'Product', valueLabel: 'Lapse Rate', unit: '%',
  rows: Array.from({ length: 10 }, (_, i) => `Year ${i + 1}`),
  cols: ['MYGA-3', 'MYGA-5', 'FIA-6', 'FIA-7', 'RILA-6', 'SPIA'],
  data: [
    [8.2, 7.8, 6.5, 6.0, 7.2, 0.5],
    [5.8, 5.5, 4.8, 4.5, 5.4, 0.4],
    [15.1, 5.2, 4.2, 3.9, 4.8, 0.4], // shock lapse for MYGA-3
    [4.1,  5.0, 3.8, 3.5, 4.2, 0.3],
    [3.8, 16.2, 3.5, 3.2, 3.9, 0.3], // shock lapse for MYGA-5
    [3.5,  4.1, 15.8, 3.0, 14.5, 0.3], // shock lapse for FIA-6 & RILA-6
    [3.2,  3.8, 4.2, 14.9, 3.5, 0.2], // shock lapse for FIA-7
    [3.0,  3.5, 3.8,  4.0, 3.2, 0.2],
    [2.8,  3.2, 3.5,  3.6, 3.0, 0.2],
    [2.5,  3.0, 3.2,  3.3, 2.8, 0.1],
  ],
};

// ── 2D: Mortality table (qx) by age × gender ─────────────────────────────────
export const mortalityTable2D: Matrix2DTable = {
  id: 'mat-002', name: '2015 VBT Ultimate qx — Age × Gender', dimension: '2D',
  description: 'Annual mortality rates (per 1,000) from 2015 VBT ultimate table by attained age and gender',
  rowLabel: 'Attained Age', colLabel: 'Gender / Smoker Status', valueLabel: 'qx (per 1,000)', unit: '‰',
  rows: ['55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70'],
  cols: ['Male NS', 'Male SM', 'Female NS', 'Female SM', 'Unisex'],
  data: [
    [5.23, 10.41, 3.12, 6.82, 4.18],
    [5.78, 11.28, 3.44, 7.54, 4.61],
    [6.41, 12.31, 3.82, 8.38, 5.12],
    [7.14, 13.55, 4.27, 9.38, 5.71],
    [7.98, 15.02, 4.79, 10.56, 6.39],
    [8.94, 16.76, 5.41, 11.96, 7.18],
    [10.05, 18.81, 6.14, 13.61, 8.10],
    [11.32, 21.21, 6.99, 15.56, 9.16],
    [12.78, 23.98, 7.98, 17.84, 10.38],
    [14.43, 27.16, 9.12, 20.48, 11.78],
    [16.30, 30.78, 10.42, 23.52, 13.36],
    [18.40, 34.88, 11.90, 27.00, 15.15],
    [20.75, 39.49, 13.58, 31.00, 17.17],
    [23.38, 44.65, 15.49, 35.56, 19.44],
    [26.30, 50.42, 17.65, 40.74, 21.98],
    [29.54, 56.85, 20.09, 46.61, 24.82],
  ],
};

// ── 2D: Interest crediting by index × strategy ───────────────────────────────
export const indexCreditingTable2D: Matrix2DTable = {
  id: 'mat-003', name: 'FIA Index Crediting Caps × Strategy Type', dimension: '2D',
  description: 'Annual cap rates (%) for FIA index crediting strategies by index and strategy',
  rowLabel: 'Index', colLabel: 'Strategy', valueLabel: 'Cap Rate', unit: '%',
  rows: ['S&P 500', 'Russell 2000', 'NASDAQ-100', 'MSCI EAFE', 'Bloomberg US Agg'],
  cols: ['Annual PT Cap', 'Monthly Sum Cap', 'Participation Rate', 'Spread'],
  data: [
    [9.50, 3.25, 55.0, 2.10],
    [11.25, 3.75, 65.0, 2.50],
    [10.00, 3.50, 60.0, 2.25],
    [12.50, 4.00, 70.0, 2.75],
    [6.00,  2.00, 40.0, 1.50],
  ],
};

// ── 3D: Lapse rates by age × duration × interest rate environment ────────────
export const lapseTable3D: Cube3DTable = {
  id: 'cub-001', name: 'Dynamic Lapse Rates: Age × Duration × Rate Env', dimension: '3D',
  description: 'Dynamic lapse assumption (%) by issue age cohort, policy duration, and interest rate environment (relative to credited rate)',
  axisLabels: ['Issue Age Group', 'Policy Duration', 'Rate Environment'],
  valueLabel: 'Lapse Rate', unit: '%',
  axes: [
    ['Age 45–54', 'Age 55–64', 'Age 65–74', 'Age 75+'],
    ['Year 1–2', 'Year 3–4', 'Year 5 (Shock)', 'Year 6–10'],
    ['Rates -200bps', 'Rates -100bps', 'Base', 'Rates +100bps', 'Rates +200bps'],
  ],
  data: [
    // Age 45–54
    [
      [2.1, 3.5, 5.2, 8.1, 12.4],   // Year 1–2
      [1.8, 2.9, 4.1, 6.8, 10.2],   // Year 3–4
      [8.2, 12.5, 16.8, 22.4, 28.6], // Year 5 shock
      [1.5, 2.4, 3.5, 5.8, 8.9],    // Year 6–10
    ],
    // Age 55–64
    [
      [1.8, 3.0, 4.5, 7.2, 11.0],
      [1.5, 2.5, 3.6, 6.0, 9.1],
      [7.5, 11.4, 15.2, 20.8, 26.5],
      [1.2, 2.0, 3.0, 5.1, 7.8],
    ],
    // Age 65–74
    [
      [1.5, 2.5, 3.8, 6.2, 9.5],
      [1.2, 2.0, 3.0, 5.0, 7.8],
      [6.5, 9.8, 13.2, 18.0, 23.4],
      [1.0, 1.6, 2.5, 4.2, 6.5],
    ],
    // Age 75+
    [
      [1.1, 1.9, 2.9, 4.8, 7.5],
      [0.9, 1.5, 2.3, 3.9, 6.1],
      [4.8, 7.4, 10.2, 14.5, 19.2],
      [0.7, 1.2, 1.9, 3.2, 5.0],
    ],
  ],
};

// ── 3D: Reserve factors by product × duration × scenario ─────────────────────
export const reserveFactors3D: Cube3DTable = {
  id: 'cub-002', name: 'Reserve Factor Table: Product × Duration × Scenario', dimension: '3D',
  description: 'Statutory reserve factors (% of Account Value) by product, projection year, and interest rate scenario',
  axisLabels: ['Product', 'Projection Year', 'Scenario'],
  valueLabel: 'Reserve Factor', unit: '%',
  axes: [
    ['MYGA', 'FIA', 'RILA', 'SPIA'],
    ['Y1', 'Y2', 'Y3', 'Y5', 'Y7', 'Y10'],
    ['Base', '+100bps', '+200bps', '-100bps', '-200bps'],
  ],
  data: [
    // MYGA
    [
      [102.5, 101.8, 101.2, 103.1, 103.8],
      [101.8, 101.1, 100.6, 102.4, 103.1],
      [101.2, 100.5, 100.0, 101.8, 102.5],
      [100.1,  99.5,  99.1, 100.8, 101.5],
      [ 99.2,  98.7,  98.3,  99.9, 100.6],
      [ 98.0,  97.5,  97.2,  98.8,  99.5],
    ],
    // FIA
    [
      [104.2, 103.1, 102.4, 105.2, 106.1],
      [103.5, 102.4, 101.7, 104.5, 105.4],
      [102.8, 101.8, 101.1, 103.8, 104.7],
      [101.5, 100.6, 100.0, 102.5, 103.4],
      [100.2,  99.4,  98.8, 101.2, 102.1],
      [ 98.8,  98.1,  97.6,  99.8, 100.7],
    ],
    // RILA
    [
      [103.1, 102.2, 101.5, 103.9, 104.8],
      [102.4, 101.5, 100.8, 103.2, 104.1],
      [101.7, 100.8, 100.2, 102.5, 103.4],
      [100.5,  99.7,  99.1, 101.3, 102.2],
      [ 99.3,  98.6,  98.0, 100.1, 101.0],
      [ 97.9,  97.3,  96.8,  98.7,  99.6],
    ],
    // SPIA
    [
      [108.5, 107.2, 106.1, 109.8, 111.2],
      [106.8, 105.6, 104.5, 108.1, 109.5],
      [105.2, 104.1, 103.0, 106.5, 107.9],
      [102.4, 101.4, 100.4, 103.7, 105.1],
      [ 99.8,  98.9,  98.0, 101.1, 102.5],
      [ 96.5,  95.8,  95.0,  97.8,  99.2],
    ],
  ],
};

// ── Inforce record-level data (for spreadsheet viewer) ───────────────────────
export const inforceRecords = Array.from({ length: 50 }, (_, i) => ({
  policyNo: `POL-${String(100001 + i).padStart(6, '0')}`,
  insuredName: ['Smith, John A.', 'Jones, Mary B.', 'Williams, Robert C.', 'Taylor, Susan D.', 'Brown, Michael E.', 'Davis, Linda F.', 'Miller, James G.', 'Wilson, Patricia H.', 'Moore, Richard I.', 'Anderson, Barbara J.'][i % 10],
  product: ['MYGA-5', 'MYGA-3', 'FIA-7', 'RILA-6', 'MYGA-5'][i % 5],
  issueDate: `${2018 + (i % 6)}-${String((i % 12) + 1).padStart(2, '0')}-01`,
  issueAge: 55 + (i % 20),
  gender: i % 3 === 0 ? 'F' : 'M',
  smokerStatus: i % 7 === 0 ? 'SM' : 'NS',
  stateName: ['TX', 'CA', 'FL', 'NY', 'OH', 'IL', 'PA', 'GA', 'NC', 'MI'][i % 10],
  premium: Math.round((100000 + (i * 12347) % 900000) / 1000) * 1000,
  accountValue: Math.round((98000 + (i * 13891) % 950000) / 100) * 100,
  surrenderValue: Math.round((95000 + (i * 11234) % 920000) / 100) * 100,
  guaranteedRate: [4.75, 5.10, 5.25, 5.40, 5.50][i % 5],
  guaranteePeriod: [3, 5, 5, 6, 7][i % 5],
  surrenderChargeYr: Math.max(0, [3, 5, 6, 7, 5][i % 5] - Math.floor((new Date().getFullYear() - (2018 + (i % 6))))),
  status: i % 15 === 0 ? 'Surrender' : i % 20 === 0 ? 'Death' : 'Active',
  beneficiaryName: ['Johnson, Sarah', 'Smith, Robert', 'Williams, Mary', 'Brown, James', 'Davis, Emily'][i % 5],
  agentCode: `AGT-${String(1001 + (i % 20)).padStart(4, '0')}`,
}));

// ── Assumption record-level data ──────────────────────────────────────────────
export const assumptionRecords = [
  // Mortality rows
  ...Array.from({ length: 20 }, (_, i) => ({
    tableId: 'asmp-001', section: 'Mortality', subType: i < 10 ? 'Male NS' : 'Female NS',
    age: 55 + (i % 10), duration: 'N/A', value: parseFloat((5.23 + i * 1.2 + (i % 3) * 0.3).toFixed(3)), unit: '‰', basis: '2015 VBT', effectiveDate: '2024-01-01',
  })),
  // Lapse rows
  ...Array.from({ length: 10 }, (_, i) => ({
    tableId: 'asmp-001', section: 'Lapse', subType: 'Base Lapse',
    age: 'N/A', duration: `Year ${i + 1}`, value: parseFloat([8.2, 5.8, 4.9, 4.2, 15.1, 4.0, 3.8, 3.5, 3.2, 2.9][i].toFixed(2)), unit: '%', basis: 'Company Experience 2019–2023', effectiveDate: '2024-01-01',
  })),
  // Expense rows
  ...Array.from({ length: 5 }, (_, i) => ({
    tableId: 'asmp-001', section: 'Expenses', subType: 'Per Policy Load',
    age: 'N/A', duration: `Year ${i + 1}`, value: parseFloat((45 + i * 1.2).toFixed(2)), unit: '$', basis: 'Expense Study 2023', effectiveDate: '2024-01-01',
  })),
];

// ── All tables registry ───────────────────────────────────────────────────────
export const allTables: AnyTable[] = [
  mortalityImprovementVector,
  creditingRateVector,
  expenseVector,
  lapseTable2D,
  mortalityTable2D,
  indexCreditingTable2D,
  lapseTable3D,
  reserveFactors3D,
];
