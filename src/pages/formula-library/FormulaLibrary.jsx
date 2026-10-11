import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  ChartNoAxesColumn,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Code2,
  Database,
  GitBranch,
  Info,
  Layers,
  LockKeyhole,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Share2,
  Workflow,
} from 'lucide-react'
import { useApi } from '../../api/ApiProvider'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import './formula-library.css'

const EMPTY_MODELS = []
const EMPTY_GROUPS = []

async function copyToClipboard(value, successMessage, onNotify) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable.')
    await navigator.clipboard.writeText(value)
    onNotify(successMessage)
  } catch (error) {
    onNotify(error instanceof Error ? error.message : 'Could not copy to clipboard.')
  }
}

export function FormulaLibrary({ query, onNotify, onLineageChange, onDetailChange }) {
  const { projectId } = useWorkspace()
  const { request } = useApi()
  const modelsQuery = useApiQuery(projectId ? `/v1/projects/${encodeURIComponent(projectId)}/models` : null)
  const models = modelsQuery.data?.models ?? EMPTY_MODELS
  const [groupsState, setGroupsState] = useState({ projectId: '', loading: false, error: null, items: [] })
  const formulaGroups = groupsState.projectId === projectId ? groupsState.items : EMPTY_GROUPS
  const [releaseFilter, setReleaseFilter] = useState('All')
  const [ownerFilter, setOwnerFilter] = useState('All owners')
  const [usageFilter, setUsageFilter] = useState('Any usage')
  const [selectedId, setSelectedId] = useState('')
  const [selectedFormulaId, setSelectedFormulaId] = useState('')
  const [sortNewestFirst, setSortNewestFirst] = useState(true)
  const [view, setView] = useState('library')
  useEffect(() => {
    if (!projectId || modelsQuery.loading || modelsQuery.error) {
      setGroupsState({ projectId: projectId ?? '', loading: Boolean(projectId && modelsQuery.loading), error: modelsQuery.error, items: [] })
      return
    }
    let active = true
    const versions = models
      .filter((model) => model.current_version?.id)
      .map((model) => ({ model, version: model.current_version }))
    setGroupsState({ projectId, loading: versions.length > 0, error: null, items: [] })
    Promise.all(versions.map(async ({ model, version }) => {
      const response = await request(`/v1/model-versions/${encodeURIComponent(version.id)}/formula-groups`)
      return (response.groups ?? []).map((group) => ({
        id: `${version.id}:${group.id}`,
        groupId: group.id,
        modelVersionId: version.id,
        modelName: model.name,
        modelStatus: model.status,
        modelVersion: version.version_label,
        basis: version.basis,
        name: group.name,
        description: group.description || 'No description provided.',
        owner: model.owner?.full_name || '—',
        initials: model.owner?.full_name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '—',
        version: group.version_label,
        usage: `${group.consumer_count} projection sets`,
        dependencies: `${group.formula_count} formulas`,
        tests: 'Not available',
        state: group.lineage_state || 'local',
        releaseDate: model.updated_at || '',
        origin: `${model.name} ${version.version_label || ''}`.trim(),
        usedBy: [model.name],
        formulas: group.formulas ?? [],
      }))
    })).then((items) => {
      if (active) setGroupsState({ projectId, loading: false, error: null, items: items.flat() })
    }).catch((error) => {
      if (active) setGroupsState({ projectId, loading: false, error: error instanceof Error ? error : new Error('Could not load formula groups.'), items: [] })
    })
    return () => { active = false }
  }, [projectId, modelsQuery.loading, modelsQuery.error, models, request])
  useEffect(() => {
    if (formulaGroups.length && !formulaGroups.some((group) => group.id === selectedId)) setSelectedId(formulaGroups[0].id)
  }, [formulaGroups, selectedId])
  const selectedGroup = formulaGroups.find((group) => group.id === selectedId) ?? formulaGroups[0] ?? null
  const selectedFormula = selectedGroup?.formulas?.find((formula) => formula.id === selectedFormulaId) ?? selectedGroup?.formulas?.[0] ?? null
  useEffect(() => {
    if (selectedFormula?.id && selectedFormula.id !== selectedFormulaId) setSelectedFormulaId(selectedFormula.id)
  }, [selectedFormula, selectedFormulaId])
  const formulaQuery = useApiQuery(selectedFormula?.id ? `/v1/formulas/${encodeURIComponent(selectedFormula.id)}/detail` : null)
  const formulaDetail = formulaQuery.data?.id === selectedFormula?.id ? formulaQuery.data : null
  const changeView = (nextView) => {
    setView(nextView)
    onLineageChange?.(nextView === 'lineage')
    onDetailChange?.(nextView === 'detail')
  }

  const visibleGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return formulaGroups
      .filter((group) => {
        const matchesRelease = releaseFilter === 'All' || group.state.toLowerCase() === releaseFilter.toLowerCase()
        const matchesOwner = ownerFilter === 'All owners' || group.owner === ownerFilter
        const matchesUsage = usageFilter === 'Any usage' || group.usedBy.some((model) => model.includes(usageFilter))
        const searchable = `${group.name} ${group.description} ${group.owner} ${group.version} ${group.usedBy.join(' ')}`.toLowerCase()

        return matchesRelease && matchesOwner && matchesUsage && searchable.includes(normalizedQuery)
      })
      .sort((first, second) => {
        const result = (second.releaseDate || '').localeCompare(first.releaseDate || '')
        return sortNewestFirst ? result : -result
      })
  }, [ownerFilter, query, releaseFilter, sortNewestFirst, usageFilter, formulaGroups])

  if (view === 'detail') {
    return <FormulaDetailScreen group={selectedGroup} formula={formulaDetail} loading={formulaQuery.loading} error={formulaQuery.error} onBack={() => changeView('library')} onViewLineage={() => changeView('lineage')} onNotify={onNotify} />
  }
  if (view === 'lineage') {
    return <FormulaLineageScreen group={selectedGroup} formula={formulaDetail} loading={formulaQuery.loading} error={formulaQuery.error} onBack={() => changeView('detail')} onNotify={onNotify} />
  }

  const states = [...new Set(formulaGroups.map((group) => group.state).filter(Boolean))]
  const releaseFilters = [{ label: 'All', count: formulaGroups.length }, ...states.map((state) => ({ label: state, count: formulaGroups.filter((group) => group.state === state).length }))]
  const owners = [...new Set(formulaGroups.map((group) => group.owner).filter((owner) => owner && owner !== '—'))]
  const modelsInGroups = [...new Set(formulaGroups.map((group) => group.modelName))]
  const formulaCount = formulaGroups.reduce((count, group) => count + group.formulas.length, 0)
  const validatedCount = formulaGroups.reduce((count, group) => count + group.formulas.filter((formula) => formula.status === 'validated').length, 0)

  return (
    <div className="formula-library-page flex flex-col gap-4">
      <div className="formula-library-create-row flex justify-end">
        <button className="formula-create-top-button" disabled title="Formula-group creation is not supported by the backend yet."><Plus size={19} />Create formula group</button>
      </div>
      <section className="formula-summary-grid grid grid-cols-[1.5fr_repeat(3,minmax(0,1fr))] gap-3 max-[1050px]:grid-cols-2 max-[580px]:grid-cols-1">
        <FormulaSummary dark icon={<Workflow size={27} />} label="Formula groups" value={groupsState.loading ? '…' : formulaGroups.length} detail={`${models.length} models in this project`} />
        <FormulaSummary icon={<GitBranch size={26} />} label="Model versions" value={models.filter((model) => model.current_version).length} detail="Current versions with formula catalogs" />
        <FormulaSummary icon={<ShieldCheck size={26} />} label="Validated formulas" value={validatedCount} detail={`${formulaCount} formulas in the current catalog`} />
        <FormulaSummary icon={<Check size={27} />} label="Formula definitions" value={formulaCount} detail="Read from model-version registries" />
      </section>

      <div className="formula-filter-row flex items-center justify-between gap-4 max-[700px]:items-start max-[700px]:flex-col">
        <div className="formula-release-tabs flex items-center gap-2 overflow-x-auto" role="tablist" aria-label="Formula release status">
          {releaseFilters.map((filter) => (
            <button
              aria-selected={releaseFilter === filter.label}
              className={`formula-release-tab ${releaseFilter === filter.label ? 'formula-release-tab-active' : ''}`}
              key={filter.label}
              onClick={() => setReleaseFilter(filter.label)}
              role="tab"
            >
              {filter.label} <b>{filter.count}</b>
            </button>
          ))}
        </div>
        <div className="formula-selectors flex items-center gap-3 max-[700px]:w-full max-[700px]:overflow-x-auto">
          <FormulaSelect value={ownerFilter} onChange={setOwnerFilter} options={['All owners', ...owners]} />
          <FormulaSelect value={usageFilter} onChange={setUsageFilter} options={['Any usage', ...modelsInGroups]} />
        </div>
      </div>

      <section className="formula-list-panel rounded-[12px] bg-white p-4 max-[600px]:p-3">
        <div className="formula-list-heading flex items-center justify-between gap-4">
          <h2>Formula groups <span>({visibleGroups.length})</span></h2>
          <button className="formula-sort-button" onClick={() => setSortNewestFirst((current) => !current)}>
            <ArrowDownUp size={17} />Last updated<ChevronDown size={15} />
          </button>
        </div>
        <div className="formula-table-wrap">
          <div className="formula-table-header">
            <span>Bundle</span><span>Owner</span><span>Version</span><span>Usage</span><span>Dependencies</span><span>Tests</span><span>Release</span><span>Actions</span>
          </div>
          {visibleGroups.map((group) => (
            <FormulaRow
              group={group}
              key={group.name}
              selected={selectedName === group.name}
              onInspect={() => { setSelectedId(group.id); changeView('detail') }}
              onMore={() => onNotify('Formula group actions are read-only in this backend version.')}
            />
          ))}
          {visibleGroups.length === 0 && <p className="formula-empty-state">{groupsState.loading ? 'Loading formula groups…' : groupsState.error ? groupsState.error.message : modelsQuery.error ? modelsQuery.error.message : 'No formula groups match these filters.'}</p>}
        </div>
      </section>

      <section className="formula-details-grid grid grid-cols-[minmax(0,1.4fr)_minmax(330px,0.9fr)] gap-3 max-[900px]:grid-cols-1">
        {selectedGroup &&         <SelectedFormula group={selectedGroup} formula={selectedFormula} onSelectFormula={setSelectedFormulaId} onInspect={() => changeView('detail')} onNotify={onNotify} />}
        {selectedGroup && <FormulaDependencies group={selectedGroup} formula={formulaDetail} onViewLineage={() => changeView('lineage')} onNotify={onNotify} />}
      </section>
    </div>
  )
}

