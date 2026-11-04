import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(ROOT, ".env") });

function clean(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

export const OPENAI_API_KEY = clean(process.env.OPENAI_API_KEY);
export const OPENAI_ADMIN_KEY = clean(process.env.OPENAI_ADMIN_KEY);
export const ANTHROPIC_API_KEY = clean(process.env.ANTHROPIC_API_KEY);
export const CLAUDE_MODEL = clean(process.env.CLAUDE_MODEL) || "claude-sonnet-4-5";
export const TAVILY_API_KEY = clean(process.env.TAVILY_API_KEY);
export const FIRECRAWL_API_KEY = clean(process.env.FIRECRAWL_API_KEY);
export const FIGMA_ACCESS_TOKEN = clean(process.env.FIGMA_ACCESS_TOKEN);
export const FIGMA_MCP_TOKEN = clean(process.env.FIGMA_MCP_TOKEN);
export const OPENAI_MODEL = clean(process.env.OPENAI_MODEL) || "gpt-4o";
export const STATIC = path.join(ROOT, "static");
export const DATA = path.join(ROOT, "data");

export function usable(value) {
  if (!value || value.length < 20 || value.includes("...")) return false;
  return true;
}
