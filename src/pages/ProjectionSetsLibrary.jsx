import { useMemo, useState } from 'react'
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
import { useApp } from '../context/useApp'
import './projection-sets.css'

const initialSets = [
  {
    name: 'MYGA GAAP Reserve',
    version: 'v1.0',
    scenario: 'Base scenario',
    horizon: '2026–2045',
    inputs: '4 inputs',
    formulas: '42 formulas',
    description: 'Standard GAAP reserve projection for MYGA including liability cash flows, reserves and key disclosures.',
    status: 'Ready',
    capture: 'Output capture complete',
    preview: 'bars',
    product: 'MYGA',
  },
  {
    name: 'MYGA Low Rate Sensitivity',
    version: 'v0.8',
    scenario: 'Low Interest Rate',
    horizon: '2026–2045',
    inputs: '4 inputs',
    formulas: '42 formulas',
    description: 'Sensitivity projection set for low interest rate environment with updated economic assumptions.',
    status: 'Needs review',
    capture: 'Validation completed with 2 items to review.',
    preview: 'lines',
    product: 'MYGA',
  },
  {
    name: 'FIA VM-21 Deterministic',
    version: 'v2.3',
    scenario: 'VM-21 Deterministic',
    horizon: '2026–2045',
    inputs: '4 inputs',
    formulas: '42 formulas',
    description: 'Deterministic VM-21 projection set for FIA product with standard assumption set.',
    status: 'Ready',
    capture: 'Output capture complete',
    preview: 'bars',
    product: 'FIA',
  },
]

export function ProjectionSetsLibrary({ onNotify }) {
  const { setActiveScreen } = useApp()
  const [sets, setSets] = useState(initialSets)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [filterOpen, setFilterOpen] = useState(false)
  const [view, setView] = useState('list')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedSet, setSelectedSet] = useState(initialSets[0])

  const visibleSets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return sets.filter((set) => {
      const matchesStatus = statusFilter === 'All statuses' || set.status === statusFilter
      const searchable = `${set.name} ${set.scenario} ${set.description} ${set.product}`.toLowerCase()
      return matchesStatus && searchable.includes(normalizedQuery)
    })
  }, [query, sets, statusFilter])

  const createSet = (newSet) => {
    setSets((current) => [newSet, ...current])
    setSelectedSet(newSet)
    setCreateOpen(false)
    onNotify(`${newSet.name} created`)
  }

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
        <ProjectionSummary icon={<Check size={22} />} value="2" label="Ready to run" detail="Fully validated and ready for run sets" tone="ready" onClick={() => setStatusFilter('Ready')} />
        <ProjectionSummary icon={<span className="projection-warning-dot" />} value="1" label="Needs review" detail="Validation items require attention" tone="warning" onClick={() => setStatusFilter('Needs review')} />
        <ProjectionSummary icon={<Database size={22} />} value="3" label="Active consumers" detail="Run sets using these projection sets" tone="consumers" onClick={() => onNotify('Active consumers opened')} />
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
              <label>Status<select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option>All statuses</option><option>Ready</option><option>Needs review</option></select></label>
              <button onClick={() => setStatusFilter('All statuses')}>Clear filters</button>
            </div>
          )}

          <div className="projection-list-heading flex items-center justify-between gap-3">
            <h2>Projection Set Library ({visibleSets.length})</h2>
            <button onClick={() => onNotify('Projection sets sorted by last updated')}><small>Sort by</small>Last updated<ChevronDown size={14} /></button>
          </div>

          <div className={`projection-set-list ${view === 'grid' ? 'projection-set-grid grid grid-cols-2 gap-3 max-[760px]:grid-cols-1' : 'flex flex-col gap-2.5'}`}>
            {visibleSets.map((set) => (
              <ProjectionSetCard
                key={set.name}
                set={set}
                selected={selectedSet.name === set.name}
                view={view}
                onSelect={() => setSelectedSet(set)}
                onNotify={onNotify}
              />
            ))}
            {visibleSets.length === 0 && <p className="projection-empty-state">No projection sets match the current search and filters.</p>}
          </div>
        </main>

        <ProjectionActionsRail
          selectedSet={selectedSet}
          onCreate={() => setCreateOpen(true)}
          onCreateRun={() => { setActiveScreen('Runs'); onNotify('Run Set flow opened for the selected projection set') }}
          onNotify={onNotify}
        />
      </div>

      {createOpen && <CreateProjectionDialog onClose={() => setCreateOpen(false)} onCreate={createSet} />}
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
          <span className="projection-tags"><i>{set.product}</i><i>Model v3.2</i><i>{set.scenario}</i></span>
        </span>
      </button>

      <ProjectionPreview type={set.preview} />

      <div className={`projection-capture ${set.status === 'Needs review' ? 'projection-capture-warning' : ''}`}>
        <span><Check size={18} />{set.capture}</span>
        <small>{set.status === 'Needs review' ? 'Validation completed with 2 items to review.' : 'All 42 outputs captured and validated successfully.'}</small>
        <button onClick={() => onNotify(`${set.name} validation details opened`)}>View validation details <ArrowRight size={13} /></button>
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

