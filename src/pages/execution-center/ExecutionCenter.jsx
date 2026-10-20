import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Clock3,
  Cpu,
  FileText,
  Pause,
  Play,
  Server,
  ShieldCheck,
  Square,
  X,
} from 'lucide-react'
import { useApp } from '../../context/useApp'
import { ApiError, useApi } from '../../api/ApiProvider'
import './execution-center.css'

const executionSteps = [
  { name: 'Base projection', state: 'Completed' },
  { name: 'Low rate projection', state: 'Completed' },
  { name: 'High rate projection', state: 'Completed' },
  { name: 'Sensitivity scenarios', state: 'Completed' },
  { name: 'Reserve aggregation', state: 'Completed' },
  { name: 'Actuarial reporting', state: 'Running' },
  { name: 'Quality checks', state: 'Pending' },
  { name: 'Executive summary', state: 'Pending' },
  { name: 'Report rendering', state: 'Pending' },
]

const initialLogs = [
  '08:42:11 · Immutable run snapshot created',
  '08:42:19 · Input versions pinned and validated',
  '08:44:02 · Base projection completed',
  '08:51:36 · Sensitivity scenarios completed',
  '09:01:08 · Actuarial reporting in progress',
]

const normalizeRunStatus = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return normalized === 'completed' ? 'success' : normalized
}
const labelForRunStatus = (value) => ({
  pending: 'Pending',
  running: 'Running',
  success: 'Completed',
  partial_success: 'Partial success',
  failed: 'Failed',
  cancelled: 'Cancelled',
  queued: 'Queued',
})[normalizeRunStatus(value)] ?? String(value ?? 'Unknown')

const formatEvidenceJson = (value) => JSON.stringify(value, null, 2)

