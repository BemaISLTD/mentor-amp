import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { Toast } from '../ui/Toast'

export function AppShell({ children, title, description, eyebrow, actions, workflowPanel, topbarVariant = 'default', searchValue, onSearchChange, searchPlaceholder, modelName, modelVersion, className = '', onNavigate }: { children: ReactNode; title: string; description: string; eyebrow: ReactNode; actions?: ReactNode; workflowPanel?: ReactNode; topbarVariant?: 'default' | 'library' | 'model-workspace' | 'mentor' | 'admin'; searchValue?: string; onSearchChange?: (value: string) => void; searchPlaceholder?: string; modelName?: string; modelVersion?: string; className?: string; onNavigate?: (screen: string) => void }) {
  return <div className={`app-shell ${className}`}>
    <Sidebar onNavigate={onNavigate} />
    <main className={`main-content ${topbarVariant === 'library' ? 'model-library-shell' : ''} ${topbarVariant === 'model-workspace' ? 'model-workspace-shell' : ''} max-[760px]:ml-0 max-[760px]:px-3.5 max-[760px]:pt-3 max-[760px]:pb-7 max-[420px]:px-2.5`}>
      <Topbar
        variant={topbarVariant}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        modelName={modelName}
        modelVersion={modelVersion}
      />
      <div className="workspace-head max-[760px]:items-start max-[760px]:py-5 max-[760px]:pb-4">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="max-[760px]:text-[26px]">{title}</h1>
          <p className="max-[760px]:max-w-[38ch] max-[760px]:leading-[1.45]">{description}</p>
        </div>
        {actions && <div className="workspace-actions">{actions}</div>}
      </div>
      {children}
    </main>
    {workflowPanel}
    <Toast />
  </div>
}
