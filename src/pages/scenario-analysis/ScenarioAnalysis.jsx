import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  CircleCheck,
  Database,
  Download,
  FileUp,
  GitBranch,
  Layers,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Settings2,
  UsersRound,
  X,
} from 'lucide-react'
import { useApp } from '../../context/useApp'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import './scenario-analysis.css'
import './scenario-generator-library.css'

const validationChecks = [
  { title: 'Scenario status', detail: 'Read from the project scenario registry' },
  { title: 'Validation results', detail: 'Not provided by backend M1' },
  { title: 'Scenario comparison', detail: 'Available for saved scenarios' },
  { title: 'Generation and import', detail: 'Not available in backend M1' },
]

export function ScenarioAnalysis({ onNotify, onOpenProjectionSetup }) {
  const { projectId } = useWorkspace()
  const scenarioQuery = useApiQuery(projectId ? `/v1/projects/${projectId}/scenario-sets` : null, 8000)
  const scenarioSets = scenarioQuery.data?.scenario_sets ?? []
  const backendScenarios = useMemo(() => scenarioSets.flatMap(group => (group.scenarios ?? []).map(scenario => ({ ...scenario, scenario_set_name: group.name }))), [scenarioSets])
  const [view, setView] = useState('analysis')
  const [baseScenarioReturnView, setBaseScenarioReturnView] = useState('analysis')
  const [selectedScenarioId, setSelectedScenarioId] = useState('')
  const libraryGenerators = generators
  const selectedScenario = backendScenarios.find(scenario => scenario.id === selectedScenarioId)
  useEffect(() => {
    if (backendScenarios.length && !backendScenarios.some(scenario => scenario.id === selectedScenarioId)) {
      setSelectedScenarioId(backendScenarios[0].id)
    }
  }, [backendScenarios, selectedScenarioId])
  const openBaseScenario = (scenario = backendScenarios.find(item => /\bbase\b/i.test(item.name))) => {
    if (scenario?.id) setSelectedScenarioId(scenario.id)
    setBaseScenarioReturnView(view)
    setView('base')
  }
  if (view === 'base') return <BaseScenarioPage backLabel={baseScenarioReturnView === 'analysis' ? 'Scenarios / Scenario analysis' : 'Scenarios / Generator library'} onBack={() => setView(baseScenarioReturnView)} onNotify={onNotify} onAttach={onOpenProjectionSetup} scenario={selectedScenario} scenarioItems={backendScenarios} />
  if (view === 'analysis') return <ScenarioGeneratorWorkspace scenarioItems={backendScenarios} selectedScenario={selectedScenario} scenarioLoading={scenarioQuery.loading} scenarioError={scenarioQuery.error} onSelectScenario={setSelectedScenarioId} onNotify={onNotify} onOpenGeneratorLibrary={() => setView('library')} onViewBase={openBaseScenario} />
  return <ScenarioGeneratorLibrary libraryGenerators={libraryGenerators} onNotify={onNotify} onViewBase={openBaseScenario} onOpenAnalysis={() => setView('analysis')} />
}

function ScenarioGeneratorWorkspace({ scenarioItems, selectedScenario, scenarioLoading, scenarioError, onSelectScenario, onNotify, onOpenGeneratorLibrary, onViewBase }) {
  const [metric, setMetric] = useState('Interest rate (short rate)')
  const [horizon, setHorizon] = useState('20 years')
  const pathCount = selectedScenario?.path_count === undefined || selectedScenario?.path_count === null ? '—' : Number(selectedScenario.path_count).toLocaleString()
  const seed = selectedScenario?.seed ?? '—'
  const [comparisonOpen, setComparisonOpen] = useState(false)

  const downloadScenarioSet = () => {
    onNotify('Scenario-set export is not available in backend M1.')
  }

  return (
    <div className="scenario-page flex flex-col gap-4">
      <ScenarioGeneratorBanner
        horizon={selectedScenario?.horizon || '—'}
        pathCount={pathCount}
        seed={seed}
        generatorVersion={selectedScenario?.version_label || selectedScenario?.scenario_set_name || 'Scenario registry'}
        onImport={() => onNotify('Scenario import is not available in backend M1.')}
        onGenerate={() => {
          onNotify('Scenario generation is not available in backend M1. Opening the generator library instead.')
          onOpenGeneratorLibrary()
        }}
      />

      <div className="scenario-workspace grid grid-cols-[minmax(0,1fr)_minmax(290px,440px)] items-stretch gap-4 max-[1120px]:grid-cols-1">
        <main className="flex min-w-0 flex-col gap-4">
          <ScenarioBandChart
            horizon={horizon}
            metric={metric}
            onMetricChange={setMetric}
            onHorizonChange={setHorizon}
          />
          <ScenarioSetList
            scenarioItems={scenarioItems}
            selectedScenarioId={selectedScenario?.id}
            loading={scenarioLoading}
            error={scenarioError}
            onCompare={() => setComparisonOpen(true)}
            onSelect={scenario => {
              onSelectScenario(scenario.id)
              if (/\bbase\b/i.test(scenario.name)) onViewBase(scenario)
            }}
          />
        </main>

        <ValidationPanel
          selectedScenario={selectedScenario}
          horizon={horizon}
          pathCount={pathCount}
          seed={seed}
          onDownload={downloadScenarioSet}
          onNotify={onNotify}
        />
      </div>

      {comparisonOpen && (
        <ScenarioComparison
          scenarioItems={scenarioItems}
          onClose={() => setComparisonOpen(false)}
        />
      )}
    </div>
  )
}

