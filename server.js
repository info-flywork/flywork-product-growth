import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import express from "express";
import cors from "cors";
import { writeBrief, writeProblems, status, runResearch } from "./src/agent.js";
import { summaryAsync } from "./src/costs.js";
import { DATA, STATIC } from "./src/config.js";
import { reviewDesign } from "./src/designReview.js";
import { startDraw } from "./src/figjamClaude.js";
import { loadHistory, saveRun } from "./src/store.js";

const app = express();
const PORT = 3080;

const figjamJobs = new Map();
const pluginFile = { key: "", at: 0 };

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/static", express.static(STATIC, {
  setHeaders(res) {
    res.setHeader("Cache-Control", "no-cache");
  },
}));

app.get("/", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(STATIC, "index.html"));
});

app.get("/favicon.ico", (_req, res) => res.status(204).end());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/config", (_req, res) => res.json(status()));

app.get("/api/costs", async (_req, res, next) => {
  try {
    res.json(await summaryAsync());
  } catch (err) {
    next(err);
  }
});

app.get("/api/history", (_req, res) => res.json({ runs: loadHistory() }));

app.get("/api/latest", (_req, res) => {
  const runs = loadHistory();
  res.json({ run: runs[0] || null });
});

app.post("/api/figjam", (req, res) => {
  const body = req.body || {};
  const href = String(body.url || "").trim();
  if (!href.includes("/board/")) {
    return res.status(400).json({
      detail: "Boş FigJam panosunun linkini yapıştır. Adres figma.com/board olmalı.",
    });
  }
  fs.mkdirSync(DATA, { recursive: true });
  const sections = [];
  for (const item of body.app_sections || []) {
    if (!item || typeof item !== "object") continue;
    const title = String(item.title || "").replace(/\s+/g, " ").trim().slice(0, 80);
    const detail = String(item.detail || "").trim().slice(0, 1400);
    if (title && detail) sections.push({ title, detail });
  }
  if (!String(body.app_concept || "").trim() || sections.length < 6) {
    return res.status(400).json({
      detail: "Akış, analiz sayfasındaki uygulama metninden çizilir. Önce o fikri açıp metnin yazılmasını bekle.",
    });
  }
  const fileKey = figjamFileKey(href);
  if (!fileKey) {
    return res.status(400).json({ detail: "FigJam linkinden pano kimliği okunamadı." });
  }
  const jobId = randomBytes(6).toString("hex");
  const job = {
    id: jobId,
    status: "waiting",
    url: href,
    file_key: fileKey,
    title: String(body.title || "").trim(),
    subtitle: String(body.subtitle || "").trim(),
    score: Number(body.score) || 0,
    app_concept: String(body.app_concept || "").trim().slice(0, 2200),
    app_sections: sections,
    node_ids: [],
    error: "",
    created_at: Date.now() / 1000,
    claimed_at: 0,
  };
  figjamJobs.set(jobId, job);
  fs.writeFileSync(
    path.join(DATA, "figjam-request.json"),
    JSON.stringify(figjamPublic(job), null, 0),
    "utf8",
  );
  startDraw(job, figjamFinish);
  res.json({ id: jobId, status: "waiting" });
});

app.get("/api/figjam/pending", (_req, res) => {
  const now = Date.now() / 1000;
  const waiting = [...figjamJobs.values()].filter(
    (job) => job.status === "waiting" && now - job.created_at < 180,
  );
  if (!waiting.length) return res.json({ pending: false });
  res.json(figjamPublic(waiting[waiting.length - 1]));
});

app.get("/api/figjam/job", (req, res) => {
  const key = String(req.query.file_key || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 32);
  const now = Date.now() / 1000;
  if (key) {
    pluginFile.key = key;
    pluginFile.at = now;
  }
  const waiting = [...figjamJobs.values()].filter(
    (job) =>
      (!key || job.file_key === key) &&
      ["waiting", "drawing"].includes(job.status) &&
      now - job.created_at < 180,
  );
  if (!waiting.length) return res.json({ pending: false });
  const job = waiting[waiting.length - 1];
  if (job.status === "drawing" && now - Number(job.claimed_at || 0) < 25) {
    return res.json({ pending: false });
  }
  job.status = "drawing";
  job.claimed_at = now;
  res.json(figjamPublic(job));
});

