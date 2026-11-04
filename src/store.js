import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DATA } from "./config.js";

const HISTORY = path.join(DATA, "history.json");

export function loadHistory() {
  if (!fs.existsSync(HISTORY)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveRun(payload) {
  fs.mkdirSync(DATA, { recursive: true });
  const run = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    ...payload,
  };
  const history = [run, ...loadHistory()].slice(0, 20);
  fs.writeFileSync(HISTORY, JSON.stringify(history, null, 2), "utf8");
  return run;
}
