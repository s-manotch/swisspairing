import { unstable_noStore as noStore } from "next/cache";
import { TournamentDashboard } from "@/components/tournament-dashboard";
import { readCurrentTournamentData } from "@/lib/result-store";

export default async function ResultsPage() {
  noStore();
  const data = await readCurrentTournamentData();

  return (
    <main className="px-6 py-10 sm:px-8 lg:px-12">
      <TournamentDashboard
        data={data}
        statusLabel={data ? `เผยแพร่จาก ${data.sourceFileName}` : "ยังไม่มีข้อมูล"}
        emptyTitle="ยังไม่มีผลการแข่งขัน"
        emptyDescription="หน้านี้จะแสดงผลล่าสุดที่แอดมินอัปเดตไว้ และผู้ชมจะดูได้อย่างเดียวโดยไม่สามารถแก้ไขได้"
      />
    </main>
  );
}

