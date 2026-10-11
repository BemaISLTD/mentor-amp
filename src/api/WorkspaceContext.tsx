import { createContext, useCallback, useContext, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Activity, AlertCircle, LoaderCircle, Plus } from 'lucide-react'
import { useApi } from './ApiProvider'
import { useApiQuery } from './useApiQuery'
import './workspace-gate.css'

export type WorkspaceProject = { id: string; name: string; description: string | null; created_at: string; updated_at: string }
type ProjectsResponse = { projects: WorkspaceProject[]; total: number }
type WorkspaceValue = {
  projects: WorkspaceProject[]
  project: WorkspaceProject | null
  projectId: string | null
  loading: boolean
  error: Error | null
  selectProject: (id: string) => void
  createProject: (name: string, description: string) => Promise<WorkspaceProject>
  refetchProjects: () => void
}
const ACTIVE_PROJECT_KEY = 'mentor-amp-active-project'
const WorkspaceContext = createContext<WorkspaceValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { request } = useApi()
  const { data, error, loading, refetch } = useApiQuery<ProjectsResponse>('/v1/projects/')
  const projects = data?.projects ?? []
  const [selectedId, setSelectedId] = useState<string | null>(() => window.sessionStorage.getItem(ACTIVE_PROJECT_KEY))
  const project = projects.find(item => item.id === selectedId) ?? projects[0] ?? null
  const selectProject = useCallback((id: string) => {
    window.sessionStorage.setItem(ACTIVE_PROJECT_KEY, id)
    setSelectedId(id)
  }, [])
  const createProject = useCallback(async (name: string, description: string) => {
    const created = await request<WorkspaceProject>('/v1/projects/', { method: 'POST', body: JSON.stringify({ name, description }) })
    selectProject(created.id)
    refetch()
    return created
  }, [request, selectProject, refetch])
  const value = useMemo(() => ({ projects, project, projectId: project?.id ?? null, loading, error, selectProject, createProject, refetchProjects: refetch }), [projects, project, loading, error, selectProject, createProject, refetch])
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider.')
  return value
}

export function WorkspaceGate({ children }: { children: ReactNode }) {
  const { project, loading, error, createProject, refetchProjects } = useWorkspace()
  if (loading && !project) return <main className="workspace-gate"><div className="workspace-gate-card"><LoaderCircle className="auth-spin" size={22} />Loading your projects…</div></main>
  if (error && !project) return <main className="workspace-gate"><div className="workspace-gate-card"><AlertCircle size={20} /><div><b>Could not load projects</b><p>{error.message}</p><button onClick={refetchProjects}>Try again</button></div></div></main>
  if (!project) return <CreateFirstProject onCreate={createProject} />
  return <>{children}</>
}

function CreateFirstProject({ onCreate }: { onCreate: (name: string, description: string) => Promise<WorkspaceProject> }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try { await onCreate(name.trim(), description.trim()) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not create project.') }
    finally { setBusy(false) }
  }
  return <main className="workspace-gate"><section className="workspace-gate-card workspace-first-project"><span className="workspace-gate-mark"><Activity size={22} /></span><small>NEW WORKSPACE</small><h1>Create your first project</h1><p>Projects keep models, imported actuarial inputs, scenarios, projections, and reports together.</p>{error && <div className="workspace-gate-error"><AlertCircle size={16} />{error}</div>}<form onSubmit={submit}><label>Project name<input autoFocus maxLength={255} required value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Q4 2026 Reserve Review" /></label><label>Description (optional)<textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Purpose, valuation basis, or business scope" /></label><button type="submit" disabled={busy}><Plus size={17} />{busy ? 'Creating…' : 'Create project'}</button></form></section></main>
}
