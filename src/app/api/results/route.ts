import { NextResponse } from "next/server";
import { readCurrentTournamentData } from "@/lib/result-store";

export async function GET() {
  const data = await readCurrentTournamentData();
  return NextResponse.json({ data });
}
