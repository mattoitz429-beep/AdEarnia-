import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({ reference: z.string().trim().min(6).max(120) });

function generatePin(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(10_000_000 + (bytes[0]! % 90_000_000));
}

/**
 * Verifies a Paystack transaction, then issues a unique 8-digit withdrawal PIN
 * to the signed-in user.
 */
export const purchasePin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const secret = process.env["PAYSTACK_SECRET_KEY"];
    if (!secret) throw new Error("Payments are not configured yet.");

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const body = (await res.json()) as {
      status?: boolean;
      data?: { status?: string; amount?: number; currency?: string };
    };
    if (!res.ok || !body.status || body.data?.status !== "success") {
      throw new Error("Payment could not be verified. Please contact support.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const existing = await supabaseAdmin
      .from("pin_purchases")
      .select("pin")
      .eq("reference", data.reference)
      .maybeSingle();
    if (existing.data?.pin) return { pin: existing.data.pin };

    let pin = generatePin();
    for (let i = 0; i < 5; i++) {
      const clash = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("withdrawal_pin", pin)
        .maybeSingle();
      if (!clash.data) break;
      pin = generatePin();
    }

    const insert = await supabaseAdmin.from("pin_purchases").insert({
      user_id: userId,
      reference: data.reference,
      amount: (body.data?.amount ?? 0) / 100,
      currency: body.data?.currency ?? "NGN",
      pin,
    });
    if (insert.error) throw new Error(insert.error.message);

    const update = await supabaseAdmin
      .from("profiles")
      .update({ withdrawal_pin: pin, pin_issued_at: new Date().toISOString(), pin_used: false })
      .eq("id", userId);
    if (update.error) throw new Error(update.error.message);

    return { pin };
  });
