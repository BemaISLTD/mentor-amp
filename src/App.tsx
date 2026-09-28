import { Plus, Search } from 'lucide-react'
import { AppProvider } from './context/AppContext'
import { useApp } from './context/useApp'
import { AppShell } from './components/layout/AppShell'
import { screenDescription, screenTitle } from './components/layout/workspaceMeta'
import { DashboardPage } from './pages/DashboardPage'
import { ModelsPage } from './pages/ModelsPage'
import { ScenarioWorkspacePage } from './pages/ScenarioScreens'
import { FormulaWorkspacePage } from './pages/FormulaScreens'
import { InputLibraryPage } from './pages/InputScreens'
import { RunSetsPage } from './pages/ExecutionScreens'
import { ProjectionLibraryPage } from './pages/ProjectionScreens'
import { ResultsExplorerPage } from './pages/ResultScreens'
import { ReportLibraryPage } from './pages/ReportScreens'
import { ComingSoonPage } from './pages/AnalysisPages'
import { InvestigationWorkspacePage } from './pages/InvestigationScreens'
import { MentorWorkspacePage } from './pages/MentorScreens'
import { SettingsPage } from './pages/SettingsPage'
import type { ScreenName } from './types'

function RoutedApp() {
  const { activeScreen, notify } = useApp()
  const actions = <><button className="button button-secondary" onClick={() => notify('Search opened')}><Search size={16} />Search</button>{activeScreen === 'Models' && <button className="button button-primary" onClick={() => notify('New model flow opened')}><Plus size={16} />New model</button>}</>
  return <AppShell eyebrow={activeScreen === 'Dashboard' ? 'Home' : activeScreen} title={screenTitle(activeScreen)} description={screenDescription(activeScreen)} actions={activeScreen === 'Models' ? undefined : actions} topbarVariant={activeScreen === 'Models' ? 'library' : 'default'}>{renderPage(activeScreen)}</AppShell>
}

function renderPage(activeScreen: ScreenName) {
  switch (activeScreen) {
    case 'Dashboard': return <DashboardPage />
    case 'Models': return <ModelsPage />
    case 'Inputs': return <InputLibraryPage />
    case 'Scenarios': return <ScenarioWorkspacePage />
    case 'Formulas': return <FormulaWorkspacePage />
    case 'Projections': return <ProjectionLibraryPage />
    case 'Runs': return <RunSetsPage />
    case 'Results': return <ResultsExplorerPage />
    case 'Reports': return <ReportLibraryPage />
    case 'Investigate': return <InvestigationWorkspacePage />
    case 'Mentor': return <MentorWorkspacePage />
    case 'Admin / Settings': return <SettingsPage />
    default: return <ComingSoonPage active={activeScreen} />
  }
}

export default function App() { return <AppProvider><RoutedApp /></AppProvider> }
