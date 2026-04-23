import { NextResponse } from "next/server";
import { readStoredAsset } from "@/lib/result-store";

function buildDisposition(fileName: string, download: boolean) {
  const normalized = fileName.replace(/"/g, "");
  const encoded = encodeURIComponent(fileName);
  const mode = download ? "attachment" : "inline";

  return `${mode}; filename="${normalized}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const download = searchParams.get("download") === "1";
    const fileName = searchParams.get("filename");

    if (!key) {
      return NextResponse.json({ error: "Missing file key" }, { status: 400 });
    }

    const stored = await readStoredAsset(key);

    if (!stored) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return new NextResponse(stored.data, {
      headers: {
        "Content-Type": stored.metadata.contentType || "application/octet-stream",
        "Content-Disposition": buildDisposition(
          fileName || stored.metadata.fileName || "download",
          download,
        ),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "File response failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
