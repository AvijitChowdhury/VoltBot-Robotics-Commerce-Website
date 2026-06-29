import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UDP_API_URL = "https://sandbox.uddoktapay.com"; // change to https://api.uddoktapay.com in production

// Create a UddoktaPay charge for an existing order.
// Used for: initial online payment, partial-payment delivery fee, and retry of failed online payments.
export const createUddoktaPayCharge = createServerFn({ method: "POST" })
  .inputValidator((d: { order_id: string; mode?: "full" | "partial_delivery" }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.UDDOKTAPAY_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Payment gateway not configured" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders").select("*").eq("id", data.order_id).maybeSingle();
    if (error || !order) return { ok: false as const, error: "Order not found" };

    // For partial payments, charge only the delivery fee online; the rest is COD.
    const isPartial = data.mode === "partial_delivery" || order.payment_method === "partial";
    const amount = isPartial ? Number(order.delivery_fee) : Number(order.total) - Number(order.amount_paid ?? 0);
    if (amount <= 0) return { ok: false as const, error: "Nothing left to pay" };

    const origin = process.env.SITE_URL || process.env.PUBLIC_SITE_URL || "";
    const payload = {
      full_name: order.customer_name,
      email: order.customer_email || "customer@voltbot.local",
      amount: amount.toFixed(2),
      metadata: { order_id: order.id, order_number: order.order_number, mode: isPartial ? "partial" : "full" },
      redirect_url: `${origin}/account?order=${order.order_number}&payment=success`,
      return_type: "GET",
      cancel_url: `${origin}/account?order=${order.order_number}&payment=cancel`,
      webhook_url: `${origin}/api/public/uddoktapay/webhook`,
    };

    const res = await fetch(`${UDP_API_URL}/api/checkout-v2`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "RT-UDDOKTAPAY-API-KEY": apiKey },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.payment_url) {
      return { ok: false as const, error: json.message ?? `Gateway error (${res.status})` };
    }
    return { ok: true as const, payment_url: json.payment_url as string };
  });

// Verify a payment by invoice_id after the user returns from UddoktaPay.
export const verifyUddoktaPayment = createServerFn({ method: "POST" })
  .inputValidator((d: { invoice_id: string }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.UDDOKTAPAY_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Payment gateway not configured" };

    const res = await fetch(`${UDP_API_URL}/api/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "RT-UDDOKTAPAY-API-KEY": apiKey },
      body: JSON.stringify({ invoice_id: data.invoice_id }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (json.status !== "COMPLETED") return { ok: false as const, status: json.status ?? "unknown" };

    const orderId = json.metadata?.order_id;
    if (!orderId) return { ok: false as const, error: "Missing order metadata" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) return { ok: false as const, error: "Order not found" };

    const paid = Number(json.amount);
    const newAmount = Number(order.amount_paid ?? 0) + paid;
    const total = Number(order.total);
    const isFullyPaid = newAmount >= total - 0.5;

    await supabaseAdmin.from("orders").update({
      amount_paid: newAmount,
      payment_status: isFullyPaid ? "paid" : "partial",
      transaction_id: json.transaction_id ?? json.invoice_id,
      sender_number: json.sender_number ?? null,
      status: order.status === "pending" ? "processing" : order.status,
    } as any).eq("id", orderId);

    return { ok: true as const, order_number: order.order_number, amount: paid, fully_paid: isFullyPaid };
  });

// Allow signed-in user to retry payment for one of their own orders.
export const retryOrderPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ context, data }) => {
    const { data: order } = await context.supabase.from("orders").select("id,user_id,payment_status,total,amount_paid")
      .eq("id", data.order_id).maybeSingle();
    if (!order || order.user_id !== context.userId) return { ok: false as const, error: "Order not found" };
    if (order.payment_status === "paid") return { ok: false as const, error: "Already paid" };
    // Delegate to charge creation (re-use logic, server-internal call)
    const apiKey = process.env.UDDOKTAPAY_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Payment gateway not configured" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: full } = await supabaseAdmin.from("orders").select("*").eq("id", data.order_id).single();
    if (!full) return { ok: false as const, error: "Order not found" };
    const amount = Number(full.total) - Number(full.amount_paid ?? 0);
    if (amount <= 0) return { ok: false as const, error: "Nothing to pay" };
    const origin = process.env.SITE_URL || process.env.PUBLIC_SITE_URL || "";
    const res = await fetch(`${UDP_API_URL}/api/checkout-v2`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "RT-UDDOKTAPAY-API-KEY": apiKey },
      body: JSON.stringify({
        full_name: full.customer_name,
        email: full.customer_email || "customer@voltbot.local",
        amount: amount.toFixed(2),
        metadata: { order_id: full.id, order_number: full.order_number, mode: "retry" },
        redirect_url: `${origin}/account?order=${full.order_number}&payment=success`,
        cancel_url: `${origin}/account?order=${full.order_number}&payment=cancel`,
        webhook_url: `${origin}/api/public/uddoktapay/webhook`,
        return_type: "GET",
      }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json.payment_url) return { ok: false as const, error: json.message ?? "Gateway error" };
    return { ok: true as const, payment_url: json.payment_url as string };
  });
