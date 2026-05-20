/**
 * pi-solo — Pi extensions for Soloterm agent orchestration.
 *
 * Commands:
 *   /fork-solo    — Fork session at a message, open as new Solo agent
 *   /dispatch     — Spawn a worker agent with a task
 *   /orchestrate  — Plan and dispatch parallel worker agents
 *
 * Tool:
 *   dispatch_solo_worker — LLM-callable tool to spawn parallel workers
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerForkSolo } from "./fork-solo.js";
import { registerDispatch } from "./dispatch.js";
import { registerOrchestrate } from "./orchestrate.js";

export default function (pi: ExtensionAPI) {
	registerForkSolo(pi);
	registerDispatch(pi);
	registerOrchestrate(pi);
}
