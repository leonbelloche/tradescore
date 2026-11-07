"use client";

import Link from "next/link";
import { signOut, useFakeUser } from "@/lib/fakeAuth";

// Header corner: "Sign up" button, or the signed-up name (fake accounts for now, see lib/fakeAuth.ts).
export default function UserBadge() {
  const user = useFakeUser();

  if (!user) {
    return (
      <Link href="/signup" className="display flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-extrabold text-black hover:brightness-110">
        Sign up
      </Link>
    );
  }
  const name = user.name || "Rookie GM";
  return (
    <div className="flex items-center gap-2">
      <span className="display flex min-h-11 items-center gap-2 text-sm font-bold">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-extrabold text-black">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{name}</span>
      </span>
      <button onClick={signOut} className="display min-h-11 px-2 text-xs font-bold text-muted hover:text-foreground">
        Log out
      </button>
    </div>
  );
}
