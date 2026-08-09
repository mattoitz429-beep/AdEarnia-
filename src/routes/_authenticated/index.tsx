import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, ExternalLink, PartyPopper, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRefreshProfile } from "@/hooks/useProfile";
import {
  MATTO_VIBES_URL,
  TIKTOK_URL,
  asCurrency,
  formatMoney,
  minCashout,
  taskReward,
} from "@/lib/adearn";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Adearnia — 5 Daily Tasks, Earn Instantly" },
      {
        name: "description",
        content:
          "Complete 5 daily Adearnia tasks — Matto Vibes, TikTok and daily puzzles — and cash out to your bank.",
      },
      { property: "og:title", content: "Adearnia — 5 Daily Tasks, Earn Instantly" },
      {
        property: "og:description",
        content: "Earn per completed task and request payouts to your bank account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomeTab,
});

type PuzzleTask = { key: string; title: string; question: string; answer: number };

function dayNumber(): number {
  return Math.floor(Date.now() / 86_400_000);
}

function puzzles(): PuzzleTask[] {
  const d = dayNumber();
  const build = (i: number) => {
    const a = ((d * (i + 3)) % 12) + 4;
    const b = ((d * (i + 7)) % 9) + 2;
    const c = ((d + i) % 5) + 1;
    return { a, b, c };
  };
  const p3 = build(1);
  const p4 = build(2);
  const p5 = build(3);
  return [
    {
      key: "task3",
      title: "Task 3 · Daily puzzle",
      question: `What is ${p3.a} × ${p3.b} + ${p3.c}?`,
      answer: p3.a * p3.b + p3.c,
    },
    {
      key: "task4",
      title: "Task 4 · Daily puzzle",
      question: `What is (${p4.a} + ${p4.b}) × ${p4.c}?`,
      answer: (p4.a + p4.b) * p4.c,
    },
    {
      key: "task5",
      title: "Task 5 · Daily puzzle",
      question: `What is ${p5.a * p5.b} ÷ ${p5.b} + ${p5.c}?`,
      answer: p5.a + p5.c,
    },
  ];
}

