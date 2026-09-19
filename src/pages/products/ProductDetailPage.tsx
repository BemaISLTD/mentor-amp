import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProducts } from '@/lib/api';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Badge, Skeleton, Tabs, TabsList, TabsTrigger, TabsContent, getBadgeStyleProps,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import type { Product, ProductType } from '@/lib/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';

const productDescriptions: Record<ProductType, { tagline: string; features: string[]; regulatoryFramework: string[] }> = {
  MYGA: {
    tagline: 'Multi-Year Guaranteed Annuity — fixed crediting rate for a stated guarantee period',
    features: ['Guaranteed crediting rate 3–10 years', 'Principal protection', 'No market risk to policyholder', 'Tax-deferred accumulation'],
    regulatoryFramework: ['GAAP FAS 163 / ASC 944', 'Statutory AG 33', 'LDTI (ASC 944-40)', 'NYL Reg 128'],
  },
  SPIA: {
    tagline: 'Single Premium Immediate Annuity — guaranteed income starting within 1 month of premium',
    features: ['Immediate income stream', 'Life, period certain, or joint life options', 'Longevity protection', 'No accumulation phase'],
    regulatoryFramework: ['GAAP ASC 944', 'VM-01 / VM-22', 'AG Reserving Guideline 33', 'NAIC Model Reg 830'],
  },
  FIA: {
    tagline: 'Fixed Indexed Annuity — interest linked to equity index with principal protection',
    features: ['Index-linked upside (cap/participation/spread)', '0% floor — principal protected', 'Surrender charge schedule', 'Guaranteed minimum values'],
    regulatoryFramework: ['GAAP FAS 133 (derivatives)', 'Statutory AG 49-A', 'VM-21 (C3 Phase II)', 'NAIC IUL model regulation'],
  },
  RILA: {
    tagline: 'Registered Index-Linked Annuity — buffer/floor protection with higher upside potential',
    features: ['Buffer (absorbs first N% loss)', 'Higher caps than FIA', 'SEC-registered (Form N-4)', 'Index exposure with partial downside risk'],
    regulatoryFramework: ['SEC Form N-4 registration', 'GAAP ASC 944 (insurance) + derivatives', 'VM-21 stochastic reserves', 'FINRA suitability rules'],
  },
  Disability: {
    tagline: 'Individual Disability Income — monthly benefit replacing lost income due to disability',
    features: ['Own-occupation definition options', 'Benefit periods: 2 yr, 5 yr, to age 65', 'Elimination periods: 30/60/90/180 days', 'Cost-of-living adjustments (COLA)'],
    regulatoryFramework: ['GAAP FAS 60 / ASC 944-40', 'Statutory VM-25 (DI morbidity)', 'NAIC DI model regulation', 'HIPAA coordination of benefits'],
  },
};

const cohortData = [
  { year: 'Y1', beginAV: 100, credits: 4.8, withdrawals: 2.1, surrenders: 5.4, deaths: 0.3, endAV: 97.0 },
  { year: 'Y2', beginAV: 97.0, credits: 4.7, withdrawals: 2.2, surrenders: 4.8, deaths: 0.4, endAV: 94.3 },
  { year: 'Y3', beginAV: 94.3, credits: 4.6, withdrawals: 2.4, surrenders: 6.1, deaths: 0.5, endAV: 89.9 },
  { year: 'Y4', beginAV: 89.9, credits: 4.5, withdrawals: 2.5, surrenders: 5.2, deaths: 0.6, endAV: 86.1 },
  { year: 'Y5', beginAV: 86.1, credits: 4.4, withdrawals: 2.6, surrenders: 14.2, deaths: 0.7, endAV: 73.0 }, // shock lapse
  { year: 'Y6', beginAV: 73.0, credits: 3.7, withdrawals: 2.2, surrenders: 3.1, deaths: 0.6, endAV: 70.8 },
  { year: 'Y7', beginAV: 70.8, credits: 3.6, withdrawals: 2.3, surrenders: 3.0, deaths: 0.7, endAV: 68.4 },
  { year: 'Y8', beginAV: 68.4, credits: 3.5, withdrawals: 2.4, surrenders: 2.9, deaths: 0.8, endAV: 65.8 },
  { year: 'Y9', beginAV: 65.8, credits: 3.4, withdrawals: 2.5, surrenders: 2.8, deaths: 0.9, endAV: 63.0 },
  { year: 'Y10', beginAV: 63.0, credits: 3.3, withdrawals: 2.6, surrenders: 2.7, deaths: 1.0, endAV: 60.0 },
];

