import fs from "node:fs";
import path from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
import { DATA, OPENAI_ADMIN_KEY, OPENAI_API_KEY, usable } from "./config.js";

const LEDGER = path.join(DATA, "openai-usage.json");
const als = new AsyncLocalStorage();

const RATES = {
  "gpt-4o": { input: 2.5, cached: 1.25, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, cached: 0.075, output: 0.6 },
};
const DEFAULT_RATE = RATES["gpt-4o"];
const KINDS = ["Oyun", "Uygulama"];
const MONTHS = ["", "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

let writeQueue = Promise.resolve();

export function usageScope(kind, feature, title, fn) {
  const label = KINDS.includes(kind) ? kind : "Diğer";
  const meta = {
    kind: label,
    feature: String(feature || "OpenAI").replace(/\s+/g, " ").trim().slice(0, 40) || "OpenAI",
    title: String(title || "").replace(/\s+/g, " ").trim().slice(0, 80),
  };
  return als.run(meta, fn);
}

export function recordUsage(model, usage) {
  if (!usage || typeof usage !== "object") return;
  const incoming = asInt(usage.input_tokens ?? usage.prompt_tokens);
  const outgoing = asInt(usage.output_tokens ?? usage.completion_tokens);
  const details = usage.input_tokens_details && typeof usage.input_tokens_details === "object"
    ? usage.input_tokens_details
    : {};
  const cached = asInt(details.cached_tokens);
  if (incoming <= 0 && outgoing <= 0) return;
  const meta = als.getStore() || { kind: "Diğer", feature: "OpenAI", title: "" };
  const entry = {
    at: new Date().toISOString(),
    model: String(model || "gpt-4o").slice(0, 40),
    kind: meta.kind,
    feature: meta.feature,
    title: meta.title,
    input_tokens: incoming,
    cached_tokens: Math.min(cached, incoming),
    output_tokens: outgoing,
  };
  writeQueue = writeQueue.then(() => {
    const rows = read();
    rows.push(entry);
    write(rows.slice(-400));
  }).catch(() => {});
}

const accountCache = { at: 0, payload: null };
const ACCOUNT_TTL = 300;

export function summary() {
  const rows = read();
  const now = new Date();
  const [monthStart, monthEnd, prevStart] = monthBounds(now);
  const monthRows = rows.filter((row) => inSpan(row, monthStart, monthEnd));
  const prevRows = rows.filter((row) => inSpan(row, prevStart, monthStart));
  const days = [];
  let cursor = new Date(monthStart);
  while (dateOnly(cursor) <= dateOnly(now)) {
    const nxt = addDays(cursor, 1);
    days.push({
      day: cursor.getUTCDate(),
      usd: round6(sumUsd(monthRows.filter((row) => inSpan(row, cursor, nxt)))),
    });
    cursor = nxt;
  }
  const monthUsd = round6(days.reduce((sum, item) => sum + item.usd, 0));
  const elapsed = Math.max(1, days.length);
  const monthLength = daysInMonth(now);
  const daily = round6(monthUsd / elapsed);
  const projected = round6(daily * monthLength);
  const prevUsd = round6(sumUsd(prevRows));
  const groups = KINDS.map((kind) => kindGroup(kind, monthRows, prevRows));
  const other = kindGroup("Diğer", monthRows, prevRows);
  if (other.calls) groups.push(other);
  const features = featureGroups(monthRows, monthUsd);
  const monthLines = [...monthRows].reverse().map(publicRow);
  const lines = monthLines.slice(0, 80);
  const tokens = {
    input: monthLines.reduce((s, r) => s + r.input_tokens, 0),
    cached: monthLines.reduce((s, r) => s + r.cached_tokens, 0),
    output: monthLines.reduce((s, r) => s + r.output_tokens, 0),
  };
  const parts = {
    input_usd: round6(monthLines.reduce((s, r) => s + r.input_usd, 0)),
    cached_usd: round6(monthLines.reduce((s, r) => s + r.cached_usd, 0)),
    output_usd: round6(monthLines.reduce((s, r) => s + r.output_usd, 0)),
  };
  const account = accountSync(now, prevStart);
  return {
    currency: "USD",
    model: "gpt-4o",
    rate: { input: 2.5, cached: 1.25, output: 10.0, unit: "1M token" },
    range_label: `1 ${MONTHS[now.getUTCMonth() + 1]} ${now.getUTCFullYear()} – ${now.getUTCDate()} ${MONTHS[now.getUTCMonth() + 1]} ${now.getUTCFullYear()}`,
    total_usd: round6(sumUsd(rows)),
    total_calls: rows.length,
    month_usd: monthUsd,
    month_calls: monthRows.length,
    daily_avg: daily,
    projected_usd: projected,
    change_pct: change(monthUsd, prevUsd),
    days,
    groups,
    features,
    tokens,
    parts,
    lines,
    recent: lines.slice(0, 12),
    account,
    account_note: accountNote(account),
  };
}

export async function summaryAsync() {
  const base = summary();
  const now = new Date();
  const [, , prevStart] = monthBounds(now);
  base.account = await accountAsync(now, prevStart);
  base.account_note = accountNote(base.account);
  return base;
}

function accountNote(account) {
  if (account?.available) {
    return (
      "Üstteki tutar yalnızca bu panele bağlanan OpenAI anahtarının faturası. " +
      "Organizasyondaki diğer proje ve anahtarlar yok. " +
      "Araştırma, akış ve tasarım satırları bu panelin ölçtüğü çağrılar; OpenAI faturası bu üç işi ayrıca etiketlemiyor."
    );
  }
  return "Bu panele bağlanan OpenAI anahtarının faturası okunamadı.";
}

function accountSync(now, prevStart) {
  if (!usable(OPENAI_ADMIN_KEY)) return { available: false };
  if (accountCache.payload && Date.now() / 1000 - accountCache.at < ACCOUNT_TTL) {
    return accountCache.payload;
  }
  return { available: false };
}

async function accountAsync(now, prevStart) {
  if (!usable(OPENAI_ADMIN_KEY)) return { available: false };
  if (accountCache.payload && Date.now() / 1000 - accountCache.at < ACCOUNT_TTL) {
    return accountCache.payload;
  }
  try {
    const payload = await fetchAccount(now, prevStart);
    accountCache.payload = payload;
    accountCache.at = Date.now() / 1000;
    return payload;
  } catch {
    return { available: false };
  }
}

async function fetchAccount(now, prevStart) {
  const agent = await agentKey();
  const [monthStart] = monthBounds(now);
  const daily = await costPage(prevStart, null, agent.id);
  const byLine = await costPage(monthStart, "line_item", agent.id);
  const dayAmounts = bucketTotals(daily);
  const monthDays = [];
  let cursor = new Date(monthStart);
  while (dateOnly(cursor) <= dateOnly(now)) {
    const key = dateOnly(cursor).getTime();
    monthDays.push({ day: cursor.getUTCDate(), usd: round6(dayAmounts.get(key) || 0) });
    cursor = addDays(cursor, 1);
  }
  const monthUsd = round6(monthDays.reduce((s, i) => s + i.usd, 0));
  let prevUsd = 0;
  for (const [day, amount] of dayAmounts) {
    if (dateOnly(prevStart).getTime() <= day && day < dateOnly(monthStart).getTime()) {
      prevUsd += amount;
    }
  }
  prevUsd = round6(prevUsd);
  const elapsed = Math.max(1, monthDays.length);
  const monthLength = daysInMonth(now);
  return {
    available: true,
    key_name: agent.name,
    month_usd: monthUsd,
    previous_usd: prevUsd,
    change_pct: change(monthUsd, prevUsd),
    daily_avg: round6(monthUsd / elapsed),
    projected_usd: round6((monthUsd / elapsed) * monthLength),
    days: monthDays,
    lines: ranked(bucketGroups(byLine, "line_item"), monthUsd),
  };
}

async function agentKey() {
  const suffix = OPENAI_API_KEY.slice(-4);
  if (!usable(OPENAI_API_KEY) || suffix.length < 4) throw new Error("key");
  for (const project of await adminList("/v1/organization/projects")) {
    const projectId = String(project.id || "");
    if (!projectId) continue;
    for (const item of await adminList(`/v1/organization/projects/${projectId}/api_keys`)) {
      const redacted = String(item.redacted_value || "");
      if (redacted.endsWith(suffix) && item.id) {
        const name = String(item.name || "Bu agent").replace(/\s+/g, " ").trim().slice(0, 60);
        return { id: String(item.id), name: name || "Bu agent" };
      }
    }
  }
  throw new Error("key");
}

async function adminList(apiPath) {
  const rows = [];
  let after = "";
  for (let i = 0; i < 8; i += 1) {
    const params = new URLSearchParams({ limit: "100" });
    if (after) params.set("after", after);
    const response = await fetch(`https://api.openai.com${apiPath}?${params}`, {
      headers: { Authorization: `Bearer ${OPENAI_ADMIN_KEY}` },
      signal: AbortSignal.timeout(30000),
    });
    if (response.status >= 400) throw new Error("account");
    const data = await response.json();
    const chunk = Array.isArray(data?.data) ? data.data : [];
    rows.push(...chunk.filter((item) => item && typeof item === "object"));
    if (!data?.has_more || !chunk.length) break;
    after = String(data.last_id || chunk[chunk.length - 1]?.id || "");
    if (!after) break;
  }
  return rows;
}

async function costPage(start, group, apiKeyId) {
  const params = new URLSearchParams({
    start_time: String(Math.floor(start.getTime() / 1000)),
    bucket_width: "1d",
    limit: "62",
    api_key_ids: apiKeyId,
  });
  if (group) params.set("group_by", group);
  const response = await fetch(`https://api.openai.com/v1/organization/costs?${params}`, {
    headers: { Authorization: `Bearer ${OPENAI_ADMIN_KEY}` },
    signal: AbortSignal.timeout(30000),
  });
  if (response.status >= 400) throw new Error("account");
  const data = await response.json();
  return Array.isArray(data?.data) ? data.data : [];
}

function bucketTotals(buckets) {
  const totals = new Map();
  for (const bucket of buckets || []) {
    const stamp = bucketDay(bucket);
    if (stamp == null) continue;
    totals.set(stamp, (totals.get(stamp) || 0) + bucketAmount(bucket));
  }
  return totals;
}

function bucketGroups(buckets, field) {
  const groups = {};
  for (const bucket of buckets || []) {
    for (const result of bucket.results || []) {
      if (!result || typeof result !== "object") continue;
      const name = String(result[field] || result.project_id || "Diğer").trim() || "Diğer";
      groups[name] = (groups[name] || 0) + amountOf(result);
    }
  }
  return groups;
}

function ranked(groups, total) {
  return Object.entries(groups)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([name, amount]) => ({
      name: name.slice(0, 80),
      usd: round6(amount),
      share: total ? round1((amount / total) * 100) : 0,
    }));
}

