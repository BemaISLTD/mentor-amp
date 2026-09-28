import { createContext } from 'react'
import type { ScreenName } from '../types'

export type InvestigationIntent = { kind: 'trace' | 'compare' | 'mentor' | 'scratchpad'; runId?: string; metric?: string; question?: string } | null
export type AppContextValue = {
  activeScreen: ScreenName
  setActiveScreen: (screen: ScreenName) => void
  toast: string
  notify: (message: string) => void
  investigationIntent: InvestigationIntent
  openInvestigation: (intent: NonNullable<InvestigationIntent>) => void
  clearInvestigationIntent: () => void
}
export const AppContext = createContext<AppContextValue | undefined>(undefined)
