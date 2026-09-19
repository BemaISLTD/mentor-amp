import { useEffect, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { RecordModal, type FieldDef } from '@/components/data-table/RecordModal';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge, Skeleton, Tabs, TabsList, TabsTrigger, TabsContent, getBadgeStyleProps,
  Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Separator, Alert, AlertTitle, AlertDescription,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Input, Label,
} from '@/components/ui';
import { getModelVersions, getUsers } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { ModelVersion, SystemUser } from '@/lib/types';
import {
  Plus, CheckCircle2, AlertCircle, Users, Cpu, Sliders,
  Shield, Pencil, Trash2, Eye, Save,
} from 'lucide-react';

const assumptionSettings = [
  {
    product: 'MYGA', table: 'BaseAssumptions_2024.xlsx', version: '3.2', lastUpdated: '2024-11-01',
    assumptions: [
      { id: 'a1', name: 'Mortality', basis: '2015 VBT + MP-2023', status: 'current', value: '100%', effectiveDate: '2024-01-01' },
      { id: 'a2', name: 'Lapse', basis: 'Company experience 2019–2023', status: 'current', value: 'Dynamic', effectiveDate: '2024-01-01' },
      { id: 'a3', name: 'Expenses', basis: 'Per policy $45/yr + 0.8% premium', status: 'current', value: '$45 + 0.8%', effectiveDate: '2024-01-01' },
      { id: 'a4', name: 'Crediting Rate', basis: 'Declared rate ladder Q4-2024', status: 'current', value: '4.75–5.75%', effectiveDate: '2024-10-01' },
    ],
  },
  {
    product: 'FIA', table: 'BaseAssumptions_2024.xlsx', version: '3.1', lastUpdated: '2024-11-01',
    assumptions: [
      { id: 'b1', name: 'Mortality', basis: '2015 VBT + MP-2023', status: 'current', value: '100%', effectiveDate: '2024-01-01' },
      { id: 'b2', name: 'Lapse / Shock Lapse', basis: 'AG 49-A dynamic lapse model', status: 'current', value: 'Dynamic', effectiveDate: '2024-01-01' },
      { id: 'b3', name: 'Cap / Participation Rate', basis: 'Q4-2024 declared crediting', status: 'review', value: '9.5% cap', effectiveDate: '2024-10-01' },
      { id: 'b4', name: 'Index Option Cost', basis: 'Black-Scholes at-the-money', status: 'current', value: '3.2%', effectiveDate: '2024-01-01' },
    ],
  },
  {
    product: 'SPIA', table: 'BaseAssumptions_2024.xlsx', version: '3.2', lastUpdated: '2024-11-01',
    assumptions: [
      { id: 'c1', name: 'Mortality (Annuity 2000)', basis: 'IAM 2012 + Scale G2', status: 'current', value: '100%', effectiveDate: '2024-01-01' },
      { id: 'c2', name: 'Improvement Scale', basis: 'Scale G2 (NAIC)', status: 'review', value: 'G2', effectiveDate: '2024-01-01' },
      { id: 'c3', name: 'Payment Mode', basis: 'Monthly (actual 30/360)', status: 'current', value: 'Monthly', effectiveDate: '2024-01-01' },
    ],
  },
];

const assumptionRowFields: FieldDef[] = [
  { key: 'id', label: 'ID', type: 'readonly' },
  { key: 'name', label: 'Assumption Name', editable: true, required: true },
  { key: 'basis', label: 'Basis / Source', editable: true, required: true, type: 'textarea' },
  { key: 'value', label: 'Current Value', editable: true },
  { key: 'effectiveDate', label: 'Effective Date', type: 'date', editable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['current', 'review', 'deprecated'], editable: true },
];

