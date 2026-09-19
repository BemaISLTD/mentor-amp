import { useEffect, useState } from 'react';
import { getCashflows, getReserves, getAccountValues, getClaims } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge, Skeleton, Tabs, TabsList, TabsTrigger, TabsContent, getBadgeStyleProps,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import type { CashflowRow, ReserveRow, AccountValueRow, ClaimRow } from '@/lib/types';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download, RefreshCw } from 'lucide-react';

const DEMO_RUN_ID = 'run-001';

function ReportHeader({ title, description }: { title: string; description: string }) {
  return (
    <PageHeader
      title={title}
      description={description}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" />Export CSV</Button>
          <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" />Export Excel</Button>
        </div>
      }
    />
  );
}

// ── Cashflow Report ───────────────────────────────────────────────────────────

export function CashflowReportPage() {
  const [data, setData] = useState<CashflowRow[]>([]);
  const [scenario, setScenario] = useState('Base');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCashflows(DEMO_RUN_ID, scenario).then(setData).finally(() => setLoading(false));
  }, [scenario]);

  const filtered = data.filter(r => r.scenario === scenario);

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <ReportHeader title="Cashflow Report" description="Projected premiums, benefits, claims, expenses and net cashflow" />

      <div className="flex items-center gap-3">
        <span className="text-sm text-[--color-muted-foreground]">Scenario:</span>
        <Select value={scenario} onValueChange={setScenario}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['Base', '+200 bps', '-200 bps'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="ml-auto">{formatNumber(filtered.length)} periods · Run: Q4-2024 MYGA Base</Badge>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Premiums', value: formatCurrency(filtered.reduce((a, r) => a + r.premiums, 0), true) },
          { label: 'Total Benefits', value: formatCurrency(filtered.reduce((a, r) => a + r.benefits, 0), true) },
          { label: 'Total Claims', value: formatCurrency(filtered.reduce((a, r) => a + r.claims, 0), true) },
          { label: 'Net Cashflow', value: formatCurrency(filtered.reduce((a, r) => a + r.netCashflow, 0), true) },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-xs text-[--color-muted-foreground]">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cashflow Waterfall — {scenario}</CardTitle>
          <CardDescription>Values in $M</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={filtered.map(r => ({
              ...r,
              period: r.period.split('-')[0],
              premiums: r.premiums / 1e6,
              benefits: -(r.benefits / 1e6),
              claims: -(r.claims / 1e6),
              expenses: -(r.expenses / 1e6),
            }))} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${v}M`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => [`$${Math.abs(Number(v)).toFixed(0)}M`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="premiums" name="Premiums" fill="#22c55e" stackId="a" />
              <Bar dataKey="benefits" name="Benefits (out)" fill="#ef4444" stackId="a" />
              <Bar dataKey="claims" name="Claims (out)" fill="#f97316" stackId="a" />
              <Bar dataKey="expenses" name="Expenses (out)" fill="#a855f7" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <UITable>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Premiums</TableHead>
                <TableHead className="text-right">Benefits</TableHead>
                <TableHead className="text-right">Claims</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Net Cashflow</TableHead>
                <TableHead className="text-right">Reserve</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(row => (
                <TableRow key={row.period}>
                  <TableCell className="text-xs font-mono">{row.period}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-green-700">{formatCurrency(row.premiums, true)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-red-600">{formatCurrency(row.benefits, true)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-orange-600">{formatCurrency(row.claims, true)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{formatCurrency(row.expenses, true)}</TableCell>
                  <TableCell className={`text-xs text-right tabular-nums font-medium ${row.netCashflow >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {formatCurrency(row.netCashflow, true)}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{formatCurrency(row.reserves, true)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </UITable>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Reserve Report ────────────────────────────────────────────────────────────

export function ReserveReportPage() {
  const [data, setData] = useState<ReserveRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getReserves(DEMO_RUN_ID).then(setData).finally(() => setLoading(false)); }, []);

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <ReportHeader title="Reserve Report" description="Gross, ceded, and net statutory and GAAP reserves by period" />
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Latest Gross Reserve', value: formatCurrency(data[0]?.grossReserve ?? 0, true) },
          { label: 'Latest Ceded Reserve', value: formatCurrency(data[0]?.cededReserve ?? 0, true) },
          { label: 'Latest Net Reserve', value: formatCurrency(data[0]?.netReserve ?? 0, true) },
        ].map(s => <Card key={s.label}><CardContent className="p-4">
          <p className="text-xs text-[--color-muted-foreground]">{s.label}</p>
          <p className="text-xl font-bold mt-1">{s.value}</p>
        </CardContent></Card>)}
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Reserve Runoff ($M)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.map(r => ({
              period: r.period.split('-')[0],
              gross: r.grossReserve / 1e6,
              ceded: r.cededReserve / 1e6,
              net: r.netReserve / 1e6,
            }))} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${v}M`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => [`$${Number(v).toFixed(0)}M`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="gross" name="Gross Reserve" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="net" name="Net Reserve" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <UITable>
            <TableHeader><TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Gross Reserve</TableHead>
              <TableHead className="text-right">Ceded Reserve</TableHead>
              <TableHead className="text-right">Net Reserve</TableHead>
              <TableHead className="text-right">Policies</TableHead>
              <TableHead className="text-right">Avg Reserve/Policy</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map(row => (
                <TableRow key={row.period}>
                  <TableCell className="text-xs font-mono">{row.period}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{formatCurrency(row.grossReserve, true)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-[--color-muted-foreground]">({formatCurrency(row.cededReserve, true)})</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-medium">{formatCurrency(row.netReserve, true)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{formatNumber(row.policyCount)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{formatCurrency(row.netReserve / row.policyCount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </UITable>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Account Value Report ──────────────────────────────────────────────────────

export function AccountValueReportPage() {
  const [data, setData] = useState<AccountValueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getAccountValues(DEMO_RUN_ID).then(setData).finally(() => setLoading(false)); }, []);

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <ReportHeader title="Account Value Report" description="Projected AV rollforward: premiums, credits, withdrawals, surrenders, deaths" />
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Account Value Rollforward ($M)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.map(r => ({
              period: r.period.split('-')[0],
              beginAV: r.beginningAV / 1e6,
              premiums: r.premiums / 1e6,
              credited: r.credited / 1e6,
              outflows: -(r.withdrawals + r.surrenders + r.deaths) / 1e6,
            }))} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => [`$${Math.abs(Number(v)).toFixed(0)}M`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="premiums" name="Premiums" fill="#22c55e" stackId="a" />
              <Bar dataKey="credited" name="Interest Credited" fill="#3b82f6" stackId="a" />
              <Bar dataKey="outflows" name="Outflows" fill="#ef4444" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <UITable>
            <TableHeader><TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Beg AV</TableHead>
              <TableHead className="text-right">Premiums</TableHead>
              <TableHead className="text-right">Credited</TableHead>
              <TableHead className="text-right">Withdrawals</TableHead>
              <TableHead className="text-right">Surrenders</TableHead>
              <TableHead className="text-right">Deaths</TableHead>
              <TableHead className="text-right">End AV</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map(row => (
                <TableRow key={row.period}>
                  <TableCell className="text-xs font-mono">{row.period}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{formatCurrency(row.beginningAV, true)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-green-700">{formatCurrency(row.premiums, true)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-blue-600">{formatCurrency(row.credited, true)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-orange-600">({formatCurrency(row.withdrawals, true)})</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-red-600">({formatCurrency(row.surrenders, true)})</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-[--color-muted-foreground]">({formatCurrency(row.deaths, true)})</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-medium">{formatCurrency(row.endingAV, true)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </UITable>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Claims Report ─────────────────────────────────────────────────────────────

export function ClaimsReportPage() {
  const [data, setData] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getClaims(DEMO_RUN_ID).then(setData).finally(() => setLoading(false)); }, []);

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <ReportHeader title="Claims Report" description="Projected death claims, disability benefits, surrenders, and maturities" />
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Death Claims', value: formatCurrency(data.reduce((a, r) => a + r.deathClaims, 0), true) },
          { label: 'Total Surrenders', value: formatCurrency(data.reduce((a, r) => a + r.surrenderValues, 0), true) },
          { label: 'Maturity Benefits', value: formatCurrency(data.reduce((a, r) => a + r.maturityBenefits, 0), true) },
          { label: 'Total Claims', value: formatCurrency(data.reduce((a, r) => a + r.totalClaims, 0), true) },
        ].map(s => <Card key={s.label}><CardContent className="p-4">
          <p className="text-xs text-[--color-muted-foreground]">{s.label}</p>
          <p className="text-xl font-bold mt-1">{s.value}</p>
        </CardContent></Card>)}
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Claims by Type ($M)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.map(r => ({
              period: r.period.split('-')[0],
              deaths: r.deathClaims / 1e6,
              surrenders: r.surrenderValues / 1e6,
              maturities: r.maturityBenefits / 1e6,
            }))} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${v}M`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => [`$${Number(v).toFixed(0)}M`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="deaths" name="Death Claims" fill="#ef4444" stackId="a" />
              <Bar dataKey="surrenders" name="Surrenders" fill="#f97316" stackId="a" />
              <Bar dataKey="maturities" name="Maturities" fill="#8b5cf6" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <UITable>
            <TableHeader><TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Death Claims</TableHead>
              <TableHead className="text-right">Disability</TableHead>
              <TableHead className="text-right">Surrenders</TableHead>
              <TableHead className="text-right">Maturities</TableHead>
              <TableHead className="text-right">Total Claims</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map(row => (
                <TableRow key={row.period}>
                  <TableCell className="text-xs font-mono">{row.period}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{formatCurrency(row.deathClaims, true)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-[--color-muted-foreground]">{row.disabilityClaims ? formatCurrency(row.disabilityClaims, true) : '—'}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{formatCurrency(row.surrenderValues, true)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{row.maturityBenefits > 0 ? formatCurrency(row.maturityBenefits, true) : '—'}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-medium">{formatCurrency(row.totalClaims, true)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </UITable>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Benefits Report ───────────────────────────────────────────────────────────

const benefitsData = Array.from({ length: 10 }, (_, i) => ({
  year: 2025 + i,
  guaranteedBenefits: 45_000_000 + i * 4_000_000,
  livingBenefits: i > 2 ? 12_000_000 + i * 2_000_000 : 0,
  deathBenefits: 22_000_000 + i * 1_500_000,
  annuityPayments: i > 0 ? 8_000_000 + i * 800_000 : 0,
}));

export function BenefitsReportPage() {
  return (
    <div className="space-y-4">
      <ReportHeader title="Benefits Report" description="Guaranteed benefits, living benefits, death benefits, and annuity payments" />
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Guaranteed Benefits', value: formatCurrency(benefitsData.reduce((a, r) => a + r.guaranteedBenefits, 0), true) },
          { label: 'Living Benefits', value: formatCurrency(benefitsData.reduce((a, r) => a + r.livingBenefits, 0), true) },
          { label: 'Death Benefits', value: formatCurrency(benefitsData.reduce((a, r) => a + r.deathBenefits, 0), true) },
          { label: 'Annuity Payments', value: formatCurrency(benefitsData.reduce((a, r) => a + r.annuityPayments, 0), true) },
        ].map(s => <Card key={s.label}><CardContent className="p-4">
          <p className="text-xs text-[--color-muted-foreground]">{s.label}</p>
          <p className="text-xl font-bold mt-1">{s.value}</p>
        </CardContent></Card>)}
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Benefits by Type ($M)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={benefitsData.map(r => ({
              year: String(r.year),
              guaranteed: r.guaranteedBenefits / 1e6,
              living: r.livingBenefits / 1e6,
              death: r.deathBenefits / 1e6,
              annuity: r.annuityPayments / 1e6,
            }))} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${v}M`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => [`$${Number(v).toFixed(0)}M`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="guaranteed" name="Guaranteed" fill="#3b82f6" stackId="a" />
              <Bar dataKey="living" name="Living Benefits" fill="#22c55e" stackId="a" />
              <Bar dataKey="death" name="Death Benefits" fill="#ef4444" stackId="a" />
              <Bar dataKey="annuity" name="Annuity Payments" fill="#8b5cf6" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <UITable>
            <TableHeader><TableRow>
              <TableHead>Year</TableHead>
              <TableHead className="text-right">Guaranteed</TableHead>
              <TableHead className="text-right">Living Benefits</TableHead>
              <TableHead className="text-right">Death Benefits</TableHead>
              <TableHead className="text-right">Annuity Payments</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {benefitsData.map(row => {
                const total = row.guaranteedBenefits + row.livingBenefits + row.deathBenefits + row.annuityPayments;
                return (
                  <TableRow key={row.year}>
                    <TableCell className="text-xs">{row.year}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{formatCurrency(row.guaranteedBenefits, true)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.livingBenefits > 0 ? formatCurrency(row.livingBenefits, true) : '—'}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{formatCurrency(row.deathBenefits, true)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.annuityPayments > 0 ? formatCurrency(row.annuityPayments, true) : '—'}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-medium">{formatCurrency(total, true)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </UITable>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Fees Report ───────────────────────────────────────────────────────────────

const feesData = Array.from({ length: 10 }, (_, i) => ({
  year: 2025 + i,
  adminFees: 8_500_000 - i * 300_000,
  mortalityCharges: 4_200_000 + i * 200_000,
  surrenderCharges: i < 6 ? 12_000_000 - i * 2_000_000 : 0,
  riderCharges: 3_800_000 - i * 150_000,
  investmentMgmt: 6_200_000 - i * 250_000,
}));

export function FeesReportPage() {
  return (
    <div className="space-y-4">
      <ReportHeader title="Fees Report" description="Projected administrative fees, mortality charges, surrender charges, and rider fees" />
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Admin Fees', value: formatCurrency(feesData.reduce((a, r) => a + r.adminFees, 0), true) },
          { label: 'Total M&E Charges', value: formatCurrency(feesData.reduce((a, r) => a + r.mortalityCharges, 0), true) },
          { label: 'Total Surrender Charges', value: formatCurrency(feesData.reduce((a, r) => a + r.surrenderCharges, 0), true) },
        ].map(s => <Card key={s.label}><CardContent className="p-4">
          <p className="text-xs text-[--color-muted-foreground]">{s.label}</p>
          <p className="text-xl font-bold mt-1">{s.value}</p>
        </CardContent></Card>)}
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Fee Income by Type ($M)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={feesData.map(r => ({
              year: String(r.year),
              admin: r.adminFees / 1e6,
              mortality: r.mortalityCharges / 1e6,
              surrender: r.surrenderCharges / 1e6,
              rider: r.riderCharges / 1e6,
            }))} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${v}M`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => [`$${Number(v).toFixed(1)}M`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="admin" name="Admin Fees" stroke="#3b82f6" strokeWidth={2} />
              <Line dataKey="mortality" name="M&E Charges" stroke="#ef4444" strokeWidth={2} />
              <Line dataKey="surrender" name="Surrender Charges" stroke="#f97316" strokeWidth={2} />
              <Line dataKey="rider" name="Rider Charges" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Reconciliation Report ─────────────────────────────────────────────────────

const reconData = [
  { label: 'Prior Period Reserve (Q3 2024)', prior: 2_080_000_000, current: 2_080_000_000, variance: 0, pct: 0 },
  { label: 'New Business', prior: 0, current: 168_000_000, variance: 168_000_000, pct: null },
  { label: 'Interest Accrual', prior: 0, current: 98_000_000, variance: 98_000_000, pct: null },
  { label: 'Lapses & Surrenders', prior: 0, current: -92_000_000, variance: -92_000_000, pct: null },
  { label: 'Deaths', prior: 0, current: -18_000_000, variance: -18_000_000, pct: null },
  { label: 'Assumption Change', prior: 0, current: -21_000_000, variance: -21_000_000, pct: null },
  { label: 'Current Period Reserve (Q4 2024)', prior: 2_080_000_000, current: 2_215_000_000, variance: 135_000_000, pct: 6.5 },
];

export function ReconciliationReportPage() {
  return (
    <div className="space-y-4">
      <ReportHeader title="Reconciliation Report" description="Quarter-over-quarter reserve movement and variance analysis" />
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-[--color-muted-foreground]">Q3 2024 Reserve</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(2_080_000_000, true)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-[--color-muted-foreground]">Q4 2024 Reserve</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(2_215_000_000, true)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-[--color-muted-foreground]">Quarter Movement</p>
          <p className="text-xl font-bold mt-1 text-green-600">+{formatCurrency(135_000_000, true)}</p>
          <p className="text-xs text-green-600">+6.5%</p>
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Reserve Bridge — Q3 to Q4 2024</CardTitle></CardHeader>
        <CardContent className="p-0">
          <UITable>
            <TableHeader><TableRow>
              <TableHead>Movement Component</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Direction</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {reconData.map(row => (
                <TableRow key={row.label} className={row.label.startsWith('Current') || row.label.startsWith('Prior') ? 'bg-[--color-muted]/40 font-medium' : ''}>
                  <TableCell className="text-xs">{row.label}</TableCell>
                  <TableCell className={`text-xs text-right tabular-nums font-medium ${
                    row.variance > 0 ? 'text-green-700' : row.variance < 0 ? 'text-red-600' : ''
                  }`}>
                    {row.variance !== 0 ? formatCurrency(Math.abs(row.variance), true) : formatCurrency(row.current, true)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {row.variance > 0 ? <Badge {...getBadgeStyleProps('success')}>↑ Increase</Badge> :
                     row.variance < 0 ? <Badge variant="destructive">↓ Decrease</Badge> :
                     <Badge variant="secondary">Basis</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </UITable>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Variance Commentary</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { title: 'New Business (+$168M)', body: 'Strong MYGA sales in Q4 driven by competitive crediting rates. 1,245 new policies issued at an average premium of $135K.' },
            { title: 'Interest Accrual (+$98M)', body: 'Interest accrual on existing in-force block at weighted average crediting rate of 4.72%.' },
            { title: 'Lapses & Surrenders (-$92M)', body: 'Lapse experience in line with base assumptions. Surrender charge revenue offset by AV release.' },
            { title: 'Assumption Change (-$21M)', body: 'Mortality improvement assumption updated to MP-2023 scale, reducing mortality component of reserve.' },
          ].map(item => (
            <div key={item.title} className="p-3 rounded-md bg-[--color-muted]/40">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-[--color-muted-foreground] mt-1">{item.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
