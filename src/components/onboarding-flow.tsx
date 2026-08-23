import { Box, Text } from "ink";
import React from "react";
import ModelOverlay from "./model-overlay.tsx";
import ApiKeyInput from "./api-key-input.tsx";
import type {
  OnboardingStage,
  ModelProvider,
  AppConfig,
  PendingSwitch,
} from "../types.ts";

interface OnboardingFlowProps {
  stage: OnboardingStage;
  config: AppConfig;
  pending: PendingSwitch | null;
  onProviderSelect: (provider: ModelProvider, model: string) => void;
  onKeySubmit: (key: string) => void;
  onKeyBack: () => void;
}

function OnboardingHeader(): React.ReactElement {
  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} marginBottom={1}>
      <Text bold color="cyan">
        🌐 Welcome to cmdc!
      </Text>
    </Box>
  );
}

export default function OnboardingFlow({
  stage,
  config,
  pending,
  onProviderSelect,
  onKeySubmit,
  onKeyBack,
}: OnboardingFlowProps): React.ReactElement {
  if (stage === "check") {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text dimColor>Checking configuration...</Text>
      </Box>
    );
  }

  if (stage === "pick-provider") {
    return (
      <Box flexDirection="column">
        <OnboardingHeader />
        <Text dimColor>
          Let&apos;s get you set up. Choose a model provider or local execution to start.
        </Text>
        <ModelOverlay
          currentProvider={config.provider}
          currentModel={config.model}
          onSelect={onProviderSelect}
          onExit={() => {}}
        />
      </Box>
    );
  }

  if (stage === "enter-key" && pending) {
    return (
      <Box flexDirection="column">
        <OnboardingHeader />
        <Text dimColor>
          Configure credentials / settings for{" "}
          <Text color={pending.provider.color} bold>
            {pending.provider.name}
          </Text>{" "}
          to continue.
        </Text>
        <ApiKeyInput
          providerName={pending.provider.name}
          envKeyName={pending.provider.envKey}
          existingKey={config.apiKeys[pending.provider.envKey]}
          keyHint={pending.provider.keyHint}
          onSubmit={onKeySubmit}
          onSkip={onKeyBack}
          skipLabel="← Back to provider selection"
        />
      </Box>
    );
  }

  return <Box />;
}
