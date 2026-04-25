import { NextResponse } from "next/server";
import { adminSessionCookie, shouldUseSecureAdminCookie } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: adminSessionCookie,
    value: "",
    httpOnly: true,
    secure: shouldUseSecureAdminCookie(request),
    expires: new Date(0),
    path: "/",
  });
  return response;
}
