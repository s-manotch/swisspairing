"use client";

import { useState } from "react";
import { TournamentDashboard } from "@/components/tournament-dashboard";
import {
  getCategoryDocumentsForRound,
  getTournamentCategoryLabel,
  getTournamentDocumentKindLabel,
  getTournamentRoundLabel,
  parsePlayersFromText,
  type StoredTournamentCollection,
  type TournamentCategoryId,
  type TournamentRoundId,
  tournamentCategories,
  tournamentRounds,
} from "@/lib/tournament";

type ResultsBrowserProps = {
  results: StoredTournamentCollection;
  initialCategoryId: TournamentCategoryId;
  initialRoundId: TournamentRoundId;
};

export function ResultsBrowser({
  results,
  initialCategoryId,
  initialRoundId,
}: ResultsBrowserProps) {
  const [activeCategoryId, setActiveCategoryId] =
    useState<TournamentCategoryId>(initialCategoryId);
  const [activeRoundId, setActiveRoundId] = useState<TournamentRoundId>(initialRoundId);

  const activeCategory = results[activeCategoryId] ?? null;
  const documents = getCategoryDocumentsForRound(activeCategory, activeRoundId);
  const playerDocuments = documents.filter((document) => document.kind === "players");
  const resultDocuments = documents.filter(
    (document) => document.kind === "results" && !document.parsedData,
  );
  const extraDocuments = documents.filter(
    (document) => document.kind !== "players" && document.kind !== "results",
  );
  const previewData = documents.find((document) => document.parsedData)?.parsedData ?? null;
  const parsedPlayers = playerDocuments.flatMap((document) => parsePlayersFromText(document.contentText));
  const playerList = parsedPlayers.length ? parsedPlayers : (previewData?.players ?? []);

  const statusLabel = !previewData
    ? `${getTournamentCategoryLabel(activeCategoryId)} - ${getTournamentRoundLabel(activeRoundId)} เธขเธฑเธเนเธกเนเธกเธตเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธเนเธเธ parsed`
    : `${getTournamentCategoryLabel(activeCategoryId)} - ${getTournamentRoundLabel(activeRoundId)} - เน€เธเธขเนเธเธฃเนเธเธฒเธ ${previewData.sourceFileName}`;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-4 shadow-[0_18px_60px_rgba(22,101,52,0.12)] backdrop-blur sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">เธเธฃเธฐเน€เธ เธ—เธเธฒเธฃเนเธเนเธเธเธฑเธ</p>
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

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">เธฃเธญเธเธเธฒเธฃเนเธเนเธเธเธฑเธ</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {tournamentRounds.map((round) => {
            const hasDocuments = Boolean(
              getCategoryDocumentsForRound(results[activeCategoryId], round.id).length,
            );

            return (
              <button
                key={round.id}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  round.id === activeRoundId
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
                ].join(" ")}
                type="button"
                onClick={() => setActiveRoundId(round.id)}
              >
                {round.label}
                {hasDocuments ? "" : " (เธขเธฑเธเนเธกเนเธกเธตเนเธเธฅเน)"}
              </button>
            );
          })}
        </div>
      </section>

      <TournamentDashboard
        data={previewData}
        players={playerList}
        resultDocuments={resultDocuments}
        statusLabel={statusLabel}
        emptyTitle={`เธขเธฑเธเนเธกเนเธกเธตเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธ ${getTournamentCategoryLabel(activeCategoryId)} ${getTournamentRoundLabel(activeRoundId)}`}
        emptyDescription="เน€เธฅเธทเธญเธเธเธฃเธฐเน€เธ เธ—เนเธฅเธฐเธฃเธญเธเธ”เนเธฒเธเธเธเน€เธเธทเนเธญเธ”เธนเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธเนเธฅเธฐเน€เธญเธเธชเธฒเธฃเธ—เธตเนเนเธญเธ”เธกเธดเธเธญเธฑเธเนเธซเธฅเธ”เนเธงเน"
      />

      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(22,101,52,0.12)] backdrop-blur sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">เน€เธญเธเธชเธฒเธฃเน€เธเธดเนเธกเน€เธ•เธดเธก</p>
            <h2 className="mt-2 font-serif text-3xl text-emerald-950">
              {getTournamentCategoryLabel(activeCategoryId)} {getTournamentRoundLabel(activeRoundId)}
            </h2>
          </div>
          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
            {extraDocuments.length} เนเธเธฅเน
          </span>
        </div>

        {extraDocuments.length ? (
          <div className="mt-6 grid gap-4">
            {extraDocuments.map((document) => (
              <article
                key={document.id}
                className="rounded-[1.5rem] border border-emerald-100 bg-white/80 p-5 shadow-[0_10px_28px_rgba(22,101,52,0.08)]"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-500">
                  {getTournamentDocumentKindLabel(document.kind)}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-emerald-950">{document.title}</h3>
                <p className="mt-2 text-sm text-emerald-700/75">
                  {document.sourceFileName} โ€ข {new Date(document.updatedAt).toLocaleString("th-TH")}
                </p>
                <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-[1.25rem] bg-emerald-50/80 p-4 text-sm leading-7 text-emerald-950">
                  {document.contentText || "เนเธกเนเธกเธตเธเนเธญเธเธงเธฒเธกเนเธเน€เธญเธเธชเธฒเธฃ"}
                </pre>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-emerald-200 bg-white/60 px-5 py-10 text-center text-emerald-700/75">
            เธฃเธญเธเธเธตเนเธขเธฑเธเนเธกเนเธกเธตเน€เธญเธเธชเธฒเธฃเธ—เธตเนเน€เธเธขเนเธเธฃเน
          </div>
        )}
      </section>
    </div>
  );
}

