import pytest
from fastapi.testclient import TestClient

from backend.repository import JsonKnowledgeRepository, SqlAlchemyKnowledgeRepository
from backend.schemas import SearchParams, TextIntakeRequest


@pytest.fixture
def backend_app(tmp_path, monkeypatch):
    # Set the environment before the first import, so even application setup
    # cannot touch a configured database or the developer's knowledge file.
    monkeypatch.setenv("KNOWLEDGE_STORAGE_BACKEND", "json")
    monkeypatch.setenv("KNOWLEDGE_DATA_DIR", str(tmp_path / "startup"))
    monkeypatch.delenv("KNOWLEDGE_CORS_ORIGINS", raising=False)
    import backend.app as module

    monkeypatch.setattr(module, "repository", JsonKnowledgeRepository(tmp_path / "knowledge.json"))
    return module


@pytest.fixture
def client(backend_app):
    return TestClient(backend_app.app)


def test_sections_and_cards_flow(client):

    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    sections = client.get("/api/sections")
    assert sections.status_code == 200
    assert len(sections.json()["sections"]) >= 2

    created = client.post("/api/sections", json={"name": "AI 工作流"})
    assert created.status_code == 200
    section = created.json()["section"]

    payload = {
        "itemId": "codex",
        "sectionId": section["id"],
        "title": "40分钟学会Codex！零基础终级教程",
        "author": "秋芝2046",
        "time": "40:15",
        "bg": "from-gray-950 via-slate-900 to-indigo-800",
        "coverTitle": "Codex 终极教程\\n零基础入门",
        "category": "AI",
        "tags": ["Codex", "AI工具"],
        "ai": {
            "summary": ["摘要 1", "摘要 2"],
            "audience": "开发者",
            "takeaway": "掌握 Codex 的核心用法",
            "timestamps": [{"time": "00:01", "label": "开场", "seconds": 1}],
            "infographic": [{"title": "要点", "text": "一条关键结论"}],
            "quotes": [{"id": "quote-0", "text": "先用 Codex 跑通最小闭环", "source": "视频金句"}],
            "keywords": ["Codex", "AI工具"],
            "entities": [
                {"id": "codex", "label": "Codex", "type": "tool", "weight": 5},
                {"id": "ai-tool", "label": "AI工具", "type": "topic", "weight": 4},
            ],
            "relations": [{"source": "codex", "target": "ai-tool", "label": "属于"}],
        },
        "sourceType": "video",
        "sourceRef": "/videos/codex.mp4",
        "cardVariant": "feature",
        "summaryStatus": "ready",
        "excerpt": "摘要 1",
        "savedAt": "2026-05-24T00:00:00.000Z",
    }

    saved = client.post("/api/cards", json=payload)
    assert saved.status_code == 200
    assert saved.json()["duplicate"] is False
    assert len(saved.json()["savedItems"]) == 1

    cards = client.get("/api/cards", params={"query": "Codex"})
    assert cards.status_code == 200
    assert len(cards.json()["cards"]) == 1

    deleted = client.delete(f"/api/cards/{payload['itemId']}", params={"section_id": section["id"]})
    assert deleted.status_code == 200
    assert deleted.json()["savedItems"] == []


def test_text_intake_flow(client):
    section_id = client.get("/api/sections").json()["sections"][0]["id"]

    response = client.post(
        "/api/intake/text",
        json={
            "title": "我对 AI 知识库的判断",
            "content": "AI 知识库最重要的不是聊天，而是把碎片内容整理成可回看的卡片。\n第二步才是搜索和问答。",
            "sectionId": section_id,
            "tags": ["AI知识库", "产品"],
            "author": "手动整理",
            "category": "笔记",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["record"]["sourceType"] == "text"
    assert payload["record"]["ai"]["summary"]
    assert payload["record"]["ai"]["quotes"]
    assert payload["record"]["ai"]["entities"]


def test_database_repository_supports_text_cards(tmp_path):
    repository = SqlAlchemyKnowledgeRepository(f"sqlite:///{(tmp_path / 'knowledge.db').as_posix()}")
    section = repository.create_section("研究专题")
    card = repository.create_text_card(
        TextIntakeRequest(
            title="数据库模式笔记",
            content="第一段内容。\n第二段内容。\n第三段内容。",
            sectionId=section["id"],
            tags=["数据库", "测试"],
            author="测试者",
            category="笔记",
        )
    )

    cards = repository.list_cards(SearchParams(query_value="数据库模式"))
    assert card["title"] == "数据库模式笔记"
    assert len(cards) == 1
    assert card["ai"]["keywords"] == ["数据库", "测试"]
    assert card["ai"]["relations"]


def test_cors_allows_local_development_only(client):
    for origin in ("http://localhost:5173", "http://127.0.0.1:4173"):
        response = client.options(
            "/api/cards", headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
        )
        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == origin
        assert "access-control-allow-credentials" not in response.headers

    response = client.options(
        "/api/cards", headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "POST"},
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_cors_origins_can_be_configured(backend_app, monkeypatch):
    monkeypatch.setenv("KNOWLEDGE_CORS_ORIGINS", " https://knowledge.example, http://localhost:3000, ")
    assert backend_app.configured_cors_origins() == ["https://knowledge.example", "http://localhost:3000"]
