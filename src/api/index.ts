import Anthropic from "@anthropic-ai/sdk";
import { SysPrompt } from "./prompt.ts";
import { tools } from "./services/tools.ts";
import { executeSkill } from "./services/skills.ts";
import type { OutputMessage } from "../types.ts";

const apiKey = process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY || "";
const baseURL = process.env.DEEPSEEK_BASE_URL || process.env.BASE_URL || undefined;

export const client = new Anthropic({
    apiKey,
    baseURL,
});

export type MessageCallback = (type: OutputMessage["type"], text: string) => void;

export async function askAI(
    prompt: string,
    onMessage?: MessageCallback
): Promise<string> {
    const model = process.env.MODEL_NAME || "stealth/ox-alpha";
    const max_tokens = Number(process.env.MAX_TOKENS) || 4096;
    const system = String(SysPrompt()) || "You are a helpful coding assistant.";

    const messages: Anthropic.MessageParam[] = [
        { role: "user", content: prompt }
    ];

    let fullFinalText = "";
    let turns = 0;
    const maxTurns = 10;

    while (turns < maxTurns) {
        turns++;

        const response = await client.messages.create({
            model,
            tools,
            max_tokens,
            system,
            messages,
        });

        let currentTurnText = "";
        const toolUses: Anthropic.ToolUseBlock[] = [];

        for (const block of response.content) {
            if (block.type === "thinking") {
                const thinkingContent = (block as any).thinking;
                if (thinkingContent && onMessage) {
                    onMessage("thinking", thinkingContent);
                }
            } else if (block.type === "text") {
                currentTurnText += block.text;
            } else if (block.type === "tool_use") {
                toolUses.push(block);
            }
        }

        if (currentTurnText) {
            fullFinalText += (fullFinalText ? "\n" : "") + currentTurnText;
        }

        // If tool execution is requested by Claude
        if (response.stop_reason === "tool_use" && toolUses.length > 0) {
            // Save the assistant turn in the history
            messages.push({
                role: "assistant",
                content: response.content,
            });

            // Execute each tool and collect results
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const toolUse of toolUses) {
                if (onMessage) {
                    onMessage("tool", `Using tool: ${toolUse.name} ${JSON.stringify(toolUse.input)}`);
                }

                let result: string;
                try {
                    result = await executeSkill(toolUse.name, toolUse.input as Record<string, any>);
                } catch (err: any) {
                    result = `Error executing tool ${toolUse.name}: ${err.message || String(err)}`;
                }

                if (onMessage) {
                    onMessage("system", `↳ ${toolUse.name}: ${result.slice(0, 150)}${result.length > 150 ? '...' : ''}`);
                }

                toolResults.push({
                    type: "tool_result",
                    tool_use_id: toolUse.id,
                    content: result,
                });
            }

            // Provide tool results back to Claude
            messages.push({
                role: "user",
                content: toolResults,
            });

            // Continue loop to get Claude's follow-up or answer
            continue;
        }

        // Finished without needing more tool calls
        break;
    }

    return fullFinalText;
}