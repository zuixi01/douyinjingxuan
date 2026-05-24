const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const API_RETRY_COOLDOWN_MS = 30_000;

let availabilityPromise = null;
let lastKnownAvailable = null;
let nextRetryAt = 0;

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = typeof data === "object" && data ? data.detail : data;
    throw new Error(detail || `请求失败: ${response.status}`);
  }

  return data;
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });
  return parseResponse(response);
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

  availabilityPromise = fetch(`${API_BASE_URL}/api/health`)
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