function ScenarioGeneratorBanner({ horizon, pathCount, seed, generatorVersion, onImport, onGenerate }) {
  return (
    <section className="scenario-generator-banner grid grid-cols-[minmax(0,1fr)_minmax(480px,750px)] items-center gap-8 rounded-[12px] px-7 py-6 max-[1120px]:grid-cols-1 max-[1120px]:gap-5 max-[600px]:px-4 max-[600px]:py-5">
      <div className="flex min-w-0 items-center gap-5 max-[600px]:items-start">
        <span className="scenario-generator-icon"><Activity size={36} /></span>
        <div className="min-w-0">
          <h2>Scenario Generator</h2>
          <span className="scenario-generator-version">{generatorVersion}</span>
          <p>Backend M1 supports saved scenario retrieval and comparison. Scenario generation and import are not available yet.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3 max-[480px]:grid-cols-1">
          <GeneratorStat icon={<CopyIcon />} value={pathCount} label="Paths" />
          <GeneratorStat icon={<CalendarDays size={23} />} value={horizon} label="Horizon" />
          <GeneratorStat icon={<GitBranch size={23} />} value={seed} label="Random seed" />
        </div>
        <div className="grid grid-cols-[1fr_1.1fr] gap-3 max-[480px]:grid-cols-1">
          <button className="scenario-generate-button" onClick={onGenerate}>
            <Activity size={20} />Generate scenarios
          </button>
          <button className="scenario-import-button" onClick={onImport}>
            <FileUp size={20} />Import scenario
          </button>
        </div>
      </div>
    </section>
  )
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="23" viewBox="0 0 24 24" width="23">
      <rect height="14" rx="2" stroke="currentColor" strokeWidth="2" width="14" x="7" y="7" />
      <path d="M4 15V5a1 1 0 0 1 1-1h10" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function GeneratorStat({ icon, value, label }) {
  return (
    <div className="generator-stat flex min-h-[76px] items-center gap-3 rounded-[12px] border bg-white px-3.5 py-2.5">
      <span>{icon}</span>
      <div className="min-w-0">
        <b>{value}</b>
        <small>{label}</small>
      </div>
    </div>
  )
}

function ScenarioBandChart({ horizon, metric, onMetricChange, onHorizonChange }) {
  const isLapse = metric === 'Lapse rate'
  const upperBand = isLapse
    ? '0,236 110,211 220,180 330,150 440,122 550,98 660,78 770,58 880,40 1000,18'
    : '0,236 110,199 220,164 330,132 440,104 550,78 660,56 770,37 880,19 1000,0'
  const lowerBand = isLapse
    ? '0,280 110,272 220,259 330,246 440,232 550,218 660,204 770,194 880,185 1000,178'
    : '0,292 110,290 220,288 330,286 440,283 550,281 660,280 770,284 880,291 1000,298'
  const medianLine = isLapse
    ? '0,260 110,246 220,228 330,210 440,193 550,177 660,164 770,151 880,138 1000,123'
    : '0,274 110,264 220,253 330,242 440,231 550,220 660,211 770,203 880,194 1000,184'

  return (
    <section className="scenario-panel scenario-analysis-card rounded-[12px] bg-white p-5 max-[600px]:p-3.5">
      <div className="scenario-chart-heading flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="scenario-section-label">Scenario analysis</span>
          <h2>Illustrative interest rate and lapse rate scenario bands</h2>
        </div>
        <label className="scenario-horizon-select">
          <span className="sr-only">Scenario horizon</span>
          <select value={horizon} onChange={(event) => onHorizonChange(event.target.value)}>
            <option>10 years</option>
            <option>20 years</option>
            <option>30 years</option>
          </select>
          <ChevronDown size={16} />
        </label>
      </div>

      <div className="scenario-chart-controls flex flex-wrap items-center gap-3">
        <div className="scenario-metric-switch" role="tablist" aria-label="Scenario metric">
          {['Interest rate (short rate)', 'Lapse rate'].map((option) => (
            <button
              aria-selected={metric === option}
              className={metric === option ? 'scenario-metric-active' : ''}
              key={option}
              onClick={() => onMetricChange(option)}
              role="tab"
            >
              {option}
            </button>
          ))}
        </div>
        <BandLegend />
      </div>

      <div className="scenario-chart-wrap">
        <div className="scenario-y-axis" aria-hidden="true">
          {(isLapse ? ['30%', '24%', '18%', '12%', '6%', '0%'] : ['10%', '8%', '6%', '4%', '2%', '0%']).map((label) => <span key={label}>{label}</span>)}
        </div>
        <div className="scenario-svg-container">
          <svg
            aria-label={`${metric} projection probability bands over ${horizon}`}
            className="scenario-chart-svg"
            preserveAspectRatio="none"
            role="img"
            viewBox="0 0 1000 310"
          >
            {[0, 62, 124, 186, 248, 310].map((y) => <line className="scenario-chart-gridline" key={`h${y}`} x1="0" x2="1000" y1={y} y2={y} />)}
            {[0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((x) => <line className="scenario-chart-gridline" key={`v${x}`} x1={x} x2={x} y1="0" y2="310" />)}
            <polygon className="scenario-band-outer" points={`${upperBand} ${lowerBand.split(' ').reverse().join(' ')}`} />
            <polygon className="scenario-band-inner" points={`${isLapse ? '0,252 110,231 220,206 330,179 440,155 550,133 660,113 770,95 880,78 1000,62' : '0,279 110,268 220,252 330,235 440,216 550,198 660,180 770,163 880,147 1000,132'} ${isLapse ? '0,270 110,262 220,249 330,233 440,218 550,202 660,187 770,173 880,159 1000,146' : '0,289 110,286 220,281 330,276 440,271 550,266 660,263 770,264 880,269 1000,278'}`} />
            <polyline className="scenario-median-line" points={medianLine} />
            <line className="scenario-base-line" x1="0" x2="1000" y1="260" y2="260" />
          </svg>
        </div>
        <div className="scenario-x-axis" aria-hidden="true">
          {['2026', '2028', '2030', '2032', '2034', '2036', '2038', '2040', '2042', '2044', '2046'].map((year) => <span key={year}>{year}</span>)}
        </div>
      </div>
    </section>
  )
}

function BandLegend() {
  return (
    <div className="scenario-chart-legend">
      <span><i className="legend-range-wide" />5–95%</span>
      <span><i className="legend-range-mid" />25–75%</span>
      <span><i className="legend-median" />Median</span>
      <span><i className="legend-base" />Base scenario</span>
    </div>
  )
}

function ScenarioSetList({ scenarioItems, selectedScenarioId, loading, error, onSelect, onCompare }) {
  const cards = scenarioItems.map(item => ({
    ...item,
    subtitle: item.version_label || item.scenario_set_name || 'Saved scenario',
    description: item.description || 'No description recorded.',
    type: item.scenario_type || item.status || 'Scenario',
    paths: item.path_count === undefined || item.path_count === null ? '—' : Number(item.path_count).toLocaleString(),
    horizon: item.horizon || '—',
    seed: item.seed ?? '—',
  }))
  return (
    <section className="scenario-panel scenario-sets-panel rounded-[12px] bg-white p-4">
      <h2 className="scenario-section-label">Scenario sets</h2>
      {loading && <p>Loading saved scenarios…</p>}
      {error && <p>Could not load saved scenarios: {error.message}</p>}
      {!loading && !error && cards.length === 0 && <p>No saved scenarios are available for this project. Backend M1 does not support scenario creation.</p>}
      <div className="scenario-set-grid grid grid-cols-3 gap-3 max-[760px]:grid-cols-2 max-[520px]:grid-cols-1">
        {cards.map((scenario) => (
          <ScenarioSetCard
            key={scenario.id}
            scenario={scenario}
            selected={selectedScenarioId === scenario.id}
            onSelect={() => onSelect(scenario)}
          />
        ))}
      </div>
      <button className="scenario-compare-button" disabled={cards.length < 2} onClick={onCompare} title={cards.length < 2 ? 'Two saved scenarios are required for comparison.' : undefined}>
        <Activity size={19} />Compare scenarios<ArrowRight size={20} />
      </button>
    </section>
  )
}

function ScenarioSetCard({ scenario, selected, onSelect }) {
  return (
    <article className={`scenario-set-card ${selected ? 'scenario-set-card-selected' : ''}`}>
      <button className="scenario-set-select" onClick={onSelect}>
        <span className="scenario-set-icon"><Activity size={26} /></span>
        <span className="scenario-set-copy">
          <b>{scenario.name}</b>
          <small>{scenario.subtitle}</small>
          <small>{scenario.description}</small>
        </span>
        <span className={`scenario-set-tag ${selected ? 'scenario-set-tag-selected' : ''}`}>
          {selected ? 'Selected' : scenario.type}
        </span>
      </button>
      <div className="scenario-set-stats">
        <span><b>{scenario.paths}</b><small>Paths</small></span>
        <span><b>{scenario.horizon}</b><small>Horizon</small></span>
        <span><b>{scenario.seed}</b><small>Seed</small></span>
      </div>
      <button className="scenario-set-details" onClick={onSelect}>View details <ArrowRight size={17} /></button>
    </article>
  )
}

function ValidationPanel({ selectedScenario, horizon, pathCount, seed, onDownload, onNotify }) {
  const rows = validationChecks.map((check, index) => ({
    ...check,
    detail: index === 0 ? (selectedScenario?.status || 'No scenario selected') : check.detail,
  }))
  const notReported = 'Not reported by backend'
  return (
    <aside className="scenario-panel scenario-validation-panel rounded-[12px] bg-white p-5">
      <h2 className="scenario-section-label">Validation &amp; reproducibility</h2>
      <div className="scenario-validation-list">
        {rows.map((check) => (
          <button className="scenario-validation-row" key={check.title} onClick={() => onNotify(`${check.title}: ${check.detail}`)}>
            <span className="validation-check-icon"><Activity size={19} /></span>
            <span><b>{check.title}</b><small>{check.detail}</small></span>
            <ArrowRight size={18} />
          </button>
        ))}
      </div>

      <dl className="scenario-provenance-list">
        <div><dt>As of</dt><dd>{selectedScenario?.as_of_date || notReported}</dd></div>
        <div><dt>Generated by</dt><dd>{selectedScenario?.created_by || notReported}</dd></div>
        <div><dt>Model / version</dt><dd>{selectedScenario?.version_label || selectedScenario?.scenario_set_name || notReported}</dd></div>
        <div><dt>Paths</dt><dd>{selectedScenario ? pathCount : notReported}</dd></div>
        <div><dt>Horizon</dt><dd>{selectedScenario?.horizon || notReported}</dd></div>
        <div><dt>Random seed</dt><dd>{selectedScenario?.seed ?? seed}</dd></div>
      </dl>

      <button className="scenario-download-button" onClick={onDownload}>
        <Download size={18} />Download scenario set<ChevronDown size={16} />
      </button>
    </aside>
  )
}

function ScenarioComparison({ scenarioItems, onClose }) {
  const [baselineId, setBaselineId] = useState(scenarioItems[0]?.id ?? '')
  const [compareId, setCompareId] = useState(scenarioItems[1]?.id ?? '')
  useEffect(() => {
    if (scenarioItems.length) {
      if (!scenarioItems.some(item => item.id === baselineId)) setBaselineId(scenarioItems[0].id)
      if (!scenarioItems.some(item => item.id === compareId)) setCompareId(scenarioItems[1]?.id ?? scenarioItems[0].id)
    }
  }, [scenarioItems, baselineId, compareId])
  const comparisonQuery = useApiQuery(baselineId && compareId && baselineId !== compareId
    ? `/v1/scenarios/compare?baseline_id=${encodeURIComponent(baselineId)}&compare_id=${encodeURIComponent(compareId)}`
    : null)
  const comparison = comparisonQuery.data
  return (
    <div className="scenario-modal-backdrop" onClick={onClose}>
      <section aria-labelledby="scenario-compare-title" aria-modal="true" className="scenario-settings-modal scenario-compare-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="flex items-start justify-between gap-3">
          <div><span className="scenario-section-label">Scenario comparison</span><h2 id="scenario-compare-title">Compare scenario sets</h2></div>
          <button aria-label="Close comparison" className="scenario-modal-close" onClick={onClose}><X size={19} /></button>
        </div>
        <p>Compare saved scenarios using backend input differences and completed-run results.</p>
        <label>Baseline scenario<select value={baselineId} onChange={event => setBaselineId(event.target.value)}>{scenarioItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Compare with<select value={compareId} onChange={event => setCompareId(event.target.value)}>{scenarioItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {scenarioItems.length < 2 && <p>Two saved scenarios are required for comparison.</p>}
        {baselineId === compareId && scenarioItems.length > 1 && <p>Choose two different scenarios.</p>}
        {comparisonQuery.loading && <p>Comparing scenarios…</p>}
        {comparisonQuery.error && <p>Could not compare scenarios: {comparisonQuery.error.message}</p>}
        {comparison && <>
          <p><b>{comparison.baseline?.name}</b> vs <b>{comparison.compare?.name}</b></p>
          {comparison.input_differences?.length ? comparison.input_differences.map(item => (
            <div className="scenario-comparison-row" key={item.variable}>
              <span className="scenario-set-icon"><Activity size={23} /></span>
              <span><b>{item.variable}</b><small>{item.compare?.source || 'Input difference'}</small></span>
              <strong>{item.baseline?.value ?? '—'} → {item.compare?.value ?? '—'}</strong>
              <ArrowRight size={17} />
            </div>
          )) : <p>No input differences were reported.</p>}
          {comparison.downstream?.available && <div className="scenario-comparison-row">
            <span className="scenario-set-icon"><GitBranch size={23} /></span>
            <span><b>{comparison.downstream.label}</b><small>Completed runs {comparison.downstream.baseline_run_id} and {comparison.downstream.compare_run_id}</small></span>
            <strong>{comparison.downstream.baseline_value?.toLocaleString()} → {comparison.downstream.compare_value?.toLocaleString()} ({comparison.downstream.difference_pct?.toFixed(2)}%)</strong>
            <ArrowRight size={17} />
          </div>}
          {!comparison.downstream?.available && <p>Downstream comparison is not available for these scenarios.</p>}
        </>}
      </section>
    </div>
  )
}

const generators = [
  { id: 'economic-base-v21', name: 'Economic Base v2.1', state: 'Validated', category: 'Standard economic assumptions', details: 'Baseline economic scenario consistent with industry standard assumptions. Suitable for projection and reserve analysis.', metric: 'Interest rate (short rate)', version: 'v2.1', batch: '1,000 paths', seed: '20261231', chart: 'rising' },
  { id: 'stochastic-lapse-v18', name: 'Stochastic Lapse v1.8', state: 'Needs review', category: 'Economic + lapse', details: 'Combines economic scenarios with stochastic lapse behavior. Review latest calibration before use.', metric: 'Lapse rate', version: 'v1.8', batch: '5,000 paths', seed: '20261231', chart: 'rising' },
  { id: 'rate-shock-v09', name: 'Rate Shock Pack v0.9', state: 'Draft', category: 'Sensitivity', details: 'Parallel and instantaneous rate shocks across multiple magnitudes for sensitivity analysis.', metric: 'Rate shock (bps)', version: 'v0.9', batch: '12 batches', seed: '20261231', chart: 'step' },
]

function ScenarioGeneratorLibrary({ libraryGenerators, onNotify, onViewBase, onOpenAnalysis }) {
  const [query, setQuery] = useState('')
  const filtered = libraryGenerators.filter(item => `${item.name} ${item.category} ${item.details}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <div className="sg-page">
    <div className="sg-title-row"><div><span className="sg-eyebrow">Scenarios</span><h1>Scenario Generator Library</h1><p>This retained reference catalog is not connected to backend M1, which does not expose generator management.</p></div><div className="sg-title-actions"><label className="sg-search"><Search size={17} /><input aria-label="Search scenario generators" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search" /></label><button className="sg-import-button" onClick={() => onNotify('Scenario import is not available in backend M1.')}><FileUp size={17} />Import scenario</button></div></div>
    <section className="sg-hero"><span className="sg-hero-icon"><Activity size={38} /></span><div className="sg-hero-copy"><h2>Reusable scenario generators</h2><b>Build once. Reuse across models.</b><p>Create and manage scenario generator definitions that preserve parameters, calibration, versioning, and reproducibility. Drive faster analysis with consistent, industry-aligned scenario logic.</p></div><ul><li><Layers size={19} />Consistent assumptions across analyses</li><li><Clock3 size={19} />Versioned and reproducible</li><li><ShieldCheck size={19} />Aligned with industry standards</li></ul></section>
    <div className="sg-summary-grid">
      <button onClick={() => onNotify('Showing validated scenario generators')}><span><Check size={21} /></span><b>{libraryGenerators.filter(item => item.state === 'Validated').length}</b><div><strong>Validated generators</strong><small>Ready for use in analysis</small></div><ArrowRight size={17} /></button>
      <button onClick={() => onNotify('Showing generators needing review')}><span className="sg-summary-warn"><Clock3 size={21} /></span><b>{libraryGenerators.filter(item => item.state === 'Needs review').length}</b><div><strong>Needs review</strong><small>Requires attention</small></div><ArrowRight size={17} /></button>
      <button onClick={() => onNotify('Showing draft generators')}><span className="sg-summary-draft"><Database size={21} /></span><b>{libraryGenerators.filter(item => item.state === 'Draft').length}</b><div><strong>Draft generators</strong><small>In development</small></div><ArrowRight size={17} /></button>
    </div>
    <div className="sg-content">
      <main><div className="sg-list-heading"><div><h2>Generators</h2><p>Preconfigured scenario generator definitions for the current model context.</p></div><span>Sort by <select defaultValue="Name (A–Z)"><option>Name (A–Z)</option><option>Last updated</option></select> {filtered.length} generators</span></div>
        <div className="sg-generator-grid">{filtered.map(item => <GeneratorCard key={item.id} item={item} onView={onViewBase} onNotify={onNotify} isBase={item.id === 'economic-base-v21'} />)}</div>
      </main>
      <aside className="sg-create-rail"><h2>Create new generator</h2><p>Generator creation and import are not supported by backend M1.</p><button className="sg-new-button" onClick={() => onNotify('New scenario generator creation is not available in backend M1.')}><Plus size={18} />New generator</button><h3>Start from a template</h3>{[['Economic base', 'Standard assumptions'], ['Stochastic lapse', 'Economic + lapse'], ['Rate shock', 'Sensitivity analysis'], ['Custom generator', 'Advanced configuration']].map(([name, detail], index) => <button className="sg-template" key={name} onClick={() => index === 0 ? onViewBase() : onNotify(`${name} generator creation is not available in backend M1.`)}><span>{index === 3 ? <Settings2 size={19} /> : <Activity size={19} />}</span><b>{name}<small>{detail}</small></b><ChevronRight size={17} /></button>)}<div className="sg-reuse-note"><Layers size={18} /><span>Generator configuration, versioning, and seed management are not provided by backend M1.<button onClick={onOpenAnalysis}>Open scenario analysis <ArrowRight size={14} /></button></span></div></aside>
    </div>
  </div>
}

function GeneratorCard({ item, onView, onNotify, isBase }) {
  const validated = item.state === 'Validated'
  return <article className="sg-generator-card">
    <div className="sg-generator-card-top"><span className="sg-generator-icon"><Activity size={23} /></span><span className={`sg-state sg-state-${item.state.toLowerCase().replace(' ', '-')}`}><i />{item.state}</span></div>
    <h3>{item.name}</h3><span className="sg-category">{item.category}</span><p>{item.details}</p>
    <div className="sg-chart-title">{item.metric}</div><MiniScenarioChart step={item.chart === 'step'} />
    <div className="sg-card-meta"><span>▧ Version<b>{item.version}</b></span><span>♧ Last batch<b>{item.batch}</b></span><span>⌘ Seed<b>{item.seed}</b></span></div>
    <div className="sg-card-actions"><button disabled={!validated} onClick={onView}>View details <ArrowRight size={15} /></button><button aria-label={`More actions for ${item.name}`} onClick={() => onNotify('Generator actions are not available in backend M1.')}><MoreVertical size={17} /></button></div>
    {isBase && <button className="sg-hidden-detail-link" onClick={onView}>Open Economic Base scenario</button>}
  </article>
}

function MiniScenarioChart({ step = false }) {
  return <svg className="sg-mini-chart" viewBox="0 0 300 98" preserveAspectRatio="none" role="img" aria-label="Scenario range and median preview">
    {[25, 50, 75].map(y => <line key={y} x1="0" x2="300" y1={y} y2={y} />)}
    <polygon points="0,80 50,68 100,53 150,43 200,30 250,17 300,9 300,89 250,79 200,69 150,61 100,71 50,79 0,92" />
    {step ? <polyline className="sg-step-line" points="0,87 48,87 48,75 95,75 95,62 145,62 145,49 195,49 195,36 245,36 245,22 300,22" /> : <polyline points="0,85 48,72 98,59 148,51 198,38 248,25 300,14" />}
  </svg>
}

function BaseScenarioPage({ backLabel, onBack, onNotify, onAttach, scenario, scenarioItems }) {
  const { updateProjectionInputs } = useApp()
  const [horizon, setHorizon] = useState('20 years')
  const [compare, setCompare] = useState(false)
  const scenarioName = scenario?.name || 'Base scenario'
  const notReported = 'Not reported by backend'
  const attach = () => {
    if (!scenario?.id) {
      onNotify('No saved project scenario is selected. Scenario attachment requires a scenario from the backend registry.')
      return
    }
    updateProjectionInputs(current => ({
      ...current,
      scenario: { id: scenario.id, name: scenarioName, status: scenario.status, compatible: false },
      draft: { ...current.draft, scenarioCompatible: false },
    }))
    onNotify(`${scenarioName} selected for Projection Set setup. Confirm compatibility before use.`)
    onAttach?.()
  }
  return <div className="sg-page">
    <div className="sg-title-row sg-detail-title"><div><button className="sg-back-link" onClick={onBack}>{backLabel}</button><span className="sg-eyebrow">Scenarios</span><h1>{scenarioName}</h1><p>Saved scenario details from the project registry. Backend M1 does not include generated path data.</p></div><span className="sg-validated-pill"><i />{scenario?.status || 'Not in project registry'}</span></div>
    <section className="sg-detail-hero"><span className="sg-hero-icon"><Activity size={36} /></span><div className="sg-detail-description"><h2>{scenarioName}</h2><b>Scenario set detail</b><p>{scenario?.description || 'No saved scenario details are available for this project scenario.'}</p></div><div className="sg-detail-stats">{[[scenario?.path_count?.toLocaleString?.() || '—', 'Paths', <Copy key="paths" size={18} />], [scenario?.horizon || '—', 'Horizon', <CalendarDays key="horizon" size={18} />], [scenario?.consumer_count ?? '—', 'Projection Set consumers', <UsersRound key="consumers" size={18} />], [scenario?.version_label || '—', 'Version', <Database key="version" size={18} />]].map(([value, label, icon]) => <div key={label}><span>{icon}</span><b>{value}<small>{label}</small></b></div>)}<div className="sg-detail-buttons"><button className="sg-attach-button" onClick={attach}>Attach to Projection <ArrowRight size={17} /></button><button className="sg-compare-button" onClick={() => setCompare(true)}><GitBranch size={17} />Compare scenarios</button></div></div></section>
    {compare && <ScenarioComparison scenarioItems={scenarioItems} onClose={() => setCompare(false)} />}
    <div className="sg-detail-content"><section className="sg-card sg-path-card"><div className="sg-section-heading"><div><h2>Scenario path preview</h2><p>Illustrative preview only; backend M1 does not return interest-rate, lapse, or mortality path data.</p></div><label><select value={horizon} onChange={event => setHorizon(event.target.value)}><option>10 years</option><option>20 years</option><option>30 years</option></select><ChevronDown size={15} /></label></div><div className="sg-metric-chart"><b>Interest rate (short rate)</b><LargeScenarioChart variant="rate" /></div><div className="sg-metric-chart"><b>Lapse rate</b><LargeScenarioChart variant="lapse" /></div><div className="sg-metric-chart"><b>Mortality</b><LargeScenarioChart variant="mortality" /></div><div className="sg-legend"><span><i className="sg-range-wide" />5–95%</span><span><i className="sg-range-mid" />25–75%</span><span><i className="sg-median-line" />Median</span><span><i className="sg-baseline" />Illustrative baseline</span></div></section>
      <aside className="sg-card sg-provenance"><h2>Provenance</h2>{[['Scenario set', <Copy key="generator" size={16} />], ['Version', <CodeIcon key="version" />], ['Random seed', <Layers key="seed" size={17} />], ['Projection Set consumers', <UsersRound key="consumers" size={17} />]].map(([key, icon]) => <div className="sg-provenance-line" key={key}><span>{icon}{key}</span><b>{key === 'Scenario set' ? scenario?.scenario_set_name || notReported : key === 'Version' ? scenario?.version_label || notReported : key === 'Random seed' ? scenario?.seed ?? notReported : scenario?.consumer_count ?? notReported}</b></div>)}<h3>Validation &amp; reproducibility</h3><button className="sg-validation-status" onClick={() => onNotify(`Backend scenario status: ${scenario?.status || 'not reported'}`)}><Activity size={24} /><span><b>Backend scenario status</b><small>{scenario?.status || 'Not reported'}</small></span><ChevronRight size={16} /></button><div className="sg-provenance-facts">{[['As of', scenario?.as_of_date || notReported], ['Generated by', scenario?.created_by || notReported], ['Model', scenario?.model_name || notReported], ['Paths', scenario?.path_count?.toLocaleString?.() || notReported], ['Horizon', scenario?.horizon || notReported], ['Seed', scenario?.seed ?? notReported]].map(([key, value]) => <p key={key}><span>{key}</span><b>{value}</b></p>)}</div><button className="sg-attach-button" onClick={attach}>Attach to Projection <ArrowRight size={17} /></button><button className="sg-compare-button" onClick={() => setCompare(true)}><GitBranch size={17} />Compare scenarios</button></aside>
    </div>
  </div>
}

function CodeIcon() { return <span className="sg-code-icon">&lt;/&gt;</span> }

function LargeScenarioChart({ variant }) {
  const lapse = variant === 'lapse'
  const mortality = variant === 'mortality'
  const line = lapse ? '0,35 90,66 180,82 270,100 360,117 450,130 540,143 630,153 720,162 810,171 900,180' : mortality ? '0,180 90,163 180,145 270,128 360,111 450,96 540,82 630,68 720,56 810,42 900,28' : '0,165 90,151 180,137 270,124 360,113 450,102 540,92 630,82 720,73 810,64 900,55'
  const outer = lapse ? '0,0 90,23 180,40 270,54 360,63 450,71 540,78 630,84 720,88 810,90 900,91 900,218 810,215 720,210 630,203 540,194 450,183 360,169 270,148 180,120 90,81 0,45' : mortality ? '0,216 90,197 180,174 270,153 360,130 450,108 540,87 630,64 720,43 810,21 900,0 900,129 810,116 720,103 630,91 540,79 450,68 360,60 270,57 180,62 90,76 0,103' : '0,210 90,193 180,173 270,152 360,129 450,105 540,81 630,58 720,35 810,15 900,0 900,120 810,117 720,116 630,118 540,125 450,137 360,150 270,163 180,174 90,184 0,190'
  return <div className="sg-large-chart"><span className="sg-y-labels"><i>{lapse ? '8%' : mortality ? '150%' : '10%'}</i><i>{lapse ? '4%' : mortality ? '100%' : '5%'}</i><i>0%</i></span><svg viewBox="0 0 900 230" preserveAspectRatio="none" role="img" aria-label={`${variant} scenario path range`}><defs><linearGradient id={`band-${variant}`} x1="0" x2="0" y1="0" y2="1"><stop stopColor="#a5e86c" stopOpacity=".32" /><stop offset="1" stopColor="#a5e86c" stopOpacity=".15" /></linearGradient></defs>{[0,1,2,3].map(i=><line key={i} x1="0" x2="900" y1={i*60+8} y2={i*60+8} />)}{[0,1,2,3,4,5,6,7,8,9].map(i=><line key={i} x1={i*100} x2={i*100} y1="8" y2="188" />)}<polygon points={outer} fill={`url(#band-${variant})`} /><polyline className="sg-inner-band" points={line} /><polyline className="sg-chart-median" points={line} /><line className="sg-chart-base" x1="0" x2="900" y1={lapse?95:150} y2={lapse?95:150} /></svg><div className="sg-x-labels">{['2026','2028','2030','2032','2034','2036','2038','2040','2042','2044','2046'].map(y=><i key={y}>{y}</i>)}</div></div>
}
