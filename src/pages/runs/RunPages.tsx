import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { RunStatusBadge } from '@/components/status/StatusBadges';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge, Skeleton, Alert, AlertTitle, AlertDescription, getBadgeStyleProps,
  Tabs, TabsList, TabsTrigger, TabsContent, Progress,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Input, Label, Separator, Table as UITable, TableBody, TableCell,
  TableHead, TableHeader, TableRow, Textarea,
} from '@/components/ui';
import {
  getRuns, getRun, createRun, submitRun, cancelRun, deleteRun, getRunEvents,
  getInforceFiles, getAssumptionTables, getScenarioFiles, getFactorFiles,
} from '@/lib/api';
import {
  formatDate, formatDateTime, formatDuration, formatNumber, formatCurrency,
} from '@/lib/utils';
import type {
  ProjectionRun, RunStatusEvent, InforceFile, AssumptionTable,
  ScenarioFile, FactorFile, ProductType, ProjectionFrequency, OutputGranularity,
} from '@/lib/types';
import {
  Play, Plus, Trash2, Eye, XCircle, CheckCircle2, Clock,
  AlertCircle, Download, RefreshCw, FileText, ChevronRight,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Run List Page ─────────────────────────────────────────────────────────────

export function RunListPage() {
  const [runs, setRuns] = useState<ProjectionRun[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); getRuns().then(setRuns).finally(() => setLoading(false)); };
  useEffect(load, []);

  const handleDelete = async (id: string) => {
    await deleteRun(id);
    setRuns(prev => prev.filter(r => r.id !== id));
  };

  const handleCancel = async (id: string) => {
    await cancelRun(id);
    load();
  };

  const columns: ColumnDef<ProjectionRun, unknown>[] = [
    {
      accessorKey: 'name', header: 'Run Name', size: 260,
      cell: ({ row }) => (
        <Link to={`/runs/${row.original.id}`} className="font-medium text-xs hover:text-[--color-primary]">
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: 'product', header: 'Product', size: 80,
      cell: ({ row }) => <Badge variant="outline">{row.original.product}</Badge> },
    { accessorKey: 'scenarioCount', header: 'Scenarios', size: 80,
      cell: ({ row }) => <span className="text-xs tabular-nums">{formatNumber(row.original.scenarioCount)}</span> },
    { accessorKey: 'policyCount', header: 'Policies', size: 80,
      cell: ({ row }) => <span className="text-xs tabular-nums">{formatNumber(row.original.policyCount)}</span> },
    { accessorKey: 'status', header: 'Status', size: 110,
      cell: ({ row }) => <RunStatusBadge status={row.original.status} /> },
    { accessorKey: 'progressPct', header: 'Progress', size: 120,
      cell: ({ row }) => row.original.status === 'running' ? (
        <div className="flex items-center gap-2">
          <Progress value={row.original.progressPct} className="h-1.5 w-20" />
          <span className="text-xs">{row.original.progressPct}%</span>
        </div>
      ) : null,
    },
    { accessorKey: 'createdAt', header: 'Created', size: 120,
      cell: ({ row }) => <span className="text-xs text-[--color-muted-foreground]">{formatDate(row.original.createdAt)}</span> },
    { accessorKey: 'createdBy', header: 'By', size: 100,
      cell: ({ row }) => <span className="text-xs">{row.original.createdBy.split('@')[0]}</span> },
    {
      id: 'actions', header: '', size: 90,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link to={`/runs/${row.original.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
          </Link>
          {row.original.status === 'running' && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-500" onClick={() => handleCancel(row.original.id)}>
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(row.original.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <Skeleton className="h-64 w-full" />;

  const counts = {
    total: runs.length,
    running: runs.filter(r => r.status === 'running').length,
    completed: runs.filter(r => r.status === 'completed').length,
    failed: runs.filter(r => r.status === 'failed').length,
    queued: runs.filter(r => r.status === 'queued').length,
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projection Runs"
        description="View and manage all actuarial projection runs"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5" />Refresh</Button>
            <Link to="/runs/new"><Button size="sm"><Plus className="h-3.5 w-3.5" />New Run</Button></Link>
          </div>
        }
      />
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total', value: counts.total, color: 'text-[--color-foreground]' },
          { label: 'Running', value: counts.running, color: 'text-blue-600' },
          { label: 'Queued', value: counts.queued, color: 'text-amber-600' },
          { label: 'Completed', value: counts.completed, color: 'text-green-600' },
          { label: 'Failed', value: counts.failed, color: 'text-red-600' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-3">
              <p className="text-xs text-[--color-muted-foreground]">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <DataTable data={runs} columns={columns} searchPlaceholder="Search runs…" />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Run Status Dashboard ──────────────────────────────────────────────────────

export function RunStatusPage() {
  const [runs, setRuns] = useState<ProjectionRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRuns().then(r => setRuns(r.filter(run => ['running', 'queued'].includes(run.status)))).finally(() => setLoading(false));
    const iv = setInterval(() => {
      getRuns().then(r => setRuns(r.filter(run => ['running', 'queued'].includes(run.status))));
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Run Status Monitor"
        description="Live view of queued and running projection jobs"
        actions={<Badge {...getBadgeStyleProps(runs.length > 0 ? 'info' : 'success')}>{runs.length > 0 ? `${runs.length} active` : 'No active runs'}</Badge>}
      />
      {runs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-[--color-muted-foreground]">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
            <p className="font-medium">No active runs</p>
            <p className="text-sm mt-1">All projection jobs are idle. <Link to="/runs/new" className="text-[--color-primary]">Start a new run.</Link></p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {runs.map(run => (
            <Card key={run.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link to={`/runs/${run.id}`} className="font-semibold hover:text-[--color-primary]">{run.name}</Link>
                      <RunStatusBadge status={run.status} />
                    </div>
                    <p className="text-xs text-[--color-muted-foreground] mb-3">
                      {run.product} · {formatNumber(run.policyCount)} policies · {formatNumber(run.scenarioCount)} scenarios · Started {run.startedAt ? formatDateTime(run.startedAt) : '—'}
                    </p>
                    {run.status === 'running' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[--color-muted-foreground]">Progress</span>
                          <span className="font-medium">{run.progressPct}%</span>
                        </div>
                        <Progress value={run.progressPct} className="h-2" />
                      </div>
                    )}
                    {run.status === 'queued' && (
                      <p className="text-xs text-amber-600">Waiting for compute resources…</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/runs/${run.id}`}>
                      <Button variant="outline" size="sm" className="text-xs">Details</Button>
                    </Link>
                    <Button variant="outline" size="sm" className="text-xs text-red-600" onClick={() => cancelRun(run.id)}>
                      <XCircle className="h-3.5 w-3.5" />Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Create New Run ────────────────────────────────────────────────────────────

const runSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  product: z.enum(['MYGA', 'SPIA', 'FIA', 'RILA', 'Disability']),
  inforceFileId: z.string().min(1, 'Select an inforce file'),
  assumptionTableId: z.string().min(1, 'Select an assumption table'),
  scenarioFileId: z.string().min(1, 'Select a scenario file'),
  factorFileId: z.string().optional(),
  projectionFrequency: z.enum(['monthly', 'quarterly', 'annual']),
  projectionStartDate: z.string().min(1),
  projectionEndDate: z.string().min(1),
  outputGranularity: z.enum(['policy', 'cohort', 'product', 'portfolio']),
});

type RunFormData = z.infer<typeof runSchema>;

export function CreateRunPage() {
  const navigate = useNavigate();
  const [inforceFiles, setInforceFiles] = useState<InforceFile[]>([]);
  const [assumptions, setAssumptions] = useState<AssumptionTable[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioFile[]>([]);
  const [factors, setFactors] = useState<FactorFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getInforceFiles(), getAssumptionTables(), getScenarioFiles(), getFactorFiles()])
      .then(([inf, asmp, scen, fac]) => {
        setInforceFiles(inf.filter(f => f.status === 'validated'));
        setAssumptions(asmp.filter(f => f.status === 'validated'));
        setScenarios(scen.filter(f => f.status === 'validated'));
        setFactors(fac.filter(f => f.status === 'validated'));
      })
      .finally(() => setLoading(false));
  }, []);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<RunFormData>({
    resolver: zodResolver(runSchema),
    defaultValues: {
      projectionFrequency: 'monthly',
      projectionStartDate: '2024-12-31',
      projectionEndDate: '2054-12-31',
      outputGranularity: 'cohort',
    },
  });

  const selectedScenario = scenarios.find(s => s.id === watch('scenarioFileId'));
  const selectedInforce = inforceFiles.find(f => f.id === watch('inforceFileId'));

  async function onSubmit(data: RunFormData) {
    setSubmitting(true);
    try {
      const inforceFile = inforceFiles.find(f => f.id === data.inforceFileId)!;
      const assumptionTable = assumptions.find(f => f.id === data.assumptionTableId)!;
      const scenarioFile = scenarios.find(f => f.id === data.scenarioFileId)!;
      const factorFile = factors.find(f => f.id === data.factorFileId);

      const run = await createRun({
        ...data,
        inforceFileName: inforceFile.name,
        assumptionTableName: assumptionTable.name,
        scenarioFileName: scenarioFile.name,
        factorFileName: factorFile?.name,
        policyCount: inforceFile.policyCount,
        scenarioCount: scenarioFile.scenarioCount,
        createdBy: 'sarah.chen@company.com',
        modelVersion: 'v3.2',
      });
      await submitRun(run.id);
      navigate(`/runs/${run.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Create New Projection Run" description="Configure inputs and parameters for a new actuarial projection" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Run Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Run Name *</Label>
              <Input id="name" {...register('name')} className="mt-1" placeholder="e.g. Q4-2024 GAAP Reserve — MYGA Base" />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} className="mt-1" rows={2} placeholder="Optional description of run purpose and scope" />
            </div>
            <div>
              <Label>Product *</Label>
              <Controller
                name="product"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {(['MYGA', 'SPIA', 'FIA', 'RILA', 'Disability'] as ProductType[]).map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.product && <p className="text-xs text-red-600 mt-1">{errors.product.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Input Files */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Input Files</CardTitle><CardDescription>Only validated files are shown</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Inforce File *</Label>
              <Controller name="inforceFileId" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select inforce file" /></SelectTrigger>
                  <SelectContent>
                    {inforceFiles.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name} ({formatNumber(f.policyCount)} policies)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              {selectedInforce && <p className="text-xs text-[--color-muted-foreground] mt-1">Effective: {formatDate(selectedInforce.effectiveDate)} · {formatNumber(selectedInforce.policyCount)} policies · {formatCurrency(selectedInforce.premiumAmount, true)}</p>}
              {errors.inforceFileId && <p className="text-xs text-red-600 mt-1">Required</p>}
            </div>
            <div>
              <Label>Assumption Table *</Label>
              <Controller name="assumptionTableId" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select assumption table" /></SelectTrigger>
                  <SelectContent>
                    {assumptions.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name} (v{a.version})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              {errors.assumptionTableId && <p className="text-xs text-red-600 mt-1">Required</p>}
            </div>
            <div>
              <Label>Scenario Set *</Label>
              <Controller name="scenarioFileId" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select scenario file" /></SelectTrigger>
                  <SelectContent>
                    {scenarios.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({formatNumber(s.scenarioCount)} scenarios)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              {selectedScenario && <p className="text-xs text-[--color-muted-foreground] mt-1">{selectedScenario.scenarioType} · IR path: {selectedScenario.interestRatePath}</p>}
              {errors.scenarioFileId && <p className="text-xs text-red-600 mt-1">Required</p>}
            </div>
            <div>
              <Label>Factor File (optional)</Label>
              <Controller name="factorFileId" control={control} render={({ field }) => (
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select factor file (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None —</SelectItem>
                    {factors.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* Projection Parameters */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Projection Parameters</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Projection Start Date *</Label>
                <Input type="date" {...register('projectionStartDate')} className="mt-1" />
              </div>
              <div>
                <Label>Projection End Date *</Label>
                <Input type="date" {...register('projectionEndDate')} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Projection Frequency *</Label>
                <Controller name="projectionFrequency" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['monthly', 'quarterly', 'annual'] as ProjectionFrequency[]).map(f => (
                        <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div>
                <Label>Output Granularity *</Label>
                <Controller name="outputGranularity" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['policy', 'cohort', 'product', 'portfolio'] as OutputGranularity[]).map(g => (
                        <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link to="/runs"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Submitting…</> : <><Play className="h-3.5 w-3.5" />Submit Run</>}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Run Detail Page ───────────────────────────────────────────────────────────

const summaryMetricsData = [
  { period: '2025', reserve: 2215, cashflow: 155, av: 2100 },
  { period: '2026', reserve: 2095, cashflow: 138, av: 1980 },
  { period: '2027', reserve: 1975, cashflow: 122, av: 1860 },
  { period: '2028', reserve: 1855, cashflow: 108, av: 1740 },
  { period: '2029', reserve: 1735, cashflow: 95, av: 1620 },
  { period: '2030', reserve: 1615, cashflow: 83, av: 1500 },
];

export function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const [run, setRun] = useState<ProjectionRun | null>(null);
  const [events, setEvents] = useState<RunStatusEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!runId) return;
    Promise.all([getRun(runId), getRunEvents(runId)])
      .then(([r, e]) => { setRun(r || null); setEvents(e); })
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-80" />
      <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );

  if (!run) return (
    <div className="text-center py-20 text-[--color-muted-foreground]">
      <AlertCircle className="h-10 w-10 mx-auto mb-3" />
      <p>Run not found.</p>
      <Link to="/runs" className="text-[--color-primary] text-sm mt-2 inline-block">Back to runs</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={run.name}
        description={run.description || `${run.product} projection · ${run.modelVersion}`}
        actions={
          <div className="flex items-center gap-2">
            <RunStatusBadge status={run.status} />
            {run.status === 'completed' && (
              <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" />Download Results</Button>
            )}
          </div>
        }
      />

      {run.status === 'failed' && run.errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Run Failed</AlertTitle>
          <AlertDescription>{run.errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Product', value: run.product },
          { label: 'Policies', value: formatNumber(run.policyCount) },
          { label: 'Scenarios', value: formatNumber(run.scenarioCount) },
          { label: 'Duration', value: run.duration ? formatDuration(run.duration) : run.status === 'running' ? 'In progress' : '—' },
        ].map(m => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <p className="text-xs text-[--color-muted-foreground]">{m.label}</p>
              <p className="text-xl font-bold mt-1">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="inputs">
        <TabsList>
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="timeline">Status Timeline</TabsTrigger>
          {run.status === 'completed' && <TabsTrigger value="results">Summary Results</TabsTrigger>}
          {run.status === 'completed' && <TabsTrigger value="reports">Reports</TabsTrigger>}
        </TabsList>

        {/* Inputs */}
        <TabsContent value="inputs">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Input Files</CardTitle></CardHeader>
              <CardContent className="p-0">
                {[
                  { label: 'Inforce File', name: run.inforceFileName, id: run.inforceFileId },
                  { label: 'Assumption Table', name: run.assumptionTableName, id: run.assumptionTableId },
                  { label: 'Scenario Set', name: run.scenarioFileName, id: run.scenarioFileId },
                  ...(run.factorFileName ? [{ label: 'Factor File', name: run.factorFileName, id: run.factorFileId! }] : []),
                ].map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[--color-border] last:border-0">
                    <FileText className="h-4 w-4 text-[--color-muted-foreground] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[--color-muted-foreground]">{item.label}</p>
                      <p className="text-sm font-medium truncate">{item.name}</p>
                    </div>
                    <Badge {...getBadgeStyleProps('success', 'text-xs shrink-0')}>Validated</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Configuration</CardTitle></CardHeader>
              <CardContent className="p-0">
                {[
                  ['Model Version', run.modelVersion],
                  ['Frequency', run.projectionFrequency],
                  ['Start Date', formatDate(run.projectionStartDate)],
                  ['End Date', formatDate(run.projectionEndDate)],
                  ['Output Granularity', run.outputGranularity],
                  ['Created By', run.createdBy.split('@')[0]],
                  ['Created At', formatDateTime(run.createdAt)],
                  ...(run.startedAt ? [['Started At', formatDateTime(run.startedAt)]] : []),
                  ...(run.completedAt ? [['Completed At', formatDateTime(run.completedAt)]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between px-4 py-1.5 border-b border-[--color-border] last:border-0">
                    <span className="text-xs text-[--color-muted-foreground]">{k}</span>
                    <span className="text-xs font-medium capitalize">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-5">
              {events.length === 0 ? (
                <p className="text-sm text-[--color-muted-foreground]">No events recorded for this run yet.</p>
              ) : (
                <div className="space-y-4">
                  {events.map((evt, i) => (
                    <div key={evt.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                          evt.status === 'completed' ? 'bg-green-100 text-green-600' :
                          evt.status === 'failed' ? 'bg-red-100 text-red-600' :
                          evt.status === 'running' ? 'bg-blue-100 text-blue-600' :
                          'bg-[--color-muted] text-[--color-muted-foreground]'
                        }`}>
                          {evt.status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> :
                           evt.status === 'failed' ? <AlertCircle className="h-4 w-4" /> :
                           evt.status === 'running' ? <Play className="h-4 w-4" /> :
                           <Clock className="h-4 w-4" />}
                        </div>
                        {i < events.length - 1 && <div className="w-px flex-1 bg-[--color-border] mt-1 mb-0" />}
                      </div>
                      <div className="pb-4 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{evt.message}</p>
                          <Badge variant="outline" className="text-xs capitalize">{evt.status}</Badge>
                        </div>
                        {evt.detail && <p className="text-xs text-[--color-muted-foreground] mt-0.5">{evt.detail}</p>}
                        <p className="text-xs text-[--color-muted-foreground] mt-1">{formatDateTime(evt.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results */}
        <TabsContent value="results">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Reserve & Account Value Trend</CardTitle>
                <CardDescription>Base scenario · 6-year summary ($M)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={summaryMetricsData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: unknown) => [`$${v}M`]} />
                    <Line dataKey="reserve" name="Reserve ($M)" stroke="#3b82f6" strokeWidth={2} />
                    <Line dataKey="av" name="Account Value ($M)" stroke="#6366f1" strokeWidth={2} />
                    <Line dataKey="cashflow" name="Net Cashflow ($M)" stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Summary Metrics Table</CardTitle></CardHeader>
              <CardContent className="p-0">
                <UITable>
                  <TableHeader><TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Reserve ($M)</TableHead>
                    <TableHead className="text-right">Account Value ($M)</TableHead>
                    <TableHead className="text-right">Net Cashflow ($M)</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {summaryMetricsData.map(row => (
                      <TableRow key={row.period}>
                        <TableCell className="text-xs">{row.period}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">${row.reserve.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">${row.av.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums text-green-600">${row.cashflow.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports">
          <Card>
            <CardHeader><CardTitle className="text-sm">Downloadable Reports</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Cashflow Report', desc: 'Projected premiums, claims, benefits, expenses' },
                  { label: 'Reserve Report', desc: 'Gross/ceded/net reserves by period' },
                  { label: 'Account Value Rollforward', desc: 'AV components by cohort' },
                  { label: 'Claims Detail', desc: 'Death, disability, surrender, maturity' },
                  { label: 'Scenario Comparison', desc: 'Cross-scenario reserve and cashflow' },
                  { label: 'Reconciliation', desc: 'Prior vs current period variance analysis' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between p-3 rounded-md border border-[--color-border]">
                    <div>
                      <p className="text-sm font-medium">{r.label}</p>
                      <p className="text-xs text-[--color-muted-foreground]">{r.desc}</p>
                    </div>
                    <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" />CSV</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
