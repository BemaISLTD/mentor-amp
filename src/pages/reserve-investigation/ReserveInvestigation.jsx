import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  CircleMinus,
  ChevronUp,
  Code2,
  Database,
  ExternalLink,
  Flag,
  FlaskConical,
  Link2,
  MessageCircle,
  MoreVertical,
  Plus,
  Play,
  Search,
  Send,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Table2,
} from 'lucide-react'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import { useApp } from '../../context/useApp'
import './reserve-investigation.css'

export function ReserveInvestigation({ onNotify, onViewChange }) {
  const { projectId, project } = useWorkspace()
  const { investigationIntent, clearInvestigationIntent } = useApp()
  const runsQuery = useApiQuery(projectId ? `/v1/runs?project_id=${encodeURIComponent(projectId)}&limit=100` : null)
  const runs = useMemo(() => (runsQuery.data?.runs ?? []).map((run) => {
    const completed = run.completed_at ? new Date(run.completed_at) : null
    const version = run.model_version
    return {
      id: run.id,
      project: project?.name || 'Active project',
      model: [version?.model_name, version?.version_label, version?.basis].filter(Boolean).join(' · ') || '—',
      projectionSet: run.projection_set?.name || '—',
      status: run.status,
      policies: run.progress?.total ?? 0,
      completed: completed && !Number.isNaN(completed.valueOf()) ? completed.toLocaleDateString() : '—',
      time: completed && !Number.isNaN(completed.valueOf()) ? completed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      horizon: run.horizon_months ?? 0,
      valuationDate: run.valuation_date,
      traceCapable: ['success', 'partial_success'].includes(run.status),
    }
  }), [runsQuery.data, project?.name])
  const [view, setView] = useState('selector')
  const [traceContext, setTraceContext] = useState(null)
  useEffect(() => {
    if (!investigationIntent?.runId) return
    const run = runs.find((item) => item.id === investigationIntent.runId)
    if (!run || !investigationIntent.policyId) return
    setTraceContext({
      run,
      policyId: investigationIntent.policyId,
      month: investigationIntent.month ?? 0,
      variable: investigationIntent.metric || 'net_reserve',
      depth: 4,
    })
    setView('trace')
    onViewChange?.('trace')
    clearInvestigationIntent()
  }, [runs, investigationIntent, clearInvestigationIntent, onViewChange])
  const openTraceExplorer = () => {
    setView('trace')
    onViewChange?.('trace')
  }
  const returnToRunSelector = () => {
    setView('selector')
    onViewChange?.('selector')
  }

  return view === 'selector'
    ? <InvestigationRunSelector
        runs={runs}
        loading={runsQuery.loading}
        error={runsQuery.error}
        onRetry={runsQuery.refetch}
        onNotify={onNotify}
        onOpenTrace={(context) => { setTraceContext(context); openTraceExplorer() }}
      />
    : <TraceExplorerView
        context={traceContext}
        onNotify={onNotify}
        onBackToRuns={returnToRunSelector}
      />
}

