from __future__ import annotations

import logging
from urllib.parse import parse_qs, urlparse

import httpx

from app.agent import clip, clip_keep, extract_json, extract_output, openai_post
from app.config import FIGMA_ACCESS_TOKEN, OPENAI_MODEL, usable

log = logging.getLogger("flywork")

TOKEN_HELP = (
    "Figma dosyasını okumak için bir kez anahtar gerekiyor. "
    "Figma → Settings → Security → Personal access tokens bölümünden anahtar oluştur, "
    ".env içine FIGMA_ACCESS_TOKEN= yazıp paneli yeniden başlat. "
    "Analiz ekranında yalnızca dosya linkini yapıştırman yeterli."
)

SCREEN_TYPES = {"FRAME", "COMPONENT"}
NOTE_ITEM = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "title": {"type": "string"},
        "detail": {"type": "string"},
    },
    "required": ["title", "detail"],
}

DESIGN_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "summary": {"type": "string"},
        "audience": {"type": "string"},
        "scores": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "overall": {"type": "integer"},
                "ux": {"type": "integer"},
                "quality": {"type": "integer"},
                "potential": {"type": "integer"},
            },
            "required": ["overall", "ux", "quality", "potential"],
        },
        "screens": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "name": {"type": "string"},
                    "score": {"type": "integer"},
                    "note": {"type": "string"},
                },
                "required": ["name", "score", "note"],
            },
        },
        "strengths": {"type": "array", "items": NOTE_ITEM},
        "improvements": {"type": "array", "items": NOTE_ITEM},
        "suggestions": {"type": "array", "items": NOTE_ITEM},
    },
    "required": ["summary", "audience", "scores", "screens", "strengths", "improvements", "suggestions"],
}

DESIGN_SYSTEM = """Sen Flywork Product Studio için mobil arayüz eleştirmenisin.
Türkçe yaz. Yalnızca verilen ekran görüntülerine bak. Görmediğin metni, butonu veya akışı yazma.
Kısa özet yasak. Her iddiayı ekranda gördüğün bir başlık, kart, buton veya yerleşime bağla.

summary: dört paragraf, aralarında boş satır.
1) Ürün bu ekranlarda ne yaptırıyor. Görünen başlıklardan en az iki örnek ver.
2) Görsel sistem: renk, tipografi, kart yoğunluğu, boşluk, tekrar eden parçalar.
3) Ekranlar arasındaki akış. Kullanıcı bir ekrandan diğerine ne taşır, nerede kopar.
4) En büyük sorun. Puanı neden düşürdüğünü somut bir yerle anlat.

audience: iki paragraf, aralarında boş satır. Kim bu yoğunlukta rahat eder, kim takılır. Her paragrafta bir ekran adı geçsin.

scores: 0 ile 100. overall genel, ux akış ve anlaşılırlık, quality görsel işçilik, potential düzeltmeyle ne kadar iyileşir. Puanı metindeki somut soruna bağla.

screens: verilen her ekran için aynı adla bir kayıt.
note: en az beş cümle. Sırayla şunları yaz: ekranın üstten alta ne anlattığı, gördüğün birincil buton veya eylem, bilgi yoğunluğu, hiyerarşide kaybolan parça, bu ekranda ilk değişecek şey.
Gördüğün buton ve başlık adlarını aynen kullan.

strengths: 5 madde. title somut karar. detail üç cümle ve hangi ekranda olduğu.
improvements: 5 madde. title ekran adını içersin. detail sorunu, kullanıcının takılacağı anı ve neyin değişeceğini yazsın.
suggestions: 6 madde. title kısa eylem. detail hangi ekranda, ne kalkacak ya da eklenecek, beklenen etki. Üç cümle.
Genel övgü ve madde doldurmak için tekrar yazma."""


