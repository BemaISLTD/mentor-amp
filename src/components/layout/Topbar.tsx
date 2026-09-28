import { Bell, CalendarDays, ChevronDown, Search } from 'lucide-react'
import { useApp } from '../../context/useApp'

export function Topbar({ variant = 'default' }: { variant?: 'default' | 'library' }) {
  const { notify } = useApp()
  return <header className={`topbar ${variant === 'library' ? 'topbar-library' : ''}`}><div className={variant === 'library' ? 'global-search' : 'context-pill'}>{variant === 'library' ? <><Search size={19} /><input placeholder="Search models, versions, owners..." aria-label="Search models, versions, owners" /><kbd>⌘ K</kbd></> : <><span>MYGA</span><b>•</b><span>Model v3.2</span><b>•</b><span>Q4-2024 GAAP Reserve — MYGA Base</span><b>•</b><span>Base scenario</span><b>•</b><span className="context-date"><CalendarDays size={15} />2026-12-31</span></>}</div><div className="topbar-actions"><button className="icon-button has-dot" aria-label="Notifications" onClick={() => notify('No new notifications')}><Bell size={19} /></button><button className="avatar" aria-label="Open profile" onClick={() => notify('Profile menu opened')}>AJ</button><div className="profile-name"><strong>Andrew Johnson</strong><small>Actuary</small></div><button className="icon-button" aria-label="Profile menu" onClick={() => notify('Profile menu opened')}><ChevronDown size={16} /></button></div></header>
}
