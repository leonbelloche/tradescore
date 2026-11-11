import type { Metadata } from "next";
import { Card } from "@/components/ui";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Admin — Trade Score", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center space-y-6 px-4">
      <header className="space-y-3 text-center">
        <p className="display pen-underline text-2xl font-extrabold lowercase tracking-[-0.04em]">trade score</p>
        <p className="num text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Admin</p>
      </header>
      <Card className="p-5">
        <LoginForm />
      </Card>
    </div>
  );
}