def review_design(url: str, about: str, notes: str, scopes: list[str]) -> dict:
    file_key, node_id = parse_figma_url(url)
    if not usable(FIGMA_ACCESS_TOKEN):
        raise RuntimeError(TOKEN_HELP)
    document, file_name = load_document(file_key, node_id)
    frames = pick_frames(document, node_id)
    if not frames:
        raise RuntimeError("Dosyada okunacak ekran çerçevesi yok.")
    images = export_images(file_key, [frame["id"] for frame in frames])
    ready = []
    for frame in frames:
        image = images.get(frame["id"])
        if image:
            ready.append({**frame, "image": image})
    if not ready:
        raise RuntimeError("Figma ekran görüntüsü döndürmedi.")
    from app.costs import usage_scope

    kind = "Oyun" if "oyun" in f"{about} {notes}".casefold() else "Uygulama"
    with usage_scope(kind, "Tasarım inceleme", about or file_name):
        analysis = analyze_screens(file_name, ready, about, notes, scopes)
    unused = [frame["image"] for frame in ready]
    screens = []
    for item in analysis["screens"][:8]:
        if not isinstance(item, dict):
            continue
        name = clip(item.get("name"), 60)
        if not name:
            continue
        image = ""
        for frame in ready:
            if frame["name"] == name and frame["image"] in unused:
                image = frame["image"]
                unused.remove(image)
                break
        if not image and unused:
            image = unused.pop(0)
        screens.append({
            "name": name,
            "score": clamp_score(item.get("score"), 0),
            "note": clip_keep(item.get("note"), 1400),
            "image": image,
        })
    if not screens:
        raise RuntimeError("Ekranlar okundu ama analiz yazılamadı.")
    return {
        "file_name": file_name,
        "screen_count": len(screens),
        "summary": analysis["summary"],
        "audience": analysis["audience"],
        "scores": analysis["scores"],
        "screens": screens,
        "strengths": analysis["strengths"],
        "improvements": analysis["improvements"],
        "suggestions": analysis["suggestions"],
    }


def analyze_via_mcp(url: str, file_key: str, node_id: str, about: str, notes: str, scopes: list[str]) -> dict:
    focus = ", ".join(scopes) if scopes else "genel tasarım, akış, kullanılabilirlik"
    node_line = f"nodeId: {node_id}" if node_id else "nodeId yok. Önce sayfaları listele, sonra ekran çerçevelerine bak."
    prompt = (
        "Bu Figma dosyasına bağlı Figma MCP ile bak. REST anahtarı kullanma.\n"
        f"Link: {url}\n"
        f"fileKey: {file_key}\n"
        f"{node_line}\n"
        "Sıra: get_metadata ile çerçeve adlarını al. En fazla 8 ekran için get_screenshot çağır ve görüntülere bak. "
        "Görmediğin ekranı, metni veya akışı yazma.\n"
        f"Ürün notu: {about.strip() or 'Verilmedi.'}\n"
        f"Ek not: {notes.strip() or 'Yok'}\n"
        f"Odak: {focus}\n"
        "file_name dosyanın adıdır. screens içindeki name, MCP'de gördüğün çerçeve adıdır."
    )
    body = openai_post(
        "/v1/responses",
        {
            "model": OPENAI_MODEL,
            "temperature": 0.3,
            "max_output_tokens": 5000,
            "tools": [{
                "type": "mcp",
                "server_label": "figma",
                "server_description": "Bağlı Figma hesabındaki tasarım dosyasını okur. Ekran listesi ve ekran görüntüsü verir.",
                "server_url": "https://mcp.figma.com/mcp",
                "require_approval": "never",
                "allowed_tools": ["get_metadata", "get_screenshot", "get_design_context"],
            }],
            "input": [
                {"role": "system", "content": DESIGN_SYSTEM + "\nfile_name alanını da doldur. Önce Figma MCP araçlarını kullan, sonra JSON ver."},
                {"role": "user", "content": prompt},
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "design_review",
                    "strict": True,
                    "schema": {
                        **DESIGN_SCHEMA,
                        "properties": {
                            "file_name": {"type": "string"},
                            **DESIGN_SCHEMA["properties"],
                        },
                        "required": ["file_name", *DESIGN_SCHEMA["required"]],
                    },
                }
            },
        },
        timeout=httpx.Timeout(180.0, connect=15.0),
    )
    if body.get("status") == "incomplete":
        raise RuntimeError("Tasarım analizi yarıda kesildi. Figma MCP ekranlara bakamadan yanıt kapandı.")
    failure = mcp_failure(body)
    if failure:
        raise RuntimeError(failure)
    text, _sources = extract_output(body)
    if not text.strip():
        raise RuntimeError("Figma MCP üzerinden tasarım okunamadı. Dosya linkini ve Figma oturumunu kontrol et.")
    data = extract_json(text)
    if not isinstance(data, dict):
        raise RuntimeError("Tasarım analizi okunamadı")
    scores = data.get("scores") if isinstance(data.get("scores"), dict) else {}
    return {
        "file_name": clip(data.get("file_name"), 80),
        "summary": clip_keep(data.get("summary"), 1200),
        "audience": clip_keep(data.get("audience"), 600),
        "scores": {
            "overall": clamp_score(scores.get("overall"), 0),
            "ux": clamp_score(scores.get("ux"), 0),
            "quality": clamp_score(scores.get("quality"), 0),
            "potential": clamp_score(scores.get("potential"), 0),
        },
        "screens": data.get("screens") if isinstance(data.get("screens"), list) else [],
        "strengths": note_list(data.get("strengths"), 3),
        "improvements": note_list(data.get("improvements"), 3),
        "suggestions": note_list(data.get("suggestions"), 4),
    }


