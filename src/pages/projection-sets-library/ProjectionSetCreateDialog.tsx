import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowRight, Check, Database, Plus, X } from 'lucide-react'
import { useApi } from '../../api/ApiProvider'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import { canImportData } from '../../api/permissions'

type ModelVersion = { id: string; version_label: string; status: string; basis?: string }
type ModelRow = { id: string; name: string; product_code?: string; current_version?: ModelVersion | null; status: string }
type InputRow = { id: string; name: string; category?: string; category_label?: string; status: string; version_label?: string; record_count?: number; mapped_column_count?: number }
type ScenarioRow = { id: string; name: string; status: string }
type SelectOption = { variable_name: string; display_name: string; unit?: string }
type ValidationCheck = { status: string; label: string; message?: string }
type PublishedOutputsState = { versionId: string; outputs: SelectOption[]; loading: boolean; error: Error | null }

const emptyModels: ModelRow[] = []
const emptyInputs: InputRow[] = []
const emptyScenarioSets: { scenarios: ScenarioRow[] }[] = []
const emptyOutputs: SelectOption[] = []
const statusIsValidated = (status?: string) => ['validated', 'published', 'ready'].includes((status ?? '').toLowerCase())
const categoryOf = (input: InputRow) => (input.category ?? input.category_label ?? '').toLowerCase().replaceAll(' ', '_')
const monthValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const initialMonth = monthValue(new Date())
const addMonths = (month: string, count: number) => {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1 + count, 1)
  return monthValue(date)
}
const monthDistance = (start: string, end: string) => {
  const [startYear, startMonth] = start.split('-').map(Number)
  const [endYear, endMonth] = end.split('-').map(Number)
  return (endYear - startYear) * 12 + endMonth - startMonth + 1
}

