import { Sparkles, X } from 'lucide-react'
import { useApp } from '../../context/useApp'

export function Toast() {
  const { toast, notify } = useApp()
  if (!toast) return null
  return <div className="toast"><Sparkles size={16} />{toast}<button aria-label="Dismiss" onClick={() => notify('')}><X size={14} /></button></div>
}
