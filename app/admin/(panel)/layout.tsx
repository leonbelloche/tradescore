import AdminSidebar from "@/components/admin/AdminSidebar";

// The admin panel: its own app, separate from the public site (no ticker, no public nav).
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:pl-60">
      <AdminSidebar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 lg:py-8">{children}</main>
    </div>
  );
}
