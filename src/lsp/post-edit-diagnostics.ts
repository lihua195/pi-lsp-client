import type { ToolResultEvent } from "@mariozechner/pi-coding-agent";

export type DiagnosticsRunner = (filePath: string) => Promise<string>;

const MUTATION_TOOL_NAMES = new Set(["write", "edit", "apply_patch"]);
const CLEAN_DIAGNOSTICS_TEXT = "No diagnostics found";

export async function appendPostEditDiagnostics(
	event: ToolResultEvent,
	runDiagnostics: DiagnosticsRunner,
): Promise<{ content: ToolResultEvent["content"] } | undefined> {
	if (event.isError || !MUTATION_TOOL_NAMES.has(event.toolName)) return undefined;

	const filePaths = extractMutatedFilePaths(event);
	if (filePaths.length === 0) return undefined;

	const blocks: string[] = [];
	for (const filePath of filePaths) {
		const diagnostics = (await runDiagnostics(filePath)).trim();
		if (diagnostics.length === 0 || diagnostics === CLEAN_DIAGNOSTICS_TEXT) continue;
		blocks.push(`\n\nLSP errors detected in ${filePath}, please fix:\n${diagnostics}`);
	}

	if (blocks.length === 0) return undefined;

	return {
		content: [...event.content, ...blocks.map((text) => ({ type: "text" as const, text }))],
	};
}

export function extractMutatedFilePaths(event: ToolResultEvent): string[] {
	const paths = new Set<string>();
	addStringValue(paths, event.input.path);
	addStringValue(paths, event.input.filePath);
	addStringArray(paths, event.input.paths);
	addStringArray(paths, event.input.filePaths);
	addPatchFiles(paths, event.input.files);
	addPatchFiles(paths, event.input.changes);
	return [...paths];
}

function addStringValue(paths: Set<string>, value: unknown): void {
	if (typeof value === "string" && value.length > 0) {
		paths.add(value);
	}
}

function addStringArray(paths: Set<string>, value: unknown): void {
	if (!Array.isArray(value)) return;
	for (const item of value) {
		addStringValue(paths, item);
	}
}

function addPatchFiles(paths: Set<string>, value: unknown): void {
	if (!Array.isArray(value)) return;
	for (const item of value) {
		if (!isRecord(item)) continue;
		addStringValue(paths, item.path);
		addStringValue(paths, item.filePath);
		addStringValue(paths, item.movePath);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
