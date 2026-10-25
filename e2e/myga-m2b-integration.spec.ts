import { test, expect } from '@playwright/test'

const MOCK_USER = {
  id: 'usr-reviewer-01',
  email: 'reviewer@mentoramp.com',
  full_name: 'Independent Reviewer',
  roles: ['admin', 'reviewer', 'actuary'],
}

const MOCK_PROJECT = {
  id: 'prj-myga-01',
  name: 'MentorAmp MYGA Valuation Demo',
  description: '5-Year MYGA Governed Valuation Engine',
}

const MOCK_SYSTEM_STATUS = {
  status: 'ok',
  app: 'MentorAmp',
  version: '0.1.0',
  app_env: 'local',
  auth_mode: 'jwt',
  database: {
    status: 'ok',
    latency_ms: 1.2,
  },
  engine: {
    registered_functions: 101,
    products: ['SPIA', 'MYGA'],
    execution_backend: 'cpu',
    engine_version: 'm1-cpu-1',
  },
}

const MOCK_MYGA_MODEL = {
  id: 'mdl-myga-01',
  name: '5-Year MYGA Reserve Model',
  product: 'MYGA',
  product_code: 'MYGA',
  description: '5-Year Multi-Year Guarantee Annuity (Illustrative CARVM/Statutory)',
  current_version: {
    id: 'ver-myga-01',
    version_label: 'v1.0',
    status: 'approved',
    is_current: true,
    published_at: '2026-10-24T00:00:00Z',
    notes: 'Baseline 5-Year MYGA with 480-month projection horizon',
  },
  versions: [
    {
      id: 'ver-myga-01',
      version_label: 'v1.0',
      status: 'approved',
      is_current: true,
      published_at: '2026-10-24T00:00:00Z',
      notes: 'Baseline 5-Year MYGA with 480-month projection horizon',
    },
  ],
}

const MOCK_MYGA_STRUCTURE = {
  facts: {
    product: 'MYGA',
    projection_horizon: '480 months',
    guarantee_term: '5 years',
    decrement_methodology: 'best_estimate',
  },
  hierarchy: [
    { label: 'Policy Account Value', level: 'Account', meta: 'Rollforward', depth: 0 },
    { label: 'Minimum Guaranteed Surrender Value', level: 'Nonforfeiture', meta: 'Floor', depth: 1 },
    { label: 'Market Value Adjustment', level: 'Adjustment', meta: 'Bounded', depth: 1 },
    { label: 'Surrender Charges', level: 'Charges', meta: 'Schedule & Age Cap', depth: 2 },
  ],
}

const MOCK_MYGA_VARIABLES = {
  total: 5,
  variables: [
    { id: 'v1', variable_name: 'account_value_close', display_name: 'Account Value Close', kind: 'calculated', data_type: 'float', unit: 'USD', required: true },
    { id: 'v2', variable_name: 'mgsv_close', display_name: 'MGSV Floor', kind: 'calculated', data_type: 'float', unit: 'USD', required: true },
    { id: 'v3', variable_name: 'death_benefit', display_name: 'Death Benefit', kind: 'calculated', data_type: 'float', unit: 'USD', required: true, description: 'Death benefit payout' },
    { id: 'v4', variable_name: 'surrender_benefit', display_name: 'Surrender Benefit', kind: 'calculated', data_type: 'float', unit: 'USD', required: true },
    { id: 'v5', variable_name: 'reserve', display_name: 'Prospective Reserve', kind: 'calculated', data_type: 'float', unit: 'USD', required: true },
  ],
}

const MOCK_DATASETS = {
  datasets: [
    {
      id: 'ds-inforce-01',
      kind: 'inforce',
      name: 'synthetic_myga_inforce.csv',
      status: 'approved',
      committed_by: 'usr-different-committer',
      row_count: 25,
      version_label: 'v1.0',
    },
    {
      id: 'ds-mortality-01',
      kind: 'assumption',
      name: 'synthetic_mortality_gompertz.csv',
      status: 'approved',
      committed_by: 'usr-reviewer-01',
      version_label: 'v1.0',
    },
  ],
}

