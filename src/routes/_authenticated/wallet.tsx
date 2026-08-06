import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Banknote, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRefreshProfile } from "@/hooks/useProfile";
import { asCurrency, formatMoney, minCashout } from "@/lib/adearn";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — AdEarnia Payouts" },
      {
        name: "description",
        content: "Check your AdEarnia balance, current cashout tier and payout request history.",
      },
      { property: "og:title", content: "Wallet — AdEarnia Payouts" },
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
  const [amount, setAmount] = useState("");

  const currency = asCurrency(profile?.currency);
  const balance = Number(profile?.balance ?? 0);
  const minimum = minCashout(currency, profile?.completed_withdrawals ?? 0);
  const hasBank = Boolean(profile?.bank_name && profile?.account_number && profile?.account_name);

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

  const request = useMutation({
    mutationFn: async (value: number) => {
      const { error } = await supabase.rpc("request_withdrawal", { _amount: value });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payout request submitted. Admin will process it shortly.");
      setAmount("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message || "Could not submit payout request"),
  });

  const parsed = Number(amount);
  const canRequest =
    hasBank && balance >= minimum && parsed >= minimum && parsed <= balance && !request.isPending;

  return (
    <div className="space-y-5">
      <section className="card-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Available balance
        </p>
        <p className="mt-1 font-display text-4xl font-extrabold text-gold tabular-nums">
          {formatMoney(balance, currency)}
        </p>
        <p className="mt-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-xs text-muted-foreground">
          Tier {(profile?.completed_withdrawals ?? 0) + 1} · Current minimum cashout:{" "}
          <span className="font-bold text-foreground">{formatMoney(minimum, currency)}</span>
        </p>
      </section>

      <section className="card-surface p-5">
        <h2 className="text-base font-bold">Request a payout</h2>

        <label className="mt-4 block text-xs font-semibold text-muted-foreground" htmlFor="amount">
          Withdrawal amount
        </label>
        <input
          id="amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={String(minimum)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-md transition-colors px-4 py-3 text-sm font-semibold outline-none focus:border-gold"
        />

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-3 text-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Banknote className="h-4 w-4 text-gold" /> Payout account
          </div>
          {hasBank ? (
            <p className="mt-1 leading-relaxed">
              {profile?.bank_name}
              <br />
              <span className="tabular-nums">{profile?.account_number}</span> ·{" "}
              {profile?.account_name}
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">
              No account saved yet.{" "}
              <Link to="/profile" className="font-semibold text-gold underline">
                Add it in Profile
              </Link>
            </p>
          )}
        </div>

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
            Earn {formatMoney(minimum - balance, currency)} more to unlock this tier.
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
