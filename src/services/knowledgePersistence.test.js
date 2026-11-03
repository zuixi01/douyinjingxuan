import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../app/App";
import { buildSavedRecord, STORAGE_KEYS } from "../features/knowledge/model";
import { knowledgeService } from "./knowledgeService";

vi.mock("./knowledgeService", () => ({
  knowledgeService: { loadInitialData: vi.fn(), removeItem: vi.fn(), search: vi.fn(async (items) => items) },
}));

const SECTIONS = [{ id: "personal", name: "我的持久化分区", desc: "个人记录" }];
const SAVED = [buildSavedRecord({ id: "personal-note", title: "我的持久化笔记", author: "作者", tags: [], ai: { summary: ["个人摘要"] }, category: "笔记" }, SECTIONS[0])];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem(STORAGE_KEYS.sections, JSON.stringify(SECTIONS));
  localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(SAVED));
});

afterEach(cleanup);

describe("页面持久化边界", () => {
  it("离线初始化传入已保存数据并保持记录可见", async () => {
    knowledgeService.loadInitialData.mockImplementation(async (sections, savedItems) => ({ sections, savedItems, source: "local" }));
    await act(async () => render(React.createElement(React.StrictMode, null, React.createElement(App))));

    expect(knowledgeService.loadInitialData).toHaveBeenCalledWith(SECTIONS, SAVED);
    fireEvent.click(screen.getByRole("button", { name: "我" }));
    expect(await screen.findByRole("button", { name: "查看记录：我的持久化笔记" })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.saved))).toEqual(SAVED);
  });

  it("初始化完成前阻止写入，避免使用旧的本地记录操作远端", async () => {
    let finishLoading;
    knowledgeService.loadInitialData.mockImplementation(() => new Promise((resolve) => { finishLoading = resolve; }));
    await act(async () => render(React.createElement(App)));
    fireEvent.click(screen.getByRole("button", { name: "我" }));
    fireEvent.click(await screen.findByRole("button", { name: "删除" }));

    expect(screen.getByText("知识库正在加载，请稍后重试")).toBeTruthy();
    expect(knowledgeService.removeItem).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.saved))).toEqual(SAVED);
    await act(async () => finishLoading({ sections: SECTIONS, savedItems: [], source: "remote" }));
  });

  it("远端加载不会覆盖独立的离线缓存，删除失败保留页面记录并提示", async () => {
    const remoteRecord = { ...SAVED[0], id: "remote-record", itemId: "remote-note", title: "远端笔记" };
    knowledgeService.loadInitialData.mockResolvedValue({ sections: SECTIONS, savedItems: [remoteRecord], source: "remote" });
    knowledgeService.removeItem.mockRejectedValue(new Error("远端拒绝删除"));
    await act(async () => render(React.createElement(App)));
    fireEvent.click(screen.getByRole("button", { name: "我" }));
    expect(await screen.findByRole("button", { name: "查看记录：远端笔记" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "删除" }));

    await waitFor(() => expect(screen.getByText(/操作失败：远端拒绝删除/)).toBeTruthy());
    expect(screen.getByRole("button", { name: "查看记录：远端笔记" })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.saved))).toEqual(SAVED);
  });

  it("远端初始化失败时保留离线缓存并明确提示", async () => {
    knowledgeService.loadInitialData.mockRejectedValue(new Error("服务维护中"));
    await act(async () => render(React.createElement(App)));

    expect(screen.getByText(/知识库加载失败：服务维护中/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.saved))).toEqual(SAVED);
  });
});
