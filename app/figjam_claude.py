from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import threading
from pathlib import Path
from typing import Callable

import httpx

from app.config import ANTHROPIC_API_KEY, CLAUDE_MODEL, DATA, FIGMA_MCP_TOKEN, usable

log = logging.getLogger("flywork.figjam_claude")

QUOTA_MARKERS = (
    "rate_limit",
    "rate limit",
    "usage limit",
    "credit balance",
    "insufficient_quota",
    "quota exceeded",
    "too many requests",
    "out of credits",
    "monthly limit",
    "spending limit",
    "overloaded_error",
)


def _claude_bin() -> str:
    found = shutil.which("claude")
    if found:
        return found
    home = Path.home() / ".local" / "bin" / "claude"
    return str(home) if home.is_file() else ""


def team_ready() -> bool:
    binary = _claude_bin()
    if not binary:
        return False
    env = os.environ.copy()
    local_bin = str(Path.home() / ".local" / "bin")
    env["PATH"] = local_bin + os.pathsep + env.get("PATH", "")
    # API key varken Claude Code Team yerine api_key gösterir; Team kontrolünde çıkar.
    env.pop("ANTHROPIC_API_KEY", None)
    try:
        raw = subprocess.check_output(
            [binary, "auth", "status"],
            text=True,
            stderr=subprocess.STDOUT,
            timeout=12,
            env=env,
        )
    except (subprocess.SubprocessError, OSError):
        return False
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return "loggedIn" in raw and "true" in raw.lower()
    if not data.get("loggedIn"):
        return False
    kind = str(data.get("subscriptionType") or "").lower()
    method = str(data.get("authMethod") or "").lower()
    if kind in {"team", "pro", "max", "enterprise"}:
        return True
    # claude.ai oturumu (Team/Pro) — api_key değil
    return method in {"claude.ai", "oauth"} and bool(data.get("email") or data.get("orgId"))


def api_ready() -> bool:
    return usable(ANTHROPIC_API_KEY) and usable(FIGMA_MCP_TOKEN)


def draw_status() -> dict:
    return {
        "claude_team": team_ready(),
        "claude_api": usable(ANTHROPIC_API_KEY),
        "figma_mcp": usable(FIGMA_MCP_TOKEN),
        "claude_model": CLAUDE_MODEL,
    }


def start_draw(job: dict, finish: Callable[[str, list[str], str], None]) -> None:
    thread = threading.Thread(target=_run_draw, args=(job, finish), daemon=True)
    thread.start()


def _run_draw(job: dict, finish: Callable[[str, list[str], str], None]) -> None:
    job_id = str(job.get("id") or "")
    errors: list[str] = []
    try:
        if team_ready():
            try:
                node_ids = _draw_via_team(job)
                finish(job_id, node_ids, "")
                return
            except _QuotaError as err:
                errors.append(str(err))
                log.info("Claude Team kotası bitti, API keye geçiliyor: %s", err)
            except Exception as err:
                message = str(err).strip() or "Claude Team çizemedi."
                if _looks_like_quota(message):
                    errors.append(message)
                    log.info("Claude Team kota benzeri hata, API keye geçiliyor: %s", message)
                else:
                    errors.append(message)
                    log.warning("Claude Team çizimi olmadı: %s", message)
        if api_ready():
            try:
                node_ids = _draw_via_api(job)
                finish(job_id, node_ids, "")
                return
            except Exception as err:
                errors.append(str(err).strip() or "Claude API çizemedi.")
                log.warning("Claude API çizimi olmadı: %s", err)
        if not team_ready() and not usable(ANTHROPIC_API_KEY):
            # Masaüstü eklenti beklesin; Claude yolu yok.
            return
        if usable(ANTHROPIC_API_KEY) and not usable(FIGMA_MCP_TOKEN) and not team_ready():
            finish(
                job_id,
                [],
                "Claude API için FIGMA_MCP_TOKEN gerekli. Terminalde `claude mcp login figma` çalıştır.",
            )
            return
        if errors:
            # Team/API denendi ama çizilemedi: eklenti yedek olarak bekleyebilir.
            # FIGMA MCP auth eksikse kullanıcıya net mesaj bırak.
            joined = _clip("; ".join(errors), 280)
            if "authentication" in joined.lower() or "needs authentication" in joined.lower() or "mcp" in joined.lower():
                finish(
                    job_id,
                    [],
                    "Claude Figma MCP oturumu yok. Terminalde `claude mcp login figma` çalıştırıp yeşil düğmeye tekrar bas.",
                )
                return
            finish(job_id, [], joined)
    except Exception as err:
        finish(job_id, [], _clip(str(err) or "Claude çizimi olmadı.", 280))


class _QuotaError(RuntimeError):
    pass


def _looks_like_quota(text: str) -> bool:
    lowered = text.lower()
    return any(marker in lowered for marker in QUOTA_MARKERS)


