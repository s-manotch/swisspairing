import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";
import { readCurrentTournamentData, readPublicDocuments, readTournamentResults } from "@/lib/result-store";
import { isTournamentCategoryId, tournamentCategories } from "@/lib/tournament";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonNoStore(payload: unknown) {
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(request: Request) {
  noStore();

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("category");

  if (categoryId && isTournamentCategoryId(categoryId)) {
    const data = await readCurrentTournamentData(categoryId);
    return jsonNoStore({ data, categoryId });
  }

  const results = await readTournamentResults();
  const publicDocuments = await readPublicDocuments();
  return jsonNoStore({ results, publicDocuments, categories: tournamentCategories });
}
