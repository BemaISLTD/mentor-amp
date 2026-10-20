import type { ExecutionStatus, LineageStatus, ModelStatus } from '../../types'

type Status = ModelStatus | ExecutionStatus | LineageStatus

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  running: 'Running',
  success: 'Completed',
  partial_success: 'Partial success',
  failed: 'Failed',
  cancelled: 'Cancelled',
  queued: 'Queued',
  uploaded: 'Uploaded',
  validated: 'Validated',
  needs_review: 'Needs review',
  draft: 'Draft',
  approved: 'Approved',
  rejected: 'Rejected',
  superseded: 'Superseded',
  legacy_unvalidated: 'Legacy unvalidated',
  published: 'Published',
  Shared: 'Shared',
  Inherited: 'Inherited',
  Overridden: 'Overridden',
  Local: 'Local',
}

export function StatusBadge({ status }: { status: Status }) {
  const normalized = String(status)
  const label = statusLabels[normalized] ?? normalized.replace(/_/g, ' ')
  const tone = normalized.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-')
  return <span className={`status-badge status-${tone}`}><span className="status-dot" />{label}</span>
}
