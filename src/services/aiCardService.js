import { apiRequest, isApiReachable, markApiUnavailable } from "./apiClient";
import { normalizeAiCardData } from "../features/knowledge/model";

export function buildKnowledgePreview(item) {
  if (!item) return null;
  const ai = normalizeAiCardData({ title: item.title, tags: item.tags, ai: item.ai });

  return {
    id: item.id,
    title: item.title,
    author: item.author,
    duration: item.time,
    summary: ai.summary,
    audience: ai.audience,
    takeaway: ai.takeaway,
    timestamps: ai.timestamps,
    infographic: ai.infographic,
    keywords: ai.keywords,
    quotes: ai.quotes,
    entities: ai.entities,
    relations: ai.relations,
    tags: item.tags ?? [],
    status: ai.summary.length ? "ready" : "draft",
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
