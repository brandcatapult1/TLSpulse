"use client";

import clsx from "clsx";
import {
  BarChart3,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  KeyRound,
  LogOut,
  Menu,
  Search,
  Settings,
  Tag,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "./Logo";
import { SearchPalette } from "./SearchPalette";
import { ToastProvider } from "./Toast";

type NavItem = { href: string; label: string; Icon: LucideIcon };

const NAV: NavItem[] = [
  { href: "/", label: "Calendar", Icon: CalendarDays },
  { href: "/reports", label: "Reports", Icon: BarChart3 },
  { href: "/brands", label: "Brands", Icon: Tag },
  { href: "/resources", label: "Resources", Icon: Users },
];
const ADMIN_NAV: NavItem[] = [
  { href: "/admin/users", label: "Users", Icon: UserCog },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
];

const COLLAPSE_KEY = "tlsp.sidebar.collapsed";

type Role = "ADMIN" | "USER" | "CREW";
const ROLE_LABEL: Record<Role, string> = { ADMIN: "Admin", USER: "User", CREW: "Crew" };
// Crew see only their own calendar and report.
const CREW_NAV: NavItem[] = [
  { href: "/", label: "My calendar", Icon: CalendarDays },
  { href: "/reports", label: "My report", Icon: BarChart3 },
];
const navFor = (role: Role) => (role === "CREW" ? CREW_NAV : NAV);

export function AppShell({ name, role, children }: { name: string; role: Role; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // The page the user just clicked, highlighted immediately while it loads.
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  useEffect(() => setPendingHref(null), [pathname]);

  // Warm the other sections once idle so the first click on each is fast.
  useEffect(() => {
    const hrefs = [...navFor(role), ...(role === "ADMIN" ? ADMIN_NAV : [])].map((n) => n.href);
    const warm = () => hrefs.forEach((h) => router.prefetch(h));
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(warm);
    else setTimeout(warm, 1500);
  }, [role, router]);
  const [collapsed, setCollapsed] = useState(false);
  // Below laptop width the sidebar is icons-only so the calendar keeps usable columns.
  const [wide, setWide] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1180px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => setMobileOpen(false), [pathname]);
  const compact = collapsed || !wide;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  const onPath = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const isActive = (href: string) => (pendingHref ? pendingHref === href : onPath(href));

  const navList = (compact: boolean) => (
    <>
      <button
        onClick={() => setSearchOpen(true)}
        title={compact ? "Search (⌘K)" : undefined}
        className={clsx("mb-3 flex h-9 w-full items-center gap-2.5 rounded-lg border border-line bg-surface text-sm text-muted hover:text-ink", compact ? "justify-center" : "px-3")}
      >
        <Search size={16} />
        {!compact && (
          <>
            <span className="flex-1 text-left">Search</span>
            <kbd className="rounded border border-line px-1 text-[10px]">⌘K</kbd>
          </>
        )}
      </button>
      <NavGroup items={navFor(role)} compact={compact} isActive={isActive} onNavigate={setPendingHref} />
      {role === "ADMIN" && (
        <>
          {!compact ? <div className="mt-5 mb-1 px-3 text-[11px] font-semibold tracking-wide text-muted uppercase">Admin</div> : <div className="my-3 h-px bg-line" />}
          <NavGroup items={ADMIN_NAV} compact={compact} isActive={isActive} onNavigate={setPendingHref} />
        </>
      )}
    </>
  );

  const userBlock = (compact: boolean) => (
    <div className={clsx("border-t border-line pt-3", compact && "flex flex-col items-center gap-1")}>
      <div className={clsx("flex items-center gap-2.5", compact ? "justify-center" : "px-2 pb-2")}>
        <span title={compact ? `${name} · ${ROLE_LABEL[role]}` : undefined} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-social-bg text-xs font-semibold text-social">
          {name.slice(0, 1).toUpperCase()}
        </span>
        {!compact && (
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="text-xs text-muted">{ROLE_LABEL[role]}</div>
          </div>
        )}
      </div>
      <Link href="/change-password" title={compact ? "Change password" : undefined} className={navCls(false, compact)}>
        <KeyRound size={17} />
        {!compact && "Change password"}
      </Link>
      <button onClick={logout} title={compact ? "Log out" : undefined} className={clsx(navCls(false, compact), "w-full")}>
        <LogOut size={17} />
        {!compact && "Log out"}
      </button>
    </div>
  );

  return (
    <ToastProvider>
      <div className="min-h-dvh md:flex">
        {/* Desktop sidebar */}
        <aside
          className={clsx(
            "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-soft/50 p-3 transition-[width] duration-200 md:flex",
            compact ? "w-[64px]" : "w-[228px]",
          )}
        >
          <div className={clsx("mb-4 flex h-9 items-center", compact ? "justify-center" : "justify-between pl-2")}>
            <Link href="/" aria-label="TLS Pulse home">
              {compact ? <Logo iconOnly /> : <Logo />}
            </Link>
            {!compact && (
              <button onClick={toggleCollapsed} aria-label="Collapse sidebar" className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-soft hover:text-ink">
                <ChevronsLeft size={16} />
              </button>
            )}
          </div>
          <nav className="flex-1 overflow-y-auto">{navList(compact)}</nav>
          {collapsed && wide && (
            <button onClick={toggleCollapsed} aria-label="Expand sidebar" className="mb-2 grid h-8 w-full place-items-center rounded-md text-muted hover:bg-soft hover:text-ink">
              <ChevronsRight size={16} />
            </button>
          )}
          {userBlock(compact)}
        </aside>

        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/90 px-3 backdrop-blur md:hidden">
          <button aria-label="Open menu" onClick={() => setMobileOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-soft">
            <Menu size={19} />
          </button>
          <Link href="/" aria-label="TLS Pulse home">
            <Logo size="sm" />
          </Link>
          <button aria-label="Search" onClick={() => setSearchOpen(true)} className="ml-auto grid h-9 w-9 place-items-center rounded-lg hover:bg-soft">
            <Search size={18} />
          </button>
        </header>

        {/* Mobile slide-in menu */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="anim-fade absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
            <aside className="anim-rise absolute inset-y-0 left-0 flex w-[78%] max-w-[300px] flex-col bg-surface p-3 shadow-2xl">
              <div className="mb-4 flex h-9 items-center justify-between pl-2">
                <Logo />
                <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-soft">
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto">{navList(false)}</nav>
              {userBlock(false)}
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <SearchPalette open={searchOpen} onClose={closeSearch} />
    </ToastProvider>
  );
}

function navCls(active: boolean, compact: boolean) {
  return clsx(
    "flex h-9 items-center gap-2.5 rounded-lg text-sm transition-colors",
    compact ? "justify-center" : "px-3",
    active ? "bg-surface font-medium text-ink shadow-sm ring-1 ring-line" : "text-muted hover:bg-soft hover:text-ink",
  );
}

function NavGroup({
  items,
  compact,
  isActive,
  onNavigate,
}: {
  items: NavItem[];
  compact: boolean;
  isActive: (h: string) => boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map(({ href, label, Icon }) => (
        <li key={href}>
          <Link
            href={href}
            prefetch
            onClick={(e) => {
              if (!(e.metaKey || e.ctrlKey || e.shiftKey)) onNavigate(href);
            }}
            title={compact ? label : undefined}
            aria-current={isActive(href) ? "page" : undefined}
            className={navCls(isActive(href), compact)}
          >
            <Icon size={17} className={clsx(isActive(href) && "text-social")} />
            {!compact && <span className="flex-1">{label}</span>}
            <PendingDot />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Small spinner inside a nav link while its page is loading. */
function PendingDot() {
  const { pending } = useLinkStatus();
  return pending ? <span aria-hidden className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-muted/30 border-t-social" /> : null;
}