function FormulaSummary({ dark = false, icon, label, value, detail }) {
  return (
    <article className={`formula-summary-card ${dark ? 'formula-summary-card-dark' : ''}`}>
      <span className="formula-summary-icon">{icon}</span>
      <span className="formula-summary-copy"><small>{label}</small><b>{value}</b><span>{detail}</span></span>
    </article>
  )
}

function FormulaSelect({ value, onChange, options }) {
  return (
    <label className="formula-filter-select">
      <span className="sr-only">{value}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      <ChevronDown size={16} />
    </label>
  )
}

function FormulaRow({ group, selected, onInspect, onMore }) {
  return (
    <article className={`formula-row ${selected ? 'formula-row-selected' : ''}`}>
      <div className="formula-bundle-cell">
        <span className="formula-bundle-icon"><Workflow size={22} /></span>
        <span><b>{group.name}</b><small>{group.description}</small></span>
      </div>
      <div className="formula-owner-cell"><i className={`owner-avatar owner-${group.initials}`}>{group.initials}</i><span>{group.owner}</span></div>
      <span className="formula-version-pill">{group.version}</span>
      <span className="formula-table-muted">{group.usage}</span>
      <span className="formula-table-muted">{group.dependencies}</span>
      <span className="formula-test-count"><b>{group.tests}</b><small>tests passing</small></span>
      <span className={`formula-release-state formula-state-${group.state.toLowerCase().replace(' ', '-')}`}><i />{group.state}</span>
      <span className="formula-row-actions">
        <button className="formula-inspect-button" onClick={onInspect}>Inspect</button>
        <button aria-label={`More actions for ${group.name}`} className="formula-more-button" onClick={onMore}><MoreVertical size={18} /></button>
      </span>
      <button aria-label={`Inspect ${group.name}`} className="formula-row-mobile-action" onClick={onInspect}><ArrowRight size={16} /></button>
    </article>
  )
}

