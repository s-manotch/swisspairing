"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { TournamentDashboard } from "@/components/tournament-dashboard";
import {
  decodeTournamentFile,
  getTournamentCategoryLabel,
  getLatestParsedTournamentData,
  parseTournamentHtml,
  type StoredTournamentCollection,
  type TournamentCategoryId,
  type StoredTournamentData,
  tournamentCategories,
} from "@/lib/tournament";

type SessionResponse = {
  configured: boolean;
  authenticated: boolean;
};

export function AdminPage() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<TournamentCategoryId>("type-1");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [results, setResults] = useState<StoredTournamentCollection>({});

  async function loadSession() {
    const response = await fetch("/api/admin/session", { cache: "no-store" });
    const json = (await response.json()) as SessionResponse;
    setSession(json);
  }

  async function loadResults() {
    const response = await fetch("/api/results", { cache: "no-store" });
    const json = (await response.json()) as { results?: StoredTournamentCollection };
    setResults(json.results ?? {});
  }

  useEffect(() => {
    void loadSession();
    void loadResults();
  }, []);

  const category = results[selectedCategoryId] ?? null;
  const data = getLatestParsedTournamentData(category);

  const statusLabel = useMemo(() => {
    if (!data) {
      return `${getTournamentCategoryLabel(selectedCategoryId)} ยังไม่มีข้อมูลที่เผยแพร่`;
    }

    return `${getTournamentCategoryLabel(selectedCategoryId)} • เผยแพร่จาก ${data.sourceFileName}`;
  }, [data, selectedCategoryId]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setLoginError("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const json = (await response.json()) as { error?: string };

    if (!response.ok) {
      setLoginError(json.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      setIsBusy(false);
      return;
    }

    setPassword("");
    setStatus("");
    await loadSession();
    setIsBusy(false);
  }

  async function handleLogout() {
    setIsBusy(true);
    await fetch("/api/admin/logout", { method: "POST" });
    setSession((current) =>
      current ? { ...current, authenticated: false } : { configured: true, authenticated: false },
    );
    setIsBusy(false);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const buffer = await file.arrayBuffer();
      const html = decodeTournamentFile(buffer);
      const parsed = parseTournamentHtml(html);
      const payload: StoredTournamentData = {
        ...parsed,
        sourceFileName: file.name,
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: selectedCategoryId, data: payload }),
      });

      const json = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(json.error ?? "บันทึกข้อมูลไม่สำเร็จ");
      }

      setStatus(
        `อัปเดตผลการแข่งขัน ${getTournamentCategoryLabel(selectedCategoryId)} เรียบร้อยแล้ว`,
      );
      await loadResults();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "อัปโหลดไฟล์ไม่สำเร็จ");
    } finally {
      event.target.value = "";
      setIsBusy(false);
    }
  }

  if (!session) {
    return <div className="rounded-[2rem] bg-white/70 p-8 text-violet-900">กำลังโหลด...</div>;
  }

  if (!session.configured) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-amber-900 shadow-sm">
        <h1 className="font-serif text-4xl">ตั้งค่ารหัสผ่านแอดมินก่อนใช้งาน</h1>
        <p className="mt-4 text-base leading-7">
          กรุณาสร้างไฟล์ <code>.env.local</code> แล้วเพิ่มค่า <code>ADMIN_PASSWORD=รหัสผ่านของคุณ</code>
          จากนั้นรีสตาร์ตเซิร์ฟเวอร์ Next.js
        </p>
      </div>
    );
  }

  if (!session.authenticated) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/60 bg-[var(--surface)] p-8 shadow-[0_24px_80px_rgba(109,59,209,0.18)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">Admin Access</p>
        <h1 className="mt-2 font-serif text-4xl text-violet-950">เข้าสู่ระบบแอดมิน</h1>
        <p className="mt-4 text-violet-900/70">หน้านี้ใช้สำหรับอัปเดตไฟล์ผลการแข่งขันที่จะเผยแพร่ให้ผู้ชมเห็น</p>
        <form className="mt-8 flex flex-col gap-4" onSubmit={handleLogin}>
          <input
            className="rounded-2xl border border-violet-200 bg-white px-4 py-3 text-base outline-none ring-0 placeholder:text-violet-300"
            type="password"
            placeholder="กรอกรหัสผ่านแอดมิน"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            className="rounded-full bg-violet-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isBusy || !password.trim()}
          >
            เข้าสู่ระบบ
          </button>
        </form>
        {loginError ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loginError}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(109,59,209,0.12)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">Admin Panel</p>
            <h1 className="mt-2 font-serif text-4xl text-violet-950">อัปเดตผลการแข่งขัน</h1>
            <p className="mt-4 max-w-2xl text-violet-900/70">
              เมื่อคุณอัปโหลดไฟล์ใหม่ ข้อมูลจะถูกเผยแพร่ไปยังหน้า public ทันทีที่บันทึกสำเร็จ
            </p>
          </div>
          <div className="flex gap-3">
            <a className="rounded-full border border-violet-200 px-5 py-3 text-sm font-semibold text-violet-800 transition hover:bg-violet-50" href="/results">
              ดูหน้าสาธารณะ
            </a>
            <button
              className="rounded-full bg-violet-100 px-5 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-200 disabled:opacity-60"
              type="button"
              onClick={handleLogout}
              disabled={isBusy}
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(109,59,209,0.12)] backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">เผยแพร่ข้อมูล</p>
        <h2 className="mt-2 font-serif text-3xl text-violet-950">อัปโหลดไฟล์ HTML ใหม่</h2>
        <p className="mt-4 text-sm leading-7 text-violet-950/75">
          รองรับไฟล์ผลการแข่งขันรูปแบบ Swiss Perfect เมื่ออัปโหลดสำเร็จ หน้า public จะเห็นข้อมูลล่าสุดทันที
        </p>
        <div className="mt-6">
          <label className="mb-3 block text-sm font-semibold text-violet-900">ประเภทการแข่งขัน</label>
          <div className="flex flex-wrap gap-3">
            {tournamentCategories.map((category) => {
              const isActive = category.id === selectedCategoryId;

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
                  onClick={() => setSelectedCategoryId(category.id)}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-violet-300 bg-white/75 px-6 py-8 text-center transition hover:border-violet-500 hover:bg-white">
          <span className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">เลือกไฟล์</span>
          <span className="mt-3 font-serif text-2xl text-violet-950">
            อัปโหลดผลการแข่งขันใหม่สำหรับ {getTournamentCategoryLabel(selectedCategoryId)}
          </span>
          <span className="mt-3 text-sm text-violet-900/65">เฉพาะแอดมินเท่านั้นที่อัปเดตข้อมูลได้</span>
          <input
            className="sr-only"
            type="file"
            accept=".htm,.html,text/html"
            onChange={handleFileChange}
            disabled={isBusy}
          />
        </label>
        {status ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</p> : null}
        {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      </section>

      <TournamentDashboard
        data={data}
        statusLabel={statusLabel}
        emptyTitle={`ยังไม่มีผลการแข่งขัน ${getTournamentCategoryLabel(selectedCategoryId)} ที่เผยแพร่`}
        emptyDescription="เมื่อคุณอัปโหลดและบันทึกไฟล์ของประเภทที่เลือกจากหน้านี้แล้ว รายการล่าสุดจะไปแสดงที่หน้าสาธารณะโดยอัตโนมัติ"
      />
    </div>
  );
}
