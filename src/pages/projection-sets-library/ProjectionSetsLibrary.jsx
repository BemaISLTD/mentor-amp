import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Database,
  FileText,
  Filter,
  Lightbulb,
  LineChart,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Workflow,
  X,
} from 'lucide-react'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import { canImportData, canSubmitRuns } from '../../api/permissions'
import { useApi } from '../../api/ApiProvider'
import { RunSetSubmissionDialog } from '../run-set-workflow/RunSetWorkflow'
import { ProjectionSetCreateDialog } from './ProjectionSetCreateDialog'
import './projection-sets.css'

const EMPTY_PROJECTION_SETS = []

export function ProjectionSetsLibrary({ onNotify, startCreate = false, onCreateOpened, onSetupStarted, onSetupFinished, onNavigateToInput, onNavigateToScenario }) {
  const { projectId } = useWorkspace()
  const { user } = useApi()
  const canCreateProjectionSet = canImportData(user?.roles ?? [])
  const canCreateRunSet = canSubmitRuns(user?.roles ?? [])
  const projectionQuery = useApiQuery(projectId ? `/v1/projects/${projectId}/projection-sets` : null)
  const consumersQuery = useApiQuery(projectId ? `/v1/projects/${projectId}/run-sets` : null, 10000)
  const apiSets = projectionQuery.data?.projection_sets ?? EMPTY_PROJECTION_SETS
  const [sets, setSets] = useState([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [filterOpen, setFilterOpen] = useState(false)
  const [view, setView] = useState('list')
  const [createOpen, setCreateOpen] = useState(startCreate && canCreateProjectionSet)
  const [runSetDialogOpen, setRunSetDialogOpen] = useState(false)
  const [selectedSet, setSelectedSet] = useState(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [preferredSetId, setPreferredSetId] = useState('')

  useEffect(() => {
    const mapped = apiSets.map((item) => ({
      id: item.id,
      projectId: item.project_id,
      savedScenarioIds: (item.scenarios ?? []).map(scenario => scenario.id),
      validation: Object.fromEntries((item.validation?.checks ?? []).map(check => [check.code, check.status === 'pass'])),
      name: item.name,
      version: item.version_label || '—',
      scenario: (item.scenarios ?? []).map(scenario => scenario.name).filter(Boolean).join(', ') || 'No scenarios attached',
      horizon: `${item.valuation_date || '—'} · ${item.horizon_months ?? '—'} months`,
      inputs: `${item.counts?.input_count ?? 0} inputs`,
      formulas: `${item.counts?.formula_count ?? 0} formulas`,
      description: item.description || '—',
      status: item.status === 'validated' ? 'Ready' : item.status === 'needs_review' ? 'Needs review' : 'Draft',
      capture: item.validation?.status === 'validated' ? 'Backend validation passed' : 'Validation required',
      captureDetail: (item.validation?.checks ?? []).filter(check => check.status !== 'pass').map(check => check.message).filter(Boolean).join(' · ') || `${item.counts?.policy_count ?? 0} policies · ${item.output_variables?.length ?? 0} captured outputs`,
      preview: (item.validation?.checks ?? []).some(check => check.status !== 'pass') ? 'lines' : 'bars',
      product: item.model_version?.product_code || '—',
      modelName: item.model_version?.model_name || '—',
      modelVersion: item.model_version?.version_label || '—',
      raw: item,
    }))
    setSets(mapped)
    setSelectedSet(current => mapped.find(item => item.id === (preferredSetId || current?.id)) ?? mapped[0] ?? null)
    if (preferredSetId && mapped.some(item => item.id === preferredSetId)) setPreferredSetId('')
  }, [apiSets, preferredSetId])

  useEffect(() => {
    if (!startCreate || !canCreateProjectionSet) return
    onCreateOpened?.()
  }, [startCreate, canCreateProjectionSet, onCreateOpened])

  const visibleSets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return sets.filter((set) => {
      const matchesStatus = statusFilter === 'All statuses' || set.status === statusFilter
      const searchable = `${set.name} ${set.scenario} ${set.description} ${set.product}`.toLowerCase()
      return matchesStatus && searchable.includes(normalizedQuery)
    })
  }, [query, sets, statusFilter])

  const readyCount = sets.filter(set => set.status === 'Ready').length
  const reviewCount = sets.filter(set => set.status === 'Needs review').length
  const consumingIds = new Set((consumersQuery.data?.run_sets ?? []).flatMap(item => (item.projection_sets ?? item.projection_set_ids ?? []).map(set => typeof set === 'string' ? set : set.id).filter(Boolean)))

  return (
    <div className="projection-page flex flex-col gap-3.5">
      <section className="projection-readiness-banner grid grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)] items-center gap-6 rounded-[12px] px-6 py-5 max-[900px]:grid-cols-1 max-[600px]:px-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="projection-banner-icon"><LineChart size={28} /></span>
          <div><h2>Projection Sets</h2><p>Reusable configurations that define exactly what the model calculates before a Run Set is created.</p></div>
        </div>
        <div className="projection-readiness-checks">
          <span><Check size={20} />Versioned and validated</span>
          <span><Check size={20} />Aligned to model and scenario</span>
          <span><Check size={20} />Ready for projection runs</span>
        </div>
      </section>

      <section className="projection-summary-grid grid grid-cols-3 gap-3 max-[650px]:grid-cols-1">
        <ProjectionSummary icon={<Check size={22} />} value={readyCount} label="Ready to run" detail="Fully validated and ready for Run Sets" tone="ready" onClick={() => setStatusFilter('Ready')} />
        <ProjectionSummary icon={<span className="projection-warning-dot" />} value={reviewCount} label="Needs review" detail="Backend validation requires attention" tone="warning" onClick={() => setStatusFilter('Needs review')} />
        <ProjectionSummary icon={<Database size={22} />} value={consumingIds.size} label="Active consumers" detail="Run Sets using these Projection Sets" tone="consumers" onClick={() => onNotify(`${consumingIds.size} Projection Sets are referenced by submitted Run Sets`)} />
      </section>

      <div className="projection-content-grid grid grid-cols-[minmax(0,1fr)_226px] items-start gap-3 max-[1120px]:grid-cols-1">
        <main className="min-w-0">
          <div className="projection-toolbar flex items-center gap-2 rounded-[9px] bg-white p-2.5 max-[740px]:flex-wrap">
            <label className="projection-search flex min-w-0 flex-1 items-center gap-2">
              <Search size={16} />
              <span className="sr-only">Search projection sets</span>
              <input onChange={(event) => setQuery(event.target.value)} placeholder="Search Projection Sets by name, model, scenario, or purpose..." value={query} />
              {query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button>}
            </label>
            <button className={`projection-toolbar-control ${filterOpen ? 'projection-control-active' : ''}`} onClick={() => setFilterOpen((current) => !current)}><Filter size={16} />Filters</button>
            <div className="projection-view-control">
              <button aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}><SlidersHorizontal size={16} /></button>
              <button aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><Settings2 size={16} /></button>
            </div>
          </div>

          {filterOpen && (
            <div className="projection-filter-panel mt-2 flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
              <label>Status<select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option>All statuses</option><option>Ready</option><option>Needs review</option><option>Draft</option></select></label>
              <button onClick={() => setStatusFilter('All statuses')}>Clear filters</button>
            </div>
          )}

          <div className="projection-list-heading flex items-center justify-between gap-3">
            <h2>Projection Set Library ({visibleSets.length})</h2>
            <button onClick={() => onNotify('Sorting by last updated is not available yet; showing the backend order.')}><small>Sort by</small>Last updated<ChevronDown size={14} /></button>
          </div>

          <div className={`projection-set-list ${view === 'grid' ? 'projection-set-grid grid grid-cols-2 gap-3 max-[760px]:grid-cols-1' : 'flex flex-col gap-2.5'}`}>
            {projectionQuery.loading && <p className="projection-empty-state">Loading Projection Sets from the backend…</p>}
            {projectionQuery.error && <p className="projection-empty-state">Could not load Projection Sets: {projectionQuery.error.message}</p>}
            {visibleSets.map((set) => (
              <ProjectionSetCard
                key={set.id ?? set.name}
                set={set}
                selected={selectedSet?.id === set.id}
                view={view}
                onSelect={() => setSelectedSet(set)}
                onNotify={onNotify}
                onViewDetails={() => { setSelectedSet(set); setManageOpen(true) }}
              />
            ))}
            {!projectionQuery.loading && !projectionQuery.error && visibleSets.length === 0 && <p className="projection-empty-state">No Projection Sets are saved for this project yet.</p>}
          </div>
        </main>

        <ProjectionActionsRail
          selectedSet={selectedSet}
          selectedModel={selectedSet ? { name: selectedSet.modelName, version: selectedSet.modelVersion } : null}
          onCreate={() => { if (!canCreateProjectionSet) return; if (onSetupStarted) onSetupStarted(); setCreateOpen(true) }}
          onCreateRun={() => { if (!canCreateRunSet) return; if (selectedSet) setRunSetDialogOpen(true); else onNotify('Create a Projection Set before creating a Run Set.') }}
          onManage={() => { if (selectedSet) setManageOpen(true) }}
          onNotify={onNotify}
          canCreateProjectionSet={canCreateProjectionSet}
          canCreateRunSet={canCreateRunSet}
        />
      </div>

      {createOpen && canCreateProjectionSet && <ProjectionSetCreateDialog onClose={() => { setCreateOpen(false); onSetupFinished?.() }} onCreated={(message) => { projectionQuery.refetch(); setCreateOpen(false); onSetupFinished?.(); onNotify(message) }} onNavigateToInput={onNavigateToInput} onNavigateToScenario={onNavigateToScenario} />}
      {runSetDialogOpen && selectedSet && <RunSetSubmissionDialog projectionSets={sets} initialProjectionSetId={selectedSet.id} onClose={() => setRunSetDialogOpen(false)} />}
      {manageOpen && selectedSet && <ProjectionSetDetails
        projectionSet={selectedSet.raw}
        canEdit={canCreateProjectionSet}
        onClose={() => setManageOpen(false)}
        onUpdated={(message, newId) => { projectionQuery.refetch(); if (newId) setPreferredSetId(newId); onNotify(message) }}
      />}
    </div>
  )
}

