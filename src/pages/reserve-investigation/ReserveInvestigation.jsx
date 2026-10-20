import { useEffect, useState } from 'react'
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
import './reserve-investigation.css'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'

const EMPTY_RUNS = []
const EMPTY_OUTPUTS = []

const investigationRuns = [
  { id: 'RUN-20261231-001', project: 'MYGA', model: 'Base', projectionSet: 'Base scenario', status: 'Completed', traceCaptured: true, policies: '248,310', completed: 'Dec 31, 2026', time: '10:14 AM', retention: '12 months (until Dec 31, 2027)' },
  { id: 'RUN-20261215-008', project: 'MYGA', model: 'Base', projectionSet: 'Base scenario', status: 'Completed', traceCaptured: false, policies: '248,310', completed: 'Dec 15, 2026', time: '09:27 AM', retention: 'No trace data captured' },
  { id: 'RUN-20261130-014', project: 'FIA', model: 'Stochastic', projectionSet: 'FIA Base', status: 'Completed', traceCaptured: true, policies: '125,892', completed: 'Nov 30, 2026', time: '06:11 PM', retention: '12 months (until Nov 30, 2027)' },
]

const traceNodes = [
  { id: 'net_reserve', type: 'Result', name: 'net reserve', value: '$1,245.6M', version: '', icon: <Table2 size={18} />, kind: 'result' },
  { id: 'reserve_t', type: 'Formula', name: 'reserve_t', value: 'v4.1', version: '', icon: <Code2 size={18} />, kind: 'formula' },
  { id: 'lapse_rate', type: 'Input', name: 'lapse_rate', value: '4.25% · Year 5', version: '', icon: <Database size={17} />, kind: 'input' },
  { id: 'mat-001', type: 'Source', name: 'mat-001', value: 'v1.8', version: '', icon: <Database size={17} />, kind: 'source' },
]

const mentorPrompts = [
  'Trace a value',
  'Trace the lapse driver',
  'Compare scenarios',
  'Show sensitivity',
]

export function ReserveInvestigation({ onNotify, onViewChange }) {
  const [target, setTarget] = useState(null)
  return target
    ? <LiveTraceExplorerView target={target} onNotify={onNotify} onBack={() => { setTarget(null); onViewChange?.('selector') }} />
    : <LiveInvestigationRunSelector onNotify={onNotify} onOpenTrace={selection => { setTarget(selection); onViewChange?.('trace') }} />
}

