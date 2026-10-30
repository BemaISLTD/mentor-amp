import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Check, CircleAlert, LoaderCircle, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { ApiError, useApi } from '../../api/ApiProvider'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import { canReviewData } from '../../api/permissions'
import { useFocusTrap } from './useFocusTrap'
import type { ApiUser } from '../../api/ApiProvider'
import type { ExpectedResultSet, ReconciliationFailure, ReconciliationReport } from './types'

type Props = { initialRunId?: string; navigate: (path: string) => void; user: ApiUser | null }
type RunContext = {
  id: string
  name?: string
  project_id?: string
  status?: string
  model_version?: { product_code?: string; model_name?: string; version_label?: string }
}
type RunSet = { id: string; name: string; runs?: { id: string; name?: string; status?: string }[] }
type RunOption = { id: string; name: string; status: string }
const EMPTY_BENCHMARKS: ExpectedResultSet[] = []
const EMPTY_FAILURES: ReconciliationFailure[] = []

function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return error instanceof Error ? error.message : 'The request failed.'
  const guidance: Record<string, string> = {
    EXPECTED_RESULTS_PRODUCT_MISMATCH: 'Select a benchmark that matches the run product.',
    EXPECTED_RESULTS_TIMING_MISMATCH: 'Benchmark and run timing conventions differ.',
    EXPECTED_RESULTS_GRANULARITY_MISMATCH: 'The selected reconciliation level is incompatible with this benchmark.',
    RECONCILIATION_CANNOT_APPROVE_FAILED: 'A failed report must be approved with exception.',
    RECONCILIATION_EXCEPTION_REASON_REQUIRED: 'Enter at least five characters describing the exception.',
    RECONCILIATION_DISPOSITION_INVALID: 'Choose an allowed disposition and provide the required notes.',
    RECONCILIATION_DISPOSITION: 'Choose an allowed disposition and provide the required notes.',
  }
  return guidance[error.code ?? ''] ? `${error.message} ${guidance[error.code ?? '']}` : error.message
}

function money(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: 8 })
}

