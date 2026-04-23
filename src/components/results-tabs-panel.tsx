"use client";

import { useMemo, useState } from "react";
import { TournamentDashboard } from "@/components/tournament-dashboard";
import {
  getTournamentCategoryLabel,
  getLatestParsedTournamentData,
  type StoredTournamentCollection,
  type TournamentCategoryId,
  tournamentCategories,
} from "@/lib/tournament";

type ResultsTabsPanelProps = {
  results: StoredTournamentCollection;
  initialCategoryId: TournamentCategoryId;
};

export function ResultsTabsPanel({
  results,
  initialCategoryId,
}: ResultsTabsPanelProps) {
  const [activeCategoryId, setActiveCategoryId] =
    useState<TournamentCategoryId>(initialCategoryId);
  const activeCategory = results[activeCategoryId] ?? null;
  const activeData = getLatestParsedTournamentData(activeCategory);

  const statusLabel = useMemo(() => {
    if (!activeData) {
      return `${getTournamentCategoryLabel(activeCategoryId)} has no published data yet`;
    }

    return `${getTournamentCategoryLabel(activeCategoryId)} โ€ข Published from ${activeData.sourceFileName}`;
  }, [activeCategoryId, activeData]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-4 shadow-[0_18px_60px_rgba(22,101,52,0.12)] backdrop-blur sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">
          Competition Categories
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {tournamentCategories.map((category) => {
            const isActive = category.id === activeCategoryId;
            const hasData = Boolean(getLatestParsedTournamentData(results[category.id]));

            return (
              <button
                key={category.id}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  isActive
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
                ].join(" ")}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
              >
                {category.label}
                {hasData ? "" : " (no data)"}
              </button>
            );
          })}
        </div>
      </section>

      <TournamentDashboard
        data={activeData}
        statusLabel={statusLabel}
        emptyTitle={`${getTournamentCategoryLabel(activeCategoryId)} has no results yet`}
        emptyDescription="Choose one of the six tabs above to switch between competition categories."
      />
    </div>
  );
}

