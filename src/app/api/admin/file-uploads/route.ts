import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminSessionCookie, isAdminAuthorized } from "@/lib/admin-auth";
import { finalizeChunkedUpload, writeUploadChunk } from "@/lib/result-store";

const maxChunkBytes = 3 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim();

  if (!trimmed) {
    return "upload.bin";
  }

  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function sanitizeUploadId(uploadId: string) {
  const trimmed = uploadId.trim();

  if (!trimmed) {
    throw new Error("Upload ID is required");
  }

  return trimmed.replace(/[^a-zA-Z0-9_-]+/g, "-");
}

async function ensureAdminAuthorized() {
  const cookieStore = await cookies();
  const session = cookieStore.get(adminSessionCookie)?.value;

  if (!isAdminAuthorized(session)) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const unauthorizedResponse = await ensureAdminAuthorized();

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const formData = await request.formData();
    const action = formData.get("action");

    if (action === "chunk") {
      const uploadId = sanitizeUploadId(String(formData.get("uploadId") ?? ""));
      const fileName = sanitizeFileName(String(formData.get("fileName") ?? ""));
      const contentType = String(formData.get("contentType") ?? "application/octet-stream");
      const updatedAt = String(formData.get("updatedAt") ?? new Date().toISOString());
      const totalSize = Number(formData.get("totalSize") ?? 0);
      const chunkIndex = Number(formData.get("chunkIndex") ?? -1);
      const chunk = formData.get("chunk");

      if (!(chunk instanceof File) || !Number.isFinite(chunkIndex) || chunkIndex < 0) {
        return NextResponse.json({ error: "ข้อมูลไฟล์ที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
      }

      if (chunk.size > maxChunkBytes) {
        return NextResponse.json(
          { error: "ไฟล์ถูกแบ่งเป็นชิ้นใหญ่เกินไป กรุณาลองอัปโหลดใหม่อีกครั้ง" },
          { status: 400 },
        );
      }

      await writeUploadChunk(uploadId, chunkIndex, await chunk.arrayBuffer(), {
        contentType,
        fileName,
        fileSize: totalSize,
        updatedAt,
      });

      return NextResponse.json({ success: true });
    }

    if (action === "finalize") {
      const uploadId = sanitizeUploadId(String(formData.get("uploadId") ?? ""));
      const storageGroup = String(formData.get("storageGroup") ?? "misc").replace(
        /[^a-zA-Z0-9_-]+/g,
        "-",
      );
      const fileName = sanitizeFileName(String(formData.get("fileName") ?? ""));
      const contentType = String(formData.get("contentType") ?? "application/octet-stream");
      const updatedAt = String(formData.get("updatedAt") ?? new Date().toISOString());
      const totalSize = Number(formData.get("totalSize") ?? 0);
      const totalChunks = Number(formData.get("totalChunks") ?? 0);

      if (!Number.isFinite(totalChunks) || totalChunks <= 0) {
        return NextResponse.json({ error: "จำนวนชิ้นไฟล์ไม่ถูกต้อง" }, { status: 400 });
      }

      const finalBlobKey = `files/${storageGroup}/${updatedAt.slice(0, 10)}/${uploadId}-${fileName}`;

      await finalizeChunkedUpload({
        uploadId,
        totalChunks,
        finalBlobKey,
        metadata: {
          contentType,
          fileName,
          fileSize: totalSize,
          updatedAt,
        },
      });

      return NextResponse.json({
        success: true,
        fileBlobKey: finalBlobKey,
        mimeType: contentType,
        fileSize: totalSize,
      });
    }

    return NextResponse.json({ error: "คำขออัปโหลดไม่ถูกต้อง" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "อัปโหลดไฟล์ไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
