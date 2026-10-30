import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Check, CircleAlert, LoaderCircle, Play, Plus, RefreshCw, Save, Workflow } from 'lucide-react'
import { ApiError, useApi } from '../../api/ApiProvider'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import { canImportData } from '../../api/permissions'
import { useFocusTrap } from './useFocusTrap'
import type {
  DependencyAnalysis,
  FormulaGroup,
  FormulaItem,
  FormulaPreview,
  FormulaTestCase,
  FormulaTestRun,
  FormulaValidation,
  ModelOption,
  ModelVersionOption,
} from './types'

type Props = { modelId?: string; versionId?: string; navigate: (path: string) => void }
type FormulaDetail = FormulaItem & { test_cases?: FormulaTestCase[] }

const EMPTY_GROUPS: FormulaGroup[] = []
const EMPTY_MODELS: ModelOption[] = []
const EMPTY_VERSIONS: ModelVersionOption[] = []

function apiMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return error instanceof Error ? error.message : 'The request failed.'
  const messages: Record<string, string> = {
    DSL_SYNTAX_ERROR: 'Fix the formula syntax and validate it again.',
    FORMULA_OUTPUT_NOT_DEFINED: 'Choose an output variable registered in this model version.',
    MODEL_VERSION_MUTATION_FORBIDDEN: 'This model version is approved or published and cannot be changed.',
    FORMULA_OUTPUT_EXISTS: 'A formula already defines this output variable in the selected version.',
    EXPECTED_RESULTS_PRODUCT_MISMATCH: 'Choose a benchmark for the same product as this run.',
  }
  return messages[error.code ?? ''] ? `${error.message} ${messages[error.code ?? '']}` : error.message
}

function parseNumericMap(text: string): Record<string, number> {
  const value: unknown = JSON.parse(text)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Enter a JSON object of variable names and numeric values.')
  const entries = Object.entries(value)
  if (entries.some(([key, item]) => !key.trim() || typeof item !== 'number' || !Number.isFinite(item))) {
    throw new Error('Every value must be a finite number and every variable must have a name.')
  }
  return Object.fromEntries(entries) as Record<string, number>
}

function highlightExpression(expression: string): string {
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const token = /\b(?:prior|min|max|abs|round)\b|\b\d+(?:\.\d+)?\b|(?:\*\*|[+\-*/(),])/g
  let html = ''
  let position = 0
  for (const match of expression.matchAll(token)) {
    const index = match.index ?? 0
    html += escape(expression.slice(position, index))
    const value = match[0]
    const className = value === 'prior' ? 'dsl-token-prior'
      : /^(min|max|abs|round)$/.test(value) ? 'dsl-token-function'
        : /^\d/.test(value) ? 'dsl-token-number' : 'dsl-token-operator'
    html += `<span class="${className}">${escape(value)}</span>`
    position = index + value.length
  }
  return `${html}${escape(expression.slice(position))}\n`
}

function CodeEditor({ value, onChange, readOnly = false }: { value: string; onChange: (value: string) => void; readOnly?: boolean }) {
  const [scrollTop, setScrollTop] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  return <div className={`m3-code-editor ${readOnly ? 'is-readonly' : ''}`}>
    <pre aria-hidden="true" className="m3-code-highlight" style={{ transform: `translate(${-scrollLeft}px, ${-scrollTop}px)` }} dangerouslySetInnerHTML={{ __html: highlightExpression(value) }} />
    <textarea
      aria-label="Formula expression"
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      readOnly={readOnly}
      value={value}
      onChange={event => onChange(event.target.value)}
      onScroll={event => { setScrollTop(event.currentTarget.scrollTop); setScrollLeft(event.currentTarget.scrollLeft) }}
      placeholder="prior(balance) * (1 + credited_rate / 12) - monthly_benefit"
    />
  </div>
}

