import { useMemo, useState } from 'react'
import {
  ArrowDownUp,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  GitBranch,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Workflow,
  X,
} from 'lucide-react'
import './formula-library.css'

const formulaGroups = [
  {
    name: 'Universal Reserve Logic',
    description: 'Statutory reserve calculations and roll-forward',
    owner: 'Andrew Johnson',
    initials: 'AJ',
    version: 'v4.6',
    usage: '8 models · 14 blocks',
    dependencies: '3 groups',
    tests: '148 / 148',
    state: 'Released',
    releaseDate: '2026-05-12',
    origin: 'Enterprise Reserve Standards',
    changeId: 'APP-4808',
    usedBy: ['FIA VM-21 Stochastic', 'MYGA Reserve', 'RILA Embedded Value'],
  },
  {
    name: 'Mortality',
    description: 'Base tables, improvement scales, and selection factors',
    owner: 'Emily Chen',
    initials: 'EC',
    version: 'v3.2',
    usage: '11 models · 22 blocks',
    dependencies: '2 groups',
    tests: '96 / 96',
    state: 'Released',
    releaseDate: '2026-04-28',
    origin: 'Core Assumption Library',
    changeId: 'APP-4782',
    usedBy: ['MYGA Reserve', 'FIA VM-21 Stochastic'],
  },
  {
    name: 'Policy Behavior',
    description: 'Lapse, withdrawal, utilization, and premium behavior',
    owner: 'Sarah Williams',
    initials: 'SW',
    version: 'v5.1',
    usage: '9 models · 18 blocks',
    dependencies: '4 groups',
    tests: '121 / 124',
    state: 'Candidate',
    releaseDate: '2026-05-09',
    origin: 'Policy Behavior Working Group',
    changeId: 'APP-4801',
    usedBy: ['MYGA Reserve', 'RILA Embedded Value'],
  },
  {
    name: 'MRB',
    description: 'Market risk benefit attribution and measurement',
    owner: 'Michael Patel',
    initials: 'MP',
    version: 'v2.4',
    usage: '4 models · 7 blocks',
    dependencies: '5 groups',
    tests: '82 / 82',
    state: 'Released',
    releaseDate: '2026-03-17',
    origin: 'Market Risk Benefits',
    changeId: 'APP-4710',
    usedBy: ['RILA Embedded Value'],
  },
  {
    name: 'Tax Logic',
    description: 'Tax reserve, DAC, and deferred tax treatments',
    owner: 'Daniel Kim',
    initials: 'DK',
    version: 'v2.8',
    usage: '7 models · 13 blocks',
    dependencies: '3 groups',
    tests: '74 / 76',
    state: 'In review',
    releaseDate: '2026-05-07',
    origin: 'Tax Standards Committee',
    changeId: 'APP-4795',
    usedBy: ['FIA VM-21 Stochastic', 'MYGA Reserve'],
  },
]

const releaseFilters = [
  { label: 'All', count: 5 },
  { label: 'Released', count: 3 },
  { label: 'Candidate', count: 1 },
  { label: 'In review', count: 1 },
]

