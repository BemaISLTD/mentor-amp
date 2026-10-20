import { useState } from 'react'
import {
  ArrowRight,
  Check,
  CircleCheck,
  Database,
  FileSpreadsheet,
  Search,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react'
import { useApp } from '../../context/useApp'
import { useApi } from '../../api/ApiProvider'
import { canImportData } from '../../api/permissions'
import './input-workflow-screens.css'

const sampleRows = [
  ['MYGA', '1', '1', '8.250%', '7.100%'],
  ['MYGA', '1', '2', '7.320%', '6.410%'],
  ['MYGA', '1', '3', '6.840%', '5.920%'],
  ['MYGA', '1', '4', '6.210%', '5.480%'],
  ['MYGA', '1', '5', '5.730%', '5.010%'],
  ['MYGA', '1', '6', '5.210%', '4.630%'],
  ['MYGA', '1', '7', '4.820%', '4.280%'],
  ['MYGA', '1', '8', '4.450%', '3.970%'],
  ['MYGA', '1', '9', '4.120%', '3.680%'],
  ['MYGA', '1', '10', '3.860%', '3.420%'],
]

function RouteHeader({ eyebrow, title, description, action, onClose }) {
  return <header className="iw-page-header">
    <div><span className="iw-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
    <div className="iw-header-actions">{action}{onClose && <button className="iw-close-preview" aria-label="Close import preview" onClick={onClose}><X size={20} /></button>}</div>
  </header>
}

function InputSubnav({ active, onNavigate }) {
  return <nav className="iw-subnav" aria-label="Input library pages">
    {['Input Library', 'Liability Inforce', 'Assumption Tables', 'Factor Tables'].map(item => <button key={item} className={active === item ? 'iw-subnav-active' : ''} onClick={() => onNavigate(item)}>{item}</button>)}
  </nav>
}

export function InputWorkflowScreen({ page, onNavigate, onReturnToProjection, onNotify, onOpenDataManager }) {
  if (page === 'Assumption Tables') return <AssumptionTablesScreen onNavigate={onNavigate} onReturnToProjection={onReturnToProjection} onNotify={onNotify} onOpenDataManager={onOpenDataManager} />
  if (page === 'Factor Tables') return <FactorTablesScreen onNavigate={onNavigate} onReturnToProjection={onReturnToProjection} onNotify={onNotify} onOpenDataManager={onOpenDataManager} />
  if (page === 'Import Inforce') return null
  return null
}

function AssumptionTablesScreen({ onNavigate, onReturnToProjection, onNotify, onOpenDataManager }) {
  const { projectionInputs, updateProjectionInputs } = useApp()
  const { user } = useApi()
  const uploadAllowed = canImportData(user?.roles ?? [])
  const [selectedId, setSelectedId] = useState('asm-myga-lapse-v42')
  const [query, setQuery] = useState('')
  const records = [
    { id: 'asm-myga-lapse-v42', name: 'MYGA Lapse Assumptions', version: 'v4.2', status: 'Validated', cells: '86,400', effective: '2026-12-31', product: 'MYGA', dimensions: 'Duration · Policy year · Gender' },
    { id: 'asm-expense-v21', name: 'Expense Assumptions', version: 'v2.1', status: 'Validated', cells: '18,240', effective: '2025-12-31', product: 'All', dimensions: 'Product · Duration' },
    { id: 'asm-fia-credit-preview', name: 'FIA Crediting Assumptions', version: 'Import preview', status: 'Needs review', cells: '12,600', effective: '—', product: 'FIA', dimensions: 'Product · Duration · Policy year' },
  ]
  const selected = records.find(row => row.id === selectedId) ?? records[0]
  const visible = records.filter(row => `${row.name} ${row.product} ${row.version}`.toLowerCase().includes(query.toLowerCase()))
  const pinned = projectionInputs.assumptionTableIds.includes(selected.id)
  const pinSelected = () => {
    if (selected.status !== 'Validated') {
      onNotify(`${selected.name} must be validated before it can be pinned`)
      return
    }
    updateProjectionInputs(current => ({
      ...current,
      assumptionTableIds: [selected.id, ...current.assumptionTableIds.filter(id => id !== selected.id)],
      draft: { ...current.draft, assumptionValidated: current.assumptionTableIds[0] === selected.id ? current.draft.assumptionValidated : false },
    }))
    onNotify(`${selected.name} pinned for projection setup`)
  }

  return <div className="iw-page">
    <InputSubnav active="Assumption Tables" onNavigate={onNavigate} />
    <RouteHeader eyebrow="Inputs / Assumption tables" title="Assumption tables" description="Inspect dimensions, effective dates, validation, and model usage." action={<>{uploadAllowed && <button className="iw-primary-button" onClick={() => onOpenDataManager?.('assumption_table')}><Upload size={18} />Import assumption table</button>}<button className="iw-resource-action" onClick={onReturnToProjection}>Use pinned tables <ArrowRight size={17} /></button></>} />
    <section className="iw-card iw-assumption-library">
      <h2>Assumption table library</h2>
      <label className="iw-search"><Search size={19} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search assumption tables..." /></label>
      <div className="iw-filter-row">{['Product', 'Basis', 'Effective date', 'Status'].map((name, i) => <label key={name}>{name}<select defaultValue="All"><option>All</option>{(i === 0 ? ['MYGA', 'FIA'] : i === 3 ? ['Validated', 'Needs review'] : []).map(option => <option key={option}>{option}</option>)}</select></label>)}</div>
      <div className="iw-data-table iw-assumption-table">
        <div className="iw-data-header"><span>Name</span><span>Version</span><span>Status</span><span>Cells</span><span>Effective date</span><span /></div>
        {visible.map(row => <div key={row.id} role="row" className={`iw-data-row ${selectedId === row.id ? 'iw-row-selected' : ''}`}>
          <button className="iw-record-name iw-assumption-select" onClick={() => setSelectedId(row.id)}><FileSpreadsheet size={20} />{row.name}</button><span>{row.version}</span><span><Status state={row.status} /></span><span>{row.cells}</span><span>{row.effective}</span><span><button aria-label={`Pin ${row.name}`} className="iw-row-menu" onClick={() => { if (row.status !== 'Validated') { onNotify(`${row.name} must be validated before it can be pinned`); return }; setSelectedId(row.id); updateProjectionInputs(current => ({ ...current, assumptionTableIds: [row.id, ...current.assumptionTableIds.filter(id => id !== row.id)], draft: { ...current.draft, assumptionValidated: current.assumptionTableIds[0] === row.id ? current.draft.assumptionValidated : false } })); onNotify(`${row.name} pinned`) }}>⋮</button></span>
        </div>)}
      </div>
      <p className="iw-table-foot">Showing {visible.length} of 3 assumption tables</p>
    </section>
    <section className="iw-card iw-assumption-detail">
      <div className="iw-detail-title"><div><FileSpreadsheet size={23} /><span><h2>{selected.name}</h2><small>Lapse rate assumptions for MYGA products by duration, policy year, and gender.</small></span><Status state={selected.status} /></div><button className={`iw-outline-button ${pinned ? 'iw-selected-action' : ''}`} onClick={pinSelected}>{pinned ? <Check size={16} /> : <Database size={16} />}{pinned ? 'Pinned by ID' : 'Pin for projection'}</button></div>
      <dl className="iw-assumption-facts"><dt>Product</dt><dd>{selected.product}</dd><dt>Source</dt><dd>Internal actuarial study (2024)</dd><dt>Dimensions</dt><dd>{selected.dimensions.split(' · ').map(item => <i key={item}>{item}</i>)}</dd><dt>Version</dt><dd>{selected.version}</dd><dt>Effective date</dt><dd>{selected.effective}</dd><dt>Last updated</dt><dd>Jan 15, 2025, 10:24 AM</dd><dt>Units</dt><dd>Percent</dd><dt>Consumers</dt><dd>2 models</dd></dl>
    </section>
    <div className="iw-bottom-grid">
      <DataPreview title="Data preview (first 10 rows)" headers={['Product', 'Duration', 'Policy Year', 'Male', 'Female']} rows={sampleRows} />
      <section className="iw-card iw-validation-card"><h2>Validation summary</h2><div className="iw-validation-score"><strong>100%</strong><span>All checks passed<small>12 validation checks</small></span></div>{['File format valid', 'Required columns present', 'Data types correct', 'No missing values', 'Values within expected ranges', 'Dimensions consistent', 'No duplicate keys', 'Ready for import'].map(item => <p key={item}><CircleCheck size={17} />{item}</p>)}<button onClick={() => onNotify('Full assumption validation details opened')}>View full validation details <ArrowRight size={16} /></button></section>
    </div>
    <div className="iw-sticky-selection"><span>{projectionInputs.assumptionTableIds.length} assumption table(s) pinned in this session</span><button onClick={onReturnToProjection}>Return to projection setup <ArrowRight size={16} /></button></div>
  </div>
}

function FactorTablesScreen({ onNavigate, onReturnToProjection, onNotify, onOpenDataManager }) {
  const { projectionInputs, updateProjectionInputs } = useApp()
  const { user } = useApi()
  const uploadAllowed = canImportData(user?.roles ?? [])
  const [selectedId, setSelectedId] = useState('factor-mortality-v31')
  const [query, setQuery] = useState('')
  const [selectedRows, setSelectedRows] = useState(['factor-mortality-v31'])
  const records = [
    { id: 'factor-mortality-v31', name: 'Mortality Factors', version: 'v3.1', rows: '1,240', used: 'Shared', status: 'Needs review', source: 'mortality_2026.csv' },
    { id: 'factor-discount-v50', name: 'Discount Curve Factors', version: 'v5.0', rows: '480', used: '3 models', status: 'Validated', source: 'internal' },
    { id: 'factor-expense-v20', name: 'Expense Inflation Factors', version: 'v2.0', rows: '96', used: 'Local', status: 'Validated', source: 'expense_factors.csv' },
  ]
  const selected = records.find(row => row.id === selectedId) ?? records[0]
  const visible = records.filter(row => `${row.name} ${row.source} ${row.status}`.toLowerCase().includes(query.toLowerCase()))
  const pinned = projectionInputs.factorTableIds.includes(selected.id)
  const selectFactor = record => {
    if (record.status !== 'Validated') {
      onNotify(`${record.name} must be validated before it can be pinned`)
      return
    }
    updateProjectionInputs(current => ({
      ...current,
      factorTableIds: [record.id, ...current.factorTableIds.filter(id => id !== record.id)],
      draft: { ...current.draft, factorValidated: current.factorTableIds[0] === record.id ? current.draft.factorValidated : false },
    }))
    onNotify(`${record.name} pinned for projection setup`)
  }

  return <div className="iw-page">
    <InputSubnav active="Factor Tables" onNavigate={onNavigate} />
    <RouteHeader eyebrow="Inputs / Factor tables" title="Factor tables" description="Review reference factors, effective dates, dimensions, and validation before using them in a projection." action={<>{uploadAllowed && <button className="iw-primary-button" onClick={() => onOpenDataManager?.('factor_table')}><Upload size={18} />Import factor file</button>}<button className="iw-resource-action" onClick={onReturnToProjection}>Use pinned tables <ArrowRight size={17} /></button></>} />
    <div className="iw-factor-toolbar"><label className="iw-search"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search factor tables..." /></label><div className="iw-segmented"><button className="iw-segment-active">All</button><button>Shared</button><button>Local</button></div><select><option>All statuses</option><option>Validated</option><option>Needs review</option></select><select><option>All types</option><option>Mortality</option><option>Economic</option></select>{uploadAllowed && <button className="iw-text-action" onClick={() => onOpenDataManager?.('factor_table')}><Upload size={16} />Import factor file</button>}</div>
    <section className="iw-card iw-factor-library"><div className="iw-section-title"><h2>Factor table library</h2><span>{visible.length} tables</span></div><div className="iw-data-table iw-factor-table">
      <div className="iw-data-header"><span /><span>Name</span><span>Version</span><span>Rows</span><span>Used by</span><span>Status</span><span>Source</span><span /></div>
      {visible.map(row => <div key={row.id} className={`iw-data-row ${selectedId === row.id ? 'iw-row-selected' : ''}`}><label className="iw-select-box"><input checked={selectedRows.includes(row.id)} onChange={() => setSelectedRows(current => current.includes(row.id) ? current.filter(id => id !== row.id) : [...current, row.id])} type="checkbox" /></label><button className="iw-factor-select" onClick={() => setSelectedId(row.id)}><FileSpreadsheet size={20} />{row.name}</button><span>{row.version}</span><span>{row.rows}</span><span>{row.used}</span><span><Status state={row.status} /></span><span>{row.source}</span><button className="iw-row-menu" onClick={() => selectFactor(row)} aria-label={`Pin ${row.name}`}>⋮</button></div>)}
    </div></section>
    <section className="iw-card iw-factor-detail"><div className="iw-detail-title"><div><FileSpreadsheet size={25} /><span><h2>{selected.name}</h2><small>Reference mortality rates by age, duration, and gender.</small></span><Status state={selected.status} /></div><button className={`iw-outline-button ${pinned ? 'iw-selected-action' : ''}`} onClick={() => selectFactor(selected)}>{pinned ? <Check size={16} /> : <Database size={16} />}{pinned ? 'Pinned by ID' : 'Pin for projection'}</button></div>
      <div className="iw-factor-facts"><Fact label="Source file" value={selected.source} /><Fact label="Version" value={selected.version} /><Fact label="Effective date" value="2026-01-01" /><Fact label="Units" value="per 1000" /><Fact label="Dimensions" value="Age · Duration · Gender" /><Fact label="Consumers" value="4 models" /><Fact label="Status" value={selected.status} /><Fact label="Last updated" value="Apr 24, 2025 by Emily Chen" /></div>
      <div className="iw-warning-list"><div className="iw-warning-heading"><TriangleAlert size={25} /><span><b>3 validation warnings</b><small>Review and resolve warnings before using this factor table in projections.</small></span><button onClick={() => onNotify('Factor table validation details opened')}>View validation details <ArrowRight size={15} /></button></div>{[['Missing age 121', 'Input file does not contain factors for age 121. Consider adding or confirm this is expected.'], ['Unsupported gender code ‘X’', 'Found 12 rows with gender code ‘X’. Supported codes are M, F, U.'], ['Effective date overlap', 'Factors effective 2026-01-01 overlap with existing version v3.0 (2025-12-01 to 2026-06-30).']].map(([title, detail], index) => <div className="iw-warning-row" key={title}><i>{index + 1}</i><span><b>{title}</b><small>{detail}</small></span></div>)}</div>
    </section>
    <DataPreview title="Factor preview (first 10 rows)" headers={['Age', 'Duration', 'Gender', 'Factor', 'Status']} rows={[[0, 1, 'M', '0.1250', 'Valid'], [0, 1, 'F', '0.1180', 'Valid'], [0, 1, 'U', '0.1210', 'Valid'], [1, 1, 'M', '0.1265', 'Valid'], [1, 1, 'F', '0.1193', 'Valid']]} />
    <div className="iw-sticky-selection"><span>{projectionInputs.factorTableIds.length} factor table(s) pinned in this session</span><button onClick={onReturnToProjection}>Return to projection setup <ArrowRight size={16} /></button></div>
  </div>
}

function DataPreview({ title, headers, rows, compact = false }) {
  return <section className={`iw-card iw-data-preview ${compact ? 'iw-data-preview-compact' : ''}`}><h2>{title}</h2><div className="iw-preview-table"><div>{headers.map(header => <b key={header}>{header}</b>)}</div>{rows.map((row, i) => <div key={`${row[0]}-${i}`}>{row.map((cell, j) => <span key={`${j}-${cell}`}>{cell}</span>)}</div>)}</div>{!compact && <small className="iw-preview-count">Showing {rows.length} of 12,600 rows</small>}</section>
}

function Status({ state }) {
  const variant = state === 'Validated' ? 'validated' : 'review'
  return <span className={`iw-status iw-status-${variant}`}><i />{state}</span>
}

function Fact({ label, value, tone }) {
  return <div className="iw-fact"><span>{label}</span><b className={tone ? `iw-${tone}` : ''}>{value}</b></div>
}
