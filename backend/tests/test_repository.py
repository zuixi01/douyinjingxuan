import json
from concurrent.futures import ThreadPoolExecutor

import pytest

from backend.repository import JsonKnowledgeRepository, SqlAlchemyKnowledgeRepository, build_repository
from backend.schemas import SearchParams, TextIntakeRequest


def test_concurrent_json_writes_keep_all_cards(tmp_path):
    repository = JsonKnowledgeRepository(tmp_path / "knowledge.json")

    def create_card(index):
        return repository.create_text_card(TextIntakeRequest(
            title=f"Concurrent note {index}",
            content=f"Note {index} contains enough text to create a knowledge card.",
            sectionId="default",
        ))

    with ThreadPoolExecutor(max_workers=8) as executor:
        created = list(executor.map(create_card, range(32)))

    stored = repository.list_cards(SearchParams())
    assert {card["id"] for card in stored} == {card["id"] for card in created}
    assert len(stored) == 32


def test_failed_atomic_replace_preserves_existing_json(tmp_path, monkeypatch):
    repository = JsonKnowledgeRepository(tmp_path / "knowledge.json")
    repository.create_section("Keep me")
    previous = repository.file_path.read_bytes()

    def fail_replace(*args):
        raise OSError("Simulated disk failure")

    monkeypatch.setattr("backend.repository.os.replace", fail_replace)
    with pytest.raises(OSError, match="Simulated disk failure"):
        repository.create_section("Must not replace existing data")

    assert repository.file_path.read_bytes() == previous
    assert json.loads(previous)["sections"][0]["name"] == "Keep me"
    assert list(tmp_path.glob("*.tmp")) == []


def test_repository_uses_configured_data_directory(tmp_path, monkeypatch):
    monkeypatch.setenv("KNOWLEDGE_STORAGE_BACKEND", "json")
    data_dir = tmp_path / "custom" / "data"
    monkeypatch.setenv("KNOWLEDGE_DATA_DIR", str(data_dir))
    repository = build_repository(tmp_path / "backend")
    repository.create_section("Custom location")
    assert repository.file_path == data_dir / "knowledge.json"
    assert repository.file_path.exists()
    assert not (tmp_path / "backend" / "data").exists()


def test_database_mode_creates_default_directory(tmp_path, monkeypatch):
    monkeypatch.setenv("KNOWLEDGE_STORAGE_BACKEND", "database")
    monkeypatch.delenv("KNOWLEDGE_DATA_DIR", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    repository = build_repository(tmp_path / "new-backend")
    try:
        assert isinstance(repository, SqlAlchemyKnowledgeRepository)
        assert repository.list_sections()
        assert (tmp_path / "new-backend" / "data" / "knowledge.db").exists()
    finally:
        repository.engine.dispose()


def test_invalid_storage_backend_is_rejected(tmp_path, monkeypatch):
    monkeypatch.setenv("KNOWLEDGE_STORAGE_BACKEND", "databse")
    with pytest.raises(ValueError, match="KNOWLEDGE_STORAGE_BACKEND"):
        build_repository(tmp_path)
