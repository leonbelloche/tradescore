"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { login, type LoginState } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });
  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-1">
        <span className="display text-sm font-bold">Mot de passe admin</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="min-h-11 w-full rounded-lg border border-border-strong bg-background px-3 text-base focus:border-accent"
        />
      </label>
      {state.error && <p className="text-sm text-score-1">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Vérification…" : "Entrer"}
      </Button>
    </form>
  );
}
