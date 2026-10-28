from __future__ import annotations

import json
import threading
import time
from contextlib import contextmanager
from contextvars import ContextVar
from calendar import monthrange
from datetime import datetime, timedelta, timezone

import httpx

from app.config import DATA, OPENAI_ADMIN_KEY, OPENAI_API_KEY, usable

LEDGER = DATA / "openai-usage.json"
_lock = threading.Lock()
_meta: ContextVar[dict | None] = ContextVar("flywork_cost_meta", default=None)

# OpenAI list prices for gpt-4o, USD per 1M tokens.
# https://developers.openai.com/api/docs/models/gpt-4o
RATES = {
    "gpt-4o": {"input": 2.5, "cached": 1.25, "output": 10.0},
    "gpt-4o-mini": {"input": 0.15, "cached": 0.075, "output": 0.60},
}
DEFAULT_RATE = RATES["gpt-4o"]
KINDS = ("Oyun", "Uygulama")


@contextmanager
def usage_scope(kind: str, feature: str, title: str = ""):
    label = kind if kind in KINDS else "Diğer"
    token = _meta.set({
        "kind": label,
        "feature": " ".join(str(feature or "OpenAI").split())[:40] or "OpenAI",
        "title": " ".join(str(title or "").split())[:80],
    })
    try:
        yield
    finally:
        _meta.reset(token)


def record_usage(model: str, usage: dict) -> None:
    if not isinstance(usage, dict):
        return
    incoming = _as_int(usage.get("input_tokens") or usage.get("prompt_tokens"))
    outgoing = _as_int(usage.get("output_tokens") or usage.get("completion_tokens"))
    details = usage.get("input_tokens_details") if isinstance(usage.get("input_tokens_details"), dict) else {}
    cached = _as_int(details.get("cached_tokens"))
    if incoming <= 0 and outgoing <= 0:
        return
    meta = _meta.get() or {"kind": "Diğer", "feature": "OpenAI", "title": ""}
    entry = {
        "at": datetime.now(timezone.utc).isoformat(),
        "model": str(model or "gpt-4o")[:40],
        "kind": meta["kind"],
        "feature": meta["feature"],
        "title": meta["title"],
        "input_tokens": incoming,
        "cached_tokens": min(cached, incoming),
        "output_tokens": outgoing,
    }
    with _lock:
        rows = _read()
        rows.append(entry)
        _write(rows[-400:])