function SelectedFormula({ group, formula, onSelectFormula, onInspect, onNotify }) {
  const name = formula?.name || formula?.output_variable || 'No formula definitions'
  return (
    <article className="formula-detail-card rounded-[12px] bg-white p-5">
      <div className="formula-detail-title-row">
        <div><h2>{group.name}</h2><p>{group.description}</p></div>
        <span className={`formula-release-state formula-state-${group.state.toLowerCase().replace(' ', '-')}`}><i />{group.state}</span>
      </div>
      <div className="formula-detail-meta">
        <span><small>Owner</small><b>{group.owner}</b></span>
        <span><small>Model</small><b>{group.modelName}</b></span>
        <span><small>Model version</small><b>{group.modelVersion || '—'}</b></span>
        <span><small>Formula count</small><b>{group.formulas.length}</b></span>
      </div>
      <div className="formula-used-by"><small>Formula definitions</small>{group.formulas.length ? group.formulas.map((item) => <button className={item.id === formula?.id ? 'formula-row-selected' : ''} key={item.id} onClick={() => onSelectFormula(item.id)}>{item.name || item.output_variable}</button>) : <span>No formulas in this group</span>}</div>
      <div className="formula-detail-actions">
        <button className="formula-create-button" disabled={!formula} onClick={onInspect}><Search size={17} />Inspect {name}</button>
        <button className="formula-history-button" onClick={() => onNotify('Formula version history is not exposed by the backend.') }><Clock3 size={17} />Open version history</button>
      </div>
    </article>
  )
}

