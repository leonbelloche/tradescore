"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { signUp, useFakeUser } from "@/lib/fakeAuth";

// TEMPORARY: accepts anything, even empty fields (see lib/fakeAuth.ts). The password is never stored or sent.
export default function SignupForm() {
  const user = useFakeUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    signUp(name, email);
    setPassword(""); // dropped immediately, never kept
  }

  if (user) {
    return (
      <div className="space-y-4 text-center">
        <p className="display text-sm font-bold text-accent">You&apos;re in</p>
        <p className="display text-5xl font-black leading-none">Welcome, {user.name || "Rookie GM"}</p>
        <p className="text-muted">Your front office is open. Go build your first trade.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button href="/trade">Build a trade ▸</Button>
          <Button href="/rankings" variant="ghost">
            See the rankings
          </Button>
        </div>
      </div>
    );
  }

  const field = "min-h-11 w-full rounded-lg border border-border-strong bg-background px-3 text-base placeholder:text-muted/60 focus:border-accent";
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <label className="block space-y-1">
        <span className="display text-sm font-bold">GM name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam Presti Jr." autoComplete="nickname" className={field} />
      </label>
      <label className="block space-y-1">
        <span className="display text-sm font-bold">Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={field} />
      </label>
      <label className="block space-y-1">
        <span className="display text-sm font-bold">Password</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" className={field} />
      </label>
      <Button type="submit" className="w-full text-lg">
        Create my GM account
      </Button>
      <p className="text-center text-xs text-muted">
        Preview: accounts aren&apos;t real yet. Nothing leaves your browser, and your password is never saved.
      </p>
    </form>
  );
}