export function Reconciliation({ initialRunId, navigate, user }: Props) {
  const { projectId } = useWorkspace()
  const { request } = useApi()
  const benchmarksQuery = useApiQuery<{ expected_result_sets: ExpectedResultSet[] }>(projectId ? `/v1/projects/${projectId}/expected-results` : null)
  const benchmarks = benchmarksQuery.data?.expected_result_sets ?? EMPTY_BENCHMARKS
  const [runId, setRunId] = useState(initialRunId ?? '')
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState('')
  const [level, setLevel] = useState<'policy_month' | 'aggregate_year' | 'both'>('both')
  const [absTol, setAbsTol] = useState('0.01')
  const [relTol, setRelTol] = useState('0.0001')
  const [variables, setVariables] = useState('')
  const [policyId, setPolicyId] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reportId, setReportId] = useState('')
  const [failureFilter, setFailureFilter] = useState('')
  const [dispositionOpen, setDispositionOpen] = useState(false)
  const [disposition, setDisposition] = useState<'approved' | 'approved_with_exception' | 'exception_noted' | 'rejected'>('approved')
  const [notes, setNotes] = useState('')
  const [dispositionError, setDispositionError] = useState('')
  const [dispositionBusy, setDispositionBusy] = useState(false)
  const [dispositionSuccess, setDispositionSuccess] = useState('')
  const [runOptions, setRunOptions] = useState<RunOption[]>([])
  const [runOptionsError, setRunOptionsError] = useState('')
  const [runsLoading, setRunsLoading] = useState(false)
  const dispositionDialogRef = useRef<HTMLElement | null>(null)
  useFocusTrap(dispositionDialogRef, dispositionOpen)
  const runSetsQuery = useApiQuery<{ run_sets: RunSet[] }>(projectId && !initialRunId ? `/v1/projects/${projectId}/run-sets?limit=10` : null)
  const runQuery = useApiQuery<RunContext>(runId ? `/v1/runs/${runId}` : null)
  const run = runQuery.data
  const runBelongsToProject = Boolean(run && (!projectId || !run.project_id || run.project_id === projectId))
  const reportQuery = useApiQuery<ReconciliationReport>(reportId ? `/v1/reconciliations/${reportId}` : null)
  const report = reportQuery.data
  const reportsQuery = useApiQuery<{ reconciliations: ReconciliationReport[] }>(runId ? `/v1/runs/${runId}/reconciliations` : null)
  const canDisposition = canReviewData(user?.roles ?? [])
  const product = run?.model_version?.product_code
  const compatibleBenchmarks = useMemo(() => product ? benchmarks.filter(item => item.product_code.toLowerCase() === product.toLowerCase()) : benchmarks, [benchmarks, product])
  const selectedBenchmark = benchmarks.find(item => item.id === selectedBenchmarkId)
  const failures = report?.failures ?? EMPTY_FAILURES
  const visibleFailures = useMemo(() => {
    const query = failureFilter.trim().toLowerCase()
    if (!query) return failures
    return failures.filter(item => `${item.level} ${item.policy_id ?? ''} ${item.projection_month ?? ''} ${item.variable} ${item.actual ?? ''} ${item.expected ?? ''}`.toLowerCase().includes(query))
  }, [failures, failureFilter])

  useEffect(() => {
    const nextRunId = initialRunId ?? ''
    setRunId(current => current === nextRunId ? current : nextRunId)
    setReportId('')
  }, [initialRunId])
  useEffect(() => {
    if (!dispositionOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !dispositionBusy) setDispositionOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dispositionOpen, dispositionBusy])
  useEffect(() => {
    if (initialRunId || !projectId) return
    let active = true
    setRunsLoading(true)
    setRunOptionsError('')
    const runSets = runSetsQuery.data?.run_sets ?? []
    if (!runSets.length) {
      if (!runSetsQuery.loading) { setRunOptions([]); setRunsLoading(false) }
      return () => { active = false }
    }
    Promise.all(runSets.map(async item => {
      const detail = await request<{ runs?: { id: string; name?: string; status?: string }[] }>(`/v1/run-sets/${item.id}`)
      return (detail.runs ?? []).map(runItem => ({ id: runItem.id, name: `${item.name} · ${runItem.name ?? runItem.id.slice(0, 8)}`, status: runItem.status ?? 'unknown' }))
    })).then(results => { if (active) setRunOptions(results.flat()) })
      .catch(error => { if (active) setRunOptionsError(error instanceof Error ? error.message : 'Could not load runs.') })
      .finally(() => { if (active) setRunsLoading(false) })
    return () => { active = false }
  }, [initialRunId, projectId, runSetsQuery.data, runSetsQuery.loading, request])
  useEffect(() => {
    if (compatibleBenchmarks.length && !compatibleBenchmarks.some(item => item.id === selectedBenchmarkId)) setSelectedBenchmarkId(compatibleBenchmarks[0].id)
  }, [compatibleBenchmarks, selectedBenchmarkId])
  useEffect(() => {
    if (selectedBenchmark?.granularity === 'aggregate_year') setLevel('aggregate_year')
    else if (selectedBenchmark?.granularity === 'policy_month' && level === 'aggregate_year') setLevel('policy_month')
  }, [selectedBenchmark?.id])
  useEffect(() => {
    if (reportId) setDispositionSuccess('')
  }, [reportId])

  const selectRun = (id: string) => {
    setRunId(id)
    setReportId('')
    setSubmitError('')
    setDispositionSuccess('')
    if (id) navigate(`/runs/${id}/reconciliation`)
  }
  const runReconciliation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError('')
    setDispositionSuccess('')
    const abs = Number(absTol)
    const rel = Number(relTol)
    if (!runId || !selectedBenchmarkId) { setSubmitError('Select a run and a benchmark.'); return }
    if (run?.status !== 'success' && run?.status !== 'partial_success') { setSubmitError('Reconciliation requires a completed run with available results.'); return }
    if (!Number.isFinite(abs) || abs < 0 || !Number.isFinite(rel) || rel < 0) { setSubmitError('Tolerances must be finite, non-negative numbers.'); return }
    setSubmitting(true)
    try {
      const result = await request<ReconciliationReport>(`/v1/runs/${runId}/reconcile`, {
        method: 'POST',
        body: JSON.stringify({
          expected_result_set_id: selectedBenchmarkId,
          level,
          abs_tol: abs,
          rel_tol: rel,
          variables: variables.trim() ? variables.split(',').map(item => item.trim()).filter(Boolean) : undefined,
          policy_id: policyId.trim() || undefined,
        }),
      })
      setReportId(result.id)
      reportsQuery.refetch()
    } catch (error) {
      setSubmitError(messageFor(error))
    } finally {
      setSubmitting(false)
    }
  }
  const submitDisposition = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setDispositionError('')
    if (!report) return
    const cleanNotes = notes.trim()
    if (report.status === 'FAIL' && disposition === 'approved') {
      setDispositionError('A failed report cannot be approved without exception.')
      return
    }
    if ((disposition === 'approved_with_exception' || disposition === 'exception_noted') && cleanNotes.length < 5) {
      setDispositionError('Reviewer notes must contain at least five characters for an exception.')
      return
    }
    setDispositionBusy(true)
    try {
      await request<ReconciliationReport>(`/v1/reconciliations/${report.id}/disposition`, {
        method: 'POST',
        body: JSON.stringify({ disposition_status: disposition, disposition_notes: cleanNotes || undefined }),
      })
      setDispositionOpen(false)
      setNotes('')
      setDispositionSuccess('Disposition saved to the audit history.')
      reportQuery.refetch()
    } catch (error) {
      setDispositionError(messageFor(error))
    } finally {
      setDispositionBusy(false)
    }
  }

  return <section className="m3-workspace">
    <header className="m3-page-heading">
      <div><span className="m3-eyebrow">ACTUARIAL VALIDATION</span><h2>Run Reconciliation</h2><p>Compare a completed run to a governed benchmark, inspect differences, and record reviewer disposition.</p></div>
      {report && canDisposition && <button className="m3-primary-button" type="button" onClick={() => { setDispositionOpen(true); setDispositionError(''); setDisposition('approved'); setNotes('') }}><ShieldCheck size={16} />Review &amp; sign off</button>}
    </header>
    <section className="m3-panel">
      <div className="m3-section-heading"><div><span className="m3-eyebrow">RECONCILIATION SETUP</span><h3>Select a completed run and benchmark</h3></div></div>
      {runSetsQuery.loading && !runSetsQuery.data && <div className="m3-loading" role="status"><LoaderCircle className="m3-spin" />Loading recent runs…</div>}
      {runSetsQuery.error && !initialRunId && <div className="m3-inline-error" role="alert">{runSetsQuery.error.message}<button className="m3-text-button" type="button" onClick={runSetsQuery.refetch}>Retry</button></div>}
      <div className="m3-form-grid">
        {!initialRunId && <label>Recent run<select aria-label="Recent run" value={runId} onChange={event => selectRun(event.target.value)}><option value="">Select a recent run…</option>{runOptions.map(option => <option key={option.id} value={option.id}>{option.name} · {option.status}</option>)}</select></label>}
        <label>{initialRunId ? 'Run ID' : 'Or enter run ID'}<input value={runId} onChange={event => { setRunId(event.target.value.trim()); setReportId('') }} onBlur={() => { if (runId) navigate(`/runs/${runId}/reconciliation`) }} placeholder="Run UUID" /></label>
      </div>
      {runQuery.loading && runId && <div className="m3-loading" role="status"><LoaderCircle className="m3-spin" />Loading run details…</div>}
      {runQuery.error && runId && <div className="m3-inline-error" role="alert">{runQuery.error.message}<button className="m3-text-button" type="button" onClick={runQuery.refetch}>Retry</button></div>}
      {run && <div className="m3-run-summary"><b>{run.name ?? run.id}</b><span>{run.status ?? 'status unknown'}</span><span>{run.model_version?.model_name ?? 'Model unavailable'} · {run.model_version?.version_label ?? 'Version unavailable'}</span><span>Product: {product ?? 'Not available'}</span></div>}
      {runOptionsError && <p className="m3-error-text">{runOptionsError}</p>}
      {runsLoading && !runOptions.length && <p className="m3-muted">Loading selectable runs…</p>}
      {run && !runBelongsToProject && <div className="m3-inline-error" role="alert">This run belongs to a different project than the active workspace. Switch projects before reconciling.</div>}
      {run && runBelongsToProject && run.status !== 'success' && run.status !== 'partial_success' && <div className="m3-inline-warning" role="status">Reconciliation is available after this run completes successfully or with partial results.</div>}
      {run && runBelongsToProject && compatibleBenchmarks.length === 0 && <div className="m3-inline-warning" role="status">{product ? `No ${product} benchmarks are available in this project.` : 'Run product is not available; benchmark compatibility cannot be verified.'}</div>}
      {run && runBelongsToProject && (run.status === 'success' || run.status === 'partial_success') && <form onSubmit={runReconciliation}>
        <div className="m3-form-grid">
          <label>Expected results benchmark<select required value={selectedBenchmarkId} onChange={event => setSelectedBenchmarkId(event.target.value)} disabled={!compatibleBenchmarks.length}><option value="">Select a benchmark…</option>{compatibleBenchmarks.map(item => <option key={item.id} value={item.id}>{item.name} · {item.product_code} · {item.granularity} · {item.version_label}</option>)}</select>{product && compatibleBenchmarks.length !== benchmarks.length && <small>Only benchmarks matching {product} are shown.</small>}</label>
          <label>Comparison level<select value={level} onChange={event => setLevel(event.target.value as 'policy_month' | 'aggregate_year' | 'both')}><option value="both" disabled={selectedBenchmark?.granularity === 'aggregate_year'}>Both levels</option><option value="policy_month" disabled={selectedBenchmark?.granularity === 'aggregate_year'}>Policy month</option><option value="aggregate_year" disabled={selectedBenchmark?.granularity === 'policy_month'}>Aggregate year</option></select></label>
          <label>Absolute tolerance<input type="number" step="any" min="0" required value={absTol} onChange={event => setAbsTol(event.target.value)} /></label>
          <label>Relative tolerance<input type="number" step="any" min="0" required value={relTol} onChange={event => setRelTol(event.target.value)} /></label>
          <label>Variables (optional, comma-separated)<input value={variables} onChange={event => setVariables(event.target.value)} placeholder="reserve, net_cash_flow" /></label>
          <label>Policy ID (optional)<input value={policyId} onChange={event => setPolicyId(event.target.value)} /></label>
        </div>
        {selectedBenchmark && <div className="m3-audit-snapshot"><b>Selected benchmark snapshot</b><span>{selectedBenchmark.product_code} · {selectedBenchmark.granularity} · {selectedBenchmark.timing_convention ?? 'timing not specified'}</span><code>{selectedBenchmark.fingerprint}</code></div>}
        {submitError && <div className="m3-inline-error" role="alert">{submitError}</div>}
        <div className="m3-formula-actions"><button className="m3-primary-button" type="submit" disabled={submitting || !selectedBenchmarkId}>{submitting ? <LoaderCircle className="m3-spin" size={16} /> : <RefreshCw size={16} />}{submitting ? 'Reconciling…' : 'Run reconciliation'}</button></div>
      </form>}
    </section>
    {runId && reportsQuery.data?.reconciliations?.length ? <section className="m3-panel"><div className="m3-section-heading"><div><h3>Previous reports for this run</h3></div></div><div className="m3-report-list">{reportsQuery.data.reconciliations.map(item => <button key={item.id} type="button" className={`m3-report-choice ${item.id === reportId ? 'is-selected' : ''}`} onClick={() => setReportId(item.id)}><b>{item.status}</b><span>{item.level} · {item.created_at ? new Date(item.created_at).toLocaleString() : item.id}</span></button>)}</div></section> : null}
    {reportId && reportQuery.loading && !report && <section className="m3-panel"><div className="m3-loading" role="status"><LoaderCircle className="m3-spin" />Loading reconciliation report…</div></section>}
    {reportId && reportQuery.error && <section className="m3-panel"><div className="m3-inline-error" role="alert">{reportQuery.error.message}<button className="m3-text-button" type="button" onClick={reportQuery.refetch}>Retry</button></div></section>}
    {report && <ReportView report={report} failureFilter={failureFilter} setFailureFilter={setFailureFilter} visibleFailures={visibleFailures} canDisposition={canDisposition} dispositionSuccess={dispositionSuccess} onOpenDisposition={() => { setDispositionOpen(true); setDispositionError(''); setDisposition('approved'); setNotes('') }} />}
    {dispositionOpen && report && <div className="m3-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !dispositionBusy) setDispositionOpen(false) }}>
      <section ref={dispositionDialogRef} tabIndex={-1} className="m3-modal" role="dialog" aria-modal="true" aria-labelledby="m3-disposition-title">
        <div className="m3-section-heading"><div><span className="m3-eyebrow">REVIEWER ACTION</span><h2 id="m3-disposition-title">Actuary sign-off</h2></div><button autoFocus className="m3-icon-button" type="button" aria-label="Close disposition dialog" onClick={() => setDispositionOpen(false)} disabled={dispositionBusy}><X size={18} /></button></div>
        <p>Report status: <b className={report.status === 'PASS' ? 'm3-success-text' : 'm3-error-text'}>{report.status}</b></p>
        <form onSubmit={submitDisposition}>
          <fieldset className="m3-disposition-options"><legend>Disposition</legend>
            <label className={report.status === 'FAIL' ? 'is-disabled' : ''}><input type="radio" name="disposition" value="approved" checked={disposition === 'approved'} disabled={report.status === 'FAIL'} onChange={() => setDisposition('approved')} />Approve{report.status === 'FAIL' && <small>Cannot approve a failing report without exception.</small>}</label>
            <label><input type="radio" name="disposition" value="approved_with_exception" checked={disposition === 'approved_with_exception'} onChange={() => setDisposition('approved_with_exception')} />Approve with Exception</label>
            <label><input type="radio" name="disposition" value="exception_noted" checked={disposition === 'exception_noted'} onChange={() => setDisposition('exception_noted')} />Record Exception (no approval)</label>
            <label><input type="radio" name="disposition" value="rejected" checked={disposition === 'rejected'} onChange={() => setDisposition('rejected')} />Reject</label>
          </fieldset>
          <label className="m3-field-label">Reviewer notes{(disposition === 'approved_with_exception' || disposition === 'exception_noted') && <span className="m3-required"> · required, minimum 5 characters</span>}<textarea rows={4} value={notes} onChange={event => setNotes(event.target.value)} aria-required={disposition === 'approved_with_exception' || disposition === 'exception_noted'} /></label>
          {dispositionError && <div className="m3-inline-error" role="alert">{dispositionError}</div>}
          <div className="m3-modal-actions"><button type="button" className="m3-secondary-button" onClick={() => setDispositionOpen(false)} disabled={dispositionBusy}>Cancel</button><button type="submit" className="m3-primary-button" disabled={dispositionBusy}>{dispositionBusy ? 'Saving…' : 'Submit disposition'}</button></div>
        </form>
      </section>
    </div>}
  </section>
}

