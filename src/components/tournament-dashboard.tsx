import { StoredTournamentData } from "@/lib/tournament";

type TournamentDashboardProps = {
  data: StoredTournamentData | null;
  statusLabel: string;
  emptyTitle: string;
  emptyDescription: string;
};

export function TournamentDashboard({
  data,
  statusLabel,
  emptyTitle,
  emptyDescription,
}: TournamentDashboardProps) {
  const summary = [
    { label: "รอบ", value: data?.roundLabel ?? "-" },
    { label: "ผู้เล่น", value: data ? String(data.players.length) : "-" },
    { label: "กระดาน", value: data ? String(data.matches.length) : "-" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[var(--surface)] p-8 shadow-[0_24px_80px_rgba(109,59,209,0.18)] backdrop-blur sm:p-10">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[rgba(182,140,255,0.28)] blur-3xl" />
        <div className="absolute bottom-0 left-12 h-28 w-28 rounded-full bg-[rgba(255,255,255,0.7)] blur-2xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-violet-700">
              TestSwiss Tournament Board
            </p>
            <h1 className="font-serif text-5xl leading-none text-violet-950 sm:text-6xl">
              {data?.title ?? emptyTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-violet-950/70 sm:text-lg">
              {data
                ? "ผลการแข่งขันด้านล่างคือข้อมูลล่าสุดที่เผยแพร่จากหน้าแอดมิน"
                : emptyDescription}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {summary.map((item) => (
              <div
                key={item.label}
                className="min-w-24 rounded-[1.5rem] border border-white/70 bg-[var(--surface-strong)] px-4 py-5 text-center shadow-[0_12px_30px_rgba(124,58,237,0.12)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-500">
                  {item.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-violet-950">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(109,59,209,0.12)] backdrop-blur sm:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">
                ผลการแข่งขัน
              </p>
              <h2 className="font-serif text-3xl text-violet-950">กระดานแข่งขัน</h2>
            </div>
            <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
              {statusLabel}
            </span>
          </div>

          {data ? (
            <div className="grid gap-4">
              {data.matches.map((match) => (
                <article
                  key={`${match.board}-${match.leftName}-${match.rightName}`}
                  className="rounded-[1.5rem] border border-violet-100 bg-white/80 p-5 shadow-[0_10px_28px_rgba(109,59,209,0.08)]"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">
                      Board {match.board}
                    </p>
                    <p className="rounded-full bg-violet-600 px-3 py-1 text-sm font-semibold text-white">
                      {match.result}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                    <div>
                      <p className="text-lg font-semibold text-violet-950">{match.leftName}</p>
                      <p className="text-sm text-violet-700/70">คะแนนก่อนแข่ง {match.leftScore}</p>
                    </div>
                    <div className="justify-self-center rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">
                      พบกับ
                    </div>
                    <div className="sm:text-right">
                      <p className="text-lg font-semibold text-violet-950">{match.rightName}</p>
                      <p className="text-sm text-violet-700/70">คะแนนก่อนแข่ง {match.rightScore}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-violet-900/75">
                    ผู้ชนะ: <span className="font-semibold text-violet-950">{match.winner}</span>
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-violet-200 bg-white/60 px-6 py-14 text-center text-violet-700/75">
              ยังไม่มีข้อมูลการแข่งขันที่เผยแพร่
            </div>
          )}
        </div>

        <div className="flex flex-col gap-8">
          <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(109,59,209,0.12)] backdrop-blur sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">ผู้เล่น</p>
            <h2 className="mt-2 font-serif text-3xl text-violet-950">รายชื่อผู้เล่น</h2>
            {data ? (
              <div className="mt-6 grid gap-3">
                {data.players.map((player, index) => (
                  <div
                    key={`${player}-${index}`}
                    className="flex items-center gap-4 rounded-[1.25rem] border border-violet-100 bg-white/80 px-4 py-3"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#e6d5ff,#c6a2ff)] text-sm font-bold text-violet-950">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <p className="text-base font-medium text-violet-950">{player}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-violet-200 bg-white/60 px-5 py-10 text-center text-violet-700/75">
                รายชื่อผู้เล่นจะแสดงหลังจากแอดมินอัปเดตผลการแข่งขัน
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-violet-200/80 bg-[linear-gradient(135deg,rgba(121,68,218,0.95),rgba(169,133,255,0.88))] p-6 text-white shadow-[0_20px_60px_rgba(109,59,209,0.2)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-100">อัปเดตล่าสุด</p>
            <h2 className="mt-2 font-serif text-3xl">
              {data ? new Date(data.updatedAt).toLocaleString("th-TH") : "ยังไม่มีข้อมูล"}
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-violet-50/90">
              {data
                ? `ไฟล์ต้นทาง: ${data.sourceFileName}`
                : "เมื่อแอดมินเผยแพร่ข้อมูลแล้ว หน้านี้จะอัปเดตตามข้อมูลล่าสุดโดยอัตโนมัติ"}
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
