import { DEFAULT_SECTIONS, FEED_ITEMS } from "../../data/feed";

export const STORAGE_KEYS = {
  sections: "douyin-ai-sections",
  saved: "douyin-ai-saved",
};

function uniqueStrings(values) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((item) => `${item ?? ""}`.trim())
        .filter(Boolean),
    ),
  );
}

export function createKnowledgeNodeId(label = "") {
  const normalized = `${label}`.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u4e00-\u9fa5-]/g, "");
  return normalized || "unknown-node";
}

export function normalizeAiCardData({ title = "", tags = [], ai = {} } = {}) {
  const summary = Array.isArray(ai?.summary) ? ai.summary.filter(Boolean) : [];
  const keywords = uniqueStrings([...(ai?.keywords ?? []), ...(tags ?? [])]).slice(0, 8);

  const quotes = Array.isArray(ai?.quotes) && ai.quotes.length
    ? ai.quotes
        .map((entry, index) => {
          if (typeof entry === "string") {
            return { id: `quote-${index}`, text: entry, source: "视频金句" };
          }
          const text = `${entry?.text ?? ""}`.trim();
          if (!text) return null;
          return {
            id: entry.id ?? `quote-${index}`,
            text,
            source: entry.source ?? "视频金句",
          };
        })
        .filter(Boolean)
    : summary.slice(0, 2).map((text, index) => ({
        id: `quote-${index}`,
        text,
        source: index === 0 ? "核心结论" : "延伸观点",
      }));

  const rawEntityLabels = Array.isArray(ai?.entities) && ai.entities.length
    ? ai.entities.map((entry) => (typeof entry === "string" ? entry : entry.label))
    : keywords.length
      ? keywords.slice(0, 5)
      : uniqueStrings([title]).slice(0, 1);

  const entities = uniqueStrings(rawEntityLabels).map((label, index) => {
    const sourceEntity = Array.isArray(ai?.entities)
      ? ai.entities.find((entry) => (typeof entry === "string" ? entry : entry?.label) === label)
      : null;

    return {
      id: typeof sourceEntity === "object" && sourceEntity?.id ? sourceEntity.id : createKnowledgeNodeId(label),
      label,
      type: typeof sourceEntity === "object" && sourceEntity?.type ? sourceEntity.type : index === 0 ? "topic" : "keyword",
      weight: typeof sourceEntity === "object" && Number.isFinite(sourceEntity?.weight) ? sourceEntity.weight : Math.max(1, 6 - index),
    };
  });

  const relationSeed = Array.isArray(ai?.relations) && ai.relations.length
    ? ai.relations
    : entities.slice(1).map((entry) => ({
        source: entities[0]?.id ?? createKnowledgeNodeId(title || entry.label),
        target: entry.id,
        label: "关联",
      }));

  const relations = relationSeed
    .map((entry) => {
      if (!entry) return null;
      const source = `${entry.source ?? ""}`.trim();
      const target = `${entry.target ?? ""}`.trim();
      if (!source || !target || source === target) return null;
      return {
        source,
        target,
        label: `${entry.label ?? "关联"}`.trim() || "关联",
      };
    })
    .filter(Boolean);

  return {
    summary,
    audience: ai?.audience ?? "适合希望快速理解内容价值的读者。",
    takeaway: ai?.takeaway ?? (summary[0] ?? "已提取核心收获，可继续深入整理。"),
    timestamps: Array.isArray(ai?.timestamps) ? ai.timestamps : [],
    infographic: Array.isArray(ai?.infographic) ? ai.infographic : [],
    keywords,
    quotes,
    entities,
    relations,
  };
}

export function buildSavedRecord(item, section) {
  const ai = normalizeAiCardData({ title: item.title, tags: item.tags, ai: item.ai });
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
    ai,
    sourceType: "video",
    sourceRef: item.videoUrl,
    cardVariant: item.tall ? "feature" : "standard",
    summaryStatus: ai.summary.length ? "ready" : "draft",
    excerpt: ai.summary[0] ?? "",
    savedAt: new Date().toISOString(),
  };
}

export const INITIAL_SAVED_ITEMS = [buildSavedRecord(FEED_ITEMS[1], DEFAULT_SECTIONS[0])];

export function collectKnowledgeTags(savedItems) {
  return ["全部", ...Array.from(new Set(savedItems.flatMap((item) => item.tags)))];
}

function normalizeBridgeLabel(label = "") {
  return `${label}`.trim().toLowerCase();
}

function createBranch(itemId, key, label, side, items, color) {
  const normalizedItems = items
    .filter((entry) => `${entry?.label ?? ""}`.trim())
    .map((entry, index) => ({
      id: `${itemId}::branch-item::${key}::${index}`,
      label: `${entry.label}`.trim(),
      detail: `${entry.detail ?? entry.label}`.trim(),
      branchId: `${itemId}::branch::${key}`,
      branchLabel: label,
      side,
      color,
      type: "detail",
    }));

  if (!normalizedItems.length) return null;

  return {
    id: `${itemId}::branch::${key}`,
    key,
    label,
    side,
    color,
    items: normalizedItems,
  };
}

