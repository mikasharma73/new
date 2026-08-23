#!/usr/bin/env node

/**
 * cmdc — React terminal UI powered by Commander and Ink
 */

import { Command } from "commander";
import { render } from "ink";
import App from "./app.tsx";
import { loadConfig, getConfigPath, getProvider } from "./config.ts";
import { VERSION, APP_NAME } from "./constants.ts";
import type { OnboardingStage } from "./types.ts";

const program = new Command();

program
  .name(APP_NAME)
  .description("Interactive terminal interface powered by React, Ink, and Commander")
  .version(VERSION, "-v, --version", "Output the current version");

function launchApp(options: {
  prompt?: string;
  isDaemon?: boolean;
  initialStage?: OnboardingStage;
}) {
  const { prompt, isDaemon = true, initialStage } = options;

  console.clear();

  const instance = render(
    <App
      prompt={prompt}
      mode={isDaemon ? "daemon" : "one-shot"}
      initialStage={initialStage}
    />,
  );

  const exit = () => {
    instance.unmount();
    process.exit(0);
  };

  process.on("SIGINT", exit);
  process.on("SIGTERM", exit);

  if (process.stdin.isTTY) {
    const onRawData = (data: Buffer | string): void => {
      const str = Buffer.isBuffer(data) ? data.toString("utf8") : data;
      if (str === "\u0003") {
        exit();
      }
    };
    process.stdin.on("data", onRawData);
  }

  process.once("exit", () => {
    instance.unmount();
  });
}

// ── Setup command ────────────────────────────────────────────────────
program
  .command("setup")
  .description("Run the interactive model and credentials setup")
  .action(() => {
    launchApp({ isDaemon: true, initialStage: "pick-provider" });
  });

// ── Config command ───────────────────────────────────────────────────
program
  .command("config")
  .description("Display the current configuration and paths")
  .action(() => {
    const cfg = loadConfig();
    const prov = getProvider(cfg.provider);
    console.log(`\n  ⚙️  ${APP_NAME} configuration:`);
    console.log(`  - Provider: ${prov?.name ?? cfg.provider}`);
    console.log(`  - Model:    ${cfg.model}`);
    console.log(`  - Config:   ${getConfigPath()}\n`);
    process.exit(0);
  });

// ── Run command ──────────────────────────────────────────────────────
program
  .command("run [prompt...]")
  .description("Execute a single instruction or command prompt")
  .action((promptParts: string[]) => {
    const prompt = promptParts.join(" ").trim();
    launchApp({ prompt: prompt || undefined, isDaemon: false });
  });

// ── Root / Default command ───────────────────────────────────────────
program
  .argument("[prompt...]", "Optional initial command or instruction prompt")
  .option("-d, --daemon", "Force persistent interactive mode", true)
  .option("-s, --setup", "Force re-running onboarding setup")
  .action((promptParts: string[], options: { daemon?: boolean; setup?: boolean }) => {
    const prompt = promptParts.length > 0 ? promptParts.join(" ").trim() : undefined;
    const isDaemon = !prompt || options.daemon;
    const initialStage = options.setup ? "pick-provider" : undefined;

    launchApp({
      prompt,
      isDaemon,
      initialStage,
    });
  });

program.parse(process.argv);
