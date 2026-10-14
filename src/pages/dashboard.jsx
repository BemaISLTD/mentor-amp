import {
  ArrowRight,
  Box,
  FileText,
  Flag,
  Play,
  Search,
  TrendingUp,
} from 'lucide-react'
import { useApp } from '../context/useApp'
import { investigations, runs } from '../data/fixtures'
import { Driver, QuickActions } from '../components/ui/DashboardPrimitives'
import { IconBubble } from '../components/ui/IconBubble'
import { MetricCard } from '../components/ui/MetricCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import './dashboard.css'

export function Dashboard() {
  const { setActiveScreen, openInvestigation } = useApp()
  const openTrace = () => {
    openInvestigation({
      kind: 'trace',
      runId: 'JR-20261231-001',
      metric: 'net_reserve',
    })
  }

  return (
    <div className="dashboard-page flex flex-col gap-3">
      <section className="metric-grid grid grid-cols-12 gap-[11px] max-[1160px]:grid-cols-6 max-[760px]:grid-cols-2 max-[760px]:gap-[9px]" aria-label="Key metrics">
        <MetricCard
          className="col-span-2 max-[760px]:col-span-1 max-[760px]:min-h-[150px] max-[420px]:min-h-[138px] max-[420px]:p-3"
          onClick={() => setActiveScreen('Models')}
          icon={<Box size={22} />}
          label="Active models"
          value="12"
          sub="As of 2026-12-31"
        />
        <MetricCard
          className="col-span-2 max-[760px]:col-span-1 max-[760px]:min-h-[150px] max-[420px]:min-h-[138px] max-[420px]:p-3"
          onClick={() => setActiveScreen('Runs')}
          icon={<Play size={22} />}
          label="Runs this week"
          value="28"
          sub="vs last week 23 · +21.7%"
        />
        <MetricCard
          className="col-span-2 max-[760px]:col-span-1 max-[760px]:min-h-[150px] max-[420px]:min-h-[138px] max-[420px]:p-3"
          onClick={() => setActiveScreen('Investigate')}
          icon={<Search size={22} />}
          label="Investigations"
          value="6"
          sub="3 pinned"
        />
        <MetricCard
          className="col-span-2 max-[760px]:col-span-1 max-[760px]:min-h-[150px] max-[420px]:min-h-[138px] max-[420px]:p-3 max-[420px]:[&>strong]:text-[25px]"
          onClick={() => setActiveScreen('Results')}
          light
          icon={<span className="stack-icon"><span /><span /><span /></span>}
          label="Net reserve"
          value="$2.0B"
          sub="As of 2026-12-31"
          secondary="Base scenario"
        />
        <InvestigationHero onResume={openTrace} />
      </section>

      <section className="dashboard-grid grid grid-cols-2 gap-3 mt-0 max-[1160px]:grid-cols-1" aria-label="Investigation and recent runs">
        <InvestigationPanel onTrace={openTrace} />
        <RunsPanel onOpen={() => setActiveScreen('Results')} />
      </section>

      <section className="dashboard-grid bottom-grid grid grid-cols-2 gap-3 mt-0 max-[1160px]:grid-cols-1" aria-label="Recent work and quick actions">
        <InvestigationsPanel
          onOpen={openTrace}
          onViewAll={() => setActiveScreen('Investigate')}
        />
        <QuickActions />
      </section>
    </div>
  )
}

function InvestigationHero({ onResume }) {
  return (
    <article className="investigation-hero col-span-4 max-[1160px]:col-span-6 max-[760px]:col-span-2 min-h-[177px] max-[1160px]:min-h-[164px] max-[760px]:min-h-[150px]">
      <div className="hero-head">
        <IconBubble dark>
          <Flag size={20} fill="white" />
        </IconBubble>
        <div>
          <span>Continue investigation</span>
          <h2>Why did net reserve change?</h2>
        </div>
      </div>
      <div className="hero-foot">
        <small>Last viewed 2h ago</small>
        <button className="dark-cta" onClick={onResume}>
          Resume <ArrowRight size={16} />
        </button>
      </div>
    </article>
  )
}

