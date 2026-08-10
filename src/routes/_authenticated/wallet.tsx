import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Banknote,
  Clock,
  CheckCircle2,
  KeyRound,
  Layers,
  Lock,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRefreshProfile } from "@/hooks/useProfile";
import { asCurrency, formatMoney, payoutTiers, pinPrice } from "@/lib/adearn";

import { NIGERIAN_BANKS } from "@/lib/nigerian-banks";
import { payWithPaystack } from "@/lib/paystack";
import { purchasePin } from "@/lib/pin.functions";
import { PinModal } from "@/components/PinModal";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — Adearnia Payouts" },
      {
        name: "description",
        content: "Check your Adearnia balance, buy a withdrawal PIN and request a bank payout.",
      },
      { property: "og:title", content: "Wallet — Adearnia Payouts" },
      { property: "og:description", content: "Request payouts and track their status." },
    ],
  }),
  component: WalletTab,
});

type Withdrawal = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  bank_name: string | null;
  account_number: string | null;
};

function WalletTab() {
  const { data: profile } = useProfile();
  const refresh = useRefreshProfile();
  const buyPin = useServerFn(purchasePin);

  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState<string | null>(null);
  const [bank, setBank] = useState({ bank_name: "", account_number: "", account_name: "" });

  const currency = asCurrency(profile?.currency);
  const balance = Number(profile?.balance ?? 0);
  const tiers = payoutTiers(currency);
  const [tier, setTier] = useState<number>(tiers[0]!);
  const minimum = tier;
  const price = pinPrice(tier);

  const hasPin = Boolean(profile?.withdrawal_pin) && !profile?.pin_used;
  const pinValid = hasPin && pin.trim().length === 8 && pin.trim() === profile?.withdrawal_pin;

  const history = useQuery({
    queryKey: ["withdrawals"],
    queryFn: async (): Promise<Withdrawal[]> => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Withdrawal[];
    },
  });

  const purchase = useMutation({
    mutationFn: async () => {
      if (!profile?.email) throw new Error("Your account email is missing.");
      const reference = await payWithPaystack({
        email: profile.email,
        amount: price,
        currency,
      });
      if (!reference) return null;
      const result = await buyPin({ data: { reference } });
      return result.pin;
    },
    onSuccess: (issued) => {
      if (!issued) return;
      setNewPin(issued);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message || "Payment could not be completed"),
  });

  const request = useMutation({
    mutationFn: async (value: number) => {
      const { error } = await supabase.rpc("request_withdrawal", {
        _amount: value,
        _pin: pin.trim(),
        _bank_name: bank.bank_name.trim(),
        _account_number: bank.account_number.trim(),
        _account_name: bank.account_name.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payout request submitted. Admin will process it shortly.");
      setAmount("");
      setPin("");
      refresh();
      void history.refetch();
    },
    onError: (e: Error) => toast.error(e.message || "Could not submit payout request"),
  });

  const parsed = Number(amount);
  const bankFilled =
    bank.bank_name.trim().length > 1 &&
    bank.account_number.trim().length >= 5 &&
    bank.account_name.trim().length > 1;
  const canRequest =
    pinValid && bankFilled && parsed >= minimum && parsed <= balance && !request.isPending;

  return (
    <div className="space-y-5">
      <section className="card-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Available balance
        </p>
        <p className="mt-1 font-display text-4xl font-extrabold text-gold tabular-nums">
          {formatMoney(balance, currency)}
        </p>
        <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground backdrop-blur-md">
          Selected tier minimum:{" "}
          <span className="font-bold text-foreground">{formatMoney(minimum, currency)}</span>
        </p>
      </section>

      <section className="card-surface p-5">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Layers className="h-4 w-4 text-gold" /> Choose your withdrawal tier
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          The PIN costs 10% of the tier you want to withdraw.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {tiers.map((value, i) => {
            const active = tier === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTier(value)}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-gold/60 bg-gold/10 shadow-gold"
                    : "border-white/10 bg-white/5 backdrop-blur-md hover:border-gold/40"
                }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Tier {i + 1}
                </p>
                <p className="mt-1 text-lg font-extrabold tabular-nums">
                  {formatMoney(value, currency)}
                </p>
                <p className="mt-1 text-xs font-semibold text-gold tabular-nums">
                  PIN {formatMoney(pinPrice(value), currency)}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card-surface p-5">
        <div className="flex items-center gap-2 text-sm font-bold">
          <KeyRound className="h-4 w-4 text-gold" /> Adearnia withdrawal PIN
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasPin
            ? "You have an active 8-digit PIN. Enter it below to unlock your bank details."
            : `Buy a one-time 8-digit PIN for ${formatMoney(price, currency)} to unlock ${formatMoney(tier, currency)} payouts.`}
        </p>
        <button
          type="button"
          disabled={purchase.isPending}
          onClick={() => purchase.mutate()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl gold-gradient px-4 py-3.5 text-sm font-extrabold text-gold-foreground shadow-gold disabled:opacity-60"
        >
          <ShoppingCart className="h-4 w-4" />
          {purchase.isPending ? "Processing payment..." : `Buy PIN — ${formatMoney(price, currency)}`}
        </button>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-muted-foreground">Enter your 8-digit PIN</span>
          <input
            value={pin}
            inputMode="numeric"
            maxLength={8}
            placeholder="••••••••"
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold tracking-[0.3em] tabular-nums outline-none backdrop-blur-md transition-colors focus:border-gold"
          />
        </label>
        {pin.length === 8 && !pinValid && (
          <p className="mt-2 text-xs font-semibold text-destructive">
            That PIN is not valid for your account.
          </p>
        )}
        {pinValid && (
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> PIN verified — bank details unlocked
          </p>
        )}
      </section>


      <section className="card-surface p-5">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Banknote className="h-4 w-4 text-gold" /> Request a payout
        </h2>

        {!pinValid ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground backdrop-blur-md">
            <Lock className="h-5 w-5 shrink-0 text-gold" />
            Bank details stay locked until you enter your valid 8-digit Adearnia PIN.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">
                Withdrawal amount
              </span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(minimum)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold outline-none backdrop-blur-md transition-colors focus:border-gold"
              />
            </label>

            <div>
              <span className="text-xs font-semibold text-muted-foreground">Bank name</span>
              <input
                list="adearnia-banks"
                value={bank.bank_name}
                onChange={(e) => setBank({ ...bank, bank_name: e.target.value })}
                placeholder="Select or type your bank"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold outline-none backdrop-blur-md transition-colors focus:border-gold"
              />
              <datalist id="adearnia-banks">
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b.code} value={b.name} />
                ))}
              </datalist>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Account number</span>
              <input
                inputMode="numeric"
                value={bank.account_number}
                onChange={(e) => setBank({ ...bank, account_number: e.target.value })}
                placeholder="0123456789"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold tabular-nums outline-none backdrop-blur-md transition-colors focus:border-gold"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">
                Account holder name
              </span>
              <input
                value={bank.account_name}
                onChange={(e) => setBank({ ...bank, account_name: e.target.value })}
                placeholder="As it appears on your bank account"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold outline-none backdrop-blur-md transition-colors focus:border-gold"
              />
            </label>
          </div>
        )}

        <button
          type="button"
          disabled={!canRequest}
          onClick={() => request.mutate(parsed)}
          className={`mt-4 w-full rounded-xl px-4 py-3.5 text-sm font-extrabold transition ${
            canRequest
              ? "gold-gradient text-gold-foreground shadow-gold"
              : "cursor-not-allowed border border-white/10 bg-white/5 text-muted-foreground backdrop-blur-md"
          }`}
        >
          {request.isPending ? "Submitting..." : "Request Payout"}
        </button>
        {balance < minimum && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Earn {formatMoney(minimum - balance, currency)} more to reach the minimum payout.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">Transaction history</h2>
        {history.data?.length ? (
          history.data.map((w) => <HistoryCard key={w.id} withdrawal={w} />)
        ) : (
          <p className="card-surface p-5 text-sm text-muted-foreground">No payout requests yet.</p>
        )}
      </section>

      {newPin && <PinModal pin={newPin} onClose={() => setNewPin(null)} />}
    </div>
  );
}

function HistoryCard({ withdrawal }: { withdrawal: Withdrawal }) {
  const status = withdrawal.status.toLowerCase();
  const style =
    status === "completed"
      ? { cls: "text-success border-success/40 bg-success/10", Icon: CheckCircle2 }
      : status === "rejected"
        ? { cls: "text-destructive border-destructive/40 bg-destructive/10", Icon: XCircle }
        : { cls: "text-warning border-warning/40 bg-warning/10", Icon: Clock };

  return (
    <div className="card-surface grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
      <div className="min-w-0">
        <p className="truncate font-bold tabular-nums">
          {formatMoney(Number(withdrawal.amount), withdrawal.currency)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {new Date(withdrawal.created_at).toLocaleString()} · {withdrawal.bank_name ?? "—"}
        </p>
      </div>
      <span
        className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${style.cls}`}
      >
        <style.Icon className="h-3.5 w-3.5" />
        {status}
      </span>
    </div>
  );
}
