import type { Metadata } from "next";
import SignupForm from "@/components/auth/SignupForm";
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
        <p className="display text-sm font-bold text-accent">Join the front office</p>
        <h1 className="display text-6xl font-black leading-[0.85]">
          Become
          <br />a <span className="text-accent">GM</span>
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
