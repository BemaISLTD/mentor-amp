import { invokeIpc } from "./client";
import type { ApiResult, HealthResponse } from "./types";

function isHealthResponse(value: unknown): value is HealthResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.status === "string" &&
    typeof candidate.app === "string" &&
    typeof candidate.version === "string"
  );
}

async function getHealth(): Promise<ApiResult<HealthResponse>> {
  const result = await invokeIpc<unknown>("health:check");
  if (!result.ok) return result;

  if (!isHealthResponse(result.data)) {
    return { ok: false, error: "Invalid health response" };
  }

  return { ok: true, data: result.data };
}

export const healthApi = {
  getHealth,
};