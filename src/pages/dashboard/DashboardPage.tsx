import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, getRecentActivity, getRuns } from '@/lib/api';
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/utils';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Skeleton, Badge,
} from '@/components/ui';
import { RunStatusBadge } from '@/components/status/StatusBadges';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import {
  Activity, Play, Database, TrendingUp, AlertCircle,
  CheckCircle2, Clock, ArrowUpRight,
} from 'lucide-react';
import type { ProjectionRun, RecentActivity } from '@/lib/types';

const chartData = [
  { month: 'Jul', reserve: 8100, premium: 680, cashflow: 142 },
  { month: 'Aug', reserve: 8180, premium: 695, cashflow: 138 },
  { month: 'Sep', reserve: 8240, premium: 710, cashflow: 145 },
  { month: 'Oct', reserve: 8310, premium: 720, cashflow: 151 },
  { month: 'Nov', reserve: 8380, premium: 730, cashflow: 148 },
  { month: 'Dec', reserve: 8417, premium: 735, cashflow: 155 },
];

const productMix = [
  { product: 'MYGA', reserve: 2215, premium: 2140, policies: 18452 },
  { product: 'SPIA', reserve: 892,  premium: 780,  policies: 5233 },
  { product: 'FIA',  reserve: 3680, premium: 3450, policies: 22187 },
  { product: 'RILA', reserve: 1318, premium: 1220, policies: 8764 },
  { product: 'DI',   reserve: 312,  premium: 145,  policies: 3890 },
];

function StatCard({ label, value, icon: Icon, color, change, sub }: {
  label: string; value: string; icon: React.ElementType; color: string; change?: string; sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-[--color-muted-foreground] uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
            {sub && <p className="text-xs text-[--color-muted-foreground] mt-0.5">{sub}</p>}
            {change && <p className="text-xs text-green-600 font-medium mt-1">{change}</p>}
          </div>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityIcon({ type }: { type: RecentActivity['type'] }) {
  if (type === 'run_completed') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (type === 'run_failed') return <AlertCircle className="h-4 w-4 text-red-500" />;
  if (type === 'run_created') return <Play className="h-4 w-4 text-blue-500" />;
  return <Database className="h-4 w-4 text-[--color-muted-foreground]" />;
}

export function DashboardPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDashboardStats>> | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [runs, setRuns] = useState<ProjectionRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), getRecentActivity(), getRuns()])
      .then(([s, a, r]) => { setStats(s); setActivity(a); setRuns(r.slice(0, 5)); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="col-span-2 h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Actuarial projection platform overview — Q4 2024"
        actions={
          <Link to="/runs/new">
            <Button size="sm"><Play className="h-3.5 w-3.5" />New Run</Button>
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Reserve" value={formatCurrency(stats!.totalReserve, true)} icon={TrendingUp} color="bg-blue-600" change="+2.4% vs Q3" sub="All products" />
        <StatCard label="Total Premium" value={formatCurrency(stats!.totalPremium, true)} icon={Activity} color="bg-indigo-600" change="+1.8% vs Q3" sub="In-force" />
        <StatCard label="Total Policies" value={formatNumber(stats!.totalPolicies)} icon={Database} color="bg-violet-600" change="+892 new" sub="Q4 2024" />
        <StatCard label="Active Runs" value={String(stats!.activeRuns)} icon={Play} color="bg-emerald-600" sub={`${stats!.completedRuns} completed · ${stats!.failedRuns} failed`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Reserve trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Reserve & Premium Trend (6-Month)</CardTitle>
            <CardDescription>Values in $M</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="premGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown, name: unknown) => [`$${Number(v).toFixed(0)}M`, String(name)]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="reserve" name="Reserve ($M)" stroke="#3b82f6" fill="url(#resGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="premium" name="Premium ($M)" stroke="#6366f1" fill="url(#premGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Product mix */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Reserve by Product</CardTitle>
            <CardDescription>Values in $M</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={productMix} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="product" tick={{ fontSize: 11 }} width={36} />
                <Tooltip formatter={(v: unknown) => [`$${Number(v).toFixed(0)}M`]} />
                <Bar dataKey="reserve" name="Reserve ($M)" fill="#3b82f6" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent runs + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent runs */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Recent Projection Runs</CardTitle>
              <CardDescription>Latest 5 runs</CardDescription>
            </div>
            <Link to="/runs">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                View all <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[--color-border]">
              {runs.map(run => (
                <div key={run.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <Link to={`/runs/${run.id}`} className="text-sm font-medium hover:text-[--color-primary] truncate block">
                      {run.name}
                    </Link>
                    <p className="text-xs text-[--color-muted-foreground]">
                      {run.product} · {formatNumber(run.policyCount)} policies · {run.createdBy.split('@')[0]}
                    </p>
                  </div>
                  <RunStatusBadge status={run.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[--color-border]">
              {activity.slice(0, 5).map(act => (
                <div key={act.id} className="flex gap-2.5 px-4 py-2.5">
                  <div className="shrink-0 mt-0.5">
                    <ActivityIcon type={act.type} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs leading-snug">{act.message}</p>
                    <p className="text-[10px] text-[--color-muted-foreground] mt-0.5">
                      {act.user.split('@')[0]} · {formatDateTime(act.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
