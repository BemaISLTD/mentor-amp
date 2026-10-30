import { Database, FileText, Link2, Play, Save, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { AppProvider } from './context/AppContext'
import { useApp } from './context/useApp'
import { AppShell } from './components/layout/AppShell'
import { screenDescription, screenTitle } from './components/layout/workspaceMeta'
import { Dashboard } from './pages/dashboard/dashboard'
import { ModelLibrary } from './pages/model-library/ModelLibrary'
import { InputLibrary } from './pages/input-library/InputLibrary'
import { ResultsExplorer } from './pages/results-explorer/ResultsExplorer'
import { ScenarioAnalysis } from './pages/scenario-analysis/ScenarioAnalysis'
import { FormulaLibrary } from './pages/formula-library/FormulaLibrary'
import { ProjectionSetsLibrary } from './pages/projection-sets-library/ProjectionSetsLibrary'
import { ReportsCompleted } from './pages/reports-completed/ReportsCompleted'
import { ReserveInvestigation } from './pages/reserve-investigation/ReserveInvestigation'
import { ModelWorkspace } from './pages/model-workspace/ModelWorkspace'
import { InputWorkflowScreen } from './pages/input-workflow-screens/InputWorkflowScreens'
import { ProjectionSetupProgress } from './pages/projection-setup-progress/ProjectionSetupProgress'
import { RunSetWorkflow } from './pages/run-set-workflow/RunSetWorkflow'
import { MentorWorkspace } from './pages/mentor-workspace/MentorWorkspace'
import { AdminSettings } from './pages/admin-settings/AdminSettings'
import { DataManager } from './pages/data-manager/DataManager'
import { ScreenErrorBoundary } from './components/ui/ScreenErrorBoundary'
import type { Model } from './types'
import { useEffect, useState } from 'react'
import { ApiProvider } from './api/ApiProvider'
import { AuthGate } from './api/AuthGate'
import { useWorkspace, WorkspaceGate, WorkspaceProvider } from './api/WorkspaceContext'
import { M3Workspace } from './pages/m3/M3Workspace'

function RoutedApp() {
  const { activeScreen, notify, setActiveScreen, updateProjectionInputs, projectionSetupActive, setProjectionSetupActive, activeExecutionRunSetId } = useApp()
  const { projectId } = useWorkspace()
  const [modelQuery, setModelQuery] = useState('')
  const [formulaQuery, setFormulaQuery] = useState('')
  const [formulaLineageActive, setFormulaLineageActive] = useState(false)
  const [formulaDetailActive, setFormulaDetailActive] = useState(false)
  const [resultsCompareActive, setResultsCompareActive] = useState(false)
  const [resultsExplorerKey, setResultsExplorerKey] = useState(0)
  const [investigationSelectorActive, setInvestigationSelectorActive] = useState(true)
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [startProjectionCreate, setStartProjectionCreate] = useState(false)
  const [dataManagerCategory, setDataManagerCategory] = useState<'liability_inforce' | 'assumption_table' | 'factor_table' | 'scenario'>('liability_inforce')
  const [inputWorkflowPage, setInputWorkflowPage] = useState('Input Library')
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      setActiveScreen(/^\/models\/[^/]+\/versions\/[^/]+\/formulas\/?$/.test(path) || path === '/formula-studio' ? 'Formula Studio'
        : /^\/projects\/[^/]+\/benchmarks\/?$/.test(path) || path === '/benchmarks' ? 'Benchmarks'
          : /^\/runs\/[^/]+\/reconciliation\/?$/.test(path) || path === '/reconciliation' ? 'Reconciliation'
            : 'Dashboard')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [setActiveScreen])
  const isModelWorkspace = activeScreen === 'Models' && selectedModel !== null
  const startProjectionSetup = () => {
    setProjectionSetupActive(true)
    setStartProjectionCreate(true)
    setActiveScreen('Projections')
  }
  const endProjectionSetup = () => {
    setProjectionSetupActive(false)
    setStartProjectionCreate(false)
    setActiveScreen('Projections')
  }
  const openModel = (model: Model) => {
    setSelectedModel(model)
    if (projectionSetupActive) updateProjectionInputs(current => ({
      ...current,
      model,
      draft: current.model?.name === model.name
        ? current.draft
        : { ...current.draft, formulaConfirmed: false, scenarioCompatible: false },
    }))
  }
  const openDataManager = (category: 'liability_inforce' | 'assumption_table' | 'factor_table' | 'scenario') => {
    setDataManagerCategory(category)
    setActiveScreen('Data Manager')
  }
  const openInputWorkflow = (page: string) => {
    if (page === 'Import Inforce') {
      openDataManager('liability_inforce')
      return
    }
    setProjectionSetupActive(true)
    setStartProjectionCreate(true)
    setInputWorkflowPage(page)
    setActiveScreen('Inputs')
  }
  const openScenarioLibrary = () => {
    setProjectionSetupActive(true)
    setStartProjectionCreate(true)
    setActiveScreen('Scenarios')
  }
  const openFormulaStudio = (modelId: string, versionId: string) => {
    window.history.pushState({}, '', `/models/${encodeURIComponent(modelId)}/versions/${encodeURIComponent(versionId)}/formulas`)
    setActiveScreen('Formula Studio')
  }
  const actions = (
    <button
      className="button button-secondary dashboard-search-button max-[760px]:min-w-0 max-[760px]:px-2.5 max-[760px]:py-2"
      onClick={() => notify('Search opened')}
    >
      Search
      <Search size={18} />
    </button>
  )
  const investigationActions = (
    <div className="investigation-header-actions flex flex-wrap items-center gap-2">
      <button className="investigation-header-button" onClick={() => notify('Investigation search opened')}><Search size={16} />Search</button>
      <button className="investigation-header-button" onClick={() => notify('Investigation link copied')}><Link2 size={16} />Share</button>
      <button className="investigation-header-button" onClick={() => notify('Trace view options opened')}><SlidersHorizontal size={16} />View</button>
      <button className="investigation-save-button" onClick={() => notify('Investigation saved')}><Save size={16} />Save investigation</button>
    </div>
  )

  return (
    <AppShell
      title={isModelWorkspace ? selectedModel.name : activeScreen === 'Runs' ? activeExecutionRunSetId ? 'Execution Center' : 'Run Set Library' : screenTitle(activeScreen)}
      description={isModelWorkspace ? 'Understand the model structure, dependencies, interfaces, and reusable logic.' : activeScreen === 'Runs' ? activeExecutionRunSetId ? 'Monitor submitted runs, progress, events, and execution provenance.' : 'Review Run Set submissions and monitor every individual run.' : screenDescription(activeScreen)}
      eyebrow={isModelWorkspace ? <button className="mw-breadcrumb" onClick={() => setSelectedModel(null)}>Models / Model workspace</button> : activeScreen === 'Dashboard' ? 'Home' : activeScreen}
      topbarVariant={isModelWorkspace ? 'model-workspace' : activeScreen === 'Mentor' ? 'mentor' : activeScreen === 'Admin / Settings' ? 'admin' : activeScreen === 'Models' || activeScreen === 'Formulas' ? 'library' : 'default'}
      searchPlaceholder={activeScreen === 'Formulas' ? 'Search formula groups, versions, owners, dependencies...' : undefined}
      className={`${isModelWorkspace ? 'model-workspace-page-shell' : activeScreen === 'Mentor' ? 'mentor-shell' : activeScreen === 'Admin / Settings' ? 'admin-shell' : activeScreen === 'Inputs' ? 'input-shell' : activeScreen === 'Results' ? `results-shell ${resultsCompareActive ? 'results-compare-shell' : ''}` : activeScreen === 'Scenarios' ? 'scenario-shell' : activeScreen === 'Formulas' ? `formula-shell ${formulaLineageActive ? 'formula-lineage-shell-active' : ''} ${formulaDetailActive ? 'formula-detail-shell-active' : ''}` : activeScreen === 'Runs' ? 'execution-shell' : activeScreen === 'Projections' ? 'projection-shell' : activeScreen === 'Reports' ? 'report-shell' : activeScreen === 'Investigate' ? `investigation-shell ${investigationSelectorActive ? 'investigation-selector-shell' : ''}` : ''} ${projectionSetupActive ? 'projection-flow-active' : ''}`}
      modelName={isModelWorkspace ? selectedModel.name : undefined}
      modelVersion={isModelWorkspace ? selectedModel.version : undefined}
      onNavigate={(screen) => {
        if (screen === 'Formula Studio') window.history.pushState({}, '', '/formula-studio')
        else if (screen === 'Benchmarks') window.history.pushState({}, '', projectId ? `/projects/${projectId}/benchmarks` : '/benchmarks')
        else if (screen === 'Reconciliation') window.history.pushState({}, '', '/reconciliation')
        else if (/^\/(formula-studio|benchmarks|reconciliation|models\/[^/]+\/versions\/[^/]+\/formulas|projects\/[^/]+\/benchmarks|runs\/[^/]+\/reconciliation)\/?$/.test(window.location.pathname)) window.history.pushState({}, '', '/workspace')
        if (screen !== activeScreen) {
          setFormulaLineageActive(false)
          setFormulaDetailActive(false)
          setResultsCompareActive(false)
        }
        if (screen === 'Results') {
          setResultsCompareActive(false)
          setResultsExplorerKey((key) => key + 1)
        }
        if (screen === 'Investigate') setInvestigationSelectorActive(true)
      }}
      searchValue={activeScreen === 'Formulas' ? formulaQuery : modelQuery}
      onSearchChange={activeScreen === 'Formulas' ? setFormulaQuery : setModelQuery}
      actions={isModelWorkspace ? <ModelWorkspaceActions onValidate={() => notify('Model validation started')} onCreate={startProjectionSetup} /> : activeScreen === 'Inputs' ? <InputTrustSignal /> : activeScreen === 'Investigate' && !investigationSelectorActive ? investigationActions : activeScreen === 'Dashboard' || activeScreen === 'Results' || activeScreen === 'Projections' || activeScreen === 'Reports' ? actions : undefined}
      workflowPanel={projectionSetupActive ? <ProjectionSetupProgress onNavigateToInput={openInputWorkflow} onNavigateToScenario={openScenarioLibrary} onReturnToSetup={startProjectionSetup} onClose={endProjectionSetup} /> : undefined}
    >
      <ScreenErrorBoundary key={activeScreen}>
      {activeScreen === 'Dashboard' ? (
        <Dashboard />
      ) : activeScreen === 'Models' ? (
        isModelWorkspace ? (
          <ModelWorkspace key={selectedModel?.id} model={selectedModel} onNotify={notify} onCreateProjection={startProjectionSetup} onBack={() => setActiveScreen('Models')} onOpenFormulaStudio={openFormulaStudio} />
        ) : (
          <ModelLibrary query={modelQuery} onNotify={notify} onOpenModel={openModel} />
        )
      ) : activeScreen === 'Inputs' ? (
        inputWorkflowPage === 'Input Library' ? (
          <InputLibrary
            onNotify={notify}
            onNavigate={(page: string) => setInputWorkflowPage(page)}
            onOpenInforceImport={() => openDataManager('liability_inforce')}
          />
        ) : (
          <InputWorkflowScreen
            page={inputWorkflowPage}
            onNavigate={(page: string) => setInputWorkflowPage(page)}
            onReturnToProjection={startProjectionSetup}
            onNotify={notify}
            onOpenDataManager={openDataManager}
          />
        )
      ) : activeScreen === 'Data Manager' ? (
        <DataManager initialCategory={dataManagerCategory} />
      ) : activeScreen === 'Scenarios' ? (
        <ScenarioAnalysis onNotify={notify} onOpenProjectionSetup={startProjectionSetup} onOpenDataManager={openDataManager} />
      ) : activeScreen === 'Formulas' ? (
        <FormulaLibrary query={formulaQuery} onNotify={notify} onLineageChange={setFormulaLineageActive} onDetailChange={setFormulaDetailActive} onOpenFormulaStudio={openFormulaStudio} />
      ) : activeScreen === 'Formula Studio' || activeScreen === 'Benchmarks' || activeScreen === 'Reconciliation' ? (
        <M3Workspace screen={activeScreen} />
      ) : activeScreen === 'Runs' ? (
        <RunSetWorkflow onNotify={notify} />
      ) : activeScreen === 'Projections' ? (
        <ProjectionSetsLibrary onNotify={notify} startCreate={startProjectionCreate} onCreateOpened={() => setStartProjectionCreate(false)} onSetupStarted={() => setProjectionSetupActive(true)} onSetupFinished={() => setProjectionSetupActive(false)} onNavigateToInput={openInputWorkflow} onNavigateToScenario={openScenarioLibrary} />
      ) : activeScreen === 'Results' ? (
        <ResultsExplorer key={resultsExplorerKey} onNotify={notify} onCompareChange={setResultsCompareActive} />
      ) : activeScreen === 'Reports' ? (
        <ReportsCompleted onNotify={notify} />
      ) : activeScreen === 'Investigate' ? (
        <ReserveInvestigation onNotify={notify} onViewChange={(view: string) => setInvestigationSelectorActive(view === 'selector')} />
      ) : activeScreen === 'Mentor' ? (
        <MentorWorkspace onOpenInvestigate={() => setActiveScreen('Investigate')} />
      ) : activeScreen === 'Admin / Settings' ? (
        <AdminSettings onNotify={notify} />
      ) : (
        <section className="panel">
          <h2 className="section-title">Workspace cleared</h2>
          <p className="muted">Page content has been removed.</p>
        </section>
      )}
      </ScreenErrorBoundary>
    </AppShell>
  )
}

function ModelWorkspaceActions({ onValidate, onCreate }: { onValidate: () => void; onCreate: () => void }) {
  return (
    <div className="model-workspace-header-actions">
      <button className="model-workspace-secondary-action" onClick={onValidate}><ShieldCheck size={19} />Validate model</button>
      <button className="model-workspace-primary-action" onClick={onCreate}><Play size={19} />Create Projection Set</button>
    </div>
  )
}

function InputTrustSignal() {
  return (
    <div className="input-trust-signal max-[760px]:hidden">
      <div className="input-trust-art" aria-hidden="true">
        <span><Database size={28} /></span>
        <i><FileText size={20} /></i>
      </div>
      <div>
        <b>Trusted inputs<br />for reliable projections</b>
        <small>Validated. Mapped. Model-ready.</small>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ApiProvider>
      <AuthGate>
        <WorkspaceProvider>
          <WorkspaceGate>
            <AppProvider>
              <RoutedApp />
            </AppProvider>
          </WorkspaceGate>
        </WorkspaceProvider>
      </AuthGate>
    </ApiProvider>
  )
}
