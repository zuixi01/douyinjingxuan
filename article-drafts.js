import darwinDraft from "./cache/mp3/darwin - 解析稿.md?raw";
import codexDraft from "./cache/mp3/codex - 解析稿.md?raw";
import marsDraft from "./cache/mp3/mars - 解析稿.md?raw";
import academicDraft from "./cache/mp3/academic - 解析稿.md?raw";
import moneyDraft from "./cache/mp3/money - 解析稿.md?raw";
import detectiveDraft from "./cache/mp3/detective - 解析稿.md?raw";
import aiCareerDraft from "./cache/mp3/ai-career - 解析稿.md?raw";
import claudeCodeDraft from "./cache/mp3/claude-code - 解析稿.md?raw";
import ukVlogDraft from "./cache/mp3/uk-vlog - 解析稿.md?raw";
import lifeMotivationDraft from "./cache/mp3/life-motivation - 解析稿.md?raw";

const RAW_DRAFTS = {
  darwin: darwinDraft,
  codex: codexDraft,
  mars: marsDraft,
  academic: academicDraft,
  money: moneyDraft,
  detective: detectiveDraft,
  "ai-career": aiCareerDraft,
  "claude-code": claudeCodeDraft,
  "uk-vlog": ukVlogDraft,
  "life-motivation": lifeMotivationDraft,
};

function stripBom(value) {
  return value.replace(/^\uFEFF/, "").trim();
}

function squeezeLines(lines) {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitParagraphs(lines) {
  return squeezeLines(lines)
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => part.split(/\s*\n\s*/).map((entry) => entry.trim()).filter(Boolean));
}

function parseHeader(headerLine, fallback = {}) {
  const match = headerLine.match(/^(.+?)\s*\/\s*(.+?)\s*\/\s*(.+)$/);
  if (!match) {
    return {
      title: fallback.title || headerLine || "",
      author: fallback.author || "",
      url: fallback.url || "",
    };
  }
  return {
    title: match[1].trim(),
    author: match[2].trim(),
    url: match[3].trim(),
  };
}

function parseDraft(markdown, fallback = {}) {
  const lines = stripBom(markdown).split(/\r?\n/);
  let headerLine = "";
  let seenHeader = false;
  let currentSection = null;
  const introLines = [];
  const sections = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!seenHeader && trimmed.startsWith("# ")) {
      headerLine = trimmed.slice(2).trim();
      seenHeader = true;
      continue;
    }
    if (!seenHeader) continue;
    if (trimmed.startsWith("## ")) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: trimmed.slice(3).trim(), lines: [] };
      continue;
    }
    if (currentSection) currentSection.lines.push(line);
    else introLines.push(line);
  }

  if (currentSection) sections.push(currentSection);

  const meta = parseHeader(headerLine, fallback);
  const intro = splitParagraphs(introLines).slice(0, 3);
  const parsedSections = sections.map((section) => ({
    title: section.title,
    paragraphs: splitParagraphs(section.lines),
  }));
  const frameworkSection = parsedSections.find((section) => /框架|方法|步骤/.test(section.title)) || parsedSections.at(-1) || null;
  const themeSections = parsedSections.filter((section) => section !== frameworkSection);

  return {
    meta,
    intro,
    coreConclusion: intro[0] || fallback.summary?.[0] || "",
    themeSections,
    frameworkSection,
    rawSections: parsedSections,
  };
}

export const ARTICLE_DRAFTS = Object.fromEntries(
  Object.entries(RAW_DRAFTS).map(([id, markdown]) => [id, parseDraft(markdown)]),
);

export function getArticleDraft(id) {
  return ARTICLE_DRAFTS[id] || null;
}
