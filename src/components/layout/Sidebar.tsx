import { ArrowRight, Check, Menu } from 'lucide-react'
import { navItems } from '../../data/fixtures'
import { useApp } from '../../context/useApp'
import type { ScreenName } from '../../types'
import { Logo } from './Logo'

export function Sidebar({ onNavigate }: { onNavigate?: (screen: string) => void }) {
  const { activeScreen, setActiveScreen, notify } = useApp()
  return <aside className="sidebar max-[760px]:sticky max-[760px]:top-0 max-[760px]:h-auto max-[760px]:min-h-0 max-[760px]:w-full max-[760px]:overflow-hidden">
    <Logo />
    <button className="mobile-menu" aria-label="Open navigation"><Menu size={20} /></button>
    <nav className="primary-nav max-[760px]:mt-0 max-[760px]:flex max-[760px]:gap-1 max-[760px]:overflow-x-auto max-[760px]:overflow-y-hidden max-[760px]:px-2.5 max-[760px]:pb-2.5" aria-label="Primary navigation">
      {navItems.map(({ label, icon: Icon, group }, index) => {
        const previous = navItems[index - 1]?.group
        const groupLabel = group === 'Authoring' ? 'Build' : group === 'Execution' ? 'Run' : group === 'Analysis' ? 'Understand' : 'Workspace'

        return (
          <div className="max-[760px]:shrink-0" key={label}>
            {group !== previous && <div className="nav-group-label max-[760px]:hidden">{groupLabel}</div>}
            <button
              onClick={() => {
                onNavigate?.(label)
                setActiveScreen(label as ScreenName)
                if (label !== 'Dashboard' && label !== 'Models') {
                  notify(`${label} workspace opened`)
                }
              }}
              className={`nav-item max-[760px]:w-auto max-[760px]:whitespace-nowrap max-[760px]:px-2.5 ${activeScreen === label ? 'nav-item-active' : ''}`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === 'Mentor' && <span className="nav-new">NEW</span>}
            </button>
          </div>
        )
      })}
    </nav>
    <div className="sidebar-footer max-[760px]:hidden">
      <button onClick={() => notify('All systems are operational')} className="status-card">
        <span className="status-card-head">
          <span className="status-check"><Check size={13} /></span>
          <span>System status</span>
          <ArrowRight size={16} />
        </span>
        <span>All systems operational</span>
        <small>Updated just now</small>
      </button>
      <div className="sidebar-meta"><span>Mentor AMP</span><span>Volt 1.0</span></div>
    </div>
  </aside>
}
