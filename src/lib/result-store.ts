import "server-only";

import { getStore } from "@netlify/blobs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getRoundIdFromRoundNumber,
  getTournamentRoundLabel,
  isPublicDocumentKind,
  type PublicDocument,
  type PublicDocumentKind,
  type TournamentCategoryRecord,
  type TournamentDocument,
  type TournamentRoundId,
  type StoredTournamentCollection,
  type StoredTournamentData,
  type TournamentCategoryId,
} from "@/lib/tournament";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "current-results.json");
const publicDocumentsFile = path.join(dataDir, "public-documents.json");
const uploadsDir = path.join(dataDir, "uploads");
const defaultCategoryId: TournamentCategoryId = "type-1";
const blobStoreName = "testswiss-data";
const resultsBlobKey = "current-results";
const publicDocumentsBlobKey = "public-documents";
const uploadChunkPrefix = "_uploads";

type StoredFileMetadata = {
  contentType: string;
  fileName: string;
  fileSize: number;
  updatedAt: string;
};

function toArrayBuffer(input: ArrayBuffer | Uint8Array) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return Uint8Array.from(bytes).buffer;
}

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
      ("fileBlobKey" in payload ? typeof payload.fileBlobKey === "string" || payload.fileBlobKey === null : true) &&
      ("mimeType" in payload ? typeof payload.mimeType === "string" || payload.mimeType === null : true) &&
      ("fileSize" in payload
        ? typeof payload.fileSize === "number" || payload.fileSize === null
        : true) &&
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

function isPublicDocument(value: unknown): value is PublicDocument {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return Boolean(
    payload.kind &&
      typeof payload.kind === "string" &&
      isPublicDocumentKind(payload.kind) &&
      payload.title &&
      payload.sourceFileName &&
      payload.updatedAt &&
      ("dataUrl" in payload ? typeof payload.dataUrl === "string" || payload.dataUrl === null : true) &&
      ("fileBlobKey" in payload ? typeof payload.fileBlobKey === "string" || payload.fileBlobKey === null : true) &&
      ("mimeType" in payload ? typeof payload.mimeType === "string" || payload.mimeType === null : true) &&
      ("fileSize" in payload
        ? typeof payload.fileSize === "number" || payload.fileSize === null
        : true),
  );
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
            fileBlobKey: null,
            mimeType: null,
            fileSize: null,
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

function isRunningOnNetlify() {
  return Boolean(
    process.env.NETLIFY ||
      process.env.SITE_ID ||
      process.env.DEPLOY_ID ||
      process.env.CONTEXT ||
      process.env.URL,
  );
}

function getPersistentStore() {
  if (!isRunningOnNetlify()) {
    return null;
  }

  try {
    return getStore(blobStoreName, { consistency: "strong" });
  } catch {
    return null;
  }
}

function normalizeBlobKey(blobKey: string) {
  const parts = blobKey.split("/").filter(Boolean);

  if (!parts.length || parts.some((part) => part === ".." || part.includes("\\") || part.includes(":"))) {
    throw new Error("Stored file key is invalid");
  }

  return parts.join("/");
}

function getLocalUploadPath(blobKey: string) {
  return path.join(uploadsDir, ...normalizeBlobKey(blobKey).split("/"));
}

function getLocalUploadMetadataPath(blobKey: string) {
  return `${getLocalUploadPath(blobKey)}.meta.json`;
}

async function writeStoredFile(
  blobKey: string,
  data: ArrayBuffer | Uint8Array,
  metadata: StoredFileMetadata,
) {
  const normalizedKey = normalizeBlobKey(blobKey);
  const store = getPersistentStore();

  if (store) {
    try {
      await store.set(normalizedKey, toArrayBuffer(data), { metadata });
      return;
    } catch {
      // Fall back to local writes only when Blob storage is unavailable.
    }
  }

  ensureWritableFallbackAvailable();

  const filePath = getLocalUploadPath(normalizedKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(data instanceof Uint8Array ? data : new Uint8Array(data)));
  await writeFile(getLocalUploadMetadataPath(normalizedKey), JSON.stringify(metadata, null, 2), "utf8");
}

async function readStoredFile(blobKey: string) {
  const normalizedKey = normalizeBlobKey(blobKey);
  const store = getPersistentStore();

  if (store) {
    try {
      const [data, meta] = await Promise.all([
        store.get(normalizedKey, { type: "arrayBuffer" }),
        store.getMetadata(normalizedKey),
      ]);

      if (data && meta?.metadata) {
        return {
          data,
          metadata: meta.metadata as StoredFileMetadata,
        };
      }
    } catch {
      // Fall back to local reads outside Netlify Blob-enabled environments.
    }
  }

  try {
    const filePath = getLocalUploadPath(normalizedKey);
    const [fileBuffer, rawMetadata] = await Promise.all([
      readFile(filePath),
      readFile(getLocalUploadMetadataPath(normalizedKey), "utf8"),
    ]);

    return {
      data: Uint8Array.from(fileBuffer).buffer,
      metadata: JSON.parse(rawMetadata) as StoredFileMetadata,
    };
  } catch {
    return null;
  }
}

async function deleteStoredFile(blobKey: string) {
  const normalizedKey = normalizeBlobKey(blobKey);
  const store = getPersistentStore();

  if (store) {
    try {
      await store.delete(normalizedKey);
      return;
    } catch {
      // Fall back to local deletes only when Blob storage is unavailable.
    }
  }

  ensureWritableFallbackAvailable();

  const filePath = getLocalUploadPath(normalizedKey);
  await Promise.all([
    unlink(filePath).catch(() => undefined),
    unlink(getLocalUploadMetadataPath(normalizedKey)).catch(() => undefined),
  ]);
}

async function readLocalResultsFile() {
  try {
    const raw = await readFile(dataFile, "utf8");
    return normalizeStoredResults(JSON.parse(raw));
  } catch {
    return {};
  }
}

async function writeLocalResultsFile(results: StoredTournamentCollection) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(results, null, 2), "utf8");
}

