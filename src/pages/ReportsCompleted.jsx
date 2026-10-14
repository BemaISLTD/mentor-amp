import { useMemo, useState } from 'react'
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
  const reports = initialReports
  const [selectedReport, setSelectedReport] = useState(initialReports[0])
  const [activeTab, setActiveTab] = useState('Completed Reports')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortNewest, setSortNewest] = useState(true)

  const visibleReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return reports
      .filter((report) => {
        const matchesStatus = statusFilter === 'All statuses' || report.status === statusFilter
        const searchText = `${report.name} ${report.source} ${report.scope} ${report.status}`.toLowerCase()
        return matchesStatus && searchText.includes(normalizedQuery)
      })
      .sort((first, second) => {
        const firstDate = new Date(first.generated.replace(' · ', ' '))
        const secondDate = new Date(second.generated.replace(' · ', ' '))
        const difference = secondDate - firstDate
        return sortNewest ? difference : -difference
      })
  }, [query, reports, sortNewest, statusFilter])

  const downloadReport = (report, format = 'CSV') => {
    if (format !== 'CSV') {
      onNotify(`${format} export requested for ${report.name}`)
      return
    }

    const rows = [
      ['Report', report.name],
      ['Source run', report.sourceRun],
      ['Model', report.model],
      ['Generated', report.generated],
      ['Status', report.status],
    ]
    const content = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${report.shortName.toLowerCase().replaceAll(' ', '-')}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    onNotify(`${report.name} CSV downloaded`)
  }

  const selectReport = (report) => setSelectedReport(report)

  return (
    <div className="reports-page flex flex-col gap-3.5">
      <section className="report-overview-grid grid grid-cols-[minmax(0,1fr)_283px] gap-3.5 max-[1100px]:grid-cols-1">
        <ReportLifecycle reports={reports} onStatusSelect={setStatusFilter} />
        <RecentExports onSelect={(name) => onNotify(`${name} opened`)} />
      </section>

      <div className="report-toolbar flex items-center gap-2.5 rounded-[7px] bg-white p-2.5 max-[760px]:flex-wrap">
        <label className="report-search flex min-w-0 flex-1 items-center gap-2.5">
          <Search size={17} />
          <span className="sr-only">Search reports</span>
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search reports, definitions, models..." value={query} />
          {query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button>}
        </label>
        <button className={`report-filter-button ${filtersOpen ? 'report-control-active' : ''}`} onClick={() => setFiltersOpen((current) => !current)}><Filter size={16} />Filters</button>
        <button className="report-view-button" onClick={() => onNotify('List view selected')}><span>☷</span>View</button>
        <button className="report-new-button" onClick={() => onNotify('New report definition opened')}><Plus size={18} />New report definition</button>
      </div>

      {filtersOpen && (
        <div className="report-filter-panel flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
          <label>Status<select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option>All statuses</option><option>Validated</option><option>Needs review</option><option>Draft</option></select></label>
          <button onClick={() => setStatusFilter('All statuses')}>Clear filters</button>
        </div>
      )}

      <nav className="report-tabs flex items-center gap-7 overflow-x-auto" aria-label="Report views">
        {reportTabs.map((tab) => (
          <button className={activeTab === tab ? 'report-tab-active' : ''} key={tab} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </nav>

      <section className="completed-reports-section">
        <div className="completed-reports-heading flex flex-wrap items-end justify-between gap-3">
          <div><h2>Completed Reports</h2><p>Reports generated from your runs. Select a report to preview details and export downloads.</p></div>
          <div className="report-sort-count"><span>{visibleReports.length} reports</span><button onClick={() => setSortNewest((current) => !current)}>Sort by <b>Generated ({sortNewest ? 'newest' : 'oldest'})</b><ChevronDown size={13} /></button></div>
        </div>

        <div className="completed-report-table">
          <div className="completed-report-table-head"><span>Report</span><span>Source run</span><span>Generated ↓</span><span>Status</span><span>Available formats</span><span>Actions</span></div>
          {visibleReports.map((report) => (
            <ReportRow
              key={report.name}
              report={report}
              selected={selectedReport?.name === report.name}
              onSelect={() => selectReport(report)}
              onExport={(format) => downloadReport(report, format)}
              onShare={() => onNotify(`Share link copied for ${report.name}`)}
              onNotify={onNotify}
            />
          ))}
          {visibleReports.length === 0 && <p className="report-empty-state">No completed reports match the current search and filters.</p>}
        </div>
      </section>

      {selectedReport && <ReportDetails report={selectedReport} onClose={() => setSelectedReport(null)} onExport={downloadReport} onNotify={onNotify} />}
    </div>
  )
}

function ReportLifecycle({ reports, onStatusSelect }) {
  const counts = [
    { label: 'Validated', detail: 'Ready for distribution', icon: <FileText size={22} />, tone: 'validated' },
    { label: 'Needs review', detail: <>Requires<br />quality review</>, icon: <FileText size={22} />, tone: 'review' },
    { label: 'Draft', detail: 'Work in progress', icon: <FileText size={22} />, tone: 'draft' },
  ]

  return (
    <section className="report-lifecycle-banner">
      <div className="report-lifecycle-copy">
        <span>Report lifecycle</span>
        <h2>From analysis to insight</h2>
        <p>Create, validate, and share financial reports to drive better actuarial decisions.</p>
        <LifecycleLandscape />
      </div>
      <div className="report-lifecycle-stats">
        {counts.map((item) => (
          <button className="lifecycle-status-card" key={item.label} onClick={() => onStatusSelect(item.label === 'Validated' ? 'Validated' : item.label)}>
            <span className={`lifecycle-status-icon lifecycle-${item.tone}`}>{item.icon}</span>
            <span className="lifecycle-status-value">{reports.filter((report) => report.status === item.label).length}</span>
            <b>{item.label}</b>
            <small>{item.detail}</small>
            <ArrowRight size={15} />
          </button>
        ))}
      </div>
    </section>
  )
}

function LifecycleLandscape() {
  return (
    <svg className="report-lifecycle-landscape" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 340 82">
      <path d="M0 44 C48 4 57 32 88 52 C120 74 134 31 172 42 C218 55 238 13 273 29 C303 43 321 27 340 6 L340 82 L0 82Z" />
      <path d="M0 62 C36 40 54 52 77 67 C109 90 133 46 169 53 C207 59 222 39 251 43 C293 49 314 34 340 19 L340 82 L0 82Z" />
    </svg>
  )
}

function RecentExports({ onSelect }) {
  return (
    <aside className="recent-exports-card rounded-[8px] bg-white p-4">
      <button className="recent-exports-heading" onClick={() => onSelect('Recently exported')}><Clock3 size={19} /><b>Recently exported</b><ChevronDown size={15} /></button>
      <p>Latest reports from your recent exports.</p>
      <div>
        {recentExports.map((name) => (
          <button className="recent-export-row" key={name} onClick={() => onSelect(name)}>
            <span><FileText size={19} /></span>
            <span><b>{name}</b><small>Completed 2 days ago</small></span>
            <i>PDF</i>
          </button>
        ))}
      </div>
    </aside>
  )
}

function ReportRow({ report, selected, onSelect, onExport, onShare, onNotify }) {
  return (
    <div className={`completed-report-row ${selected ? 'completed-report-row-selected' : ''}`}>
      <button className="completed-report-identity" onClick={onSelect}>
        <FileText size={19} />
        <span><b>{report.name}</b></span>
      </button>
      <button className="completed-report-source" onClick={onSelect}>
        <b>{report.source}</b><small>{report.scope}</small>
      </button>
      <span className="completed-report-date">{report.generated}</span>
      <span className={`completed-report-status status-${report.status.toLowerCase().replace(' ', '-')}`}><i />{report.status}</span>
      <span className="completed-report-formats">{report.formats.join(', ')}</span>
      <div className="completed-report-actions">
        <button onClick={onSelect}><Eye size={15} />Preview</button>
        <button onClick={() => onExport(report.formats[0])}><Download size={15} />Export</button>
        <button onClick={onShare}><Share2 size={15} />Share</button>
        <button aria-label={`More actions for ${report.name}`} onClick={() => onNotify(`${report.name} actions opened`)}><MoreVertical size={17} /></button>
      </div>
    </div>
  )
}

function ReportDetails({ report, onClose, onExport, onNotify }) {
  return (
    <section className="report-details-panel rounded-[8px] bg-white">
      <div className="report-details-title-row">
        <span className="report-details-icon"><FileText size={25} /></span>
        <div><h2>{report.name}</h2><p>{report.description}</p></div>
        <span className={`completed-report-status status-${report.status.toLowerCase().replace(' ', '-')}`}><i />{report.status}</span>
        <button aria-label="Close report details" onClick={onClose}><X size={17} /></button>
      </div>

      <div className="report-details-content">
        <div className="report-details-meta">
          <h3>Report details</h3>
          <DetailLine label="Source run" value={report.sourceRun} link onClick={() => onNotify('Source run opened')} />
          <DetailLine label="Model / basis version" value={report.model} />
          <DetailLine label="Generated" value={report.generated} />
          <DetailLine label="Completed" value={report.completed} />
          <DetailLine label="Status" value={report.status} status={report.status} />
        </div>

        <div className="report-formats-card">
          <h3>Available formats</h3>
          <button onClick={() => onExport(report, 'PDF')}><span className="format-pdf"><FileText size={20} /></span><span><b>PDF</b><small>{report.pdfSize}</small></span><Download size={15} /></button>
          {report.formats.includes('XLSX') ? (
            <button onClick={() => onExport(report, 'XLSX')}><span className="format-xlsx"><FileText size={20} /></span><span><b>XLSX</b><small>{report.xlsxSize}</small></span><Download size={15} /></button>
          ) : report.formats.includes('CSV') ? (
            <button onClick={() => onExport(report, 'CSV')}><span className="format-xlsx"><FileText size={20} /></span><span><b>CSV</b><small>{report.xlsxSize}</small></span><Download size={15} /></button>
          ) : <span className="format-unavailable">No spreadsheet version available</span>}
        </div>

        <ReportPreview report={report} />
      </div>

      <div className="report-details-footer">
        <div>
          <button className="report-preview-action" onClick={() => onNotify(`${report.name} preview opened`)}><Eye size={16} />Preview</button>
          <button onClick={() => onExport(report, report.formats[0])}><Download size={16} />Export<ChevronDown size={13} /></button>
          <button onClick={() => onNotify(`Share link copied for ${report.name}`)}><Share2 size={16} />Share</button>
          <button aria-label="More report actions" onClick={() => onNotify('More report actions opened')}><MoreVertical size={17} /></button>
        </div>
        <button className="source-run-link" onClick={() => onNotify('Source run opened')}>View source run <ArrowRight size={14} /></button>
      </div>
    </section>
  )
}

function DetailLine({ label, value, link = false, status, onClick }) {
  return (
    <div className="report-detail-line"><span>{label}</span>{link ? <button onClick={onClick}>{value} <ArrowRight size={12} /></button> : status ? <b className={`detail-status-${status.toLowerCase().replace(' ', '-')}`}><i />{value}</b> : <b>{value}</b>}</div>
  )
}

function ReportPreview({ report }) {
  return (
    <div className="report-preview-card">
      <h3>{report.shortName}</h3>
      <div className="report-preview-bars">{[22, 34, 30, 43, 54, 47, 62, 76, 68, 91].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
      <div className="report-preview-labels"><span>Reserve</span><span>Cash flow</span><span>Capital</span></div>
      <div className="report-preview-donut" />
    </div>
  )
}