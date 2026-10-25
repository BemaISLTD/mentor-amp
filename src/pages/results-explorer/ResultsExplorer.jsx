import { useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesColumn,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  GitBranch,
  GitCompareArrows,
  Info,
  LineChart,
  MoreVertical,
  Network,
  Plus,
  Play,
  Search,
  Save,
  Share2,
  SlidersHorizontal,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useApi } from '../../api/ApiProvider'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import { IllustrativeBadge } from '../../components/ui/IllustrativeBadge'
import './results-explorer.css'

const resultTabs = ['Results Explorer', 'Run History', 'Compare runs', 'Driver / Variance']

export function ResultsExplorer({ onNotify, onCompareChange }) {
  const { projectId, activeProduct } = useWorkspace()
  const { baseUrl, token } = useApi()
  const [view, setView] = useState('Results Explorer')
  const [metric, setMetric] = useState('Net reserve')
  const [runId, setRunId] = useState('')
  const [baselineId, setBaselineId] = useState('')
  const [currentId, setCurrentId] = useState('')
  const [approvedPartialRunIds, setApprovedPartialRunIds] = useState(() => new Set())
  const runsQuery = useApiQuery(`/v1/runs?project_id=${encodeURIComponent(projectId ?? '')}&limit=100`, 5000)
  const runs = runsQuery.data?.runs ?? []
  const productForRun = (run) => run?.product_code ?? run?.model_version?.product_code ?? run?.model?.product_code ?? run?.projection_set?.product_code ?? run?.projection_set?.model_version?.product_code
  const productRuns = activeProduct === 'All' ? runs : runs.filter(run => productForRun(run) === activeProduct)
  const runsWithResults = productRuns.filter((run) => run.results_available)
  const selectedRun = runsWithResults.find((run) => run.id === runId) ?? runsWithResults[0]
  const selectedProduct = productForRun(selectedRun) ?? selectedRun?.summary?.product_code
  const showMygaMetrics = activeProduct === 'MYGA' || selectedProduct === 'MYGA'
  const baselineRun = runsWithResults.find((run) => run.id === baselineId) ?? runsWithResults[1] ?? runsWithResults[0]
  const currentRun = runsWithResults.find((run) => run.id === currentId) ?? runsWithResults[0]
  const selectedBaselineId = baselineRun?.id ?? ''
  const selectedCurrentId = currentRun?.id ?? ''
  const selectedIsPartial = selectedRun?.status === 'partial_success'
  const selectedPartialApproved = Boolean(selectedRun && approvedPartialRunIds.has(selectedRun.id))
  const selectedPartialNeedsApproval = Boolean(selectedIsPartial && !selectedPartialApproved)
  const comparisonRuns = [baselineRun, currentRun].filter(Boolean)
  const partialComparisonRuns = comparisonRuns.filter((run) => run.status === 'partial_success')
  const unapprovedComparisonRuns = partialComparisonRuns.filter((run) => !approvedPartialRunIds.has(run.id))
  const comparisonNeedsApproval = unapprovedComparisonRuns.length > 0
  const comparisonUsesPartial = partialComparisonRuns.length > 0 && !comparisonNeedsApproval
  const selectedIncludePartial = selectedIsPartial && selectedPartialApproved
  const summaryQuery = useApiQuery(selectedRun ? `/v1/runs/${selectedRun.id}/summary` : null, 5000)
  const aggregateQuery = useApiQuery(selectedRun && !selectedPartialNeedsApproval ? `/v1/runs/${selectedRun.id}/aggregates?group_by=projection_year${selectedIncludePartial ? '&include_partial=true' : ''}` : null, 5000)
  const comparisonQuery = useApiQuery(selectedBaselineId && selectedCurrentId && selectedBaselineId !== selectedCurrentId && !comparisonNeedsApproval ? `/v1/comparisons?baseline_run_id=${encodeURIComponent(selectedBaselineId)}&current_run_id=${encodeURIComponent(selectedCurrentId)}${comparisonUsesPartial ? '&include_partial=true' : ''}` : null)
  const summary = summaryQuery.data
  const aggregate = aggregateQuery.data
  const comparison = comparisonQuery.data

  const changeView = (nextView) => {
    const resolvedView = nextView === 'Compare runs' ? 'Compare setup' : nextView
    setView(resolvedView)
    onCompareChange?.(resolvedView === 'Compare setup' || resolvedView === 'Compare results')
  }
  const runComparison = () => {
    setView('Compare results')
    onCompareChange?.(true)
  }
  const approvePartialRuns = (runIds) => {
    setApprovedPartialRunIds((current) => new Set([...current, ...runIds]))
  }
  const scenarioName = (run) => run?.scenario?.name ?? run?.scenario_name ?? '—'
  const statusText = (value) => ({ success: 'Completed', partial_success: 'Partial success', failed: 'Failed', running: 'Running', pending: 'Pending', cancelled: 'Cancelled' }[value] ?? value ?? '—')
  const formatValue = (value, unit) => value == null ? '—' : (unit === 'count' ? new Intl.NumberFormat('en-US').format(value) : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value))
  const exportResults = async () => {
    if (!selectedRun) { onNotify('Select a run with results before exporting.'); return }
    if (selectedRun.status === 'partial_success' && !selectedPartialApproved) { onNotify('Confirm that you want to export incomplete results first.'); return }
    try {
      const response = await fetch(`${baseUrl}/v1/runs/${selectedRun.id}/export.csv?group_by=projection_year${selectedIncludePartial ? '&include_partial=true' : ''}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!response.ok) throw new Error(response.status === 403
        ? 'You do not have permission to export this run. Contact a project administrator if you need access.'
        : `Export failed (${response.status}).`)
      const completeHeader = response.headers.get('X-MentorAmp-Complete')
      const file = await response.blob()
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = `${(selectedRun.name || selectedRun.id).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}.csv`
      link.click()
      URL.revokeObjectURL(url)
      onNotify(completeHeader?.toLowerCase() === 'false'
        ? `Backend results CSV downloaded; the backend marked the data incomplete.${summary?.illustrative ? ' This output is illustrative, not for statutory filing.' : ''}`
        : `Backend results CSV downloaded${summary?.illustrative ? '; this output is illustrative, not for statutory filing.' : ''}`)
    } catch (error) { onNotify(error instanceof Error ? error.message : 'Could not export run results') }
  }

  return (
    <div className={`results-explorer-page flex flex-col gap-3.5 ${view === 'Compare setup' || view === 'Compare results' ? 'results-explorer-comparing' : ''}`}>
      <nav aria-label="Results views" className="results-tabs flex min-h-[46px] items-center justify-between gap-4 overflow-x-auto max-[760px]:items-start max-[760px]:flex-col">
        <div className="flex h-full min-w-max items-center gap-[34px] max-[760px]:w-full max-[760px]:gap-5 max-[760px]:overflow-x-auto">
          {resultTabs.map((tab) => (
            <button aria-current={(tab === 'Compare runs' && (view === 'Compare setup' || view === 'Compare results')) || view === tab ? 'page' : undefined} className={`results-tab ${(tab === 'Compare runs' && (view === 'Compare setup' || view === 'Compare results')) || view === tab ? 'results-tab-active' : ''}`} key={tab} onClick={() => changeView(tab)}>{tab}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="results-run-select">Select run</label>
          <select id="results-run-select" aria-label="Select run" value={selectedRun?.id ?? ''} disabled={!runsWithResults.length} onChange={(event) => setRunId(event.target.value)}>
            {!runsWithResults.length && <option value="">No runs with results</option>}
            {runsWithResults.map((run) => <option key={run.id} value={run.id}>{run.name} · {statusText(run.status)}</option>)}
          </select>
          <button className="results-compare-top button button-primary max-[760px]:w-full" onClick={() => changeView('Compare runs')}><GitCompareArrows size={17} />Compare runs</button>
        </div>
      </nav>

      {selectedIsPartial && <section className="result-panel rounded-[10px] bg-[#fff7df] p-4" role="alert"><b>This run is incomplete.</b><p>Some policies did not finish. {selectedPartialApproved ? 'Incomplete results are included in the displayed summary and aggregates.' : 'Results are hidden until you explicitly choose to show incomplete results.'}</p>{!selectedPartialApproved && <button className="button button-primary" onClick={() => approvePartialRuns([selectedRun.id])}>Show incomplete results</button>}</section>}
      {(view === 'Compare setup' || view === 'Compare results') && partialComparisonRuns.length > 0 && <section className="result-panel rounded-[10px] bg-[#fff7df] p-4" role="alert"><b>This comparison includes incomplete run data.</b><p>{unapprovedComparisonRuns.length ? `Approve incomplete results for ${unapprovedComparisonRuns.map((run) => run.name || run.id).join(', ')} before loading the comparison.` : 'Incomplete results are included in this comparison.'}</p>{unapprovedComparisonRuns.length > 0 && <button className="button button-primary" onClick={() => approvePartialRuns(unapprovedComparisonRuns.map((run) => run.id))}>Show incomplete results</button>}</section>}

      {(runsQuery.loading || runsQuery.error || (!runsQuery.loading && !runsWithResults.length)) && (
        <section className="result-panel rounded-[10px] bg-white p-4" role={runsQuery.error ? 'alert' : undefined}>
          {runsQuery.loading && 'Loading live runs…'}
          {runsQuery.error && `Could not load runs: ${runsQuery.error.message}`}
          {!runsQuery.loading && !runsQuery.error && !runs.length && 'No runs are available for this project yet. Results, comparisons, and exports will appear when backend runs are available.'}
          {!runsQuery.loading && !runsQuery.error && activeProduct !== 'All' && !productRuns.length && `No runs are identified as ${activeProduct} for this project.`}
          {!runsQuery.loading && !runsQuery.error && productRuns.length > 0 && !runsWithResults.length && 'Runs are available, but none has result data yet. Results, comparisons, and exports will appear after a run produces results.'}
        </section>
      )}

      <div className="results-content-grid grid grid-cols-[minmax(0,1fr)_294px] items-start gap-3.5 max-[1150px]:grid-cols-1">
        <main className="flex min-w-0 flex-col gap-3.5">
          {view === 'Results Explorer' && (
            <>
              {summaryQuery.error && <section className="result-panel rounded-[10px] bg-white p-4" role="alert">Could not load the selected run summary: {summaryQuery.error.message}</section>}
              {aggregateQuery.error && <section className="result-panel rounded-[10px] bg-white p-4" role="alert">Could not load the selected run aggregates: {aggregateQuery.error.message}</section>}
              <ExplorerView metric={metric} setMetric={setMetric} run={selectedRun} summary={summary} aggregate={aggregate} summaryLoading={summaryQuery.loading} aggregateLoading={aggregateQuery.loading} comparison={comparison} formatValue={formatValue} onNotify={onNotify} includePartial={!selectedPartialNeedsApproval} showMygaMetrics={showMygaMetrics} />
            </>
          )}
          {view === 'Run History' && <RunHistoryView projectId={projectId} onSelect={(run) => { setRunId(run.id); setView('Results Explorer') }} scenarioName={scenarioName} statusText={statusText} />}
          {view === 'Compare setup' && (
            <CompareRunsSetup
              runs={runsWithResults}
              baselineRun={baselineRun}
              currentRun={currentRun}
              baselineId={selectedBaselineId}
              currentId={selectedCurrentId}
              onBaselineChange={setBaselineId}
              onCurrentChange={setCurrentId}
              comparison={comparison}
              comparisonLoading={comparisonQuery.loading}
              comparisonError={comparisonQuery.error}
              onBack={() => changeView('Results Explorer')}
              onRunComparison={runComparison}
              onNotify={onNotify}
              scenarioName={scenarioName}
            />
          )}
          {view === 'Compare results' && (
            <CompareRunsView
              onNotify={onNotify}
              onBack={() => changeView('Compare runs')}
              onOpenVariance={() => changeView('Driver / Variance')}
              baselineRun={baselineRun}
              currentRun={currentRun}
              comparison={comparison}
              comparisonLoading={comparisonQuery.loading}
              comparisonError={comparisonQuery.error}
              formatValue={formatValue}
              scenarioName={scenarioName}
            />
          )}
          {view === 'Driver / Variance' && <DriverVarianceView comparison={comparison} comparisonLoading={comparisonQuery.loading} comparisonError={comparisonQuery.error} formatValue={formatValue} />}
        </main>

        {view !== 'Compare setup' && view !== 'Compare results' && <aside className="results-right-rail flex flex-col gap-3.5">
          <RunProvenance run={selectedRun} summary={summary} statusText={statusText} onCompare={() => changeView('Compare runs')} onExport={exportResults} onNotify={onNotify} />
          <KeyTakeaways summary={summary} aggregate={aggregate} formatValue={formatValue} />
          <ExploreLinks setView={changeView} onNotify={onNotify} />
        </aside>}
      </div>
    </div>
  )
}
function ExplorerView({ metric, setMetric, run, summary, aggregate, summaryLoading, aggregateLoading, comparison, formatValue, onNotify, includePartial, showMygaMetrics }) {
  const variables = aggregate?.variables ?? []
  const needle = metric.toLowerCase().replace(/[^a-z]/g, '')
  const selectedVariable = variables.find((item) => `${item.name} ${item.display_name}`.toLowerCase().replace(/[^a-z]/g, '').includes(needle)) ?? variables[0]
  const series = (aggregate?.rows ?? []).map((row) => ({ year: row.period_label ?? row.period, value: Number(row.values?.[selectedVariable?.name]) })).filter((point) => Number.isFinite(point.value))
  const number = (value) => value == null ? '—' : formatValue(value, selectedVariable?.unit)
  return (
    <>
      <section className="results-metric-row grid grid-cols-[minmax(0,1fr)_148px_148px] gap-3.5 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
        <MetricHero run={run} summary={summary} loading={summaryLoading} formatValue={formatValue} series={series} />
        <SmallMetric icon={<Target size={25} />} label="Outputs captured" value={summary?.output_variable_count ?? '—'} detail={summary ? `${summary.period_count ?? 0} periods · ${summary.output_row_count?.toLocaleString() ?? 0} rows` : summaryLoading ? 'Loading run summary' : 'No summary available'} />
        <SmallMetric icon={<GitBranch size={25} />} label="Trace coverage" value={summary?.trace?.captured ? `${summary.trace.captured_policy_count ?? 0}` : '—'} detail={summary?.trace?.mode ?? (summaryLoading ? 'Loading trace status' : 'Not captured')} />
      </section>
      {showMygaMetrics && <section className="results-metric-row grid grid-cols-5 gap-3.5 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1" aria-label="MYGA key results">
        {[
          ['Reserve', 'reserve'],
          ['Liability outgo', 'liability_outgo'],
          ['Surrender claims', 'surrender_claims'],
          ['Death claims', 'death_claims'],
          ['Maintenance expense', 'maintenance_expense'],
        ].map(([label, key]) => {
          const total = summary?.totals?.[key]
          const value = typeof total === 'object' && total !== null ? total.value : total
          const resolvedValue = key === 'reserve' && value == null ? summary?.headline?.value : value
          return <SmallMetric key={key} icon={<Target size={20} />} label={label} value={resolvedValue == null ? '—' : formatValue(resolvedValue)} detail={summary?.results_available ? key.replaceAll('_', ' ') : summaryLoading ? 'Loading run summary' : 'Unavailable in this run summary'} />
        })}
      </section>}
      <ProjectionCard metric={metric} setMetric={setMetric} run={run} series={series} selectedVariable={selectedVariable} loading={aggregateLoading} formatValue={number} onNotify={onNotify} />
      {run && <PolicyResultsView key={run.id} run={run} includePartial={includePartial} />}
      <DriverContribution summary={summary} comparison={comparison} formatValue={formatValue} />
    </>
  )
}


function MetricHero({ run, summary, loading, formatValue, series }) {
  const headline = summary?.headline
  const value = headline?.value == null ? '—' : formatValue(headline.value, headline.unit)
  const min = series.length ? Math.min(...series.map((point) => point.value)) : 0
  const max = series.length ? Math.max(...series.map((point) => point.value)) : 1
  const span = max - min || 1
  const sparkline = series.map((point, index) => `${series.length < 2 ? 125 : index * (250 / (series.length - 1))},${44 - ((point.value - min) / span) * 38}`).join(' ')
  return (
    <article className="result-metric-hero flex min-h-44 items-stretch justify-between gap-4 rounded-[10px] p-[22px] max-[520px]:flex-col max-[520px]:p-4">
      <div className="flex min-w-0 flex-col items-start gap-2">
        <span className="text-[13px] text-white">{headline?.label ?? 'Run results'}</span>
        <strong className="text-[40px] font-bold leading-tight text-white max-[520px]:text-[32px]">{loading ? 'Loading…' : value}</strong>
        <b className="text-[16px] text-[#9bfa00] max-[520px]:text-[15px]">{summary?.illustrative ? <IllustrativeBadge /> : summary?.results_available ? 'Live backend results' : run ? 'No result rows available' : 'No run selected'}</b>
        <small className="text-[11px] text-[#cad5d0]">{run?.name ?? 'Select a backend run'}{headline?.as_of ? ` · ${headline.as_of}` : ''}</small>
      </div>
      <div className="result-sparkline flex w-[250px] shrink-0 flex-col items-start gap-3 max-[520px]:w-full">
        <span className="result-comparison-select">{headline?.unit ?? 'Backend summary'} <ChevronDown size={13} /></span>
        <svg aria-label={series.length ? 'Selected run output across available periods' : 'No run trend data available'} className="h-12 w-full" role="img" viewBox="0 0 250 48">{series.length > 1 && <polyline points={sparkline} />}</svg>
        <span className="self-end text-xs text-[#9bfa00]">{summary?.policy_count != null ? `${summary.policy_count.toLocaleString()} policies` : 'Live run'}</span>
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

function ProjectionCard({ metric, setMetric, run, series, selectedVariable, loading, formatValue, onNotify }) {
  const first = series[0]?.value
  const last = series[series.length - 1]?.value
  const delta = first != null && last != null ? last - first : null
  const percent = first && delta != null ? delta / first * 100 : null
  return (
    <section className="result-panel rounded-[10px] bg-white p-[18px]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-[17px] font-bold text-[#07112f]">{selectedVariable?.display_name ?? metric}</h2><p className="mt-1 text-[11px] text-[#71809f]">{run?.name ?? 'No run selected'} · {selectedVariable ? `${selectedVariable.unit ?? 'value'} by projection period` : 'Projection data supplied by the selected run'}</p></div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="result-metric">Metric</label>
          <select className="result-chart-select" id="result-metric" onChange={(event) => setMetric(event.target.value)} value={metric}><option>Net reserve</option><option>Policy cash flow</option><option>Reserve change</option></select>
          <span className="result-chart-kind"><LineChart size={16} />Line chart</span>
          <button aria-label="More chart options" className="result-chart-more" onClick={() => onNotify('Additional chart options are not available in the current backend.') }><MoreVertical size={19} /></button>
        </div>
      </div>
      <ProjectionChart series={series} loading={loading} formatValue={formatValue} />
      <div className="result-summary-strip grid grid-cols-4 gap-4 border-t border-[#dde4ea] pt-3.5 max-[520px]:grid-cols-2">
        <SummaryValue value={series.length ? formatValue(first) : '—'} label={<>First period<br />{series[0]?.year ?? 'No data'}</>} />
        <SummaryValue value={series.length ? formatValue(last) : '—'} label={<>Latest period<br />{series[series.length - 1]?.year ?? 'No data'}</>} />
        <SummaryValue value={delta == null ? '—' : formatValue(delta)} label={<>Change<br />across available periods</>} positive={delta != null && delta >= 0} />
        <SummaryValue value={percent == null ? '—' : `${percent.toFixed(1)}%`} label={<>Percent change<br />across available periods</>} />
      </div>
    </section>
  )
}


function ProjectionChart({ series = [], loading = false, formatValue = (value) => String(value) }) {
  const min = series.length ? Math.min(0, ...series.map((point) => point.value)) : 0
  const max = series.length ? Math.max(...series.map((point) => point.value)) : 1
  const span = max - min || 1
  const points = series.map((point, index) => `${series.length < 2 ? 400 : index * (800 / (series.length - 1))},${210 - ((point.value - min) / span) * 190}`).join(' ')
  return (
    <div className="projection-chart-wrap">
      <div className="projection-y-labels" aria-hidden="true"><span>{series.length ? formatValue(max) : '—'}</span><span>{series.length ? formatValue(max * .75) : '—'}</span><span>{series.length ? formatValue(max * .5) : '—'}</span><span>{series.length ? formatValue(max * .25) : '—'}</span><span>{series.length ? formatValue(min) : '—'}</span></div>
      <div className="projection-chart">
        <svg aria-label={series.length ? 'Backend projection over time' : 'Projection data unavailable'} className="h-full w-full" role="img" preserveAspectRatio="none" viewBox="0 0 800 236">
          {[0, 42, 84, 126, 168, 210].map((line) => <line className="projection-grid-line" key={`horizontal-${line}`} x1="0" x2="800" y1={line} y2={line} />)}
          {series.map((point, index) => <line className="projection-grid-line projection-grid-vertical" key={`${point.year}-${index}`} x1={series.length < 2 ? 400 : index * (800 / (series.length - 1))} x2={series.length < 2 ? 400 : index * (800 / (series.length - 1))} y1="0" y2="210" />)}
          {series.length > 1 && <polyline className="projection-line" points={points} />}
          {series.length > 0 && <circle className="projection-point" cx={series.length < 2 ? 400 : 0} cy={210 - ((series[0].value - min) / span) * 190} r="5" />}
        </svg>
        <div className="projection-tooltip"><small>{series[0]?.year ?? (loading ? 'Loading' : 'No backend data')}</small><b>{series.length ? formatValue(series[0].value) : loading ? 'Loading…' : 'Unavailable'}</b></div>
      </div>
      <div className="projection-x-labels" aria-hidden="true">{series.length ? series.map((point, index) => <span key={`${point.year}-${index}`}>{point.year}</span>) : <span>{loading ? 'Loading backend aggregates…' : 'No projection periods available'}</span>}</div>
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

function DriverContribution({ summary, comparison, formatValue }) {
  const total = comparison?.totals?.[0]
  const baseline = total?.baseline
  const current = total?.current
  const difference = total?.difference
  return (
    <section className="result-panel rounded-[10px] bg-white p-[18px]">
      <h2 className="text-[17px] font-bold text-[#07112f]">Driver contribution to change</h2>
      <p className="mt-1 text-[10px] text-[#71809f]">Backend comparison results; actuarial driver attribution is not available unless supplied by the backend.</p>
      <div className="waterfall-chart mt-4 grid grid-cols-6 items-end gap-3 max-[520px]:grid-cols-3">
        {baseline != null && <WaterfallBar label="Baseline" amount={formatValue(baseline)} type="total" height="48%" />}
        {current != null && <WaterfallBar label="Current" amount={formatValue(current)} type="total" height="62%" />}
        {difference != null && <WaterfallBar label="Difference" amount={formatValue(difference)} type={difference >= 0 ? 'positive' : 'negative'} height="35%" />}
        {comparison?.changed_inputs?.length ? comparison.changed_inputs.slice(0, 3).map((item) => <WaterfallBar key={item.variable} label={item.variable} amount={`${item.baseline ?? '—'} → ${item.current ?? '—'}`} type="negative" height="26%" />) : !comparison && <div className="col-span-full text-sm text-[#71809f]">Select two different runs in Compare runs to load backend comparison values. {summary?.trace?.captured ? 'Trace data is available for this run.' : 'No causal decomposition is included in the run summary.'}</div>}
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

function RunProvenance({ run, summary, statusText, onCompare, onExport, onNotify }) {
  const model = [run?.model_version?.model_name, run?.model_version?.version_label].filter(Boolean).join(' ') || run?.model_version_name || run?.model_version_id || 'Model details unavailable'
  const date = run?.valuation_date ?? run?.created_at ?? '—'
  return (
    <section className="result-panel flex flex-col gap-3 rounded-[10px] bg-white p-4">
      <h2 className="rail-eyebrow">Run provenance</h2>
      <p className="provenance-copy">Run {run?.name ?? '—'}<br />{model}<br />{run?.projection_set?.name ?? run?.projection_set_name ?? 'Projection Set unavailable'}<br />{run?.scenario?.name ?? run?.scenario_name ?? 'Scenario unavailable'}<br /><span><CalendarDays size={15} />{date ? new Date(date).toLocaleDateString() : '—'}</span></p>
      <div className="provenance-status"><span>Status</span><StatusBadge status={statusText(run?.status)} /></div>
      <div className="results-callout"><GitCompareArrows size={20} /><span><b>{summary?.results_available ? 'Backend results available' : 'Waiting for run results'}</b><small>{summary?.output_row_count?.toLocaleString() ?? 0} result rows · {summary?.illustrative ? <IllustrativeBadge /> : 'Run output'}</small></span></div>
      <button className="result-action result-action-primary" onClick={onCompare}><GitBranch size={17} />Compare runs</button>
      <button className="result-action" title={summary?.illustrative ? 'Illustrative output is not certified for statutory filing.' : undefined} onClick={onExport} disabled={!run?.results_available}><Download size={17} />Export results{summary?.illustrative ? ' · Illustrative' : ''}</button>
      <button className="result-action" onClick={() => onNotify('Scratchpad is not available in this build')}><Plus size={17} />Add to Scratchpad</button>
    </section>
  )
}


function KeyTakeaways({ summary, aggregate, formatValue }) {
  const first = aggregate?.rows?.[0]
  const last = aggregate?.rows?.[aggregate.rows.length - 1]
  const firstVariable = aggregate?.variables?.[0]
  const firstValue = firstVariable ? first?.values?.[firstVariable.name] : null
  const lastValue = firstVariable ? last?.values?.[firstVariable.name] : null
  const delta = firstValue != null && lastValue != null ? lastValue - firstValue : null
  const takeaways = [
    { icon: <TrendingUp size={21} />, title: 'Run output', detail: summary?.headline?.value != null ? `${summary.headline.label}: ${formatValue(summary.headline.value, summary.headline.unit)}.` : 'A headline output is not available for this run.' },
    { icon: <TrendingDown size={21} />, title: 'Projection change', detail: delta != null ? `${firstVariable.display_name}: ${formatValue(delta, firstVariable.unit)} across available periods.` : 'Period-over-period change is not available.' },
    { icon: <ArrowUpRightIcon />, title: 'Trace coverage', detail: summary?.trace?.captured ? `${summary.trace.captured_policy_count ?? 0} policies captured in ${summary.trace.mode ?? 'backend trace'}.` : 'No trace data was captured for this run.' },
  ]
  return <section className="result-panel flex flex-col gap-3 rounded-[10px] bg-white p-4"><h2 className="rail-eyebrow">Key takeaways</h2>{takeaways.map((item) => <div className="takeaway-row" key={item.title}><span className="takeaway-icon">{item.icon}</span><span><b>{item.title}</b><small>{item.detail}</small></span></div>)}</section>
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

function PolicyResultsView({ run, includePartial }) {
  const [draftFilters, setDraftFilters] = useState({ policyId: '', variable: '', monthFrom: '', monthTo: '' })
  const [filters, setFilters] = useState(draftFilters)
  const [offset, setOffset] = useState(0)
  const params = new URLSearchParams({ limit: '50', offset: String(offset) })
  if (filters.policyId.trim()) params.set('policy_id', filters.policyId.trim())
  if (filters.variable.trim()) params.set('variable', filters.variable.trim())
  if (filters.monthFrom !== '') params.set('month_from', filters.monthFrom)
  if (filters.monthTo !== '') params.set('month_to', filters.monthTo)
  if (includePartial && run.status === 'partial_success') params.set('include_partial', 'true')
  const resultQuery = useApiQuery(run.id && includePartial ? `/v1/runs/${encodeURIComponent(run.id)}/results?${params.toString()}` : null)
  const rows = resultQuery.data?.rows ?? []
  const total = resultQuery.data?.total ?? 0
  const pageSize = resultQuery.data?.limit ?? 50
  const applyFilters = event => {
    event.preventDefault()
    setOffset(0)
    setFilters({ ...draftFilters })
  }

  return (
    <section className="result-panel rounded-[10px] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3"><div><h2 className="text-base font-bold">Policy-level results</h2><p className="text-xs text-[#71809f]">Paged result rows from the selected backend run.</p></div><small>{total.toLocaleString()} rows</small></div>
      {run.status === 'partial_success' && !includePartial && <p role="status">Policy rows are hidden until you choose “Show incomplete results” above.</p>}
      <form className="result-row-filters" onSubmit={applyFilters}>
        <label>Policy ID<input value={draftFilters.policyId} onChange={event => setDraftFilters(current => ({ ...current, policyId: event.target.value }))} /></label>
        <label>Variable<input value={draftFilters.variable} onChange={event => setDraftFilters(current => ({ ...current, variable: event.target.value }))} /></label>
        <label>Month from<input type="number" min="0" value={draftFilters.monthFrom} onChange={event => setDraftFilters(current => ({ ...current, monthFrom: event.target.value }))} /></label>
        <label>Month to<input type="number" min="0" value={draftFilters.monthTo} onChange={event => setDraftFilters(current => ({ ...current, monthTo: event.target.value }))} /></label>
        <button type="submit">Apply row filters</button>
      </form>
      {resultQuery.loading && <p role="status">Loading policy rows…</p>}
      {resultQuery.error && <p role="alert">Could not load policy rows: {resultQuery.error.message}</p>}
      {resultQuery.data && <p className="text-xs text-[#71809f]">Backend completeness: {resultQuery.data.complete ? 'complete' : 'incomplete'} · Showing {rows.length ? offset + 1 : 0}–{offset + rows.length} of {total}</p>}
      {!resultQuery.loading && !resultQuery.error && includePartial && rows.length > 0 && <div className="result-row-table-wrap"><table><thead><tr><th>Policy</th><th>Month</th><th>Year</th><th>Period end</th><th>Variable</th><th>Value</th><th>Unit</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.policy_id}-${row.month}-${row.variable}-${index}`}><td>{row.policy_id}</td><td>{row.month}</td><td>{row.projection_year}</td><td>{row.period_end_date}</td><td>{row.variable}</td><td>{row.value == null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(row.value)}</td><td>{row.unit}</td></tr>)}</tbody></table></div>}
      {!resultQuery.loading && !resultQuery.error && includePartial && resultQuery.data && !rows.length && <p>No policy rows match the current filters.</p>}
      {includePartial && total > pageSize && <div className="result-row-pagination"><button disabled={offset === 0 || resultQuery.loading} onClick={() => setOffset(Math.max(0, offset - pageSize))}>Previous page</button><span>Page {Math.floor(offset / pageSize) + 1} of {Math.ceil(total / pageSize)}</span><button disabled={offset + pageSize >= total || resultQuery.loading} onClick={() => setOffset(offset + pageSize)}>Next page</button></div>}
    </section>
  )
}