export function ProductAssumptionsSettingsPage() {
  const [settings, setSettings] = useState(assumptionSettings);
  const [modal, setModal] = useState<{ mode: 'view' | 'edit' | 'delete'; record: Record<string, unknown>; product: string } | null>(null);

  function handleSave(updated: Record<string, unknown>) {
    setSettings(prev => prev.map(prod => ({
      ...prod,
      assumptions: prod.assumptions.map(a => a.id === updated.id ? { ...a, ...updated } as typeof a : a),
    })));
  }
  function handleDelete(record: Record<string, unknown>) {
    setSettings(prev => prev.map(prod => ({
      ...prod,
      assumptions: prod.assumptions.filter(a => a.id !== record.id),
    })));
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Product Assumptions" description="Default actuarial assumption sets assigned to each product"
        actions={<Button size="sm"><Plus className="h-3.5 w-3.5" />New Assumption Set</Button>}
      />
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Assumption Review Due</AlertTitle>
        <AlertDescription>FIA cap/participation rate assumptions flagged for quarterly review.</AlertDescription>
      </Alert>
      <div className="space-y-4">
        {settings.map(prod => (
          <Card key={prod.product}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="outline">{prod.product}</Badge>{prod.table}
                  </CardTitle>
                  <CardDescription>v{prod.version} · Last updated {formatDate(prod.lastUpdated)}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <UITable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assumption</TableHead><TableHead>Basis / Source</TableHead>
                    <TableHead>Value</TableHead><TableHead>Effective</TableHead>
                    <TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prod.assumptions.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs font-medium">{a.name}</TableCell>
                      <TableCell className="text-xs text-[--color-muted-foreground]">{a.basis}</TableCell>
                      <TableCell className="text-xs font-mono">{a.value}</TableCell>
                      <TableCell className="text-xs">{formatDate(a.effectiveDate)}</TableCell>
                      <TableCell><Badge {...getBadgeStyleProps(a.status === 'current' ? 'success' : a.status === 'review' ? 'warning' : 'secondary', 'capitalize')}>{a.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({ mode: 'view', record: a as unknown as Record<string, unknown>, product: prod.product })}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({ mode: 'edit', record: a as unknown as Record<string, unknown>, product: prod.product })}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setModal({ mode: 'delete', record: a as unknown as Record<string, unknown>, product: prod.product })}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </UITable>
            </CardContent>
          </Card>
        ))}
      </div>
      <RecordModal open={!!modal} onClose={() => setModal(null)} mode={modal?.mode ?? 'view'}
        title={`${modal?.product ?? ''} Assumption`} record={modal?.record ?? null} fields={assumptionRowFields}
        onSave={async (u) => handleSave(u)} onDelete={async (r) => handleDelete(r)}
        onModeChange={mode => setModal(m => m ? { ...m, mode } : null)} />
    </div>
  );
}

const modelVersionFields: FieldDef[] = [
  { key: 'id', label: 'ID', type: 'readonly', group: 'Metadata' },
  { key: 'version', label: 'Version String', editable: true, required: true, group: 'Metadata' },
  { key: 'name', label: 'Display Name', editable: true, required: true, group: 'Metadata' },
  { key: 'releaseDate', label: 'Release Date', type: 'date', editable: true, group: 'Metadata' },
  { key: 'status', label: 'Status', type: 'select', options: ['current', 'deprecated', 'beta'], editable: true, group: 'Metadata' },
];

