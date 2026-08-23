import { Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import React, { useState, useCallback, Fragment } from "react";
import ThinkingSpinner from "./thinking-spinner.tsx";

const suggestions = [
  "Run git status and summarize modified files",
  "List active processes and memory usage",
  "Explain project structure and entry points",
];

const slashCommands = [
  { cmd: "model", desc: "Opens a dialog to configure the model / runner" },
  { cmd: "keys", desc: "Manage saved API keys (edit, delete)" },
  { cmd: "config", desc: "Show current configuration" },
  { cmd: "help", desc: "Show help & keyboard shortcuts" },
  { cmd: "clear", desc: "Clear the screen and conversation history" },
  { cmd: "quit", desc: "Exit the application" },
];

interface ChatInputProps {
  isNew: boolean;
  loading: boolean;
  onSubmit: (prompt: string) => void;
  onInterrupt: () => void;
  onSlashCommand: (cmd: string) => void;
  active: boolean;
  statusLine?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  isNew,
  loading,
  onSubmit,
  onInterrupt,
  onSlashCommand,
  active,
  statusLine,
}) => {
  const app = useApp();
  const [input, setInput] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [draftInput, setDraftInput] = useState("");
  const [slashIndex, setSlashIndex] = useState(-1);

  // Filter slash commands when input starts with "/"
  const isSlashMode = input.startsWith("/") && !loading;
  const typedCmd = isSlashMode ? input.slice(1).toLowerCase() : "";
  const matchingCommands = isSlashMode
    ? slashCommands.filter((c) => c.cmd.startsWith(typedCmd))
    : [];

  const clampedSlashIndex =
    matchingCommands.length === 0
      ? -1
      : slashIndex >= matchingCommands.length
        ? matchingCommands.length - 1
        : slashIndex;

  useInput(
    (_input, _key) => {
      if (!loading) {
        // ── Slash-mode arrow navigation ──────────────────────────
        if (isSlashMode && matchingCommands.length > 0) {
          if (_key.downArrow) {
            setSlashIndex((prev) => {
              const next = prev + 1;
              return next >= matchingCommands.length ? 0 : next;
            });
            return;
          }
          if (_key.upArrow) {
            setSlashIndex((prev) => {
              const next = prev - 1;
              return next < 0 ? matchingCommands.length - 1 : next;
            });
            return;
          }
          if (_key.escape) {
            setInput("");
            setSlashIndex(-1);
            return;
          }
          if (_key.tab && matchingCommands.length === 1) {
            setInput("/" + matchingCommands[0]!.cmd);
            setSlashIndex(0);
            return;
          }
          return;
        }

        // ── Empty input suggestion navigation / execution ─────────
        if (isNew && input.trim() === "") {
          if (_key.return) {
            const picked = suggestions[selectedSuggestion] ?? "";
            if (picked) {
              handleSubmit(picked);
              return;
            }
          }
          if (_key.tab || _key.downArrow) {
            setSelectedSuggestion((prev) => (prev + 1) % suggestions.length);
            return;
          }
          if (_key.upArrow) {
            setSelectedSuggestion((prev) => (prev - 1 + suggestions.length) % suggestions.length);
            return;
          }
          if (_key.rightArrow) {
            setInput(suggestions[selectedSuggestion] ?? "");
            return;
          }
        }

        // ── History navigation ──────────────────────────────────
        if (_key.upArrow && history.length > 0) {
          if (historyIndex == null) {
            setDraftInput(input);
            const newIdx = history.length - 1;
            setHistoryIndex(newIdx);
            setInput(history[newIdx] ?? "");
          } else if (historyIndex > 0) {
            const newIdx = historyIndex - 1;
            setHistoryIndex(newIdx);
            setInput(history[newIdx] ?? "");
          }
          return;
        }
        if (_key.downArrow && historyIndex != null) {
          if (historyIndex < history.length - 1) {
            const newIdx = historyIndex + 1;
            setHistoryIndex(newIdx);
            setInput(history[newIdx] ?? "");
          } else {
            setHistoryIndex(null);
            setInput(draftInput);
          }
          return;
        }
      }

      // Interrupt running command
      if (_key.escape && loading) {
        onInterrupt();
      }
    },
    { isActive: active },
  );

  const handleSubmit = useCallback(
    (value: string) => {
      // If slash dropdown has a highlighted item and user pressed enter
      if (isSlashMode && clampedSlashIndex >= 0) {
        const picked = matchingCommands[clampedSlashIndex];
        if (picked) {
          setInput("");
          setSlashIndex(-1);
          if (picked.cmd === "quit") {
            app.exit();
            process.exit(0);
          }
          onSlashCommand("/" + picked.cmd);
          return;
        }
      }

      const trimmed = value.trim();

      // If user typed a full slash command string
      if (trimmed.startsWith("/")) {
        const cmdName = trimmed.slice(1).toLowerCase().split(" ")[0] ?? "";
        setInput("");
        setSlashIndex(-1);
        if (cmdName === "quit" || cmdName === "exit") {
          app.exit();
          process.exit(0);
        }
        onSlashCommand(trimmed);
        return;
      }

      // If empty enter, fill suggestion if on first prompt
      let toSubmit = trimmed;
      if (!toSubmit && isNew) {
        toSubmit = suggestions[selectedSuggestion] ?? "";
      }
      if (!toSubmit) return;

      // Update history
      setHistory((prev) => [...prev, toSubmit]);
      setHistoryIndex(null);
      setDraftInput("");
      setInput("");
      setSlashIndex(-1);

      onSubmit(toSubmit);
    },
    [
      isSlashMode,
      clampedSlashIndex,
      matchingCommands,
      isNew,
      selectedSuggestion,
      onSlashCommand,
      onSubmit,
      app,
    ],
  );

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* ── Slash command popover ─────────────────────────────────── */}
      {isSlashMode && matchingCommands.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="cyan"
          paddingX={1}
          marginBottom={1}
          width={64}
        >
          <Box marginBottom={1}>
            <Text bold color="cyan">
              Commands
            </Text>
            <Text dimColor> (↑↓ to navigate, Enter to run, Tab to complete)</Text>
          </Box>
          {matchingCommands.map((item, idx) => {
            const isHighlighted =
              idx === clampedSlashIndex ||
              (clampedSlashIndex === -1 && idx === 0);
            return (
              <Box key={item.cmd} gap={1}>
                <Text color={isHighlighted ? "cyan" : "gray"}>
                  {isHighlighted ? "❯" : " "}
                </Text>
                <Text color={isHighlighted ? "white" : "gray"} bold={isHighlighted}>
                  {"/" + item.cmd.padEnd(8)}
                </Text>
                <Text dimColor>{item.desc}</Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── Suggestions (when empty & not loading) ─────────────────── */}
      {isNew && input.trim() === "" && !loading && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          paddingX={1}
          marginBottom={1}
        >
          <Box marginBottom={0} gap={1}>
            <Text color="cyan" bold>
              💡 Suggestions
            </Text>
            <Text dimColor>(↑↓ / Tab to select, Enter to run, → to edit):</Text>
          </Box>
          {suggestions.map((suggestion, index) => {
            const isSelected = index === selectedSuggestion;
            return (
              <Box key={suggestion} gap={1}>
                <Text color={isSelected ? "cyanBright" : "gray"} bold={isSelected}>
                  {isSelected ? "❯" : " "}
                </Text>
                <Text
                  color={isSelected ? "cyanBright" : "gray"}
                  bold={isSelected}
                >
                  {suggestion}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── Thinking Spinner ───────────────────────────────────────── */}
      {loading && <ThinkingSpinner active={loading} label="Executing" />}

      {/* ── Status line / footer bar ────────────────────────────────── */}
      {statusLine && !loading && (
        <Box gap={1} marginBottom={0}>
          <Text dimColor>runner:</Text>
          <Text color="cyan">{statusLine}</Text>
          <Text dimColor>·</Text>
          <Text dimColor>type / for commands</Text>
        </Box>
      )}

      {/* ── Text Input Box ─────────────────────────────────────────── */}
      {!loading && active && (
        <Box
          borderStyle="round"
          borderColor={isSlashMode ? "cyan" : "gray"}
          paddingX={1}
        >
          <Text color="cyan" bold>
            ❯{" "}
          </Text>
          <TextInput
            placeholder={
              isNew
                ? "Type a command or natural language instruction, or /help"
                : "Type your next instruction, or / for commands..."
            }
            value={input}
            onChange={(val) => {
              setInput(val);
              if (!val.startsWith("/")) setSlashIndex(-1);
            }}
            onSubmit={handleSubmit}
          />
        </Box>
      )}
    </Box>
  );
};

export default ChatInput;
