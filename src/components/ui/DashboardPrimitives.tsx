import { ArrowRight, LineChart } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconBubble } from './IconBubble'
import { useApp } from '../../context/useApp'

export function Driver({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="driver"><IconBubble dark>{icon}</IconBubble><span><small>{label}</small><b>{value}</b></span></div> }

export function QuickActions() {
  const { setActiveScreen, notify, openInvestigation } = useApp()
  const actions = [
    { icon: <LineChart size={21} />, label: 'Open model', text: 'Review structure and assumptions.', lime: true, run: () => setActiveScreen('Models'), message: 'Model library opened' },
    { icon: <LineChart size={21} />, label: 'Start projection run', text: 'Produce reserves and actuarial results.', run: () => setActiveScreen('Projections'), message: 'Projection Set flow opened' },
    { icon: <LineChart size={21} />, label: 'Trace a result', text: 'Follow a value back to its drivers.', lime: true, run: () => openInvestigation({ kind: 'trace', runId: 'JR-20261231-001', metric: 'net_reserve' }), message: 'Trace Explorer opened' },
    { icon: <LineChart size={21} />, label: 'Try in scratchpad', text: 'Test ideas in a safe workspace.', run: () => openInvestigation({ kind: 'scratchpad', runId: 'JR-20261231-001', metric: 'net_reserve' }), message: 'Scratchpad opened' },
  ]
  return <div className="panel"><h2 className="section-title">Quick actions</h2><div className="quick-grid">{actions.map(action => <button key={action.label} className={`quick-action ${action.lime ? 'quick-action-lime' : ''}`} onClick={() => { action.run(); notify(action.message) }}><span className="quick-action-top"><IconBubble lime={action.lime}>{action.icon}</IconBubble><ArrowRight size={18} /></span><b>{action.label}</b><small>{action.text}</small></button>)}</div></div>
}
