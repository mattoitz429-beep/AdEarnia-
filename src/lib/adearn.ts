export type CurrencyCode = "NGN" | "USD" | "EUR" | "GBP";

/** Reward paid for completing ONE daily task. */
export const TASK_REWARDS: Record<CurrencyCode, number> = {
  NGN: 3500,
  USD: 2.5,
  EUR: 2.3,
  GBP: 2.0,
};

/** Progressive withdrawal tiers per currency (lowest tier first). */
export const PAYOUT_TIERS: Record<CurrencyCode, number[]> = {
  NGN: [17500, 35000],
  USD: [12.5, 25],
  EUR: [11.5, 23],
  GBP: [10, 20],
};

/** Minimum payout amount per currency (the lowest tier). */
export const MIN_PAYOUT: Record<CurrencyCode, number> = {
  NGN: 17500,
  USD: 12.5,
  EUR: 11.5,
  GBP: 10,
};

/** PIN price scales with the tier being withdrawn — 10% of the payout. */
export const PIN_PRICE_RATE = 0.1;

export function payoutTiers(currency: string): number[] {
  return PAYOUT_TIERS[asCurrency(currency)];
}

export function pinPrice(payout: number): number {
  return Math.round(payout * PIN_PRICE_RATE * 100) / 100;
}


export const PAYSTACK_PUBLIC_KEY = "pk_live_5238f5b7f731c74b6c13a288f7a78eebd1f35654";

export const MATTO_VIBES_URL = "https://mattovibes.netlify.app";
export const TIKTOK_URL = "https://www.tiktok.com/@matto.itz.graphic?_r=1&_t=ZS-98iyVY5E8ZQ";

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
  return `${CURRENCY_SYMBOLS[code]}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function taskReward(currency: string): number {
  return TASK_REWARDS[asCurrency(currency)];
}

/** Minimum cashout for the user's currency. */
export function minCashout(currency: string): number {
  return MIN_PAYOUT[asCurrency(currency)];
}

export function detectCountryCode(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz.includes("Lagos")) return "NG";
    const locale = typeof navigator !== "undefined" ? navigator.language : "en-NG";
    const region = locale.split("-")[1]?.toUpperCase();
    if (region && COUNTRIES.some((c) => c.code === region)) return region;
  } catch {
    /* ignore */
  }
  return "NG";
}

export function currencyForCountry(code: string): CurrencyCode {
  return COUNTRIES.find((c) => c.code === code)?.currency ?? "USD";
}
