import { invokeIpc } from "./client";
import type { ApiResult, SystemStatusResponse } from "./types";

function isSystemStatusResponse(value: unknown): value is SystemStatusResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  const api = candidate.api as Record<string, unknown> | undefined;
  const app = candidate.app as Record<string, unknown> | undefined;
  const database = candidate.database as Record<string, unknown> | undefined;

  return Boolean(
    api &&
      app &&
      database &&
      typeof api.status === "string" &&
      typeof api.version === "string" &&
      typeof app.name === "string" &&
      typeof app.environment === "string" &&
      typeof database.status === "string",
  );
}

async function getSystemStatus(): Promise<ApiResult<SystemStatusResponse>> {
  const result = await invokeIpc<unknown>("system:status");
  if (!result.ok) return result;

  if (!isSystemStatusResponse(result.data)) {
    return { ok: false, error: "Invalid system status response" };
  }

  return { ok: true, data: result.data };
}

export const systemStatusApi = {
  getSystemStatus,
};