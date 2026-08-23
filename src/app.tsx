import { Box } from "ink";
import React, { useState, useCallback, useEffect, useRef } from "react";
import MessageHistory from "./components/message-history.tsx";
import ChatInput from "./components/chat-input.tsx";
import OnboardingFlow from "./components/onboarding-flow.tsx";
import OverlayManager from "./components/overlay-manager.tsx";
import { useMessages } from "./hooks/use-messages.ts";
import { useOnboarding } from "./hooks/use-onboarding.ts";
import { useRunner } from "./hooks/use-runner.ts";
import {
  saveConfig,
  deleteApiKey,
  getProvider,
  getActiveProvider,
  getConfigPath,
} from "./config.ts";
import { VERSION } from "./constants.ts";
import type {
  AppProps,
  AppConfig,
  ModelProvider,
  OverlayMode,
  PendingSwitch,
} from "./types.ts";

export default function App({ prompt, mode, initialStage }: AppProps): React.ReactElement {
  // ── Core hooks ───────────────────────────────────────────────────
  const { messages, addMessage, clearMessages } = useMessages();
  const {
    stage,
    config,
    setConfig,
    pending: onboardingPending,
    onProviderSelect,
    onKeySubmit,
    onKeyBack,
  } = useOnboarding(initialStage);

  const [loading, setLoading] = useState(false);

  const { isReady, startRunner, stopRunner, executeTask } = useRunner(
    addMessage,
    () => setLoading(false),
  );

  // ── Overlay state ────────────────────────────────────────────────
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("none");
  const [overlayPending, setOverlayPending] = useState<PendingSwitch | null>(null);

  const [sessionId] = useState(() =>
    Math.random().toString(36).substring(2, 10),
  );
  const runnerStarted = useRef(false);

  // ── Initialize runner once onboarding completes ──────────────────
  useEffect(() => {
    if (stage === "done" && !runnerStarted.current) {
      runnerStarted.current = true;
      const provider = getActiveProvider(config);
      addMessage(
        "system",
        `Initialized with ${provider.name} (${config.model})`,
      );
      startRunner(config);
    }
    return () => {
      if (stage === "done") stopRunner();
    };
  }, [stage]);

  // ── Handle initial one-shot prompt ──────────────────────────────
  const initialPromptSent = useRef(false);
  useEffect(() => {
    if (prompt && isReady && !initialPromptSent.current && stage === "done") {
      initialPromptSent.current = true;
      handleSubmit(prompt);
    }
  }, [prompt, isReady, stage]);

  // ── Submit a task ────────────────────────────────────────────────
  const handleSubmit = useCallback(
    (taskPrompt: string) => {
      addMessage("user", taskPrompt);
      setLoading(true);
      executeTask(taskPrompt);
    },
    [addMessage, executeTask],
  );

  // ── Interrupt ────────────────────────────────────────────────────
  const handleInterrupt = useCallback(() => {
    setLoading(false);
    stopRunner();
    addMessage("system", "Task interrupted by user");
  }, [addMessage, stopRunner]);

  // ── Slash commands ───────────────────────────────────────────────
  const handleSlashCommand = useCallback(
    (cmd: string) => {
      const n = cmd.toLowerCase().trim();
      switch (n) {
        case "/model":
          setOverlayMode("model");
          break;
        case "/help":
          setOverlayMode("help");
          break;
        case "/keys":
          setOverlayMode("keys");
          break;
        case "/clear":
          clearMessages();
          addMessage("system", "Conversation cleared");
          break;
        case "/config": {
          const prov = getProvider(config.provider);
          const keyStatus = config.apiKeys[prov?.envKey ?? ""]
            ? "✓ configured"
            : "✗ not set";
          addMessage(
            "system",
            `Provider: ${prov?.name ?? config.provider} | Model: ${config.model} | Status: ${keyStatus}\n  Config file: ${getConfigPath()}`,
          );
          break;
        }
        case "/quit":
        case "/exit":
          process.exit(0);
          break;
        default:
          addMessage("error", `Unknown command: ${cmd}`);
      }
    },
    [config, addMessage, clearMessages],
  );

  // ── Model switch (post-onboarding) ───────────────────────────────
  const applyModelSwitch = useCallback(
    (provider: ModelProvider, model: string, cfg: AppConfig) => {
      const newConfig: AppConfig = { ...cfg, provider: provider.id, model };
      setConfig(newConfig);
      saveConfig(newConfig);
      setOverlayMode("none");
      setOverlayPending(null);
      addMessage("system", `✓ Switched to ${provider.name} — ${model}`);
      startRunner(newConfig);
    },
    [addMessage, setConfig, startRunner],
  );

  const handleModelSelect = useCallback(
    (provider: ModelProvider, model: string) => {
      if (provider.id === "local" || config.apiKeys[provider.envKey]) {
        applyModelSwitch(provider, model, config);
      } else {
        setOverlayPending({ provider, model });
        setOverlayMode("apikey");
      }
    },
    [config, applyModelSwitch],
  );

  const handleApiKeySubmit = useCallback(
    (key: string) => {
      if (!overlayPending) return;
      const newConfig: AppConfig = {
        ...config,
        apiKeys: { ...config.apiKeys, [overlayPending.provider.envKey]: key },
      };
      setConfig(newConfig);
      applyModelSwitch(
        overlayPending.provider,
        overlayPending.model,
        newConfig,
      );
    },
    [config, overlayPending, setConfig, applyModelSwitch],
  );

  const handleApiKeySkip = useCallback(() => {
    if (!overlayPending) {
      setOverlayMode("none");
      return;
    }
    applyModelSwitch(overlayPending.provider, overlayPending.model, config);
  }, [config, overlayPending, applyModelSwitch]);

  // ── Key management ───────────────────────────────────────────────
  const handleKeyDelete = useCallback(
    (envKey: string) => {
      const newConfig = deleteApiKey(config, envKey);
      setConfig(newConfig);
      addMessage("system", `Deleted key for ${envKey}`);
    },
    [config, setConfig, addMessage],
  );

  const handleKeyEdit = useCallback(
    (providerId: string) => {
      const provider = getProvider(providerId);
      if (provider) {
        setOverlayPending({ provider, model: config.model });
        setOverlayMode("keys-edit");
      }
    },
    [config],
  );

  const handleKeysEditSubmit = useCallback(
    (key: string) => {
      if (!overlayPending) return;
      const newConfig: AppConfig = {
        ...config,
        apiKeys: { ...config.apiKeys, [overlayPending.provider.envKey]: key },
      };
      setConfig(newConfig);
      saveConfig(newConfig);
      setOverlayMode("keys");
      setOverlayPending(null);
      addMessage("system", `✓ Updated settings for ${overlayPending.provider.name}`);
    },
    [config, overlayPending, setConfig, addMessage],
  );

  const handleKeysEditBack = useCallback(() => {
    setOverlayMode("keys");
    setOverlayPending(null);
  }, []);

  // ── Status line for ChatInput ────────────────────────────────────
  const provider = getProvider(config.provider);
  const statusLine = `${provider?.name ?? config.provider} (${config.model})`;

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════

  // Show onboarding screens until setup is complete
  if (stage !== "done") {
    return (
      <OnboardingFlow
        stage={stage}
        config={config}
        pending={onboardingPending}
        onProviderSelect={onProviderSelect}
        onKeySubmit={onKeySubmit}
        onKeyBack={onKeyBack}
      />
    );
  }

  // Normal chat / interactive CLI UI
  return (
    <Box flexDirection="column">
      <MessageHistory
        messages={messages}
        headerProps={{ version: VERSION, model: config.model, mode, sessionId }}
      />

      <OverlayManager
        mode={overlayMode}
        config={config}
        pending={overlayPending}
        onClose={() => setOverlayMode("none")}
        onModelSelect={handleModelSelect}
        onApiKeySubmit={handleApiKeySubmit}
        onApiKeySkip={handleApiKeySkip}
        onKeyDelete={handleKeyDelete}
        onKeyEdit={handleKeyEdit}
        onKeysEditSubmit={handleKeysEditSubmit}
        onKeysEditBack={handleKeysEditBack}
      />

      {mode === "daemon" && (
        <ChatInput
          isNew={messages.filter((m) => m.type === "user").length === 0}
          loading={loading}
          onSubmit={handleSubmit}
          onInterrupt={handleInterrupt}
          onSlashCommand={handleSlashCommand}
          active={overlayMode === "none"}
          statusLine={statusLine}
        />
      )}
    </Box>
  );
}
