import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminSessionCookie, isAdminAuthorized } from "@/lib/admin-auth";
import { deletePublicDocument, writePublicDocument } from "@/lib/result-store";
import { isPublicDocumentKind, type PublicDocument, type PublicDocumentKind } from "@/lib/tournament";

type UploadPayload = {
  document: PublicDocument;
};

type DeletePayload = {
  kind: PublicDocumentKind;
};

function isValidPublicDocument(document: PublicDocument) {
  return Boolean(
    document &&
      document.kind &&
      isPublicDocumentKind(document.kind) &&
      document.title &&
      document.sourceFileName &&
      document.updatedAt &&
      ((typeof document.dataUrl === "string" && document.dataUrl.startsWith("data:application/pdf")) ||
        typeof document.fileBlobKey === "string") &&
      (document.mimeType === undefined ||
        document.mimeType === null ||
        document.mimeType === "application/pdf") &&
      (document.fileSize === undefined ||
        document.fileSize === null ||
        typeof document.fileSize === "number"),
  );
}

async function ensureAdminAuthorized() {
  const cookieStore = await cookies();
  const session = cookieStore.get(adminSessionCookie)?.value;

  if (!isAdminAuthorized(session)) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const unauthorizedResponse = await ensureAdminAuthorized();

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const payload = (await request.json()) as UploadPayload;

    if (!isValidPublicDocument(payload?.document)) {
      return NextResponse.json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
    }

    await writePublicDocument(payload.document);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "อัปโหลดไฟล์ PDF ไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const unauthorizedResponse = await ensureAdminAuthorized();

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const payload = (await request.json()) as DeletePayload;

    if (!isPublicDocumentKind(payload?.kind)) {
      return NextResponse.json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
    }

    const deleted = await deletePublicDocument(payload.kind);

    if (!deleted) {
      return NextResponse.json({ error: "ไม่พบไฟล์ที่ต้องการลบ" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ลบไฟล์ PDF ไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
