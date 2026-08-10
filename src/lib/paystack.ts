import { PAYSTACK_PUBLIC_KEY } from "./adearn";

type PaystackHandler = { openIframe: () => void };
type PaystackSetup = (opts: {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  ref?: string;
  metadata?: Record<string, unknown>;
  callback: (response: { reference: string }) => void;
  onClose: () => void;
}) => PaystackHandler;

declare global {
  interface Window {
    PaystackPop?: { setup: PaystackSetup };
  }
}

const SCRIPT_URL = "https://js.paystack.co/v1/inline.js";
let loading: Promise<void> | null = null;

export function loadPaystack(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.PaystackPop) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Paystack. Check your connection."));
    document.body.appendChild(script);
  });
  return loading;
}

/** Opens the Paystack popup and resolves with the transaction reference. */
export async function payWithPaystack(params: {
  email: string;
  amount: number;
  currency?: string;
}): Promise<string | null> {
  await loadPaystack();
  const pop = window.PaystackPop;
  if (!pop) throw new Error("Paystack is unavailable right now. Please retry.");

  return new Promise<string | null>((resolve) => {
    const handler = pop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: params.email,
      amount: Math.round(params.amount * 100),
      currency: params.currency ?? "NGN",
      ref: `adearnia-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      callback: (response) => resolve(response.reference),
      onClose: () => resolve(null),
    });
    handler.openIframe();
  });
}
