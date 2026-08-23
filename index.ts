/**
 * Demo: skills inside your own CLI AI agent.
 * Run: bun run index.ts
 */
import { buildSkillsToolDescription, executeSkill } from "./skills";

const cwd = import.meta.dir;

// 1️⃣ What you send to the AI — the tool definition includes skill names:
const description = await buildSkillsToolDescription(cwd);
const toolsPayload = [
	{
		name: "skills",
		description, // ← "Available skills: deploy." (disabled ones excluded)
		input_schema: {
			type: "object",
			properties: { skill: { type: "string" }, args: { type: ["string", "null"] } },
			required: ["skill"],
		},
	},
];
console.log("=== tools[] sent to your LLM ===");
console.log(JSON.stringify(toolsPayload, null, 2));

// 2️⃣ When the model calls { name: "skills", input: { skill: "deploy" } }:
console.log("\n=== model called skills { skill: 'deploy' } → tool result ===");
console.log(await executeSkill(cwd, "deploy", "--env=staging"));

// 3️⃣ Unknown / disabled skill handling:
console.log("\n=== error paths ===");
console.log(await executeSkill(cwd, "nope"));
console.log(await executeSkill(cwd, "legacy-migrate"));
