import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { FileUploadZone } from '@/components/upload/FileUploadZone';
import { FileStatusBadge } from '@/components/status/StatusBadges';
import { PageHeader } from '@/components/layout/PageHeader';
import { RecordModal, type FieldDef } from '@/components/data-table/RecordModal';
import { SpreadsheetViewer, type SpreadsheetColumn } from '@/components/data-table/SpreadsheetViewer';
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, Skeleton, Alert, AlertTitle, AlertDescription,
  Tabs, TabsList, TabsTrigger, TabsContent, getBadgeStyleProps,
} from '@/components/ui';
import { formatBytes, formatDate, formatNumber, formatCurrency } from '@/lib/utils';
import {
  getInforceFiles, getAssumptionTables, getScenarioFiles,
  getFactorFiles, uploadFile, deleteFile,
} from '@/lib/api';
import { inforceRecords, assumptionRecords } from '@/lib/table-data';
import type { InforceFile, AssumptionTable, ScenarioFile, FactorFile } from '@/lib/types';
import { Plus, Trash2, Eye, Download, AlertCircle, Table2, FileSpreadsheet } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function UploadDialog({ open, onClose, title, accept }: {
  open: boolean; onClose: () => void; title: string; accept?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try { await uploadFile(file, title, {}); setDone(true); } finally { setUploading(false); }
  }

  function handleClose() { setDone(false); onClose(); }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload {title}</DialogTitle>
          <DialogDescription>Select a file to upload. The system will validate schema and record counts.</DialogDescription>
        </DialogHeader>
        {done ? (
          <Alert variant="success"><AlertTitle>Upload Successful</AlertTitle><AlertDescription>File queued for validation.</AlertDescription></Alert>
        ) : (
          <FileUploadZone accept={accept || '.csv,.xlsx'} label={`Upload ${title}`} onUpload={handleUpload} />
        )}
        <DialogFooter><Button variant="outline" onClick={handleClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Spreadsheet Modal (full file record viewer) ───────────────────────────────

function SpreadsheetModal({ open, onClose, fileName, columns, rows, readOnly }: {
  open: boolean; onClose: () => void; fileName: string;
  columns: SpreadsheetColumn[]; rows: Record<string, unknown>[]; readOnly?: boolean;
}) {
  const [data, setData] = useState(rows);

  function handleUpdate(rowIdx: number, key: string, value: string) {
    setData(prev => prev.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r));
  }
  function handleDelete(rowIdx: number) {
    setData(prev => prev.filter((_, i) => i !== rowIdx));
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1200px] h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-[--color-border] shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            {fileName}
            {readOnly && <Badge variant="secondary" className="text-xs">Read-only</Badge>}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <SpreadsheetViewer
            columns={columns}
            rows={data}
            readOnly={readOnly}
            onRowUpdate={handleUpdate}
            onRowDelete={handleDelete}
            className="h-full"
          />
        </div>
        <div className="px-4 py-2 border-t border-[--color-border] shrink-0 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Inforce Files ─────────────────────────────────────────────────────────────

const inforceFields: FieldDef[] = [
  { key: 'id', label: 'File ID', type: 'readonly', group: 'Metadata' },
  { key: 'name', label: 'File Name', editable: true, required: true, group: 'Metadata' },
  { key: 'product', label: 'Product', type: 'select', options: ['MYGA', 'SPIA', 'FIA', 'RILA', 'Disability'], editable: true, group: 'Metadata' },
  { key: 'version', label: 'Version', editable: true, group: 'Metadata' },
  { key: 'description', label: 'Description', type: 'textarea', editable: true, group: 'Metadata' },
  { key: 'effectiveDate', label: 'Effective Date', type: 'date', editable: true, group: 'Data Details' },
  { key: 'policyCount', label: 'Policy Count', type: 'number', group: 'Data Details' },
  { key: 'premiumAmount', label: 'Total Premium', type: 'number', suffix: 'USD', group: 'Data Details' },
  { key: 'status', label: 'Status', type: 'badge', badgeMap: { validated: 'success', failed: 'destructive', validating: 'warning', uploaded: 'info', pending: 'secondary' }, group: 'Status' },
  { key: 'uploadedBy', label: 'Uploaded By', type: 'readonly', group: 'Status' },
  { key: 'uploadedAt', label: 'Upload Date', type: 'readonly', group: 'Status' },
];

const inforceSpreadsheetCols: SpreadsheetColumn[] = [
  { key: 'policyNo',       label: 'Policy No',        width: 110, type: 'text', frozen: true },
  { key: 'insuredName',    label: 'Insured Name',      width: 160, type: 'text', editable: true },
  { key: 'product',        label: 'Product',           width: 90,  type: 'text' },
  { key: 'issueDate',      label: 'Issue Date',        width: 100, type: 'date', editable: true },
  { key: 'issueAge',       label: 'Issue Age',         width: 80,  type: 'number', align: 'right' },
  { key: 'gender',         label: 'Gender',            width: 65,  type: 'text' },
  { key: 'smokerStatus',   label: 'Smoker',            width: 70,  type: 'text' },
  { key: 'stateName',      label: 'State',             width: 65,  type: 'text' },
  { key: 'premium',        label: 'Premium ($)',        width: 110, type: 'currency', align: 'right', editable: true },
  { key: 'accountValue',   label: 'Account Value ($)', width: 130, type: 'currency', align: 'right', editable: true },
  { key: 'surrenderValue', label: 'Surrender Value',   width: 130, type: 'currency', align: 'right' },
  { key: 'guaranteedRate', label: 'Guaranteed Rate',   width: 120, type: 'percent', align: 'right', editable: true },
  { key: 'guaranteePeriod',label: 'Guar. Period (yr)', width: 120, type: 'number', align: 'right' },
  { key: 'surrenderChargeYr', label: 'SC Yrs Left',   width: 100, type: 'number', align: 'right' },
  { key: 'status', label: 'Status', width: 90,
    type: 'badge',
    badgeMap: { Active: 'success', Surrender: 'warning', Death: 'secondary' },
    editable: true,
  },
  { key: 'agentCode',      label: 'Agent Code',        width: 90,  type: 'text' },
];

export function InforceFilesPage() {
  const [files, setFiles] = useState<InforceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [modal, setModal] = useState<{ mode: 'view' | 'edit' | 'delete'; record: InforceFile } | null>(null);
  const [spreadsheetOpen, setSpreadsheetOpen] = useState<InforceFile | null>(null);

  useEffect(() => { getInforceFiles().then(setFiles).finally(() => setLoading(false)); }, []);

  async function handleSave(updated: Record<string, unknown>) {
    setFiles(prev => prev.map(f => f.id === updated.id ? { ...f, ...updated } as InforceFile : f));
  }

  async function handleDelete(record: Record<string, unknown>) {
    await deleteFile(record.id as string);
    setFiles(prev => prev.filter(f => f.id !== record.id));
  }

  const columns: ColumnDef<InforceFile, unknown>[] = [
    { accessorKey: 'name', header: 'File Name', size: 220,
      cell: ({ row }) => <span className="font-medium text-xs">{row.original.name}</span> },
    { accessorKey: 'product', header: 'Product', size: 80,
      cell: ({ row }) => <Badge variant="outline">{row.original.product}</Badge> },
    { accessorKey: 'effectiveDate', header: 'Effective Date', size: 110,
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.effectiveDate)}</span> },
    { accessorKey: 'policyCount', header: 'Policies', size: 90,
      cell: ({ row }) => <span className="text-xs tabular-nums">{formatNumber(row.original.policyCount)}</span> },
    { accessorKey: 'premiumAmount', header: 'Premium', size: 100,
      cell: ({ row }) => <span className="text-xs tabular-nums">{formatCurrency(row.original.premiumAmount, true)}</span> },
    { accessorKey: 'size', header: 'Size', size: 75,
      cell: ({ row }) => <span className="text-xs">{formatBytes(row.original.size)}</span> },
    { accessorKey: 'status', header: 'Status', size: 110,
      cell: ({ row }) => <FileStatusBadge status={row.original.status} /> },
    { id: 'actions', header: '', size: 130,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="View spreadsheet"
            onClick={() => setSpreadsheetOpen(row.original)}>
            <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="View record"
            onClick={() => setModal({ mode: 'view', record: row.original })}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit record"
            onClick={() => setModal({ mode: 'edit', record: row.original })}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" title="Delete"
            onClick={() => setModal({ mode: 'delete', record: row.original })}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <Skeleton className="h-64 w-full" />;
  const failedCount = files.filter(f => f.status === 'failed').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Inforce Files" description="Manage policy-level inforce data extracts"
        actions={
          <div className="flex gap-2">
            <Link to="/data/tables"><Button variant="outline" size="sm"><Table2 className="h-3.5 w-3.5" />Table Registry</Button></Link>
            <Button size="sm" onClick={() => setUploadOpen(true)}><Plus className="h-3.5 w-3.5" />Upload File</Button>
          </div>
        }
      />
      {failedCount > 0 && (
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" />
          <AlertTitle>{failedCount} file(s) failed validation</AlertTitle>
        </Alert>
      )}
      <Card><CardContent className="p-4">
        <DataTable data={files} columns={columns} searchPlaceholder="Search inforce files…" />
      </CardContent></Card>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} title="Inforce File" accept=".csv,.txt" />

      <RecordModal
        open={!!modal} onClose={() => setModal(null)}
        mode={modal?.mode ?? 'view'} title="Inforce File"
        record={modal?.record ?? null} fields={inforceFields}
        onSave={handleSave} onDelete={handleDelete}
        onModeChange={mode => setModal(m => m ? { ...m, mode } : null)}
      />

      {spreadsheetOpen && (
        <SpreadsheetModal
          open={!!spreadsheetOpen} onClose={() => setSpreadsheetOpen(null)}
          fileName={spreadsheetOpen.name}
          columns={inforceSpreadsheetCols}
          rows={inforceRecords as unknown as Record<string, unknown>[]}
          readOnly={spreadsheetOpen.status !== 'validated'}
        />
      )}
    </div>
  );
}

