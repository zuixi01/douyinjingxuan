import React, { useEffect, useMemo, useState } from "react";
import { Database, Plus, Search, X } from "lucide-react";
import { collectKnowledgeTags } from "./model";
import { knowledgeService } from "../../services/knowledgeService";

export default function KnowledgePage({
  sections,
  savedItems,
  mode,
  onModeChange,
  onOpenRecord,
  onDelete,
  onExport,
  onCreateTextCard,
}) {
  const [query, setQuery] = useState("");
  const [sectionId, setSectionId] = useState("all");
  const [tag, setTag] = useState("全部");
  const [sortBy, setSortBy] = useState("latest");
  const [results, setResults] = useState(savedItems);

  const tags = useMemo(() => collectKnowledgeTags(savedItems), [savedItems]);

  useEffect(() => {
    let mounted = true;
    knowledgeService.search(savedItems, { query, sectionId, tag, mode, sortBy }).then((list) => {
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
        <button
          onClick={() => onModeChange(mode === "notes" ? "knowledge" : "notes")}
          className="rounded-full bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-900 transition-all duration-300 hover:bg-zinc-200 hover:shadow-sm active:scale-95"
        >
          切换到{mode === "notes" ? "知识库" : "AI 笔记"}
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-100 transition-all duration-300 focus-within:bg-white focus-within:ring-zinc-300 focus-within:shadow-sm">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、作者、分区或摘要"
            className="w-full bg-transparent text-sm text-zinc-700 outline-none"
          />
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <button
          onClick={() => setSectionId("all")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-300 hover:shadow-sm active:scale-95 ${
            sectionId === "all" ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          全部分区
        </button>
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setSectionId(section.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-300 hover:shadow-sm active:scale-95 ${
              sectionId === section.id ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {section.name}
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {tags.map((entry) => (
          <button
            key={entry}
            onClick={() => setTag(entry)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:shadow-sm active:scale-95 ${
              tag === entry ? "bg-cyan-500 text-white" : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
            }`}
          >
            {entry}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1">
          {[["latest", "最新"], ["title", "标题"], ["category", "分类"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                sortBy === key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <TextIntakeButton sections={sections} onCreateTextCard={onCreateTextCard} />
          {savedItems.length > 0 ? (
            <button
              onClick={onExport}
              className="rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-bold text-zinc-600 transition-all hover:bg-zinc-200 active:scale-95"
            >
              导出 MD
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {results.length ? (
          results.map((record) => (
            <div
              key={record.id}
              className="group relative flex w-full gap-3 rounded-lg bg-zinc-50 p-3 text-left ring-1 ring-zinc-100 transition-all duration-300 hover:bg-white hover:shadow-md hover:ring-zinc-200"
            >
              <button onClick={() => onOpenRecord(record)} className="absolute inset-0 z-0" aria-label="查看记录" />
              <div className={`h-24 w-24 shrink-0 rounded-2xl bg-gradient-to-br ${record.bg} transition-transform duration-500 group-hover:scale-105`} />
              <div className="relative z-10 min-w-0 flex-1">
                <div className="line-clamp-2 text-[16px] font-black text-zinc-950 transition-colors duration-300 group-hover:text-cyan-700">
                  {record.title}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                  <span>@{record.author} · {record.sectionName}</span>
                  <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-700">
                    {record.summaryStatus === "ready" ? "已整理" : "草稿"}
                  </span>
                </div>
                <div className="mt-2 line-clamp-2 text-sm text-zinc-600">{record.excerpt || record.ai?.summary?.[0]}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {record.tags.slice(0, 3).map((item) => (
                    <span key={item} className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-zinc-500 ring-1 ring-zinc-100">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(record.itemId, record.sectionId);
                }}
                className="relative z-10 self-start rounded-full p-1.5 text-zinc-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-90"
                aria-label="删除"
              >
                <X size={14} />
              </button>
            </div>
          ))
        ) : savedItems.length > 0 ? (
          <div className="rounded-2xl bg-zinc-50 px-4 py-6 text-center text-sm font-semibold text-zinc-500 ring-1 ring-zinc-100">
            暂无匹配内容，试试调整搜索条件
          </div>
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

function TextIntakeButton({ sections, onCreateTextCard }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? "default");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSectionId((current) => current || sections[0]?.id || "default");
  }, [open, sections]);

  const reset = () => {
    setTitle("");
    setContent("");
    setTags("");
    setSectionId(sections[0]?.id ?? "default");
    setError("");
    setSaving(false);
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("请输入标题");
      return;
    }
    if (content.trim().length < 10) {
      setError("正文至少输入 10 个字");
      return;
    }

    setSaving(true);
    setError("");
    const result = await onCreateTextCard({
      title: title.trim(),
      content: content.trim(),
      tags: tags
        .split(/[，,]/)
        .map((item) => item.trim())
        .filter(Boolean),
      sectionId,
      author: "手动整理",
      category: "笔记",
    });

    if (!result.ok) {
      setError(result.message);
      setSaving(false);
      return;
    }
    reset();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1 text-[11px] font-bold text-white transition-all hover:bg-zinc-800 active:scale-95"
      >
        <Plus size={12} />
        手动录入
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/40 p-3 backdrop-blur-sm" onClick={reset}>
          <div
            className="w-full rounded-xl bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-base font-black text-zinc-950">手动录入知识卡片</div>
                <div className="mt-1 text-sm text-zinc-500">把你的想法、摘录或资料直接整理进知识库</div>
              </div>
              <button
                onClick={reset}
                className="rounded-full bg-zinc-100 p-2 transition-all duration-300 hover:bg-zinc-200 hover:rotate-90 active:scale-90"
                aria-label="关闭录入"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="标题，例如：我对 AI 知识库产品的判断"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-900"
              />
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="输入正文内容，系统会自动生成首版摘要和知识卡片"
                className="min-h-36 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-900"
              />
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="标签，用逗号分隔，例如：AI知识库, 产品设计"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-900"
              />
              <select
                value={sectionId}
                onChange={(event) => setSectionId(event.target.value)}
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-900"
              >
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
              {error ? <div className="text-xs font-semibold text-rose-500">{error}</div> : null}
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full rounded-2xl bg-zinc-950 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "保存中..." : "整理并保存"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
