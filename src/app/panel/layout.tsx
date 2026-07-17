import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { APP_NAME } from "@/lib/config";

const NAV = [
  { href: "/panel", label: "Inicio" },
  { href: "/panel/agenda", label: "Agenda" },
  { href: "/panel/pacientes", label: "Pacientes" },
  { href: "/panel/tests", label: "Tests" },
  { href: "/panel/finanzas", label: "Finanzas" },
  { href: "/panel/configuracion", label: "Configuración" },
];

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="border-b border-border p-5">
          <Link href="/panel" className="text-lg font-semibold text-primary">
            {APP_NAME}
          </Link>
          <p className="text-xs text-ink/50">Panel profesional</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink/80 transition hover:bg-accent-soft/30 hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="border-t border-border p-3">
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink/60 hover:bg-accent-soft/30">
            Cerrar sesión
          </button>
        </form>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3 md:hidden">
          <Link href="/panel" className="font-semibold text-primary">
            {APP_NAME}
          </Link>
          <nav className="flex gap-3 overflow-x-auto text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-ink/70">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-5xl space-y-6 p-6">{children}</main>
      </div>
    </div>
  );
}