// ── Assumption Tables ─────────────────────────────────────────────────────────

const assumptionFields: FieldDef[] = [
  { key: 'id', label: 'Table ID', type: 'readonly', group: 'Metadata' },
  { key: 'name', label: 'Table Name', editable: true, required: true, group: 'Metadata' },
  { key: 'assumptionType', label: 'Type', type: 'select', editable: true,
    options: ['mortality', 'lapse', 'interest', 'expense', 'policyholder_behavior', 'mixed'], group: 'Metadata' },
  { key: 'basis', label: 'Basis', type: 'select', editable: true, options: ['company', 'industry', 'reinsurance'], group: 'Metadata' },
  { key: 'version', label: 'Version', editable: true, group: 'Metadata' },
  { key: 'description', label: 'Description', type: 'textarea', editable: true, group: 'Metadata' },
  { key: 'recordCount', label: 'Record Count', type: 'number', group: 'Data' },
  { key: 'status', label: 'Status', type: 'badge', badgeMap: { validated: 'success', failed: 'destructive', validating: 'warning', uploaded: 'info', pending: 'secondary' }, group: 'Status' },
  { key: 'uploadedBy', label: 'Uploaded By', type: 'readonly', group: 'Status' },
  { key: 'uploadedAt', label: 'Upload Date', type: 'readonly', group: 'Status' },
];