function FormulaDependencies({ group, formula, onViewLineage, onNotify }) {
  const dependencyCount = (formula?.inputs?.length ?? 0) + (formula?.formula_dependencies?.length ?? 0)
  const dependents = formula?.dependents ?? []
  return (
    <article className="formula-dependencies-card rounded-[12px] bg-white p-5">
      <div className="formula-dependencies-heading"><h2>Dependencies &amp; tests</h2><button onClick={onViewLineage}>View lineage <ArrowRight size={14} /></button></div>
      <div className="formula-dependency-chips">{dependents.length ? dependents.map((item) => <span key={`${item.variable}-${item.formula_id}`}>{item.variable}</span>) : <span>No downstream formula references</span>}</div>
      <div className="formula-test-metrics">
        <span><small>Inputs</small><b>{dependencyCount}</b></span>
        <span><small>Downstream</small><b>{dependents.length}</b></span>
        <span><small>Group formulas</small><b>{group.formulas.length}</b></span>
      </div>
      <div className="formula-tests-passed"><Info size={16} />{formula?.tests?.message || 'Formula test results are not available from the backend.'}</div>
      <button className="sr-only" onClick={() => onNotify('Formula test results are not exposed by the backend.')}>Open tests</button>
    </article>
  )
}

function getFormulaDetails(formula) {
  return {
    id: formula?.id,
    name: formula?.name || formula?.output_variable || 'Formula',
    outputVariable: formula?.output_variable || formula?.name || '—',
    expression: formula?.expression_text || formula?.function_ref || 'No expression is stored for this formula.',
    explanation: formula?.explanation || 'No explanation is stored for this formula.',
    status: formula?.status || 'unknown',
    version: formula?.version || '—',
    unit: formula?.unit || '—',
    illustrative: Boolean(formula?.illustrative),
    inputs: (formula?.inputs ?? []).map((item) => [item.variable, item.source_summary || item.kind || 'Input']),
    formulaDependencies: (formula?.formula_dependencies ?? []).map((item) => [item.variable, item.kind || 'formula']),
    dependents: (formula?.dependents ?? []).map((item) => [item.variable, item.kind || 'Downstream formula']),
  }
}

