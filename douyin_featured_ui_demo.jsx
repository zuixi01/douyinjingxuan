import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  FileText,
  Film,
  FolderPlus,
  Heart,
  Home,
  Lightbulb,
  Maximize2,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Share2,
  Sparkles,
  ThumbsUp,
  User,
  Volume2,
  VolumeX,
  X,
  Loader2,
} from "lucide-react";
import { FEED_ITEMS, DEFAULT_SECTIONS } from "./feed-data";

const STORAGE_KEYS = {
  sections: "douyin-ai-sections",
  saved: "douyin-ai-saved",
};

const HOME_CHIPS = ["全部", "科普", "AI", "旅行", "教育", "成长", "故事", "职场", "生活", "社会"];
const FEEDBACK_OPTIONS = ["该内容", "该作者", "疑似广告", "相似过多", "已经看过", "色情低俗", "添加稍后再看"];
export const DOUBLE_TAP_DELAY = 240;
const PLAYER_CONTROLS_IDLE_MS = 2200;
const TAP_MOVE_THRESHOLD = 12;

// 检测是否为移动设备
const isMobile = typeof navigator !== "undefined" && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (typeof window !== "undefined" && window.innerWidth < 768));
const DEMO_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

// FEED_ITEMS 和 DEFAULT_SECTIONS 已从 ./feed-data.js 导入


const HISTORY_ITEMS = [
  { title: "Git 协作里踩过的所有坑", time: "09:18", bg: "from-slate-800 to-cyan-600", coverTitle: "Git 协作复盘" },
  { title: "阅读到底能不能改变思维？", time: "16:15", bg: "from-stone-900 to-amber-700", coverTitle: "阅读与认知升级" },
  { title: "为什么你明明睡了却还是累", time: "07:55", bg: "from-indigo-900 to-sky-500", coverTitle: "睡眠恢复机制" },
];

