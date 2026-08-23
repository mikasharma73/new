/**
 * skills.ts — drop-in skills engine for your own CLI AI agent.
 * Zero dependencies. Mirrors how Cline does it:
 *
 *   1. discoverSkills()              → scan skill folders
 *   2. parseFrontmatter()            → read name/description from SKILL.md
 *   3. buildSkillsToolDescription()  → ⭐ append "Available skills: ..." for the AI
 *   4. executeSkill()                → load full body when the model calls the tool
 *
 * A skill is just:  <dir>/<skill-name>/SKILL.md  with YAML frontmatter:
 *   ---
 *   name: my-skill        # must equal folder name
 *   description: when to use it
 *   disabled: true        # optional — hides it from the AI
 *   ---
 */

import { readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** Edit these to wherever YOUR cli keeps skills. */
export function skillDirectories(cwd: string) {
	return [
		{ p: path.join(cwd, ".myskills"), source: "project" as const }, // your own folder
		// Standard locations — `npx skills add <repo> --agent <x>` installs into
		// one of these, so skills installed via npx are read automatically:
		{ p: path.join(cwd, ".agents/skills"), source: "project" as const },
		{ p: path.join(cwd, ".claude/skills"), source: "project" as const },
		{ p: path.join(cwd, ".cline/skills"), source: "project" as const },
		{ p: path.join(os.homedir(), ".agents", "skills"), source: "global" as const },
		{ p: path.join(os.homedir(), ".mycli", "skills"), source: "global" as const }, // user-global
	];
}

export interface Skill {
	name: string;
	description: string;
	filePath: string;
	disabled: boolean;
}

// ---- THE PARSER ----------------------------------------------------------
export function parseFrontmatter(content: string) {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(content);
	if (!m) return { data: {} as Record<string, string>, body: content };
	const data: Record<string, string> = {};
	for (const line of m[1].split(/\r?\n/)) {
		const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
		if (kv) data[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
	}
	return { data, body: m[2] };
}

// ---- DISCOVERY: scan folders, parse every SKILL.md ------------------------
export async function discoverSkills(cwd: string): Promise<Skill[]> {
	const found = new Map<string, Skill>(); // name → skill (global overrides project)
	for (const { p, source } of skillDirectories(cwd)) {
		let entries: string[];
		try {
			entries = await readdir(p);
		} catch {
			continue; // folder missing → skip silently
		}
		for (const dirName of entries) {
			const filePath = path.join(p, dirName, "SKILL.md");
			let content: string;
			try {
				content = await readFile(filePath, "utf-8");
			} catch {
				continue; // no SKILL.md → not a skill
			}
			const { data } = parseFrontmatter(content);
			if (typeof data.name !== "string" || data.name !== dirName) continue;
			if (typeof data.description !== "string" || !data.description) continue;
			found.set(dirName, {
				name: dirName,
				description: data.description.slice(0, 1024),
				filePath,
				disabled: data.disabled === "true",
				...(source === "global" ? {} : {}),
			});
		}
	}
	return [...found.values()];
}

// ---- ⭐ THE APPEND: what you send to the AI -------------------------------
export const SKILLS_TOOL_DESCRIPTION =
	"Execute a skill by name. When the user's request matches an available " +
	"skill, invoking this tool is required before answering. " +
	"Available skills";

export async function buildSkillsToolDescription(cwd: string): Promise<string> {
	const skills = (await discoverSkills(cwd)).filter((s) => !s.disabled);
	return skills.length
		? `${SKILLS_TOOL_DESCRIPTION}: ${skills.map((s) => s.name).join(", ")}.`
		: `${SKILLS_TOOL_DESCRIPTION}: none.`;
}

// ---- EXECUTOR: model called the tool → return full SKILL.md body ----------
export async function executeSkill(
	cwd: string,
	skillName: string,
	args?: string,
): Promise<string> {
	const skill = (await discoverSkills(cwd)).find((s) => s.name === skillName);
	if (!skill) return `Skill "${skillName}" not found.`;
	if (skill.disabled) return `Skill "${skillName}" is disabled.`;
	const { body } = parseFrontmatter(await readFile(skill.filePath, "utf-8"));
	return [
		`<command-name>${skill.name}</command-name>`,
		args ? `<command-args>${args}</command-args>` : "",
		"<command-instructions>",
		skill.description ? `Description: ${skill.description}\n\n` : "",
		body.trim(),
		"</command-instructions>",
	]
		.filter(Boolean)
		.join("\n");
}

