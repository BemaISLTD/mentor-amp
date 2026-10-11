import { useState, type ReactNode } from 'react'
import {
  Activity, ArrowRight, Bell, Check, ChevronsUpDown, ClipboardList,
  Copy, Cpu, Database, History, Link, Save,
  Settings2, Shield, Users, X,
} from 'lucide-react'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import './admin-settings.css'

type SettingSection = 'Workspace overview' | 'Members & permissions' | 'Compute resources' | 'Integrations' | 'Project defaults' | 'Audit history'
type ProjectMember = { user_id: string; email: string | null; full_name: string | null; role: string; created_at: string }
type MembersResponse = { members: ProjectMember[]; total: number }
type SystemStatus = {
  status: string
  app: string
  version: string
  app_env: string
  database: { status: string; latency_ms: number | null }
  engine: { registered_functions: number; products: string[]; execution_backend: string; engine_version: string }
}

const sections: { title: SettingSection; icon: typeof Settings2 }[] = [
  { title: 'Workspace overview', icon: Settings2 },
  { title: 'Members & permissions', icon: Users },
  { title: 'Compute resources', icon: Cpu },
  { title: 'Integrations', icon: Link },
  { title: 'Project defaults', icon: ClipboardList },
  { title: 'Audit history', icon: History },
]