function bucketDay(bucket) {
  try {
    return dateOnly(new Date(Number(bucket.start_time) * 1000)).getTime();
  } catch {
    return null;
  }
}

function bucketAmount(bucket) {
  return (bucket.results || [])
    .filter((result) => result && typeof result === "object")
    .reduce((sum, result) => sum + amountOf(result), 0);
}

function amountOf(result) {
  const amount = result.amount;
  if (amount && typeof amount === "object") {
    const value = Number(amount.value || 0);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }
  return 0;
}

function kindGroup(kind, monthRows, prevRows) {
  const picked = monthRows.filter((row) => row.kind === kind);
  const earlier = prevRows.filter((row) => row.kind === kind);
  const calls = picked.map(publicRow);
  const amount = round6(calls.reduce((s, row) => s + row.usd, 0));
  return {
    kind,
    calls: calls.length,
    input_tokens: calls.reduce((s, r) => s + r.input_tokens, 0),
    cached_tokens: calls.reduce((s, r) => s + r.cached_tokens, 0),
    output_tokens: calls.reduce((s, r) => s + r.output_tokens, 0),
    input_usd: round6(calls.reduce((s, r) => s + r.input_usd, 0)),
    cached_usd: round6(calls.reduce((s, r) => s + r.cached_usd, 0)),
    output_usd: round6(calls.reduce((s, r) => s + r.output_usd, 0)),
    usd: amount,
    change_pct: change(amount, round6(sumUsd(earlier))),
  };
}

