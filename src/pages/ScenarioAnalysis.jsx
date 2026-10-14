import { useState } from 'react'
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  GitBranch,
  Settings2,
  X,
} from 'lucide-react'
import './scenario-analysis.css'

const scenarios = [
  {
    name: 'Base scenario',
    subtitle: 'Economic Base v2.1',
    description: 'Standard economic assumptions',
    type: 'Selected',
    paths: '1,000',
    horizon: '20 years',
    seed: '20261231',
  },
  {
    name: 'Low Interest Rate',
    subtitle: 'Low rate environment',
    description: 'Persistently lower interest rates',
    type: 'Alternative',
    paths: '1,000',
    horizon: '20 years',
    seed: '20261231',
  },
  {
    name: 'Rate Shock',
    subtitle: 'Parallel rate shock',
    description: '+200 bps instantaneous shock',
    type: 'Stress',
    paths: '1,000',
    horizon: '20 years',
    seed: '20261231',
  },
]

const validationChecks = [
  { title: 'Scenario set validated', detail: 'All checks passed' },
  { title: 'Reproducible configuration', detail: 'Seed: 20261231 · Deterministic' },
  { title: 'Model compatibility', detail: 'Economic Base v2.1' },
  { title: 'Regulatory alignment', detail: 'Meets industry standards' },
]

export function ScenarioAnalysis({ onNotify }) {
  const [selectedScenario, setSelectedScenario] = useState('Base scenario')
  const [metric, setMetric] = useState('Interest rate (short rate)')
  const [horizon, setHorizon] = useState('20 years')
  const [pathCount, setPathCount] = useState('1,000')
  const [seed, setSeed] = useState('20261231')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [generated, setGenerated] = useState(false)

  const generateScenarios = () => {
    setGenerated(true)
    onNotify('Scenario paths generated and validated')
  }

  const downloadScenarioSet = () => {
    const payload = {
      name: selectedScenario,
      generator: 'Economic Base v2.1',
      paths: Number(pathCount.replaceAll(',', '')),
      horizon,
      seed,
      metric,
    }
    const file = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'scenario-set-20261231.json'
    link.click()
    URL.revokeObjectURL(url)
    onNotify('Scenario set downloaded')
  }

  return (
    <div className="scenario-page flex flex-col gap-4">
      <ScenarioGeneratorBanner
        horizon={horizon}
        pathCount={pathCount}
        seed={seed}
        onAdvanced={() => setSettingsOpen(true)}
        onGenerate={generateScenarios}
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
            generated={generated}
            selectedScenario={selectedScenario}
            onCompare={() => setComparisonOpen(true)}
            onSelect={setSelectedScenario}
          />
        </main>

        <ValidationPanel
          generated={generated}
          horizon={horizon}
          pathCount={pathCount}
          seed={seed}
          onDownload={downloadScenarioSet}
          onNotify={onNotify}
        />
      </div>

      {settingsOpen && (
        <AdvancedSettings
          horizon={horizon}
          pathCount={pathCount}
          seed={seed}
          onClose={() => setSettingsOpen(false)}
          onSave={(settings) => {
            setHorizon(settings.horizon)
            setPathCount(settings.pathCount)
            setSeed(settings.seed)
            setSettingsOpen(false)
            onNotify('Generator settings updated')
          }}
        />
      )}

      {comparisonOpen && (
        <ScenarioComparison
          onClose={() => setComparisonOpen(false)}
          onSelect={(name) => {
            setSelectedScenario(name)
            setComparisonOpen(false)
          }}
        />
      )}
    </div>
  )
}