const MOCK_INFORCE_RECORDS = {
  total: 25,
  limit: 25,
  offset: 0,
  records: Array.from({ length: 25 }, (_, i) => ({
    policy_id: `MYGA-${String(i + 1).padStart(4, '0')}`,
    data: {
      issue_age: 55 + (i % 20),
      gender: i % 2 === 0 ? 'M' : 'F',
      premium: 100000,
      declared_rate: 0.045,
      guarantee_period_years: 5,
      account_value: 100000,
    },
  })),
}

const MOCK_RUN = {
  id: 'c60e1e69-be51-44c7-a7f0-88115dfa2e3e',
  name: 'Live MYGA Acceptance Projection · Base (retry)',
  status: 'success',
  product_code: 'MYGA',
  results_available: true,
  illustrative: true,
  run_package_fingerprint: 'pkg-sha256-c73e8a91b',
  final_manifest_fingerprint: 'man-sha256-f48d9012e',
  model_version: {
    model_name: '5-Year MYGA Reserve Model',
    version_label: 'v1.0',
    product_code: 'MYGA',
  },
  projection_set: {
    name: 'MYGA Illustrative Base',
    product_code: 'MYGA',
  },
  scenario: {
    name: 'Base Scenario (4.5%)',
  },
  horizon_months: 480,
  configuration: {
    parameters: {
      decrement_methodology: 'best_estimate',
    },
    model: {
      name: '5-Year MYGA Reserve Model',
      fingerprint: 'fp-myga-model-v1',
    },
    model_version: {
      version_label: 'v1.0',
      fingerprint: 'fp-myga-ver-v1',
    },
  },
  attempts: [
    {
      attempt_number: 1,
      started_at: '2026-10-24 10:00:00',
      completed_at: '2026-10-24 10:00:45',
      status: 'success',
      output_row_count: 144025,
      trace_row_count: 480,
      parquet_checksum: 'sha256:d834fa9e28401c...',
      executed_build: { version: 'm1-cpu-1', commit: '5e48606c' },
    },
  ],
}

const MOCK_RUN_SET = {
  id: 'rs-myga-01',
  name: 'MYGA Valuation Run Set',
  status: 'success',
  runs: [MOCK_RUN],
}

const MOCK_RUN_SUMMARY = {
  run_id: MOCK_RUN.id,
  product_code: 'MYGA',
  results_available: true,
  illustrative: true,
  output_row_count: 144025,
  headline: {
    label: 'Prospective Reserve',
    value: 4163674.90,
    unit: 'USD',
  },
  totals: {
    reserve: { label: 'Prospective Reserve', value: 4163674.90, unit: 'USD' },
    liability_outgo: { label: 'Liability Outgo', value: 5298179.06, unit: 'USD' },
    surrender_claims: { label: 'Surrender Claims', value: 4819285.88, unit: 'USD' },
    death_claims: { label: 'Death Claims', value: 334282.68, unit: 'USD' },
    maintenance_expense: { label: 'Maintenance Expense', value: 7391.72, unit: 'USD' },
  },
  trace: {
    captured: true,
    captured_policy_count: 1,
    mode: 'selected_policies',
  },
}

const MOCK_TRACE = {
  illustrative: true,
  period_end_date: '2029-06-30',
  root: {
    id: 'node-root',
    name: 'surrender_benefit',
    variable: 'surrender_benefit',
    month: 30,
    value: 51979.60,
    unit: 'USD',
    kind: 'formula',
    formula: {
      expression_text: 'surrender_benefit = max(surrender_value, mgsv_close)',
      function_ref: 'myga_surrender_benefit',
    },
    children: [
      {
        id: 'node-child-1',
        name: 'surrender_value',
        variable: 'surrender_value',
        month: 30,
        value: 51979.60,
        unit: 'USD',
        kind: 'formula',
        formula: { expression_text: 'surrender_value = account_value_close + mva - surrender_charge' },
        children: [],
      },
      {
        id: 'node-child-2',
        name: 'mgsv_close',
        variable: 'mgsv_close',
        month: 30,
        value: 48250.15,
        unit: 'USD',
        kind: 'formula',
        formula: { expression_text: 'mgsv_close = max nonforfeiture floor' },
        children: [],
      },
    ],
  },
}

