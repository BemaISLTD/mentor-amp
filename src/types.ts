import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type ScreenName = 'Dashboard' | 'Models' | 'Inputs' | 'Scenarios' | 'Formulas' | 'Projections' | 'Runs' | 'Results' | 'Reports' | 'Investigate' | 'Mentor' | 'Admin / Settings'

export type NavItem = { label: ScreenName; icon: LucideIcon; group?: string }
export type ModelStatus = 'Validated' | 'Needs review' | 'Draft'
export type LineageStatus = 'Shared' | 'Inherited' | 'Overridden' | 'Local'
export type ExecutionStatus = 'Completed' | 'Running' | 'Paused' | 'Cancelled' | 'Stale' | 'Validated' | 'Needs review'

export type Model = { name: string; version: string; basis: string; product: string; status: ModelStatus; updated: string; owner: string; runs: number }
export type RunRecord = { name: string; scenario: string; date: string; modified: string }
export type Investigation = { title: string; model: string; scenario: string; period: string; time: string }
export type ActionButtonProps = { onAction?: () => void; actionIcon?: ReactNode }