export function FormulaLibrary({ query, onNotify }) {
  const [releaseFilter, setReleaseFilter] = useState('All')
  const [ownerFilter, setOwnerFilter] = useState('All owners')
  const [usageFilter, setUsageFilter] = useState('Any usage')
  const [selectedName, setSelectedName] = useState('Universal Reserve Logic')
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [sortNewestFirst, setSortNewestFirst] = useState(true)

  const visibleGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return formulaGroups
      .filter((group) => {
        const matchesRelease = releaseFilter === 'All' || group.state === releaseFilter
        const matchesOwner = ownerFilter === 'All owners' || group.owner === ownerFilter
        const matchesUsage = usageFilter === 'Any usage' || group.usedBy.some((model) => model.includes(usageFilter))
        const searchable = `${group.name} ${group.description} ${group.owner} ${group.version} ${group.usedBy.join(' ')}`.toLowerCase()

        return matchesRelease && matchesOwner && matchesUsage && searchable.includes(normalizedQuery)
      })
      .sort((first, second) => {
        const result = new Date(second.releaseDate) - new Date(first.releaseDate)
        return sortNewestFirst ? result : -result
      })
  }, [ownerFilter, query, releaseFilter, sortNewestFirst, usageFilter])

  const selectedGroup = formulaGroups.find((group) => group.name === selectedName) ?? formulaGroups[0]

  return (
    <div className="formula-library-page flex flex-col gap-4">
      <div className="formula-library-create-row flex justify-end">
        <button className="formula-create-top-button" onClick={() => setNewGroupOpen(true)}><Plus size={19} />Create formula group</button>
      </div>
      <section className="formula-summary-grid grid grid-cols-[1.5fr_repeat(3,minmax(0,1fr))] gap-3 max-[1050px]:grid-cols-2 max-[580px]:grid-cols-1">
        <FormulaSummary dark icon={<Workflow size={27} />} label="Reusable bundles" value="5" detail="45 model usages · 74 block usages" />
        <FormulaSummary icon={<GitBranch size={26} />} label="Version releases" value="17" detail="12 current · 5 retained" />
        <FormulaSummary icon={<ShieldCheck size={26} />} label="Tests passing" value="97.8%" detail="521 of 526 automated tests" />
        <FormulaSummary icon={<Check size={27} />} label="Released this quarter" value="3" detail="All change-controlled" />
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
          <FormulaSelect value={ownerFilter} onChange={setOwnerFilter} options={['All owners', 'Andrew Johnson', 'Emily Chen', 'Sarah Williams', 'Michael Patel', 'Daniel Kim']} />
          <FormulaSelect value={usageFilter} onChange={setUsageFilter} options={['Any usage', 'SecurePath FIA', 'MYGA Reserve', 'FIA VM-21 Stochastic']} />
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
              onInspect={() => setSelectedName(group.name)}
              onMore={() => onNotify(`${group.name} actions opened`)}
            />
          ))}
          {visibleGroups.length === 0 && <p className="formula-empty-state">No formula groups match these filters.</p>}
        </div>
      </section>

      <section className="formula-details-grid grid grid-cols-[minmax(0,1.4fr)_minmax(330px,0.9fr)] gap-3 max-[900px]:grid-cols-1">
        <SelectedFormula group={selectedGroup} onCreate={() => setNewGroupOpen(true)} onNotify={onNotify} />
        <FormulaDependencies group={selectedGroup} onNotify={onNotify} />
      </section>

      {newGroupOpen && <CreateFormulaDialog onClose={() => setNewGroupOpen(false)} onSave={(name) => { setNewGroupOpen(false); onNotify(`${name} created as a draft`) }} />}
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

function SelectedFormula({ group, onCreate, onNotify }) {
  return (
    <article className="formula-detail-card rounded-[12px] bg-white p-5">
      <div className="formula-detail-title-row">
        <div><h2>{group.name}</h2><p>{group.description}, and result mappings.</p></div>
        <span className={`formula-release-state formula-state-${group.state.toLowerCase().replace(' ', '-')}`}><i />{group.state}</span>
      </div>
      <div className="formula-detail-meta">
        <span><small>Owner</small><b>{group.owner}</b></span>
        <span><small>Created from</small><b>{group.origin}</b></span>
        <span><small>Released</small><b>May 12, 2026</b></span>
        <span><small>Change control</small><b>{group.changeId}</b></span>
      </div>
      <div className="formula-used-by"><small>Used by</small>{group.usedBy.map((model) => <span key={model}>{model}</span>)}</div>
      <div className="formula-detail-actions">
        <button className="formula-create-button" onClick={onCreate}><Search size={17} />Inspect group</button>
        <button className="formula-history-button" onClick={() => onNotify(`${group.name} version history opened`)}><Clock3 size={17} />Open version history</button>
      </div>
    </article>
  )
}

function FormulaDependencies({ group, onNotify }) {
  return (
    <article className="formula-dependencies-card rounded-[12px] bg-white p-5">
      <h2>Dependencies &amp; tests</h2>
      <div className="formula-dependency-chips">{group.usedBy.map((model) => <span key={model}>{model}</span>)}</div>
      <div className="formula-test-metrics">
        <span><small>Unit tests</small><b>104 / 104</b></span>
        <span><small>Integration</small><b>32 / 32</b></span>
        <span><small>Regression</small><b>12 / 12</b></span>
      </div>
      <div className="formula-tests-passed"><Check size={16} />All tests passed · May 12, 2026 10:31 AM</div>
      <button className="sr-only" onClick={() => onNotify(`${group.name} tests opened`)}>Open tests</button>
    </article>
  )
}

function CreateFormulaDialog({ onClose, onSave }) {
  const [name, setName] = useState('')
  return (
    <div className="formula-modal-backdrop" onClick={onClose}>
      <section aria-labelledby="create-formula-title" aria-modal="true" className="formula-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="flex items-start justify-between gap-4"><div><span className="formula-modal-eyebrow">New reusable logic</span><h2 id="create-formula-title">Create formula group</h2></div><button aria-label="Close dialog" className="formula-modal-close" onClick={onClose}><X size={18} /></button></div>
        <label>Group name<input autoFocus onChange={(event) => setName(event.target.value)} placeholder="e.g. Annuity benefit logic" value={name} /></label>
        <label>Description<textarea placeholder="Describe the calculations and intended use." rows="3" /></label>
        <div className="formula-modal-actions"><button onClick={onClose}>Cancel</button><button disabled={!name.trim()} onClick={() => onSave(name.trim())}><Plus size={16} />Create draft</button></div>
      </section>
    </div>
  )
}