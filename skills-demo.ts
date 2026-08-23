/**
 * Demo: verify npx-installed skills are auto-read.
 * Run: bun run skills-demo.ts
 */
import { buildSkillsToolDescription, executeSkill } from "./skills";

const cwd = import.meta.dir;

// 1️⃣ What you send to the AI:
console.log("=== skills tool description sent to the AI ===");
console.log(await buildSkillsToolDescription(cwd));

// 2️⃣ Trigger an npx-installed skill (lives in .agents/skills/pdf-export):
console.log("\n=== executeSkill('pdf-export') — installed via npx-style folder ===");
console.log(await executeSkill(cwd, "pdf-export", "--file report.md"));