function featureGroups(rows, total) {
  const names = ["Araştırma", "Ürün metni", "Sorun dosyası", "Tasarım inceleme"];
  const seen = [];
  for (const row of rows) {
    const name = String(row.feature || "OpenAI");
    if (!names.includes(name) && !seen.includes(name)) seen.push(name);
  }
  const items = [];
  for (const name of [...names, ...seen]) {
    const picked = rows.filter((row) => String(row.feature || "") === name);
    if (!names.includes(name) && !picked.length) continue;
    const amount = round6(sumUsd(picked));
    items.push({
      name,
      usd: amount,
      share: total ? round1((amount / total) * 100) : 0,
    });
  }
  return items;
}

function sumUsd(rows) {
  let total = 0;
  for (const row of rows) {
    const incoming = asInt(row.input_tokens);
    const cached = Math.min(asInt(row.cached_tokens), incoming);
    total += price(String(row.model || ""), incoming, cached, asInt(row.output_tokens));
  }
  return total;
}

function change(current, previous) {
  if (previous <= 0) return null;
  return round1(((current - previous) / previous) * 100);
}

function monthBounds(now) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return [start, end, prev];
}

function inSpan(row, start, end) {
  const stamp = stampOf(row);
  return Boolean(stamp && stamp >= start && stamp < end);
}

