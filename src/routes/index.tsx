import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import {
  InforceFilesPage, AssumptionsPage, ScenariosPage,
  FactorFilesPage, AssetPositionsPage, ProductMappingPage,
} from '@/pages/data/DataPages';
import { TableRegistryPage, TableDetailPage } from '@/pages/data/TablePages';
import { ProductDetailPage } from '@/pages/products/ProductDetailPage';
import {
  RunListPage, CreateRunPage, RunDetailPage, RunStatusPage,
} from '@/pages/runs/RunPages';
import {
  CashflowReportPage, ReserveReportPage, AccountValueReportPage,
  ClaimsReportPage, BenefitsReportPage, FeesReportPage, ReconciliationReportPage,
} from '@/pages/reports/ReportPages';
import {
  ProductAssumptionsSettingsPage, ModelVersionsSettingsPage, UsersSettingsPage,
} from '@/pages/settings/SettingsPages';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },

      // Data Management
      { path: 'data/inforce',     element: <InforceFilesPage /> },
      { path: 'data/assumptions', element: <AssumptionsPage /> },
      { path: 'data/scenarios',   element: <ScenariosPage /> },
      { path: 'data/factors',     element: <FactorFilesPage /> },
      { path: 'data/assets',      element: <AssetPositionsPage /> },
      { path: 'data/mapping',     element: <ProductMappingPage /> },

      // Table Registry (1D/2D/3D)
      { path: 'data/tables',          element: <TableRegistryPage /> },
      { path: 'data/tables/:tableId', element: <TableDetailPage /> },

      // Products
      { path: 'products/:productCode', element: <ProductDetailPage /> },
      { path: 'products', element: <Navigate to="/products/MYGA" replace /> },

      // Runs
      { path: 'runs',        element: <RunListPage /> },
      { path: 'runs/new',    element: <CreateRunPage /> },
      { path: 'runs/status', element: <RunStatusPage /> },
      { path: 'runs/:runId', element: <RunDetailPage /> },

      // Reports
      { path: 'reports/cashflows',      element: <CashflowReportPage /> },
      { path: 'reports/reserves',       element: <ReserveReportPage /> },
      { path: 'reports/account-value',  element: <AccountValueReportPage /> },
      { path: 'reports/claims',         element: <ClaimsReportPage /> },
      { path: 'reports/benefits',       element: <BenefitsReportPage /> },
      { path: 'reports/fees',           element: <FeesReportPage /> },
      { path: 'reports/reconciliation', element: <ReconciliationReportPage /> },
      { path: 'reports', element: <Navigate to="/reports/cashflows" replace /> },

      // Settings
      { path: 'settings/assumptions', element: <ProductAssumptionsSettingsPage /> },
      { path: 'settings/models',      element: <ModelVersionsSettingsPage /> },
      { path: 'settings/users',       element: <UsersSettingsPage /> },
      { path: 'settings', element: <Navigate to="/settings/assumptions" replace /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
