import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE = () => process.env.STEADFAST_BASE_URL ?? "https://portal.packzy.com/api/v1";

function headers() {
  return {
    "Api-Key": process.env.STEADFAST_API_KEY ?? "",
    "Secret-Key": process.env.STEADFAST_SECRET_KEY ?? "",
    "Content-Type": "application/json",
  };
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

function buildSteadfastPayload(order: any) {
  return {
    invoice: order.order_number,
    recipient_name: order.customer_name,
    recipient_phone: order.customer_phone,
    recipient_address: `${order.shipping_address}, ${order.city ?? ""}`.trim(),
    cod_amount: order.payment_method === "cod"
      ? Number(order.total)
      : order.payment_method === "partial"
        ? Math.max(0, Number(order.total) - Number(order.amount_paid ?? 0))
        : 0,
    note: order.notes ?? "",
  };
}

export const pushOrderToSteadfast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", data.order_id).maybeSingle();
    if (!order) return { ok: false, error: "Order not found" };
    if (order.courier_consignment_id) return { ok: false, error: "Already shipped to Steadfast" };

    const payload = buildSteadfastPayload(order);
    const res = await fetch(`${BASE()}/create_order`, { method: "POST", headers: headers(), body: JSON.stringify(payload) });
    const json = await res.json().catch(() => ({}));

    await supabaseAdmin.from("courier_shipments").insert({
      order_id: order.id,
      provider: "steadfast",
      consignment_id: json?.consignment?.consignment_id?.toString() ?? null,
      tracking_code: json?.consignment?.tracking_code ?? null,
      invoice: order.order_number,
      status: json?.consignment?.status ?? (res.ok ? "pending" : "failed"),
      cod_amount: payload.cod_amount,
      request_payload: payload as any,
      response_payload: json as any,
    });

    if (!res.ok || !json?.consignment) return { ok: false, error: json?.message ?? "Steadfast error" };

    await supabaseAdmin.from("orders").update({
      courier_consignment_id: json.consignment.consignment_id?.toString(),
      courier_tracking_code: json.consignment.tracking_code,
      courier_status: json.consignment.status ?? "in_review",
      courier_synced_at: new Date().toISOString(),
      status: "shipped",
    }).eq("id", order.id);

    return { ok: true, tracking_code: json.consignment.tracking_code };
  });

export const pushOrdersBulkToSteadfast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_ids: string[] }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (!data.order_ids.length) return { ok: false, error: "No orders selected" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orders } = await supabaseAdmin.from("orders").select("*").in("id", data.order_ids).is("courier_consignment_id", null);
    if (!orders?.length) return { ok: false, error: "Nothing to push (already shipped or not found)" };

    const payload = { data: orders.map(buildSteadfastPayload) };
    const res = await fetch(`${BASE()}/create_order/bulk-order`, { method: "POST", headers: headers(), body: JSON.stringify(payload) });
    const json = await res.json().catch(() => ({}));

    const results: Array<{ invoice: string; ok: boolean }> = [];
    const list: any[] = Array.isArray(json) ? json : (json?.data ?? []);
    for (const item of list) {
      const o = orders.find((x: any) => x.order_number === item.invoice);
      if (!o) continue;
      const ok = !!item?.consignment_id || !!item?.tracking_code;
      await supabaseAdmin.from("courier_shipments").insert({
        order_id: o.id, provider: "steadfast",
        consignment_id: item.consignment_id?.toString() ?? null,
        tracking_code: item.tracking_code ?? null,
        invoice: o.order_number,
        status: item.status ?? (ok ? "pending" : "failed"),
        cod_amount: Number(o.total),
        request_payload: payload as any, response_payload: item as any,
      });
      if (ok) {
        await supabaseAdmin.from("orders").update({
          courier_consignment_id: item.consignment_id?.toString(),
          courier_tracking_code: item.tracking_code,
          courier_status: item.status ?? "in_review",
          courier_synced_at: new Date().toISOString(),
          status: "shipped",
        }).eq("id", o.id);
      }
      results.push({ invoice: o.order_number, ok });
    }
    return { ok: true, total: results.length, succeeded: results.filter(r => r.ok).length, results };
  });

export const syncOrderCourierStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", data.order_id).maybeSingle();
    if (!order?.courier_tracking_code) return { ok: false, error: "No tracking code" };
    const res = await fetch(`${BASE()}/status_by_trackingcode/${order.courier_tracking_code}`, { headers: headers() });
    const json = await res.json().catch(() => ({}));
    const status = json?.delivery_status ?? json?.status;
    if (status) {
      await supabaseAdmin.from("orders").update({
        courier_status: status,
        courier_synced_at: new Date().toISOString(),
        status: status === "delivered" ? "delivered" : status === "cancelled" ? "cancelled" : order.status,
      }).eq("id", order.id);
    }
    return { ok: true, status };
  });