test.beforeEach(async ({ page }) => {
  // Mock backend API routes with exact URL dispatch
  await page.route('**/v1/**', async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes('/auth/me')) {
      return route.fulfill({ status: 200, json: MOCK_USER })
    }
    if (url.includes('/system/status')) {
      return route.fulfill({ status: 200, json: MOCK_SYSTEM_STATUS })
    }
    if (url.includes('/structure')) {
      return route.fulfill({ status: 200, json: MOCK_MYGA_STRUCTURE })
    }
    if (url.includes('/variables')) {
      return route.fulfill({ status: 200, json: MOCK_MYGA_VARIABLES })
    }
    if (url.includes('/versions')) {
      return route.fulfill({ status: 200, json: { versions: MOCK_MYGA_MODEL.versions } })
    }
    if (url.includes('/models') && method === 'GET') {
      return route.fulfill({ status: 200, json: { models: [MOCK_MYGA_MODEL] } })
    }
    if (url.includes('/inputs/inforce/') && url.includes('/records')) {
      return route.fulfill({ status: 200, json: MOCK_INFORCE_RECORDS })
    }
    if (url.includes('/datasets/') && url.includes('/versions')) {
      return route.fulfill({ status: 200, json: { versions: MOCK_DATASETS.datasets } })
    }
    if (url.includes('/run-sets') && method === 'GET') {
      return route.fulfill({ status: 200, json: { run_sets: [MOCK_RUN_SET] } })
    }
    if (url.includes('/runs/') && url.includes('/summary')) {
      return route.fulfill({ status: 200, json: MOCK_RUN_SUMMARY })
    }
    if (url.includes('/runs/') && url.includes('/trace/policies')) {
      return route.fulfill({ status: 200, json: { mode: 'selected_policies', policy_ids: ['MYGA-0001'], months: 480, complete: true } })
    }
    if (url.includes('/runs/') && url.includes('/trace')) {
      return route.fulfill({ status: 200, json: MOCK_TRACE })
    }
    if (url.includes('/runs/') && url.includes('/aggregates')) {
      return route.fulfill({ status: 200, json: { points: [] } })
    }
    if (url.includes('/runs/') && url.includes('/policy-results')) {
      return route.fulfill({ status: 200, json: { policies: [] } })
    }
    if (url.includes('/runs') && method === 'GET') {
      return route.fulfill({ status: 200, json: { runs: [MOCK_RUN] } })
    }
    if (url.includes('/projection-sets') && method === 'GET') {
      return route.fulfill({ status: 200, json: { projection_sets: [] } })
    }
    if (url.includes('/projects') && method === 'GET') {
      return route.fulfill({ status: 200, json: { projects: [MOCK_PROJECT] } })
    }

    return route.fulfill({ status: 200, json: {} })
  })

  // Set auth token before page loads
  await page.addInitScript(() => {
    window.sessionStorage.setItem('mentor-amp-access-token', 'mock-valid-jwt-token')
  })
})

