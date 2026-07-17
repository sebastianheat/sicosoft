import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { APP_NAME } from "@/lib/config";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <Link href="/portal" className="font-semibold text-primary">
          {APP_NAME}
        </Link>
        <form action={logout}>
          <button className="text-sm text-ink/60 hover:text-primary">
            Cerrar sesión
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 p-6">{children}</main>
    </div>
  );
}
