import { ArrowRight, Check, Circle, FileInput, Layers3, Table2, Workflow, X } from 'lucide-react'
import { models } from '../../data/fixtures'
import { useApp } from '../../context/useApp'
import './projection-setup-progress.css'

type Props = {
  onNavigateToInput: (page: string) => void
  onNavigateToScenario: () => void
  onReturnToSetup: () => void
  onClose: () => void
}

const validatedAssumptionIds = new Set(['asm-myga-lapse-v42', 'asm-expense-v21'])
const validatedFactorIds = new Set(['factor-discount-v50', 'factor-expense-v20'])
const displayStatus = (status?: string) => ({ validated: 'Validated', needs_review: 'Needs review', draft: 'Draft', approved: 'Approved', rejected: 'Rejected', superseded: 'Superseded', legacy_unvalidated: 'Legacy unvalidated', published: 'Published' }[status ?? ''] ?? status ?? 'Unknown')

export function ProjectionSetupProgress({ onNavigateToInput, onNavigateToScenario, onReturnToSetup, onClose }: Props) {
  const { projectionInputs, updateProjectionInputs, setActiveScreen } = useApp()
  const { model, inforce, assumptionTableIds, factorTableIds, scenario, draft } = projectionInputs
  const selectedAssumption = assumptionTableIds.find(id => validatedAssumptionIds.has(id))
  const selectedFactor = factorTableIds.find(id => validatedFactorIds.has(id))
  const horizonValid = Boolean(draft.startMonth && draft.endMonth && draft.startMonth <= draft.endMonth)
  const checks = [
    { label: 'Select a validated model', value: model?.status === 'validated' },
    { label: 'Confirm runnable formulas', value: model?.status === 'validated' && draft.formulaConfirmed },
    { label: 'Map and validate inforce', value: Boolean(inforce && inforce.status === 'validated' && inforce.mappedColumns >= inforce.requiredColumns && draft.inforceConfirmed) },
    { label: 'Pin an assumption table', value: Boolean(selectedAssumption && draft.assumptionValidated) },
    { label: 'Pin a factor table', value: Boolean(selectedFactor && draft.factorValidated) },
    { label: 'Attach a compatible scenario', value: Boolean(scenario?.status === 'validated' && scenario.compatible && draft.scenarioCompatible) },
    { label: 'Set a monthly horizon', value: horizonValid },
  ]
  const completeCount = checks.filter(check => check.value).length

  const updateDraft = (patch: Partial<typeof draft>) => {
    updateProjectionInputs(current => ({ ...current, draft: { ...current.draft, ...patch } }))
  }

  return <aside className="projection-progress" aria-label="Projection set setup progress">
    <header className="projection-progress-header">
      <div><span>NEW PROJECTION SET</span><h2>Setup progress</h2></div>
      <button aria-label="End projection setup" onClick={onClose}><X size={17} /></button>
    </header>
    <div className="projection-progress-count"><strong>{completeCount}/{checks.length}</strong><span>requirements complete</span></div>
    <div className="projection-progress-track"><span style={{ width: `${completeCount / checks.length * 100}%` }} /></div>
    <label className="projection-progress-model">Model
      <select aria-label="Projection model" value={model?.name ?? ''} onChange={event => {
        const selected = models.find(candidate => candidate.name === event.target.value) ?? null
        updateProjectionInputs(current => ({
          ...current,
          model: selected,
          draft: { ...current.draft, formulaConfirmed: false, scenarioCompatible: false },
        }))
      }}>
        <option value="">Select a model</option>
        {models.map(candidate => <option key={candidate.name} value={candidate.name}>{candidate.name} · {candidate.version} · {displayStatus(candidate.status)}</option>)}
      </select>
    </label>
    <div className="projection-progress-items">
      <ProgressItem done={model?.status === 'validated'} title="Model" detail={model ? `${model.name} · ${model.version}` : 'Choose a model version'} onClick={() => setActiveScreen('Models')} />
      <ProgressItem done={Boolean(inforce && inforce.status === 'validated' && inforce.mappedColumns >= inforce.requiredColumns)} title="Inforce file" detail={inforce?.name ?? 'Import and map a file'} onClick={() => onNavigateToInput('Import Inforce')} />
      <ProgressItem done={Boolean(selectedAssumption)} title="Assumption tables" detail={selectedAssumption ?? 'Pin a validated table'} onClick={() => onNavigateToInput('Assumption Tables')} />
      <ProgressItem done={Boolean(selectedFactor)} title="Factor tables" detail={selectedFactor ?? 'Pin a validated table'} onClick={() => onNavigateToInput('Factor Tables')} />
      <ProgressItem done={Boolean(scenario?.status === 'validated' && scenario.compatible)} title="Scenario" detail={scenario?.name ?? 'Choose a compatible scenario'} onClick={onNavigateToScenario} />
      <ProgressItem done={model?.status === 'validated'} title="Published output" detail={model?.status === 'validated' ? 'Available from selected model' : 'Select a validated model'} onClick={() => setActiveScreen('Models')} />
      <ProgressItem done={horizonValid} title="Monthly horizon" detail={`${draft.startMonth} – ${draft.endMonth}`} onClick={() => setActiveScreen('Projections')} />
    </div>
    <div className="projection-progress-checks">
      <ProgressCheck checked={draft.formulaConfirmed} label="Runnable formulas confirmed" onChange={checked => updateDraft({ formulaConfirmed: checked })} />
      <ProgressCheck checked={draft.inforceConfirmed} label="Inforce fingerprint and mapping confirmed" onChange={checked => updateDraft({ inforceConfirmed: checked })} />
      <ProgressCheck checked={draft.assumptionValidated} label="Assumption table confirmed" onChange={checked => updateDraft({ assumptionValidated: checked })} />
      <ProgressCheck checked={draft.factorValidated} label="Factor table confirmed" onChange={checked => updateDraft({ factorValidated: checked })} />
      <ProgressCheck checked={draft.scenarioCompatible} label="Scenario compatibility confirmed" onChange={checked => updateDraft({ scenarioCompatible: checked })} />
    </div>
    <button className="projection-progress-return" onClick={onReturnToSetup}>Return to projection setup <ArrowRight size={15} /></button>
    <span className="projection-progress-note"><FileInput size={14} />Selections stay in memory while you browse.</span>
  </aside>
}

function ProgressItem({ done, title, detail, onClick }: { done: boolean; title: string; detail: string; onClick: () => void }) {
  const Icon = title === 'Inforce file' ? FileInput : title === 'Assumption tables' ? Table2 : title === 'Factor tables' ? Layers3 : Workflow
  return <button className={`projection-progress-item ${done ? 'is-done' : ''}`} onClick={onClick}>
    <span className="projection-progress-item-icon">{done ? <Check size={14} /> : <Icon size={14} />}</span>
    <span><b>{title}</b><small>{detail}</small></span>
    <ArrowRight size={13} />
  </button>
}

function ProgressCheck({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <label><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span>{checked ? <Check size={12} /> : <Circle size={12} />}</span>{label}</label>
}