const lapseCurve = [
  { dur: 1, base: 8.2, stress: 12.4 }, { dur: 2, base: 5.8, stress: 9.1 },
  { dur: 3, base: 4.9, stress: 7.8 }, { dur: 4, base: 4.2, stress: 6.9 },
  { dur: 5, base: 15.1, stress: 22.3 }, { dur: 6, base: 4.0, stress: 6.2 },
  { dur: 7, base: 3.8, stress: 5.8 }, { dur: 8, base: 3.5, stress: 5.4 },
  { dur: 9, base: 3.2, stress: 4.9 }, { dur: 10, base: 2.9, stress: 4.5 },
];

export function ProductDetailPage() {
  const { productCode } = useParams<{ productCode: ProductType }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts().then(setProducts).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );

  const product = products.find(p => p.code === productCode);
  if (!product) return <div className="text-center py-16 text-[--color-muted-foreground]">Product not found.</div>;

  const meta = productDescriptions[product.code];

  return (
    <div className="space-y-5">
      <PageHeader
        title={product.name}
        description={meta.tagline}
        actions={
          <div className="flex items-center gap-2">
            <Badge {...getBadgeStyleProps(product.status === 'active' ? 'success' : 'secondary', 'capitalize')}>{product.status}</Badge>
            <Badge variant="outline">Model {product.modelVersion}</Badge>
          </div>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Policies In-Force', value: formatNumber(product.policyCount) },
          { label: 'Total Premium', value: formatCurrency(product.totalPremium, true) },
          { label: 'Total Reserve', value: formatCurrency(product.totalReserve, true) },
          { label: 'Model Version', value: product.modelVersion },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-[--color-muted-foreground]">{stat.label}</p>
              <p className="text-xl font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cashflows">Cohort Cashflows</TabsTrigger>
          <TabsTrigger value="lapse">Lapse Curve</TabsTrigger>
          <TabsTrigger value="regulatory">Regulatory</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Product Features</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {meta.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[--color-primary] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Key Metrics</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {[
                      ['Launch Date', formatDate(product.launchDate)],
                      ['Assumption Table', product.defaultAssumptionTable || 'BaseAssumptions_2024'],
                      ['Model Version', product.modelVersion],
                      ['Policies', formatNumber(product.policyCount)],
                      ['Avg Premium / Policy', formatCurrency(product.totalPremium / product.policyCount)],
                      ['Reserve / Premium', `${((product.totalReserve / product.totalPremium) * 100).toFixed(1)}%`],
                    ].map(([k, v]) => (
                      <TableRow key={k as string}>
                        <TableCell className="text-xs text-[--color-muted-foreground] py-1.5">{k}</TableCell>
                        <TableCell className="text-xs font-medium py-1.5">{v}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cashflows">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Projected Cohort Account Value Rollforward (per $100 initial AV)</CardTitle>
              <CardDescription>Base scenario — deterministic best estimate</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cohortData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[50, 110]} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="credits" name="Credits" stackId="a" fill="#22c55e" />
                  <Bar dataKey="endAV" name="End AV" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lapse">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Lapse Rate Assumption by Policy Duration</CardTitle>
              <CardDescription>Base vs. stress scenario (+50% shock)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={lapseCurve} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                  <XAxis dataKey="dur" label={{ value: 'Duration (years)', position: 'insideBottom', offset: -2, fontSize: 11 }} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: unknown) => [`${v}%`]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line dataKey="base" name="Base Lapse %" stroke="#3b82f6" strokeWidth={2} dot />
                  <Line dataKey="stress" name="Stress Lapse %" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regulatory">
          <Card>
            <CardHeader><CardTitle className="text-sm">Regulatory & Accounting Framework</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {meta.regulatoryFramework.map(r => (
                  <div key={r} className="flex items-center gap-2 p-2.5 rounded-md bg-[--color-muted]/40">
                    <Badge {...getBadgeStyleProps('info', 'text-xs')}>{r.split(' ')[0]}</Badge>
                    <span className="text-sm">{r}</span>
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
