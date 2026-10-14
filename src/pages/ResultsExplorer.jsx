import { useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Download,
  GitBranch,
  GitCompareArrows,
  LineChart,
  MoreVertical,
  Plus,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { StatusBadge } from '../components/ui/StatusBadge'
import './results-explorer.css'

const resultTabs = ['Results Explorer', 'Run History', 'Compare runs', 'Driver / Variance']

const projectionYears = [
  { year: '2026', value: '$1,245.6M' },
  { year: '2028', value: '$1,348.2M' },
  { year: '2030', value: '$1,452.7M' },
  { year: '2032', value: '$1,559.8M' },
  { year: '2034', value: '$1,663.2M' },
  { year: '2036', value: '$1,745.1M' },
  { year: '2038', value: '$1,812.6M' },
  { year: '2040', value: '$1,866.4M' },
  { year: '2042', value: '$1,901.8M' },
  { year: '2044', value: '$1,930.4M' },
]

const runHistory = [
  ['JR-20261231-001', 'GAAP Reserve Pack', 'MYGA Base', '2026-12-31', 'Completed'],
  ['JR-20261230-004', 'Monthly VM-21 Pack', 'VM-21 Deterministic', '2026-12-31', 'Completed'],
  ['JR-20261228-002', 'Pricing Sensitivity Pack', 'Low Interest Rate', '2026-12-31', 'Stale'],
  ['JR-20261227-006', 'GAAP Reserve Pack', 'High lapse stress', '2026-12-31', 'Completed'],
]

const impacts = [
  { label: 'Mortality', amount: '+$152.3M', type: 'positive', height: '70%' },
  { label: 'Interest', amount: '+$87.6M', type: 'positive', height: '48%' },
  { label: 'Lapse', amount: '−$54.1M', type: 'negative', height: '30%' },
  { label: 'Expense', amount: '−$104.4M', type: 'negative', height: '52%' },
]

export function ResultsExplorer({ onNotify }) {
  const [view, setView] = useState('Results Explorer')
  const [metric, setMetric] = useState('Net reserve')

  const exportResults = () => {
    const content = [
      'year,net_reserve,total_change',
      '2026,1245.6,6.99%',
      '2045,1930.4,54.9%',
    ].join('\n')
    const file = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'results-jr-20261231-001.csv'
    link.click()
    URL.revokeObjectURL(url)
    onNotify('Results CSV downloaded')
  }

  return (
    <div className="results-explorer-page flex flex-col gap-3.5">
      <nav
        aria-label="Results views"
        className="results-tabs flex min-h-[46px] items-center justify-between gap-4 overflow-x-auto max-[760px]:items-start max-[760px]:flex-col"
      >
        <div className="flex h-full min-w-max items-center gap-[34px] max-[760px]:w-full max-[760px]:gap-5 max-[760px]:overflow-x-auto">
          {resultTabs.map((tab) => (
            <button
              aria-current={view === tab ? 'page' : undefined}
              className={`results-tab ${view === tab ? 'results-tab-active' : ''}`}
              key={tab}
              onClick={() => setView(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <button
          className="results-compare-top button button-primary max-[760px]:w-full"
          onClick={() => setView('Compare runs')}
        >
          <GitCompareArrows size={17} />
          Compare runs
        </button>
      </nav>

      <div className="results-content-grid grid grid-cols-[minmax(0,1fr)_294px] items-start gap-3.5 max-[1150px]:grid-cols-1">
        <main className="flex min-w-0 flex-col gap-3.5">
          {view === 'Results Explorer' && (
            <ExplorerView metric={metric} setMetric={setMetric} />
          )}
          {view === 'Run History' && <RunHistoryView />}
          {view === 'Compare runs' && <CompareRunsView />}
          {view === 'Driver / Variance' && <DriverVarianceView />}
        </main>

        <aside className="results-right-rail flex flex-col gap-3.5">
          <RunProvenance
            onCompare={() => setView('Compare runs')}
            onExport={exportResults}
            onNotify={onNotify}
          />
          <KeyTakeaways />
          <ExploreLinks setView={setView} onNotify={onNotify} />
        </aside>
      </div>
    </div>
  )
}

function ExplorerView({ metric, setMetric }) {
  return (
    <>
      <section className="results-metric-row grid grid-cols-[minmax(0,1fr)_148px_148px] gap-3.5 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
        <MetricHero />
        <SmallMetric
          icon={<Target size={25} />}
          label="Outputs captured"
          value="28"
          detail="5 published outputs"
        />
        <SmallMetric
          icon={<GitBranch size={25} />}
          label="Trace ready"
          value="100%"
          detail="All values have lineage"
        />
      </section>

      <ProjectionCard metric={metric} setMetric={setMetric} />
      <DriverContribution />
    </>
  )
}

function MetricHero() {
  return (
    <article className="result-metric-hero flex min-h-44 items-stretch justify-between gap-4 rounded-[10px] p-[22px] max-[520px]:flex-col max-[520px]:p-4">
      <div className="flex min-w-0 flex-col items-start gap-2">
        <span className="text-[13px] text-white">Net reserve</span>
        <strong className="text-[40px] font-bold leading-tight text-white max-[520px]:text-[32px]">$1,245.6M</strong>
        <b className="text-[20px] text-[#9bfa00] max-[520px]:text-[17px]">↑ +6.99% vs prior</b>
        <small className="text-[11px] text-[#cad5d0]">Prior: $1,164.2M</small>
      </div>
      <div className="result-sparkline flex w-[250px] shrink-0 flex-col items-start gap-3 max-[520px]:w-full">
        <button className="result-comparison-select">
          vs. prior <ChevronDown size={13} />
        </button>
        <svg aria-label="Net reserve trend, rising 6.99 percent" className="h-12 w-full" role="img" viewBox="0 0 250 48">
          <polyline points="2,38 27,34 52,36 77,23 102,27 127,15 152,21 177,10 202,15 227,4 248,7" />
        </svg>
        <span className="self-end text-xs text-[#9bfa00]">+6.99%</span>
      </div>
    </article>
  )
}

function SmallMetric({ icon, label, value, detail }) {
  return (
    <article className="result-small-metric flex min-h-44 flex-col items-start gap-2.5 rounded-[10px] bg-white p-4">
      <span className="result-icon-bubble">{icon}</span>
      <span className="text-[12px] text-[#122142]">{label}</span>
      <strong className="text-[30px] font-bold leading-none text-[#07112f]">{value}</strong>
      <small className="text-[9px] text-[#71809f]">{detail}</small>
    </article>
  )
}

function ProjectionCard({ metric, setMetric }) {
  return (
    <section className="result-panel rounded-[10px] bg-white p-[18px]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold text-[#07112f]">Projected net reserve</h2>
          <p className="mt-1 text-[11px] text-[#71809f]">Net reserve projection from 2026 to 2045</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="result-metric">Metric</label>
          <select
            className="result-chart-select"
            id="result-metric"
            onChange={(event) => setMetric(event.target.value)}
            value={metric}
          >
            <option>Net reserve</option>
            <option>Policy cash flow</option>
            <option>Reserve change</option>
          </select>
          <span className="result-chart-kind"><LineChart size={16} />Line chart</span>
          <button aria-label="More chart options" className="result-chart-more">
            <MoreVertical size={19} />
          </button>
        </div>
      </div>

      <ProjectionChart />

      <div className="result-summary-strip grid grid-cols-4 gap-4 border-t border-[#dde4ea] pt-3.5 max-[520px]:grid-cols-2">
        <SummaryValue value="$1,245.6M" label={<>2026<br />Net reserve</>} />
        <SummaryValue value="$1,930.4M" label={<>2045<br />Net reserve</>} />
        <SummaryValue value="+54.9%" label={<>Total change<br />2026 – 2045</>} positive />
        <SummaryValue value="2.9%" label={<>CAGR<br />2026 – 2045</>} />
      </div>
    </section>
  )
}

function ProjectionChart() {
  return (
    <div className="projection-chart-wrap">
      <div className="projection-y-labels" aria-hidden="true">
        <span>2,000M</span>
        <span>1,500M</span>
        <span>1,000M</span>
        <span>500M</span>
        <span>0</span>
      </div>
      <div className="projection-chart">
        <svg
          aria-label="Projected net reserve rises from 1,245.6 million in 2026 to 1,930.4 million in 2045"
          className="h-full w-full"
          role="img"
          preserveAspectRatio="none"
          viewBox="0 0 800 236"
        >
          {[0, 42, 84, 126, 168, 210].map((line) => (
            <line className="projection-grid-line" key={`horizontal-${line}`} x1="0" x2="800" y1={line} y2={line} />
          ))}
          {projectionYears.map((point, index) => (
            <line
              className="projection-grid-line projection-grid-vertical"
              key={point.year}
              x1={index * (800 / (projectionYears.length - 1))}
              x2={index * (800 / (projectionYears.length - 1))}
              y1="0"
              y2="210"
            />
          ))}
          <polyline className="projection-line" points="0,173 89,162 178,149 267,136 356,123 444,111 533,99 622,88 711,78 800,70" />
          <circle className="projection-point" cx="0" cy="173" r="5" />
        </svg>
        <div className="projection-tooltip">
          <small>2026</small>
          <b>$1,245.6M</b>
        </div>
      </div>
      <div className="projection-x-labels" aria-hidden="true">
        {projectionYears.map((point) => <span key={point.year}>{point.year}</span>)}
      </div>
    </div>
  )
}

function SummaryValue({ value, label, positive = false }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <strong className={`text-[17px] font-bold ${positive ? 'text-[#3f8308]' : 'text-[#07112f]'}`}>{value}</strong>
      <span className="text-[10px] leading-[15px] text-[#71809f]">{label}</span>
    </div>
  )
}

function DriverContribution() {
  return (
    <section className="result-panel rounded-[10px] bg-white p-[18px]">
      <h2 className="text-[17px] font-bold text-[#07112f]">Driver contribution to change</h2>
      <p className="mt-1 text-[10px] text-[#71809f]">Bridge from prior run to current net reserve (in $ millions)</p>
      <div className="waterfall-chart mt-4 grid grid-cols-6 items-end gap-3 max-[520px]:grid-cols-3">
        <WaterfallBar label="Prior" amount="$1,164.2M" type="total" height="42%" />
        {impacts.map((impact) => (
          <WaterfallBar key={impact.label} {...impact} />
        ))}
        <WaterfallBar label="Net change" amount="$1,245.6M" type="total" height="60%" />
      </div>
    </section>
  )
}

function WaterfallBar({ label, amount, type, height }) {
  return (
    <div className="waterfall-item flex h-full min-w-0 flex-col items-center justify-end gap-1.5">
      <b className="waterfall-amount">{amount}</b>
      <div className={`waterfall-bar waterfall-bar-${type}`} style={{ height }} />
      <small>{label}</small>
    </div>
  )
}

function RunProvenance({ onCompare, onExport, onNotify }) {
  return (
    <section className="result-panel flex flex-col gap-3 rounded-[10px] bg-white p-4">
      <h2 className="rail-eyebrow">Run provenance</h2>
      <p className="provenance-copy">
        Run JR-20261231-001<br />
        Model v3.2<br />
        Q4–2024 GAAP Reserve<br />
        Base scenario<br />
        <span><CalendarDays size={15} />2026–12–31</span>
      </p>
      <div className="provenance-status">
        <span>Status</span>
        <StatusBadge status="Completed" />
      </div>
      <div className="results-callout">
        <GitCompareArrows size={20} />
        <span><b>Results workspace opened</b><small>Trace-ready results with full lineage</small></span>
      </div>
      <button className="result-action result-action-primary" onClick={onCompare}>
        <GitBranch size={17} />Compare runs
      </button>
      <button className="result-action" onClick={onExport}>
        <Download size={17} />Export results
      </button>
      <button className="result-action" onClick={() => onNotify('Scratchpad is not available in this build')}>
        <Plus size={17} />Add to Scratchpad
      </button>
    </section>
  )
}

function KeyTakeaways() {
  const takeaways = [
    { icon: <TrendingUp size={21} />, title: 'Higher interest earnings', detail: 'Interest contributed +$87.6M to net reserve.' },
    { icon: <TrendingDown size={21} />, title: 'Lapse increase', detail: 'Higher lapse experience reduced net reserve by $54.1M.' },
    { icon: <ArrowUpRightIcon />, title: 'Net reserve growth', detail: 'Net reserve increased 6.99% versus prior run.' },
  ]

  return (
    <section className="result-panel flex flex-col gap-3 rounded-[10px] bg-white p-4">
      <h2 className="rail-eyebrow">Key takeaways</h2>
      {takeaways.map((item) => (
        <div className="takeaway-row" key={item.title}>
          <span className="takeaway-icon">{item.icon}</span>
          <span><b>{item.title}</b><small>{item.detail}</small></span>
        </div>
      ))}
    </section>
  )
}

function ArrowUpRightIcon() {
  return <ArrowDown className="rotate-[-45deg]" size={21} />
}

function ExploreLinks({ setView, onNotify }) {
  const links = [
    { label: 'Driver / Variance', action: () => setView('Driver / Variance') },
    { label: 'Run History', action: () => setView('Run History') },
    { label: 'View outputs', action: () => onNotify('Published outputs opened') },
  ]

  return (
    <section className="result-panel flex flex-col gap-1 rounded-[10px] bg-white p-4">
      <h2 className="rail-eyebrow mb-1">Explore further</h2>
      {links.map((link) => (
        <button className="explore-link" key={link.label} onClick={link.action}>
          <ArrowRight size={14} />
          <span>{link.label}</span>
          <ArrowRight size={17} />
        </button>
      ))}
    </section>
  )
}

function RunHistoryView() {
  return (
    <section className="result-panel rounded-[10px] bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-bold">Run History</h2><p className="text-sm text-[#71809f]">Results remain linked to their model and execution snapshots.</p></div>
        <button className="result-action"><Search size={16} />Filter runs</button>
      </div>
      <div className="flex flex-col">
        {runHistory.map(([id, pack, scenario, date, status]) => (
          <div className="history-row grid grid-cols-[1.1fr_1fr_1fr_120px_110px] items-center gap-3 py-4 max-[760px]:grid-cols-2" key={id}>
            <span><b>{id}</b><small>{pack}</small></span>
            <span className="max-[760px]:hidden">{scenario}</span>
            <span className="max-[760px]:hidden">{date}</span>
            <StatusBadge status={status} />
            <button className="history-open" onClick={() => {}}>Open results <ArrowRight size={14} /></button>
          </div>
        ))}
      </div>
    </section>
  )
}

function CompareRunsView() {
  return (
    <section className="result-panel flex flex-col gap-4 rounded-[10px] bg-white p-5">
      <div><span className="rail-eyebrow">Run comparison</span><h2 className="mt-2 text-xl font-bold">Base vs Low Interest Rate</h2><p className="mt-1 text-sm text-[#71809f]">Model v3.2 · same input snapshot · scenario-only difference</p></div>
      <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
        <ComparisonMetric title="Base scenario" value="$1,245.6M" detail="Reference" />
        <ComparisonMetric title="Low Interest Rate" value="$998.1M" detail="−19.9%" negative />
      </div>
      <div className="comparison-dimensions">
        <h3>Changed dimensions</h3>
        <div><span>Interest rate curve</span><b>−125 bps</b></div>
        <div><span>Lapse rate</span><b>+0.12%</b></div>
        <div><span>Net reserve</span><b>−$247.5M</b></div>
        <div><span>Expense load</span><b>Unchanged</b></div>
      </div>
    </section>
  )
}

function ComparisonMetric({ title, value, detail, negative = false }) {
  return (
    <div className="comparison-metric">
      <span>{title}</span>
      <b>{value}</b>
      <small className={negative ? 'text-rose-600' : ''}>{detail}</small>
    </div>
  )
}

function DriverVarianceView() {
  return (
    <section className="result-panel rounded-[10px] bg-white p-5">
      <div className="mb-4"><span className="rail-eyebrow">Driver / Variance</span><h2 className="mt-2 text-xl font-bold">Driver contribution to change</h2><p className="mt-1 text-sm text-[#71809f]">Bridge from prior run to current net reserve (in $ millions).</p></div>
      <div className="grid h-[360px] grid-cols-6 items-end gap-4 max-[520px]:grid-cols-3">
        <WaterfallBar label="Prior" amount="$1,164.2M" type="total" height="42%" />
        {impacts.map((impact) => <WaterfallBar key={impact.label} {...impact} />)}
        <WaterfallBar label="Net change" amount="$1,245.6M" type="total" height="60%" />
      </div>
    </section>
  )
}