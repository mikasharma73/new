import { Box, Text } from "ink";
import React from "react";

interface MarkdownRendererProps {
  content: string;
}

/**
 * Parses inline markdown tokens (bold, italic, code, links) into React Ink Text nodes.
 */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  // Regex to split by inline code, bold, italic, and links
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline code `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return (
        <Text key={index} color="yellow" bold>
          {part.slice(1, -1)}
        </Text>
      );
    }

    // Bold **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length > 3) {
      return (
        <Text key={index} bold color="white">
          {part.slice(2, -2)}
        </Text>
      );
    }

    // Italic *text*
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <Text key={index} italic dimColor>
          {part.slice(1, -1)}
        </Text>
      );
    }

    // Link [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <Text key={index} color="cyan" underline>
          {linkMatch[1]}
        </Text>
      );
    }

    return (
      <Text key={index} color="white">
        {part}
      </Text>
    );
  });
}

/**
 * Parse and render a Markdown table with aligned columns & borders
 */
function renderTable(tableLines: string[], keyPrefix: string): React.ReactNode {
  const rows = tableLines.map((line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim())
  );

  // Filter out the separator line (|---|---|)
  const header = rows[0] || [];
  const isSeparator = (r: string[]) => r.every((c) => /^:?-+:?$/.test(c));
  const dataRows = rows.slice(1).filter((r) => !isSeparator(r));

  if (header.length === 0) return null;

  // Calculate column widths
  const numCols = Math.max(header.length, ...dataRows.map((r) => r.length));
  const colWidths = Array(numCols).fill(4);

  for (let c = 0; c < numCols; c++) {
    const headerLen = header[c]?.length ?? 0;
    colWidths[c] = Math.max(colWidths[c] ?? 4, headerLen);

    for (const row of dataRows) {
      const cellLen = row[c]?.length ?? 0;
      colWidths[c] = Math.max(colWidths[c] ?? 4, cellLen);
    }
  }

  // Cap column widths for terminal display
  for (let c = 0; c < numCols; c++) {
    colWidths[c] = Math.min(colWidths[c] ?? 4, 36);
  }

  return (
    <Box
      key={keyPrefix}
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      marginY={1}
    >
      {/* Header Row */}
      <Box gap={1} marginBottom={0}>
        {header.map((cell, cIdx) => (
          <Box key={cIdx} width={(colWidths[cIdx] ?? 10) + 2}>
            <Text bold color="cyan">
              {cell}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Header Divider */}
      <Box marginY={0}>
        <Text dimColor>
          {colWidths.map((w) => "─".repeat(w + 2)).join("┼")}
        </Text>
      </Box>

      {/* Data Rows */}
      {dataRows.map((row, rIdx) => (
        <Box key={rIdx} gap={1}>
          {row.map((cell, cIdx) => (
            <Box key={cIdx} width={(colWidths[cIdx] ?? 10) + 2}>
              <Text>{renderInlineMarkdown(cell)}</Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

/**
 * Robust streaming-safe Markdown parser & renderer for Ink terminal CLI.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeLines: string[] = [];
  let tableLines: string[] = [];

  const flushTable = (idx: number) => {
    if (tableLines.length > 0) {
      elements.push(renderTable(tableLines, `table-${idx}`));
      tableLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    // Code block toggle (``` or ```typescript)
    if (line.trim().startsWith("```")) {
      flushTable(i);
      if (inCodeBlock) {
        // End of code block
        elements.push(
          <Box
            key={`code-${i}`}
            flexDirection="column"
            borderStyle="round"
            borderColor="cyan"
            paddingX={1}
            marginY={1}
          >
            {codeBlockLang ? (
              <Box marginBottom={0}>
                <Text color="cyan" bold>
                  [{codeBlockLang}]
                </Text>
              </Box>
            ) : null}
            <Text color="greenBright">{codeLines.join("\n")}</Text>
          </Box>
        );
        inCodeBlock = false;
        codeBlockLang = "";
        codeLines = [];
      } else {
        // Start of code block
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Check for Markdown Table line (| ... |)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      tableLines.push(line);
      continue;
    } else {
      flushTable(i);
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<Box key={`empty-${i}`} height={1} />);
      continue;
    }

    // Horizontal Rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      elements.push(
        <Box key={`hr-${i}`} marginY={0}>
          <Text dimColor>{"─".repeat(50)}</Text>
        </Box>
      );
      continue;
    }

    // Heading 1 (# ...)
    if (line.startsWith("# ")) {
      elements.push(
        <Box key={`h1-${i}`} marginY={0}>
          <Text bold color="cyanBright" underline>
            {line.slice(2)}
          </Text>
        </Box>
      );
      continue;
    }

    // Heading 2 (## ...)
    if (line.startsWith("## ")) {
      elements.push(
        <Box key={`h2-${i}`} marginY={0}>
          <Text bold color="cyan">
            {line.slice(3)}
          </Text>
        </Box>
      );
      continue;
    }

    // Heading 3 (### ...)
    if (line.startsWith("### ")) {
      elements.push(
        <Box key={`h3-${i}`} marginY={0}>
          <Text bold color="white">
            {line.slice(4)}
          </Text>
        </Box>
      );
      continue;
    }

    // Blockquote (> ...)
    if (line.startsWith("> ")) {
      elements.push(
        <Box key={`quote-${i}`} paddingLeft={1}>
          <Text color="gray" italic>
            │ {line.slice(2)}
          </Text>
        </Box>
      );
      continue;
    }

    // Bullet list (- ... or * ...)
    const bulletMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1] ? bulletMatch[1].length : 0;
      elements.push(
        <Box key={`bullet-${i}`} paddingLeft={indent}>
          <Text color="cyan">● </Text>
          <Text>{renderInlineMarkdown(bulletMatch[3] ?? "")}</Text>
        </Box>
      );
      continue;
    }

    // Numbered list (1. ...)
    const numMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (numMatch) {
      const indent = numMatch[1] ? numMatch[1].length : 0;
      elements.push(
        <Box key={`num-${i}`} paddingLeft={indent}>
          <Text color="cyan">{numMatch[2]}. </Text>
          <Text>{renderInlineMarkdown(numMatch[3] ?? "")}</Text>
        </Box>
      );
      continue;
    }

    // Standard paragraph line with inline markdown formatting
    elements.push(
      <Box key={`p-${i}`} marginY={0}>
        <Text>{renderInlineMarkdown(line)}</Text>
      </Box>
    );
  }

  // Flush any remaining table at the end
  flushTable(lines.length);

  // If currently streaming and code block unclosed
  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <Box
        key="code-unclosed"
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
        marginY={1}
      >
        {codeBlockLang ? (
          <Box marginBottom={0}>
            <Text color="cyan" bold>
              [{codeBlockLang}]
            </Text>
          </Box>
        ) : null}
        <Text color="greenBright">{codeLines.join("\n")}</Text>
      </Box>
    );
  }

  return <Box flexDirection="column">{elements}</Box>;
};

export default MarkdownRenderer;
