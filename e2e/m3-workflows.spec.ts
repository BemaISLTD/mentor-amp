import { expect, test, type Page } from '@playwright/test'
import type { ExpectedResultSet } from '../src/pages/m3/types'

const user = {
  id: 'reviewer-1',
  email: 'reviewer@example.test',
  full_name: 'M3 Reviewer',
  roles: ['admin', 'reviewer', 'actuary'],
}
const project = {
  id: 'project-m3',
  name: 'M3 Test Project',
  description: 'M3 workflow e2e project',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
}
const formula = {
  id: 'formula-1',
  name: 'Reserve Roll-forward',
  output_variable: 'reserve',
  function_ref: 'dsl',
  expression_text: 'prior(balance) * 1.05 + deposit',
  dependencies: ['deposit', 'balance'],
  group_id: 'group-1',
  status: 'draft',
  unit: 'USD',
  explanation: 'Calculate closing reserve.',
  test_cases: [{
    name: 'Base deposit',
    inputs: { deposit: 100 },
    prior_inputs: { balance: 1000 },
    expected_output: 1150,
    abs_tol: 0.01,
  }],
}
const benchmark = {
  id: 'benchmark-1',
  project_id: project.id,
  name: 'Reference MYGA',
  product_code: 'MYGA',
  version_label: 'v1.0',
  timing_convention: 'eom',
  granularity: 'policy_month',
  row_count: 1,
  columns_detected: ['policy_id', 'projection_month', 'reserve'],
  fingerprint: 'a'.repeat(64),
  status: 'validated',
  created_by: 'creator-1',
  created_at: '2026-10-28T14:30:00Z',
  rows: [{ policy_id: 'POL-1', projection_month: 1, scenario_id: 'scenario-1', reserve: 1150 }],
}

const successorBenchmark = {
  ...benchmark,
  id: 'benchmark-2',
  name: 'Reference MYGA successor',
  version_label: 'v2.0',
  fingerprint: 'b'.repeat(64),
  created_by: 'creator-2',
}

type ReconciliationStatus = 'PASS' | 'FAIL' | 'NOT_VERIFIABLE'

function reconciliationReport(status: ReconciliationStatus, sourceStatus: 'PASS' | 'FAIL' | 'NOT_VERIFIABLE') {
  const failure = {
    level: 'policy_month',
    policy_id: 'POL-1',
    projection_month: 1,
    variable: 'reserve',
    scenario_id: 'scenario-1',
    actual: 1200,
    expected: 1150,
    abs_diff: 50,
    rel_diff: 0.0434,
    abs_tol: 0.01,
    rel_tol: 0.0001,
  }
  return {
    id: 'report-1',
    project_id: project.id,
    run_id: 'run-1',
    expected_result_set_id: benchmark.id,
    status,
    level: 'policy_month',
    variables_requested: ['reserve'],
    expected_result_fingerprint: benchmark.fingerprint,
    expected_result_version: 'v1.0',
    timing_convention_snapshot: 'eom',
    granularity_snapshot: 'policy_month',
    scenario_id: 'scenario-1',
    abs_tol: 0.01,
    rel_tol: 0.0001,
    disposition_status: 'pending',
    disposition_notes: null,
    disposition_by: null,
    disposition_at: null,
    disposition_history: [],
    summary: {
      status,
      total_cells_checked: 1,
      cells_failed: status === 'FAIL' ? 1 : 0,
      max_abs_diff: status === 'FAIL' ? failure.abs_diff : 0,
      max_rel_diff: status === 'FAIL' ? failure.rel_diff : 0,
      per_variable_summary: { reserve: { cells_checked: 1, cells_passed: status === 'PASS' ? 1 : 0, cells_failed: status === 'FAIL' ? 1 : 0, max_abs_diff: status === 'FAIL' ? failure.abs_diff : 0 } },
      source_to_output_check: {
        status: sourceStatus,
        passed: sourceStatus === 'PASS',
        not_verifiable: sourceStatus === 'NOT_VERIFIABLE',
        inforce_source_matched: sourceStatus === 'NOT_VERIFIABLE' ? null : sourceStatus === 'PASS',
        inforce_rows_checked: sourceStatus === 'NOT_VERIFIABLE' ? null : 1,
        opening_balances_matched: sourceStatus === 'NOT_VERIFIABLE' ? null : sourceStatus === 'PASS',
        source_policy_count: 1,
        actual_policy_count: 1,
        opening_account_value: { available: sourceStatus !== 'NOT_VERIFIABLE', policies_checked: 1, max_abs_diff: 0, passed: sourceStatus === 'PASS' },
      },
      total_failures_count: status === 'FAIL' ? 1 : 0,
      failures_truncated: false,
    },
    failures: status === 'FAIL' ? [failure] : [],
    created_at: '2026-10-28T14:35:00Z',
  }
}

