import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminSessionCookie, isAdminAuthorized } from "@/lib/admin-auth";
import { writeCurrentTournamentData } from "@/lib/result-store";
import { StoredTournamentData } from "@/lib/tournament";

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

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(adminSessionCookie)?.value;

  if (!isAdminAuthorized(session)) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const payload = (await request.json()) as StoredTournamentData;

  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
  }

  await writeCurrentTournamentData(payload);
  return NextResponse.json({ success: true });
}
