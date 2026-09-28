import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { Toast } from '../ui/Toast'

export function AppShell({ children, title, description, eyebrow, actions, topbarVariant = 'default' }: { children: ReactNode; title: string; description: string; eyebrow: string; actions?: ReactNode; topbarVariant?: 'default' | 'library' }) {
  return <div className="app-shell"><Sidebar /><main className="main-content"><Topbar variant={topbarVariant} /><div className="workspace-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="workspace-actions">{actions}</div>}</div>{children}</main><Toast /></div>
}
