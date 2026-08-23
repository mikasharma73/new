import { resolve, dirname } from "path";
import { existsSync, mkdirSync, readdirSync } from "fs";

/**
 * Skill to execute shell / terminal commands.
 */
export async function executeCommandSkill(command: string): Promise<string> {
  try {
    const isWin = process.platform === "win32";
    const proc = Bun.spawn({
      cmd: isWin ? ["cmd", "/c", command] : ["sh", "-c", command],
      stdout: "pipe",
      stderr: "pipe",
      cwd: process.cwd(),
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    let output = "";
    if (stdout.trim()) output += stdout;
    if (stderr.trim()) output += (output ? "\n[stderr]\n" : "") + stderr;
    if (!output.trim()) {
      output = `Command exited with code ${exitCode}`;
    }
    return output.trim();
  } catch (error: any) {
    return `Error executing command "${command}": ${error.message || String(error)}`;
  }
}

/**
 * Skill to list directory contents.
 */
export async function listDirectorySkill(dirPath: string = "."): Promise<string> {
  try {
    const fullPath = resolve(process.cwd(), dirPath);
    if (!existsSync(fullPath)) {
      return `Error: Directory not found at path "${dirPath}"`;
    }
    const entries = readdirSync(fullPath, { withFileTypes: true });
    const formatted = entries.map((entry) => {
      return `${entry.isDirectory() ? "[DIR] " : "      "}${entry.name}`;
    });
    return formatted.join("\n") || "(empty directory)";
  } catch (error: any) {
    return `Error listing directory "${dirPath}": ${error.message || String(error)}`;
  }
}

/**
 * Skill to read the contents of a file from the local file system.
 */
export async function readFileSkill(filePath: string): Promise<string> {
  try {
    const fullPath = resolve(process.cwd(), filePath);
    if (!existsSync(fullPath)) {
      return `Error: File not found at path "${filePath}"`;
    }
    const file = Bun.file(fullPath);
    const content = await file.text();
    return content;
  } catch (error: any) {
    return `Error reading file "${filePath}": ${error.message || String(error)}`;
  }
}

/**
 * Skill to write content to a file on the local file system.
 */
export async function writeFileSkill(filePath: string, content: string): Promise<string> {
  try {
    const fullPath = resolve(process.cwd(), filePath);
    const dir = dirname(fullPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    await Bun.write(fullPath, content);
    return `Successfully wrote to "${filePath}".`;
  } catch (error: any) {
    return `Error writing to file "${filePath}": ${error.message || String(error)}`;
  }
}

/**
 * Main dispatcher to execute registered skills based on tool call name.
 */
export async function executeSkill(
  name: string,
  input: Record<string, any>
): Promise<string> {
  switch (name) {
    case "execute_command":
    case "cmd":
    case "run_command":
      return await executeCommandSkill(input.command || input.cmd || "");
    case "list_directory":
    case "list_dir":
      return await listDirectorySkill(input.path || input.dirPath || ".");
    case "read_file":
      return await readFileSkill(input.path || input.filePath);
    case "write_file":
      return await writeFileSkill(input.path || input.filePath, input.content ?? "");
    default:
      return `Error: Unknown tool "${name}"`;
  }
}
