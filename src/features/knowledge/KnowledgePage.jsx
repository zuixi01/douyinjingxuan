import React, { useEffect, useMemo, useState } from "react";
import { Database, Plus, Search, X } from "lucide-react";
import { buildKnowledgeGraph, collectKnowledgeTags, normalizeAiCardData } from "./model";
import { knowledgeService } from "../../services/knowledgeService";

export default function KnowledgePage({
  sections,
  savedItems,
  mode,
  onOpenRecord,
  onDelete,
  onExport,
  onCreateTextCard,
}) {
  const [query, setQuery] = useState("");
  const [sectionId, setSectionId] = useState("all");
  const [tag, setTag] = useState("全部");
  const [viewMode, setViewMode] = useState("cards");
  const [results, setResults] = useState(savedItems);
  const [previewRecord, setPreviewRecord] = useState(null);

  const tags = useMemo(() => collectKnowledgeTags(savedItems), [savedItems]);
  const graph = useMemo(() => buildKnowledgeGraph(results), [results]);
  const previewIndex = useMemo(
    () => results.findIndex((record) => record.id === previewRecord?.id),
    [results, previewRecord],
  );

  useEffect(() => {
    if (!previewRecord) return;
    if (!results.length) {
      setPreviewRecord(null);
      return;
    }
    if (previewIndex === -1) {
      setPreviewRecord(results[0] ?? null);
    }
  }, [previewIndex, previewRecord, results]);

  useEffect(() => {
    let mounted = true;
    knowledgeService.search(savedItems, { query, sectionId, tag, mode, sortBy: "latest" }).then((list) => {
      if (mounted) setResults(list);
    });
    return () => {
      mounted = false;
    };
  }, [savedItems, query, sectionId, tag, mode]);

  return (
    <section className="mt-4 rounded-lg bg-white p-3 shadow-[0_8px_22px_rgba(0,0,0,0.025)] ring-1 ring-zinc-100">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-black text-zinc-950">知识库</h2>
          <p className="mt-1 text-xs text-zinc-500">支持关键词检索、标签匹配和按分区回看</p>
        </div>
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

      <div className="mt-3 flex items-center justify-end gap-2">
        <div className="flex gap-1">
          {[["cards", "卡片"], ["graph", "图谱"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                viewMode === key ? "bg-cyan-500 text-white" : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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

      <div className="mt-3 space-y-3">
        {viewMode === "graph" ? (
          <KnowledgeGraphView graph={graph} records={results} onOpenRecord={onOpenRecord} />
        ) : results.length ? (
          results.map((record) => (
            <KnowledgeCard key={record.id} record={record} onOpenRecord={setPreviewRecord} onDelete={onDelete} />
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

      <KnowledgeCardModal
        record={previewRecord}
        currentIndex={previewIndex}
        total={results.length}
        onClose={() => setPreviewRecord(null)}
        onOpenVideo={(record) => {
          setPreviewRecord(null);
          onOpenRecord(record);
        }}
        onOpenPrev={() => {
          if (previewIndex > 0) setPreviewRecord(results[previewIndex - 1]);
        }}
        onOpenNext={() => {
          if (previewIndex >= 0 && previewIndex < results.length - 1) setPreviewRecord(results[previewIndex + 1]);
        }}
      />
    </section>
  );
}

function KnowledgeCard({ record, onOpenRecord, onDelete }) {
  const ai = normalizeAiCardData({ title: record.title, tags: record.tags, ai: record.ai });
  const heroQuote = ai.quotes[0]?.text ?? "";
  const keyPoints = ai.summary.slice(0, 3);
  const quoteList = ai.quotes.slice(0, 3);
  const insightBlocks = ai.infographic.slice(0, 2);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenRecord(record)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenRecord(record);
        }
      }}
      className="group relative overflow-hidden rounded-[28px] bg-white text-left shadow-[0_14px_40px_rgba(15,23,42,0.08)] ring-1 ring-zinc-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)] hover:ring-cyan-200"
      aria-label={`查看记录：${record.title}`}
    >
      <div className={`relative overflow-hidden bg-gradient-to-br ${record.bg} px-5 pb-5 pt-4 text-white`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_30%),linear-gradient(180deg,transparent,rgba(0,0,0,0.18))]" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-white/85">
                <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{record.sectionName}</span>
                <span className="rounded-full bg-black/15 px-3 py-1 backdrop-blur">@{record.author}</span>
              </div>
              <div className="mt-3 line-clamp-2 text-[20px] font-black leading-tight">
                {record.title}
              </div>
              <div className="mt-2 text-xs font-semibold text-white/80">
                {record.summaryStatus === "ready" ? "已整理为知识卡片" : "草稿卡片"} · {record.time}
              </div>
            </div>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onDelete(record.itemId, record.sectionId);
              }}
              onKeyDown={(event) => event.stopPropagation()}
              className="relative z-10 self-start rounded-full bg-black/15 p-2 text-white/80 backdrop-blur transition-all hover:bg-red-500/20 hover:text-white active:scale-90"
              aria-label="删除"
            >
              <X size={14} />
            </button>
          </div>

          {heroQuote ? (
            <div className="mt-4 rounded-3xl bg-white/14 px-4 py-4 backdrop-blur-md ring-1 ring-white/20">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">核心金句</div>
              <div className="mt-2 text-[16px] font-semibold leading-relaxed text-white">
                "{heroQuote}"
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {ai.keywords.slice(0, 5).map((item) => (
              <span key={item} className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white ring-1 ring-white/20 backdrop-blur">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4">
        <div className="grid gap-3 lg:grid-cols-[1.25fr_0.95fr]">
          <div className="rounded-3xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">核心观点</div>
            <div className="mt-3 space-y-2">
              {keyPoints.length ? keyPoints.map((point) => (
                <div key={point} className="rounded-2xl bg-white px-3 py-3 text-sm font-medium leading-relaxed text-zinc-700 ring-1 ring-zinc-100">
                  {point}
                </div>
              )) : (
                <div className="rounded-2xl bg-white px-3 py-3 text-sm text-zinc-500 ring-1 ring-zinc-100">
                  暂无核心观点，点击可进入视频页继续整理。
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-[linear-gradient(180deg,#f8fafc,#eef6ff)] p-4 ring-1 ring-cyan-100">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-500">干货速览</div>
            <div className="mt-3 space-y-2">
              {insightBlocks.length ? insightBlocks.map((block) => (
                <div key={block.title} className="rounded-2xl bg-white/90 px-3 py-3 ring-1 ring-white">
                  <div className="text-sm font-black text-zinc-900">{block.title}</div>
                  <div className="mt-1 text-sm leading-relaxed text-zinc-600">{block.text}</div>
                </div>
              )) : (
                <div className="rounded-2xl bg-white/90 px-3 py-3 text-sm text-zinc-500 ring-1 ring-white">
                  {ai.takeaway}
                </div>
              )}
            </div>
          </div>
        </div>

        {quoteList.length > 1 ? (
          <div className="rounded-3xl bg-[linear-gradient(135deg,#fff7ed,#fff1f2)] p-4 ring-1 ring-orange-100">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-400">金句墙</div>
            <div className="mt-3 grid gap-2">
              {quoteList.slice(1).map((quote) => (
                <div key={quote.id || quote.text} className="rounded-2xl bg-white/85 px-3 py-3 text-sm font-semibold leading-relaxed text-zinc-700 ring-1 ring-white">
                  "{quote.text}"
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function KnowledgeGraphView({ graph, records, onOpenRecord }) {
  const [selectedClusterId, setSelectedClusterId] = useState(graph.clusters[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState(graph.clusters[0]?.branches[0]?.items[0]?.id ?? "");
  const [selectedBranchId, setSelectedBranchId] = useState(graph.clusters[0]?.branches[0]?.id ?? "");
  const [selectedBridgeId, setSelectedBridgeId] = useState("");
  const [zoomClusterId, setZoomClusterId] = useState("");

  useEffect(() => {
    setSelectedClusterId(graph.clusters[0]?.id ?? "");
    setSelectedId(graph.clusters[0]?.branches[0]?.items[0]?.id ?? "");
    setSelectedBranchId(graph.clusters[0]?.branches[0]?.id ?? "");
    setSelectedBridgeId("");
  }, [graph]);

  const selectedBridge = graph.bridges.find((bridge) => bridge.id === selectedBridgeId) ?? null;
  const selectedCluster = graph.clusters.find((cluster) => cluster.id === (selectedBridge?.sourceClusterId ?? selectedClusterId))
    ?? graph.clusters[0]
    ?? null;
  const selectedBranch = selectedCluster?.branches.find((branch) => branch.id === selectedBranchId) ?? selectedCluster?.branches[0] ?? null;
  const selectedNode = selectedCluster?.nodes.find((node) => node.id === selectedId) ?? selectedCluster?.branches[0]?.items[0] ?? null;
  const relatedRecords = useMemo(
    () => ((selectedBridge?.cardRefs ?? selectedNode?.cardRefs ?? selectedCluster?.cardRefs) ?? [])
      .map((cardRef) => records.find((record) => record.id === cardRef.id))
      .filter(Boolean),
    [records, selectedBridge, selectedCluster, selectedNode],
  );

  useEffect(() => {
    if (!selectedCluster) return;
    const allBranchItems = selectedCluster.branches.flatMap((branch) => branch.items);
    if (!allBranchItems.some((node) => node.id === selectedId)) {
      setSelectedId(allBranchItems[0]?.id ?? "");
      setSelectedBranchId(selectedCluster.branches[0]?.id ?? "");
    }
  }, [selectedCluster, selectedId]);

  if (!graph.clusters.length) {
    return (
      <div className="rounded-2xl bg-zinc-50 px-4 py-8 text-center ring-1 ring-zinc-100">
        <Database size={32} className="mx-auto text-zinc-300" />
        <p className="mt-3 text-sm font-semibold text-zinc-500">当前内容还不足以生成图谱</p>
        <p className="mt-1 text-xs text-zinc-400">先收藏几条视频或录入几张知识卡片</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <GraphMetric label="视频" value={graph.clusters.length} />
        <GraphMetric label="知识点" value={graph.nodes.length} />
        <GraphMetric label="跨视频关联" value={graph.bridges.length} compact />
      </div>

      <div className="overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.16),transparent_38%),linear-gradient(180deg,#ffffff,#f4f8fb)] p-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)] ring-1 ring-zinc-100">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-zinc-950">跨视频关联桥</div>
            <div className="mt-1 text-xs text-zinc-500">把不同视频中共享的主题保留出来，但不再堆在同一张图上。</div>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-cyan-700 ring-1 ring-cyan-100">
            {graph.bridges.length} 条桥接
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {graph.bridges.length ? graph.bridges.map((bridge) => {
            const sourceCluster = graph.clusters.find((cluster) => cluster.id === bridge.sourceClusterId);
            const targetCluster = graph.clusters.find((cluster) => cluster.id === bridge.targetClusterId);
            const active = bridge.id === selectedBridgeId;
            return (
              <button
                key={bridge.id}
                onClick={() => {
                  setSelectedBridgeId(bridge.id);
                  setSelectedClusterId(bridge.sourceClusterId);
                  setSelectedBranchId(sourceCluster?.branches[0]?.id ?? "");
                  setSelectedId(sourceCluster?.branches[0]?.items[0]?.id ?? "");
                }}
                className={`w-full rounded-[24px] px-4 py-3 text-left ring-1 transition-all hover:-translate-y-0.5 hover:ring-cyan-200 hover:shadow-[0_12px_28px_rgba(6,182,212,0.12)] active:scale-[0.99] ${
                  active ? "bg-[linear-gradient(135deg,#ecfeff,#f0f9ff)] ring-cyan-200 shadow-[0_10px_24px_rgba(6,182,212,0.12)]" : "bg-white/90 ring-zinc-100"
                }`}
                aria-label={`图谱关系：${bridge.label}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                      <span className="truncate">{sourceCluster?.title ?? bridge.sourceClusterId}</span>
                      <span className="text-cyan-500">→</span>
                      <span className="truncate">{targetCluster?.title ?? bridge.targetClusterId}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">共同主题：{bridge.sharedLabels.join(" · ")}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-bold text-zinc-600">
                    {bridge.strength} 个交点
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {bridge.sharedLabels.map((label) => (
                    <span key={`${bridge.id}-${label}`} className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold text-cyan-700 ring-1 ring-cyan-100">
                      {label}
                    </span>
                  ))}
                </div>
              </button>
            );
          }) : (
            <div className="rounded-2xl bg-white px-4 py-4 text-sm text-zinc-500 ring-1 ring-zinc-100">
              目前这些视频的主题差异较大，暂时还没有稳定的跨视频关联。
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {graph.clusters.map((cluster) => (
          <ClusterGraphCard
            key={cluster.id}
            cluster={cluster}
            activeClusterId={selectedClusterId}
            selectedNodeId={selectedId}
            selectedBranchId={selectedBranchId}
            onOpenZoom={(clusterId) => setZoomClusterId(clusterId)}
            onSelectCluster={(clusterId) => {
              setSelectedClusterId(clusterId);
              setSelectedBridgeId("");
            }}
            onSelectNode={(clusterId, nodeId) => {
              const branch = graph.clusters.find((entry) => entry.id === clusterId)?.branches
                .find((entry) => entry.items.some((item) => item.id === nodeId));
              setSelectedClusterId(clusterId);
              setSelectedId(nodeId);
              setSelectedBranchId(branch?.id ?? "");
              setSelectedBridgeId("");
            }}
            onSelectBranch={(clusterId, branchId) => {
              const branch = graph.clusters.find((entry) => entry.id === clusterId)?.branches.find((entry) => entry.id === branchId);
              setSelectedClusterId(clusterId);
              setSelectedBranchId(branchId);
              setSelectedId(branch?.items[0]?.id ?? "");
              setSelectedBridgeId("");
            }}
          />
        ))}
      </div>

      <GraphZoomModal
        cluster={graph.clusters.find((cluster) => cluster.id === zoomClusterId) ?? null}
        activeClusterId={selectedClusterId}
        selectedNodeId={selectedId}
        selectedBranchId={selectedBranchId}
        onClose={() => setZoomClusterId("")}
        onSelectCluster={(clusterId) => {
          setSelectedClusterId(clusterId);
          setSelectedBridgeId("");
        }}
        onSelectNode={(clusterId, nodeId) => {
          const branch = graph.clusters.find((entry) => entry.id === clusterId)?.branches
            .find((entry) => entry.items.some((item) => item.id === nodeId));
          setSelectedClusterId(clusterId);
          setSelectedId(nodeId);
          setSelectedBranchId(branch?.id ?? "");
          setSelectedBridgeId("");
        }}
        onSelectBranch={(clusterId, branchId) => {
          const branch = graph.clusters.find((entry) => entry.id === clusterId)?.branches.find((entry) => entry.id === branchId);
          setSelectedClusterId(clusterId);
          setSelectedBranchId(branchId);
          setSelectedId(branch?.items[0]?.id ?? "");
          setSelectedBridgeId("");
        }}
      />

      {selectedCluster && selectedNode ? (
        <div className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-500">{selectedCluster.title}</div>
              <div className="mt-1 text-base font-black text-zinc-950">{selectedBridge ? "跨视频关联" : selectedBranch?.label ?? selectedNode?.label}</div>
              <div className="mt-1 text-xs font-semibold text-zinc-500">
                {selectedBridge
                  ? `桥接视频 ${relatedRecords.length} 条`
                  : `知识条目 ${selectedBranch?.items.length ?? 0} 条`}
              </div>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-cyan-700 ring-1 ring-cyan-100">
              {selectedBridge ? "bridge" : selectedBranch?.label ?? "branch"}
            </div>
          </div>

          {selectedBridge ? (
            <div className="mt-3 rounded-2xl bg-white px-3 py-3 text-sm text-zinc-600 ring-1 ring-zinc-100">
              这两个视频通过 <span className="font-bold text-zinc-900">{selectedBridge.sharedLabels.join("、")}</span> 产生关联。
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {(selectedNode?.tags ?? []).slice(0, 6).map((tag) => (
                <span key={tag} className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-zinc-500 ring-1 ring-zinc-100">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {!selectedBridge ? (
            <div className="mt-4 space-y-2">
              {selectedCluster.branches.length ? selectedCluster.branches.map((branch) => {
                const active = branch.id === selectedBranchId;
                return (
                  <button
                    key={branch.id}
                    onClick={() => {
                      setSelectedBranchId(branch.id);
                      setSelectedId(branch.items[0]?.id ?? "");
                    }}
                    className={`w-full rounded-2xl px-3 py-3 text-left text-sm ring-1 transition-all hover:ring-cyan-200 active:scale-[0.99] ${
                      active ? "bg-cyan-50 text-zinc-700 ring-cyan-200" : "bg-white text-zinc-600 ring-zinc-100"
                    }`}
                    aria-label={`查看关系：${branch.label}`}
                  >
                    <span className="font-bold text-zinc-900">{branch.label}</span>
                    <span className="ml-2 text-zinc-500">{branch.items.length} 条知识点</span>
                  </button>
                );
              }) : (
                <div className="rounded-2xl bg-white px-3 py-3 text-sm text-zinc-500 ring-1 ring-zinc-100">
                  当前视频还没有可展示的知识分支
                </div>
              )}
            </div>
          ) : null}

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-xs font-black text-zinc-500">{selectedBridge ? "桥接视频" : "关联卡片"}</div>
              {relatedRecords[0] ? (
                <button
                  onClick={() => onOpenRecord(relatedRecords[0])}
                  className="rounded-full bg-cyan-500 px-3 py-1 text-[11px] font-bold text-white transition-all hover:bg-cyan-600 active:scale-95"
                >
                  打开首条卡片
                </button>
              ) : null}
            </div>
            {!selectedBridge && selectedBranch ? (
              <div className="mb-2 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-zinc-500 ring-1 ring-zinc-100">
                当前关系：
                <span className="ml-1 font-bold text-zinc-900">{selectedCluster.title}</span>
                <span className="mx-1 text-cyan-600">→</span>
                <span className="font-bold text-zinc-900">{selectedBranch.label}</span>
              </div>
            ) : null}
            {!selectedBridge && selectedBranch ? (
              <div className="mb-3 grid gap-2">
                {selectedBranch.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`rounded-2xl px-3 py-3 text-left text-sm ring-1 transition-all ${
                      item.id === selectedId ? "bg-cyan-50 ring-cyan-200 text-zinc-700" : "bg-white ring-zinc-100 text-zinc-600"
                    }`}
                    aria-label={`图谱节点：${item.label}`}
                  >
                    <div className="font-bold text-zinc-900">{truncateOuterLabel(item.label)}</div>
                    <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{item.detail}</div>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="space-y-2">
              {relatedRecords.length ? relatedRecords.map((record) => (
                <button
                  key={record.id}
                  onClick={() => onOpenRecord(record)}
                  className="flex w-full items-start justify-between gap-3 rounded-2xl bg-white px-3 py-3 text-left ring-1 ring-zinc-100 transition-all hover:bg-cyan-50 hover:ring-cyan-200 active:scale-[0.99]"
                  aria-label={`打开关联卡片：${record.title}`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-zinc-900">{record.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">{record.sectionName}</div>
                    <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{record.excerpt || "点击查看这张知识卡片的详情"}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-bold text-cyan-700">
                    打开
                  </span>
                </button>
              )) : (
                <div className="rounded-2xl bg-white px-3 py-3 text-sm text-zinc-500 ring-1 ring-zinc-100">
                  这个节点当前还没有可打开的知识卡片
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ClusterGraphCard({
  cluster,
  activeClusterId,
  selectedNodeId,
  selectedBranchId,
  onOpenZoom,
  onSelectCluster,
  onSelectNode,
  onSelectBranch,
  onFocusPoint,
  zoomed = false,
  showMeta = true,
}) {
  const activeCluster = cluster.id === activeClusterId;
  const accent = getClusterAccent(cluster.id);
  const layout = useMemo(() => layoutMindmapCluster(cluster), [cluster]);
  const svgClass = zoomed ? "h-[620px] w-full" : "h-[260px] w-full";
  const graphTransform = zoomed ? "translate(18 16) scale(1)" : "translate(22 20) scale(0.88)";

  return (
    <div className={`rounded-[32px] transition-all duration-300 ${showMeta ? `overflow-hidden ring-1 ${activeCluster ? "bg-[linear-gradient(180deg,#f4feff,#ffffff)] ring-cyan-200 shadow-[0_18px_44px_rgba(6,182,212,0.14)]" : "bg-white ring-zinc-100 shadow-[0_14px_36px_rgba(15,23,42,0.06)]"}` : "bg-transparent"}`}>
      {showMeta ? (
        <div className={`relative overflow-hidden bg-gradient-to-br ${cluster.bg} px-4 pb-4 pt-4 text-white`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_32%),linear-gradient(180deg,transparent,rgba(0,0,0,0.22))]" />
          <button
            onClick={() => onSelectCluster(cluster.id)}
            className="relative z-10 w-full text-left"
            aria-label={`查看视频图谱：${cluster.title}`}
          >
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/80">{cluster.sectionName}</div>
            <div className="mt-2 text-lg font-black leading-tight">{cluster.title}</div>
            <div className="mt-2 text-xs font-semibold text-white/75">{cluster.takeaway}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {cluster.keywords.slice(0, 2).map((keyword) => (
                <span key={`${cluster.id}-${keyword}`} className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white/90 ring-1 ring-white/20 backdrop-blur">
                  {keyword}
                </span>
              ))}
            </div>
          </button>
        </div>
      ) : null}

      <div className={`bg-[linear-gradient(180deg,#ffffff,#f8fbfd)] ${showMeta ? "p-3" : "rounded-[36px] p-4 ring-1 ring-zinc-100 shadow-[0_20px_48px_rgba(15,23,42,0.10)]"}`}>
        <svg viewBox="0 0 360 360" className={svgClass}>
          <g transform={graphTransform}>
          <defs>
            <linearGradient id="graph-surface" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f0f9ff" />
            </linearGradient>
            <linearGradient id={`edge-gradient-${cluster.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accent.edgeStart} />
              <stop offset="100%" stopColor={accent.edgeEnd} />
            </linearGradient>
            <radialGradient id={`core-gradient-${cluster.id}`} cx="35%" cy="30%" r="80%">
              <stop offset="0%" stopColor={accent.coreStart} />
              <stop offset="100%" stopColor={accent.coreEnd} />
            </radialGradient>
            <radialGradient id={`halo-${cluster.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={accent.halo} stopOpacity="0.22" />
              <stop offset="100%" stopColor={accent.halo} stopOpacity="0" />
            </radialGradient>
            <filter id={`graph-glow-${cluster.id}`} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor={accent.shadow} floodOpacity="0.22" />
            </filter>
            <filter id={`node-glow-${cluster.id}`} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor={accent.shadow} floodOpacity="0.18" />
            </filter>
            <filter id={`branch-glow-${cluster.id}`} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor={accent.shadow} floodOpacity="0.18" />
            </filter>
          </defs>

          <rect x="12" y="12" width="308" height="324" rx="28" fill="url(#graph-surface)" opacity="0.98" />
          {!zoomed ? (
            <rect
              x="12"
              y="12"
              width="308"
              height="324"
              rx="28"
              fill="transparent"
              onClick={() => onOpenZoom?.(cluster.id)}
            />
          ) : null}
          <circle cx={layout.center.x} cy={layout.center.y} r="82" fill={`url(#halo-${cluster.id})`} opacity="0.24" />

          {layout.branches.map((branch) => {
            const active = branch.id === selectedBranchId;
            return (
              <g
                key={branch.id}
                role="button"
                tabIndex={0}
                aria-label={`图谱关系：${branch.label}`}
                onClick={() => onSelectBranch(cluster.id, branch.id)}
                onDoubleClick={() => onFocusPoint?.(branch.focusPoint)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectBranch(cluster.id, branch.id);
                  }
                }}
              >
                <path
                  d={`M ${layout.center.x} ${layout.center.y + 12} Q ${branch.connector.control.x} ${branch.connector.control.y} ${branch.connector.end.x} ${branch.connector.end.y}`}
                  fill="none"
                  stroke={active ? branch.palette.main : branch.palette.strokeSoft}
                  strokeWidth={active ? 3 : 1.6}
                  strokeOpacity={active ? 0.42 : 0.24}
                  strokeLinecap="round"
                  filter={active ? `url(#branch-glow-${cluster.id})` : undefined}
                />
                <rect
                  x={branch.panel.x}
                  y={branch.panel.y}
                  width={branch.panel.width}
                  height={branch.panel.height}
                  rx="18"
                  fill={active ? branch.palette.soft : "#ffffff"}
                  stroke={active ? branch.palette.main : "#e4e4e7"}
                  strokeWidth={active ? 1.6 : 1.1}
                />
                <rect
                  x={branch.header.x}
                  y={branch.header.y}
                  width={branch.header.width}
                  height="20"
                  rx="10"
                  fill={active ? branch.palette.soft : "#ffffff"}
                  stroke={active ? branch.palette.main : "#d7dee5"}
                  strokeWidth="1.2"
                />
                <text
                  x={branch.header.x + branch.header.width / 2}
                  y={branch.header.y + 13.5}
                  textAnchor="middle"
                  className={`text-[9px] font-black ${active ? "fill-zinc-900" : "fill-zinc-500"}`}
                >
                  {branch.label}
                </text>
              </g>
            );
          })}

          <g role="button" tabIndex={0} aria-label={`图谱节点：${cluster.title}`} onClick={() => onSelectCluster(cluster.id)}>
            {(() => {
              const centerTitleLines = splitSvgText(cluster.title, 8, 2);
              const centerSubtitleLines = splitSvgText(cluster.takeaway, 10, 1);
              const centerCardHeight = 48 + (centerTitleLines.length - 1) * 10 + (centerSubtitleLines.length - 1) * 8;
              const centerCardY = layout.center.y - centerCardHeight / 2;
              const centerTagY = centerCardY - 12;
              const centerTitleY = centerCardY + 20;
              const centerSubtitleY = centerCardY + 34 + (centerTitleLines.length - 1) * 10;
              return (
                <>
            <rect
              x={layout.center.x - 56}
              y={centerCardY}
              width="112"
              height={centerCardHeight}
              rx="20"
              fill={`url(#core-gradient-${cluster.id})`}
              stroke="#a5f3fc"
              strokeWidth="3"
              filter={`url(#node-glow-${cluster.id})`}
            />
            <rect
              x={layout.center.x - 26}
              y={centerTagY}
              width="52"
              height="14"
              rx="8"
              fill="rgba(255,255,255,0.16)"
              stroke="rgba(255,255,255,0.24)"
              strokeWidth="1"
            />
            <text x={layout.center.x} y={centerTagY + 9} textAnchor="middle" className="fill-cyan-50 text-[7px] font-black">
              中心主题
            </text>
            <text x={layout.center.x} y={centerTitleY} textAnchor="middle" className="fill-white text-[8.5px] font-black">
              {centerTitleLines.map((line, index) => (
                <tspan key={`${cluster.id}-title-${index}`} x={layout.center.x} dy={index === 0 ? 0 : 10}>
                  {line}
                </tspan>
              ))}
            </text>
            <text x={layout.center.x} y={centerSubtitleY} textAnchor="middle" className="fill-cyan-100 text-[6.5px] font-bold">
              {centerSubtitleLines.map((line, index) => (
                <tspan key={`${cluster.id}-subtitle-${index}`} x={layout.center.x} dy={index === 0 ? 0 : 8}>
                  {line}
                </tspan>
              ))}
            </text>
                </>
              );
            })()}
          </g>

          {layout.branches.flatMap((branch) => branch.items).map((item) => {
            const active = item.id === selectedNodeId;
            const palette = getBranchPalette(item.color, active);
            const titleLines = splitSvgText(item.label, active ? 8 : 7, active ? 2 : 1);
            const detailLines = active ? splitSvgText(item.detail, 16, 1) : [];
            const cardHeight = active ? 34 + (titleLines.length - 1) * 10 : item.card.height;
            const cardY = active ? item.card.y - Math.round((cardHeight - item.card.height) / 2) : item.card.y;
            const titleY = cardY + 11;
            const detailY = cardY + 15 + (titleLines.length - 1) * 9;
            return (
              <g
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`图谱节点：${item.label}`}
                onClick={() => onSelectNode(cluster.id, item.id)}
                onDoubleClick={() => onFocusPoint?.(item.focusPoint)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectNode(cluster.id, item.id);
                  }
                }}
                className="cursor-pointer"
              >
                <rect
                  x={item.card.x}
                  y={cardY}
                  width={item.card.width}
                  height={cardHeight}
                  rx="10"
                  fill={palette.fill}
                  stroke={palette.stroke}
                  strokeWidth={active ? 1.8 : 1.2}
                  filter={active ? `url(#node-glow-${cluster.id})` : undefined}
                />
                <text x={item.card.textX} y={titleY} textAnchor={item.card.textAnchor} className={`text-[8px] font-black ${palette.text}`}>
                  {titleLines.map((line, index) => (
                    <tspan key={`${item.id}-title-${index}`} x={item.card.textX} dy={index === 0 ? 0 : 9}>
                      {line}
                    </tspan>
                  ))}
                </text>
                {active ? (
                  <text x={item.card.textX} y={detailY} textAnchor={item.card.textAnchor} className="fill-zinc-500 text-[6.5px] font-semibold">
                    {detailLines[0]}
                  </text>
                ) : null}
                {active ? (
                  <>
                    <rect
                      x={item.card.x + item.card.width - 38}
                      y={cardY + cardHeight - 12}
                      width="28"
                      height="8"
                      rx="4"
                      fill={palette.badgeFill}
                    />
                    <text
                      x={item.card.x + item.card.width - 24}
                      y={cardY + cardHeight - 6}
                      textAnchor="middle"
                      className={`text-[6px] font-black ${palette.badgeText}`}
                    >
                      展开中
                    </text>
                  </>
                ) : null}
              </g>
            );
          })}
          </g>
        </svg>
        {!zoomed ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold text-zinc-400">已缩放为全貌预览，点击图谱可放大查看</div>
            <button
              onClick={() => onOpenZoom?.(cluster.id)}
              className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-bold text-zinc-600 transition-all hover:bg-zinc-200 active:scale-95"
            >
              放大查看
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function layoutMindmapCluster(cluster) {
  const center = { x: 166, y: 58 };
  const leftBranches = cluster.branches.filter((branch) => branch.side === "left");
  const rightBranches = cluster.branches.filter((branch) => branch.side !== "left");

  return {
    center,
    branches: [
      ...layoutBranchSide(leftBranches, "left", center),
      ...layoutBranchSide(rightBranches, "right", center),
    ],
  };
}

function GraphZoomModal({
  cluster,
  activeClusterId,
  selectedNodeId,
  selectedBranchId,
  onClose,
  onSelectCluster,
  onSelectNode,
  onSelectBranch,
}) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState(null);
  const [scale, setScale] = useState(1);
  const viewportRef = React.useRef(null);

  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setDragState(null);
    setScale(1);
  }, [cluster?.id]);

  if (!cluster) return null;

  const beginDrag = (event) => {
    setDragState({
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    });
  };

  const moveDrag = (event) => {
    if (!dragState) return;
    setPan({
      x: dragState.originX + (event.clientX - dragState.startX),
      y: dragState.originY + (event.clientY - dragState.startY),
    });
  };

  const endDrag = () => {
    setDragState(null);
  };

  const clampScale = (value) => Math.min(1.9, Math.max(0.78, value));

  const focusPoint = (point, nextScale = scale) => {
    const viewport = viewportRef.current;
    if (!viewport || !point) return;
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    const graphX = 20 + point.x;
    const graphY = 18 + point.y;
    setPan({
      x: viewportWidth / 2 - graphX * nextScale,
      y: viewportHeight / 2 - graphY * nextScale,
    });
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const nextScale = clampScale(scale + (event.deltaY < 0 ? 0.08 : -0.08));
    setScale(nextScale);
  };

  const resetViewport = () => {
    setPan({ x: 0, y: 0 });
    setScale(1);
  };

  return (
    <div className="fixed inset-0 z-[78] bg-black/55 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto flex h-full w-full max-w-[1080px] flex-col justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`overflow-hidden rounded-[36px] bg-[linear-gradient(180deg,#f8fbfd,#ffffff)] p-4 shadow-[0_32px_80px_rgba(15,23,42,0.24)] ${dragState ? "cursor-grabbing" : "cursor-grab"}`}
          ref={viewportRef}
          onMouseMove={moveDrag}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onWheel={handleWheel}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-zinc-500 shadow-sm ring-1 ring-zinc-100">
              滚轮缩放，拖拽浏览，双击节点居中
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-zinc-500 shadow-sm ring-1 ring-zinc-100">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={resetViewport}
                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-zinc-600 shadow-sm ring-1 ring-zinc-100 transition-all hover:bg-zinc-50 active:scale-95"
              >
                重置位置
              </button>
              <button
                onClick={() => setScale((value) => clampScale(value - 0.12))}
                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-zinc-600 shadow-sm ring-1 ring-zinc-100 transition-all hover:bg-zinc-50 active:scale-95"
              >
                缩小
              </button>
              <button
                onClick={() => setScale((value) => clampScale(value + 0.12))}
                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-zinc-600 shadow-sm ring-1 ring-zinc-100 transition-all hover:bg-zinc-50 active:scale-95"
              >
                放大
              </button>
              <button
                onClick={onClose}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-zinc-800 active:scale-95"
              >
                关闭
              </button>
            </div>
          </div>
          <div
            className="transition-transform duration-75"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: "top left" }}
            onMouseDown={beginDrag}
          >
            <ClusterGraphCard
              cluster={cluster}
              activeClusterId={activeClusterId}
              selectedNodeId={selectedNodeId}
              selectedBranchId={selectedBranchId}
              onOpenZoom={() => {}}
              onSelectCluster={onSelectCluster}
              onSelectNode={(clusterId, nodeId) => {
                onSelectNode(clusterId, nodeId);
                const layout = layoutMindmapCluster(cluster);
                const target = layout.branches.flatMap((branch) => branch.items).find((item) => item.id === nodeId)?.focusPoint;
                focusPoint(target);
              }}
              onSelectBranch={(clusterId, branchId) => {
                onSelectBranch(clusterId, branchId);
                const layout = layoutMindmapCluster(cluster);
                const target = layout.branches.find((branch) => branch.id === branchId)?.focusPoint;
                focusPoint(target);
              }}
              onFocusPoint={focusPoint}
              zoomed
              showMeta={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function getClusterAccent(clusterId) {
  const accents = [
    {
      edgeStart: "#22d3ee",
      edgeEnd: "#2563eb",
      coreStart: "#67e8f9",
      coreEnd: "#0891b2",
      orbit: "#7dd3fc",
      orbitOuter: "#c4b5fd",
      shadow: "#0891b2",
      halo: "#67e8f9",
    },
    {
      edgeStart: "#34d399",
      edgeEnd: "#0f766e",
      coreStart: "#86efac",
      coreEnd: "#0f766e",
      orbit: "#6ee7b7",
      orbitOuter: "#bfdbfe",
      shadow: "#0f766e",
      halo: "#6ee7b7",
    },
    {
      edgeStart: "#f59e0b",
      edgeEnd: "#f97316",
      coreStart: "#fde68a",
      coreEnd: "#ea580c",
      orbit: "#fdba74",
      orbitOuter: "#fbcfe8",
      shadow: "#ea580c",
      halo: "#fdba74",
    },
  ];
  const index = Math.abs(`${clusterId}`.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % accents.length;
  return accents[index];
}

function layoutBranchSide(branches, side, center) {
  const direction = side === "left" ? -1 : 1;
  const panelX = side === "left" ? 18 : 176;
  const topY = side === "left" ? 92 : 92;
  const panelWidth = 126;
  const panelGap = 18;

  return branches.map((branch, branchIndex) => {
    const panelHeight = getBranchPanelHeight(branch.items.length);
    const panelY = topY + branchIndex * (panelHeight + panelGap);
    const anchorY = panelY + 18;
    const anchor = { x: side === "left" ? panelX + panelWidth : panelX, y: anchorY };
    const headerWidth = getBranchHeaderWidth(branch.label);
    const palette = getBranchPalette(branch.color, false);
    const header = {
      x: panelX + 10,
      y: panelY + 10,
      width: headerWidth,
    };
    const connector = {
      control: { x: center.x + direction * 26, y: panelY + 8 },
      end: { x: side === "left" ? panelX + panelWidth - 8 : panelX + 8, y: anchorY },
    };

    const items = branch.items.map((item, itemIndex) => {
      const cardWidth = panelWidth - 20;
      const cardHeight = 26;
      const cardX = panelX + 10;
      const cardY = panelY + 38 + itemIndex * 30;
      return {
        ...item,
        palette,
        card: {
          x: cardX,
          y: cardY,
          width: cardWidth,
          height: cardHeight,
          textX: cardX + 8,
          textAnchor: "start",
        },
        focusPoint: {
          x: cardX + cardWidth / 2,
          y: cardY + cardHeight / 2,
        },
      };
    });

    return {
      ...branch,
      anchor,
      connector,
      panel: {
        x: panelX,
        y: panelY,
        width: panelWidth,
        height: panelHeight,
      },
      focusPoint: { x: panelX + panelWidth / 2, y: panelY + panelHeight / 2 },
      header,
      palette,
      items,
    };
  });
}

function getBranchPanelHeight(itemCount) {
  return 46 + itemCount * 30;
}

function getBranchHeaderWidth(label) {
  const text = `${label ?? ""}`.trim();
  const estimatedWidth = 26 + text.length * 10;
  return Math.max(62, Math.min(94, estimatedWidth));
}

function getBranchPalette(color, active) {
  const paletteMap = {
    cyan: {
      fill: active ? "#ecfeff" : "#ffffff",
      stroke: "#06b6d4",
      strokeSoft: "#67e8f9",
      text: "fill-zinc-700",
      soft: "#ecfeff",
      main: "#06b6d4",
      badgeFill: "#cffafe",
      badgeText: "fill-cyan-700",
    },
    violet: {
      fill: active ? "#f5f3ff" : "#ffffff",
      stroke: "#8b5cf6",
      strokeSoft: "#c4b5fd",
      text: "fill-zinc-700",
      soft: "#f5f3ff",
      main: "#8b5cf6",
      badgeFill: "#ede9fe",
      badgeText: "fill-violet-700",
    },
    amber: {
      fill: active ? "#fffbeb" : "#ffffff",
      stroke: "#f59e0b",
      strokeSoft: "#fcd34d",
      text: "fill-zinc-700",
      soft: "#fffbeb",
      main: "#f59e0b",
      badgeFill: "#fef3c7",
      badgeText: "fill-amber-700",
    },
    emerald: {
      fill: active ? "#ecfdf5" : "#ffffff",
      stroke: "#10b981",
      strokeSoft: "#6ee7b7",
      text: "fill-zinc-700",
      soft: "#ecfdf5",
      main: "#10b981",
      badgeFill: "#d1fae5",
      badgeText: "fill-emerald-700",
    },
  };
  return paletteMap[color] ?? paletteMap.cyan;
}

function splitSvgText(label, maxCharsPerLine, maxLines) {
  const text = `${label ?? ""}`.trim();
  if (!text) return [""];

  const lines = [];
  let cursor = 0;

  while (cursor < text.length && lines.length < maxLines) {
    const chunk = text.slice(cursor, cursor + maxCharsPerLine);
    cursor += chunk.length;
    lines.push(chunk);
  }

  if (cursor < text.length && lines.length) {
    const lastLine = lines[lines.length - 1];
    lines[lines.length - 1] = `${lastLine.slice(0, Math.max(1, lastLine.length - 1))}…`;
  }

  return lines;
}

function truncateMindmapDetail(label) {
  if (label.length <= 10) return label;
  return `${label.slice(0, 9)}…`;
}

function truncateExpandedMindmapDetail(label) {
  if (label.length <= 14) return label;
  return `${label.slice(0, 13)}…`;
}

function truncateCenterTitle(label) {
  if (label.length <= 7) return label;
  return `${label.slice(0, 6)}…`;
}

function truncateCenterSubtitle(label) {
  if (label.length <= 10) return label;
  return `${label.slice(0, 9)}…`;
}

function KnowledgeCardModal({ record, currentIndex, total, onClose, onOpenVideo, onOpenPrev, onOpenNext }) {
  const ai = useMemo(
    () => (record ? normalizeAiCardData({ title: record.title, tags: record.tags, ai: record.ai }) : null),
    [record],
  );

  if (!record || !ai) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-end bg-black/45 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full overflow-y-auto rounded-[32px] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`relative overflow-hidden bg-gradient-to-br ${record.bg} px-5 pb-6 pt-5 text-white`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_30%),linear-gradient(180deg,transparent,rgba(0,0,0,0.24))]" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-white/85">
                  <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{record.sectionName}</span>
                  <span className="rounded-full bg-black/15 px-3 py-1 backdrop-blur">@{record.author}</span>
                </div>
                <div className="mt-3 line-clamp-3 text-[22px] font-black leading-tight">{record.title}</div>
                <div className="mt-2 text-xs font-semibold text-white/80">{record.time} · 当前视频知识卡</div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-black/15 p-2 text-white backdrop-blur transition-all hover:bg-black/25 active:scale-90"
                aria-label="关闭知识卡"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-[28px] bg-white/14 px-4 py-4 backdrop-blur-md ring-1 ring-white/20">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">核心金句</div>
              <div className="mt-2 text-[18px] font-semibold leading-relaxed text-white">
                "{ai.quotes[0]?.text ?? ai.takeaway}"
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {ai.keywords.slice(0, 6).map((item) => (
                <span key={item} className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white ring-1 ring-white/20 backdrop-blur">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3 rounded-3xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-100">
            <button
              onClick={onOpenPrev}
              disabled={currentIndex <= 0}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-700 ring-1 ring-zinc-200 transition-all hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一张
            </button>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
              {currentIndex >= 0 ? `${currentIndex + 1} / ${total}` : `1 / ${total || 1}`}
            </div>
            <button
              onClick={onOpenNext}
              disabled={currentIndex === -1 || currentIndex >= total - 1}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-700 ring-1 ring-zinc-200 transition-all hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一张
            </button>
          </div>

          <section className="rounded-3xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">核心观点</div>
            <div className="mt-3 space-y-2">
              {ai.summary.slice(0, 4).map((point) => (
                <div key={point} className="rounded-2xl bg-white px-3 py-3 text-sm font-medium leading-relaxed text-zinc-700 ring-1 ring-zinc-100">
                  {point}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-[linear-gradient(180deg,#f8fafc,#eef6ff)] p-4 ring-1 ring-cyan-100">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-500">干货速览</div>
            <div className="mt-3 grid gap-2">
              {(ai.infographic.length ? ai.infographic : [{ title: "关键收获", text: ai.takeaway }]).slice(0, 3).map((block) => (
                <div key={block.title} className="rounded-2xl bg-white/90 px-3 py-3 ring-1 ring-white">
                  <div className="text-sm font-black text-zinc-900">{block.title}</div>
                  <div className="mt-1 text-sm leading-relaxed text-zinc-600">{block.text}</div>
                </div>
              ))}
            </div>
          </section>

          {ai.quotes.length > 1 ? (
            <section className="rounded-3xl bg-[linear-gradient(135deg,#fff7ed,#fff1f2)] p-4 ring-1 ring-orange-100">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-400">更多金句</div>
              <div className="mt-3 grid gap-2">
                {ai.quotes.slice(1, 4).map((quote) => (
                  <div key={quote.id || quote.text} className="rounded-2xl bg-white/85 px-3 py-3 text-sm font-semibold leading-relaxed text-zinc-700 ring-1 ring-white">
                    "{quote.text}"
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid grid-cols-2 gap-3 pb-1">
            <button
              onClick={onClose}
              className="rounded-2xl bg-zinc-100 py-3 text-sm font-bold text-zinc-700 transition-all hover:bg-zinc-200 active:scale-[0.98]"
            >
              继续看卡片
            </button>
            <button
              onClick={() => onOpenVideo(record)}
              className="rounded-2xl bg-zinc-950 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 active:scale-[0.98]"
            >
              进入视频
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GraphMetric({ label, value, compact = false }) {
  return (
    <div className="rounded-2xl bg-zinc-50 px-3 py-3 ring-1 ring-zinc-100">
      <div className="text-[11px] font-black uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={`mt-1 font-black text-zinc-950 ${compact ? "text-sm" : "text-xl"}`}>{value}</div>
    </div>
  );
}

function truncateLabel(label) {
  if (label.length <= 6) return label;
  return `${label.slice(0, 5)}…`;
}

function truncateOuterLabel(label) {
  if (label.length <= 4) return label;
  return `${label.slice(0, 3)}…`;
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
