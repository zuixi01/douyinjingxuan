import { apiRequest, isApiReachable, markApiUnavailable } from "./apiClient";

export function buildKnowledgePreview(item) {
  if (!item) return null;

  return {
    id: item.id,
    title: item.title,
    author: item.author,
    duration: item.time,
    summary: item.ai?.summary ?? [],
    audience: item.ai?.audience ?? "适合希望快速理解内容价值的读者。",
    takeaway: item.ai?.takeaway ?? "已提取核心收获，可继续深入整理。",
    timestamps: item.ai?.timestamps ?? [],
    infographic: item.ai?.infographic ?? [],
    tags: item.tags ?? [],
    status: item.ai ? "ready" : "draft",
  };
}

async function canUsePreviewApi() {
  return isApiReachable();
}

export async function previewKnowledgeCard(item) {
  const localPreview = buildKnowledgePreview(item);
  if (!item || !(await canUsePreviewApi())) {
    return localPreview;
  }

  try {
    const response = await apiRequest("/api/ai/preview", {
      method: "POST",
      body: JSON.stringify({
        id: item.id,
        title: item.title,
        author: item.author,
        time: item.time,
        tags: item.tags ?? [],
        ai: item.ai ?? null,
      }),
    });
    return response.preview ?? localPreview;
  } catch {
    markApiUnavailable();
    return localPreview;
  }
}
