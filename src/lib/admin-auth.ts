import "server-only";

import crypto from "node:crypto";

export const adminSessionCookie = "admin_session";

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

export function isAdminConfigured() {
  return Boolean(getAdminPassword());
}

export function getAdminSessionToken() {
  const password = getAdminPassword();
  return password ? sha256(password) : "";
}

export function isAdminAuthorized(sessionValue?: string) {
  const expected = getAdminSessionToken();
  return Boolean(expected) && sessionValue === expected;
}