export function AdminSettings({ onNotify }: { onNotify: (message: string) => void }) {
  const { project, projectId } = useWorkspace()
  const membersQuery = useApiQuery<MembersResponse>(projectId ? `/v1/projects/${encodeURIComponent(projectId)}/members` : null)
  const systemQuery = useApiQuery<SystemStatus>('/v1/system/status')
  const members = membersQuery.data?.members ?? []
  const owner = members.find(member => member.role === 'owner')
  const [section, setSection] = useState<SettingSection>('Workspace overview')
  const audit = () => setSection('Audit history')
  const systemStatus = systemQuery.data
  const systemHealthy = systemStatus?.status === 'ok'
  const systemLabel = systemQuery.loading
    ? 'Checking system status'
    : systemQuery.error
      ? 'System status unavailable'
      : systemHealthy
        ? 'All systems operational'
        : 'System reports degraded status'
  const systemDetail = systemQuery.error?.message
    ?? (systemStatus ? `${systemStatus.app} ${systemStatus.version} · ${systemStatus.app_env}` : 'Live status from the backend.')
  const copyProjectId = async () => {
    if (!projectId) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable.')
      await navigator.clipboard.writeText(projectId)
      onNotify('Project ID copied')
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Could not copy project ID.')
    }
  }

  return <div className="admin-settings-page">
    <div className="admin-settings-heading">
      <div><span className="admin-settings-eyebrow">WORKSPACE / ADMIN / SETTINGS</span><h2>Admin / Settings</h2><p>Manage workspace access, compute resources, integrations, and project defaults.</p></div>
      <div className="admin-settings-actions"><button className="admin-secondary-button" onClick={audit}><History size={18} />View audit history</button><button className="admin-primary-button" disabled title="Workspace defaults are not supported by the backend yet." aria-label="Save changes unavailable"><Save size={19} />Save changes</button></div>
    </div>

    <div className="admin-settings-layout">
      <nav className="admin-settings-nav" aria-label="Settings sections">
        {sections.map(({ title, icon: Icon }) => <button key={title} className={section === title ? 'is-active' : ''} onClick={() => setSection(title)}><Icon size={19} />{title}</button>)}
      </nav>
      <div className="admin-settings-main">
        <div className="admin-settings-grid">
          <section className="admin-panel admin-overview-panel">
            <header className="admin-panel-heading"><h3>Workspace overview</h3><div className={`admin-health-pill ${systemHealthy ? '' : 'is-degraded'}`}><span>{systemHealthy ? <Check size={15} /> : <Activity size={15} />}</span><div><b>{systemLabel}</b><small>{systemDetail}</small></div></div></header>
            <dl className="admin-overview-list"><div><dt>Workspace name</dt><dd>{project?.name ?? '—'}</dd></div><div><dt>Project ID</dt><dd>{projectId ?? '—'}{projectId && <button aria-label="Copy project ID" onClick={() => { void copyProjectId() }}><Copy size={16} /></button>}</dd></div><div><dt>Environment</dt><dd>{systemStatus?.app_env ?? (systemQuery.error ? 'Unavailable' : 'Loading…')}</dd></div><div><dt>Region</dt><dd>Not configured</dd></div><div><dt>Created</dt><dd>{project?.created_at ? new Date(project.created_at).toLocaleString() : '—'}</dd></div><div><dt>Owner</dt><dd>{membersQuery.loading ? 'Loading…' : membersQuery.error ? 'Unavailable' : owner?.full_name ?? owner?.email ?? 'Not assigned'}</dd></div></dl>
          </section>

          <section className="admin-panel admin-members-panel">
            <header className="admin-panel-heading"><h3>Members &amp; permissions</h3><button className="admin-small-button" disabled title="Member administration controls are not connected yet." onClick={() => setSection('Members & permissions')}>Manage access</button></header>
            <div className="admin-member-table"><div className="admin-member-table-head"><span>Name <ChevronsUpDown size={13} /></span><span>Role</span><span>Status</span><i /></div>
              {membersQuery.loading && <p>{'Loading project members…'}</p>}
              {membersQuery.error && <p role="alert">{membersQuery.error.message}</p>}
              {!membersQuery.loading && !membersQuery.error && members.map((member, index) => {
                const name = member.full_name || member.email || member.user_id
                const initials = name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
                const color = ['brown', 'blue', 'slate'][index % 3]
                return <div className="admin-member-row" key={member.user_id}><span className="admin-member-name"><i className={`admin-person-avatar avatar-${color}`}>{initials}</i><span><b>{name}</b><small>{member.email ?? member.user_id}</small></span></span><span><i className={`admin-role-badge role-${member.role.toLowerCase()}`}>{member.role}</i></span><span><i className="admin-active-badge">Project member</i></span><button aria-label={`${name} member options`} disabled title="Member administration controls are not connected yet."><MoreMenu /></button></div>
              })}
              {!membersQuery.loading && !membersQuery.error && members.length === 0 && <p>No members are assigned to this project.</p>}
              <button className="admin-view-members" disabled title="All available project members are shown above.">Showing {membersQuery.data?.total ?? 0} project members <ArrowRight size={17} /></button>
            </div>
          </section>

          <section className="admin-panel admin-defaults-panel">
            <header className="admin-panel-heading"><h3>Project defaults</h3></header>
            <div className="admin-default-row"><label htmlFor="default-model-version">Default model version</label><select id="default-model-version" disabled value=""><option value="">Not configured by backend</option></select></div>
            <div className="admin-default-row"><label htmlFor="default-compute-target">Default compute target</label><select id="default-compute-target" disabled value=""><option value="">Not configured by backend</option></select></div>
            <div className="admin-default-row"><label htmlFor="default-output-retention">Default output retention</label><select id="default-output-retention" disabled value=""><option value="">Not configured by backend</option></select></div>
            <ToggleRow title="Require validation before run" detail="Backend setting is not available." checked={false} disabled />
            <ToggleRow title="Allow draft models" detail="Backend setting is not available." checked={false} disabled />
          </section>

          <section className="admin-panel admin-compute-panel">
            <header className="admin-panel-heading"><h3>Compute resources</h3><button className="admin-small-button" disabled title="Compute configuration is not supported by the backend yet.">Manage resources</button></header>
            {systemQuery.loading && <p>Loading backend resource status…</p>}
            {systemQuery.error && <p role="alert">{systemQuery.error.message}</p>}
            {systemStatus && <><ResourceRow label="Database" status={systemStatus.database.status} detail={systemStatus.database.latency_ms === null ? 'Latency not reported' : `${systemStatus.database.latency_ms} ms`} /><ResourceRow label="Execution backend" status={systemStatus.engine.execution_backend} detail={`Engine ${systemStatus.engine.engine_version}`} /><ResourceRow label="Registered functions" status={String(systemStatus.engine.registered_functions)} detail={`${systemStatus.engine.products.length} products`} /></>}
          </section>

          <section className="admin-panel admin-integrations-panel">
            <header className="admin-panel-heading"><h3>Integrations</h3><button className="admin-small-button" disabled title="Integration management is not supported by the backend yet.">Configure</button></header>
            <div className="admin-integration-grid"><Integration icon={<Database size={22} />} title="Storage" detail="Not configured" subdetail="No backend integration data" /><Integration icon={<Shield size={22} />} title="Identity / SSO" detail="Not configured" subdetail="No backend integration data" /><Integration icon={<Bell size={22} />} title="Notifications" detail="Not configured" subdetail="No backend integration data" /></div>
          </section>

          <div className="admin-settings-side-bottom">
            <div className="admin-production-warning"><span>!</span><p><b>Production models are locked; changes require permission.</b><small>Contact a workspace owner to modify production settings.</small></p></div>
            <section className="admin-panel admin-activity-panel"><header className="admin-panel-heading"><h3>Recent activity</h3><button onClick={audit}>View audit history</button></header><div className="admin-activity-table"><div><span>Time</span><span>User</span><span>Action</span><span>Details</span></div><p>Audit history is not available from the backend.</p></div></section>
          </div>
        </div>
        {section !== 'Workspace overview' && <div className="admin-section-notice"><Activity size={17} /><span><b>{section}</b><small>{section === 'Members & permissions' ? 'Project membership is read from the backend; member administration controls are not connected.' : section === 'Compute resources' ? 'Live system and engine status is shown above; resource allocation controls are not available.' : section === 'Integrations' ? 'The backend does not expose integration configuration.' : section === 'Project defaults' ? 'The backend supports project name and description only; these defaults are not available.' : 'The backend does not expose an audit history endpoint.'}</small></span><button onClick={() => setSection('Workspace overview')} aria-label="Return to workspace overview"><X size={16} /></button></div>}
      </div>
    </div>
  </div>
}

function ToggleRow({ title, detail, checked, disabled = true }: { title: string; detail: string; checked: boolean; disabled?: boolean }) {
  return <div className="admin-toggle-row"><div><b>{title}</b><small>{detail}</small></div><button className={`admin-toggle ${checked ? 'is-on' : ''}`} role="switch" aria-checked={checked} aria-label={title} disabled={disabled}><i /></button></div>
}

function ResourceRow({ label, status, detail }: { label: string; status: string; detail: string }) {
  return <div className="admin-resource-row"><span>{label}</span><span><i />{status}</span><small>{detail}</small></div>
}

function Integration({ icon, title, detail, subdetail }: { icon: ReactNode; title: string; detail: string; subdetail: string }) {
  return <article className="admin-integration-card"><span className="admin-integration-icon">{icon}</span><div className="admin-integration-title"><b>{title}</b><small>Not configured</small></div><p>{detail}<small>{subdetail}</small></p><button disabled title="Integration details are not available from the backend.">View details <ArrowRight size={15} /></button></article>
}

function MoreMenu() {
  return <span className="admin-more-dots" aria-hidden="true"><i /><i /><i /></span>
}
