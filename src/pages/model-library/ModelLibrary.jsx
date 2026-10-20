import { useState } from 'react'
import {
  Archive,
  ArrowDownUp,
  Box,
  ChevronDown,
  Filter,
  Grid2X2,
  MoreVertical,
  Plus,
  Star,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useApi } from '../../api/ApiProvider'
import { canImportData } from '../../api/permissions'
import { useApiQuery } from '../../api/useApiQuery'
import { useWorkspace } from '../../api/WorkspaceContext'
import './model-library.css'

const ownerColors = {
  AJ: 'bg-[#8d6847]',
  EC: 'bg-[#b77973]',
  MP: 'bg-[#657d9d]',
  SW: 'bg-[#7f8b68]',
  DK: 'bg-[#8a7399]',
}

export function ModelLibrary({ query, onNotify, onOpenModel }) {
  const { projectId } = useWorkspace()
  const { request, user } = useApi()
  const canCreateModel = canImportData(user?.roles ?? [])
  const catalogQuery = useApiQuery(projectId ? `/v1/projects/${projectId}/models` : null)
  const apiModels = catalogQuery.data?.models ?? []
  const modelRecords = apiModels.map((item) => {
    const timestamp = item.updated_at ? new Date(item.updated_at) : null
    const owner = item.owner?.full_name || 'Unknown'
    return {
      id: item.id, name: item.name, version: item.current_version?.version_label || '—',
      basis: item.current_version?.basis || '—', product: item.product_code || '—',
      status: item.status === 'needs_review' ? 'needs_review' : item.status === 'validated' ? 'validated' : item.status === 'approved' ? 'approved' : item.status === 'rejected' ? 'rejected' : item.status === 'superseded' ? 'superseded' : item.status === 'published' ? 'published' : 'draft',
      updated: timestamp && !Number.isNaN(timestamp.valueOf()) ? timestamp.toLocaleDateString() : '—',
      time: timestamp && !Number.isNaN(timestamp.valueOf()) ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      owner, initials: owner.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '??',
      runs: item.run_count || 0,
      isOwned: Boolean(item.owner?.is_current_user || (user && item.owner?.id === user.id)),
    }
  })
  const products = catalogQuery.data?.products ?? []
  const counts = catalogQuery.data?.counts ?? { all: apiModels.length, owned: 0, shared: 0 }
  const tabItems = [{ label: 'All', count: counts.all }, { label: 'Owned', count: counts.owned }, { label: 'Shared', count: counts.shared }]
  const [activeTab, setActiveTab] = useState('All')
  const [product, setProduct] = useState('All products')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [sortNewestFirst, setSortNewestFirst] = useState(true)
  const [view, setView] = useState('list')
  const [favorites, setFavorites] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newProductCode, setNewProductCode] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const visibleModels = modelRecords
    .filter((model) => {
      const matchesTab =
        activeTab === 'All' ||
        (activeTab === 'Owned' && model.isOwned) ||
        (activeTab === 'Shared' && !model.isOwned)
      const matchesProduct = product === 'All products' || model.product === product
      const matchesStatus = statusFilter === 'All statuses' || model.status === statusFilter
      const searchText = `${model.name} ${model.id} ${model.version} ${model.owner} ${model.product} ${model.basis}`.toLowerCase()

      return matchesTab && matchesProduct && matchesStatus && searchText.includes(normalizedQuery)
    })
    .sort((first, second) => {
      const order = new Date(second.updated) - new Date(first.updated)
      return sortNewestFirst ? order : -order
    })

  const toggleFavorite = (modelId) => {
    setFavorites((current) =>
      current.includes(modelId)
        ? current.filter((favorite) => favorite !== modelId)
        : [...current, modelId],
    )
  }

  const createModel = async event => {
    event.preventDefault()
    if (!canCreateModel || !projectId || createBusy) return
    setCreateBusy(true)
    setCreateError('')
    try {
      const created = await request(`/v1/projects/${encodeURIComponent(projectId)}/models`, {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), product_code: newProductCode.trim(), description: newDescription.trim() || null }),
      })
      catalogQuery.refetch()
      setCreateOpen(false)
      setNewName('')
      setNewProductCode('')
      setNewDescription('')
      onNotify(`Model ${created.name} created. Add its first draft version from Model detail.`)
      onOpenModel({ id: created.id, name: created.name, product: created.product_code, status: created.status, owner: user?.full_name ?? 'You' })
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not create the model.')
    } finally {
      setCreateBusy(false)
    }
  }

  return (
    <div className="model-library flex flex-col gap-4">
      <div className="model-library-tabs flex min-h-12 items-center justify-between gap-4 max-[760px]:items-start max-[760px]:flex-col max-[760px]:gap-2">
        <div className="flex items-center gap-2" role="tablist" aria-label="Model ownership">
          {tabItems.map((tab) => (
            <button
              aria-selected={activeTab === tab.label}
              className={`model-library-tab ${activeTab === tab.label ? 'model-library-tab-active' : ''}`}
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              role="tab"
            >
              {tab.label}<b>{tab.count}</b>
            </button>
          ))}
        </div>

        <div className="model-filter-actions flex items-center gap-2.5 max-[760px]:w-full max-[760px]:justify-end">
          {canCreateModel && <button className="model-open-button" onClick={() => setCreateOpen(true)}><Plus size={15} />Create model</button>}
          <label className="model-product-filter flex min-w-[206px] items-center gap-2 max-[760px]:min-w-0">
            <span className="sr-only">Filter by product</span>
            <select
              id="model-product"
              value={product}
              onChange={(event) => setProduct(event.target.value)}
            >
              <option>All products</option>
              {products.map((item) => (
                <option key={item.code} value={item.code}>{item.code}</option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" size={17} />
          </label>
          <button
            aria-label="Toggle filters"
            aria-pressed={filtersOpen}
            className={`model-view-control ${filtersOpen ? 'model-view-control-active' : ''}`}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Filter size={17} />
          </button>
        </div>
      </div>

      {filtersOpen && (
        <div className="model-filter-panel flex items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm max-[500px]:flex-col max-[500px]:items-stretch">
          <label className="flex items-center gap-2">
            <span>Status</span>
            <select
              className="model-filter-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All statuses">All statuses</option>
              <option value="validated">Validated</option>
              <option value="needs_review">Needs review</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="superseded">Superseded</option>
            </select>
          </label>
        </div>
      )}

      <div className="model-summary-grid grid grid-cols-[1.26fr_1fr_1fr] gap-3 max-[760px]:grid-cols-2 max-[500px]:grid-cols-1">
        <SummaryCard
          className="model-summary-card-dark"
          icon={<Box size={24} />}
          label="Total models"
          value={String(counts.all)}
          detail="Across all products"
        />
        <SummaryCard
          icon={<UserRound size={24} />}
          label="Owned by you"
          value={String(counts.owned)}
          detail={`${counts.all ? Math.round(counts.owned / counts.all * 100) : 0}% of total`}
        />
        <SummaryCard
          icon={<UsersRound size={24} />}
          label="Shared with you"
          value={String(counts.shared)}
          detail={`${counts.all ? Math.round(counts.shared / counts.all * 100) : 0}% of total`}
        />
      </div>

      <section className="model-list-section">
        <div className="model-list-header flex h-[58px] items-end justify-between gap-4 max-[760px]:h-auto max-[760px]:items-start max-[760px]:flex-col">
          <h2>Models <span>({visibleModels.length})</span></h2>
          <div className="model-list-controls flex items-center gap-2.5 max-[760px]:w-full max-[760px]:justify-between">
            <button
              className="model-sort-control"
              onClick={() => setSortNewestFirst((current) => !current)}
            >
              <ArrowDownUp size={16} />
              Last updated
              <ChevronDown size={15} />
            </button>
            <button
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              className={`model-view-control ${view === 'grid' ? 'model-view-control-active' : ''}`}
              onClick={() => setView('grid')}
            >
              <Grid2X2 size={17} />
            </button>
            <button
              aria-label="List view"
              aria-pressed={view === 'list'}
              className={`model-view-control ${view === 'list' ? 'model-view-control-active' : ''}`}
              onClick={() => setView('list')}
            >
              <Archive size={17} />
            </button>
          </div>
        </div>

        {catalogQuery.loading ? <div className="model-empty-state">Loading models from this project…</div> : catalogQuery.error ? <div className="model-empty-state">Could not load models: {catalogQuery.error.message}</div> : visibleModels.length > 0 ? (
          <div className={`model-records ${view === 'grid' ? 'model-records-grid grid grid-cols-2 gap-3 max-[1050px]:grid-cols-1' : 'flex flex-col gap-2.5'}`}>
            {visibleModels.map((model) => (
              <ModelRow
                favorite={favorites.includes(model.id)}
                key={model.id}
                model={model}
                onFavorite={() => toggleFavorite(model.id)}
                onMore={() => onNotify(`${model.name} actions opened`)}
                onOpen={() => onOpenModel(model)}
                view={view}
              />
            ))}
          </div>
        ) : (
          <div className="model-empty-state">
            {apiModels.length === 0 ? 'This project has no models yet.' : 'No models match the current search and filters.'}
          </div>
        )}

        <p className="model-list-foot">
          {visibleModels.length} of {counts.all} models · select Open model to enter the architecture workspace
        </p>
      </section>
      {createOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onClick={() => setCreateOpen(false)}>
        <form className="flex w-full max-w-lg flex-col gap-3 rounded-xl bg-white p-5 shadow-xl" onSubmit={createModel} onClick={event => event.stopPropagation()}>
          <div><h2 className="text-lg font-bold text-[#101b37]">Create model</h2><p className="text-xs text-[#71809f]">Creates an empty model shell. Create a draft version next.</p></div>
          <label className="grid gap-1 text-xs">Name<input required maxLength={255} value={newName} onChange={event => setNewName(event.target.value)} /></label>
          <label className="grid gap-1 text-xs">Product code<input required maxLength={50} value={newProductCode} onChange={event => setNewProductCode(event.target.value)} placeholder="e.g. SPIA" /></label>
          <label className="grid gap-1 text-xs">Description<textarea value={newDescription} onChange={event => setNewDescription(event.target.value)} /></label>
          {createError && <p role="alert" className="text-xs text-red-700">{createError}</p>}
          <div className="flex justify-end gap-2"><button type="button" className="model-open-button" onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit" className="model-open-button" disabled={createBusy || !newName.trim() || !newProductCode.trim()}>{createBusy ? 'Creating…' : 'Create model'}</button></div>
        </form>
      </div>}
    </div>
  )
}

function SummaryCard({ className = '', icon, label, value, detail, extra }) {
  return (
    <article className={`model-summary-card ${className}`}>
      <span className="model-summary-icon">{icon}</span>
      <div className="model-summary-copy">
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{extra && <em>{extra}</em>}{detail}</span>
      </div>
    </article>
  )
}

function ModelRow({ model, favorite, onFavorite, onMore, onOpen, view }) {
  const isGrid = view === 'grid'
  const isEmphasized = model.product === 'CAT'

  return (
    <article className={`model-record ${isEmphasized ? 'model-record-emphasized' : ''} ${isGrid ? 'model-record-grid flex flex-col items-start gap-3 rounded-[10px] border p-4' : 'model-record-list grid grid-cols-[50px_minmax(0,344px)_44px_160px_128px_112px_112px_17px] items-center justify-between gap-3.5 max-[1280px]:grid-cols-[50px_minmax(0,1.4fr)_44px_minmax(120px,1fr)_120px_104px_108px_17px] max-[1000px]:grid-cols-[50px_minmax(0,1fr)_auto] max-[1000px]:gap-x-3 max-[760px]:gap-x-2.5'}`}>
      <div className={`model-product-icon product-${model.product.toLowerCase()}`}>
        <Box size={25} strokeWidth={1.7} />
      </div>

      <div className="model-record-name min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <b>{model.name}</b>
          <button
            aria-label={favorite ? `Remove ${model.name} from favorites` : `Add ${model.name} to favorites`}
            aria-pressed={favorite}
            className={`model-favorite ${favorite ? 'model-favorite-active' : ''}`}
            onClick={onFavorite}
          >
            <Star size={14} fill={favorite ? 'currentColor' : 'none'} />
          </button>
        </span>
        <small>ID: {model.id}</small>
      </div>

      <span className={`model-record-version ${isGrid ? 'model-grid-meta' : 'max-[1000px]:hidden'}`}>
        <span className="sr-only">Version </span>{model.version}
      </span>

      <span className={`model-record-owner ${isGrid ? 'model-grid-meta' : 'max-[1000px]:hidden'}`}>
        <i className={ownerColors[model.initials]}>{model.initials}</i>
        <span>
          <b>{model.owner}</b>
          <small>{model.initials === 'AJ' ? 'You' : 'Owner'}</small>
        </span>
      </span>

      <span className={`model-record-updated ${isGrid ? 'model-grid-meta' : 'max-[1000px]:hidden'}`}>
        <small>Last updated</small>
        <b>{model.updated}</b>
        <span>{model.time}</span>
      </span>

      <span className={`model-record-status ${isGrid ? 'model-grid-meta' : 'max-[1000px]:col-start-3 max-[1000px]:row-start-1'}`}>
        <StatusBadge status={model.status} />
      </span>

      <button className={`model-open-button ${isEmphasized ? 'model-open-button-dark' : ''} ${isGrid ? 'w-full' : 'max-[1000px]:col-start-3 max-[1000px]:row-start-2'}`} onClick={onOpen}>
        Open model
      </button>

      <button
        aria-label={`More actions for ${model.name}`}
        className={`model-more-button ${isGrid ? 'self-end' : 'max-[1000px]:hidden'}`}
        onClick={onMore}
      >
        <MoreVertical size={17} />
      </button>

      {!isGrid && (
        <div className="model-mobile-details col-span-3 hidden items-center gap-4 max-[1000px]:flex max-[760px]:flex-wrap">
          <span>{model.version}</span>
          <span>{model.owner}{model.initials === 'AJ' ? ' · You' : ' · Owner'}</span>
          <span>{model.updated} · {model.time}</span>
        </div>
      )}

      {isGrid && <span className="model-grid-basis">{model.product} · {model.basis}</span>}
    </article>
  )
}
