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
      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-4 shadow-[0_18px_60px_rgba(109,59,209,0.12)] backdrop-blur sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">
          ประเภทการแข่งขัน
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {tournamentCategories.map((category) => (
            <button
              key={category.id}
              className={[
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                category.id === activeCategoryId
                  ? "border-violet-700 bg-violet-700 text-white"
                  : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50",
              ].join(" ")}
              type="button"
              onClick={() => setActiveCategoryId(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">
          รอบการแข่งขัน
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {visibleRounds.map((round) => (
            <Link
              key={round.id}
              href={`#${activeCategoryId}-${round.id}`}
              className="rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-50"
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
            ? `${getTournamentCategoryLabel(activeCategoryId)} - ${getTournamentRoundLabel(round.id)} ยังไม่มีผลการแข่งขันแบบ parsed`
            : `${getTournamentCategoryLabel(activeCategoryId)} - ${getTournamentRoundLabel(round.id)} - เผยแพร่จาก ${previewData.sourceFileName}`;

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
                emptyTitle={`ยังไม่มีผลการแข่งขัน ${getTournamentCategoryLabel(activeCategoryId)} ${getTournamentRoundLabel(round.id)}`}
                emptyDescription="รอบนี้ยังไม่มีข้อมูลผลการแข่งขันที่เผยแพร่"
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
