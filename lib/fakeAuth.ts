// TEMPORARY fake accounts (Léon, 2026-11-07): sign-up accepts anything, even empty fields.
// Only a display name is kept, in this browser's localStorage. NO password is ever stored or sent.
// To be replaced by real authentication (e.g. Supabase Auth) later.

import { useSyncExternalStore } from "react";

export type FakeUser = { name: string; email: string; joinedAt: string };

const KEY = "tradescore:user";
export const USER_EVENT = "tradescore:user-changed";

export function readUser(): FakeUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FakeUser) : null;
  } catch {
    return null; // private mode, blocked storage...
  }
}

// React hook: the current fake user, kept in sync across components and tabs.
// Uses the raw stored string as the snapshot so React can compare it cheaply.
function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener(USER_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(USER_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
export function useFakeUser(): FakeUser | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  try {
    return raw ? (JSON.parse(raw) as FakeUser) : null;
  } catch {
    return null;
  }
}

export function signUp(name: string, email: string): FakeUser {
  const user = { name: name.trim(), email: email.trim(), joinedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    // Storage unavailable: the user is "signed up" for this page only.
  }
  window.dispatchEvent(new Event(USER_EVENT));
  return user;
}

export function signOut() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(USER_EVENT));
}