def _draw_prompt(job: dict) -> str:
    sections = job.get("app_sections") or []
    lines = []
    for index, item in enumerate(sections[:8], start=1):
        title = str(item.get("title") or f"Adım {index}").strip()
        detail = str(item.get("detail") or "").strip()
        lines.append(f"{index}. {title}\n{detail}")
    body = "\n\n".join(lines)
    title = str(job.get("title") or "Akış").strip()
    concept = str(job.get("app_concept") or "").strip()
    url = str(job.get("url") or "").strip()
    file_key = str(job.get("file_key") or "").strip()
    return f"""FigJam panosuna ürün akışı çiz.

Pano URL: {url}
fileKey: {file_key}
Ürün: {title}
Kavram: {concept}

Adımlar:
{body}

Kurallar:
- Bu FigJam board dosyasına çiz (`figma.com/board/...`). Yeni boş dosya açma.
- Mevcut içeriğin sağına yeni bir section koy. Section adı "{title} akışı" olsun.
- Her adım için shape-with-text kartı oluştur; metin başlık + detay olsun.
- Kartları 4 sütunlu akış gibi bağla (elbow connector).
- Figma MCP araçlarını kullan (`use_figma` veya generate_diagram + board bağlamı).
- Bitince yalnız şu JSON satırını yaz, başka açıklama ekleme:
{{"node_ids":["id1","id2"],"error":""}}
- Çizemezsen: {{"node_ids":[],"error":"kısa neden"}}
"""


def _draw_via_team(job: dict) -> list[str]:
    prompt = _draw_prompt(job)
    binary = _claude_bin()
    if not binary:
        raise RuntimeError("Claude Code bulunamadı.")
    env = os.environ.copy()
    local_bin = str(Path.home() / ".local" / "bin")
    env["PATH"] = local_bin + os.pathsep + env.get("PATH", "")
    # Team oturumu kullanılsın; API key varsa bile Claude Code OAuth'u bozmasın.
    env.pop("ANTHROPIC_API_KEY", None)
    try:
        completed = subprocess.run(
            [
                binary,
                "-p",
                prompt,
                "--output-format",
                "text",
                "--dangerously-skip-permissions",
            ],
            capture_output=True,
            text=True,
            timeout=240,
            env=env,
            cwd=str(DATA.parent),
        )
    except subprocess.TimeoutExpired as err:
        raise RuntimeError("Claude Team çizimi zaman aşımına uğradı.") from err
    output = ((completed.stdout or "") + "\n" + (completed.stderr or "")).strip()
    if completed.returncode != 0:
        if _looks_like_quota(output):
            raise _QuotaError(_clip(output, 240) or "Claude Team kotası bitti.")
        raise RuntimeError(_clip(output, 240) or f"Claude Team çıkış kodu {completed.returncode}.")
    if _looks_like_quota(output):
        raise _QuotaError(_clip(output, 240) or "Claude Team kotası bitti.")
    return _parse_node_ids(output)


def _draw_via_api(job: dict) -> list[str]:
    prompt = _draw_prompt(job)
    headers = {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "mcp-client-2025-11-20",
    }
    payload = {
        "model": CLAUDE_MODEL,
        "max_tokens": 4096,
        "messages": [{"role": "user", "content": prompt}],
        "mcp_servers": [
            {
                "type": "url",
                "url": "https://mcp.figma.com/mcp",
                "name": "figma",
                "authorization_token": FIGMA_MCP_TOKEN,
            }
        ],
        "tools": [{"type": "mcp_toolset", "mcp_server_name": "figma"}],
    }
    with httpx.Client(timeout=240.0) as client:
        response = client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
        if response.status_code == 429 or _looks_like_quota(response.text):
            raise RuntimeError(_clip(response.text, 240) or "Claude API kotası bitti.")
        if response.status_code >= 400:
            raise RuntimeError(_clip(response.text, 240) or f"Claude API {response.status_code}.")
        data = response.json()
    parts = []
    for block in data.get("content") or []:
        if isinstance(block, dict) and block.get("type") == "text":
            parts.append(str(block.get("text") or ""))
    return _parse_node_ids("\n".join(parts))


def _parse_node_ids(text: str) -> list[str]:
    matches = re.findall(r"\{[^{}]*\"node_ids\"[^{}]*\}", text, flags=re.S)
    for raw in reversed(matches):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if data.get("error"):
            raise RuntimeError(str(data.get("error")))
        ids = data.get("node_ids") or []
        if isinstance(ids, list) and ids:
            return [str(item)[:40] for item in ids[:40]]
    loose = re.findall(r"\b\d+:\d+\b", text)
    if loose:
        return loose[:40]
    raise RuntimeError("Claude panoya düğüm id'si döndürmedi.")


def _clip(value: str, limit: int) -> str:
    text = " ".join(str(value or "").split())
    return text if len(text) <= limit else f"{text[: limit - 1]}…"
