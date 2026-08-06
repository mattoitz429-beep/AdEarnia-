import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  accountNumber: z.string().trim().regex(/^\d{10}$/, "Account number must be exactly 10 digits"),
  bankCode: z.string().trim().min(2).max(10),
});

export type ResolveAccountResult =
  | { ok: true; accountName: string }
  | { ok: false; message: string };

export const resolveNubanAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<ResolveAccountResult> => {
    const key = process.env["PAYSTACK_SECRET_KEY"];
    if (!key) {
      return {
        ok: false,
        message: "Bank verification is not configured yet. Please try again later.",
      };
    }

    try {
      const res = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(
          data.accountNumber,
        )}&bank_code=${encodeURIComponent(data.bankCode)}`,
        { headers: { Authorization: `Bearer ${key}` } },
      );
      const body = (await res.json()) as {
        status?: boolean;
        message?: string;
        data?: { account_name?: string };
      };

      if (!res.ok || !body.status || !body.data?.account_name) {
        return {
          ok: false,
          message: body.message || "Could not verify this account. Check the details and try again.",
        };
      }

      return { ok: true, accountName: body.data.account_name };
    } catch {
      return { ok: false, message: "Verification service unavailable. Please try again." };
    }
  });
