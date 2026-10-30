import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { Check, Clipboard, FileUp, LoaderCircle, RefreshCw, Upload, X } from 'lucide-react'
import { ApiError, useApi } from '../../api/ApiProvider'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import { canImportData } from '../../api/permissions'
import { useFocusTrap } from './useFocusTrap'
import type { ExpectedResultSet } from './types'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_DATA_ROWS = 50_000

function errorText(error: unknown): string {
  if (!(error instanceof ApiError)) return error instanceof Error ? error.message : 'The request failed.'
  const guidance: Record<string, string> = {
    PAYLOAD_TOO_LARGE: 'Choose a file smaller than 10 MB.',
    DUPLICATE_EXPECTED_RESULT_KEY: 'Remove duplicate policy/month or year keys and upload again.',
    EXPECTED_RESULTS_DUPLICATE_KEY: 'Remove duplicate policy/month or year keys and upload again.',
    EXPECTED_RESULTS_TOO_MANY_ROWS: 'Reduce the dataset to at most 50,000 data rows.',
    EXPECTED_RESULTS_PRODUCT_MISMATCH: 'Select a benchmark that matches the run product.',
    EXPECTED_RESULTS_TIMING_MISMATCH: 'Choose the timing convention used by the run.',
    EXPECTED_RESULTS_GRANULARITY_MISMATCH: 'Choose a benchmark with a compatible granularity.',
  }
  return guidance[error.code ?? ''] ? `${error.message} ${guidance[error.code ?? '']}` : error.message
}

function countCsvDataRows(text: string): number {
  let records = 0
  let inQuotes = false
  let hasContent = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') index += 1
      else inQuotes = !inQuotes
      hasContent = true
    } else if ((character === '\n' || character === '\r') && !inQuotes) {
      if (hasContent) records += 1
      hasContent = false
      if (character === '\r' && text[index + 1] === '\n') index += 1
    } else if (!/\s/.test(character)) {
      hasContent = true
    }
  }
  if (hasContent) records += 1
  return Math.max(0, records - 1)
}

