import { useState } from 'react'
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
import './execution-center.css'

const executionSteps = [
  { name: 'Base projection', state: 'Completed' },
  { name: 'Low rate projection', state: 'Completed' },
  { name: 'High rate projection', state: 'Completed' },
  { name: 'Sensitivity scenarios', state: 'Completed' },
  { name: 'Reserve aggregation', state: 'Completed' },
  { name: 'Actuarial reporting', state: 'Running' },
  { name: 'Quality checks', state: 'Queued' },
  { name: 'Executive summary', state: 'Queued' },
  { name: 'Report rendering', state: 'Queued' },
]

const initialLogs = [
  '08:42:11 · Immutable run snapshot created',
  '08:42:19 · Input versions pinned and validated',
  '08:44:02 · Base projection completed',
  '08:51:36 · Sensitivity scenarios completed',
  '09:01:08 · Actuarial reporting in progress',
]

export function ExecutionCenter({ onNotify, onBackToRunSets, runSet }) {
  const { setActiveScreen } = useApp()
  const [status, setStatus] = useState('Running')
  const [logsOpen, setLogsOpen] = useState(false)
  const [snapshotOpen, setSnapshotOpen] = useState(false)

  const progress = status === 'Cancelled' ? 71 : status === 'Paused' ? 71 : 71
  const completedJobs = 16
  const runningJobs = status === 'Running' ? 1 : 0
  const queuedJobs = 7

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

  if (runSet) {
    const counts = {
      completed: runSet.runs.filter(run => run.status === 'Completed').length,
      running: runSet.runs.filter(run => run.status === 'Running').length,
      queued: runSet.runs.filter(run => run.status === 'Queued').length,
      failed: runSet.runs.filter(run => run.status === 'Failed').length,
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
                <JobStat tone="queued" label="Queued" value={counts.queued} detail="runs" />
                <JobStat tone="recovery" label="Failed" value={counts.failed} detail="runs" />
              </div>
            </section>

            <section className="execution-timeline-panel rounded-[10px] bg-white p-4">
              <div className="execution-card-heading">
                <div><h2>Individual run progress</h2><p>One run is created for every Projection Set/scenario pairing.</p></div>
              </div>
              <div className="execution-runset-runs">
                {runSet.runs.map(run => (
                  <article className="execution-runset-run" key={run.id}>
                    <div className="execution-runset-run-heading">
                      <div><b>{run.projectionSetName}</b><small>{run.scenarioName} · {run.id}</small></div>
                      <span className={`execution-runset-status execution-runset-${run.status.toLowerCase()}`}>{run.status}</span>
                    </div>
                    <div className="execution-runset-progress">
                      <div className="execution-runset-progress-track"><span style={{ width: `${run.progress.percent}%` }} /></div>
                      <b>{run.status === 'Queued' && run.progress.total === 0 ? 'Waiting for worker' : `${run.progress.done.toLocaleString()} / ${run.progress.total.toLocaleString()} ${run.progress.unit} · ${run.progress.percent}%`}</b>
                      {run.progress.eta_seconds != null && <small>ETA {Math.ceil(run.progress.eta_seconds / 60)} min</small>}
                    </div>
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
                <button onClick={() => onNotify('Run Set package details will be available from the backend')}>View package details</button>
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
              <JobStat tone="queued" label="Queued" value={queuedJobs} detail="jobs" />
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
            ? 'Queued'
            : status === 'Paused' && step.state === 'Running'
              ? 'Paused'
              : step.state

          return (
            <div className={`execution-timeline-step timeline-${stepState.toLowerCase()}`} key={step.name}>
              <span className="execution-timeline-dot">{stepState === 'Completed' ? <Check size={12} /> : null}</span>
              {index < executionSteps.length - 1 && <i className="execution-timeline-connector" />}
              <b>{step.name}</b>
              <small>{stepState === 'Completed' ? '✓ Completed' : stepState === 'Running' ? '◉ Running' : stepState === 'Paused' ? 'Ⅱ Paused' : '◷ Queued'}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ComputeResources({ status = 'Running' }) {
  const isQueued = status === 'Queued'
  return (
    <section className="execution-side-card rounded-[10px] bg-white p-4">
      <h2>Compute resources</h2>
      <ResourceRow icon={<Cpu size={17} />} title="GPU" detail={isQueued ? 'Allocation pending' : 'NVIDIA A10G'} state={isQueued ? 'Queued' : 'Active'} />
      <ResourceRow icon={<Server size={17} />} title="CPU" detail={isQueued ? 'Allocation pending' : '64 vCPU'} state={isQueued ? 'Queued' : 'In use'} />
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
