import { createContext } from 'react'
import type { ScreenName } from '../types'
import type { Model, RunSetRecord } from '../types'

export type InvestigationIntent = { kind: 'trace' | 'compare' | 'mentor' | 'scratchpad'; runId?: string; metric?: string; question?: string } | null
export type ProjectionInputs = {
  model: Model | null
  inforce: { id: string; name: string; fingerprint: string; status: string; mappedColumns: number; requiredColumns: number; projectId?: string } | null
  assumptionTableIds: string[]
  factorTableIds: string[]
  scenario: { id: string; name: string; status: string; compatible: boolean } | null
  draft: {
    name: string
    formulaConfirmed: boolean
    inforceConfirmed: boolean
    assumptionValidated: boolean
    factorValidated: boolean
    scenarioCompatible: boolean
    startMonth: string
    endMonth: string
    traceScope: string[]
  }
}
export type AppContextValue = {
  activeScreen: ScreenName
  setActiveScreen: (screen: ScreenName) => void
  toast: string
  notify: (message: string) => void
  investigationIntent: InvestigationIntent
  openInvestigation: (intent: NonNullable<InvestigationIntent>) => void
  clearInvestigationIntent: () => void
  projectionInputs: ProjectionInputs
  updateProjectionInputs: (update: (current: ProjectionInputs) => ProjectionInputs) => void
  projectionSetupActive: boolean
  setProjectionSetupActive: (active: boolean) => void
  runSets: RunSetRecord[]
  addRunSet: (runSet: RunSetRecord) => void
  activeExecutionRunSetId: string | null
  setActiveExecutionRunSetId: (id: string | null) => void
}
export const AppContext = createContext<AppContextValue | undefined>(undefined)
