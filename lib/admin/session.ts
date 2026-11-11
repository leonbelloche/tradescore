// Admin session (server only). One admin, one password: ADMIN_PASSWORD in .env.local / Vercel.
// The password itself is never stored: after login the browser keeps a signed cookie
// "<expiry>.<signature>" that only the server can produce. Changing ADMIN_PASSWORD logs everyone out.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

const COOKIE = "ts_admin";
const DAYS = 14;

function password(): string | null {
  const p = process.env.ADMIN_PASSWORD;
  return p && p.length >= 8 ? p : null;
}

export const adminConfigured = () => password() !== null;

function sign(exp: number, pass: string): string {
  const key = createHash("sha256").update(`tradescore-admin-v1:${pass}`).digest();
  return createHmac("sha256", key).update(`admin:${exp}`).digest("hex");
}

function equal(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Compares with the configured password (constant time, on hashes so lengths always match).
export function checkPassword(attempt: string): boolean {
  const pass = password();
  if (!pass) return false;
  const h = (s: string) => createHash("sha256").update(s).digest("hex");
  return equal(h(attempt), h(pass));
}

export async function startSession() {
  const pass = password()!;
  const exp = Date.now() + DAYS * 86_400_000;
  (await cookies()).set(COOKIE, `${exp}.${sign(exp, pass)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAYS * 86_400,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

// On your own computer (npm run dev), no password: you are always the admin.
// Online (production build), the password is always required.
const NO_LOGIN_LOCALLY = process.env.NODE_ENV === "development";

export async function isAdmin(): Promise<boolean> {
  if (NO_LOGIN_LOCALLY) {
    await connection();
    return true;
  }
  const pass = password();
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!pass || !raw) return false;
  await connection(); // the expiry check below reads the clock at request time
  const [expText, sig] = raw.split(".");
  const exp = Number(expText);
  if (!Number.isFinite(exp) || exp < Date.now() || !sig) return false;
  return equal(sig, sign(exp, pass));
}

// Use at the top of every admin page and every admin Server Action.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
