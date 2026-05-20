/**
 * Fork-Solo — fork session at a message and open as new Soloterm Pi agent.
 * Current session stays intact.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getProjectId, spawnAgent, discoverPiToolId } from "../src/solo-cli.js";
import { createForkedSession } from "../src/session.js";

export function registerForkSolo(pi: ExtensionAPI) {
	pi.registerCommand("fork-solo", {
		description: "Fork session at a message and open as new Soloterm agent",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("fork-solo requires interactive mode", "error");
				return;
			}

			const sessionFile = ctx.sessionManager.getSessionFile();
			if (!sessionFile) {
				ctx.ui.notify("No session file (ephemeral session)", "error");
				return;
			}

			let projectId: string;
			try {
				projectId = getProjectId();
			} catch (err: any) {
				ctx.ui.notify(err.message, "error");
				return;
			}

			// Collect user messages
			const branch = ctx.sessionManager.getBranch();
			const userMessages = collectUserMessages(branch);

			if (userMessages.length === 0) {
				ctx.ui.notify("No user messages to fork from", "error");
				return;
			}

			const selected = await ctx.ui.select(
				"Fork from which message?",
				userMessages.map((m) => m.label),
			);

			if (selected === null || selected === undefined) {
				ctx.ui.notify("Fork cancelled", "info");
				return;
			}

			const selectedMsg = userMessages.find((m) => m.label === selected);
			if (!selectedMsg) {
				ctx.ui.notify("Selection error", "error");
				return;
			}

			const forkedSessionFile = await createForkedSession(ctx, sessionFile, branch, selectedMsg.id);
			if (!forkedSessionFile) {
				ctx.ui.notify("Failed to create forked session", "error");
				return;
			}

			try {
				const piToolId = discoverPiToolId(projectId);
				const spawnArgs = ["--session", forkedSessionFile];
				const message = args.trim();
				if (message) {
					spawnArgs.push("--", message);
				}

				const result = spawnAgent({
					projectId,
					agentToolId: piToolId,
					name: `fork: ${selectedMsg.label.slice(0, 40)}`,
					args: spawnArgs,
				});

				ctx.ui.notify(`Forked → Solo agent #${result.processId}`, "success");
			} catch (err: any) {
				ctx.ui.notify(`Solo spawn failed: ${err.message}`, "error");
			}
		},
	});
}

function collectUserMessages(branch: any[]): { id: string; label: string }[] {
	const messages: { id: string; label: string }[] = [];
	for (const entry of branch) {
		if (entry.type === "message" && entry.message.role === "user") {
			const content = entry.message.content;
			let preview: string;
			if (typeof content === "string") {
				preview = content;
			} else if (Array.isArray(content)) {
				const textPart = content.find((p: any) => p.type === "text");
				preview = textPart ? (textPart as any).text : "(non-text message)";
			} else {
				preview = "(empty)";
			}
			preview = preview.replace(/\n/g, " ").trim();
			if (preview.length > 80) preview = preview.slice(0, 77) + "...";
			messages.push({ id: entry.id, label: preview });
		}
	}
	return messages;
}
