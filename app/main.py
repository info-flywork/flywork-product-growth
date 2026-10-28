from __future__ import annotations

import asyncio
import json
import logging
import re
import threading
import time
import uuid
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.agent import run_research, status, write_brief, write_problems
from app.costs import summary as cost_summary
from app.config import DATA, STATIC
from app.design_review import review_design
from app.store import load_history, save_run

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("flywork")


class UTF8JSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return json.dumps(content, ensure_ascii=False).encode("utf-8")


app = FastAPI(title="Flywork Ürün Araştırması", default_response_class=UTF8JSONResponse)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=STATIC), name="static")
_figjam_jobs: dict[str, dict] = {}
_plugin_file = {"key": "", "at": 0.0}
_figjam_lock = threading.Lock()


class ResearchRequest(BaseModel):
    product_type: Literal["Oyun", "Uygulama"]
    scope: Literal["auto", "idea"]
    criteria: str = Field(default="", max_length=1200)


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html", headers={"Cache-Control": "no-cache"})


@app.get("/favicon.ico")
def favicon():
    return Response(status_code=204)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/config")
def config():
    return status()


@app.get("/api/costs")
def costs():
    return cost_summary()


@app.get("/api/history")
def history():
    return {"runs": load_history()}


@app.get("/api/latest")
def latest():
    runs = load_history()
    return {"run": runs[0] if runs else None}


class BriefRequest(BaseModel):
    title: str = Field(min_length=2, max_length=80)
    subtitle: str = Field(default="", max_length=160)
    category: str = Field(default="", max_length=40)
    score: int = Field(default=0, ge=0, le=100)
    thesis: str = Field(default="", max_length=600)
    score_reason: str = Field(default="", max_length=800)
    why_build: str = Field(default="", max_length=800)
    difference: str = Field(default="", max_length=800)
    advantages: list[str] = Field(default_factory=list, max_length=8)
    features: list[str] = Field(default_factory=list, max_length=8)
    reviews_grounded: bool = False
    problems: list[dict] = Field(default_factory=list, max_length=8)
    competitors: list[dict] = Field(default_factory=list, max_length=10)


class ProblemPageRequest(BriefRequest):
    reviews: list[dict] = Field(default_factory=list, max_length=8)


class FigjamRequest(BaseModel):
    url: str = Field(min_length=12, max_length=500)
    title: str = Field(min_length=2, max_length=120)
    subtitle: str = Field(default="", max_length=200)
    score: int = Field(default=0, ge=0, le=100)
    app_concept: str = Field(default="", max_length=5000)
    app_sections: list[dict] = Field(default_factory=list, max_length=8)


@app.post("/api/figjam")
def figjam(req: FigjamRequest):
    href = req.url.strip()
    if "/board/" not in href:
        raise HTTPException(status_code=400, detail="Boş FigJam panosunun linkini yapıştır. Adres figma.com/board olmalı.")
    DATA.mkdir(parents=True, exist_ok=True)
    sections = []
    for item in req.app_sections:
        if not isinstance(item, dict):
            continue
        title = " ".join(str(item.get("title") or "").split())[:80]
        detail = str(item.get("detail") or "").strip()[:1400]
        if title and detail:
            sections.append({"title": title, "detail": detail})
    if not req.app_concept.strip() or len(sections) < 6:
        raise HTTPException(
            status_code=400,
            detail="Akış, analiz sayfasındaki uygulama metninden çizilir. Önce o fikri açıp metnin yazılmasını bekle.",
        )
    file_key = _figjam_file_key(href)
    if not file_key:
        raise HTTPException(status_code=400, detail="FigJam linkinden pano kimliği okunamadı.")
    job_id = uuid.uuid4().hex[:12]
    job = {
        "id": job_id,
        "status": "waiting",
        "url": href,
        "file_key": file_key,
        "title": req.title.strip(),
        "subtitle": req.subtitle.strip(),
        "score": req.score,
        "app_concept": req.app_concept.strip()[:2200],
        "app_sections": sections,
        "node_ids": [],
        "error": "",
        "created_at": time.time(),
        "claimed_at": 0,
    }
    with _figjam_lock:
        _figjam_jobs[job_id] = job
        (DATA / "figjam-request.json").write_text(json.dumps(_figjam_public(job), ensure_ascii=False), encoding="utf-8")
    return {"id": job_id, "status": "waiting"}


@app.get("/api/figjam/pending")
def figjam_pending():
    now = time.time()
    with _figjam_lock:
        waiting = [
            job for job in _figjam_jobs.values()
            if job["status"] == "waiting" and now - job["created_at"] < 180
        ]
    if not waiting:
        return {"pending": False}
    return _figjam_public(waiting[-1])


@app.get("/api/figjam/job")
def figjam_claim(file_key: str = ""):
    key = re.sub(r"[^A-Za-z0-9]", "", file_key)[:32]
    now = time.time()
    with _figjam_lock:
        if key:
            _plugin_file["key"] = key
            _plugin_file["at"] = now
        waiting = [
            job for job in _figjam_jobs.values()
            if (not key or job["file_key"] == key)
            and job["status"] in {"waiting", "drawing"}
            and now - job["created_at"] < 180
        ]
        if not waiting:
            return {"pending": False}
        job = waiting[-1]
        if job["status"] == "drawing" and now - float(job.get("claimed_at") or 0) < 25:
            return {"pending": False}
        job["status"] = "drawing"
        job["claimed_at"] = now
        return _figjam_public(job)


