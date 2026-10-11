import { useMemo, useState } from 'react'
import {
  ArrowRight, BarChart3, BookOpen, Box, Check, Clock3, Database, ExternalLink,
  FileText, MessageSquare, MoreVertical, Paperclip, Plus, Search, Send,
} from 'lucide-react'
import './mentor-workspace.css'

type Conversation = {
  title: string
  model: string
  version: string
  date: string
  question: string
}

const starterConversations: Conversation[] = [
  { title: 'Why did GAAP reserve increase?', model: 'GAAP Reserve Model', version: 'v3.2', date: 'Apr 24, 2025, 10:42 AM', question: 'Why did GAAP reserve increase at projection year 10 in the latest run?' },
  { title: 'Explain mortality assumption source', model: 'GAAP Reserve Model', version: 'v3.2', date: 'Apr 23, 2025, 2:15 PM', question: 'Where does the mortality assumption used by this model come from?' },
  { title: 'Compare v3.1 vs v3.2', model: 'GAAP Reserve Model', version: 'v3.2', date: 'Apr 21, 2025, 9:18 AM', question: 'What changed between model versions 3.1 and 3.2?' },
  { title: 'Trace net cash flows', model: 'GAAP Reserve Model', version: 'v3.2', date: 'Apr 18, 2025, 4:33 PM', question: 'Trace the drivers of net cash flows for this run.' },
]

const facts = [
  { icon: FileText, title: 'GAAP Reserve Logic v4.1 was executed', detail: 'Used to calculate GAAP reserve for this run.', source: 'Formula source' },
  { icon: Database, title: 'MYGA Base Inforce v2026.12', detail: '248,310 records, used in this run.', source: 'Input source' },
  { icon: FileText, title: 'Discount Curve v5.0', detail: 'Used for present value calculations.', source: 'Factor source' },
  { icon: BarChart3, title: 'Reserve increased 4.8% at projection year 10', detail: 'From 1,023.4M to 1,072.5M (USD).', source: 'Result source' },
]