function ScenarioGeneratorBanner({ horizon, pathCount, seed, onAdvanced, onGenerate }) {
  return (
    <section className="scenario-generator-banner grid grid-cols-[minmax(0,1fr)_minmax(480px,750px)] items-center gap-8 rounded-[12px] px-7 py-6 max-[1120px]:grid-cols-1 max-[1120px]:gap-5 max-[600px]:px-4 max-[600px]:py-5">
      <div className="flex min-w-0 items-center gap-5 max-[600px]:items-start">
        <span className="scenario-generator-icon"><Activity size={36} /></span>
        <div className="min-w-0">
          <h2>Scenario Generator</h2>
          <span className="scenario-generator-version">Economic Base v2.1</span>
          <p>Create economic scenarios with configurable assumptions, validate against industry standards, and generate projection-ready paths.</p>
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
          <button className="scenario-advanced-button" onClick={onAdvanced}>
            <Settings2 size={20} />Advanced settings
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
          <h2>Interest rate and lapse rate scenario bands</h2>
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

function ScenarioSetList({ generated, selectedScenario, onSelect, onCompare }) {
  return (
    <section className="scenario-panel scenario-sets-panel rounded-[12px] bg-white p-4">
      <h2 className="scenario-section-label">Scenario sets</h2>
      <div className="scenario-set-grid grid grid-cols-3 gap-3 max-[760px]:grid-cols-2 max-[520px]:grid-cols-1">
        {scenarios.map((scenario) => (
          <ScenarioSetCard
            generated={generated}
            key={scenario.name}
            scenario={scenario}
            selected={selectedScenario === scenario.name}
            onSelect={() => onSelect(scenario.name)}
          />
        ))}
      </div>
      <button className="scenario-compare-button" onClick={onCompare}>
        <Activity size={19} />Compare scenarios<ArrowRight size={20} />
      </button>
    </section>
  )
}

function ScenarioSetCard({ scenario, selected, generated, onSelect }) {
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
          {selected ? (generated ? 'Generated' : 'Selected') : scenario.type}
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

function ValidationPanel({ generated, horizon, pathCount, seed, onDownload, onNotify }) {
  return (
    <aside className="scenario-panel scenario-validation-panel rounded-[12px] bg-white p-5">
      <h2 className="scenario-section-label">Validation &amp; reproducibility</h2>
      <div className="scenario-validation-list">
        {validationChecks.map((check, index) => (
          <button className="scenario-validation-row" key={check.title} onClick={() => onNotify(`${check.title}: ${check.detail}`)}>
            <span className="validation-check-icon"><Check size={19} strokeWidth={3} /></span>
            <span><b>{index === 0 && generated ? 'Scenario set generated' : check.title}</b><small>{index === 0 && generated ? 'All paths generated successfully' : index === 1 ? `Seed: ${seed} · Deterministic` : check.detail}</small></span>
            <ArrowRight size={18} />
          </button>
        ))}
      </div>

      <dl className="scenario-provenance-list">
        <div><dt>Generated</dt><dd>{generated ? 'Just now' : '2026-12-31 10:24 AM'}</dd></div>
        <div><dt>Generated by</dt><dd>Andrew Johnson</dd></div>
        <div><dt>Model</dt><dd>Economic Base v2.1</dd></div>
        <div><dt>Paths</dt><dd>{pathCount}</dd></div>
        <div><dt>Horizon</dt><dd>{horizon}</dd></div>
        <div><dt>Random seed</dt><dd>{seed}</dd></div>
      </dl>

      <button className="scenario-download-button" onClick={onDownload}>
        <Download size={18} />Download scenario set<ChevronDown size={16} />
      </button>
    </aside>
  )
}

function AdvancedSettings({ horizon, pathCount, seed, onClose, onSave }) {
  const [draft, setDraft] = useState({ horizon, pathCount, seed })

  return (
    <div className="scenario-modal-backdrop" onClick={onClose}>
      <section
        aria-labelledby="scenario-settings-title"
        aria-modal="true"
        className="scenario-settings-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div><span className="scenario-section-label">Generator configuration</span><h2 id="scenario-settings-title">Advanced settings</h2></div>
          <button aria-label="Close advanced settings" className="scenario-modal-close" onClick={onClose}><X size={19} /></button>
        </div>
        <label>Number of paths<input min="100" onChange={(event) => setDraft({ ...draft, pathCount: Number(event.target.value).toLocaleString() })} step="100" type="number" value={Number(draft.pathCount.replaceAll(',', ''))} /></label>
        <label>Projection horizon<select onChange={(event) => setDraft({ ...draft, horizon: event.target.value })} value={draft.horizon}><option>10 years</option><option>20 years</option><option>30 years</option></select></label>
        <label>Random seed<input onChange={(event) => setDraft({ ...draft, seed: event.target.value })} type="text" value={draft.seed} /></label>
        <div className="scenario-modal-actions"><button onClick={onClose}>Cancel</button><button onClick={() => onSave(draft)}>Save settings</button></div>
      </section>
    </div>
  )
}

function ScenarioComparison({ onClose, onSelect }) {
  return (
    <div className="scenario-modal-backdrop" onClick={onClose}>
      <section aria-labelledby="scenario-compare-title" aria-modal="true" className="scenario-settings-modal scenario-compare-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="flex items-start justify-between gap-3">
          <div><span className="scenario-section-label">Scenario comparison</span><h2 id="scenario-compare-title">Compare scenario sets</h2></div>
          <button aria-label="Close comparison" className="scenario-modal-close" onClick={onClose}><X size={19} /></button>
        </div>
        <p>Compare projected interest-rate assumptions across the selected scenario sets.</p>
        {scenarios.map((scenario, index) => (
          <button className="scenario-comparison-row" key={scenario.name} onClick={() => onSelect(scenario.name)}>
            <span className="scenario-set-icon"><Activity size={23} /></span>
            <span><b>{scenario.name}</b><small>{scenario.subtitle}</small></span>
            <strong>{['4.25%', '3.10%', '6.25%'][index]}</strong>
            <ArrowRight size={17} />
          </button>
        ))}
      </section>
    </div>
  )
}