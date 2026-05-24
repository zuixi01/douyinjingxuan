import { buildSavedRecord } from "../features/knowledge/model";
import { apiRequest, isApiReachable, markApiUnavailable } from "./apiClient";

function wait(ms = 120) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function canUseApi() {
  return isApiReachable();
}

function createSectionLocal(sections, name) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: "分区名称不能为空" };
  if (sections.some((section) => section.name === trimmed)) {
    return { ok: false, message: "该分区已存在" };
  }

  const section = {
    id: `section-${Date.now()}`,
    name: trimmed,
    desc: "自定义知识分区",
  };

  return {
    ok: true,
    section,
    sections: [section, ...sections],
    message: `已创建分区：${trimmed}`,
  };
}

function saveItemLocal(savedItems, item, sectionId, sections) {
  const section = sections.find((entry) => entry.id === sectionId);
  if (!section) return { ok: false, message: "未找到目标分区" };

  const exists = savedItems.find((entry) => entry.itemId === item.id && entry.sectionId === sectionId);
  if (exists) {
    return {
      ok: true,
      duplicate: true,
      savedItems,
      record: exists,
      message: `${item.title} 已存在于 ${section.name}`,
    };
  }

  const record = buildSavedRecord(item, section);
  return {
    ok: true,
    duplicate: false,
    savedItems: [record, ...savedItems],
    record,
    message: `已保存到 ${section.name}`,
  };
}

function searchLocal(savedItems, { query, sectionId, tag, mode, sortBy }) {
  const keyword = query.trim().toLowerCase();
  const filtered = savedItems.filter((entry) => {
    if (mode === "notes" && !entry.ai) return false;
    if (sectionId !== "all" && entry.sectionId !== sectionId) return false;
    if (tag !== "全部" && !entry.tags.includes(tag)) return false;
    if (!keyword) return true;

    const haystack = [
      entry.title,
      entry.author,
      entry.sectionName,
      ...entry.tags,
      entry.ai?.takeaway ?? "",
      ...(entry.ai?.summary ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(keyword);
  });

  if (sortBy === "title") filtered.sort((a, b) => a.title.localeCompare(b.title));
  else if (sortBy === "category") filtered.sort((a, b) => a.category.localeCompare(b.category));
  else filtered.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

  return filtered;
}

function removeItemLocal(savedItems, itemId, sectionId) {
  return savedItems.filter((entry) => !(entry.itemId === itemId && entry.sectionId === sectionId));
}

function createTextCardLocal(savedItems, sections, payload) {
  const section = sections.find((entry) => entry.id === payload.sectionId);
  if (!section) return { ok: false, message: "未找到目标分区" };

  const summary = payload.content
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  const excerpt = (summary[0] ?? payload.content).slice(0, 140);
  const cardId = `text-${Date.now()}`;
  const record = {
    id: `${section.id}-${cardId}`,
    itemId: cardId,
    sectionId: section.id,
    sectionName: section.name,
    title: payload.title.trim(),
    author: payload.author?.trim() || "手动整理",
    time: "手动录入",
    bg: "from-zinc-900 via-slate-800 to-cyan-700",
    coverTitle: payload.title.trim(),
    category: payload.category?.trim() || "笔记",
    tags: payload.tags ?? [],
    ai: {
      summary,
      audience: "适合希望沉淀个人知识与观点的读者。",
      takeaway: excerpt || "已根据文本生成首版知识卡片。",
      timestamps: [],
      infographic: [
        { title: "核心主题", text: excerpt || "等待补充摘要" },
        { title: "整理建议", text: "后续可继续补充标签、来源和延伸关联。" },
      ],
    },
    sourceType: "text",
    sourceRef: "",
    cardVariant: "note",
    summaryStatus: "ready",
    excerpt,
    savedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    record,
    savedItems: [record, ...savedItems],
    message: `已整理并保存：${record.title}`,
  };
}

export const knowledgeService = {
  async loadInitialData(fallbackSections, fallbackSavedItems) {
    if (!(await canUseApi())) {
      return { sections: fallbackSections, savedItems: fallbackSavedItems, source: "local" };
    }

    try {
      const [sectionsResponse, cardsResponse] = await Promise.all([
        apiRequest("/api/sections"),
        apiRequest("/api/cards"),
      ]);
      return {
        sections: sectionsResponse.sections,
        savedItems: cardsResponse.cards,
        source: "remote",
      };
    } catch {
      markApiUnavailable();
      return { sections: fallbackSections, savedItems: fallbackSavedItems, source: "local" };
    }
  },

  async createSection(sections, name) {
    await wait();
    if (!(await canUseApi())) {
      return createSectionLocal(sections, name);
    }

    try {
      return await apiRequest("/api/sections", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
    } catch {
      markApiUnavailable();
      return createSectionLocal(sections, name);
    }
  },

  async saveItem(savedItems, item, sectionId, sections) {
    await wait();
    if (!(await canUseApi())) {
      return saveItemLocal(savedItems, item, sectionId, sections);
    }

    try {
      const section = sections.find((entry) => entry.id === sectionId);
      const record = buildSavedRecord(item, section ?? { id: sectionId, name: "", desc: "" });
      return await apiRequest("/api/cards", {
        method: "POST",
        body: JSON.stringify({
          itemId: record.itemId,
          sectionId: record.sectionId,
          title: record.title,
          author: record.author,
          time: record.time,
          bg: record.bg,
          coverTitle: record.coverTitle,
          category: record.category,
          tags: record.tags,
          ai: record.ai,
          sourceType: record.sourceType,
          sourceRef: record.sourceRef,
          cardVariant: record.cardVariant,
          summaryStatus: record.summaryStatus,
          excerpt: record.excerpt,
          savedAt: record.savedAt,
        }),
      });
    } catch {
      markApiUnavailable();
      return saveItemLocal(savedItems, item, sectionId, sections);
    }
  },

  async search(savedItems, { query, sectionId, tag, mode, sortBy }) {
    await wait(80);
    return searchLocal(savedItems, { query, sectionId, tag, mode, sortBy });
  },

  async removeItem(savedItems, itemId, sectionId) {
    await wait();
    if (!(await canUseApi())) {
      return removeItemLocal(savedItems, itemId, sectionId);
    }

    try {
      const response = await apiRequest(`/api/cards/${itemId}?section_id=${encodeURIComponent(sectionId)}`, {
        method: "DELETE",
      });
      return response.savedItems;
    } catch {
      markApiUnavailable();
      return removeItemLocal(savedItems, itemId, sectionId);
    }
  },

  async createTextCard(savedItems, sections, payload) {
    await wait();
    if (!(await canUseApi())) {
      return createTextCardLocal(savedItems, sections, payload);
    }

    try {
      return await apiRequest("/api/intake/text", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      markApiUnavailable();
      return createTextCardLocal(savedItems, sections, payload);
    }
  },

  exportMarkdown(savedItems, sections) {
    const grouped = {};
    for (const section of sections) grouped[section.id] = { name: section.name, items: [] };
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
          md += "**核心摘要**\n\n";
          for (const summary of item.ai.summary) md += `- ${summary}\n`;
          md += `\n**适合人群**：${item.ai.audience}\n\n`;
          md += `**关键收获**：${item.ai.takeaway}\n\n`;

          if (item.ai.timestamps?.length) {
            md += "**时间戳**\n\n";
            for (const stamp of item.ai.timestamps) md += `- \`${stamp.time}\` ${stamp.label}\n`;
            md += "\n";
          }
        }

        md += "---\n\n";
      }
    }

    return md;
  },
};
