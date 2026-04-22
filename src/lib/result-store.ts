import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getRoundIdFromRoundNumber,
  getTournamentRoundLabel,
  type TournamentCategoryRecord,
  type TournamentDocument,
  type TournamentRoundId,
  type StoredTournamentCollection,
  type StoredTournamentData,
  type TournamentCategoryId,
} from "@/lib/tournament";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "current-results.json");
const defaultCategoryId: TournamentCategoryId = "type-1";

function isStoredTournamentData(value: unknown): value is StoredTournamentData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return Boolean(
    payload.title &&
      payload.roundLabel &&
      Array.isArray(payload.players) &&
      Array.isArray(payload.matches) &&
      payload.sourceFileName &&
      payload.updatedAt,
  );
}

function isTournamentDocument(value: unknown): value is TournamentDocument {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return Boolean(
    payload.id &&
      payload.kind &&
      payload.title &&
      payload.sourceFileName &&
      payload.updatedAt &&
      typeof payload.contentText === "string" &&
      ("imageDataUrl" in payload ? typeof payload.imageDataUrl === "string" || payload.imageDataUrl === null : true) &&
      "parsedData" in payload,
  );
}

function isTournamentCategoryRecord(value: unknown): value is TournamentCategoryRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  const rounds = payload.rounds;
  const sharedDocuments = payload.sharedDocuments;

  if (
    !payload.categoryId ||
    !Array.isArray(sharedDocuments) ||
    !sharedDocuments.every((document) => isTournamentDocument(document)) ||
    !rounds ||
    typeof rounds !== "object"
  ) {
    return false;
  }

  return Object.values(rounds as Record<string, unknown>).every((round) => {
    if (!round || typeof round !== "object") {
      return false;
    }

    const record = round as Record<string, unknown>;
    return Boolean(
      record.roundId &&
        record.roundLabel &&
        Array.isArray(record.documents) &&
        record.documents.every((document) => isTournamentDocument(document)),
    );
  });
}

function isLegacyTournamentCategoryRecord(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  const rounds = payload.rounds;

  if (!payload.categoryId || !rounds || typeof rounds !== "object") {
    return false;
  }

  return Object.values(rounds as Record<string, unknown>).every((round) => {
    if (!round || typeof round !== "object") {
      return false;
    }

    const record = round as Record<string, unknown>;
    return Boolean(
      record.roundId &&
        record.roundLabel &&
        Array.isArray(record.documents) &&
        record.documents.every((document) => isTournamentDocument(document)),
    );
  });
}

function migrateLegacyCategoryRecord(value: unknown): TournamentCategoryRecord | null {
  if (!isLegacyTournamentCategoryRecord(value)) {
    return null;
  }

  const payload = value as Record<string, unknown>;

  return {
    categoryId: payload.categoryId as TournamentCategoryId,
    sharedDocuments: [],
    rounds: payload.rounds as TournamentCategoryRecord["rounds"],
  };
}

function extractRoundNumber(value: string) {
  const round = Number.parseInt(value, 10);
  return Number.isFinite(round) && round > 0 ? round : 1;
}

function createRoundRecord(roundId: TournamentRoundId) {
  return {
    roundId,
    roundLabel: getTournamentRoundLabel(roundId),
    documents: [],
  };
}

function migrateLegacyData(data: StoredTournamentData): TournamentCategoryRecord {
  const roundId = getRoundIdFromRoundNumber(extractRoundNumber(data.roundLabel));

  return {
    categoryId: defaultCategoryId,
    sharedDocuments: [],
    rounds: {
      [roundId]: {
        roundId,
        roundLabel: getTournamentRoundLabel(roundId),
        documents: [
          {
            id: `${roundId}-${data.updatedAt}`,
            kind: "results",
            title: data.title,
            sourceFileName: data.sourceFileName,
            updatedAt: data.updatedAt,
            contentText: data.matches
              .map((match) => `${match.board}. ${match.leftName} ${match.result} ${match.rightName}`)
              .join("\n"),
            imageDataUrl: null,
            parsedData: data,
          },
        ],
      },
    },
  };
}

function normalizeStoredResults(value: unknown): StoredTournamentCollection {
  if (isStoredTournamentData(value)) {
    return { [defaultCategoryId]: migrateLegacyData(value) };
  }

  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
    if (isTournamentCategoryRecord(item)) {
      return [[key, item] as const];
    }

    const migratedCategory = migrateLegacyCategoryRecord(item);

    if (migratedCategory) {
      return [[key, migratedCategory] as const];
    }

    if (isStoredTournamentData(item)) {
      return [[key, migrateLegacyData(item)] as const];
    }

    return [];
  });

  return Object.fromEntries(entries) as StoredTournamentCollection;
}

export async function readTournamentResults() {
  try {
    const raw = await readFile(dataFile, "utf8");
    return normalizeStoredResults(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function readCurrentTournamentData(categoryId: TournamentCategoryId = defaultCategoryId) {
  const results = await readTournamentResults();
  const category = results[categoryId];

  if (!category) {
    return null;
  }

  const latestRound = Object.values(category.rounds)
    .filter(Boolean)
    .sort((left, right) => right!.roundId.localeCompare(left!.roundId))[0];

  if (!latestRound) {
    return null;
  }

  return latestRound.documents.find((document) => document.parsedData)?.parsedData ?? null;
}

export async function writeTournamentDocuments(
  categoryId: TournamentCategoryId,
  roundId: TournamentRoundId,
  documents: TournamentDocument[],
) {
  const currentResults = await readTournamentResults();
  const currentCategory = currentResults[categoryId] ?? {
    categoryId,
    sharedDocuments: [],
    rounds: {},
  };
  const currentRound = currentCategory.rounds[roundId] ?? createRoundRecord(roundId);
  const sharedDocuments = documents.filter((document) => document.kind === "players");
  const roundDocuments = documents.filter((document) => document.kind !== "players");
  const nextResults: StoredTournamentCollection = {
    ...currentResults,
    [categoryId]: {
      ...currentCategory,
      sharedDocuments: [...currentCategory.sharedDocuments, ...sharedDocuments],
      rounds: {
        ...currentCategory.rounds,
        [roundId]: {
          ...currentRound,
          documents: [...currentRound.documents, ...roundDocuments],
        },
      },
    },
  };

  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(nextResults, null, 2), "utf8");
}

export async function deleteTournamentDocument(
  categoryId: TournamentCategoryId,
  roundId: TournamentRoundId,
  documentId: string,
) {
  const currentResults = await readTournamentResults();
  const currentCategory = currentResults[categoryId];

  if (!currentCategory) {
    return false;
  }

  const nextSharedDocuments = currentCategory.sharedDocuments.filter(
    (document) => document.id !== documentId,
  );
  const currentRound = currentCategory.rounds[roundId];
  const nextRound =
    currentRound
      ? {
          ...currentRound,
          documents: currentRound.documents.filter((document) => document.id !== documentId),
        }
      : null;

  const sharedChanged = nextSharedDocuments.length !== currentCategory.sharedDocuments.length;
  const roundChanged = currentRound ? nextRound!.documents.length !== currentRound.documents.length : false;

  if (!sharedChanged && !roundChanged) {
    return false;
  }

  const nextResults: StoredTournamentCollection = {
    ...currentResults,
    [categoryId]: {
      ...currentCategory,
      sharedDocuments: nextSharedDocuments,
      rounds: {
        ...currentCategory.rounds,
        ...(nextRound ? { [roundId]: nextRound } : {}),
      },
    },
  };

  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(nextResults, null, 2), "utf8");
  return true;
}
