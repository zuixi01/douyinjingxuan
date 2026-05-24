from __future__ import annotations

import json
import os
import re
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import JSON, Column, String, Text, create_engine, delete, select
from sqlalchemy.orm import declarative_base, sessionmaker

from .schemas import CardCreate, DEFAULT_SECTIONS, SearchParams, TextIntakeRequest


Base = declarative_base()


class SectionModel(Base):
    __tablename__ = "knowledge_sections"

    id = Column(String(64), primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    desc = Column(String(255), nullable=False)


class CardModel(Base):
    __tablename__ = "knowledge_cards"

    id = Column(String(128), primary_key=True)
    item_id = Column(String(128), nullable=False)
    section_id = Column(String(64), nullable=False)
    section_name = Column(String(120), nullable=False)
    title = Column(String(255), nullable=False)
    author = Column(String(120), nullable=False)
    time = Column(String(32), nullable=False)
    bg = Column(String(255), nullable=False)
    cover_title = Column(Text, nullable=False)
    category = Column(String(80), nullable=False)
    tags = Column(JSON, nullable=False, default=list)
    ai = Column(JSON, nullable=False, default=dict)
    source_type = Column(String(64), nullable=False, default="video")
    source_ref = Column(Text, nullable=False, default="")
    card_variant = Column(String(32), nullable=False, default="standard")
    summary_status = Column(String(32), nullable=False, default="ready")
    excerpt = Column(Text, nullable=False, default="")
    saved_at = Column(String(64), nullable=False)


def _unique_strings(values: list[str]) -> list[str]:
    return list(dict.fromkeys([value.strip() for value in values if value and value.strip()]))


def _node_id(label: str) -> str:
    normalized = re.sub(r"[^\w\u4e00-\u9fa5-]", "", label.strip().lower().replace(" ", "-"))
    return normalized or f"node-{uuid4().hex[:6]}"


def _build_knowledge_graph_fields(title: str, summary: list[str], keywords: list[str]) -> dict[str, Any]:
    normalized_keywords = _unique_strings(keywords)[:8]
    quotes = [
        {"id": f"quote-{index}", "text": text, "source": "视频金句" if index == 0 else "延伸观点"}
        for index, text in enumerate(summary[:2])
    ]
    entity_labels = normalized_keywords[:5] or [title.strip()]
    entities = [
        {
            "id": _node_id(label),
            "label": label,
            "type": "topic" if index == 0 else "keyword",
            "weight": max(1, 6 - index),
        }
        for index, label in enumerate(entity_labels)
    ]
    relations = [
        {"source": entities[0]["id"], "target": entity["id"], "label": "关联"}
        for entity in entities[1:]
    ]
    return {
        "quotes": quotes,
        "keywords": normalized_keywords,
        "entities": entities,
        "relations": relations,
    }


def summarize_text(content: str, title: str = "", tags: list[str] | None = None) -> dict[str, Any]:
    lines = [segment.strip() for segment in content.replace("\r", "").split("\n") if segment.strip()]
    paragraphs = lines if lines else [content.strip()]
    summary = paragraphs[:3] if paragraphs else ["暂无摘要"]
    excerpt = summary[0][:140] if summary else ""
    return {
        "summary": summary,
        "audience": "适合希望沉淀个人知识与观点的读者。",
        "takeaway": excerpt or "已根据文本生成首版知识卡片。",
        "timestamps": [],
        "infographic": [
            {"title": "核心主题", "text": excerpt or "等待补充摘要"},
            {"title": "整理建议", "text": "后续可继续补充标签、来源和延伸关联。"},
        ],
        **_build_knowledge_graph_fields(title or (summary[0] if summary else "知识"), summary, tags or []),
    }


def build_text_card(payload: TextIntakeRequest, section: dict[str, Any]) -> dict[str, Any]:
    ai = summarize_text(payload.content, title=payload.title, tags=payload.tags)
    card_id = f"{section['id']}-text-{uuid4().hex[:8]}"
    return {
        "id": card_id,
        "itemId": card_id,
        "sectionId": section["id"],
        "sectionName": section["name"],
        "title": payload.title.strip(),
        "author": payload.author.strip() or "手动整理",
        "time": "手动录入",
        "bg": "from-zinc-900 via-slate-800 to-cyan-700",
        "coverTitle": payload.title.strip(),
        "category": payload.category.strip() or "笔记",
        "tags": payload.tags,
        "ai": ai,
        "sourceType": "text",
        "sourceRef": "",
        "cardVariant": "note",
        "summaryStatus": "ready",
        "excerpt": ai["summary"][0] if ai["summary"] else "",
        "savedAt": datetime.now(timezone.utc).isoformat(),
    }


class KnowledgeRepository(ABC):
    @abstractmethod
    def list_sections(self) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def create_section(self, name: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def list_cards(self, params: SearchParams) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def save_card(self, payload: CardCreate) -> tuple[dict[str, Any], bool]:
        raise NotImplementedError

    @abstractmethod
    def delete_card(self, item_id: str, section_id: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def create_text_card(self, payload: TextIntakeRequest) -> dict[str, Any]:
        raise NotImplementedError


class JsonKnowledgeRepository(KnowledgeRepository):
    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.file_path.parent.mkdir(parents=True, exist_ok=True)

    def _read(self) -> dict[str, Any]:
        if not self.file_path.exists():
            payload = {"sections": DEFAULT_SECTIONS, "cards": []}
            self._write(payload)
            return payload
        return json.loads(self.file_path.read_text(encoding="utf-8"))

    def _write(self, payload: dict[str, Any]) -> None:
        self.file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def list_sections(self) -> list[dict[str, Any]]:
        return self._read()["sections"]

    def create_section(self, name: str) -> dict[str, Any]:
        payload = self._read()
        normalized = name.strip()
        if not normalized:
            raise HTTPException(status_code=400, detail="分区名称不能为空")
        if any(section["name"] == normalized for section in payload["sections"]):
            raise HTTPException(status_code=409, detail="该分区已存在")

        section = {"id": f"section-{uuid4().hex[:8]}", "name": normalized, "desc": "自定义知识分区"}
        payload["sections"] = [section, *payload["sections"]]
        self._write(payload)
        return section

    def list_cards(self, params: SearchParams) -> list[dict[str, Any]]:
        payload = self._read()
        return _filter_cards(payload["cards"], params)

    def save_card(self, payload: CardCreate) -> tuple[dict[str, Any], bool]:
        data = self._read()
        section = next((entry for entry in data["sections"] if entry["id"] == payload.sectionId), None)
        if not section:
            raise HTTPException(status_code=404, detail="未找到目标分区")

        existing = next(
            (
                entry
                for entry in data["cards"]
                if entry["itemId"] == payload.itemId and entry["sectionId"] == payload.sectionId
            ),
            None,
        )
        if existing:
            return existing, True

        card = {"id": f"{payload.sectionId}-{payload.itemId}", "sectionName": section["name"], **payload.model_dump()}
        data["cards"] = [card, *data["cards"]]
        self._write(data)
        return card, False

    def delete_card(self, item_id: str, section_id: str) -> None:
        data = self._read()
        data["cards"] = [
            entry
            for entry in data["cards"]
            if not (entry["itemId"] == item_id and entry["sectionId"] == section_id)
        ]
        self._write(data)

    def create_text_card(self, payload: TextIntakeRequest) -> dict[str, Any]:
        data = self._read()
        section = next((entry for entry in data["sections"] if entry["id"] == payload.sectionId), None)
        if not section:
            raise HTTPException(status_code=404, detail="未找到目标分区")

        card = build_text_card(payload, section)
        data["cards"] = [card, *data["cards"]]
        self._write(data)
        return card


class SqlAlchemyKnowledgeRepository(KnowledgeRepository):
    def __init__(self, database_url: str):
        connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
        self.engine = create_engine(database_url, future=True, connect_args=connect_args)
        self.session_factory = sessionmaker(bind=self.engine, future=True)
        Base.metadata.create_all(self.engine)
        self._seed_sections()

    def _seed_sections(self) -> None:
        with self.session_factory() as session:
            existing = session.execute(select(SectionModel)).scalars().all()
            if existing:
                return
            for section in DEFAULT_SECTIONS:
                session.add(SectionModel(**section))
            session.commit()

    @staticmethod
    def _card_to_dict(card: CardModel) -> dict[str, Any]:
        return {
            "id": card.id,
            "itemId": card.item_id,
            "sectionId": card.section_id,
            "sectionName": card.section_name,
            "title": card.title,
            "author": card.author,
            "time": card.time,
            "bg": card.bg,
            "coverTitle": card.cover_title,
            "category": card.category,
            "tags": card.tags or [],
            "ai": card.ai or {},
            "sourceType": card.source_type,
            "sourceRef": card.source_ref,
            "cardVariant": card.card_variant,
            "summaryStatus": card.summary_status,
            "excerpt": card.excerpt,
            "savedAt": card.saved_at,
        }

    def list_sections(self) -> list[dict[str, Any]]:
        with self.session_factory() as session:
            rows = session.execute(select(SectionModel)).scalars().all()
            return [{"id": row.id, "name": row.name, "desc": row.desc} for row in rows]

    def create_section(self, name: str) -> dict[str, Any]:
        normalized = name.strip()
        if not normalized:
            raise HTTPException(status_code=400, detail="分区名称不能为空")
        with self.session_factory() as session:
            exists = session.execute(select(SectionModel).where(SectionModel.name == normalized)).scalar_one_or_none()
            if exists:
                raise HTTPException(status_code=409, detail="该分区已存在")
            section = SectionModel(id=f"section-{uuid4().hex[:8]}", name=normalized, desc="自定义知识分区")
            session.add(section)
            session.commit()
            return {"id": section.id, "name": section.name, "desc": section.desc}

    def list_cards(self, params: SearchParams) -> list[dict[str, Any]]:
        with self.session_factory() as session:
            rows = session.execute(select(CardModel)).scalars().all()
            cards = [self._card_to_dict(row) for row in rows]
        return _filter_cards(cards, params)

    def save_card(self, payload: CardCreate) -> tuple[dict[str, Any], bool]:
        with self.session_factory() as session:
            section = session.execute(select(SectionModel).where(SectionModel.id == payload.sectionId)).scalar_one_or_none()
            if not section:
                raise HTTPException(status_code=404, detail="未找到目标分区")
            existing = session.execute(
                select(CardModel).where(CardModel.item_id == payload.itemId, CardModel.section_id == payload.sectionId)
            ).scalar_one_or_none()
            if existing:
                return self._card_to_dict(existing), True

            card = CardModel(
                id=f"{payload.sectionId}-{payload.itemId}",
                item_id=payload.itemId,
                section_id=payload.sectionId,
                section_name=section.name,
                title=payload.title,
                author=payload.author,
                time=payload.time,
                bg=payload.bg,
                cover_title=payload.coverTitle,
                category=payload.category,
                tags=payload.tags,
                ai=payload.ai.model_dump(),
                source_type=payload.sourceType,
                source_ref=payload.sourceRef,
                card_variant=payload.cardVariant,
                summary_status=payload.summaryStatus,
                excerpt=payload.excerpt,
                saved_at=payload.savedAt,
            )
            session.add(card)
            session.commit()
            return self._card_to_dict(card), False

    def delete_card(self, item_id: str, section_id: str) -> None:
        with self.session_factory() as session:
            session.execute(delete(CardModel).where(CardModel.item_id == item_id, CardModel.section_id == section_id))
            session.commit()

    def create_text_card(self, payload: TextIntakeRequest) -> dict[str, Any]:
        with self.session_factory() as session:
            section = session.execute(select(SectionModel).where(SectionModel.id == payload.sectionId)).scalar_one_or_none()
            if not section:
                raise HTTPException(status_code=404, detail="未找到目标分区")
            card = build_text_card(payload, {"id": section.id, "name": section.name, "desc": section.desc})
            row = CardModel(
                id=card["id"],
                item_id=card["itemId"],
                section_id=card["sectionId"],
                section_name=card["sectionName"],
                title=card["title"],
                author=card["author"],
                time=card["time"],
                bg=card["bg"],
                cover_title=card["coverTitle"],
                category=card["category"],
                tags=card["tags"],
                ai=card["ai"],
                source_type=card["sourceType"],
                source_ref=card["sourceRef"],
                card_variant=card["cardVariant"],
                summary_status=card["summaryStatus"],
                excerpt=card["excerpt"],
                saved_at=card["savedAt"],
            )
            session.add(row)
            session.commit()
            return self._card_to_dict(row)


def _filter_cards(cards: list[dict[str, Any]], params: SearchParams) -> list[dict[str, Any]]:
    keyword = params.query_value.strip().lower()
    results: list[dict[str, Any]] = []
    for card in cards:
        if params.mode == "notes" and not card.get("ai"):
            continue
        if params.section_id != "all" and card["sectionId"] != params.section_id:
            continue
        if params.tag != "全部" and params.tag not in card.get("tags", []):
            continue
        if keyword:
            ai_payload = card.get("ai") or {}
            haystack = " ".join(
                [
                    card["title"],
                    card["author"],
                    card["sectionName"],
                    *card.get("tags", []),
                    card.get("excerpt", ""),
                    ai_payload.get("takeaway", ""),
                    *ai_payload.get("summary", []),
                    *ai_payload.get("keywords", []),
                    *[quote.get("text", "") for quote in ai_payload.get("quotes", [])],
                    *[entity.get("label", "") for entity in ai_payload.get("entities", [])],
                ]
            ).lower()
            if keyword not in haystack:
                continue
        results.append(card)
    if params.sort_by == "title":
        results.sort(key=lambda item: item["title"])
    elif params.sort_by == "category":
        results.sort(key=lambda item: item["category"])
    else:
        results.sort(key=lambda item: item["savedAt"], reverse=True)
    return results


def build_repository(base_dir: Path) -> KnowledgeRepository:
    storage_backend = os.getenv("KNOWLEDGE_STORAGE_BACKEND", "json").lower()
    database_url = os.getenv("DATABASE_URL", f"sqlite:///{(base_dir / 'data' / 'knowledge.db').as_posix()}")

    if storage_backend == "database":
        return SqlAlchemyKnowledgeRepository(database_url)
    return JsonKnowledgeRepository(base_dir / "data" / "knowledge.json")
