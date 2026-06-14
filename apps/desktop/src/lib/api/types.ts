export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface HealthResponse {
  status: string;
  app: string;
  version: string;
}

export interface SystemStatusResponse {
  api: {
    status: string;
    version: string;
  };
  app: {
    name: string;
    environment: string;
  };
  database: {
    status: string;
  };
}