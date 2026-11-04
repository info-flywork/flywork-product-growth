import { clip, clipKeep, extractJson, extractOutput, openaiPost } from "./agent.js";
import { FIGMA_ACCESS_TOKEN, OPENAI_MODEL, usable } from "./config.js";
import { usageScope } from "./costs.js";

const TOKEN_HELP =
  "Figma dosyasını okumak için bir kez anahtar gerekiyor. " +
  "Figma → Settings → Security → Personal access tokens bölümünden anahtar oluştur, " +
  ".env içine FIGMA_ACCESS_TOKEN= yazıp paneli yeniden başlat. " +
  "Analiz ekranında yalnızca dosya linkini yapıştırman yeterli.";

const SCREEN_TYPES = new Set(["FRAME", "COMPONENT"]);

const NOTE_ITEM = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    detail: { type: "string" },
  },
  required: ["title", "detail"],
};

const DESIGN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    audience: { type: "string" },
    scores: {
      type: "object",
      additionalProperties: false,
      properties: {
        overall: { type: "integer" },
        ux: { type: "integer" },
        quality: { type: "integer" },
        potential: { type: "integer" },
      },
      required: ["overall", "ux", "quality", "potential"],
    },
    screens: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          score: { type: "integer" },
          note: { type: "string" },
        },
        required: ["name", "score", "note"],
      },
    },
    strengths: { type: "array", items: NOTE_ITEM },
    improvements: { type: "array", items: NOTE_ITEM },
    suggestions: { type: "array", items: NOTE_ITEM },
  },
  required: ["summary", "audience", "scores", "screens", "strengths", "improvements", "suggestions"],
};

const DESIGN_SYSTEM = `Sen Flywork Product Studio için mobil arayüz eleştirmenisin.
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
Genel övgü ve madde doldurmak için tekrar yazma.`;

export async function reviewDesign(url, about, notes, scopes) {
  const [fileKey, nodeId] = parseFigmaUrl(url);
  if (!usable(FIGMA_ACCESS_TOKEN)) throw new Error(TOKEN_HELP);
  const [document, fileName] = await loadDocument(fileKey, nodeId);
  const frames = pickFrames(document, nodeId);
  if (!frames.length) throw new Error("Dosyada okunacak ekran çerçevesi yok.");
  const images = await exportImages(fileKey, frames.map((frame) => frame.id));
  const ready = [];
  for (const frame of frames) {
    const image = images[frame.id];
    if (image) ready.push({ ...frame, image });
  }
  if (!ready.length) throw new Error("Figma ekran görüntüsü döndürmedi.");
  const kind = `${about} ${notes}`.toLocaleLowerCase("tr").includes("oyun") ? "Oyun" : "Uygulama";
  const analysis = await usageScope(kind, "Tasarım inceleme", about || fileName, () =>
    analyzeScreens(fileName, ready, about, notes, scopes),
  );
  const unused = ready.map((frame) => frame.image);
  const screens = [];
  for (const item of (analysis.screens || []).slice(0, 8)) {
    if (!item || typeof item !== "object") continue;
    const name = clip(item.name, 60);
    if (!name) continue;
    let image = "";
    for (const frame of ready) {
      if (frame.name === name && unused.includes(frame.image)) {
        image = frame.image;
        unused.splice(unused.indexOf(image), 1);
        break;
      }
    }
    if (!image && unused.length) image = unused.shift();
    screens.push({
      name,
      score: clampScore(item.score, 0),
      note: clipKeep(item.note, 1400),
      image,
    });
  }
  if (!screens.length) throw new Error("Ekranlar okundu ama analiz yazılamadı.");
  return {
    file_name: fileName,
    screen_count: screens.length,
    summary: analysis.summary,
    audience: analysis.audience,
    scores: analysis.scores,
    screens,
    strengths: analysis.strengths,
    improvements: analysis.improvements,
    suggestions: analysis.suggestions,
  };
}

