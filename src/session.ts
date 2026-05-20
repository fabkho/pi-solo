/**
 * Session utilities — create forked session files.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Create a forked session file containing entries up to (before) the selected message.
 */
export async function createForkedSession(
	ctx: { sessionManager: any; cwd: string },
	sessionFile: string,
	branch: any[],
	forkBeforeEntryId: string,
): Promise<string | undefined> {
	const sessionDir = path.dirname(sessionFile);
	const currentHeader = ctx.sessionManager.getHeader();

	const entriesToKeep = [];
	for (const entry of branch) {
		if (entry.id === forkBeforeEntryId) break;
		entriesToKeep.push(entry);
	}

	const timestamp = new Date().toISOString();
	const fileTimestamp = timestamp.replace(/[:.]/g, "-");
	const newSessionId = randomUUID();
	const newSessionFile = path.join(sessionDir, `${fileTimestamp}_${newSessionId}.jsonl`);

	const newHeader = {
		type: "session",
		version: currentHeader?.version ?? 3,
		id: newSessionId,
		timestamp,
		cwd: currentHeader?.cwd ?? ctx.cwd,
		parentSession: sessionFile,
	};

	const lines =
		[JSON.stringify(newHeader), ...entriesToKeep.map((entry: any) => JSON.stringify(entry))].join(
			"\n",
		) + "\n";

	await fs.mkdir(sessionDir, { recursive: true });
	await fs.writeFile(newSessionFile, lines, "utf8");
	return newSessionFile;
}
