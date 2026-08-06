import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, PlayCircle, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRefreshProfile } from "@/hooks/useProfile";
import {
  ADSTERRA_URL,
  COOLDOWN_SECONDS,
  MONETAG_URL,
  REWARD_RATES,
  asCurrency,
  formatMoney,
  minCashout,
} from "@/lib/adearn";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "AdEarnia — Watch 2 Ads, Earn Instantly" },
      {
        name: "description",
        content:
          "Complete a 2-ad bundle to earn rewards instantly and cash out through progressive withdrawal tiers.",
      },
      { property: "og:title", content: "AdEarnia — Watch 2 Ads, Earn Instantly" },
      {
        property: "og:description",
        content: "Earn per 2-ad bundle and request payouts to your bank account.",
      },
    ],
  }),
  component: HomeTab,
});

function HomeTab() {
  const { data: profile } = useProfile();
  const refresh = useRefreshProfile();
  const [step1Done, setStep1] = useState(false);
  const [step2Done, setStep2] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const currency = asCurrency(profile?.currency);
  const reward = REWARD_RATES[currency];
  const balance = Number(profile?.balance ?? 0);
  const goal = minCashout(currency, profile?.completed_withdrawals ?? 0);
  const progress = Math.min(100, (balance / goal) * 100);

  const claim = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("claim_ad_reward");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${formatMoney(reward, currency)} added to your balance!`);
      setStep1(false);
      setStep2(false);
      refresh();
      startCooldown();
    },
    onError: (e: Error) => toast.error(e.message || "Could not claim reward"),
  });

  function startCooldown() {
    setCooldown(COOLDOWN_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  const bundleReady = step1Done && step2Done;
  const claimDisabled = !bundleReady || cooldown > 0 || claim.isPending;

  return (
    <div className="space-y-5">
      <section className="card-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">Welcome back</p>
        <h1 className="mt-1 truncate text-2xl font-extrabold">
          {profile?.full_name?.trim() || profile?.email?.split("@")[0] || "Earner"}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Watch both ads in the bundle to bank {formatMoney(reward, currency)}.
        </p>
      </section>

      <section className="card-surface p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Sparkles className="h-4 w-4 text-gold" />
          Complete both steps to earn {formatMoney(reward, currency)}
        </div>

        <div className="mt-4 space-y-3">
          <StepButton
            done={step1Done}
            label="1. Watch Ad #1 (Monetag)"
            onClick={() => {
              window.open(MONETAG_URL, "_blank", "noopener,noreferrer");
              setStep1(true);
            }}
          />
          <StepButton
            done={step2Done}
            label="2. Watch Ad #2 (Adsterra)"
            onClick={() => {
              window.open(ADSTERRA_URL, "_blank", "noopener,noreferrer");
              setStep2(true);
            }}
          />
        </div>

        <button
          type="button"
          disabled={claimDisabled}
          onClick={() => claim.mutate()}
          className={`mt-5 w-full rounded-xl px-4 py-3.5 text-sm font-extrabold transition ${
            claimDisabled
              ? "cursor-not-allowed border border-white/10 bg-white/5 text-muted-foreground backdrop-blur-md"
              : "animate-pulse bg-success text-success-foreground shadow-gold"
          }`}
        >
          {cooldown > 0
            ? `Cooldown (${cooldown}s)...`
            : claim.isPending
              ? "Crediting..."
              : `Claim ${formatMoney(reward, currency)} Reward`}
        </button>
        {!bundleReady && cooldown === 0 && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Both steps must be completed before claiming.
          </p>
        )}
      </section>

      <section className="card-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Target className="h-4 w-4 shrink-0 text-gold" />
            <span className="truncate text-sm font-semibold">Next goal</span>
          </div>
          <span className="shrink-0 text-sm font-bold text-gold tabular-nums">
            {formatMoney(goal, currency)}
          </span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
          <div className="h-full rounded-full gold-gradient" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {formatMoney(balance, currency)} of {formatMoney(goal, currency)} ·{" "}
          {Math.max(0, Math.ceil((goal - balance) / reward))} bundles to go
        </p>
      </section>
    </div>
  );
}

function StepButton({
  done,
  label,
  onClick,
}: {
  done: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition ${
        done
          ? "border-success/40 bg-success/10 text-success"
          : "border-white/10 bg-white/5 text-foreground backdrop-blur-md hover:border-gold/50"
      }`}
    >
      {done ? (
        <CheckCircle2 className="h-5 w-5 shrink-0" />
      ) : (
        <PlayCircle className="h-5 w-5 shrink-0 text-gold" />
      )}
      <span className="min-w-0 truncate">{done ? `${label} — Completed` : label}</span>
    </button>
  );
}
