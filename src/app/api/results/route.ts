import { NextResponse } from "next/server";
import { readCurrentTournamentData, readPublicDocuments, readTournamentResults } from "@/lib/result-store";
import { isTournamentCategoryId, tournamentCategories } from "@/lib/tournament";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("category");

  if (categoryId && isTournamentCategoryId(categoryId)) {
    const data = await readCurrentTournamentData(categoryId);
    return NextResponse.json({ data, categoryId });
  }

  const results = await readTournamentResults();
  const publicDocuments = await readPublicDocuments();
  return NextResponse.json({ results, publicDocuments, categories: tournamentCategories });
}
