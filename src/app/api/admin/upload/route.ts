import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminSessionCookie, isAdminAuthorized } from "@/lib/admin-auth";
import { writeTournamentDocuments } from "@/lib/result-store";
import {
  isTournamentDocumentKind,
  isTournamentCategoryId,
  isTournamentRoundId,
  type TournamentDocument,
  type TournamentDocumentKind,
  type StoredTournamentData,
  type TournamentCategoryId,
  type TournamentRoundId,
} from "@/lib/tournament";

function isValidPayload(payload: StoredTournamentData) {
  return Boolean(
    payload &&
      payload.title &&
      payload.roundLabel &&
      Array.isArray(payload.players) &&
      Array.isArray(payload.matches) &&
      payload.sourceFileName &&
      payload.updatedAt,
  );
}

type UploadPayload = {
  categoryId: TournamentCategoryId;
  roundId: TournamentRoundId;
  documentKind: TournamentDocumentKind;
  documents: TournamentDocument[];
};

function isValidDocument(document: TournamentDocument) {
  return Boolean(
    document &&
      document.id &&
      document.kind &&
      document.title &&
      document.sourceFileName &&
      document.updatedAt &&
      typeof document.contentText === "string",
  );
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(adminSessionCookie)?.value;

  if (!isAdminAuthorized(session)) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const payload = (await request.json()) as UploadPayload;

  if (
    !isTournamentCategoryId(payload?.categoryId) ||
    !isTournamentRoundId(payload?.roundId) ||
    !isTournamentDocumentKind(payload?.documentKind) ||
    !Array.isArray(payload?.documents) ||
    !payload.documents.length ||
    !payload.documents.every((document) => isValidDocument(document)) ||
    !payload.documents.every((document) => document.kind === payload.documentKind) ||
    !payload.documents.every(
      (document) =>
        document.imageDataUrl === undefined ||
        typeof document.imageDataUrl === "string" ||
        document.imageDataUrl === null,
    ) ||
    !payload.documents.every(
      (document) =>
        document.fileBlobKey === undefined ||
        typeof document.fileBlobKey === "string" ||
        document.fileBlobKey === null,
    ) ||
    !payload.documents.every(
      (document) =>
        document.mimeType === undefined ||
        typeof document.mimeType === "string" ||
        document.mimeType === null,
    ) ||
    !payload.documents.every(
      (document) =>
        document.fileSize === undefined ||
        typeof document.fileSize === "number" ||
        document.fileSize === null,
    ) ||
    !payload.documents.every(
      (document) => !document.parsedData || isValidPayload(document.parsedData as StoredTournamentData),
    )
  ) {
    return NextResponse.json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
  }

  await writeTournamentDocuments(payload.categoryId, payload.roundId, payload.documents);
  return NextResponse.json({ success: true });
}
