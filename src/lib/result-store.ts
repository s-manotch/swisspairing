import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { StoredTournamentData } from "@/lib/tournament";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "current-results.json");

export async function readCurrentTournamentData() {
  try {
    const raw = await readFile(dataFile, "utf8");
    return JSON.parse(raw) as StoredTournamentData;
  } catch {
    return null;
  }
}

export async function writeCurrentTournamentData(data: StoredTournamentData) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(data, null, 2), "utf8");
}
