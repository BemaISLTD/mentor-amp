import { Activity, Box, Database, FileBarChart, LayoutDashboard, LineChart, Play, Search, Settings, Sparkles, Table2, Workflow } from 'lucide-react'
import type { Investigation, Model, NavItem, RunRecord } from '../types'

export const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Models', icon: Box, group: 'Authoring' },
  { label: 'Inputs', icon: Database, group: 'Authoring' },
  { label: 'Scenarios', icon: Activity, group: 'Authoring' },
  { label: 'Formulas', icon: Workflow, group: 'Authoring' },
  { label: 'Projections', icon: LineChart, group: 'Execution' },
  { label: 'Runs', icon: Play, group: 'Execution' },
  { label: 'Results', icon: Table2, group: 'Analysis' },
  { label: 'Reports', icon: FileBarChart, group: 'Analysis' },
  { label: 'Investigate', icon: Search, group: 'Analysis' },
  { label: 'Mentor', icon: Sparkles, group: 'Analysis' },
  { label: 'Admin / Settings', icon: Settings, group: 'System' },
]

export const models: Model[] = [
  { name: 'MYGA Reserve Model', version: 'v3.2', basis: 'GAAP', product: 'MYGA', status: 'Validated', updated: 'Today, 9:42 AM', owner: 'A. Johnson', runs: 18 },
  { name: 'FIA VM-21 Cohort', version: 'v2.8', basis: 'VM-21', product: 'FIA', status: 'Validated', updated: 'Yesterday, 4:18 PM', owner: 'M. Chen', runs: 12 },
  { name: 'RILA Stress Model', version: 'v1.6', basis: 'GAAP', product: 'RILA', status: 'Needs review', updated: 'Yesterday, 3:55 PM', owner: 'A. Johnson', runs: 8 },
  { name: 'MYGA Pricing Sandbox', version: 'v0.9', basis: 'Pricing', product: 'MYGA', status: 'Draft', updated: 'Jan 12, 2025', owner: 'S. Young', runs: 3 },
]

export const runs: RunRecord[] = [
  { name: 'MYGA Base', scenario: 'Base scenario', date: '2026-12-31', modified: 'Today, 9:42 AM' },
  { name: 'FIA VM-21', scenario: 'VM-21 Deterministic', date: '2026-12-31', modified: 'Yesterday, 4:18 PM' },
  { name: 'RILA Stress', scenario: 'Low Interest Rate', date: '2026-12-31', modified: 'Yesterday, 3:55 PM' },
  { name: 'MYGA Base', scenario: 'High interest', date: '2026-12-31', modified: 'Jan 12, 2025' },
]

export const investigations: Investigation[] = [
  { title: 'Why did net reserve change?', model: 'MYGA Base', scenario: 'Base scenario', period: '2026-12-31 vs 2025-12-31', time: '2h ago' },
  { title: 'What drives DAC unlock in year 7?', model: 'FIA VM-21', scenario: 'VM-21 Deterministic', period: '2026-12-31', time: '1d ago' },
  { title: 'Impact of rate shock on surrender?', model: 'MYGA Base', scenario: 'Low Interest Rate', period: '2026-12-31', time: '3d ago' },
]