function wait(ms = 120) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function timeToSeconds(value) {
  const parts = value.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function getProgressPercent(current, total) {
  const totalSeconds = Math.max(timeToSeconds(total), 1);
  return Math.min(100, Math.max(2, (timeToSeconds(current) / totalSeconds) * 100));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatPlaybackTime(value) {
  const totalSeconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  }
  return [minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function createTapGestureController({
  delay = DOUBLE_TAP_DELAY,
  onSingleTap,
  onDoubleTap,
  nowFn = () => Date.now(),
  setTimeoutFn = (handler, timeout) => window.setTimeout(handler, timeout),
  clearTimeoutFn = (timer) => window.clearTimeout(timer),
} = {}) {
  let timer = null;
  let lastTapAt = 0;

  const clearPending = () => {
    if (timer) {
      clearTimeoutFn(timer);
      timer = null;
    }
  };

  return {
    registerTap() {
      const now = nowFn();
      if (timer && now - lastTapAt <= delay) {
        clearPending();
        lastTapAt = 0;
        onDoubleTap?.();
        return "double";
      }

      lastTapAt = now;
      clearPending();
      timer = setTimeoutFn(() => {
        timer = null;
        lastTapAt = 0;
        onSingleTap?.();
      }, delay);
      return "single-pending";
    },
    cancel() {
      clearPending();
      lastTapAt = 0;
    },
    hasPendingTap() {
      return Boolean(timer);
    },
  };
}

function buildSavedRecord(item, section) {
  return {
    id: `${section.id}-${item.id}`,
    itemId: item.id,
    sectionId: section.id,
    sectionName: section.name,
    title: item.title,
    author: item.author,
    time: item.time,
    bg: item.bg,
    coverTitle: item.coverTitle,
    category: item.category,
    tags: item.tags,
    ai: item.ai,
    savedAt: new Date().toISOString(),
  };
}

const INITIAL_SAVED_ITEMS = [buildSavedRecord(FEED_ITEMS[1], DEFAULT_SECTIONS[0])];

const demoApi = {
  async createSection(sections, name) {
    await wait();
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, message: "分区名称不能为空" };
    if (sections.some((section) => section.name === trimmed)) {
      return { ok: false, message: "该分区已存在" };
    }
    const section = { id: `section-${Date.now()}`, name: trimmed, desc: "自定义知识分区" };
    return { ok: true, section, sections: [section, ...sections], message: `已创建分区：${trimmed}` };
  },
  async saveItem(savedItems, item, sectionId, sections) {
    await wait();
    const section = sections.find((entry) => entry.id === sectionId);
    if (!section) return { ok: false, message: "未找到目标分区" };
    const exists = savedItems.find((entry) => entry.itemId === item.id && entry.sectionId === sectionId);
    if (exists) {
      return { ok: true, duplicate: true, savedItems, record: exists, message: `${item.title} 已存在于 ${section.name}` };
    }
    const record = buildSavedRecord(item, section);
    return { ok: true, duplicate: false, savedItems: [record, ...savedItems], record, message: `已保存到 ${section.name}` };
  },
  async search(savedItems, { query, sectionId, tag, mode, sortBy }) {
    await wait(80);
    const keyword = query.trim().toLowerCase();
    let results = savedItems.filter((entry) => {
      if (mode === "notes" && !entry.ai) return false;
      if (sectionId !== "all" && entry.sectionId !== sectionId) return false;
      if (tag !== "全部" && !entry.tags.includes(tag)) return false;
      if (!keyword) return true;
      const haystack = [entry.title, entry.author, entry.sectionName, ...entry.tags, entry.ai.takeaway, ...entry.ai.summary].join(" ").toLowerCase();
      return haystack.includes(keyword);
    });
    if (sortBy === "title") results.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === "category") results.sort((a, b) => a.category.localeCompare(b.category));
    else results.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    return results;
  },
  async removeItem(savedItems, itemId, sectionId) {
    await wait();
    return savedItems.filter((entry) => !(entry.itemId === itemId && entry.sectionId === sectionId));
  },
  exportMarkdown(savedItems, sections) {
    const grouped = {};
    for (const s of sections) grouped[s.id] = { name: s.name, items: [] };
    for (const item of savedItems) {
      if (grouped[item.sectionId]) grouped[item.sectionId].items.push(item);
    }
    let md = "# 我的知识库\n\n";
    md += `> 导出时间：${new Date().toLocaleString("zh-CN")}\n\n`;
    for (const [, group] of Object.entries(grouped)) {
      if (!group.items.length) continue;
      md += `## ${group.name}\n\n`;
      for (const item of group.items) {
        md += `### ${item.title}\n\n`;
        md += `- 作者：${item.author}\n`;
        md += `- 分类：${item.category}\n`;
        md += `- 标签：${item.tags.join("、")}\n`;
        md += `- 时长：${item.time}\n`;
        md += `- 收藏时间：${new Date(item.savedAt).toLocaleString("zh-CN")}\n\n`;
        if (item.ai) {
          md += `**核心摘要**\n\n`;
          for (const s of item.ai.summary) md += `- ${s}\n`;
          md += `\n**适合人群**：${item.ai.audience}\n\n`;
          md += `**关键收获**：${item.ai.takeaway}\n\n`;
          if (item.ai.timestamps?.length) {
            md += `**时间戳**\n\n`;
            for (const ts of item.ai.timestamps) md += `- \`${ts.time}\` ${ts.label}\n`;
            md += "\n";
          }
        }
        md += "---\n\n";
      }
    }
    return md;
  },
};
function StatusBar({ dark = false }) {
  return (
    <div className={`flex items-center justify-between px-5 pt-3 pb-2 text-[15px] font-semibold ${dark ? "text-white" : "text-zinc-950"}`}>
      <span>12:50</span>
      <span className="text-xs tracking-tight">5G ▮▮ 29</span>
    </div>
  );
}

function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="fixed left-1/2 top-5 z-[90] -translate-x-1/2 rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-xl">
          {toast}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Cover({ item, compact = false, hint = false, className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${item.bg} ${compact ? "h-24" : item.tall ? "h-72" : "h-64"} ${className}`}>
      {item.videoUrl ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={item.videoUrl}
          muted
          playsInline
          loop
          autoPlay
          preload="metadata"
          aria-hidden="true"
        />
      ) : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.28),transparent_24%),radial-gradient(circle_at_80%_78%,rgba(255,255,255,0.18),transparent_24%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/65 to-transparent" />
      <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/20 backdrop-blur-md">
        <span className={`h-1.5 w-1.5 rounded-full ${item.accent}`} />
        {item.category}
      </div>
      <div className={`absolute left-4 right-4 whitespace-pre-line font-black leading-[1.05] text-white drop-shadow-[0_3px_5px_rgba(0,0,0,0.72)] ${compact ? "bottom-8 text-lg" : "bottom-12 text-[29px]"}`}>
        {item.coverTitle}
      </div>
      <div className="absolute bottom-2 left-3 flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
        <Heart size={14} fill="white" /> {item.likes}
      </div>
      <div className="absolute bottom-2 right-3 rounded-lg bg-black/35 px-2 py-1 text-xs font-bold text-white backdrop-blur-md">{item.time}</div>
      <div className="absolute right-3 top-3 rounded-full bg-black/35 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-md">双击看 AI</div>
      {hint ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center bg-black/35">
          <div className="rounded-full bg-white px-4 py-2 text-sm font-black text-zinc-950 shadow-lg">AI 速读中</div>
        </motion.div>
      ) : null}
    </div>
  );
}

function FeedCard({ item, onOpen, onSummarize, onMore }) {
  const gestureRef = useRef(null);
  const [hint, setHint] = useState(false);
  const hintTimerRef = useRef(null);

  if (!gestureRef.current) {
    gestureRef.current = createTapGestureController({
      onSingleTap: () => onOpen(item),
      onDoubleTap: () => {
        setHint(true);
        window.clearTimeout(hintTimerRef.current);
        hintTimerRef.current = window.setTimeout(() => setHint(false), 700);
        onSummarize(item);
      },
    });
  }

  useEffect(() => {
    return () => {
      gestureRef.current?.cancel();
      window.clearTimeout(hintTimerRef.current);
    };
  }, []);

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="break-inside-avoid overflow-hidden rounded-lg bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-1 ring-zinc-100 transition-all duration-300 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] hover:ring-zinc-200">
      <button
        type="button"
        onPointerUp={() => gestureRef.current?.registerTap()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(item);
          }
        }}
        className="group block w-full touch-manipulation text-left"
      >
        <Cover item={item} hint={hint} className="transition-transform duration-700 ease-out group-hover:scale-[1.02]" />
      </button>
      <div className="px-3 pb-3 pt-2.5">
        <h3 className="line-clamp-2 text-[16.5px] font-semibold leading-snug text-zinc-950 transition-colors duration-300 group-hover:text-zinc-700">{item.title}</h3>
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-500 transition-colors duration-300 hover:bg-zinc-200">{tag}</span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
          <div className="flex min-w-0 items-center gap-2 group/author cursor-pointer">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-100 to-zinc-300 text-[11px] font-black text-zinc-700 transition-transform duration-300 group-hover/author:scale-110">{item.avatar}</div>
            <span className="truncate transition-colors duration-300 group-hover/author:text-zinc-900">{item.author}</span>
          </div>
          <button onClick={() => onMore(item)} className="rounded-full p-1.5 transition-all duration-300 hover:bg-zinc-100 active:scale-90"><MoreHorizontal size={18} /></button>
        </div>
      </div>
    </motion.div>
  );
}

function BottomNav({ active, onChange }) {
  const items = [
    { key: "home", label: "首页", icon: Home },
    { key: "cinema", label: "放映厅", icon: Film },
    { key: "publish", label: "", icon: Plus, center: true },
    { key: "message", label: "消息", icon: MessageCircle },
    { key: "me", label: "我", icon: User },
  ];

  return (
    <div className="sticky bottom-0 z-30 border-t border-zinc-100 bg-white/92 shadow-[0_-12px_30px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
      <div className="grid grid-cols-5 items-center px-3 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          if (item.center) {
            return (
              <button key={item.key} onClick={() => onChange("home")} className="group mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-zinc-950 bg-white shadow-[0_8px_18px_rgba(0,0,0,0.12)] transition-all duration-300 hover:scale-105 hover:bg-zinc-50 hover:shadow-[0_12px_24px_rgba(0,0,0,0.18)] active:scale-95">
                <Icon size={30} strokeWidth={3} className="transition-transform duration-300 group-hover:rotate-90" />
              </button>
            );
          }
          const isActive = active === item.key;
          return (
            <button key={item.key} onClick={() => onChange(item.key)} className={`group flex flex-col items-center gap-1 rounded-2xl py-1.5 text-sm transition-all duration-300 active:scale-95 ${isActive ? "font-black text-zinc-950" : "text-zinc-500 hover:text-zinc-800"}`}>
              <Icon size={22} strokeWidth={isActive ? 3 : 2} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
              <span className="transition-all duration-300">{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mx-auto mb-2 h-1 w-28 rounded-full bg-zinc-800/70" />
    </div>
  );
}

function FeedbackSheet({ item, onClose, onSelect }) {
  if (!item) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end bg-black/35 p-3 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} onClick={(event) => event.stopPropagation()} className="w-full overflow-hidden rounded-xl bg-white p-3 shadow-2xl">
          <div className="mx-auto my-2 h-1 w-12 rounded-full bg-zinc-300" />
          <div className="px-2 pb-3">
            <p className="text-base font-black text-zinc-950">减少这类内容</p>
            <p className="mt-1 text-sm text-zinc-500">保留原有负反馈能力，不影响 AI 笔记入口</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FEEDBACK_OPTIONS.map((option) => (
              <button key={option} onClick={() => onSelect(option)} className="rounded-2xl bg-zinc-50 px-4 py-4 text-left text-sm font-semibold text-zinc-900 ring-1 ring-zinc-100 transition-all duration-300 hover:bg-zinc-100 hover:shadow-sm active:scale-95">
                {option}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="mt-3 w-full rounded-2xl bg-zinc-100 py-4 text-base font-bold text-zinc-900 transition-all duration-300 hover:bg-zinc-200 active:scale-[0.98]">取消</button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
function AiSummarySheet({ item, onClose, onJump, onOpenVideo, onOpenSave }) {
  if (!item) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end bg-black/40 p-3 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} onClick={(event) => event.stopPropagation()} className="max-h-[88vh] w-full overflow-y-auto rounded-xl bg-white shadow-2xl">
          <div className={`relative overflow-hidden rounded-t-[2rem] bg-gradient-to-br ${item.bg} p-4 text-white`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_28%)]" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">AI 笔记</div>
                <h2 className="mt-3 text-[23px] font-black leading-tight">{item.title}</h2>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-white/90">
                  <span className="rounded-full bg-black/20 px-3 py-1">@{item.author}</span>
                  <span className="rounded-full bg-black/20 px-3 py-1">原视频 {item.time}</span>
                </div>
              </div>
              <button onClick={onClose} className="rounded-full bg-black/20 p-2 backdrop-blur transition-all duration-300 hover:bg-black/40 hover:rotate-90 active:scale-90"><X size={18} /></button>
            </div>
          </div>

          <div className="space-y-4 p-3">
            <section>
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-zinc-950"><Sparkles size={18} className="text-cyan-500" />核心摘要</div>
              <div className="space-y-2">
                {item.ai.summary.map((point) => (
                  <div key={point} className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-700 ring-1 ring-zinc-100">{point}</div>
                ))}
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-cyan-50 p-4 ring-1 ring-cyan-100">
                <div className="text-xs font-black text-cyan-700">适合人群</div>
                <p className="mt-2 text-sm leading-relaxed text-cyan-900">{item.ai.audience}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 ring-1 ring-amber-100">
                <div className="text-xs font-black text-amber-700">你会获得什么</div>
                <p className="mt-2 text-sm leading-relaxed text-amber-900">{item.ai.takeaway}</p>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-zinc-950"><Clock3 size={18} className="text-violet-500" />建议观看片段</div>
              <div className="space-y-2">
                {item.ai.timestamps.map((stamp) => (
                  <button key={stamp.time} onClick={() => onJump(item, stamp.time)} className="group flex w-full items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-left ring-1 ring-zinc-100 transition-all duration-300 hover:bg-zinc-100 hover:shadow-sm active:scale-[0.98]">
                    <div>
                      <div className="text-sm font-black text-zinc-950 transition-colors duration-300 group-hover:text-cyan-700">{stamp.time}</div>
                      <div className="mt-1 text-sm text-zinc-500 transition-colors duration-300 group-hover:text-zinc-700">{stamp.label}</div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-cyan-500" />
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-zinc-950"><Lightbulb size={18} className="text-amber-500" />信息图总结</div>
              <div className="grid gap-3">
                {item.ai.infographic.map((block) => (
                  <div key={block.title} className="group rounded-lg border border-zinc-100 bg-gradient-to-br from-white to-zinc-50 p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-cyan-100 hover:-translate-y-0.5">
                    <div className="text-sm font-black text-zinc-950 transition-colors duration-300 group-hover:text-cyan-700">{block.title}</div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 transition-colors duration-300 group-hover:text-zinc-800">{block.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => onOpenVideo(item)} className="rounded-2xl bg-zinc-950 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-zinc-800 hover:shadow-lg active:scale-[0.98]">进入视频页</button>
              <button onClick={() => onOpenSave(item)} className="rounded-2xl bg-zinc-100 py-3 text-sm font-bold text-zinc-950 transition-all duration-300 hover:bg-zinc-200 hover:shadow-md active:scale-[0.98]">添加到知识库</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SaveSheet({ item, sections, onClose, onCreateSection, onSave }) {
  const [selected, setSelected] = useState(sections[0]?.id || "default");
  const [newSection, setNewSection] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSelected(sections[0]?.id || "default");
    setNewSection("");
    setError("");
  }, [item, sections]);

  if (!item) return null;

  const handleCreate = async () => {
    const result = await onCreateSection(newSection);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSelected(result.section.id);
    setNewSection("");
    setError("");
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[65] flex items-end bg-black/40 p-3 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} onClick={(event) => event.stopPropagation()} className="w-full rounded-xl bg-white p-4 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-base font-black text-zinc-950">添加到知识库</div>
              <div className="mt-1 text-sm text-zinc-500">保存视频、AI 摘要、时间戳和信息图到指定分区</div>
            </div>
            <button onClick={onClose} className="rounded-full bg-zinc-100 p-2 transition-all duration-300 hover:bg-zinc-200 hover:rotate-90 active:scale-90"><X size={18} /></button>
          </div>

          <div className="rounded-lg bg-zinc-50 p-4 ring-1 ring-zinc-100">
            <div className="text-sm font-black text-zinc-950">{item.title}</div>
            <div className="mt-1 text-sm text-zinc-500">@{item.author}</div>
          </div>

          <div className="mt-4 space-y-2">
            {sections.map((section) => {
              const active = selected === section.id;
              return (
                <button key={section.id} onClick={() => setSelected(section.id)} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left ring-1 transition-all duration-300 hover:shadow-sm active:scale-[0.98] ${active ? "bg-zinc-950 text-white ring-zinc-950" : "bg-white text-zinc-900 ring-zinc-100 hover:bg-zinc-50 hover:ring-zinc-200"}`}>
                  <div>
                    <div className="text-sm font-black">{section.name}</div>
                    <div className={`mt-1 text-xs ${active ? "text-white/80" : "text-zinc-500"}`}>{section.desc}</div>
                  </div>
                  {active ? <CheckCircle2 size={18} /> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-dashed border-zinc-200 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-zinc-950"><FolderPlus size={16} />新建分区</div>
            <div className="flex gap-2">
              <input value={newSection} onChange={(event) => setNewSection(event.target.value)} placeholder="如：消费经济学" className="flex-1 rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950" />
              <button onClick={handleCreate} className="rounded-2xl bg-zinc-950 px-4 text-sm font-bold text-white transition-all duration-300 hover:bg-zinc-800 active:scale-95">创建</button>
            </div>
            {error ? <div className="mt-2 text-xs font-semibold text-rose-500">{error}</div> : null}
          </div>

          <button onClick={() => onSave(item, selected)} className="mt-4 w-full rounded-2xl bg-zinc-950 py-4 text-sm font-bold text-white transition-all duration-300 hover:bg-zinc-800 hover:shadow-lg active:scale-[0.98]">确认保存</button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
function HomePage({ items, onOpen, onSummarize, onMore }) {
  const [tab, setTab] = useState("推荐");
  const [chip, setChip] = useState("全部");

  // 预计算所有tab的数据，避免切换时重新计算
  const tabData = useMemo(() => ({
    关注: items.filter((item) => ["AI", "职场", "教育"].includes(item.category)),
    推荐: items,
    热门: items.slice(1),
  }), [items]);

  // 根据当前tab和chip获取显示数据
  const shown = useMemo(() => {
    let result = tabData[tab] || items;
    if (tab !== "热门" && chip !== "全部") {
      result = result.filter((item) => item.category === chip);
    }
    return result;
  }, [tabData, tab, chip, items]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${tab === "热门" ? "bg-white" : "bg-[#f6f6f7]"}`}>
      <StatusBar />
      <div className={`sticky top-0 z-20 px-4 pb-3 pt-2 backdrop-blur-2xl transition-colors duration-200 ${tab === "热门" ? "bg-white/92" : "bg-[#f6f6f7]/92"}`}>
        <div className="flex items-center justify-between">
          <button className="rounded-2xl p-1 transition-all duration-200 hover:bg-zinc-200 active:scale-90"><Menu size={30} /></button>
          <div className="flex items-center gap-9 text-[22px] font-medium text-zinc-500">
            {["关注", "推荐", "热门"].map((name) => (
              <button key={name} onClick={() => setTab(name)} className={`relative pb-2 transition-all duration-200 hover:text-zinc-800 ${tab === name ? "font-black text-zinc-950" : ""}`}>
                {name}
                {tab === name ? <motion.span layoutId="tab-indicator" className="absolute bottom-0 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-[#18e2d7]" /> : null}
              </button>
            ))}
          </div>
          <button className="rounded-2xl p-1 transition-all duration-200 hover:bg-zinc-200 active:scale-90"><Search size={30} /></button>
        </div>

        <AnimatePresence mode="wait">
          {tab !== "热门" ? (
            <motion.div
              key="chips"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
            >
              {HOME_CHIPS.map((entry) => {
                const active = chip === entry;
                return (
                  <button key={entry} onClick={() => setChip(entry)} className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 hover:shadow-sm active:scale-95 ${active ? "bg-zinc-950 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-100 hover:bg-zinc-50 hover:text-zinc-900"}`}>
                    {entry}
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="banner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="mt-4 rounded-lg bg-gradient-to-br from-orange-200 via-amber-100 to-emerald-300 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
            >
              <div className="inline-flex rounded-full bg-white/70 px-3 py-1 text-xs font-black text-zinc-900">抖音精选 × AI 笔记</div>
              <div className="mt-4 text-[28px] font-black text-zinc-950">内容值得看吗？</div>
              <p className="mt-2 text-sm font-semibold text-zinc-700">双击卡片，AI 30 秒帮你判断价值</p>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[Sparkles, Play, Database, Lightbulb].map((Icon, index) => (
                  <div key={index} className="group cursor-pointer rounded-2xl bg-white/70 px-2 py-3 text-center ring-1 ring-white/50 backdrop-blur transition-all duration-200 hover:bg-white/90 hover:shadow-md hover:-translate-y-1">
                    <Icon size={20} className="mx-auto text-zinc-900 transition-transform duration-200 group-hover:scale-110" />
                    <div className="mt-2 text-[11px] font-bold text-zinc-900">{["AI 速读", "时间戳", "知识库", "洞察"][index]}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {tab === "热门" ? (
          <motion.div
            key="hot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-3 px-3 pb-6 pt-3"
          >
            {shown.map((item) => (
              <button key={item.id} onClick={() => onOpen(item)} className="group flex w-full gap-3 rounded-lg bg-white p-3 text-left shadow-sm ring-1 ring-zinc-100 transition-all duration-200 hover:shadow-md hover:ring-zinc-200 active:scale-[0.98]">
                <div className={`h-28 w-24 shrink-0 rounded-2xl bg-gradient-to-br ${item.bg} transition-transform duration-300 group-hover:scale-105`} />
                <div className="flex-1">
                  <div className="text-base font-black text-zinc-950">{item.title}</div>
                  <div className="mt-2 text-sm text-zinc-500">@{item.author}</div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-500">{tag}</span>)}
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="columns-2 gap-2.5 px-2.5 pb-5 [column-fill:_balance]"
          >
            {shown.map((item) => (
              <div key={item.id} className="mb-2.5">
                <FeedCard item={item} onOpen={onOpen} onSummarize={onSummarize} onMore={onMore} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function isInteractiveTarget(target) {
  return target instanceof HTMLElement && Boolean(target.closest("[data-interactive='true']"));
}

export function VideoPlayerSurface({ item, currentTime, onBack, onOpenAi, onOpenSave, onJump, onSwipe }) {
  const videoRef = useRef(null);
  const playerShellRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const flashTimerRef = useRef(null);
  const aiTimerRef = useRef(null);
  const pointerStateRef = useRef({ x: 0, y: 0, moved: false, ignore: false });
  const gestureRef = useRef(null);
  const singleTapActionRef = useRef(() => {});
  const doubleTapActionRef = useRef(() => {});
  const requestSeekRef = useRef(timeToSeconds(currentTime));
  const [durationSeconds, setDurationSeconds] = useState(timeToSeconds(item.time));
  const [playheadSeconds, setPlayheadSeconds] = useState(timeToSeconds(currentTime));
  const [isPlaying, setIsPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(isMobile); // 移动端默认静音
  const [flashAction, setFlashAction] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [videoOrientation, setVideoOrientation] = useState("portrait");
  const [cinemaMode, setCinemaMode] = useState(false);

  const clearControlsTimer = () => {
    window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = null;
  };

  const revealControls = (pinned = false) => {
    setControlsVisible(true);
    clearControlsTimer();
    if (!pinned && isPlaying) {
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), PLAYER_CONTROLS_IDLE_MS);
    }
  };

  const showFlash = (action) => {
    setFlashAction(action);
    window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlashAction(null), 520);
  };

  const syncPlayingState = (nextPlaying) => {
    setIsPlaying(nextPlaying);
    if (nextPlaying) {
      revealControls(false);
    } else {
      clearControlsTimer();
      setControlsVisible(true);
    }
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextPlaying = !isPlaying;
    if (nextPlaying) {
      const playPromise = video.play();
      if (playPromise?.catch) {
        playPromise.catch(() => syncPlayingState(false));
      }
    } else {
      video.pause();
    }
    syncPlayingState(nextPlaying);
    showFlash(nextPlaying ? "play" : "pause");
  };

  const openAiPanel = () => {
    clearControlsTimer();
    setControlsVisible(true);
    setAiLoading(true);
    window.clearTimeout(aiTimerRef.current);
    aiTimerRef.current = window.setTimeout(() => {
      setAiLoading(false);
      onOpenAi(item);
    }, 80);
  };

  singleTapActionRef.current = togglePlayback;
  doubleTapActionRef.current = openAiPanel;

  if (!gestureRef.current) {
    gestureRef.current = createTapGestureController({
      onSingleTap: () => singleTapActionRef.current(),
      onDoubleTap: () => doubleTapActionRef.current(),
    });
  }

  useEffect(() => {
    requestSeekRef.current = timeToSeconds(currentTime);
    const video = videoRef.current;
    if (!video) return;
    const target = clamp(requestSeekRef.current, 0, durationSeconds || timeToSeconds(item.time) || 1);
    video.currentTime = target;
    setPlayheadSeconds(target);
    revealControls(true);
  }, [currentTime, durationSeconds, item.time]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [muted, volume]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setCinemaMode(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      gestureRef.current?.cancel();
      clearControlsTimer();
      window.clearTimeout(flashTimerRef.current);
      window.clearTimeout(aiTimerRef.current);
    };
  }, []);

  // 视频缓冲处理
  const handleWaiting = () => setIsBuffering(true);
  const handlePlaying = () => setIsBuffering(false);
  const handleCanPlay = () => setIsBuffering(false);
  const handleProgress = () => {
    const video = videoRef.current;
    if (video && video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const duration = video.duration;
      if (duration > 0) {
        setLoadProgress((bufferedEnd / duration) * 100);
      }
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : timeToSeconds(item.time);
    setDurationSeconds(nextDuration);
    const width = Number(video.videoWidth) || 0;
    const height = Number(video.videoHeight) || 0;
    setVideoOrientation(width > height ? "landscape" : "portrait");
    const target = clamp(requestSeekRef.current, 0, nextDuration || 1);
    video.currentTime = target;
    setPlayheadSeconds(target);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setPlayheadSeconds(video.currentTime || 0);
  };

  const handleSeek = (value) => {
    const video = videoRef.current;
    const nextValue = clamp(Number(value), 0, durationSeconds || 1);
    if (video) {
      video.currentTime = nextValue;
    }
    setPlayheadSeconds(nextValue);
    revealControls(true);
  };

  const handleVolumeChange = (value) => {
    const nextValue = clamp(Number(value), 0, 1);
    setVolume(nextValue);
    setMuted(nextValue === 0);
    revealControls(true);
  };

  const enterCinemaMode = async () => {
    setCinemaMode(true);
    revealControls(true);
    try {
      if (playerShellRef.current?.requestFullscreen && !document.fullscreenElement) {
        await playerShellRef.current.requestFullscreen();
      }
    } catch {
      // Some mobile in-app browsers block Fullscreen API; the fixed cinema layer still works.
    }
    try {
      await window.screen?.orientation?.lock?.("landscape");
    } catch {
      // Orientation lock is optional and browser-dependent.
    }
  };

  const exitCinemaMode = async () => {
    setCinemaMode(false);
    revealControls(true);
    try {
      window.screen?.orientation?.unlock?.();
    } catch {
      // Some browsers expose no unlock API.
    }
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Exiting the fixed layer is enough if fullscreen exit fails.
    }
  };

  const handlePointerDown = (event) => {
    if (isInteractiveTarget(event.target)) {
      pointerStateRef.current = { x: 0, y: 0, moved: false, ignore: true };
      return;
    }
    pointerStateRef.current = {
      x: event.clientX,
      y: event.clientY,
      moved: false,
      ignore: false,
    };
  };

  const handlePointerMove = (event) => {
    if (pointerStateRef.current.ignore) return;
    const deltaX = event.clientX - pointerStateRef.current.x;
    const deltaY = event.clientY - pointerStateRef.current.y;
    if (Math.hypot(deltaX, deltaY) > TAP_MOVE_THRESHOLD) {
      pointerStateRef.current.moved = true;
    }
  };

  const handlePointerUp = (event) => {
    if (pointerStateRef.current.moved && !pointerStateRef.current.ignore && !isInteractiveTarget(event.target)) {
      const deltaX = event.clientX - pointerStateRef.current.x;
      const deltaY = event.clientY - pointerStateRef.current.y;
      if (Math.abs(deltaY) > 72 && Math.abs(deltaY) > Math.abs(deltaX) * 1.25) {
        onSwipe?.(deltaY < 0 ? "next" : "prev");
      }
      pointerStateRef.current = { x: 0, y: 0, moved: false, ignore: false };
      return;
    }
    if (pointerStateRef.current.ignore || pointerStateRef.current.moved || isInteractiveTarget(event.target)) {
      pointerStateRef.current = { x: 0, y: 0, moved: false, ignore: false };
      return;
    }
    pointerStateRef.current = { x: 0, y: 0, moved: false, ignore: false };
    gestureRef.current?.registerTap();
  };

  const activeStamp = item.ai.timestamps.reduce((closest, stamp) => {
    if (!closest) return stamp;
    const currentDiff = Math.abs(timeToSeconds(stamp.time) - playheadSeconds);
    const closestDiff = Math.abs(timeToSeconds(closest.time) - playheadSeconds);
    return currentDiff < closestDiff ? stamp : closest;
  }, null);

  const isLandscape = videoOrientation === "landscape";
  const playerFrameClassName = isLandscape
    ? cinemaMode
      ? "min-h-0 flex-1"
      : "aspect-video max-h-[56vh] md:max-h-[62vh]"
    : "aspect-[9/16] max-h-[72vh]";
  const videoFitClassName = isLandscape ? "object-contain bg-black" : "object-cover";
  const shellClassName = cinemaMode
    ? "fixed inset-0 z-[80] flex flex-col overflow-hidden rounded-none bg-black text-white"
    : "relative overflow-hidden rounded-xl bg-black shadow-[0_24px_48px_rgba(0,0,0,0.4)] ring-1 ring-white/10";
  const actionGridClassName = isLandscape ? "grid grid-cols-4 gap-2" : "grid grid-cols-3 gap-2";

  return (
    <div ref={playerShellRef} className={shellClassName}>
      <div
        role="button"
        tabIndex={0}
        aria-label="视频播放区域"
        className={`relative w-full touch-manipulation overflow-hidden bg-black outline-none ${playerFrameClassName}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            togglePlayback();
          }
        }}
      >
        <video
          ref={videoRef}
          data-testid="demo-video"
          className={`h-full w-full ${videoFitClassName}`}
          preload={isMobile ? "metadata" : "auto"}
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          x5-video-player-type="h5"
          x5-video-player-fullscreen="false"
          src={item.videoUrl || DEMO_VIDEO_URL}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => syncPlayingState(true)}
          onPause={() => syncPlayingState(false)}
          onEnded={() => syncPlayingState(false)}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
          onCanPlay={handleCanPlay}
          onProgress={handleProgress}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_72%_72%,rgba(34,211,238,0.18),transparent_30%)]" />

        <AnimatePresence>
          {controlsVisible ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
              <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4 text-white">
                <button type="button" data-interactive="true" onClick={onBack} className="rounded-full bg-black/35 p-2 backdrop-blur transition hover:bg-black/55 active:scale-95">
                  <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" data-interactive="true" className="rounded-full bg-black/35 px-3 py-2 text-sm font-semibold backdrop-blur transition hover:bg-black/55 active:scale-95">
                    听
                  </button>
                  <button type="button" data-interactive="true" onClick={() => openAiPanel()} className="rounded-full bg-black/35 px-3 py-2 text-sm font-semibold backdrop-blur transition hover:bg-black/55 active:scale-95">
                    <span className="flex items-center gap-1">
                      <Sparkles size={14} className="text-cyan-300" />
                      AI
                    </span>
                  </button>
                  <button type="button" data-interactive="true" onClick={isLandscape ? (cinemaMode ? exitCinemaMode : enterCinemaMode) : undefined} className="rounded-full bg-black/35 p-2 backdrop-blur transition hover:bg-black/55 active:scale-95" aria-label={isLandscape ? (cinemaMode ? "退出横屏观看" : "横屏观看") : "搜索"}>
                    {isLandscape ? (cinemaMode ? <X size={18} /> : <Maximize2 size={18} />) : <Search size={18} />}
                  </button>
                </div>
              </div>

              <div className={`absolute right-3 flex flex-col items-center gap-4 text-white ${cinemaMode ? "bottom-24" : "bottom-32"}`}>
                {[{ icon: Heart, label: "2.8万" }, { icon: MessageCircle, label: "534" }, { icon: ThumbsUp, label: "370" }, { icon: Bookmark, label: "1.1万" }].map((action) => {
                  const Icon = action.icon;
                  return (
                    <button key={action.label} type="button" data-interactive="true" className="flex flex-col items-center gap-1 text-xs font-semibold transition hover:scale-105 active:scale-95">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 backdrop-blur">
                        <Icon size={22} />
                      </div>
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
                <div className="flex items-end justify-between gap-4">
                  <div className="max-w-[72%]">
                    <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">双击视频看 AI</div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-zinc-950">{item.author}</span>
                      <button type="button" data-interactive="true" className="rounded-full bg-cyan-400 px-3 py-1 text-sm font-black text-zinc-950 transition hover:bg-cyan-300 active:scale-95">
                        关注
                      </button>
                    </div>
                    <div className="mt-3 text-lg font-black leading-snug text-white">{item.title}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-black/35 px-2.5 py-1 text-xs font-semibold text-white/90 backdrop-blur">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button type="button" data-interactive="true" onClick={() => onOpenSave(item)} className="rounded-2xl bg-white/15 px-3 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25 active:scale-95">
                    添加到知识库
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {flashAction ? (
            <motion.div initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }} className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/45 text-white shadow-2xl backdrop-blur">
                {flashAction === "play" ? <Play size={32} fill="white" /> : <Pause size={32} fill="white" />}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* 缓冲状态指示器 */}
        <AnimatePresence>
          {isBuffering && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                <span className="text-sm font-semibold text-white">加载中...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 加载进度条 */}
        {isMobile && loadProgress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <motion.div
              className="h-full bg-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${loadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        <AnimatePresence>
          {aiLoading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-zinc-950 shadow-xl">
                <Loader2 size={16} className="animate-spin" />
                AI 内容加载中
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className={`space-y-3 bg-zinc-950/95 px-4 py-4 text-white ${cinemaMode ? "shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6" : ""}`}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-interactive="true"
            onClick={togglePlayback}
            aria-label={isPlaying ? "暂停视频" : "播放视频"}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-950 transition hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white/70">
              <span>{formatPlaybackTime(playheadSeconds)}</span>
              <span>{formatPlaybackTime(durationSeconds || timeToSeconds(item.time))}</span>
            </div>
            <input
              data-interactive="true"
              aria-label="播放进度"
              type="range"
              min="0"
              max={Math.max(durationSeconds || timeToSeconds(item.time), 1)}
              step="0.1"
              value={clamp(playheadSeconds, 0, durationSeconds || timeToSeconds(item.time) || 1)}
              onChange={(event) => handleSeek(event.target.value)}
              onPointerDown={() => revealControls(true)}
              className="h-1.5 w-full cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {item.ai.timestamps.map((stamp) => (
            <button
              key={stamp.time}
              type="button"
              data-interactive="true"
              onClick={() => {
                onJump(stamp.time);
                handleSeek(timeToSeconds(stamp.time));
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95 ${activeStamp?.time === stamp.time ? "bg-cyan-400 text-zinc-950" : "bg-white/10 text-white hover:bg-white/20"}`}
            >
              {stamp.time}
            </button>
          ))}
          <button
            type="button"
            data-interactive="true"
            onClick={() => {
              setMuted((value) => !value);
              revealControls(true);
            }}
            aria-label={muted || volume === 0 ? "取消静音" : "静音"}
            className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold transition hover:bg-white/20 active:scale-95"
          >
            {muted || volume === 0 ? "静音" : "有声"}
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
          <button
            type="button"
            data-interactive="true"
            onClick={() => {
              setMuted((value) => !value);
              revealControls(true);
            }}
            aria-label={muted || volume === 0 ? "取消静音" : "静音"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 active:scale-95"
          >
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            data-interactive="true"
            aria-label="音量"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={(event) => handleVolumeChange(event.target.value)}
            onPointerDown={() => revealControls(true)}
            className="h-1.5 w-full cursor-pointer accent-cyan-400"
          />
        </div>

        <div className={actionGridClassName}>
          <button type="button" data-interactive="true" onClick={() => onOpenAi(item)} className="rounded-2xl bg-white/10 py-3 text-sm font-bold transition hover:bg-white/20 active:scale-95">
            AI 速读
          </button>
          {isLandscape ? (
            <button type="button" data-interactive="true" onClick={cinemaMode ? exitCinemaMode : enterCinemaMode} className="rounded-2xl bg-white/10 py-3 text-sm font-bold transition hover:bg-white/20 active:scale-95">
              <span className="inline-flex items-center gap-2">
                {cinemaMode ? <X size={16} /> : <Maximize2 size={16} />}
                {cinemaMode ? "退出" : "横屏"}
              </span>
            </button>
          ) : null}
          <button type="button" data-interactive="true" className="rounded-2xl bg-white/10 py-3 text-sm font-bold transition hover:bg-white/20 active:scale-95">
            <span className="inline-flex items-center gap-2">
              <Share2 size={16} />
              分享
            </span>
          </button>
          <button type="button" data-interactive="true" onClick={() => onOpenSave(item)} className="rounded-2xl bg-cyan-400 py-3 text-sm font-black text-zinc-950 transition hover:bg-cyan-300 active:scale-95">
            保存摘要
          </button>
        </div>

        <div className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
          <div className="text-xs font-bold text-cyan-300">当前片段</div>
          <div className="mt-2 text-sm font-semibold text-white">{activeStamp?.label || item.ai.timestamps[0].label}</div>
          <div className="mt-2 text-xs leading-relaxed text-white/65 line-clamp-2">{item.ai.summary[0]}</div>
        </div>
      </div>
    </div>
  );
}

function VideoPage({ item, currentTime, onBack, onOpenAi, onOpenSave, onJump, onSwipe }) {
  if (!item) return null;
  return (
    <div className="min-h-screen bg-black text-white">
      <StatusBar dark />
      <div className="px-3 pb-6">
        <VideoPlayerSurface item={item} currentTime={currentTime} onBack={onBack} onOpenAi={onOpenAi} onOpenSave={onOpenSave} onJump={onJump} onSwipe={onSwipe} />
        <div className="mt-4 grid gap-3">
          <div className="rounded-lg bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm font-semibold text-white/80">
              <span>合集：{item.category}专题</span>
              <span>当前标记：{currentTime}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${getProgressPercent(currentTime, item.time)}%` }} />
            </div>
          </div>
          <div className="rounded-lg bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur-sm">
            <div className="text-sm font-bold text-white/90">消费建议</div>
            <div className="mt-2 grid gap-2">
              {item.ai.summary.slice(0, 2).map((point) => (
                <div key={point} className="rounded-2xl bg-white/5 px-4 py-3 text-sm leading-relaxed text-white/80 ring-1 ring-white/10">
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function CinemaPage() {
  const [activeTab, setActiveTab] = useState("推荐");

  const cinemaCategories = [
    { id: "recommend", label: "推荐", icon: Sparkles },
    { id: "podcast", label: "播客", icon: Film },
    { id: "documentary", label: "纪录片", icon: Film },
    { id: "course", label: "公开课", icon: FileText },
    { id: "movie", label: "电影", icon: Film },
  ];

  const featuredContent = [
    {
      title: "AI 改变世界：从 ChatGPT 到 AGI",
      category: "纪录片",
      duration: "45:20",
      views: "128万",
      bg: "from-violet-600 to-purple-800",
      description: "探索人工智能如何重塑我们的未来",
    },
    {
      title: "投资心理学：为什么我们总是做出错误决策",
      category: "公开课",
      duration: "32:15",
      views: "89万",
      bg: "from-emerald-600 to-teal-800",
      description: "理解投资中的认知偏差和情绪陷阱",
    },
    {
      title: "极简生活：如何用更少获得更多",
      category: "播客",
      duration: "28:45",
      views: "67万",
      bg: "from-amber-600 to-orange-800",
      description: "探索极简主义的生活哲学",
    },
    {
      title: "量子计算入门：下一个技术革命",
      category: "纪录片",
      duration: "52:30",
      views: "156万",
      bg: "from-cyan-600 to-blue-800",
      description: "了解量子计算的基本原理和应用前景",
    },
  ];

  const continueWatching = [
    { title: "经济学思维方式", progress: 65, time: "剩余 12:30", bg: "from-rose-500 to-pink-700" },
    { title: "设计的艺术", progress: 40, time: "剩余 25:15", bg: "from-indigo-500 to-blue-700" },
    { title: "哲学入门", progress: 85, time: "剩余 05:45", bg: "from-green-500 to-emerald-700" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7f7]">
      <StatusBar />
      <div className="px-3 pb-6 pt-3">
        {/* 搜索栏 */}
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-100">
          <div className="flex items-center gap-2 rounded-full bg-zinc-50 px-4 py-3 text-zinc-400 ring-1 ring-zinc-100">
            <Search size={18} />
            <span>搜索视频、播客、纪录片</span>
          </div>

          {/* 分类标签 */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {cinemaCategories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeTab === cat.label;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.label)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-zinc-950 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  <Icon size={16} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 精选推荐 */}
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black text-zinc-950">精选推荐</h2>
            <button className="text-sm font-semibold text-zinc-500 hover:text-zinc-700">查看更多</button>
          </div>
          <div className="grid gap-3">
            {featuredContent.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group cursor-pointer overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-100 transition-all duration-200 hover:shadow-md hover:ring-zinc-200"
              >
                <div className={`relative h-40 bg-gradient-to-br ${item.bg}`}>
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="inline-flex rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-zinc-900">
                      {item.category}
                    </div>
                    <h3 className="mt-2 text-lg font-black text-white">{item.title}</h3>
                  </div>
                  <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-1 text-xs font-semibold text-white">
                    {item.duration}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm text-zinc-600">{item.description}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-400">{item.views}次观看</span>
                    <button className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-200">
                      播放
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 继续观看 */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black text-zinc-950">继续观看</h2>
            <button className="text-sm font-semibold text-zinc-500 hover:text-zinc-700">查看全部</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
            {continueWatching.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="w-48 shrink-0 cursor-pointer"
              >
                <div className={`relative h-28 rounded-lg bg-gradient-to-br ${item.bg} p-3`}>
                  <div className="absolute bottom-3 left-3 right-3">
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                    <div className="mt-2 h-1 rounded-full bg-white/30">
                      <div
                        className="h-1 rounded-full bg-white"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className="mt-1 text-xs text-white/80">{item.time}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 历史记录 */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black text-zinc-950">观看历史</h2>
            <button className="text-sm font-semibold text-zinc-500 hover:text-zinc-700">更多</button>
          </div>
          <div className="grid gap-3">
            {HISTORY_ITEMS.map((item) => (
              <div key={item.title} className="group flex cursor-pointer gap-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-100 transition-all duration-200 hover:shadow-md hover:ring-zinc-200 active:scale-[0.98]">
                <div className={`h-20 w-16 shrink-0 rounded-xl bg-gradient-to-br ${item.bg} transition-transform duration-300 group-hover:scale-105`} />
                <div className="flex-1">
                  <div className="text-base font-bold text-zinc-950 transition-colors duration-200 group-hover:text-zinc-700">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">纪录片 · {item.time}</div>
                  <div className="mt-2 h-1 rounded-full bg-zinc-100">
                    <div className="h-1 w-2/3 rounded-full bg-zinc-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessagePage() {
  const [activeFilter, setActiveFilter] = useState("全部");

  const messageFilters = ["全部", "互动", "系统", "功能", "私信"];

  const recentContacts = [
    { name: "AI学习小组", avatar: "AI", lastMsg: "今天的笔记分享好了吗？", time: "刚刚", unread: 3, online: true },
    { name: "投资交流群", avatar: "投", lastMsg: "市场分析报告已更新", time: "5分钟前", unread: 1, online: false },
    { name: "产品经理圈", avatar: "产", lastMsg: "需求评审会议纪要", time: "1小时前", unread: 0, online: true },
    { name: "技术分享", avatar: "技", lastMsg: "新的开源项目推荐", time: "2小时前", unread: 0, online: false },
  ];

  const systemMessages = [
    {
      type: "互动",
      icon: Heart,
      iconBg: "from-pink-500 to-rose-600",
      title: "互动消息",
      subtitle: "亚军等 2 人近期访问过你的主页",
      time: "09:42",
      unread: true,
    },
    {
      type: "系统",
      icon: Bell,
      iconBg: "from-blue-500 to-indigo-600",
      title: "系统通知",
      subtitle: "您的视频《AI工作流》已通过审核",
      time: "昨天",
      unread: true,
    },
    {
      type: "功能",
      icon: Sparkles,
      iconBg: "from-amber-500 to-orange-600",
      title: "功能更新",
      subtitle: "AI 笔记功能已升级，支持语音输入",
      time: "05/20",
      unread: false,
    },
    {
      type: "互动",
      icon: ThumbsUp,
      iconBg: "from-green-500 to-emerald-600",
      title: "点赞通知",
      content: "您的评论获得了 128 个赞",
      time: "05/19",
      unread: false,
    },
    {
      type: "系统",
      icon: User,
      iconBg: "from-purple-500 to-violet-600",
      title: "关注通知",
      subtitle: "科技观察 开始关注您",
      time: "05/18",
      unread: false,
    },
  ];

  const activities = [
    { user: "学习达人", action: "点赞了您的视频", target: "《Claude Code教程》", time: "2小时前" },
    { user: "AI爱好者", action: "评论了您的视频", target: "《赚钱思维》", time: "3小时前" },
    { user: "产品经理", action: "收藏了您的笔记", target: "《职场指南》", time: "5小时前" },
  ];

  const filteredMessages = activeFilter === "全部"
    ? systemMessages
    : systemMessages.filter(msg => msg.type === activeFilter);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <StatusBar />
      <div className="px-4 pb-6 pt-2">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-zinc-950">消息</h1>
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">5</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-full p-2 transition-all duration-200 hover:bg-zinc-100 active:scale-90">
              <Search size={22} className="text-zinc-700" />
            </button>
            <button className="rounded-full p-2 transition-all duration-200 hover:bg-zinc-100 active:scale-90">
              <MoreHorizontal size={22} className="text-zinc-700" />
            </button>
          </div>
        </div>

        {/* 最近联系人 */}
        <div className="mt-5">
          <h2 className="mb-3 text-sm font-bold text-zinc-500">最近联系</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
            {recentContacts.map((contact, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="group w-20 shrink-0 cursor-pointer text-center"
              >
                <div className="relative mx-auto">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-zinc-200 to-zinc-400 text-lg font-black text-zinc-700 transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
                    {contact.avatar}
                  </div>
                  {contact.online && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                  )}
                  {contact.unread > 0 && (
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {contact.unread}
                    </div>
                  )}
                </div>
                <div className="mt-2 line-clamp-1 text-xs font-medium text-zinc-800 transition-colors group-hover:text-zinc-600">
                  {contact.name}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 消息过滤器 */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {messageFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                activeFilter === filter
                  ? "bg-zinc-950 text-white"
                  : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* 动态活动 */}
        <div className="mt-5">
          <h2 className="mb-3 text-sm font-bold text-zinc-500">最新动态</h2>
          <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-100">
            {activities.map((activity, index) => (
              <div key={index} className={`flex items-start gap-3 py-2.5 ${index !== 0 ? 'border-t border-zinc-100' : ''}`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 text-xs font-bold text-zinc-600">
                  {activity.user.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-700">
                    <span className="font-semibold text-zinc-950">{activity.user}</span>
                    {' '}{activity.action}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">{activity.target}</p>
                </div>
                <span className="shrink-0 text-xs text-zinc-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 系统消息列表 */}
        <div className="mt-5">
          <h2 className="mb-3 text-sm font-bold text-zinc-500">消息通知</h2>
          <div className="space-y-2">
            {filteredMessages.map((msg, index) => {
              const Icon = msg.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-100 transition-all duration-200 hover:shadow-md hover:ring-zinc-200 active:scale-[0.99]"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${msg.iconBg} text-white transition-transform duration-200 group-hover:scale-105`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-zinc-950">{msg.title}</h3>
                      <span className="shrink-0 text-xs text-zinc-400">{msg.time}</span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{msg.subtitle || msg.content}</p>
                  </div>
                  {msg.unread && (
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* 快速操作 */}
        <div className="mt-6 grid grid-cols-4 gap-3">
          {[
            { icon: MessageCircle, label: "私信", count: 12 },
            { icon: Bell, label: "通知", count: 5 },
            { icon: User, label: "新增粉丝", count: 8 },
            { icon: ThumbsUp, label: "收到的赞", count: 156 },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex flex-col items-center gap-2 rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-100 transition-all duration-200 hover:shadow-md hover:ring-zinc-200 active:scale-95"
              >
                <div className="relative">
                  <Icon size={24} className="text-zinc-700" />
                  {item.count > 0 && (
                    <div className="absolute -right-2 -top-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {item.count > 99 ? '99+' : item.count}
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold text-zinc-600">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KnowledgePage({ sections, savedItems, mode, onModeChange, onOpenRecord, onDelete, onExport }) {
  const [query, setQuery] = useState("");
  const [sectionId, setSectionId] = useState("all");
  const [tag, setTag] = useState("全部");
  const [sortBy, setSortBy] = useState("latest");
  const [results, setResults] = useState(savedItems);

  const tags = useMemo(() => ["全部", ...Array.from(new Set(savedItems.flatMap((item) => item.tags)))], [savedItems]);

  useEffect(() => {
    let mounted = true;
    demoApi.search(savedItems, { query, sectionId, tag, mode, sortBy }).then((list) => {
      if (mounted) setResults(list);
    });
    return () => {
      mounted = false;
    };
  }, [savedItems, query, sectionId, tag, mode, sortBy]);

  return (
    <section className="mt-4 rounded-lg bg-white p-3 shadow-[0_8px_22px_rgba(0,0,0,0.025)] ring-1 ring-zinc-100">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-black text-zinc-950">{mode === "notes" ? "AI 笔记" : "知识库"}</h2>
          <p className="mt-1 text-xs text-zinc-500">支持关键词检索、标签匹配和按分区回看</p>
        </div>
        <button onClick={() => onModeChange(mode === "notes" ? "knowledge" : "notes")} className="rounded-full bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-900 transition-all duration-300 hover:bg-zinc-200 hover:shadow-sm active:scale-95">切换到{mode === "notes" ? "知识库" : "AI 笔记"}</button>
      </div>

      <div className="mt-4 rounded-2xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-100 transition-all duration-300 focus-within:bg-white focus-within:ring-zinc-300 focus-within:shadow-sm">
        <div className="flex items-center gap-2 text-sm text-zinc-400"><Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、作者、分区或摘要" className="w-full bg-transparent text-sm text-zinc-700 outline-none" />
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <button onClick={() => setSectionId("all")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-300 hover:shadow-sm active:scale-95 ${sectionId === "all" ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>全部分区</button>
        {sections.map((section) => (
          <button key={section.id} onClick={() => setSectionId(section.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-300 hover:shadow-sm active:scale-95 ${sectionId === section.id ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>{section.name}</button>
        ))}
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {tags.map((entry) => (
          <button key={entry} onClick={() => setTag(entry)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:shadow-sm active:scale-95 ${tag === entry ? "bg-cyan-500 text-white" : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"}`}>{entry}</button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1">
          {[["latest", "最新"], ["title", "标题"], ["category", "分类"]].map(([key, label]) => (
            <button key={key} onClick={() => setSortBy(key)} className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${sortBy === key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}>{label}</button>
          ))}
        </div>
        {savedItems.length > 0 && (
          <button onClick={onExport} className="rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-bold text-zinc-600 transition-all hover:bg-zinc-200 active:scale-95">导出 MD</button>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {results.length ? results.map((record) => (
          <div key={record.id} className="group relative flex w-full gap-3 rounded-lg bg-zinc-50 p-3 text-left ring-1 ring-zinc-100 transition-all duration-300 hover:bg-white hover:shadow-md hover:ring-zinc-200">
            <button onClick={() => onOpenRecord(record)} className="absolute inset-0 z-0" aria-label="查看记录" />
            <div className={`h-24 w-24 shrink-0 rounded-2xl bg-gradient-to-br ${record.bg} transition-transform duration-500 group-hover:scale-105`} />
            <div className="relative z-10 min-w-0 flex-1">
              <div className="line-clamp-2 text-[16px] font-black text-zinc-950 transition-colors duration-300 group-hover:text-cyan-700">{record.title}</div>
              <div className="mt-1 text-sm text-zinc-500">@{record.author} · {record.sectionName}</div>
              <div className="mt-2 line-clamp-2 text-sm text-zinc-600">{record.ai.summary[0]}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {record.tags.slice(0, 3).map((item) => <span key={item} className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-zinc-500 ring-1 ring-zinc-100">{item}</span>)}
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(record.itemId, record.sectionId); }} className="relative z-10 self-start rounded-full p-1.5 text-zinc-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-90" aria-label="删除">
              <X size={14} />
            </button>
          </div>
        )) : savedItems.length > 0 ? (
          <div className="rounded-2xl bg-zinc-50 px-4 py-6 text-center text-sm font-semibold text-zinc-500 ring-1 ring-zinc-100">暂无匹配内容，试试调整搜索条件</div>
        ) : (
          <div className="rounded-2xl bg-zinc-50 px-4 py-8 text-center ring-1 ring-zinc-100">
            <Database size={32} className="mx-auto text-zinc-300" />
            <p className="mt-3 text-sm font-semibold text-zinc-500">知识库是空的</p>
            <p className="mt-1 text-xs text-zinc-400">在视频页点击"添加到知识库"开始收藏</p>
          </div>
        )}
      </div>
    </section>
  );
}
function MePage({ sections, savedItems, knowledgeMode, onKnowledgeModeChange, onOpenRecord, onDeleteItem, handleExport }) {
  const sectionSummary = sections.map((section) => ({
    ...section,
    count: savedItems.filter((item) => item.sectionId === section.id).length,
  }));

  return (
    <div className="min-h-screen bg-[#f2f2f3] px-4 pb-8">
      <div className="relative -mx-4 overflow-hidden bg-[#f2f2f3] px-4 pb-6 pt-5">
        <div className="flex justify-end pb-8"><button className="rounded-2xl p-1.5 transition-all duration-300 hover:bg-zinc-200/50 active:scale-90"><Menu size={31} className="text-zinc-950" /></button></div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-[82px] w-[82px] items-center justify-center rounded-full bg-gradient-to-br from-sky-100 via-blue-200 to-indigo-200 text-[42px]">学</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><div className="truncate text-[33px] font-black text-zinc-950">醉兮</div><span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-zinc-500 ring-1 ring-zinc-200">个人</span></div>
              <div className="mt-4 truncate text-[19px] font-medium text-zinc-500">抖音号：83780582279</div>
            </div>
          </div>
          <button className="rounded-full bg-white px-5 py-2.5 text-[18px] font-bold text-zinc-900 ring-1 ring-zinc-200 transition-all duration-300 hover:bg-zinc-50 hover:shadow-sm active:scale-95">我的主页</button>
        </div>
      </div>

      <section className="-mt-2 grid grid-cols-4 rounded-lg bg-white py-5 shadow-[0_8px_22px_rgba(0,0,0,0.025)] ring-1 ring-zinc-100">
        {[[17, "作品"], [9, "互关"], [80, "关注"], [35, "粉丝"]].map(([num, label], index) => <div key={label} className={`group cursor-pointer text-center ${index ? "border-l border-zinc-200" : ""}`}><div className="text-[25px] font-black text-zinc-950 transition-transform duration-300 group-hover:scale-110 group-hover:text-zinc-700">{num}</div><div className="mt-2 text-[18px] font-medium text-zinc-900 transition-colors duration-300 group-hover:text-zinc-600">{label}</div></div>)}
      </section>

      <section className="mt-4 rounded-lg bg-white p-3 shadow-[0_8px_22px_rgba(0,0,0,0.025)] ring-1 ring-zinc-100">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-[22px] font-black text-zinc-950">观看历史</h2><span className="text-sm font-semibold text-zinc-400">全部</span></div>
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
          {HISTORY_ITEMS.map((item) => (
            <div key={item.title} className="group w-32 shrink-0 cursor-pointer">
              <div className={`h-24 rounded-2xl bg-gradient-to-br ${item.bg} p-3 text-white transition-transform duration-300 group-hover:scale-105 group-hover:shadow-md`}><div className="text-sm font-black">{item.coverTitle}</div></div>
              <div className="mt-2 line-clamp-2 text-sm text-zinc-800 transition-colors duration-300 group-hover:text-zinc-500">{item.title}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 divide-y divide-zinc-100">
          <button onClick={() => onKnowledgeModeChange("notes")} className="group flex w-full items-center justify-between py-4 text-left transition-colors duration-300 hover:bg-zinc-50/50"><div className="flex items-center gap-3"><FileText size={22} className="text-zinc-800 transition-transform duration-300 group-hover:scale-110 group-hover:text-cyan-600" /><span className="text-[20px] font-semibold text-zinc-950 transition-colors duration-300 group-hover:text-zinc-700">AI 笔记</span></div><ChevronRight size={22} className="text-zinc-400 transition-transform duration-300 group-hover:translate-x-1" /></button>
          <button onClick={() => onKnowledgeModeChange("knowledge")} className="group flex w-full items-center justify-between py-4 text-left transition-colors duration-300 hover:bg-zinc-50/50"><div className="flex items-center gap-3"><Database size={22} className="text-zinc-800 transition-transform duration-300 group-hover:scale-110 group-hover:text-cyan-600" /><span className="text-[20px] font-semibold text-zinc-950 transition-colors duration-300 group-hover:text-zinc-700">知识库</span></div><ChevronRight size={22} className="text-zinc-400 transition-transform duration-300 group-hover:translate-x-1" /></button>
        </div>
      </section>

      <section className="mt-4 rounded-lg bg-white p-3 shadow-[0_8px_22px_rgba(0,0,0,0.025)] ring-1 ring-zinc-100">
        <div className="mb-3 text-[22px] font-black text-zinc-950">我的分区</div>
        <div className="grid gap-2">
          {sectionSummary.map((section) => (
            <div key={section.id} className="group flex cursor-pointer items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-100 transition-all duration-300 hover:bg-white hover:shadow-sm hover:ring-zinc-200">
              <div>
                <div className="text-sm font-black text-zinc-950 transition-colors duration-300 group-hover:text-zinc-700">{section.name}</div>
                <div className="mt-1 text-xs text-zinc-500 transition-colors duration-300 group-hover:text-zinc-400">{section.desc}</div>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-zinc-500 ring-1 ring-zinc-100 transition-all duration-300 group-hover:bg-zinc-900 group-hover:text-white group-hover:ring-zinc-900">{section.count} 条</div>
            </div>
          ))}
        </div>
      </section>

      <KnowledgePage sections={sections} savedItems={savedItems} mode={knowledgeMode} onModeChange={onKnowledgeModeChange} onOpenRecord={onOpenRecord} onDelete={onDeleteItem} onExport={handleExport} />
    </div>
  );
}

export default function DouyinFeaturedUIDemo() {
  const [active, setActive] = useState("home");
  const [videoItem, setVideoItem] = useState(null);
  const [currentTime, setCurrentTime] = useState("00:00");
  const [feedbackItem, setFeedbackItem] = useState(null);
  const [aiItem, setAiItem] = useState(null);
  const [saveItem, setSaveItem] = useState(null);
  const [toast, setToast] = useState("");
  const [knowledgeMode, setKnowledgeMode] = useState("notes");
  const [sections, setSections] = useState(() => readStorage(STORAGE_KEYS.sections, DEFAULT_SECTIONS));
  const [savedItems, setSavedItems] = useState(() => readStorage(STORAGE_KEYS.saved, INITIAL_SAVED_ITEMS));

  useEffect(() => writeStorage(STORAGE_KEYS.sections, sections), [sections]);
  useEffect(() => writeStorage(STORAGE_KEYS.saved, savedItems), [savedItems]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openVideo = (item, time) => {
    setVideoItem(item);
    setCurrentTime(time || item.ai.timestamps[0].time);
    setAiItem(null);
    setActive("video");
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
  };

  const handleCreateSection = async (name) => {
    const result = await demoApi.createSection(sections, name);
    if (result.ok) {
      setSections(result.sections);
      setToast(result.message);
    }
    return result;
  };

  const handleSave = async (item, sectionId) => {
    const result = await demoApi.saveItem(savedItems, item, sectionId, sections);
    if (result.ok) {
      setSavedItems(result.savedItems);
      setToast(result.message);
      setSaveItem(null);
      setKnowledgeMode("knowledge");
    }
  };

  const handleDeleteItem = async (itemId, sectionId) => {
    const updated = await demoApi.removeItem(savedItems, itemId, sectionId);
    setSavedItems(updated);
    setToast("已从知识库移除");
  };

  const handleExport = () => {
    const md = demoApi.exportMarkdown(savedItems, sections);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `知识库导出-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("已导出 Markdown 文件");
  };

  const openRecord = (record) => {
    const item = FEED_ITEMS.find((entry) => entry.id === record.itemId) || { ...record, id: record.itemId };
    openVideo(item, record.ai.timestamps[0].time);
  };

  const swipeVideo = (direction) => {
    if (!videoItem) return;
    const currentIndex = FEED_ITEMS.findIndex((item) => item.id === videoItem.id);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = direction === "next"
      ? (safeIndex + 1) % FEED_ITEMS.length
      : (safeIndex - 1 + FEED_ITEMS.length) % FEED_ITEMS.length;
    const nextItem = FEED_ITEMS[nextIndex];

    // 预加载下一个视频
    if (isMobile) {
      const preloadIndex = direction === "next"
        ? (nextIndex + 1) % FEED_ITEMS.length
        : (nextIndex - 1 + FEED_ITEMS.length) % FEED_ITEMS.length;
      const preloadItem = FEED_ITEMS[preloadIndex];
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = preloadItem.videoUrl;
      document.head.appendChild(link);
    }

    setVideoItem(nextItem);
    setCurrentTime(nextItem.ai.timestamps[0].time);
    setAiItem(null);
    setToast(direction === "next" ? "已切到下一条" : "已切到上一条");
  };

  return (
    <div className="min-h-screen bg-neutral-200 py-0 sm:py-8">
      <div className="mx-auto min-h-screen max-w-[430px] overflow-hidden bg-[#f6f6f7] shadow-2xl sm:min-h-[880px] sm:rounded-[2.4rem] sm:ring-8 sm:ring-zinc-900">
        {active === "home" && <HomePage items={FEED_ITEMS} onOpen={(item) => openVideo(item)} onSummarize={setAiItem} onMore={setFeedbackItem} />}
        {active === "cinema" && <CinemaPage />}
        {active === "message" && <MessagePage />}
        {active === "me" && <MePage sections={sections} savedItems={savedItems} knowledgeMode={knowledgeMode} onKnowledgeModeChange={setKnowledgeMode} onOpenRecord={openRecord} onDeleteItem={handleDeleteItem} handleExport={handleExport} />}
        {active === "video" && videoItem && <VideoPage item={videoItem} currentTime={currentTime} onBack={() => setActive("home")} onOpenAi={setAiItem} onOpenSave={setSaveItem} onJump={setCurrentTime} onSwipe={swipeVideo} />}
        {active !== "video" && <BottomNav active={active} onChange={setActive} />}
      </div>

      <Toast toast={toast} />
      <FeedbackSheet item={feedbackItem} onClose={() => setFeedbackItem(null)} onSelect={(option) => { setToast(`已提交反馈：${option}`); setFeedbackItem(null); }} />
      <AiSummarySheet item={aiItem} onClose={() => setAiItem(null)} onJump={(item, time) => openVideo(item, time)} onOpenVideo={(item) => openVideo(item)} onOpenSave={setSaveItem} />
      <SaveSheet item={saveItem} sections={sections} onClose={() => setSaveItem(null)} onCreateSection={handleCreateSection} onSave={handleSave} />
    </div>
  );
}