function ProjectionSummary({ icon, value, label, detail, tone, onClick }) {
  return (
    <button className={`projection-summary-card projection-summary-${tone}`} onClick={onClick}>
      <span>{icon}</span>
      <b>{value}</b>
      <span><strong>{label}</strong><small>{detail}</small></span>
      <ChevronDown className="projection-summary-arrow" size={18} />
    </button>
  )
}

function ProjectionSetCard({ set, selected, view, onSelect, onNotify, onViewDetails }) {
  const isGrid = view === 'grid'
  return (
    <article className={`projection-set-card ${selected ? 'projection-set-card-selected' : ''} ${isGrid ? 'projection-set-card-grid' : ''}`}>
      <button className="projection-set-info" onClick={onSelect}>
        <span className="projection-set-icon"><LineChart size={21} /></span>
        <span className="projection-set-copy">
          <b>{set.name}</b>
          <small>{set.version} · {set.scenario}</small>
          <span><CalendarDays size={12} />{set.horizon}<i />{set.inputs}<i />{set.formulas}</span>
          <small>{set.description}</small>
          <span className="projection-tags"><i>{set.product}</i><i>Model {set.modelVersion || 'version'}</i><i>{set.scenario}</i></span>
        </span>
      </button>

      <ProjectionPreview type={set.preview} />

      <div className={`projection-capture ${set.status === 'Needs review' ? 'projection-capture-warning' : ''}`}>
        <span><Check size={18} />{set.capture}</span>
        <small>{set.captureDetail || 'No additional validation detail was returned by the backend.'}</small>
        <button onClick={() => onNotify(set.captureDetail ? `${set.name}: ${set.captureDetail}` : `No additional validation detail is available for ${set.name}.`)}>View validation details <ArrowRight size={13} /></button>
        <button onClick={onViewDetails}>View Projection Set details <ArrowRight size={13} /></button>
      </div>
      <button aria-label={`Select ${set.name}`} className="projection-card-arrow" onClick={onSelect}><ArrowRight size={18} /></button>
    </article>
  )
}

