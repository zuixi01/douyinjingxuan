const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const API_RETRY_COOLDOWN_MS = 30_000;
const API_TIMEOUT_MS = 10_000;
const HEALTH_TIMEOUT_MS = 3_000;

let availabilityPromise = null;
let lastKnownAvailable = null;
let nextRetryAt = 0;

export class ApiError extends Error {
  constructor(message, { status = null, code = "request_failed" } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function fetchWithTimeout(url, options, timeoutMs, readResponse = (response) => response) {
  const controller = new AbortController();
  const externalSignal = options.signal;
  let timedOut = false;
  const abort = () => controller.abort();
  if (externalSignal?.aborted) abort();
  else externalSignal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return await readResponse(response);
  } catch (error) {
    if (timedOut) throw new ApiError("请求超时，请稍后重试", { code: "timeout" });
    if (controller.signal.aborted) throw new ApiError("请求已取消", { code: "aborted" });
    if (error instanceof ApiError) throw error;
    if (error instanceof SyntaxError) throw new ApiError("服务返回的数据格式无效", { code: "invalid_response" });
    throw new ApiError("无法连接服务，请检查网络或后端状态", { code: "network" });
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", abort);
  }
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = typeof data === "object" && data ? data.detail : data;
    const message = typeof detail === "string" ? detail : Array.isArray(detail)
      ? detail.map((entry) => entry.msg ?? "请求参数无效").join("；")
      : "";
    throw new ApiError(message || `请求失败: ${response.status}`, { status: response.status, code: "http" });
  }

  return data;
}

export async function apiRequest(path, options = {}) {
  return fetchWithTimeout(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  }, API_TIMEOUT_MS, parseResponse);
}

export async function isApiReachable() {
  if (typeof fetch !== "function") return false;

  const now = Date.now();
  if (lastKnownAvailable === false && now < nextRetryAt) {
    return false;
  }

  if (availabilityPromise) {
    return availabilityPromise;
  }

  availabilityPromise = fetchWithTimeout(`${API_BASE_URL}/api/health`, {}, HEALTH_TIMEOUT_MS)
    .then((response) => {
      const ok = response.ok;
      lastKnownAvailable = ok;
      nextRetryAt = ok ? 0 : Date.now() + API_RETRY_COOLDOWN_MS;
      return ok;
    })
    .catch(() => {
      lastKnownAvailable = false;
      nextRetryAt = Date.now() + API_RETRY_COOLDOWN_MS;
      return false;
    })
    .finally(() => {
      availabilityPromise = null;
    });

  return availabilityPromise;
}

export function markApiUnavailable() {
  lastKnownAvailable = false;
  nextRetryAt = Date.now() + API_RETRY_COOLDOWN_MS;
  availabilityPromise = null;
}
