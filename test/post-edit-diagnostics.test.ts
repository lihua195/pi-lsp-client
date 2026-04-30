import type { ToolResultEvent } from "@mariozechner/pi-coding-agent";
import { describe, expect, it } from "vitest";

import { appendPostEditDiagnostics } from "../src/lsp/post-edit-diagnostics.js";

function writeEvent(path: string): ToolResultEvent {
	return {
		type: "tool_result",
		toolCallId: "call-1",
		toolName: "write",
		input: { path, content: "export const value: string = 123;" },
		content: [{ type: "text", text: "Wrote file successfully." }],
		isError: false,
		details: undefined,
	};
}

function editEvent(path: string): ToolResultEvent {
	return {
		type: "tool_result",
		toolCallId: "call-2",
		toolName: "edit",
		input: { path, edits: [{ oldText: "123", newText: "456" }] },
		content: [{ type: "text", text: "Edit applied successfully." }],
		isError: false,
		details: { diff: "--- a/file.ts\n+++ b/file.ts" },
	};
}

function applyPatchEvent(paths: string[]): ToolResultEvent {
	return {
		type: "tool_result",
		toolCallId: "call-3",
		toolName: "apply_patch",
		input: { paths },
		content: [{ type: "text", text: "Patch applied successfully." }],
		isError: false,
		details: undefined,
	};
}

describe("post-edit diagnostics", () => {
	it("#given write tool result with diagnostics #when appending post-edit diagnostics #then adds LSP error block", async () => {
		// given
		const event = writeEvent("src/broken.ts");

		// when
		const result = await appendPostEditDiagnostics(event, async (filePath) => {
			expect(filePath).toBe("src/broken.ts");
			return "error[typescript] (2322) at 1:13: Type 'number' is not assignable to type 'string'.";
		});

		// then
		expect(result?.content).toEqual([
			{ type: "text", text: "Wrote file successfully." },
			{
				type: "text",
				text:
					"\n\nLSP errors detected in src/broken.ts, please fix:\n" +
					"error[typescript] (2322) at 1:13: Type 'number' is not assignable to type 'string'.",
			},
		]);
	});

	it("#given edit tool result with no diagnostics #when appending post-edit diagnostics #then leaves content unchanged", async () => {
		// given
		const event = editEvent("src/clean.ts");

		// when
		const result = await appendPostEditDiagnostics(event, async () => "No diagnostics found");

		// then
		expect(result).toBeUndefined();
	});

	it("#given apply_patch result with multiple files #when appending post-edit diagnostics #then adds one block per file with diagnostics", async () => {
		// given
		const event = applyPatchEvent(["src/a.ts", "src/b.ts"]);

		// when
		const result = await appendPostEditDiagnostics(event, async (filePath) => {
			if (filePath === "src/a.ts") return "No diagnostics found";
			return "error[typescript] (2304) at 1:1: Cannot find name 'missing'.";
		});

		// then
		expect(result?.content).toEqual([
			{ type: "text", text: "Patch applied successfully." },
			{
				type: "text",
				text:
					"\n\nLSP errors detected in src/b.ts, please fix:\n" +
					"error[typescript] (2304) at 1:1: Cannot find name 'missing'.",
			},
		]);
	});

	it("#given failed mutation result #when appending post-edit diagnostics #then skips diagnostics", async () => {
		// given
		const event = { ...writeEvent("src/broken.ts"), isError: true };

		// when
		const result = await appendPostEditDiagnostics(event, async () => {
			throw new Error("should not run");
		});

		// then
		expect(result).toBeUndefined();
	});
});
