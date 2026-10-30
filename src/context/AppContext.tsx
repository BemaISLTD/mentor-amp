import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AppContext, type InvestigationIntent, type ProjectionInputs } from './context'
import type { RunSetRecord, ScreenName } from '../types'

function screenForPath(path: string): ScreenName {
  if (/^\/models\/[^/]+\/versions\/[^/]+\/formulas\/?$/.test(path)) return 'Formula Studio'
  if (path === '/formula-studio') return 'Formula Studio'
  if (/^\/projects\/[^/]+\/benchmarks\/?$/.test(path)) return 'Benchmarks'
  if (path === '/benchmarks') return 'Benchmarks'
  if (/^\/runs\/[^/]+\/reconciliation\/?$/.test(path)) return 'Reconciliation'
  if (path === '/reconciliation') return 'Reconciliation'
  return 'Dashboard'
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeScreen, setActiveScreen] = useState<ScreenName>(() => screenForPath(window.location.pathname))
  const [toast, setToast] = useState('')
  const [investigationIntent, setInvestigationIntent] = useState<InvestigationIntent>(null)
  const [projectionSetupActive, setProjectionSetupActive] = useState(false)
  const [runSets, setRunSets] = useState<RunSetRecord[]>([])
  const [activeExecutionRunSetId, setActiveExecutionRunSetId] = useState<string | null>(null)
  const [projectionInputs, setProjectionInputs] = useState<ProjectionInputs>({
    model: null,
    inforce: null,
    assumptionTableIds: [],
    factorTableIds: [],
    scenario: null,
    draft: {
      name: '',
      formulaConfirmed: false,
      inforceConfirmed: false,
      assumptionValidated: false,
      factorValidated: false,
      scenarioCompatible: false,
      startMonth: '2026-01',
      endMonth: '2045-12',
      traceScope: [],
    },
  })
  const notify = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }, [])
  const openInvestigation = useCallback((intent: NonNullable<InvestigationIntent>) => { setInvestigationIntent(intent); setActiveScreen(intent.kind === 'mentor' ? 'Mentor' : 'Investigate') }, [])
  const clearInvestigationIntent = useCallback(() => setInvestigationIntent(null), [])
  const updateProjectionInputs = useCallback((update: (current: ProjectionInputs) => ProjectionInputs) => setProjectionInputs(update), [])
  const addRunSet = useCallback((runSet: RunSetRecord) => setRunSets(current => [runSet, ...current]), [])
  const value = useMemo(() => ({ activeScreen, setActiveScreen, toast, notify, investigationIntent, openInvestigation, clearInvestigationIntent, projectionInputs, updateProjectionInputs, projectionSetupActive, setProjectionSetupActive, runSets, addRunSet, activeExecutionRunSetId, setActiveExecutionRunSetId }), [activeScreen, toast, notify, investigationIntent, openInvestigation, clearInvestigationIntent, projectionInputs, updateProjectionInputs, projectionSetupActive, setProjectionSetupActive, runSets, addRunSet, activeExecutionRunSetId])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
