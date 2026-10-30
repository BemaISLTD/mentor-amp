import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type ScreenName = 'Dashboard' | 'Models' | 'Inputs' | 'Data Manager' | 'Scenarios' | 'Formulas' | 'Formula Studio' | 'Benchmarks' | 'Reconciliation' | 'Projections' | 'Runs' | 'Results' | 'Reports' | 'Investigate' | 'Mentor' | 'Admin / Settings'

export type NavItem = { label: ScreenName; icon: LucideIcon; group?: string }
export type ModelStatus = 'validated' | 'needs_review' | 'draft' | 'approved' | 'rejected' | 'superseded' | 'legacy_unvalidated' | 'published'
export type LineageStatus = 'Shared' | 'Inherited' | 'Overridden' | 'Local'
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'partial_success' | 'failed' | 'cancelled'

export type Model = { id?: string; name: string; version: string; basis: string; product: string; status: ModelStatus; updated: string; owner: string; runs: number }
export type RunRecord = { name: string; scenario: string; date: string; modified: string }
export type RunSetRun = {
  id: string
  projectionSetId: string
  projectionSetName: string
  scenarioId: string
  scenarioName: string
  status: 'pending' | 'running' | 'success' | 'partial_success' | 'failed' | 'cancelled'
  progress: { total: number; done: number; percent: number; unit: 'policies'; eta_seconds?: number }
  events: { id: number; timestamp: string; level: 'info' | 'warning' | 'error'; step: string; message: string }[]
}
export type RunSetRecord = {
  id: string
  projectId: string
  name: string
  notes: string | null
  submittedAt: string
  status: 'queued' | 'running' | 'success' | 'partial_success' | 'failed' | 'cancelled'
  projectionSetIds: string[]
  scenarioIds: string[]
  runs: RunSetRun[]
}
export type Investigation = { title: string; model: string; scenario: string; period: string; time: string }
export type ActionButtonProps = { onAction?: () => void; actionIcon?: ReactNode }
