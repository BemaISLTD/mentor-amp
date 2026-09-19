import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui';
import {
  LayoutDashboard, Database, Package, Play, BarChart3, Settings,
  ChevronRight, FileText, Table2, GitBranch, Sliders,
  TrendingUp, Shield, DollarSign, Activity, FileBarChart,
  Users, Cpu, RefreshCw, Layers, Upload, Grid3x3,
} from 'lucide-react';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
  {
    label: 'Data Management', icon: <Database className="h-4 w-4" />,
    children: [
      { label: 'Inforce Files',     href: '/data/inforce',   icon: <FileText className="h-4 w-4" /> },
      { label: 'Assumption Tables', href: '/data/assumptions', icon: <Table2 className="h-4 w-4" /> },
      { label: 'Scenario Files',    href: '/data/scenarios',  icon: <GitBranch className="h-4 w-4" /> },
      { label: 'Factor Files',      href: '/data/factors',    icon: <Sliders className="h-4 w-4" /> },
      { label: 'Asset Positions',   href: '/data/assets',     icon: <TrendingUp className="h-4 w-4" /> },
      { label: 'Product Mapping',   href: '/data/mapping',    icon: <Layers className="h-4 w-4" /> },
      { label: 'Table Registry',    href: '/data/tables',     icon: <Grid3x3 className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Products', icon: <Package className="h-4 w-4" />,
    children: [
      { label: 'MYGA',       href: '/products/MYGA',       icon: <Shield className="h-4 w-4" /> },
      { label: 'SPIA',       href: '/products/SPIA',       icon: <DollarSign className="h-4 w-4" /> },
      { label: 'FIA',        href: '/products/FIA',        icon: <TrendingUp className="h-4 w-4" /> },
      { label: 'RILA',       href: '/products/RILA',       icon: <Activity className="h-4 w-4" /> },
      { label: 'Disability', href: '/products/Disability', icon: <FileBarChart className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Projection Runs', icon: <Play className="h-4 w-4" />,
    children: [
      { label: 'Run List',       href: '/runs',        icon: <Table2 className="h-4 w-4" /> },
      { label: 'Create New Run', href: '/runs/new',    icon: <Upload className="h-4 w-4" /> },
      { label: 'Run Status',     href: '/runs/status', icon: <Activity className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Reports', icon: <BarChart3 className="h-4 w-4" />,
    children: [
      { label: 'Cashflows',      href: '/reports/cashflows',      icon: <TrendingUp className="h-4 w-4" /> },
      { label: 'Reserves',       href: '/reports/reserves',       icon: <Shield className="h-4 w-4" /> },
      { label: 'Account Value',  href: '/reports/account-value',  icon: <DollarSign className="h-4 w-4" /> },
      { label: 'Claims',         href: '/reports/claims',         icon: <FileBarChart className="h-4 w-4" /> },
      { label: 'Benefits',       href: '/reports/benefits',       icon: <Activity className="h-4 w-4" /> },
      { label: 'Fees',           href: '/reports/fees',           icon: <BarChart3 className="h-4 w-4" /> },
      { label: 'Reconciliation', href: '/reports/reconciliation', icon: <RefreshCw className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Settings', icon: <Settings className="h-4 w-4" />,
    children: [
      { label: 'Product Assumptions', href: '/settings/assumptions', icon: <Sliders className="h-4 w-4" /> },
      { label: 'Model Versions',      href: '/settings/models',      icon: <Cpu className="h-4 w-4" /> },
      { label: 'Users & System',      href: '/settings/users',       icon: <Users className="h-4 w-4" /> },
    ],
  },
];

function NavGroup({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation();
  const isActive = item.children?.some(c => c.href && location.pathname.startsWith(c.href) && c.href !== '/');
  const [open, setOpen] = useState(isActive ?? false);

  if (!item.children) {
    return (
      <NavLink
        to={item.href!}
        end={item.href === '/'}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
            isActive
              ? 'bg-[--color-sidebar-accent]/20 text-[--color-sidebar-accent] font-medium'
              : 'text-[--color-sidebar-foreground]/70 hover:bg-white/5 hover:text-[--color-sidebar-foreground]',
          )
        }
      >
        {item.icon}
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    );
  }

  return (
    <Collapsible open={open && !collapsed} onOpenChange={setOpen}>
      <CollapsibleTrigger className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
        isActive
          ? 'text-[--color-sidebar-foreground] font-medium'
          : 'text-[--color-sidebar-foreground]/70 hover:bg-white/5 hover:text-[--color-sidebar-foreground]',
      )}>
        {item.icon}
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-90')} />
          </>
        )}
      </CollapsibleTrigger>
      {!collapsed && (
        <CollapsibleContent className="mt-0.5">
          <div className="ml-3 border-l border-white/10 pl-3 space-y-0.5">
            {item.children.map(child => (
              <NavLink
                key={child.href}
                to={child.href!}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                    isActive
                      ? 'bg-[--color-sidebar-accent]/20 text-[--color-sidebar-accent] font-medium'
                      : 'text-[--color-sidebar-foreground]/60 hover:bg-white/5 hover:text-[--color-sidebar-foreground]',
                  )
                }
              >
                {child.icon}
                <span>{child.label}</span>
              </NavLink>
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn(
      'flex flex-col h-full bg-[--color-sidebar] text-[--color-sidebar-foreground] transition-all duration-200',
      collapsed ? 'w-14' : 'w-56',
    )}>
      <div className={cn('flex items-center gap-2.5 px-3 py-4 border-b border-white/10', collapsed && 'justify-center')}>
        <div className="h-7 w-7 rounded-md bg-[--color-sidebar-accent] flex items-center justify-center shrink-0">
          <Activity className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold leading-none">ActuarialOS</p>
            <p className="text-[10px] text-[--color-sidebar-foreground]/50 mt-0.5">Projection Platform</p>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map(item => (
          <NavGroup key={item.label} item={item} collapsed={collapsed} />
        ))}
      </nav>
      {!collapsed && (
        <div className="p-3 border-t border-white/10">
          <p className="text-[10px] text-[--color-sidebar-foreground]/30">v3.2.0 · Production</p>
        </div>
      )}
    </div>
  );
}
