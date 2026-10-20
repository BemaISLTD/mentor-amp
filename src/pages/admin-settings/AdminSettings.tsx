import { useEffect, useState, type ReactNode } from 'react'
import {
  Activity, ArrowRight, Bell, Check, ChevronsUpDown, ClipboardList,
  Copy, Cpu, Database, History, Link, Save,
  Settings2, Shield, UserRoundPlus, Users, X,
} from 'lucide-react'
import { useApi } from '../../api/ApiProvider'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import { canEditProjectSettings } from '../../api/permissions'
import './admin-settings.css'

type SettingSection = 'Workspace overview' | 'Members & permissions' | 'Compute resources' | 'Integrations' | 'Project defaults' | 'Audit history'
type Member = { user_id: string; email: string | null; full_name: string | null; role: string; created_at: string }
type MembersResponse = { members: Member[]; total: number }
type SystemStatus = { status: string; app: string; version: string; app_env: string; database: { status: string; latency_ms: number | null }; engine: { registered_functions: number; products: string[]; execution_backend: string; engine_version: string }; time: string }
type AuditEntry = { id: number; actor_user_id: string | null; action: string; entity_type: string; entity_id: string; before_state: Record<string, unknown> | null; after_state: Record<string, unknown> | null; context: Record<string, unknown> | null; created_at: string }
type UserEntry = { id: string; email: string; full_name: string; roles: string[]; is_active: boolean; created_at: string }
type UsersResponse = UserEntry[] | { users?: UserEntry[]; items?: UserEntry[] }
type AuditResponse = { entries: AuditEntry[]; total: number; limit: number; offset: number }
type PlatformRole = 'admin' | 'actuary' | 'model_developer' | 'reviewer' | 'read_only'

const sections: { title: SettingSection; icon: typeof Settings2 }[] = [
  { title: 'Workspace overview', icon: Settings2 },
  { title: 'Members & permissions', icon: Users },
  { title: 'Compute resources', icon: Cpu },
  { title: 'Integrations', icon: Link },
  { title: 'Project defaults', icon: ClipboardList },
  { title: 'Audit history', icon: History },
]

