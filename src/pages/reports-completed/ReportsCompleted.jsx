import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  Download,
  Eye,
  FileText,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Share2,
  X,
} from 'lucide-react'
import './reports-completed.css'
import { useApi } from '../../api/ApiProvider'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'

const initialReports = [
  {
    name: 'GAAP Reserve – Executive Summary',
    shortName: 'Executive Summary',
    source: 'Q4 2026 GAAP Reserve',
    scope: 'MYGA Base · Base scenario',
    generated: 'Dec 31, 2026 · 10:46 AM',
    completed: 'Dec 31, 2026 · 10:44 AM',
    status: 'Validated',
    formats: ['PDF', 'XLSX'],
    description: 'Reserve monitoring, cash flow and solvency executive review',
    sourceRun: 'Q4 2026 GAAP Reserve – MYGA Base',
    model: 'Model v2.2 · MYGA Base',
    pdfSize: '1 MB',
    xlsxSize: '4 MB',
    selected: true,
  },
  {
    name: 'Scenario Variance Pack',
    shortName: 'Scenario Variance Pack',
    source: 'Q4 2026 GAAP Reserve',
    scope: 'Q4 stress testing',
    generated: 'Dec 31, 2026 · 10:42 AM',
    completed: 'Dec 31, 2026 · 10:39 AM',
    status: 'Draft',
    formats: ['XLSX', 'CSV'],
    description: 'Scenario-by-scenario sensitivity and reserve movement analysis',
    sourceRun: 'Q4 2026 GAAP Reserve – Stress Tests',
    model: 'Model v2.2 · MYGA Base',
    pdfSize: '—',
    xlsxSize: '2 MB',
  },
  {
    name: 'Solvency Summary',
    shortName: 'Solvency Summary',
    source: 'Q4 2026 GAAP Reserve',
    scope: 'Pricing evaluation',
    generated: 'Dec 30, 2026 · 05:35 PM',
    completed: 'Dec 30, 2026 · 05:32 PM',
    status: 'Needs review',
    formats: ['PDF'],
    description: 'Capital adequacy and solvency margin review',
    sourceRun: 'Q4 2026 GAAP Reserve – Pricing Evaluation',
    model: 'Model v2.2 · MYGA Base',
    pdfSize: '2 MB',
    xlsxSize: '—',
  },
]

const recentExports = [
  'Reserve Sensitivity Report',
  'Assumption Sensitivity',
  'Expense Analysis',
  'Monthly Performance',
  'Capital Adequacy',
]

const reportTabs = [
  'Report Library',
  'Projection / Policyholder',
  'Run set evaluation',
  'Completed Reports',
]