app.get("/api/figjam/job/:jobId", (req, res) => {
  const job = figjamJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ detail: "Akış isteği yok." });
  res.json({
    id: job.id,
    status: job.status,
    error: job.error,
    node_ids: job.node_ids,
  });
});

app.post("/api/figjam/job/:jobId", (req, res) => {
  const job = figjamJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ detail: "Akış isteği yok." });
  const body = req.body || {};
  const error = String(body.error || "").trim();
  const nodeIds = Array.isArray(body.node_ids) ? body.node_ids : [];
  if (error) {
    job.status = "error";
    job.error = error.slice(0, 300);
  } else if (nodeIds.length) {
    job.status = "done";
    job.node_ids = nodeIds.slice(0, 40).map((item) => String(item).slice(0, 40));
    job.error = "";
  } else {
    job.status = "error";
    job.error = "FigJam düğüm döndürmedi.";
  }
  res.json({ id: job.id, status: job.status });
});

app.post("/api/design", async (req, res) => {
  try {
    const body = req.body || {};
    const scopes = (body.scopes || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 9);
    const result = await reviewDesign(
      String(body.url || "").trim(),
      String(body.about || ""),
      String(body.notes || ""),
      scopes,
    );
    res.json(result);
  } catch (err) {
    res.status(502).json({ detail: safeError(err) });
  }
});

app.post("/api/brief", async (req, res) => {
  try {
    res.json(await writeBrief(req.body || {}));
  } catch (err) {
    res.status(502).json({ detail: safeError(err) });
  }
});

app.post("/api/problems", async (req, res) => {
  try {
    res.json(await writeProblems(req.body || {}));
  } catch (err) {
    res.status(502).json({ detail: safeError(err) });
  }
});

app.post("/api/research", async (req, res) => {
  const body = req.body || {};
  const productType = String(body.product_type || "").trim();
  const scope = String(body.scope || "").trim();
  const criteria = String(body.criteria || "").replace(/\s+/g, " ").trim();

  if (!["Oyun", "Uygulama"].includes(productType)) {
    return res.status(400).json({ detail: "Geçersiz ürün türü." });
  }
  if (!["auto", "idea"].includes(scope)) {
    return res.status(400).json({ detail: "Geçersiz araştırma kapsamı." });
  }
  if (scope === "idea" && criteria.length < 8) {
    return res.status(400).json({
      detail: "Fikir araştırması için aklındaki fikri birkaç cümleyle yaz.",
    });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send("progress", { step: "plan", message: "Araştırma planı hazırlanıyor" });

  try {
    const result = await runResearch(productType, scope, criteria, (step, message) => {
      console.log(`keşif · ${message}`);
      send("progress", { step, message });
    });
    const saved = saveRun(result);
    send("result", saved);
  } catch (err) {
    const message = safeError(err);
    console.info("Keşif hatası:", message);
    send("error", { message });
  } finally {
    res.end();
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ detail: "Sunucu hatası." });
});

function figjamFinish(jobId, nodeIds, error) {
  const job = figjamJobs.get(jobId);
  if (!job) return;
  if (["done", "error"].includes(job.status)) return;
  if (String(error || "").trim()) {
    job.status = "error";
    job.error = String(error).trim().slice(0, 300);
    job.node_ids = [];
    return;
  }
  if (nodeIds?.length) {
    job.status = "done";
    job.node_ids = nodeIds.slice(0, 40).map((item) => String(item).slice(0, 40));
    job.error = "";
  }
}

function figjamFileKey(url) {
  const match = String(url).match(/\/board\/([A-Za-z0-9]+)/);
  return match ? match[1] : "";
}

function figjamPublic(job) {
  return {
    pending: true,
    id: job.id,
    status: job.status,
    url: job.url,
    file_key: job.file_key,
    title: job.title,
    subtitle: job.subtitle,
    score: job.score,
    app_concept: job.app_concept,
    app_sections: job.app_sections,
  };
}

function safeError(exc) {
  let message = String(exc?.message || exc || "").trim() || "Araştırma tamamlanamadı";
  message = message.replace(/sk-[A-Za-z0-9_\-]+/g, "sk-***");
  message = message.replace(/figd_[A-Za-z0-9_\-]+/g, "figd-***");
  if (exc instanceof Error) return message.slice(0, 500);
  return "Araştırma tamamlanamadı. Biraz sonra tekrar dene.";
}

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Panel: http://127.0.0.1:${PORT}`);
});
