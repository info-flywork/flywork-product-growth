from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from app.config import DATA

HISTORY = DATA / "history.json"


def load_history() -> list[dict]:
    if not HISTORY.exists():
        return []
    try:
        data = json.loads(HISTORY.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    return data if isinstance(data, list) else []


def save_run(payload: dict) -> dict:
    DATA.mkdir(parents=True, exist_ok=True)
    run = {
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    history = [run, *load_history()][:20]
    HISTORY.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")
    return run
