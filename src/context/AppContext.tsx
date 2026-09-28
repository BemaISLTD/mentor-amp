import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AppContext, type InvestigationIntent } from './context'
import type { ScreenName } from '../types'

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeScreen, setActiveScreen] = useState<ScreenName>('Dashboard')
  const [toast, setToast] = useState('')
  const [investigationIntent, setInvestigationIntent] = useState<InvestigationIntent>(null)
  const notify = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }, [])
  const openInvestigation = useCallback((intent: NonNullable<InvestigationIntent>) => { setInvestigationIntent(intent); setActiveScreen(intent.kind === 'mentor' ? 'Mentor' : 'Investigate') }, [])
  const clearInvestigationIntent = useCallback(() => setInvestigationIntent(null), [])
  const value = useMemo(() => ({ activeScreen, setActiveScreen, toast, notify, investigationIntent, openInvestigation, clearInvestigationIntent }), [activeScreen, toast, notify, investigationIntent, openInvestigation, clearInvestigationIntent])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
