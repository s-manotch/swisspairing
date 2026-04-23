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
    <section className="rounded-[1.75rem] border border-emerald-100 bg-white/80 p-5">
      <h3 className="text-2xl font-semibold text-emerald-950">{title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-900/70">{description}</p>
      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-emerald-300 bg-emerald-50/40 px-6 py-7 text-center transition hover:border-emerald-500 hover:bg-white">
        <span className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-500">
          {multiple ? "เน€เธฅเธทเธญเธเธซเธฅเธฒเธขเนเธเธฅเน" : "เน€เธฅเธทเธญเธ 1 เนเธเธฅเน"}
        </span>
        <span className="mt-3 font-serif text-2xl text-emerald-950">{actionLabel}</span>
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
    <div className="rounded-[1.5rem] border border-emerald-100 bg-white/80 p-5">
      <h3 className="text-xl font-semibold text-emerald-950">{title}</h3>
      {documents.length ? (
        <div className="mt-4 grid gap-4">
          {documents.map((document) => (
            <article key={document.id} className="rounded-[1.25rem] border border-emerald-100 bg-emerald-50/40 p-4">
              <h4 className="text-lg font-semibold text-emerald-950">{document.title}</h4>
              <p className="mt-2 text-sm text-emerald-700/75">
                {document.sourceFileName} โ€ข {new Date(document.updatedAt).toLocaleString("th-TH")}
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={() => void onDelete(document.id)}
                  disabled={disabled}
                >
                  เธฅเธเนเธเธฅเนเธเธตเน
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-emerald-700/75">{emptyText}</p>
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
      return `${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)} เธขเธฑเธเนเธกเนเธกเธตเธเธฃเธตเธงเธดเธงเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธ`;
    }

    return `${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)} เน€เธเธขเนเธเธฃเนเธเธฒเธ ${previewData.sourceFileName}`;
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
      setLoginError(json.error ?? "เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเนเธกเนเธชเธณเน€เธฃเนเธ");
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
      setError("เธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธเนเธเนเธ•เนเธฅเธฐเธฃเธญเธเธญเธฑเธเนเธซเธฅเธ”เนเธ”เนเนเธเน 1 เนเธเธฅเนเน€เธ—เนเธฒเธเธฑเนเธ");
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
        throw new Error(json.error ?? "เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเนเนเธกเนเธชเธณเน€เธฃเนเธ");
      }

      if (kind === "results") {
        setStatus(
          [
            `เธญเธฑเธเนเธซเธฅเธ”เธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธเธชเธณเธซเธฃเธฑเธ ${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)} เน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง`,
            parsedCount ? `parse เนเธ”เน ${parsedCount} เนเธเธฅเน` : "",
            unparsedCount ? `เนเธฅเธฐเน€เธเนเธเน€เธเนเธเน€เธญเธเธชเธฒเธฃเธ—เธฑเนเธงเนเธ ${unparsedCount} เนเธเธฅเน` : "",
          ]
            .filter(Boolean)
            .join(" "),
        );
      } else if (kind === "players") {
        setStatus(`เธญเธฑเธเนเธซเธฅเธ”เธฃเธฒเธขเธเธทเนเธญเธเธนเนเน€เธฅเนเธเธเธญเธ ${getTournamentCategoryLabel(selectedCategoryId)} เน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง`);
      } else {
        setStatus(
          `เธญเธฑเธเนเธซเธฅเธ”${kind === "standings" ? " Standing" : " เธเนเธญเธกเธนเธฅเธญเธทเนเธ เน"} เธชเธณเธซเธฃเธฑเธ ${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)} เน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง`,
        );
      }

      await loadResults();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเนเนเธกเนเธชเธณเน€เธฃเนเธ");
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
        throw new Error(json.error ?? "เธฅเธเนเธเธฅเนเนเธกเนเธชเธณเน€เธฃเนเธ");
      }

      setStatus("เธฅเธเนเธเธฅเน HTML เน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง");
      await loadResults();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "เธฅเธเนเธเธฅเนเนเธกเนเธชเธณเน€เธฃเนเธ");
    } finally {
      setIsBusy(false);
    }
  }

  if (!session) {
    return <div className="rounded-[2rem] bg-white/70 p-8 text-emerald-900">เธเธณเธฅเธฑเธเนเธซเธฅเธ”...</div>;
  }

  if (!session.configured) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-amber-900 shadow-sm">
        <h1 className="font-serif text-4xl">เธ•เธฑเนเธเธเนเธฒเธฃเธซเธฑเธชเธเนเธฒเธเนเธญเธ”เธกเธดเธเธเนเธญเธเนเธเนเธเธฒเธ</h1>
        <p className="mt-4 text-base leading-7">
          เธเธฃเธธเธ“เธฒเธชเธฃเนเธฒเธเนเธเธฅเน <code>.env.local</code> เนเธฅเนเธงเน€เธเธดเนเธกเธเนเธฒ <code>ADMIN_PASSWORD=เธฃเธซเธฑเธชเธเนเธฒเธเธเธญเธเธเธธเธ“</code>{" "}
          เธเธฒเธเธเธฑเนเธเธฃเธตเธชเธ•เธฒเธฃเนเธ•เน€เธเธดเธฃเนเธเน€เธงเธญเธฃเน Next.js
        </p>
      </div>
    );
  }

  if (!session.authenticated) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/60 bg-[var(--surface)] p-8 shadow-[0_24px_80px_rgba(22,101,52,0.18)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">Admin Access</p>
        <h1 className="mt-2 font-serif text-4xl text-emerald-950">เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเนเธญเธ”เธกเธดเธ</h1>
        <p className="mt-4 text-emerald-900/70">เธซเธเนเธฒเธเธตเนเนเธเนเธชเธณเธซเธฃเธฑเธเธญเธฑเธเนเธซเธฅเธ”เนเธฅเธฐเธเธฑเธ”เธเธฒเธฃเนเธเธฅเนเธเธฒเธฃเนเธเนเธเธเธฑเธ</p>
        <form className="mt-8 flex flex-col gap-4" onSubmit={handleLogin}>
          <input
            className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base outline-none ring-0 placeholder:text-emerald-300"
            type="password"
            placeholder="เธเธฃเธญเธเธฃเธซเธฑเธชเธเนเธฒเธเนเธญเธ”เธกเธดเธ"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isBusy || !password.trim()}
          >
            เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ
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
      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(22,101,52,0.12)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">Admin Panel</p>
            <h1 className="mt-2 font-serif text-4xl text-emerald-950">เธญเธฑเธเน€เธ”เธ•เธเนเธญเธกเธนเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธ</h1>
            <p className="mt-4 max-w-2xl text-emerald-900/70">
              เธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธเธเธญเธเนเธ•เนเธฅเธฐเธฃเธญเธเธญเธฑเธเนเธซเธฅเธ”เนเธ”เนเน€เธเธตเธขเธ 1 เนเธเธฅเน เธชเนเธงเธเธฃเธฒเธขเธเธทเนเธญเธเธนเนเน€เธฅเนเธ, Standing เนเธฅเธฐเธเนเธญเธกเธนเธฅเธญเธทเนเธ เน
              เนเธขเธเธญเธฑเธเนเธซเธฅเธ”เน€เธเนเธเธเธเธฅเธฐเธชเนเธงเธเน€เธเธทเนเธญเนเธซเนเธเธฑเธ”เธเธฒเธฃเธเนเธฒเธขเธเธถเนเธ
            </p>
          </div>
          <div className="flex gap-3">
            <a
              className="rounded-full border border-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
              href="/results"
            >
              เธ”เธนเธซเธเนเธฒเธชเธฒเธเธฒเธฃเธ“เธฐ
            </a>
            <button
              className="rounded-full bg-emerald-100 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-60"
              type="button"
              onClick={handleLogout}
              disabled={isBusy}
            >
              เธญเธญเธเธเธฒเธเธฃเธฐเธเธ
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(22,101,52,0.12)] backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">เน€เธฅเธทเธญเธเธเธฒเธฃเนเธเนเธเธเธฑเธ</p>
        <h2 className="mt-2 font-serif text-3xl text-emerald-950">เน€เธฅเธทเธญเธเธเธฃเธฐเน€เธ เธ—เนเธฅเธฐเธฃเธญเธเธ—เธตเนเธ•เนเธญเธเธเธฒเธฃเธเธฑเธ”เธเธฒเธฃ</h2>

        <div className="mt-6 space-y-6">
          <div>
            <label className="mb-3 block text-sm font-semibold text-emerald-900">เธเธฃเธฐเน€เธ เธ—เธเธฒเธฃเนเธเนเธเธเธฑเธ</label>
            <div className="flex flex-wrap gap-3">
              {tournamentCategories.map((categoryOption) => (
                <button
                  key={categoryOption.id}
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    categoryOption.id === selectedCategoryId
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
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
            <label className="mb-3 block text-sm font-semibold text-emerald-900">เธฃเธญเธเธเธฒเธฃเนเธเนเธเธเธฑเธ</label>
            <div className="flex flex-wrap gap-3">
              {tournamentRounds.map((roundOption) => (
                <button
                  key={roundOption.id}
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    roundOption.id === selectedRoundId
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
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

      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(22,101,52,0.12)] backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">เธญเธฑเธเนเธซเธฅเธ”เน€เธญเธเธชเธฒเธฃ</p>
        <h2 className="mt-2 font-serif text-3xl text-emerald-950">เนเธขเธเธญเธฑเธเนเธซเธฅเธ”เธ•เธฒเธกเธเธเธดเธ”เธเนเธญเธกเธนเธฅ</h2>

        <div className="mt-6 grid gap-6">
          <UploadCard
            title={`${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)}`}
            description="เธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธเธเธญเธเนเธ•เนเธฅเธฐเธฃเธญเธเธญเธฑเธเนเธซเธฅเธ”เนเธ”เนเน€เธเธตเธขเธ 1 เนเธเธฅเนเน€เธ—เนเธฒเธเธฑเนเธ เธ–เนเธฒเธญเธฑเธเนเธซเธฅเธ”เนเธซเธกเน เธฃเธฐเธเธเธเธฐเนเธเนเนเธเธฅเนเธฅเนเธฒเธชเธธเธ”เนเธ—เธเธเธญเธเน€เธ”เธดเธกเนเธเธฃเธญเธเธเธฑเนเธ"
            actionLabel="เธญเธฑเธเนเธซเธฅเธ”เธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธ 1 เนเธเธฅเน"
            disabled={isBusy}
            onChange={(event) => void handleInputChange("results", event)}
          />
          <UploadCard
            title={`${getTournamentCategoryLabel(selectedCategoryId)} เนเธเนเธฃเนเธงเธกเธเธฑเธเธ—เธธเธ เธฃเธญเธ`}
            description="เธฃเธฒเธขเธเธทเนเธญเธเธนเนเน€เธฅเนเธเน€เธเนเธเธเนเธญเธกเธนเธฅเธเธฅเธฒเธเธเธญเธเธเธฃเธฐเน€เธ เธ—เธเธฒเธฃเนเธเนเธเธเธฑเธ เธญเธฑเธเนเธซเธฅเธ”เธเธฃเธฑเนเธเนเธซเธกเนเธเธฐเนเธเนเนเธ—เธเธเธธเธ”เน€เธ”เธดเธกเธเธญเธเธเธฃเธฐเน€เธ เธ—เธเธฑเนเธ"
            actionLabel="เธญเธฑเธเนเธซเธฅเธ”เธฃเธฒเธขเธเธทเนเธญเธเธนเนเน€เธฅเนเธ"
            disabled={isBusy}
            onChange={(event) => void handleInputChange("players", event)}
          />
          <UploadCard
            title={`${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)}`}
            description="เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเน Standing เธเธญเธเธฃเธญเธเธ—เธตเนเน€เธฅเธทเธญเธ เนเธขเธเธเธฒเธเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธเน€เธเธทเนเธญเนเธซเนเธเธฑเธ”เธเธฒเธฃเธเนเธฒเธขเธเธถเนเธ"
            actionLabel="เธญเธฑเธเนเธซเธฅเธ” Standing"
            multiple
            disabled={isBusy}
            onChange={(event) => void handleInputChange("standings", event)}
          />
          <UploadCard
            title={`${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)}`}
            description="เนเธเนเธชเธณเธซเธฃเธฑเธเน€เธญเธเธชเธฒเธฃ HTML เธญเธทเนเธ เน เธ—เธตเนเธ•เนเธญเธเธเธฒเธฃเนเธชเธ”เธเธฃเนเธงเธกเนเธเธซเธเนเธฒเธเธฑเนเธ"
            actionLabel="เธญเธฑเธเนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเธญเธทเนเธ เน"
            multiple
            disabled={isBusy}
            onChange={(event) => void handleInputChange("other", event)}
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(22,101,52,0.12)] backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">เน€เธญเธเธชเธฒเธฃเธ—เธตเนเธญเธฑเธเนเธซเธฅเธ”เนเธฅเนเธง</p>
        <h2 className="mt-2 font-serif text-3xl text-emerald-950">
          {getTournamentCategoryLabel(selectedCategoryId)} {getTournamentRoundLabel(selectedRoundId)}
        </h2>

        <div className="mt-6 grid gap-6">
          <DocumentListSection
            title="เธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธ"
            emptyText="เธฃเธญเธเธเธตเนเธขเธฑเธเนเธกเนเธกเธตเนเธเธฅเนเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธ"
            documents={resultDocuments}
            disabled={isBusy}
            onDelete={handleDeleteDocument}
          />
          <DocumentListSection
            title="เธฃเธฒเธขเธเธทเนเธญเธเธนเนเน€เธฅเนเธ"
            emptyText="เธขเธฑเธเนเธกเนเธกเธตเนเธเธฅเนเธฃเธฒเธขเธเธทเนเธญเธเธนเนเน€เธฅเนเธเธเธญเธเธเธฃเธฐเน€เธ เธ—เธเธตเน"
            documents={sharedPlayerDocuments}
            disabled={isBusy}
            onDelete={handleDeleteDocument}
          />
          <DocumentListSection
            title="Standing"
            emptyText="เธฃเธญเธเธเธตเนเธขเธฑเธเนเธกเนเธกเธตเนเธเธฅเน Standing"
            documents={standingDocuments}
            disabled={isBusy}
            onDelete={handleDeleteDocument}
          />
          <DocumentListSection
            title="เธเนเธญเธกเธนเธฅเธญเธทเนเธ เน"
            emptyText="เธฃเธญเธเธเธตเนเธขเธฑเธเนเธกเนเธกเธตเนเธเธฅเนเธเนเธญเธกเธนเธฅเธญเธทเนเธ เน"
            documents={otherDocuments}
            disabled={isBusy}
            onDelete={handleDeleteDocument}
          />
        </div>
      </section>

      <TournamentDashboard
        data={previewData}
        statusLabel={statusLabel}
        emptyTitle={`เธขเธฑเธเนเธกเนเธกเธตเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธ ${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)}`}
        emptyDescription="เธ–เนเธฒเธฃเธญเธเธเธตเนเธกเธตเนเธเธฅเนเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธเธ—เธตเนเธฃเธฐเธเธ parse เนเธ”เน เธเธฃเธตเธงเธดเธงเธเธฒเธฃเนเธเนเธเธเธฑเธเธเธฐเนเธชเธ”เธเธ•เธฃเธเธเธตเน"
      />
    </div>
  );
}

