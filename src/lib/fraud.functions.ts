import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE = () => process.env.BDCOURIER_BASE_URL ?? "https://api.bdcourier.com";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

function normalizePhone(p: string) {
  return (p ?? "").replace(/[^0-9]/g, "").replace(/^88/, "");
}

function aggregate(raw: any) {
  const couriers = raw?.couriers ?? raw?.data?.couriers ?? raw?.summary ?? {};
  let total = 0, success = 0, cancelled = 0;
  for (const k of Object.keys(couriers)) {
    const c = couriers[k];
    if (c && typeof c === "object") {
      total += Number(c.total ?? c.total_parcel ?? 0);
      success += Number(c.success ?? c.delivered ?? 0);
      cancelled += Number(c.cancel ?? c.cancelled ?? 0);
    }
  }
  const rate = total > 0 ? (success / total) * 100 : 0;
  return { total_orders: total, success_orders: success, cancelled_orders: cancelled, success_rate: Number(rate.toFixed(2)) };
}

async function getFraudSettings(supabaseAdmin: any) {
  const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", "fraud").maybeSingle();
  return data?.value ?? { enabled: true, autoCheckOnNewOrder: true, highRiskBelow: 50, mediumRiskBelow: 75 };
}

function riskLevel(rate: number, total: number, s: any) {
  if (total === 0) return "unknown";
  if (rate < (s.highRiskBelow ?? 50)) return "high";
  if (rate < (s.mediumRiskBelow ?? 75)) return "medium";
  return "low";
}

export const checkPhoneFraud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { phone: string; force?: boolean }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizePhone(data.phone);
    if (!phone) return { ok: false, error: "Invalid phone" };

    // Cache check — 24h
    if (!data.force) {
      const { data: cached } = await supabaseAdmin.from("fraud_checks").select("*").eq("phone", phone).maybeSingle();
      if (cached && (Date.now() - new Date(cached.checked_at).getTime()) < 24 * 3600e3) {
        return { ok: true, cached: true, result: cached };
      }
    }

    const settings = await getFraudSettings(supabaseAdmin);
    if (settings.enabled === false) return { ok: false, error: "Fraud check disabled" };

    const apiKey = process.env.BDCOURIER_API_KEY ?? "";
    const res = await fetch(`${BASE()}/courier-check`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: raw?.message ?? `BD Courier error ${res.status}` };

    const agg = aggregate(raw);
    const level = riskLevel(agg.success_rate, agg.total_orders, settings);
    const payload = { phone, ...agg, risk_level: level, raw: raw as any, checked_at: new Date().toISOString() };
    await supabaseAdmin.from("fraud_checks").upsert(payload, { onConflict: "phone" });
    return { ok: true, cached: false, result: payload };
  });

export const autoCheckOrderFraud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("id,customer_phone").eq("id", data.order_id).maybeSingle();
    if (!order) return { ok: false, error: "Order not found" };
    const phone = normalizePhone(order.customer_phone);
    const { data: cached } = await supabaseAdmin.from("fraud_checks").select("*").eq("phone", phone).maybeSingle();
    let check = cached;
    if (!check || (Date.now() - new Date(check.checked_at).getTime()) > 24 * 3600e3) {
      const settings = await getFraudSettings(supabaseAdmin);
      const res = await fetch(`${BASE()}/courier-check`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.BDCOURIER_API_KEY ?? ""}`, "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const raw = await res.json().catch(() => ({}));
      if (res.ok) {
        const agg = aggregate(raw);
        check = { phone, ...agg, risk_level: riskLevel(agg.success_rate, agg.total_orders, settings), raw, checked_at: new Date().toISOString() } as any;
        await supabaseAdmin.from("fraud_checks").upsert(check as any, { onConflict: "phone" });
      }
    }
    if (check) {
      await supabaseAdmin.from("orders").update({
        fraud_score: check.success_rate,
        fraud_data: { risk_level: check.risk_level, total: check.total_orders, success: check.success_orders, cancelled: check.cancelled_orders },
        fraud_checked_at: new Date().toISOString(),
      }).eq("id", order.id);
    }
    return { ok: true, result: check };
  });

export const getFraudSettingsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return await getFraudSettings(supabaseAdmin);
  });

export const updateFraudSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { enabled?: boolean; autoCheckOnNewOrder?: boolean; highRiskBelow?: number; mediumRiskBelow?: number }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const current = await getFraudSettings(supabaseAdmin);
    const merged = { ...current, ...data };
    await supabaseAdmin.from("app_settings").upsert({ key: "fraud", value: merged, updated_at: new Date().toISOString() });
    return { ok: true, value: merged };
  });

export const testBdCourierConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const res = await fetch(`${BASE()}/courier-check`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.BDCOURIER_API_KEY ?? ""}`, "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "01700000000" }),
    });
    return { ok: res.ok, status: res.status };
  });