export function ModelVersionsSettingsPage() {
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: 'view' | 'edit' | 'delete'; record: ModelVersion } | null>(null);

  useEffect(() => { getModelVersions().then(setVersions).finally(() => setLoading(false)); }, []);

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <PageHeader title="Model Versions" description="Manage actuarial model version lifecycle"
        actions={<Button size="sm" variant="outline"><Cpu className="h-3.5 w-3.5" />Request Beta Access</Button>}
      />
      <div className="space-y-4">
        {versions.map(v => (
          <Card key={v.id} className={v.status === 'current' ? 'border-blue-200 dark:border-blue-800' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{v.name}</p>
                    <Badge {...getBadgeStyleProps(v.status === 'current' ? 'success' : v.status === 'beta' ? 'info' : 'secondary', 'capitalize')}>{v.status}</Badge>
                  </div>
                  <p className="text-xs text-[--color-muted-foreground] mb-3">Released: {formatDate(v.releaseDate)} · Products: {v.products.join(', ')}</p>
                  <ul className="space-y-1">
                    {v.changes.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />{c}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setModal({ mode: 'view', record: v })}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setModal({ mode: 'edit', record: v })}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setModal({ mode: 'delete', record: v })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <RecordModal open={!!modal} onClose={() => setModal(null)} mode={modal?.mode ?? 'view'} title="Model Version"
        record={modal?.record ?? null} fields={modelVersionFields}
        onSave={async (u) => setVersions(prev => prev.map(v => v.id === u.id ? { ...v, ...u } as ModelVersion : v))}
        onDelete={async (r) => setVersions(prev => prev.filter(v => v.id !== r.id))}
        onModeChange={mode => setModal(m => m ? { ...m, mode } : null)} />
    </div>
  );
}

const userFields: FieldDef[] = [
  { key: 'id', label: 'User ID', type: 'readonly', group: 'Identity' },
  { key: 'name', label: 'Full Name', editable: true, required: true, group: 'Identity' },
  { key: 'email', label: 'Email Address', editable: true, required: true, group: 'Identity' },
  { key: 'role', label: 'Role', type: 'select', options: ['admin', 'actuary', 'analyst', 'viewer'], editable: true, group: 'Access' },
  { key: 'department', label: 'Department', editable: true, group: 'Access' },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'], editable: true, group: 'Access' },
  { key: 'lastLogin', label: 'Last Login', type: 'readonly', group: 'Activity' },
];

export function UsersSettingsPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('users');
  const [modal, setModal] = useState<{ mode: 'view' | 'edit' | 'delete'; record: SystemUser } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('analyst');

  useEffect(() => { getUsers().then(setUsers).finally(() => setLoading(false)); }, []);

  const columns: ColumnDef<SystemUser, unknown>[] = [
    { accessorKey: 'name', header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-[--color-primary] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {row.original.name.split(' ').map(n => n[0]).join('').slice(0,2)}
          </div>
          <div>
            <p className="text-xs font-medium">{row.original.name}</p>
            <p className="text-xs text-[--color-muted-foreground]">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    { accessorKey: 'role', header: 'Role', size: 90,
      cell: ({ row }) => <Badge {...getBadgeStyleProps(row.original.role === 'admin' ? 'destructive' : row.original.role === 'actuary' ? 'info' : row.original.role === 'analyst' ? 'success' : 'secondary', 'capitalize')}>{row.original.role}</Badge>,
    },
    { accessorKey: 'department', header: 'Department', size: 160, cell: ({ row }) => <span className="text-xs">{row.original.department}</span> },
    { accessorKey: 'lastLogin', header: 'Last Login', size: 130,
      cell: ({ row }) => <span className="text-xs text-[--color-muted-foreground]">{row.original.lastLogin === 'Never' ? 'Never' : formatDateTime(row.original.lastLogin)}</span> },
    { accessorKey: 'status', header: 'Status', size: 90,
      cell: ({ row }) => <Badge {...getBadgeStyleProps(row.original.status === 'active' ? 'success' : 'secondary', 'capitalize')}>{row.original.status}</Badge>,
    },
    { id: 'actions', header: '', size: 110,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({ mode: 'view', record: row.original })}><Eye className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({ mode: 'edit', record: row.original })}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setModal({ mode: 'delete', record: row.original })}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <PageHeader title="Users & System Settings" description="Manage platform users, roles, permissions, and system configuration"
        actions={<Button size="sm" onClick={() => setInviteOpen(true)}><Plus className="h-3.5 w-3.5" />Invite User</Button>}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="users"><Users className="h-3.5 w-3.5 mr-1.5" />Users ({users.length})</TabsTrigger>
          <TabsTrigger value="roles"><Shield className="h-3.5 w-3.5 mr-1.5" />Roles</TabsTrigger>
          <TabsTrigger value="system"><Sliders className="h-3.5 w-3.5 mr-1.5" />System</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card><CardContent className="p-4">
            <DataTable data={users} columns={columns} searchPlaceholder="Search users…" />
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="roles">
          <Card>
            <CardHeader><CardTitle className="text-sm">Role Permissions Matrix</CardTitle></CardHeader>
            <CardContent className="p-0">
              <UITable>
                <TableHeader><TableRow>
                  <TableHead>Permission</TableHead>
                  <TableHead className="text-center">Viewer</TableHead><TableHead className="text-center">Analyst</TableHead>
                  <TableHead className="text-center">Actuary</TableHead><TableHead className="text-center">Admin</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {[
                    ['View Dashboard & Reports', true, true, true, true],
                    ['Upload Data Files', false, true, true, true],
                    ['Edit File Records', false, true, true, true],
                    ['View Spreadsheet Data', true, true, true, true],
                    ['Edit Spreadsheet Data', false, false, true, true],
                    ['Edit 1D/2D/3D Tables', false, false, true, true],
                    ['Create Projection Runs', false, true, true, true],
                    ['Submit / Execute Runs', false, false, true, true],
                    ['Cancel / Delete Runs', false, false, false, true],
                    ['Manage Model Versions', false, false, false, true],
                    ['Invite & Manage Users', false, false, false, true],
                  ].map(([perm, ...perms]) => (
                    <TableRow key={perm as string}>
                      <TableCell className="text-xs">{perm}</TableCell>
                      {(perms as boolean[]).map((allowed, i) => (
                        <TableCell key={i} className="text-center">
                          {allowed ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-[--color-muted-foreground]">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </UITable>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="system">
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: 'Compute Configuration', items: [['Max Concurrent Runs','4'],['Compute Nodes','8 (auto-scale to 32)'],['Memory per Node','64 GB'],['Max Scenarios per Run','5,000'],['Max Policies per Run','250,000']] },
              { title: 'Data Retention', items: [['Run Results Retention','7 years'],['Audit Log Retention','10 years'],['File Versioning','Last 10 versions'],['Archive Storage','AWS S3 Glacier'],['Backup Frequency','Daily + WAL']] },
              { title: 'Integration Settings', items: [['Admin System API','Connected (v2.3)'],['GL Export Format','SAP FI/CO XML'],['LDAP / SSO','Active Directory'],['Email Notifications','SendGrid (enabled)'],['Webhook Alerts','3 endpoints configured']] },
              { title: 'Model Governance', items: [['Current Model Version','v3.2 (production)'],['Review Cycle','Quarterly'],['Approval Workflow','2-level (peer + CISO)'],['Audit Trail','Enabled'],['Change Log Retention','Indefinite']] },
            ].map(section => (
              <Card key={section.title}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{section.title}</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {section.items.map(([k,v]) => (
                    <div key={k} className="flex justify-between px-4 py-2 border-b border-[--color-border] last:border-0">
                      <span className="text-xs text-[--color-muted-foreground]">{k}</span>
                      <span className="text-xs font-medium">{v}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <RecordModal open={!!modal} onClose={() => setModal(null)} mode={modal?.mode ?? 'view'} title="User"
        record={modal?.record ?? null} fields={userFields}
        onSave={async (u) => setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ...u } as SystemUser : x))}
        onDelete={async (r) => setUsers(prev => prev.filter(u => u.id !== r.id))}
        onModeChange={mode => setModal(m => m ? { ...m, mode } : null)} />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Invite New User</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Email Address</Label>
              <Input className="mt-1" placeholder="user@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div>
              <Label>Role</Label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-[--color-input] bg-transparent px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[--color-ring]">
                {['viewer','analyst','actuary','admin'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!inviteEmail.includes('@')) return;
              setUsers(prev => [...prev, { id: `usr-${Date.now()}`, name: inviteEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()), email: inviteEmail, role: inviteRole as SystemUser['role'], lastLogin: 'Never', status: 'active', department: 'Pending' }]);
              setInviteEmail(''); setInviteOpen(false);
            }} disabled={!inviteEmail.includes('@')}><Save className="h-3.5 w-3.5" />Send Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