function FormulaDetailScreen({ group, formula: formulaData, loading, error, onBack, onViewLineage, onNotify }) {
  const formula = getFormulaDetails(formulaData || group?.formulas?.[0] || {})
  const [activeMetric, setActiveMetric] = useState('Inputs')
  const dependencyInputs = [...formula.inputs, ...formula.formulaDependencies]
  const graphCount = dependencyInputs.length + formula.dependents.length + 1
  return (
    <div className="formula-screen formula-detail-screen">
      <div className="formula-detail-topbar">
        <button className="formula-detail-breadcrumb" onClick={onBack}><b>{group?.modelName || 'Model'}</b><ChevronRight size={13} /><span>{group?.modelVersion || '—'}</span><ChevronRight size={13} /><span>{group?.name || 'Formula group'}</span></button>
        <div className="formula-lineage-user"><span className="formula-notification">♧<i /></span><b>{group?.initials || '—'}</b><span>{group?.owner || 'Unknown owner'}<small>Model owner</small></span><ChevronDown size={13} /></div>
      </div>
      <div className="formula-screen-heading">
        <div>
          <div className="formula-screen-title-line"><h2>{formula.name}</h2><span className="formula-screen-status"><i />{formula.status}</span></div>
          <p>{formula.explanation}</p>
        </div>
        <div className="formula-detail-actions">
          <button className="formula-detail-share" onClick={() => copyToClipboard(formula.id, 'Formula ID copied', onNotify)}><Share2 size={14} />Share</button>
          <button className="formula-screen-primary" disabled title="Formula editing is not available in this workspace yet."><Pencil size={14} />Edit formula</button>
        </div>
      </div>
      <div className="formula-screen-detail-grid">
        <main className="formula-screen-main">
          <section className="formula-screen-card formula-definition-card">
            <div className="formula-screen-card-heading"><h3>Formula</h3><span>Version {formula.version}{formula.illustrative ? ' · Illustrative' : ''}</span></div>
            <div className="formula-definition"><span>fx</span><code>{loading ? 'Loading formula details…' : error ? error.message : formula.expression}</code><button aria-label="Copy formula expression" onClick={() => copyToClipboard(formula.expression, 'Formula expression copied', onNotify)}><Code2 size={16} /></button></div>
          </section>
          <section className="formula-screen-card formula-dependency-card">
            <div className="formula-screen-card-heading"><h3>Formula dependencies</h3><button onClick={onViewLineage}>View full lineage <ArrowUpRight size={13} /></button></div>
            <FormulaDependencyDiagram formula={formula} />
          </section>
          <section className="formula-screen-card formula-metrics-card">
            <div className="formula-screen-card-heading"><h3>Formula metrics</h3></div>
            <div className="formula-metric-grid">
              <button className={activeMetric === 'Graph nodes' ? 'formula-metric-active' : ''} onClick={() => setActiveMetric('Graph nodes')}><GitBranch size={17} /><b>{graphCount}</b><small>Known graph nodes</small></button>
              <button className={activeMetric === 'Inputs' ? 'formula-metric-active' : ''} onClick={() => setActiveMetric('Inputs')}><Layers size={17} /><b>{dependencyInputs.length}</b><small>Input references</small></button>
              <button className={activeMetric === 'Dependents' ? 'formula-metric-active' : ''} onClick={() => setActiveMetric('Dependents')}><Database size={17} /><b>{formula.dependents.length}</b><small>Downstream formulas</small></button>
              <button className={activeMetric === 'Versions' ? 'formula-metric-active' : ''} onClick={() => setActiveMetric('Versions')}><Clock3 size={17} /><b>{formula.version === '—' ? 0 : 1}</b><small>Current version available</small></button>
            </div>
          </section>
          <section className="formula-screen-card formula-history-card"><div className="formula-screen-card-heading"><h3>Version history</h3><button onClick={() => onNotify('Formula version history is not exposed by the backend.')}>View all versions <ArrowRight size={13} /></button></div><div className="formula-history-row"><i /><b>{formula.version}</b><span>Current registered formula definition</span><small>{formula.status}</small><em>{group?.modelVersion || 'Current model version'}</em></div></section>
        </main>
        <aside className="formula-screen-card formula-provenance-card">
          <div className="formula-screen-card-heading"><h3>Provenance and checks</h3><span className="formula-screen-status"><i />{formula.status}</span></div>
          {[['Expression', formula.expression ? 'Available' : 'Missing'], ['Inputs', String(dependencyInputs.length)], ['Unit', formula.unit], ['Tests', formulaData?.tests?.available ? `${formulaData.tests.passing} / ${formulaData.tests.total}` : 'Unavailable']].map(([label, value]) => <div className="formula-check-row" key={label}><Check size={14} /><span>{label}</span><b>{value}</b></div>)}
          <hr />
          <h4><Workflow size={14} />Source</h4>
          <div className="formula-provenance-detail"><span>Source type</span><b>{formulaData?.group?.lineage_state || 'Model formula'}</b></div>
          <div className="formula-provenance-detail"><span>Model</span><b>{group?.modelName} {group?.modelVersion}</b></div>
          <div className="formula-provenance-detail"><span>Output</span><b>{formula.outputVariable}</b></div>
          <div className="formula-provenance-detail"><span>Group</span><b>{formulaData?.group?.name || group?.name}</b></div>
          <button className="formula-lineage-button" onClick={onViewLineage}><GitBranch size={15} />View lineage<ArrowUpRight size={14} /></button>
          <hr />
          <h4><ChartNoAxesColumn size={14} />Trace availability</h4>
          <div className="formula-provenance-detail"><span>Latest run</span><b>{formulaData?.trace?.latest_run_id || '—'}</b></div>
          <div className="formula-provenance-detail"><span>Trace</span><b>{formulaData?.trace?.available ? 'Available' : 'Unavailable'}</b></div>
          <hr />
          <div className="formula-tag-heading">Dependencies</div>
          <div className="formula-tags">{dependencyInputs.length ? dependencyInputs.map(([name]) => <span key={name}>{name}</span>) : <span>None</span>}</div>
          <p className="formula-detail-mock-note"><Info size={13} />All displayed formula details are from the backend registry.</p>
        </aside>
      </div>
    </div>
  )
}

