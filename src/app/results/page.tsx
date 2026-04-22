import { unstable_noStore as noStore } from "next/cache";
import { ResultsTabsView } from "@/components/results-tabs-view";
import { readTournamentResults } from "@/lib/result-store";
import { isTournamentRoundId, tournamentCategories, tournamentRounds } from "@/lib/tournament";

import { ResultsBrowser } from "@/components/results-browser";
import { ResultsBrowserV2 } from "@/components/results-browser-v2";
import { ResultsBrowserV3 } from "@/components/results-browser-v3";
void ResultsTabsView;
void ResultsBrowser;
void ResultsBrowserV2;
export default async function ResultsPage() {
  noStore();
  const results = await readTournamentResults();
  const initialCategoryId =
    tournamentCategories.find((category) => results[category.id])?.id ?? tournamentCategories[0].id;
  const firstRoundKey = Object.keys(results[initialCategoryId]?.rounds ?? {}).sort()[0];
  const initialRoundId: (typeof tournamentRounds)[number]["id"] = (() => {
    if (isTournamentRoundId(firstRoundKey ?? "")) {
      return firstRoundKey as (typeof tournamentRounds)[number]["id"];
    }

    return tournamentRounds[0].id;
  })();

  return (
    <main className="px-6 py-10 sm:px-8 lg:px-12">
      <ResultsBrowserV3
        results={results}
        initialCategoryId={initialCategoryId}
        initialRoundId={initialRoundId}
      />
    </main>
  );
}

