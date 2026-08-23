import React from "react";
import ModelOverlay from "./model-overlay.tsx";
import HelpOverlay from "./help-overlay.tsx";
import ApiKeyInput from "./api-key-input.tsx";
import KeysOverlay from "./keys-overlay.tsx";
import type {
  OverlayMode,
  AppConfig,
  ModelProvider,
  PendingSwitch,
} from "../types.ts";

interface OverlayManagerProps {
  mode: OverlayMode;
  config: AppConfig;
  pending: PendingSwitch | null;
  onClose: () => void;
  onModelSelect: (provider: ModelProvider, model: string) => void;
  onApiKeySubmit: (key: string) => void;
  onApiKeySkip: () => void;
  onKeyDelete: (envKey: string) => void;
  onKeyEdit: (providerId: string) => void;
  onKeysEditSubmit: (key: string) => void;
  onKeysEditBack: () => void;
}

export default function OverlayManager({
  mode,
  config,
  pending,
  onClose,
  onModelSelect,
  onApiKeySubmit,
  onApiKeySkip,
  onKeyDelete,
  onKeyEdit,
  onKeysEditSubmit,
  onKeysEditBack,
}: OverlayManagerProps): React.ReactElement | null {
  switch (mode) {
    case "model":
      return (
        <ModelOverlay
          currentProvider={config.provider}
          currentModel={config.model}
          onSelect={onModelSelect}
          onExit={onClose}
        />
      );

    case "help":
      return <HelpOverlay onExit={onClose} />;

    case "apikey":
      if (!pending) return null;
      return (
        <ApiKeyInput
          providerName={pending.provider.name}
          envKeyName={pending.provider.envKey}
          existingKey={config.apiKeys[pending.provider.envKey]}
          keyHint={pending.provider.keyHint}
          onSubmit={onApiKeySubmit}
          onSkip={onApiKeySkip}
        />
      );

    case "keys":
      return (
        <KeysOverlay
          config={config}
          onDelete={onKeyDelete}
          onEdit={onKeyEdit}
          onExit={onClose}
        />
      );

    case "keys-edit":
      if (!pending) return null;
      return (
        <ApiKeyInput
          providerName={pending.provider.name}
          envKeyName={pending.provider.envKey}
          existingKey={config.apiKeys[pending.provider.envKey]}
          keyHint={pending.provider.keyHint}
          onSubmit={onKeysEditSubmit}
          onSkip={onKeysEditBack}
        />
      );

    case "none":
    default:
      return null;
  }
}