export function MentorWorkspace({ onOpenInvestigate, onNotify }: { onOpenInvestigate: () => void; onNotify: (message: string) => void }) {
  const [conversations, setConversations] = useState(starterConversations)
  const [selectedTitle, setSelectedTitle] = useState(starterConversations[0].title)
  const [search, setSearch] = useState('')
  const [question, setQuestion] = useState(starterConversations[0].question)
  const [prompt, setPrompt] = useState('')
  const [saved, setSaved] = useState(true)

  const selected = conversations.find(item => item.title === selectedTitle) ?? conversations[0]
  const visibleConversations = useMemo(() => conversations.filter(item => item.title.toLowerCase().includes(search.toLowerCase())), [conversations, search])

  const newConversation = () => {
    const fresh = { title: 'New conversation', model: 'GAAP Reserve Model', version: 'v3.2', date: 'Just now', question: 'Ask a question about this model, its inputs, or run results.' }
    setConversations(current => [fresh, ...current])
    setSelectedTitle(fresh.title)
    setQuestion(fresh.question)
    setSaved(false)
  }

  const askMentor = () => {
    const value = prompt.trim()
    if (!value) return
    setQuestion(value)
    const title = value.length > 38 ? `${value.slice(0, 35)}…` : value
    const fresh = { title, model: 'GAAP Reserve Model', version: 'v3.2', date: 'Just now', question: value }
    setConversations(current => [fresh, ...current.filter(item => item.title !== 'New conversation')])
    setSelectedTitle(title)
    setPrompt('')
    setSaved(false)
    onNotify('Question added to this conversation')
  }

  return <div className="mentor-page">
    <div className="mentor-page-heading">
      <div><span className="mentor-eyebrow">MENTOR</span><h2>Mentor</h2><p>Understand model behavior with verified facts, source links, and plain-language explanations.</p></div>
      <div className="mentor-heading-actions"><button className="mentor-secondary-button" onClick={newConversation}><MessageSquare size={17} />New conversation</button><button className="mentor-primary-button" onClick={onOpenInvestigate}><ExternalLink size={17} />Open Investigate</button></div>
    </div>

    <div className="mentor-workspace-grid">
      <aside className="mentor-card mentor-conversations">
        <header className="mentor-card-heading"><h3>Conversations</h3><button onClick={newConversation}><Plus size={16} />New</button></header>
        <label className="mentor-search"><Search size={17} /><input aria-label="Search conversations" placeholder="Search conversations..." value={search} onChange={event => setSearch(event.target.value)} /></label>
        <div className="mentor-conversation-list">
          {visibleConversations.map(item => <button key={item.title} className={`mentor-conversation ${selectedTitle === item.title ? 'is-active' : ''}`} onClick={() => { setSelectedTitle(item.title); setQuestion(item.question); setSaved(true) }}>
            <MessageSquare size={19} />
            <span><b>{item.title}</b><small>{item.model} <i>•</i> {item.version}</small><small>{item.date}</small></span>
          </button>)}
          {visibleConversations.length === 0 && <p className="mentor-empty-search">No matching conversations.</p>}
        </div>
      </aside>

      <main className="mentor-card mentor-thread">
        <header className="mentor-card-heading mentor-thread-heading"><h3>{selected?.title === 'New conversation' ? 'New conversation' : selected?.title}</h3><button aria-label="Conversation options" onClick={() => onNotify('Conversation options opened')}><MoreVertical size={19} /></button></header>
        <div className="mentor-message mentor-user-message"><span className="mentor-avatar">AJ</span><div className="mentor-message-body"><div><b>You</b><time>10:42 AM</time></div><p>{question}</p></div></div>
        <div className="mentor-message mentor-assistant-message"><span className="mentor-brand-avatar"><i /><i /><i /></span><div className="mentor-message-body"><div><b>Mentor</b><time>10:42 AM</time></div><p>Here are the verified facts from your model run, followed by an interpretation of why GAAP reserve increased at projection year 10.</p></div></div>

        <section className="mentor-facts-panel">
          <header><span><Check size={20} /></span><div><b>Verified model facts</b><small>These facts are directly from your model, inputs, and run results.</small></div></header>
          {facts.map(({ icon: Icon, title, detail, source }) => <div className="mentor-fact" key={title}><Icon size={21} /><div><b>{title}</b><small>{detail}</small></div><button onClick={() => onNotify(`${source} opened`)}>View source <ArrowRight size={15} /></button></div>)}
        </section>

        <section className="mentor-interpretation">
          <header><span>i</span><div><b>Interpretation</b><small>Plain-language explanation based on the verified model facts above.</small></div></header>
          <p>The GAAP reserve increased by 4.8% at projection year 10 primarily due to higher projected benefit payments, driven by a higher in-force balance and lower discount rates in later years. The run used Discount Curve v5.0, which has lower rates beyond year 8 compared to the prior run, increasing the present value of future benefits. This effect was partially offset by expected mortality, but the net impact is an increase in GAAP reserve.</p>
        </section>

        <div className="mentor-suggested"><b>Suggested next steps</b><div>
          <button onClick={() => onNotify('Reserve formula trace opened')}><MessageSquare size={14} />Trace reserve formula</button>
          <button onClick={() => onNotify('Prior run comparison opened')}><BookOpen size={14} />Compare prior run</button>
          <button onClick={() => onNotify('Assumptions opened')}><Box size={14} />Open assumptions</button>
          <button onClick={() => { setSaved(true); onNotify('Added to Scratchpad') }}><Plus size={14} />Add to Scratchpad</button>
        </div></div>
        <form className="mentor-composer" onSubmit={event => { event.preventDefault(); askMentor() }}><input aria-label="Ask Mentor about this model" placeholder="Ask Mentor about this model..." value={prompt} onChange={event => setPrompt(event.target.value)} /><button type="button" aria-label="Attach a file" onClick={() => onNotify('File attachments are not available in this workspace')}><Paperclip size={18} /></button><button className="mentor-send" aria-label="Send question" disabled={!prompt.trim()} type="submit"><Send size={17} /></button></form>
        <p className="mentor-disclaimer">Mentor provides information based on your model and its data. Generated interpretations are not verified model facts.</p>
      </main>

      <aside className="mentor-context-column">
        <section className="mentor-card mentor-context-card"><header className="mentor-card-heading"><h3>Context</h3><button aria-label="Context options" onClick={() => onNotify('Context options opened')}><MoreVertical size={19} /></button></header>
          <dl><div><dt>Model</dt><dd>MYGA Reserve Model</dd></div><div><dt>Version</dt><dd>v3.2</dd></div><div><dt>Run</dt><dd>RUN-2025-0418</dd></div><div><dt>Result</dt><dd>GAAP Reserve</dd></div><div><dt>Selected formula</dt><dd>GAAP Reserve Logic</dd></div></dl>
        </section>
        <section className="mentor-card mentor-sources-card"><header className="mentor-card-heading"><h3>Sources</h3></header>
          <Source icon={<Box size={24} />} title="Model structure" detail="MYGA / GAAP / Base" onClick={() => onNotify('Model structure opened')} />
          <Source icon={<span className="mentor-fx">ƒx</span>} title="Formula Group" detail="GAAP Reserve Logic / v4.1" onClick={() => onNotify('Formula group opened')} />
          <Source icon={<FileText size={24} />} title="MYGA Assumptions" detail="v4.2" onClick={() => onNotify('MYGA Assumptions opened')} />
          <Source icon={<Clock3 size={24} />} title="Run history" detail="RUN-2025-0418" onClick={() => onNotify('Run history opened')} />
        </section>
        <div className="mentor-caution"><span>!</span><p>Generated interpretation is not a verified model fact. Always review sources and model inputs for important decisions.</p></div>
        <section className="mentor-card mentor-saved-card"><header className="mentor-card-heading"><h3>Saved to this conversation</h3><button aria-label="Saved item options" onClick={() => onNotify('Saved item options opened')}><MoreVertical size={19} /></button></header>
          {saved && <button className="mentor-saved-item" onClick={() => onNotify('Saved explanation opened')}><FileText size={21} /><span><b>Explanation: GAAP reserve increase at year 10</b><small>Saved Apr 24, 2025, 10:45 AM</small></span><ExternalLink size={16} /></button>}
          {!saved && <p className="mentor-no-saved">No saved items in this conversation yet.</p>}
        </section>
      </aside>
    </div>
  </div>
}

function Source({ icon, title, detail, onClick }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void }) {
  return <button className="mentor-source" onClick={onClick}><span>{icon}</span><div><b>{title}</b><small>{detail}</small></div><ExternalLink size={16} /></button>
}