function HomeTab() {
  const { data: profile } = useProfile();
  const refresh = useRefreshProfile();
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pinModal, setPinModal] = useState<string | null>(null);

  const currency = asCurrency(profile?.currency);
  const reward = taskReward(currency);
  const balance = Number(profile?.balance ?? 0);
  const goal = minCashout(currency);
  const progress = Math.min(100, (balance / goal) * 100);

  // Celebrate a freshly issued PIN once, on the homepage.
  useEffect(() => {
    const pin = profile?.withdrawal_pin;
    if (!pin || profile?.pin_used) return;
    if (localStorage.getItem("adearnia_pin_seen") === pin) return;
    localStorage.setItem("adearnia_pin_seen", pin);
    setPinModal(pin);
  }, [profile?.withdrawal_pin, profile?.pin_used]);



  const done = useQuery({
    queryKey: ["task-completions"],
    queryFn: async (): Promise<string[]> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("task_completions")
        .select("task_key")
        .eq("completed_on", today);
      if (error) throw error;
      return (data ?? []).map((r) => r.task_key as string);
    },
  });

  const complete = useMutation({
    mutationFn: async (taskKey: string) => {
      const { error } = await supabase.rpc("complete_task", { _task_key: taskKey });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${formatMoney(reward, currency)} added to your wallet!`);
      refresh();
      void done.refetch();
    },
    onError: (e: Error) => toast.error(e.message || "Could not complete this task"),
  });

  const isDone = (key: string) => done.data?.includes(key) ?? false;
  const completedCount = done.data?.length ?? 0;

  function openLink(key: string, url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    setVisited((v) => ({ ...v, [key]: true }));
  }

  function submitPuzzle(task: PuzzleTask) {
    if (Number(answers[task.key]) !== task.answer) {
      toast.error("That answer is not correct. Try again.");
      return;
    }
    complete.mutate(task.key);
  }

  return (
    <div className="space-y-5">
      <section className="card-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">Welcome back</p>
        <h1 className="mt-1 truncate text-2xl font-extrabold">
          {profile?.full_name?.trim() || profile?.email?.split("@")[0] || "Earner"}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          5 daily tasks · {formatMoney(reward, currency)} each · {completedCount}/5 completed today.
        </p>
      </section>

      <section className="card-surface p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Sparkles className="h-4 w-4 text-gold" />
          Task hub
        </div>

        <div className="mt-4 space-y-4">
          <LinkTask
            title="Task 1 · Matto Vibes"
            instruction="Sign up on Matto Vibes and make a post."
            actionLabel="Open Matto Vibes"
            reward={formatMoney(reward, currency)}
            done={isDone("task1")}
            visited={Boolean(visited["task1"])}
            onOpen={() => openLink("task1", MATTO_VIBES_URL)}
            onClaim={() => complete.mutate("task1")}
            pending={complete.isPending}
          />
          <LinkTask
            title="Task 2 · TikTok"
            instruction="Follow and like our official TikTok account."
            actionLabel="Open TikTok"
            reward={formatMoney(reward, currency)}
            done={isDone("task2")}
            visited={Boolean(visited["task2"])}
            onOpen={() => openLink("task2", TIKTOK_URL)}
            onClaim={() => complete.mutate("task2")}
            pending={complete.isPending}
          />

          {puzzles().map((task) => (
            <div
              key={task.key}
              className={`rounded-xl border p-4 ${
                isDone(task.key)
                  ? "border-success/40 bg-success/10"
                  : "border-white/10 bg-white/5 backdrop-blur-md"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{task.title}</p>
                <span className="shrink-0 text-xs font-bold text-gold tabular-nums">
                  {formatMoney(reward, currency)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{task.question}</p>
              {isDone(task.key) ? (
                <p className="mt-3 flex items-center gap-2 text-sm font-bold text-success">
                  <CheckCircle2 className="h-4 w-4" /> Completed today
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <input
                    inputMode="numeric"
                    value={answers[task.key] ?? ""}
                    onChange={(e) => setAnswers({ ...answers, [task.key]: e.target.value })}
                    placeholder="Your answer"
                    className="min-w-0 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold tabular-nums outline-none backdrop-blur-md transition-colors focus:border-gold"
                  />
                  <button
                    type="button"
                    disabled={complete.isPending}
                    onClick={() => submitPuzzle(task)}
                    className="shrink-0 rounded-xl gold-gradient px-4 py-3 text-sm font-extrabold text-gold-foreground shadow-gold disabled:opacity-60"
                  >
                    Submit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Target className="h-4 w-4 shrink-0 text-gold" />
            <span className="truncate text-sm font-semibold">Payout goal</span>
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
          {Math.max(0, Math.ceil((goal - balance) / reward))} tasks to go
        </p>
      </section>

      {pinModal && <PinModal pin={pinModal} onClose={() => setPinModal(null)} />}
    </div>
  );
}

function LinkTask({
  title,
  instruction,
  actionLabel,
  reward,
  done,
  visited,
  onOpen,
  onClaim,
  pending,
}: {
  title: string;
  instruction: string;
  actionLabel: string;
  reward: string;
  done: boolean;
  visited: boolean;
  onOpen: () => void;
  onClaim: () => void;
  pending: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        done ? "border-success/40 bg-success/10" : "border-white/10 bg-white/5 backdrop-blur-md"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold">{title}</p>
        <span className="shrink-0 text-xs font-bold text-gold tabular-nums">{reward}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{instruction}</p>
      {done ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-bold text-success">
          <CheckCircle2 className="h-4 w-4" /> Completed today
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-bold backdrop-blur-md transition hover:border-gold/50"
          >
            <ExternalLink className="h-4 w-4 text-gold" /> {actionLabel}
          </button>
          <button
            type="button"
            disabled={!visited || pending}
            onClick={onClaim}
            className={`rounded-xl px-3 py-3 text-xs font-extrabold transition ${
              visited && !pending
                ? "gold-gradient text-gold-foreground shadow-gold"
                : "cursor-not-allowed border border-white/10 bg-white/5 text-muted-foreground backdrop-blur-md"
            }`}
          >
            I've completed it
          </button>
        </div>
      )}
    </div>
  );
}

export function PinModal({ pin, onClose }: { pin: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="card-surface w-full max-w-sm p-6 text-center">
        <PartyPopper className="mx-auto h-10 w-10 text-gold" />
        <h2 className="mt-3 text-xl font-extrabold">Your Adearnia PIN is ready!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use this 8-digit PIN to unlock your withdrawal form.
        </p>
        <p className="mt-4 rounded-xl border border-gold/40 bg-gold/10 py-4 font-display text-3xl font-extrabold tracking-[0.35em] text-gold tabular-nums">
          {pin}
        </p>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(pin);
            toast.success("PIN copied to clipboard");
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl gold-gradient px-4 py-3 text-sm font-extrabold text-gold-foreground shadow-gold"
        >
          <Copy className="h-4 w-4" /> Copy to clipboard
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-muted-foreground backdrop-blur-md"
        >
          Close
        </button>
      </div>
    </div>
  );
}
