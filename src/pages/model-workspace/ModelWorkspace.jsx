import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Database,
  Folder,
  FunctionSquare,
  GitCompareArrows,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react'
import { useApp } from '../../context/useApp'
import './model-workspace.css'

const hierarchy = [
  { id: 'model', name: 'MYGA Reserve Model', type: 'Model', source: 'v3.2', status: 'Validated', depth: 0, icon: 'model', parent: null },
  { id: 'myga', name: 'MYGA', type: 'Domain', source: 'Inherited', depth: 1, icon: 'folder', parent: 'model' },
  { id: 'gaap', name: 'GAAP', type: 'Basis', source: 'Inherited', depth: 2, icon: 'folder', parent: 'myga' },
  { id: 'base', name: 'Base', type: 'Profile', source: 'Inherited', depth: 3, icon: 'model', parent: 'gaap' },
  { id: 'formula-groups', name: 'Formula Groups', type: 'Folder', source: 'Inherited', depth: 3, icon: 'folder', parent: 'gaap' },
  { id: 'reserve-calculation', name: 'Reserve Calculation', type: 'Formula Group', source: 'Inherited', depth: 4, icon: 'folder', parent: 'formula-groups' },
  { id: 'gaap-reserve-logic', name: 'GAAP Reserve Logic', type: 'Formula', source: 'v4.1', status: 'Inherited', depth: 5, icon: 'formula', parent: 'reserve-calculation' },
  { id: 'reserve-roll-forward', name: 'Reserve Roll Forward', type: 'Formula', source: 'v3.6', status: 'Shared', depth: 5, icon: 'formula', parent: 'reserve-calculation' },
  { id: 'interest-accrual', name: 'Interest Accrual', type: 'Formula', source: 'v3.4', status: 'Shared', depth: 5, icon: 'formula', parent: 'reserve-calculation' },
  { id: 'policy-behavior', name: 'Policy Behavior', type: 'Formula Group', source: 'Inherited', depth: 4, icon: 'folder', parent: 'formula-groups', expandable: true },
  { id: 'mortality-lapse', name: 'Mortality & Lapse', type: 'Formula Group', source: 'Shared', depth: 4, icon: 'folder', parent: 'formula-groups', expandable: true },
  { id: 'published-outputs', name: 'Published Outputs', type: 'Output Set', source: 'v2.1', status: 'Local', depth: 3, icon: 'output', parent: 'gaap', expandable: true },
]

const visibleByDefault = new Set(['model', 'myga', 'gaap', 'formula-groups', 'reserve-calculation'])

function ObjectIcon({ kind }) {
  if (kind === 'folder') return <Folder className="mw-tree-icon mw-folder-icon" size={23} />
  if (kind === 'formula') return <FunctionSquare className="mw-tree-icon mw-formula-icon" size={23} />
  if (kind === 'output') return <BarChart3 className="mw-tree-icon mw-output-icon" size={23} />
  return <Box className="mw-tree-icon mw-model-icon" size={23} />
}

