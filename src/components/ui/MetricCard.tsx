import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconBubble } from './IconBubble'

export function MetricCard({ icon, label, value, sub, secondary, light = false, onClick }: { icon: ReactNode; label: string; value: string; sub: string; secondary?: string; light?: boolean; onClick?: () => void }) {
  const content = <><div className="metric-head"><IconBubble lime={light}>{icon}</IconBubble><ArrowRight size={19} className="metric-arrow" /></div><span className="metric-label">{label}</span><strong>{value}</strong><small>{sub}</small>{secondary && <small>{secondary}</small>}</>
  return onClick ? <button className={`metric-card metric-card-button ${light ? 'metric-card-light' : ''}`} onClick={onClick}>{content}</button> : <div className={`metric-card ${light ? 'metric-card-light' : ''}`}>{content}</div>
}
