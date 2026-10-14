import { useState } from 'react'
import {
  Activity,
  ArrowRight,
  Check,
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
  Search,
  Send,
  Sparkles,
  Table2,
} from 'lucide-react'
import './reserve-investigation.css'

const traceNodes = [
  { id: 'net_reserve', type: 'Result', name: 'net reserve', value: '$1,245.6M', version: '', icon: <Table2 size={18} />, kind: 'result' },
  { id: 'reserve_t', type: 'Formula', name: 'reserve_t', value: 'v4.1', version: '', icon: <Code2 size={18} />, kind: 'formula' },
  { id: 'lapse_rate', type: 'Input', name: 'lapse_rate', value: '4.25% · Year 5', version: '', icon: <Database size={17} />, kind: 'input' },
  { id: 'mat-001', type: 'Source', name: 'mat-001', value: 'v1.8', version: '', icon: <Database size={17} />, kind: 'source' },
]

const mentorPrompts = [
  'Why did net reserve change?',
  'Trace the lapse driver',
  'Compare scenarios',
  'Show sensitivity',
]

export function ReserveInvestigation({ onNotify }) {
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
              <div><h2>Trace Explorer</h2><p>Follow the full calculation path. Click a node to see details, values, and source.</p></div>
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
            <div><b>Why did net reserve change?</b><small>MYGA Base · 2026-12-31 · Run JR-20261231-001</small></div>
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