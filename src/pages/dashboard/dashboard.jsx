import {
  ArrowRight,
  Box,
  FileText,
  Flag,
  Play,
  Search,
  TrendingUp,
} from 'lucide-react'
import { useApp } from '../../context/useApp'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import { Driver, QuickActions } from '../../components/ui/DashboardPrimitives'
import { IconBubble } from '../../components/ui/IconBubble'
import { MetricCard } from '../../components/ui/MetricCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import './dashboard.css'

export function Dashboard() {
  const { setActiveScreen, openInvestigation } = useApp()
  const { projectId } = useWorkspace()
  const dashboardQuery = useApiQuery(projectId ? `/v1/projects/${projectId}/dashboard` : null, 5000)
  const dashboard = dashboardQuery.data
  const headline = dashboard?.headline
  const formatMoney = value => value == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value)
  const openTrace = () => {
    if (!headline?.run_id) { setActiveScreen('Results'); return }
    openInvestigation({
      kind: 'trace',
      runId: headline.run_id,
      metric: headline.metric,
      policyId: headline.trace_policy_id,
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
          value={dashboardQuery.loading ? '…' : dashboard?.models?.total ?? 0}
          sub={dashboard?.as_of ? `Updated ${new Date(dashboard.as_of).toLocaleDateString()}` : 'Backend dashboard'}
        />
        <MetricCard
          className="col-span-2 max-[760px]:col-span-1 max-[760px]:min-h-[150px] max-[420px]:min-h-[138px] max-[420px]:p-3"
          onClick={() => setActiveScreen('Runs')}
          icon={<Play size={22} />}
          label="Runs this week"
          value={dashboardQuery.loading ? '…' : dashboard?.runs?.last_7_days ?? 0}
          sub={`${dashboard?.runs?.total ?? 0} total project runs`}
        />
        <MetricCard
          className="col-span-2 max-[760px]:col-span-1 max-[760px]:min-h-[150px] max-[420px]:min-h-[138px] max-[420px]:p-3"
          onClick={() => setActiveScreen('Investigate')}
          icon={<Search size={22} />}
          label="Investigations"
          value={dashboardQuery.loading ? '…' : dashboard?.investigations?.total ?? 0}
          sub={dashboard?.investigations?.available ? `${dashboard?.investigations?.pinned ?? 0} pinned` : 'Investigation API unavailable'}
        />
        <MetricCard
          className="col-span-2 max-[760px]:col-span-1 max-[760px]:min-h-[150px] max-[420px]:min-h-[138px] max-[420px]:p-3 max-[420px]:[&>strong]:text-[25px]"
          onClick={() => setActiveScreen('Results')}
          light
          icon={<span className="stack-icon"><span /><span /><span /></span>}
          label="Net reserve"
          value={formatMoney(headline?.value)}
          sub={headline?.as_of ? `As of ${headline.as_of}${headline.illustrative ? ' · illustrative' : ''}` : 'No completed run results'}
          secondary={headline?.scenario_name ?? 'No scenario'}
        />
        <InvestigationHero headline={headline} onResume={openTrace} />
      </section>

      <section className="dashboard-grid grid grid-cols-2 gap-3 mt-0 max-[1160px]:grid-cols-1" aria-label="Investigation and recent runs">
        <InvestigationPanel dashboard={dashboard} onTrace={openTrace} />
        <RunsPanel runs={dashboard?.recent_runs ?? []} loading={dashboardQuery.loading} onOpen={() => setActiveScreen('Results')} />
      </section>

      <section className="dashboard-grid bottom-grid grid grid-cols-2 gap-3 mt-0 max-[1160px]:grid-cols-1" aria-label="Recent work and quick actions">
        <InvestigationsPanel investigations={dashboard?.recent_investigations ?? []}
          onOpen={openTrace}
          onViewAll={() => setActiveScreen('Investigate')}
        />
        <QuickActions />
      </section>
    </div>
  )
}

function InvestigationHero({ headline, onResume }) {
  return (
    <article className="investigation-hero col-span-4 max-[1160px]:col-span-6 max-[760px]:col-span-2 min-h-[177px] max-[1160px]:min-h-[164px] max-[760px]:min-h-[150px]">
      <div className="hero-head">
        <IconBubble dark>
          <Flag size={20} fill="white" />
        </IconBubble>
        <div>
          <span>{headline ? 'Latest backend result' : 'Investigation workspace'}</span>
          <h2>{headline ? headline.label : 'No completed runs yet'}</h2>
        </div>
      </div>
      <div className="hero-foot">
        <small>{headline ? `${headline.scenario_name} · ${headline.as_of}${headline.illustrative ? ' · illustrative' : ''}` : 'Run a Projection Set to populate results'}</small>
        <button className="dark-cta" onClick={onResume}>
          Resume <ArrowRight size={16} />
        </button>
      </div>
    </article>
  )
}

function InvestigationPanel({ dashboard, onTrace }) {
  const comparison = dashboard?.latest_comparison
  const drivers = comparison?.changed_inputs?.length ? comparison.changed_inputs.map(item => ({ label: item.difference == null ? 'Changed' : `${item.difference > 0 ? '+' : ''}${(item.difference * 10000).toFixed(0)} bps`, detail: item.variable, positive: item.difference < 0 })) : [{ label: '—', detail: 'No driver attribution available' }]

  return (
    <article className="panel investigation-panel">
      <div className="panel-title-row">
        <div className="panel-title-with-icon">
          <IconBubble dark>
            <Flag size={19} fill="white" />
          </IconBubble>
          <div>
            <span>{comparison ? 'Latest backend comparison' : 'Investigation API status'}</span>
            <h2>{comparison ? `${comparison.baseline_label} → ${comparison.current_label}` : 'No driver investigation available'}</h2>
          </div>
        </div>
        <button className="view-all" onClick={onTrace}>
          Open <ArrowRight size={15} />
        </button>
      </div>

      <div className="investigation-summary grid grid-cols-2 gap-[18px] mt-5 max-[760px]:grid-cols-1 max-[760px]:gap-3.5">
        <div className="big-stat max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:border-[#e4e8eb] max-[760px]:pb-3">
          <span>{comparison?.metric ?? 'Status'}</span>
          <strong>{comparison?.difference_pct == null ? '—' : `${comparison.difference_pct > 0 ? '+' : ''}${comparison.difference_pct.toFixed(2)}%`}</strong>
          <small>{comparison ? 'backend run-to-run difference' : 'Current backend does not expose driver investigations'}</small>
        </div>
        <div className="drivers">
          <Driver
            icon={<TrendingUp size={16} />}
            label="Primary driver"
            value={comparison?.changed_inputs?.[0]?.variable ?? 'Not available'}
          />
          <Driver
            icon={<FileText size={16} />}
            label="Source"
            value={comparison ? `${comparison.baseline_label} → ${comparison.current_label}` : 'No investigation record'}
          />
        </div>
      </div>

      <div className="impact-card">
        <span>
          Changed inputs <small>(from backend scenario comparison)</small>
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

function RunsPanel({ runs, loading, onOpen }) {
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
        {loading && <p>Loading project runs…</p>}
        {runs.map((run) => (
          <button
            className="dashboard-run-row max-[760px]:grid-cols-[minmax(0,1fr)_auto] max-[760px]:gap-x-2.5 max-[760px]:gap-y-1 max-[760px]:py-2"
            key={run.id}
            onClick={onOpen}
          >
            <span className="dashboard-run-name max-[760px]:col-start-1">
              <Flag size={14} fill="currentColor" />
              <b>{run.name}</b>
            </span>
            <span className="dashboard-run-scenario max-[760px]:col-start-1 max-[760px]:pl-[22px]">{run.scenario_name}</span>
            <span className="dashboard-run-date max-[760px]:hidden">{run.valuation_date}</span>
            <span className="dashboard-run-status max-[760px]:col-start-2 max-[760px]:row-span-2">
              <StatusBadge status={run.status === 'success' ? 'Completed' : run.status} />
            </span>
            <span className="dashboard-run-modified max-[760px]:hidden">{run.completed_at ? new Date(run.completed_at).toLocaleString() : '—'}</span>
          </button>
        ))}
      </div>
    </article>
  )
}

function InvestigationsPanel({ investigations, onOpen, onViewAll }) {
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
        {investigations.length === 0 && <p>No investigation records are available from this project’s backend.</p>}
      </div>
    </article>
  )
}