function RunEvidencePanel({ evidence, onClose }) {
  if (!evidence) return null
  const packageData = evidence.package
  const frozenPackage = packageData?.package
  const configuration = frozenPackage?.configuration
  const manifest = evidence.manifest
  const attempts = evidence.attempts?.attempts ?? []
  const steps = evidence.steps?.steps ?? []
  const datasets = configuration?.datasets
    ? Object.values(configuration.datasets).flat().filter(Boolean)
    : []

  return (
    <section className="execution-evidence-panel" aria-label="Run evidence">
      <div className="execution-evidence-heading">
        <div><h3>Run evidence</h3><p>Frozen inputs and execution records for run {evidence.runId}</p></div>
        <button className="execution-run-control" onClick={onClose}>Close evidence</button>
      </div>
      {evidence.loading && <p role="status">Loading run, package, manifest, attempts, and steps…</p>}
      {evidence.errors?.length > 0 && (
        <div className="execution-evidence-errors" role="alert">
          <b>Some evidence could not be loaded:</b>
          {evidence.errors.map(error => <p key={error}>{error}</p>)}
        </div>
      )}

      {evidence.run && (
        <div className="execution-evidence-section">
          <h4>Run status</h4>
          <div className="execution-evidence-summary">
            <span><b>Status</b>{labelForRunStatus(evidence.run.status)}</span>
            <span><b>Attempt</b>{evidence.run.accepted_attempt_number ?? evidence.run.attempt_count ?? 'Not accepted yet'}</span>
            <span><b>Run package fingerprint</b>{evidence.run.run_package_fingerprint ?? 'Unavailable'}</span>
            <span><b>Final manifest fingerprint</b>{evidence.run.final_manifest_fingerprint ?? 'Not available yet'}</span>
            {evidence.run.retried_from_run_id && <span><b>Retried from</b>{evidence.run.retried_from_run_id}</span>}
          </div>
        </div>
      )}

      {packageData && (
        <div className="execution-evidence-section">
          <h4>Frozen package</h4>
          <div className="execution-evidence-summary">
            <span><b>Fingerprint</b>{packageData.fingerprint ?? frozenPackage?.fingerprint ?? 'Unavailable'}</span>
            <span><b>Projection Set</b>{configuration?.projection_set?.name ?? configuration?.projection_set?.id ?? 'Unavailable'}</span>
            <span><b>Model / version</b>{[configuration?.model?.name, configuration?.model_version?.version_label].filter(Boolean).join(' · ') || 'Unavailable'}</span>
            <span><b>Valuation date</b>{configuration?.valuation_date ?? 'Unavailable'}</span>
            <span><b>Scenario</b>{configuration?.scenario?.name ?? 'Unavailable'}</span>
            <span><b>Inputs</b>{datasets.length ? datasets.map(dataset => dataset.name ?? dataset.id).join(', ') : 'None listed'}</span>
            <span><b>Formulas / variables</b>{`${configuration?.formulas?.length ?? 0} / ${configuration?.variables?.length ?? 0}`}</span>
          </div>
          <details><summary>Inspect complete frozen package</summary><pre>{formatEvidenceJson(frozenPackage ?? packageData)}</pre></details>
        </div>
      )}

      {manifest && (
        <div className="execution-evidence-section">
          <h4>Final manifest</h4>
          {manifest.legacy_run && <p>This is a legacy run; it predates frozen run packages.</p>}
          {!manifest.final_manifest
            ? <p role="status">The run is incomplete. Its final manifest will be available when execution finishes.</p>
            : <>
              <div className="execution-evidence-summary">
                <span><b>Fingerprint</b>{manifest.final_manifest.fingerprint}</span>
                <span><b>Attempt</b>{manifest.final_manifest.attempt_number}</span>
                <span><b>Created</b>{manifest.final_manifest.created_at}</span>
              </div>
              <details><summary>Inspect complete final manifest</summary><pre>{formatEvidenceJson(manifest.final_manifest.manifest)}</pre></details>
            </>}
        </div>
      )}

      {evidence.attempts && (
        <div className="execution-evidence-section">
          <h4>Execution attempts ({attempts.length})</h4>
          {attempts.length === 0 ? <p>No attempts have started.</p> : attempts.map(attempt => (
            <article className="execution-evidence-record" key={attempt.attempt_number}>
              <b>Attempt {attempt.attempt_number} · {labelForRunStatus(attempt.status)}{attempt.accepted ? ' · accepted' : ''}</b>
              <span>{attempt.started_at} – {attempt.completed_at ?? 'in progress'}</span>
              {attempt.error_message && <p role="alert">{attempt.error_type ? `${attempt.error_type}: ` : ''}{attempt.error_message}</p>}
              <span>Rows: {attempt.output_row_count ?? 0} outputs · {attempt.trace_row_count ?? 0} traces · cleanup: {attempt.cleanup_status ?? 'unknown'}</span>
              {attempt.executed_build && <details><summary>Build identity</summary><pre>{formatEvidenceJson(attempt.executed_build)}</pre></details>}
              {attempt.metrics && <details><summary>Attempt metrics</summary><pre>{formatEvidenceJson(attempt.metrics)}</pre></details>}
            </article>
          ))}
        </div>
      )}

      {evidence.steps && (
        <div className="execution-evidence-section">
          <h4>Execution steps ({steps.length})</h4>
          {steps.length === 0 ? <p>No steps have been reported.</p> : steps.map(step => (
            <article className="execution-evidence-record" key={step.id}>
              <b>{step.sequence}. {step.name} · {labelForRunStatus(step.status)}</b>
              <span>{step.progress_done ?? 0} / {step.progress_total ?? 0}{step.started_at ? ` · started ${step.started_at}` : ''}</span>
              {step.error_message && <p role="alert">{step.error_code ? `${step.error_code}: ` : ''}{step.error_message}</p>}
              {step.metrics && <details><summary>Step metrics</summary><pre>{formatEvidenceJson(step.metrics)}</pre></details>}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export function ExecutionCenter({ onNotify, onBackToRunSets, onRefresh, runSet }) {
  const { setActiveScreen } = useApp()
  const { request } = useApi()
  const [status, setStatus] = useState('Running')
  const [logsOpen, setLogsOpen] = useState(false)
  const [snapshotOpen, setSnapshotOpen] = useState(false)
  const [evidence, setEvidence] = useState(null)
  const [busyRunAction, setBusyRunAction] = useState(null)
  const [retryRunId, setRetryRunId] = useState(null)

  const progress = status === 'Cancelled' ? 71 : status === 'Paused' ? 71 : 71
  const completedJobs = 16
  const runningJobs = status === 'Running' ? 1 : 0
  const pendingJobs = 7

  const toggleRun = () => {
    if (status === 'Cancelled') {
      setStatus('Running')
      onNotify('Run resumed from the last checkpoint')
      return
    }
    const nextStatus = status === 'Paused' ? 'Running' : 'Paused'
    setStatus(nextStatus)
    onNotify(nextStatus === 'Paused' ? 'Run paused at job 17 of 24' : 'Run resumed from checkpoint')
  }

  const cancelRun = () => {
    setStatus('Cancelled')
    onNotify('Run cancelled; completed outputs preserved')
  }

  const viewRunEvidence = async (runId) => {
    setEvidence({ runId, loading: true, errors: [] })
    const endpoints = [
      ['run', `/v1/runs/${runId}`],
      ['package', `/v1/runs/${runId}/package`],
      ['manifest', `/v1/runs/${runId}/manifest`],
      ['attempts', `/v1/runs/${runId}/attempts`],
      ['steps', `/v1/runs/${runId}/steps`],
    ]
    const responses = await Promise.all(endpoints.map(async ([key, path]) => {
      try {
        return { key, data: await request(path) }
      } catch (error) {
        return { key, error: error instanceof Error ? error.message : `Could not load ${key}.` }
      }
    }))
    const data = Object.fromEntries(responses.filter(response => 'data' in response).map(response => [response.key, response.data]))
    const errors = responses.filter(response => 'error' in response).map(response => `${response.key}: ${response.error}`)
    setEvidence({ runId, loading: false, ...data, errors })
  }

  const handleRunAction = async (runId, action) => {
    setBusyRunAction({ runId, action })
    try {
      const result = await request(`/v1/runs/${runId}/${action}`, { method: 'POST' })
      if (action === 'retry') {
        if (!result?.id) throw new Error('The retry response did not include the new run ID.')
        setRetryRunId(result.id)
        onNotify(result.retried_from_run_id === runId
          ? 'Retry submitted as a new run linked to the original run.'
          : 'Retry submitted, but the response did not confirm its link to the original run.')
      } else {
        onNotify(result?.status === 'cancelled' ? 'Run cancelled.' : 'Cancellation requested; the run will stop at a safe checkpoint.')
      }
      await onRefresh?.()
      if (action === 'retry') await viewRunEvidence(result.id)
      else if (evidence?.runId === runId) await viewRunEvidence(runId)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const code = (error.code ?? '').toUpperCase()
        const message = action === 'cancel' && code === 'RUN_NOT_CANCELLABLE'
          ? 'This run is no longer cancellable. Its current status has been refreshed.'
          : action === 'retry' && code === 'RUN_NOT_RETRYABLE'
            ? 'This run is no longer eligible for retry. Its current status has been refreshed.'
            : action === 'retry' && code === 'PACKAGE_MISSING'
              ? 'This run cannot be retried because its frozen package is unavailable.'
              : error.message
        onNotify(message)
        await onRefresh?.()
      } else {
        onNotify(error instanceof Error ? error.message : `Could not ${action} run.`)
      }
    } finally {
      setBusyRunAction(null)
    }
  }

  useEffect(() => {
    if (!retryRunId || !runSet?.runs.some(run => run.id === retryRunId)) return
    document.getElementById(`execution-run-${retryRunId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [retryRunId, runSet?.runs])

  if (runSet) {
    const counts = {
      completed: runSet.runs.filter(run => normalizeRunStatus(run.status) === 'success').length,
      running: runSet.runs.filter(run => normalizeRunStatus(run.status) === 'running').length,
      queued: runSet.runs.filter(run => normalizeRunStatus(run.status) === 'pending').length,
      failed: runSet.runs.filter(run => ['failed', 'cancelled'].includes(normalizeRunStatus(run.status))).length,
    }
    return (
      <div className="execution-page flex flex-col gap-4">
        <div className="execution-heading-row flex items-center justify-between gap-4">
          <div>
            <span className="execution-eyebrow">Run Set · {runSet.id.slice(0, 14)}</span>
            <h2>{runSet.name} · {runSet.status}</h2>
            <p>Submitted {new Date(runSet.submittedAt).toLocaleString()} · {runSet.runs.length} individual runs</p>
            <span className="execution-mock-indicator">Live backend · run status refreshes every 2.5 seconds; events every 3 seconds</span>
          </div>
          <button className="execution-back-button" onClick={onBackToRunSets ?? (() => setActiveScreen('Runs'))}>
            <ArrowLeft size={16} />Back to Run Set Library
          </button>
        </div>

        <div className="execution-main-grid grid grid-cols-[minmax(0,1fr)_300px] items-start gap-3.5 max-[1120px]:grid-cols-1">
          <main className="flex min-w-0 flex-col gap-4">
            <section className="execution-progress-panel rounded-[10px] bg-white p-5">
              <div className="execution-runset-summary">
                <div><span className="execution-muted-label">Submission status</span><strong className={`execution-runset-status execution-runset-${runSet.status.toLowerCase()}`}>{runSet.status}</strong></div>
                <div><span className="execution-muted-label">Run pairing count</span><strong>{runSet.runs.length} <small>individual {runSet.runs.length === 1 ? 'run' : 'runs'}</small></strong></div>
                <p>Progress is tracked for each run separately. The Run Set does not have an overall percentage.</p>
              </div>
              <div className="execution-job-stats grid grid-cols-4 gap-2.5 max-[680px]:grid-cols-2 max-[420px]:grid-cols-1">
                <JobStat tone="complete" label="Completed" value={counts.completed} detail={`of ${runSet.runs.length} runs`} />
                <JobStat tone="running" label="Running" value={counts.running} detail="runs" />
                <JobStat tone="queued" label="Pending" value={counts.queued} detail="runs" />
                <JobStat tone="recovery" label="Failed" value={counts.failed} detail="runs" />
              </div>
            </section>

            <section className="execution-timeline-panel rounded-[10px] bg-white p-4">
              <div className="execution-card-heading">
                <div><h2>Individual run progress</h2><p>One run is created for every Projection Set/scenario pairing.</p></div>
              </div>
              {retryRunId && <p className="execution-retry-notice" role="status">Retry submitted as <b>{retryRunId}</b>. The new run is shown below.</p>}
              <div className="execution-runset-runs">
                {runSet.runs.map(run => (
                  <article className={`execution-runset-run${run.id === retryRunId ? ' execution-runset-retried' : ''}`} id={`execution-run-${run.id}`} key={run.id}>
                    <div className="execution-runset-run-heading">
                      <div><b>{run.projectionSetName}</b><small>{run.scenarioName} · {run.id}</small>{run.retriedFromRunId && <small>Retry of {run.retriedFromRunId}</small>}</div>
                      <div className="flex items-center gap-2"><span className={`execution-runset-status execution-runset-${normalizeRunStatus(run.status)}`}>{labelForRunStatus(run.status)}</span>{Boolean(run.canCancel) && <button className="execution-run-control" disabled={busyRunAction?.runId === run.id} onClick={() => void handleRunAction(run.id, 'cancel')}>{busyRunAction?.runId === run.id && busyRunAction.action === 'cancel' ? 'Cancelling…' : 'Cancel'}</button>}{Boolean(run.canRetry) && <button className="execution-run-control" disabled={busyRunAction?.runId === run.id} onClick={() => void handleRunAction(run.id, 'retry')}>{busyRunAction?.runId === run.id && busyRunAction.action === 'retry' ? 'Retrying…' : 'Retry'}</button>}<button className="execution-run-control" onClick={() => void viewRunEvidence(run.id)}>{evidence?.runId === run.id ? 'Refresh evidence' : 'View run evidence'}</button></div>
                    </div>
                    <div className="execution-runset-progress">
                      <div className="execution-runset-progress-track"><span style={{ width: `${run.progress.percent}%` }} /></div>
                      <b>{normalizeRunStatus(run.status) === 'pending' && run.progress.total === 0 ? 'Waiting for worker' : `${run.progress.done.toLocaleString()} / ${run.progress.total.toLocaleString()} ${run.progress.unit} · ${run.progress.percent}%`}</b>
                      {run.progress.eta_seconds != null && <small>ETA {Math.ceil(run.progress.eta_seconds / 60)} min</small>}
                    </div>
                    {evidence?.runId === run.id && <RunEvidencePanel evidence={evidence} onClose={() => setEvidence(null)} />}
                    <details className="execution-runset-events">
                      <summary><FileText size={14} />Events and logs ({run.events.length})</summary>
                      {run.events.map(event => <p key={event.id} className={`execution-runset-event execution-event-${event.level}`}><time>{new Date(event.timestamp).toLocaleTimeString()}</time><b>{event.step}</b><span>{event.message}</span></p>)}
                    </details>
                  </article>
                ))}
              </div>
            </section>

            <section className="execution-provenance-panel rounded-[10px] bg-white p-4">
              <div className="execution-card-heading">
                <div><h2>Submission &amp; provenance</h2></div>
                <span className="immutable-pill"><i />Inputs frozen at submission</span>
              </div>
              <div className="execution-provenance-grid grid grid-cols-6 gap-4 max-[900px]:grid-cols-3 max-[520px]:grid-cols-2">
                <ProvenanceItem label="Run Set ID" value={runSet.id} />
                <ProvenanceItem label="Project" value={runSet.projectId} />
                <ProvenanceItem label="Projection Sets" value={runSet.projectionSetIds.length} />
                <ProvenanceItem label="Resolved scenarios" value={runSet.runs.length} />
                <ProvenanceItem label="Submitted" value={new Date(runSet.submittedAt).toLocaleString()} />
                <ProvenanceItem label="Notes" value={runSet.notes || '—'} />
              </div>
              <div className="execution-provenance-footer">
                <span><ShieldCheck size={16} />Each run corresponds to one immutable Projection Set/scenario pairing. Events and progress are per run.</span>
                {runSet.runs[0] && <button onClick={() => void viewRunEvidence(runSet.runs[0].id)}>View run evidence</button>}
              </div>
            </section>
          </main>
          <aside className="execution-side-rail flex flex-col gap-3.5">
            <ExecutionProfile status={runSet.status} runSetName={runSet.name} startedAt={new Date(runSet.submittedAt).toLocaleString()} live />
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div className="execution-page flex flex-col gap-4">
      <div className="execution-heading-row flex items-center justify-between gap-4">
        <div>
          <span className="execution-eyebrow">GAAP Reserve Pack</span>
          <h2>Run in progress</h2>
          <p>Immutable snapshot #R-20261003-001 · started 08:42 AM</p>
        </div>
        <button className="execution-back-button" onClick={onBackToRunSets ?? (() => setActiveScreen('Runs'))}>
          <ArrowLeft size={16} />Back to Run Set Library
        </button>
      </div>

      <div className="execution-main-grid grid grid-cols-[minmax(0,1fr)_300px] items-start gap-3.5 max-[1120px]:grid-cols-1">
        <main className="flex min-w-0 flex-col gap-4">
          <section className="execution-progress-panel rounded-[10px] bg-white p-5">
            <div className="execution-progress-layout grid grid-cols-[140px_minmax(0,1fr)] items-center gap-8 max-[680px]:grid-cols-1 max-[680px]:gap-4">
              <ProgressRing progress={progress} completed={completedJobs} total={24} />
              <div className="execution-progress-content">
                <span className="execution-muted-label">Estimated time remaining</span>
                <strong className="execution-eta"><Clock3 size={22} />{status === 'Paused' ? 'Paused' : status === 'Cancelled' ? 'Cancelled' : '03:18'}</strong>
                <div className="execution-run-controls">
                  <button className="execution-pause-button" disabled={status === 'Cancelled'} onClick={toggleRun}>
                    {status === 'Paused' ? <Play size={16} /> : <Pause size={16} />}
                    {status === 'Paused' ? 'Resume run' : 'Pause'}
                  </button>
                  <button className="execution-cancel-button" disabled={status === 'Cancelled'} onClick={cancelRun}>
                    <Square size={14} />{status === 'Cancelled' ? 'Cancelled' : 'Cancel run'}
                  </button>
                </div>
              </div>
            </div>

            <div className="execution-job-stats grid grid-cols-4 gap-2.5 max-[680px]:grid-cols-2 max-[420px]:grid-cols-1">
              <JobStat tone="complete" label="Completed" value={completedJobs} detail="of 24 jobs" />
              <JobStat tone="running" label="Running" value={runningJobs} detail="job" />
              <JobStat tone="queued" label="Pending" value={pendingJobs} detail="jobs" />
              <JobStat tone="recovery" label="Needs recovery" value="0" detail="jobs" />
            </div>
          </section>

          <section className="execution-timeline-panel rounded-[10px] bg-white p-4">
            <div className="execution-card-heading">
              <div><h2>Execution timeline</h2><p>Step-by-step progress through the GAAP Reserve Pack. Each job becomes immutable when completed.</p></div>
              <button className="execution-logs-button" onClick={() => setLogsOpen(true)}><FileText size={16} />View logs</button>
            </div>
            <ExecutionTimeline status={status} />
          </section>

          <section className="execution-provenance-panel rounded-[10px] bg-white p-4">
            <div className="execution-card-heading">
              <div><h2>Immutable snapshot &amp; provenance</h2></div>
              <span className="immutable-pill"><i />Immutable · read-only</span>
            </div>
            <div className="execution-provenance-grid grid grid-cols-6 gap-4 max-[900px]:grid-cols-3 max-[520px]:grid-cols-2">
              <ProvenanceItem label="Run ID" value="R-20261003-001" />
              <ProvenanceItem label="Model" value="MYGA v3.2" />
              <ProvenanceItem label="Scenario" value="Base scenario" />
              <ProvenanceItem label="Valuation date" value="2026-12-31" />
              <ProvenanceItem label="Created" value="Today, 09:42 AM" />
              <ProvenanceItem label="Created by" value="Andrew Johnson" />
            </div>
            <div className="execution-provenance-footer">
              <span><ShieldCheck size={16} />Projection sets, inputs, assumptions and results are captured in an immutable execution snapshot for audit and reproducibility.</span>
              <button onClick={() => setSnapshotOpen(true)}>View snapshot details</button>
            </div>
          </section>
        </main>

        <aside className="execution-side-rail flex flex-col gap-3.5">
          <ComputeResources />
          <ExecutionProfile status={status} />
        </aside>
      </div>

      {logsOpen && <ExecutionLogs onClose={() => setLogsOpen(false)} />}
      {snapshotOpen && <SnapshotDetails onClose={() => setSnapshotOpen(false)} />}
    </div>
  )
}

function ProgressRing({ progress, completed, total }) {
  const circumference = 2 * Math.PI * 54
  const offset = circumference * (1 - progress / 100)

  return (
    <div className="execution-progress-ring" role="img" aria-label={`${progress}% complete, ${completed} of ${total} jobs`}>
      <svg viewBox="0 0 128 128">
        <circle className="execution-ring-track" cx="64" cy="64" r="54" />
        <circle className="execution-ring-progress" cx="64" cy="64" r="54" style={{ strokeDasharray: circumference, strokeDashoffset: offset }} />
      </svg>
      <div><b>{progress}%</b><span>{completed} of {total} jobs<br />complete</span></div>
    </div>
  )
}

function JobStat({ tone, label, value, detail }) {
  return (
    <div className={`execution-job-stat execution-job-${tone}`}>
      <span><i />{label}</span>
      <b>{value}</b>
      <small>{detail}</small>
    </div>
  )
}

function ExecutionTimeline({ status }) {
  return (
    <div className="execution-timeline-scroll">
      <div className="execution-timeline-track">
        {executionSteps.map((step, index) => {
          const stepState = status === 'Cancelled' && step.state !== 'Completed'
            ? 'Pending'
            : status === 'Paused' && step.state === 'Running'
              ? 'Paused'
              : step.state

          return (
            <div className={`execution-timeline-step timeline-${stepState.toLowerCase()}`} key={step.name}>
              <span className="execution-timeline-dot">{stepState === 'Completed' ? <Check size={12} /> : null}</span>
              {index < executionSteps.length - 1 && <i className="execution-timeline-connector" />}
              <b>{step.name}</b>
              <small>{stepState === 'Completed' ? '✓ Completed' : stepState === 'Running' ? '◉ Running' : stepState === 'Paused' ? 'Ⅱ Paused' : '◷ Pending'}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ComputeResources({ status = 'Running' }) {
  const isPending = status === 'Pending'
  return (
    <section className="execution-side-card rounded-[10px] bg-white p-4">
      <h2>Compute resources</h2>
      <ResourceRow icon={<Cpu size={17} />} title="GPU" detail={isPending ? 'Allocation pending' : 'NVIDIA A10G'} state={isPending ? 'Pending' : 'Active'} />
      <ResourceRow icon={<Server size={17} />} title="CPU" detail={isPending ? 'Allocation pending' : '64 vCPU'} state={isPending ? 'Pending' : 'In use'} />
    </section>
  )
}

function ResourceRow({ icon, title, detail, state }) {
  return (
    <div className="execution-resource-row">
      <span>{icon}</span>
      <span><small>{title}</small><b>{detail}</b></span>
      <i>{state}</i>
    </div>
  )
}

function ExecutionProfile({ status, runSetName = 'GAAP Reserve Pack', startedAt = 'Today 09:42 AM', live = false }) {
  return (
    <section className="execution-side-card rounded-[10px] bg-white p-4">
      <h2>{live ? 'Live backend status' : 'Execution profile'}</h2>
      <dl className="execution-profile-list">
        {live ? <>
          <div><dt>Submitted</dt><dd>{startedAt}</dd></div>
          <div><dt>Source</dt><dd>Backend API</dd></div>
          <div><dt>Refresh</dt><dd>2.5s status · 3s events</dd></div>
        </> : <>
          <div><dt>Priority</dt><dd>Standard</dd></div>
          <div><dt>Host runtime</dt><dd>8 hours</dd></div>
          <div><dt>Started</dt><dd>{startedAt}</dd></div>
          <div><dt>User</dt><dd>Andrew Johnson</dd></div>
        </>}
        <div><dt>Run Set</dt><dd>{runSetName}</dd></div>
        <div><dt>Status</dt><dd>{status}</dd></div>
      </dl>
    </section>
  )
}

function ProvenanceItem({ label, value }) {
  return <span><small>{label}</small><b>{value}</b></span>
}

function ExecutionLogs({ onClose }) {
  return (
    <Modal title="Execution logs" onClose={onClose}>
      <div className="execution-log-list">{initialLogs.map((line) => <p key={line}>{line}</p>)}</div>
    </Modal>
  )
}

function SnapshotDetails({ onClose }) {
  return (
    <Modal title="Immutable snapshot details" onClose={onClose}>
      <p className="snapshot-description">This read-only snapshot captures the complete execution context at submission time.</p>
      <dl className="snapshot-detail-list">
        <div><dt>Snapshot ID</dt><dd>R-20261003-001</dd></div>
        <div><dt>Projection Sets</dt><dd>2 pinned</dd></div>
        <div><dt>Input versions</dt><dd>24 pinned objects</dd></div>
        <div><dt>Scenario</dt><dd>Base scenario · v2026.12</dd></div>
        <div><dt>Formula groups</dt><dd>7 groups · 42 formulas</dd></div>
        <div><dt>Audit hash</dt><dd>sha256: 8b12…a91d</dd></div>
      </dl>
    </Modal>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="execution-modal-backdrop" onClick={onClose}>
      <section aria-label={title} aria-modal="true" className="execution-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="execution-modal-heading"><h2>{title}</h2><button aria-label="Close dialog" onClick={onClose}><X size={19} /></button></div>
        {children}
      </section>
    </div>
  )
}
