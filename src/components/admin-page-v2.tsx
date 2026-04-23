"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { TournamentDashboard } from "@/components/tournament-dashboard";
import {
  getPublicDocumentDownloadUrl,
  getPublicDocumentKindLabel,
  getCategoryDocumentsForRound,
  getTournamentCategoryLabel,
  getTournamentDocumentKindLabel,
  getTournamentRoundLabel,
  publicDocumentKinds,
  type PublicDocument,
  type PublicDocumentKind,
  type StoredTournamentCollection,
  type TournamentCategoryId,
  type TournamentDocument,
  type TournamentDocumentKind,
  type TournamentRoundId,
  tournamentCategories,
  tournamentRounds,
} from "@/lib/tournament";

const uploadChunkSize = 3 * 1024 * 1024;

type SessionResponse = {
  configured: boolean;
  authenticated: boolean;
};

type ResultsResponse = {
  results?: StoredTournamentCollection;
  publicDocuments?: Partial<Record<PublicDocumentKind, PublicDocument>>;
};

function removeDocumentFromResults(
  currentResults: StoredTournamentCollection,
  categoryId: TournamentCategoryId,
  roundId: TournamentRoundId,
  documentId: string,
) {
  const category = currentResults[categoryId];

  if (!category) {
    return currentResults;
  }

  const nextSharedDocuments = category.sharedDocuments.filter((document) => document.id !== documentId);
  const currentRound = category.rounds[roundId];
  const nextRound = currentRound
    ? {
        ...currentRound,
        documents: currentRound.documents.filter((document) => document.id !== documentId),
      }
    : undefined;

  return {
    ...currentResults,
    [categoryId]: {
      ...category,
      sharedDocuments: nextSharedDocuments,
      rounds: {
        ...category.rounds,
        ...(nextRound ? { [roundId]: nextRound } : {}),
      },
    },
  };
}

async function readJsonSafely(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as { error?: string };
  } catch {
    return {
      error: response.ok ? "เธฃเธฐเธเธเธ•เธญเธเธเธฅเธฑเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ" : `เน€เธเธดเธฃเนเธเน€เธงเธญเธฃเนเธ•เธญเธเธเธฅเธฑเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ (${response.status})`,
    };
  }
}