export function AdminSettings({ onNotify }: { onNotify: (message: string) => void }) {
  const [section, setSection] = useState<SettingSection>('Workspace overview')
  const { projectId, project } = useWorkspace()
  const { request, user } = useApi()
  const canEditSettings = canEditProjectSettings(user?.roles ?? [])
  const isAdmin = (user?.roles ?? []).some(role => role.toLowerCase() === 'admin')
  const projectQuery = useApiQuery<{ id: string; name: string; description: string | null; created_at: string; updated_at: string }>(projectId ? `/v1/projects/${projectId}` : null)
  const membersQuery = useApiQuery<MembersResponse>(projectId ? `/v1/projects/${projectId}/members` : null)
  const statusQuery = useApiQuery<SystemStatus>('/v1/system/status')
  const usersQuery = useApiQuery<UsersResponse>(isAdmin ? '/v1/users/' : null)
  const auditQuery = useApiQuery<AuditResponse>(isAdmin ? '/v1/audit-logs/?limit=10' : null)
  const liveProject = projectQuery.data ?? project
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<'owner' | 'editor' | 'viewer'>('viewer')
  const [memberBusy, setMemberBusy] = useState(false)
  const [memberError, setMemberError] = useState('')
  const [memberNotice, setMemberNotice] = useState('')
  const [recentlyCreatedUser, setRecentlyCreatedUser] = useState<UserEntry | null>(null)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<PlatformRole>('reviewer')
  const [userBusy, setUserBusy] = useState(false)
  const [userError, setUserError] = useState('')
  const [userNotice, setUserNotice] = useState('')
  useEffect(() => { setName(liveProject?.name ?? ''); setDescription(liveProject?.description ?? '') }, [liveProject?.id, liveProject?.name, liveProject?.description])
  const changed = Boolean(liveProject && (name !== liveProject.name || description !== (liveProject.description ?? '')))
  const saveSettings = async () => {
    if (!canEditSettings || !projectId || !changed || saving) return
    setSaving(true); setSaveError('')
    try {
      await request(`/v1/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify({ name: name.trim(), description: description.trim() }) })
      projectQuery.refetch()
      onNotify('Project name and description saved')
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Could not save project details.') }
    finally { setSaving(false) }
  }
  const audit = () => {
    if (!isAdmin) {
      onNotify('Only platform administrators can view audit history.')
      return
    }
    setSection('Audit history')
    auditQuery.refetch()
  }
  const members = membersQuery.data?.members ?? []
  const userEntries = Array.isArray(usersQuery.data) ? usersQuery.data : usersQuery.data?.users ?? usersQuery.data?.items ?? []
  const auditEntries = auditQuery.data?.entries ?? []
  const status = statusQuery.data
  const owner = members.find(member => member.role.toLowerCase() === 'owner')

  const addMember = async () => {
    if (!canEditSettings) {
      setMemberError('Only project administrators can manage project membership.')
      return
    }
    if (!projectId || !memberEmail.trim()) {
      setMemberError('Choose a user email before adding them to the project.')
      return
    }

    const targetUser = userEntries.find((candidate) => candidate.email?.toLowerCase() === memberEmail.trim().toLowerCase())
      ?? (recentlyCreatedUser?.email?.toLowerCase() === memberEmail.trim().toLowerCase() ? recentlyCreatedUser : undefined)
    if (!targetUser) {
      setMemberError('That user is not in the backend users registry yet. Create the user account first.')
      return
    }

    setMemberBusy(true)
    setMemberError('')
    setMemberNotice('')
    try {
      await request(`/v1/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ user_id: targetUser.id, role: memberRole }),
      })
      setMemberNotice(`${targetUser.email ?? 'User'} added with the ${memberRole} role.`)
      setMemberEmail('')
      setMemberRole('viewer')
      membersQuery.refetch()
      setRecentlyCreatedUser(null)
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : 'Could not add the member.')
    } finally {
      setMemberBusy(false)
    }
  }

  const createUser = async () => {
    if (!isAdmin || userBusy) return
    if (!newUserName.trim() || !newUserEmail.trim() || newUserPassword.length < 12) {
      setUserError('Enter a name, email, and password with at least 12 characters.')
      return
    }
    setUserBusy(true)
    setUserError('')
    setUserNotice('')
    try {
      const created = await request<UserEntry>('/v1/users/', {
        method: 'POST',
        body: JSON.stringify({
          email: newUserEmail.trim(),
          full_name: newUserName.trim(),
          password: newUserPassword,
          roles: [newUserRole],
        }),
      })
      usersQuery.refetch()
      setRecentlyCreatedUser(created)
      setMemberEmail(created.email)
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('')
      setUserNotice(`${created.email} created with platform role ${created.roles.join(', ')}. Assign project access below.`)
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'Could not create the user account.')
    } finally {
      setUserBusy(false)
    }
  }

  return <div className="admin-settings-page">
    <div className="admin-settings-heading">
      <div><span className="admin-settings-eyebrow">WORKSPACE / ADMIN / SETTINGS</span><h2>Admin / Settings</h2><p>Manage workspace access, compute resources, integrations, and project defaults.</p></div>
      <div className="admin-settings-actions">{isAdmin && <button className="admin-secondary-button" onClick={audit}><History size={18} />View audit history</button>}{canEditSettings && <button className="admin-primary-button" aria-label={changed ? 'Save project details' : 'No project detail changes to save'} disabled={!changed || saving} onClick={() => void saveSettings()}><Save size={19} />{saving ? 'Saving…' : 'Save changes'}</button>}</div>
    </div>

    <div className="admin-settings-layout">
      <nav className="admin-settings-nav" aria-label="Settings sections">
        {sections.map(({ title, icon: Icon }) => <button key={title} className={section === title ? 'is-active' : ''} onClick={() => setSection(title)}><Icon size={19} />{title}</button>)}
      </nav>
      <div className="admin-settings-main">
        <div className="admin-settings-grid">
          <section className="admin-panel admin-overview-panel">
            <header className="admin-panel-heading"><h3>Workspace overview</h3><div className="admin-health-pill"><span><Check size={15} /></span><div><b>{status?.status ?? (statusQuery.loading ? 'Checking system status' : 'System status unavailable')}</b><small>{status ? `${status.app} · ${status.version}` : statusQuery.error?.message ?? 'Live service status is not available.'}</small></div></div></header>
            <dl className="admin-overview-list"><div><dt>Workspace name</dt><dd><input aria-label="Project name" disabled={!canEditSettings} value={name} onChange={event => setName(event.target.value)} /></dd></div><div><dt>Project ID</dt><dd>{liveProject?.id ?? 'Unavailable'}{liveProject?.id && <button aria-label="Copy project ID" onClick={() => { void navigator.clipboard?.writeText(liveProject.id); onNotify('Project ID copied') }}><Copy size={16} /></button>}</dd></div><div><dt>Environment</dt><dd><span className="admin-production-tag">{status?.app_env ?? 'Unavailable'}</span></dd></div><div><dt>Region</dt><dd>Not provided by the API</dd></div><div><dt>Created</dt><dd>{liveProject?.created_at ? new Date(liveProject.created_at).toLocaleString() : 'Unavailable'}</dd></div><div><dt>Owner</dt><dd>{owner?.full_name || owner?.email || 'Owner not listed'}</dd></div><div><dt>Description</dt><dd><input aria-label="Project description" disabled={!canEditSettings} value={description} onChange={event => setDescription(event.target.value)} placeholder="No description" /></dd></div></dl>
            {saveError && <p role="alert">{saveError}</p>}
          </section>

          <section className="admin-panel admin-members-panel">
            <header className="admin-panel-heading"><h3>Members &amp; permissions</h3><button className="admin-small-button" onClick={() => setSection('Members & permissions')}>Manage access</button></header>
            <div className="admin-member-table"><div className="admin-member-table-head"><span>Name <ChevronsUpDown size={13} /></span><span>Role</span><span>Status</span><i /></div>
              {membersQuery.loading && <div className="admin-member-row">Loading project members…</div>}
              {membersQuery.error && <div className="admin-member-row">Could not load members: {membersQuery.error.message}</div>}
              {!membersQuery.loading && !membersQuery.error && members.map((member, index) => { const display = member.full_name || member.email || 'Unknown user'; const role = member.role || 'Member'; const initials = display.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join(''); const color = ['brown', 'blue', 'slate'][index % 3]; return <div className="admin-member-row" key={member.user_id}><span className="admin-member-name"><i className={`admin-person-avatar avatar-${color}`}>{initials}</i><span><b>{display}</b><small>{member.email ?? 'No email on file'}</small></span></span><span><i className={`admin-role-badge role-${role.toLowerCase()}`}>{role}</i></span><span><i className="admin-active-badge">Member</i></span><button aria-label={`${display} member options`} disabled title="Member options are managed through the project member API"><MoreMenu /></button></div> })}
              {!membersQuery.loading && !membersQuery.error && members.length === 0 && <div className="admin-member-row">No project members returned.</div>}
              {canEditSettings && <form className="admin-member-add" onSubmit={(event) => { event.preventDefault(); void addMember() }}>
                <div className="admin-member-add-heading">
                  <span className="admin-member-add-icon"><UserRoundPlus size={17} /></span>
                  <div><h4>Add a member</h4><p>Give an existing user access to this project.</p></div>
                </div>
                <div className="admin-member-add-fields">
                  <label className="admin-member-email-field" htmlFor="project-member-email">User email
                    <input id="project-member-email" autoComplete="email" type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="name@company.com" required />
                  </label>
                  <label className="admin-member-role-field" htmlFor="project-member-role">Project role
                    <select id="project-member-role" value={memberRole} onChange={(event) => setMemberRole(event.target.value as 'owner' | 'editor' | 'viewer')}>
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="owner">Owner</option>
                    </select>
                  </label>
                  <button className="admin-member-add-button" type="submit" disabled={memberBusy || !projectId}><UserRoundPlus size={15} />{memberBusy ? 'Adding…' : 'Add member'}</button>
                </div>
                <p className="admin-member-role-help">
                  {memberRole === 'owner' && 'Owners can manage project-owned data. Member management also requires the platform permission.'}
                  {memberRole === 'editor' && 'Editors can change project-owned data, subject to platform permissions.'}
                  {memberRole === 'viewer' && 'Viewers can access project information but cannot make changes.'}
                </p>
                <p className="admin-member-add-note">The email must belong to an existing platform user. Project role is separate from their platform role.</p>
              </form>}
              {!canEditSettings && <p className="admin-inline-error">Only project administrators can manage project membership.</p>}
              {memberError && <p role="alert" className="admin-inline-error">{memberError}</p>}
              {memberNotice && <p role="status" className="admin-inline-success">{memberNotice}</p>}
              <button className="admin-view-members" onClick={() => setSection('Members & permissions')}>View all {membersQuery.data?.total ?? 0} members <ArrowRight size={17} /></button>
              {isAdmin && <div className="admin-user-create">
                <h4>Create platform user</h4>
                <p>Create a second account, then assign it to this project using the form above.</p>
                {usersQuery.error && <p role="alert" className="admin-inline-error">Could not load users: {usersQuery.error.message}</p>}
                <label>Full name<input autoComplete="name" value={newUserName} onChange={event => setNewUserName(event.target.value)} /></label>
                <label>Email<input autoComplete="email" type="email" value={newUserEmail} onChange={event => setNewUserEmail(event.target.value)} /></label>
                <label>Temporary password<input autoComplete="new-password" type="password" minLength={12} value={newUserPassword} onChange={event => setNewUserPassword(event.target.value)} /></label>
                <label>Platform role<select value={newUserRole} onChange={event => setNewUserRole(event.target.value as PlatformRole)}>{(['admin', 'actuary', 'model_developer', 'reviewer', 'read_only'] as const).map(role => <option key={role} value={role}>{role}</option>)}</select></label>
                <button className="admin-small-button" disabled={userBusy || !newUserName.trim() || !newUserEmail.trim() || newUserPassword.length < 12} onClick={() => void createUser()}>{userBusy ? 'Creating…' : 'Create user'}</button>
                {userError && <p role="alert" className="admin-inline-error">{userError}</p>}
                {userNotice && <p role="status" className="admin-inline-success">{userNotice}</p>}
              </div>}
            </div>
          </section>

          <section className="admin-panel admin-defaults-panel">
            <header className="admin-panel-heading"><h3>Project defaults</h3></header>
            <p>Defaults are unavailable: no persistence API is connected for these settings. Controls are disabled.</p>
            <div className="admin-default-row"><label htmlFor="default-model-version">Default model version</label><select id="default-model-version" disabled><option>Unavailable</option></select></div>
            <div className="admin-default-row"><label htmlFor="default-compute-target">Default compute target</label><select id="default-compute-target" disabled><option>Unavailable</option></select></div>
            <div className="admin-default-row"><label htmlFor="default-output-retention">Default output retention</label><select id="default-output-retention" disabled><option>Unavailable</option></select></div>
            <ToggleRow title="Require validation before run" detail="Setting persistence is not available." checked={false} onChange={() => {}} />
            <ToggleRow title="Allow draft models" detail="Setting persistence is not available." checked={false} onChange={() => {}} />
          </section>

          <section className="admin-panel admin-compute-panel">
            <header className="admin-panel-heading"><h3>Compute resources</h3><button className="admin-small-button" disabled title="No compute resource management API is connected">Manage resources</button></header>
            <ResourceRow label="Execution backend" status={status?.engine.execution_backend ?? 'Unavailable'} detail={status ? `Engine ${status.engine.engine_version}` : 'System status unavailable'} />
            <ResourceRow label="Registered functions" status={status ? String(status.engine.registered_functions) : 'Unavailable'} detail="Live system status" />
            <ResourceRow label="Products" status={status ? String(status.engine.products.length) : 'Unavailable'} detail={status ? status.engine.products.join(', ') : 'System status unavailable'} />
            <div className="admin-capacity-row"><span>Database</span><span>{status ? `${status.database.status}${status.database.latency_ms != null ? ` · ${status.database.latency_ms} ms` : ''}` : 'Unavailable'}</span><div><i /></div></div>
            <div className="admin-queue-row"><span>Queue length</span><span>Not provided</span><b>Unavailable</b></div>
          </section>

          <section className="admin-panel admin-integrations-panel">
            <header className="admin-panel-heading"><h3>Integrations</h3><button className="admin-small-button" disabled title="No integration configuration API is connected">Configure</button></header>
            <div className="admin-integration-grid"><Integration icon={<Database size={22} />} title="Storage" detail="Integration status unavailable" subdetail="No integration API" onClick={() => onNotify('Integration details are unavailable: no integrations API is connected.')} /><Integration icon={<Shield size={22} />} title="Identity / SSO" detail="Integration status unavailable" subdetail="No integration API" onClick={() => onNotify('Integration details are unavailable: no integrations API is connected.')} /><Integration icon={<Bell size={22} />} title="Notifications" detail="Integration status unavailable" subdetail="No integration API" onClick={() => onNotify('Integration details are unavailable: no integrations API is connected.')} /></div>
          </section>

          <div className="admin-settings-side-bottom">
            <div className="admin-production-warning"><span>!</span><p><b>Only project name and description can be changed here.</b><small>Other settings have no persistence API.</small></p></div>
            {isAdmin && <section className="admin-panel admin-activity-panel"><header className="admin-panel-heading"><h3>Recent activity</h3><button onClick={audit}>View audit history</button></header>{auditQuery.error && <p role="alert" className="admin-inline-error">Could not load audit history: {auditQuery.error.message}</p>}{auditQuery.loading && <p>Loading audit history…</p>}<div className="admin-activity-table"><div><span>Time</span><span>Actor ID</span><span>Action</span><span>Entity</span></div>{auditEntries.length ? auditEntries.slice(0, 4).map(entry => <div key={entry.id}><span>{new Date(entry.created_at).toLocaleString()}</span><span>{entry.actor_user_id ?? 'System'}</span><span>{entry.action}</span><span>{entry.entity_type} · {entry.entity_id}</span></div>) : !auditQuery.loading && !auditQuery.error && <div><span>—</span><span>—</span><span>None</span><span>No audit log entries were returned.</span></div>}</div></section>}
          </div>
        </div>
        {section === 'Audit history' && isAdmin && <section className="admin-panel admin-audit-detail"><header className="admin-panel-heading"><h3>Audit history</h3><button className="admin-small-button" onClick={() => auditQuery.refetch()}>Refresh</button></header><p>Showing {auditEntries.length} of {auditQuery.data?.total ?? 0} newest audit entries.</p>{auditQuery.error && <p role="alert" className="admin-inline-error">{auditQuery.error.message}</p>}{auditEntries.map(entry => <article key={entry.id}><div><b>{entry.action}</b><span>{new Date(entry.created_at).toLocaleString()} · {entry.entity_type} {entry.entity_id}</span></div><small>Actor: {entry.actor_user_id ?? 'System'}</small><details><summary>Before / after / context</summary><pre>{JSON.stringify({ before_state: entry.before_state, after_state: entry.after_state, context: entry.context }, null, 2)}</pre></details></article>)}</section>}
        {section !== 'Workspace overview' && <div className="admin-section-notice"><Activity size={17} /><span><b>{section}</b><small>{section === 'Audit history' ? isAdmin ? 'Viewing entries from /v1/audit-logs/.' : 'Audit history requires a platform administrator role.' : 'This section is wired to the project and member APIs that are available in the backend.'}</small></span><button onClick={() => setSection('Workspace overview')} aria-label="Return to workspace overview"><X size={16} /></button></div>}
      </div>
    </div>
  </div>
}

function ToggleRow({ title, detail, checked, onChange }: { title: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="admin-toggle-row"><div><b>{title}</b><small>{detail}</small></div><button className={`admin-toggle ${checked ? 'is-on' : ''}`} role="switch" aria-checked={checked} aria-label={title} disabled onClick={() => onChange(!checked)}><i /></button></div>
}

function ResourceRow({ label, status, detail }: { label: string; status: string; detail: string }) {
  return <div className="admin-resource-row"><span>{label}</span><span><i />{status}</span><small>{detail}</small></div>
}

function Integration({ icon, title, detail, subdetail, onClick }: { icon: ReactNode; title: string; detail: string; subdetail: string; onClick: () => void }) {
  return <article className="admin-integration-card"><span className="admin-integration-icon">{icon}</span><div className="admin-integration-title"><b>{title}</b><small><i />Unavailable</small></div><p>{detail}<small>{subdetail}</small></p><button onClick={onClick}>View details <ArrowRight size={15} /></button></article>
}

function MoreMenu() {
  return <span className="admin-more-dots" aria-hidden="true"><i /><i /><i /></span>
}
