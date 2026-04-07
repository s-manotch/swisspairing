import Link from "next/link";

export default function HomePage() {
  return (
    <main className="px-6 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-8">
        <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-8 shadow-[0_24px_80px_rgba(109,59,209,0.18)] backdrop-blur sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-700">TestSwiss</p>
          <h1 className="mt-3 font-serif text-5xl text-violet-950 sm:text-6xl">ระบบจัดการผลการแข่งขัน</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-violet-950/70">
            แยกหน้าใช้งานสำหรับแอดมินและหน้าสำหรับผู้ชมอย่างชัดเจน โดยหน้าสาธารณะจะอัปเดตตามข้อมูลล่าสุดที่แอดมินเผยแพร่เสมอ
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link className="rounded-full bg-violet-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-800" href="/results">
              เปิดหน้าสาธารณะ
            </Link>
            <Link className="rounded-full border border-violet-200 px-6 py-3 text-sm font-semibold text-violet-800 transition hover:bg-violet-50" href="/admin">
              ไปหน้าแอดมิน
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
