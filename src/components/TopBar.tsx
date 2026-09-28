"use client";

import clsx from "clsx";
import { ChevronDown, LogOut, KeyRound, Plus, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";

type Props = { name: string; role: "ADMIN" | "USER" };

const NAV = [
  { href: "/", label: "Calendar" },
  { href: "/reports", label: "Reports" },
  { href: "/brands", label: "Brands" },
  { href: "/resources", label: "Resources" },
];
const ADMIN_NAV = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/settings", label: "Settings" },
];

function useClickAway<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

export function TopBar({ name, role }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const menuRef = useClickAway<HTMLDivElement>(menuOpen, () => setMenuOpen(false));
  const navRef = useClickAway<HTMLDivElement>(navOpen, () => setNavOpen(false));
  const links = role === "ADMIN" ? [...NAV, ...ADMIN_NAV] : NAV;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4">
        {/* Mobile nav */}
        <div ref={navRef} className="relative md:hidden">
          <button aria-label="Menu" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-soft" onClick={() => setNavOpen((o) => !o)}>
            <Menu size={18} />
          </button>
          {navOpen && (
            <nav className="absolute left-0 top-11 w-48 rounded-xl border border-line bg-white p-1 shadow-lg">
              {links.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setNavOpen(false)} className={clsx("block rounded-lg px-3 py-2 text-sm", isActive(l.href) ? "bg-soft font-medium" : "hover:bg-soft")}>
                  {l.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <Link href="/" aria-label="TLS Pulse home">
          <Logo />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx("rounded-lg px-3 py-1.5 text-sm transition-colors", isActive(l.href) ? "bg-soft font-medium text-ink" : "text-muted hover:text-ink")}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Wired to the New Shoot drawer in M3. */}
          <button
            disabled
            title="New Shoot arrives in M3"
            className="hidden h-9 items-center gap-1.5 rounded-lg bg-ink px-3.5 text-sm font-medium text-white opacity-40 sm:inline-flex"
          >
            <Plus size={16} /> New Shoot
          </button>

          <div ref={menuRef} className="relative">
            <button className="flex h-9 items-center gap-2 rounded-lg px-2 hover:bg-soft" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen}>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-social-bg text-xs font-semibold text-social">{name.slice(0, 1).toUpperCase()}</span>
              <span className="hidden text-sm sm:inline">{name}</span>
              <ChevronDown size={14} className="text-muted" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-11 w-56 rounded-xl border border-line bg-white p-1 shadow-lg">
                <div className="px-3 py-2">
                  <div className="text-sm font-medium">{name}</div>
                  <div className="text-xs text-muted">{role === "ADMIN" ? "Admin" : "User"}</div>
                </div>
                <div className="my-1 h-px bg-line" />
                <Link href="/change-password" role="menuitem" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-soft">
                  <KeyRound size={15} /> Change password
                </Link>
                <button role="menuitem" onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-soft">
                  <LogOut size={15} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
