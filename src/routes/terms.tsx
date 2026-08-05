import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service & Anti-Fraud Policy — AdEarn" },
      {
        name: "description",
        content:
          "AdEarn terms of service, earning rules and the anti-fraud policy covering bots, VPNs and multiple accounts.",
      },
      { property: "og:title", content: "Terms of Service & Anti-Fraud Policy — AdEarn" },
      { property: "og:description", content: "Earning rules, payout terms and fraud policy." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage title="Terms of Service & Anti-Fraud Policy">
      <p>
        By using AdEarn you agree to complete ad tasks honestly. Each reward requires completing a
        full 2-ad bundle (one Monetag ad and one Adsterra ad) with a cooldown between claims.
      </p>
      <h2>Anti-fraud policy</h2>
      <ul>
        <li>One account per person and per device. Multiple accounts forfeit all balances.</li>
        <li>Bots, auto-clickers, scripts, emulators and click farms are strictly prohibited.</li>
        <li>Masking your real location with VPNs or proxies to change your currency is prohibited.</li>
        <li>Invalid ad traffic reported by our ad partners voids the related rewards.</li>
      </ul>
      <h2>Payouts</h2>
      <p>
        Withdrawals unlock progressively: each completed payout raises your next minimum cashout
        tier. Payouts are reviewed and transferred manually by our team and may take a few business
        days. Requests linked to fraudulent activity are rejected without appeal.
      </p>
    </LegalPage>
  );
}

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link to="/" className="text-sm font-bold text-gold">
        ← Back to AdEarn
      </Link>
      <h1 className="mt-4 text-2xl font-extrabold">{title}</h1>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground [&_h2]:pt-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_li]:ml-4 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  );
}