const assumptionSpreadsheetCols: SpreadsheetColumn[] = [
  { key: 'section',       label: 'Section',       width: 100, type: 'text' },
  { key: 'subType',       label: 'Sub-type',      width: 130, type: 'text' },
  { key: 'age',           label: 'Age',           width: 70,  type: 'text', align: 'right' },
  { key: 'duration',      label: 'Duration',      width: 90,  type: 'text' },
  { key: 'value',         label: 'Value',         width: 90,  type: 'number', align: 'right', editable: true },
  { key: 'unit',          label: 'Unit',          width: 60,  type: 'text' },
  { key: 'basis',         label: 'Basis',         width: 200, type: 'text' },
  { key: 'effectiveDate', label: 'Effective Date',width: 110, type: 'date', editable: true },
];

// Need Pencil import
import { Pencil } from 'lucide-react';

export function AssumptionsPage() {
  const [tables, setTables] = useState<AssumptionTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [modal, setModal] = useState<{ mode: 'view' | 'edit' | 'delete'; record: AssumptionTable } | null>(null);
  const [spreadsheetOpen, setSpreadsheetOpen] = useState<AssumptionTable | null>(null);

  useEffect(() => { getAssumptionTables().then(setTables).finally(() => setLoading(false)); }, []);

  async function handleSave(updated: Record<string, unknown>) {
    setTables(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } as AssumptionTable : t));
  }
  async function handleDelete(record: Record<string, unknown>) {
    setTables(prev => prev.filter(t => t.id !== record.id));
  }

  const columns: ColumnDef<AssumptionTable, unknown>[] = [
    { accessorKey: 'name', header: 'Table Name', size: 220,
      cell: ({ row }) => <span className="font-medium text-xs">{row.original.name}</span> },
    { accessorKey: 'assumptionType', header: 'Type', size: 150,
      cell: ({ row }) => <Badge variant="outline" className="capitalize text-xs">{row.original.assumptionType.replace('_', ' ')}</Badge> },
    { accessorKey: 'basis', header: 'Basis', size: 90,
      cell: ({ row }) => <span className="text-xs capitalize">{row.original.basis}</span> },
    { accessorKey: 'version', header: 'Version', size: 70,
      cell: ({ row }) => <span className="text-xs font-mono">v{row.original.version}</span> },
    { accessorKey: 'recordCount', header: 'Records', size: 80,
      cell: ({ row }) => <span className="text-xs tabular-nums">{formatNumber(row.original.recordCount ?? 0)}</span> },
    { accessorKey: 'status', header: 'Status', size: 110,
      cell: ({ row }) => <FileStatusBadge status={row.original.status} /> },
    { id: 'actions', header: '', size: 130,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="View data"
            onClick={() => setSpreadsheetOpen(row.original)}>
            <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setModal({ mode: 'view', record: row.original })}><Eye className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setModal({ mode: 'edit', record: row.original })}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
            onClick={() => setModal({ mode: 'delete', record: row.original })}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <PageHeader title="Assumption Tables" description="Mortality, lapse, expense, and behavior assumption sets"
        actions={
          <div className="flex gap-2">
            <Link to="/data/tables"><Button variant="outline" size="sm"><Table2 className="h-3.5 w-3.5" />Table Registry</Button></Link>
            <Button size="sm" onClick={() => setUploadOpen(true)}><Plus className="h-3.5 w-3.5" />Upload Table</Button>
          </div>
        }
      />
      <Card><CardContent className="p-4">
        <DataTable data={tables} columns={columns} searchPlaceholder="Search assumption tables…" />
      </CardContent></Card>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} title="Assumption Table" />
      <RecordModal open={!!modal} onClose={() => setModal(null)} mode={modal?.mode ?? 'view'} title="Assumption Table"
        record={modal?.record ?? null} fields={assumptionFields}
        onSave={handleSave} onDelete={handleDelete}
        onModeChange={mode => setModal(m => m ? { ...m, mode } : null)} />
      {spreadsheetOpen && (
        <SpreadsheetModal open={!!spreadsheetOpen} onClose={() => setSpreadsheetOpen(null)}
          fileName={spreadsheetOpen.name}
          columns={assumptionSpreadsheetCols}
          rows={assumptionRecords.filter(r => r.tableId === spreadsheetOpen.id).length
            ? assumptionRecords.filter(r => r.tableId === spreadsheetOpen.id) as unknown as Record<string, unknown>[]
            : assumptionRecords as unknown as Record<string, unknown>[]}
          readOnly={false}
        />
      )}
    </div>
  );
}

