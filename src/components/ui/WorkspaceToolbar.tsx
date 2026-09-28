import { ChevronDown, Filter, Plus, Search, SlidersHorizontal, Upload } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useApp } from '../../context/useApp'

export function WorkspaceToolbar({ searchPlaceholder, action, actionIcon = <Plus size={15} />, onAction }: { searchPlaceholder: string; action: string; actionIcon?: ReactNode; onAction?: () => void }) {
  const { notify } = useApp()
  const [query, setQuery] = useState('')
  const [tool, setTool] = useState<'filters' | 'view' | null>(null)
  const submitSearch = () => { if (query.trim()) notify(`Mock search applied: ${query.trim()}`) }
  return <div className="filter-bar panel"><div className="search-field"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') submitSearch() }} aria-label={searchPlaceholder} placeholder={searchPlaceholder} /><button className="toolbar-search-submit" aria-label="Apply search" onClick={submitSearch}>↵</button></div><button className={`filter-chip ${tool === 'filters' ? 'filter-chip-active' : ''}`} onClick={() => { setTool(tool === 'filters' ? null : 'filters'); notify('Mock filters ready') }}><Filter size={14} />Filters <ChevronDown size={14} /></button><button className={`filter-chip ${tool === 'view' ? 'filter-chip-active' : ''}`} onClick={() => { setTool(tool === 'view' ? null : 'view'); notify('Mock view options ready') }}><SlidersHorizontal size={14} />View <ChevronDown size={14} /></button>{tool && <span className="toolbar-state">{tool === 'filters' ? 'Status: all · Owner: all' : 'View: list · Sort: updated'}</span>}<button className="button button-primary" onClick={() => onAction ? onAction() : notify(`${action} flow opened`)}>{actionIcon}{action}</button></div>
}

export function ImportToolbar({ searchPlaceholder, action = 'Import input' }: { searchPlaceholder: string; action?: string }) {
  return <WorkspaceToolbar searchPlaceholder={searchPlaceholder} action={action} actionIcon={<Upload size={15} />} />
}
