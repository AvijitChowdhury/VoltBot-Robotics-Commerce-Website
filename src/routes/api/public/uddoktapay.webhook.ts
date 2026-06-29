import { createFileRoute } from "@tanstack/react-router";

// UddoktaPay webhook receiver — public endpoint.
// Verifies the API key header and marks the order as paid.
export const Route = createFileRoute("/api/public/uddoktapay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.UDDOKTAPAY_API_KEY;
        if (!apiKey) return new Response("Gateway not configured", { status: 500 });

        const header = request.headers.get("rt-uddoktapay-api-key") ?? request.headers.get("RT-UDDOKTAPAY-API-KEY");
        if (header !== apiKey) return new Response("Unauthorized", { status: 401 });

        let payload: any;
        try { payload = await request.json(); } catch { return new Response("Bad payload", { status: 400 }); }

        const orderId = payload?.metadata?.order_id;
        const status = payload?.status;
        if (!orderId || status !== "COMPLETED") return new Response("ignored", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle();
        if (!order) return new Response("Order not found", { status: 404 });

        const paid = Number(payload.amount ?? 0);
        const newAmount = Number(order.amount_paid ?? 0) + paid;
        const total = Number(order.total);
        const fullyPaid = newAmount >= total - 0.5;

        await supabaseAdmin.from("orders").update({
          amount_paid: newAmount,
          payment_status: fullyPaid ? "paid" : "partial",
          transaction_id: payload.transaction_id ?? payload.invoice_id ?? null,
          sender_number: payload.sender_number ?? null,
          status: order.status === "pending" ? "processing" : order.status,
        } as any).eq("id", orderId);

        return new Response("ok", { status: 200 });
      },
    },
  },
});