// ── Scenario Files ────────────────────────────────────────────────────────────

const scenarioFields: FieldDef[] = [
  { key: 'id', label: 'File ID', type: 'readonly', group: 'Metadata' },
  { key: 'name', label: 'File Name', editable: true, required: true, group: 'Metadata' },
  { key: 'scenarioType', label: 'Scenario Type', type: 'select', options: ['deterministic', 'stochastic', 'stress'], editable: true, group: 'Metadata' },
  { key: 'interestRatePath', label: 'IR Path', editable: true, group: 'Metadata' },
  { key: 'scenarioCount', label: 'Scenario Count', type: 'number', group: 'Data' },
  { key: 'description', label: 'Description', type: 'textarea', editable: true, group: 'Metadata' },
  { key: 'status', label: 'Status', type: 'badge', badgeMap: { validated: 'success', failed: 'destructive', validating: 'warning', uploaded: 'info', pending: 'secondary' }, group: 'Status' },
  { key: 'uploadedBy', label: 'Uploaded By', type: 'readonly', group: 'Status' },
  { key: 'uploadedAt', label: 'Upload Date', type: 'readonly', group: 'Status' },
];

// Generate scenario spreadsheet rows
const scenarioRows = Array.from({ length: 40 }, (_, i) => ({
  scenarioId: `SCN-${String(i + 1).padStart(3, '0')}`,
  description: i === 0 ? 'Base (Best Estimate)' : i < 13 ? `Stress ${['+50bps', '+100bps', '+200bps', '+300bps', '-50bps', '-100bps', '-200bps', '-300bps', 'Flat', 'Inverted', 'Steepened', 'Flattened'][i - 1]}` : `Stochastic Path ${i - 12}`,
  yr1Rate: parseFloat((4.5 + Math.sin(i * 0.8) * 2.5).toFixed(3)),
  yr5Rate: parseFloat((4.8 + Math.cos(i * 0.5) * 2.2).toFixed(3)),
  yr10Rate: parseFloat((5.1 + Math.sin(i * 0.3) * 1.8).toFixed(3)),
  yr20Rate: parseFloat((5.3 + Math.cos(i * 0.2) * 1.5).toFixed(3)),
  yr30Rate: parseFloat((5.5 + Math.sin(i * 0.15) * 1.2).toFixed(3)),
  equity: parseFloat((7.0 + Math.sin(i * 0.6) * 4).toFixed(2)),
  credit: parseFloat((1.5 + Math.abs(Math.sin(i * 0.4)) * 1).toFixed(3)),
  inflation: parseFloat((2.5 + Math.sin(i * 0.7) * 0.8).toFixed(3)),
  type: i === 0 ? 'Base' : i < 13 ? 'Stress' : 'Stochastic',
}));

const scenarioSpreadsheetCols: SpreadsheetColumn[] = [
  { key: 'scenarioId',  label: 'Scenario ID', width: 100, type: 'text' },
  { key: 'type',        label: 'Type',        width: 90,  type: 'badge', badgeMap: { Base: 'success', Stress: 'warning', Stochastic: 'info' } },
  { key: 'description', label: 'Description', width: 200, type: 'text' },
  { key: 'yr1Rate',     label: '1Y Rate (%)', width: 95,  type: 'number', align: 'right', editable: true },
  { key: 'yr5Rate',     label: '5Y Rate (%)', width: 95,  type: 'number', align: 'right', editable: true },
  { key: 'yr10Rate',    label: '10Y Rate (%)' ,width: 95, type: 'number', align: 'right', editable: true },
  { key: 'yr20Rate',    label: '20Y Rate (%)', width: 95, type: 'number', align: 'right', editable: true },
  { key: 'yr30Rate',    label: '30Y Rate (%)', width: 95, type: 'number', align: 'right', editable: true },
  { key: 'equity',      label: 'Equity (%)',  width: 90,  type: 'number', align: 'right' },
  { key: 'credit',      label: 'Credit Sprd',  width: 90, type: 'number', align: 'right' },
  { key: 'inflation',   label: 'Inflation (%)', width: 95, type: 'number', align: 'right' },
];

