export type ModelOption = {
  id: string
  name: string
  product_code?: string
  current_version?: { id: string; version_label?: string; status?: string } | null
}

export type ModelVersionOption = {
  id: string
  version_label?: string
  version?: string
  status?: string
  is_current?: boolean
}

export type FormulaTestCase = {
  name: string
  inputs: Record<string, number>
  prior_inputs: Record<string, number>
  expected_output: number
  abs_tol: number
}

export type FormulaItem = {
  id: string
  name: string
  output_variable: string
  expression_text: string | null
  version?: string
  status?: string
  dependencies?: string[]
  function_ref?: string
  explanation?: string | null
  unit?: string | null
  group_id?: string | null
  test_cases?: FormulaTestCase[]
}

export type FormulaGroup = {
  id: string
  name: string
  description?: string | null
  lineage_state?: string
  version_label?: string
  formulas: FormulaItem[]
}

export type FormulaValidation = {
  valid: boolean
  dependencies: string[]
  prior_dependencies: string[]
  functions_used: string[]
  unknown_variables: string[]
  errors: string[]
}

export type FormulaPreview = {
  valid: boolean
  result: number
  dependencies: string[]
  inputs_used: Record<string, number>
  errors: string[]
}

export type FormulaTestResult = {
  name: string
  expected_output: number
  actual_output: number | null
  abs_diff: number | null
  abs_tol: number
  passed: boolean
  error: string | null
}

export type FormulaTestRun = {
  formula_id: string
  all_passed: boolean
  total: number
  passed: number
  failed: number
  results: FormulaTestResult[]
}

export type DependencyAnalysis = {
  version_id?: string
  model_version_id?: string
  status?: string
  is_current?: boolean
  execution_order?: string[]
  variable?: string | null
  same_step_dependencies: Record<string, string[]> | string[]
  prior_dependencies: Record<string, string[]> | string[]
  upstream?: string[]
  upstream_dependencies?: string[]
  downstream?: string[]
  downstream_impacted?: string[]
  circular?: boolean
  target_variable?: string | null
}

export type ExpectedResultSet = {
  id: string
  project_id: string
  name: string
  product_code: string
  version_label: string
  timing_convention?: string | null
  granularity: 'policy_month' | 'aggregate_year'
  row_count: number
  columns_detected: string[]
  fingerprint: string
  status: string
  created_at: string
  rows?: Record<string, unknown>[]
}

export type ReconciliationFailure = {
  level: string
  policy_id?: string | null
  projection_month?: number | null
  variable: string
  actual?: number | null
  expected?: number | null
  abs_diff?: number | null
  rel_diff?: number | null
  abs_tol?: number | null
  rel_tol?: number | null
}

export type SourceCheck = {
  status: 'PASS' | 'FAIL' | 'NOT_VERIFIABLE' | string
  passed?: boolean
  not_verifiable?: boolean
  inforce_source_matched?: boolean | null
  inforce_rows_checked?: number | null
  opening_balances_matched?: boolean | null
  source_policy_count?: number
  actual_policy_count?: number
  opening_account_value?: {
    available?: boolean
    policies_checked?: number
    max_abs_diff?: number
    passed?: boolean
    source_fields?: string[]
  }
  detail?: string | null
}

export type ReconciliationReport = {
  id: string
  project_id: string
  run_id: string
  expected_result_set_id: string
  status: 'PASS' | 'FAIL' | string
  level: string
  variables_requested: string[]
  expected_result_fingerprint?: string | null
  expected_result_version?: string | null
  timing_convention_snapshot?: string | null
  granularity_snapshot?: string | null
  abs_tol: number
  rel_tol: number
  disposition_status: string
  disposition_notes?: string | null
  disposition_by?: string | null
  disposition_at?: string | null
  disposition_history: { timestamp?: string; at?: string; user?: string; actor?: string; by?: string; action?: string; from_status?: string; to_status?: string; disposition_status?: string; notes?: string | null }[]
  summary: {
    status?: string
    cells_checked?: number
    total_cells_checked?: number
    cells_failed?: number
    max_abs_diff?: number
    max_rel_diff?: number
    by_level?: Record<string, { cells_checked?: number; cells_failed?: number }>
    by_variable?: Record<string, { cells_checked?: number; cells_passed?: number; cells_failed?: number; max_abs_diff?: number; max_rel_diff?: number }>
    per_level_summary?: Record<string, { cells_checked?: number; cells_passed?: number; cells_failed?: number }>
    per_variable_summary?: Record<string, { cells_checked?: number; cells_passed?: number; cells_failed?: number; max_abs_diff?: number; max_rel_diff?: number }>
    source_to_output_check?: SourceCheck
    total_failures_count?: number
    failures_truncated?: boolean
  }
  failures: ReconciliationFailure[]
  calculated_at?: string
  created_at?: string
}