@app.get("/api/figjam/job/{job_id}")
def figjam_status(job_id: str):
    with _figjam_lock:
        job = _figjam_jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Akış isteği yok.")
        return {"id": job["id"], "status": job["status"], "error": job["error"], "node_ids": job["node_ids"]}


class FigjamDone(BaseModel):
    node_ids: list[str] = Field(default_factory=list, max_length=40)
    error: str = Field(default="", max_length=300)


@app.post("/api/figjam/job/{job_id}")
def figjam_done(job_id: str, req: FigjamDone):
    with _figjam_lock:
        job = _figjam_jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Akış isteği yok.")
        if req.error.strip():
            job["status"] = "error"
            job["error"] = req.error.strip()[:300]
        elif req.node_ids:
            job["status"] = "done"
            job["node_ids"] = [str(item)[:40] for item in req.node_ids[:40]]
            job["error"] = ""
        else:
            job["status"] = "error"
            job["error"] = "FigJam düğüm döndürmedi."
        return {"id": job["id"], "status": job["status"]}


def _figjam_file_key(url: str) -> str:
    match = re.search(r"/board/([A-Za-z0-9]+)", url)
    return match.group(1) if match else ""


def _figjam_public(job: dict) -> dict:
    return {
        "pending": True,
        "id": job["id"],
        "status": job["status"],
        "url": job["url"],
        "file_key": job["file_key"],
        "title": job["title"],
        "subtitle": job["subtitle"],
        "score": job["score"],
        "app_concept": job["app_concept"],
        "app_sections": job["app_sections"],
    }


class DesignRequest(BaseModel):
    url: str = Field(min_length=12, max_length=500)
    about: str = Field(default="", max_length=2000)
    notes: str = Field(default="", max_length=1000)
    scopes: list[str] = Field(default_factory=list, max_length=12)


@app.post("/api/design")
async def design(req: DesignRequest):
    try:
        return await asyncio.to_thread(
            review_design,
            req.url.strip(),
            req.about,
            req.notes,
            [item.strip() for item in req.scopes if item.strip()][:9],
        )
    except Exception as exc:  # noqa: BLE001 - istemciye güvenli mesaj
        raise HTTPException(status_code=502, detail=safe_error(exc)) from exc


@app.post("/api/brief")
async def brief(req: BriefRequest):
    try:
        return await asyncio.to_thread(write_brief, req.model_dump())
    except Exception as exc:  # noqa: BLE001 - istemciye güvenli mesaj
        raise HTTPException(status_code=502, detail=safe_error(exc)) from exc


@app.post("/api/problems")
async def problems(req: ProblemPageRequest):
    try:
        return await asyncio.to_thread(write_problems, req.model_dump())
    except Exception as exc:  # noqa: BLE001 - istemciye güvenli mesaj
        raise HTTPException(status_code=502, detail=safe_error(exc)) from exc


@app.post("/api/research")
async def research(req: ResearchRequest):
    criteria = " ".join(req.criteria.split())
    if req.scope == "idea" and len(criteria) < 8:
        raise HTTPException(status_code=400, detail="Fikir araştırması için aklındaki fikri birkaç cümleyle yaz.")

    async def events():
        yield sse("progress", {"step": "plan", "message": "Araştırma planı hazırlanıyor"})
        queue: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_running_loop()

        def progress(step: str, message: str) -> None:
            print(f"keşif · {message}", flush=True)
            try:
                loop.call_soon_threadsafe(queue.put_nowait, ("progress", {"step": step, "message": message}))
            except RuntimeError:
                return

        def worker() -> None:
            try:
                result = run_research(req.product_type.strip(), req.scope, criteria, progress)
                saved = save_run(result)
                loop.call_soon_threadsafe(queue.put_nowait, ("result", saved))
            except Exception as exc:  # noqa: BLE001 - istemciye güvenli mesaj
                message = safe_error(exc)
                log.info("Keşif hatası: %s", message)
                loop.call_soon_threadsafe(queue.put_nowait, ("error", {"message": message}))
            finally:
                try:
                    loop.call_soon_threadsafe(queue.put_nowait, None)
                except RuntimeError:
                    return

        threading.Thread(target=worker, daemon=True).start()
        while True:
            item = await queue.get()
            if item is None:
                break
            yield sse(item[0], item[1])

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def safe_error(exc: Exception) -> str:
    message = str(exc).strip() or "Araştırma tamamlanamadı"
    message = re.sub(r"sk-[A-Za-z0-9_\-]+", "sk-***", message)
    message = re.sub(r"figd_[A-Za-z0-9_\-]+", "figd_***", message)
    if isinstance(exc, (RuntimeError, TimeoutError)):
        return message[:500]
    return "Araştırma tamamlanamadı. Biraz sonra tekrar dene."
