import type Anthropic from "@anthropic-ai/sdk";
import { getAvailableSkills } from "./agent-skills.ts";

const SKILLS_TOOL_BASE_DESCRIPTION =
  "Execute a skill within the main conversation. " +
  "When users ask you to perform tasks, check if any available skills match. " +
  'Input: `skill` (required) and optional `args`. ' +
  "When a skill matches the user's request, invoking this tool is required before any other response.";

export const tools: Anthropic.Tool[] = [
  {
    name: "execute_command",
    description: "Execute a shell or terminal command (e.g. dir, ls, cd, git, npm, bun, find, etc.) on the local system.",
    input_schema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The command line string to run.",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "list_directory",
    description: "List files and subdirectories in a directory path.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The directory path to list (defaults to current working directory if omitted).",
        },
      },
    },
  },
  {
    name: "read_file",
    description: "Read the contents of a file from the local file system.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The path of the file to read (relative to workspace or absolute).",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write or update content to a file in the local file system. Automatically creates parent directories if needed.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The path of the file to write to (relative to workspace or absolute).",
        },
        content: {
          type: "string",
          description: "The full content to write to the file.",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "skills",
    // ⭐ LIVE GETTER (Cline-style): re-evaluated every time the request body is
    // serialized, so newly watched skills appear without any restart.
    get description(): string {
      const names = getAvailableSkills().filter((s) => !s.disabled).map((s) => s.name);
      return names.length
        ? `${SKILLS_TOOL_BASE_DESCRIPTION} Available skills: ${names.join(", ")}.`
        : `${SKILLS_TOOL_BASE_DESCRIPTION}`;
    },
    input_schema: {
      type: "object",
      properties: {
        skill: {
          type: "string",
          description: "Name of the skill to load (must match an available skill name).",
        },
        args: {
          type: "string",
          description: "Optional arguments passed through to the skill.",
        },
      },
      required: ["skill"],
    },
  } as Anthropic.Tool,
];