export function ScenariosPage() {
  const [files, setFiles] = useState<ScenarioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [modal, setModal] = useState<{ mode: 'view' | 'edit' | 'delete'; record: ScenarioFile } | null>(null);
  const [spreadsheetOpen, setSpreadsheetOpen] = useState<ScenarioFile | null>(null);

  useEffect(() => { getScenarioFiles().then(setFiles).finally(() => setLoading(false)); }, []);

  async function handleSave(updated: Record<string, unknown>) {
    setFiles(prev => prev.map(f => f.id === updated.id ? { ...f, ...updated } as ScenarioFile : f));
  }
  async function handleDelete(record: Record<string, unknown>) {
    setFiles(prev => prev.filter(f => f.id !== record.id));
  }

  const columns: ColumnDef<ScenarioFile, unknown>[] = [
    { accessorKey: 'name', header: 'File Name', size: 240,
      cell: ({ row }) => <span className="font-medium text-xs">{row.original.name}</span> },
    { accessorKey: 'scenarioType', header: 'Type', size: 110,
      cell: ({ row }) => {
        const v = { stochastic: 'info', stress: 'warning', deterministic: 'secondary' } as const;
        return <Badge {...getBadgeStyleProps(v[row.original.scenarioType] ?? 'secondary', 'capitalize')}>{row.original.scenarioType}</Badge>;
      }},
    { accessorKey: 'scenarioCount', header: 'Scenarios', size: 90,
      cell: ({ row }) => <span className="text-xs tabular-nums font-medium">{formatNumber(row.original.scenarioCount)}</span> },
    { accessorKey: 'interestRatePath', header: 'IR Path', size: 90,
      cell: ({ row }) => <span className="text-xs font-mono">{row.original.interestRatePath}</span> },
    { accessorKey: 'status', header: 'Status', size: 110,
      cell: ({ row }) => <FileStatusBadge status={row.original.status} /> },
    { id: 'actions', header: '', size: 130,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setSpreadsheetOpen(row.original)}>
            <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setModal({ mode: 'view', record: row.original })}><Eye className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setModal({ mode: 'edit', record: row.original })}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
            onClick={() => setModal({ mode: 'delete', record: row.original })}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <PageHeader title="Scenario Files" description="Interest rate and economic scenario sets"
        actions={<Button size="sm" onClick={() => setUploadOpen(true)}><Plus className="h-3.5 w-3.5" />Upload Scenarios</Button>}
      />
      <div className="grid grid-cols-3 gap-4">
        {(['stochastic', 'deterministic', 'stress'] as const).map(type => (
          <Card key={type}><CardContent className="p-4">
            <p className="text-xs text-[--color-muted-foreground] capitalize">{type}</p>
            <p className="text-2xl font-bold">{files.filter(f => f.scenarioType === type).length}</p>
            <p className="text-xs text-[--color-muted-foreground]">{formatNumber(files.filter(f => f.scenarioType === type).reduce((a, b) => a + b.scenarioCount, 0))} scenarios</p>
          </CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4">
        <DataTable data={files} columns={columns} searchPlaceholder="Search scenario files…" />
      </CardContent></Card>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} title="Scenario File" accept=".csv" />
      <RecordModal open={!!modal} onClose={() => setModal(null)} mode={modal?.mode ?? 'view'} title="Scenario File"
        record={modal?.record ?? null} fields={scenarioFields}
        onSave={handleSave} onDelete={handleDelete}
        onModeChange={mode => setModal(m => m ? { ...m, mode } : null)} />
      {spreadsheetOpen && (
        <SpreadsheetModal open={!!spreadsheetOpen} onClose={() => setSpreadsheetOpen(null)}
          fileName={spreadsheetOpen.name} columns={scenarioSpreadsheetCols}
          rows={scenarioRows as unknown as Record<string, unknown>[]} readOnly={false} />
      )}
    </div>
  );
}

// ── Factor Files ──────────────────────────────────────────────────────────────

