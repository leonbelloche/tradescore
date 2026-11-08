"use server";

import { redirect } from "next/navigation";
import { adminConfigured, checkPassword, endSession, startSession } from "@/lib/admin/session";

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!adminConfigured()) return { error: "ADMIN_PASSWORD is not set on the server (8 characters minimum)." };
  const attempt = String(form.get("password") ?? "");
  if (!checkPassword(attempt)) {
    await new Promise((r) => setTimeout(r, 1000)); // slows down password guessing
    return { error: "Wrong password." };
  }
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}
