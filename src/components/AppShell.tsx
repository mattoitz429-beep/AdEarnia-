import { Link } from "@tanstack/react-router";
import { Coins, Home, Wallet, User } from "lucide-react";
import type { ReactNode } from "react";
import { useProfile } from "@/hooks/useProfile";
import { formatMoney } from "@/lib/adearn";

const tabs = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/wallet", label: "Wallet", icon: Wallet, exact: false },
  { to: "/profile", label: "Profile", icon: User, exact: false },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto grid max-w-lg grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gold-gradient text-gold-foreground">
              <Coins className="h-5 w-5" />
            </span>
            <span className="truncate font-display text-lg font-extrabold tracking-tight">
              AdEarn
            </span>
          </Link>
          <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-bold text-gold tabular-nums">
            {profile ? formatMoney(Number(profile.balance), profile.currency) : "—"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/95 backdrop-blur-md">
        <div className="mx-auto grid max-w-lg grid-cols-3">
          {tabs.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact }}
              className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted-foreground transition-colors data-[status=active]:text-gold"
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
