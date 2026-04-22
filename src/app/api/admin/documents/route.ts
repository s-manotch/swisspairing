import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminSessionCookie, isAdminAuthorized } from "@/lib/admin-auth";
import { deleteTournamentDocument } from "@/lib/result-store";
import {
  isTournamentCategoryId,
  isTournamentRoundId,
  type TournamentCategoryId,
  type TournamentRoundId,
} from "@/lib/tournament";

type DeletePayload = {
  categoryId: TournamentCategoryId;
  roundId: TournamentRoundId;
  documentId: string;
};

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(adminSessionCookie)?.value;

  if (!isAdminAuthorized(session)) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const payload = (await request.json()) as DeletePayload;

  if (
    !isTournamentCategoryId(payload?.categoryId) ||
    !isTournamentRoundId(payload?.roundId) ||
    !payload?.documentId
  ) {
    return NextResponse.json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
  }

  const deleted = await deleteTournamentDocument(
    payload.categoryId,
    payload.roundId,
    payload.documentId,
  );

  if (!deleted) {
    return NextResponse.json({ error: "ไม่พบไฟล์ที่ต้องการลบ" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