function FormulaDependencyDiagram({ formula }) {
  return (
    <div className="formula-dependency-diagram">
      <svg className="formula-diagram-connectors" viewBox="0 0 1000 280" preserveAspectRatio="none" aria-hidden="true">
        <g>
          <path d="M235 45 C280 45 285 140 335 140" />
          <path d="M235 105 C280 105 285 140 335 140" />
          <path d="M235 175 C280 175 285 140 335 140" />
          <path d="M235 235 C280 235 285 140 335 140" />
          <path d="M665 140 C715 140 720 65 765 65" />
          <path d="M665 140 H765" />
          <path d="M665 140 C715 140 720 215 765 215" />
          <circle cx="335" cy="140" r="5" /><circle cx="665" cy="140" r="5" />
          <circle cx="765" cy="65" r="5" /><circle cx="765" cy="140" r="5" /><circle cx="765" cy="215" r="5" />
        </g>
      </svg>
      <div className="formula-diagram-column formula-diagram-inputs"><span>INPUTS</span>{[...formula.inputs, ...formula.formulaDependencies].map(([name, description]) => <div className="formula-diagram-node" key={name}><i>fx</i><b>{name}<small>{description}</small></b></div>)}</div>
      <div className="formula-diagram-current"><i>fx</i><b>{formula.name}</b><small>{formula.status}</small></div>
      <div className="formula-diagram-column formula-diagram-outputs"><span>DOWNSTREAM FORMULAS</span>{formula.dependents.map(([name, description]) => <div className="formula-diagram-node formula-diagram-consumer" key={name}><i><ArrowUpRight size={14} /></i><b>{name}<small>{description}</small></b></div>)}</div>
    </div>
  )
}

