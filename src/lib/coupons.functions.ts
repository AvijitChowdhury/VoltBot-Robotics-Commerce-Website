import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; subtotal: number }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const code = data.code.trim().toUpperCase();
    if (!code) return { ok: false as const, error: "Empty code" };
    const { data: c } = await sb.from("coupons").select("*").ilike("code", code).maybeSingle();
    if (!c || !c.is_active) return { ok: false as const, error: "Invalid coupon" };
    const now = new Date();
    if (c.starts_at && new Date(c.starts_at) > now) return { ok: false as const, error: "Coupon not active yet" };
    if (c.expires_at && new Date(c.expires_at) < now) return { ok: false as const, error: "Coupon expired" };
    if (c.usage_limit != null && c.used_count >= c.usage_limit) return { ok: false as const, error: "Coupon usage limit reached" };
    if (Number(c.min_order_amount) > data.subtotal) return { ok: false as const, error: `Minimum order ৳${c.min_order_amount}` };
    let discount = c.type === "percentage" ? (data.subtotal * Number(c.value)) / 100 : Number(c.value);
    if (c.max_discount != null) discount = Math.min(discount, Number(c.max_discount));
    discount = Math.min(discount, data.subtotal);
    return { ok: true as const, code: c.code, type: c.type, value: Number(c.value), discount: Number(discount.toFixed(2)) };
  });

export const listCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("coupons").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const upsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string; code: string; type: "percentage" | "fixed"; value: number;
    min_order_amount?: number; max_discount?: number | null; usage_limit?: number | null;
    per_user_limit?: number | null; starts_at?: string | null; expires_at?: string | null; is_active: boolean;
  }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data, code: data.code.trim().toUpperCase() };
    if (data.id) {
      const { id, ...patch } = payload;
      const { error } = await supabaseAdmin.from("coupons").update(patch as any).eq("id", id!);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("coupons").insert(payload as any);
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("coupons").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
