import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CircleAlert, Clock3, FileText, Play, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useApp } from '../../context/useApp'
import { useApi } from '../../api/ApiProvider'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import { canSubmitRuns } from '../../api/permissions'
import { ExecutionCenter } from '../execution-center/ExecutionCenter'
import './run-set-workflow.css'

type ProjectionSet = {
  id?: string
  projectId?: string
  name: string
  scenario: string
  status: string
  savedScenarioIds?: string[]
  validation?: Record<string, boolean>
  traceScope?: string[]
}

type ApiProjectionSet = { id: string; project_id?: string; name: string; status: string; scenarios?: { id: string; name: string }[]; validation?: { checks?: { code: string; status: string }[] } }
type ProjectOptionsState<T> = { projectId: string; items: T[]; loading: boolean; error: Error | null }
type CheckResult = { name: string; passed: boolean; detail: string; warning?: boolean }
type PreflightResult = { ok: boolean; checks: { group: string; items: CheckResult[] }[]; plannedRuns: { projectionSetId: string; projectionSetName: string; scenarioId: string; scenarioName: string }[]; problems: string[] }

const statusClass = (status: string) => status.toLowerCase().replaceAll(' ', '-')

export function RunSetSubmissionDialog({ projectionSets, initialProjectionSetId, onClose }: { projectionSets: ProjectionSet[]; initialProjectionSetId?: string; onClose: () => void }) {
  const { setActiveScreen, setActiveExecutionRunSetId } = useApp()
  const { request, user } = useApi()
  const { projects, projectId: workspaceProjectId } = useWorkspace()
  const initialSet = projectionSets.find(set => set.id === initialProjectionSetId)
  const [projectId, setProjectId] = useState(initialSet?.projectId ?? workspaceProjectId ?? '')
  const canSubmit = canSubmitRuns(user?.roles ?? [])
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>(initialSet?.id ? [initialSet.id] : [])
  const [overrideScenarios, setOverrideScenarios] = useState(false)
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([])
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [preflight, setPreflight] = useState<PreflightResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [preflighting, setPreflighting] = useState(false)
  const [projectSetOptions, setProjectSetOptions] = useState<ProjectOptionsState<ProjectionSet>>({ projectId: '', items: [], loading: false, error: null })
  const [scenarioOptions, setScenarioOptions] = useState<ProjectOptionsState<{ id: string; name: string; status: string }>>({ projectId: '', items: [], loading: false, error: null })

  useEffect(() => {
    if (!projectId) {
      setProjectSetOptions({ projectId: '', items: [], loading: false, error: null })
      return
    }
    const controller = new AbortController()
    let active = true
    setProjectSetOptions({ projectId, items: [], loading: true, error: null })
    request<{ projection_sets: ApiProjectionSet[] }>(`/v1/projects/${projectId}/projection-sets`, { signal: controller.signal })
      .then(result => {
        if (!active) return
        const items = (result.projection_sets ?? []).map(item => ({
          id: item.id,
          projectId: item.project_id ?? projectId,
          name: item.name,
          scenario: (item.scenarios ?? []).map(scenario => scenario.name).filter(Boolean).join(', ') || 'No scenarios attached',
          savedScenarioIds: (item.scenarios ?? []).map(scenario => scenario.id),
          validation: Object.fromEntries((item.validation?.checks ?? []).map(check => [check.code, check.status === 'pass'])),
          status: item.status === 'validated' ? 'Ready' : item.status === 'needs_review' ? 'Needs review' : 'Draft',
        }))
        setProjectSetOptions({ projectId, items, loading: false, error: null })
      })
      .catch(caught => { if (active && !controller.signal.aborted) setProjectSetOptions({ projectId, items: [], loading: false, error: caught instanceof Error ? caught : new Error('Could not load Projection Sets.') }) })
    return () => { active = false; controller.abort() }
  }, [projectId, request])

  useEffect(() => {
    if (!projectId) {
      setScenarioOptions({ projectId: '', items: [], loading: false, error: null })
      return
    }
    const controller = new AbortController()
    let active = true
    setScenarioOptions({ projectId, items: [], loading: true, error: null })
    request<{ scenario_sets: { scenarios: { id: string; name: string; status: string }[] }[] }>(`/v1/projects/${projectId}/scenario-sets`, { signal: controller.signal })
      .then(result => { if (active) setScenarioOptions({ projectId, items: (result.scenario_sets ?? []).flatMap(group => group.scenarios), loading: false, error: null }) })
      .catch(caught => { if (active && !controller.signal.aborted) setScenarioOptions({ projectId, items: [], loading: false, error: caught instanceof Error ? caught : new Error('Could not load scenarios.') }) })
    return () => { active = false; controller.abort() }
  }, [projectId, request])

  const queriedProjectSets = projectSetOptions.projectId === projectId ? projectSetOptions.items : null
  const projectSets = (queriedProjectSets ?? (projectId === workspaceProjectId ? projectionSets.filter(set => set.projectId === projectId) : [])).filter(set => set.projectId === projectId)
  const projectSetsLoading = Boolean(projectId && projectSetOptions.projectId !== projectId) || Boolean(projectSetOptions.projectId === projectId && projectSetOptions.loading)
  const projectSetsError = projectSetOptions.projectId === projectId ? projectSetOptions.error : null
  const scenarios = scenarioOptions.projectId === projectId ? scenarioOptions.items : []
  const scenarioLoading = Boolean(projectId && (scenarioOptions.projectId !== projectId || scenarioOptions.loading))
  const scenarioError = scenarioOptions.projectId === projectId ? scenarioOptions.error : null
  const selectedSets = projectSets.filter(set => set.id && selectedSetIds.includes(set.id))
  const canPreflight = Boolean(projectId && selectedSetIds.length && selectedSets.length === selectedSetIds.length)
  const plannedCount = selectedSets.reduce((count, set) => {
    const scenarioCount = overrideScenarios ? selectedScenarioIds.length : (set.savedScenarioIds?.length ?? (set.scenario ? 1 : 0))
    return count + scenarioCount
  }, 0)

  const toggleSet = (id: string) => {
    setSelectedSetIds(current => current.includes(id) ? current.filter(selected => selected !== id) : [...current, id])
    setPreflight(null)
  }

  const toggleScenario = (id: string) => {
    setSelectedScenarioIds(current => current.includes(id) ? current.filter(selected => selected !== id) : [...current, id])
    setPreflight(null)
  }

  const requestPreview = {
    project_id: projectId,
    projection_set_ids: selectedSetIds,
    scenario_ids: overrideScenarios ? selectedScenarioIds : [],
    name: name.trim() || 'Run Set',
    notes: notes.trim() || null,
  }

  const runPreflight = async () => {
    if (!canPreflight || projectSetsLoading || (overrideScenarios && (scenarioLoading || scenarioError)) || preflighting) return
    setPreflighting(true)
    try {
      const result = await request<{ ok: boolean; checks?: { label: string; status: string; message: string }[]; planned_runs?: { projection_set_id: string; scenario_id: string; name: string; ok: boolean; problems: string[] }[]; problems?: string[] }>('/v1/run-sets/preflight', { method: 'POST', body: JSON.stringify(requestPreview) })
      const backendRuns = result.planned_runs ?? []
      const plannedRuns = backendRuns.map(run => ({
        projectionSetId: run.projection_set_id,
        projectionSetName: projectSets.find(set => set.id === run.projection_set_id)?.name ?? 'Projection Set',
        scenarioId: run.scenario_id,
        scenarioName: scenarios.find(scenario => scenario.id === run.scenario_id)?.name ?? run.name.split(' · ').at(-1) ?? run.name,
      }))
      const checks: PreflightResult['checks'] = [{ group: 'Backend preflight', items: (result.checks ?? []).map(item => ({ name: item.label, passed: item.status === 'pass', warning: item.status !== 'pass', detail: item.message })) }]
      const pairingChecks = plannedRuns.map(run => ({ name: `${run.projectionSetName} × ${run.scenarioName}`, passed: backendRuns.find(item => item.projection_set_id === run.projectionSetId && item.scenario_id === run.scenarioId)?.ok ?? false, warning: false, detail: 'Resolved by the backend.' }))
      checks.push({ group: 'Scenario pairings', items: pairingChecks })
      setPreflight({ ok: result.ok, checks, plannedRuns, problems: result.problems ?? [] })
    } catch (error) {
      setPreflight({ ok: false, checks: [], plannedRuns: [], problems: [error instanceof Error ? error.message : 'Backend preflight failed.'] })
    } finally { setPreflighting(false) }
  }

  const submitRunSet = async () => {
    if (!preflight?.ok || submitting) return
    setSubmitting(true)
    try {
      const created = await request<{ run_set: { id: string } }>('/v1/run-sets', {
        method: 'POST', body: JSON.stringify(requestPreview),
      })
      setActiveExecutionRunSetId(created.run_set.id)
      onClose()
      setActiveScreen('Runs')
    } catch (error) {
      setPreflight({ ...preflight, ok: false, problems: [error instanceof Error ? error.message : 'Run Set submission failed.'] })
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="run-set-backdrop" onClick={onClose}>
    <section className="run-set-dialog" role="dialog" aria-modal="true" aria-labelledby="run-set-title" onClick={event => event.stopPropagation()}>
      <header className="run-set-dialog-header">
        <div><span className="run-set-eyebrow">SUBMISSION</span><h2 id="run-set-title">Create Run Set</h2><p>Select Projection Sets to submit. Each set is paired with its saved scenarios unless you provide overrides.</p></div>
        <button aria-label="Close Run Set dialog" onClick={onClose}><X size={18} /></button>
      </header>
      <div className="run-set-mock-notice"><CircleAlert size={16} />Preflight and run submission are performed by the live backend.</div>
      <label className="run-set-field">Project
        <select value={projectId} onChange={event => { setProjectId(event.target.value); setSelectedSetIds([]); setSelectedScenarioIds([]); setPreflight(null) }}>
          <option value="">Select project</option>
          {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>
      <fieldset className="run-set-fieldset">
        <legend>Projection Sets <small>{selectedSetIds.length} selected</small></legend>
        {projectSetsLoading ? <p className="run-set-empty">Loading Projection Sets for this project…</p> : projectSetsError ? <p className="run-set-empty">Could not load Projection Sets: {projectSetsError.message}</p> : projectSets.length ? projectSets.map(set => <label className="run-set-choice" key={set.id}>
          <input type="checkbox" checked={Boolean(set.id && selectedSetIds.includes(set.id))} onChange={() => set.id && toggleSet(set.id)} />
          <span><b>{set.name}</b><small>{set.scenario} · {set.status}</small></span><i className={`run-set-status run-set-status-${statusClass(set.status)}`}>{set.status}</i>
        </label>) : <p className="run-set-empty">No saved Projection Sets are available for this project.</p>}
      </fieldset>
      <section className="run-set-fieldset run-set-scenario-options">
        <div className="run-set-scenario-heading"><b>Scenarios</b><span>Optional override</span></div>
        <label className="run-set-override"><input type="checkbox" checked={overrideScenarios} onChange={event => { setOverrideScenarios(event.target.checked); setPreflight(null) }} />Choose scenarios for this submission</label>
        {overrideScenarios ? <div className="run-set-scenario-list">{scenarioLoading ? <p>Loading project scenarios…</p> : scenarioError ? <p>Could not load scenarios: {scenarioError.message}</p> : scenarios.map(scenario => <label key={scenario.id}><input type="checkbox" checked={selectedScenarioIds.includes(scenario.id)} onChange={() => toggleScenario(scenario.id)} />{scenario.name} · {scenario.status}</label>)}</div> : <p>Use each selected Projection Set’s saved scenarios.</p>}
      </section>
      <div className="run-set-fields-row">
        <label className="run-set-field">Run Set name <span>Optional</span><input value={name} onChange={event => { setName(event.target.value); setPreflight(null) }} placeholder="Run Set" /></label>
        <label className="run-set-field">Notes <span>Optional</span><textarea value={notes} onChange={event => { setNotes(event.target.value); setPreflight(null) }} placeholder="Add submission notes" rows={2} /></label>
      </div>
      <div className="run-set-pair-summary"><b>{plannedCount}</b><span>planned runs</span><small>{selectedSetIds.length} Projection Set{selectedSetIds.length === 1 ? '' : 's'} × resolved scenarios</small></div>
      <details className="run-set-request"><summary>Submission request preview</summary><pre>{JSON.stringify(requestPreview, null, 2)}</pre></details>
      {preflight && <PreflightReport result={preflight} />}
      <footer className="run-set-dialog-actions">
        <button className="run-set-cancel" onClick={onClose}>Cancel</button>
        <button className="run-set-preflight" disabled={!canPreflight || projectSetsLoading || preflighting || (overrideScenarios && (scenarioLoading || scenarioError !== null || !selectedScenarioIds.length))} onClick={runPreflight}><ShieldCheck size={16} />{preflighting ? 'Checking…' : 'Run preflight'}</button>
        {canSubmit && <button className="run-set-submit" disabled={!preflight?.ok || submitting} onClick={submitRunSet}><Play size={15} />{submitting ? 'Submitting…' : 'Submit Run Set'}</button>}
      </footer>
      {!canSubmit && <p className="run-set-atomic-note">Your role does not permit run submission.</p>}
      <p className="run-set-atomic-note">Submission is atomic: if any pairing cannot be frozen, no partial Run Set is created.</p>
    </section>
  </div>
}

function PreflightReport({ result }: { result: PreflightResult }) {
  return <section className={`run-set-preflight-report ${result.ok ? 'is-passing' : 'has-errors'}`}>
    <header><b>{result.ok ? 'Preflight passed' : 'Preflight found problems'}</b><span>{result.plannedRuns.length} planned runs</span></header>
    {result.checks.map(group => <div className="run-set-check-group" key={group.group}>
      <strong>{group.group}</strong>
      {group.items.map((item, index) => <p key={`${item.name}-${index}`} className={item.warning ? 'is-warning' : item.passed ? 'is-passed' : 'is-failed'}><span>{item.passed ? <Check size={13} /> : <CircleAlert size={13} />}</span><b>{item.name}</b><small>{item.detail}</small></p>)}
    </div>)}
    {result.plannedRuns.length > 0 && <div className="run-set-planned-runs"><strong>Planned runs</strong>{result.plannedRuns.map(run => <p key={`${run.projectionSetId}-${run.scenarioId}`}><span>{run.projectionSetName}</span><b>{run.scenarioName}</b></p>)}</div>}
    {result.problems.length > 0 && <ul>{result.problems.map(problem => <li key={problem}>{problem}</li>)}</ul>}
  </section>
}

export function RunSetWorkflow({ onNotify }: { onNotify: (message: string) => void }) {
  const { setActiveScreen, activeExecutionRunSetId, setActiveExecutionRunSetId } = useApp()
  const { projectId, project } = useWorkspace()
  const { request, user } = useApi()
  const canSubmit = canSubmitRuns(user?.roles ?? [])
  const listQuery = useApiQuery<{ run_sets: any[]; stats: { run_set_count: number; active_run_count: number; needs_recovery_run_count: number } }>(projectId ? `/v1/projects/${projectId}/run-sets?limit=100` : null, 4000)
  const runSets = listQuery.data?.run_sets ?? []
  const [selectedRunSetId, setSelectedRunSetId] = useState(activeExecutionRunSetId ?? '')
  const [executionOpen, setExecutionOpen] = useState(Boolean(activeExecutionRunSetId))
  const selected = runSets.find(item => item.id === selectedRunSetId) ?? runSets[0]
  const detailId = activeExecutionRunSetId || selected?.id || ''
  const detailQuery = useApiQuery<any>(detailId ? `/v1/run-sets/${detailId}` : null, 2500)
  const runIds = (detailQuery.data?.runs ?? []).map((run: any) => run.id).filter(Boolean).join(',')
  const [eventsByRun, setEventsByRun] = useState<Record<string, any[]>>({})

  useEffect(() => {
    if (!runIds) return
    let active = true
    const ids: string[] = runIds.split(',')
    const loadEvents = async () => {
      const values = await Promise.all(ids.map(async id => {
        try {
          const result = await request<{ events: any[] }>(`/v1/runs/${id}/events`)
          return [id, result.events ?? []] as const
        } catch { return [id, []] as const }
      }))
      if (active) setEventsByRun(Object.fromEntries(values))
    }
    void loadEvents()
    const timer = window.setInterval(loadEvents, 3000)
    return () => { active = false; window.clearInterval(timer) }
  }, [request, runIds])

  useEffect(() => {
    if (activeExecutionRunSetId) { setSelectedRunSetId(activeExecutionRunSetId); setExecutionOpen(true) }
  }, [activeExecutionRunSetId])

  const statusLabel = (value: string) => ({ success: 'Completed', partial_success: 'Partial success', failed: 'Failed', running: 'Running', pending: 'Pending', queued: 'Queued', cancelled: 'Cancelled' }[value] ?? value)
  const detail = detailQuery.data
  const mappedRuns = (detail?.runs ?? []).map((run: any) => {
    const progress = run.progress ?? {}
    const done = Number(progress.done ?? 0)
    const total = Number(progress.total ?? 0)
    return {
      id: run.id,
      projectionSetId: run.projection_set_id,
      projectionSetName: run.projection_set_name || 'Projection Set',
      scenarioId: run.scenario_id,
      scenarioName: run.scenario_name || run.name || 'Scenario',
      canCancel: Boolean(run.can_cancel),
      canRetry: Boolean(run.can_retry),
      retriedFromRunId: run.retried_from_run_id ?? null,
      resultsAvailable: Boolean(run.results_available),
      status: statusLabel(run.status),
      progress: { ...progress, done, total, percent: Number(progress.percent ?? (total ? Math.round(done / total * 100) : 0)), unit: progress.unit || 'policies' },
      events: (eventsByRun[run.id] ?? []).map(event => ({ id: event.id, timestamp: event.timestamp ?? event.created_at, level: event.level || 'info', step: event.step || event.type || 'event', message: event.message || '' })),
    }
  })
  const executionRecord = detail ? {
    id: detail.id, name: detail.name, projectId: detail.project_id || projectId || '', notes: detail.notes,
    submittedAt: detail.submitted_at, status: statusLabel(detail.status),
    projectionSetIds: (detail.projection_sets ?? []).map((item: any) => typeof item === 'string' ? item : item.id).filter(Boolean),
    scenarioIds: detail.scenario_ids ?? [], runs: mappedRuns,
  } : null

  if (executionOpen && activeExecutionRunSetId) {
    if (!executionRecord) return <div className="run-set-library-empty"><Clock3 size={25} /><h3>Loading live execution…</h3>{detailQuery.error && <p>{detailQuery.error.message}</p>}</div>
    return <ExecutionCenter runSet={executionRecord as any} onNotify={onNotify} onRefresh={async () => { await Promise.all([detailQuery.refetch(), listQuery.refetch()]) }} onBackToRunSets={() => { setActiveExecutionRunSetId(null); setExecutionOpen(false) }} />
  }

  const totalRuns = runSets.reduce((sum, item) => sum + (item.run_count ?? 0), 0)
  const pendingRuns = runSets.reduce((sum, item) => sum + (item.runs_by_status?.pending ?? (item.runs_by_status?.queued ?? 0)), 0)
  return <div className="run-set-library-page">
    <header className="run-set-library-header">
      <div className="run-set-library-intro"><span className="run-set-library-icon"><Sparkles size={18} /></span><div><span className="run-set-library-kicker">EXECUTION WORKSPACE</span><h2>Run Set Library</h2><p>Review submissions, follow each Projection Set/scenario run, and inspect execution events.</p></div></div>
      <div className="run-set-library-actions"><span className="run-set-mock-pill"><i />Live backend</span>{canSubmit && <button className="run-set-library-create" onClick={() => setActiveScreen('Projections')}><Play size={14} />Create Run Set</button>}</div>
      <div className="run-set-library-overview"><div><b>{listQuery.data?.stats?.run_set_count ?? runSets.length}</b><span>submissions</span></div><i /><div><b>{totalRuns}</b><span>individual runs</span></div><i /><div><b>{pendingRuns}</b><span>pending</span></div></div>
    </header>
    {listQuery.loading && runSets.length === 0 ? <section className="run-set-library-empty"><Clock3 size={30} /><h3>Loading submissions…</h3></section> : listQuery.error ? <section className="run-set-library-empty"><CircleAlert size={25} /><h3>Could not load Run Sets</h3><p>{listQuery.error.message}</p></section> : runSets.length === 0 ? <section className="run-set-library-empty"><Clock3 size={30} /><h3>No submitted Run Sets yet</h3><p>Go to Projection Sets and choose <b>Create Run Set</b> to preflight and submit a configuration.</p><button onClick={() => setActiveScreen('Projections')}><ArrowLeft size={15} />Go to Projection Sets</button></section> : <div className="run-set-library-grid">
      <section className="run-set-submissions"><div className="run-set-section-heading"><h3>Submissions</h3><span>{runSets.length}</span></div>
        {runSets.map(item => <button key={item.id} className={`run-set-submission-card ${selected?.id === item.id ? 'is-selected' : ''}`} onClick={() => { setSelectedRunSetId(item.id); setActiveExecutionRunSetId(null); setExecutionOpen(false) }}>
          <span className={`run-set-status-dot run-set-dot-${statusClass(statusLabel(item.status))}`} /><span><b>{item.name}</b><small>{new Date(item.submitted_at).toLocaleString()} · {item.run_count} runs</small></span><i>{statusLabel(item.status)}</i>
        </button>)}
      </section>
      {selected && <section className="run-set-detail">
        <div className="run-set-detail-heading"><div><span>RUN SET · {selected.id.slice(0, 14)}</span><h3>{selected.name}</h3><p>{project?.name ?? projectId} · {new Date(selected.submitted_at).toLocaleString()}</p></div><span className={`run-set-status run-set-status-${statusClass(statusLabel(selected.status))}`}>{statusLabel(selected.status)}</span></div>
        <button className="run-set-open-execution" onClick={() => { setActiveExecutionRunSetId(selected.id); setExecutionOpen(true) }}><span className="run-set-open-icon"><Play size={17} fill="currentColor" /></span><span className="run-set-open-copy"><b>Open execution workspace</b><small>Monitor live run progress, events, and execution details</small></span><span className="run-set-open-arrow"><ArrowRight size={17} /></span></button>
        <div className="run-set-detail-stats"><Stat label="Projection Sets" value={selected.projection_sets?.length ?? 0} /><Stat label="Individual runs" value={selected.run_count ?? 0} /><Stat label="Pending" value={selected.runs_by_status?.pending ?? selected.runs_by_status?.queued ?? 0} /><Stat label="Reports" value={selected.report_count ?? 0} /></div>
        {selected.notes && <p className="run-set-notes"><FileText size={15} />{selected.notes}</p>}
        <div className="run-set-run-table"><div className="run-set-run-table-heading"><span>Run · Projection Set / Scenario</span><span>Status</span><span>Policy progress</span></div>
          {detailQuery.error && detailId === selected.id ? <p className="run-set-empty">Could not load run details: {detailQuery.error.message}</p> : selected.id !== detail?.id ? <p className="run-set-empty">Loading live run details…</p> : null}
          {(selected.id === detail?.id ? mappedRuns : []).map((run: any) => <article className="run-set-run-row" key={run.id}><div><b>{run.projectionSetName}</b><small>{run.scenarioName} · {run.id.slice(0, 14)}</small></div><span className={`run-set-status run-set-status-${statusClass(run.status)}`}>{run.status}</span><div className="run-set-run-progress"><div><span style={{ width: `${run.progress?.percent ?? 0}%` }} /></div><small>{run.progress?.total === 0 ? 'Waiting for worker' : `${(run.progress?.done ?? 0).toLocaleString()} / ${(run.progress?.total ?? 0).toLocaleString()} ${run.progress?.unit ?? 'policies'} · ${run.progress?.percent ?? 0}%`}</small></div><details className="run-set-run-events"><summary>Events ({run.events.length})</summary>{run.events.map((event: any) => <p key={event.id}><time>{new Date(event.timestamp).toLocaleTimeString()}</time><b>{event.step}</b>{event.message}</p>)}</details></article>)}
        </div>
        <p className="run-set-progress-note"><RefreshCw size={14} />Status, per-run progress, and events refresh automatically from the backend.</p>
      </section>}
    </div>}
  </div>
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div><small>{label}</small><b>{value}</b></div>
}