export function FormulaStudio({ modelId: initialModelId, versionId: initialVersionId, navigate }: Props) {
  const { projectId } = useWorkspace()
  const { request, user } = useApi()
  const canWriteFormulas = canImportData(user?.roles ?? [])
  const modelsQuery = useApiQuery<{ models: ModelOption[] }>(projectId ? `/v1/projects/${projectId}/models` : null)
  const models = modelsQuery.data?.models ?? EMPTY_MODELS
  const [modelId, setModelId] = useState(initialModelId ?? '')
  const versionsQuery = useApiQuery<{ versions: ModelVersionOption[] }>(modelId ? `/v1/models/${modelId}/versions` : null)
  const versions = versionsQuery.data?.versions ?? EMPTY_VERSIONS
  const [versionId, setVersionId] = useState(initialVersionId ?? '')
  const selectedVersion = versions.find(version => version.id === versionId)
  const groupsQuery = useApiQuery<{ groups: FormulaGroup[] }>(versionId ? `/v1/model-versions/${versionId}/formula-groups` : null)
  const groups = groupsQuery.data?.groups ?? EMPTY_GROUPS
  const allFormulas = useMemo(() => groups.flatMap(group => group.formulas.map(formula => ({ ...formula, group_id: group.id }))), [groups])
  const [selectedFormulaId, setSelectedFormulaId] = useState('')
  const selectedFormula = allFormulas.find(formula => formula.id === selectedFormulaId) ?? null
  const detailQuery = useApiQuery<FormulaDetail>(selectedFormulaId ? `/v1/formulas/${selectedFormulaId}/detail` : null)
  const formula = detailQuery.data?.id === selectedFormulaId ? detailQuery.data : selectedFormula
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [name, setName] = useState('')
  const [outputVariable, setOutputVariable] = useState('')
  const [expression, setExpression] = useState('')
  const [explanation, setExplanation] = useState('')
  const [unit, setUnit] = useState('')
  const [groupId, setGroupId] = useState('')
  const [testCasesText, setTestCasesText] = useState('[]')
  const [validation, setValidation] = useState<FormulaValidation | null>(null)
  const [validationError, setValidationError] = useState('')
  const [previewInputs, setPreviewInputs] = useState('{"deposit": 100}')
  const [priorInputs, setPriorInputs] = useState('{"balance": 1000}')
  const [preview, setPreview] = useState<FormulaPreview | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [testRun, setTestRun] = useState<FormulaTestRun | null>(null)
  const [testError, setTestError] = useState('')
  const [testsBusy, setTestsBusy] = useState(false)
  const [bottomTab, setBottomTab] = useState<'preview' | 'tests'>('tests')
  const [showDag, setShowDag] = useState(false)
  const drawerRef = useRef<HTMLFormElement | null>(null)
  const dagQuery = useApiQuery<DependencyAnalysis>(showDag && versionId ? `/v1/model-versions/${versionId}/dependency-analysis${outputVariable.trim() ? `?variable=${encodeURIComponent(outputVariable.trim())}` : ''}` : null)
  const previewExpression = editing ? expression : formula?.expression_text ?? ''
  useFocusTrap(drawerRef, editing && !showDag)

  useEffect(() => { setModelId(initialModelId ?? '') }, [initialModelId])
  useEffect(() => { setVersionId(initialVersionId ?? '') }, [initialVersionId])
  useEffect(() => {
    if (!showDag) return
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowDag(false) }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showDag])
  useEffect(() => {
    if (!editing) return
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) setEditing(false) }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editing, saving])
  useEffect(() => {
    if (!initialModelId && !modelId && models.length) setModelId(models[0].id)
  }, [initialModelId, modelId, models])
  useEffect(() => {
    if (!initialVersionId && !versionId && versions.length) {
      const current = versions.find(version => version.is_current) ?? versions[0]
      setVersionId(current.id)
    }
  }, [initialVersionId, versionId, versions])
  useEffect(() => {
    if (selectedFormula) setSelectedFormulaId(selectedFormula.id)
  }, [selectedFormula, editing])
  useEffect(() => {
    setSelectedFormulaId('')
    setEditing(false)
  }, [versionId])
  useEffect(() => {
    if (!formula || editing) return
    setName(formula.name ?? '')
    setOutputVariable(formula.output_variable ?? '')
    setExpression(formula.expression_text ?? '')
    setExplanation(formula.explanation ?? '')
    setUnit(formula.unit ?? '')
    setGroupId(formula.group_id ?? '')
    setTestCasesText(JSON.stringify(formula.test_cases ?? [], null, 2))
    setValidation(null)
    setPreview(null)
    setTestRun(null)
    setBottomTab('tests')
  }, [formula?.id, detailQuery.data?.id])

  useEffect(() => {
    if (!versionId || !expression.trim() || !outputVariable.trim() || !editing) {
      setValidation(null)
      setValidationError('')
      return
    }
    let active = true
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      request<FormulaValidation>('/v1/formulas/validate-expression', {
        method: 'POST',
        body: JSON.stringify({ expression_text: expression, model_version_id: versionId, output_variable: outputVariable }),
        signal: controller.signal,
      }).then(result => { if (active) { setValidation(result); setValidationError('') } })
        .catch(error => { if (active && !controller.signal.aborted) { setValidation(null); setValidationError(apiMessage(error)) } })
    }, 300)
    return () => { active = false; controller.abort(); window.clearTimeout(timer) }
  }, [request, versionId, expression, outputVariable, editing])

  useEffect(() => {
    if (!previewExpression.trim()) { setPreview(null); setPreviewError(''); return }
    let inputs: Record<string, number>
    let prior: Record<string, number>
    try {
      inputs = parseNumericMap(previewInputs)
      prior = parseNumericMap(priorInputs)
    } catch (error) {
      setPreview(null)
      setPreviewError(error instanceof Error ? error.message : 'Preview inputs are invalid.')
      return
    }
    let active = true
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      request<FormulaPreview>('/v1/formulas/preview', {
        method: 'POST',
        body: JSON.stringify({ expression_text: previewExpression, inputs, prior_inputs: prior }),
        signal: controller.signal,
      }).then(result => { if (active) { setPreview(result); setPreviewError('') } })
        .catch(error => { if (active && !controller.signal.aborted) { setPreview(null); setPreviewError(apiMessage(error)) } })
    }, 300)
    return () => { active = false; controller.abort(); window.clearTimeout(timer) }
  }, [request, previewExpression, previewInputs, priorInputs])

  const canEditVersion = canWriteFormulas && Boolean(versionId && selectedVersion) && !['approved', 'published', 'archived'].includes((selectedVersion?.status ?? '').toLowerCase())
  const startCreate = () => {
    setSelectedFormulaId('')
    setEditing(true)
    setSaveError('')
    setSaveMessage('')
    setName('')
    setOutputVariable('')
    setExpression('')
    setExplanation('')
    setUnit('')
    setGroupId(groups[0]?.id ?? '')
    setTestCasesText('[\n  {\n    "name": "Baseline",\n    "inputs": {},\n    "prior_inputs": {},\n    "expected_output": 0,\n    "abs_tol": 0.01\n  }\n]')
    setValidation(null)
    setTestRun(null)
    setBottomTab('tests')
  }
  const saveFormula = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaveError('')
    setSaveMessage('')
    let testCases: FormulaTestCase[]
    try {
      const parsed: unknown = JSON.parse(testCasesText)
      if (!Array.isArray(parsed)) throw new Error('Test cases must be a JSON array.')
      if (parsed.length > 50) throw new Error('A formula may contain at most 50 governed test cases.')
      const validatedCases: FormulaTestCase[] = []
      for (const item of parsed) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Each test case must be an object.')
        const testCase = item as Record<string, unknown>
        if (typeof testCase.name !== 'string' || !testCase.name.trim() || typeof testCase.expected_output !== 'number' || !Number.isFinite(testCase.expected_output) || typeof testCase.abs_tol !== 'number' || !Number.isFinite(testCase.abs_tol) || testCase.abs_tol < 0) {
          throw new Error('Each test case needs a name, numeric expected output, and non-negative absolute tolerance.')
        }
        validatedCases.push({
          name: testCase.name.trim(),
          inputs: parseNumericMap(JSON.stringify(testCase.inputs ?? {})),
          prior_inputs: parseNumericMap(JSON.stringify(testCase.prior_inputs ?? {})),
          expected_output: testCase.expected_output,
          abs_tol: testCase.abs_tol,
        })
      }
      testCases = validatedCases
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Test cases contain invalid JSON.')
      return
    }
    if (!validation?.valid) {
      setSaveError(validationError || validation?.errors.join(' ') || 'Wait for successful expression validation before saving.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        output_variable: outputVariable.trim(),
        function_ref: 'dsl',
        expression_text: expression.trim(),
        dependencies: [...new Set([...validation.dependencies, ...validation.prior_dependencies])],
        group_id: groupId || undefined,
        explanation: explanation.trim() || undefined,
        unit: unit.trim() || undefined,
        test_cases: testCases,
      }
      const saved = formula?.id
        ? await request<FormulaDetail>(`/v1/formulas/${formula.id}`, { method: 'PUT', body: JSON.stringify({ ...payload, group_id: undefined }) })
        : await request<FormulaDetail>(`/v1/model-versions/${versionId}/formulas`, { method: 'POST', body: JSON.stringify(payload) })
      setSelectedFormulaId(saved.id)
      setEditing(false)
      setSaveMessage('Formula saved.')
      setBottomTab('tests')
      groupsQuery.refetch()
      if (formula?.id) detailQuery.refetch()
      if (showDag) dagQuery.refetch()
    } catch (error) {
      setSaveError(apiMessage(error))
    } finally {
      setSaving(false)
    }
  }
  const runTests = async () => {
    if (!formula?.id) return
    setTestsBusy(true)
    setTestError('')
    try {
      setTestRun(await request<FormulaTestRun>(`/v1/formulas/${formula.id}/run-tests`, { method: 'POST' }))
    } catch (error) {
      setTestError(apiMessage(error))
    } finally {
      setTestsBusy(false)
    }
  }
  const chooseModel = (nextId: string) => {
    setModelId(nextId)
    setVersionId('')
    setSelectedFormulaId('')
    if (!nextId) return
    const nextVersion = models.find(model => model.id === nextId)?.current_version?.id
    if (nextVersion) navigate(`/models/${nextId}/versions/${nextVersion}/formulas`)
    else navigate('/formula-studio')
  }
  const chooseVersion = (nextId: string) => {
    setVersionId(nextId)
    setSelectedFormulaId('')
    if (modelId && nextId) navigate(`/models/${modelId}/versions/${nextId}/formulas`)
  }

  if (modelsQuery.loading && !models.length) return <LoadingState label="Loading project models…" />
  return <section className="m3-workspace">
    <header className="m3-page-heading">
      <div><span className="m3-eyebrow">MODEL GOVERNANCE</span><h2>Formula Studio</h2><p>Author safe formulas, validate dependencies, preview results, and run governed tests.</p></div>
      <button className="m3-secondary-button" type="button" onClick={() => setShowDag(true)} disabled={!versionId}><Workflow size={16} />Dependency graph</button>
    </header>
    <section className="m3-panel m3-context-panel">
      <label>Model<select aria-label="Model" value={modelId} onChange={event => chooseModel(event.target.value)}><option value="">Select a model…</option>{models.map(model => <option key={model.id} value={model.id}>{model.name} · {model.product_code ?? 'Product'}</option>)}</select></label>
      <label>Model version<select aria-label="Model version" value={versionId} onChange={event => chooseVersion(event.target.value)} disabled={!modelId}><option value="">Select a version…</option>{versions.map(version => <option key={version.id} value={version.id}>{version.version_label ?? version.version ?? version.id.slice(0, 8)} · {version.status ?? 'unknown'}{version.is_current ? ' · current' : ''}</option>)}</select></label>
      {selectedVersion && <span className={`m3-status-pill ${canEditVersion ? 'is-draft' : 'is-locked'}`}>{selectedVersion.status ?? 'status unknown'}</span>}
    </section>
    {!projectId && <InlineError message="Select a project before using Formula Studio." />}
    {modelsQuery.error && <InlineError message={`Could not load models: ${modelsQuery.error.message}`} onRetry={modelsQuery.refetch} />}
    {versionsQuery.error && <InlineError message={`Could not load model versions: ${versionsQuery.error.message}`} onRetry={versionsQuery.refetch} />}
    {!modelsQuery.loading && !modelsQuery.error && models.length === 0 && <EmptyState title="No models in this project" detail="Create or select a model version before authoring formulas." />}
    {versionId && <div className="m3-formula-layout">
      <aside className="m3-panel m3-formula-list">
        <div className="m3-section-heading"><div><h3>Formula groups</h3><span>{allFormulas.length} formulas</span></div><button aria-label="Create formula" className="m3-icon-button" type="button" onClick={startCreate} disabled={!canEditVersion}><Plus size={18} /></button></div>
        {groupsQuery.loading && <LoadingState label="Loading formulas…" compact />}
        {groupsQuery.error && <InlineError message={groupsQuery.error.message} onRetry={groupsQuery.refetch} />}
        {!groupsQuery.loading && !groupsQuery.error && groups.length === 0 && <p className="m3-muted">No formula groups are configured for this version.</p>}
        {groups.map(group => <section className="m3-formula-group" key={group.id}><h4>{group.name}</h4>{group.formulas.length ? group.formulas.map(item => <button key={item.id} type="button" className={`m3-formula-choice ${selectedFormulaId === item.id && !editing ? 'is-selected' : ''}`} onClick={() => { setSelectedFormulaId(item.id); setEditing(false); setSaveMessage('') }}><b>{item.name}</b><span>{item.output_variable}</span><small>{item.status ?? 'draft'}</small></button>) : <span className="m3-muted">No formulas</span>}</section>)}
      </aside>
      <section className="m3-formula-main">
        {!editing && !formula && <EmptyState title="Choose a formula" detail="Select a formula from a group or create a new formula for this version." />}
        {saveMessage && !editing && <div className="m3-success-banner" role="status"><Check size={16} />{saveMessage}</div>}
        {editing && <div className="m3-drawer-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setEditing(false) }}><form ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="m3-formula-drawer-title" className="m3-panel m3-formula-editor m3-formula-drawer" onMouseDown={event => event.stopPropagation()} onSubmit={saveFormula}>
          <div className="m3-section-heading"><div><span className="m3-eyebrow">FORMULA DEFINITION</span><h3 id="m3-formula-drawer-title">{formula?.id ? 'Edit formula' : 'Create formula'}</h3></div><div className="m3-drawer-actions"><button type="button" className="m3-secondary-button" onClick={() => setShowDag(true)}><Workflow size={15} />Dependency graph</button><button autoFocus type="button" className="m3-secondary-button" onClick={() => { setEditing(false); setSaveError('') }}>Cancel</button></div></div>
          <div className="m3-form-grid">
            <label>Formula name<input autoFocus required maxLength={255} value={name} onChange={event => setName(event.target.value)} /></label>
            <label>Output variable<input required maxLength={255} value={outputVariable} onChange={event => setOutputVariable(event.target.value)} /></label>
            <label>Formula group<select value={groupId} onChange={event => setGroupId(event.target.value)} disabled={Boolean(formula?.id)}><option value="">Default group</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
            <label>Unit<input maxLength={50} value={unit} onChange={event => setUnit(event.target.value)} placeholder="USD" /></label>
          </div>
          <label className="m3-field-label">Expression</label>
          <CodeEditor value={expression} onChange={setExpression} />
          <div className="m3-validation-row" aria-live="polite">
            {validationError ? <span className="m3-error-text"><CircleAlert size={15} />{validationError}</span>
              : validation ? <span className={validation.valid ? 'm3-success-text' : 'm3-error-text'}>{validation.valid ? <Check size={15} /> : <CircleAlert size={15} />}{validation.valid ? 'Expression valid' : validation.errors.join(' ')}</span>
                : <span className="m3-muted">{expression.trim() ? 'Validating expression…' : 'Enter an expression to validate it.'}</span>}
          </div>
          {validation && <div className="m3-dependency-tags">
            {validation.dependencies.map(item => <span className="m3-tag m3-tag-current" key={`current-${item}`}>{item} · t</span>)}
            {validation.prior_dependencies.map(item => <span className="m3-tag m3-tag-prior" key={`prior-${item}`}>{item} · t−1</span>)}
            {validation.unknown_variables.map(item => <span className="m3-tag m3-tag-unknown" key={`unknown-${item}`}>{item} · unknown</span>)}
            {validation.functions_used.map(item => <span className="m3-tag" key={`function-${item}`}>{item}()</span>)}
          </div>}
          <label className="m3-field-label">Explanation<textarea rows={2} value={explanation} onChange={event => setExplanation(event.target.value)} /></label>
          <label className="m3-field-label">Governed test cases (JSON)<textarea className="m3-json-input" rows={8} spellCheck={false} value={testCasesText} onChange={event => { setTestCasesText(event.target.value); setTestRun(null) }} /></label>
          <p className="m3-muted">Test cases are saved with the formula. Save changes before running the governed test suite.</p>
          <div className="m3-formula-actions">{saveError && <InlineError message={saveError} />}{saveMessage && <span className="m3-success-text">{saveMessage}</span>}<button className="m3-primary-button" type="submit" disabled={saving || !validation?.valid || !canEditVersion}><Save size={16} />{saving ? 'Saving…' : formula?.id ? 'Save changes' : 'Create formula'}</button></div>
          {!canWriteFormulas ? <p className="m3-warning">Formula changes require registries:write permission.</p> : !canEditVersion && <p className="m3-warning">This model version is not mutable or its status is unavailable. Select a confirmed draft version to edit formulas.</p>}
          <section className="m3-preview-panel">
            <div className="m3-section-heading"><div><span className="m3-eyebrow">LIVE PREVIEW</span><h3>Evaluate sample inputs</h3></div><Play size={18} /></div>
            <div className="m3-form-grid"><label>Current step inputs (JSON)<textarea className="m3-json-input" rows={4} value={previewInputs} onChange={event => setPreviewInputs(event.target.value)} /></label><label>Prior step inputs (JSON)<textarea className="m3-json-input" rows={4} value={priorInputs} onChange={event => setPriorInputs(event.target.value)} /></label></div>
            <div aria-live="polite" className="m3-preview-result"><PreviewResult preview={preview} error={previewError} /></div>
          </section>
        </form></div>}
        {!editing && formula && <article className="m3-panel m3-formula-editor">
          <div className="m3-section-heading"><div><span className="m3-eyebrow">{formula.status ?? 'FORMULA'}</span><h3>{formula.name}</h3><p>Output: <code>{formula.output_variable}</code> {formula.unit && `· ${formula.unit}`}</p></div><button className="m3-secondary-button" type="button" onClick={() => { setEditing(true); setSaveError(''); setSaveMessage('') }} disabled={!canEditVersion}><Save size={15} />Edit formula</button></div>
          {detailQuery.loading && <LoadingState label="Loading formula details…" compact />}
          {detailQuery.error && <InlineError message={detailQuery.error.message} onRetry={detailQuery.refetch} />}
          <CodeEditor value={formula.expression_text ?? ''} readOnly onChange={() => undefined} />
          {formula.explanation && <p className="m3-muted">{formula.explanation}</p>}
          <div className="m3-bottom-tabs" role="tablist" aria-label="Formula preview and test suite">
            <button type="button" role="tab" aria-selected={bottomTab === 'preview'} className={bottomTab === 'preview' ? 'is-active' : ''} onClick={() => setBottomTab('preview')}>Live Preview</button>
            <button type="button" role="tab" aria-selected={bottomTab === 'tests'} className={bottomTab === 'tests' ? 'is-active' : ''} onClick={() => setBottomTab('tests')}>Test Suite</button>
          </div>
          {bottomTab === 'preview' && <section className="m3-preview-panel">
            <div className="m3-section-heading"><div><span className="m3-eyebrow">LIVE PREVIEW</span><h3>Evaluate sample inputs</h3></div><Play size={18} /></div>
            <div className="m3-form-grid"><label>Current step inputs (JSON)<textarea className="m3-json-input" rows={4} value={previewInputs} onChange={event => setPreviewInputs(event.target.value)} /></label><label>Prior step inputs (JSON)<textarea className="m3-json-input" rows={4} value={priorInputs} onChange={event => setPriorInputs(event.target.value)} /></label></div>
            <div aria-live="polite" className="m3-preview-result"><PreviewResult preview={preview} error={previewError} /></div>
          </section>}
          {bottomTab === 'tests' && <section className="m3-test-panel">
            <div className="m3-section-heading"><div><span className="m3-eyebrow">GOVERNED TEST SUITE</span><h3>Formula tests</h3></div><button className="m3-primary-button" type="button" onClick={runTests} disabled={testsBusy || !formula.test_cases?.length}><Play size={15} />{testsBusy ? 'Running…' : 'Run all tests'}</button></div>
            {testError && <InlineError message={testError} />}
            {testRun && <p className={testRun.all_passed ? 'm3-success-text' : 'm3-error-text'} aria-live="polite">{testRun.all_passed ? 'All tests passed' : 'One or more tests failed'} · {testRun.passed}/{testRun.total} passed · {testRun.failed} failed</p>}
            {!formula.test_cases?.length && <p className="m3-muted">No governed test cases are configured. Edit this formula to add test cases.</p>}
            {Boolean(formula.test_cases?.length) && <div className="m3-table-scroll"><table className="m3-table"><thead><tr><th>Case</th><th>Expected</th><th>Actual</th><th>Abs diff</th><th>Tolerance</th><th>Status</th></tr></thead><tbody>{formula.test_cases?.map((testCase, index) => {
              const result = testRun?.results[index]
              return <tr key={`${testCase.name}-${index}`}><td>{testCase.name}</td><td>{testCase.expected_output}</td><td>{result?.actual_output ?? '—'}</td><td>{result?.abs_diff ?? '—'}</td><td>{testCase.abs_tol}</td><td>{result ? <><span className={`m3-status-pill ${result.passed ? 'is-pass' : 'is-fail'}`}>{result.passed ? 'PASS' : 'FAIL'}</span>{result.error && <small className="m3-error-text">{result.error}</small>}</> : <span className="m3-status-pill">Not run</span>}</td></tr>
            })}</tbody></table></div>}
          </section>}
        </article>}
      </section>
    </div>}
    {showDag && <DependencyGraph analysis={dagQuery.data} loading={dagQuery.loading} error={dagQuery.error?.message} versionStatus={selectedVersion?.status} versionIsCurrent={selectedVersion?.is_current} selectedVariable={outputVariable} onRetry={dagQuery.refetch} onClose={() => setShowDag(false)} />}
  </section>
}