const factorFields: FieldDef[] = [
  { key: 'id', label: 'File ID', type: 'readonly', group: 'Metadata' },
  { key: 'name', label: 'File Name', editable: true, required: true, group: 'Metadata' },
  { key: 'factorType', label: 'Factor Type', type: 'select', editable: true,
    options: ['crediting_rate', 'mortality_improvement', 'shock_lapse', 'spread'], group: 'Metadata' },
  { key: 'version', label: 'Version', editable: true, group: 'Metadata' },
  { key: 'description', label: 'Description', type: 'textarea', editable: true, group: 'Metadata' },
  { key: 'recordCount', label: 'Record Count', type: 'number', group: 'Data' },
  { key: 'status', label: 'Status', type: 'badge', badgeMap: { validated: 'success', failed: 'destructive', validating: 'warning', uploaded: 'info', pending: 'secondary' }, group: 'Status' },
];

const factorSpreadsheetCols: SpreadsheetColumn[] = [
  { key: 'product',     label: 'Product',          width: 90,  type: 'text' },
  { key: 'duration',    label: 'Duration',          width: 90,  type: 'text' },
  { key: 'rateGroup',   label: 'Rate Group',        width: 95,  type: 'text' },
  { key: 'factor',      label: 'Factor Value',      width: 105, type: 'number', align: 'right', editable: true },
  { key: 'unit',        label: 'Unit',              width: 70,  type: 'text' },
  { key: 'effectiveDate', label: 'Effective Date',  width: 110, type: 'date', editable: true },
  { key: 'expiryDate',  label: 'Expiry Date',       width: 100, type: 'date', editable: true },
  { key: 'notes',       label: 'Notes',             width: 200, type: 'text', editable: true },
];

const factorRows = Array.from({ length: 30 }, (_, i) => ({
  product: ['MYGA', 'FIA', 'RILA', 'SPIA', 'DI'][i % 5],
  duration: `Year ${(i % 6) + 1}`,
  rateGroup: ['A', 'B', 'C', 'D'][i % 4],
  factor: parseFloat((0.85 + (i % 10) * 0.03 + Math.sin(i) * 0.05).toFixed(4)),
  unit: '%',
  effectiveDate: '2025-01-01',
  expiryDate: '2025-12-31',
  notes: i % 5 === 0 ? 'Reviewed Q4 2024' : '',
}));

export function FactorFilesPage() {
  const [files, setFiles] = useState<FactorFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [modal, setModal] = useState<{ mode: 'view' | 'edit' | 'delete'; record: FactorFile } | null>(null);
  const [spreadsheetOpen, setSpreadsheetOpen] = useState<FactorFile | null>(null);

  useEffect(() => { getFactorFiles().then(setFiles).finally(() => setLoading(false)); }, []);

  async function handleSave(updated: Record<string, unknown>) {
    setFiles(prev => prev.map(f => f.id === updated.id ? { ...f, ...updated } as FactorFile : f));
  }
  async function handleDelete(record: Record<string, unknown>) {
    setFiles(prev => prev.filter(f => f.id !== record.id));
  }

  const columns: ColumnDef<FactorFile, unknown>[] = [
    { accessorKey: 'name', header: 'File Name', size: 240,
      cell: ({ row }) => <span className="font-medium text-xs">{row.original.name}</span> },
    { accessorKey: 'factorType', header: 'Type', size: 160,
      cell: ({ row }) => <Badge variant="outline" className="capitalize text-xs">{row.original.factorType.replace(/_/g, ' ')}</Badge> },
    { accessorKey: 'version', header: 'Version', size: 80,
      cell: ({ row }) => <span className="text-xs font-mono">v{row.original.version}</span> },
    { accessorKey: 'recordCount', header: 'Records', size: 80,
      cell: ({ row }) => <span className="text-xs tabular-nums">{formatNumber(row.original.recordCount ?? 0)}</span> },
    { accessorKey: 'status', header: 'Status', size: 110,
      cell: ({ row }) => <FileStatusBadge status={row.original.status} /> },
    { id: 'actions', header: '', size: 130,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setSpreadsheetOpen(row.original)}>
            <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setModal({ mode: 'view', record: row.original })}><Eye className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setModal({ mode: 'edit', record: row.original })}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
            onClick={() => setModal({ mode: 'delete', record: row.original })}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <PageHeader title="Factor Files" description="Crediting rates, mortality improvement, lapse shock, and spread factors"
        actions={<Button size="sm" onClick={() => setUploadOpen(true)}><Plus className="h-3.5 w-3.5" />Upload Factors</Button>}
      />
      <Card><CardContent className="p-4">
        <DataTable data={files} columns={columns} searchPlaceholder="Search factor files…" />
      </CardContent></Card>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} title="Factor File" accept=".xlsx,.csv" />
      <RecordModal open={!!modal} onClose={() => setModal(null)} mode={modal?.mode ?? 'view'} title="Factor File"
        record={modal?.record ?? null} fields={factorFields}
        onSave={handleSave} onDelete={handleDelete}
        onModeChange={mode => setModal(m => m ? { ...m, mode } : null)} />
      {spreadsheetOpen && (
        <SpreadsheetModal open={!!spreadsheetOpen} onClose={() => setSpreadsheetOpen(null)}
          fileName={spreadsheetOpen.name} columns={factorSpreadsheetCols}
          rows={factorRows as unknown as Record<string, unknown>[]} readOnly={false} />
      )}
    </div>
  );
}

