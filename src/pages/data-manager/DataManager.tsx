import { useMemo, useState } from 'react'
import {
  AlertCircle, ArrowRight, Check, CheckCircle2, ClipboardCheck, CloudUpload,
  Database, FileCheck2, FileSpreadsheet, History, Info, LockKeyhole, RefreshCw,
  ShieldCheck, Sparkles, Upload, XCircle,
} from 'lucide-react'
import { ApiError, useApi } from '../../api/ApiProvider'
import { canImportData, canReviewData } from '../../api/permissions'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import './data-manager.css'

type ImportKind = 'liability_inforce' | 'assumption_table' | 'factor_table' | 'scenario'
type DatasetKind = 'inforce' | 'assumption' | 'factor' | 'scenario'
type MappingField = { source_column: string; target_field: string }
type MappingProfile = { id: string; name: string; category: ImportKind; fields: MappingField[] }
type DatasetRef = { id: string; kind: DatasetKind }
type Dataset = {
  id: string
  kind: DatasetKind
  status: string
  name: string
  version_label?: string | null
  version_number?: number
  committed_by?: string | null
  approved_by?: string | null
  rejected_by?: string | null
  review_reason?: string | null
  row_count?: number
  committed_at?: string | null
}
type VersionResponse = Dataset[] | { versions?: Dataset[]; datasets?: Dataset[]; items?: Dataset[] }

type ImportSession = {
  id: string
  project_id?: string
  kind?: ImportKind
  category?: ImportKind
  name?: string
  version_label?: string | null
  options?: Record<string, unknown>
  status?: string
  file_name?: string
  original_filename?: string | null
  dataset_id?: string | null
  dataset_kind?: DatasetKind | null
  datasets?: DatasetRef[]
  dataset_ids?: string[]
  mapping_fields?: MappingField[]
  mapping_profile_id?: string | null
  validation_run_id?: string | null
  created_at?: string
  updated_at?: string
  record_count?: number
  error_count?: number
  warning_count?: number
}

type PreviewColumn = {
  name: string
  source?: string
  target?: string
  required?: boolean
  sample_values?: unknown[]
}

type PreviewResponse = {
  columns?: PreviewColumn[] | string[]
  headers?: string[]
  rows?: Record<string, unknown>[]
  sample_rows?: Record<string, unknown>[]
  total_rows?: number
  row_count?: number
  mapping?: Record<string, string>
  detected_types?: Record<string, string>
}

type Issue = {
  id?: string | number
  row_number?: number
  row?: number
  code?: string
  field?: string
  column_name?: string | null
  message?: string
  severity?: string
}

type RejectedRecord = {
  id?: string | number
  row_number?: number
  raw_record?: Record<string, unknown>
  canonical_record?: Record<string, unknown>
  reasons?: Issue[]
}

type IssuesResponse = {
  issues?: Issue[]
  rejected_records?: RejectedRecord[]
  records?: RejectedRecord[]
  total?: number
}

type HistoryResponse = {
  import_sessions?: ImportSession[]
  sessions?: ImportSession[]
  items?: ImportSession[]
  total?: number
}

type MappingProfilesResponse = MappingProfile[] | { mapping_profiles?: MappingProfile[]; profiles?: MappingProfile[]; items?: MappingProfile[] }

type ActionResponse = ImportSession & {
  dataset?: Dataset
  kind?: DatasetKind
  name?: string
  version_label?: string | null
  version_number?: number
  validation_run_id?: string
  dataset_ids?: string[]
  datasets?: DatasetRef[]
  dataset_id?: string
  status?: string
}

const categoryOptions: { value: ImportKind; label: string; detail: string; icon: typeof Database }[] = [
  { value: 'liability_inforce', label: 'Inforce', detail: 'Policy or account-level records', icon: Database },
  { value: 'assumption_table', label: 'Assumption table', detail: 'Rates, curves, or assumptions', icon: FileSpreadsheet },
  { value: 'factor_table', label: 'Factor table', detail: 'Multipliers and lookup factors', icon: Sparkles },
  { value: 'scenario', label: 'Scenario', detail: 'Economic or stress scenarios', icon: ShieldCheck },
]

const displayStatus = (status?: string) => (status ?? 'draft').replaceAll('_', ' ')
const formatDate = (value?: string) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const datasetKinds: Record<ImportKind, DatasetKind> = {
  liability_inforce: 'inforce',
  assumption_table: 'assumption',
  factor_table: 'factor',
  scenario: 'scenario',
}
const datasetKindFor = (category: ImportKind): DatasetKind => datasetKinds[category]

function asPreviewColumns(preview: PreviewResponse | null): PreviewColumn[] {
  if (!preview) return []
  if (Array.isArray(preview.columns)) return preview.columns.map(column => typeof column === 'string' ? { name: column, source: column } : column)
  if (Array.isArray(preview.headers)) return preview.headers.map(name => ({ name, source: name }))
  const rows = preview.rows ?? preview.sample_rows ?? []
  return rows[0] ? Object.keys(rows[0]).map(name => ({ name, source: name })) : []
}

function asPreviewRows(preview: PreviewResponse | null, columns: PreviewColumn[]) {
  const rows = preview?.rows ?? preview?.sample_rows ?? []
  return rows.slice(0, 5).map(row => columns.map(column => String(row[column.source ?? column.name] ?? '—')))
}

function historyItems(history: HistoryResponse | null) {
  return history?.import_sessions ?? history?.sessions ?? history?.items ?? []
}

