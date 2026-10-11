import { Bell, CalendarDays, LogOut, Search } from 'lucide-react'
import { useApp } from '../../context/useApp'
import { useApi } from '../../api/ApiProvider'
import { useWorkspace } from '../../api/WorkspaceContext'

export function Topbar({ variant = 'default', searchValue = '', onSearchChange, searchPlaceholder = 'Search models, versions, owners...', modelName = 'MYGA Reserve Model', modelVersion = 'v3.2' }: { variant?: 'default' | 'library' | 'model-workspace' | 'mentor' | 'admin'; searchValue?: string; onSearchChange?: (value: string) => void; searchPlaceholder?: string; modelName?: string; modelVersion?: string }) {
  const { notify } = useApp()
  const { user, signOut } = useApi()
  const { projects, project, selectProject } = useWorkspace()
  const initials = user?.full_name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'U'
  const today = new Date().toISOString().slice(0, 10)
  return <header className={`topbar max-[760px]:gap-2 ${variant === 'library' ? 'topbar-library min-h-[76px]' : ''}`}>
    <div className={`${variant === 'library' ? 'global-search' : 'context-pill'} max-[760px]:max-w-[calc(100%-130px)] max-[760px]:gap-1.5 max-[760px]:px-2.5 max-[760px]:py-2 max-[760px]:text-[9px] max-[420px]:max-w-[calc(100%-95px)]`}>
      {variant === 'library' ? <><Search size={19} /><input value={searchValue} onChange={event => onSearchChange?.(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} /><kbd className="max-[500px]:hidden">⌘ K</kbd></> : variant === 'model-workspace' ? <><span>{project?.name}</span><b>•</b><span>Model {modelVersion}</span><b>•</b><span>{modelName}</span></> : variant === 'mentor' ? <><span>{project?.name}</span><b>•</b><span>Mentor</span></> : variant === 'admin' ? <><span>{project?.name}</span><b>•</b><span>Workspace settings</span></> : <><span>{project?.name}</span><b>•</b><span>Live project data</span><b>•</b><span className="context-date"><CalendarDays size={15} />{today}</span></>}
    </div>
    <div className="topbar-actions max-[760px]:gap-2">
      {projects.length > 1 && <select className="workspace-project-select max-[760px]:max-w-[120px]" aria-label="Active project" value={project?.id ?? ''} onChange={event => selectProject(event.target.value)}>{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
      <button className="icon-button has-dot" aria-label="Notifications" onClick={() => notify('No new notifications')}><Bell size={19} /></button>
      <button className="avatar max-[420px]:hidden" aria-label="Signed-in user" title={user?.email}>{initials}</button>
      <div className="profile-name max-[760px]:hidden"><strong>{user?.full_name}</strong><small>{user?.roles.join(', ')}</small></div>
      <button className="icon-button max-[760px]:hidden" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut size={16} /></button>
    </div>
  </header>
}
