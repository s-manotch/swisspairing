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

type ResultsTabsProps = {
  results: StoredTournamentCollection;
  initialCategoryId: TournamentCategoryId;
};

export function ResultsTabs({ results, initialCategoryId }: ResultsTabsProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<TournamentCategoryId>(initialCategoryId);
  const activeCategory = results[activeCategoryId] ?? null;
  const activeData = getLatestParsedTournamentData(activeCategory);

  const statusLabel = useMemo(() => {
    if (!activeData) {
      return `${getTournamentCategoryLabel(activeCategoryId)} ยังไม่มีข้อมูล`;
    }

    return `${getTournamentCategoryLabel(activeCategoryId)} • เผยแพร่จาก ${activeData.sourceFileName}`;
  }, [activeCategoryId, activeData]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-4 shadow-[0_18px_60px_rgba(109,59,209,0.12)] backdrop-blur sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">เลือกประเภทการแข่งขัน</p>
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
                    ? "border-violet-700 bg-violet-700 text-white"
                    : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50",
                ].join(" ")}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
              >
                {category.label}
                {hasData ? "" : " (ยังไม่มีข้อมูล)"}
              </button>
            );
          })}
        </div>
      </section>

      <TournamentDashboard
        data={activeData}
        statusLabel={statusLabel}
        emptyTitle={`ยังไม่มีผลการแข่งขัน${getTournamentCategoryLabel(activeCategoryId)}`}
        emptyDescription="เลือกแท็บด้านบนเพื่อสลับดูผลการแข่งขันแต่ละประเภท ข้อมูลจะอัปเดตจากไฟล์ที่แอดมินเผยแพร่ล่าสุด"
      />
    </div>
  );
}