function InvestigationRunSelector({ onNotify, onOpenTrace }) {
  const [selectedRunId, setSelectedRunId] = useState(investigationRuns[0].id)
  const [runSearch, setRunSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('All projects')
  const [modelFilter, setModelFilter] = useState('All versions')
  const [projectionFilter, setProjectionFilter] = useState('All sets')
  const [statusFilter, setStatusFilter] = useState('Completed')
  const [policy, setPolicy] = useState('')
  const [month, setMonth] = useState('2035-12')
  const [variable, setVariable] = useState('Net reserve / GAAP Reserve')
  const [traceDepth, setTraceDepth] = useState('4')
  const selectedRun = investigationRuns.find((run) => run.id === selectedRunId)
  const visibleRuns = investigationRuns.filter((run) => (
    run.id.toLowerCase().includes(runSearch.trim().toLowerCase())
    && (projectFilter === 'All projects' || run.project === projectFilter)
    && (modelFilter === 'All versions' || run.model === modelFilter)
    && (projectionFilter === 'All sets' || run.projectionSet === projectionFilter)
    && (statusFilter === 'All statuses' || run.status === statusFilter)
  ))
  const canOpenTrace = Boolean(selectedRun?.traceCaptured && policy.trim() && month && variable && traceDepth)

  const updateSelection = (run) => {
    setSelectedRunId(run.id)
    if (!run.traceCaptured) onNotify('This run has no captured trace data. Select a trace-ready run.')
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
          <button onClick={() => onNotify('Investigation link copied')}><Share2 size={17} />Share</button>
          <button onClick={() => onNotify('Investigation view options opened')}><SlidersHorizontal size={17} />View</button>
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
              <InvestigationFilter label="Project" value={projectFilter} onChange={setProjectFilter} options={['All projects', 'MYGA', 'FIA']} />
              <InvestigationFilter label="Model version" value={modelFilter} onChange={setModelFilter} options={['All versions', 'Base', 'Stochastic']} />
              <InvestigationFilter label="Projection set" value={projectionFilter} onChange={setProjectionFilter} options={['All sets', 'Base scenario', 'FIA Base']} />
              <InvestigationFilter label="Status" value={statusFilter} onChange={setStatusFilter} options={['Completed', 'All statuses']} />
            </div>
            <div className="investigation-runs-table-wrap">
              <table className="investigation-runs-table">
                <thead><tr><th aria-label="Selected" /><th>Run name <ArrowDownSortIcon /></th><th>Project <ArrowDownSortIcon /></th><th>Model version</th><th>Status</th><th>Trace <ArrowDownSortIcon /></th><th>Policies</th><th>Completed <ArrowDownSortIcon /></th></tr></thead>
                <tbody>
                  {visibleRuns.map((run) => <tr className={selectedRunId === run.id ? 'investigation-run-selected' : ''} key={run.id} onClick={() => updateSelection(run)}>
                    <td><button className="investigation-run-radio" aria-label={`Select ${run.id}`} aria-pressed={selectedRunId === run.id} onClick={(event) => { event.stopPropagation(); updateSelection(run) }}>{selectedRunId === run.id ? <CircleCheck size={20} /> : <Circle size={20} />}</button></td>
                    <td>{run.id}</td><td>{run.project}</td><td>{run.model}</td>
                    <td><span className="investigation-run-status">{run.status}</span></td>
                    <td><span className={run.traceCaptured ? 'investigation-trace-yes' : 'investigation-trace-no'}>{run.traceCaptured ? <CircleCheck size={20} /> : <CircleMinus size={20} />}{run.traceCaptured ? 'Trace captured' : 'Not captured'}</span></td>
                    <td>{run.policies}</td><td><span className="investigation-completed-date">{run.completed}<small>{run.time}</small></span></td>
                  </tr>)}
                  {visibleRuns.length === 0 && <tr><td className="investigation-empty-runs" colSpan="8">No runs match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="investigation-run-count">Showing {visibleRuns.length} of {investigationRuns.length} runs</p>
          </section>

          <section className="investigation-step-card investigation-target-step">
            <div className="investigation-step-heading">
              <span className={`investigation-step-number ${canOpenTrace ? 'investigation-step-ready' : ''}`}>2</span>
              <div><h3>Select trace target</h3><p>Choose the policy, month, and variable to investigate.</p></div>
            </div>
            <div className="investigation-target-fields">
              <label>Policy<div className="investigation-input-wrap"><Search size={18} /><input onChange={(event) => setPolicy(event.target.value)} placeholder="Search by policy number..." value={policy} /></div><small>Enter a policy number from this run&apos;s results (e.g., 10012345).</small></label>
              <label>Projection month<div className="investigation-input-wrap"><CalendarDays size={18} /><select onChange={(event) => setMonth(event.target.value)} value={month}><option value="2035-12">Dec 2035</option><option value="2026-12">Dec 2026</option><option value="2030-12">Dec 2030</option><option value="2040-12">Dec 2040</option></select><ChevronDown size={16} /></div><small>Select the projection month to analyze.</small></label>
              <label>Variable<div className="investigation-input-wrap"><Database size={18} /><select onChange={(event) => setVariable(event.target.value)} value={variable}><option>Net reserve / GAAP Reserve</option><option>Policy cash flow</option><option>Death benefit</option><option>Account value</option></select><ChevronDown size={16} /></div><small>Select the result variable to trace.</small></label>
              <label>Trace depth<div className="investigation-input-wrap"><TraceTreeIcon /><select onChange={(event) => setTraceDepth(event.target.value)} value={traceDepth}><option value="4">4 levels</option>{[1, 2, 3, 5, 6, 7, 8, 9, 10].map((level) => <option key={level} value={level}>{level} levels</option>)}</select><ChevronDown size={16} /></div><small>Number of calculation levels to trace (1–10).</small></label>
            </div>
            <div className="investigation-target-footer">
              <button className="investigation-cancel-button" onClick={() => { setPolicy(''); onNotify('Investigation selection cleared') }}>Cancel</button>
              <div><button className="investigation-open-trace" disabled={!canOpenTrace} onClick={onOpenTrace}><Play size={17} />Open Trace Explorer</button><small>{canOpenTrace ? `Ready to trace ${variable} for policy ${policy.trim()}.` : 'Select a trace-ready run and enter a policy to continue.'}</small></div>
            </div>
          </section>
        </main>

        <aside className="investigation-availability-panel">
          <section className="investigation-trace-availability">
            <header><Database size={29} /><div><h3>Trace availability</h3><p>Trace data is required to investigate model results.</p></div></header>
            {selectedRun?.traceCaptured ? (
              <div className="investigation-selected-run-details">
                <div className="investigation-trace-captured-banner"><span><Check size={23} /></span><div><b>Trace captured for this run</b><small>This run has trace data available for investigation.</small></div></div>
                <dl>
                  <InvestigationRunDetail label="Run name" value={selectedRun.id} />
                  <InvestigationRunDetail label="Project" value={selectedRun.project} />
                  <InvestigationRunDetail label="Model version" value={selectedRun.model} />
                  <InvestigationRunDetail label="Projection set" value={selectedRun.projectionSet} />
                  <InvestigationRunDetail label="Status" value={<span className="investigation-run-status">Completed</span>} />
                  <InvestigationRunDetail label="Captured policies" value={selectedRun.policies} />
                  <InvestigationRunDetail label="Trace retention" value={selectedRun.retention} />
                  <InvestigationRunDetail label="Completed" value={`${selectedRun.completed}, ${selectedRun.time}`} />
                </dl>
              </div>
            ) : (
              <div className="investigation-no-trace-banner"><AlertTriangle size={25} /><div><b>Trace data not captured</b><small>This run cannot be traced. Select a run with captured trace data.</small></div></div>
            )}
            <div className="investigation-trace-warning"><AlertTriangle size={27} /><div><b>Trace must be captured during execution</b><p>If a run does not have trace data, it cannot be reconstructed later. Please re-run the model with trace capture enabled.</p><button onClick={() => onNotify('Trace capture documentation opened')}>Learn more about trace capture <ArrowUpRightIcon /></button></div></div>
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

function TraceExplorerView({ onNotify, onBackToRuns }) {
  const [selectedNode, setSelectedNode] = useState('net_reserve')
  const [checkpoints, setCheckpoints] = useState([
    { id: 'checkpoint-1', title: 'Net reserve', run: 'Run JR-20261231-001 · Base scenario', time: 'Added just now' },
  ])
  const [experimentRate, setExperimentRate] = useState('5.25')
  const [experimentCompared, setExperimentCompared] = useState(false)
  const [scratchpadAdded, setScratchpadAdded] = useState(false)
  const [mentorOpen, setMentorOpen] = useState(true)
  const [question, setQuestion] = useState('')
  const [mentorAnswer, setMentorAnswer] = useState('The increase appears driven primarily by a higher lapse-rate assumption in Year 5, partially offset by lower interest-rate and expense assumptions.')

  const selected = traceNodes.find((node) => node.id === selectedNode) ?? traceNodes[0]
  const addCheckpoint = () => {
    const exists = checkpoints.some((checkpoint) => checkpoint.title === selected.name)
    if (exists) {
      onNotify(`${selected.name} is already pinned`)
      return
    }
    setCheckpoints((items) => [...items, {
      id: `${selected.id}-${Date.now()}`,
      title: selected.name,
      run: 'Run JR-20261231-001 · Base scenario',
      time: 'Added just now',
    }])
    onNotify(`${selected.name} pinned as a checkpoint`)
  }

  const askMentor = (nextQuestion = question) => {
    const prompt = nextQuestion.trim()
    if (!prompt) return
    setQuestion('')
    const lowerPrompt = prompt.toLowerCase()
    if (lowerPrompt.includes('lapse')) {
      setMentorAnswer('The Year 5 lapse-rate assumption contributed approximately +210 bps to the reserve movement. Trace it to mat-001 or test an alternative rate in Scratchpad.')
    } else if (lowerPrompt.includes('compare')) {
      setMentorAnswer('Base scenario reserve is $1,245.6M. The Low Interest Rate scenario is $998.1M, a −19.9% difference. Compare the paths to isolate the interest-rate effect.')
    } else if (lowerPrompt.includes('sensitivity')) {
      setMentorAnswer('The reserve is most sensitive to the Year 5 lapse-rate assumption in this run. A 1.00 percentage-point increase can be tested safely in the Scratchpad before changing production inputs.')
    } else {
      setMentorAnswer('Net reserve increased 6.99% versus the prior period. The largest positive contribution is the Year 5 lapse-rate assumption at +210 bps, partially offset by lower interest-rate and expense assumptions.')
    }
    onNotify('Mentor response added with source context')
  }

  return (
    <div className="reserve-investigation-page">
      <div className="investigation-main-grid grid grid-cols-[minmax(0,1.9fr)_minmax(340px,1fr)] items-start gap-3 max-[1000px]:grid-cols-1">
        <main className="investigation-workbench grid min-w-0 grid-cols-2 items-start gap-3 max-[600px]:grid-cols-1">
          <section className="trace-explorer-card investigation-card col-span-2 max-[600px]:col-span-1">
            <div className="investigation-card-heading">
              <div className="investigation-heading-icon"><Sparkles size={22} /></div>
              <div><h2>Trace a value</h2><p>Follow the full calculation path. Click a node to see details, values, and source.</p></div>
              <button className="trace-view-options" onClick={onBackToRuns}>Change run</button>
              <button className="trace-view-options" onClick={() => onNotify('Trace view options opened')}>View options</button>
              <button aria-label="Open trace view" className="trace-expand-button" onClick={() => onNotify('Trace expanded')}><ExternalLink size={16} /></button>
            </div>

            <div className="trace-graph-surface">
              <div className="trace-connectors" aria-hidden="true"><i /><i /><i /></div>
              <div className="trace-node-grid">
                {traceNodes.map((node, index) => (
                  <div className="trace-node-column" key={node.id}>
                    <button
                      aria-pressed={selectedNode === node.id}
                      className={`trace-node-card trace-node-${node.kind} ${selectedNode === node.id ? 'trace-node-selected' : ''}`}
                      onClick={() => setSelectedNode(node.id)}
                    >
                      <span>{node.icon}</span>
                      <small>{node.type}</small>
                      <b>{node.name}</b>
                      <em>{node.value}</em>
                    </button>
                    <button className="trace-node-action" onClick={() => onNotify(`${node.type} ${node.name} opened`)}>
                      <Search size={12} />{node.kind === 'result' ? 'Trace value' : node.kind === 'formula' ? 'View formula' : node.kind === 'input' ? 'Explore input' : 'View source'}
                    </button>
                    {index < traceNodes.length - 1 && <ArrowRight className="trace-inline-arrow" size={17} />}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <PinnedCheckpoints checkpoints={checkpoints} onAdd={addCheckpoint} onRemove={(id) => setCheckpoints((items) => items.filter((item) => item.id !== id))} onNotify={onNotify} />
          <ScratchpadPanel
          experimentCompared={experimentCompared}
          experimentRate={experimentRate}
          scratchpadAdded={scratchpadAdded}
          selected={selected}
          onCompare={() => { setExperimentCompared(true); onNotify('Alternative lapse-rate result calculated') }}
          onRateChange={setExperimentRate}
          onAdd={() => { setScratchpadAdded(true); onNotify('Trace value added to Scratchpad') }}
          onNotify={onNotify}
          />
        </main>

        <MentorPanel
          answer={mentorAnswer}
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

function PinnedCheckpoints({ checkpoints, onAdd, onRemove, onNotify }) {
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
            <button className="checkpoint-return" onClick={() => onNotify(`${checkpoint.title} checkpoint restored`)}>Return <ArrowRight size={13} /></button>
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

function ScratchpadPanel({ selected, experimentRate, experimentCompared, scratchpadAdded, onRateChange, onCompare, onAdd, onNotify }) {
  const baseline = 4.25
  const difference = (Number(experimentRate) - baseline) * 38.3
  const formattedResult = `$${(1245.6 + difference).toFixed(1)}M`

  return (
    <section className="investigation-card scratchpad-card">
      <div className="investigation-card-heading scratchpad-heading">
        <Code2 size={20} />
        <h2>Scratchpad</h2>
        <button onClick={() => onNotify('Scratchpad cleared')}>Clear all</button>
      </div>
      <article className="scratchpad-linked-card">
        <div className="scratchpad-block-heading"><span><Link2 size={14} />Linked value</span><small>From trace</small></div>
        <div className="scratchpad-linked-value">
          <span><Database size={17} /></span>
          <div><b>{selected.id}</b><small>{selected.type} · {selected.value}</small></div>
          <strong>{selected.id === 'net_reserve' ? '$1,245.6M' : selected.value.split(' · ')[0]}</strong>
          <button aria-label="Open linked value source" onClick={() => onNotify(`${selected.name} source opened`)}><ExternalLink size={14} /></button>
        </div>
      </article>

      {scratchpadAdded && (
        <article className="scratchpad-added-card"><Check size={15} />{selected.name} added to this notebook</article>
      )}

      <article className="scratchpad-experiment-card">
        <div className="scratchpad-block-heading"><span><FlaskConical size={15} />Safe experiment</span></div>
        <b>Test alternative lapse rate</b>
        <small>Run a temporary scenario (no model changes).</small>
        <label className="scratchpad-rate-field">Lapse rate (Year 5)<span><input min="0" max="100" onChange={(event) => { onRateChange(event.target.value); }} step="0.01" type="number" value={experimentRate} />%</span></label>
        {experimentCompared && <div className="scratchpad-result"><span>Alternative result</span><b>{formattedResult}</b><small>{difference >= 0 ? '+' : '−'}${Math.abs(difference).toFixed(1)}M vs. baseline</small></div>}
        <div className="scratchpad-experiment-actions">
          <button className="scratchpad-compare-button" onClick={onCompare}><Activity size={15} />Compare result</button>
          <button className="scratchpad-add-button" onClick={onAdd}><Plus size={16} />Add to Scratchpad</button>
        </div>
      </article>
    </section>
  )
}

function MentorPanel({ answer, isOpen, question, onQuestionChange, onAsk, onToggle }) {
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
            <div><b>Trace a value</b><small>Selected run · captured trace</small></div>
          </div>

          <article className="mentor-answer-card">
            <div className="mentor-answer-heading"><span><Check size={13} />Verified model facts</span><small>Evidence-first</small></div>
            <p>Net reserve increased <b>6.99%</b>. The largest positive contribution is the Year 5 lapse-rate assumption at +210 bps.</p>
            <div className="mentor-citations"><button>Source: Results Explorer</button><button>Source: mat-001</button><button>Formula: reserve_t v4.1</button></div>
          </article>

          <article className="mentor-interpretation-card">
            <div className="mentor-answer-heading"><span><Sparkles size={13} />AI interpretation</span></div>
            <p>{answer}</p>
            <div className="mentor-next-steps">
              <div><b><Flag size={12} />Suggested next steps</b><button onClick={() => onAsk('Compare scenarios')}>Compare <ArrowRight size={12} /></button></div>
              {[
                'Compare Base and Low Interest Rate scenarios',
                'Evaluate alternative lapse-rate assumptions',
                'Review sensitivity to expense assumptions',
              ].map((step, index) => <button key={step} onClick={() => onAsk(index === 0 ? 'Compare scenarios' : index === 1 ? 'Trace the lapse driver' : 'Show sensitivity')}><i>{index + 1}</i>{step}</button>)}
            </div>
          </article>

          <article className="mentor-chat-card">
            <div className="mentor-chat-heading"><MessageCircle size={17} /><b>Ask Mentor</b></div>
            <form onSubmit={(event) => { event.preventDefault(); onAsk(question) }}>
              <input aria-label="Ask about this result" onChange={(event) => onQuestionChange(event.target.value)} placeholder="Ask about this result..." value={question} />
              <button aria-label="Send question" type="submit"><Send size={17} /></button>
            </form>
            <div className="mentor-prompt-chips">{mentorPrompts.map((prompt) => <button key={prompt} onClick={() => onAsk(prompt)}>{prompt}</button>)}</div>
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


function LiveInvestigationRunSelector({ onNotify, onOpenTrace }) {
  const { projectId, project } = useWorkspace()
  const query = useApiQuery(projectId ? `/v1/runs?project_id=${encodeURIComponent(projectId)}&limit=200` : null)
  const runs = query.data?.runs ?? EMPTY_RUNS
  const [selectedRunId, setSelectedRunId] = useState('')
  const [partialApprovalRunId, setPartialApprovalRunId] = useState(null)
  const [runSearch, setRunSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Completed')
  const [modelFilter, setModelFilter] = useState('All versions')
  const [projectionFilter, setProjectionFilter] = useState('All sets')
  const [policy, setPolicy] = useState('')
  const [month, setMonth] = useState(0)
  const [variable, setVariable] = useState('')
  const [traceDepth, setTraceDepth] = useState(4)
  const selectedRun = runs.find(run => run.id === selectedRunId) ?? runs[0] ?? null
  const completed = selectedRun && ['success', 'partial_success'].includes(selectedRun.status)
  const isPartialRun = selectedRun?.status === 'partial_success'
  const includePartial = Boolean(selectedRun && partialApprovalRunId === selectedRun.id)
  const policiesQuery = useApiQuery(completed && (!isPartialRun || includePartial)
    ? `/v1/runs/${selectedRun.id}/trace/policies${isPartialRun && includePartial ? '?include_partial=true' : ''}`
    : null)
  const versionId = selectedRun?.model_version?.id
  const outputsQuery = useApiQuery(versionId ? `/v1/model-versions/${versionId}/published-outputs` : null)
  const tracedPolicies = policiesQuery.data?.policy_ids ?? EMPTY_RUNS
  const outputs = outputsQuery.data?.outputs ?? EMPTY_OUTPUTS
  const modelOptions = Array.from(new Set(runs.map(run => `${run.model_version?.model_name ?? 'Model'} ${run.model_version?.version_label ?? ''}`.trim())))
  const projectionOptions = Array.from(new Set(runs.map(run => run.projection_set?.name).filter(Boolean)))
  useEffect(() => {
    if (!selectedRunId && runs.length) setSelectedRunId(runs[0].id)
  }, [runs, selectedRunId])
  useEffect(() => {
    if (outputs.length && !outputs.some(item => item.variable_name === variable)) setVariable(outputs[0].variable_name)
  }, [outputs, variable])
  useEffect(() => { setPolicy(''); setMonth(0); setVariable('') }, [selectedRunId])
  const visibleRuns = runs.filter(run => {
    const searchable = `${run.name} ${run.id} ${run.model_version?.model_name ?? ''} ${run.projection_set?.name ?? ''} ${run.scenario?.name ?? ''}`.toLowerCase()
    const matchesStatus = statusFilter === 'All statuses'
      || (statusFilter === 'Completed' && run.status === 'success')
      || (statusFilter === 'Partial success' && run.status === 'partial_success')
    const modelName = `${run.model_version?.model_name ?? 'Model'} ${run.model_version?.version_label ?? ''}`.trim()
    return searchable.includes(runSearch.trim().toLowerCase()) && matchesStatus
      && (modelFilter === 'All versions' || modelName === modelFilter)
      && (projectionFilter === 'All sets' || run.projection_set?.name === projectionFilter)
  })
  const hasTrace = tracedPolicies.length > 0
  const horizon = Math.max(0, (policiesQuery.data?.months ?? selectedRun?.horizon_months ?? 0) - 1)
  const canOpenTrace = Boolean(hasTrace && tracedPolicies.includes(policy.trim()) && month <= horizon && variable)
  const selectRun = run => { setSelectedRunId(run.id); if (run.id !== selectedRunId) { setPolicy(''); setMonth(0) } }
  return (
    <div className="investigation-selector-page">
      <header className="investigation-selector-heading">
        <div><span>INVESTIGATE / NEW INVESTIGATION</span><h2>Start an investigation</h2><p>Choose a successful run or explicitly include an incomplete run, then select a policy, month, and variable with captured trace data.</p></div>
        <div className="investigation-selector-actions">
          <button onClick={() => document.getElementById('investigation-run-search')?.focus()}><Search size={17} />Search</button>
          <button disabled={!selectedRun} onClick={() => { void navigator.clipboard?.writeText(selectedRun.id); onNotify('Run ID copied') }}><Share2 size={17} />Copy run ID</button>
          <button onClick={() => onNotify('The list reflects live backend runs for the selected project.')}><SlidersHorizontal size={17} />View</button>
        </div>
      </header>
      <div className="investigation-selector-layout">
        <main className="investigation-selector-main">
          <section className="investigation-step-card investigation-run-step">
            <div className="investigation-step-heading"><span className="investigation-step-number investigation-step-ready">1</span><div><h3>Select run</h3><p>Choose a successful run, or a partial-success run after opting in to its incomplete results.</p></div><button className="investigation-run-details" disabled={!selectedRun} onClick={() => onNotify(selectedRun ? `Run ${selectedRun.id} · ${selectedRun.status} · ${selectedRun.progress?.done ?? 0}/${selectedRun.progress?.total ?? 0} policies` : 'Select a run first')}>View run details <ArrowRight size={17} /></button></div>
            <div className="investigation-run-filters">
              <label className="investigation-run-search"><Search size={18} /><input id="investigation-run-search" onChange={event => setRunSearch(event.target.value)} placeholder="Search runs..." value={runSearch} /></label>
              <InvestigationFilter label="Project" value={project?.name ?? 'Current project'} onChange={() => {}} options={[project?.name ?? 'Current project']} />
              <InvestigationFilter label="Model version" value={modelFilter} onChange={setModelFilter} options={['All versions', ...modelOptions]} />
              <InvestigationFilter label="Projection set" value={projectionFilter} onChange={setProjectionFilter} options={['All sets', ...projectionOptions]} />
              <InvestigationFilter label="Status" value={statusFilter} onChange={setStatusFilter} options={['Completed', 'Partial success', 'All statuses']} />
            </div>
            <div className="investigation-runs-table-wrap"><table className="investigation-runs-table"><thead><tr><th aria-label="Selected"/><th>Run name <ArrowDownSortIcon/></th><th>Project</th><th>Model version</th><th>Status</th><th>Trace</th><th>Policies</th><th>Completed</th></tr></thead><tbody>
              {query.loading && <tr><td className="investigation-empty-runs" colSpan="8">Loading runs from the backend…</td></tr>}
              {query.error && <tr><td className="investigation-empty-runs" colSpan="8">Could not load runs: {query.error.message}</td></tr>}
              {!query.loading && !query.error && visibleRuns.map(run => <tr className={selectedRun?.id === run.id ? 'investigation-run-selected' : ''} key={run.id} onClick={() => selectRun(run)}>
                <td><button className="investigation-run-radio" aria-label={`Select ${run.id}`} aria-pressed={selectedRun?.id === run.id} onClick={event => { event.stopPropagation(); selectRun(run) }}>{selectedRun?.id === run.id ? <CircleCheck size={20}/> : <Circle size={20}/>}</button></td>
                <td>{run.name || run.id}</td><td>{project?.name ?? '—'}</td><td>{`${run.model_version?.model_name ?? '—'} ${run.model_version?.version_label ?? ''}`}</td>
                <td><span className="investigation-run-status">{run.status === 'partial_success' ? 'Partial success' : run.status === 'success' ? 'Completed' : run.status}</span></td><td><span className={run.summary?.trace?.captured ? 'investigation-trace-yes' : 'investigation-trace-no'}>{run.summary?.trace?.captured ? <CircleCheck size={20}/> : <CircleMinus size={20}/>} {run.summary?.trace?.captured ? 'Trace captured' : 'Check availability'}</span></td>
                <td>{(run.progress?.total ?? 0).toLocaleString()}</td><td><span className="investigation-completed-date">{run.completed_at ? new Date(run.completed_at).toLocaleDateString() : '—'}<small>{run.completed_at ? new Date(run.completed_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : ''}</small></span></td>
              </tr>)}
              {!query.loading && !query.error && visibleRuns.length === 0 && <tr><td className="investigation-empty-runs" colSpan="8">No runs match these filters.</td></tr>}
            </tbody></table></div><p className="investigation-run-count">Showing {visibleRuns.length} of {runs.length} backend runs</p>
            {isPartialRun && <section className="result-panel rounded-[10px] bg-[#fff7df] p-4" role="alert"><b>This run is incomplete.</b><p>Trace results require the same incomplete-results choice as other run results. {includePartial ? 'Incomplete trace data is included for the selected run.' : 'Captured trace data remains hidden until you opt in.'}</p>{!includePartial && <button className="button button-primary" onClick={() => setPartialApprovalRunId(selectedRun.id)}>Show incomplete results</button>}</section>}
          </section>
          <section className="investigation-step-card investigation-target-step">
            <div className="investigation-step-heading"><span className={`investigation-step-number ${canOpenTrace ? 'investigation-step-ready' : ''}`}>2</span><div><h3>Select trace target</h3><p>Choose the policy, month, and variable to investigate.</p></div></div>
            <div className="investigation-target-fields">
              <label>Policy<div className="investigation-input-wrap"><Search size={18}/><input list="investigation-policy-options" onChange={event => setPolicy(event.target.value)} placeholder={hasTrace ? 'Choose a traced policy…' : 'Trace data unavailable'} value={policy}/><datalist id="investigation-policy-options">{tracedPolicies.map(id => <option key={id} value={id}/>)}</datalist></div><small>{policiesQuery.loading ? 'Checking captured trace availability…' : hasTrace ? `${tracedPolicies.length} policies have trace data.` : policiesQuery.error ? policiesQuery.error.message : 'No trace rows were captured for this run.'}</small></label>
              <label>Projection month<div className="investigation-input-wrap"><CalendarDays size={18}/><select disabled={!hasTrace} onChange={event => setMonth(Number(event.target.value))} value={month}>{Array.from({length: Math.min(horizon + 1, 601)}, (_, index) => <option key={index} value={index}>{index === 0 ? 'Valuation month (0)' : `Month ${index}`}</option>)}</select><ChevronDown size={16}/></div><small>Run horizon: {policiesQuery.data?.months ?? selectedRun?.horizon_months ?? 0} months.</small></label>
              <label>Variable<div className="investigation-input-wrap"><Database size={18}/><select disabled={!outputs.length} onChange={event => setVariable(event.target.value)} value={variable}>{outputs.map(item => <option key={item.variable_name} value={item.variable_name}>{item.display_name || item.variable_name}</option>)}</select><ChevronDown size={16}/></div><small>{outputsQuery.loading ? 'Loading model outputs…' : outputs.length ? 'Select a published output from this model version.' : 'No published outputs are configured.'}</small></label>
              <label>Trace depth<div className="investigation-input-wrap"><TraceTreeIcon/><select onChange={event => setTraceDepth(Number(event.target.value))} value={traceDepth}>{[1,2,3,4,5,6,7,8,9,10].map(level => <option key={level} value={level}>{level} levels</option>)}</select><ChevronDown size={16}/></div><small>Maximum supported depth: 10.</small></label>
            </div>
            <div className="investigation-target-footer"><button className="investigation-cancel-button" onClick={() => { setPolicy(''); onNotify('Investigation target cleared') }}>Clear target</button><div><button className="investigation-open-trace" disabled={!canOpenTrace} onClick={() => onOpenTrace({run:selectedRun, policyId:policy.trim(), month, variable, depth:traceDepth, includePartial: isPartialRun && includePartial})}><Play size={17}/>Open Trace Explorer</button><small>{canOpenTrace ? `Ready to trace ${variable} for policy ${policy.trim()}.${isPartialRun ? ' Incomplete run data is included.' : ''}` : 'Select a traced policy, published output, and valid month to continue.'}</small></div></div>
          </section>
        </main>
        <aside className="investigation-availability-panel"><section className="investigation-trace-availability"><header><Database size={29}/><div><h3>Trace availability</h3><p>Availability is queried from captured run data.</p></div></header>
          {policiesQuery.loading ? <div className="investigation-no-trace-banner"><Activity size={22}/><div><b>Checking selected run</b><small>Loading trace metadata from the backend.</small></div></div> : hasTrace ? <div className="investigation-selected-run-details"><div className="investigation-trace-captured-banner"><span><Check size={23}/></span><div><b>Trace captured for this run</b><small>{tracedPolicies.length} traced policies · {policiesQuery.data?.months ?? 0} projection months</small></div></div><dl><InvestigationRunDetail label="Run name" value={selectedRun?.name || selectedRun?.id || '—'}/><InvestigationRunDetail label="Project" value={project?.name || '—'}/><InvestigationRunDetail label="Model version" value={`${selectedRun?.model_version?.model_name ?? '—'} ${selectedRun?.model_version?.version_label ?? ''}`}/><InvestigationRunDetail label="Projection set" value={selectedRun?.projection_set?.name || '—'}/><InvestigationRunDetail label="Status" value={selectedRun?.status || '—'}/><InvestigationRunDetail label="Traced policies" value={tracedPolicies.length.toLocaleString()}/><InvestigationRunDetail label="Horizon" value={`${policiesQuery.data?.months ?? 0} months`}/><InvestigationRunDetail label="Completed" value={selectedRun?.completed_at ? new Date(selectedRun.completed_at).toLocaleString() : '—'}/></dl></div> : <div className="investigation-no-trace-banner"><AlertTriangle size={25}/><div><b>{policiesQuery.error ? 'Trace metadata unavailable' : 'Trace data not captured'}</b><small>{policiesQuery.error?.message || 'The backend reports no traced policies for this run.'}</small></div></div>}
          <div className="investigation-trace-warning"><AlertTriangle size={27}/><div><b>Trace is captured during execution</b><p>Runs without captured trace rows cannot be reconstructed after completion.</p><button onClick={() => onNotify('Enable trace capture in the model output configuration before submitting a future run.')}>Trace setup guidance <ArrowUpRightIcon/></button></div></div>
        </section></aside>
      </div>
    </div>
  )
}

function LiveTraceExplorerView({ target, onNotify, onBack }) {
  const tracePath = `/v1/runs/${encodeURIComponent(target.run.id)}/trace?policy_id=${encodeURIComponent(target.policyId)}&month=${target.month}&variable=${encodeURIComponent(target.variable)}&depth=${target.depth}${target.includePartial ? '&include_partial=true' : ''}`
  const traceQuery = useApiQuery(tracePath)
  const root = traceQuery.data?.root
  const nodes = root ? flattenTrace(root) : []
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [checkpoints, setCheckpoints] = useState([])
  useEffect(() => setSelectedIndex(0), [tracePath])
  const selected = nodes[selectedIndex] ?? nodes[0]
  const dependentsPath = selected?.variable
    ? `/v1/runs/${encodeURIComponent(target.run.id)}/trace/dependents?policy_id=${encodeURIComponent(target.policyId)}&month=${selected.month ?? target.month}&variable=${encodeURIComponent(selected.variable)}${target.includePartial ? '&include_partial=true' : ''}`
    : null
  const dependentsQuery = useApiQuery(dependentsPath)
  const addCheckpoint = () => {
    if (!selected) return
    if (checkpoints.some(item => item.title === selected.name)) { onNotify(`${selected.name} is already pinned`); return }
    setCheckpoints(items => [...items, {id:`${selected.id}-${Date.now()}`, title:selected.name, run:target.run.name || target.run.id, time:'Added this session'}])
    onNotify(`${selected.name} pinned for this session`)
  }
  return <div className="reserve-investigation-page"><div className="investigation-main-grid grid grid-cols-[minmax(0,1.9fr)_minmax(340px,1fr)] items-start gap-3 max-[1000px]:grid-cols-1">
    <main className="investigation-workbench grid min-w-0 grid-cols-2 items-start gap-3 max-[600px]:grid-cols-1">
      <section className="trace-explorer-card investigation-card col-span-2 max-[600px]:col-span-1"><div className="investigation-card-heading"><div className="investigation-heading-icon"><Sparkles size={22}/></div><div><h2>Trace a value</h2><p>Captured calculation path from the selected backend run.</p></div><button className="trace-view-options" onClick={onBack}>Change run</button><button className="trace-view-options" onClick={() => onNotify('Trace data is read-only evidence captured during execution.')}>View options</button><button aria-label="Copy trace request" className="trace-expand-button" onClick={() => { void navigator.clipboard?.writeText(tracePath); onNotify('Trace request copied') }}><ExternalLink size={16}/></button></div>
        {traceQuery.loading ? <div className="trace-graph-surface">Loading captured trace…</div> : traceQuery.error ? <div className="trace-graph-surface">Could not load trace: {traceQuery.error.message}</div> : nodes.length ? <div className="trace-graph-surface"><div className="trace-connectors" aria-hidden="true"><i/><i/><i/></div><div className="trace-node-grid">{nodes.map((node,index) => <div className="trace-node-column" key={node.id}><button aria-pressed={selectedIndex===index} className={`trace-node-card trace-node-${traceKind(node.kind)} ${selectedIndex===index?'trace-node-selected':''}`} onClick={() => setSelectedIndex(index)}><span>{traceIcon(node.kind)}</span><small>{node.kind}</small><b>{node.name}</b><em>{displayTraceValue(node.value,node.unit)}</em></button><span className="trace-node-action"><Database size={12}/>{node.source?.type || node.formula?.function_ref || 'Captured value'}</span>{index<nodes.length-1&&<ArrowRight className="trace-inline-arrow" size={17}/>}</div>)}</div></div> : <div className="trace-graph-surface">The trace response did not contain a calculation tree.</div>}
        {root && <p className="investigation-run-count">Run {target.run.id} · Policy {target.policyId} · Month {target.month} · {traceQuery.data?.illustrative ? 'Illustrative run' : 'Run output'}{traceQuery.data?.period_end_date ? ` · ${traceQuery.data.period_end_date}` : ''}</p>}
      </section>
      <PinnedCheckpoints checkpoints={checkpoints} onAdd={addCheckpoint} onRemove={id=>setCheckpoints(items=>items.filter(item=>item.id!==id))} onNotify={onNotify}/>
      <section className="investigation-card scratchpad-card"><div className="investigation-card-heading scratchpad-heading"><Code2 size={20}/><h2>Scratchpad</h2><button disabled>Unavailable</button></div><article className="scratchpad-linked-card"><div className="scratchpad-block-heading"><span><Link2 size={14}/>Selected trace node</span><small>Read-only evidence</small></div><div className="scratchpad-linked-value"><span><Database size={17}/></span><div><b>{selected?.name || 'Select a trace node'}</b><small>{selected?.kind || '—'} · {selected ? displayTraceValue(selected.value,selected.unit) : '—'}</small></div><strong>{selected?.value == null ? '—' : displayTraceValue(selected.value,selected.unit)}</strong></div></article>
        <section className="trace-dependents-panel"><h3>What depends on this value?</h3>{dependentsQuery.loading && <p>Loading downstream dependents…</p>}{dependentsQuery.error && <p role="alert">Could not load dependents: {dependentsQuery.error.message}</p>}{dependentsQuery.data && !(dependentsQuery.data.dependents ?? []).length && <p>No downstream dependents were reported for this value.</p>}{(dependentsQuery.data?.dependents ?? []).map((dependent, index) => <article key={`${dependent.variable}-${dependent.month}-${index}`}><b>{dependent.variable}</b><span>{dependent.kind} · month {dependent.month} · {dependent.value == null ? 'No value' : displayTraceValue(dependent.value, selected?.unit)}{dependent.formula_id ? ` · formula ${dependent.formula_id}` : ''}</span></article>)}</section>
        <p className="investigation-run-count">Scenario experimentation is not exposed by the current backend; no simulated result is shown here.</p></section>
    </main>
    <aside className="investigation-card mentor-investigation-card"><div className="investigation-card-heading mentor-heading"><span className="mentor-heading-icon"><Sparkles size={18}/></span><div><h2>Trace evidence</h2><small>Backend-captured values</small></div></div><div className="mentor-content"><div className="mentor-question-card"><span><Activity size={21}/></span><div><b>{root?.display_name || root?.variable || target.variable}</b><small>{target.run.name || target.run.id} · Policy {target.policyId} · Month {target.month}</small></div></div><article className="mentor-answer-card"><div className="mentor-answer-heading"><span><Check size={13}/>Verified trace facts</span></div><p>{root ? `${displayTraceValue(root.value,root.unit)}${root.period_end_date ? ` at ${root.period_end_date}` : ''}` : traceQuery.loading ? 'Loading evidence…' : 'Trace evidence is unavailable.'}</p><div className="mentor-citations"><span>Run ID: {target.run.id}</span><span>Captured nodes: {nodes.length}</span><span>{traceQuery.data?.illustrative ? 'Illustrative' : 'Backend result'}</span></div></article>{selected && <article className="mentor-interpretation-card"><div className="mentor-answer-heading"><span><Database size={13}/>Selected node source</span></div><p>{selected.source ? JSON.stringify(selected.source) : selected.formula?.expression_text || selected.formula?.function_ref || 'No source details recorded for this node.'}</p></article>}<div className="mentor-guardrail"><ShieldIcon/><span><b>Read-only investigation</b><small>This view reports recorded run evidence. It does not infer causal attribution or mutate model settings.</small></span></div></div></aside>
  </div></div>
}

function flattenTrace(root) {
  const result=[]
  const visit=(node,path='root')=>{ if(!node)return; const id=`${path}:${node.variable}:${node.month}`; result.push({id,name:node.display_name||node.variable,variable:node.variable,month:node.month,value:node.value,unit:node.unit,kind:node.kind,source:node.source,formula:node.formula,depth:path.split('.').length-1}); (node.children||[]).forEach((child,index)=>visit(child,`${path}.${index}`)) }
  visit(root)
  return result
}
function traceKind(kind) { return kind==='valuation'?'result':kind==='formula'?'formula':['input','assumption','factor','context'].includes(kind)?'input':'source' }
function traceIcon(kind) { return kind==='formula'?<Code2 size={18}/>:kind==='valuation'?<Table2 size={18}/>:['input','assumption','factor'].includes(kind)?<Database size={17}/>:<Activity size={17}/> }
function displayTraceValue(value,unit) { if(value==null)return '—'; if(typeof value==='number')return `${value.toLocaleString(undefined,{maximumFractionDigits:6})}${unit?` ${unit}`:''}`; if(typeof value==='object')return JSON.stringify(value); return `${value}${unit?` ${unit}`:''}` }
