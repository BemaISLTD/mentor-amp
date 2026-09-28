import { Bell, Check, ChevronRight, Database, KeyRound, Lock, Palette, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useApp } from '../context/useApp'

const rows = [
  ['Workspace settings', 'Model context, date defaults, and calculation preferences', SlidersHorizontal],
  ['Access and permissions', 'Members, roles, shared models, and approval gates', Users],
  ['Notifications', 'Run completion, validation warnings, and Mentor updates', Bell],
  ['Data and retention', 'Snapshots, exports, audit history, and linked sources', Database],
  ['Security', 'Session controls and workspace protection', Lock],
] as const

export function SettingsPage() {
  const { notify } = useApp()
  return <div className="workspace-stack">
    <div className="panel detail-workspace-head">
      <div><span className="eyebrow">Workspace administration</span><h2 className="section-title">Admin / Settings</h2><p className="muted">Configure the active workspace without leaving the model context.</p></div>
      <StatusBadge status="Validated" />
    </div>
    <div className="settings-grid">
      <div className="panel settings-list">{rows.map(([title, detail, Icon]) => <button className="settings-row" key={title} onClick={() => notify(`${title} opened`)}><span className="settings-icon"><Icon size={17} /></span><span><b>{title}</b><small>{detail}</small></span><ChevronRight size={16} /></button>)}</div>
      <aside className="panel settings-status">
        <span className="settings-icon settings-icon-dark"><ShieldCheck size={18} /></span><h2 className="section-title">System status</h2><p className="muted">All systems operational. Current workspace is protected and synced.</p>
        <div className="check-list"><span><Check size={15} />Model context synced</span><span><Check size={15} />Audit trail active</span><span><Check size={15} />Export controls enabled</span></div>
        <button className="button button-primary full-button" onClick={() => notify('Appearance preferences opened')}><Palette size={15} />Appearance preferences</button>
        <button className="button button-secondary full-button" onClick={() => notify('API access settings opened')}><KeyRound size={15} />API access</button>
      </aside>
    </div>
  </div>
}
