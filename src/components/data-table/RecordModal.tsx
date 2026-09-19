import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Button, Input, Label, Badge, Separator, Alert, AlertTitle, AlertDescription,
  getBadgeStyleProps, type BadgeStyle,
} from '@/components/ui';
import { Pencil, Trash2, Save, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'badge' | 'readonly';
  options?: string[];
  badgeMap?: Record<string, BadgeStyle>;
  editable?: boolean;
  required?: boolean;
  description?: string;
  suffix?: string;
  group?: string;
}

interface RecordModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'view' | 'edit' | 'delete';
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any | null;
  fields: FieldDef[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave?: (updated: any) => Promise<void> | void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDelete?: (record: any) => Promise<void> | void;
  onModeChange?: (mode: 'view' | 'edit') => void;
}

export function RecordModal({
  open, onClose, mode, title, record, fields,
  onSave, onDelete, onModeChange,
}: RecordModalProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (record) setEditData({ ...record });
    setErrors({});
    setSaved(false);
  }, [record, mode]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    fields.forEach(f => {
      if (f.required && (editData[f.key] === '' || editData[f.key] == null)) {
        errs[f.key] = `${f.label} is required`;
      }
      if (f.type === 'number' && editData[f.key] !== '' && isNaN(Number(editData[f.key]))) {
        errs[f.key] = `${f.label} must be a number`;
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave?.(editData);
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!record) return;
    setDeleting(true);
    try { await onDelete?.(record); onClose(); } finally { setDeleting(false); }
  }

  if (!record) return null;

  const groups = Array.from(new Set(fields.map(f => f.group ?? 'General')));
  const isEdit = mode === 'edit';
  const isDelete = mode === 'delete';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDelete ? <Trash2 className="h-4 w-4 text-red-500" /> : isEdit ? <Pencil className="h-4 w-4" /> : null}
            {isDelete ? `Delete ${title}` : isEdit ? `Edit ${title}` : `View ${title}`}
          </DialogTitle>
        </DialogHeader>

        {saved && (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Saved successfully</AlertTitle>
          </Alert>
        )}

        {isDelete ? (
          <div className="space-y-4 py-2">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>This action cannot be undone</AlertTitle>
              <AlertDescription>Are you sure you want to delete this record?</AlertDescription>
            </Alert>
            <div className="rounded-md border border-[--color-border] p-4 space-y-2">
              {fields.slice(0, 4).map(f => (
                <div key={f.key} className="flex items-center gap-2 text-sm">
                  <span className="text-[--color-muted-foreground] w-32 shrink-0">{f.label}:</span>
                  <span className="font-medium">{String(record[f.key] ?? '—')}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-1">
            {groups.map(group => {
              const groupFields = fields.filter(f => (f.group ?? 'General') === group);
              return (
                <div key={group}>
                  {groups.length > 1 && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-[--color-muted-foreground] uppercase tracking-wide">{group}</span>
                      <Separator className="flex-1" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {groupFields.map(field => {
                      const val = isEdit ? editData[field.key] : record[field.key];
                      const canEdit = isEdit && field.editable !== false && field.type !== 'readonly';
                      const err = errors[field.key];
                      return (
                        <div key={field.key} className={cn('space-y-1', field.type === 'textarea' && 'col-span-2')}>
                          <Label className={cn('text-xs', field.required && "after:content-['*'] after:text-red-500 after:ml-0.5")}>
                            {field.label}
                          </Label>
                          {field.description && <p className="text-[10px] text-[--color-muted-foreground]">{field.description}</p>}
                          {canEdit ? (
                            field.type === 'select' ? (
                              <select value={String(val ?? '')}
                                onChange={e => setEditData(d => ({ ...d, [field.key]: e.target.value }))}
                                className={cn('flex h-9 w-full rounded-md border border-[--color-input] bg-transparent px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[--color-ring]', err && 'border-red-500')}>
                                {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            ) : field.type === 'textarea' ? (
                              <textarea value={String(val ?? '')}
                                onChange={e => setEditData(d => ({ ...d, [field.key]: e.target.value }))}
                                rows={3} className="flex w-full rounded-md border border-[--color-input] bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[--color-ring]" />
                            ) : (
                              <div className="relative">
                                <Input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                  value={String(val ?? '')}
                                  onChange={e => setEditData(d => ({ ...d, [field.key]: e.target.value }))}
                                  className={cn('text-sm', err && 'border-red-500', field.suffix && 'pr-10')} />
                                {field.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[--color-muted-foreground]">{field.suffix}</span>}
                              </div>
                            )
                          ) : (
                            field.type === 'badge' && field.badgeMap ? (
                              <Badge {...getBadgeStyleProps(field.badgeMap[String(val)] ?? 'secondary')}>{String(val ?? '—')}</Badge>
                            ) : (
                              <p className={cn('text-sm py-1.5 min-h-[32px]', field.type === 'readonly' && 'text-[--color-muted-foreground]')}>
                                {String(val ?? '—')}{field.suffix && <span className="text-[--color-muted-foreground] ml-1">{field.suffix}</span>}
                              </p>
                            )
                          )}
                          {err && <p className="text-xs text-red-600">{err}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          {isDelete ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : <><Trash2 className="h-3.5 w-3.5" />Delete Record</>}
              </Button>
            </>
          ) : isEdit ? (
            <>
              <Button variant="outline" onClick={onClose}><X className="h-3.5 w-3.5" />Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : <><Save className="h-3.5 w-3.5" />Save Changes</>}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Close</Button>
              {onSave && <Button onClick={() => onModeChange?.('edit')}><Pencil className="h-3.5 w-3.5" />Edit</Button>}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
