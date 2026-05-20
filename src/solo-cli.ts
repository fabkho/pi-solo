/**
 * Soloterm CLI wrapper — thin interface to solo-cli processes, projects, etc.
 */

import { execFileSync } from "node:child_process";

const SOLO_CLI = "/Applications/Solo.app/Contents/MacOS/solo-cli";

export interface SoloProject {
	id: number;
	name: string;
	path: string;
}

export interface SoloProcess {
	id: number;
	name: string;
	command: string;
	status: string;
	projectId: number;
	projectName: string;
	pid?: number;
	uptimeSeconds?: number;
}

export interface SpawnResult {
	processId: number;
	projectId: number;
	name: string;
	kind: string;
	started: boolean;
}

function solo(args: string[]): any {
	const result = execFileSync(SOLO_CLI, [...args, "--json"], {
		encoding: "utf8",
		timeout: 5000,
	});
	const parsed = JSON.parse(result);
	if (!parsed.ok) {
		throw new Error(parsed.error?.message || "solo-cli command failed");
	}
	return parsed.data;
}

export function getProjectId(): string {
	const id = process.env.SOLO_PROJECT_ID;
	if (!id) throw new Error("Not running inside Soloterm (SOLO_PROJECT_ID missing)");
	return id;
}

export function listProjects(): SoloProject[] {
	return solo(["projects", "list"]).projects;
}

export function listProcesses(projectId: string): SoloProcess[] {
	return solo(["processes", "list", "--project-id", projectId]).processes;
}

export function getProcess(processId: number): SoloProcess {
	return solo(["processes", "get", String(processId)]);
}

export function spawnAgent(opts: {
	projectId: string;
	agentToolId: string;
	name: string;
	args?: string[];
}): SpawnResult {
	const cliArgs = [
		"processes", "spawn",
		"--project-id", opts.projectId,
		"--kind", "agent",
		"--agent-tool-id", opts.agentToolId,
		"--name", opts.name,
	];
	if (opts.args) {
		for (const arg of opts.args) {
			cliArgs.push("--arg", arg);
		}
	}
	return solo(cliArgs);
}

export function spawnTerminal(opts: {
	projectId: string;
	name: string;
}): SpawnResult {
	return solo([
		"processes", "spawn",
		"--project-id", opts.projectId,
		"--kind", "terminal",
		"--name", opts.name,
	]);
}

export function stopProcess(processId: number): void {
	solo(["processes", "stop", String(processId)]);
}

export function sendInput(processId: number, text: string): void {
	// send_input is MCP-only, not in CLI — use processes restart or AppleScript fallback
	throw new Error("send_input not available via CLI — use MCP");
}

/**
 * Discover the Pi agent tool ID by spawning a test agent and checking its command.
 * Caches the result for the session.
 */
let cachedPiToolId: string | undefined;

export function discoverPiToolId(projectId: string): string {
	if (cachedPiToolId) return cachedPiToolId;

	// Try IDs until we find one with command "pi"
	for (let id = 1; id <= 20; id++) {
		try {
			const result = spawnAgent({
				projectId,
				agentToolId: String(id),
				name: "__pi_discovery__",
			});
			const proc = solo(["processes", "get", String(result.processId)]);
			stopProcess(result.processId);

			if (proc.command === "pi") {
				cachedPiToolId = String(id);
				return cachedPiToolId;
			}
		} catch {
			// disabled or not found — skip
		}
	}
	throw new Error("Could not find Pi agent tool in Solo settings. Configure pi as an agent tool in Solo Settings → Agents.");
}
