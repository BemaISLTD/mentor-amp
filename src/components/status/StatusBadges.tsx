import { Badge, getBadgeStyleProps, type BadgeStyle } from '@/components/ui';
import type { FileStatus, RunStatus } from '@/lib/types';
import { CheckCircle2, Clock, AlertCircle, Loader2, XCircle, FileCheck, Upload } from 'lucide-react';

export function FileStatusBadge({ status }: { status: FileStatus }) {
  const map: Record<FileStatus, { label: string; style: BadgeStyle; icon: React.ReactNode }> = {
    pending:    { label: 'Pending',    style: 'secondary',   icon: <Clock className="h-3 w-3" /> },
    uploaded:   { label: 'Uploaded',   style: 'info',        icon: <Upload className="h-3 w-3" /> },
    validating: { label: 'Validating', style: 'warning',     icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    validated:  { label: 'Validated',  style: 'success',     icon: <FileCheck className="h-3 w-3" /> },
    failed:     { label: 'Failed',     style: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  };
  const { label, style, icon } = map[status];
  return <Badge {...getBadgeStyleProps(style)}>{icon}{label}</Badge>;
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const map: Record<RunStatus, { label: string; style: BadgeStyle; icon: React.ReactNode }> = {
    draft:     { label: 'Draft',     style: 'secondary',   icon: <Clock className="h-3 w-3" /> },
    queued:    { label: 'Queued',    style: 'warning',     icon: <Clock className="h-3 w-3" /> },
    running:   { label: 'Running',   style: 'info',        icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    completed: { label: 'Completed', style: 'success',     icon: <CheckCircle2 className="h-3 w-3" /> },
    failed:    { label: 'Failed',    style: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
    cancelled: { label: 'Cancelled', style: 'secondary',   icon: <XCircle className="h-3 w-3" /> },
  };
  const { label, style, icon } = map[status];
  return <Badge {...getBadgeStyleProps(style)}>{icon}{label}</Badge>;
}
