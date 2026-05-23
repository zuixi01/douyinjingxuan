import React from "react";
import { act } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App, { DOUBLE_TAP_DELAY, VideoPlayerSurface } from "../douyin_featured_ui_demo.jsx";

const SAMPLE_ITEM = {
  id: "ai-workflow",
  category: "AI",
  title: "普通人如何用 AI 重构自己的工作流？",
  author: "AI 商业观察",
  likes: "8.3万",
  time: "12:18",
  coverTitle: "AI 工作流\n检索到输出闭环",
  bg: "from-gray-950 via-slate-900 to-indigo-800",
  accent: "bg-indigo-400",
  avatar: "AI",
  tags: ["AI", "工作流", "知识库"],
  ai: {
    summary: ["摘要 1", "摘要 2"],
    audience: "内容创作者",
    takeaway: "拿到一套可复用工作流",
    timestamps: [
      { time: "00:12", label: "AI 工作流开场" },
      { time: "00:36", label: "检索与整理" },
      { time: "01:12", label: "生成与审校" },
    ],
    infographic: [{ title: "输入层", text: "整理资料" }],
  },
};

const mediaState = new WeakMap();

function ensureMediaState(element) {
  if (!mediaState.has(element)) {
    mediaState.set(element, {
      paused: true,
      currentTime: 0,
      duration: 180,
      volume: 0.8,
      muted: false,
    });
  }
  return mediaState.get(element);
}

function tapSurface(surface, pointerType = "mouse") {
  fireEvent.pointerDown(surface, { pointerType, clientX: 16, clientY: 16 });
  fireEvent.pointerUp(surface, { pointerType, clientX: 16, clientY: 16 });
}

function renderPlayer(overrides = {}) {
  const onOpenAi = vi.fn();
  const onBack = vi.fn();
  const onOpenSave = vi.fn();
  const onJump = vi.fn();

  render(
    <VideoPlayerSurface
      item={SAMPLE_ITEM}
      currentTime="00:00"
      onBack={onBack}
      onOpenAi={onOpenAi}
      onOpenSave={onOpenSave}
      onJump={onJump}
      {...overrides}
    />,
  );

  return {
    onOpenAi,
    onBack,
    onOpenSave,
    onJump,
    surface: screen.getByRole("button", { name: "视频播放区域" }),
    video: screen.getByTestId("demo-video"),
  };
}

beforeAll(() => {
  globalThis.requestAnimationFrame = (callback) => window.setTimeout(callback, 0);

  Object.defineProperty(HTMLMediaElement.prototype, "paused", {
    configurable: true,
    get() {
      return ensureMediaState(this).paused;
    },
    set(value) {
      ensureMediaState(this).paused = Boolean(value);
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
    configurable: true,
    get() {
      return ensureMediaState(this).currentTime;
    },
    set(value) {
      ensureMediaState(this).currentTime = Number(value);
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, "duration", {
    configurable: true,
    get() {
      return ensureMediaState(this).duration;
    },
    set(value) {
      ensureMediaState(this).duration = Number(value);
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, "videoWidth", {
    configurable: true,
    get() {
      return ensureMediaState(this).videoWidth || 0;
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, "videoHeight", {
    configurable: true,
    get() {
      return ensureMediaState(this).videoHeight || 0;
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, "volume", {
    configurable: true,
    get() {
      return ensureMediaState(this).volume;
    },
    set(value) {
      ensureMediaState(this).volume = Number(value);
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, "muted", {
    configurable: true,
    get() {
      return ensureMediaState(this).muted;
    },
    set(value) {
      ensureMediaState(this).muted = Boolean(value);
    },
  });

  HTMLMediaElement.prototype.play = vi.fn(function play() {
    ensureMediaState(this).paused = false;
    return Promise.resolve();
  });

  HTMLMediaElement.prototype.pause = vi.fn(function pause() {
    ensureMediaState(this).paused = true;
  });
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("VideoPlayerSurface", () => {
  it("鼠标单击只触发播放，不打开 AI", async () => {
    const { onOpenAi, surface } = renderPlayer();

    tapSurface(surface, "mouse");
    expect(onOpenAi).not.toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(DOUBLE_TAP_DELAY + 10);
      await Promise.resolve();
    });

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    expect(onOpenAi).not.toHaveBeenCalled();
  });

  it("触摸双击只打开 AI，不触发播放", async () => {
    const { onOpenAi, surface } = renderPlayer();

    tapSurface(surface, "touch");
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    tapSurface(surface, "touch");

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(onOpenAi).toHaveBeenCalledTimes(1);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("三连击只触发一次 AI，第三击按单击处理", async () => {
    const { onOpenAi, surface } = renderPlayer();

    tapSurface(surface, "mouse");
    await act(async () => {
      vi.advanceTimersByTime(80);
      await Promise.resolve();
    });
    tapSurface(surface, "mouse");

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    tapSurface(surface, "mouse");

    await act(async () => {
      vi.advanceTimersByTime(DOUBLE_TAP_DELAY + 10);
      await Promise.resolve();
    });

    expect(onOpenAi).toHaveBeenCalledTimes(1);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });

  it("拖动进度条会更新播放进度", () => {
    const { video } = renderPlayer();
    fireEvent.loadedMetadata(video);

    fireEvent.change(screen.getByLabelText("播放进度"), {
      target: { value: "42.5" },
    });

    expect(video.currentTime).toBeCloseTo(42.5, 1);
  });

  it("调节音量会同步更新视频音量与静音状态", () => {
    const { video } = renderPlayer();

    fireEvent.change(screen.getByLabelText("音量"), {
      target: { value: "0.35" },
    });
    expect(video.volume).toBeCloseTo(0.35, 2);
    expect(video.muted).toBe(false);

    fireEvent.change(screen.getByLabelText("音量"), {
      target: { value: "0" },
    });
    expect(video.volume).toBe(0);
    expect(video.muted).toBe(true);
  });

  it("横屏视频提供沉浸观看入口并可退出", async () => {
    const { video } = renderPlayer();
    Object.defineProperty(video, "videoWidth", {
      configurable: true,
      get() {
        return 854;
      },
    });
    Object.defineProperty(video, "videoHeight", {
      configurable: true,
      get() {
        return 480;
      },
    });

    await act(async () => {
      fireEvent.loadedMetadata(video);
      await Promise.resolve();
    });

    const enterButton = screen.getByRole("button", { name: "横屏" });
    fireEvent.click(enterButton);
    expect(screen.getByRole("button", { name: "退出" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "退出" }));
    expect(screen.getByRole("button", { name: "横屏" })).toBeTruthy();
  });

  it("首页单击推荐卡片会进入视频页", async () => {
    render(<App />);

    fireEvent.click(screen.getByText(/奶茶为什么越来越贵/));

    await act(async () => {
      vi.advanceTimersByTime(DOUBLE_TAP_DELAY + 20);
      await Promise.resolve();
    });

    expect(screen.getByText("合集：经济专题")).toBeTruthy();
  });

  it("个人页点击 AI笔记 会进入知识库管理页", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "我" }));
    fireEvent.click(screen.getByRole("button", { name: /AI笔记/ }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("知识库管理")).toBeTruthy();
    expect(screen.getByText("我的分区")).toBeTruthy();
  });
});
