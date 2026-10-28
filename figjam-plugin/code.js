const PANEL = "http://localhost:8787";
let busy = false;

figma.showUI(__html__, { width: 300, height: 110, visible: true });
say("Pano dinleniyor. Yeşil düğme kartları buraya yazar.");
setInterval(pull, 1200);
pull();

function say(text) {
  figma.ui.postMessage({ text });
}

async function pull() {
  if (busy) return;
  const fileKey = figma.fileKey || "";
  const query = fileKey ? `?file_key=${encodeURIComponent(fileKey)}` : "";
  let job = null;
  try {
    const response = await fetch(`${PANEL}/api/figjam/job${query}`);
    if (!response.ok) throw new Error("Panel yanıt vermedi.");
    job = await response.json();
  } catch (err) {
    say("Panele ulaşılamadı. Flywork paneli 8787 portunda açık olmalı.");
    return;
  }
  if (!job || !job.pending || !job.id) {
    say("Pano dinleniyor. Yeşil düğme kartları buraya yazar.");
    return;
  }
  busy = true;
  say(`${job.title || "Akış"} çiziliyor.`);
  try {
    const nodeIds = await drawFlow(job);
    await fetch(`${PANEL}/api/figjam/job/${job.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ node_ids: nodeIds }),
    });
    say(`${job.title || "Akış"} panoya çizildi.`);
  } catch (err) {
    const message = err && err.message ? err.message : "Çizim olmadı.";
    await fetch(`${PANEL}/api/figjam/job/${job.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: message.slice(0, 280) }),
    }).catch(() => {});
    say(message);
  } finally {
    busy = false;
  }
}

async function drawFlow(job) {
  const font = await loadInter();
  const sections = Array.isArray(job.app_sections) ? job.app_sections.slice(0, 8) : [];
  const section = figma.createSection();
  section.name = `${job.title || "Akış"} akışı`;
  let origin = 120;
  for (const child of figma.currentPage.children) {
    origin = Math.max(origin, child.x + child.width + 180);
  }
  section.x = origin;
  section.y = 120;

  const intro = figma.createText();
  intro.fontName = font;
  intro.fontSize = 16;
  intro.characters = clip(`${job.title || ""}\n\n${job.app_concept || ""}`, 700);
  intro.textAutoResize = "HEIGHT";
  intro.resize(1360, intro.height);
  section.appendChild(intro);
  intro.x = 24;
  intro.y = 24;

  const cards = [];
  for (const item of sections) {
    const shape = figma.createShapeWithText();
    shape.name = clip(item.title || "Adım", 80);
    const textFont = shape.text.fontName;
    await figma.loadFontAsync(textFont);
    shape.text.fontSize = 14;
    const body = `${clip(item.title || "Adım", 80)}\n\n${clip(item.detail || "", 900)}`;
    shape.text.characters = body;
    const breaks = (body.match(/\n/g) || []).length;
    const lines = Math.ceil(body.length / 38) + breaks;
    shape.resize(320, Math.min(620, Math.max(140, lines * 18 + 28)));
    section.appendChild(shape);
    cards.push(shape);
  }

  const columns = 4;
  const gapX = 20;
  const gapY = 28;
  let cursorY = intro.y + intro.height + 28;
  for (let row = 0; row < Math.ceil(cards.length / columns); row += 1) {
    const slice = cards.slice(row * columns, row * columns + columns);
    const rowHeight = Math.max(...slice.map((card) => card.height));
    slice.forEach((card, index) => {
      card.x = 24 + index * (320 + gapX);
      card.y = cursorY;
    });
    cursorY += rowHeight + gapY;
  }

  const ids = [section.id, intro.id];
  for (let index = 0; index < cards.length; index += 1) {
    ids.push(cards[index].id);
    if (index === cards.length - 1) continue;
    const sameRow = Math.floor(index / columns) === Math.floor((index + 1) / columns);
    const connector = figma.createConnector();
    connector.connectorLineType = "ELBOWED";
    connector.connectorStart = { endpointNodeId: cards[index].id, magnet: sameRow ? "RIGHT" : "BOTTOM" };
    connector.connectorEnd = { endpointNodeId: cards[index + 1].id, magnet: sameRow ? "LEFT" : "TOP" };
    section.appendChild(connector);
    ids.push(connector.id);
  }

  let maxX = intro.x + intro.width;
  let maxY = intro.y + intro.height;
  for (const card of cards) {
    maxX = Math.max(maxX, card.x + card.width);
    maxY = Math.max(maxY, card.y + card.height);
  }
  section.resizeWithoutConstraints(maxX + 32, maxY + 32);
  figma.viewport.scrollAndZoomIntoView([section]);
  return ids;
}

async function loadInter() {
  const options = [
    { family: "Inter", style: "Medium" },
    { family: "Inter", style: "Regular" },
  ];
  for (const font of options) {
    try {
      await figma.loadFontAsync(font);
      return font;
    } catch (err) {
      /* sonraki yazı tipi */
    }
  }
  const fonts = await figma.listAvailableFontsAsync();
  const found = fonts.find((item) => item.fontName.family === "Inter") || fonts[0];
  if (!found) throw new Error("Yazı tipi yok.");
  await figma.loadFontAsync(found.fontName);
  return found.fontName;
}

function clip(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}
