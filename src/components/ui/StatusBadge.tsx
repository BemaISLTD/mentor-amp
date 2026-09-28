import type { ExecutionStatus, LineageStatus, ModelStatus } from '../../types'

type Status = ModelStatus | ExecutionStatus | LineageStatus
export function StatusBadge({ status }: { status: Status }) {
  const tone = status.toLowerCase().replace(' ', '-')
  return <span className={`status-badge status-${tone}`}><span className="status-dot" />{status}</span>
}
