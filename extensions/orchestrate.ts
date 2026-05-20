/**
 * /orchestrate — Multi-agent orchestration via Soloterm.
 *
 * Flow:
 *   1. Interview user to understand the goal (or accept a pre-written plan)
 *   2. Break into parallel work lanes
 *   3. Spawn Pi worker agents in Solo for each independent lane
 *   4. Report spawned workers and how to check on them
 *
 * Usage:
 *   /orchestrate                  — start interactive interview
 *   /orchestrate <plan or goal>   — skip interview, go straight to dispatch
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getProjectId, spawnAgent, discoverPiToolId, listProcesses } from "../src/solo-cli.js";

export function registerOrchestrate(pi: ExtensionAPI) {
	pi.registerCommand("orchestrate", {
		description: "Plan parallel work and dispatch Solo worker agents",
		handler: async (args, ctx) => {
			let projectId: string;
			try {
				projectId = getProjectId();
			} catch (err: any) {
				ctx.ui.notify(err.message, "error");
				return;
			}

			const goal = args.trim();

			if (!goal) {
				// No goal provided — inject orchestration prompt into conversation
				ctx.ui.notify("Starting orchestration interview...", "info");
				return;
			}

			// Goal provided — ask user to confirm lanes before dispatching
			if (!ctx.hasUI) {
				ctx.ui.notify("orchestrate requires interactive mode", "error");
				return;
			}

			const confirm = await ctx.ui.confirm(
				"Dispatch workers",
				`Spawn parallel Pi agents for:\n\n${goal}\n\nProceed?`,
			);

			if (!confirm) {
				ctx.ui.notify("Orchestration cancelled", "info");
				return;
			}

			try {
				const piToolId = discoverPiToolId(projectId);

				// Parse lanes from goal (split by newlines or semicolons)
				const lanes = parseLanes(goal);

				if (lanes.length === 0) {
					// Single task — spawn one worker
					const result = spawnAgent({
						projectId,
						agentToolId: piToolId,
						name: `worker: ${goal.slice(0, 47)}`,
						args: ["--", goal],
					});
					ctx.ui.notify(`1 worker spawned → #${result.processId}`, "success");
					return;
				}

				// Multiple lanes — spawn workers
				const spawned: { lane: string; processId: number }[] = [];
				const failed: { lane: string; error: string }[] = [];

				for (const lane of lanes) {
					try {
						const result = spawnAgent({
							projectId,
							agentToolId: piToolId,
							name: `worker: ${lane.slice(0, 47)}`,
							args: ["--", lane],
						});
						spawned.push({ lane, processId: result.processId });
					} catch (err: any) {
						failed.push({ lane, error: err.message });
					}
				}

				const summary = [
					`${spawned.length} workers spawned`,
					...spawned.map((s) => `  #${s.processId}: ${s.lane.slice(0, 60)}`),
					...(failed.length > 0
						? [`${failed.length} failed:`, ...failed.map((f) => `  ✗ ${f.lane.slice(0, 50)}: ${f.error}`)]
						: []),
				].join("\n");

				ctx.ui.notify(summary, failed.length > 0 ? "warning" : "success");
			} catch (err: any) {
				ctx.ui.notify(`Orchestration failed: ${err.message}`, "error");
			}
		},
	});

	// Register the orchestrate tool so LLM can dispatch workers programmatically
	pi.registerTool({
		name: "dispatch_solo_worker",
		label: "Dispatch Solo Worker",
		description:
			"Spawn a new Pi agent in Soloterm as a parallel worker. " +
			"Use this when you've identified independent work lanes that can run in parallel. " +
			"Each worker gets its own Solo agent process with the given task as initial prompt.",
		schema: {
			type: "object",
			properties: {
				task: {
					type: "string",
					description: "The complete task/prompt for the worker agent. Be specific about files, constraints, and expected output.",
				},
				name: {
					type: "string",
					description: "Short label for the worker (shown in Solo sidebar). Max 50 chars.",
				},
			},
			required: ["task"],
		},
		handler: async (input: { task: string; name?: string }, ctx) => {
			let projectId: string;
			try {
				projectId = getProjectId();
			} catch (err: any) {
				return { error: err.message };
			}

			try {
				const piToolId = discoverPiToolId(projectId);
				const label = input.name || input.task.slice(0, 47);

				const result = spawnAgent({
					projectId,
					agentToolId: piToolId,
					name: `worker: ${label}`,
					args: ["--", input.task],
				});

				return {
					success: true,
					processId: result.processId,
					name: result.name,
					message: `Worker spawned as Solo agent #${result.processId}`,
				};
			} catch (err: any) {
				return { error: `Dispatch failed: ${err.message}` };
			}
		},
	});
}

/**
 * Parse a multi-line goal into individual work lanes.
 * Splits on newlines, numbered lists, or semicolons.
 */
function parseLanes(text: string): string[] {
	const lines = text
		.split(/\n|;/)
		.map((l) => l.replace(/^\s*[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
		.filter((l) => l.length > 10); // ignore very short fragments

	// If only 1 line after splitting, it's a single task
	return lines.length > 1 ? lines : [];
}
