"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { TournamentDashboard } from "@/components/tournament-dashboard";
import {
  decodeTournamentFile,
  extractTournamentDocumentText,
  getTournamentCategoryLabel,
  getTournamentRoundLabel,
  parseTournamentHtml,
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

type UploadCardProps = {
  title: string;
  description: string;
  actionLabel: string;
  multiple?: boolean;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function UploadCard({
  title,
  description,
  actionLabel,
  multiple = false,
  disabled,
  onChange,
}: UploadCardProps) {
  return (
    <section className="rounded-[1.75rem] border border-violet-100 bg-white/80 p-5">
      <h3 className="text-2xl font-semibold text-violet-950">{title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-violet-900/70">{description}</p>
      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-violet-300 bg-violet-50/40 px-6 py-7 text-center transition hover:border-violet-500 hover:bg-white">
        <span className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">
          {multiple ? "เลือกหลายไฟล์" : "เลือก 1 ไฟล์"}
        </span>
        <span className="mt-3 font-serif text-2xl text-violet-950">{actionLabel}</span>
        <input
          className="sr-only"
          type="file"
          accept=".htm,.html,text/html"
          multiple={multiple}
          onChange={onChange}
          disabled={disabled}
        />
      </label>
    </section>
  );
}

type DocumentListSectionProps = {
  title: string;
  emptyText: string;
  documents: TournamentDocument[];
  disabled: boolean;
  onDelete: (documentId: string) => Promise<void>;
};

function DocumentListSection({
  title,
  emptyText,
  documents,
  disabled,
  onDelete,
}: DocumentListSectionProps) {
  return (
    <div className="rounded-[1.5rem] border border-violet-100 bg-white/80 p-5">
      <h3 className="text-xl font-semibold text-violet-950">{title}</h3>
      {documents.length ? (
        <div className="mt-4 grid gap-4">
          {documents.map((document) => (
            <article key={document.id} className="rounded-[1.25rem] border border-violet-100 bg-violet-50/40 p-4">
              <h4 className="text-lg font-semibold text-violet-950">{document.title}</h4>
              <p className="mt-2 text-sm text-violet-700/75">
                {document.sourceFileName} • {new Date(document.updatedAt).toLocaleString("th-TH")}
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={() => void onDelete(document.id)}
                  disabled={disabled}
                >
                  ลบไฟล์นี้
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-violet-700/75">{emptyText}</p>
      )}
    </div>
  );
}

export function AdminPageV3() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<TournamentCategoryId>("type-1");
  const [selectedRoundId, setSelectedRoundId] = useState<TournamentRoundId>("round-1");
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
  const round = category?.rounds[selectedRoundId] ?? null;
  const previewData = round?.documents.find((document) => document.parsedData)?.parsedData ?? null;
  const resultDocuments = round?.documents.filter((document) => document.kind === "results") ?? [];
  const sharedPlayerDocuments =
    category?.sharedDocuments.filter((document) => document.kind === "players") ?? [];
  const standingDocuments = round?.documents.filter((document) => document.kind === "standings") ?? [];
  const otherDocuments = round?.documents.filter((document) => document.kind === "other") ?? [];

  const statusLabel = useMemo(() => {
    if (!previewData) {
      return `${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)} ยังไม่มีพรีวิวผลการแข่งขัน`;
    }

    return `${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)} เผยแพร่จาก ${previewData.sourceFileName}`;
  }, [previewData, selectedCategoryId, selectedRoundId]);

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

  async function uploadDocuments(kind: TournamentDocumentKind, files: File[]) {
    if (!files.length) {
      return;
    }

    if (kind === "results" && files.length > 1) {
      setError("ผลการแข่งขันในแต่ละรอบอัปโหลดได้แค่ 1 ไฟล์เท่านั้น");
      return;
    }

    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const documents: TournamentDocument[] = [];
      let parsedCount = 0;
      let unparsedCount = 0;

      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const html = decodeTournamentFile(buffer);
        const { title, contentText } = extractTournamentDocumentText(html);
        const updatedAt = new Date().toISOString();

        let parsedData = null;

        if (kind === "results") {
          try {
            const parsed = parseTournamentHtml(html);
            parsedData = {
              ...parsed,
              sourceFileName: file.name,
              updatedAt,
            };
            parsedCount += 1;
          } catch {
            unparsedCount += 1;
          }
        }

        documents.push({
          id: `${selectedCategoryId}-${selectedRoundId}-${kind}-${file.name}-${updatedAt}`,
          kind,
          title,
          sourceFileName: file.name,
          updatedAt,
          contentText,
          imageDataUrl: null,
          parsedData,
        });
      }

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          roundId: selectedRoundId,
          documentKind: kind,
          documents,
        }),
      });

      const json = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(json.error ?? "อัปโหลดไฟล์ไม่สำเร็จ");
      }

      if (kind === "results") {
        setStatus(
          [
            `อัปโหลดผลการแข่งขันสำหรับ ${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)} เรียบร้อยแล้ว`,
            parsedCount ? `parse ได้ ${parsedCount} ไฟล์` : "",
            unparsedCount ? `และเก็บเป็นเอกสารทั่วไป ${unparsedCount} ไฟล์` : "",
          ]
            .filter(Boolean)
            .join(" "),
        );
      } else if (kind === "players") {
        setStatus(`อัปโหลดรายชื่อผู้เล่นของ ${getTournamentCategoryLabel(selectedCategoryId)} เรียบร้อยแล้ว`);
      } else {
        setStatus(
          `อัปโหลด${kind === "standings" ? " Standing" : " ข้อมูลอื่น ๆ"} สำหรับ ${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)} เรียบร้อยแล้ว`,
        );
      }

      await loadResults();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "อัปโหลดไฟล์ไม่สำเร็จ");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleInputChange(kind: TournamentDocumentKind, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    await uploadDocuments(kind, files);
    event.target.value = "";
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

      setStatus("ลบไฟล์ HTML เรียบร้อยแล้ว");
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
          กรุณาสร้างไฟล์ <code>.env.local</code> แล้วเพิ่มค่า <code>ADMIN_PASSWORD=รหัสผ่านของคุณ</code>{" "}
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
        <p className="mt-4 text-violet-900/70">หน้านี้ใช้สำหรับอัปโหลดและจัดการไฟล์การแข่งขัน</p>
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
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loginError}
          </p>
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
              ผลการแข่งขันของแต่ละรอบอัปโหลดได้เพียง 1 ไฟล์ ส่วนรายชื่อผู้เล่น, Standing และข้อมูลอื่น ๆ
              แยกอัปโหลดเป็นคนละส่วนเพื่อให้จัดการง่ายขึ้น
            </p>
          </div>
          <div className="flex gap-3">
            <a
              className="rounded-full border border-violet-200 px-5 py-3 text-sm font-semibold text-violet-800 transition hover:bg-violet-50"
              href="/results"
            >
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
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">เลือกการแข่งขัน</p>
        <h2 className="mt-2 font-serif text-3xl text-violet-950">เลือกประเภทและรอบที่ต้องการจัดการ</h2>

        <div className="mt-6 space-y-6">
          <div>
            <label className="mb-3 block text-sm font-semibold text-violet-900">ประเภทการแข่งขัน</label>
            <div className="flex flex-wrap gap-3">
              {tournamentCategories.map((categoryOption) => (
                <button
                  key={categoryOption.id}
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    categoryOption.id === selectedCategoryId
                      ? "border-violet-700 bg-violet-700 text-white"
                      : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50",
                  ].join(" ")}
                  type="button"
                  onClick={() => setSelectedCategoryId(categoryOption.id)}
                >
                  {categoryOption.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-semibold text-violet-900">รอบการแข่งขัน</label>
            <div className="flex flex-wrap gap-3">
              {tournamentRounds.map((roundOption) => (
                <button
                  key={roundOption.id}
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    roundOption.id === selectedRoundId
                      ? "border-violet-700 bg-violet-700 text-white"
                      : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50",
                  ].join(" ")}
                  type="button"
                  onClick={() => setSelectedRoundId(roundOption.id)}
                >
                  {roundOption.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {status ? (
          <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {status}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(109,59,209,0.12)] backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">อัปโหลดเอกสาร</p>
        <h2 className="mt-2 font-serif text-3xl text-violet-950">แยกอัปโหลดตามชนิดข้อมูล</h2>

        <div className="mt-6 grid gap-6">
          <UploadCard
            title={`${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)}`}
            description="ผลการแข่งขันของแต่ละรอบอัปโหลดได้เพียง 1 ไฟล์เท่านั้น ถ้าอัปโหลดใหม่ ระบบจะใช้ไฟล์ล่าสุดแทนของเดิมในรอบนั้น"
            actionLabel="อัปโหลดผลการแข่งขัน 1 ไฟล์"
            disabled={isBusy}
            onChange={(event) => void handleInputChange("results", event)}
          />
          <UploadCard
            title={`${getTournamentCategoryLabel(selectedCategoryId)} ใช้ร่วมกันทุก รอบ`}
            description="รายชื่อผู้เล่นเป็นข้อมูลกลางของประเภทการแข่งขัน อัปโหลดครั้งใหม่จะใช้แทนชุดเดิมของประเภทนั้น"
            actionLabel="อัปโหลดรายชื่อผู้เล่น"
            disabled={isBusy}
            onChange={(event) => void handleInputChange("players", event)}
          />
          <UploadCard
            title={`${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)}`}
            description="อัปโหลดไฟล์ Standing ของรอบที่เลือก แยกจากผลการแข่งขันเพื่อให้จัดการง่ายขึ้น"
            actionLabel="อัปโหลด Standing"
            multiple
            disabled={isBusy}
            onChange={(event) => void handleInputChange("standings", event)}
          />
          <UploadCard
            title={`${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)}`}
            description="ใช้สำหรับเอกสาร HTML อื่น ๆ ที่ต้องการแสดงร่วมในหน้านั้น"
            actionLabel="อัปโหลดข้อมูลอื่น ๆ"
            multiple
            disabled={isBusy}
            onChange={(event) => void handleInputChange("other", event)}
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(109,59,209,0.12)] backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500">เอกสารที่อัปโหลดแล้ว</p>
        <h2 className="mt-2 font-serif text-3xl text-violet-950">
          {getTournamentCategoryLabel(selectedCategoryId)} {getTournamentRoundLabel(selectedRoundId)}
        </h2>

        <div className="mt-6 grid gap-6">
          <DocumentListSection
            title="ผลการแข่งขัน"
            emptyText="รอบนี้ยังไม่มีไฟล์ผลการแข่งขัน"
            documents={resultDocuments}
            disabled={isBusy}
            onDelete={handleDeleteDocument}
          />
          <DocumentListSection
            title="รายชื่อผู้เล่น"
            emptyText="ยังไม่มีไฟล์รายชื่อผู้เล่นของประเภทนี้"
            documents={sharedPlayerDocuments}
            disabled={isBusy}
            onDelete={handleDeleteDocument}
          />
          <DocumentListSection
            title="Standing"
            emptyText="รอบนี้ยังไม่มีไฟล์ Standing"
            documents={standingDocuments}
            disabled={isBusy}
            onDelete={handleDeleteDocument}
          />
          <DocumentListSection
            title="ข้อมูลอื่น ๆ"
            emptyText="รอบนี้ยังไม่มีไฟล์ข้อมูลอื่น ๆ"
            documents={otherDocuments}
            disabled={isBusy}
            onDelete={handleDeleteDocument}
          />
        </div>
      </section>

      <TournamentDashboard
        data={previewData}
        statusLabel={statusLabel}
        emptyTitle={`ยังไม่มีผลการแข่งขัน ${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)}`}
        emptyDescription="ถ้ารอบนี้มีไฟล์ผลการแข่งขันที่ระบบ parse ได้ พรีวิวการแข่งขันจะแสดงตรงนี้"
      />
    </div>
  );
}
