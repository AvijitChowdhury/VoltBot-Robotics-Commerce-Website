import { createFileRoute } from "@tanstack/react-router";

const BASE = () => process.env.STEADFAST_BASE_URL ?? "https://portal.packzy.com/api/v1";

export const Route = createFileRoute("/api/public/courier-status-sync")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: orders } = await supabaseAdmin
          .from("orders")
          .select("id,courier_tracking_code,courier_status,status")
          .not("courier_tracking_code", "is", null)
          .not("courier_status", "in", "(\"delivered\",\"cancelled\",\"returned\")")
          .limit(50);
        if (!orders?.length) return Response.json({ ok: true, synced: 0 });

        const headers = {
          "Api-Key": process.env.STEADFAST_API_KEY ?? "",
          "Secret-Key": process.env.STEADFAST_SECRET_KEY ?? "",
          "Content-Type": "application/json",
        };
        let synced = 0;
        for (const o of orders) {
          try {
            const res = await fetch(`${BASE()}/status_by_trackingcode/${o.courier_tracking_code}`, { headers });
            const json = await res.json().catch(() => ({}));
            const status = json?.delivery_status ?? json?.status;
            if (!status || status === o.courier_status) continue;
            await supabaseAdmin.from("orders").update({
              courier_status: status,
              courier_synced_at: new Date().toISOString(),
              status: status === "delivered" ? "delivered" : status === "cancelled" ? "cancelled" : o.status,
            }).eq("id", o.id);
            synced++;
          } catch { /* swallow per-order errors */ }
        }
        return Response.json({ ok: true, scanned: orders.length, synced });
      },
    },
  },
});