async function readLocalPublicDocumentsFile() {
  try {
    const raw = await readFile(publicDocumentsFile, "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return {} as Partial<Record<PublicDocumentKind, PublicDocument>>;
    }

    const entries = Object.entries(parsed as Record<string, unknown>).flatMap(([key, value]) => {
      if (isPublicDocument(value) && value.kind === key) {
        return [[key, value] as const];
      }

      return [];
    });

    return Object.fromEntries(entries) as Partial<Record<PublicDocumentKind, PublicDocument>>;
  } catch {
    return {};
  }
}

async function writeLocalPublicDocumentsFile(
  documents: Partial<Record<PublicDocumentKind, PublicDocument>>,
) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(publicDocumentsFile, JSON.stringify(documents, null, 2), "utf8");
}

function ensureWritableFallbackAvailable() {
  if (isRunningOnNetlify()) {
    throw new Error("Netlify Blob storage is not available in this environment");
  }
}

function getUploadChunkBlobKey(uploadId: string, chunkIndex: number) {
  return `${uploadChunkPrefix}/${normalizeBlobKey(uploadId)}/${String(chunkIndex).padStart(5, "0")}`;
}

export async function writeUploadChunk(
  uploadId: string,
  chunkIndex: number,
  chunk: ArrayBuffer,
  metadata: StoredFileMetadata,
) {
  await writeStoredFile(getUploadChunkBlobKey(uploadId, chunkIndex), chunk, metadata);
}

export async function finalizeChunkedUpload(options: {
  uploadId: string;
  totalChunks: number;
  finalBlobKey: string;
  metadata: StoredFileMetadata;
}) {
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  for (let index = 0; index < options.totalChunks; index += 1) {
    const chunk = await readStoredFile(getUploadChunkBlobKey(options.uploadId, index));

    if (!chunk) {
      throw new Error("ไม่พบข้อมูลไฟล์บางส่วน กรุณาอัปโหลดใหม่อีกครั้ง");
    }

    const bytes = new Uint8Array(chunk.data);
    chunks.push(bytes);
    totalLength += bytes.byteLength;
  }

  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  await writeStoredFile(options.finalBlobKey, merged, options.metadata);

  await Promise.all(
    Array.from({ length: options.totalChunks }, (_, index) =>
      deleteStoredFile(getUploadChunkBlobKey(options.uploadId, index)).catch(() => undefined),
    ),
  );
}

