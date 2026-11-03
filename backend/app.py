from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .repository import build_repository
from .schemas import CardCreate, PreviewRequest, SearchParams, SectionCreate, TextIntakeRequest


BASE_DIR = Path(__file__).resolve().parent
repository = build_repository(BASE_DIR)


def configured_cors_origins() -> list[str]:
    default_origins = "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173"
    return [origin.strip() for origin in os.getenv("KNOWLEDGE_CORS_ORIGINS", default_origins).split(",") if origin.strip()]


app = FastAPI(title="Douyin AI Knowledge API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.get("/api/sections")
def get_sections() -> dict:
    return {"sections": repository.list_sections()}


@app.post("/api/sections")
def create_section(payload: SectionCreate) -> dict:
    section = repository.create_section(payload.name)
    return {
        "ok": True,
        "section": section,
        "sections": repository.list_sections(),
        "message": f"已创建分区：{section['name']}",
    }


@app.get("/api/cards")
def get_cards(
    query_value: str = Query(default="", alias="query"),
    section_id: str = "all",
    tag: str = "全部",
    mode: Literal["knowledge", "notes"] = "knowledge",
    sort_by: Literal["latest", "title", "category"] = "latest",
) -> dict:
    params = SearchParams(
        query_value=query_value,
        section_id=section_id,
        tag=tag,
        mode=mode,
        sort_by=sort_by,
    )
    return {"cards": repository.list_cards(params)}


@app.post("/api/cards")
def create_card(payload: CardCreate) -> dict:
    card, duplicate = repository.save_card(payload)
    message = f"{payload.title} 已存在于 {card['sectionName']}" if duplicate else f"已保存到 {card['sectionName']}"
    return {
        "ok": True,
        "duplicate": duplicate,
        "record": card,
        "savedItems": repository.list_cards(SearchParams()),
        "message": message,
    }


@app.delete("/api/cards/{item_id}")
def delete_card(item_id: str, section_id: str) -> dict:
    repository.delete_card(item_id, section_id)
    return {"ok": True, "savedItems": repository.list_cards(SearchParams())}


@app.post("/api/intake/text")
def intake_text(payload: TextIntakeRequest) -> dict:
    card = repository.create_text_card(payload)
    return {
        "ok": True,
        "record": card,
        "savedItems": repository.list_cards(SearchParams()),
        "message": f"已整理并保存：{card['title']}",
    }


@app.post("/api/ai/preview")
def preview_card(payload: PreviewRequest) -> dict:
    summary = payload.ai.summary if payload.ai else []
    preview = {
        "id": payload.id,
        "title": payload.title,
        "author": payload.author,
        "duration": payload.time,
        "summary": summary,
        "audience": payload.ai.audience if payload.ai else "适合希望快速理解内容价值的读者。",
        "takeaway": payload.ai.takeaway if payload.ai else "已提取核心收获，可继续深入整理。",
        "timestamps": payload.ai.timestamps if payload.ai else [],
        "infographic": payload.ai.infographic if payload.ai else [],
        "quotes": payload.ai.quotes if payload.ai else [],
        "keywords": payload.ai.keywords if payload.ai else [],
        "entities": payload.ai.entities if payload.ai else [],
        "relations": payload.ai.relations if payload.ai else [],
        "tags": payload.tags,
        "status": "ready" if payload.ai else "draft",
    }
    return {"preview": preview}
