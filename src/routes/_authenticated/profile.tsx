import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Loader2, LogOut, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRefreshProfile } from "@/hooks/useProfile";
import { COUNTRIES, asCurrency, currencyForCountry, formatMoney } from "@/lib/adearn";
import { NIGERIAN_BANKS, bankCodeForName, isValidNuban } from "@/lib/nigerian-banks";
import { resolveNubanAccount } from "@/lib/bank.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — AdEarnia Account & Bank Details" },
      {
        name: "description",
        content: "Manage your AdEarnia account, verification status and payout bank details.",
      },
      { property: "og:title", content: "Profile — AdEarnia Account & Bank Details" },
      { property: "og:description", content: "Update your payout account and review policies." },
    ],
  }),
  component: ProfileTab,
});

const bankSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(80),
  country: z.string().trim().min(2).max(10),
  bank_name: z.string().trim().min(2, "Enter a bank / payout method").max(80),
  account_number: z
    .string()
    .trim()
    .min(5, "Enter a valid account number / wallet")
    .max(64)
    .regex(/^[A-Za-z0-9@._-]+$/, "Only letters, numbers and @ . _ - are allowed"),
  account_name: z.string().trim().min(2, "Enter the account holder name").max(80),
});


function ProfileTab() {
  const { data: profile } = useProfile();
  const refresh = useRefreshProfile();
  const navigate = useNavigate();
  const [emailVerified, setVerified] = useState<boolean | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    country: "NG",
    bank_name: "",
    account_number: "",
    account_name: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        country: profile.country ?? "NG",
        bank_name: profile.bank_name ?? "",
        account_number: profile.account_number ?? "",
        account_name: profile.account_name ?? "",
      });
    }
  }, [profile]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setVerified(Boolean(data.user?.email_confirmed_at));
    });
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      const parsed = bankSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]!.message);
      const { error } = await supabase
        .from("profiles")
        .update({ ...parsed.data, currency: currencyForCountry(parsed.data.country) })
        .eq("id", profile!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const currency = asCurrency(profile?.currency);
  const isNG = form.country === "NG";
  const bankCode = bankCodeForName(form.bank_name);
  const nubanOk = isValidNuban(form.account_number);
  const canVerify = isNG && Boolean(bankCode) && nubanOk;

  const resolve = useServerFn(resolveNubanAccount);
  const verification = useQuery({
    queryKey: ["nuban", bankCode, form.account_number],
    enabled: canVerify,
    retry: false,
    staleTime: 5 * 60 * 1000,
    queryFn: () => resolve({ data: { bankCode, accountNumber: form.account_number.trim() } }),
  });

  const resolved = verification.data?.ok ? verification.data.accountName : null;

  useEffect(() => {
    if (isNG && resolved) {
      setForm((f) => (f.account_name === resolved ? f : { ...f, account_name: resolved }));
    }
  }, [isNG, resolved]);


  const verifyError =
    isNG && form.account_number.trim().length > 0 && !nubanOk
      ? "Account number must be exactly 10 digits."
      : isNG && canVerify && verification.data && !verification.data.ok
        ? verification.data.message
        : isNG && canVerify && verification.isError
          ? "Could not verify this account. Please try again."
          : null;

  const blockedNG = isNG && (!bankCode || !nubanOk || !verification.data?.ok);

  const linked = Boolean(profile?.bank_name && profile?.account_number && profile?.account_name);
  const linkedVerified =
    linked && (profile?.country !== "NG" || Boolean(bankCodeForName(profile?.bank_name ?? "")));

  return (
    <div className="space-y-5">
      <section className="card-surface p-5">
        <h1 className="text-xl font-extrabold">Your account</h1>
        <p className="mt-1 truncate text-sm text-muted-foreground">{profile?.email}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
          <span
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 ${
              emailVerified
                ? "border-success/40 bg-success/10 text-success"
                : "border-warning/40 bg-warning/10 text-warning"
            }`}
          >
            {emailVerified ? (
              <BadgeCheck className="h-3.5 w-3.5" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5" />
            )}
            {emailVerified ? "Email verified" : "Email not verified"}
          </span>
          <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-gold">
            {currency} · {formatMoney(Number(profile?.balance ?? 0), currency)}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-2.5 py-1 text-muted-foreground">
            {profile?.completed_withdrawals ?? 0} payouts completed
          </span>
        </div>
      </section>

      <section className="card-surface space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">Bank & payout details</h2>
          <span
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
              linked && linkedVerified
                ? "border-success/40 bg-success/10 text-success"
                : linked
                  ? "border-warning/40 bg-warning/10 text-warning"
                  : "border-white/10 bg-white/5 text-muted-foreground backdrop-blur-md"
            }`}
          >
            {linked && linkedVerified ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : linked ? (
              <ShieldAlert className="h-3.5 w-3.5" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            {linked && linkedVerified
              ? "Bank Linked Successfully"
              : linked
                ? "Pending Verification"
                : "No payout method linked"}
          </span>
        </div>

        <Field
          label="Full name"
          value={form.full_name}
          onChange={(v) => setForm({ ...form, full_name: v })}
        />
        <div>
          <span className="text-xs font-semibold text-muted-foreground">Country</span>
          <select
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-md transition-colors px-4 py-3 text-sm font-semibold outline-none focus:border-gold"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.currency})
              </option>
            ))}
          </select>
        </div>
        {isNG ? (
          <>
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Bank</span>
              <select
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value, account_name: "" })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-md transition-colors px-4 py-3 text-sm font-semibold outline-none focus:border-gold"
              >
                <option value="">Select your bank</option>
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b.code} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">
                NUBAN account number (10 digits)
              </span>
              <input
                value={form.account_number}
                inputMode="numeric"
                maxLength={10}
                placeholder="0123456789"
                onChange={(e) =>
                  setForm({
                    ...form,
                    account_number: e.target.value.replace(/\D/g, "").slice(0, 10),
                    account_name: "",
                  })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-md transition-colors px-4 py-3 text-sm font-semibold tabular-nums outline-none focus:border-gold"
              />
            </label>
            <div>
              <span className="text-xs font-semibold text-muted-foreground">
                Account name (verified)
              </span>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md">
                {verification.isFetching && canVerify ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gold" />
                ) : verification.data?.ok ? (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
                ) : verifyError ? (
                  <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                ) : null}
                <input
                  readOnly
                  value={
                    verification.isFetching && canVerify
                      ? "Verifying account..."
                      : (form.account_name ?? "")
                  }
                  placeholder="Select bank and enter account number"
                  className="w-full bg-transparent text-sm font-bold outline-none"
                />
              </div>
            </div>
            {verifyError && (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                {verifyError}
              </p>
            )}
            {verification.data?.ok && (
              <p className="text-xs font-semibold text-success">
                Confirm this is your account before saving.
              </p>
            )}
          </>
        ) : (
          <>
            <Field
              label="Bank name / payout method"
              value={form.bank_name}
              onChange={(v) => setForm({ ...form, bank_name: v })}
            />
            <Field
              label="Account number / PayPal / wallet"
              value={form.account_number}
              onChange={(v) => setForm({ ...form, account_number: v })}
            />
            <Field
              label="Account name"
              value={form.account_name}
              onChange={(v) => setForm({ ...form, account_name: v })}
            />
          </>
        )}
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending || blockedNG}
          className="w-full rounded-xl gold-gradient px-4 py-3.5 text-sm font-extrabold text-gold-foreground shadow-gold disabled:opacity-60"
        >
          {save.isPending ? "Saving..." : "Save details"}
        </button>

      </section>

      <section className="card-surface p-5">
        <h2 className="text-base font-bold">Legal</h2>
        <div className="mt-3 grid gap-2 text-sm font-semibold">
          <Link to="/terms" className="text-gold underline-offset-4 hover:underline">
            Terms of Service (Anti-Fraud Policy)
          </Link>
          <Link to="/privacy" className="text-gold underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          <Link to="/cookies" className="text-gold underline-offset-4 hover:underline">
            Cookie Policy
          </Link>
        </div>
      </section>

      <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          navigate({ to: "/auth" });
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3.5 text-sm font-bold text-muted-foreground"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-md transition-colors px-4 py-3 text-sm font-semibold outline-none focus:border-gold"
      />
    </label>
  );
}
