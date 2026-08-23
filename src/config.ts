/**
 * Config management — saves/loads from ~/.cmdc/config.json
 *
 * Uses the user's home directory (cross-platform) so config persists
 * across sessions and is not committed to source control.
 */

import { resolve, join } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";

// ── Config paths ─────────────────────────────────────────────────────
const CONFIG_DIR = join(homedir(), ".cmdc");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

// ── Provider / Model definitions ─────────────────────────────────────

export interface ModelProvider {
  id: string;
  name: string;
  models: { name: string; desc: string }[];
  envKey: string;
  importName: string;
  color: string;
  keyHint: string;
}

export const PROVIDERS: ModelProvider[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    models: [
      { name: "claude-sonnet-4-6", desc: "Best balance of speed & intelligence" },
      { name: "claude-opus-4-6", desc: "Most capable Claude model" },
      { name: "claude-haiku-4-5-20251001", desc: "Fastest & most affordable Claude" },
    ],
    envKey: "ANTHROPIC_API_KEY",
    importName: "ChatAnthropic",
    color: "yellow",
    keyHint: "Get key → https://console.anthropic.com/settings/keys",
  },
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { name: "gpt-5.2", desc: "Best for coding & agentic tasks across industries" },
      { name: "gpt-5-mini", desc: "Faster, cost-efficient version of GPT-5" },
      { name: "gpt-4o", desc: "Multimodal flagship" },
      { name: "gpt-4o-mini", desc: "Small multimodal" },
    ],
    envKey: "OPENAI_API_KEY",
    importName: "ChatOpenAI",
    color: "green",
    keyHint: "Get key → https://platform.openai.com/api-keys",
  },
  {
    id: "google",
    name: "Google Gemini",
    models: [
      { name: "gemini-3-flash", desc: "Stable (Flash)" },
      { name: "gemini-3-pro", desc: "Stable (Pro)" },
      { name: "gemini-2.0-flash", desc: "Stable flash model" },
      { name: "gemini-1.5-flash", desc: "Low latency & efficient" },
    ],
    envKey: "GOOGLE_API_KEY",
    importName: "ChatGoogle",
    color: "blue",
    keyHint: "Get free key → https://aistudio.google.com/app/apikey",
  },
  {
    id: "local",
    name: "Local / Shell",
    models: [
      { name: "terminal-agent", desc: "Execute terminal commands & scripts directly" },
      { name: "mock-runner", desc: "Fast simulated command testing" },
    ],
    envKey: "LOCAL_EXEC_ENABLED",
    importName: "LocalRunner",
    color: "cyan",
    keyHint: "No API key needed — uses local runner",
  },
];

// ── Config interface ─────────────────────────────────────────────────

export interface AppConfig {
  provider: string;
  model: string;
  apiKeys: Record<string, string>;
  mode?: "daemon" | "one-shot";
}

const DEFAULT_CONFIG: AppConfig = {
  provider: "local",
  model: "terminal-agent",
  apiKeys: {
    LOCAL_EXEC_ENABLED: "true",
  },
  mode: "daemon",
};

// ── Read / Write ─────────────────────────────────────────────────────

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function loadConfig(): AppConfig {
  ensureConfigDir();
  if (existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
      return {
        ...DEFAULT_CONFIG,
        ...data,
        apiKeys: {
          ...DEFAULT_CONFIG.apiKeys,
          ...(data.apiKeys || {}),
        },
      };
    } catch {
      // ignore parse error, fallback
    }
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: AppConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

export function getProvider(id: string): ModelProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getActiveProvider(config: AppConfig): ModelProvider {
  return getProvider(config.provider) ?? PROVIDERS[0]!;
}

export function deleteApiKey(config: AppConfig, envKey: string): AppConfig {
  const nextKeys = { ...config.apiKeys };
  delete nextKeys[envKey];
  const nextConfig = { ...config, apiKeys: nextKeys };
  saveConfig(nextConfig);
  return nextConfig;
}