function ProjectionActionsRail({ selectedSet, onCreate, onCreateRun, onNotify }) {
  return (
    <aside className="projection-actions-rail flex flex-col gap-3 rounded-[10px] bg-white p-3">
      <button className="projection-primary-action" onClick={onCreate}><Plus size={17} />Create Projection Set</button>
      <button className="projection-secondary-action" onClick={onCreateRun}><span>▷</span>Create Run Set</button>
      <div className="projection-resource-heading">Helpful resources</div>
      <ResourceLink icon={<Database size={17} />} title="Projection set guide" detail="Learn best practices" onClick={() => onNotify('Projection set guide opened')} />
      <ResourceLink icon={<FileText size={17} />} title="Validation rules" detail="Understand checks" onClick={() => onNotify('Validation rules opened')} />
      <ResourceLink icon={<Workflow size={17} />} title="Output mappings" detail="See available outputs" onClick={() => onNotify('Output mappings opened')} />
      <div className="projection-context-card">
        <span>Model context</span>
        <small><Database size={14} />Model<b>MYGA v3.2</b></small>
        <small><ActivityIcon />Scenario<b>{selectedSet.scenario}</b></small>
        <small><CalendarDays size={14} />Projection horizon<b>{selectedSet.horizon}</b></small>
        <small><Database size={14} />Input library<b>Current (Validated)</b></small>
      </div>
      <button className="projection-help-card" onClick={() => onNotify('Projection documentation opened')}><Lightbulb size={18} /><span><b>Need help?</b><small>Open documentation</small></span><ArrowRight size={16} /></button>
    </aside>
  )
}

function ActivityIcon() {
  return <LineChart size={14} />
}

function ResourceLink({ icon, title, detail, onClick }) {
  return <button className="projection-resource-link" onClick={onClick}><span>{icon}</span><span><b>{title}</b><small>{detail}</small></span></button>
}

function CreateProjectionDialog({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [scenario, setScenario] = useState('Base scenario')

  return (
    <div className="projection-modal-backdrop" onClick={onClose}>
      <section aria-labelledby="projection-create-title" aria-modal="true" className="projection-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="flex items-start justify-between gap-3"><div><span className="projection-modal-eyebrow">New projection configuration</span><h2 id="projection-create-title">Create Projection Set</h2></div><button aria-label="Close dialog" onClick={onClose}><X size={19} /></button></div>
        <label>Name<input autoFocus onChange={(event) => setName(event.target.value)} placeholder="e.g. MYGA GAAP Reserve" value={name} /></label>
        <label>Scenario<select onChange={(event) => setScenario(event.target.value)} value={scenario}><option>Base scenario</option><option>Low Interest Rate</option><option>VM-21 Deterministic</option></select></label>
        <div className="projection-modal-actions"><button onClick={onClose}>Cancel</button><button disabled={!name.trim()} onClick={() => onCreate({ name: name.trim(), version: 'v0.1', scenario, horizon: '2026–2045', inputs: '4 inputs', formulas: '42 formulas', description: 'New projection configuration created for the active model context.', status: 'Ready', capture: 'Output capture not yet validated', preview: 'bars', product: 'MYGA' })}><Plus size={16} />Create Projection Set</button></div>
      </section>
    </div>
  )
}