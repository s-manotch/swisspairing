import { NextResponse } from "next/server";
import { adminSessionCookie, getAdminPassword, getAdminSessionToken, isAdminConfigured } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า ADMIN_PASSWORD ใน .env.local" },
      { status: 500 },
    );
  }

  const body = (await request.json()) as { password?: string };

  if (!body.password || body.password !== getAdminPassword()) {
    return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: adminSessionCookie,
    value: getAdminSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