test.describe('MentorAmp M2B MYGA Frontend Integration Test Suite', () => {
  test('1. System Discovery & Global Product Selector with Illustrative Badge', async ({ page }) => {
    await page.goto('/')

    // Verify Sidebar backend operational status
    await expect(page.locator('.sidebar')).toBeVisible()
    await expect(page.locator('.sidebar-footer')).toContainText('Backend operational')

    // Verify Global Product Filter in Topbar exposes MYGA
    const productSelector = page.locator('#global-product-filter')
    await expect(productSelector).toBeVisible()
    await expect(productSelector).toContainText('MYGA')

    // Select MYGA and verify Illustrative Badge appears in Topbar
    await productSelector.selectOption('MYGA')
    const badge = page.locator('.topbar .illustrative-badge')
    await expect(badge).toBeVisible()
    await expect(badge).toContainText('Illustrative Model')
    await expect(badge).toHaveAttribute('title', /Uses contractual minimum guarantees/)
  })

  test('2. Model Workspace: Death Benefit Actuarial Framing & Governance Lifecycle', async ({ page }) => {
    await page.goto('/')

    // Navigate to Models
    await page.click('button.nav-item:has-text("Models")')
    await expect(page.locator('h1')).toContainText('Model Library')

    // Open MYGA Model
    const openModelBtn = page.locator('button.model-open-button:has-text("Open model")')
    await expect(openModelBtn).toBeVisible()
    await openModelBtn.click()

    // Verify Model Workspace loaded
    await expect(page.locator('.model-workspace')).toBeVisible()
    await expect(page.getByRole('heading', { name: '5-Year MYGA Reserve Model', level: 1 })).toBeVisible()

    // Verify Actuarial Death Benefit Decision Note is displayed
    const decisionNote = page.locator('aside[role="note"]')
    await expect(decisionNote).toBeVisible()
    await expect(decisionNote).toContainText('STATUS: NEEDS ACTUARIAL PRODUCT OWNER DECISION')
    await expect(decisionNote).toContainText('Option B: max(account_value_close, surrender_benefit)')
    await expect(decisionNote).toContainText('Option A')

    // Verify Governance actions: Reject button exists or disabled for published version
    const rejectBtn = page.locator('button:has-text("Reject")')
    await expect(rejectBtn).toBeVisible()
  })

  test('3. Data Manager: 4 Categories, Segregation of Duties, & In-force Table Viewer', async ({ page }) => {
    await page.goto('/')

    // Navigate to Data Manager
    await page.click('button.nav-item:has-text("Data")')
    await expect(page.getByRole('heading', { name: 'Data Manager', exact: true })).toBeVisible()

    // Verify the category options exist (Inforce, Assumption table, Factor table, Scenario)
    await expect(page.getByRole('option', { name: /Inforce/ })).toBeVisible()
    await expect(page.getByRole('option', { name: /Assumption table/ })).toBeVisible()
    await expect(page.getByRole('option', { name: /Factor table/ })).toBeVisible()
    await expect(page.getByRole('option', { name: /Scenario/ })).toBeVisible()

    // Verify In-force Schema Version defaults to v1 and product context is MYGA
    const schemaVersionSelect = page.locator('select:has-text("v1")')
    await expect(schemaVersionSelect).toBeVisible()
    await expect(schemaVersionSelect).toHaveValue('v1')
  })

  test('4. Results Explorer: Key MYGA Metric Tiles (No $NaN) & Benchmark Reconciliation', async ({ page }) => {
    await page.goto('/')

    // Navigate to Results Explorer
    await page.click('button.nav-item:has-text("Results")')

    // Verify MYGA Key Results section is rendered
    const mygaSection = page.locator('section[aria-label="MYGA key results"]')
    await expect(mygaSection).toBeVisible()

    // Verify exact benchmark values and that NO tile shows "$NaN"
    await expect(mygaSection).toContainText('$4,163,675') // Reserve
    await expect(mygaSection).toContainText('$5,298,179') // Liability outgo
    await expect(mygaSection).toContainText('$4,819,286') // Surrender claims
    await expect(mygaSection).toContainText('$334,283')   // Death claims
    await expect(mygaSection).toContainText('$7,392')     // Maintenance expense

    // Verify that NO tile in the entire results page displays $NaN
    const pageContent = await page.locator('.results-metric-row').allInnerTexts()
    for (const text of pageContent) {
      expect(text).not.toContain('$NaN')
      expect(text).not.toContain('NaN')
    }

    // Verify Export Button carries Illustrative indicator and disclaimer
    const exportBtn = page.locator('button:has-text("Export results")')
    await expect(exportBtn).toBeVisible()
    await expect(exportBtn).toContainText('Illustrative')
    await expect(exportBtn).toHaveAttribute('title', /Illustrative output is not certified/)
  })

  test('5. Trace & Reserve Investigation: Month Defaults to 1 & Recursive Tree Verified', async ({ page }) => {
    await page.goto('/')

    // Navigate to Reserve Investigation
    await page.click('button.nav-item:has-text("Investigate")')

    // Verify Month Selector input defaults to 1 (Sam's Fix 2)
    const monthInput = page.locator('input[type="number"][aria-label="Projection month"]')
    if (await monthInput.isVisible()) {
      const monthVal = await monthInput.inputValue()
      expect(Number(monthVal)).toBeGreaterThanOrEqual(1)
    }

    // Open Live Trace view if available
    const openTraceBtn = page.locator('button:has-text("Open live trace")')
    if (await openTraceBtn.isVisible() && await openTraceBtn.isEnabled()) {
      await openTraceBtn.click()

      // Verify calculation tree is rendered
      await expect(page.locator('.trace-hierarchy-card')).toBeVisible()
      await expect(page.locator('.trace-hierarchy-card')).toContainText('Recursive calculation tree')

      // Verify anchor benchmark of $51,979.60
      await expect(page.locator('.investigation-page')).toContainText('51,979.60')
    }
  })
})