function ProjectionPreview({ type }) {
  if (type === 'lines') {
    return (
      <div className="projection-preview-card">
        <span>Output Preview</span>
        <svg aria-label="Reserve and net earnings output preview" role="img" viewBox="0 0 190 92">
          <line x1="0" x2="190" y1="22" y2="22" /><line x1="0" x2="190" y1="46" y2="46" /><line x1="0" x2="190" y1="70" y2="70" />
          <polyline className="preview-green-line" points="4,74 36,65 66,67 97,42 124,45 154,32 186,17" />
          <polyline className="preview-dotted-line" points="4,78 36,71 66,72 97,63 124,57 154,51 186,38" />
        </svg>
        <small><i />Reserves <i />Net earnings</small>
      </div>
    )
  }

  return (
    <div className="projection-preview-card">
      <span>Output Preview</span>
      <div className="projection-preview-bars" aria-label="Rising liability reserve output">
        {[16, 22, 29, 36, 45, 54, 64, 75, 88].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
      </div>
      <small>Liability reserves</small>
    </div>
  )
}

function ProjectionActionsRail({ selectedSet, selectedModel, onCreate, onCreateRun, onManage, onNotify, canCreateProjectionSet, canCreateRunSet }) {
  return (
    <aside className="projection-actions-rail flex flex-col gap-3 rounded-[10px] bg-white p-3">
      {canCreateProjectionSet && <button className="projection-primary-action" onClick={onCreate}><Plus size={17} />Create Projection Set</button>}
      {selectedSet && <button className="projection-secondary-action" onClick={onManage}><FileText size={16} />View / manage selected set</button>}
      {canCreateRunSet && <button className="projection-secondary-action" onClick={onCreateRun}><span>▷</span>Create Run Set</button>}
      <div className="projection-resource-heading">Helpful resources</div>
      <ResourceLink icon={<Database size={17} />} title="Projection set guide" detail="Learn best practices" onClick={() => onNotify('Projection Set guide content is not available in this workspace yet.')} />
      <ResourceLink icon={<FileText size={17} />} title="Validation rules" detail="Understand checks" onClick={() => onNotify('Validation rule documentation is not available in this workspace yet.')} />
      <ResourceLink icon={<Workflow size={17} />} title="Output mappings" detail="See available outputs" onClick={() => onNotify('Output mapping documentation is not available in this workspace yet.')} />
      <div className="projection-context-card">
        <span>Model context</span>
        <small><Database size={14} />Model<b>{selectedModel ? `${selectedModel.name} ${selectedModel.version}` : 'Not selected'}</b></small>
        <small><ActivityIcon />Scenario<b>{selectedSet?.scenario ?? 'Not selected'}</b></small>
        <small><CalendarDays size={14} />Projection horizon<b>{selectedSet?.horizon ?? 'Not selected'}</b></small>
        <small><Database size={14} />Input library<b>{selectedSet?.inputs ?? 'Not selected'}</b></small>
      </div>
      <button className="projection-help-card" onClick={() => onNotify('Projection documentation is not available in this workspace yet.')}><Lightbulb size={18} /><span><b>Need help?</b><small>Open documentation</small></span><ArrowRight size={16} /></button>
    </aside>
  )
}

function ActivityIcon() {
  return <LineChart size={14} />
}

function ResourceLink({ icon, title, detail, onClick }) {
  return <button className="projection-resource-link" onClick={onClick}><span>{icon}</span><span><b>{title}</b><small>{detail}</small></span></button>
}

function ProjectionSetDetails({ projectionSet, canEdit, onClose, onUpdated }) {
  const { projectId } = useWorkspace()
  const { request } = useApi()
  const detailQuery = useApiQuery(projectionSet?.id ? `/v1/projection-sets/${projectionSet.id}` : null)
  const scenarioQuery = useApiQuery(projectId ? `/v1/projects/${projectId}/scenario-sets` : null)
  const detail = detailQuery.data ?? projectionSet
  const scenarios = (scenarioQuery.data?.scenario_sets ?? []).flatMap(group => group.scenarios ?? [])
  const attachedScenarioIds = new Set((detail?.scenarios ?? []).map(scenario => scenario.id))
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(detail?.name ?? '')
  const [description, setDescription] = useState(detail?.description ?? '')
  const [valuationDate, setValuationDate] = useState(detail?.valuation_date ?? '')
  const [horizon, setHorizon] = useState(detail?.horizon_months ?? 12)
  const [traceMode, setTraceMode] = useState(detail?.trace_scope?.mode ?? 'none')
  const [tracePolicyIds, setTracePolicyIds] = useState((detail?.trace_scope?.policy_ids ?? []).join(', '))
  const [scenarioId, setScenarioId] = useState('')
  const [versionLabel, setVersionLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setName(detail?.name ?? '')
    setDescription(detail?.description ?? '')
    setValuationDate(detail?.valuation_date ?? '')
    setHorizon(detail?.horizon_months ?? 12)
    setTraceMode(detail?.trace_scope?.mode ?? 'none')
    setTracePolicyIds((detail?.trace_scope?.policy_ids ?? []).join(', '))
  }, [detail])

  const refreshDetail = (result, message) => {
    detailQuery.refetch()
    onUpdated(message, result?.id)
  }

  const edit = async () => {
    if (!canEdit || busy || !detail?.id) return
    setBusy(true)
    setError('')
    try {
      const patch = {
        name: name.trim(),
        description: description.trim(),
        valuation_date: valuationDate,
        horizon_months: Number(horizon),
        trace_scope: {
          mode: traceMode,
          policy_ids: traceMode === 'selected_policies'
            ? tracePolicyIds.split(',').map(value => value.trim()).filter(Boolean)
            : [],
        },
      }
      const updated = await request(`/v1/projection-sets/${detail.id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      const validated = await request(`/v1/projection-sets/${detail.id}/validate`, { method: 'POST' })
      refreshDetail(validated ?? updated, `Projection Set updated and revalidated (${validated?.status ?? 'validation status unavailable'}).`)
      setEditing(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the Projection Set.')
    } finally {
      setBusy(false)
    }
  }

  const attachScenario = async () => {
    if (!canEdit || busy || !detail?.id || !scenarioId) return
    setBusy(true)
    setError('')
    try {
      const updated = await request(`/v1/projection-sets/${detail.id}/scenarios`, {
        method: 'POST',
        body: JSON.stringify({ scenario_id: scenarioId }),
      })
      const validated = await request(`/v1/projection-sets/${detail.id}/validate`, { method: 'POST' })
      refreshDetail(validated ?? updated, `Scenario attached; Projection Set revalidated (${validated?.status ?? 'validation status unavailable'}).`)
      setScenarioId('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not attach the scenario.')
    } finally {
      setBusy(false)
    }
  }

  const duplicate = async () => {
    if (!canEdit || busy || !detail?.id) return
    setBusy(true)
    setError('')
    try {
      const copy = await request(`/v1/projection-sets/${detail.id}/duplicate`, {
        method: 'POST',
        body: JSON.stringify(versionLabel.trim() ? { version_label: versionLabel.trim() } : {}),
      })
      onUpdated(`Created draft duplicate ${copy.name ?? copy.id}.`, copy.id)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not duplicate the Projection Set.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="projection-modal-backdrop" onClick={onClose}>
      <section className="projection-modal projection-detail-modal" role="dialog" aria-modal="true" aria-labelledby="projection-detail-title" onClick={event => event.stopPropagation()}>
        <header className="projection-detail-heading">
          <div><span className="projection-modal-eyebrow">Projection Set · {detail?.status ?? 'Loading'}</span><h2 id="projection-detail-title">{detail?.name ?? 'Loading Projection Set…'}</h2></div>
          <button aria-label="Close Projection Set details" onClick={onClose}><X size={19} /></button>
        </header>
        {detailQuery.loading && <p role="status">Loading Projection Set details…</p>}
        {detailQuery.error && <p className="projection-create-blocked" role="alert">Could not load details: {detailQuery.error.message}</p>}
        {scenarioQuery.error && <p className="projection-create-blocked" role="alert">Could not load scenarios: {scenarioQuery.error.message}</p>}
        {error && <p className="projection-create-blocked" role="alert">{error}</p>}
        {detail && <>
          <div className="projection-detail-facts">
            <span><b>Model</b>{detail.model_version?.model_name ?? detail.model_version?.model_id ?? '—'} · {detail.model_version?.version_label ?? '—'}</span>
            <span><b>Valuation / horizon</b>{detail.valuation_date ?? '—'} · {detail.horizon_months ?? '—'} months</span>
            <span><b>Inputs</b>{(detail.inputs?.inforce_files ?? []).map(item => item.name).join(', ') || 'None'}; {(detail.inputs?.assumption_tables ?? []).length} assumption and {(detail.inputs?.factor_tables ?? []).length} factor tables</span>
            <span><b>Scenarios</b>{(detail.scenarios ?? []).map(item => item.name).join(', ') || 'None attached'}</span>
            <span><b>Outputs</b>{(detail.output_variables ?? []).join(', ') || 'None configured'}</span>
            <span><b>Trace scope</b>{detail.trace_scope?.mode ?? 'none'}{detail.trace_scope?.policy_ids?.length ? ` · ${detail.trace_scope.policy_ids.join(', ')}` : ''}</span>
          </div>
          {detail.validation && <details className="projection-detail-validation"><summary>Validation · {detail.validation.status}</summary>{(detail.validation.checks ?? []).map(check => <p key={check.code}><b>{check.status}</b> · {check.label}{check.message ? ` — ${check.message}` : ''}</p>)}</details>}
          {canEdit && <div className="projection-detail-actions">
            <button className="projection-secondary-action" onClick={() => setEditing(current => !current)}>{editing ? 'Cancel edit' : 'Edit configuration'}</button>
            <label>New draft version<input value={versionLabel} onChange={event => setVersionLabel(event.target.value)} placeholder="Optional version label" maxLength={30} /></label>
            <button className="projection-secondary-action" disabled={busy} onClick={() => void duplicate()}>Duplicate as draft</button>
            <div className="projection-detail-attach">
              <label>Add scenario<select value={scenarioId} onChange={event => setScenarioId(event.target.value)}><option value="">Select a scenario</option>{scenarios.filter(item => !attachedScenarioIds.has(item.id)).map(item => <option key={item.id} value={item.id}>{item.name} · {item.status}</option>)}</select></label>
              <button className="projection-secondary-action" disabled={busy || !scenarioId} onClick={() => void attachScenario()}>Attach scenario</button>
            </div>
          </div>}
          {editing && <div className="projection-detail-edit">
            <label>Name<input value={name} onChange={event => setName(event.target.value)} maxLength={255} /></label>
            <label>Description<textarea value={description} onChange={event => setDescription(event.target.value)} /></label>
            <label>Valuation date<input type="date" value={valuationDate} onChange={event => setValuationDate(event.target.value)} /></label>
            <label>Horizon in months<input type="number" min={1} max={1200} value={horizon} onChange={event => setHorizon(event.target.value)} /></label>
            <label>Trace capture<select value={traceMode} onChange={event => setTraceMode(event.target.value)}><option value="none">None</option><option value="selected_policies">Selected policies</option><option value="all">All policies</option></select></label>
            {traceMode === 'selected_policies' && <label>Policy IDs<input value={tracePolicyIds} onChange={event => setTracePolicyIds(event.target.value)} placeholder="Comma-separated policy IDs" /></label>}
            <button className="projection-primary-action" disabled={busy || !name.trim() || !valuationDate || Number(horizon) < 1 || Number(horizon) > 1200 || (traceMode === 'selected_policies' && !tracePolicyIds.trim())} onClick={() => void edit()}>{busy ? 'Saving…' : 'Save and revalidate'}</button>
          </div>}
          {!canEdit && <p className="projection-detail-readonly">You can view this set; editing, duplication and scenario attachment require an editor or owner membership.</p>}
        </>}
      </section>
    </div>
  )
}
