import type { ReactNode } from 'react'
import { StatusBadge } from './StatusBadge'
import type { LineageStatus } from '../../types'

export function TreeItem({ icon, label, indent = false, active = false, status }: { icon: ReactNode; label: string; indent?: boolean; active?: boolean; status?: LineageStatus }) { return <div className={`tree-item ${indent ? 'tree-indent' : ''} ${active ? 'tree-active' : ''}`}><span>{icon}<b>{label}</b></span>{status && <StatusBadge status={status} />}</div> }
