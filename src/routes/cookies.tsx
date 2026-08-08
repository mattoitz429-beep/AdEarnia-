import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "./terms";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — AdEarnia" },
      {
        name: "description",
        content: "How AdEarnia and its ad partners use cookies and local storage.",
      },
      { property: "og:title", content: "Cookie Policy — AdEarnia" },
      { property: "og:description", content: "Cookies used for sessions and ad attribution." },
    ],
  }),
  component: Cookies,
});

function Cookies() {
  return (
    <LegalPage title="Cookie Policy">
      <p>
        AdEarnia uses strictly necessary cookies and browser local storage to keep you signed in and
        to remember your session between visits.
      </p>
      <h2>Task partner cookies</h2>
      <p>
        When you open a partner task link, those networks may set their own cookies to
        measure impressions and prevent fraud. Those cookies are governed by their policies.
      </p>
      <h2>Managing cookies</h2>
      <p>
        You can clear or block cookies in your browser settings, but signing in to AdEarnia will not
        work without session storage.
      </p>
    </LegalPage>
  );
}
