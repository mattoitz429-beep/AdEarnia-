import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, currencyForCountry, detectCountryCode } from "@/lib/adearn";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to AdEarnia — Earn by Watching Ads" },
      {
        name: "description",
        content: "Create your AdEarnia account to start earning per 2-ad bundle and cash out.",
      },
      { property: "og:title", content: "Sign in to AdEarnia" },
      { property: "og:description", content: "Earn rewards for every 2-ad bundle you complete." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  fullName: z.string().trim().max(80).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("NG");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    setCountry(detectCountryCode());
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    const parsedEmail = z.string().trim().email().max(255).safeParse(email);
    if (!parsedEmail.success) {
      toast.error("Enter a valid email");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success("Password reset link sent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: parsed.data.fullName ?? "",
              country,
              currency: currencyForCountry(country),
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Check your email to confirm your account.");
          return;
        }
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const { lovable } = await import("@/integrations/lovable/index");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
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
          <h2 className="text-lg font-bold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Watch a 2-ad bundle, earn instantly, cash out to your bank.
          </p>

          {sent ? (
            <p className="mt-5 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-gold">
              We sent a confirmation link to {email}. Confirm it, then sign in.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-3">
              {mode === "signup" && (
                <>
                  <Input label="Full name" value={fullName} onChange={setFullName} />
                  <label className="block">
                    <span className="text-xs font-semibold text-muted-foreground">Country</span>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-md transition-colors px-4 py-3 text-sm font-semibold outline-none focus:border-gold"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.currency})
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <Input label="Email" type="email" value={email} onChange={setEmail} />
              <Input label="Password" type="password" value={password} onChange={setPassword} />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl gold-gradient px-4 py-3.5 text-sm font-extrabold text-gold-foreground shadow-gold disabled:opacity-60"
              >
                {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={google}
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3.5 text-sm font-bold"
          >
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setSent(false);
            }}
            className="mt-4 w-full text-center text-sm text-muted-foreground"
          >
            {mode === "signin" ? (
              <>
                New here? <span className="font-bold text-gold">Create an account</span>
              </>
            ) : (
              <>
                Already registered? <span className="font-bold text-gold">Sign in</span>
              </>
            )}
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
