import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(data, status = 200) {
  return { ok: status < 400, status, headers: { get: () => "application/json" }, json: async () => data };
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubEnv("VITE_API_BASE_URL", undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("API 请求", () => {
  it("保留默认本地地址并合并调用方请求头", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const { apiRequest } = await import("./apiClient");

    await apiRequest("/api/cards", { headers: { "X-Request-ID": "test" } });

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/api/cards", expect.objectContaining({
      headers: { "Content-Type": "application/json", "X-Request-ID": "test" },
    }));
  });

  it("支持自定义和同源 API 地址", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    const { apiRequest } = await import("./apiClient");
    await apiRequest("/api/cards");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/api/cards");

    vi.resetModules();
    vi.stubEnv("VITE_API_BASE_URL", "");
    const sameOriginClient = await import("./apiClient");
    await sameOriginClient.apiRequest("/api/cards");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/cards");
  });

  it("HTTP 验证失败包含状态码和可读错误信息", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: [{ msg: "分区不存在" }] }, 422)));
    const { apiRequest } = await import("./apiClient");
    await expect(apiRequest("/api/cards")).rejects.toMatchObject({
      name: "ApiError", code: "http", status: 422, message: "分区不存在",
    });
  });

  it("挂起请求到达上限后取消并返回超时错误", async () => {
    let requestSignal;
    vi.stubGlobal("fetch", vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      requestSignal = signal;
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const { apiRequest } = await import("./apiClient");
    const result = apiRequest("/api/cards").catch((error) => error);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(requestSignal.aborted).toBe(true);
    expect(await result).toMatchObject({ code: "timeout" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("健康检查超时后允许纯前端模式继续", async () => {
    vi.stubGlobal("fetch", vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const { isApiReachable } = await import("./apiClient");
    const reachable = isApiReachable();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(await reachable).toBe(false);
  });
});
