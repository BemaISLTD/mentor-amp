import { useEffect, useState } from 'react'
import { ArrowRight, FileCheck2, GitBranch, Workflow } from 'lucide-react'
import { useApi } from '../../api/ApiProvider'
import { useApp } from '../../context/useApp'
import { useWorkspace } from '../../api/WorkspaceContext'
import type { ScreenName } from '../../types'
import { BenchmarkManager } from './BenchmarkManager'
import { FormulaStudio } from './FormulaStudio'
import { Reconciliation } from './Reconciliation'
import './m3-workspace.css'

type Props = { screen: ScreenName }
type M3Mode = 'formula' | 'benchmark' | 'reconciliation'

function modeFor(screen: ScreenName): M3Mode {
  return screen === 'Benchmarks' ? 'benchmark' : screen === 'Reconciliation' ? 'reconciliation' : 'formula'
}

function routeFor(path: string): { mode: M3Mode; modelId?: string; versionId?: string; projectId?: string; runId?: string } {
  const formula = path.match(/^\/models\/([^/]+)\/versions\/([^/]+)\/formulas\/?$/)
  if (formula) return { mode: 'formula', modelId: decodeURIComponent(formula[1]), versionId: decodeURIComponent(formula[2]) }
  const benchmark = path.match(/^\/projects\/([^/]+)\/benchmarks\/?$/)
  if (benchmark) return { mode: 'benchmark', projectId: decodeURIComponent(benchmark[1]) }
  const reconciliation = path.match(/^\/runs\/([^/]+)\/reconciliation\/?$/)
  if (reconciliation) return { mode: 'reconciliation', runId: decodeURIComponent(reconciliation[1]) }
  if (path === '/reconciliation') return { mode: 'reconciliation' }
  if (path === '/benchmarks') return { mode: 'benchmark' }
  return { mode: 'formula' }
}

export function M3Workspace({ screen }: Props) {
  const { setActiveScreen } = useApp()
  const { projectId, projects, selectProject } = useWorkspace()
  const { user } = useApi()
  const [path, setPath] = useState(window.location.pathname)
  const route = routeFor(path)
  const mode = modeFor(screen)

  useEffect(() => {
    if (route.projectId && route.projectId !== projectId && projects.some(project => project.id === route.projectId)) {
      selectProject(route.projectId)
    }
  }, [route.projectId, projectId, projects, selectProject])

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (nextPath: string, nextMode?: M3Mode) => {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
    const screenName: ScreenName = nextMode === 'benchmark' ? 'Benchmarks' : nextMode === 'reconciliation' ? 'Reconciliation' : 'Formula Studio'
    setActiveScreen(screenName)
  }
  const modePath = (next: M3Mode) => {
    if (next === 'formula') return '/formula-studio'
    if (next === 'benchmark') return projectId ? `/projects/${projectId}/benchmarks` : '/benchmarks'
    return '/reconciliation'
  }
  const switchMode = (next: M3Mode) => navigate(modePath(next), next)

  return <div className="m3-shell">
    <nav className="m3-workflow-tabs" aria-label="M3 governance workflows">
      <button type="button" aria-current={mode === 'formula' ? 'page' : undefined} className={mode === 'formula' ? 'is-active' : ''} onClick={() => switchMode('formula')}><Workflow size={16} />Formula Studio</button>
      <button type="button" aria-current={mode === 'benchmark' ? 'page' : undefined} className={mode === 'benchmark' ? 'is-active' : ''} onClick={() => switchMode('benchmark')}><FileCheck2 size={16} />Benchmarks</button>
      <button type="button" aria-current={mode === 'reconciliation' ? 'page' : undefined} className={mode === 'reconciliation' ? 'is-active' : ''} onClick={() => switchMode('reconciliation')}><GitBranch size={16} />Reconciliation</button>
      <span className="m3-workflow-tab-spacer" />
      {mode === 'formula' && route.versionId && <button className="m3-route-link" type="button" onClick={() => switchMode('benchmark')}>Expected results<ArrowRight size={14} /></button>}
    </nav>
    {mode === 'formula' && <FormulaStudio modelId={route.mode === 'formula' ? route.modelId : undefined} versionId={route.mode === 'formula' ? route.versionId : undefined} navigate={pathValue => navigate(pathValue, 'formula')} />}
    {mode === 'benchmark' && <BenchmarkManager routeProjectId={route.mode === 'benchmark' ? route.projectId : undefined} />}
    {mode === 'reconciliation' && <Reconciliation initialRunId={route.mode === 'reconciliation' ? route.runId : undefined} navigate={pathValue => navigate(pathValue, 'reconciliation')} user={user} />}
  </div>
}