function ReportView({ report, failureFilter, setFailureFilter, visibleFailures, canDisposition, dispositionSuccess, onOpenDisposition }: {
  report: ReconciliationReport
  failureFilter: string
  setFailureFilter: (value: string) => void
  visibleFailures: ReconciliationFailure[]
  canDisposition: boolean
  dispositionSuccess: string
  onOpenDisposition: () => void
}) {
  const summary = report.summary ?? {}
  const source = summary.source_to_output_check
  const sourceState = source?.status?.toUpperCase() ?? 'NOT_VERIFIABLE'
  const sourceLabel = sourceState === 'PASS' ? 'SOURCE VERIFIED' : sourceState === 'FAIL' ? 'SOURCE MISMATCH' : 'SOURCE NOT VERIFIABLE'
  const reportedLevelRows = Object.entries(summary.by_level ?? summary.per_level_summary ?? {})
  const checkedCells = summary.cells_checked ?? summary.total_cells_checked
  const levelRows: [string, { cells_checked?: number; cells_failed?: number }][] = reportedLevelRows.length
    ? reportedLevelRows
    : (report.level === 'policy_month' || report.level === 'aggregate_year') && checkedCells != null
      ? [[report.level, { cells_checked: checkedCells, cells_failed: summary.cells_failed }]]
      : []
  const variableRows = Object.entries(summary.by_variable ?? summary.per_variable_summary ?? {})
  return <section className="m3-report-stack">
    <article className={`m3-report-banner ${report.status === 'PASS' ? 'is-pass' : 'is-fail'}`}><div><span className="m3-eyebrow">RECONCILIATION RESULT</span><h2>{report.status}</h2><p>Run {report.run_id} · {report.level} · report {report.id}</p></div><span className={`m3-source-pill source-${sourceState.toLowerCase()}`}>{sourceLabel}</span></article>
    {dispositionSuccess && <div className="m3-success-banner" role="status"><Check size={16} />{dispositionSuccess}</div>}
    <div className="m3-report-metrics">
      <Metric label="Cells checked" value={checkedCells} />
      <Metric label="Cells failed" value={summary.cells_failed} />
      <Metric label="Max absolute diff" value={summary.max_abs_diff} />
      <Metric label="Max relative diff" value={summary.max_rel_diff} />
    </div>
    <section className="m3-panel">
      <div className="m3-section-heading"><div><span className="m3-eyebrow">AUDIT SNAPSHOT</span><h3>Comparison evidence</h3></div>{canDisposition && <button className="m3-secondary-button" type="button" onClick={onOpenDisposition}><ShieldCheck size={15} />Review &amp; sign off</button>}</div>
      <div className="m3-audit-grid"><span>Benchmark version <b>{report.expected_result_version ?? '—'}</b></span><span>Timing convention <b>{report.timing_convention_snapshot ?? '—'}</b></span><span>Granularity <b>{report.granularity_snapshot ?? '—'}</b></span><span>Absolute tolerance <b>{report.abs_tol}</b></span><span>Relative tolerance <b>{report.rel_tol}</b></span><span>Fingerprint <code>{report.expected_result_fingerprint ?? '—'}</code></span><span>Disposition <b>{report.disposition_status ?? 'pending'}</b></span><span>Reviewer <b>{report.disposition_by ?? '—'}</b></span><span>Reviewed at <b>{report.disposition_at ? new Date(report.disposition_at).toLocaleString() : '—'}</b></span></div>
      {source && <div className={`m3-source-detail source-${sourceState.toLowerCase()}`}><b>{sourceLabel}</b><span>{sourceDetail(source)}</span>{source.inforce_rows_checked != null && <span>Inforce rows checked: {source.inforce_rows_checked}</span>}{source.source_policy_count != null && <span>Source policies: {source.source_policy_count}</span>}{source.actual_policy_count != null && <span>Run policies: {source.actual_policy_count}</span>}</div>}
    </section>
    <section className="m3-report-breakdowns">
      <article className="m3-panel"><div className="m3-section-heading"><h3>By variable</h3></div>{variableRows.length ? <div className="m3-table-scroll"><table className="m3-table"><thead><tr><th>Variable</th><th>Cells checked</th><th>Cells failed</th><th>Max abs diff</th></tr></thead><tbody>{variableRows.map(([name, value]) => <tr key={name}><td>{name}</td><td>{value.cells_checked ?? '—'}</td><td>{value.cells_failed ?? '—'}</td><td>{money(value.max_abs_diff)}</td></tr>)}</tbody></table></div> : <p className="m3-muted">No variable breakdown was returned.</p>}</article>
      <article className="m3-panel"><div className="m3-section-heading"><h3>By comparison level</h3></div>{levelRows.length ? <div className="m3-table-scroll"><table className="m3-table"><thead><tr><th>Level</th><th>Cells checked</th><th>Cells failed</th></tr></thead><tbody>{levelRows.map(([name, value]) => <tr key={name}><td>{name}</td><td>{value.cells_checked ?? '—'}</td><td>{value.cells_failed ?? '—'}</td></tr>)}</tbody></table></div> : <p className="m3-muted">No level breakdown was returned.</p>}</article>
    </section>
    {report.status === 'FAIL' && <section className="m3-panel">
      <div className="m3-section-heading"><div><span className="m3-eyebrow">CELL-LEVEL DIFFERENCES</span><h3>Failed comparison cells</h3><span>{summary.total_failures_count ?? report.failures.length} failure(s)</span></div><label className="m3-search-label">Filter failures<input value={failureFilter} onChange={event => setFailureFilter(event.target.value)} placeholder="Policy, month, variable…" /></label></div>
      {summary.failures_truncated && <div className="m3-inline-warning" role="status">Showing the first {report.failures.length.toLocaleString()} failures. The backend caps retained detail at 1,000 cells; total failures: {(summary.total_failures_count ?? report.failures.length).toLocaleString()}.</div>}
      {!visibleFailures.length ? <div className="m3-empty-state"><CircleAlert size={20} /><p>{report.failures.length ? 'No failures match this filter.' : 'The report has no cell-level failure details.'}</p></div> : <div className="m3-table-scroll"><table className="m3-table"><thead><tr><th>Level</th><th>Policy ID</th><th>Month</th><th>Variable</th><th>Actual</th><th>Expected</th><th>Abs diff</th><th>Rel diff</th><th>Tolerance</th></tr></thead><tbody>{visibleFailures.map((failure, index) => <tr key={`${failure.level}-${failure.policy_id}-${failure.projection_month}-${failure.variable}-${index}`}><td>{failure.level}</td><td>{failure.policy_id ?? '—'}</td><td>{failure.projection_month ?? '—'}</td><td>{failure.variable}</td><td>{money(failure.actual)}</td><td>{money(failure.expected)}</td><td>{money(failure.abs_diff)}</td><td>{money(failure.rel_diff)}</td><td>±{money(failure.abs_tol)} / {money(failure.rel_tol)} rel</td></tr>)}</tbody></table></div>}
    </section>}
    <section className="m3-panel"><div className="m3-section-heading"><div><span className="m3-eyebrow">AUDIT HISTORY</span><h3>Disposition timeline</h3></div><span className="m3-status-pill">{report.disposition_status ?? 'pending'}</span></div>
      {report.disposition_history?.length ? <ol className="m3-timeline">{report.disposition_history.map((item, index) => <li key={`${item.at ?? item.timestamp ?? index}-${index}`}><i /><div><b>{item.to_status ?? item.disposition_status ?? item.action ?? 'Disposition recorded'}</b><span>{item.at ?? item.timestamp ? new Date(item.at ?? item.timestamp ?? '').toLocaleString() : 'Timestamp unavailable'} · {item.by ?? item.user ?? item.actor ?? 'Reviewer'}</span>{item.notes && <p>{item.notes}</p>}</div></li>)}</ol> : <div className="m3-empty-state"><p>No reviewer disposition has been recorded.</p></div>}
    </section>
  </section>
}

function Metric({ label, value }: { label: string; value?: number }) {
  return <article className="m3-metric-card"><span>{label}</span><b>{money(value)}</b></article>
}

function sourceDetail(source: NonNullable<ReconciliationReport['summary']['source_to_output_check']>): string {
  if (source.detail) return source.detail
  if (source.not_verifiable || source.status.toUpperCase() === 'NOT_VERIFIABLE') {
    return 'The backend could not verify source-to-output consistency for this run.'
  }
  const opening = source.opening_account_value
  if (opening?.available) {
    const policyCount = opening.policies_checked ?? source.source_policy_count
    const policyText = policyCount == null ? '' : ` Opening account value checked for ${policyCount} ${policyCount === 1 ? 'policy' : 'policies'}.`
    const difference = opening.max_abs_diff == null ? '' : ` Maximum opening-balance difference: ${money(opening.max_abs_diff)}.`
    return `${opening.passed ? 'Opening account values matched.' : 'Opening account values did not match.'}${policyText}${difference}`
  }
  return source.status.toUpperCase() === 'PASS'
    ? 'The backend source-to-output verification passed.'
    : 'The backend source-to-output verification failed.'
}