async function uploadFileToStorage(file: File, storageGroup: string) {
  const uploadId = `${Date.now()}-${crypto.randomUUID()}`;
  const updatedAt = new Date().toISOString();
  const totalChunks = Math.max(1, Math.ceil(file.size / uploadChunkSize));

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const chunk = file.slice(chunkIndex * uploadChunkSize, (chunkIndex + 1) * uploadChunkSize);
    const formData = new FormData();
    formData.set("action", "chunk");
    formData.set("uploadId", uploadId);
    formData.set("fileName", file.name);
    formData.set("contentType", file.type || "application/octet-stream");
    formData.set("updatedAt", updatedAt);
    formData.set("totalSize", String(file.size));
    formData.set("chunkIndex", String(chunkIndex));
    formData.set("chunk", chunk, file.name);

    const chunkResponse = await fetch("/api/admin/file-uploads", {
      method: "POST",
      body: formData,
    });
    const chunkJson = await readJsonSafely(chunkResponse);

    if (!chunkResponse.ok) {
      throw new Error(chunkJson.error ?? `เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเนเนเธกเนเธชเธณเน€เธฃเนเธเธ—เธตเนเธเธดเนเธ ${chunkIndex + 1}`);
    }
  }

  const finalizeFormData = new FormData();
  finalizeFormData.set("action", "finalize");
  finalizeFormData.set("uploadId", uploadId);
  finalizeFormData.set("storageGroup", storageGroup);
  finalizeFormData.set("fileName", file.name);
  finalizeFormData.set("contentType", file.type || "application/octet-stream");
  finalizeFormData.set("updatedAt", updatedAt);
  finalizeFormData.set("totalSize", String(file.size));
  finalizeFormData.set("totalChunks", String(totalChunks));

  const finalizeResponse = await fetch("/api/admin/file-uploads", {
    method: "POST",
    body: finalizeFormData,
  });
  const finalizeJson = (await readJsonSafely(finalizeResponse)) as {
    error?: string;
    fileBlobKey?: string;
    mimeType?: string;
    fileSize?: number;
  };

  if (!finalizeResponse.ok || !finalizeJson.fileBlobKey) {
    throw new Error(finalizeJson.error ?? "เธเธฑเธเธ—เธถเธเนเธเธฅเนเธ—เธตเนเธญเธฑเธเนเธซเธฅเธ”เนเธกเนเธชเธณเน€เธฃเนเธ");
  }

  return {
    updatedAt,
    fileBlobKey: finalizeJson.fileBlobKey,
    mimeType: finalizeJson.mimeType ?? file.type ?? "application/octet-stream",
    fileSize: finalizeJson.fileSize ?? file.size,
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธญเนเธฒเธเนเธเธฅเนเธฃเธนเธเธ เธฒเธเนเธ”เน"));
    };

    reader.onerror = () => reject(new Error("เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธญเนเธฒเธเนเธเธฅเนเธฃเธนเธเธ เธฒเธเนเธ”เน"));
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
  const [publicDocuments, setPublicDocuments] = useState<
    Partial<Record<PublicDocumentKind, PublicDocument>>
  >({});

  async function loadSession() {
    const response = await fetch("/api/admin/session", { cache: "no-store" });
    const json = (await response.json()) as SessionResponse;
    setSession(json);
  }

  async function loadResults() {
    const response = await fetch("/api/results", { cache: "no-store" });
    const json = (await response.json()) as ResultsResponse;
    setResults(json.results ?? {});
    setPublicDocuments(json.publicDocuments ?? {});
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
      return `${getTournamentCategoryLabel(selectedCategoryId)} โ€ข ${getTournamentRoundLabel(selectedRoundId)} เธขเธฑเธเนเธกเนเธกเธตเธเธฃเธตเธงเธดเธง`;
    }

    return `${getTournamentCategoryLabel(selectedCategoryId)} โ€ข ${getTournamentRoundLabel(selectedRoundId)} โ€ข เน€เธเธขเนเธเธฃเนเธเธฒเธ ${previewData.sourceFileName}`;
  }, [previewData, selectedCategoryId, selectedRoundId]);

  const visibleDocumentKinds = useMemo(
    () => [
      { id: "results" as const, label: "เธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธ" },
      { id: "players" as const, label: "เธฃเธฒเธขเธเธทเนเธญเธเธนเนเน€เธฅเนเธ" },
      { id: "other" as const, label: "เธเนเธญเธกเธนเธฅเธญเธทเนเธ เน" },
    ],
    [],
  );
  const individualCategories = useMemo(
    () => tournamentCategories.filter((category) => category.label.includes("เธเธธเธเธเธฅ")),
    [],
  );
  const teamCategories = useMemo(
    () => tournamentCategories.filter((category) => category.label.includes("เธ—เธตเธก")),
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
        const storedFile = await uploadFileToStorage(file, `tournament-${selectedDocumentKind}`);
        const title = file.name.replace(/\.[^.]+$/, "") || file.name;
        const updatedAt = storedFile.updatedAt;

        documents.push({
          id: `${selectedCategoryId}-${selectedRoundId}-${file.name}-${updatedAt}`,
          kind: selectedDocumentKind,
          title,
          sourceFileName: file.name,
          updatedAt,
          contentText: file.name,
          imageDataUrl: null,
          fileBlobKey: storedFile.fileBlobKey,
          mimeType: storedFile.mimeType,
          fileSize: storedFile.fileSize,
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

      const json = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(json.error ?? "เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅเนเธกเนเธชเธณเน€เธฃเนเธ");
      }

      const statusParts = [
        `เธญเธฑเธเนเธซเธฅเธ” ${files.length} เนเธเธฅเนเนเธซเน ${getTournamentCategoryLabel(selectedCategoryId)}`,
        selectedDocumentKind === "players"
          ? "(เธเนเธญเธกเธนเธฅเธชเนเธงเธเธเธฅเธฒเธเธเธญเธเธ—เธฑเนเธเธเธฃเธฐเน€เธ เธ—)"
          : getTournamentRoundLabel(selectedRoundId),
        `เนเธเธซเธกเธงเธ” ${getTournamentDocumentKindLabel(selectedDocumentKind)} เน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง`,
      ];

      setStatus(statusParts.join(" "));
      await loadResults();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเนเนเธกเนเธชเธณเน€เธฃเนเธ");
    } finally {
      event.target.value = "";
      setIsBusy(false);
    }
  }

  async function handlePublicDocumentUpload(
    kind: PublicDocumentKind,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {
      setError(`เนเธเธฅเนเธชเธณเธซเธฃเธฑเธ ${getPublicDocumentKindLabel(kind)} เธ•เนเธญเธเน€เธเนเธ PDF เน€เธ—เนเธฒเธเธฑเนเธ`);
      event.target.value = "";
      return;
    }

    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const storedFile = await uploadFileToStorage(file, `public-${kind}`);
      const updatedAt = storedFile.updatedAt;
      const title = file.name.replace(/\.[^.]+$/, "") || getPublicDocumentKindLabel(kind);

      const response = await fetch("/api/admin/public-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: {
            kind,
            title,
            sourceFileName: file.name,
            updatedAt,
            dataUrl: null,
            fileBlobKey: storedFile.fileBlobKey,
            mimeType: storedFile.mimeType,
            fileSize: storedFile.fileSize,
          } satisfies PublicDocument,
        }),
      });

      const json = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(json.error ?? "เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเน PDF เนเธกเนเธชเธณเน€เธฃเนเธ");
      }

      setStatus(`เธญเธฑเธเนเธซเธฅเธ” ${getPublicDocumentKindLabel(kind)} เน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง`);
      await loadResults();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเน PDF เนเธกเนเธชเธณเน€เธฃเนเธ");
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

      const json = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(json.error ?? "เธฅเธเนเธเธฅเนเนเธกเนเธชเธณเน€เธฃเนเธ");
      }

      setResults((currentResults) =>
        removeDocumentFromResults(
          currentResults,
          selectedCategoryId,
          selectedRoundId,
          documentId,
        ),
      );
      setStatus("เธฅเธเนเธเธฅเนเธฃเธนเธเธ เธฒเธเธญเธญเธเธเธฒเธเธฃเธฒเธขเธเธฒเธฃเน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง");
      window.setTimeout(() => {
        void loadResults();
      }, 800);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "เธฅเธเนเธเธฅเนเนเธกเนเธชเธณเน€เธฃเนเธ");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeletePublicDocument(kind: PublicDocumentKind) {
    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const response = await fetch("/api/admin/public-documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });

      const json = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(json.error ?? "เธฅเธเนเธเธฅเน PDF เนเธกเนเธชเธณเน€เธฃเนเธ");
      }

      setPublicDocuments((currentDocuments) => {
        const nextDocuments = { ...currentDocuments };
        delete nextDocuments[kind];
        return nextDocuments;
      });
      setStatus(`เธฅเธ ${getPublicDocumentKindLabel(kind)} เน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง`);
      window.setTimeout(() => {
        void loadResults();
      }, 800);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "เธฅเธเนเธเธฅเน PDF เนเธกเนเธชเธณเน€เธฃเนเธ");
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
          เธเธฃเธธเธ“เธฒเธชเธฃเนเธฒเธเนเธเธฅเน <code>.env.local</code> เนเธฅเนเธงเน€เธเธดเนเธกเธเนเธฒ <code>ADMIN_PASSWORD=เธฃเธซเธฑเธชเธเนเธฒเธเธเธญเธเธเธธเธ“</code>
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
        <p className="mt-4 text-emerald-900/70">เธซเธเนเธฒเธเธตเนเนเธเนเธชเธณเธซเธฃเธฑเธเธญเธฑเธเน€เธ”เธ•เนเธเธฅเนเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธเธ—เธตเนเธเธฐเน€เธเธขเนเธเธฃเนเนเธซเนเธเธนเนเธเธกเน€เธซเนเธ</p>
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
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loginError}</p>
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
              เนเธ•เนเธฅเธฐเธเธฃเธฐเน€เธ เธ—เธกเธต 5 เธฃเธญเธ เนเธฅเธฐเนเธเนเธ•เนเธฅเธฐเธฃเธญเธเธเธธเธ“เธชเธฒเธกเธฒเธฃเธ–เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเนเธฃเธนเธเธ เธฒเธเนเธ”เนเธซเธฅเธฒเธขเนเธเธฅเน เน€เธเนเธเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธ เธฃเธฒเธขเธเธทเนเธญเธเธนเนเน€เธฅเนเธ Standings เนเธฅเธฐเธเนเธญเธกเธนเธฅเธญเธทเนเธ เน
            </p>
          </div>
          <div className="flex gap-3">
            <a className="rounded-full border border-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50" href="/results">
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
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">เน€เธเธขเนเธเธฃเนเธเนเธญเธกเธนเธฅ</p>
        <h2 className="mt-2 font-serif text-3xl text-emerald-950">เน€เธฅเธทเธญเธเธเธฃเธฐเน€เธ เธ— เธฃเธญเธ เนเธฅเธฐเธเธเธดเธ”เธเนเธญเธกเธนเธฅ</h2>

        <div className="mt-6 space-y-6">
          <div>
            <label className="mb-3 block text-sm font-semibold text-emerald-900">เธเธฃเธฐเน€เธ เธ—เธเธฒเธฃเนเธเนเธเธเธฑเธ</label>
            <div className="grid gap-4">
              <div>
                <p className="mb-3 text-sm font-semibold text-emerald-700">เธเธธเธเธเธฅ</p>
                <div className="flex flex-wrap gap-3">
                  {individualCategories.map((category) => (
                    <button
                      key={category.id}
                      className={[
                        "rounded-full border px-4 py-2 text-sm font-semibold transition",
                        category.id === selectedCategoryId
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
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
                <p className="mb-3 text-sm font-semibold text-emerald-700">เธ—เธตเธก</p>
                <div className="flex flex-wrap gap-3">
                  {teamCategories.map((category) => (
                    <button
                      key={category.id}
                      className={[
                        "rounded-full border px-4 py-2 text-sm font-semibold transition",
                        category.id === selectedCategoryId
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
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
            <label className="mb-3 block text-sm font-semibold text-emerald-900">เธฃเธญเธเธเธฒเธฃเนเธเนเธเธเธฑเธ</label>
            <div className="flex flex-wrap gap-3">
              {tournamentRounds.map((round) => (
                <button
                  key={round.id}
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    round.id === selectedRoundId && selectedDocumentKind !== "standings"
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
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
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
                ].join(" ")}
                type="button"
                onClick={() => setSelectedDocumentKind("standings")}
              >
                Standings
              </button>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-semibold text-emerald-900">เธเธเธดเธ”เธเนเธญเธกเธนเธฅ</label>
            <div className="flex flex-wrap gap-3">
              {visibleDocumentKinds.map((kind) => (
                <button
                  key={kind.id}
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    kind.id === selectedDocumentKind
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
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

        <label className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-emerald-300 bg-white/75 px-6 py-8 text-center transition hover:border-emerald-500 hover:bg-white">
          <span className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-500">เน€เธฅเธทเธญเธเนเธเธฅเนเธซเธฅเธฒเธขเนเธเธฅเน</span>
          <span className="mt-3 font-serif text-2xl text-emerald-950">
            เธญเธฑเธเนเธซเธฅเธ” {getTournamentDocumentKindLabel(selectedDocumentKind)} เธชเธณเธซเธฃเธฑเธ{" "}
            {getTournamentCategoryLabel(selectedCategoryId)}{" "}
            {selectedDocumentKind === "players"
              ? "(เนเธเนเธฃเนเธงเธกเธเธฑเธเธ—เธธเธ เธฃเธญเธ)"
              : getTournamentRoundLabel(selectedRoundId)}
          </span>
          <span className="mt-3 text-sm text-emerald-900/65">
            {selectedDocumentKind === "players"
              ? "เธฃเธฒเธขเธเธทเนเธญเธเธนเนเน€เธฅเนเธเน€เธเนเธเธเนเธญเธกเธนเธฅเน€เธ”เธตเธขเธงเธเธฑเธเธ—เธฑเนเธเธเธฒเธฃเนเธเนเธเธเธฑเธ เธญเธฑเธเนเธซเธฅเธ”เธเธฃเธฑเนเธเน€เธ”เธตเธขเธงเธเนเธเธญ"
              : selectedDocumentKind === "standings"
                ? "เนเธเนเธชเธณเธซเธฃเธฑเธเธญเธฑเธเนเธซเธฅเธ”เธฃเธนเธเธ เธฒเธเธชเธฃเธธเธเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธ เนเธฅเธฐเธฃเธฐเธเธเธเธฐเนเธชเธ”เธเธ•เนเธญเธ—เนเธฒเธขเนเธเธเนเธญเธเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธ"
                : "เธ–เนเธฒเน€เธฅเธทเธญเธเธซเธกเธงเธ”เธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธ เธฃเธฐเธเธเธเธฐเน€เธเนเธเธฃเธนเธเธ เธฒเธเนเธงเนเน€เธเธทเนเธญเนเธชเธ”เธเธเธเธซเธเนเธฒเน€เธงเนเธ"}
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

      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(22,101,52,0.12)] backdrop-blur sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">เน€เธญเธเธชเธฒเธฃเนเธเธฃเธญเธเธเธตเน</p>
            <h2 className="mt-2 font-serif text-3xl text-emerald-950">
              {getTournamentCategoryLabel(selectedCategoryId)} {getTournamentRoundLabel(selectedRoundId)}
            </h2>
          </div>
          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
            {visibleDocuments.length} เนเธเธฅเน
          </span>
        </div>

        {visibleDocuments.length ? (
          <div className="mt-6 grid gap-4">
            {visibleDocuments.map((document) => (
              <article
                key={document.id}
                className="rounded-[1.5rem] border border-emerald-100 bg-white/80 p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-500">
                      {getTournamentDocumentKindLabel(document.kind)}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-emerald-950">{document.title}</h3>
                    <p className="mt-2 text-sm text-emerald-700/75">
                      {document.sourceFileName} โ€ข {new Date(document.updatedAt).toLocaleString("th-TH")}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                    {document.parsedData ? "เธกเธตเธเนเธญเธกเธนเธฅเนเธเนเธเธเธฑเธ" : "เน€เธญเธเธชเธฒเธฃเธ—เธฑเนเธงเนเธ"}
                  </span>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    onClick={() => void handleDeleteDocument(document.id)}
                    disabled={isBusy}
                  >
                    เธฅเธเนเธเธฅเนเธเธตเน
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-emerald-200 bg-white/60 px-5 py-10 text-center text-emerald-700/75">
            เธฃเธญเธเธเธตเนเธขเธฑเธเนเธกเนเธกเธตเนเธเธฅเนเธ—เธตเนเธญเธฑเธเนเธซเธฅเธ”
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-white/60 bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(22,101,52,0.12)] backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">เน€เธญเธเธชเธฒเธฃ PDF เธชเนเธงเธเธเธฅเธฒเธ</p>
        <h2 className="mt-2 font-serif text-3xl text-emerald-950">เธฃเธฐเน€เธเธตเธขเธเธเธฒเธฃเนเธเนเธเธเธฑเธ เธชเธนเธเธดเธเธฑเธ•เธด เนเธฅเธฐเธเธณเธซเธเธ”เธเธฒเธฃเนเธเนเธเธเธฑเธ</h2>
        <p className="mt-4 max-w-3xl text-emerald-900/70">
          เธ—เธฑเนเธ 3 เธเนเธญเธเธเธตเนเนเธเนเธชเธณเธซเธฃเธฑเธเธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเน PDF เนเธซเนเธเธนเนเนเธเนเธเธฒเธเธ—เธฑเนเธงเนเธเธเธ”เธ”เธฒเธงเธเนเนเธซเธฅเธ”เธเธฒเธเธซเธเนเธฒเธชเธฒเธเธฒเธฃเธ“เธฐเนเธ”เนเนเธ”เธขเธ•เธฃเธ
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {publicDocumentKinds.map((kind) => {
            const document = publicDocuments[kind.id];

            return (
              <article
                key={kind.id}
                className="rounded-[1.5rem] border border-emerald-100 bg-white/80 p-5"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-500">
                  PDF Upload
                </p>
                <h3 className="mt-2 text-xl font-semibold text-emerald-950">
                  {getPublicDocumentKindLabel(kind.id)}
                </h3>
                <p className="mt-3 text-sm leading-6 text-emerald-700/75">
                  เธญเธฑเธเนเธซเธฅเธ”เนเธ”เนเน€เธเธเธฒเธฐเนเธเธฅเน `.pdf` เนเธฅเธฐเธฃเธฐเธเธเธเธฐเธชเนเธเนเธเธฅเนเน€เธเนเธเธซเธฅเธฒเธขเธเนเธงเธเน€เธเธทเนเธญเธฃเธญเธเธฃเธฑเธเนเธเธฅเนเนเธซเธเนเธเธถเนเธ
                </p>

                <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-emerald-300 bg-emerald-50/40 px-4 py-6 text-center transition hover:border-emerald-500 hover:bg-white">
                  <span className="text-sm font-semibold text-emerald-700">เน€เธฅเธทเธญเธเนเธเธฅเน PDF</span>
                  <span className="mt-2 text-xs text-emerald-700/70">
                    เธเธฅเธดเธเน€เธเธทเนเธญเธญเธฑเธเนเธซเธฅเธ” {getPublicDocumentKindLabel(kind.id)}
                  </span>
                  <input
                    className="sr-only"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) => void handlePublicDocumentUpload(kind.id, event)}
                    disabled={isBusy}
                  />
                </label>

                {document ? (
                  <div className="mt-5 rounded-[1.25rem] border border-emerald-100 bg-emerald-50/50 p-4">
                    <p className="text-sm font-semibold text-emerald-950">{document.sourceFileName}</p>
                    <p className="mt-2 text-sm text-emerald-700/75">
                      เธญเธฑเธเน€เธ”เธ•เธฅเนเธฒเธชเธธเธ” {new Date(document.updatedAt).toLocaleString("th-TH")}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        href={getPublicDocumentDownloadUrl(document) ?? "#"}
                        download={document.sourceFileName}
                        className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-white"
                      >
                        เธ”เธฒเธงเธเนเนเธซเธฅเธ”เนเธเธฅเนเธเธฑเธเธเธธเธเธฑเธ
                      </a>
                      <button
                        className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        onClick={() => void handleDeletePublicDocument(kind.id)}
                        disabled={isBusy}
                      >
                        เธฅเธเนเธเธฅเนเธเธตเน
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.25rem] border border-dashed border-emerald-200 bg-white/60 px-4 py-6 text-center text-sm text-emerald-700/75">
                    เธขเธฑเธเนเธกเนเธกเธตเนเธเธฅเน PDF เนเธเธซเธฑเธงเธเนเธญเธเธตเน
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <TournamentDashboard
        data={previewData}
        statusLabel={statusLabel}
        emptyTitle={`เธขเธฑเธเนเธกเนเธกเธตเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธ ${getTournamentCategoryLabel(selectedCategoryId)} ${getTournamentRoundLabel(selectedRoundId)}`}
        emptyDescription="เธ–เนเธฒเธฃเธญเธเธเธตเนเธกเธตเนเธเธฅเนเธเธฅเธเธฒเธฃเนเธเนเธเธเธฑเธเนเธเธ Swiss Perfect เธฃเธฐเธเธเธเธฐเนเธชเธ”เธเธเธฃเธตเธงเธดเธงเธเธฒเธฃเนเธเนเธเธเธฑเธเธ•เธฃเธเธเธตเนเนเธ”เธขเธญเธฑเธ•เนเธเธกเธฑเธ•เธด"
      />
    </div>
  );
}

