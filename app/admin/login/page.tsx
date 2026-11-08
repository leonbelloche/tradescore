import type { Metadata } from "next";
import { Card } from "@/components/ui";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Admin — Trade Score", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 pt-8">
      <header className="space-y-1 text-center">
        <p className="display text-sm font-bold text-accent">Staff only</p>
        <h1 className="display text-4xl font-extrabold leading-[1.02]">Admin</h1>
      </header>
      <Card className="p-5">
        <LoginForm />
      </Card>
    </div>
  );
}