function RunHistoryView({ projectId, onSelect, scenarioName, statusText }) {
  const [draftFilters, setDraftFilters] = useState({ status: '', projectionSetId: '', modelVersionId: '', runSetId: '' })
  const [filters, setFilters] = useState(draftFilters)
  const params = new URLSearchParams({ project_id: projectId ?? '', limit: '100' })
  if (filters.status) params.set('status', filters.status)
  if (filters.projectionSetId.trim()) params.set('projection_set_id', filters.projectionSetId.trim())
  if (filters.modelVersionId.trim()) params.set('model_version_id', filters.modelVersionId.trim())
  if (filters.runSetId.trim()) params.set('run_set_id', filters.runSetId.trim())
  const historyQuery = useApiQuery(projectId ? `/v1/runs?${params.toString()}` : null, 5000)
  const runs = historyQuery.data?.runs ?? []
  const applyFilters = event => {
    event.preventDefault()
    setFilters({ ...draftFilters })
  }
  const clearFilters = () => {
    const empty = { status: '', projectionSetId: '', modelVersionId: '', runSetId: '' }
    setDraftFilters(empty)
    setFilters(empty)
  }

  return (
    <section className="result-panel rounded-[10px] bg-white p-5">
      <div className="mb-4"><h2 className="text-lg font-bold">Run History</h2><p className="text-sm text-[#71809f]">Filter using backend run status and ID fields.</p></div>
      <form className="result-row-filters result-history-filters" onSubmit={applyFilters}>
        <label>Status<select value={draftFilters.status} onChange={event => setDraftFilters(current => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{['pending', 'running', 'success', 'partial_success', 'failed', 'cancelled'].map(status => <option key={status} value={status}>{statusText(status)}</option>)}</select></label>
        <label>Projection Set ID<input value={draftFilters.projectionSetId} onChange={event => setDraftFilters(current => ({ ...current, projectionSetId: event.target.value }))} /></label>
        <label>Model version ID<input value={draftFilters.modelVersionId} onChange={event => setDraftFilters(current => ({ ...current, modelVersionId: event.target.value }))} /></label>
        <label>Run Set ID<input value={draftFilters.runSetId} onChange={event => setDraftFilters(current => ({ ...current, runSetId: event.target.value }))} /></label>
        <button type="submit">Apply filters</button><button type="button" onClick={clearFilters}>Clear</button>
      </form>
      {historyQuery.error && <p role="alert">Could not load run history: {historyQuery.error.message}</p>}
      <div className="flex flex-col">{historyQuery.loading && <p className="py-4">Loading backend run history…</p>}{runs.map((run) => <div className="history-row grid grid-cols-[1.1fr_1fr_1fr_120px_110px] items-center gap-3 py-4 max-[760px]:grid-cols-2" key={run.id}><span><b>{run.name}</b><small>{run.projection_set?.name ?? run.projection_set_name ?? run.id}</small></span><span className="max-[760px]:hidden">{scenarioName(run)}</span><span className="max-[760px]:hidden">{run.valuation_date ?? '—'}</span><StatusBadge status={statusText(run.status)} /><button className="history-open" disabled={!run.results_available} onClick={() => onSelect(run)}>{run.results_available ? 'Open results' : 'Results unavailable'} <ArrowRight size={14} /></button></div>)}{!historyQuery.loading && !historyQuery.error && !runs.length && <p className="py-4">No backend runs match these filters.</p>}</div>
      {historyQuery.data && <small className="text-xs text-[#71809f]">Showing {runs.length} of {historyQuery.data.total} runs.</small>}
    </section>
  )
}


function CompareRunsSetup({ onBack, onRunComparison, onNotify, runs, baselineRun, currentRun, baselineId, currentId, onBaselineChange, onCurrentChange, comparison, comparisonLoading, comparisonError, scenarioName }) {
  const canCompare = !!baselineRun && !!currentRun && baselineId !== currentId && !!baselineRun.results_available && !!currentRun.results_available
  const inputs = comparison?.changed_inputs ?? []
  return (
    <div className="results-run-setup">
      <div className="run-setup-heading"><div><span>RESULTS WORKSPACE</span><h2>Compare runs</h2><p>Select backend runs with available result rows. Comparison values come from the backend.</p></div><div className="run-setup-header-actions"><button className="run-comparison-search" onClick={() => onNotify('Search runs are available in the run selector.')}><Search size={15} />Search</button><button className="run-comparison-search" onClick={() => onNotify('Comparison sharing is not available in this backend.')}><Share2 size={15} />Share</button><button className="run-comparison-search" onClick={() => onNotify('Comparison view options are not available.')}><SlidersHorizontal size={15} />View</button><button className="run-save-investigation" onClick={() => onNotify('Saving investigations is not available in this backend.')}><Save size={15} />Save to investigation</button></div></div>
      <section className="run-setup-card result-panel"><header className="run-setup-card-heading"><div className="run-setup-card-title"><span><GitCompareArrows size={18} /></span><div><h3>Comparison setup</h3><p>Select two runs with available results to compare their backend outputs.</p></div></div><div className="run-setup-status"><span className={canCompare ? '' : 'run-setup-status-blocked'}>{canCompare ? <Check size={13} /> : <Info size={13} />}{canCompare ? 'Can compare' : 'Select two runs with results'}</span><small>{comparisonLoading ? 'Loading comparison from backend' : comparisonError ? 'Backend comparison is unavailable' : canCompare ? 'Backend results are ready to compare' : 'Choose distinct completed runs with result rows'}</small><button className="run-setup-submit" disabled={!canCompare} onClick={onRunComparison}><Play size={14} fill="currentColor" />Run comparison</button></div></header>
        <div className="run-setup-columns"><RunSetupSelection title="Baseline run" value={baselineId} onChange={onBaselineChange} runs={runs} selectedRun={baselineRun} scenarioName={scenarioName} /><RunSetupSelection title="Current run" value={currentId} onChange={onCurrentChange} runs={runs} selectedRun={currentRun} scenarioName={scenarioName} /><div className="run-setup-match-panel"><span className="run-setup-match-title">BACKEND COMPARISON</span><div><small>Scenario</small><b>{baselineRun ? scenarioName(baselineRun) : '—'} → {currentRun ? scenarioName(currentRun) : '—'}</b><i><Check size={12} /></i></div><div><small>Outputs</small><b>{comparison?.totals?.length ?? '—'}</b><i><Check size={12} /></i></div><div><small>Changed inputs</small><b>{inputs.length}</b><i><Check size={12} /></i></div><div><small>Same Projection Set</small><b>{comparison ? (comparison.same_projection_set ? 'Yes' : 'No') : 'Pending'}</b><i><Check size={12} /></i></div></div></div>
      </section>
      <section className="run-setup-config result-panel"><div className="run-setup-section-heading"><div><h3>Configuration comparison</h3><p>Backend-reported changed inputs are shown when available.</p></div><span><Check size={13} />{inputs.length} changes <b>{comparison?.complete ? 'Complete' : 'Backend data'}</b></span></div><div className="run-config-table-wrap"><table className="run-config-table"><thead><tr><th>Setting</th><th>Baseline run</th><th>Current run</th><th>Match</th></tr></thead><tbody>{inputs.map((item) => <tr key={item.variable}><th>{item.variable}</th><td>{item.baseline ?? '—'}</td><td>{item.current ?? '—'}</td><td><span className="run-config-different">× Different</span></td></tr>)}{!inputs.length && <tr><th>Configuration details</th><td colSpan="3">{comparisonLoading ? 'Loading backend comparison…' : comparisonError ? comparisonError.message : comparison ? 'No changed inputs reported by the backend.' : 'Not provided by the backend until two runs are selected.'}</td></tr>}</tbody></table></div><small className="run-config-footnote">Showing backend-reported input differences only</small></section>
      <footer className="run-setup-footer"><button className="run-setup-back" onClick={onBack}><ArrowLeft size={15} />Back to results</button><div><button className="run-setup-save" onClick={() => onNotify('Saving comparisons is not available in this backend.')}><Save size={15} />Save comparison</button><button className="run-setup-save run-setup-investigation" onClick={() => onNotify('Adding investigations is not available in this backend.')}><Plus size={15} />Add to investigation</button><button className="run-setup-submit" disabled={!canCompare} onClick={onRunComparison}><Play size={14} fill="currentColor" />Compare runs</button></div></footer>
    </div>
  )
}


function RunSetupSelection({ title, value, onChange, runs, selectedRun, scenarioName }) {
  const model = [selectedRun?.model_version?.model_name, selectedRun?.model_version?.version_label].filter(Boolean).join(' ') || selectedRun?.model_version_name || selectedRun?.model_version_id || 'Unavailable'
  return (
    <div className="run-setup-selection"><div className="run-setup-selection-heading"><span>{title}</span><small>{title === 'Baseline run' ? 'Reference' : 'Compared against baseline'}</small></div><label className="run-setup-select-wrap"><select aria-label={title} value={value ?? ''} onChange={(event) => onChange(event.target.value)}><option value="">Select a run</option>{runs.map((run) => <option key={run.id} value={run.id}>{run.name} · {run.status}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label><dl><div><dt>Model</dt><dd>{model}</dd></div><div><dt>Projection Set</dt><dd>{selectedRun?.projection_set?.name ?? selectedRun?.projection_set_name ?? 'Unavailable'}</dd></div><div><dt>Scenario</dt><dd>{selectedRun ? scenarioName(selectedRun) : 'Unavailable'}</dd></div><div><dt>Results</dt><dd>{selectedRun?.results_available ? 'Available' : 'Unavailable'}</dd></div></dl></div>
  )
}


function CompareRunsView({ onNotify, onBack, onOpenVariance, baselineRun, currentRun, comparison, comparisonLoading, comparisonError, formatValue, scenarioName }) {
  const first = comparison?.totals?.[0]
  const differencePercent = first?.difference_pct
  const relative = differencePercent == null ? '—' : `${differencePercent > 0 ? '+' : ''}${differencePercent.toFixed(1)}%`
  const inputs = comparison?.changed_inputs ?? []
  return (
    <div className="results-run-comparison">
      <div className="run-comparison-heading"><div><span>RESULTS</span><h2>{baselineRun?.name ?? 'Baseline'} vs {currentRun?.name ?? 'Current'}</h2><p>{scenarioName(baselineRun)} vs {scenarioName(currentRun)} · values supplied by backend comparison</p></div><div className="run-comparison-result-actions"><button className="run-setup-back" onClick={onBack}><ArrowLeft size={15} />Back to setup</button><button className="run-save-investigation" onClick={() => onNotify('Saving investigations is not available in this backend.')}><Save size={15} />Save to investigation</button></div></div>
      {(comparisonLoading || comparisonError || !comparison) && <section className="result-panel rounded-[10px] bg-white p-4">{comparisonLoading ? 'Loading backend comparison…' : comparisonError ? `Could not load backend comparison: ${comparisonError.message}` : 'Select two distinct runs with results in Comparison setup.'}</section>}
      <section className="run-comparison-overview result-panel"><div className="run-overview-scenario"><span className="run-overview-icon run-overview-base"><GitCompareArrows size={21} /></span><div><small>{scenarioName(baselineRun)}</small><strong>{first ? formatValue(first.baseline) : '—'}</strong><p>{first?.label ?? 'Backend output'} <b>Baseline</b></p></div></div><span className="run-overview-vs">VS</span><div className="run-overview-scenario"><span className="run-overview-icon run-overview-low"><TrendingDown size={21} /></span><div><small>{scenarioName(currentRun)}</small><strong>{first ? formatValue(first.current) : '—'}</strong><p>{first?.label ?? 'Backend output'}</p></div></div><div className="run-overview-difference"><small>Difference</small><strong>{relative}</strong><span>{first ? formatValue(first.difference) : '—'}</span></div></section>
      <div className="run-comparison-grid"><main className="run-comparison-main"><section className="run-comparison-chart result-panel"><div className="run-comparison-card-heading"><div><h3>Run output comparison</h3><p>Backend comparison totals</p></div><button onClick={() => onNotify('Only output totals provided by the backend are available in this comparison view.')}>{first?.label ?? 'Output'}<ChevronDown size={13} /></button></div><RunComparisonChart totals={comparison?.totals ?? []} formatValue={formatValue} loading={comparisonLoading} /></section>
        <section className="run-comparison-metrics result-panel"><h3>Key result metrics</h3><div className="run-metric-strip"><RunMetric icon={<TrendingUp size={17} />} value={first ? formatValue(first.baseline) : '—'} label={baselineRun?.name ?? 'Baseline run'} detail={first?.label ?? 'Backend output'} /><RunMetric icon={<TrendingDown size={17} />} value={first ? formatValue(first.current) : '—'} label={currentRun?.name ?? 'Current run'} detail={first?.label ?? 'Backend output'} /><RunMetric negative icon={<ChartNoAxesColumn size={17} />} value={relative} label="Relative difference" detail={first ? formatValue(first.difference) : 'No difference data'} /><RunMetric icon={<LineChart size={17} />} value={comparison ? `${comparison.totals?.length ?? 0}` : '—'} label="Compared outputs" detail={comparison?.complete ? 'Complete comparison' : 'Backend comparison status'} /></div></section>
        <section className="run-comparison-dimensions result-panel"><h3>Changed dimensions</h3><p>Backend-reported scenario-overridden inputs; this is not actuarial driver attribution.</p><div className="run-dimension-list">{inputs.map((item) => <RunDimension key={item.variable} icon={<ActivityIcon />} title={item.variable} value={`${item.baseline ?? '—'} → ${item.current ?? '—'}`} detail={item.source ?? 'Backend-reported input change'} onNotify={onNotify} />)}{!inputs.length && <p>{comparison ? 'No changed inputs were reported.' : 'Changed inputs will appear when a backend comparison is available.'}</p>}</div></section></main>
        <aside className="run-comparison-actions result-panel"><h3>Actions</h3><button onClick={onOpenVariance}><span><ChartNoAxesColumn size={17} /></span><b>Open driver variance<small>Review backend totals and input changes</small></b><ChevronRight size={15} /></button><button onClick={() => onNotify('Trace comparison is not available from the current backend endpoint.')}><span><Network size={17} /></span><b>Trace result<small>Lineage comparison is unavailable</small></b><ChevronRight size={15} /></button><button onClick={() => onNotify('Saving investigations is not available in this backend.')}><span><Save size={17} /></span><b>Save to investigation<small>Investigation saving is unavailable</small></b><ChevronRight size={15} /></button><div className="run-comparison-context"><b><Info size={14} />Comparison context</b><p>{baselineRun?.name ?? '—'}<br />{currentRun?.name ?? '—'}<br />Same Projection Set: {comparison ? (comparison.same_projection_set ? 'Yes' : 'No') : 'Pending'}<br />{comparison?.illustrative ? 'Illustrative data' : 'Backend comparison'}</p></div></aside>
      </div>
    </div>
  )
}


function RunComparisonChart({ totals, formatValue, loading }) {
  return <div className="run-comparison-plot"><div className="run-chart-y-labels"><span>Backend</span><span>output</span><span>totals</span></div><div className="run-chart-area"><svg viewBox="0 0 800 210" preserveAspectRatio="none" role="img" aria-label="Backend run output totals"><line className="run-chart-grid" x1="0" x2="800" y1="42" y2="42" /><line className="run-chart-grid" x1="0" x2="800" y1="105" y2="105" /><line className="run-chart-grid" x1="0" x2="800" y1="168" y2="168" /></svg><div className="run-chart-tooltip"><small>{loading ? 'Loading' : totals.length ? totals[0].label : 'Unavailable'}</small><b>{loading ? 'Loading…' : totals.length ? `${formatValue(totals[0].baseline)} / ${formatValue(totals[0].current)}` : 'No period series returned'}</b></div><div className="run-chart-x-labels"><span>Backend totals</span><span>Period-series chart unavailable</span></div></div><div className="run-chart-legend"><span><i />{totals.length ? 'Baseline total' : 'No projection data'}</span><span><i />{totals.length ? 'Current total' : 'No projection data'}</span></div></div>
}


function RunMetric({ icon, value, label, detail, negative = false }) {
  return <div className={`run-metric ${negative ? 'run-metric-negative' : ''}`}><span>{icon}</span><div><b>{value}</b><strong>{label}</strong><small>{detail}</small></div></div>
}

function RunDimension({ icon, title, value, detail, onNotify }) {
  return <button className="run-dimension" onClick={() => onNotify(`${title} scenario assumption details opened`)}><span>{icon}</span><div><small>{title}</small><b>{value}</b><p>{detail}<br />(scenario assumption)</p></div><ChevronRight size={15} /></button>
}

function ActivityIcon() {
  return <ArrowUpRight size={17} />
}

function DriverVarianceView({ comparison, comparisonLoading, comparisonError, formatValue }) {
  return <section className="result-panel rounded-[10px] bg-white p-5"><div className="mb-4"><span className="rail-eyebrow">Driver / Variance</span><h2 className="mt-2 text-xl font-bold">Driver contribution to change</h2><p className="mt-1 text-sm text-[#71809f]">The backend exposes run-total differences and changed inputs; causal actuarial driver attribution is unavailable.</p></div>{comparisonLoading && <p>Loading backend comparison…</p>}{comparisonError && <p role="alert">{comparisonError.message}</p>}<div className="grid h-[360px] grid-cols-6 items-end gap-4 max-[520px]:grid-cols-3">{(comparison?.totals ?? []).slice(0, 6).map((item, index) => <WaterfallBar key={item.variable} label={item.label} amount={`${formatValue(item.difference)} (${item.difference_pct == null ? '—' : `${item.difference_pct.toFixed(1)}%`})`} type={item.difference >= 0 ? 'positive' : 'negative'} height={`${Math.max(18, 30 + index * 6)}%`} />)}{!comparison && !comparisonLoading && <p className="col-span-full text-sm text-[#71809f]">Select two runs from Compare runs to display backend comparison totals.</p>}</div>{comparison?.changed_inputs?.length > 0 && <div className="mt-4"><h3 className="font-bold">Changed inputs</h3>{comparison.changed_inputs.map((item) => <p key={item.variable}><b>{item.variable}</b>: {item.baseline ?? '—'} → {item.current ?? '—'}</p>)}</div>}</section>
}