function dependencyEntries(edges: Record<string, string[]> | string[] | undefined, target: string | null): [string, string[]][] {
  if (Array.isArray(edges)) return target && edges.length ? [[target, edges]] : []
  if (!edges) return []
  return Object.entries(edges).filter((entry): entry is [string, string[]] => Array.isArray(entry[1]))
}

function hasSameStepCycle(entries: [string, string[]][]): boolean {
  const graph = new Map(entries)
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (node: string): boolean => {
    if (visiting.has(node)) return true
    if (visited.has(node)) return false
    visiting.add(node)
    for (const dependency of graph.get(node) ?? []) {
      if (visit(dependency)) return true
    }
    visiting.delete(node)
    visited.add(node)
    return false
  }
  return [...graph.keys()].some(visit)
}

function DependencyGraph({ analysis, loading, error, versionStatus, versionIsCurrent, selectedVariable, onRetry, onClose }: {
  analysis: DependencyAnalysis | null
  loading: boolean
  error?: string
  versionStatus?: string
  versionIsCurrent?: boolean
  selectedVariable: string
  onRetry: () => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLElement | null>(null)
  useFocusTrap(dialogRef, true)
  const targetVariable = analysis?.target_variable ?? analysis?.variable ?? selectedVariable ?? null
  const sameStepEntries = dependencyEntries(analysis?.same_step_dependencies, targetVariable)
  const priorEntries = dependencyEntries(analysis?.prior_dependencies, targetVariable)
  const sameStepCycle = analysis?.circular ?? hasSameStepCycle(sameStepEntries)
  const upstream = analysis?.upstream ?? analysis?.upstream_dependencies ?? []
  const downstream = analysis?.downstream ?? analysis?.downstream_impacted ?? []
  const nodes = useMemo(() => [...new Set([
    ...(analysis?.execution_order ?? []),
    ...sameStepEntries.flatMap(([target, sources]) => [target, ...sources]),
    ...priorEntries.flatMap(([target, sources]) => [target, ...sources]),
  ])], [analysis])
  const width = Math.max(640, nodes.length * 170)
  const x = (name: string) => 82 + Math.max(nodes.indexOf(name), 0) * 165
  return <div className="m3-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section ref={dialogRef} tabIndex={-1} className="m3-modal m3-dag-modal" role="dialog" aria-modal="true" aria-labelledby="m3-dag-title">
      <div className="m3-section-heading"><div><span className="m3-eyebrow">DEPENDENCY ANALYSIS</span><h2 id="m3-dag-title">Model version dependency graph</h2></div><button autoFocus type="button" className="m3-secondary-button" onClick={onClose}>Close</button></div>
      {loading && <LoadingState label="Loading dependency analysis…" />}
      {error && <InlineError message={error} onRetry={onRetry} />}
      {analysis && <>
        <p className={sameStepCycle ? 'm3-error-text' : 'm3-success-text'}>{sameStepCycle ? 'Circular same-step dependency detected.' : 'No same-step circular dependency.'}{(analysis.status ?? versionStatus) && ` · ${analysis.status ?? versionStatus}`}{(analysis.is_current ?? versionIsCurrent) ? ' · current version' : ''}</p>
        <div className="m3-dag-scroll"><svg role="img" aria-label="Formula dependency graph. Solid arrows indicate same-step dependencies; dashed arrows indicate prior-step dependencies." viewBox={`0 0 ${width} 245`} width={width} height="245">
          <defs><marker id="m3-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#466484" /></marker><marker id="m3-prior-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#8b5bd1" /></marker></defs>
          {sameStepEntries.flatMap(([target, sources]) => sources.map(source => <path key={`same-${source}-${target}`} d={`M ${x(source) + 52} 110 C ${x(source) + 100} 110, ${x(target) - 100} 110, ${x(target) - 52} 110`} fill="none" stroke="#466484" strokeWidth="2" markerEnd="url(#m3-arrow)" />))}
          {priorEntries.flatMap(([target, sources]) => sources.map(source => <path key={`prior-${source}-${target}`} d={`M ${x(source)} 85 C ${x(source) - 45} 10, ${x(target) + 45} 10, ${x(target)} 85`} fill="none" stroke="#8b5bd1" strokeWidth="2" strokeDasharray="7 6" markerEnd="url(#m3-prior-arrow)"><title>{source} at t−1 → {target} at t</title></path>))}
          {priorEntries.flatMap(([target, sources]) => sources.map(source => <text key={`prior-label-${source}-${target}`} x={(x(source) + x(target)) / 2} y="35" textAnchor="middle" fontSize="11" fontWeight="700" fill="#7447a8">t−1 → t</text>))}
          {nodes.map((node, index) => <g key={node} transform={`translate(${82 + index * 165}, 110)`}><rect x="-53" y="-25" width="106" height="50" rx="12" fill="#f3f7fb" stroke="#b8c8d8" /><text textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="#20354b">{node}</text></g>)}
        </svg></div>
        <div className="m3-dag-legend"><span><i className="m3-legend-solid" />Same-step dependency (t)</span><span><i className="m3-legend-dashed" />Prior-step feedback (t−1)</span></div>
        <p><b>Target variable:</b> {targetVariable ?? 'All variables'}</p>
        <p><b>Execution order:</b> {(analysis.execution_order ?? []).join(' → ') || 'Not provided'}</p>
        <p><b>Upstream:</b> {upstream.join(', ') || 'None'} · <b>Downstream:</b> {downstream.join(', ') || 'None'}</p>
        <ul className="sr-only" aria-label="Dependency relationships">
          {sameStepEntries.flatMap(([target, sources]) => sources.map(source => <li key={`same-description-${source}-${target}`}>{source} at time t is a same-step dependency of {target} at time t.</li>))}
          {priorEntries.flatMap(([target, sources]) => sources.map(source => <li key={`prior-description-${source}-${target}`}>{source} at time t−1 is a prior-step dependency of {target} at time t.</li>))}
        </ul>
      </>}
    </section>
  </div>
}

function LoadingState({ label, compact = false }: { label: string; compact?: boolean }) {
  return <div className={`m3-loading ${compact ? 'is-compact' : ''}`} role="status"><LoaderCircle size={compact ? 16 : 20} className="m3-spin" />{label}</div>
}

function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="m3-inline-error" role="alert"><CircleAlert size={16} /><span>{message}</span>{onRetry && <button type="button" className="m3-text-button" onClick={onRetry}><RefreshCw size={14} />Retry</button>}</div>
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="m3-empty-state"><Workflow size={23} /><h3>{title}</h3><p>{detail}</p></div>
}

function PreviewResult({ preview, error }: { preview: FormulaPreview | null; error: string }) {
  if (error) return <InlineError message={error} />
  if (!preview) return <span className="m3-muted">Enter valid inputs to evaluate this expression.</span>
  if (!preview.valid) return <span className="m3-error-text"><CircleAlert size={15} />{preview.errors.join(' ') || 'Preview evaluation failed.'}</span>
  return <><b>Result: {preview.result}</b><span>Dependencies: {preview.dependencies.join(', ') || 'none'}</span><span>Inputs used: {Object.entries(preview.inputs_used).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}</span></>
}
