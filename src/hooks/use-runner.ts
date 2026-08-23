import { useState, useCallback } from "react";
import { askAI } from "../api/index.ts";
import type { AppConfig, OutputMessage } from "../types.ts";

type AddMessage = (type: OutputMessage["type"], text: string) => void;

export interface UseRunnerReturn {
  isReady: boolean;
  startRunner: (cfg: AppConfig) => void;
  stopRunner: () => void;
  executeTask: (taskPrompt: string) => void;
}

export function useRunner(
  addMessage: AddMessage,
  onTaskDone: () => void,
): UseRunnerReturn {
  const [isReady, setIsReady] = useState(true);

  const stopRunner = useCallback(() => {
    // cleanup if needed
  }, []);

  const startRunner = useCallback((_cfg: AppConfig) => {
    setIsReady(true);
  }, []);

  const executeTask = useCallback(
    async (taskPrompt: string) => {
      const trimmed = taskPrompt.trim();
      if (!trimmed) return;

      try {
        // Direct local shell execution with $ prefix
        if (trimmed.startsWith("$ ")) {
          const cleanCmd = trimmed.slice(2).trim();
          addMessage("system", `[exec] ${cleanCmd}`);

          const proc = Bun.spawn({
            cmd: process.platform === "win32" ? ["cmd", "/c", cleanCmd] : ["sh", "-c", cleanCmd],
            stdout: "pipe",
            stderr: "pipe",
          });

          const stdout = await new Response(proc.stdout).text();
          const stderr = await new Response(proc.stderr).text();

          if (stdout.trim()) {
            addMessage("agent", stdout.trimEnd());
          }
          if (stderr.trim()) {
            addMessage("error", stderr.trimEnd());
          }

          addMessage("done", "Command executed");
          onTaskDone();
          return;
        }

        // Call Anthropic / Claude LLM with real-time UI messages for thinking and tools
        const response = await askAI(trimmed, (type, text) => {
          addMessage(type, text);
        });
        if (response.trim()) {
          addMessage("agent", response.trim());
        }

        addMessage("done", "Response completed");
        onTaskDone();
      } catch (err: any) {
        addMessage("error", `Error: ${err.message || String(err)}`);
        onTaskDone();
      }
    },
    [addMessage, onTaskDone],
  );

  return { isReady, startRunner, stopRunner, executeTask };
}
