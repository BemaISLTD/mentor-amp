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
import { RunSetSubmissionDialog } from '../run-set-workflow/RunSetWorkflow'
import { ProjectionSetCreateDialog } from './ProjectionSetCreateDialog'
import './projection-sets.css'

const EMPTY_PROJECTION_SETS = []

export function ProjectionSetsLibrary({ onNotify, startCreate = false, onCreateOpened, onSetupStarted, onSetupFinished, onNavigateToInput, onNavigateToScenario }) {
  const { projectId } = useWorkspace()
  const projectionQuery = useApiQuery(projectId ? `/v1/projects/${projectId}/projection-sets` : null)
  const consumersQuery = useApiQuery(projectId ? `/v1/projects/${projectId}/run-sets` : null, 10000)
  const apiSets = projectionQuery.data?.projection_sets ?? EMPTY_PROJECTION_SETS
  const [sets, setSets] = useState([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [filterOpen, setFilterOpen] = useState(false)
  const [view, setView] = useState('list')
  const [createOpen, setCreateOpen] = useState(startCreate)
  const [runSetDialogOpen, setRunSetDialogOpen] = useState(false)
  const [selectedSet, setSelectedSet] = useState(null)

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
    setSelectedSet(current => mapped.find(item => item.id === current?.id) ?? mapped[0] ?? null)
  }, [apiSets])

  useEffect(() => {
    if (!startCreate) return
    onCreateOpened?.()
  }, [startCreate, onCreateOpened])

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
              />
            ))}
            {!projectionQuery.loading && !projectionQuery.error && visibleSets.length === 0 && <p className="projection-empty-state">No Projection Sets are saved for this project yet.</p>}
          </div>
        </main>

        <ProjectionActionsRail
          selectedSet={selectedSet}
          selectedModel={selectedSet ? { name: selectedSet.modelName, version: selectedSet.modelVersion } : null}
          onCreate={() => { onSetupStarted?.(); setCreateOpen(true) }}
          onCreateRun={() => selectedSet ? setRunSetDialogOpen(true) : onNotify('Create a Projection Set before creating a Run Set.')}
          onNotify={onNotify}
        />
      </div>

      {createOpen && <ProjectionSetCreateDialog onClose={() => { setCreateOpen(false); onSetupFinished?.() }} onCreated={(message) => { projectionQuery.refetch(); setCreateOpen(false); onSetupFinished?.(); onNotify(message) }} onNavigateToInput={onNavigateToInput} onNavigateToScenario={onNavigateToScenario} />}
      {runSetDialogOpen && selectedSet && <RunSetSubmissionDialog projectionSets={sets} initialProjectionSetId={selectedSet.id} onClose={() => setRunSetDialogOpen(false)} />}
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

function ProjectionSetCard({ set, selected, view, onSelect, onNotify }) {
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

function ProjectionActionsRail({ selectedSet, selectedModel, onCreate, onCreateRun, onNotify }) {
  return (
    <aside className="projection-actions-rail flex flex-col gap-3 rounded-[10px] bg-white p-3">
      <button className="projection-primary-action" onClick={onCreate}><Plus size={17} />Create Projection Set</button>
      <button className="projection-secondary-action" onClick={onCreateRun}><span>▷</span>Create Run Set</button>
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
