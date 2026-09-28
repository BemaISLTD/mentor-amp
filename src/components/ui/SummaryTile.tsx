import type { ReactNode } from 'react'
import { IconBubble } from './IconBubble'

export function SummaryTile({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone?: string }) { return <div className={`summary-tile ${tone ? `summary-${tone}` : ''}`}><IconBubble lime={tone !== 'dark'}>{icon}</IconBubble><span>{label}</span><strong>{value}</strong></div> }
