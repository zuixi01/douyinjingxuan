import { DEFAULT_SECTIONS, FEED_ITEMS } from "../../data/feed";

export const STORAGE_KEYS = {
  sections: "douyin-ai-sections",
  saved: "douyin-ai-saved",
};

export function buildSavedRecord(item, section) {
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
    sourceType: "video",
    sourceRef: item.videoUrl,
    cardVariant: item.tall ? "feature" : "standard",
    summaryStatus: item.ai ? "ready" : "draft",
    excerpt: item.ai?.summary?.[0] ?? "",
    savedAt: new Date().toISOString(),
  };
}

export const INITIAL_SAVED_ITEMS = [buildSavedRecord(FEED_ITEMS[1], DEFAULT_SECTIONS[0])];

export function collectKnowledgeTags(savedItems) {
  return ["全部", ...Array.from(new Set(savedItems.flatMap((item) => item.tags)))];
}
