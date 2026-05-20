/**
 * /dispatch — Spawn a Pi worker agent in Solo with a focused task.
 *
 * Usage:
 *   /dispatch <task description>
 *   /dispatch Fix the login form validation in src/components/LoginForm.vue
 *
 * Spawns a new Pi agent in Soloterm with the task as initial prompt.
 * The worker operates independently in the same project.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getProjectId, spawnAgent, discoverPiToolId } from "../src/solo-cli.js";

export function registerDispatch(pi: ExtensionAPI) {
	pi.registerCommand("dispatch", {
		description: "Spawn a Pi worker agent in Soloterm with a task",
		handler: async (args, ctx) => {
			const task = args.trim();
			if (!task) {
				ctx.ui.notify("Usage: /dispatch <task description>", "error");
				return;
			}

			let projectId: string;
			try {
				projectId = getProjectId();
			} catch (err: any) {
				ctx.ui.notify(err.message, "error");
				return;
			}

			try {
				const piToolId = discoverPiToolId(projectId);

				// Create a short label from the task
				const label = task.length > 50 ? task.slice(0, 47) + "..." : task;

				const result = spawnAgent({
					projectId,
					agentToolId: piToolId,
					name: `worker: ${label}`,
					args: ["--", task],
				});

				ctx.ui.notify(`Worker spawned → Solo agent #${result.processId}`, "success");
			} catch (err: any) {
				ctx.ui.notify(`Dispatch failed: ${err.message}`, "error");
			}
		},
	});
}