export function BenchmarkManager({ routeProjectId }: { routeProjectId?: string }) {
  const { projectId: activeProjectId, project } = useWorkspace()
  const projectId = routeProjectId || activeProjectId
  const { request, user } = useApi()
  const canUpload = canImportData(user?.roles ?? [])
  const listQuery = useApiQuery<{ expected_result_sets: ExpectedResultSet[] }>(projectId ? `/v1/projects/${projectId}/expected-results` : null)
  const sets = listQuery.data?.expected_result_sets ?? []
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [productCode, setProductCode] = useState('MYGA')
  const [versionLabel, setVersionLabel] = useState('v1.0')
  const [granularity, setGranularity] = useState<'policy_month' | 'aggregate_year'>('policy_month')
  const [timingConvention, setTimingConvention] = useState<'eom' | 'bom'>('eom')
  const [uploadError, setUploadError] = useState('')
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [dragging, setDragging] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const detailQuery = useApiQuery<ExpectedResultSet>(selectedId ? `/v1/expected-results/${selectedId}?include_rows=true` : null)
  const selectedSet = sets.find(item => item.id === selectedId)
  const uploadDialogRef = useRef<HTMLElement | null>(null)
  const previewDialogRef = useRef<HTMLElement | null>(null)
  useFocusTrap(uploadDialogRef, uploadOpen)
  useFocusTrap(previewDialogRef, Boolean(selectedId))
  useEffect(() => {
    if (!uploadOpen && !selectedId) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !uploadBusy) {
        setUploadOpen(false)
        setSelectedId('')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [uploadOpen, selectedId, uploadBusy])

  const selectFile = async (nextFile?: File) => {
    setUploadError('')
    if (!nextFile) return
    if (nextFile.size > MAX_FILE_BYTES) {
      setFile(null)
      setUploadError('File exceeds the 10 MB upload limit.')
      return
    }
    if (!/\.(csv|json)$/i.test(nextFile.name)) {
      setFile(null)
      setUploadError('Choose a CSV or JSON file.')
      return
    }
    if (nextFile.name.toLowerCase().endsWith('.csv')) {
      try {
        const rows = countCsvDataRows(await nextFile.text())
        if (rows > MAX_DATA_ROWS) {
          setFile(null)
          setUploadError(`File contains ${rows.toLocaleString()} data rows. The maximum is 50,000.`)
          return
        }
      } catch {
        setFile(null)
        setUploadError('Could not read the selected CSV file.')
        return
      }
    } else {
      try {
        const parsed: unknown = JSON.parse(await nextFile.text())
        const rows = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' && 'rows' in parsed && Array.isArray(parsed.rows) ? parsed.rows : null
        if (!rows) throw new Error('JSON must contain an array of row objects, or an object with a rows array.')
        if (rows.length > MAX_DATA_ROWS) throw new Error(`File contains ${rows.length.toLocaleString()} rows. The maximum is 50,000.`)
        if (rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('Every JSON row must be an object.')
      } catch (error) {
        setFile(null)
        setUploadError(error instanceof Error ? error.message : 'The JSON file is invalid.')
        return
      }
    }
    setFile(nextFile)
    if (!name.trim()) setName(nextFile.name.replace(/\.(csv|json)$/i, ''))
  }

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUploadError('')
    setUploadSuccess('')
    if (!projectId || !file) {
      setUploadError('Select a project and a valid benchmark file.')
      return
    }
    setUploadBusy(true)
    try {
      const metadata = { name: name.trim(), product_code: productCode.trim(), version_label: versionLabel.trim(), granularity, timing_convention: timingConvention }
      let created: ExpectedResultSet
      if (file.name.toLowerCase().endsWith('.csv')) {
        const formData = new FormData()
        formData.set('file', file)
        Object.entries(metadata).forEach(([key, value]) => formData.set(key, value))
        created = await request<ExpectedResultSet>(`/v1/projects/${projectId}/expected-results`, { method: 'POST', body: formData })
      } else {
        const parsed: unknown = JSON.parse(await file.text())
        const rows = Array.isArray(parsed) ? parsed : (parsed as { rows: Record<string, unknown>[] }).rows
        created = await request<ExpectedResultSet>(`/v1/projects/${projectId}/expected-results`, {
          method: 'POST',
          body: JSON.stringify({ ...metadata, rows, source_reference: file.name }),
        })
      }
      setUploadSuccess(`Uploaded ${created.name} (${created.row_count.toLocaleString()} rows).`)
      setFile(null)
      setName('')
      setVersionLabel('v1.0')
      setUploadOpen(false)
      listQuery.refetch()
    } catch (error) {
      setUploadError(errorText(error))
    } finally {
      setUploadBusy(false)
    }
  }

  const copyFingerprint = async (item: ExpectedResultSet) => {
    try {
      await navigator.clipboard.writeText(item.fingerprint)
      setCopiedId(item.id)
      window.setTimeout(() => setCopiedId(current => current === item.id ? '' : current), 1800)
    } catch {
      setUploadError('Could not copy the fingerprint. Select and copy it from the benchmark details.')
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    void selectFile(event.dataTransfer.files[0])
  }

  return <section className="m3-workspace">
    <header className="m3-page-heading">
      <div><span className="m3-eyebrow">PROJECT GOVERNANCE · {project?.name ?? projectId ?? 'No project selected'}</span><h2>Expected Results Benchmarks</h2><p>Upload actuarial reference datasets, inspect their contents, and compare them against completed runs.</p></div>
      <button className="m3-primary-button" type="button" onClick={() => { setUploadOpen(true); setUploadError(''); setUploadSuccess('') }} disabled={!projectId || !canUpload}><Upload size={16} />Upload benchmark</button>
    </header>
    {uploadSuccess && <div className="m3-success-banner" role="status"><Check size={17} />{uploadSuccess}</div>}
    {!projectId && <div className="m3-inline-error" role="alert">Select a project before managing benchmarks.</div>}
    {listQuery.loading && sets.length === 0 && <div className="m3-panel"><div className="m3-loading" role="status"><LoaderCircle className="m3-spin" />Loading benchmarks…</div></div>}
    {listQuery.error && <div className="m3-panel"><div className="m3-inline-error" role="alert">{listQuery.error.message}<button className="m3-text-button" type="button" onClick={listQuery.refetch}><RefreshCw size={14} />Retry</button></div></div>}
    {!listQuery.loading && !listQuery.error && sets.length === 0 &&     <div className="m3-panel m3-empty-state"><FileUp size={24} /><h3>No benchmarks yet</h3><p>Upload a CSV or JSON expected-results dataset to begin reconciliation.</p><button className="m3-secondary-button" type="button" onClick={() => setUploadOpen(true)} disabled={!projectId || !canUpload}>Add first benchmark</button></div>}
    {sets.length > 0 && <section className="m3-panel">
      <div className="m3-section-heading"><div><h3>Project benchmarks</h3><span>{sets.length} dataset{sets.length === 1 ? '' : 's'}</span></div><button className="m3-icon-button" type="button" aria-label="Refresh benchmarks" onClick={listQuery.refetch}><RefreshCw size={16} /></button></div>
      {copiedId && <span className="sr-only" role="status">{sets.find(item => item.id === copiedId)?.name ?? 'Benchmark'} fingerprint copied to clipboard.</span>}
      <div className="m3-table-scroll"><table className="m3-table"><thead><tr><th>Name</th><th>Product</th><th>Granularity</th><th>Rows</th><th>Fingerprint</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {sets.map(item => <tr key={item.id}><td><b>{item.name}</b><small>{item.version_label}</small></td><td>{item.product_code}</td><td>{item.granularity}</td><td>{item.row_count.toLocaleString()}</td><td><code title={item.fingerprint}>{item.fingerprint.slice(0, 14)}…</code><button className="m3-inline-icon" type="button" aria-label={`Copy fingerprint for ${item.name}`} onClick={() => void copyFingerprint(item)}>{copiedId === item.id ? <Check size={14} /> : <Clipboard size={14} />}</button></td><td>{item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</td><td><span className="m3-status-pill is-pass">{item.status}</span></td><td><button className="m3-text-button" type="button" onClick={() => setSelectedId(item.id)}>View data</button></td></tr>)}
      </tbody></table></div>
    </section>}
    {uploadOpen && <div className="m3-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !uploadBusy) setUploadOpen(false) }}>
      <section ref={uploadDialogRef} tabIndex={-1} className="m3-modal" role="dialog" aria-modal="true" aria-labelledby="m3-upload-title">
        <div className="m3-section-heading"><div><span className="m3-eyebrow">EXPECTED RESULTS</span><h2 id="m3-upload-title">Upload benchmark</h2></div><button className="m3-icon-button" type="button" aria-label="Close upload dialog" onClick={() => setUploadOpen(false)} disabled={uploadBusy}><X size={18} /></button></div>
        <form onSubmit={upload}>
          <div className={`m3-dropzone ${dragging ? 'is-dragging' : ''}`} onDragEnter={event => { event.preventDefault(); setDragging(true) }} onDragOver={event => event.preventDefault()} onDragLeave={event => { if (event.currentTarget === event.target) setDragging(false) }} onDrop={onDrop}>
            <FileUp size={25} /><b>{file?.name ?? 'Drop a CSV or JSON file here'}</b><span>{file ? `${(file.size / 1024).toFixed(1)} KB · ${file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'JSON'}` : 'Up to 10 MB and 50,000 data rows'}</span>
            <input ref={inputRef} aria-label="Benchmark CSV or JSON file" type="file" accept=".csv,.json,text/csv,application/json" hidden onChange={event => { void selectFile(event.target.files?.[0]); event.currentTarget.value = '' }} />
            <button type="button" className="m3-secondary-button" onClick={() => inputRef.current?.click()}>Browse files</button>
          </div>
          <div className="m3-form-grid">
            <label>Benchmark name<input autoFocus required maxLength={255} value={name} onChange={event => setName(event.target.value)} /></label>
            <label>Product code<input required maxLength={50} value={productCode} onChange={event => setProductCode(event.target.value)} placeholder="MYGA" /></label>
            <label>Version label<input required maxLength={100} value={versionLabel} onChange={event => setVersionLabel(event.target.value)} /></label>
            <label>Granularity<select value={granularity} onChange={event => setGranularity(event.target.value as 'policy_month' | 'aggregate_year')}><option value="policy_month">Policy month</option><option value="aggregate_year">Aggregate year</option></select></label>
            <label>Timing convention<select value={timingConvention} onChange={event => setTimingConvention(event.target.value as 'eom' | 'bom')}><option value="eom">End of month (EOM)</option><option value="bom">Beginning of month (BOM)</option></select></label>
          </div>
          {uploadError && <div className="m3-inline-error" role="alert">{uploadError}</div>}
          {!canUpload && <div className="m3-inline-error" role="alert">Uploading benchmarks requires import or registry write permission.</div>}
          <div className="m3-modal-actions"><button type="button" className="m3-secondary-button" onClick={() => setUploadOpen(false)} disabled={uploadBusy}>Cancel</button><button type="submit" className="m3-primary-button" disabled={uploadBusy || !file || !projectId || !canUpload}>{uploadBusy ? <LoaderCircle className="m3-spin" size={16} /> : <Upload size={16} />}{uploadBusy ? 'Uploading…' : 'Upload benchmark'}</button></div>
        </form>
      </section>
    </div>}
    {selectedId && <div className="m3-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedId('') }}>
      <section ref={previewDialogRef} tabIndex={-1} className="m3-modal m3-preview-modal" role="dialog" aria-modal="true" aria-labelledby="m3-benchmark-title">
        <div className="m3-section-heading"><div><span className="m3-eyebrow">BENCHMARK PREVIEW</span><h2 id="m3-benchmark-title">{detailQuery.data?.name ?? selectedSet?.name ?? 'Expected results'}</h2></div><button className="m3-icon-button" aria-label="Close data preview" type="button" onClick={() => setSelectedId('')}><X size={18} /></button></div>
        {detailQuery.loading && <div className="m3-loading" role="status"><LoaderCircle className="m3-spin" />Loading benchmark rows…</div>}
        {detailQuery.error && <div className="m3-inline-error" role="alert">{detailQuery.error.message}<button className="m3-text-button" type="button" onClick={detailQuery.refetch}>Retry</button></div>}
        {detailQuery.data && <>
          <div className="m3-benchmark-metadata"><span>{detailQuery.data.product_code}</span><span>{detailQuery.data.granularity}</span><span>{detailQuery.data.timing_convention ?? 'Timing not specified'}</span><span>{detailQuery.data.row_count.toLocaleString()} rows</span><code>{detailQuery.data.fingerprint}</code></div>
          <DataPreview rows={(detailQuery.data.rows ?? []).slice(0, 50)} columns={detailQuery.data.columns_detected ?? []} total={detailQuery.data.row_count} />
        </>}
      </section>
    </div>}
  </section>
}

function DataPreview({ rows, columns, total }: { rows: Record<string, unknown>[]; columns: string[]; total: number }) {
  if (!rows.length) return <div className="m3-empty-state"><p>No preview rows are available.</p></div>
  const tableColumns = columns.length ? columns : Object.keys(rows[0])
  return <><div className="m3-table-scroll m3-data-preview"><table className="m3-table"><thead><tr>{tableColumns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{tableColumns.map(column => <td key={column}>{row[column] == null ? '—' : String(row[column])}</td>)}</tr>)}</tbody></table></div><p className="m3-muted">Showing {rows.length} of {total.toLocaleString()} rows.</p></>
}
