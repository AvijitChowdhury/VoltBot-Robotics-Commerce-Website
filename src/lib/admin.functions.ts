import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: !!data, userId: context.userId };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) return { ok: false as const, error: "An admin already exists" };
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 30 * 86400e3).toISOString();
    const [orders, products, incomplete, customers, recent] = await Promise.all([
      supabaseAdmin.from("orders").select("total,status,created_at,payment_status,recovered_from_incomplete"),
      supabaseAdmin.from("products").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("incomplete_orders").select("id,total,is_converted,created_at"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("orders").select("id,order_number,customer_name,total,status,payment_method,payment_status,created_at").order("created_at", { ascending: false }).limit(8),
    ]);
    const all = orders.data ?? [];
    const revenue = all.filter(o => o.payment_status === "paid" || o.status === "delivered").reduce((s, o) => s + Number(o.total), 0);
    const pending = all.filter(o => o.status === "pending").length;
    const inc = incomplete.data ?? [];
    const converted = inc.filter(i => i.is_converted).length;
    const recoveredRevenue = all.filter(o => o.recovered_from_incomplete).reduce((s, o) => s + Number(o.total), 0);

    // Last 14 days revenue
    const byDay: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400e3).toISOString().slice(0, 10);
      byDay[d] = 0;
    }
    all.forEach(o => {
      const d = (o.created_at ?? "").slice(0, 10);
      if (d in byDay) byDay[d] += Number(o.total);
    });

    return {
      stats: {
        totalOrders: all.length,
        revenue,
        pending,
        products: products.count ?? 0,
        customers: customers.count ?? 0,
        incompleteTotal: inc.length,
        incompleteConverted: converted,
        conversionRate: inc.length ? Math.round((converted / inc.length) * 100) : 0,
        recoveredRevenue,
      },
      recent: recent.data ?? [],
      chart: Object.entries(byDay).map(([date, total]) => ({ date, total })),
    };
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string; q?: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("orders").select("*, order_items(id,product_name,quantity,unit_price)").is("deleted_at", null).order("created_at", { ascending: false }).limit(200);
    if (data.status && data.status !== "all") q = q.eq("status", data.status as any);
    if (data.q) q = q.or(`order_number.ilike.%${data.q}%,customer_name.ilike.%${data.q}%,customer_phone.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status?: string; payment_status?: string; transaction_id?: string; sender_number?: string; amount_paid?: number }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("orders").update(patch as any).eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const listIncompleteOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("incomplete_orders").select("*").order("created_at", { ascending: false }).limit(200);
    return data ?? [];
  });

export const convertIncompleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inc, error: ie } = await supabaseAdmin.from("incomplete_orders").select("*").eq("id", data.id).maybeSingle();
    if (ie || !inc) return { ok: false, error: ie?.message ?? "Not found" };
    if (inc.is_converted) return { ok: false, error: "Already converted" };
    if (!inc.customer_name || !inc.customer_phone || !inc.shipping_address || !inc.city || !inc.delivery_zone_id) {
      return { ok: false, error: "Incomplete data — missing customer/address/zone" };
    }
    const cart = (inc.cart_snapshot as any[]) ?? [];
    if (!cart.length) return { ok: false, error: "Empty cart" };

    const order_number = "VB-" + Date.now().toString(36).toUpperCase() + "-ADM";
    const { data: order, error } = await supabaseAdmin.from("orders").insert({
      order_number,
      user_id: inc.user_id,
      guest_email: inc.user_id ? null : inc.customer_email,
      customer_name: inc.customer_name,
      customer_email: inc.customer_email ?? "",
      customer_phone: inc.customer_phone,
      shipping_address: inc.shipping_address,
      city: inc.city,
      delivery_zone_id: inc.delivery_zone_id,
      delivery_fee: Number(inc.total) - Number(inc.subtotal),
      subtotal: inc.subtotal,
      total: inc.total,
      status: "pending",
      payment_method: "cod",
      payment_status: "unpaid",
      amount_paid: 0,
      recovered_from_incomplete: inc.id,
    }).select("id,order_number").single();
    if (error || !order) return { ok: false, error: error?.message ?? "Failed" };

    await supabaseAdmin.from("order_items").insert(cart.map((l: any) => ({
      order_id: order.id,
      product_id: l.product_id,
      product_name: l.name,
      product_image: l.image_url,
      unit_price: l.price,
      quantity: l.quantity,
      subtotal: Number(l.price) * l.quantity,
    })));
    await supabaseAdmin.from("incomplete_orders").update({ is_converted: true, converted_order_id: order.id, converted_at: new Date().toISOString() }).eq("id", inc.id);
    return { ok: true, order_number: order.order_number };
  });

export const deleteIncompleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("incomplete_orders").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const listProductsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [products, cats] = await Promise.all([
      supabaseAdmin.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
      supabaseAdmin.from("categories").select("id,name,slug").order("display_order"),
    ]);
    return { products: products.data ?? [], categories: cats.data ?? [] };
  });

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; slug: string; category_id: string | null; price: number; compare_at_price?: number | null; stock: number; image_url?: string | null; description?: string | null; is_active: boolean; is_featured: boolean }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await supabaseAdmin.from("products").update(patch as any).eq("id", id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("products").insert(data as any);
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").update({ is_active: false }).eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ============== TRASH / BULK / MANUAL ORDER ==============

export const trashOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").update({ deleted_at: new Date().toISOString() }).in("id", data.ids);
    if (error) return { ok: false, error: error.message };
    return { ok: true, count: data.ids.length };
  });

export const restoreOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").update({ deleted_at: null }).in("id", data.ids);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const permanentDeleteOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").delete().in("id", data.ids);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const listTrashedOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("orders").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }).limit(200);
    return data ?? [];
  });

export const bulkUpdateOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[]; status?: string; payment_status?: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = {};
    if (data.status) patch.status = data.status;
    if (data.payment_status) patch.payment_status = data.payment_status;
    if (!Object.keys(patch).length) return { ok: false, error: "Nothing to update" };
    const { error } = await supabaseAdmin.from("orders").update(patch).in("id", data.ids);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const createManualOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    customer_name: string; customer_email: string; customer_phone: string;
    shipping_address: string; city: string; delivery_zone_id: string;
    payment_method: "cod" | "uddoktapay" | "partial";
    payment_status?: "paid" | "unpaid" | "partial" | "failed";
    amount_paid?: number; notes?: string;
    items: Array<{ product_id: string; quantity: number; unit_price?: number }>;
  }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.items.length) return { ok: false, error: "Add at least one item" };

    const ids = data.items.map(i => i.product_id);
    const { data: products } = await supabaseAdmin.from("products").select("id,name,slug,price,image_url").in("id", ids);
    if (!products?.length) return { ok: false, error: "No matching products" };

    const { data: zone } = await supabaseAdmin.from("delivery_zones").select("id,fee").eq("id", data.delivery_zone_id).maybeSingle();
    if (!zone) return { ok: false, error: "Invalid delivery zone" };

    const lines = data.items.map(i => {
      const p = products.find((x: any) => x.id === i.product_id)!;
      const unit_price = i.unit_price ?? Number(p.price);
      return { product_id: p.id, name: p.name, image_url: p.image_url, unit_price, quantity: i.quantity, subtotal: unit_price * i.quantity };
    });
    const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
    const delivery_fee = Number(zone.fee);
    const total = subtotal + delivery_fee;
    const order_number = "VB-" + Date.now().toString(36).toUpperCase() + "-MAN";

    const { data: order, error } = await supabaseAdmin.from("orders").insert({
      order_number,
      customer_name: data.customer_name, customer_email: data.customer_email, customer_phone: data.customer_phone,
      shipping_address: data.shipping_address, city: data.city, delivery_zone_id: data.delivery_zone_id,
      delivery_fee, subtotal, total,
      status: "pending",
      payment_method: data.payment_method,
      payment_status: data.payment_status ?? "unpaid",
      amount_paid: data.amount_paid ?? 0,
      notes: data.notes ?? null,
    }).select("id,order_number").single();
    if (error || !order) return { ok: false, error: error?.message ?? "Failed" };

    await supabaseAdmin.from("order_items").insert(lines.map(l => ({
      order_id: order.id, product_id: l.product_id, product_name: l.name, product_image: l.image_url,
      unit_price: l.unit_price, quantity: l.quantity, subtotal: l.subtotal,
    })));
    return { ok: true, order_id: order.id, order_number: order.order_number };
  });

// ============== BRANDS / TAGS ==============
export const listBrandsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("brands").select("*").order("display_order");
    return data ?? [];
  });

export const upsertBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; slug: string; logo_url?: string | null; description?: string | null; display_order?: number; is_active: boolean }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await supabaseAdmin.from("brands").update(patch as any).eq("id", id!);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("brands").insert(data as any);
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  });

export const deleteBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("brands").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const listTagsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("tags").select("*").order("name");
    return data ?? [];
  });

export const upsertTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; slug: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await supabaseAdmin.from("tags").update(patch as any).eq("id", id!);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("tags").insert(data as any);
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  });

export const deleteTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("tags").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ============== RECOVERY ANALYTICS ==============
export const getRecoveryAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: inc }, { data: orders }] = await Promise.all([
      supabaseAdmin.from("incomplete_orders").select("id,total,is_converted,created_at"),
      supabaseAdmin.from("orders").select("id,total,recovered_from_incomplete,created_at").not("recovered_from_incomplete", "is", null),
    ]);
    const list = inc ?? [];
    const recovered = orders ?? [];

    const byDay: Record<string, { total: number; converted: number; revenue: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400e3).toISOString().slice(0, 10);
      byDay[d] = { total: 0, converted: 0, revenue: 0 };
    }
    list.forEach((r: any) => {
      const d = (r.created_at ?? "").slice(0, 10);
      if (d in byDay) { byDay[d].total++; if (r.is_converted) byDay[d].converted++; }
    });
    recovered.forEach((o: any) => {
      const d = (o.created_at ?? "").slice(0, 10);
      if (d in byDay) byDay[d].revenue += Number(o.total);
    });

    const total = list.length;
    const converted = list.filter((r: any) => r.is_converted).length;
    const recoveredRevenue = recovered.reduce((s: number, o: any) => s + Number(o.total), 0);
    const abandonedValue = list.filter((r: any) => !r.is_converted).reduce((s: number, r: any) => s + Number(r.total), 0);

    return {
      stats: {
        total, converted, abandoned: total - converted,
        conversionRate: total ? Math.round((converted / total) * 100) : 0,
        recoveredRevenue, abandonedValue,
      },
      series: Object.entries(byDay).map(([date, v]) => ({ date, ...v })),
      funnel: [
        { label: "Cart started", value: total },
        { label: "Address entered", value: list.filter((r: any) => r.shipping_address).length },
        { label: "Converted", value: converted },
      ],
    };
  });