function TreeRow({ item, selected, expanded, hasChildren, onToggle, onSelect, onMore }) {
  return (
    <div className={`mw-tree-row ${selected ? 'mw-tree-row-selected' : ''}`} role="row">
      <button
        className="mw-tree-name"
        style={{ '--tree-depth': item.depth }}
        onClick={() => hasChildren ? onToggle(item.id) : onSelect(item.id)}
        aria-expanded={hasChildren ? expanded : undefined}
        aria-label={hasChildren ? `${expanded ? 'Collapse' : 'Expand'} ${item.name}` : `Select ${item.name}`}
      >
        <span className="mw-tree-indent" />
        {hasChildren ? expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} /> : <span className="mw-tree-spacer" />}
        <ObjectIcon kind={item.icon} />
        <span className="mw-tree-label">{item.name}</span>
      </button>
      <span className="mw-tree-type">{item.type}</span>
      <span className="mw-tree-source">{item.source}</span>
      <span className="mw-tree-state">
        {item.status && <span className={`mw-status-pill mw-status-${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</span>}
      </span>
      {selected ? <button className="mw-row-more" aria-label={`More actions for ${item.name}`} onClick={() => onMore(item.name)}><MoreVertical size={19} /></button> : <span className="mw-tree-end" />}
    </div>
  )
}

export function ModelWorkspace({ model, onNotify, onCreateProjection }) {
  const { openInvestigation } = useApp()
  const [selectedId, setSelectedId] = useState('gaap-reserve-logic')
  const [activeTab, setActiveTab] = useState('Overview')
  const [query, setQuery] = useState('')
  const [objectType, setObjectType] = useState('All object types')
  const [expanded, setExpanded] = useState(visibleByDefault)

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return hierarchy.filter(item => {
      const ancestors = []
      let parentId = item.parent
      while (parentId) {
        ancestors.push(parentId)
        parentId = hierarchy.find(parent => parent.id === parentId)?.parent
      }
      const isExpanded = ancestors.every(id => expanded.has(id))
      const matchesSearch = !normalized || `${item.name} ${item.type} ${item.source}`.toLowerCase().includes(normalized)
      const matchesType = objectType === 'All object types' || item.type === objectType
      return isExpanded && matchesSearch && matchesType
    })
  }, [expanded, objectType, query])

  const toggleExpanded = id => setExpanded(current => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const selected = hierarchy.find(item => item.id === selectedId) ?? hierarchy[6]
  const runIntent = kind => openInvestigation({ kind, metric: 'net_reserve', runId: 'JR-20261231-001' })
  const owner = model.owner || 'Andrew Johnson'
  const modelVersion = model.version || 'v3.2'

  return (
    <div className="model-workspace">
      <div className="mw-layout">
        <div className="mw-main-column">
          <section className="mw-card mw-hierarchy-card" aria-labelledby="mw-hierarchy-title">
            <div className="mw-card-heading">
              <h2 id="mw-hierarchy-title">Model hierarchy</h2>
              <div className="mw-hierarchy-tools">
                <label className="mw-type-select">
                  <span className="sr-only">Filter object type</span>
                  <select value={objectType} onChange={event => setObjectType(event.target.value)}>
                    <option>All object types</option>
                    {['Model', 'Domain', 'Basis', 'Profile', 'Folder', 'Formula Group', 'Formula', 'Output Set'].map(type => <option key={type}>{type}</option>)}
                  </select>
                  <ChevronDown size={17} aria-hidden="true" />
                </label>
                <button className="mw-icon-action" aria-label="More hierarchy options" onClick={() => onNotify('Model hierarchy options opened')}><MoreVertical size={19} /></button>
              </div>
            </div>
            <label className="mw-tree-search">
              <Search size={20} />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search model objects..." />
            </label>
            <div className="mw-tree-table" role="table" aria-label="Model hierarchy">
              <div className="mw-tree-header" role="row"><span>Name</span><span>Type</span><span>Source</span><span /><span /></div>
              <div role="rowgroup">
                {visibleItems.map(item => (
                  <TreeRow
                    key={item.id}
                    item={item.id === 'model' ? { ...item, name: model.name } : item}
                    selected={selectedId === item.id}
                    expanded={expanded.has(item.id)}
                    hasChildren={hierarchy.some(child => child.parent === item.id) || item.expandable}
                    onToggle={toggleExpanded}
                    onSelect={setSelectedId}
                    onMore={name => onNotify(`${name} options opened`)}
                  />
                ))}
                {visibleItems.length === 0 && <div className="mw-tree-empty">No model objects match your search and filters.</div>}
              </div>
            </div>
          </section>

          <section className="mw-card mw-object-card" aria-label={`Selected object: ${selected.name}`}>
            <div className="mw-object-heading">
              <span className="mw-object-symbol"><FunctionSquare size={31} /></span>
              <h2>Selected object: {selected.name}</h2>
            </div>
            <div className="mw-detail-tabs" role="tablist" aria-label="Selected object details">
              {['Overview', 'Dependencies', 'Consumers', 'History'].map(tab => (
                <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'mw-detail-tab-active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>
              ))}
            </div>
            {activeTab === 'Overview' ? (
              <div className="mw-overview-content">
                <div className="mw-description">
                  <h3>Description</h3>
                  <p>Core GAAP reserve calculation logic for MYGA products under the base assumptions. Implements net premium reserve methodology with quarterly projection and statutory-to-GAAP adjustments.</p>
                </div>
                <div className="mw-object-metadata">
                  <dl><dt>Type</dt><dd>{selected.type}</dd><dt>Source</dt><dd>Formula Group / v4.1</dd><dt>Status</dt><dd><span className="mw-status-pill mw-status-inherited">Inherited</span></dd></dl>
                  <h3>Dependencies (3)</h3>
                  <div className="mw-dependency-list">
                    {['Mortality Table', 'Policy Cash Flow', 'Discount Curve'].map(name => <button key={name} onClick={() => onNotify(`${name} dependency selected`)}><Database size={18} />{name}</button>)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mw-tab-content">
                {activeTab === 'Dependencies' && <><h3>Dependencies (3)</h3><div className="mw-dependency-list">{['Mortality Table', 'Policy Cash Flow', 'Discount Curve'].map(name => <button key={name} onClick={() => onNotify(`${name} dependency selected`)}><Database size={18} />{name}</button>)}</div></>}
                {activeTab === 'Consumers' && <><h3>Consumers</h3><p>GAAP Reserve · Net Cash Flows · Pre-Tax Earnings</p></>}
                {activeTab === 'History' && <><h3>History</h3><p>v4.1 · Inherited from Formula Group · Last updated May 12, 2025</p></>}
              </div>
            )}
            <div className="mw-object-actions">
              <button onClick={() => runIntent('trace')}><ClipboardCheck size={18} />Trace</button>
              <button onClick={() => runIntent('compare')}><GitCompareArrows size={18} />Compare source</button>
              <button onClick={() => runIntent('scratchpad')}><Plus size={20} />Add to Scratchpad</button>
              <button onClick={() => runIntent('mentor')}><Sparkles size={18} />Ask Mentor</button>
            </div>
          </section>
        </div>

        <aside className="mw-side-column">
          <section className="mw-card mw-overview-card">
            <h2>Model overview</h2>
            <dl className="mw-model-facts">
              <dt>Version</dt><dd><span className="mw-status-pill mw-status-inherited">{modelVersion}</span></dd>
              <dt>Owner</dt><dd><span className="mw-owner-avatar" />{owner}</dd>
              <dt>Status</dt><dd className="mw-validated"><i />Validated</dd>
              <dt>Last updated</dt><dd>{model.updated || 'May 12, 2025'}<small>{model.time || '10:42 AM'}</small></dd>
            </dl>
          </section>

          <section className="mw-card mw-readiness-card">
            <div className="mw-prerequisites-heading">
              <div><h2>Projection prerequisites</h2><p>Review these before creating a Projection Set.</p></div>
              <span>Preflight</span>
            </div>
            <ul className="mw-prerequisite-list">
              <Prerequisite state="review" title="Runnable model version" detail="Confirm formulas are runnable and required variables are defined." />
              <Prerequisite state="review" title="Validated inforce file" detail="Fingerprint verified and required columns mapped." />
              <Prerequisite state="warning" title="Assumption and factor tables" detail="Select required tables and pin each by ID. Factor Tables needs review." />
              <Prerequisite state="ready" title="Compatible scenario" detail="Base scenario is available; confirm compatibility for this model." />
              <Prerequisite state="ready" title="Published output" detail="3 outputs are published by this model." />
              <Prerequisite state="review" title="Monthly horizon" detail="Choose a supported monthly projection horizon." />
              <Prerequisite state="optional" title="Trace scope (optional)" detail="Trace capture is capped. No trace scope selected will show a warning." />
            </ul>
          </section>

          <section className="mw-card mw-outputs-card">
            <div className="mw-outputs-heading"><h2>Published outputs</h2><button onClick={() => onNotify('3 published outputs')}>3 outputs</button></div>
            <div className="mw-output-table">
              <div className="mw-output-header"><span>Name</span><span>Consumers</span><span /></div>
              {[
                ['GAAP Reserve', '3 consumers'],
                ['Net Cash Flows', '2 consumers'],
                ['Pre-Tax Earnings', '3 consumers'],
              ].map(([name, consumers]) => <div className="mw-output-row" key={name}><Box size={22} /><span>{name}</span><small>{consumers}</small><button aria-label={`More options for ${name}`} onClick={() => onNotify(`${name} output options opened`)}><MoreVertical size={17} /></button></div>)}
            </div>
            <button className="mw-view-outputs" onClick={() => onNotify('All published outputs opened')}>View all outputs <ArrowRight size={17} /></button>
          </section>
        </aside>
      </div>

      <section className="mw-ready-banner mw-preflight-banner">
        <span className="mw-banner-check"><Check size={22} /></span>
        <div><strong>Projection setup requires preflight checks</strong><span>Confirm runnable formulas, mapped inforce data, pinned tables, scenario compatibility, and a monthly horizon.</span></div>
        <button onClick={onCreateProjection}>Review and configure <ArrowRight size={16} /></button>
      </section>
    </div>
  )
}

function Prerequisite({ state, title, detail }) {
  const icon = state === 'ready' ? <CircleCheck size={19} /> : state === 'warning' ? <span className="mw-prerequisite-warning-icon">!</span> : state === 'optional' ? <span className="mw-prerequisite-optional-icon">i</span> : <span className="mw-prerequisite-review-icon">•</span>
  const label = state === 'ready' ? 'Available' : state === 'warning' ? 'Review' : state === 'optional' ? 'Optional' : 'Confirm'
  return <li className={`mw-prerequisite mw-prerequisite-${state}`}><span className="mw-prerequisite-icon">{icon}</span><span className="mw-prerequisite-copy"><b>{title}</b><small>{detail}</small></span><span className="mw-prerequisite-status">{label}</span></li>
}