function InvestigationRunSelector({ runs, loading, error, onRetry, onNotify, onOpenTrace }) {
  const { investigationIntent } = useApp()
  const [selectedRunId, setSelectedRunId] = useState(investigationIntent?.runId || '')
  const [runSearch, setRunSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('All projects')
  const [modelFilter, setModelFilter] = useState('All versions')
  const [projectionFilter, setProjectionFilter] = useState('All sets')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [policy, setPolicy] = useState(investigationIntent?.policyId || '')
  const [month, setMonth] = useState(String(investigationIntent?.month ?? 0))
  const [variable, setVariable] = useState(investigationIntent?.metric || '')
  const [traceDepth, setTraceDepth] = useState('4')
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? runs[0]
  const policiesQuery = useApiQuery(
    selectedRun?.traceCapable ? `/v1/runs/${encodeURIComponent(selectedRun.id)}/trace/policies${selectedRun.status === 'partial_success' ? '?include_partial=true' : ''}` : null,
  )
  const tracedPolicies = policiesQuery.data?.policy_ids ?? []
  useEffect(() => {
    if (runs.length && !runs.some((run) => run.id === selectedRunId)) setSelectedRunId(runs[0].id)
  }, [runs, selectedRunId])
  useEffect(() => {
    if (!variable && policiesQuery.data) {
      const firstRunOutput = policiesQuery.data.variables?.[0]
      if (firstRunOutput) setVariable(firstRunOutput)
    }
  }, [policiesQuery.data, variable])
  const visibleRuns = runs.filter((run) => (
    run.id.toLowerCase().includes(runSearch.trim().toLowerCase())
    && (projectFilter === 'All projects' || run.project === projectFilter)
    && (modelFilter === 'All versions' || run.model === modelFilter)
    && (projectionFilter === 'All sets' || run.projectionSet === projectionFilter)
    && (statusFilter === 'All statuses' || run.status === statusFilter)
  ))
  const modelOptions = [...new Set(runs.map((run) => run.model))]
  const projectionOptions = [...new Set(runs.map((run) => run.projectionSet))]
  const statusOptions = [...new Set(runs.map((run) => run.status))]
  const canOpenTrace = Boolean(selectedRun?.traceCapable && tracedPolicies.includes(policy.trim()) && month !== '' && variable.trim() && traceDepth && !policiesQuery.loading)

  const updateSelection = (run) => {
    setSelectedRunId(run.id)
    setPolicy('')
    if (!run.traceCapable) onNotify('Trace is available only for successful runs.')
  }

  return (
    <div className="investigation-selector-page">
      <header className="investigation-selector-heading">
        <div>
          <span>INVESTIGATE / NEW INVESTIGATION</span>
          <h2>Start an investigation</h2>
          <p>Choose a completed run, a policy, month, and variable with captured trace data.</p>
        </div>
        <div className="investigation-selector-actions">
          <button onClick={() => document.getElementById('investigation-run-search')?.focus()}><Search size={17} />Search</button>
          <button disabled title="Investigation deep links are not supported by this frontend yet."><Share2 size={17} />Share</button>
          <button disabled title="No backend investigation view options are available."><SlidersHorizontal size={17} />View</button>
        </div>
      </header>

      <div className="investigation-selector-layout">
        <main className="investigation-selector-main">
          <section className="investigation-step-card investigation-run-step">
            <div className="investigation-step-heading">
              <span className="investigation-step-number investigation-step-ready">1</span>
              <div><h3>Select run</h3><p>Choose a completed run with captured trace data.</p></div>
              <button className="investigation-run-details" onClick={() => onNotify(selectedRun ? `Run details: ${selectedRun.id}` : 'Select a run first')}>View run details <ArrowRight size={17} /></button>
            </div>
            <div className="investigation-run-filters">
              <label className="investigation-run-search"><Search size={18} /><input id="investigation-run-search" onChange={(event) => setRunSearch(event.target.value)} placeholder="Search runs..." value={runSearch} /></label>
              <InvestigationFilter label="Project" value={projectFilter} onChange={setProjectFilter} options={['All projects', ...new Set(runs.map((run) => run.project))]} />
              <InvestigationFilter label="Model version" value={modelFilter} onChange={setModelFilter} options={['All versions', ...modelOptions]} />
              <InvestigationFilter label="Projection set" value={projectionFilter} onChange={setProjectionFilter} options={['All sets', ...projectionOptions]} />
              <InvestigationFilter label="Status" value={statusFilter} onChange={setStatusFilter} options={['All statuses', ...statusOptions]} />
            </div>
            <div className="investigation-runs-table-wrap">
              <table className="investigation-runs-table">
                <thead><tr><th aria-label="Selected" /><th>Run name <ArrowDownSortIcon /></th><th>Project <ArrowDownSortIcon /></th><th>Model version</th><th>Status</th><th>Trace <ArrowDownSortIcon /></th><th>Policies</th><th>Completed <ArrowDownSortIcon /></th></tr></thead>
                <tbody>
                  {visibleRuns.map((run) => <tr className={selectedRun?.id === run.id ? 'investigation-run-selected' : ''} key={run.id} onClick={() => updateSelection(run)}>
                    <td><button className="investigation-run-radio" aria-label={`Select ${run.id}`} aria-pressed={selectedRun?.id === run.id} onClick={(event) => { event.stopPropagation(); updateSelection(run) }}>{selectedRun?.id === run.id ? <CircleCheck size={20} /> : <Circle size={20} />}</button></td>
                    <td>{run.id}</td><td>{run.project}</td><td>{run.model}</td>
                    <td><span className="investigation-run-status">{run.status}</span></td>
                    <td><span className={run.traceCapable ? 'investigation-trace-yes' : 'investigation-trace-no'}>{run.traceCapable ? <CircleCheck size={20} /> : <CircleMinus size={20} />}{run.traceCapable ? 'Check availability' : 'Not available'}</span></td>
                    <td>{run.policies}</td><td><span className="investigation-completed-date">{run.completed}<small>{run.time}</small></span></td>
                  </tr>)}
                  {visibleRuns.length === 0 && <tr><td className="investigation-empty-runs" colSpan="8">{loading ? 'Loading runs…' : error ? 'Could not load runs.' : 'No runs match these filters.'}</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="investigation-run-count">{error ? <>{error.message} <button onClick={onRetry}>Try again</button></> : `Showing ${visibleRuns.length} of ${runs.length} runs`}</p>
          </section>

          <section className="investigation-step-card investigation-target-step">
            <div className="investigation-step-heading">
              <span className={`investigation-step-number ${canOpenTrace ? 'investigation-step-ready' : ''}`}>2</span>
              <div><h3>Select trace target</h3><p>Choose the policy, month, and variable to investigate.</p></div>
            </div>
            <div className="investigation-target-fields">
              <label>Policy<div className="investigation-input-wrap"><Search size={18} /><input list="investigation-traced-policies" onChange={(event) => setPolicy(event.target.value)} placeholder={policiesQuery.loading ? 'Loading traceable policies…' : 'Select a traceable policy...'} value={policy} /></div><datalist id="investigation-traced-policies">{tracedPolicies.map((id) => <option key={id} value={id} />)}</datalist><small>{policiesQuery.error ? policiesQuery.error.message : `${tracedPolicies.length} policies with captured trace data`}</small></label>
              <label>Projection month<div className="investigation-input-wrap"><CalendarDays size={18} /><select onChange={(event) => setMonth(event.target.value)} value={month}><option value="">Select month</option>{Array.from({ length: Math.max(0, Math.min(selectedRun?.horizon ?? 0, 600)) + 1 }, (_, offset) => <option key={offset} value={offset}>{formatProjectionMonth(selectedRun?.valuationDate, offset)} · Month {offset}</option>)}</select><ChevronDown size={16} /></div><small>Select a month within this run&apos;s horizon.</small></label>
              <label>Variable<div className="investigation-input-wrap"><Database size={18} /><input onChange={(event) => setVariable(event.target.value)} placeholder="Enter output variable, e.g. net_reserve" value={variable} /></div><small>Enter the exact variable name recorded by the run.</small></label>
              <label>Trace depth<div className="investigation-input-wrap"><TraceTreeIcon /><select onChange={(event) => setTraceDepth(event.target.value)} value={traceDepth}><option value="4">4 levels</option>{[1, 2, 3, 5, 6, 7, 8, 9, 10].map((level) => <option key={level} value={level}>{level} levels</option>)}</select><ChevronDown size={16} /></div><small>Number of calculation levels to trace (1–10).</small></label>
            </div>
            <div className="investigation-target-footer">
              <button className="investigation-cancel-button" onClick={() => { setPolicy(''); onNotify('Investigation selection cleared') }}>Cancel</button>
              <div><button className="investigation-open-trace" disabled={!canOpenTrace} onClick={() => onOpenTrace({ run: selectedRun, policyId: policy.trim(), month: Number(month), variable: variable.trim(), depth: Number(traceDepth) })}><Play size={17} />Open Trace Explorer</button><small>{canOpenTrace ? `Ready to trace ${variable} for policy ${policy.trim()}.` : 'Select a successful run, a traceable policy, month, and variable.'}</small></div>
            </div>
          </section>
        </main>

        <aside className="investigation-availability-panel">
          <section className="investigation-trace-availability">
            <header><Database size={29} /><div><h3>Trace availability</h3><p>Trace data is required to investigate model results.</p></div></header>
            {selectedRun && policiesQuery.loading ? <div className="investigation-no-trace-banner"><Database size={25} /><div><b>Checking trace data…</b><small>The backend is checking which policies were captured for this run.</small></div></div> : selectedRun && policiesQuery.error ? <div className="investigation-no-trace-banner"><AlertTriangle size={25} /><div><b>Trace availability could not be loaded</b><small>{policiesQuery.error.message}</small></div></div> : selectedRun && tracedPolicies.length > 0 ? (
              <div className="investigation-selected-run-details">
                <div className="investigation-trace-captured-banner"><span><Check size={23} /></span><div><b>Trace captured for this run</b><small>This run has trace data available for investigation.</small></div></div>
                <dl>
                  <InvestigationRunDetail label="Run name" value={selectedRun.id} />
                  <InvestigationRunDetail label="Project" value={selectedRun.project} />
                  <InvestigationRunDetail label="Model version" value={selectedRun.model} />
                  <InvestigationRunDetail label="Projection set" value={selectedRun.projectionSet} />
                  <InvestigationRunDetail label="Status" value={<span className="investigation-run-status">{selectedRun.status}</span>} />
                  <InvestigationRunDetail label="Captured policies" value={tracedPolicies.length.toLocaleString()} />
                  <InvestigationRunDetail label="Trace mode" value={policiesQuery.data?.mode || '—'} />
                  <InvestigationRunDetail label="Completed" value={`${selectedRun.completed}, ${selectedRun.time}`} />
                </dl>
              </div>
            ) : (
              <div className="investigation-no-trace-banner"><AlertTriangle size={25} /><div><b>{selectedRun ? 'Trace data not captured' : 'Select a run'}</b><small>{selectedRun ? 'This run has no trace records available. Select a run with captured trace data.' : 'Choose a project run to check trace availability.'}</small></div></div>
            )}
            <div className="investigation-trace-warning"><AlertTriangle size={27} /><div><b>Trace must be captured during execution</b><p>If a run does not have trace data, it cannot be reconstructed later. Please re-run the model with trace capture enabled.</p><button disabled title="Trace capture documentation is not available in this frontend yet.">Learn more about trace capture <ArrowUpRightIcon /></button></div></div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function InvestigationFilter({ label, value, onChange, options }) {
  return <label className="investigation-filter"><span>{label}</span><div><select aria-label={label} onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={15} /></div></label>
}

function InvestigationRunDetail({ label, value }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>
}

function ArrowDownSortIcon() {
  return <span className="investigation-sort-icon">↕</span>
}

function TraceTreeIcon() {
  return <span className="investigation-tree-icon"><Circle size={7} /><i /><Circle size={7} /></span>
}

function ArrowUpRightIcon() {
  return <ArrowRight className="investigation-arrow-up-right" size={15} />
}

function formatProjectionMonth(valuationDate, offset) {
  if (!valuationDate) return `Projection month ${offset}`
  const date = new Date(`${valuationDate}T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + offset)
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function formatTraceValue(value, unit) {
  if (value == null) return '—'
  const formatted = typeof value === 'number' ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(value) : String(value)
  return unit ? `${formatted} ${unit}` : formatted
}

function TraceExplorerView({ context, onNotify, onBackToRuns }) {
  const [focus, setFocus] = useState(context ? { variable: context.variable, month: context.month } : null)
  const [checkpoints, setCheckpoints] = useState([])
  const [scratchpadAdded, setScratchpadAdded] = useState(false)
  const [mentorOpen, setMentorOpen] = useState(true)
  const [question, setQuestion] = useState('')
  const [experimentRate, setExperimentRate] = useState('')
  const query = context && focus
    ? `/v1/runs/${encodeURIComponent(context.run.id)}/trace?policy_id=${encodeURIComponent(context.policyId)}&month=${focus.month}&variable=${encodeURIComponent(focus.variable)}&depth=${context.depth}${context.run.status === 'partial_success' ? '&include_partial=true' : ''}`
    : null
  const traceQuery = useApiQuery(query)
  const root = traceQuery.data?.root ?? null
  const traceNodes = root ? [root, ...(root.children ?? [])].map((node) => ({
    id: `${node.variable}-${node.month}`,
    variable: node.variable,
    month: node.month,
    type: node.kind === 'formula' || node.kind === 'valuation' ? 'Formula' : node.kind === 'result' ? 'Result' : 'Input',
    name: node.display_name || node.variable,
    value: formatTraceValue(node.value, node.unit),
    rawValue: node.value,
    detail: node,
    kind: node.kind === 'formula' || node.kind === 'valuation' ? 'formula' : node.kind === 'result' ? 'result' : 'input',
  })) : []
  const selected = traceNodes[0] ?? null
  useEffect(() => {
    setFocus(context ? { variable: context.variable, month: context.month } : null)
  }, [context])
  const addCheckpoint = () => {
    if (!selected) return
    const exists = checkpoints.some((checkpoint) => checkpoint.variable === selected.variable && checkpoint.month === selected.month)
    if (exists) {
      onNotify(`${selected.name} is already pinned`)
      return
    }
    setCheckpoints((items) => [...items, {
      id: `${selected.variable}-${selected.month}`,
      title: selected.name,
      run: `Run ${context.run.id} · ${root?.period_end_date || `Month ${selected.month}`}`,
      time: root?.kind ? `${root.kind} · ${selected.value}` : selected.value,
      variable: selected.variable,
      month: selected.month,
    }])
    onNotify(`${selected.name} pinned for this session`)
  }

  const askMentor = (nextQuestion = question) => {
    const prompt = nextQuestion.trim()
    if (!prompt) return
    setQuestion('')
    onNotify(`The backend does not provide a Mentor answer endpoint for: ${prompt}`)
  }

  const focusNode = (node) => setFocus({ variable: node.variable, month: node.month })
  const restoreCheckpoint = (checkpoint) => setFocus({ variable: checkpoint.variable, month: checkpoint.month })
  const clearScratchpad = () => setScratchpadAdded(false)

  return (
    <div className="reserve-investigation-page">
      <div className="investigation-main-grid grid grid-cols-[minmax(0,1.9fr)_minmax(340px,1fr)] items-start gap-3 max-[1000px]:grid-cols-1">
        <main className="investigation-workbench grid min-w-0 grid-cols-2 items-start gap-3 max-[600px]:grid-cols-1">
          <section className="trace-explorer-card investigation-card col-span-2 max-[600px]:col-span-1">
            <div className="investigation-card-heading">
              <div className="investigation-heading-icon"><Sparkles size={22} /></div>
              <div><h2>Trace Explorer</h2><p>Follow the captured calculation path. Click a value to trace its recorded dependencies.</p></div>
              <button className="trace-view-options" onClick={onBackToRuns}>Change run</button>
              <button className="trace-view-options" disabled title="No backend trace view options are available.">View options</button>
              <button aria-label="Open trace view" className="trace-expand-button" disabled title="Expanded trace view is not supported."><ExternalLink size={16} /></button>
            </div>

            <div className="trace-graph-surface">
              <div className="trace-connectors" aria-hidden="true"><i /><i /><i /></div>
              <div className="trace-node-grid">
                {traceQuery.loading ? <p className="investigation-empty-runs">Loading trace from the backend…</p> : traceQuery.error ? <p className="investigation-empty-runs">{traceQuery.error.message}</p> : !root ? <p className="investigation-empty-runs">No trace data is available for this run, policy, month, and variable.</p> : traceNodes.map((node, index) => (
                  <div className="trace-node-column" key={node.id}>
                    <button
                      aria-pressed={index === 0}
                      className={`trace-node-card trace-node-${node.kind} ${index === 0 ? 'trace-node-selected' : ''}`}
                      onClick={() => focusNode(node)}
                    >
                      <span>{node.kind === 'formula' ? <Code2 size={18} /> : node.kind === 'result' ? <Table2 size={18} /> : <Database size={17} />}</span>
                      <small>{node.type}</small>
                      <b>{node.name}</b>
                      <em>{node.value}</em>
                    </button>
                    <button className="trace-node-action" onClick={() => focusNode(node)}>
                      <Search size={12} />{node.kind === 'result' ? 'Trace value' : node.kind === 'formula' ? 'View formula' : node.kind === 'input' ? 'Explore input' : 'View source'}
                    </button>
                    {index < traceNodes.length - 1 && <ArrowRight className="trace-inline-arrow" size={17} />}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <PinnedCheckpoints checkpoints={checkpoints} onAdd={addCheckpoint} onRemove={(id) => setCheckpoints((items) => items.filter((item) => item.id !== id))} onRestore={restoreCheckpoint} />
          <ScratchpadPanel
          experimentRate={experimentRate}
          scratchpadAdded={scratchpadAdded}
          selected={selected}
          onRateChange={setExperimentRate}
          onAdd={() => { if (selected) { setScratchpadAdded(true); onNotify(`${selected.name} added to this session's Scratchpad`) } }}
          onClear={clearScratchpad}
          />
        </main>

        <MentorPanel
          answer={root ? `${root.display_name || root.variable}: ${formatTraceValue(root.value, root.unit)}. Captured as ${root.kind}${root.formula?.name ? ` using ${root.formula.name}` : ''}${root.source?.table ? ` from ${root.source.table}` : ''}.` : traceQuery.error?.message || 'Select captured trace data to view verified backend facts.'}
          context={context}
          focus={focus}
          isOpen={mentorOpen}
          question={question}
          onAsk={askMentor}
          onQuestionChange={setQuestion}
          onToggle={() => setMentorOpen((open) => !open)}
        />
      </div>
    </div>
  )
}

function PinnedCheckpoints({ checkpoints, onAdd, onRemove, onRestore }) {
  return (
    <section className="investigation-card checkpoints-card">
      <div className="investigation-card-heading checkpoints-heading">
        <span className="checkpoint-pin-icon"><Flag size={19} /></span>
        <h2>Pinned checkpoints</h2>
        <small>{checkpoints.length} pinned</small>
      </div>
      <div className="checkpoint-list">
        {checkpoints.map((checkpoint) => (
          <article className="checkpoint-item" key={checkpoint.id}>
            <Flag size={16} />
            <div><b>{checkpoint.title}</b><small>{checkpoint.run}</small><small>{checkpoint.time}</small></div>
            <button aria-label={`Remove ${checkpoint.title} checkpoint`} onClick={() => onRemove(checkpoint.id)}><MoreVertical size={17} /></button>
            <button className="checkpoint-return" onClick={() => onRestore(checkpoint)}>Return <ArrowRight size={13} /></button>
          </article>
        ))}
      </div>
      <button className="add-checkpoint-dropzone" onClick={onAdd}>
        <b><Plus size={15} />Add checkpoint</b>
        <small>Pin important nodes, values, or notes for later reference.</small>
      </button>
    </section>
  )
}

function ScratchpadPanel({ selected, experimentRate, scratchpadAdded, onRateChange, onAdd, onClear, onNotify }) {
  return (
    <section className="investigation-card scratchpad-card">
      <div className="investigation-card-heading scratchpad-heading">
        <Code2 size={20} />
        <h2>Scratchpad</h2>
        <button onClick={onClear}>Clear all</button>
      </div>
      {selected && <article className="scratchpad-linked-card">
        <div className="scratchpad-block-heading"><span><Link2 size={14} />Linked value</span><small>From trace</small></div>
        <div className="scratchpad-linked-value">
          <span><Database size={17} /></span>
          <div><b>{selected.variable}</b><small>{selected.type} · {selected.value}</small></div>
          <strong>{selected.value}</strong>
          <button aria-label="Open linked value source" onClick={() => onNotify(`Source details are in the captured trace for ${selected.variable}.`)}><ExternalLink size={14} /></button>
        </div>
      </article>}

      {scratchpadAdded && (
        <article className="scratchpad-added-card"><Check size={15} />{selected?.name} added to this session&apos;s notebook</article>
      )}

      <article className="scratchpad-experiment-card">
        <div className="scratchpad-block-heading"><span><FlaskConical size={15} />Safe experiment</span></div>
        <b>Test alternative lapse rate</b>
        <small>Scenario comparisons require a backend what-if endpoint; no estimate is shown here.</small>
        <label className="scratchpad-rate-field">Lapse rate (Year 5)<span><input disabled min="0" max="100" onChange={(event) => onRateChange(event.target.value)} step="0.01" type="number" value={experimentRate} placeholder="Unavailable" />%</span></label>
        <div className="scratchpad-experiment-actions">
          <button className="scratchpad-compare-button" disabled title="This backend does not expose a what-if endpoint." onClick={() => onNotify('The backend does not provide a what-if endpoint.') }><Activity size={15} />Compare result</button>
          <button className="scratchpad-add-button" disabled={!selected} onClick={onAdd}><Plus size={16} />Add to Scratchpad</button>
        </div>
      </article>
    </section>
  )
}

function MentorPanel({ answer, context, focus, isOpen, question, onQuestionChange, onAsk, onToggle }) {
  return (
    <aside className="investigation-card mentor-investigation-card">
      <div className="investigation-card-heading mentor-heading">
        <span className="mentor-heading-icon"><Sparkles size={18} /></span>
        <div><h2>Mentor</h2><small>Contextual analysis</small></div>
        <button aria-label={isOpen ? 'Collapse Mentor' : 'Expand Mentor'} onClick={onToggle}><ChevronUp className={!isOpen ? 'rotate-180' : ''} size={16} /></button>
      </div>

      {isOpen && (
        <div className="mentor-content">
          <div className="mentor-question-card">
            <span><Sparkles size={21} /></span>
            <div><b>{question || 'Backend trace evidence'}</b><small>{answer}</small></div>
          </div>

          <article className="mentor-answer-card">
            <div className="mentor-answer-heading"><span><Check size={13} />Verified model facts</span><small>Backend trace</small></div>
            <p>{answer}</p>
            <div className="mentor-citations"><span>Run: {context?.run.id || '—'}</span><span>Policy: {context?.policyId || '—'}</span><span>Month: {focus?.month ?? '—'}</span></div>
          </article>

          <article className="mentor-interpretation-card">
            <div className="mentor-answer-heading"><span><Sparkles size={13} />Backend capability</span></div>
            <p>The backend does not expose an AI Mentor endpoint. The verified trace facts above are returned directly by the run trace API.</p>
            <div className="mentor-next-steps">
              <div><b><Flag size={12} />Suggested next steps</b><button onClick={() => onAsk('Compare scenarios')}>Compare <ArrowRight size={12} /></button></div>
              {[
                'Compare scenarios',
                'Test an alternative lapse assumption',
                'Review sensitivity',
              ].map((step, index) => <button key={step} onClick={() => onAsk(step)}><i>{index + 1}</i>{step}</button>)}
            </div>
          </article>

          <article className="mentor-chat-card">
            <div className="mentor-chat-heading"><MessageCircle size={17} /><b>Ask Mentor</b></div>
            <form onSubmit={(event) => { event.preventDefault(); onAsk(question) }}>
              <input aria-label="Ask about this result" onChange={(event) => onQuestionChange(event.target.value)} placeholder="Ask about this result..." value={question} />
              <button aria-label="Send question" disabled type="submit"><Send size={17} /></button>
            </form>
            <div className="mentor-prompt-chips"><span>Mentor answers are not available from this backend.</span></div>
          </article>

          <div className="mentor-guardrail"><ShieldIcon /><span><b>No silent mutation</b><small>Mentor can propose changes, but production logic requires explicit evidence review and approval.</small></span></div>
        </div>
      )}
    </aside>
  )
}

function ShieldIcon() {
  return <Check className="mentor-shield-icon" size={20} />
}