export async function readStoredAsset(blobKey: string) {
  return readStoredFile(blobKey);
}

export async function readTournamentResults() {
  const store = getPersistentStore();

  if (store) {
    try {
      const blobResults = await store.get(resultsBlobKey, { type: "json" });

      if (blobResults) {
        return normalizeStoredResults(blobResults);
      }
    } catch {
      // Fall back to local file reads outside Netlify Blob-enabled environments.
    }
  }

  return readLocalResultsFile();
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

  const store = getPersistentStore();

  if (store) {
    try {
      await store.setJSON(resultsBlobKey, nextResults);
      return;
    } catch {
      // Fall back to local writes only when Blob storage is unavailable.
    }
  }

  ensureWritableFallbackAvailable();
  await writeLocalResultsFile(nextResults);
}

export async function readPublicDocuments() {
  const store = getPersistentStore();

  if (store) {
    try {
      const blobDocuments = await store.get(publicDocumentsBlobKey, { type: "json" });

      if (blobDocuments && typeof blobDocuments === "object") {
        const entries = Object.entries(blobDocuments as Record<string, unknown>).flatMap(([key, value]) => {
          if (isPublicDocument(value) && value.kind === key) {
            return [[key, value] as const];
          }

          return [];
        });

        return Object.fromEntries(entries) as Partial<Record<PublicDocumentKind, PublicDocument>>;
      }
    } catch {
      // Fall back to local file reads outside Netlify Blob-enabled environments.
    }
  }

  return readLocalPublicDocumentsFile();
}

export async function writePublicDocument(document: PublicDocument) {
  const currentDocuments = await readPublicDocuments();
  const nextDocuments = {
    ...currentDocuments,
    [document.kind]: document,
  };

  const store = getPersistentStore();

  if (store) {
    try {
      await store.setJSON(publicDocumentsBlobKey, nextDocuments);
      return;
    } catch {
      // Fall back to local writes only when Blob storage is unavailable.
    }
  }

  ensureWritableFallbackAvailable();
  await writeLocalPublicDocumentsFile(nextDocuments);
}

export async function deletePublicDocument(kind: PublicDocumentKind) {
  const currentDocuments = await readPublicDocuments();
  const currentDocument = currentDocuments[kind];

  if (!currentDocument) {
    return false;
  }

  const nextDocuments = { ...currentDocuments };
  delete nextDocuments[kind];

  const store = getPersistentStore();

  if (store) {
    try {
      await store.setJSON(publicDocumentsBlobKey, nextDocuments);
      if (currentDocument.fileBlobKey) {
        await deleteStoredFile(currentDocument.fileBlobKey).catch(() => undefined);
      }
      return true;
    } catch {
      // Fall back to local writes only when Blob storage is unavailable.
    }
  }

  ensureWritableFallbackAvailable();
  await writeLocalPublicDocumentsFile(nextDocuments);
  if (currentDocument.fileBlobKey) {
    await deleteStoredFile(currentDocument.fileBlobKey).catch(() => undefined);
  }
  return true;
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
  const deletedSharedDocument = currentCategory.sharedDocuments.find((document) => document.id === documentId) ?? null;
  const currentRound = currentCategory.rounds[roundId];
  const nextRound =
    currentRound
      ? {
          ...currentRound,
          documents: currentRound.documents.filter((document) => document.id !== documentId),
        }
      : null;
  const deletedRoundDocument =
    currentRound?.documents.find((document) => document.id === documentId) ?? null;
  const deletedDocument = deletedSharedDocument ?? deletedRoundDocument;

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

  const store = getPersistentStore();

  if (store) {
    try {
      await store.setJSON(resultsBlobKey, nextResults);
      if (deletedDocument?.fileBlobKey) {
        await deleteStoredFile(deletedDocument.fileBlobKey).catch(() => undefined);
      }
      return true;
    } catch {
      // Fall back to local writes only when Blob storage is unavailable.
    }
  }

  ensureWritableFallbackAvailable();
  await writeLocalResultsFile(nextResults);
  if (deletedDocument?.fileBlobKey) {
    await deleteStoredFile(deletedDocument.fileBlobKey).catch(() => undefined);
  }
  return true;
}
