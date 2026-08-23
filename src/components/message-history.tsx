import { Box, Text, Static } from "ink";
import React from "react";
import TerminalHeader from "./terminal-header.tsx";
import CmdcBanner from "./cmdc-banner.tsx";
import MarkdownRenderer from "./markdown-renderer.tsx";
import type { OutputMessage } from "../types.ts";

export type { OutputMessage };

interface MessageHistoryProps {
  messages: OutputMessage[];
  headerProps: {
    version: string;
    model: string;
    mode: "daemon" | "one-shot";
    sessionId?: string;
  };
}

export const MessageHistory: React.FC<MessageHistoryProps> = ({
  messages,
  headerProps,
}) => {
  // Wrap messages with a header sentinel as the first static item
  const items: Array<{ kind: "header" } | { kind: "msg"; msg: OutputMessage }> =
    [
      { kind: "header" as const },
      ...messages.map((msg) => ({ kind: "msg" as const, msg })),
    ];

  return (
    <Static items={items}>
      {(item) => {
        if (item.kind === "header") {
          return (
            <Box key="__header__" flexDirection="column">
              <CmdcBanner />
              <TerminalHeader {...headerProps} />
            </Box>
          );
        }

        const msg = item.msg;

        return (
          <Box
            key={msg.id}
            flexDirection="column"
            marginBottom={msg.type === "done" ? 1 : 0}
          >
            {msg.type === "done" ? (
              <Box gap={1} marginY={0}>
                <Text color="green" bold>
                  ✔
                </Text>
                <Text color="green">{msg.text || "Command completed"}</Text>
              </Box>
            ) : msg.type === "user" ? (
              <Box flexDirection="column" marginY={1}>
                <Text bold color="blueBright">
                  you
                </Text>
                <Text>{msg.text}</Text>
              </Box>
            ) : msg.type === "error" ? (
              <Box marginY={0}>
                <Text color="red">✗ {msg.text}</Text>
              </Box>
            ) : msg.type === "thinking" ? (
              <Box marginY={0} flexDirection="column">
                <Text color="gray" italic>
                  💭 {msg.text}
                </Text>
              </Box>
            ) : msg.type === "tool" ? (
              <Box marginY={0}>
                <Text color="yellow" bold>
                  ⚙ {msg.text}
                </Text>
              </Box>
            ) : msg.type === "system" ? (
              <Box marginY={0}>
                <Text dimColor>{msg.text}</Text>
              </Box>
            ) : (
              /* agent / execution output with markdown rendering */
              <Box marginY={0} flexDirection="column">
                <MarkdownRenderer content={msg.text} />
              </Box>
            )}
          </Box>
        );
      }}
    </Static>
  );
};

export default MessageHistory;