async function mockBackend(
  page: Page,
  reportStatus: ReconciliationStatus = 'FAIL',
  sourceStatus: 'PASS' | 'FAIL' | 'NOT_VERIFIABLE' = 'NOT_VERIFIABLE',
  options: { roles?: string[]; userId?: string; runProjectId?: string; governanceError?: { code: string; message: string } } = {},
) {
  let dispositionReport: ReturnType<typeof reconciliationReport> | null = null
  const activeUser = { ...user, id: options.userId ?? user.id, roles: options.roles ?? user.roles }
  const benchmarks: ExpectedResultSet[] = [{ ...benchmark }, { ...successorBenchmark }]
  await page.route('**/v1/**', async route => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const method = route.request().method()

    if (path.endsWith('/auth/me')) return route.fulfill({ json: activeUser })
    if (path.endsWith('/system/status')) return route.fulfill({ json: { status: 'ok', app: 'MentorAmp', version: 'm3-test', app_env: 'test', database: { status: 'ok', latency_ms: 1 }, engine: { registered_functions: 1, products: ['MYGA'], execution_backend: 'cpu', engine_version: 'test' }, time: new Date().toISOString() } })
    if (path.endsWith('/projects/')) return route.fulfill({ json: { projects: [project], total: 1 } })
    if (path === `/v1/projects/${project.id}/models`) return route.fulfill({ json: { models: [{ id: 'model-1', name: 'MYGA Model', product_code: 'MYGA', current_version: { id: 'version-1', version_label: 'v1.0', status: 'draft', is_current: true } }] } })
    if (path === '/v1/models/model-1/versions') return route.fulfill({ json: { versions: [{ id: 'version-1', version_label: 'v1.0', status: 'draft', is_current: true }] } })
    if (path === '/v1/model-versions/version-1/formula-groups') return route.fulfill({ json: { groups: [{ id: 'group-1', name: 'Reserves', formulas: [formula] }] } })
    if (path === `/v1/formulas/${formula.id}/detail`) return route.fulfill({ json: formula })
    if (path === '/v1/model-versions/version-1/formulas' && method === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>
      return route.fulfill({ status: 201, json: { ...body, id: 'formula-new', status: 'draft' } })
    }
    if (path === '/v1/formulas/formula-new/detail') return route.fulfill({ json: { ...formula, id: 'formula-new', name: 'Visual check formula', output_variable: 'reserve', expression_text: '2 + 3', test_cases: [{ name: 'constant check', inputs: {}, prior_inputs: {}, expected_output: 5, abs_tol: 0 }] } })
    if (path === '/v1/formulas/validate-expression' && method === 'POST') return route.fulfill({ json: { valid: true, dependencies: ['deposit'], prior_dependencies: ['balance'], functions_used: ['prior'], unknown_variables: [], errors: [] } })
    if (path === '/v1/formulas/preview' && method === 'POST') return route.fulfill({ json: { valid: true, result: 1150, dependencies: ['deposit'], inputs_used: { deposit: 100 }, errors: [] } })
    if (path === `/v1/formulas/${formula.id}/run-tests` && method === 'POST') return route.fulfill({ json: { formula_id: formula.id, all_passed: true, total: 1, passed: 1, failed: 0, results: [{ name: 'Base deposit', expected_output: 1150, actual_output: 1150, abs_diff: 0, abs_tol: 0.01, passed: true, error: null }] } })
    if (path === '/v1/formulas/formula-new/run-tests' && method === 'POST') return route.fulfill({ json: { formula_id: 'formula-new', all_passed: true, total: 1, passed: 1, failed: 0, results: [{ name: 'constant check', expected_output: 5, actual_output: 5, abs_diff: 0, abs_tol: 0, passed: true, error: null }] } })
    if (path === '/v1/model-versions/version-1/dependency-analysis') return route.fulfill({ json: { model_version_id: 'version-1', variable: 'reserve', execution_order: ['deposit', 'reserve'], same_step_dependencies: ['deposit'], prior_dependencies: ['balance'], upstream_dependencies: ['deposit', 'balance'], downstream_impacted: [] } })
    if (path === `/v1/projects/${project.id}/expected-results` && method === 'GET') return route.fulfill({ json: { expected_result_sets: benchmarks } })
    if (path === `/v1/projects/${project.id}/expected-results` && method === 'POST') {
      const created = { ...benchmark, id: 'benchmark-uploaded', name: 'Uploaded Reference MYGA', created_by: activeUser.id }
      benchmarks.push(created)
      return route.fulfill({ status: 201, json: created })
    }
    const approvalMatch = path.match(/^\/v1\/expected-results\/([^/]+)\/approve$/)
    if (approvalMatch && method === 'POST') {
      const selected = benchmarks.find(item => item.id === approvalMatch[1])
      if (!selected) return route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', message: 'Expected result set not found.' } } })
      if (options.governanceError) return route.fulfill({ status: 403, json: { error: options.governanceError } })
      if (selected.created_by === activeUser.id) return route.fulfill({ status: 403, json: { error: { code: 'EXPECTED_RESULTS_SELF_APPROVAL_FORBIDDEN', message: 'Expected result set cannot be approved by its creator (four-eyes principle required).' } } })
      selected.status = 'approved'
      selected.approved_by = activeUser.id
      selected.approved_at = '2026-10-30T12:00:00Z'
      return route.fulfill({ json: selected })
    }
    const supersedeMatch = path.match(/^\/v1\/expected-results\/([^/]+)\/supersede$/)
    if (supersedeMatch && method === 'POST') {
      const selected = benchmarks.find(item => item.id === supersedeMatch[1])
      const body = route.request().postDataJSON() as { superseded_by_id: string }
      const successor = benchmarks.find(item => item.id === body.superseded_by_id)
      if (!selected || !successor || selected.project_id !== successor.project_id || selected.product_code !== successor.product_code) {
        return route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', message: 'Superseding expected result set not found.' } } })
      }
      selected.status = 'superseded'
      selected.superseded_by_id = successor.id
      return route.fulfill({ json: selected })
    }
    const expectedResultMatch = path.match(/^\/v1\/expected-results\/([^/]+)$/)
    if (expectedResultMatch) return route.fulfill({ json: benchmarks.find(item => item.id === expectedResultMatch[1]) ?? benchmark })
    if (path === `/v1/runs/run-1`) return route.fulfill({ json: { id: 'run-1', name: 'Completed MYGA run', project_id: options.runProjectId ?? project.id, status: 'success', scenario: { id: 'scenario-1', name: 'Base scenario' }, model_version: { product_code: 'MYGA', model_name: 'MYGA Model', version_label: 'v1.0' } } })
    if (path === `/v1/runs/run-1/reconciliations`) return route.fulfill({ json: { reconciliations: [] } })
    if (path === `/v1/runs/run-1/reconcile` && method === 'POST') return route.fulfill({ status: 201, json: reconciliationReport(reportStatus, sourceStatus) })
    if (path === '/v1/reconciliations/report-1' && method === 'GET') return route.fulfill({ json: dispositionReport ?? reconciliationReport(reportStatus, sourceStatus) })
    if (path === '/v1/reconciliations/report-1/disposition' && method === 'POST') {
      const body = route.request().postDataJSON() as { disposition_status: string; disposition_notes?: string }
      const updated = reconciliationReport(reportStatus, sourceStatus)
      updated.disposition_status = body.disposition_status
      updated.disposition_notes = body.disposition_notes ?? null
      updated.disposition_history = [{ from_status: 'pending', to_status: body.disposition_status, notes: body.disposition_notes ?? null, by: activeUser.id, at: '2026-10-30T12:00:00Z' }]
      dispositionReport = updated
      return route.fulfill({ json: updated })
    }
    if (path === `/v1/projects/${project.id}/run-sets`) return route.fulfill({ json: { run_sets: [{ id: 'run-set-1', name: 'Recent MYGA runs' }] } })
    if (path === '/v1/run-sets/run-set-1') return route.fulfill({ json: { id: 'run-set-1', name: 'Recent MYGA runs', runs: [{ id: 'run-1', name: 'Completed MYGA run', status: 'success' }] } })
    return route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', message: `Unmocked M3 test request: ${method} ${path}` } } })
  })
  await page.addInitScript(() => window.sessionStorage.setItem('mentor-amp-access-token', 'm3-test-token'))
}

