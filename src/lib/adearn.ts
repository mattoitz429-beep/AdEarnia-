
export const COOLDOWN_SECONDS = 15;

export type CurrencyCode = "NGN" | "USD" | "EUR" | "GBP";

export const REWARD_RATES: Record<CurrencyCode, number> = {
  NGN: 35.0,
  USD: 0.025,
  EUR: 0.02,
  GBP: 0.02,
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export const COUNTRIES: { code: string; name: string; currency: CurrencyCode }[] = [
  { code: "NG", name: "Nigeria", currency: "NGN" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "ES", name: "Spain", currency: "EUR" },
  { code: "IT", name: "Italy", currency: "EUR" },
  { code: "GLOBAL", name: "Other / Global", currency: "USD" },
];

export function isCurrency(value: string): value is CurrencyCode {
  return value === "NGN" || value === "USD" || value === "EUR" || value === "GBP";
}

export function asCurrency(value: string | null | undefined): CurrencyCode {
  return value && isCurrency(value) ? value : "NGN";
}

export function formatMoney(amount: number, currency: string): string {
  const code = asCurrency(currency);
  const decimals = code === "NGN" ? 2 : 3;
  return `${CURRENCY_SYMBOLS[code]}${amount.toLocaleString(undefined, {
    minimumFractionDigits: code === "NGN" ? 2 : 2,
    maximumFractionDigits: decimals,
  })}`;
}

/** Progressive withdrawal tier minimum, based on completed payouts. */
export function minCashout(currency: string, completedWithdrawals: number): number {
  const n = Math.max(0, completedWithdrawals);
  if (asCurrency(currency) === "NGN") {
    if (n === 0) return 500;
    if (n === 1) return 1000;
    return 2000 + (n - 2) * 1000;
  }
  if (n === 0) return 1;
  if (n === 1) return 2;
  return 4 + (n - 2) * 2;
}

export function detectCountryCode(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz.includes("Lagos")) return "NG";
    const locale = typeof navigator !== "undefined" ? navigator.language : "en-NG";
    const region = locale.split("-")[1]?.toUpperCase();
    if (region && COUNTRIES.some((c) => c.code === region)) return region;
    if (region === "US") return "US";
  } catch {
    /* ignore */
  }
  return "NG";
}

export function currencyForCountry(code: string): CurrencyCode {
  return COUNTRIES.find((c) => c.code === code)?.currency ?? "USD";
}
