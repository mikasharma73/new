import { useState, useCallback, useEffect } from "react";
import {
  loadConfig,
  saveConfig,
  getActiveProvider,
} from "../config.ts";
import type {
  AppConfig,
  ModelProvider,
  OnboardingStage,
  PendingSwitch,
} from "../types.ts";

export interface UseOnboardingReturn {
  stage: OnboardingStage;
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  pending: PendingSwitch | null;
  onProviderSelect: (provider: ModelProvider, model: string) => void;
  onKeySubmit: (key: string) => void;
  onKeyBack: () => void;
}

export function useOnboarding(initialStage?: OnboardingStage): UseOnboardingReturn {
  const [config, setConfig] = useState<AppConfig>(() => loadConfig());
  const [stage, setStage] = useState<OnboardingStage>(initialStage ?? "check");
  const [pending, setPending] = useState<PendingSwitch | null>(null);

  // ── Stage: check ─────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== "check") return;
    const cfg = loadConfig();
    setConfig(cfg);
    const activeProvider = getActiveProvider(cfg);
    // If local runner or active provider key exists
    if (activeProvider.id === "local" || cfg.apiKeys[activeProvider.envKey]) {
      setStage("done");
    } else {
      setStage("pick-provider");
    }
  }, [stage]);

  // ── Stage: pick-provider → enter-key ─────────────────────────────
  const onProviderSelect = useCallback(
    (provider: ModelProvider, model: string) => {
      if (provider.id === "local") {
        const newConfig: AppConfig = {
          ...config,
          provider: provider.id,
          model,
        };
        setConfig(newConfig);
        saveConfig(newConfig);
        setPending(null);
        setStage("done");
        return;
      }

      setPending({ provider, model });
      setStage("enter-key");
    },
    [config],
  );

  // ── Stage: enter-key → done ───────────────────────────────────────
  const onKeySubmit = useCallback(
    (key: string) => {
      if (!pending) return;
      const newConfig: AppConfig = {
        ...config,
        provider: pending.provider.id,
        model: pending.model,
        apiKeys: { ...config.apiKeys, [pending.provider.envKey]: key },
      };
      setConfig(newConfig);
      saveConfig(newConfig);
      setPending(null);
      setStage("done");
    },
    [config, pending],
  );

  // ── Stage: enter-key → pick-provider (back button) ───────────────
  const onKeyBack = useCallback(() => {
    setPending(null);
    setStage("pick-provider");
  }, []);

  return {
    stage,
    config,
    setConfig,
    pending,
    onProviderSelect,
    onKeySubmit,
    onKeyBack,
  };
}
