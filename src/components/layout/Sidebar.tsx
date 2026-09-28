import { ArrowRight, Check, Menu } from 'lucide-react'
import { navItems } from '../../data/fixtures'
import { useApp } from '../../context/useApp'
import type { ScreenName } from '../../types'
import { Logo } from './Logo'

export function Sidebar() {
  const { activeScreen, setActiveScreen, notify } = useApp()
  return <aside className="sidebar"><Logo /><button className="mobile-menu" aria-label="Open navigation"><Menu size={20} /></button><nav className="primary-nav" aria-label="Primary navigation">{navItems.map(({ label, icon: Icon, group }, index) => { const previous = navItems[index - 1]?.group; return <div key={label}>{group !== previous && <div className="nav-group-label">{group === 'Authoring' ? 'Build' : group === 'Execution' ? 'Run' : group === 'Analysis' ? 'Understand' : 'Workspace'}</div>}<button onClick={() => { setActiveScreen(label as ScreenName); if (label !== 'Dashboard' && label !== 'Models') notify(`${label} workspace opened`) }} className={`nav-item ${activeScreen === label ? 'nav-item-active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === 'Mentor' && <span className="nav-new">NEW</span>}</button></div> })}</nav><div className="sidebar-footer"><button onClick={() => notify('All systems are operational')} className="status-card"><span className="status-card-head"><span className="status-check"><Check size={13} /></span><span>System status</span><ArrowRight size={16} /></span><span>All systems operational</span><small>Updated just now</small></button><div className="sidebar-meta"><span>Mentor AMP</span><span>Volt 1.0</span></div></div></aside>
}