export function DataManager({ initialCategory = 'liability_inforce' }: { initialCategory?: ImportKind }) {
  const { projectId, project } = useWorkspace()
  const { request, user } = useApi()
  const [kind, setKind] = useState<ImportKind>(initialCategory)
  const [datasetName, setDatasetName] = useState('')
  const [versionLabel, setVersionLabel] = useState('')
  const [valuationDate, setValuationDate] = useState('')
  const [expectedRecordCount, setExpectedRecordCount] = useState('')
  const [lookupKeys, setLookupKeys] = useState('')
  const [valueColumn, setValueColumn] = useState('')
  const [tableType, setTableType] = useState('generic')
  const [scenarioModelVersionId, setScenarioModelVersionId] = useState('')
  const [scenarioStructuralOnly, setScenarioStructuralOnly] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [session, setSession] = useState<ImportSession | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [mappingProfileId, setMappingProfileId] = useState('')
  const [mappingProfileName, setMappingProfileName] = useState('')
  const [validationRunId, setValidationRunId] = useState('')
  const [selectedDatasetId, setSelectedDatasetId] = useState('')
  const [comparisonBaseId, setComparisonBaseId] = useState('')
  const [compareDatasetId, setCompareDatasetId] = useState('')
  const [datasetRecord, setDatasetRecord] = useState<Dataset | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const roles = user?.roles ?? []
  const uploadAllowed = canImportData(roles)
  const reviewAllowed = canReviewData(roles)
  const sessionId = session?.id ?? null
  const category = session?.category ?? kind
  const previewQuery = useApiQuery<PreviewResponse>(sessionId ? `/v1/import-sessions/${sessionId}/preview` : null)
  const issuesQuery = useApiQuery<IssuesResponse>(validationRunId ? `/v1/validation-runs/${validationRunId}/issues` : null)
  const rejectedQuery = useApiQuery<IssuesResponse>(validationRunId ? `/v1/validation-runs/${validationRunId}/rejected-records?limit=50&offset=0` : null)
  const mappingProfilesQuery = useApiQuery<MappingProfilesResponse>(
    projectId && category ? `/v1/mapping-profiles?project_id=${encodeURIComponent(projectId)}&category=${encodeURIComponent(category)}` : null,
  )
  const historyQuery = useApiQuery<HistoryResponse>(projectId ? `/v1/projects/${projectId}/import-sessions` : null)
  const datasets = session?.datasets?.length
    ? session.datasets
    : session?.dataset_id
      ? [{ id: session.dataset_id, kind: (session.dataset_kind as DatasetKind | null) ?? datasetKindFor(category) }]
      : []
  const selectedDataset = datasets.find(dataset => dataset.id === selectedDatasetId) ?? datasets[0]
  const versionsQuery = useApiQuery<VersionResponse>(selectedDataset ? `/v1/datasets/${selectedDataset.kind}/${selectedDataset.id}/versions` : null)
  const comparisonBaseDatasetId = comparisonBaseId || selectedDataset?.id || ''
  const compareQuery = useApiQuery<{ changes?: { change: string; key: string[]; before?: Record<string, unknown>; after?: Record<string, unknown> }[]; added_count?: number; removed_count?: number; changed_count?: number }>(
    selectedDataset && comparisonBaseDatasetId && compareDatasetId && compareDatasetId !== comparisonBaseDatasetId
      ? `/v1/datasets/${selectedDataset.kind}/${encodeURIComponent(comparisonBaseDatasetId)}/compare?other_id=${encodeURIComponent(compareDatasetId)}&limit=50`
      : null,
  )
  const columns = useMemo(() => asPreviewColumns(previewQuery.data), [previewQuery.data])
  const rows = useMemo(() => asPreviewRows(previewQuery.data, columns), [previewQuery.data, columns])
  const mappingProfiles = Array.isArray(mappingProfilesQuery.data)
    ? mappingProfilesQuery.data
    : mappingProfilesQuery.data?.mapping_profiles ?? mappingProfilesQuery.data?.profiles ?? mappingProfilesQuery.data?.items ?? []
  const versions = Array.isArray(versionsQuery.data)
    ? versionsQuery.data
    : versionsQuery.data?.versions ?? versionsQuery.data?.datasets ?? versionsQuery.data?.items ?? []
  const issues = issuesQuery.data?.issues ?? []
  const rejectedRecords = rejectedQuery.data?.rejected_records ?? rejectedQuery.data?.records ?? []
  const datasetId = selectedDataset?.id ?? session?.dataset_id ?? null
  const sessionKind = datasets.find(dataset => dataset.id === selectedDataset?.id)?.kind ?? session?.dataset_kind ?? datasetKindFor(category)
  const sessionStatus = (session?.status ?? '').toLowerCase()
  const sessionFileName = session?.original_filename ?? session?.file_name
  const step = !session ? 1 : !sessionFileName && !file ? 2 : !previewQuery.data ? 3 : sessionStatus === 'committed' ? 5 : 4
  const blockingIssueCount = issues.filter(issue => issue.severity === 'error').length
  const currentDataset = (datasetRecord?.id === selectedDataset?.id ? datasetRecord : null) ?? versions.find(version => version.id === selectedDataset?.id) ?? null
  const canDecide = reviewAllowed && ['validated', 'needs_review'].includes((currentDataset?.status ?? '').toLowerCase())
  const canStartSession = Boolean(projectId && datasetName.trim()) && (category !== 'scenario' || scenarioStructuralOnly || Boolean(scenarioModelVersionId.trim()))

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusyAction(label)
    setError('')
    setSuccess('')
    try {
      await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `${label} failed.`)
    } finally {
      setBusyAction('')
    }
  }

  const createSession = () => runAction('Creating session', async () => {
    if (!uploadAllowed) throw new Error('Your role cannot start an import session.')
    if (!projectId) throw new Error('Select a project before starting an import session.')
    if (!datasetName.trim()) throw new Error('Enter a name for this dataset before starting the import session.')
    const options: Record<string, unknown> = {}
    if (category === 'liability_inforce') {
      if (valuationDate) options.valuation_date = valuationDate
      if (expectedRecordCount) options.expected_record_count = Number(expectedRecordCount)
    } else if (category === 'assumption_table' || category === 'factor_table') {
      if (lookupKeys.trim()) options.lookup_keys = lookupKeys.split(',').map(value => value.trim()).filter(Boolean)
      if (valueColumn.trim()) options.value_column = valueColumn.trim()
      if (tableType.trim()) options.table_type = tableType.trim()
    } else if (category === 'scenario') {
      if (scenarioModelVersionId.trim()) options.model_version_id = scenarioModelVersionId.trim()
      if (scenarioStructuralOnly) options.structural_only = true
      if (!scenarioModelVersionId.trim() && !scenarioStructuralOnly) throw new Error('Choose a model version for scenario validation or enable structural-only validation.')
    }
    const created = await request<ImportSession>('/v1/import-sessions', {
      method: 'POST',
      body: JSON.stringify({
        project_id: projectId,
        category,
        name: datasetName.trim(),
        version_label: versionLabel.trim() || null,
        options,
      }),
    })
    setSession(created)
    setFile(null)
    setMapping({})
    setValidationRunId('')
    setSelectedDatasetId('')
    setComparisonBaseId('')
    setCompareDatasetId('')
    setSuccess('Import session created. Add a source file to continue.')
    historyQuery.refetch()
  })

  const uploadFile = () => runAction('Uploading file', async () => {
    if (!uploadAllowed) throw new Error('Your role cannot upload files.')
    if (!sessionId || !file) throw new Error('Choose a file before uploading.')
    const body = new FormData()
    body.append('file', file)
    const uploaded = await request<ActionResponse>(`/v1/import-sessions/${sessionId}/files`, { method: 'POST', body })
    setSession(current => ({ ...(current ?? { id: sessionId }), ...uploaded, file_name: uploaded.file_name ?? file.name, original_filename: uploaded.original_filename ?? file.name }))
    setValidationRunId('')
    setMapping({})
    setMappingProfileId('')
    setSuccess(`${file.name} uploaded. Preview the rows and confirm the mapping.`)
    previewQuery.refetch()
    historyQuery.refetch()
  })

  const saveMapping = () => runAction('Saving mapping', async () => {
    if (!uploadAllowed) throw new Error('Your role cannot change import mappings.')
    if (!sessionId) throw new Error('Start an import session first.')
    const fields = columns.reduce<MappingField[]>((next, column) => {
      const source = column.source ?? column.name
      const value = mapping[source] ?? previewQuery.data?.mapping?.[source]
      if (value) next.push({ source_column: source, target_field: value })
      return next
    }, [])
    const body = mappingProfileId ? { profile_id: mappingProfileId } : { fields }
    const updated = await request<ImportSession>(`/v1/import-sessions/${sessionId}/mapping`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    setSession(current => ({ ...(current ?? { id: sessionId }), ...updated }))
    setSuccess('Column mapping saved. Run validation when the mapping is ready.')
    previewQuery.refetch()
  })

  const saveMappingProfile = () => runAction('Saving mapping profile', async () => {
    if (!uploadAllowed) throw new Error('Your role cannot save mapping profiles.')
    if (!projectId || !mappingProfileName.trim()) throw new Error('Enter a name for the mapping profile.')
    const fields = columns.flatMap(column => {
      const source = column.source ?? column.name
      const target = mapping[source] ?? previewQuery.data?.mapping?.[source]
      return target ? [{ source_column: source, target_field: target }] : []
    })
    if (!fields.length) throw new Error('Map at least one source column before saving a profile.')
    const profile = await request<MappingProfile>('/v1/mapping-profiles', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, category, name: mappingProfileName.trim(), fields }),
    })
    setMappingProfileId(profile.id)
    setSuccess(`Mapping profile “${profile.name}” saved.`)
    mappingProfilesQuery.refetch()
  })

  const validate = () => runAction('Validating import', async () => {
    if (!uploadAllowed) throw new Error('Your role cannot validate imports.')
    if (!sessionId) throw new Error('Start an import session first.')
    const result = await request<{ id: string; status: 'passed' | 'invalid'; error_count: number; warning_count: number; accepted_count: number; rejected_count: number }>(`/v1/import-sessions/${sessionId}/validate`, { method: 'POST' })
    setValidationRunId(result.id)
    const status = result.status === 'invalid' ? 'invalid' : result.warning_count > 0 ? 'needs_review' : 'validated'
    setSession(current => current ? { ...current, status } : current)
    setSuccess(`Validation ${displayStatus(result.status)}: ${result.error_count} errors, ${result.warning_count} warnings, ${result.accepted_count} accepted, ${result.rejected_count} rejected.`)
    issuesQuery.refetch()
    rejectedQuery.refetch()
    previewQuery.refetch()
    historyQuery.refetch()
  })

  const commit = () => runAction('Committing dataset', async () => {
    if (!uploadAllowed) throw new Error('Your role cannot commit imported data.')
    if (!sessionId) throw new Error('Start an import session first.')
    const result = await request<Dataset & { dataset_ids?: string[] }>(`/v1/import-sessions/${sessionId}/commit`, { method: 'POST' })
    const refs = (result.dataset_ids ?? [result.id]).map(id => ({ id, kind: result.kind }))
    setSession(current => current ? {
      ...current,
      status: 'committed',
      dataset_id: result.id,
      dataset_kind: result.kind,
      dataset_ids: refs.map(dataset => dataset.id),
      datasets: refs,
      validation_run_id: validationRunId || current.validation_run_id,
    } : current)
    setDatasetRecord(result)
    setSelectedDatasetId(result.id)
    setComparisonBaseId(result.id)
    setCompareDatasetId('')
    setSuccess(`${refs.length} dataset${refs.length === 1 ? '' : 's'} committed. Independent review is required before approval.`)
    historyQuery.refetch()
  })

  const decide = (decision: 'approve' | 'reject') => runAction(decision === 'approve' ? 'Approving dataset' : 'Rejecting dataset', async () => {
    if (!reviewAllowed) throw new Error('Your role cannot approve or reject imported data.')
    if (!datasetId) throw new Error('A committed dataset ID is required for review.')
    if (decision === 'reject' && !rejectReason.trim()) throw new Error('Add a reason before rejecting this dataset.')
    let result: Dataset
    try {
      result = await request<Dataset>(`/v1/datasets/${encodeURIComponent(sessionKind)}/${encodeURIComponent(datasetId)}/${decision}`, {
        method: 'POST',
        body: decision === 'reject' ? JSON.stringify({ reason: rejectReason.trim() }) : JSON.stringify({}),
      })
    } catch (caught) {
      if (caught instanceof ApiError && (caught.code === 'SELF_APPROVAL_FORBIDDEN' || caught.message.includes('SELF_APPROVAL_FORBIDDEN'))) {
        throw new Error('You cannot review a dataset you committed. Ask another authorized reviewer to approve or reject it.')
      }
      throw caught
    }
    setDatasetRecord(result)
    setSession(current => current ? {
      ...current,
      status: 'committed',
      datasets: current.datasets?.map(dataset => dataset.id === result.id ? { id: result.id, kind: result.kind } : dataset),
      dataset_id: result.id,
      dataset_kind: result.kind,
    } : current)
    setSuccess(`Dataset ${decision === 'approve' ? 'approved' : 'rejected'} successfully.`)
    setRejectReason('')
    historyQuery.refetch()
  })

  const resetSession = () => {
    setSession(null)
    setFile(null)
    setMapping({})
    setValidationRunId('')
    setSelectedDatasetId('')
    setComparisonBaseId('')
    setCompareDatasetId('')
    setDatasetRecord(null)
    setError('')
    setSuccess('')
  }

  const selectHistorySession = async (item: ImportSession) => {
    setDatasetRecord(null)
    setSession(item)
    setKind(item.category ?? kind)
    setDatasetName(item.name ?? '')
    setVersionLabel(item.version_label ?? '')
    setValuationDate(String(item.options?.valuation_date ?? ''))
    setExpectedRecordCount(item.options?.expected_record_count === undefined ? '' : String(item.options.expected_record_count))
    setLookupKeys(Array.isArray(item.options?.lookup_keys) ? item.options.lookup_keys.join(', ') : '')
    setValueColumn(String(item.options?.value_column ?? ''))
    setTableType(String(item.options?.table_type ?? 'generic'))
    setScenarioModelVersionId(String(item.options?.model_version_id ?? ''))
    setScenarioStructuralOnly(item.options?.structural_only === true)
    setMapping(Object.fromEntries((item.mapping_fields ?? []).map(field => [field.source_column, field.target_field])))
    setValidationRunId(item.validation_run_id ?? '')
    setSelectedDatasetId(item.dataset_id ?? item.datasets?.[0]?.id ?? '')
    setComparisonBaseId(item.dataset_id ?? item.datasets?.[0]?.id ?? '')
    setMappingProfileId(item.mapping_profile_id ?? '')
    setFile(null)
    setError('')
    setSuccess('')
    try {
      const result = await request<ImportSession>(`/v1/import-sessions/${item.id}`)
      setSession(result)
      setDatasetName(result.name ?? '')
      setVersionLabel(result.version_label ?? '')
      setValuationDate(String(result.options?.valuation_date ?? ''))
      setExpectedRecordCount(result.options?.expected_record_count === undefined ? '' : String(result.options.expected_record_count))
      setLookupKeys(Array.isArray(result.options?.lookup_keys) ? result.options.lookup_keys.join(', ') : '')
      setValueColumn(String(result.options?.value_column ?? ''))
      setTableType(String(result.options?.table_type ?? 'generic'))
      setScenarioModelVersionId(String(result.options?.model_version_id ?? ''))
      setScenarioStructuralOnly(result.options?.structural_only === true)
      setMapping(Object.fromEntries((result.mapping_fields ?? []).map(field => [field.source_column, field.target_field])))
      setValidationRunId(result.validation_run_id ?? '')
      setSelectedDatasetId(result.dataset_id ?? result.datasets?.[0]?.id ?? '')
      setComparisonBaseId(result.dataset_id ?? result.datasets?.[0]?.id ?? '')
      setMappingProfileId(result.mapping_profile_id ?? '')
      setDatasetRecord(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load this import session.')
    }
  }

  return <div className="data-manager-page">
    <header className="data-manager-heading">
      <div className="data-manager-heading-copy">
        <span className="data-manager-eyebrow"><Database size={13} /> DATA GOVERNANCE <i /> IMPORT CONTROL</span>
        <h1>Data manager</h1>
        <p>Move source data into your project through a controlled, reviewable release workflow.</p>
      </div>
      <div className="data-manager-heading-meta">
        <span className="data-manager-project"><span className="data-manager-dot" />{project?.name ?? 'No project selected'}</span>
        <span className="data-manager-role"><LockKeyhole size={13} />{roles.length ? roles.join(' · ') : 'Role unavailable'}</span>
      </div>
    </header>

    <section className="data-manager-flow-overview" aria-label="Import workflow progress">
      <div className="data-manager-flow-summary">
        <span className="data-manager-flow-icon"><ShieldCheck size={19} /></span>
        <div><span>GOVERNED IMPORT</span><b>{['Choose a dataset', 'Upload your source', 'Review columns', 'Validate and commit', 'Review release'][step - 1]}</b><small>{session ? `${displayStatus(session.status)} · ${sessionFileName ?? 'No source file yet'}` : 'Four dataset types · validation before release'}</small></div>
      </div>
      <div className="data-manager-flow-progress" aria-label={`Step ${step} of 5`}>
        <div className="data-manager-flow-progress-label"><span>Workflow progress</span><b>0{step} <i>/ 05</i></b></div>
        <div className="data-manager-flow-progress-track">{[1, 2, 3, 4, 5].map(index => <span key={index} className={step > index ? 'is-done' : step === index ? 'is-active' : ''} />)}</div>
      </div>
      <span className="data-manager-flow-assurance"><LockKeyhole size={14} />Approval-controlled</span>
    </section>

    {error && <div className="data-manager-alert is-error" role="alert"><AlertCircle size={17} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><XCircle size={16} /></button></div>}
    {success && <div className="data-manager-alert is-success" role="status"><CheckCircle2 size={17} /><span>{success}</span><button onClick={() => setSuccess('')} aria-label="Dismiss success"><XCircle size={16} /></button></div>}

    <div className="data-manager-layout">
      <main className="data-manager-main">
        <section className="data-manager-card data-manager-category-card">
          <div className="data-manager-card-heading"><div><span className="data-manager-step-label">STEP 01</span><h2>Choose the data contract</h2><p>Start with the governed dataset category. This controls validation rules and approval routing.</p></div><span className="data-manager-step-badge">{step}/5</span></div>
          <div className="data-manager-category-grid" role="listbox" aria-label="Import category">
            {categoryOptions.map(option => { const Icon = option.icon; return <button key={option.value} className={`data-manager-category ${kind === option.value ? 'is-selected' : ''}`} onClick={() => { setKind(option.value); if (!session) setMapping({}) }} role="option" aria-selected={kind === option.value} disabled={Boolean(session)}><span className="data-manager-category-icon"><Icon size={18} /></span><span><b>{option.label}</b><small>{option.detail}</small></span>{kind === option.value && <Check size={16} />}</button> })}
          </div>
          {!session && <div className="data-manager-session-fields">
            <label>Dataset name<input value={datasetName} onChange={event => setDatasetName(event.target.value)} placeholder="Name this dataset" maxLength={255} /></label>
            <label>Version label<input value={versionLabel} onChange={event => setVersionLabel(event.target.value)} placeholder="Optional version label" maxLength={30} /></label>
            {kind === 'liability_inforce' && <>
              <label>Valuation date<input type="date" value={valuationDate} onChange={event => setValuationDate(event.target.value)} /></label>
              <label>Expected record count<input type="number" min="0" step="1" value={expectedRecordCount} onChange={event => setExpectedRecordCount(event.target.value)} placeholder="Optional" /></label>
            </>}
            {(kind === 'assumption_table' || kind === 'factor_table') && <>
              <label>Lookup keys<input value={lookupKeys} onChange={event => setLookupKeys(event.target.value)} placeholder="Comma-separated, e.g. age, gender" /></label>
              <label>Value column<input value={valueColumn} onChange={event => setValueColumn(event.target.value)} placeholder="Optional; defaults to last column" /></label>
              <label>Table type<input value={tableType} onChange={event => setTableType(event.target.value)} placeholder="generic" /></label>
            </>}
            {kind === 'scenario' && <>
              <label>Model version ID<input value={scenarioModelVersionId} onChange={event => setScenarioModelVersionId(event.target.value)} placeholder="Required unless structural-only" /></label>
              <label className="data-manager-checkbox"><input type="checkbox" checked={scenarioStructuralOnly} onChange={event => setScenarioStructuralOnly(event.target.checked)} />Structural-only validation</label>
            </>}
          </div>}
          {session ? <div className="data-manager-session-strip"><div><span className="data-manager-session-id">ACTIVE SESSION</span><b>{session.id}</b></div><span className={`data-manager-status status-${sessionStatus || 'draft'}`}>{displayStatus(session.status)}</span>{uploadAllowed && <button className="data-manager-link-button" onClick={resetSession}>Start another <ArrowRight size={14} /></button>}</div> : <div className="data-manager-start-row"><span><Info size={15} />Create a session to reserve an auditable import workspace.</span>{uploadAllowed && <button className="data-manager-primary-button" disabled={!canStartSession || Boolean(busyAction)} onClick={() => void createSession()}><ClipboardCheck size={17} />{busyAction === 'Creating session' ? 'Creating…' : 'Start import session'}</button>}</div>}
          {!uploadAllowed && <p className="data-manager-permission-note"><LockKeyhole size={14} />Upload and commit actions require admin, actuary, or model_developer access.</p>}
        </section>

        {session && <>
          <section className="data-manager-card">
            <div className="data-manager-card-heading"><div><span className="data-manager-step-label">STEP 02</span><h2>Upload source file</h2><p>Attach the source file to <strong>{session.id}</strong>. Original files remain linked to the import session.</p></div><CloudUpload size={22} className="data-manager-muted-icon" /></div>
            {uploadAllowed && <label className={`data-manager-dropzone ${file ? 'has-file' : ''}`} htmlFor="data-manager-file"><input id="data-manager-file" type="file" accept=".csv,.tsv,.xlsx,.parquet" disabled={Boolean(busyAction)} onChange={event => setFile(event.target.files?.[0] ?? null)} /><FileSpreadsheet size={25} /><span>{file ? file.name : sessionFileName ?? 'Choose CSV, TSV, XLSX, or Parquet'}</span><small>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB · ready to upload` : 'Use a source export with stable column headers.'}</small></label>}
            <div className="data-manager-action-row"><span className="data-manager-file-note">{sessionFileName ? 'A file is already attached. Uploading again replaces the session file.' : 'No file attached yet.'}</span>{uploadAllowed && <button className="data-manager-primary-button" disabled={!file || Boolean(busyAction)} onClick={() => void uploadFile()}><Upload size={17} />{busyAction === 'Uploading file' ? 'Uploading…' : 'Upload and preview'}</button>}</div>
          </section>

          <section className="data-manager-card">
            <div className="data-manager-card-heading"><div><span className="data-manager-step-label">STEP 03</span><h2>Preview and map columns</h2><p>Confirm the sample rows and map source headers to the destination schema before validating.</p></div><FileCheck2 size={22} className="data-manager-muted-icon" /></div>
            {previewQuery.loading && <div className="data-manager-loading"><RefreshCw size={16} className="data-manager-spin" />Loading preview…</div>}
            {previewQuery.error && <div className="data-manager-inline-error"><AlertCircle size={15} />Preview unavailable: {previewQuery.error.message}</div>}
            {!previewQuery.loading && !previewQuery.error && !columns.length && <div className="data-manager-empty"><FileSpreadsheet size={20} /><span>Upload a file to see its headers and sample records.</span></div>}
            {columns.length > 0 && <>
              <div className="data-manager-preview-meta"><span><b>{previewQuery.data?.total_rows ?? previewQuery.data?.row_count ?? '—'}</b> source rows</span><span><b>{columns.length}</b> detected columns</span><span><b>{issues.length}</b> current issues</span></div>
              <div className="data-manager-table-wrap"><table className="data-manager-table"><thead><tr>{columns.map(column => <th key={column.name}>{column.name}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, rowIndex) => <tr key={`preview-${rowIndex}`}>{row.map((value, columnIndex) => <td key={`${rowIndex}-${columnIndex}`}>{value}</td>)}</tr>) : <tr><td colSpan={columns.length}>No sample rows returned by the API.</td></tr>}</tbody></table></div>
              <div className="data-manager-mapping"><div className="data-manager-subheading"><h3>Column mapping</h3><span>Use the backend schema names for destination fields.</span></div>
                {mappingProfilesQuery.error && <div className="data-manager-inline-error"><AlertCircle size={14} />Could not load mapping profiles: {mappingProfilesQuery.error.message}</div>}
                <div className="data-manager-profile-row"><label>Reuse profile<select value={mappingProfileId} onChange={event => { const profileId = event.target.value; setMappingProfileId(profileId); const profile = mappingProfiles.find(item => item.id === profileId); if (profile) setMapping(Object.fromEntries(profile.fields.map(field => [field.source_column, field.target_field]))) }}><option value="">Map columns manually</option>{mappingProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label><label>Save current mapping as<input value={mappingProfileName} onChange={event => setMappingProfileName(event.target.value)} placeholder="Mapping profile name" /></label><button className="data-manager-secondary-button" disabled={!mappingProfileName.trim() || Boolean(busyAction)} onClick={() => void saveMappingProfile()}>{busyAction === 'Saving mapping profile' ? 'Saving…' : 'Save profile'}</button></div>
                {columns.map(column => { const source = column.source ?? column.name; return <label key={source}><span>{source}{column.required && <em> required</em>}</span><input value={mapping[source] ?? previewQuery.data?.mapping?.[source] ?? ''} onChange={event => { setMappingProfileId(''); setMapping(current => ({ ...current, [source]: event.target.value })) }} placeholder="Destination field" disabled={Boolean(mappingProfileId)} /></label> })}</div>
              <div className="data-manager-action-row"><span className="data-manager-file-note">Mapping is saved against this session and included in validation.</span>{uploadAllowed && <><button className="data-manager-secondary-button" disabled={Boolean(busyAction)} onClick={() => void saveMapping()}>{busyAction === 'Saving mapping' ? 'Saving…' : 'Save mapping'}</button><button className="data-manager-primary-button" disabled={Boolean(busyAction)} onClick={() => void validate()}><ClipboardCheck size={17} />{busyAction === 'Validating import' ? 'Validating…' : 'Run validation'}</button></>}</div>
            </>}
          </section>

          <section className="data-manager-card data-manager-validation-card">
            <div className="data-manager-card-heading"><div><span className="data-manager-step-label">STEP 04</span><h2>Validate and commit</h2><p>Resolve blocking issues before making the dataset available for review.</p></div><ShieldCheck size={22} className="data-manager-muted-icon" /></div>
            <div className="data-manager-validation-grid"><div className={`data-manager-check-tile ${['validated', 'needs_review'].includes(sessionStatus) ? 'is-good' : ''}`}><span>{['validated', 'needs_review'].includes(sessionStatus) ? <CheckCircle2 size={18} /> : <ClipboardCheck size={18} />}</span><div><b>Validation status</b><small>{session.status ? displayStatus(session.status) : 'Not run yet'}</small></div></div><div className={`data-manager-check-tile ${blockingIssueCount === 0 && ['validated', 'needs_review'].includes(sessionStatus) ? 'is-good' : ''}`}><span><AlertCircle size={18} /></span><div><b>Blocking issues</b><small>{blockingIssueCount ? `${blockingIssueCount} error${blockingIssueCount === 1 ? '' : 's'}` : 'None returned'}</small></div></div><div className="data-manager-check-tile"><span><Database size={18} /></span><div><b>Rejected records</b><small>{rejectedRecords.length ? `${rejectedRecords.length} record${rejectedRecords.length === 1 ? '' : 's'}` : 'None returned'}</small></div></div></div>
            {(issuesQuery.loading || rejectedQuery.loading) && <div className="data-manager-loading"><RefreshCw size={16} className="data-manager-spin" />Loading validation findings…</div>}
            {issuesQuery.error && <div className="data-manager-inline-error"><AlertCircle size={14} />Could not load validation issues: {issuesQuery.error.message}</div>}
            {rejectedQuery.error && <div className="data-manager-inline-error"><AlertCircle size={14} />Could not load rejected records: {rejectedQuery.error.message}</div>}
            {issues.length > 0 && <div className="data-manager-findings"><h3>Issues</h3>{issues.slice(0, 8).map((issue, index) => <div key={String(issue.id ?? index)}><span>Row {issue.row_number ?? issue.row ?? '—'}</span><b>{issue.column_name ?? issue.field ?? 'Record'}</b><p>{issue.message ?? 'Validation issue returned by the API.'}</p></div>)}</div>}
            {rejectedRecords.length > 0 && <div className="data-manager-findings is-rejected"><h3>Rejected records</h3>{rejectedRecords.slice(0, 5).map((record, index) => <div key={String(record.id ?? index)}><span>Row {record.row_number ?? '—'}</span><b>{record.reasons?.map(reason => reason.column_name ?? reason.field ?? reason.code).filter(Boolean).join(', ') || 'Record'}</b><p>{record.reasons?.map(reason => reason.message).filter(Boolean).join('; ') || 'Rejected by validation.'}<br />Source: {JSON.stringify(record.raw_record ?? {})}</p></div>)}</div>}
            <div className="data-manager-action-row"><span className="data-manager-file-note">Commit creates a dataset record and starts the approval gate. Warnings are allowed; errors are blocking.</span>{uploadAllowed && <button className="data-manager-primary-button" disabled={!['validated', 'needs_review'].includes(sessionStatus) || blockingIssueCount > 0 || Boolean(busyAction)} onClick={() => void commit()}><Database size={17} />{busyAction === 'Committing dataset' ? 'Committing…' : 'Commit dataset'}</button>}</div>
          </section>

          {datasetId && <section className="data-manager-card data-manager-review-card"><div className="data-manager-card-heading"><div><span className="data-manager-step-label">STEP 05</span><h2>Approval gate</h2><p>Reviewers make the final release decision for the committed dataset. The uploader cannot approve their own upload.</p></div><ShieldCheck size={22} className="data-manager-muted-icon" /></div>{datasets.length > 1 && <label className="data-manager-dataset-select">Scenario dataset<select value={selectedDataset?.id ?? ''} onChange={event => { setSelectedDatasetId(event.target.value); setComparisonBaseId(event.target.value); setCompareDatasetId(''); setDatasetRecord(null) }}>{datasets.map(dataset => <option key={dataset.id} value={dataset.id}>{dataset.id}</option>)}</select></label>}<div className="data-manager-review-context"><span>Dataset</span><b>{datasetId}</b><span className={`data-manager-status status-${(currentDataset?.status ?? sessionStatus) || 'committed'}`}>{displayStatus(currentDataset?.status ?? session.status ?? 'committed')}</span></div>{!reviewAllowed && <p className="data-manager-permission-note"><LockKeyhole size={14} />Approval actions require admin, actuary, or reviewer access.</p>}{reviewAllowed && canDecide && <><label className="data-manager-reject-field">Rejection reason<input value={rejectReason} onChange={event => setRejectReason(event.target.value)} placeholder="Required only when rejecting" disabled={Boolean(busyAction)} /></label><div className="data-manager-action-row"><span className="data-manager-file-note">Kind: {sessionKind} · governed dataset ID: {datasetId}</span><button className="data-manager-danger-button" disabled={Boolean(busyAction) || !rejectReason.trim()} onClick={() => void decide('reject')}><XCircle size={17} />{busyAction === 'Rejecting dataset' ? 'Rejecting…' : 'Reject'}</button><button className="data-manager-primary-button" disabled={Boolean(busyAction)} onClick={() => void decide('approve')}><CheckCircle2 size={17} />{busyAction === 'Approving dataset' ? 'Approving…' : 'Approve dataset'}</button></div></>}{reviewAllowed && !canDecide && <p className="data-manager-permission-note">{currentDataset?.status ? `This dataset is ${displayStatus(currentDataset.status)} and is not awaiting review.` : 'Loading the committed dataset lifecycle status…'}</p>}</section>}
          {datasetId && <section className="data-manager-card data-manager-history-card">
            <div className="data-manager-card-heading"><div><span className="data-manager-step-label">DATASET LIFECYCLE</span><h2>Versions and comparison</h2><p>Review every immutable version and compare rows between versions.</p></div><History size={22} className="data-manager-muted-icon" /></div>
            {versionsQuery.loading && <div className="data-manager-loading"><RefreshCw size={15} className="data-manager-spin" />Loading dataset versions…</div>}
            {versionsQuery.error && <div className="data-manager-inline-error"><AlertCircle size={14} />Could not load dataset versions: {versionsQuery.error.message}</div>}
            {!versionsQuery.loading && !versionsQuery.error && versions.length === 0 && <div className="data-manager-empty"><History size={18} /><span>No dataset versions were returned.</span></div>}
            {versions.length > 0 && <>
              <div className="data-manager-version-list">{versions.map(version => <div key={version.id} className="data-manager-version-row"><span><b>{version.name}</b><small>{version.version_label ?? `Version ${version.version_number}`} · {version.row_count?.toLocaleString() ?? '—'} rows</small></span><span className={`data-manager-status status-${version.status}`}>{displayStatus(version.status)}</span><small>{version.committed_at ? formatDate(version.committed_at) : ''}</small></div>)}</div>
              <div className="data-manager-profile-row data-manager-compare-controls"><label>Compare from (before)<select value={comparisonBaseDatasetId} onChange={event => { setComparisonBaseId(event.target.value); setCompareDatasetId('') }}>{versions.map(version => <option key={version.id} value={version.id}>{version.version_label ?? `Version ${version.version_number}`} · {version.status}</option>)}</select></label><label>Compare to (after)<select value={compareDatasetId} onChange={event => setCompareDatasetId(event.target.value)}><option value="">Select another version</option>{versions.filter(version => version.id !== comparisonBaseDatasetId).map(version => <option key={version.id} value={version.id}>{version.version_label ?? `Version ${version.version_number}`} · {version.status}</option>)}</select></label></div>
              {compareQuery.error && <div className="data-manager-inline-error"><AlertCircle size={14} />Comparison failed: {compareQuery.error.message}</div>}
              {compareQuery.loading && <div className="data-manager-loading"><RefreshCw size={15} className="data-manager-spin" />Comparing versions…</div>}
              {compareQuery.data && <><div className="data-manager-preview-meta"><span><b>{compareQuery.data.added_count ?? 0}</b> added</span><span><b>{compareQuery.data.removed_count ?? 0}</b> removed</span><span><b>{compareQuery.data.changed_count ?? 0}</b> changed</span></div><div className="data-manager-findings">{(compareQuery.data.changes ?? []).slice(0, 20).map((change, index) => <div key={`${change.change}-${index}`}><span>{change.change}</span><b>{change.key.join(', ')}</b><p>{change.before ? JSON.stringify(change.before) : '—'} → {change.after ? JSON.stringify(change.after) : '—'}</p></div>)}</div></>}
            </>}
          </section>}
        </>}
      </main>

      <aside className="data-manager-sidebar">
        <section className="data-manager-card data-manager-rail-card"><div className="data-manager-subheading"><h2>Governed path</h2><span>Every import leaves an audit trail.</span></div><ol className="data-manager-rail">{['Choose contract', 'Upload source', 'Preview & map', 'Validate & commit', 'Approve or reject'].map((label, index) => <li key={label} className={step === index + 1 ? 'is-active' : step > index + 1 ? 'is-done' : ''}><span>{step > index + 1 ? <Check size={14} /> : index + 1}</span><div><b>{label}</b><small>{index === 0 ? kind.replaceAll('_', ' ') : index === 1 ? 'Original file retained' : index === 2 ? 'Schema alignment' : index === 3 ? 'Blocking checks' : 'Role-controlled gate'}</small></div></li>)}</ol><div className="data-manager-rail-foot"><LockKeyhole size={14} /><span><b>Least privilege</b><small>Operators prepare data; reviewers release it.</small></span></div></section>
        <section className="data-manager-card data-manager-history-card"><div className="data-manager-subheading"><div><h2>Session history</h2><span>Recent project imports</span></div><button className="data-manager-icon-button" onClick={() => historyQuery.refetch()} aria-label="Refresh import history"><RefreshCw size={15} /></button></div>{historyQuery.loading && <div className="data-manager-loading"><RefreshCw size={15} className="data-manager-spin" />Loading history…</div>}{historyQuery.error && <div className="data-manager-inline-error"><AlertCircle size={14} />{historyQuery.error.message}</div>}{!historyQuery.loading && !historyQuery.error && historyItems(historyQuery.data).length === 0 && <div className="data-manager-empty"><History size={18} /><span>No import sessions for this project yet.</span></div>}{historyItems(historyQuery.data).slice(0, 8).map(item => <button key={item.id} className={`data-manager-history-item ${item.id === sessionId ? 'is-current' : ''}`} onClick={() => void selectHistorySession(item)}><span className="data-manager-history-icon"><FileCheck2 size={15} /></span><span><b>{item.original_filename ?? item.file_name ?? `${item.category ?? 'import'} session`}</b><small>{displayStatus(item.status)} · {formatDate(item.updated_at ?? item.created_at)}</small></span><ArrowRight size={14} /></button>)}<p className="data-manager-history-note"><History size={13} />History is sourced from the project import-session API.</p></section>
      </aside>
    </div>
  </div>
}

export default DataManager
