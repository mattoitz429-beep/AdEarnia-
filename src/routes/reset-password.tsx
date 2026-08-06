import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Coins, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — AdEarnia" },
      {
        name: "description",
        content: "Choose a new password for your AdEarnia account and get back to earning.",
      },
      { property: "og:title", content: "Reset Password — AdEarnia" },
      { property: "og:description", content: "Set a new AdEarnia password securely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match" });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl gold-gradient text-gold-foreground">
            <Coins className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl font-extrabold">AdEarnia</h1>
        </div>

        <div className="card-surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <KeyRound className="h-4 w-4 text-gold" /> Set a new password
          </h2>
          {!ready ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Open this page from the reset link in your email to continue.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-3">
              <Input label="New password" type="password" value={password} onChange={setPassword} />
              <Input
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={setConfirm}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl gold-gradient px-4 py-3.5 text-sm font-extrabold text-gold-foreground shadow-gold disabled:opacity-60"
              >
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => navigate({ to: "/auth" })}
            className="mt-4 w-full text-center text-sm text-muted-foreground"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-md transition-colors px-4 py-3 text-sm font-semibold outline-none focus:border-gold"
      />
    </label>
  );
}
