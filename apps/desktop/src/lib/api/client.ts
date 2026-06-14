import type { ApiResult } from "./types";

export async function invokeIpc<T>(channel: string): Promise<ApiResult<T>> {
  try {
    const data = await window.ipcRenderer.invoke(channel);
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Request failed" };
  }
}