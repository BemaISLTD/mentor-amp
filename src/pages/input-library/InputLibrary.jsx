import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  Database,
  Files,
  Filter,
  LayoutGrid,
  List,
  Network,
  Play,
  Search,
  ShieldCheck,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import './input-library.css'

const EMPTY_INPUTS = []
const inputTabs = [
  'Input Library',
  'Mappings',
  'Liability Inforce',
  'Asset Inforce',
  'Assumption Tables',
  'Factor Tables',
  'Projection Inputs',
  'Validation Center',
]

export function InputLibrary({ onNotify, onNavigate, onOpenInforceImport }) {
  const { projectId } = useWorkspace()
  const inputsQuery = useApiQuery(projectId ? `/v1/projects/${projectId}/inputs` : null)
  const issuesQuery = useApiQuery(projectId ? `/v1/projects/${projectId}/validation-issues` : null)
  const apiInputs = inputsQuery.data?.inputs ?? EMPTY_INPUTS
  const inputRecords = useMemo(() => apiInputs.map((item) => {
    const updated = item.updated_at ? new Date(item.updated_at) : null
    return {
      id: item.id,
      name: item.name,
      detail: item.description || item.category_label,
      version: item.version_label || '—',
      scope: item.scope || '—',
      records: `${item.record_count ?? 0} ${item.record_unit || 'records'}`,
      status: item.status === 'validated' ? 'Validated' : item.status === 'needs_review' ? 'Needs review' : 'Draft',
      updated: updated && !Number.isNaN(updated.valueOf()) ? updated.toLocaleDateString() : '—',
      description: item.description || '—',
      category: item.category_label,
      calculations: 0,
      metrics: 0,
      runs: 0,
      fingerprint: item.fingerprint,
    }
  }), [apiInputs])
  const issueCount = issuesQuery.data?.total ?? 0
  const inputSummary = inputsQuery.data?.summary ?? { total: inputRecords.length, validated: 0, needs_review: 0, mapping_count: 0 }
  const readiness = inputSummary.total ? Math.round(inputSummary.validated / inputSummary.total * 100) : 0
  const emptyCategories = (inputsQuery.data?.categories ?? []).filter((item) => item.count === 0).length
  const [activeTab, setActiveTab] = useState('Input Library')
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [view, setView] = useState('list')

  const visibleRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return inputRecords.filter((record) => {
      const matchesTab =
        activeTab === 'Input Library' ||
        activeTab === 'Mappings' ||
        activeTab === 'Validation Center' ||
        record.category === activeTab
      const matchesStatus =
        statusFilter === 'All statuses' || record.status === statusFilter
      const searchText = `${record.name} ${record.detail} ${record.scope} ${record.version} ${record.records}`.toLowerCase()
      const needsReview = activeTab !== 'Validation Center' || record.status === 'Needs review'

      return matchesTab && matchesStatus && needsReview && searchText.includes(normalizedQuery)
    })
  }, [activeTab, query, statusFilter, inputRecords])

  const selectedInput = inputRecords.find((record) => record.id === selectedId) ?? inputRecords[0]

  const selectTab = (tab) => {
    if (tab === 'Assumption Tables' || tab === 'Factor Tables') {
      onNavigate?.(tab)
      return
    }
    if (tab === 'Liability Inforce' || tab === 'Asset Inforce') {
      onNavigate?.('Import Inforce')
      return
    }
    setActiveTab(tab)
    const nextRecord = inputRecords.find((record) => tab === 'Input Library' || tab === 'Mappings' || tab === 'Validation Center' || record.category === tab)
    if (nextRecord) setSelectedId(nextRecord.id)
  }

  return (
    <div className="input-library-page flex flex-col gap-4">
      <section className="input-metrics grid grid-cols-5 gap-3 max-[1100px]:grid-cols-3 max-[700px]:grid-cols-2 max-[460px]:grid-cols-1" aria-label="Input readiness">
        <InputMetric icon={<ClipboardList size={27} />} label="Total inputs" value={String(inputSummary.total)} detail="Live project records" />
        <InputMetric icon={<Check size={29} />} label="Mapped inputs" value={String(inputSummary.mapping_count)} detail="Mappings in backend" />
        <InputMetric icon={<TriangleAlert size={28} />} label="Open issues" value={String(issueCount)} detail="Current validation issues" warning={issueCount > 0} />
        <InputMetric icon={<Files size={28} />} label="Empty categories" value={String(emptyCategories)} detail="Input categories with zero records" />
        <InputMetric icon={<ShieldCheck size={29} />} label="Ready for run" value={`${readiness}%`} detail="Validated inputs" />
      </section>

      <nav className="input-library-tabs flex items-center gap-8 overflow-x-auto" aria-label="Input workspace views">
        {inputTabs.map((tab) => (
          <button
            aria-current={activeTab === tab ? 'page' : undefined}
            className={`input-library-tab ${activeTab === tab ? 'input-library-tab-active' : ''}`}
            key={tab}
            onClick={() => onNavigate && ['Assumption Tables', 'Factor Tables', 'Liability Inforce', 'Asset Inforce'].includes(tab) ? selectTab(tab) : selectTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className="input-workspace-grid grid grid-cols-[minmax(0,1fr)_minmax(280px,322px)] items-start gap-4 max-[1050px]:grid-cols-1">
        <div className="input-library-main min-w-0">
          <div className="input-toolbar flex items-center gap-2.5 rounded-[10px] bg-white p-3 max-[720px]:flex-wrap">
            <div className="input-search flex min-w-0 flex-1 items-center gap-2.5">
              <Search size={18} />
              <input
                aria-label="Search inputs"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search input libraries, tables, mappings..."
                value={query}
              />
              {query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></button>}
            </div>
            <button
              aria-expanded={filtersOpen}
              className={`input-toolbar-button ${filtersOpen ? 'input-toolbar-button-active' : ''}`}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <Filter size={17} />Filters<ChevronDown size={15} />
            </button>
            <div className="input-view-control">
              <button
                aria-label="List view"
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
              ><List size={18} /></button>
              <button
                aria-label="Grid view"
                aria-pressed={view === 'grid'}
                onClick={() => setView('grid')}
              ><LayoutGrid size={17} /></button>
            </div>
            <button className="input-import-button" onClick={() => onOpenInforceImport?.()}>
              <Upload size={18} />Import input
            </button>
          </div>

          {filtersOpen && (
            <div className="input-filter-panel mt-2 flex flex-wrap items-center gap-3 rounded-lg border bg-white px-4 py-3">
              <label className="flex items-center gap-2 text-xs text-[#71809f]">
                Status
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option>All statuses</option>
                  <option>Validated</option>
                  <option>Needs review</option>
                </select>
              </label>
              <button onClick={() => setStatusFilter('All statuses')}>Clear filters</button>
            </div>
          )}

          <div className={`input-table-panel mt-4 rounded-[10px] bg-white ${view === 'grid' ? 'input-record-grid grid grid-cols-2 gap-3 p-3 max-[720px]:grid-cols-1' : ''}`}>
            {view === 'list' && <InputTableHeader />}
            {inputsQuery.loading ? <p className="p-6 text-center text-sm text-[#71809f]">Loading project inputs…</p> : inputsQuery.error ? <p className="p-6 text-center text-sm text-[#71809f]">Could not load inputs: {inputsQuery.error.message}</p> : visibleRecords.length ? visibleRecords.map((record) => (
              <InputRow
                key={record.id}
                record={record}
                selected={selectedInput.id === record.id}
                view={view}
                onSelect={() => setSelectedId(record.id)}
              />
            )) : (
              <p className="p-6 text-center text-sm text-[#71809f]">No inputs match the current search and filters.</p>
            )}
          </div>
        </div>

        {selectedInput ? <InputDetails input={selectedInput} onNotify={onNotify} /> : <aside className="input-details-panel rounded-[10px] bg-white p-5">No input record is available for this project yet.</aside>}
      </section>

      <aside className="input-issue-banner flex items-center gap-4 rounded-[10px] px-5 py-4 max-[650px]:flex-wrap">
        <ShieldCheck size={25} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <b>{inputsQuery.loading ? 'Checking input validation…' : issueCount ? `${issueCount} validation issue${issueCount === 1 ? '' : 's'} need review` : 'No open input validation issues'}</b>
          <small>{issuesQuery.error?.message || 'Resolve live validation issues before submitting a projection run.'}</small>
        </span>
        <button onClick={() => selectTab('Validation Center')}>
          View input issues <ArrowRight size={18} />
        </button>
      </aside>
    </div>
  )
}

function InputMetric({ icon, label, value, detail, warning = false }) {
  return (
    <article className="input-metric-card flex min-w-0 items-center gap-4 rounded-[10px] bg-white p-4">
      <span className={`input-metric-icon ${warning ? 'input-metric-icon-warning' : ''}`}>{icon}</span>
      <span className="flex min-w-0 flex-col gap-1">
        <small>{label}</small>
        <b>{value}</b>
        <span>{detail}</span>
      </span>
    </article>
  )
}

function InputTableHeader() {
  return (
    <div className="input-table-header grid grid-cols-[minmax(200px,1.6fr)_110px_minmax(120px,1fr)_130px_120px_130px_20px] items-center gap-3 px-4 max-[820px]:hidden">
      <span>Name</span>
      <span>Version</span>
      <span>Model scope</span>
      <span>Records / size</span>
      <span>Status</span>
      <span>Last updated <ArrowRight className="rotate-90" size={12} /></span>
      <span />
    </div>
  )
}

function InputRow({ record, selected, onSelect, view }) {
  const isGrid = view === 'grid'

  return (
    <button
      aria-pressed={selected}
      className={`input-record ${selected ? 'input-record-selected' : ''} ${isGrid ? 'input-record-card flex flex-col items-start gap-3 rounded-lg border p-4' : 'grid grid-cols-[minmax(200px,1.6fr)_110px_minmax(120px,1fr)_130px_120px_130px_20px] items-center gap-3 px-4 max-[1050px]:grid-cols-[minmax(0,1fr)_auto] max-[1050px]:gap-y-2 max-[820px]:grid-cols-1 max-[820px]:items-start'} `}
      onClick={onSelect}
    >
      <span className="input-record-name flex min-w-0 items-center gap-3">
        <i><ClipboardList size={21} /></i>
        <span className="flex min-w-0 flex-col gap-1 text-left">
          <b>{record.name}</b>
          <small>{record.detail}</small>
        </span>
      </span>
      <span className="input-record-version">{record.version}</span>
      <span className="input-record-scope">{record.scope}</span>
      <span className="input-record-count">{record.records}</span>
      <span className="input-record-status"><StatusBadge status={record.status} /></span>
      <span className="input-record-updated">{record.updated}</span>
      <ArrowRight className="input-record-arrow" size={17} />
      {isGrid && <small className="input-record-description">{record.scope} · {record.records} · {record.updated}</small>}
    </button>
  )
}

function InputDetails({ input, onNotify }) {
  return (
    <aside className="input-details-panel rounded-[10px] bg-white p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <span className="input-selected-label">Selected input</span>
        <button aria-label="Close selected input details" className="input-details-close" onClick={() => onNotify('Input details closed')}><X size={18} /></button>
      </div>
      <div className="input-details-title flex items-center gap-3">
        <span><ClipboardList size={25} /></span>
        <div className="min-w-0 flex-1">
          <h2>{input.name}</h2>
          <small>{input.detail}</small>
        </div>
        <StatusBadge status={input.status} />
      </div>
      <dl className="input-detail-list">
        <DetailItem label="Version" value={input.version} />
        <DetailItem label="Records" value={input.records} />
        <DetailItem label="Last updated" value={input.updated} />
        <DetailItem label="Validation" value={input.status === 'Validated' ? 'Passed validation' : 'Review required'} />
        <DetailItem label="Description" value={input.description} />
      </dl>
      <div className="input-downstream">
        <h3>Downstream impact</h3>
        <p>This input connects to the following model components and runs.</p>
        <ImpactRow icon={<Network size={19} />} title="Model calculations" detail="Reserves, cash flows, expenses" count={input.calculations} />
        <ImpactRow icon={<Play size={19} />} title="Output Metrics" detail="Policy projections" count={input.metrics} />
        <ImpactRow icon={<Database size={19} />} title="Run results" detail="Scenario & comparison" count={input.runs} />
      </div>
      <button className="input-lineage-button" onClick={() => onNotify(`Lineage opened for ${input.name}`)}>
        <Network size={18} />View full lineage
      </button>
    </aside>
  )
}

function DetailItem({ label, value }) {
  return (
    <div className="input-detail-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function ImpactRow({ icon, title, detail, count }) {
  return (
    <div className="input-impact-row">
      <span>{icon}</span>
      <span><b>{title}</b><small>{detail}</small></span>
      <strong>{count}</strong>
    </div>
  )
}