function InvestigationPanel({ onTrace }) {
  const drivers = [
    { label: '−120 bps', detail: 'Interest rate' },
    { label: '−45 bps', detail: 'Expense load' },
    { label: '+210 bps', detail: 'Lapse rate', positive: true },
    { label: '+35 bps', detail: 'Mortality' },
    { label: '−10 bps', detail: 'Other' },
  ]

  return (
    <article className="panel investigation-panel">
      <div className="panel-title-row">
        <div className="panel-title-with-icon">
          <IconBubble dark>
            <Flag size={19} fill="white" />
          </IconBubble>
          <div>
            <span>Why did net reserve change?</span>
            <h2>Continue investigation</h2>
          </div>
        </div>
        <button className="view-all" onClick={onTrace}>
          Open <ArrowRight size={15} />
        </button>
      </div>

      <div className="investigation-summary grid grid-cols-2 gap-[18px] mt-5 max-[760px]:grid-cols-1 max-[760px]:gap-3.5">
        <div className="big-stat max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:border-[#e4e8eb] max-[760px]:pb-3">
          <span>Net reserve</span>
          <strong>+6.99%</strong>
          <small>vs prior period</small>
        </div>
        <div className="drivers">
          <Driver
            icon={<TrendingUp size={16} />}
            label="Primary driver"
            value="lapse_rate · Year 5 × MYGA-5"
          />
          <Driver
            icon={<FileText size={16} />}
            label="Source"
            value="mat-001"
          />
        </div>
      </div>

      <div className="impact-card">
        <span>
          Top driver impact <small>(vs prior period)</small>
        </span>
        <div className="impact-line" aria-hidden="true">
          {drivers.map((driver) => (
            <i
              className={driver.positive ? 'impact-positive' : ''}
              key={driver.detail}
            />
          ))}
        </div>
        <div className="impact-labels flex flex-wrap gap-2">
          {drivers.map((driver) => (
            <span className="max-[420px]:min-w-[68px]" key={driver.detail}>
              <b>{driver.label}</b>
              <small>{driver.detail}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="button-row max-[760px]:flex-wrap">
        <button className="button button-primary dark-button max-[760px]:flex-1 max-[760px]:basis-[180px]" onClick={onTrace}>
          Resume investigation <ArrowRight size={15} />
        </button>
        <button className="button button-secondary max-[760px]:flex-1 max-[760px]:basis-[180px]" onClick={onTrace}>
          Trace this result <ArrowRight size={15} />
        </button>
      </div>
    </article>
  )
}

function RunsPanel({ onOpen }) {
  return (
    <article className="panel runs-panel">
      <div className="panel-title-row">
        <h2 className="section-title">Recent projection runs</h2>
        <button className="view-all" onClick={onOpen}>View all</button>
      </div>
      <div className="dashboard-run-table">
        <div className="dashboard-run-head max-[760px]:hidden" aria-hidden="true">
          <span>Run name</span>
          <span>Scenario</span>
          <span>As of date</span>
          <span>Status</span>
          <span>Modified</span>
        </div>
        {runs.map((run) => (
          <button
            className="dashboard-run-row max-[760px]:grid-cols-[minmax(0,1fr)_auto] max-[760px]:gap-x-2.5 max-[760px]:gap-y-1 max-[760px]:py-2"
            key={`${run.name}-${run.scenario}`}
            onClick={onOpen}
          >
            <span className="dashboard-run-name max-[760px]:col-start-1">
              <Flag size={14} fill="currentColor" />
              <b>{run.name}</b>
            </span>
            <span className="dashboard-run-scenario max-[760px]:col-start-1 max-[760px]:pl-[22px]">{run.scenario}</span>
            <span className="dashboard-run-date max-[760px]:hidden">{run.date}</span>
            <span className="dashboard-run-status max-[760px]:col-start-2 max-[760px]:row-span-2">
              <StatusBadge status="Completed" />
            </span>
            <span className="dashboard-run-modified max-[760px]:hidden">{run.modified}</span>
          </button>
        ))}
      </div>
    </article>
  )
}

function InvestigationsPanel({ onOpen, onViewAll }) {
  return (
    <article className="panel recent-investigations-panel">
      <div className="panel-title-row">
        <h2 className="section-title">Recent investigations</h2>
        <button className="view-all" onClick={onViewAll}>View all</button>
      </div>
      <div className="recent-investigations-list">
        {investigations.map((item) => (
          <button
            onClick={onOpen}
            key={item.title}
            className="investigation-row"
          >
            <Flag size={15} fill="currentColor" />
            <span>
              <b>{item.title}</b>
              <small>
                {item.model} <b>·</b> {item.scenario} <b>·</b> {item.period}
              </small>
            </span>
            <small>{item.time}</small>
            <ArrowRight size={17} />
          </button>
        ))}
      </div>
    </article>
  )
}