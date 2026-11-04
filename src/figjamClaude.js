import { execFile, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { ANTHROPIC_API_KEY, CLAUDE_MODEL, FIGMA_MCP_TOKEN, ROOT, usable } from "./config.js";

const execFileAsync = promisify(execFile);

const QUOTA_MARKERS = [
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
];

function claudeBin() {
  try {
    const which = execFileSync("which", ["claude"], { encoding: "utf8" }).trim();
    if (which) return which;
  } catch {
    /* ignore */
  }
  const home = path.join(os.homedir(), ".local", "bin", "claude");
  return existsSync(home) ? home : "";
}

export function teamReady() {
  const binary = claudeBin();
  if (!binary) return false;
  const env = { ...process.env };
  const localBin = path.join(os.homedir(), ".local", "bin");
  env.PATH = `${localBin}${path.delimiter}${env.PATH || ""}`;
  delete env.ANTHROPIC_API_KEY;
  try {
    const raw = execFileSync(binary, ["auth", "status"], {
      encoding: "utf8",
      timeout: 12000,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    try {
      const data = JSON.parse(raw);
      if (!data.loggedIn) return false;
      const kind = String(data.subscriptionType || "").toLowerCase();
      const method = String(data.authMethod || "").toLowerCase();
      if (["team", "pro", "max", "enterprise"].includes(kind)) return true;
      return ["claude.ai", "oauth"].includes(method) && Boolean(data.email || data.orgId);
    } catch {
      return raw.includes("loggedIn") && raw.toLowerCase().includes("true");
    }
  } catch {
    return false;
  }
}

export function apiReady() {
  return usable(ANTHROPIC_API_KEY) && usable(FIGMA_MCP_TOKEN);
}

export function drawStatus() {
  return {
    claude_team: teamReady(),
    claude_api: usable(ANTHROPIC_API_KEY),
    figma_mcp: usable(FIGMA_MCP_TOKEN),
    claude_model: CLAUDE_MODEL,
  };
}

export function startDraw(job, finish) {
  setImmediate(() => {
    runDraw(job, finish).catch((err) => {
      finish(String(job?.id || ""), [], clip(String(err?.message || err || "Claude çizimi olmadı."), 280));
    });
  });
}

async function runDraw(job, finish) {
  const jobId = String(job?.id || "");
  const errors = [];
  try {
    if (teamReady()) {
      try {
        const nodeIds = await drawViaTeam(job);
        finish(jobId, nodeIds, "");
        return;
      } catch (err) {
        const message = String(err?.message || err || "Claude Team çizemedi.").trim();
        if (err?.name === "QuotaError" || looksLikeQuota(message)) {
          errors.push(message);
          console.info("Claude Team kotası bitti, API keye geçiliyor:", message);
        } else {
          errors.push(message);
          console.warn("Claude Team çizimi olmadı:", message);
        }
      }
    }
    if (apiReady()) {
      try {
        const nodeIds = await drawViaApi(job);
        finish(jobId, nodeIds, "");
        return;
      } catch (err) {
        errors.push(String(err?.message || err || "Claude API çizemedi.").trim());
        console.warn("Claude API çizimi olmadı:", err);
      }
    }
    if (!teamReady() && !usable(ANTHROPIC_API_KEY)) return;
    if (usable(ANTHROPIC_API_KEY) && !usable(FIGMA_MCP_TOKEN) && !teamReady()) {
      finish(
        jobId,
        [],
        "Claude API için FIGMA_MCP_TOKEN gerekli. Terminalde `claude mcp login figma` çalıştır.",
      );
      return;
    }
    if (errors.length) {
      const joined = clip(errors.join("; "), 280);
      if (
        joined.toLowerCase().includes("authentication") ||
        joined.toLowerCase().includes("needs authentication") ||
        joined.toLowerCase().includes("mcp")
      ) {
        finish(
          jobId,
          [],
          "Claude Figma MCP oturumu yok. Terminalde `claude mcp login figma` çalıştırıp yeşil düğmeye tekrar bas.",
        );
        return;
      }
      finish(jobId, [], joined);
    }
  } catch (err) {
    finish(jobId, [], clip(String(err?.message || err || "Claude çizimi olmadı."), 280));
  }
}

function looksLikeQuota(text) {
  const lowered = String(text || "").toLowerCase();
  return QUOTA_MARKERS.some((marker) => lowered.includes(marker));
}

function drawPrompt(job) {
  const sections = job.app_sections || [];
  const lines = [];
  for (let index = 0; index < Math.min(sections.length, 8); index += 1) {
    const item = sections[index];
    const title = String(item?.title || `Adım ${index + 1}`).trim();
    const detail = String(item?.detail || "").trim();
    lines.push(`${index + 1}. ${title}\n${detail}`);
  }
  const body = lines.join("\n\n");
  const title = String(job.title || "Akış").trim();
  const concept = String(job.app_concept || "").trim();
  const url = String(job.url || "").trim();
  const fileKey = String(job.file_key || "").trim();
  return `FigJam panosuna ürün akışı çiz.

Pano URL: ${url}
fileKey: ${fileKey}
Ürün: ${title}
Kavram: ${concept}

Adımlar:
${body}

Kurallar:
- Bu FigJam board dosyasına çiz (\`figma.com/board/...\`). Yeni boş dosya açma.
- Mevcut içeriğin sağına yeni bir section koy. Section adı "${title} akışı" olsun.
- Her adım için shape-with-text kartı oluştur; metin başlık + detay olsun.
- Kartları 4 sütunlu akış gibi bağla (elbow connector).
- Figma MCP araçlarını kullan (\`use_figma\` veya generate_diagram + board bağlamı).
- Bitince yalnız şu JSON satırını yaz, başka açıklama ekleme:
{"node_ids":["id1","id2"],"error":""}
- Çizemezsen: {"node_ids":[],"error":"kısa neden"}
`;
}

async function drawViaTeam(job) {
  const prompt = drawPrompt(job);
  const binary = claudeBin();
  if (!binary) throw new Error("Claude Code bulunamadı.");
  const env = { ...process.env };
  const localBin = path.join(os.homedir(), ".local", "bin");
  env.PATH = `${localBin}${path.delimiter}${env.PATH || ""}`;
  delete env.ANTHROPIC_API_KEY;
  let stdout = "";
  let stderr = "";
  let code = 0;
  try {
    const result = await execFileAsync(
      binary,
      ["-p", prompt, "--output-format", "text", "--dangerously-skip-permissions"],
      { timeout: 240000, env, cwd: ROOT, maxBuffer: 10 * 1024 * 1024 },
    );
    stdout = result.stdout || "";
    stderr = result.stderr || "";
  } catch (err) {
    if (err?.killed || err?.signal === "SIGTERM") {
      throw new Error("Claude Team çizimi zaman aşımına uğradı.");
    }
    stdout = err?.stdout || "";
    stderr = err?.stderr || "";
    code = err?.code || 1;
    const output = `${stdout}\n${stderr}`.trim();
    if (looksLikeQuota(output)) {
      const quotaErr = new Error(clip(output, 240) || "Claude Team kotası bitti.");
      quotaErr.name = "QuotaError";
      throw quotaErr;
    }
    throw new Error(clip(output, 240) || `Claude Team çıkış kodu ${code}.`);
  }
  const output = `${stdout}\n${stderr}`.trim();
  if (code !== 0) {
    if (looksLikeQuota(output)) {
      const quotaErr = new Error(clip(output, 240) || "Claude Team kotası bitti.");
      quotaErr.name = "QuotaError";
      throw quotaErr;
    }
    throw new Error(clip(output, 240) || `Claude Team çıkış kodu ${code}.`);
  }
  if (looksLikeQuota(output)) {
    const quotaErr = new Error(clip(output, 240) || "Claude Team kotası bitti.");
    quotaErr.name = "QuotaError";
    throw quotaErr;
  }
  return parseNodeIds(output);
}

async function drawViaApi(job) {
  const prompt = drawPrompt(job);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "mcp-client-2025-11-20",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      mcp_servers: [
        {
          type: "url",
          url: "https://mcp.figma.com/mcp",
          name: "figma",
          authorization_token: FIGMA_MCP_TOKEN,
        },
      ],
      tools: [{ type: "mcp_toolset", mcp_server_name: "figma" }],
    }),
    signal: AbortSignal.timeout(240000),
  });
  const text = await response.text();
  if (response.status === 429 || looksLikeQuota(text)) {
    throw new Error(clip(text, 240) || "Claude API kotası bitti.");
  }
  if (response.status >= 400) {
    throw new Error(clip(text, 240) || `Claude API ${response.status}.`);
  }
  const data = JSON.parse(text);
  const parts = [];
  for (const block of data.content || []) {
    if (block && typeof block === "object" && block.type === "text") {
      parts.push(String(block.text || ""));
    }
  }
  return parseNodeIds(parts.join("\n"));
}

function parseNodeIds(text) {
  const matches = String(text || "").match(/\{[^{}]*"node_ids"[^{}]*\}/gs) || [];
  for (const raw of [...matches].reverse()) {
    try {
      const data = JSON.parse(raw);
      if (data.error) throw new Error(String(data.error));
      const ids = data.node_ids || [];
      if (Array.isArray(ids) && ids.length) {
        return ids.slice(0, 40).map((item) => String(item).slice(0, 40));
      }
    } catch (err) {
      if (err instanceof SyntaxError) continue;
      throw err;
    }
  }
  const loose = String(text || "").match(/\b\d+:\d+\b/g);
  if (loose?.length) return loose.slice(0, 40);
  throw new Error("Claude panoya düğüm id'si döndürmedi.");
}

function clip(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}