export function buildKnowledgeGraph(savedItems) {
  const clusters = savedItems.map((item) => {
    const ai = normalizeAiCardData({ title: item.title, tags: item.tags, ai: item.ai });
    const clusterRef = {
      id: item.id,
      title: item.title,
      sectionName: item.sectionName,
      excerpt: item.excerpt,
    };
    const branches = [
      createBranch(
        item.id,
        "summary",
        "核心观点",
        "left",
        ai.summary.slice(0, 2).map((entry) => ({ label: entry, detail: entry })),
        "cyan",
      ),
      createBranch(
        item.id,
        "infographic",
        "干货拆解",
        "right",
        (ai.infographic.length ? ai.infographic : [{ title: "关键收获", text: ai.takeaway }])
          .slice(0, 2)
          .map((entry) => ({ label: entry.title, detail: entry.text })),
        "violet",
      ),
      createBranch(
        item.id,
        "quotes",
        "金句沉淀",
        "left",
        ai.quotes.slice(0, 2).map((entry) => ({ label: entry.text, detail: entry.source ? `${entry.source} · ${entry.text}` : entry.text })),
        "amber",
      ),
      createBranch(
        item.id,
        "keywords",
        "关键词",
        "right",
        ai.keywords.slice(0, 3).map((entry) => ({ label: entry, detail: `关键词：${entry}` })),
        "emerald",
      ),
    ].filter(Boolean);

    const topicNode = {
      id: `${item.id}::topic`,
      label: item.title,
      shortLabel: item.title,
      type: "topic",
      weight: 6,
      cards: [item.title],
      cardRefs: [clusterRef],
      tags: uniqueStrings([...(item.tags ?? []), ...(ai.keywords ?? [])]),
      clusterId: item.id,
    };

    const nodes = [
      topicNode,
      ...branches.flatMap((branch) => branch.items.map((entry, index) => ({
        id: entry.id,
        localId: createKnowledgeNodeId(entry.label),
        label: entry.label,
        shortLabel: entry.label,
        detail: entry.detail,
        type: index === 0 ? "branch_item_primary" : "branch_item",
        weight: Math.max(1, 4 - index),
        cards: [item.title],
        cardRefs: [clusterRef],
        tags: uniqueStrings([branch.label, ...(item.tags ?? []), ...(ai.keywords ?? [])]),
        clusterId: item.id,
        branchId: branch.id,
        branchLabel: branch.label,
        side: branch.side,
        color: branch.color,
      }))),
    ];

    const edges = branches.map((branch, index) => ({
      id: `${item.id}::edge::${branch.key}::${index}`,
      source: topicNode.id,
      target: branch.items[0]?.id ?? topicNode.id,
      label: branch.label,
      weight: branch.items.length,
      cards: [item.title],
      cardRefs: [clusterRef],
      clusterId: item.id,
      branchId: branch.id,
      branchLabel: branch.label,
    }));

    const bridgeLabels = uniqueStrings([
      ...(item.tags ?? []),
      ...(ai.keywords ?? []),
      ...branches.flatMap((branch) => branch.items.map((entry) => entry.label)),
    ]);

    return {
      id: item.id,
      title: item.title,
      author: item.author,
      sectionName: item.sectionName,
      bg: item.bg,
      takeaway: ai.takeaway,
      keywords: ai.keywords,
      cardRefs: [clusterRef],
      branches,
      nodes,
      edges,
      bridgeLabels,
    };
  });

  const bridges = [];
  for (let i = 0; i < clusters.length; i += 1) {
    for (let j = i + 1; j < clusters.length; j += 1) {
      const source = clusters[i];
      const target = clusters[j];
      const targetLabelMap = new Map(target.bridgeLabels.map((label) => [normalizeBridgeLabel(label), label]));
      const sharedLabels = source.bridgeLabels
        .filter((label) => targetLabelMap.has(normalizeBridgeLabel(label)))
        .map((label) => targetLabelMap.get(normalizeBridgeLabel(label)) || label);

      if (!sharedLabels.length) continue;

      bridges.push({
        id: `${source.id}::bridge::${target.id}`,
        sourceClusterId: source.id,
        targetClusterId: target.id,
        label: sharedLabels[0],
        sharedLabels: uniqueStrings(sharedLabels).slice(0, 3),
        strength: sharedLabels.length,
        cardRefs: [...source.cardRefs, ...target.cardRefs],
      });
    }
  }

  const sortedClusters = clusters.sort((a, b) => (b.nodes.length + b.edges.length) - (a.nodes.length + a.edges.length));
  const sortedBridges = bridges.sort((a, b) => b.strength - a.strength).slice(0, 8);

  return {
    clusters: sortedClusters,
    bridges: sortedBridges,
    nodes: sortedClusters.flatMap((cluster) => cluster.nodes),
    edges: sortedClusters.flatMap((cluster) => cluster.edges),
  };
}