def mcp_failure(body: dict) -> str:
    calls = [
        item for item in body.get("output") or []
        if isinstance(item, dict) and item.get("type") == "mcp_call"
    ]
    if not calls:
        return "OpenAI, Figma MCP aracını çağırmadan yanıt verdi. Analiz yazılmadı."
    succeeded = [item for item in calls if item.get("status") == "completed"]
    if succeeded:
        return ""
    message = ""
    error = calls[0].get("error") or {}
    for part in error.get("content") or []:
        if isinstance(part, dict) and part.get("text"):
            message = str(part["text"])
            break
    lowered = message.lower()
    if "not authorized" in lowered or "reconnect" in lowered or "access token" in lowered:
        return (
            "Analiz yazılmadı. Bağlı hesap tunahan@fly-work.com ve dosya takım projesinde. "
            "Figma MCP yine de açmıyor. Dosyanın takımı Tunahan AVŞAR's team olmalı. "
            "Proje1, Proje 2 ve Proje 3 bu hesapta View koltuk."
        )
    if message:
        return f"Figma MCP ekranı okuyamadı: {message[:240]}"
    return "Figma MCP ekranı okuyamadı. Analiz yazılmadı."


def parse_figma_url(url: str) -> tuple[str, str]:
    parsed = urlparse(str(url or "").strip())
    host = parsed.netloc.lower().removeprefix("www.")
    if host not in {"figma.com", "figjam.com"} and not host.endswith(".figma.com") and not host.endswith(".figjam.com"):
        raise RuntimeError("Figma dosyasının bağlantısını yapıştır. Adres figma.com ile başlamalı.")
    parts = [part for part in parsed.path.split("/") if part]
    file_key = ""
    for marker in ("design", "file", "proto", "board"):
        if marker in parts:
            index = parts.index(marker)
            if index + 1 < len(parts):
                file_key = parts[index + 1]
            break
    if len(file_key) < 10:
        raise RuntimeError("Bağlantıdan Figma dosyası okunamadı. Tasarım dosyasının linkini yapıştır.")
    node_id = (parse_qs(parsed.query).get("node-id") or [""])[0].replace("-", ":")
    return file_key, node_id


def load_document(file_key: str, node_id: str) -> tuple[dict, str]:
    if node_id:
        data = figma_get(f"/v1/files/{file_key}/nodes", {"ids": node_id, "depth": 3})
        nodes = data.get("nodes") or {}
        node = (nodes.get(node_id) or {}).get("document")
        if not isinstance(node, dict):
            raise RuntimeError("Linkteki çerçeve bulunamadı. Dosyanın tamamının linkini dene.")
        name = str(data.get("name") or node.get("name") or "Figma dosyası")
        return node, name
    data = figma_get(f"/v1/files/{file_key}", {"depth": 2})
    document = data.get("document")
    if not isinstance(document, dict):
        raise RuntimeError("Figma dosyasının içi okunamadı.")
    return document, str(data.get("name") or "Figma dosyası")


def pick_frames(document: dict, node_id: str) -> list[dict]:
    found: list[dict] = []

    def add(node: dict) -> None:
        if len(found) >= 8 or not node.get("id"):
            return
        info = frame_info(node)
        if any(item["id"] == info["id"] for item in found):
            return
        found.append(info)

    def walk(node: dict) -> None:
        if not isinstance(node, dict) or len(found) >= 8:
            return
        kind = node.get("type")
        if kind in SCREEN_TYPES and screen_sized(node):
            add(node)
            return
        if kind in {"DOCUMENT", "CANVAS", "SECTION", "GROUP"}:
            for child in node.get("children") or []:
                walk(child)

    if node_id and document.get("type") in SCREEN_TYPES and screen_sized(document):
        add(document)
        return found
    walk(document)
    return found


def screen_sized(node: dict) -> bool:
    box = node.get("absoluteBoundingBox") or {}
    width = float(box.get("width") or 0)
    height = float(box.get("height") or 0)
    return 280 <= width <= 520 and height >= 560


def frame_info(node: dict) -> dict:
    return {"id": str(node.get("id")), "name": clip(node.get("name"), 60) or "Ekran"}


def export_images(file_key: str, node_ids: list[str]) -> dict[str, str]:
    data = figma_get(
        f"/v1/images/{file_key}",
        {"ids": ",".join(node_ids), "format": "jpg", "scale": "2"},
    )
    images = data.get("images") or {}
    return {key: value for key, value in images.items() if isinstance(value, str) and value.startswith("http")}


