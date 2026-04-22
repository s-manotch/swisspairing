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
    ? `${getTournamentCategoryLabel(activeCategoryId)} - ${getTournamentRoundLabel(activeRoundId)} ยังไม่มีผลการแข่งขันแบบ parsed`
    : `${getTournamentCategoryLabel(activeCategoryId)} - ${getTournamentRoundLabel(activeRoundId)} - เผยแพร่จาก ${previewData.sourceFileName}`;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-4 shadow-[0_18px_60px_rgba(109,59,209,0.12)] backdrop-blur sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">ประเภทการแข่งขัน</p>
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

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">รอบการแข่งขัน</p>
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
                    ? "border-violet-700 bg-violet-700 text-white"
                    : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50",
                ].join(" ")}
                type="button"
                onClick={() => setActiveRoundId(round.id)}
              >
                {round.label}
                {hasDocuments ? "" : " (ยังไม่มีไฟล์)"}
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
        emptyTitle={`ยังไม่มีผลการแข่งขัน ${getTournamentCategoryLabel(activeCategoryId)} ${getTournamentRoundLabel(activeRoundId)}`}
        emptyDescription="เลือกประเภทและรอบด้านบนเพื่อดูผลการแข่งขันและเอกสารที่แอดมินอัปโหลดไว้"
      />

      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(109,59,209,0.12)] backdrop-blur sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">เอกสารเพิ่มเติม</p>
            <h2 className="mt-2 font-serif text-3xl text-violet-950">
              {getTournamentCategoryLabel(activeCategoryId)} {getTournamentRoundLabel(activeRoundId)}
            </h2>
          </div>
          <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
            {extraDocuments.length} ไฟล์
          </span>
        </div>

        {extraDocuments.length ? (
          <div className="mt-6 grid gap-4">
            {extraDocuments.map((document) => (
              <article
                key={document.id}
                className="rounded-[1.5rem] border border-violet-100 bg-white/80 p-5 shadow-[0_10px_28px_rgba(109,59,209,0.08)]"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">
                  {getTournamentDocumentKindLabel(document.kind)}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-violet-950">{document.title}</h3>
                <p className="mt-2 text-sm text-violet-700/75">
                  {document.sourceFileName} • {new Date(document.updatedAt).toLocaleString("th-TH")}
                </p>
                <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-[1.25rem] bg-violet-50/80 p-4 text-sm leading-7 text-violet-950">
                  {document.contentText || "ไม่มีข้อความในเอกสาร"}
                </pre>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-violet-200 bg-white/60 px-5 py-10 text-center text-violet-700/75">
            รอบนี้ยังไม่มีเอกสารที่เผยแพร่
          </div>
        )}
      </section>
    </div>
  );
}
