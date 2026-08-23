import { Box, Text } from "ink";
import React from "react";

/**
 * Big block-letter ASCII art for "CMDC" in cyan.
 * Rendered with Ink's Text component in the terminal.
 */
const CMDC_ART = [
  "   ██████╗███╗   ███╗██████╗   ██████╗",
  "  ██╔════╝████╗ ████║██╔══██╗ ██╔════╝",
  "  ██║     ██╔████╔██║██║  ██║ ██║     ",
  "  ██║     ██║╚██╔╝██║██║  ██║ ██║     ",
  "  ╚██████╗██║ ╚═╝ ██║██████╔╝ ╚██████╗",
  "   ╚═════╝╚═╝     ╚═╝╚═════╝   ╚═════╝",
];

export const CmdcBanner: React.FC = () => {
  return (
    <Box flexDirection="column" marginY={1}>
      <Box flexDirection="column">
        {CMDC_ART.map((line, i) => (
          <Text key={i} color="cyan" bold>
            {line}
          </Text>
        ))}
      </Box>
      <Box
        flexDirection="column"
        marginTop={1}
        paddingX={1}
        borderStyle="round"
        borderColor="gray"
      >
        <Box gap={1}>
          <Text color="cyanBright" bold>
            ✦ Welcome to CMDC
          </Text>
          <Text dimColor>— AI Terminal Coding & Command Assistant</Text>
        </Box>
        <Box gap={1}>
          <Text dimColor>Type instructions directly, run shell commands with</Text>
          <Text color="yellowBright" bold>$ &lt;cmd&gt;</Text>
          <Text dimColor>or use</Text>
          <Text color="cyanBright" bold>/help</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default CmdcBanner;