def analyze_screens(file_name: str, frames: list[dict], about: str, notes: str, scopes: list[str]) -> dict:
    lines = [f"{index}. {frame['name']}" for index, frame in enumerate(frames, start=1)]
    focus = ", ".join(scopes) if scopes else "genel tasarım, akış, kullanılabilirlik"
    prompt = (
        f"Dosya: {file_name}\n"
        f"Ekranlar:\n" + "\n".join(lines) + "\n\n"
        f"Ürün notu: {about.strip() or 'Verilmedi. Yalnızca ekranlara bak.'}\n"
        f"Ek not: {notes.strip() or 'Yok'}\n"
        f"Odak: {focus}\n"
        "Her ekranın adını screens içinde aynen kullan.\n"
        "Kısa madde yazma. Her ekranın note alanı en az beş cümle olsun. "
        "summary dört paragraf olsun ve paragraflar boş satırla ayrılsın."
    )
    content: list[dict] = [{"type": "input_text", "text": prompt}]
    for index, frame in enumerate(frames, start=1):
        content.append({"type": "input_text", "text": f"Ekran {index}: {frame['name']}"})
        content.append({"type": "input_image", "image_url": frame["image"]})
    body = openai_post(
        "/v1/responses",
        {
            "model": OPENAI_MODEL,
            "temperature": 0.3,
            "max_output_tokens": 8000,
            "input": [
                {"role": "system", "content": DESIGN_SYSTEM},
                {"role": "user", "content": content},
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "design_review",
                    "strict": True,
                    "schema": DESIGN_SCHEMA,
                }
            },
        },
        timeout=httpx.Timeout(180.0, connect=15.0),
    )
    if body.get("status") == "incomplete":
        raise RuntimeError("Tasarım analizi yarıda kesildi")
    text, _sources = extract_output(body)
    data = extract_json(text)
    if not isinstance(data, dict):
        raise RuntimeError("Tasarım analizi okunamadı")
    scores = data.get("scores") if isinstance(data.get("scores"), dict) else {}
    return {
        "summary": clip_keep(data.get("summary"), 2800),
        "audience": clip_keep(data.get("audience"), 1400),
        "scores": {
            "overall": clamp_score(scores.get("overall"), 0),
            "ux": clamp_score(scores.get("ux"), 0),
            "quality": clamp_score(scores.get("quality"), 0),
            "potential": clamp_score(scores.get("potential"), 0),
        },
        "screens": data.get("screens") if isinstance(data.get("screens"), list) else [],
        "strengths": note_list(data.get("strengths"), 5),
        "improvements": note_list(data.get("improvements"), 5),
        "suggestions": note_list(data.get("suggestions"), 6),
    }


def note_list(value, limit: int) -> list[dict]:
    if not isinstance(value, list):
        return []
    items = []
    for raw in value:
        if not isinstance(raw, dict):
            continue
        title = clip(raw.get("title"), 120)
        detail = clip_keep(raw.get("detail"), 900)
        if not title or not detail:
            continue
        items.append({"title": title, "detail": detail})
        if len(items) == limit:
            break
    return items


def clamp_score(value, default: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default
    return max(0, min(100, number))


def figma_get(path: str, params: dict | None = None) -> dict:
    if not usable(FIGMA_ACCESS_TOKEN):
        raise RuntimeError(TOKEN_HELP)
    try:
        with httpx.Client(timeout=httpx.Timeout(40.0, connect=10.0)) as client:
            response = client.get(
                "https://api.figma.com" + path,
                headers={"X-Figma-Token": FIGMA_ACCESS_TOKEN},
                params=params,
            )
    except httpx.TimeoutException as exc:
        raise TimeoutError("Figma zaman aşımı") from exc
    except httpx.HTTPError as exc:
        log.info("Figma HTTP hatası: %s", exc)
        raise RuntimeError("Figma bağlantısı kurulamadı.") from exc
    if response.status_code == 403:
        raise RuntimeError("Bu Figma dosyasına erişilemedi. Dosyayı gören hesabın anahtarını kullan.")
    if response.status_code == 404:
        raise RuntimeError(
            "Anahtar çalışıyor ama bu Figma hesabı dosyayı göremiyor. "
            "Recents listesindeki Friendly deneme kartını aç ve adres çubuğundaki linki yapıştır."
        )
    if response.status_code >= 400:
        raise RuntimeError(f"Figma isteği başarısız ({response.status_code}).")
    return response.json()
