"use client";

import Link from "next/link";
import { useState } from "react";
import { TournamentDashboard } from "@/components/tournament-dashboard";
import {
  getCategoryDocumentsForRound,
  getTournamentCategoryLabel,
  getTournamentRoundLabel,
  parsePlayersFromText,
  type StoredTournamentCollection,
  type TournamentCategoryId,
  type TournamentRoundId,
  tournamentCategories,
  tournamentRounds,
} from "@/lib/tournament";

type ResultsBrowserV2Props = {
  results: StoredTournamentCollection;
  initialCategoryId: TournamentCategoryId;
  initialRoundId: TournamentRoundId;
};

export function ResultsBrowserV2({
  results,
  initialCategoryId,
  initialRoundId,
}: ResultsBrowserV2Props) {
  void initialRoundId;
  const [activeCategoryId, setActiveCategoryId] =
    useState<TournamentCategoryId>(initialCategoryId);

  const activeCategory = results[activeCategoryId] ?? null;
  const roundsToRender = tournamentRounds.filter((round) =>
    Boolean(getCategoryDocumentsForRound(activeCategory, round.id).length),
  );
  const visibleRounds = roundsToRender.length ? roundsToRender : tournamentRounds;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-4 shadow-[0_18px_60px_rgba(22,101,52,0.12)] backdrop-blur sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">
          เธเธฃเธฐเน€เธ เธ—เธเธฒเธฃเนเธเนเธเธเธฑเธ
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {tournamentCategories.map((category) => (
            <button
              key={category.id}
              className={[
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                category.id === activeCategoryId
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
              ].join(" ")}
              type="button"
              onClick={() => setActiveCategoryId(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">
          เธฃเธญเธเธเธฒเธฃเนเธเนเธเธเธฑเธ
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {visibleRounds.map((round) => (
            <Link
              key={round.id}
              href={`#${activeCategoryId}-${round.id}`}
              className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
            >
              {round.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-10">
        {visibleRounds.map((round) => {
          const documents = getCategoryDocumentsForRound(activeCategory, round.id);
          const playerDocuments = documents.filter((document) => document.kind === "players");
          const resultDocuments = documents.filter(
            (document) => document.kind === "results" && !document.parsedData,
          );
          const previewData = documents.find((document) => document.parsedData)?.parsedData ?? null;
          const parsedPlayers = playerDocuments.flatMap((document) =>
            parsePlayersFromText(document.contentText),
          );
          const playerList = parsedPlayers.length ? parsedPlayers : (previewData?.players ?? []);
          const statusLabel = !previewData
            ? `${getTournamentCategoryLabel(activeCategoryId)} - ${getTournamentRoundLabel(round.id)} เธขเธฑเธเนเธกเนเธกเธตเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธเนเธเธ parsed`
            : `${getTournamentCategoryLabel(activeCategoryId)} - ${getTournamentRoundLabel(round.id)} - เน€เธเธขเนเธเธฃเนเธเธฒเธ ${previewData.sourceFileName}`;

          return (
            <section
              key={round.id}
              id={`${activeCategoryId}-${round.id}`}
              className="scroll-mt-28"
            >
              <TournamentDashboard
                data={previewData}
                players={playerList}
                resultDocuments={resultDocuments}
                statusLabel={statusLabel}
                emptyTitle={`เธขเธฑเธเนเธกเนเธกเธตเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธ ${getTournamentCategoryLabel(activeCategoryId)} ${getTournamentRoundLabel(round.id)}`}
                emptyDescription="เธฃเธญเธเธเธตเนเธขเธฑเธเนเธกเนเธกเธตเธเนเธญเธกเธนเธฅเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธเธ—เธตเนเน€เธเธขเนเธเธฃเน"
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}

