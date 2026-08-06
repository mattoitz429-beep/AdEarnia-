import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "./terms";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — AdEarnia" },
      {
        name: "description",
        content:
          "How AdEarnia collects, stores and protects your account, earnings and payout information.",
      },
      { property: "og:title", content: "Privacy Policy — AdEarnia" },
      { property: "og:description", content: "What data AdEarnia stores and why." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        We collect your email, display name, country and payout account details so we can credit
        rewards and process manual transfers. We never sell your personal data.
      </p>
      <h2>What we store</h2>
      <ul>
        <li>Account identity: email address and verification status.</li>
        <li>Earnings data: claimed ad bundles, balance and payout history.</li>
        <li>Payout details: bank/wallet name, account number and account name.</li>
      </ul>
      <h2>Ad partners</h2>
      <p>
        Monetag and Adsterra operate the ads you open and apply their own privacy practices and
        tracking once you leave AdEarnia.
      </p>
      <h2>Your rights</h2>
      <p>
        You can update your details at any time from the Profile tab, or request account deletion by
        contacting support.
      </p>
    </LegalPage>
  );
}
