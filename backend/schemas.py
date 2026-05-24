from __future__ import annotations

from pydantic import BaseModel, Field


DEFAULT_SECTIONS = [
    {"id": "default", "name": "默认收藏", "desc": "统一回看高价值内容"},
    {"id": "later", "name": "稍后学习", "desc": "先存起来，空闲再看"},
]


class Section(BaseModel):
    id: str
    name: str
    desc: str


class TimestampItem(BaseModel):
    time: str
    label: str
    seconds: int | None = None


class InfographicItem(BaseModel):
    title: str
    text: str


class AICard(BaseModel):
    summary: list[str] = Field(default_factory=list)
    audience: str = ""
    takeaway: str = ""
    timestamps: list[TimestampItem] = Field(default_factory=list)
    infographic: list[InfographicItem] = Field(default_factory=list)


class KnowledgeCard(BaseModel):
    id: str
    itemId: str
    sectionId: str
    sectionName: str
    title: str
    author: str
    time: str
    bg: str
    coverTitle: str
    category: str
    tags: list[str] = Field(default_factory=list)
    ai: AICard
    sourceType: str = "video"
    sourceRef: str = ""
    cardVariant: str = "standard"
    summaryStatus: str = "ready"
    excerpt: str = ""
    savedAt: str


class SectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)


class CardCreate(BaseModel):
    itemId: str
    sectionId: str
    title: str
    author: str
    time: str
    bg: str
    coverTitle: str
    category: str
    tags: list[str] = Field(default_factory=list)
    ai: AICard
    sourceType: str = "video"
    sourceRef: str = ""
    cardVariant: str = "standard"
    summaryStatus: str = "ready"
    excerpt: str = ""
    savedAt: str


class PreviewRequest(BaseModel):
    id: str
    title: str
    author: str
    time: str
    tags: list[str] = Field(default_factory=list)
    ai: AICard | None = None


class TextIntakeRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    content: str = Field(min_length=10, max_length=20000)
    sectionId: str
    tags: list[str] = Field(default_factory=list)
    author: str = "手动整理"
    category: str = "笔记"


class SearchParams(BaseModel):
    query_value: str = ""
    section_id: str = "all"
    tag: str = "全部"
    mode: str = "knowledge"
    sort_by: str = "latest"