export function ProjectionSetCreateDialog({ onClose, onCreated, onNavigateToInput, onNavigateToScenario }: { onClose: () => void; onCreated: (message: string) => void; onNavigateToInput?: (page: string) => void; onNavigateToScenario?: () => void }) {
  const { projectId } = useWorkspace()
  const { request, user } = useApi()
  const roleCanCreate = canImportData(user?.roles ?? [])
  const modelQuery = useApiQuery<{ models: ModelRow[] }>(projectId ? `/v1/projects/${projectId}/models` : null)
  const inputQuery = useApiQuery<{ inputs: InputRow[] }>(projectId ? `/v1/projects/${projectId}/inputs` : null)
  const scenarioQuery = useApiQuery<{ scenario_sets: { scenarios: ScenarioRow[] }[] }>(projectId ? `/v1/projects/${projectId}/scenario-sets` : null)
  const models = modelQuery.data?.models ?? emptyModels
  const inputs = inputQuery.data?.inputs ?? emptyInputs
  const scenarios = useMemo(() => (scenarioQuery.data?.scenario_sets ?? emptyScenarioSets).flatMap(group => group.scenarios), [scenarioQuery.data])
  const [modelVersionId, setModelVersionId] = useState('')
  const [inforceId, setInforceId] = useState('')
  const [assumptionId, setAssumptionId] = useState('')
  const [factorId, setFactorId] = useState('')
  const [scenarioId, setScenarioId] = useState('')
  const [name, setName] = useState('')
  const [startMonth, setStartMonth] = useState(initialMonth)
  const [endMonth, setEndMonth] = useState(() => addMonths(initialMonth, 119))
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>([])
  const [traceMode, setTraceMode] = useState<'none' | 'selected_policies' | 'all'>('selected_policies')
  const [tracePolicyIds, setTracePolicyIds] = useState('')
  const [formulaConfirmed, setFormulaConfirmed] = useState(false)
  const [inforceConfirmed, setInforceConfirmed] = useState(false)
  const [assumptionConfirmed, setAssumptionConfirmed] = useState(false)
  const [factorConfirmed, setFactorConfirmed] = useState(false)
  const [scenarioConfirmed, setScenarioConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [publishedOutputs, setPublishedOutputs] = useState<PublishedOutputsState>({ versionId: '', outputs: [], loading: false, error: null })

  const selectedModel = models.find(item => item.current_version?.id === modelVersionId)
  const selectedVersion = selectedModel?.current_version
  const outputVersionId = selectedVersion?.id ?? ''
  const outputs = publishedOutputs.versionId === outputVersionId ? publishedOutputs.outputs : emptyOutputs
  const outputLoading = Boolean(outputVersionId && (publishedOutputs.versionId !== outputVersionId || publishedOutputs.loading))
  const outputError = publishedOutputs.versionId === outputVersionId ? publishedOutputs.error : null
  const inforceFiles = inputs.filter(item => ['liability_inforce', 'asset_inforce'].includes(categoryOf(item)))
  const assumptionTables = inputs.filter(item => categoryOf(item) === 'assumption_table')
  const factorTables = inputs.filter(item => categoryOf(item) === 'factor_table')
  const selectedInforce = inforceFiles.find(item => item.id === inforceId)
  const selectedAssumption = assumptionTables.find(item => item.id === assumptionId)
  const selectedFactor = factorTables.find(item => item.id === factorId)
  const selectedScenario = scenarios.find(item => item.id === scenarioId)
  const horizonMonths = startMonth && endMonth && startMonth <= endMonth ? monthDistance(startMonth, endMonth) : 0
  const modelValidated = statusIsValidated(selectedVersion?.status)
  const inforceValidated = statusIsValidated(selectedInforce?.status)
  const tablesValidated = (!assumptionId || statusIsValidated(selectedAssumption?.status)) && (!factorId || statusIsValidated(selectedFactor?.status)) && Boolean(assumptionId || factorId)
  const scenarioValidated = statusIsValidated(selectedScenario?.status)
  const horizonValid = horizonMonths > 0 && horizonMonths <= 1200
  const confirmationsComplete = formulaConfirmed && inforceConfirmed && scenarioConfirmed && (!assumptionId || assumptionConfirmed) && (!factorId || factorConfirmed)

  useEffect(() => {
    if (!outputVersionId) {
      setPublishedOutputs({ versionId: '', outputs: [], loading: false, error: null })
      return
    }
    const controller = new AbortController()
    let active = true
    setPublishedOutputs({ versionId: outputVersionId, outputs: [], loading: true, error: null })
    request<{ outputs: SelectOption[] }>(`/v1/model-versions/${outputVersionId}/published-outputs`, { signal: controller.signal })
      .then(result => { if (active) setPublishedOutputs({ versionId: outputVersionId, outputs: result.outputs ?? [], loading: false, error: null }) })
      .catch(caught => { if (active && !controller.signal.aborted) setPublishedOutputs({ versionId: outputVersionId, outputs: [], loading: false, error: caught instanceof Error ? caught : new Error('Could not load published outputs.') }) })
    return () => { active = false; controller.abort() }
  }, [outputVersionId, request])

  useEffect(() => {
    if (!modelVersionId && models[0]?.current_version?.id) setModelVersionId(models[0].current_version.id)
  }, [models, modelVersionId])
  useEffect(() => {
    if (!inforceId && inforceFiles[0]?.id) setInforceId(inforceFiles[0].id)
  }, [inforceFiles, inforceId])
  useEffect(() => {
    if (!assumptionId && assumptionTables[0]?.id) setAssumptionId(assumptionTables[0].id)
  }, [assumptionTables, assumptionId])
  useEffect(() => {
    if (!factorId && factorTables[0]?.id) setFactorId(factorTables[0].id)
  }, [factorTables, factorId])
  useEffect(() => {
    if (!scenarioId && scenarios[0]?.id) setScenarioId(scenarios[0].id)
  }, [scenarios, scenarioId])
  useEffect(() => {
    if (outputs.length && !selectedOutputs.length) setSelectedOutputs(outputs.map(item => item.variable_name))
  }, [outputs, selectedOutputs.length])

  const create = async () => {
    if (!roleCanCreate || !canCreate || busy || !projectId || !selectedVersion) return
    setBusy(true)
    setError('')
    try {
      const body = {
        name: name.trim(),
        description: `Projection configuration for ${selectedModel?.name ?? 'selected model'}.`,
        version_label: 'v1',
        model_version_id: selectedVersion.id,
        inforce_file_ids: [inforceId],
        assumption_table_ids: assumptionId ? [assumptionId] : [],
        factor_table_ids: factorId ? [factorId] : [],
        scenario_ids: [scenarioId],
        valuation_date: `${startMonth}-01`,
        horizon_months: horizonMonths,
        time_step: 'monthly',
        output_variables: selectedOutputs,
        trace_scope: { mode: traceMode, policy_ids: traceMode === 'selected_policies' ? tracePolicyIds.split(',').map(value => value.trim()).filter(Boolean).slice(0, 25) : [] },
        parameters: {},
      }
      const created = await request<{ id: string; name: string }>(`/v1/projects/${projectId}/projection-sets`, { method: 'POST', body: JSON.stringify(body) })
      const result = await request<{ status?: string; checks?: ValidationCheck[] }>(`/v1/projection-sets/${created.id}/validate`, { method: 'POST' })
      const attention = (result.checks ?? []).filter(item => item.status !== 'pass')
      const outcome = result.status === 'validated' ? 'backend validation passed' : `backend validation status: ${result.status ?? 'needs review'}`
      const detail = attention.map(item => item.message || item.label).filter(Boolean).join(' · ')
      onCreated(`${created.name || name.trim()} created; ${outcome}.${detail ? ` ${detail}` : ''}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Projection Set creation or validation failed.')
    } finally {
      setBusy(false)
    }
  }

  const canCreate = Boolean(projectId && name.trim() && selectedVersion?.id && inforceId && scenarioId && selectedOutputs.length && horizonValid && (traceMode !== 'selected_policies' || tracePolicyIds.split(',').map(value => value.trim()).filter(Boolean).length > 0))
  const loading = modelQuery.loading || inputQuery.loading || scenarioQuery.loading || outputLoading
  const dataError = modelQuery.error || inputQuery.error || scenarioQuery.error || outputError
  const toggleOutput = (variableName: string) => setSelectedOutputs(current => current.includes(variableName) ? current.filter(item => item !== variableName) : [...current, variableName])

  return (
    <div className="projection-modal-backdrop" onClick={onClose}>
      <section aria-labelledby="projection-create-title" aria-modal="true" className="projection-modal projection-setup-modal" onClick={event => event.stopPropagation()} role="dialog">
        <div className="flex items-start justify-between gap-3">
          <div><span className="projection-modal-eyebrow">New projection configuration</span><h2 id="projection-create-title">Create Projection Set</h2></div>
          <button aria-label="Close dialog" onClick={onClose}><X size={19} /></button>
        </div>
        <div className="projection-setup-context"><Database size={16} /><span>Model</span><b>{selectedModel ? `${selectedModel.name} · ${selectedVersion?.version_label ?? '—'}` : 'Select a model below'}</b><span className={modelValidated ? 'projection-context-valid' : 'projection-context-invalid'}>{selectedVersion?.status ?? 'Not selected'}</span></div>
        {dataError && <p className="projection-create-blocked"><AlertCircle size={15} />Could not load configuration data: {[modelQuery.error, inputQuery.error, scenarioQuery.error, outputError].filter(Boolean).map(item => item?.message).join(' · ')}</p>}
        {error && <p className="projection-create-blocked"><AlertCircle size={15} />{error}</p>}
        <div className="projection-setup-checklist">
          <h3>Required before creation</h3>
          <SetupCheck done={modelValidated && formulaConfirmed} title="Validated, runnable model version" detail={`${selectedModel?.name ?? 'Select a model'} · ${selectedVersion?.version_label ?? 'No current version'} · Backend status: ${selectedVersion?.status ?? 'not available'}. Confirm formulas and required variables have been reviewed.`} />
          <SetupCheck done={inforceValidated && inforceConfirmed} title="Validated, fingerprinted inforce file" detail={`${selectedInforce?.name ?? 'Select an inforce file'} · Backend status: ${selectedInforce?.status ?? 'not available'}. Confirm required input columns have been mapped.`} />
          <SetupCheck done={tablesValidated && (!assumptionId || assumptionConfirmed) && (!factorId || factorConfirmed)} title="Required tables pinned by ID" detail={`${selectedAssumption?.name ?? 'No assumption table selected'}${selectedFactor ? ` · ${selectedFactor.name}` : ''}. Confirm selected table IDs and backend statuses.`} />
          <SetupCheck done={scenarioValidated && scenarioConfirmed} title="Compatible, validated scenario" detail={`${selectedScenario?.name ?? 'Select a scenario'} · Backend status: ${selectedScenario?.status ?? 'not available'}. Compatibility is confirmed by backend validation.`} />
          <SetupCheck done={selectedOutputs.length > 0} title="Published model output" detail={selectedOutputs.length ? `${selectedOutputs.length} published output${selectedOutputs.length === 1 ? '' : 's'} selected.` : 'Choose at least one output published by this model version.'} />
          <SetupCheck done={horizonValid} title="Supported monthly horizon" detail={horizonValid ? `${startMonth} through ${endMonth} · ${horizonMonths} monthly periods.` : 'Choose a start and end month within the supported 1–1,200 month range.'} />
        </div>
        <div className="projection-setup-fields">
          <label>Trace capture<select value={traceMode} onChange={event => setTraceMode(event.target.value as 'none' | 'selected_policies' | 'all')}><option value="none">Do not capture trace</option><option value="selected_policies">Selected policies</option><option value="all">All policies (up to 25)</option></select>{traceMode === 'selected_policies' && <input value={tracePolicyIds} onChange={event => setTracePolicyIds(event.target.value)} placeholder="Policy IDs, comma separated" />}</label>
          <label className="projection-setup-full">Projection Set name<input autoFocus maxLength={255} onChange={event => setName(event.target.value)} placeholder="e.g. MYGA GAAP Reserve" value={name} /></label>
          <label>Model<select value={modelVersionId} onChange={event => { setModelVersionId(event.target.value); setSelectedOutputs([]); setFormulaConfirmed(false); setScenarioConfirmed(false) }}><option value="">Select model</option>{models.map(item => item.current_version && <option key={item.current_version.id} value={item.current_version.id}>{item.name} · {item.current_version.version_label} · {item.current_version.status}</option>)}</select></label>
          <label>Inforce file<select value={inforceId} onChange={event => { setInforceId(event.target.value); setInforceConfirmed(false) }}><option value="">Select from Inforce library</option>{inforceFiles.map(item => <option key={item.id} value={item.id}>{item.name} · {item.status} · {item.record_count ?? 0} records</option>)}</select><button className="projection-browse-link" type="button" onClick={() => { if (onNavigateToInput) onNavigateToInput('Import Inforce'); else setError('Input-library navigation is not available from this dialog.') }}>Import or choose inforce file <ArrowRight size={14} /></button></label>
          <label>Validated scenario<select value={scenarioId} onChange={event => { setScenarioId(event.target.value); setScenarioConfirmed(false) }}><option value="">Select a validated scenario</option>{scenarios.map(item => <option key={item.id} value={item.id}>{item.name} · {item.status}</option>)}</select><button className="projection-browse-link" type="button" onClick={() => { onClose(); if (onNavigateToScenario) onNavigateToScenario(); else setError('Scenario-library navigation is not available from this dialog.') }}>Browse scenario library <ArrowRight size={14} /></button></label>
          <label>Assumption table ID<select value={assumptionId} onChange={event => { setAssumptionId(event.target.value); setAssumptionConfirmed(false) }}><option value="">None</option>{assumptionTables.map(item => <option key={item.id} value={item.id}>{item.name} · {item.status}{item.version_label ? ` · ${item.version_label}` : ''}</option>)}</select><button className="projection-browse-link" type="button" onClick={() => { if (onNavigateToInput) onNavigateToInput('Assumption Tables'); else setError('Input-library navigation is not available from this dialog.') }}>Browse assumption tables <ArrowRight size={14} /></button></label>
          <label>Factor table ID<select value={factorId} onChange={event => { setFactorId(event.target.value); setFactorConfirmed(false) }}><option value="">None</option>{factorTables.map(item => <option key={item.id} value={item.id}>{item.name} · {item.status}{item.version_label ? ` · ${item.version_label}` : ''}</option>)}</select><button className="projection-browse-link" type="button" onClick={() => { if (onNavigateToInput) onNavigateToInput('Factor Tables'); else setError('Input-library navigation is not available from this dialog.') }}>Browse factor tables <ArrowRight size={14} /></button></label>
          <label>Start month<input onChange={event => setStartMonth(event.target.value)} type="month" value={startMonth} /></label>
          <label>End month<input onChange={event => setEndMonth(event.target.value)} type="month" value={endMonth} /></label>
          <fieldset className="projection-setup-full"><legend>Published outputs {outputLoading ? '· loading…' : ''}</legend>{outputs.length ? outputs.map(item => <label key={item.variable_name}><input type="checkbox" checked={selectedOutputs.includes(item.variable_name)} onChange={() => toggleOutput(item.variable_name)} />{item.display_name} · {item.variable_name}{item.unit ? ` (${item.unit})` : ''}</label>) : <p>{outputLoading ? 'Loading published outputs…' : 'No published outputs are available for this model version.'}</p>}</fieldset>
        </div>
        <div className="projection-setup-confirmations">
          <label><input checked={formulaConfirmed} onChange={event => setFormulaConfirmed(event.target.checked)} type="checkbox" />I confirmed the model's formulas are runnable and required variables are defined.</label>
          <label><input checked={inforceConfirmed} onChange={event => setInforceConfirmed(event.target.checked)} type="checkbox" />I confirmed this file is validated, fingerprinted, and all required columns are mapped.</label>
          <label><input checked={assumptionConfirmed} onChange={event => setAssumptionConfirmed(event.target.checked)} type="checkbox" />The assumption table is validated and pinned to the selected ID.</label>
          <label><input checked={factorConfirmed} onChange={event => setFactorConfirmed(event.target.checked)} type="checkbox" />The factor table is validated and pinned to the selected ID.</label>
          <label><input checked={scenarioConfirmed} onChange={event => setScenarioConfirmed(event.target.checked)} type="checkbox" />I confirmed the selected scenario is compatible with this model.</label>
        </div>
        <div className="projection-trace-settings">
          <h3>Trace settings <span>Optional</span></h3>
          <p>Trace data is captured during execution and can be investigated later. Selected-policy capture supports up to 25 policy IDs.</p>
          <strong className="projection-trace-warning">Choose a capture mode above before creating this Projection Set.</strong>
        </div>
        <p className="projection-create-blocked">Backend validation is authoritative for run eligibility and compatibility. The setup checks above help review the selected configuration; validation warnings are returned after creation.</p>
        {!confirmationsComplete && <p className="projection-create-blocked">Confirm that you have reviewed the model, inforce, scenario, and any selected table IDs before creating this set.</p>}
        <div className="projection-modal-actions"><button onClick={onClose}>Cancel</button>{roleCanCreate && <button disabled={!canCreate || !confirmationsComplete || busy || loading} onClick={create}><Plus size={16} />{busy ? 'Creating and validating…' : 'Create Projection Set'}</button>}</div>
      </section>
    </div>
  )
}

function SetupCheck({ done, title, detail }: { done: boolean; title: string; detail: string }) {
  return <div className={`projection-setup-check ${done ? 'projection-setup-check-done' : ''}`}><span>{done ? <Check size={14} /> : '!'}</span><div><b>{title}</b><small>{detail}</small></div><strong>{done ? 'Confirmed' : 'Required'}</strong></div>
}
