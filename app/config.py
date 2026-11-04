from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip().strip('"').strip("'")
OPENAI_ADMIN_KEY = os.getenv("OPENAI_ADMIN_KEY", "").strip().strip('"').strip("'")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip().strip('"').strip("'")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5").strip().strip('"').strip("'") or "claude-sonnet-4-5"
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "").strip().strip('"').strip("'")
FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY", "").strip().strip('"').strip("'")
FIGMA_ACCESS_TOKEN = os.getenv("FIGMA_ACCESS_TOKEN", "").strip().strip('"').strip("'")
FIGMA_MCP_TOKEN = os.getenv("FIGMA_MCP_TOKEN", "").strip().strip('"').strip("'")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o").strip().strip('"').strip("'") or "gpt-4o"
STATIC = ROOT / "static"
DATA = ROOT / "data"


def usable(value: str) -> bool:
    if not value or len(value) < 20 or "..." in value:
        return False
    return True
