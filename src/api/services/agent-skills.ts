// agent-skills.ts — real SKILL.md engine (Cline-style):
//   1. discover  : scan <skill-name>/SKILL.md folders (project + global)
//   2. watch     : fs.watch so skills added MID-SESSION appear instantly
//   3. advertise : names/descriptions injected into system prompt + tool description
//   4. execute   : model calls the `skills` tool → full SKILL.md body loaded from disk
import { watch } from "fs";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import os from "os";

export interface AgentSkill {
	name: string;
	description: string;
	filePath: string;
	source: "project" | "global";
	disabled: boolean;
}

/** Where cmdc looks for skills — same convention as Cline / npx skills. */
function skillDirectories(cwd = process.cwd()) {
	return [
		{ p: join(cwd, ".cline", "skills"), source: "project" as const },
		{ p: join(cwd, ".claude", "skills"), source: "project" as const },
		{ p: join(cwd, ".agents", "skills"), source: "project" as const }, // canonical npx location
		{ p: join(os.homedir(), ".cmdc", "skills"), source: "global" as const },
	];
}

/** Tiny YAML frontmatter parser (same subset as Cline's parseYamlFrontmatter). */
export function parseFrontmatter(content: string): {
	data: Record<string, string>;
	body: string;
} {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(content);
	if (!m) return { data: {}, body: content };
	const data: Record<string, string> = {};
	for (const line of m[1].split(/\r?\n/)) {
		const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
		if (kv) data[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
	}
	return { data, body: m[2] };
}

export async function discoverAgentSkills(cwd = process.cwd()): Promise<AgentSkill[]> {
	const found = new Map<string, AgentSkill>(); // name → skill ; global overrides project
	for (const { p, source } of skillDirectories(cwd)) {
		let entries;
		try {
			entries = await readdir(p, { withFileTypes: true });
		} catch {
			continue; // folder missing → skip silently
		}
		for (const entry of entries) {
			const filePath = join(p, entry.name, "SKILL.md");
			let content: string;
			try {
				content = await readFile(filePath, "utf-8");
			} catch {
				continue; // no SKILL.md → not a skill
			}
			const { data } = parseFrontmatter(content);
			if (!data.name || data.name !== entry.name || !data.description) continue;
			found.set(data.name, {
				name: data.name,
				description: data.description.slice(0, 1024),
				filePath,
				source,
				disabled: data.disabled === "true",
			});
		}
	}
	return [...found.values()];
}

/**
 * Live watcher — a skill installed while cmdc runs (npx skills add …)
 * shows up on the NEXT request without restarting.
 * Returns { getSkills(), stop() }.
 */
let activeWatcher: { getSkills: () => AgentSkill[]; stop: () => void } | null = null;

export function watchAgentSkills(
	cwd = process.cwd(),
	onChange: (skills: AgentSkill[]) => void = () => {},
) {
	if (activeWatcher) return activeWatcher;

	let skills: AgentSkill[] = [];
	let timer: ReturnType<typeof setTimeout> | undefined;
	const rescan = async () => {
		const next = (await discoverAgentSkills(cwd)).sort((a, b) => a.name.localeCompare(b.name));
		const changed =
			next.length !== skills.length ||
			next.some((s, i) => s.name !== skills[i]?.name || s.description !== skills[i]?.description);
		skills = next;
		if (changed) onChange(skills);
	};
	const schedule = () => {
		clearTimeout(timer);
		timer = setTimeout(rescan, 100); // debounce burst events
	};

	let fsWatcher: ReturnType<typeof watch> | undefined;
	try {
		fsWatcher = watch(cwd, { recursive: true }, schedule);
		fsWatcher.unref?.(); // don't hold the process open just for watching
	} catch {
		/* recursive watch unsupported here → polling below still covers us */
	}
	const poll = setInterval(rescan, 5000); // safety net
	poll.unref?.();
	rescan();

	activeWatcher = {
		getSkills: () => skills,
		rescan,
		stop: () => {
			clearTimeout(timer);
			clearInterval(poll);
			fsWatcher?.close();
			activeWatcher = null;
		},
	};
	return activeWatcher;
}

/** Lazily start the watcher once and always get a fresh list. */
export function getAvailableSkills(): AgentSkill[] {
	return watchAgentSkills().getSkills();
}

/** The <available_skills> block appended to the SYSTEM PROMPT (opencode-style XML). */
export function buildSkillsPromptSection(skills: AgentSkill[]): string {
	const enabled = skills.filter((s) => !s.disabled);
	const inner =
		enabled.length === 0
			? "No skills are currently available."
			: enabled
					.flatMap((s) => [
						"<skill>",
						`<name>${s.name}</name>`,
						`<description>${s.description}</description>`,
						"</skill>",
					])
					.join("\n");
	return `<available_skills>\n${inner}\n</available_skills>`;
}

/**
 * Model called the `skills` tool → load the FULL SKILL.md body from disk
 * and return it as the tool result, exactly like Cline's use_skill.
 */
export async function executeLoadedSkill(skillName: string, args?: string): Promise<string> {
	const skill = getAvailableSkills().find((s) => s.name === skillName);
	if (!skill) {
		const available = getAvailableSkills()
			.map((s) => s.name)
			.join(", ");
		return `Skill "${skillName}" not found. Available skills: ${available || "none"}`;
	}
	if (skill.disabled) return `Skill "${skillName}" is disabled.`;
	const { body } = parseFrontmatter(await readFile(skill.filePath, "utf-8"));
	return [
		`<command-name>${skill.name}</command-name>`,
		args ? `<command-args>${args}</command-args>` : "",
		"<command-instructions>",
		body.trim(),
		"</command-instructions>",
	]
		.filter(Boolean)
		.join("\n");
}
