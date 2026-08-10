import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/adearn";


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Adearnia Control Room" },
      { name: "description", content: "Private Adearnia admin view for users, PINs and payouts." },
      { property: "og:title", content: "Admin — Adearnia Control Room" },
      { property: "og:description", content: "Manage users, PINs and payout requests." },
    ],
  }),
  component: AdminPage,
});

type AdminProfile = {
  id: string;
  full_name: string;
  email: string;
  country: string;
  currency: string;
  balance: number;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  withdrawal_pin: string | null;
  pin_used: boolean;
  created_at: string;
};

type AdminWithdrawal = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  created_at: string;
};

type AdminTask = {
  id: string;
  user_id: string;
  task_key: string;
  amount: number;
  currency: string;
  completed_on: string;
  proof: string | null;
  created_at: string;
};

type AdminPin = {
  id: string;
  user_id: string;
  pin: string;
  amount: number;
  currency: string;
  reference: string;
  created_at: string;
};



function AdminPage() {
  const isAdmin = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return false;
      const { data, error } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (error) throw error;
      return Boolean(data);
    },
  });

  const users = useQuery({
    enabled: isAdmin.data === true,
    queryKey: ["admin-profiles"],
    queryFn: async (): Promise<AdminProfile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminProfile[];
    },
  });

  const payouts = useQuery({
    enabled: isAdmin.data === true,
    queryKey: ["admin-withdrawals"],
    queryFn: async (): Promise<AdminWithdrawal[]> => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminWithdrawal[];
    },
  });

  const tasks = useQuery({
    enabled: isAdmin.data === true,
    queryKey: ["admin-task-completions"],
    queryFn: async (): Promise<AdminTask[]> => {
      const { data, error } = await supabase
        .from("task_completions")
        .select("id,user_id,task_key,amount,currency,completed_on,proof,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminTask[];
    },
  });

  const pins = useQuery({
    enabled: isAdmin.data === true,
    queryKey: ["admin-pin-purchases"],
    queryFn: async (): Promise<AdminPin[]> => {
      const { data, error } = await supabase
        .from("pin_purchases")
        .select("id,user_id,pin,amount,currency,reference,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminPin[];
    },
  });



  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("withdrawals").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payout updated");
      void payouts.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isAdmin.isLoading) return <p className="card-surface p-5 text-sm">Checking access…</p>;
  if (!isAdmin.data)
    return (
      <div className="card-surface p-6 text-center">
        <h1 className="text-lg font-extrabold">Restricted area</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This dashboard is only available to Adearnia administrators.
        </p>
      </div>
    );

  return (
    <div className="space-y-5">
      <section className="card-surface p-5">
        <h1 className="flex items-center gap-2 text-xl font-extrabold">
          <ShieldCheck className="h-5 w-5 text-gold" /> Admin dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {users.data?.length ?? 0} users · {payouts.data?.filter((p) => p.status === "pending").length ?? 0}{" "}
          pending payouts
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">Payout requests</h2>
        {payouts.data?.length ? (
          payouts.data.map((w) => (
            <div key={w.id} className="card-surface space-y-2 p-4 text-sm">
              <p className="font-bold tabular-nums">{formatMoney(Number(w.amount), w.currency)}</p>
              <p className="break-words text-xs text-muted-foreground">
                {w.bank_name ?? "—"} · {w.account_number ?? "—"} · {w.account_name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(w.created_at).toLocaleString()} · status:{" "}
                <span className="font-bold capitalize text-foreground">{w.status}</span>
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStatus.mutate({ id: w.id, status: "completed" })}
                  className="rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-xs font-bold text-success"
                >
                  Mark paid
                </button>
                <button
                  type="button"
                  onClick={() => setStatus.mutate({ id: w.id, status: "rejected" })}
                  className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="card-surface p-5 text-sm text-muted-foreground">No payout requests yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">Registered users</h2>
        {users.data?.map((u) => (
          <div key={u.id} className="card-surface space-y-1 p-4 text-sm">
            <p className="truncate font-bold">{u.full_name || "—"}</p>
            <p className="break-all text-xs text-muted-foreground">{u.email}</p>
            <p className="text-xs text-muted-foreground">
              {u.country} · {formatMoney(Number(u.balance), u.currency)}
            </p>
            <p className="break-words text-xs text-muted-foreground">
              Bank: {u.bank_name ?? "—"} · {u.account_number ?? "—"} · {u.account_name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              PIN: <span className="tabular-nums text-foreground">{u.withdrawal_pin ?? "—"}</span>{" "}
              {u.withdrawal_pin ? (u.pin_used ? "(used)" : "(active)") : ""}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
