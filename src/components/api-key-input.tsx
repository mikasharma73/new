import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import React, { useState } from "react";

interface ApiKeyInputProps {
  providerName: string;
  envKeyName: string;
  existingKey?: string;
  keyHint?: string;
  onSubmit: (key: string) => void;
  onSkip: () => void;
  skipLabel?: string;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  providerName,
  envKeyName,
  existingKey,
  keyHint,
  onSubmit,
  onSkip,
  skipLabel,
}) => {
  const [value, setValue] = useState("");
  const hasExisting = Boolean(existingKey);

  const maskedExisting = existingKey
    ? existingKey.slice(0, 8) +
      "•".repeat(Math.max(0, existingKey.length - 12)) +
      existingKey.slice(-4)
    : "";

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={1}
      paddingY={1}
      width={72}
    >
      <Box marginBottom={1}>
        <Text bold color="yellow">
          🔑 API Key / Runner Setup — {providerName}
        </Text>
      </Box>

      {keyHint && (
        <Box marginBottom={1}>
          <Text dimColor>{keyHint}</Text>
        </Box>
      )}

      {hasExisting && (
        <Box marginBottom={1} flexDirection="column">
          <Box gap={1}>
            <Text color="green">✓</Text>
            <Text dimColor>Key saved:</Text>
            <Text color="gray">{maskedExisting}</Text>
          </Box>
          <Text dimColor>Press Enter with empty input to keep current key</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text>
          <Text color="white" bold>
            {envKeyName}
          </Text>
          <Text dimColor>=</Text>
        </Text>
      </Box>

      <Box borderStyle="round" borderColor="gray" paddingX={1}>
        <TextInput
          placeholder={
            hasExisting
              ? "paste new key or press Enter to keep"
              : "paste your API key here"
          }
          value={value}
          onChange={setValue}
          onSubmit={(val) => {
            const trimmed = val.trim();
            if (!trimmed && hasExisting) {
              onSkip();
            } else if (trimmed) {
              onSubmit(trimmed);
            } else {
              onSkip();
            }
          }}
          mask="*"
        />
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Paste your key and press Enter to save securely</Text>
        {hasExisting && <Text dimColor>Empty Enter = keep existing key</Text>}
        {skipLabel && <Text dimColor>Empty Enter = {skipLabel}</Text>}
      </Box>
    </Box>
  );
};

export default ApiKeyInput;