export function ReportsCompleted({ onNotify }) {
  const { projectId } = useWorkspace()
  const { baseUrl, token } = useApi()
  const runsQuery = useApiQuery(projectId ? `/v1/runs?project_id=${encodeURIComponent(projectId)}&limit=100` : null, 5000)
  const reports = (runsQuery.data?.runs ?? []).filter((run) => run.results_available).map((run) => ({
    id: run.id,
    runId: run.id,
    name: run.name,
    shortName: run.name,
    source: run.projection_set?.name || run.projection_set_name || run.projection_set_id || 'Projection Set',
    scope: run.scenario?.name || run.scenario_name || '—',
    generated: run.created_at || '',
    completed: run.completed_at || '',
    status: ({ success: 'Completed', partial_success: 'Partial success', failed: 'Failed', running: 'Running', queued: 'Queued' }[run.status] ?? run.status ?? 'Unavailable'),
    formats: ['CSV'],
    description: run.illustrative ? 'Illustrative backend result export; not a formal actuarial report.' : 'Backend result export; not a generated PDF/XLSX report.',
    sourceRun: run.name,
    model: [run.model_version?.model_name, run.model_version?.version_label].filter(Boolean).join(' ') || run.model_version_name || run.model_version_id || '—',
    illustrative: run.illustrative,
    pdfSize: 'Unavailable',
    xlsxSize: 'Unavailable',
  }))
  const [selectedReport, setSelectedReport] = useState(null)
  const [activeTab, setActiveTab] = useState('Completed Reports')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortNewest, setSortNewest] = useState(true)
  const selectedSummaryQuery = useApiQuery(selectedReport?.runId ? `/v1/runs/${selectedReport.runId}/summary` : null)
  const selectedAggregateQuery = useApiQuery(selectedReport?.runId ? `/v1/runs/${selectedReport.runId}/aggregates?group_by=projection_year` : null)

  useEffect(() => {
    if (!selectedReport && reports[0]) setSelectedReport(reports[0])
    else if (selectedReport && !reports.some((report) => report.runId === selectedReport.runId)) setSelectedReport(reports[0] ?? null)
  }, [reports, selectedReport])

  const visibleReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return reports
      .filter((report) => {
        const matchesStatus = statusFilter === 'All statuses' || report.status === statusFilter
        const searchText = `${report.name} ${report.source} ${report.scope} ${report.status}`.toLowerCase()
        return matchesStatus && searchText.includes(normalizedQuery)
      })
      .sort((first, second) => {
        const difference = new Date(second.generated || 0) - new Date(first.generated || 0)
        return sortNewest ? difference : -difference
      })
  }, [query, reports, sortNewest, statusFilter])

  const downloadReport = async (report, format = 'CSV') => {
    if (format !== 'CSV') { onNotify(`The backend currently provides CSV exports only; ${format} report rendering is unavailable.`); return }
    try {
      const response = await fetch(`${baseUrl}/v1/runs/${report.runId}/export.csv?group_by=projection_year`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!response.ok) throw new Error(`CSV export failed (${response.status}).`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${report.shortName.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
      onNotify(`${report.name} backend CSV downloaded`)
    } catch (error) { onNotify(error instanceof Error ? error.message : 'Could not download CSV export') }
  }

  const selectReport = (report) => setSelectedReport(report)
  const unavailable = (action) => onNotify(`${action} is not available from the current backend.`)
  return (
    <div className="reports-page flex flex-col gap-3.5">
      <section className="report-overview-grid grid grid-cols-[minmax(0,1fr)_283px] gap-3.5 max-[1100px]:grid-cols-1">
        <ReportLifecycle reports={reports} onStatusSelect={setStatusFilter} />
        <RecentExports reports={reports} loading={runsQuery.loading} onSelect={selectReport} onNotify={onNotify} />
      </section>

      {runsQuery.error && <p className="report-empty-state" role="alert">Could not load backend runs: {runsQuery.error.message}</p>}
      <div className="report-toolbar flex items-center gap-2.5 rounded-[7px] bg-white p-2.5 max-[760px]:flex-wrap">
        <label className="report-search flex min-w-0 flex-1 items-center gap-2.5"><Search size={17} /><span className="sr-only">Search reports</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Search reports, definitions, models..." value={query} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button>}</label>
        <button className={`report-filter-button ${filtersOpen ? 'report-control-active' : ''}`} onClick={() => setFiltersOpen((current) => !current)}><Filter size={16} />Filters</button>
        <button className="report-view-button" onClick={() => unavailable('Alternate report views')}><span>☷</span>View</button>
        <button className="report-new-button" onClick={() => unavailable('Report-definition creation')}><Plus size={18} />New report definition</button>
      </div>
      {filtersOpen && <div className="report-filter-panel flex items-center gap-3 rounded-lg border bg-white px-4 py-3"><label>Status<select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option>All statuses</option><option>Completed</option><option>Failed</option><option>Partial success</option><option>Running</option><option>Queued</option></select></label><button onClick={() => setStatusFilter('All statuses')}>Clear filters</button></div>}
      <nav className="report-tabs flex items-center gap-7 overflow-x-auto" aria-label="Report views">{reportTabs.map((tab) => <button className={activeTab === tab ? 'report-tab-active' : ''} key={tab} onClick={() => setActiveTab(tab)}>{tab}</button>)}</nav>
      <section className="completed-reports-section">
        <div className="completed-reports-heading flex flex-wrap items-end justify-between gap-3"><div><h2>Completed Reports</h2><p>Backend run results. Select a run to preview its summary and download available exports.</p></div><div className="report-sort-count"><span>{visibleReports.length} runs with results</span><button onClick={() => setSortNewest((current) => !current)}>Sort by <b>Generated ({sortNewest ? 'newest' : 'oldest'})</b><ChevronDown size={13} /></button></div></div>
        <div className="completed-report-table">
          <div className="completed-report-table-head"><span>Report</span><span>Source run</span><span>Generated ↓</span><span>Status</span><span>Available formats</span><span>Actions</span></div>
          {runsQuery.loading && <p className="report-empty-state">Loading completed backend runs…</p>}
          {!runsQuery.loading && visibleReports.map((report) => <ReportRow key={report.runId} report={report} selected={selectedReport?.runId === report.runId} onSelect={() => selectReport(report)} onExport={(format) => downloadReport(report, format)} onShare={() => unavailable('Report sharing')} onNotify={onNotify} />)}
          {!runsQuery.loading && !runsQuery.error && visibleReports.length === 0 && <p className="report-empty-state">No completed runs with result rows match the current search and filters.</p>}
        </div>
      </section>
      {selectedReport && <ReportDetails report={selectedReport} summary={selectedSummaryQuery.data} aggregate={selectedAggregateQuery.data} summaryLoading={selectedSummaryQuery.loading} summaryError={selectedSummaryQuery.error} onClose={() => setSelectedReport(null)} onExport={downloadReport} onNotify={onNotify} />}
    </div>
  )
}
function ReportLifecycle({ reports, onStatusSelect }) {
  const counts = [
    { label: 'Completed', detail: 'Backend results available', icon: <FileText size={22} />, tone: 'validated' },
    { label: 'Partial success', detail: <>Results may be<br />incomplete</>, icon: <FileText size={22} />, tone: 'review' },
    { label: 'Failed', detail: 'Run did not complete', icon: <FileText size={22} />, tone: 'draft' },
  ]
  return <section className="report-lifecycle-banner"><div className="report-lifecycle-copy"><span>Report lifecycle</span><h2>From analysis to insight</h2><p>Backend run outputs are available as CSV exports; formal report generation is not provided.</p><LifecycleLandscape /></div><div className="report-lifecycle-stats">{counts.map((item) => <button className="lifecycle-status-card" key={item.label} onClick={() => onStatusSelect(item.label)}><span className={`lifecycle-status-icon lifecycle-${item.tone}`}>{item.icon}</span><span className="lifecycle-status-value">{reports.filter((report) => report.status === item.label).length}</span><b>{item.label}</b><small>{item.detail}</small><ArrowRight size={15} /></button>)}</div></section>
}


function LifecycleLandscape() {
  return (
    <svg className="report-lifecycle-landscape" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 340 82">
      <path d="M0 44 C48 4 57 32 88 52 C120 74 134 31 172 42 C218 55 238 13 273 29 C303 43 321 27 340 6 L340 82 L0 82Z" />
      <path d="M0 62 C36 40 54 52 77 67 C109 90 133 46 169 53 C207 59 222 39 251 43 C293 49 314 34 340 19 L340 82 L0 82Z" />
    </svg>
  )
}

function RecentExports({ reports, loading, onSelect, onNotify }) {
  const latest = [...reports].sort((first, second) => new Date(second.generated || 0) - new Date(first.generated || 0)).slice(0, 5)
  return <aside className="recent-exports-card rounded-[8px] bg-white p-4"><button className="recent-exports-heading" onClick={() => onNotify('Recent exports are listed below from live backend runs.')}><Clock3 size={19} /><b>Recently exported</b><ChevronDown size={15} /></button><p>Latest runs with backend result exports.</p><div>{loading && <p>Loading recent runs…</p>}{latest.map((report) => <button className="recent-export-row" key={report.runId} onClick={() => onSelect(report)}><span><FileText size={19} /></span><span><b>{report.name}</b><small>{report.generated ? new Date(report.generated).toLocaleString() : 'Completion time unavailable'}</small></span><i>CSV</i></button>)}{!loading && !latest.length && <p>No recent backend exports.</p>}</div></aside>
}


function ReportRow({ report, selected, onSelect, onExport, onShare, onNotify }) {
  const generated = report.generated ? new Date(report.generated).toLocaleString() : '—'
  return <div className={`completed-report-row ${selected ? 'completed-report-row-selected' : ''}`}><button className="completed-report-identity" onClick={onSelect}><FileText size={19} /><span><b>{report.name}</b><small>{report.description}</small></span></button><button className="completed-report-source" onClick={onSelect}><b>{report.source}</b><small>{report.scope}</small></button><span className="completed-report-date">{generated}</span><span className={`completed-report-status status-${report.status.toLowerCase().replaceAll(' ', '-')} ${report.illustrative ? 'status-illustrative' : ''}`}><i />{report.status}{report.illustrative ? ' · illustrative' : ''}</span><span className="completed-report-formats">CSV</span><div className="completed-report-actions"><button onClick={onSelect}><Eye size={15} />Preview</button><button onClick={() => onExport('CSV')}><Download size={15} />Export</button><button onClick={onShare}><Share2 size={15} />Share</button><button aria-label={`More actions for ${report.name}`} onClick={() => onNotify('More report actions are not available in this backend.')}><MoreVertical size={17} /></button></div></div>
}


function ReportDetails({ report, summary, aggregate, summaryLoading, summaryError, onClose, onExport, onNotify }) {
  const status = report.status
  return <section className="report-details-panel rounded-[8px] bg-white"><div className="report-details-title-row"><span className="report-details-icon"><FileText size={25} /></span><div><h2>{report.name}</h2><p>{report.description}</p></div><span className={`completed-report-status status-${status.toLowerCase().replaceAll(' ', '-')}`}><i />{status}</span><button aria-label="Close report details" onClick={onClose}><X size={17} /></button></div>
    <div className="report-details-content"><div className="report-details-meta"><h3>Report details</h3><DetailLine label="Source run" value={report.sourceRun} link onClick={() => onNotify('Source run details are available in Results Explorer after selecting this run.')} /><DetailLine label="Model / basis version" value={report.model} /><DetailLine label="Generated" value={report.generated ? new Date(report.generated).toLocaleString() : '—'} /><DetailLine label="Completed" value={report.completed ? new Date(report.completed).toLocaleString() : '—'} /><DetailLine label="Status" value={status} status={status} /></div>
      <div className="report-formats-card"><h3>Available formats</h3><button disabled title="PDF rendering is unavailable in the backend"><span className="format-pdf"><FileText size={20} /></span><span><b>PDF</b><small>Unavailable</small></span><Download size={15} /></button>{report.formats.includes('XLSX') ? <button disabled title="XLSX rendering is unavailable in the backend"><span className="format-xlsx"><FileText size={20} /></span><span><b>XLSX</b><small>Unavailable</small></span><Download size={15} /></button> : report.formats.includes('CSV') ? <button onClick={() => onExport(report, 'CSV')}><span className="format-xlsx"><FileText size={20} /></span><span><b>CSV</b><small>Backend result export</small></span><Download size={15} /></button> : <span className="format-unavailable">No spreadsheet version available</span>}</div>
      {summaryLoading && <p>Loading actual run summary…</p>}{summaryError && <p role="alert">Could not load run summary: {summaryError.message}</p>}{summary && <div className="report-preview-summary"><b>{summary.headline?.label ?? 'Backend run summary'}</b><p>{summary.headline?.value == null ? 'No headline output available' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(summary.headline.value)} {summary.headline?.unit ?? ''} · {summary.policy_count ?? 0} policies · {summary.output_row_count?.toLocaleString() ?? 0} result rows{summary.illustrative ? ' · Illustrative data' : ''}</p></div>}
      <ReportPreview report={report} aggregate={aggregate} /></div>
    <div className="report-details-footer"><div><button className="report-preview-action" onClick={() => onNotify('The run summary is shown in this report details panel.')}><Eye size={16} />Preview</button><button onClick={() => onExport(report, 'CSV')}><Download size={16} />Export<ChevronDown size={13} /></button><button onClick={() => onNotify('Sharing report links is not available in this backend.')}><Share2 size={16} />Share</button><button aria-label="More report actions are not available in this backend." onClick={() => onNotify('More report actions are not available in this backend.')}><MoreVertical size={17} /></button></div><button className="source-run-link" onClick={() => onNotify('Source run details are available in Results Explorer after selecting this run.')}>View source run <ArrowRight size={14} /></button></div>
  </section>
}


function DetailLine({ label, value, link = false, status, onClick }) {
  return (
    <div className="report-detail-line"><span>{label}</span>{link ? <button onClick={onClick}>{value} <ArrowRight size={12} /></button> : status ? <b className={`detail-status-${status.toLowerCase().replace(' ', '-')}`}><i />{value}</b> : <b>{value}</b>}</div>
  )
}

function ReportPreview({ report, aggregate }) {
  const variable = aggregate?.variables?.[0]
  const points = (aggregate?.rows ?? []).map((row) => Number(row.values?.[variable?.name])).filter(Number.isFinite)
  const max = points.length ? Math.max(...points) || 1 : 1
  const labels = (aggregate?.rows ?? []).slice(0, 3).map((row) => row.period_label ?? row.period)
  return <div className="report-preview-card"><h3>{report.shortName}</h3><div className="report-preview-bars">{points.slice(0, 10).map((value, index) => <i key={`${labels[index] ?? index}`} style={{ height: `${Math.max(4, value / max * 91)}%` }} />)}{!points.length && <span className="format-unavailable">Backend preview data unavailable</span>}</div><div className="report-preview-labels"><span>{labels[0] ?? 'Reserve'}</span><span>{variable?.display_name ?? 'Cash flow'}</span><span>{labels[labels.length - 1] ?? 'Capital'}</span></div><div className="report-preview-donut" aria-label="Category breakdown is not provided by the backend" title="Category breakdown is not provided by the backend" /></div>
}
