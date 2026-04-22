"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { TournamentDashboard } from "@/components/tournament-dashboard";
import {
  getCategoryDocumentsForRound,
  getTournamentCategoryLabel,
  getTournamentDocumentKindLabel,
  getTournamentRoundLabel,
  type StoredTournamentCollection,
  type TournamentCategoryId,
  type TournamentDocument,
  type TournamentDocumentKind,
  type TournamentRoundId,
  tournamentCategories,
  tournamentRounds,
} from "@/lib/tournament";

type SessionResponse = {
  configured: boolean;
  authenticated: boolean;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"));
    };

    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"));
    reader.readAsDataURL(file);
  });
}

export function AdminPageV2() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<TournamentCategoryId>("type-1");
  const [selectedRoundId, setSelectedRoundId] = useState<TournamentRoundId>("round-1");
  const [selectedDocumentKind, setSelectedDocumentKind] =
    useState<TournamentDocumentKind>("results");
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

  const visibleDocuments = getCategoryDocumentsForRound(results[selectedCategoryId], selectedRoundId);
  const previewData =
    visibleDocuments.find((document) => document.parsedData)?.parsedData ?? null;

  const statusLabel = useMemo(() => {
    if (!previewData) {
      return `${getTournamentCategoryLabel(selectedCategoryId)} • ${getTournamentRoundLabel(selectedRoundId)} ยังไม่มีพรีวิว`;
    }

    return `${getTournamentCategoryLabel(selectedCategoryId)} • ${getTournamentRoundLabel(selectedRoundId)} • เผยแพร่จาก ${previewData.sourceFileName}`;
  }, [previewData, selectedCategoryId, selectedRoundId]);

  const visibleDocumentKinds = useMemo(
    () => [
      { id: "results" as const, label: "ผลการแข่งขัน" },
      { id: "players" as const, label: "รายชื่อผู้เล่น" },
      { id: "other" as const, label: "ข้อมูลอื่น ๆ" },
    ],
    [],
  );
  const individualCategories = useMemo(
    () => tournamentCategories.filter((category) => category.label.includes("บุคคล")),
    [],
  );
  const teamCategories = useMemo(
    () => tournamentCategories.filter((category) => category.label.includes("ทีม")),
    [],
  );

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
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const documents: TournamentDocument[] = [];

      for (const file of files) {
        const imageDataUrl = await readFileAsDataUrl(file);
        const title = file.name.replace(/\.[^.]+$/, "") || file.name;
        const updatedAt = new Date().toISOString();

        documents.push({
          id: `${selectedCategoryId}-${selectedRoundId}-${file.name}-${updatedAt}`,
          kind: selectedDocumentKind,
          title,
          sourceFileName: file.name,
          updatedAt,
          contentText: file.name,
          imageDataUrl,
          parsedData: null,
        });
      }

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          roundId: selectedRoundId,
          documentKind: selectedDocumentKind,
          documents,
        }),
      });

      const json = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(json.error ?? "บันทึกข้อมูลไม่สำเร็จ");
      }

      const statusParts = [
        `อัปโหลด ${files.length} ไฟล์ให้ ${getTournamentCategoryLabel(selectedCategoryId)}`,
        selectedDocumentKind === "players"
          ? "(ข้อมูลส่วนกลางของทั้งประเภท)"
          : getTournamentRoundLabel(selectedRoundId),
        `ในหมวด ${getTournamentDocumentKindLabel(selectedDocumentKind)} เรียบร้อยแล้ว`,
      ];

      setStatus(statusParts.join(" "));
      await loadResults();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "อัปโหลดไฟล์ไม่สำเร็จ");
    } finally {
      event.target.value = "";
      setIsBusy(false);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const response = await fetch("/api/admin/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          roundId: selectedRoundId,
          documentId,
        }),
      });

      const json = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(json.error ?? "ลบไฟล์ไม่สำเร็จ");
      }

      setStatus("ลบไฟล์รูปภาพออกจากรายการเรียบร้อยแล้ว");
      await loadResults();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "ลบไฟล์ไม่สำเร็จ");
    } finally {
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
            <h1 className="mt-2 font-serif text-4xl text-violet-950">อัปเดตข้อมูลการแข่งขัน</h1>
            <p className="mt-4 max-w-2xl text-violet-900/70">
              แต่ละประเภทมี 5 รอบ และในแต่ละรอบคุณสามารถอัปโหลดไฟล์รูปภาพได้หลายไฟล์ เช่นผลการแข่งขัน รายชื่อผู้เล่น Standings และข้อมูลอื่น ๆ
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
        <h2 className="mt-2 font-serif text-3xl text-violet-950">เลือกประเภท รอบ และชนิดข้อมูล</h2>

        <div className="mt-6 space-y-6">
          <div>
            <label className="mb-3 block text-sm font-semibold text-violet-900">ประเภทการแข่งขัน</label>
            <div className="grid gap-4">
              <div>
                <p className="mb-3 text-sm font-semibold text-violet-700">บุคคล</p>
                <div className="flex flex-wrap gap-3">
                  {individualCategories.map((category) => (
                    <button
                      key={category.id}
                      className={[
                        "rounded-full border px-4 py-2 text-sm font-semibold transition",
                        category.id === selectedCategoryId
                          ? "border-violet-700 bg-violet-700 text-white"
                          : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50",
                      ].join(" ")}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
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
                        "rounded-full border px-4 py-2 text-sm font-semibold transition",
                        category.id === selectedCategoryId
                          ? "border-violet-700 bg-violet-700 text-white"
                          : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50",
                      ].join(" ")}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-semibold text-violet-900">รอบการแข่งขัน</label>
            <div className="flex flex-wrap gap-3">
              {tournamentRounds.map((round) => (
                <button
                  key={round.id}
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    round.id === selectedRoundId && selectedDocumentKind !== "standings"
                      ? "border-violet-700 bg-violet-700 text-white"
                      : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50",
                  ].join(" ")}
                  type="button"
                  onClick={() => {
                    setSelectedRoundId(round.id);
                    if (selectedDocumentKind === "standings") {
                      setSelectedDocumentKind("results");
                    }
                  }}
                >
                  {round.label}
                </button>
              ))}
              <button
                className={[
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  selectedDocumentKind === "standings"
                    ? "border-violet-700 bg-violet-700 text-white"
                    : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50",
                ].join(" ")}
                type="button"
                onClick={() => setSelectedDocumentKind("standings")}
              >
                Standings
              </button>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-semibold text-violet-900">ชนิดข้อมูล</label>
            <div className="flex flex-wrap gap-3">
              {visibleDocumentKinds.map((kind) => (
                <button
                  key={kind.id}
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    kind.id === selectedDocumentKind
                      ? "border-violet-700 bg-violet-700 text-white"
                      : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50",
                  ].join(" ")}
                  type="button"
                  onClick={() => setSelectedDocumentKind(kind.id)}
                >
                  {kind.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-violet-300 bg-white/75 px-6 py-8 text-center transition hover:border-violet-500 hover:bg-white">
          <span className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">เลือกไฟล์หลายไฟล์</span>
          <span className="mt-3 font-serif text-2xl text-violet-950">
            อัปโหลด {getTournamentDocumentKindLabel(selectedDocumentKind)} สำหรับ{" "}
            {getTournamentCategoryLabel(selectedCategoryId)}{" "}
            {selectedDocumentKind === "players"
              ? "(ใช้ร่วมกันทุก รอบ)"
              : getTournamentRoundLabel(selectedRoundId)}
          </span>
          <span className="mt-3 text-sm text-violet-900/65">
            {selectedDocumentKind === "players"
              ? "รายชื่อผู้เล่นเป็นข้อมูลเดียวกันทั้งการแข่งขัน อัปโหลดครั้งเดียวก็พอ"
              : selectedDocumentKind === "standings"
                ? "ใช้สำหรับอัปโหลดรูปภาพสรุปผลการแข่งขัน และระบบจะแสดงต่อท้ายในช่องผลการแข่งขัน"
                : "ถ้าเลือกหมวดผลการแข่งขัน ระบบจะเก็บรูปภาพไว้เพื่อแสดงบนหน้าเว็บ"}
          </span>
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={isBusy}
          />
        </label>
        {status ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</p> : null}
        {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      </section>

      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(109,59,209,0.12)] backdrop-blur sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">เอกสารในรอบนี้</p>
            <h2 className="mt-2 font-serif text-3xl text-violet-950">
              {getTournamentCategoryLabel(selectedCategoryId)} {getTournamentRoundLabel(selectedRoundId)}
            </h2>
          </div>
          <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
            {visibleDocuments.length} ไฟล์
          </span>
        </div>

        {visibleDocuments.length ? (
          <div className="mt-6 grid gap-4">
            {visibleDocuments.map((document) => (
              <article
                key={document.id}
                className="rounded-[1.5rem] border border-violet-100 bg-white/80 p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">
                      {getTournamentDocumentKindLabel(document.kind)}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-violet-950">{document.title}</h3>
                    <p className="mt-2 text-sm text-violet-700/75">
                      {document.sourceFileName} • {new Date(document.updatedAt).toLocaleString("th-TH")}
                    </p>
                  </div>
                  <span className="rounded-full bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">
                    {document.parsedData ? "มีข้อมูลแข่งขัน" : "เอกสารทั่วไป"}
                  </span>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    onClick={() => void handleDeleteDocument(document.id)}
                    disabled={isBusy}
                  >
                    ลบไฟล์นี้
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-violet-200 bg-white/60 px-5 py-10 text-center text-violet-700/75">
            รอบนี้ยังไม่มีไฟล์ที่อัปโหลด
          </div>
        )}
      </section>

      <TournamentDashboard
        data={previewData}
        statusLabel={statusLabel}
        emptyTitle={`ยังไม่มีผลการแข่งขัน ${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)}`}
        emptyDescription="ถ้ารอบนี้มีไฟล์ผลการแข่งขันแบบ Swiss Perfect ระบบจะแสดงพรีวิวการแข่งขันตรงนี้โดยอัตโนมัติ"
      />
    </div>
  );
}