test.describe('M3 governance workflows', () => {
  test('Formula Studio validates, previews, runs governed tests, and visualizes feedback dependencies', async ({ page }) => {
    const requests: { path: string; body: Record<string, unknown> }[] = []
    await mockBackend(page)
    page.on('request', request => {
      if (request.method() === 'POST' && request.url().includes('/formulas/')) {
        try { requests.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() as Record<string, unknown> }) } catch { /* multipart or empty request */ }
      }
    })
    await page.goto('/models/model-1/versions/version-1/formulas')
    await expect(page.getByRole('heading', { name: 'Formula Studio', level: 2 })).toBeVisible()
    await page.getByRole('button', { name: /Reserve Roll-forward/ }).click()
    await expect(page.getByRole('heading', { name: 'Formula tests' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Not run' })).toBeVisible()
    await page.getByRole('button', { name: 'Run all tests' }).click()
    await expect(page.getByText('All tests passed')).toBeVisible()
    await page.getByRole('button', { name: 'Edit formula' }).click()
    await expect(page.getByText('Expression valid')).toBeVisible()
    await expect(page.getByText('Result: 1150')).toBeVisible()
    await expect(page.getByText('balance · t−1')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('button', { name: 'Dependency graph' }).click()
    await expect(page.getByRole('dialog', { name: 'Model version dependency graph' })).toBeVisible()
    await expect(page.getByText('t−1 → t')).toBeVisible()
    await expect(page.getByText('Same-step dependency (t)')).toBeVisible()
    expect(requests.some(item => item.path === '/v1/formulas/validate-expression' && item.body.model_version_id === 'version-1')).toBeTruthy()
    expect(requests.some(item => item.path === '/v1/formulas/validate-expression' && item.body.expression_text === formula.expression_text && item.body.output_variable === formula.output_variable)).toBeTruthy()
    expect(requests.some(item => item.path === '/v1/formulas/preview')).toBeTruthy()
  })

  test('Formula Studio retains and selects a newly created formula after refreshing groups', async ({ page }) => {
    const requests: { path: string; body: Record<string, unknown> }[] = []
    await mockBackend(page)
    page.on('request', request => {
      if (request.method() === 'POST' && request.url().endsWith('/v1/model-versions/version-1/formulas')) {
        requests.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() as Record<string, unknown> })
      }
    })
    await page.goto('/models/model-1/versions/version-1/formulas')
    await page.getByRole('button', { name: 'Create formula' }).click()
    await page.getByLabel('Formula name').fill('Visual check formula')
    await page.getByLabel('Output variable').fill('reserve')
    await page.getByLabel('Formula expression').fill('2 + 3')
    await page.getByLabel('Governed test cases (JSON)').fill('[{"name":"constant check","inputs":{},"prior_inputs":{},"expected_output":5,"abs_tol":0}]')
    await expect(page.getByText('Expression valid')).toBeVisible()
    await page.getByRole('button', { name: 'Create formula', exact: true }).last().click()
    await expect(page.getByRole('heading', { name: 'Visual check formula' })).toBeVisible()
    await page.getByRole('button', { name: 'Run all tests' }).click()
    await expect(page.getByText('All tests passed')).toBeVisible()
    expect(requests).toHaveLength(1)
    expect(requests[0].body).toMatchObject({ name: 'Visual check formula', output_variable: 'reserve', expression_text: '2 + 3' })
  })

  test('benchmark upload enforces the row limit and lists uploaded data', async ({ page }) => {
    await mockBackend(page)
    await page.goto(`/projects/${project.id}/benchmarks`)
    await expect(page.getByRole('heading', { name: 'Expected Results Benchmarks', level: 2 })).toBeVisible()
    await page.getByRole('button', { name: 'Upload benchmark' }).click()
    const csvRows = `policy_id,projection_month,reserve\n${Array.from({ length: 50_001 }, (_, index) => `P-${index},1,100`).join('\n')}`
    await page.getByLabel('Benchmark CSV or JSON file').setInputFiles({ name: 'too-many.csv', mimeType: 'text/csv', buffer: Buffer.from(csvRows) })
    await expect(page.getByRole('alert')).toContainText('maximum is 50,000')
    const overLimit = Buffer.alloc(10 * 1024 * 1024 + 1, 32)
    Buffer.from('policy_id,projection_month,reserve\n').copy(overLimit)
    await page.getByLabel('Benchmark CSV or JSON file').setInputFiles({ name: 'too-large.csv', mimeType: 'text/csv', buffer: overLimit })
    await expect(page.getByRole('alert')).toContainText('exceeds the 10 MB')
    const atLimit = Buffer.alloc(10 * 1024 * 1024, 32)
    Buffer.from('policy_id,projection_month,reserve\n').copy(atLimit)
    await page.getByLabel('Benchmark CSV or JSON file').setInputFiles({ name: 'at-limit.csv', mimeType: 'text/csv', buffer: atLimit })
    await expect(page.getByText('at-limit.csv')).toBeVisible()
    await page.getByLabel('Benchmark CSV or JSON file').setInputFiles({ name: 'reference.csv', mimeType: 'text/csv', buffer: Buffer.from('policy_id,projection_month,reserve\nPOL-1,1,1150\n') })
    await page.getByLabel('Benchmark name').fill('MYGA Reference')
    const uploadRequest = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith(`/v1/projects/${project.id}/expected-results`))
    await page.getByRole('button', { name: 'Upload benchmark', exact: true }).last().click()
    const upload = await uploadRequest
    expect(upload.postData()).toContain('MYGA Reference')
    expect(upload.postData()).toContain('timing_convention')
    await expect(page.getByRole('status')).toContainText('Uploaded Reference MYGA')
    await expect(page.locator('.m3-table tbody tr').filter({ hasText: 'Uploaded Reference MYGA' })).toBeVisible()
    await page.getByRole('button', { name: 'View data' }).last().click()
    await expect(page.getByRole('dialog', { name: 'Uploaded Reference MYGA' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'POL-1' })).toBeVisible()
  })

  test('benchmark approval updates lifecycle status for an independent reviewer', async ({ page }) => {
    const approvalRequest = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith(`/v1/expected-results/${benchmark.id}/approve`))
    await mockBackend(page)
    await page.goto(`/projects/${project.id}/benchmarks`)
    const targetRow = page.locator('.m3-table tbody tr').filter({ has: page.getByText('Reference MYGA', { exact: true }) }).first()
    await targetRow.getByRole('button', { name: 'Approve Reference MYGA' }).click()
    await approvalRequest
    await expect(targetRow.locator('.m3-status-pill')).toHaveText('approved')
    await expect(page.getByRole('status')).toContainText('Approved Reference MYGA')
  })

  test('benchmark creator cannot self-approve under the four-eyes rule', async ({ page }) => {
    let approvalRequests = 0
    await mockBackend(page, 'FAIL', 'NOT_VERIFIABLE', { userId: 'creator-1' })
    page.on('request', request => {
      if (request.method() === 'POST' && request.url().endsWith(`/v1/expected-results/${benchmark.id}/approve`)) approvalRequests += 1
    })
    await page.goto(`/projects/${project.id}/benchmarks`)
    const targetRow = page.locator('.m3-table tbody tr').filter({ has: page.getByText('Reference MYGA', { exact: true }) }).first()
    await expect(targetRow.getByRole('button', { name: 'Approve Reference MYGA' })).toBeDisabled()
    await expect(targetRow.getByText('Creator cannot self-approve')).toBeVisible()
    expect(approvalRequests).toBe(0)
  })

  test('benchmark governance errors preserve the backend message', async ({ page }) => {
    await mockBackend(page, 'FAIL', 'NOT_VERIFIABLE', {
      governanceError: { code: 'EXPECTED_RESULTS_APPROVE_FORBIDDEN', message: 'Approval permission is required for this benchmark.' },
    })
    await page.goto(`/projects/${project.id}/benchmarks`)
    await page.getByRole('button', { name: 'Approve Reference MYGA', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Approval permission is required for this benchmark.')
    await expect(page.getByRole('alert')).not.toContainText('You do not have permission')
  })

  test('benchmark can be superseded by a same-project, same-product successor', async ({ page }) => {
    const supersedeRequest = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith(`/v1/expected-results/${benchmark.id}/supersede`))
    await mockBackend(page)
    await page.goto(`/projects/${project.id}/benchmarks`)
    await page.getByRole('button', { name: 'Supersede Reference MYGA' }).first().click()
    await expect(page.getByRole('dialog', { name: 'Supersede Reference MYGA' })).toBeVisible()
    await page.getByLabel('Replacement benchmark').selectOption(successorBenchmark.id)
    await page.getByRole('button', { name: 'Confirm supersede' }).click()
    const request = await supersedeRequest
    expect(request.postDataJSON()).toEqual({ superseded_by_id: successorBenchmark.id })
    const targetRow = page.locator('.m3-table tbody tr').filter({ has: page.getByText('Reference MYGA', { exact: true }) }).first()
    await expect(targetRow.locator('.m3-status-pill')).toHaveText('superseded')
    await expect(page.getByRole('status')).toContainText('Superseded Reference MYGA')
  })

  test('benchmark routes surface project-scoped backend errors', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/projects/project-outside-workspace/benchmarks')
    await expect(page.getByRole('alert')).toContainText('Unmocked M3 test request')
    await expect(page.getByRole('alert')).toContainText('/v1/projects/project-outside-workspace/expected-results')
  })

  test('failed reconciliation displays differences and enforces exception disposition', async ({ page }) => {
    await mockBackend(page, 'FAIL', 'NOT_VERIFIABLE')
    await page.goto('/runs/run-1/reconciliation')
    await expect(page.getByRole('heading', { name: 'Run Reconciliation', level: 2 })).toBeVisible()
    await expect(page.getByText('Completed MYGA run')).toBeVisible()
    const reconciliationRequest = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/v1/runs/run-1/reconcile'))
    await page.getByRole('button', { name: 'Run reconciliation' }).click()
    const reconcile = await reconciliationRequest
    expect(reconcile.postDataJSON()).toMatchObject({ expected_result_set_id: benchmark.id, level: 'both', abs_tol: 0.01, rel_tol: 0.0001 })
    await expect(page.getByRole('heading', { name: 'FAIL', exact: true })).toBeVisible()
    await expect(page.locator('.m3-source-pill')).toHaveText('SOURCE NOT VERIFIABLE')
    await expect(page.getByRole('cell', { name: 'POL-1' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'scenario-1' })).toBeVisible()
    await expect(page.getByText('Base scenario (scenario-1)')).toBeVisible()
    await expect(page.getByText('Reference MYGA', { exact: true }).last()).toBeVisible()
    await expect(page.getByText('Failure count')).toBeVisible()
    await page.getByRole('button', { name: 'Review & sign off' }).first().click()
    const approve = page.locator('input[type="radio"][value="approved"]')
    await expect(approve).toBeDisabled()
    await expect(page.getByLabel('Approve with Exception')).toBeChecked()
    await page.getByLabel('Approve with Exception').check()
    await page.getByLabel(/Reviewer notes/).fill('Accepted timing variance for the reviewed benchmark.')
    await page.getByRole('button', { name: 'Submit disposition' }).click()
    await expect(page.getByText('Disposition saved to the audit history.')).toBeVisible()
    await expect(page.getByText('accepted timing variance', { exact: false })).toBeVisible()
  })

  test('PASS report renders successful source verification', async ({ page }) => {
    await mockBackend(page, 'PASS', 'PASS')
    await page.goto('/runs/run-1/reconciliation')
    await page.getByRole('button', { name: 'Run reconciliation' }).click()
    await expect(page.getByRole('heading', { name: 'PASS', exact: true })).toBeVisible()
    await expect(page.locator('.m3-source-pill')).toHaveText('SOURCE VERIFIED')
    await expect(page.locator('.m3-metric-card').filter({ hasText: 'Cells checked' })).toContainText('1')
    await expect(page.getByRole('row', { name: 'policy_month 1 0' })).toBeVisible()
    await expect(page.getByText('Base scenario (scenario-1)')).toBeVisible()
    await expect(page.getByText('Expected-result version')).toBeVisible()
    await expect(page.getByText('Relative tolerance', { exact: true }).last()).toBeVisible()
    await page.getByRole('button', { name: 'Review & sign off' }).first().click()
    await expect(page.locator('input[type="radio"][value="approved"]')).toBeEnabled()
    await page.getByRole('button', { name: 'Submit disposition' }).click()
    await expect(page.getByText('Disposition saved to the audit history.')).toBeVisible()
  })

  test('FAIL source verification is distinct and rejected dispositions are audited', async ({ page }) => {
    await mockBackend(page, 'FAIL', 'FAIL')
    await page.goto('/runs/run-1/reconciliation')
    await page.getByRole('button', { name: 'Run reconciliation' }).click()
    await expect(page.getByRole('heading', { name: 'FAIL', exact: true })).toBeVisible()
    await expect(page.locator('.m3-source-pill')).toHaveText('SOURCE MISMATCH')
    await page.getByRole('button', { name: 'Review & sign off' }).first().click()
    await page.getByLabel('Reject').check()
    await page.getByRole('button', { name: 'Submit disposition' }).click()
    await expect(page.getByText('Disposition saved to the audit history.')).toBeVisible()
    await expect(page.getByRole('listitem').getByText('rejected')).toBeVisible()
  })

  test('NOT_VERIFIABLE is distinct and requires an exception disposition', async ({ page }) => {
    await mockBackend(page, 'NOT_VERIFIABLE', 'NOT_VERIFIABLE')
    await page.goto('/runs/run-1/reconciliation')
    await page.getByRole('button', { name: 'Run reconciliation' }).click()
    await expect(page.getByRole('heading', { name: 'NOT_VERIFIABLE', exact: true })).toBeVisible()
    await expect(page.locator('.m3-report-banner')).toHaveClass(/is-not-verifiable/)
    await expect(page.locator('.m3-report-banner')).not.toHaveClass(/is-fail/)
    await expect(page.locator('.m3-source-pill')).toHaveText('SOURCE NOT VERIFIABLE')
    await expect(page.getByText('Reconciliation status')).toBeVisible()
    await page.getByRole('button', { name: 'Review & sign off' }).first().click()
    await expect(page.locator('input[type="radio"][value="approved"]')).toBeDisabled()
    await expect(page.getByLabel('Approve with Exception')).toBeChecked()
    await page.getByLabel(/Reviewer notes/).fill('Evidence not verifiable; exception reviewed.')
    await page.getByRole('button', { name: 'Submit disposition' }).click()
    await expect(page.getByText('Disposition saved to the audit history.')).toBeVisible()
    await expect(page.getByRole('listitem').getByText('approved_with_exception')).toBeVisible()
  })

  test('review actions are hidden from users without review roles', async ({ page }) => {
    await mockBackend(page, 'PASS', 'PASS', { roles: ['model_developer'] })
    await page.goto('/runs/run-1/reconciliation')
    await page.getByRole('button', { name: 'Run reconciliation' }).click()
    await expect(page.getByRole('heading', { name: 'PASS', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Review & sign off' })).toHaveCount(0)
  })

  test('reconciliation blocks a run from a different active project', async ({ page }) => {
    await mockBackend(page, 'PASS', 'PASS', { runProjectId: 'project-other' })
    await page.goto('/runs/run-1/reconciliation')
    await expect(page.getByRole('alert')).toContainText('different project')
    await expect(page.getByRole('button', { name: 'Run reconciliation' })).toHaveCount(0)
  })
})
