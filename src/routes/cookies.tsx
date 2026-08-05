import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "./terms";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — AdEarn" },
      {
        name: "description",
        content: "How AdEarn and its ad partners use cookies and local storage.",
      },
      { property: "og:title", content: "Cookie Policy — AdEarn" },
      { property: "og:description", content: "Cookies used for sessions and ad attribution." },
    ],
  }),
  component: Cookies,
});

function Cookies() {
  return (
    <LegalPage title="Cookie Policy">
      <p>
        AdEarn uses strictly necessary cookies and browser local storage to keep you signed in and
        to remember your session between visits.
      </p>
      <h2>Ad network cookies</h2>
      <p>
        When you open a Monetag or Adsterra link, those networks may set their own cookies to
        measure impressions and prevent fraud. Those cookies are governed by their policies.
      </p>
      <h2>Managing cookies</h2>
      <p>
        You can clear or block cookies in your browser settings, but signing in to AdEarn will not
        work without session storage.
      </p>
    </LegalPage>
  );
}