// ── Asset Positions (kept simple, with view modal) ────────────────────────────

const mockAssets = [
  { id: '1', name: 'UST_10Y_Portfolio.csv', type: 'Treasury', marketValue: 1_240_000_000, duration: 8.4, yield_pct: 4.32, date: '2024-12-31', cusip: '912810RB4', quantity: 12_500_000, bookValue: 1_198_000_000 },
  { id: '2', name: 'IG_Corporate_Portfolio.csv', type: 'IG Corporate', marketValue: 980_000_000, duration: 6.1, yield_pct: 5.12, date: '2024-12-31', cusip: 'Mixed', quantity: 9_800_000, bookValue: 945_000_000 },
  { id: '3', name: 'HY_Bond_Portfolio.csv', type: 'High Yield', marketValue: 340_000_000, duration: 4.2, yield_pct: 7.44, date: '2024-12-31', cusip: 'Mixed', quantity: 3_400_000, bookValue: 315_000_000 },
  { id: '4', name: 'MBS_Portfolio.csv', type: 'MBS/ABS', marketValue: 560_000_000, duration: 5.8, yield_pct: 5.67, date: '2024-12-31', cusip: 'Mixed', quantity: 5_600_000, bookValue: 538_000_000 },
  { id: '5', name: 'Municipal_Portfolio.csv', type: 'Municipal', marketValue: 220_000_000, duration: 7.2, yield_pct: 3.88, date: '2024-12-31', cusip: 'Mixed', quantity: 2_200_000, bookValue: 212_000_000 },
];

const assetFields: FieldDef[] = [
  { key: 'id', label: 'ID', type: 'readonly' },
  { key: 'name', label: 'Portfolio File', editable: true, required: true },
  { key: 'type', label: 'Asset Class', type: 'select', options: ['Treasury', 'IG Corporate', 'High Yield', 'MBS/ABS', 'Municipal', 'Equity'], editable: true },
  { key: 'marketValue', label: 'Market Value ($)', type: 'number', editable: true },
  { key: 'bookValue', label: 'Book Value ($)', type: 'number', editable: true },
  { key: 'duration', label: 'Duration (yrs)', type: 'number', editable: true },
  { key: 'yield_pct', label: 'Yield (%)', type: 'number', editable: true },
  { key: 'date', label: 'As of Date', type: 'date', editable: true },
];

export function AssetPositionsPage() {
  const [assets, setAssets] = useState(mockAssets);
  const [modal, setModal] = useState<{ mode: 'view' | 'edit' | 'delete'; record: typeof mockAssets[0] } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const columns: ColumnDef<typeof mockAssets[0], unknown>[] = [
    { accessorKey: 'name', header: 'File Name', cell: ({ row }) => <span className="font-medium text-xs">{row.original.name}</span> },
    { accessorKey: 'type', header: 'Asset Class', cell: ({ row }) => <Badge variant="outline" className="text-xs">{row.original.type}</Badge> },
    { accessorKey: 'marketValue', header: 'Market Value', cell: ({ row }) => <span className="text-xs tabular-nums">{formatCurrency(row.original.marketValue, true)}</span> },
    { accessorKey: 'duration', header: 'Duration', cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.duration.toFixed(1)} yrs</span> },
    { accessorKey: 'yield_pct', header: 'Yield', cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.yield_pct.toFixed(2)}%</span> },
    { accessorKey: 'date', header: 'As of Date', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.date)}</span> },
    { id: 'actions', header: '', size: 110, cell: ({ row }) => (
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({ mode: 'view', record: row.original })}><Eye className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({ mode: 'edit', record: row.original })}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setModal({ mode: 'delete', record: row.original })}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Asset Positions / Cashflows" description="Investment portfolio positions"
        actions={<Button size="sm" onClick={() => setUploadOpen(true)}><Plus className="h-3.5 w-3.5" />Upload Portfolio</Button>}
      />
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-[--color-muted-foreground]">Total Market Value</p><p className="text-2xl font-bold">{formatCurrency(assets.reduce((a,b) => a+b.marketValue, 0), true)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[--color-muted-foreground]">Avg Duration</p><p className="text-2xl font-bold">6.5 yrs</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[--color-muted-foreground]">Avg Yield</p><p className="text-2xl font-bold">5.18%</p></CardContent></Card>
      </div>
      <Card><CardContent className="p-4">
        <DataTable data={assets} columns={columns} searchPlaceholder="Search asset files…" />
      </CardContent></Card>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} title="Asset Portfolio" />
      <RecordModal open={!!modal} onClose={() => setModal(null)} mode={modal?.mode ?? 'view'} title="Asset Portfolio"
        record={modal?.record ?? null} fields={assetFields}
        onSave={async (u) => setAssets(prev => prev.map(a => a.id === u.id ? { ...a, ...u } as typeof mockAssets[0] : a))}
        onDelete={async (r) => setAssets(prev => prev.filter(a => a.id !== r.id))}
        onModeChange={mode => setModal(m => m ? { ...m, mode } : null)} />
    </div>
  );
}

