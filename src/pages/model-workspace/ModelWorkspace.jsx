import { useState } from 'react'
import { Archive, ArrowLeft, LockKeyhole, Plus, RefreshCw, Save, ShieldCheck, Workflow, X } from 'lucide-react'
import { useApi } from '../../api/ApiProvider'
import { useApiQuery } from '../../api/useApiQuery'
import { canImportData } from '../../api/permissions'
import { IllustrativeBadge } from '../../components/ui/IllustrativeBadge'
import './model-workspace.css'

const statusLabel = status => (status ?? 'unknown').replaceAll('_', ' ')
const reviewStatus = version => version?.published_at || version?.is_current ? 'published' : version?.status
const hasReviewPermission = roles => roles.some(role => ['admin', 'actuary', 'reviewer'].includes(role.toLowerCase()))

export function ModelWorkspace({ model, onNotify, onCreateProjection, onBack, onOpenFormulaStudio }) {
  const { request, user } = useApi()
  const canEdit = canImportData(user?.roles ?? [])
  const canReview = hasReviewPermission(user?.roles ?? [])
  const modelId = model?.id
  const detailQuery = useApiQuery(modelId ? `/v1/models/${encodeURIComponent(modelId)}` : null)
  const versionsQuery = useApiQuery(modelId ? `/v1/models/${encodeURIComponent(modelId)}/versions` : null)
  const detail = detailQuery.data
  const versions = versionsQuery.data?.versions ?? detail?.versions ?? []
  const [selectedVersionId, setSelectedVersionId] = useState('')
  const selectedVersion = versions.find(version => version.id === selectedVersionId)
    ?? versions.find(version => version.is_current)
    ?? detail?.current_version
    ?? null
  const versionId = selectedVersion?.id
  const structureQuery = useApiQuery(versionId ? `/v1/model-versions/${encodeURIComponent(versionId)}/structure` : null)
  const variablesQuery = useApiQuery(versionId ? `/v1/model-versions/${encodeURIComponent(versionId)}/variables` : null)
  const [versionLabel, setVersionLabel] = useState('')
  const [changeSummary, setChangeSummary] = useState('')
  const [basis, setBasis] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesByVersion, setNotesByVersion] = useState({})
  const [saveBusy, setSaveBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [validationResult, setValidationResult] = useState(null)
  const notes = selectedVersion
    ? notesByVersion[selectedVersion.id] ?? selectedVersion.notes ?? ''
    : ''

  const createDraftVersion = async () => {
    if (!canEdit || !modelId || createBusy) return
    setCreateBusy(true)
    setCreateError('')
    try {
      const created = await request(`/v1/models/${encodeURIComponent(modelId)}/versions`, {
        method: 'POST',
        body: JSON.stringify({
          ...(versionLabel.trim() ? { version_label: versionLabel.trim() } : {}),
          ...(selectedVersion?.id ? { parent_version_id: selectedVersion.id } : {}),
          ...((selectedVersion?.basis ?? basis.trim()) ? { basis: selectedVersion?.basis ?? basis.trim() } : {}),
          change_summary: changeSummary.trim() || null,
        }),
      })
      setVersionLabel('')
      setChangeSummary('')
      setSelectedVersionId(created.id)
      versionsQuery.refetch()
      detailQuery.refetch()
      onNotify(`Draft ${created.version_label} created.`)
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not create a model draft.')
    } finally {
      setCreateBusy(false)
    }
  }

  const saveNotes = async () => {
    if (!canEdit || !selectedVersion || selectedVersion.status !== 'draft' || saveBusy) return
    setSaveBusy(true)
    setActionError('')
    try {
      await request(`/v1/model-versions/${encodeURIComponent(selectedVersion.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      })
      setNotesByVersion(current => ({ ...current, [selectedVersion.id]: notes }))
      versionsQuery.refetch()
      detailQuery.refetch()
      setEditingNotes(false)
      onNotify('Draft version notes saved.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not save the draft notes.')
    } finally {
      setSaveBusy(false)
    }
  }

  const archiveDraft = async () => {
    if (!canEdit || !selectedVersion || selectedVersion.status !== 'draft' || saveBusy) return
    if (!window.confirm(`Archive draft ${selectedVersion.version_label}? This draft will disappear from the version list.`)) return
    setSaveBusy(true)
    setActionError('')
    try {
      await request(`/v1/model-versions/${encodeURIComponent(selectedVersion.id)}`, { method: 'DELETE' })
      setSelectedVersionId('')
      setValidationResult(null)
      versionsQuery.refetch()
      detailQuery.refetch()
      onNotify(`Draft ${selectedVersion.version_label} archived.`)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not archive the draft.')
    } finally {
      setSaveBusy(false)
    }
  }

  const runVersionAction = async (action, body = undefined) => {
    if (!selectedVersion || saveBusy) return
    setSaveBusy(true)
    setActionError('')
    try {
      const result = await request(`/v1/model-versions/${encodeURIComponent(selectedVersion.id)}/${action}`, {
        method: 'POST',
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
      if (action === 'validate') setValidationResult(result)
      versionsQuery.refetch()
      detailQuery.refetch()
      structureQuery.refetch()
      variablesQuery.refetch()
      onNotify(action === 'validate'
        ? `Model validation ${result.status ?? 'completed'}.`
        : action === 'approve' ? 'Model version approved.'
          : action === 'publish' ? 'Model version published and locked.'
            : 'Model version rejected.')
      if (action === 'reject') {
        setRejectOpen(false)
        setRejectReason('')
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Could not ${action} this model version.`)
    } finally {
      setSaveBusy(false)
    }
  }

  const published = Boolean(selectedVersion?.published_at || selectedVersion?.is_current)
  const selfApprovalForbidden = Boolean(user && (
    selectedVersion?.created_by === user.id
    || selectedVersion?.last_material_modified_by === user.id
  ))
  const approvalAllowed = canReview && !published && !selfApprovalForbidden && ['validated', 'needs_review'].includes(selectedVersion?.status)

  const structure = structureQuery.data
  const variables = variablesQuery.data?.variables ?? []
  const formulaGroups = structure?.formula_groups ?? []

  return (
    <div className="model-workspace flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#dce3e9] bg-white p-4">
        <div className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[#71809f]">Model detail · {detail?.product_code ?? model?.product ?? '—'}{(detail?.product_code ?? model?.product) === 'MYGA' && <IllustrativeBadge />}</span>
          <h2 className="mt-1 text-2xl font-bold text-[#101b37]">{detail?.name ?? model?.name ?? 'Model'}</h2>
          <p className="mt-1 text-xs text-[#71809f]">{detail?.description || 'No description'} · Model ID {detail?.id ?? modelId}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onBack && <button className="model-open-button" onClick={onBack}><ArrowLeft size={15} />Back to models</button>}
          {selectedVersion && <button className="model-open-button" onClick={() => onOpenFormulaStudio?.(modelId, selectedVersion.id)}><Workflow size={15} />Formula Studio</button>}
          <button className="model-open-button" onClick={() => { detailQuery.refetch(); versionsQuery.refetch(); if (versionId) { structureQuery.refetch(); variablesQuery.refetch() } }}><RefreshCw size={15} />Refresh</button>
          <button className="model-open-button" onClick={onCreateProjection}>Create Projection Set</button>
        </div>
      </header>
      {detailQuery.error && <p role="alert">Could not load model detail: {detailQuery.error.message}</p>}
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)] items-start gap-4 max-[900px]:grid-cols-1">
        <main className="flex min-w-0 flex-col gap-4">
          <section className="mw-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-base font-bold">Versions</h2><p className="mt-1 text-xs text-[#71809f]">Draft versions are not runnable yet. Formulas are not editable from the UI.</p></div>
              <span className="text-xs text-[#71809f]">{versions.length} versions</span>
            </div>
            {versionsQuery.loading && <p role="status">Loading model versions…</p>}
            {versionsQuery.error && <p role="alert">Could not load versions: {versionsQuery.error.message}</p>}
            <div className="mt-3 flex flex-col gap-2">{versions.map(version => {
              const versionPublished = Boolean(version.published_at || version.is_current)
              return               <button key={version.id} aria-pressed={selectedVersion?.id === version.id} className={`w-full rounded-lg border p-3 text-left ${selectedVersion?.id === version.id ? 'border-[#80c51a] bg-[#f5faee]' : 'border-[#e2e8ed] bg-white'}`} onClick={() => { setSelectedVersionId(version.id); setEditingNotes(false); setValidationResult(null) }}>
                <span className="flex flex-wrap items-center justify-between gap-2"><b>{version.version_label}</b><span className="rounded-full bg-[#edf1f5] px-2 py-1 text-[10px] uppercase">{statusLabel(reviewStatus(version))}{versionPublished ? ' · locked' : ''}{version.status === 'draft' ? ' · not runnable yet' : ''}</span></span>
                <small className="mt-1 block text-[#71809f]">{version.basis ?? 'No basis'} · {versionPublished ? 'Write-once published version' : 'Historical'} · {version.created_at ? new Date(version.created_at).toLocaleDateString() : 'Date unavailable'}</small>
              </button>
            })}{!versionsQuery.loading && !versionsQuery.error && !versions.length && <p>No versions are listed for this model.</p>}</div>
          </section>

          <section className="mw-card">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-bold">Version structure</h2><p className="mt-1 text-xs text-[#71809f]">{selectedVersion ? `${selectedVersion.version_label} · ${statusLabel(selectedVersion.status)}` : 'Select a model version'}</p></div></div>
            {structureQuery.loading && <p role="status">Loading model structure…</p>}
            {structureQuery.error && <p role="alert">Could not load structure: {structureQuery.error.message}</p>}
            {structure && <div className="mt-3">
              {selectedVersion?.status === 'draft' && <p className="mb-3 rounded-md bg-[#fff7df] p-2 text-xs text-[#805d10]">This draft must be validated and independently approved before publication.</p>}
              {selectedVersion && <div className="my-3 flex flex-wrap gap-2">
                <button className="model-open-button" disabled={!canEdit || published || saveBusy} onClick={() => void runVersionAction('validate')}><ShieldCheck size={15} />{saveBusy ? 'Working…' : 'Validate model'}</button>
                <button className="model-open-button" disabled={!approvalAllowed || saveBusy} title={selfApprovalForbidden ? 'Segregation of duties: you created or materially modified this version and cannot approve it.' : !canReview ? 'Model approval permission required.' : undefined} onClick={() => void runVersionAction('approve', {})}>Approve version</button>
                <button className="model-open-button" disabled={!canReview || published || ['approved', 'rejected', 'superseded'].includes(selectedVersion.status) || saveBusy} onClick={() => { setRejectReason(''); setRejectOpen(true) }}>Reject version</button>
                <button className="model-open-button" disabled={!canEdit || selectedVersion.status !== 'approved' || published || saveBusy} title={selectedVersion.status !== 'approved' ? 'Only independently approved versions can be published.' : undefined} onClick={() => void runVersionAction('publish')}><LockKeyhole size={15} />Publish version</button>
              </div>}
              {validationResult && <details className="mb-3 rounded-md border border-[#dce3e9] p-2" open><summary className="cursor-pointer text-xs font-bold">Latest validation: {validationResult.status ?? 'unknown'} · {validationResult.validation?.checks?.length ?? 0} checks</summary><ul className="mt-2 grid gap-1 text-xs">{(validationResult.validation?.checks ?? []).map((check, index) => <li key={`${check.code ?? check.name ?? 'check'}-${index}`} className={check.status === 'pass' ? 'text-[#37600b]' : 'text-[#805d10]'}><b>{check.status ?? 'unknown'}</b> · {check.label ?? check.code ?? check.name ?? 'Validation check'}{check.message ? ` — ${check.message}` : ''}</li>)}</ul>{validationResult.fingerprint && <small className="mt-2 block break-all text-[#71809f]">Fingerprint: {validationResult.fingerprint}</small>}</details>}
              {selectedVersion && !canReview && <p className="text-xs text-[#71809f]">Approval and rejection require `models:approve` permission.</p>}
              {selectedVersion && selfApprovalForbidden && <p className="text-xs text-[#805d10]">Segregation of duties: you created or materially modified this version and cannot approve it.</p>}
              {published && <p className="mb-3 flex items-center gap-2 rounded-md bg-[#edf7df] p-2 text-xs text-[#37600b]"><LockKeyhole size={15} />Write-once published version. It cannot be edited or unpublished.</p>}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(structure.facts ?? {}).map(([label, value]) => <div className="rounded-md bg-[#f5f7f8] p-2" key={label}><small className="block text-[#71809f]">{label.replaceAll('_', ' ')}</small><b>{value}</b></div>)}</div>
              <h3 className="mt-4 font-bold">Hierarchy</h3>
              <div className="mt-2 flex flex-col">{(structure.hierarchy ?? []).map((item, index) => <div className="flex items-center justify-between gap-2 border-b border-[#edf0f2] py-2 text-xs" key={`${item.id ?? item.label}-${index}`} style={{ paddingLeft: `${Math.min(item.depth ?? 0, 8) * 14}px` }}><span>{item.label}</span><small className="text-[#71809f]">{item.level} · {item.meta}</small></div>)}</div>
              <h3 className="mt-4 font-bold">Formula groups</h3>
              <div className="mt-2 flex flex-col gap-2">{formulaGroups.map(group => <article className="rounded-md border border-[#e2e8ed] p-2 text-xs" key={group.id}><b>{group.name}</b><p className="text-[#71809f]">{group.formula_count} formulas · {group.version_label} · {group.lineage_state}</p><small>{group.description}</small></article>)}{!formulaGroups.length && <p>No formula groups reported.</p>}</div>
              {structure.validation && <details className="mt-3"><summary className="cursor-pointer text-xs font-bold">Validation · {structure.validation.status}</summary><pre className="mt-2 overflow-auto rounded bg-[#f5f7f8] p-2 text-[10px]">{JSON.stringify(structure.validation, null, 2)}</pre></details>}
            </div>}
          </section>

          <section className="mw-card">
            <div><h2 className="text-base font-bold">Variables ({variablesQuery.data?.total ?? variables.length})</h2><p className="mt-1 text-xs text-[#71809f]">Definitions used by this model version.</p></div>
            {variablesQuery.loading && <p role="status">Loading variables…</p>}
            {variablesQuery.error && <p role="alert">Could not load variables: {variablesQuery.error.message}</p>}
            {(detail?.product_code ?? model?.product) === 'MYGA' && variables.some(variable => variable.variable_name === 'death_benefit') && <aside className="my-3 rounded-md border border-[#f0d9a0] bg-[#fff9e9] p-3 text-xs text-[#694b11]" role="note"><b>STATUS: NEEDS ACTUARIAL PRODUCT OWNER DECISION</b><p className="mt-1">Implemented baseline, Option B: <code>max(account_value_close, surrender_benefit)</code>. This formula is not a final approved actuarial rule.</p><p className="mt-1">Option A (account value) and the product-owner-specified Option C remain alternatives pending formal confirmation.</p></aside>}
            <div className="mt-3 overflow-auto"><table className="w-full border-collapse text-left text-xs"><thead><tr className="border-b border-[#e2e8ed] text-[#71809f]"><th className="p-2">Variable</th><th className="p-2">Kind / type</th><th className="p-2">Unit</th><th className="p-2">Required</th><th className="p-2">Source</th></tr></thead><tbody>{variables.map(variable => <tr className="border-b border-[#edf0f2]" key={variable.id}><td className="p-2"><b>{variable.display_name}</b><small className="block text-[#71809f]">{variable.variable_name} · {variable.description}</small></td><td className="p-2">{variable.kind} / {variable.data_type}</td><td className="p-2">{variable.unit ?? '—'}</td><td className="p-2">{variable.required ? 'Yes' : 'No'}</td><td className="p-2">{variable.source?.type ?? '—'}</td></tr>)}</tbody></table></div>
          </section>
        </main>

        <aside className="flex flex-col gap-4">
          <section className="mw-card">
            <h2 className="text-base font-bold">Model details</h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs"><dt className="text-[#71809f]">Status</dt><dd>{statusLabel(detail?.status ?? model?.status)}</dd><dt className="text-[#71809f]">Owner</dt><dd>{detail?.owner?.full_name ?? model?.owner ?? 'Unavailable'}</dd><dt className="text-[#71809f]">Runs</dt><dd>{detail?.run_count ?? model?.runs ?? 0}</dd><dt className="text-[#71809f]">Updated</dt><dd>{detail?.updated_at ? new Date(detail.updated_at).toLocaleString() : model?.updated ?? 'Unavailable'}</dd></dl>
            {detail?.access?.length > 0 && <div className="mt-3 border-t pt-3"><h3 className="font-bold">Access</h3>{detail.access.map(item => <p className="mt-1 text-xs" key={item.user.id}>{item.user.full_name} · {item.role}</p>)}</div>}
          </section>
          <section className="mw-card flex flex-col gap-3">
            <div><h2 className="text-base font-bold">Create draft version</h2><p className="mt-1 text-xs text-[#71809f]">Copies the selected version's structure. Draft versions cannot run yet.</p></div>
            {!canEdit && <p className="text-xs text-[#71809f]">Your role is read-only for model registries.</p>}
            <label className="grid gap-1 text-xs">Version label<input className="rounded border p-2" maxLength={30} value={versionLabel} onChange={event => setVersionLabel(event.target.value)} placeholder="Optional, e.g. v0.2" /></label>
            {!selectedVersion && <label className="grid gap-1 text-xs">Basis<input className="rounded border p-2" required value={basis} onChange={event => setBasis(event.target.value)} placeholder="Required for the first version" /></label>}
            <label className="grid gap-1 text-xs">Change summary<input className="rounded border p-2" value={changeSummary} onChange={event => setChangeSummary(event.target.value)} /></label>
            {createError && <p role="alert" className="text-xs text-red-700">{createError}</p>}
            <button className="model-open-button" disabled={!canEdit || createBusy || (!selectedVersion && !basis.trim())} onClick={() => void createDraftVersion()}><Plus size={15} />{createBusy ? 'Creating…' : 'Create draft version'}</button>
          </section>
          {selectedVersion && <section className="mw-card flex flex-col gap-3">
            <div><h2 className="text-base font-bold">Draft notes</h2><p className="mt-1 text-xs text-[#71809f]">Only draft versions can be edited or archived here.</p></div>
            {actionError && <p role="alert" className="text-xs text-red-700">{actionError}</p>}
            {selectedVersion.status === 'draft' ? <>
              <label className="grid gap-1 text-xs">Notes<textarea className="min-h-24 rounded border p-2" disabled={!editingNotes} value={notes} onChange={event => setNotesByVersion(current => ({ ...current, [selectedVersion.id]: event.target.value }))} /></label>
              {canEdit && <div className="flex flex-wrap gap-2">{editingNotes ? <button className="model-open-button" disabled={saveBusy} onClick={() => void saveNotes()}><Save size={15} />Save notes</button> : <button className="model-open-button" onClick={() => setEditingNotes(true)}>Edit notes</button>}<button className="model-open-button" disabled={saveBusy} onClick={() => void archiveDraft()}><Archive size={15} />Archive draft</button></div>}
            </> : <p className="text-xs text-[#71809f]">This version is {statusLabel(selectedVersion.status)}; edit and archive actions are unavailable.</p>}
          </section>}
        </aside>
      </div>
      {rejectOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4" onClick={() => setRejectOpen(false)}>
        <section aria-labelledby="model-reject-title" aria-modal="true" className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl" onClick={event => event.stopPropagation()} role="dialog">
          <header className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold" id="model-reject-title">Reject model version</h2><button aria-label="Close rejection dialog" onClick={() => setRejectOpen(false)}><X size={18} /></button></header>
          <p className="my-3 text-sm text-[#71809f]">Provide a reason (at least 3 characters). This decision is recorded in the audit trail.</p>
          <label className="grid gap-1 text-sm">Reason<textarea autoFocus className="min-h-24 rounded border p-2" maxLength={2000} value={rejectReason} onChange={event => setRejectReason(event.target.value)} /></label>
          {actionError && <p role="alert" className="mt-2 text-sm text-red-700">{actionError}</p>}
          <div className="mt-4 flex justify-end gap-2"><button className="model-open-button" onClick={() => setRejectOpen(false)}>Cancel</button><button className="model-open-button" disabled={rejectReason.trim().length < 3 || saveBusy} onClick={() => void runVersionAction('reject', { reason: rejectReason.trim() })}>{saveBusy ? 'Rejecting…' : 'Reject version'}</button></div>
        </section>
      </div>}
    </div>
  )
}
