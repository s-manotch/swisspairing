import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminSessionCookie, isAdminAuthorized, isAdminConfigured } from "@/lib/admin-auth";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(adminSessionCookie)?.value;

  return NextResponse.json({
    configured: isAdminConfigured(),
    authenticated: isAdminAuthorized(session),
  });
}
