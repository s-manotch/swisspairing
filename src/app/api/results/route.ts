import { NextResponse } from "next/server";
import { readCurrentTournamentData, readTournamentResults } from "@/lib/result-store";
import { isTournamentCategoryId, tournamentCategories } from "@/lib/tournament";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("category");

  if (categoryId && isTournamentCategoryId(categoryId)) {
    const data = await readCurrentTournamentData(categoryId);
    return NextResponse.json({ data, categoryId });
  }

  const results = await readTournamentResults();
  return NextResponse.json({ results, categories: tournamentCategories });
}