function parseFigmaUrl(url) {
  let parsed;
  try {
    parsed = new URL(String(url || "").trim());
  } catch {
    throw new Error("Figma dosyasının bağlantısını yapıştır. Adres figma.com ile başlamalı.");
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (
    host !== "figma.com" &&
    host !== "figjam.com" &&
    !host.endsWith(".figma.com") &&
    !host.endsWith(".figjam.com")
  ) {
    throw new Error("Figma dosyasının bağlantısını yapıştır. Adres figma.com ile başlamalı.");
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  let fileKey = "";
  for (const marker of ["design", "file", "proto", "board"]) {
    const index = parts.indexOf(marker);
    if (index >= 0 && index + 1 < parts.length) {
      fileKey = parts[index + 1];
      break;
    }
  }
  if (fileKey.length < 10) {
    throw new Error("Bağlantıdan Figma dosyası okunamadı. Tasarım dosyasının linkini yapıştır.");
  }
  const nodeId = (parsed.searchParams.get("node-id") || "").replace(/-/g, ":");
  return [fileKey, nodeId];
}

async function loadDocument(fileKey, nodeId) {
  if (nodeId) {
    const data = await figmaGet(`/v1/files/${fileKey}/nodes`, { ids: nodeId, depth: "3" });
    const nodes = data.nodes || {};
    const node = nodes[nodeId]?.document;
    if (!node || typeof node !== "object") {
      throw new Error("Linkteki çerçeve bulunamadı. Dosyanın tamamının linkini dene.");
    }
    const name = String(data.name || node.name || "Figma dosyası");
    return [node, name];
  }
  const data = await figmaGet(`/v1/files/${fileKey}`, { depth: "2" });
  const document = data.document;
  if (!document || typeof document !== "object") {
    throw new Error("Figma dosyasının içi okunamadı.");
  }
  return [document, String(data.name || "Figma dosyası")];
}

function pickFrames(document, nodeId) {
  const found = [];

  function add(node) {
    if (found.length >= 8 || !node.id) return;
    const info = frameInfo(node);
    if (found.some((item) => item.id === info.id)) return;
    found.push(info);
  }

  function walk(node) {
    if (!node || typeof node !== "object" || found.length >= 8) return;
    const kind = node.type;
    if (SCREEN_TYPES.has(kind) && screenSized(node)) {
      add(node);
      return;
    }
    if (["DOCUMENT", "CANVAS", "SECTION", "GROUP"].includes(kind)) {
      for (const child of node.children || []) walk(child);
    }
  }

  if (nodeId && SCREEN_TYPES.has(document.type) && screenSized(document)) {
    add(document);
    return found;
  }
  walk(document);
  return found;
}

function screenSized(node) {
  const box = node.absoluteBoundingBox || {};
  const width = Number(box.width || 0);
  const height = Number(box.height || 0);
  return width >= 280 && width <= 520 && height >= 560;
}

function frameInfo(node) {
  return { id: String(node.id), name: clip(node.name, 60) || "Ekran" };
}

async function exportImages(fileKey, nodeIds) {
  const data = await figmaGet(`/v1/images/${fileKey}`, {
    ids: nodeIds.join(","),
    format: "jpg",
    scale: "2",
  });
  const images = data.images || {};
  const result = {};
  for (const [key, value] of Object.entries(images)) {
    if (typeof value === "string" && value.startsWith("http")) result[key] = value;
  }
  return result;
}

async function analyzeScreens(fileName, frames, about, notes, scopes) {
  const lines = frames.map((frame, index) => `${index + 1}. ${frame.name}`);
  const focus = scopes?.length ? scopes.join(", ") : "genel tasarım, akış, kullanılabilirlik";
  const prompt =
    `Dosya: ${fileName}\n` +
    `Ekranlar:\n${lines.join("\n")}\n\n` +
    `Ürün notu: ${String(about || "").trim() || "Verilmedi. Yalnızca ekranlara bak."}\n` +
    `Ek not: ${String(notes || "").trim() || "Yok"}\n` +
    `Odak: ${focus}\n` +
    "Her ekranın adını screens içinde aynen kullan.\n" +
    "Kısa madde yazma. Her ekranın note alanı en az beş cümle olsun. " +
    "summary dört paragraf olsun ve paragraflar boş satırla ayrılsın.";
  const content = [{ type: "input_text", text: prompt }];
  frames.forEach((frame, index) => {
    content.push({ type: "input_text", text: `Ekran ${index + 1}: ${frame.name}` });
    content.push({ type: "input_image", image_url: frame.image });
  });
  const body = await openaiPost(
    "/v1/responses",
    {
      model: OPENAI_MODEL,
      temperature: 0.3,
      max_output_tokens: 8000,
      input: [
        { role: "system", content: DESIGN_SYSTEM },
        { role: "user", content },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "design_review",
          strict: true,
          schema: DESIGN_SCHEMA,
        },
      },
    },
    180000,
  );
  if (body.status === "incomplete") throw new Error("Tasarım analizi yarıda kesildi");
  const [text] = extractOutput(body);
  const data = extractJson(text);
  if (!data || typeof data !== "object") throw new Error("Tasarım analizi okunamadı");
  const scores = data.scores && typeof data.scores === "object" ? data.scores : {};
  return {
    summary: clipKeep(data.summary, 2800),
    audience: clipKeep(data.audience, 1400),
    scores: {
      overall: clampScore(scores.overall, 0),
      ux: clampScore(scores.ux, 0),
      quality: clampScore(scores.quality, 0),
      potential: clampScore(scores.potential, 0),
    },
    screens: Array.isArray(data.screens) ? data.screens : [],
    strengths: noteList(data.strengths, 5),
    improvements: noteList(data.improvements, 5),
    suggestions: noteList(data.suggestions, 6),
  };
}

function noteList(value, limit) {
  if (!Array.isArray(value)) return [];
  const items = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const title = clip(raw.title, 120);
    const detail = clipKeep(raw.detail, 900);
    if (!title || !detail) continue;
    items.push({ title, detail });
    if (items.length === limit) break;
  }
  return items;
}

function clampScore(value, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, number));
}

async function figmaGet(apiPath, params = null) {
  if (!usable(FIGMA_ACCESS_TOKEN)) throw new Error(TOKEN_HELP);
  const url = new URL(`https://api.figma.com${apiPath}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }
  let response;
  try {
    response = await fetch(url, {
      headers: { "X-Figma-Token": FIGMA_ACCESS_TOKEN },
      signal: AbortSignal.timeout(40000),
    });
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new Error("Figma zaman aşımı");
    }
    console.info("Figma HTTP hatası:", err?.message || err);
    throw new Error("Figma bağlantısı kurulamadı.");
  }
  if (response.status === 403) {
    throw new Error("Bu Figma dosyasına erişilemedi. Dosyayı gören hesabın anahtarını kullan.");
  }
  if (response.status === 404) {
    throw new Error(
      "Anahtar çalışıyor ama bu Figma hesabı dosyayı göremiyor. " +
        "Recents listesindeki Friendly deneme kartını aç ve adres çubuğundaki linki yapıştır.",
    );
  }
  if (response.status >= 400) {
    throw new Error(`Figma isteği başarısız (${response.status}).`);
  }
  return response.json();
}
