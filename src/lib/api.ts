/**
 * Mock API Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Simulates async backend calls with realistic delays.
 * INTEGRATION NOTE: Replace each function body with a real fetch() call to
 * your backend endpoint. The function signatures and return types should
 * remain the same so the UI components need no changes.
 *
 * Example replacement pattern:
 *   export async function getRuns() {
 *     const res = await fetch('/api/v1/runs', { headers: authHeaders() });
 *     if (!res.ok) throw new Error(await res.text());
 *     return res.json() as Promise<ProjectionRun[]>;
 *   }
 */

import { sleep } from './utils';
import {
  mockInforceFiles, mockAssumptionTables, mockScenarioFiles,
  mockFactorFiles, mockProducts, mockRuns, mockRunEvents,
  mockModelVersions, mockUsers, mockRecentActivity,
  mockCashflows, mockReserves, mockAccountValues, mockClaims,
} from './mock-data';
import type {
  InforceFile, AssumptionTable, ScenarioFile, FactorFile,
  Product, ProjectionRun, RunStatusEvent, ModelVersion,
  SystemUser, RecentActivity, CashflowRow, ReserveRow,
  AccountValueRow, ClaimRow,
} from './types';

// In-memory mutable store (simulates server state for this session)
let _runs: ProjectionRun[] = [...mockRuns];
let _runEvents: RunStatusEvent[] = [...mockRunEvents];

// ── Data Files ───────────────────────────────────────────────────────────────

export async function getInforceFiles(): Promise<InforceFile[]> {
  await sleep(400);
  return mockInforceFiles;
}

export async function getAssumptionTables(): Promise<AssumptionTable[]> {
  await sleep(350);
  return mockAssumptionTables;
}

export async function getScenarioFiles(): Promise<ScenarioFile[]> {
  await sleep(380);
  return mockScenarioFiles;
}

export async function getFactorFiles(): Promise<FactorFile[]> {
  await sleep(320);
  return mockFactorFiles;
}

export async function uploadFile(
  file: File,
  fileType: string,
  metadata: Record<string, string>
): Promise<{ id: string; status: 'uploaded' }> {
  // INTEGRATION NOTE: Replace with multipart/form-data POST to /api/v1/files
  await sleep(1500); // Simulate upload time
  console.log('Mock upload:', file.name, fileType, metadata);
  return { id: `file-${Date.now()}`, status: 'uploaded' };
}

export async function validateFile(fileId: string): Promise<{ valid: boolean; errors: string[] }> {
  // INTEGRATION NOTE: POST /api/v1/files/:id/validate
  await sleep(2000);
  console.log('Mock validate:', fileId);
  return { valid: true, errors: [] };
}

export async function deleteFile(fileId: string): Promise<void> {
  // INTEGRATION NOTE: DELETE /api/v1/files/:id
  await sleep(300);
  console.log('Mock delete:', fileId);
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  await sleep(300);
  return mockProducts;
}

export async function getProduct(id: string): Promise<Product | undefined> {
  await sleep(250);
  return mockProducts.find(p => p.id === id);
}

// ── Projection Runs ──────────────────────────────────────────────────────────

export async function getRuns(): Promise<ProjectionRun[]> {
  await sleep(500);
  return _runs;
}

export async function getRun(id: string): Promise<ProjectionRun | undefined> {
  await sleep(300);
  return _runs.find(r => r.id === id);
}

export async function createRun(
  data: Omit<ProjectionRun, 'id' | 'createdAt' | 'status' | 'progressPct'>
): Promise<ProjectionRun> {
  // INTEGRATION NOTE: POST /api/v1/runs — returns the created run object
  await sleep(600);
  const newRun: ProjectionRun = {
    ...data,
    id: `run-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'draft',
    progressPct: 0,
  };
  _runs = [newRun, ..._runs];
  return newRun;
}

export async function submitRun(id: string): Promise<ProjectionRun> {
  // INTEGRATION NOTE: POST /api/v1/runs/:id/submit
  await sleep(400);
  _runs = _runs.map(r =>
    r.id === id ? { ...r, status: 'queued', progressPct: 0 } : r
  );
  return _runs.find(r => r.id === id)!;
}

export async function cancelRun(id: string): Promise<void> {
  // INTEGRATION NOTE: POST /api/v1/runs/:id/cancel
  await sleep(300);
  _runs = _runs.map(r =>
    r.id === id ? { ...r, status: 'cancelled' } : r
  );
}

export async function deleteRun(id: string): Promise<void> {
  // INTEGRATION NOTE: DELETE /api/v1/runs/:id
  await sleep(300);
  _runs = _runs.filter(r => r.id !== id);
}

export async function getRunEvents(runId: string): Promise<RunStatusEvent[]> {
  await sleep(250);
  return _runEvents.filter(e => e.runId === runId);
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function getCashflows(runId: string, scenario?: string): Promise<CashflowRow[]> {
  // INTEGRATION NOTE: GET /api/v1/runs/:runId/reports/cashflows?scenario=...
  await sleep(600);
  console.log('Fetching cashflows for run:', runId);
  return scenario ? mockCashflows.filter(r => r.scenario === scenario) : mockCashflows;
}

export async function getReserves(runId: string): Promise<ReserveRow[]> {
  await sleep(550);
  return mockReserves;
}

export async function getAccountValues(runId: string): Promise<AccountValueRow[]> {
  await sleep(500);
  return mockAccountValues;
}

export async function getClaims(runId: string): Promise<ClaimRow[]> {
  await sleep(480);
  return mockClaims;
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getModelVersions(): Promise<ModelVersion[]> {
  await sleep(300);
  return mockModelVersions;
}

export async function getUsers(): Promise<SystemUser[]> {
  await sleep(350);
  return mockUsers;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getRecentActivity(): Promise<RecentActivity[]> {
  await sleep(400);
  return mockRecentActivity;
}

export async function getDashboardStats() {
  await sleep(500);
  return {
    totalRuns: _runs.length,
    completedRuns: _runs.filter(r => r.status === 'completed').length,
    activeRuns: _runs.filter(r => r.status === 'running' || r.status === 'queued').length,
    totalPolicies: 58_526,
    totalReserve: 8_417_000_000,
    totalPremium: 7_735_000_000,
    failedRuns: _runs.filter(r => r.status === 'failed').length,
  };
}
