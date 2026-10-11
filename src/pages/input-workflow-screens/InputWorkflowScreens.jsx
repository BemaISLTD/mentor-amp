import { useEffect, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Database,
  FileSpreadsheet,
  Info,
  Search,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react'
import { useApp } from '../../context/useApp'
import { useApi } from '../../api/ApiProvider'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
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

export function InputWorkflowScreen({ page, onNavigate, onReturnToProjection, onNotify }) {
  if (page === 'Assumption Tables') return <AssumptionTablesScreen onNavigate={onNavigate} onReturnToProjection={onReturnToProjection} onNotify={onNotify} />
  if (page === 'Factor Tables') return <FactorTablesScreen onNavigate={onNavigate} onReturnToProjection={onReturnToProjection} onNotify={onNotify} />
  if (page === 'Import Inforce') return <InforceImportScreen onNavigate={onNavigate} onReturnToProjection={onReturnToProjection} onNotify={onNotify} />
  return null
}

function AssumptionTablesScreen({ onNavigate, onReturnToProjection, onNotify }) {
  const { projectionInputs, updateProjectionInputs } = useApp()
  const [selectedId, setSelectedId] = useState('asm-myga-lapse-v42')
  const [query, setQuery] = useState('')
  const [importOpen, setImportOpen] = useState(false)
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
  const pickFile = event => {
    const file = event.target.files?.[0]
    if (file) {
      onNotify(`${file.name} parsed for preview; saving to the library is not available`)
      setImportOpen(true)
    }
  }

  return <div className="iw-page">
    <InputSubnav active="Assumption Tables" onNavigate={onNavigate} />
    <RouteHeader eyebrow="Inputs / Assumption tables" title="Assumption tables" description="Inspect dimensions, effective dates, validation, and model usage." action={<><label className="iw-primary-button"><Upload size={18} />Import assumption table<input type="file" accept=".csv,.xlsx,.xls" onChange={pickFile} /></label><button className="iw-resource-action" onClick={onReturnToProjection}>Use pinned tables <ArrowRight size={17} /></button></>} />
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
    {importOpen && <ImportPreviewPanel kind="assumption" onClose={() => setImportOpen(false)} onNotify={onNotify} />}
    <div className="iw-sticky-selection"><span>{projectionInputs.assumptionTableIds.length} assumption table(s) pinned in this session</span><button onClick={onReturnToProjection}>Return to projection setup <ArrowRight size={16} /></button></div>
  </div>
}

function FactorTablesScreen({ onNavigate, onReturnToProjection, onNotify }) {
  const { projectionInputs, updateProjectionInputs } = useApp()
  const [selectedId, setSelectedId] = useState('factor-mortality-v31')
  const [query, setQuery] = useState('')
  const [previewOpen, setPreviewOpen] = useState(true)
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
    <RouteHeader eyebrow="Inputs / Factor tables" title="Factor tables" description="Review reference factors, effective dates, dimensions, and validation before using them in a projection." action={<><button className="iw-primary-button" onClick={() => setPreviewOpen(true)}><Upload size={18} />Import factor file</button><button className="iw-resource-action" onClick={onReturnToProjection}>Use pinned tables <ArrowRight size={17} /></button></>} />
    <div className="iw-factor-toolbar"><label className="iw-search"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search factor tables..." /></label><div className="iw-segmented"><button className="iw-segment-active">All</button><button>Shared</button><button>Local</button></div><select><option>All statuses</option><option>Validated</option><option>Needs review</option></select><select><option>All types</option><option>Mortality</option><option>Economic</option></select><button className="iw-text-action" onClick={() => setPreviewOpen(true)}><Upload size={16} />Import factor file</button></div>
    <section className="iw-card iw-factor-library"><div className="iw-section-title"><h2>Factor table library</h2><span>{visible.length} tables</span></div><div className="iw-data-table iw-factor-table">
      <div className="iw-data-header"><span /><span>Name</span><span>Version</span><span>Rows</span><span>Used by</span><span>Status</span><span>Source</span><span /></div>
      {visible.map(row => <div key={row.id} className={`iw-data-row ${selectedId === row.id ? 'iw-row-selected' : ''}`}><label className="iw-select-box"><input checked={selectedRows.includes(row.id)} onChange={() => setSelectedRows(current => current.includes(row.id) ? current.filter(id => id !== row.id) : [...current, row.id])} type="checkbox" /></label><button className="iw-factor-select" onClick={() => setSelectedId(row.id)}><FileSpreadsheet size={20} />{row.name}</button><span>{row.version}</span><span>{row.rows}</span><span>{row.used}</span><span><Status state={row.status} /></span><span>{row.source}</span><button className="iw-row-menu" onClick={() => selectFactor(row)} aria-label={`Pin ${row.name}`}>⋮</button></div>)}
    </div></section>
    <section className="iw-card iw-factor-detail"><div className="iw-detail-title"><div><FileSpreadsheet size={25} /><span><h2>{selected.name}</h2><small>Reference mortality rates by age, duration, and gender.</small></span><Status state={selected.status} /></div><button className={`iw-outline-button ${pinned ? 'iw-selected-action' : ''}`} onClick={() => selectFactor(selected)}>{pinned ? <Check size={16} /> : <Database size={16} />}{pinned ? 'Pinned by ID' : 'Pin for projection'}</button></div>
      <div className="iw-factor-facts"><Fact label="Source file" value={selected.source} /><Fact label="Version" value={selected.version} /><Fact label="Effective date" value="2026-01-01" /><Fact label="Units" value="per 1000" /><Fact label="Dimensions" value="Age · Duration · Gender" /><Fact label="Consumers" value="4 models" /><Fact label="Status" value={selected.status} /><Fact label="Last updated" value="Apr 24, 2025 by Emily Chen" /></div>
      <div className="iw-warning-list"><div className="iw-warning-heading"><TriangleAlert size={25} /><span><b>3 validation warnings</b><small>Review and resolve warnings before using this factor table in projections.</small></span><button onClick={() => onNotify('Factor table validation details opened')}>View validation details <ArrowRight size={15} /></button></div>{[['Missing age 121', 'Input file does not contain factors for age 121. Consider adding or confirm this is expected.'], ['Unsupported gender code ‘X’', 'Found 12 rows with gender code ‘X’. Supported codes are M, F, U.'], ['Effective date overlap', 'Factors effective 2026-01-01 overlap with existing version v3.0 (2025-12-01 to 2026-06-30).']].map(([title, detail], index) => <div className="iw-warning-row" key={title}><i>{index + 1}</i><span><b>{title}</b><small>{detail}</small></span></div>)}</div>
    </section>
    <DataPreview title="Factor preview (first 10 rows)" headers={['Age', 'Duration', 'Gender', 'Factor', 'Status']} rows={[[0, 1, 'M', '0.1250', 'Valid'], [0, 1, 'F', '0.1180', 'Valid'], [0, 1, 'U', '0.1210', 'Valid'], [1, 1, 'M', '0.1265', 'Valid'], [1, 1, 'F', '0.1193', 'Valid']]} />
    {previewOpen && <ImportPreviewPanel kind="factor" onClose={() => setPreviewOpen(false)} onNotify={onNotify} />}
    <div className="iw-sticky-selection"><span>{projectionInputs.factorTableIds.length} factor table(s) pinned in this session</span><button onClick={onReturnToProjection}>Return to projection setup <ArrowRight size={16} /></button></div>
  </div>
}

function InforceImportScreen({ onNavigate, onReturnToProjection, onNotify }) {
  const { projectionInputs, updateProjectionInputs } = useApp()
  const { request } = useApi()
  const { projectId: activeProjectId, projects } = useWorkspace()
  const [projectId, setProjectId] = useState(activeProjectId ?? '')
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [validating, setValidating] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [storedFile, setStoredFile] = useState(null)
  const inputQuery = useApiQuery(projectId ? `/v1/projects/${projectId}/inputs` : null)
  useEffect(() => { if (!projectId && activeProjectId) setProjectId(activeProjectId) }, [projectId, activeProjectId])
  const pickFile = event => {
    const nextFile = event.target.files?.[0]
    if (nextFile) { setFile(nextFile); setFileName(nextFile.name); setUploadResult(null); setUploadError('') }
  }
  const selectInforce = async () => {
    if (!file || !projectId) return
    setValidating(true)
    setUploadError('')
    const form = new FormData()
    form.append('file', file)
    try {
      const result = await request(`/v1/imports/inforce?project_id=${encodeURIComponent(projectId)}`, { method: 'POST', body: form })
      setUploadResult(result)
      if (!result.stored_count) {
        setUploadError(result.errors?.map(item => item.message || item.detail || JSON.stringify(item)).join(' · ') || 'The backend did not store this file.')
        return
      }
      const inputPath = `/v1/projects/${projectId}/inputs`
      const updated = await request(inputPath)
      const found = (updated.inputs ?? []).find(item => item.name === file.name)
      if (found) {
        setStoredFile(found)
        const resource = { id: found.id, name: found.name, fingerprint: found.fingerprint, status: found.status === 'validated' ? 'Validated' : 'Needs review', mappedColumns: found.columns_detected?.length ?? 0, requiredColumns: 0, projectId }
      updateProjectionInputs(current => ({
        ...current,
        inforce: resource,
        draft: { ...current.draft, inforceConfirmed: current.inforce?.id === resource.id && current.inforce?.name === resource.name ? current.draft.inforceConfirmed : false },
      }))
      }
      inputQuery.refetch()
      onNotify(`${file.name} parsed and stored by the backend (${result.stored_count.toLocaleString()} records).`)
      if (found?.status === 'validated') onReturnToProjection()
    } catch (error) { setUploadError(error instanceof Error ? error.message : 'Inforce upload failed.') }
    finally { setValidating(false) }
  }
  return <div className="iw-page">
    <InputSubnav active="Liability Inforce" onNavigate={onNavigate} />
    <RouteHeader eyebrow="Inputs / Inforce" title="Import inforce file" description="Upload policy records, validate the schema, and make the file available to projection sets." />
    <div className="iw-inforce-layout"><main>
      <section className="iw-card iw-inforce-step"><div className="iw-step-heading"><i>1</i><div><h2>Upload file</h2><p>Select a project and upload your inforce file.</p></div></div>
        <div className="iw-upload-meta"><label>Project<select value={projectId} onChange={event => setProjectId(event.target.value)}>{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div><b>Accepted file formats</b><span><i>TSV</i><i>CSV</i><i>XLSX</i></span><small>First row must contain column headers. Asset-specific import is not implemented by this backend milestone.</small></div></div>
        <label className="iw-dropzone"><Upload size={38} /><span>Choose a real file: <b>click to browse</b></span><small>TSV, CSV, XLSX</small><input key={fileInputKey} type="file" accept=".tsv,.csv,.xlsx" onChange={pickFile} /></label>
        {file && <div className="iw-uploaded-file"><FileSpreadsheet size={23} /><b>{fileName}</b><i>{fileName.split('.').pop()?.toUpperCase()}</i><span>{(file.size / 1024 / 1024).toFixed(2)} MB</span><span>{uploadResult ? `${uploadResult.row_count.toLocaleString()} parsed rows` : 'Not uploaded'}</span><strong>{uploadResult?.stored_count ? <><CircleCheck size={17} />Stored</> : 'Ready to upload'}</strong><button aria-label="Remove file" onClick={() => { setFile(null); setFileName(''); setUploadResult(null); setFileInputKey(key => key + 1) }}><X size={18} /></button></div>}
      </section>
      <section className="iw-card iw-inforce-step"><div className="iw-step-heading"><i>2</i><div><h2>Validation results</h2><p>Server-side parser, schema validation, and duplicate-policy fingerprint checks.</p></div></div>
        {uploadResult ? <div className="iw-validation-strip">{[['Parsed rows', uploadResult.row_count.toLocaleString(), 'ok'], ['Stored rows', uploadResult.stored_count.toLocaleString(), uploadResult.stored_count ? 'ok' : 'warn'], ['Detected columns', uploadResult.columns.join(', ') || 'None', uploadResult.columns.length ? 'ok' : 'warn'], ['Validation issues', String(uploadResult.errors.length), uploadResult.errors.length ? 'warn' : 'ok']].map(([title, detail, state]) => <div key={title} className={state}><span>{state === 'ok' ? <Check size={18} /> : <TriangleAlert size={18} />}</span><b>{title}</b><small>{detail}</small></div>)}</div> : <p>Upload a real inforce file to see validation results.</p>}
        {uploadError && <p className="iw-import-warning"><TriangleAlert size={18} />{uploadError}</p>}
        {uploadResult?.errors?.length > 0 && <div className="iw-warning-list"><div className="iw-warning-heading"><TriangleAlert size={22} /><span><b>{uploadResult.errors.length} validation issue(s)</b><small>Messages returned directly by the backend.</small></span></div>{uploadResult.errors.slice(0, 20).map((item, index) => <div className="iw-warning-row" key={`${item.row}-${index}`}><i>{item.row ?? index + 1}</i><span><b>{item.column || item.code || item.severity || 'Validation'}</b><small>{item.message || JSON.stringify(item)}</small></span></div>)}</div>}
        {uploadResult && <div className="iw-validation-footer"><button onClick={() => { const lines = [['severity', 'row', 'column', 'message'], ...(uploadResult.errors ?? []).map(item => [item.severity ?? '', item.row ?? '', item.column ?? '', item.message ?? JSON.stringify(item)])].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([lines], { type: 'text/csv' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${fileName || 'inforce'}-validation.csv`; anchor.click(); URL.revokeObjectURL(url) }}><ArrowDownToLine size={17} />Download validation CSV</button><span><Info size={15} />Hard errors prevent storage; warnings may be stored as needs_review.</span></div>}
      </section>
    </main>
    <aside className="iw-card iw-import-summary"><h2>Import summary</h2><div className="iw-file-heading"><FileSpreadsheet size={26} /><span><b>{fileName || 'No file selected'}</b><small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Awaiting upload'}</small></span></div><Fact label="Fingerprint" value={storedFile?.fingerprint || 'Generated by backend after parsing'} /><Fact label="Parsed rows" value={uploadResult?.row_count?.toLocaleString() ?? '—'} /><Fact label="Stored rows" value={uploadResult?.stored_count?.toLocaleString() ?? '—'} /><Fact label="Validation issues" value={uploadResult?.errors?.length ?? '—'} tone={uploadResult?.errors?.length ? 'amber' : 'green'} /><div className="iw-import-warning"><TriangleAlert size={24} /><span>Only validated files are eligible for Projection Sets. Review backend validation status before running.</span></div><p className="iw-import-note"><Info size={18} />No file is stored until you choose Import and validate.</p></aside></div>
    <footer className="iw-inforce-footer"><button className="iw-outline-button" onClick={() => onNavigate('Input Library')}>Cancel</button><span /><button className="iw-primary-button" disabled={!file || !projectId || validating} onClick={selectInforce}><Check size={17} />{validating ? 'Uploading & validating…' : 'Import and validate'}</button></footer>
    {projectionInputs.inforce && <div className="iw-persisted-file"><CircleCheck size={17} />Selected in setup: {projectionInputs.inforce.name} · {projectionInputs.inforce.fingerprint || 'backend fingerprint'}</div>}
  </div>
}

function ImportPreviewPanel({ kind, onClose, onNotify }) {
  const isAssumption = kind === 'assumption'
  const title = isAssumption ? 'Import preview' : 'Import preview'
  const fileName = isAssumption ? 'lapse_assumptions.xlsx' : 'factor_rates.csv'
  return <div className="iw-preview-backdrop" onClick={onClose}><aside className="iw-preview-panel" onClick={event => event.stopPropagation()}><div className="iw-preview-heading"><h2>{title}</h2><button aria-label="Close import preview" onClick={onClose}><X size={20} /></button></div>
    {isAssumption && <div className="iw-preview-alert"><CircleAlert size={25} /><span><b>Preview only — this endpoint does not save an assumption table yet.</b><small>You can review the parsed data and validation results, but saving to the library is not available at this time.</small></span></div>}
    <div className="iw-preview-file"><FileSpreadsheet size={26} /><span><b>{fileName}</b><small>{isAssumption ? 'Uploaded just now by Andrew Johnson' : '12,480 bytes · CSV'}</small></span></div>
    <div className="iw-preview-stats">{(isAssumption ? [['12,600', 'rows parsed'], ['5', 'columns'], ['0', 'errors'], ['4', 'warnings']] : [['1,240', 'parsed rows'], ['6', 'columns'], ['3', 'warnings'], ['0', 'errors']]).map(([number, label]) => <div key={label}><b>{number}</b><span>{label}</span></div>)}</div>
    <h3>Detected structure</h3>{(isAssumption ? [['Product', 'String', '3 unique values'], ['Duration', 'Integer', '30 unique values'], ['Policy Year', 'Integer', '30 unique values'], ['Male', 'Percent', '12,600 values'], ['Female', 'Percent', '12,600 values']] : [['File type', 'CSV (comma-separated)', ''], ['Header row', 'Row 1', ''], ['Columns', '6', ''], ['Detected dimensions', 'Age · Duration · Gender', ''], ['Value column', 'Factor', ''], ['Data rows (after header)', '1,240', '']]).map(([label, type, detail]) => <div className="iw-structure-row" key={label}><span>{label}</span><b>{type}</b><small>{detail}</small></div>)}
    <h3>Data preview (first 10 rows)</h3><DataPreview compact headers={isAssumption ? ['Product', 'Duration', 'Policy Year', 'Male', 'Female'] : ['Age', 'Duration', 'Gender', 'Factor', 'Status']} rows={sampleRows.slice(0, 5)} />
    <div className="iw-preview-alert iw-preview-warning"><TriangleAlert size={24} /><span><b>{isAssumption ? '4 warnings detected' : '3 warnings'}</b><small>Non-critical issues should be reviewed before import.</small></span><ChevronRight size={18} /></div>
    <div className="iw-preview-actions"><button onClick={() => onNotify('Preview data downloaded') }><ArrowDownToLine size={16} />Download preview</button><button onClick={onClose}>Cancel</button><button disabled>Save to library</button></div><p className="iw-preview-unavailable"><Info size={17} />Saving via API is not currently available.</p>
  </aside></div>
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
