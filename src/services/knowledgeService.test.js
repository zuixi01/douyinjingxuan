import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SECTIONS = [{ id: "local-section", name: "本地分区", desc: "" }];
const ITEM = { id: "item", title: "测试视频", author: "作者", tags: [], ai: {}, category: "笔记" };
const SAVED = [{ id: "saved", itemId: "item", sectionId: "local-section", title: "已有本地记录" }];

function jsonResponse(data, status = 200) {
  return { ok: status < 400, status, headers: { get: () => "application/json" }, json: async () => data };
}

async function runMutation(operation) {
  const result = operation().then((value) => ({ value }), (error) => ({ error }));
  await vi.advanceTimersByTimeAsync(120);
  return result;
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("知识库存储模式", () => {
  it("本地初始化使用已有持久化记录并保留离线写入功能", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const { knowledgeService } = await import("./knowledgeService");

    const initial = await knowledgeService.loadInitialData(SECTIONS, SAVED);
    expect(initial).toEqual({ sections: SECTIONS, savedItems: SAVED, source: "local" });
    expect(initial.savedItems).toBe(SAVED);
    const { value: created } = await runMutation(() => knowledgeService.createSection(SECTIONS, "新分区"));
    expect(created.ok).toBe(true);
    const { value: saved } = await runMutation(() => knowledgeService.saveItem([], ITEM, SECTIONS[0].id, SECTIONS));
    expect(saved.savedItems[0].itemId).toBe(ITEM.id);
    const { value: remaining } = await runMutation(() => knowledgeService.removeItem(SAVED, ITEM.id, SECTIONS[0].id));
    expect(remaining).toEqual([]);
  });

  it("健康检查恢复后仍保持当前会话的本地模式", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const { knowledgeService } = await import("./knowledgeService");
    const { isApiReachable } = await import("./apiClient");
    await knowledgeService.loadInitialData(SECTIONS, SAVED);
    await vi.advanceTimersByTimeAsync(30_001);
    fetchMock.mockResolvedValue(jsonResponse({ status: "ok" }));
    expect(await isApiReachable()).toBe(true);
    fetchMock.mockClear();

    expect((await runMutation(() => knowledgeService.createSection(SECTIONS, "离线新分区"))).value.ok).toBe(true);
    expect(await knowledgeService.loadInitialData(SECTIONS, SAVED)).toMatchObject({ source: "local", savedItems: SAVED });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["保存视频", (service) => service.saveItem(SAVED, ITEM, SECTIONS[0].id, SECTIONS)],
    ["新建分区", (service) => service.createSection(SECTIONS, "新分区")],
    ["手动录入", (service) => service.createTextCard(SAVED, SECTIONS, { sectionId: SECTIONS[0].id, title: "文本", content: "用于测试的完整文本内容" })],
    ["删除记录", (service) => service.removeItem(SAVED, ITEM.id, SECTIONS[0].id)],
  ])("远端%s的 HTTP 失败不会变成本地成功", async (_name, operation) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: "ok" }));
    vi.stubGlobal("fetch", fetchMock);
    const { knowledgeService } = await import("./knowledgeService");
    const { value: first } = await runMutation(() => knowledgeService.createSection(SECTIONS, "初始化远端模式"));
    expect(first).toBeDefined();
    fetchMock.mockResolvedValue(jsonResponse({ detail: "远端拒绝写入" }, 503));
    const originalSections = structuredClone(SECTIONS);
    const originalSaved = structuredClone(SAVED);

    const { error, value } = await runMutation(() => operation(knowledgeService));

    expect(value).toBeUndefined();
    expect(error).toMatchObject({ status: 503, message: "远端拒绝写入" });
    expect(SECTIONS).toEqual(originalSections);
    expect(SAVED).toEqual(originalSaved);
  });

  it("远端加载失败会报告错误，后续操作仍向远端发出", async () => {
    const fetchMock = vi.fn((url) => Promise.resolve(url.endsWith("/api/health")
      ? jsonResponse({ status: "ok" })
      : jsonResponse({ detail: "服务维护中" }, 503)));
    vi.stubGlobal("fetch", fetchMock);
    const { knowledgeService } = await import("./knowledgeService");
    const { markApiUnavailable } = await import("./apiClient");

    await expect(knowledgeService.loadInitialData(SECTIONS, SAVED)).rejects.toMatchObject({ status: 503 });
    markApiUnavailable();
    fetchMock.mockClear();
    const { error } = await runMutation(() => knowledgeService.removeItem(SAVED, "item", SECTIONS[0].id));
    expect(error).toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/cards/item?"), expect.objectContaining({ method: "DELETE" }));
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/api/health"))).toBe(false);
  });
});
