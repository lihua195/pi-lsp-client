import { describe, expect, it } from "vitest";

import { isLspDeadConnectionError, LspConnectionClosedError, LspProcessExitedError } from "../src/lsp/errors.js";

describe("LspConnectionClosedError", () => {
	it("#given new instance #when reading fields #then exposes serverId, root, and name", () => {
		// given
		const err = new LspConnectionClosedError("typescript", "/repo");

		// when / then
		expect(err.name).toBe("LspConnectionClosedError");
		expect(err.serverId).toBe("typescript");
		expect(err.root).toBe("/repo");
		expect(err.message).toContain("connection closed");
	});

	it("#given a custom message #when constructing #then uses that message", () => {
		// given
		const err = new LspConnectionClosedError("typescript", "/repo", "explicit reason");

		// when / then
		expect(err.message).toBe("explicit reason");
	});
});

describe("LspProcessExitedError", () => {
	it("#given exit code #when constructing #then includes serverId, root, and exit code in message", () => {
		// given
		const err = new LspProcessExitedError("rust", "/repo", 137, "boom");

		// when / then
		expect(err.name).toBe("LspProcessExitedError");
		expect(err.serverId).toBe("rust");
		expect(err.exitCode).toBe(137);
		expect(err.stderrTail).toBe("boom");
		expect(err.message).toContain("exited with code 137");
		expect(err.message).toContain("stderr tail: boom");
	});

	it("#given null exit code #when constructing #then renders null cleanly", () => {
		// given
		const err = new LspProcessExitedError("typescript", "/repo", null);

		// when / then
		expect(err.message).toContain("exited with code null");
	});
});

describe("isLspDeadConnectionError", () => {
	it("#given a connection error #when classifying #then returns true", () => {
		// given
		const err = new LspConnectionClosedError("typescript", "/repo");

		// when / then
		expect(isLspDeadConnectionError(err)).toBe(true);
	});

	it("#given a process exit error #when classifying #then returns true", () => {
		// given
		const err = new LspProcessExitedError("typescript", "/repo", 1);

		// when / then
		expect(isLspDeadConnectionError(err)).toBe(true);
	});

	it("#given a generic error #when classifying #then returns false", () => {
		// given / when / then
		expect(isLspDeadConnectionError(new Error("nope"))).toBe(false);
		expect(isLspDeadConnectionError("string")).toBe(false);
		expect(isLspDeadConnectionError(null)).toBe(false);
	});
});