function FormulaLineageScreen({ group, formula: formulaData, loading, error, onBack, onNotify }) {
  const formula = getFormulaDetails(formulaData || group?.formulas?.[0] || {})
  const [selectedNode, setSelectedNode] = useState(formula.name)
  const [expanded, setExpanded] = useState(true)
  const nodes = [...formula.inputs, ...formula.formulaDependencies].map(([name, detail]) => ({ name, detail, kind: 'inherited', icon: <Database size={16} /> }))
  const parentNodes = group ? [{ name: group.name, detail: `${group.state} · ${group.version}`, icon: <Layers size={17} /> }] : []
  const consumerNodes = formula.dependents.map(([name, detail]) => ({ name, detail, icon: <ChartNoAxesColumn size={17} /> }))
  const selectableNodes = [...nodes, ...parentNodes, ...consumerNodes, { name: formula.name, detail: formula.expression, icon: <Code2 size={16} /> }]
  const currentNode = selectableNodes.find((node) => node.name === selectedNode) ?? selectableNodes[selectableNodes.length - 1]
  const lineageState = formulaData?.group?.lineage_state || group?.state || '—'
  return (
    <div className="formula-screen formula-lineage-screen">
      <div className="formula-lineage-topbar">
        <button className="formula-lineage-breadcrumb" onClick={onBack}><b>{group?.modelName || 'Model'}</b><ChevronRight size={13} />{group?.modelVersion || '—'}<ChevronRight size={13} />{group?.name || 'Formula group'}<ChevronRight size={13} />{formula.name}</button>
        <div className="formula-lineage-user"><span className="formula-notification">♧<i /></span><b>{group?.initials || '—'}</b><span>{group?.owner || 'Unknown owner'}<small>Model owner</small></span><ChevronDown size={13} /></div>
      </div>
      <div className="formula-screen-heading">
        <div><span className="formula-screen-eyebrow">FORMULAS</span><h2>Dependencies for {formula.name}</h2><p>Explore the registered input dependencies and downstream formulas for this model-version formula.</p></div>
        <label className="formula-lineage-search"><Search size={15} /><input aria-label="Search lineage" placeholder="Search" /></label>
      </div>
      <section className="formula-lineage-stats">
        <LineageStat icon={<GitBranch size={19} />} value={parentNodes.length} label="Formula groups" detail={lineageState} />
        <LineageStat icon={<Layers size={19} />} value={formula.inputs.length + formula.formulaDependencies.length} label="Dependencies" detail="From formula detail API" />
        <LineageStat icon={<Pencil size={19} />} value={formula.formulaDependencies.length} label="Formula inputs" detail={`${formula.inputs.length} data inputs`} />
        <LineageStat icon={<Boxes size={19} />} value={consumerNodes.length} label="Downstream formulas" detail="Direct registered references" />
      </section>
      <div className="formula-lineage-layout">
        <main className="formula-lineage-main">
          <section className="formula-screen-card formula-lineage-canvas">
            <div className="formula-lineage-canvas-heading"><div><h3>Formula dependency map</h3><span>{selectableNodes.length} nodes</span></div><div className="formula-lineage-map-tools"><button onClick={() => setExpanded(!expanded)}><GitBranch size={14} />{expanded ? 'Expanded' : 'Compact'}<ChevronDown size={13} /></button><span className="formula-lineage-legend"><i className="legend-inherited" />Inputs<i className="legend-override" />Formula<i className="legend-selected" />Selected</span></div></div>
            <div className={`formula-lineage-graph ${expanded ? '' : 'formula-lineage-graph-compact'}`}>
              <svg className="formula-lineage-connectors" viewBox="0 0 1000 450" preserveAspectRatio="none" aria-hidden="true">
                <g>
                  <path d="M500 55 V92 H290 V120 M500 92 V120 M500 92 H710 V120" />
                  <path d="M290 158 V205 H100 V235 M290 205 H300 V235 M500 158 V235 M710 158 V205 H700 V235 M710 205 H900 V235" />
                  <path d="M500 273 V330 H300 V360 M500 330 V360 M500 330 H700 V360" />
                </g>
              </svg>
              <button className="formula-map-node formula-map-node-root" onClick={() => setSelectedNode(formula.name)}><span><Code2 size={15} /></span><b>{formula.name}<small>{formula.status} · {formula.outputVariable}</small></b></button>
              <div className="formula-map-parent-row">{parentNodes.map((node) => <button className="formula-map-node formula-map-node-parent" key={node.name} onClick={() => setSelectedNode(node.name)}><span>{node.icon}</span><b>{node.name}<small>{node.detail}</small></b></button>)}</div>
              <div className="formula-map-block-row">{nodes.map((node) => <button className={`formula-map-node formula-map-node-${node.kind} ${selectedNode === node.name ? 'formula-map-node-current' : ''}`} key={node.name} onClick={() => setSelectedNode(node.name)}><span>{node.icon}</span><b>{node.name}<small>{node.detail}</small></b></button>)}</div>
              <div className="formula-map-consumer-row">{consumerNodes.map((node) => <button className="formula-map-node formula-map-node-consumer" key={node.name} onClick={() => setSelectedNode(node.name)}><span>{node.icon}</span><b>{node.name}<small>{node.detail}</small></b></button>)}</div>
            </div>
          </section>
          <section className="formula-screen-card formula-path-panel"><div className="formula-screen-card-heading"><div><h3>Registered dependency path <small>current formula</small></h3></div><span>{formulaData?.dependents?.length ?? 0} downstream</span></div><div className="formula-path-nodes"><button onClick={() => setSelectedNode(group?.name || formula.name)}><GitBranch size={16} />{group?.name || 'Formula group'}<small>{lineageState}</small></button><ChevronRight size={16} /><button className="formula-path-selected" onClick={() => setSelectedNode(formula.name)}><Code2 size={16} />{formula.name}<small>Formula · {formula.version}</small></button>{formula.dependents.slice(0, 1).map(([name, detail]) => <><ChevronRight key={`arrow-${name}`} size={16} /><button key={name} onClick={() => setSelectedNode(name)}><ChartNoAxesColumn size={16} />{name}<small>{detail}</small></button></>)}</div><p className="formula-lineage-note"><Info size={14} />Dependency and downstream references come from this formula&apos;s registered model-version definition.</p></section>
        </main>
        <aside className="formula-screen-card formula-lineage-inspector">
          <div className="formula-lineage-inspector-title"><span className="formula-lineage-node-icon">{currentNode?.icon}</span><div><h3>{currentNode?.name}</h3><small>{group?.modelName} / {group?.modelVersion}</small></div><span className="formula-private"><LockKeyhole size={11} />{lineageState}</span></div>
          <div className="formula-lineage-inspector-body">
            <h4>FORMULA DETAILS</h4>
            <LineageDetail label="Owner" value={group?.owner || '—'} />
            <LineageDetail label="Source model" value={`${group?.modelName || '—'} ${group?.modelVersion || ''}`} />
            <LineageDetail label="Group status" value={lineageState} />
            <LineageDetail label="Formula status" value={formula.status} />
            <LineageDetail label="Unit" value={formula.unit} />
            <h4>DEFINITION</h4><code className="formula-lineage-expression">{formula.expression}</code>
            {error && <p>{error.message}</p>}
            {loading && <p>Loading dependency details…</p>}
            <div className="formula-lineage-impact"><GitBranch size={15} /><span><b>Registered references</b><small>{formula.dependents.length} direct downstream formulas · {formula.inputs.length + formula.formulaDependencies.length} direct inputs</small></span></div>
            <h4>DEPENDENCIES</h4>
            {formula.inputs.map(([name, detail]) => <LineageDetail key={name} label={name} value={detail} />)}
            {formula.formulaDependencies.map(([name, detail]) => <LineageDetail key={name} label={name} value={detail} />)}
          </div>
          <button className="formula-lineage-button" onClick={() => onNotify('The backend does not expose cross-model inheritance comparisons.') }><GitBranch size={15} />Compare inheritance<ArrowRight size={14} /></button>
        </aside>
      </div>
      <span className="formula-lineage-disclaimer">Dependency data supplied by the backend formula registry.</span>
    </div>
  )
}

function LineageStat({ icon, value, label, detail }) {
  return <article><span>{icon}</span><div><b>{value}</b><strong>{label}</strong><small>{detail}</small></div></article>
}

function LineageDetail({ label, value }) {
  return <p className="formula-lineage-detail"><span>{label}</span><b>{value}</b></p>
}
