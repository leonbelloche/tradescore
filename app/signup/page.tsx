import type { Metadata } from "next";
import SignupForm from "@/components/auth/SignupForm";
import { TAGLINE } from "@/components/layout/Logo";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Sign up — Trade Score" };

const PERKS = [
  "Save the trades you build",
  "Get your own GM score",
  "Climb the community rankings",
];

export default function SignupPage() {
  return (
    <div className="mx-auto grid max-w-4xl items-center gap-8 pt-4 md:grid-cols-2">
      <div className="space-y-4">
        <div>
          <p className="display pen-underline text-2xl font-extrabold lowercase tracking-[-0.04em]">trade score</p>
          <p className="num mt-3 text-sm text-muted">{TAGLINE}</p>
        </div>
        <h1 className="display text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-5xl">
          Become
          <br />a <span className="pen-underline">GM</span>
        </h1>
        <ul className="space-y-2">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <span className="led flex h-6 w-6 items-center justify-center rounded bg-accent text-xs font-black text-black" aria-hidden>
                ✓
              </span>
              {p} <span className="display text-xs font-bold text-muted">soon</span>
            </li>
          ))}
        </ul>
      </div>
      <Card className="p-5 sm:p-6">
        <SignupForm />
      </Card>
    </div>
  );
}