function stampOf(row) {
  try {
    const stamp = new Date(String(row.at || ""));
    return Number.isNaN(stamp.getTime()) ? null : stamp;
  } catch {
    return null;
  }
}

function publicRow(row) {
  const incoming = asInt(row.input_tokens);
  const cached = Math.min(asInt(row.cached_tokens), incoming);
  const outgoing = asInt(row.output_tokens);
  const model = String(row.model || "");
  const parts = partsOf(model, incoming, cached, outgoing);
  return {
    at: String(row.at || ""),
    kind: String(row.kind || ""),
    feature: String(row.feature || ""),
    title: String(row.title || ""),
    model,
    input_tokens: incoming,
    cached_tokens: cached,
    output_tokens: outgoing,
    input_usd: parts.input_usd,
    cached_usd: parts.cached_usd,
    output_usd: parts.output_usd,
    usd: round6(parts.input_usd + parts.cached_usd + parts.output_usd),
  };
}

function partsOf(model, incoming, cached, outgoing) {
  const rate = RATES[model] || DEFAULT_RATE;
  const fresh = Math.max(0, incoming - cached);
  return {
    input_usd: round6((fresh * rate.input) / 1_000_000),
    cached_usd: round6((cached * rate.cached) / 1_000_000),
    output_usd: round6((outgoing * rate.output) / 1_000_000),
  };
}

function price(model, incoming, cached, outgoing) {
  const parts = partsOf(model, incoming, cached, outgoing);
  return parts.input_usd + parts.cached_usd + parts.output_usd;
}

function asInt(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function read() {
  if (!fs.existsSync(LEDGER)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function write(rows) {
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.writeFileSync(LEDGER, JSON.stringify(rows), "utf8");
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function dateOnly(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d, n) {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + n);
  return next;
}

function daysInMonth(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}