_MONTHS = ["", "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]


def summary() -> dict:
    with _lock:
        rows = _read()
    now = datetime.now(timezone.utc)
    month_start, month_end, prev_start = _month_bounds(now)
    month_rows = [row for row in rows if _in_span(row, month_start, month_end)]
    prev_rows = [row for row in rows if _in_span(row, prev_start, month_start)]
    days = []
    cursor = month_start
    while cursor.date() <= now.date():
        nxt = cursor + timedelta(days=1)
        days.append({"day": cursor.day, "usd": round(_sum_usd([row for row in month_rows if _in_span(row, cursor, nxt)]), 6)})
        cursor = nxt
    month_usd = round(sum(item["usd"] for item in days), 6)
    elapsed = max(1, len(days))
    month_length = monthrange(now.year, now.month)[1]
    daily = round(month_usd / elapsed, 6)
    projected = round(daily * month_length, 6)
    prev_usd = round(_sum_usd(prev_rows), 6)
    groups = [_kind_group(kind, month_rows, prev_rows) for kind in KINDS]
    other = _kind_group("Diğer", month_rows, prev_rows)
    if other["calls"]:
        groups.append(other)
    features = _feature_groups(month_rows, month_usd)
    month_lines = [_public_row(row) for row in reversed(month_rows)]
    lines = month_lines[:80]
    tokens = {
        "input": sum(row["input_tokens"] for row in month_lines),
        "cached": sum(row["cached_tokens"] for row in month_lines),
        "output": sum(row["output_tokens"] for row in month_lines),
    }
    parts = {
        "input_usd": round(sum(row["input_usd"] for row in month_lines), 6),
        "cached_usd": round(sum(row["cached_usd"] for row in month_lines), 6),
        "output_usd": round(sum(row["output_usd"] for row in month_lines), 6),
    }
    account = _account(now, prev_start)
    return {
        "currency": "USD",
        "model": "gpt-4o",
        "rate": {"input": 2.5, "cached": 1.25, "output": 10.0, "unit": "1M token"},
        "range_label": f"1 {_MONTHS[now.month]} {now.year} – {now.day} {_MONTHS[now.month]} {now.year}",
        "total_usd": round(_sum_usd(rows), 6),
        "total_calls": len(rows),
        "month_usd": month_usd,
        "month_calls": len(month_rows),
        "daily_avg": daily,
        "projected_usd": projected,
        "change_pct": _change(month_usd, prev_usd),
        "days": days,
        "groups": groups,
        "features": features,
        "tokens": tokens,
        "parts": parts,
        "lines": lines,
        "recent": lines[:12],
        "account": account,
        "account_note": _account_note(account),
    }


_account_cache = {"at": 0.0, "payload": None}
_ACCOUNT_TTL = 300


def _account_note(account: dict) -> str:
    if account.get("available"):
        return (
            "Üstteki tutar yalnızca bu panele bağlanan OpenAI anahtarının faturası. "
            "Organizasyondaki diğer proje ve anahtarlar yok. "
            "Araştırma, akış ve tasarım satırları bu panelin ölçtüğü çağrılar; OpenAI faturası bu üç işi ayrıca etiketlemiyor."
        )
    return "Bu panele bağlanan OpenAI anahtarının faturası okunamadı."


def _account(now: datetime, prev_start: datetime) -> dict:
    if not usable(OPENAI_ADMIN_KEY):
        return {"available": False}
    cached = _account_cache.get("payload")
    if cached and time.time() - float(_account_cache.get("at") or 0) < _ACCOUNT_TTL:
        return cached
    try:
        payload = _fetch_account(now, prev_start)
    except (httpx.HTTPError, TimeoutError, ValueError, KeyError):
        return {"available": False}
    _account_cache["payload"] = payload
    _account_cache["at"] = time.time()
    return payload


def _fetch_account(now: datetime, prev_start: datetime) -> dict:
    agent = _agent_key()
    month_start, _, _prev = _month_bounds(now)
    daily = _cost_page(prev_start, None, agent["id"])
    by_line = _cost_page(month_start, "line_item", agent["id"])
    day_amounts = _bucket_totals(daily)
    month_days = []
    cursor = month_start
    while cursor.date() <= now.date():
        month_days.append({"day": cursor.day, "usd": round(day_amounts.get(cursor.date(), 0.0), 6)})
        cursor += timedelta(days=1)
    month_usd = round(sum(item["usd"] for item in month_days), 6)
    prev_usd = round(sum(amount for day, amount in day_amounts.items() if prev_start.date() <= day < month_start.date()), 6)
    elapsed = max(1, len(month_days))
    month_length = monthrange(now.year, now.month)[1]
    return {
        "available": True,
        "key_name": agent["name"],
        "month_usd": month_usd,
        "previous_usd": prev_usd,
        "change_pct": _change(month_usd, prev_usd),
        "daily_avg": round(month_usd / elapsed, 6),
        "projected_usd": round((month_usd / elapsed) * month_length, 6),
        "days": month_days,
        "lines": _ranked(_bucket_groups(by_line, "line_item"), month_usd),
    }


def _agent_key() -> dict:
    suffix = OPENAI_API_KEY[-4:]
    if not usable(OPENAI_API_KEY) or len(suffix) < 4:
        raise ValueError("key")
    for project in _admin_list("/v1/organization/projects"):
        project_id = str(project.get("id") or "")
        if not project_id:
            continue
        for item in _admin_list(f"/v1/organization/projects/{project_id}/api_keys"):
            redacted = str(item.get("redacted_value") or "")
            if redacted.endswith(suffix) and item.get("id"):
                name = " ".join(str(item.get("name") or "Bu agent").split())[:60]
                return {"id": str(item["id"]), "name": name or "Bu agent"}
    raise ValueError("key")


def _admin_list(path: str) -> list:
    rows = []
    after = ""
    for _ in range(8):
        params = {"limit": 100}
        if after:
            params["after"] = after
        response = httpx.get(
            "https://api.openai.com" + path,
            params=params,
            headers={"Authorization": f"Bearer {OPENAI_ADMIN_KEY}"},
            timeout=30,
        )
        if response.status_code >= 400:
            raise ValueError("account")
        data = response.json()
        chunk = data.get("data") if isinstance(data, dict) else []
        if not isinstance(chunk, list):
            break
        rows.extend(item for item in chunk if isinstance(item, dict))
        if not data.get("has_more") or not chunk:
            break
        after = str(data.get("last_id") or chunk[-1].get("id") or "")
        if not after:
            break
    return rows


def _cost_page(start: datetime, group: str | None, api_key_id: str) -> list:
    params = {
        "start_time": int(start.timestamp()),
        "bucket_width": "1d",
        "limit": 62,
        "api_key_ids": api_key_id,
    }
    if group:
        params["group_by"] = group
    response = httpx.get(
        "https://api.openai.com/v1/organization/costs",
        params=params,
        headers={"Authorization": f"Bearer {OPENAI_ADMIN_KEY}"},
        timeout=30,
    )
    if response.status_code >= 400:
        raise ValueError("account")
    data = response.json()
    return data.get("data") if isinstance(data, dict) else []


def _bucket_totals(buckets: list) -> dict:
    totals = {}
    for bucket in buckets or []:
        stamp = _bucket_day(bucket)
        if stamp is None:
            continue
        totals[stamp] = totals.get(stamp, 0.0) + _bucket_amount(bucket)
    return totals


def _bucket_groups(buckets: list, field: str) -> dict:
    groups = {}
    for bucket in buckets or []:
        for result in bucket.get("results") or []:
            if not isinstance(result, dict):
                continue
            name = str(result.get(field) or result.get("project_id") or "Diğer").strip() or "Diğer"
            groups[name] = groups.get(name, 0.0) + _amount(result)
    return groups


def _ranked(groups: dict, total: float) -> list:
    rows = []
    for name, amount in sorted(groups.items(), key=lambda item: item[1], reverse=True):
        if amount <= 0:
            continue
        rows.append({
            "name": name[:80],
            "usd": round(amount, 6),
            "share": round((amount / total) * 100, 1) if total else 0,
        })
    return rows[:24]


def _bucket_day(bucket: dict):
    try:
        return datetime.fromtimestamp(int(bucket.get("start_time")), tz=timezone.utc).date()
    except (TypeError, ValueError, OSError):
        return None


def _bucket_amount(bucket: dict) -> float:
    return sum(_amount(result) for result in (bucket.get("results") or []) if isinstance(result, dict))


def _amount(result: dict) -> float:
    amount = result.get("amount")
    if isinstance(amount, dict):
        try:
            return max(0.0, float(amount.get("value") or 0))
        except (TypeError, ValueError):
            return 0.0
    return 0.0


def _kind_group(kind: str, month_rows: list, prev_rows: list) -> dict:
    picked = [row for row in month_rows if row.get("kind") == kind]
    earlier = [row for row in prev_rows if row.get("kind") == kind]
    calls = [_public_row(row) for row in picked]
    amount = round(sum(row["usd"] for row in calls), 6)
    return {
        "kind": kind,
        "calls": len(calls),
        "input_tokens": sum(row["input_tokens"] for row in calls),
        "cached_tokens": sum(row["cached_tokens"] for row in calls),
        "output_tokens": sum(row["output_tokens"] for row in calls),
        "input_usd": round(sum(row["input_usd"] for row in calls), 6),
        "cached_usd": round(sum(row["cached_usd"] for row in calls), 6),
        "output_usd": round(sum(row["output_usd"] for row in calls), 6),
        "usd": amount,
        "change_pct": _change(amount, round(_sum_usd(earlier), 6)),
    }


def _feature_groups(rows: list, total: float) -> list:
    names = ["Araştırma", "Ürün metni", "Sorun dosyası", "Tasarım inceleme"]
    seen = []
    for row in rows:
        name = str(row.get("feature") or "OpenAI")
        if name not in names and name not in seen:
            seen.append(name)
    items = []
    for name in names + seen:
        picked = [row for row in rows if str(row.get("feature") or "") == name]
        if name not in names and not picked:
            continue
        amount = round(_sum_usd(picked), 6)
        items.append({
            "name": name,
            "usd": amount,
            "share": round((amount / total) * 100, 1) if total else 0,
        })
    return items


def _sum_usd(rows: list) -> float:
    total = 0.0
    for row in rows:
        incoming = _as_int(row.get("input_tokens"))
        cached = min(_as_int(row.get("cached_tokens")), incoming)
        total += _price(str(row.get("model") or ""), incoming, cached, _as_int(row.get("output_tokens")))
    return total


def _change(current: float, previous: float):
    if previous <= 0:
        return None
    return round(((current - previous) / previous) * 100, 1)


def _month_bounds(now: datetime):
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    prev = (start - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return start, end, prev


def _in_span(row: dict, start: datetime, end: datetime) -> bool:
    stamp = _stamp(row)
    return bool(stamp and start <= stamp < end)


def _stamp(row: dict):
    try:
        stamp = datetime.fromisoformat(str(row.get("at") or ""))
    except ValueError:
        return None
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=timezone.utc)
    return stamp


def _public_row(row: dict) -> dict:
    incoming = _as_int(row.get("input_tokens"))
    cached = min(_as_int(row.get("cached_tokens")), incoming)
    outgoing = _as_int(row.get("output_tokens"))
    model = str(row.get("model") or "")
    parts = _parts(model, incoming, cached, outgoing)
    return {
        "at": str(row.get("at") or ""),
        "kind": str(row.get("kind") or ""),
        "feature": str(row.get("feature") or ""),
        "title": str(row.get("title") or ""),
        "model": model,
        "input_tokens": incoming,
        "cached_tokens": cached,
        "output_tokens": outgoing,
        "input_usd": parts["input_usd"],
        "cached_usd": parts["cached_usd"],
        "output_usd": parts["output_usd"],
        "usd": round(parts["input_usd"] + parts["cached_usd"] + parts["output_usd"], 6),
    }


def _parts(model: str, incoming: int, cached: int, outgoing: int) -> dict:
    rate = RATES.get(model, DEFAULT_RATE)
    fresh = max(0, incoming - cached)
    return {
        "input_usd": round(fresh * rate["input"] / 1_000_000, 6),
        "cached_usd": round(cached * rate["cached"] / 1_000_000, 6),
        "output_usd": round(outgoing * rate["output"] / 1_000_000, 6),
    }


def _price(model: str, incoming: int, cached: int, outgoing: int) -> float:
    parts = _parts(model, incoming, cached, outgoing)
    return parts["input_usd"] + parts["cached_usd"] + parts["output_usd"]


def _as_int(value) -> int:
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return 0


def _read() -> list:
    if not LEDGER.exists():
        return []
    try:
        data = json.loads(LEDGER.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    return data if isinstance(data, list) else []


def _write(rows: list) -> None:
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    LEDGER.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