// ── Product Mapping ───────────────────────────────────────────────────────────

const mockMappings = [
  { id: '1', adminCode: 'MYG-3-PLUS', productCode: 'MYGA', modelCode: 'MYGA_3YR', rateGroup: 'A', description: 'MYGA 3-Year Guarantee Period', active: true },
  { id: '2', adminCode: 'MYG-5-PLUS', productCode: 'MYGA', modelCode: 'MYGA_5YR', rateGroup: 'B', description: 'MYGA 5-Year Guarantee Period', active: true },
  { id: '3', adminCode: 'FIA-S&P-CAP', productCode: 'FIA', modelCode: 'FIA_SP_CAP', rateGroup: 'C', description: 'FIA S&P500 Cap Strategy', active: true },
  { id: '4', adminCode: 'FIA-PTP-PR', productCode: 'FIA', modelCode: 'FIA_PTP', rateGroup: 'C', description: 'FIA Point-to-Point w/ Participation Rate', active: true },
  { id: '5', adminCode: 'RILA-10-BUF', productCode: 'RILA', modelCode: 'RILA_10', rateGroup: 'D', description: 'RILA 10% Buffer Strategy', active: true },
  { id: '6', adminCode: 'SPI-JNT-LF', productCode: 'SPIA', modelCode: 'SPIA_JNTLF', rateGroup: 'E', description: 'SPIA Joint Life with Period Certain', active: false },
];

const mappingFields: FieldDef[] = [
  { key: 'id', label: 'ID', type: 'readonly' },
  { key: 'adminCode', label: 'Admin Code', editable: true, required: true },
  { key: 'productCode', label: 'Product', type: 'select', options: ['MYGA', 'SPIA', 'FIA', 'RILA', 'Disability'], editable: true },
  { key: 'modelCode', label: 'Model Code', editable: true, required: true },
  { key: 'rateGroup', label: 'Rate Group', type: 'select', options: ['A', 'B', 'C', 'D', 'E', 'F'], editable: true },
  { key: 'description', label: 'Description', editable: true, type: 'textarea' },
  { key: 'active', label: 'Active', type: 'select', options: ['true', 'false'], editable: true },
];

export function ProductMappingPage() {
  const [mappings, setMappings] = useState(mockMappings);
  const [modal, setModal] = useState<{ mode: 'view' | 'edit' | 'delete'; record: typeof mockMappings[0] } | null>(null);

  const columns: ColumnDef<typeof mockMappings[0], unknown>[] = [
    { accessorKey: 'adminCode', header: 'Admin Code', cell: ({ row }) => <span className="font-mono text-xs">{row.original.adminCode}</span> },
    { accessorKey: 'productCode', header: 'Product', cell: ({ row }) => <Badge variant="outline">{row.original.productCode}</Badge> },
    { accessorKey: 'modelCode', header: 'Model Code', cell: ({ row }) => <span className="font-mono text-xs">{row.original.modelCode}</span> },
    { accessorKey: 'rateGroup', header: 'Rate Group', cell: ({ row }) => <span className="text-xs">{row.original.rateGroup}</span> },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => <span className="text-xs">{row.original.description}</span> },
    { accessorKey: 'active', header: 'Active', cell: ({ row }) => <Badge {...getBadgeStyleProps(row.original.active ? 'success' : 'secondary')}>{row.original.active ? 'Active' : 'Inactive'}</Badge> },
    { id: 'actions', header: '', size: 110, cell: ({ row }) => (
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({ mode: 'view', record: row.original })}><Eye className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({ mode: 'edit', record: row.original })}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setModal({ mode: 'delete', record: row.original })}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Product Mapping" description="Map admin system product codes to actuarial model identifiers"
        actions={<Button size="sm"><Plus className="h-3.5 w-3.5" />Add Mapping</Button>}
      />
      <Card><CardContent className="p-4">
        <DataTable data={mappings} columns={columns} searchPlaceholder="Search mappings…" />
      </CardContent></Card>

      <RecordModal open={!!modal} onClose={() => setModal(null)} mode={modal?.mode ?? 'view'} title="Product Mapping"
        record={modal?.record ?? null} fields={mappingFields}
        onSave={async (u) => setMappings(prev => prev.map(m => m.id === u.id ? { ...m, ...u } as typeof mockMappings[0] : m))}
        onDelete={async (r) => setMappings(prev => prev.filter(m => m.id !== r.id))}
        onModeChange={mode => setModal(m => m ? { ...m, mode } : null)} />
    </div>
  );
}
