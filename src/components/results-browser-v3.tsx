"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  getPublicDocumentDownloadUrl,
  getTournamentDocumentAssetUrl,
  formatAlignedTextBlock,
  getCategoryDocumentsForRound,
  getPublicDocumentKindLabel,
  getTournamentCategoryLabel,
  getTournamentDocumentKindLabel,
  getTournamentRoundLabel,
  parsePlayersFromText,
  parseTournamentMatchesFromText,
  parseTournamentStandingsFromText,
  publicDocumentKinds,
  splitTournamentPerson,
  hasTournamentDocumentImage,
  type Match,
  type PublicDocument,
  type StandingEntry,
  type StoredTournamentCollection,
  type TournamentCategoryId,
  type TournamentRoundId,
  tournamentCategories,
  tournamentRounds,
} from "@/lib/tournament";

type ResultsBrowserV3Props = {
  results: StoredTournamentCollection;
  publicDocuments: Partial<Record<PublicDocument["kind"], PublicDocument>>;
  initialCategoryId: TournamentCategoryId;
  initialRoundId: TournamentRoundId;
};

function getParticipantDisplay(name: string, club?: string) {
  if (club) {
    return { name, club };
  }

  return splitTournamentPerson(name);
}

function ResultsMatchTable({ matches }: { matches: Match[] }) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-slate-300 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="w-16 border-b border-slate-300 px-3 py-2 text-left font-semibold">No</th>
              <th className="min-w-52 border-b border-slate-300 px-4 py-2 text-left font-semibold">Name</th>
              <th className="min-w-56 border-b border-slate-300 px-4 py-2 text-left font-semibold">Club</th>
              <th className="w-28 border-b border-slate-300 px-4 py-2 text-center font-semibold">Result</th>
              <th className="min-w-52 border-b border-slate-300 px-4 py-2 text-left font-semibold">Name</th>
              <th className="min-w-56 border-b border-slate-300 px-4 py-2 text-left font-semibold">Club</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => {
              const left = getParticipantDisplay(match.leftName, match.leftClub);
              const right = getParticipantDisplay(match.rightName, match.rightClub);

              return (
                <tr key={`${match.board}-${match.leftName}-${match.rightName}`}>
                  <td className="border-b border-slate-200 bg-white px-3 py-2.5 font-semibold text-slate-900">
                    {match.board}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-2.5 align-top text-slate-950">
                    <div className="font-medium leading-6">{left.name}</div>
                  </td>
                  <td className="border-b border-slate-200 px-4 py-2.5 align-top text-slate-700">
                    {left.club || (match.leftScore ? `Score ${match.leftScore}` : "-")}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-2.5 text-center font-semibold text-slate-950">
                    {match.result.replace(":", " : ")}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-2.5 align-top text-slate-950">
                    <div className="font-medium leading-6">{right.name}</div>
                  </td>
                  <td className="border-b border-slate-200 px-4 py-2.5 align-top text-slate-700">
                    {right.club || (match.rightScore ? `Score ${match.rightScore}` : "-")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StandingsTable({ entries }: { entries: StandingEntry[] }) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-slate-300 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="w-20 border-b border-slate-300 px-3 py-2 text-left font-semibold">Place</th>
              <th className="min-w-56 border-b border-slate-300 px-4 py-2 text-left font-semibold">Name</th>
              <th className="min-w-52 border-b border-slate-300 px-4 py-2 text-left font-semibold">Club</th>
              <th className="w-20 border-b border-slate-300 px-3 py-2 text-center font-semibold">Score</th>
              <th className="w-20 border-b border-slate-300 px-3 py-2 text-center font-semibold">Wins</th>
              <th className="w-28 border-b border-slate-300 px-3 py-2 text-center font-semibold">M-Buch.</th>
              <th className="w-24 border-b border-slate-300 px-3 py-2 text-center font-semibold">Buch.</th>
              <th className="w-24 border-b border-slate-300 px-3 py-2 text-center font-semibold">Berg.</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={`${entry.place}-${entry.name}`}>
                <td className="border-b border-slate-200 bg-white px-3 py-2.5 font-semibold text-slate-900">
                  {entry.place}
                </td>
                <td className="border-b border-slate-200 px-4 py-2.5 text-slate-950">
                  <div className="font-medium leading-6">{entry.name}</div>
                </td>
                <td className="border-b border-slate-200 px-4 py-2.5 text-slate-700">
                  {entry.club || "-"}
                </td>
                <td className="border-b border-slate-200 px-3 py-2.5 text-center font-semibold text-slate-950">
                  {entry.score}
                </td>
                <td className="border-b border-slate-200 px-3 py-2.5 text-center text-slate-950">
                  {entry.wins}
                </td>
                <td className="border-b border-slate-200 px-3 py-2.5 text-center text-slate-950">
                  {entry.medianBuchholz}
                </td>
                <td className="border-b border-slate-200 px-3 py-2.5 text-center text-slate-950">
                  {entry.buchholz}
                </td>
                <td className="border-b border-slate-200 px-3 py-2.5 text-center text-slate-950">
                  {entry.berger}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentImagePreview({
  src,
  alt,
  className = "",
  imageClassName = "",
}: {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div
      className={[
        "overflow-hidden rounded-[1.35rem] border border-slate-300 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]",
        className,
      ].join(" ")}
    >
      <img
        src={src}
        alt={alt}
        className={["block h-auto w-full object-contain", imageClassName].join(" ")}
      />
    </div>
  );
}

export function ResultsBrowserV3({
  results,
  publicDocuments,
  initialCategoryId,
  initialRoundId,
}: ResultsBrowserV3Props) {
  void initialRoundId;

  const [activeCategoryId, setActiveCategoryId] =
    useState<TournamentCategoryId>(initialCategoryId);

  const activeCategory = results[activeCategoryId] ?? null;
  const roundsWithData = tournamentRounds.filter((round) =>
    Boolean(getCategoryDocumentsForRound(activeCategory, round.id).length),
  );
  const visibleRounds = roundsWithData.length ? roundsWithData : tournamentRounds;

  const sharedPlayers = useMemo(() => {
    if (!activeCategory) {
      return [];
    }

    const playersFromDocs = activeCategory.sharedDocuments
      .filter((document) => document.kind === "players")
      .flatMap((document) => parsePlayersFromText(document.contentText));

    if (playersFromDocs.length) {
      return playersFromDocs;
    }

    for (const round of visibleRounds) {
      const documents = getCategoryDocumentsForRound(activeCategory, round.id);
      const parsedPlayers = documents
        .filter((document) => document.kind === "players")
        .flatMap((document) => parsePlayersFromText(document.contentText));

      if (parsedPlayers.length) {
        return parsedPlayers;
      }

      const parsedResult = documents.find((document) => document.parsedData)?.parsedData;

      if (parsedResult?.players.length) {
        return parsedResult.players;
      }
    }

    return [];
  }, [activeCategory, visibleRounds]);

  const otherDocuments = useMemo(() => {
    if (!activeCategory) {
      return [];
    }

    const sharedOtherDocuments = activeCategory.sharedDocuments
      .filter((document) => document.kind === "other")
      .map((document) => ({
        ...document,
        roundLabel: null as string | null,
      }));

    const roundOtherDocuments = visibleRounds.flatMap((round) =>
      (activeCategory.rounds[round.id]?.documents ?? [])
        .filter((document) => document.kind === "other")
        .map((document) => ({
          ...document,
          roundLabel: getTournamentRoundLabel(round.id),
        })),
    );

    return [...sharedOtherDocuments, ...roundOtherDocuments];
  }, [activeCategory, visibleRounds]);

  const standingsDocuments = useMemo(() => {
    if (!activeCategory) {
      return [];
    }

    return visibleRounds.flatMap((round) =>
      (activeCategory.rounds[round.id]?.documents ?? [])
        .filter((document) => document.kind === "standings")
        .map((document) => ({
          ...document,
          roundLabel: getTournamentRoundLabel(round.id),
        })),
    );
  }, [activeCategory, visibleRounds]);

  const individualCategories = useMemo(
    () => tournamentCategories.filter((category) => category.label.includes("บุคคล")),
    [],
  );
  const teamCategories = useMemo(
    () => tournamentCategories.filter((category) => category.label.includes("ทีม")),
    [],
  );
  const visiblePublicDocuments = publicDocumentKinds
    .map((kind) => publicDocuments[kind.id])
    .filter((document): document is PublicDocument => Boolean(document));

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-5 shadow-[0_18px_60px_rgba(109,59,209,0.12)] backdrop-blur sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">เอกสารสำหรับผู้ใช้งานทั่วไป</p>
            <h2 className="mt-2 font-serif text-2xl text-violet-950">เอกสารสำหรับดาวน์โหลด</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-violet-900/65">
            ส่วนนี้ถูกย่อให้กระชับและคงไว้เฉพาะการดาวน์โหลดไฟล์ PDF สำหรับผู้ใช้งานทั่วไป
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {publicDocumentKinds.map((kind) => {
            const document = publicDocuments[kind.id];

            return (
              <article
                key={kind.id}
                className="rounded-[1.35rem] border border-violet-100 bg-white/85 p-4 shadow-[0_10px_24px_rgba(109,59,209,0.08)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-500">
                  PDF
                </p>
                <h3 className="mt-2 text-lg font-semibold text-violet-950">
                  {getPublicDocumentKindLabel(kind.id)}
                </h3>
                {document ? (
                  <>
                    <p className="mt-2 line-clamp-2 text-sm text-violet-700/75">
                      {document.sourceFileName} • {new Date(document.updatedAt).toLocaleString("th-TH")}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={getPublicDocumentDownloadUrl(document) ?? "#"}
                        download={document.sourceFileName}
                        className="rounded-full border border-violet-700 bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
                      >
                        ดาวน์โหลด
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-violet-700/75">
                    ยังไม่มีไฟล์ PDF ที่เผยแพร่ในหัวข้อนี้
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(109,59,209,0.14)] backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">
          ประเภทการแข่งขัน
        </p>
        <h2 className="mt-2 font-serif text-3xl text-violet-950 sm:text-4xl">เลือกประเภทที่ต้องการดูผลการแข่งขัน</h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-violet-900/70">
          ส่วนนี้ถูกขยายให้ใช้งานบ่อยได้สะดวกขึ้น คุณสามารถสลับประเภทการแข่งขันและกดไปยังรอบที่ต้องการได้ทันที
        </p>

        <div className="mt-6 grid gap-5">
          <div>
            <p className="mb-3 text-sm font-semibold text-violet-700">บุคคล</p>
            <div className="flex flex-wrap gap-3">
              {individualCategories.map((category) => (
                <button
                  key={category.id}
                  className={[
                    "rounded-full border px-5 py-3 text-sm font-semibold transition sm:text-base",
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
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-violet-700">ทีม</p>
            <div className="flex flex-wrap gap-3">
              {teamCategories.map((category) => (
                <button
                  key={category.id}
                  className={[
                    "rounded-full border px-5 py-3 text-sm font-semibold transition sm:text-base",
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
          </div>
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">
          ไปยังรอบ
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {visibleRounds.map((round) => (
            <Link
              key={round.id}
              href={`#${activeCategoryId}-${round.id}`}
              className="rounded-full border border-violet-200 bg-white px-5 py-3 text-sm font-semibold text-violet-800 transition hover:bg-violet-50 sm:text-base"
            >
              {round.label}
            </Link>
          ))}
          {standingsDocuments.length ? (
            <Link
              href={`#${activeCategoryId}-standings`}
              className="rounded-full border border-violet-200 bg-white px-5 py-3 text-sm font-semibold text-violet-800 transition hover:bg-violet-50 sm:text-base"
            >
              Standings
            </Link>
          ) : null}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[var(--surface)] p-8 shadow-[0_24px_80px_rgba(109,59,209,0.18)] backdrop-blur sm:p-10">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[rgba(182,140,255,0.28)] blur-3xl" />
        <div className="absolute bottom-0 left-12 h-28 w-28 rounded-full bg-[rgba(255,255,255,0.7)] blur-2xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-violet-700">
              TestSwiss Tournament Board
            </p>
            <h1 className="font-serif text-5xl leading-none text-violet-950 sm:text-6xl">
              {getTournamentCategoryLabel(activeCategoryId)}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-violet-950/70 sm:text-lg">
              หน้านี้แสดงข้อมูลรวมของประเภทการแข่งขัน และผลการแข่งขันทุกรอบแบบต่อเนื่องในหน้าเดียว
            </p>
            <div className="mt-6">
              <Link
                href="/admin"
                className="inline-flex items-center rounded-full border border-violet-300 bg-white/85 px-5 py-3 text-sm font-semibold text-violet-800 transition hover:bg-white hover:text-violet-900"
              >
                เข้าใช้งานในฐานะแอดมิน
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="min-w-24 rounded-[1.5rem] border border-white/70 bg-[var(--surface-strong)] px-4 py-5 text-center shadow-[0_12px_30px_rgba(124,58,237,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-500">รอบ</p>
              <p className="mt-2 text-3xl font-bold text-violet-950">{visibleRounds.length}</p>
            </div>
            <div className="min-w-24 rounded-[1.5rem] border border-white/70 bg-[var(--surface-strong)] px-4 py-5 text-center shadow-[0_12px_30px_rgba(124,58,237,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-500">ผู้เล่น</p>
              <p className="mt-2 text-3xl font-bold text-violet-950">{sharedPlayers.length}</p>
            </div>
            <div className="min-w-24 rounded-[1.5rem] border border-white/70 bg-[var(--surface-strong)] px-4 py-5 text-center shadow-[0_12px_30px_rgba(124,58,237,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-500">ดาวน์โหลด</p>
              <p className="mt-2 text-3xl font-bold text-violet-950">{visiblePublicDocuments.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.42fr_0.58fr]">
        <div className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-4 shadow-[0_18px_60px_rgba(109,59,209,0.12)] backdrop-blur sm:p-5">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">ผลการแข่งขัน</p>
            <h2 className="font-serif text-3xl text-violet-950">ผลการแข่งขันทุกรอบ</h2>
          </div>

          <div className="grid gap-8">
            {visibleRounds.map((round) => {
              const documents = getCategoryDocumentsForRound(activeCategory, round.id);
              const parsedResult = documents.find((document) => document.parsedData)?.parsedData ?? null;
              const imageResults = documents.filter(
                (document) => document.kind === "results" && hasTournamentDocumentImage(document),
              );
              const textResults = documents.filter(
                (document) => document.kind === "results" && !document.parsedData,
              );

              return (
                <section
                  key={round.id}
                  id={`${activeCategoryId}-${round.id}`}
                  className="scroll-mt-28 rounded-[1.75rem] border border-violet-100 bg-white/70 p-0"
                >
                  <div className="mb-5 flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-500">
                        รอบการแข่งขัน
                      </p>
                      <h3 className="mt-2 font-serif text-2xl text-violet-950">
                        {getTournamentRoundLabel(round.id)}
                      </h3>
                    </div>
                    <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
                      {parsedResult
                        ? `เผยแพร่จาก ${parsedResult.sourceFileName}`
                        : "แสดงจากไฟล์ผลการแข่งขัน"}
                    </span>
                  </div>

                  {imageResults.length ? (
                    <div className="grid gap-4">
                      {imageResults.map((document) => (
                        <article
                          key={document.id}
                          className="rounded-[1.5rem] border-t border-violet-100 bg-white/90 p-0 shadow-[0_10px_28px_rgba(109,59,209,0.08)]"
                        >
                          <div className="mb-4 flex flex-col gap-2 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">
                                ไฟล์ผลการแข่งขัน
                              </p>
                              <h4 className="mt-2 text-xl font-semibold text-violet-950">
                                {document.title}
                              </h4>
                            </div>
                            <p className="text-sm text-violet-700/75">{document.sourceFileName}</p>
                          </div>
                          <DocumentImagePreview
                            src={getTournamentDocumentAssetUrl(document)!}
                            alt={document.title}
                            className="rounded-t-none border-x-0 border-b-0"
                          />
                        </article>
                      ))}
                    </div>
                  ) : parsedResult ? (
                    <ResultsMatchTable matches={parsedResult.matches} />
                  ) : textResults.length ? (
                    <div className="grid gap-4">
                      {textResults.map((document) => {
                        const fallbackMatches = parseTournamentMatchesFromText(document.contentText);
                        const alignedText = formatAlignedTextBlock(document.contentText);

                        return (
                          <article
                            key={document.id}
                          className="rounded-[1.5rem] border-t border-violet-100 bg-white/90 p-0 shadow-[0_10px_28px_rgba(109,59,209,0.08)]"
                        >
                            <div className="mb-4 flex flex-col gap-2 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">
                                  ไฟล์ผลการแข่งขัน
                                </p>
                                <h4 className="mt-2 text-xl font-semibold text-violet-950">
                                  {document.title}
                                </h4>
                              </div>
                              <p className="text-sm text-violet-700/75">{document.sourceFileName}</p>
                            </div>

                            {hasTournamentDocumentImage(document) ? (
                              <DocumentImagePreview
                                src={getTournamentDocumentAssetUrl(document)!}
                                alt={document.title}
                                className="rounded-t-none border-x-0 border-b-0"
                              />
                            ) : fallbackMatches.length ? (
                              <div className="px-5 pb-5">
                                <ResultsMatchTable matches={fallbackMatches} />
                              </div>
                            ) : (
                              <pre className="mx-5 mb-5 overflow-x-auto whitespace-pre rounded-[1.25rem] bg-violet-50/80 p-4 font-mono text-sm leading-7 text-violet-950 [font-variant-numeric:tabular-nums]">
                                {alignedText || "ไม่มีข้อความในไฟล์ผลการแข่งขัน"}
                              </pre>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-violet-200 bg-white/60 px-6 py-10 text-center text-violet-700/75">
                      รอบนี้ยังไม่มีผลการแข่งขันที่เผยแพร่
                    </div>
                  )}
                </section>
              );
            })}

            {standingsDocuments.length ? (
              <section
                id={`${activeCategoryId}-standings`}
                className="scroll-mt-28 rounded-[1.75rem] border border-violet-100 bg-white/70 p-0"
              >
                <div className="mb-5 flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-500">
                      รอบการแข่งขัน
                    </p>
                    <h3 className="mt-2 font-serif text-2xl text-violet-950">Standings</h3>
                  </div>
                  <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
                    ลำดับถัดจากรอบ 5
                  </span>
                </div>

                <div className="grid gap-4">
                  {standingsDocuments.map((document) => {
                    const entries = parseTournamentStandingsFromText(document.contentText);

                    return (
                      <article
                        key={document.id}
                        className="rounded-[1.5rem] border-t border-violet-100 bg-white/90 p-0 shadow-[0_10px_28px_rgba(109,59,209,0.08)]"
                      >
                        <div className="mb-4 flex flex-col gap-2 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">
                              {document.roundLabel}
                            </p>
                            <h4 className="mt-2 text-xl font-semibold text-violet-950">
                              {document.title}
                            </h4>
                          </div>
                          <p className="text-sm text-violet-700/75">{document.sourceFileName}</p>
                        </div>

                        {hasTournamentDocumentImage(document) ? (
                          <DocumentImagePreview
                            src={getTournamentDocumentAssetUrl(document)!}
                            alt={document.title}
                            className="rounded-t-none border-x-0 border-b-0"
                          />
                        ) : entries.length ? (
                          <div className="px-5 pb-5">
                            <StandingsTable entries={entries} />
                          </div>
                        ) : (
                          <pre className="mx-5 mb-5 overflow-x-auto whitespace-pre-wrap rounded-[1.25rem] bg-violet-50/80 p-4 text-sm leading-7 text-violet-950">
                            {document.contentText || "ไม่มีข้อความในไฟล์ Standings"}
                          </pre>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-0 shadow-[0_18px_60px_rgba(109,59,209,0.12)] backdrop-blur">
            <div className="px-6 pt-6 sm:px-8 sm:pt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">ผู้เล่น</p>
              <h2 className="mt-2 font-serif text-3xl text-violet-950">รายชื่อผู้เล่น</h2>
            </div>
            {activeCategory?.sharedDocuments.filter((document) => document.kind === "players").length ? (
              <div className="mt-6 grid gap-4">
                {activeCategory.sharedDocuments
                  .filter((document) => document.kind === "players")
                  .map((document) => (
                    <article
                      key={document.id}
                      className={[
                        "bg-white/80 p-0",
                        hasTournamentDocumentImage(document) ? "" : "border border-violet-100",
                      ].join(" ")}
                    >
                      {hasTournamentDocumentImage(document) ? (
                        <DocumentImagePreview
                          src={getTournamentDocumentAssetUrl(document)!}
                          alt={document.title}
                          className="rounded-none border-0 shadow-none"
                          imageClassName="rounded-none"
                        />
                      ) : sharedPlayers.length ? (
                        <div className="grid gap-2.5 px-6 pb-6 sm:px-8 sm:pb-8">
                          {sharedPlayers.map((player, index) => (
                            <div
                              key={`${player}-${index}`}
                              className="flex items-center gap-3 rounded-[1.1rem] border border-violet-100 bg-white/80 px-3.5 py-2.5"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#e6d5ff,#c6a2ff)] text-xs font-bold text-violet-950">
                                {String(index + 1).padStart(2, "0")}
                              </div>
                              <p className="text-sm font-medium leading-6 text-violet-950">{player}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-violet-700/75">ยังไม่มีรายชื่อผู้เล่นที่เผยแพร่</p>
                      )}
                    </article>
                  ))}
              </div>
            ) : (
              <div className="mx-6 mb-6 mt-6 rounded-[1.5rem] border border-dashed border-violet-200 bg-white/60 px-5 py-10 text-center text-violet-700/75 sm:mx-8 sm:mb-8">
                ยังไม่มีรายชื่อผู้เล่นที่เผยแพร่
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(109,59,209,0.12)] backdrop-blur sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">ข้อมูลอื่น ๆ</p>
            <h2 className="mt-2 font-serif text-3xl text-violet-950">ข้อมูลเพิ่มเติม</h2>
            {otherDocuments.length ? (
              <div className="mt-6 grid gap-4">
                {otherDocuments.map((document) => (
                  <article
                    key={document.id}
                    className="rounded-[1.5rem] border border-violet-100 bg-white/80 p-5"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">
                      {getTournamentDocumentKindLabel(document.kind)}
                    </p>
                    {document.roundLabel ? (
                      <p className="mt-2 text-sm font-semibold text-violet-700">{document.roundLabel}</p>
                    ) : null}
                    <h3 className="mt-2 text-xl font-semibold text-violet-950">{document.title}</h3>
                    <p className="mt-2 text-sm text-violet-700/75">
                      {document.sourceFileName} • {new Date(document.updatedAt).toLocaleString("th-TH")}
                    </p>
                    {hasTournamentDocumentImage(document) ? (
                      <DocumentImagePreview
                        src={getTournamentDocumentAssetUrl(document)!}
                        alt={document.title}
                        className="-mx-5 -mb-5 mt-4"
                      />
                    ) : (
                      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-[1.25rem] bg-violet-50/80 p-4 text-sm leading-7 text-violet-950">
                        {document.contentText || "ไม่มีข้อความในเอกสาร"}
                      </pre>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-violet-200 bg-white/60 px-5 py-10 text-center text-violet-700/75">
                ยังไม่มีข้อมูลเพิ่มเติมที่เผยแพร่
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
