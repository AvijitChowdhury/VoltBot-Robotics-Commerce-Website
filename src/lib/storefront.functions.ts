import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const getHomepageData = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [announcements, banners, categories, featured, all, reviews] = await Promise.all([
    sb.from("announcements").select("id,message,link").eq("is_active", true).order("display_order"),
    sb.from("banners").select("id,title,subtitle,image_url,cta_text,cta_link,position,display_order").eq("is_active", true).order("display_order"),
    sb.from("categories").select("id,name,slug,description,image_url").order("display_order"),
    sb.from("products").select("id,name,slug,price,compare_at_price,image_url,rating,reviews_count,stock").eq("is_active", true).eq("is_featured", true).limit(8),
    sb.from("products").select("id,name,slug,price,compare_at_price,image_url,rating,reviews_count,stock").eq("is_active", true).order("created_at", { ascending: false }).limit(12),
    sb.from("reviews").select("id,customer_name,customer_avatar,rating,comment").eq("is_featured", true).eq("is_approved", true).limit(6),
  ]);
  return {
    announcements: announcements.data ?? [],
    banners: banners.data ?? [],
    categories: categories.data ?? [],
    featured: featured.data ?? [],
    all: all.data ?? [],
    reviews: reviews.data ?? [],
  };
});

export const getProductsList = createServerFn({ method: "GET" })
  .inputValidator((d: { category?: string; q?: string; sort?: string; minPrice?: number; maxPrice?: number; page?: number; pageSize?: number }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(48, data.pageSize ?? 12);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = sb.from("products").select("id,name,slug,price,compare_at_price,image_url,rating,reviews_count,stock,category_id", { count: "exact" }).eq("is_active", true);

    if (data.category) {
      const cat = await sb.from("categories").select("id").eq("slug", data.category).maybeSingle();
      if (cat.data) q = q.eq("category_id", cat.data.id);
    }
    if (data.q) q = q.ilike("name", `%${data.q}%`);
    if (data.minPrice != null) q = q.gte("price", data.minPrice);
    if (data.maxPrice != null) q = q.lte("price", data.maxPrice);

    switch (data.sort) {
      case "price-asc": q = q.order("price", { ascending: true }); break;
      case "price-desc": q = q.order("price", { ascending: false }); break;
      case "rating": q = q.order("rating", { ascending: false }); break;
      case "oldest": q = q.order("created_at", { ascending: true }); break;
      default: q = q.order("created_at", { ascending: false });
    }

    const { data: products, count } = await q.range(from, to);
    const cats = await sb.from("categories").select("id,name,slug").order("display_order");
    return { products: products ?? [], total: count ?? 0, page, pageSize, categories: cats.data ?? [] };
  });

export const getProductDetail = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: product } = await sb.from("products").select("*, categories(name,slug)").eq("slug", data.slug).eq("is_active", true).maybeSingle();
    if (!product) return { product: null, images: [], reviews: [], related: [] };
    const [images, reviews, related] = await Promise.all([
      sb.from("product_images").select("id,url,display_order").eq("product_id", product.id).order("display_order"),
      sb.from("reviews").select("id,customer_name,customer_avatar,rating,comment,created_at").eq("product_id", product.id).eq("is_approved", true).order("created_at", { ascending: false }).limit(20),
      sb.from("products").select("id,name,slug,price,compare_at_price,image_url,rating,reviews_count,stock").eq("category_id", product.category_id!).eq("is_active", true).neq("id", product.id).limit(4),
    ]);
    return { product, images: images.data ?? [], reviews: reviews.data ?? [], related: related.data ?? [] };
  });

export const getDeliveryZones = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb.from("delivery_zones").select("id,name,fee,estimated_days").eq("is_active", true).order("fee");
  return data ?? [];
});

type CartLine = { product_id: string; name: string; price: number; quantity: number; image_url: string | null };

export const saveIncompleteOrder = createServerFn({ method: "POST" })
  .inputValidator((d: {
    session_id: string;
    customer_name?: string; customer_email?: string; customer_phone?: string;
    shipping_address?: string; city?: string; delivery_zone_id?: string | null;
    cart: CartLine[]; subtotal: number; total: number; last_field_updated?: string;
  }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const payload = {
      session_id: data.session_id,
      customer_name: data.customer_name ?? null,
      customer_email: data.customer_email ?? null,
      customer_phone: data.customer_phone ?? null,
      shipping_address: data.shipping_address ?? null,
      city: data.city ?? null,
      delivery_zone_id: data.delivery_zone_id ?? null,
      cart_snapshot: data.cart as unknown as Database["public"]["Tables"]["incomplete_orders"]["Row"]["cart_snapshot"],
      subtotal: data.subtotal,
      total: data.total,
      last_field_updated: data.last_field_updated ?? null,
    };
    const { error } = await sb.from("incomplete_orders").upsert(payload, { onConflict: "session_id" });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d: {
    user_id?: string | null;
    incomplete_session_id?: string | null;
    customer_name: string; customer_email: string; customer_phone: string;
    shipping_address: string; city: string; delivery_zone_id: string;
    cart: CartLine[]; notes?: string;
    payment_method: "cod" | "uddoktapay" | "partial";
    coupon_code?: string | null;
  }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const zone = await sb.from("delivery_zones").select("id,fee").eq("id", data.delivery_zone_id).maybeSingle();
    if (!zone.data) return { ok: false as const, error: "Invalid delivery zone" };
    const subtotal = data.cart.reduce((s, l) => s + Number(l.price) * l.quantity, 0);
    const delivery_fee = Number(zone.data.fee);

    // Coupon
    let discount = 0;
    let appliedCoupon: string | null = null;
    if (data.coupon_code) {
      const code = data.coupon_code.trim().toUpperCase();
      const { data: c } = await sb.from("coupons").select("*").ilike("code", code).maybeSingle();
      const now = new Date();
      if (c && c.is_active &&
        (!c.starts_at || new Date(c.starts_at) <= now) &&
        (!c.expires_at || new Date(c.expires_at) >= now) &&
        (c.usage_limit == null || c.used_count < c.usage_limit) &&
        Number(c.min_order_amount) <= subtotal) {
        let d = c.type === "percentage" ? (subtotal * Number(c.value)) / 100 : Number(c.value);
        if (c.max_discount != null) d = Math.min(d, Number(c.max_discount));
        discount = Math.min(d, subtotal);
        appliedCoupon = c.code;
      }
    }

    const total = subtotal + delivery_fee - discount;
    const order_number = "VB-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

    let recovered_from_incomplete: string | null = null;
    if (data.incomplete_session_id) {
      const { data: inc } = await sb.from("incomplete_orders").select("id").eq("session_id", data.incomplete_session_id).maybeSingle();
      recovered_from_incomplete = inc?.id ?? null;
    }

    const { data: order, error } = await sb.from("orders").insert({
      order_number,
      user_id: data.user_id ?? null,
      guest_email: data.user_id ? null : data.customer_email,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      shipping_address: data.shipping_address,
      city: data.city,
      delivery_zone_id: data.delivery_zone_id,
      delivery_fee, subtotal, total, discount,
      coupon_code: appliedCoupon,
      status: "pending",
      payment_method: data.payment_method,
      payment_status: "unpaid",
      amount_paid: 0,
      notes: data.notes ?? null,
      recovered_from_incomplete,
    } as any).select("id,order_number").single();

    if (error || !order) return { ok: false as const, error: error?.message ?? "Failed to create order" };

    const items = data.cart.map((l) => ({
      order_id: order.id, product_id: l.product_id, product_name: l.name, product_image: l.image_url,
      unit_price: l.price, quantity: l.quantity, subtotal: Number(l.price) * l.quantity,
    }));
    await sb.from("order_items").insert(items);

    if (appliedCoupon) {
      await sb.rpc as any;
      // Increment coupon used_count (best-effort)
      const { data: c } = await sb.from("coupons").select("id,used_count").eq("code", appliedCoupon).maybeSingle();
      if (c) await sb.from("coupons").update({ used_count: (c.used_count ?? 0) + 1 } as any).eq("id", c.id);
    }

    if (recovered_from_incomplete) {
      await sb.from("incomplete_orders").update({ is_converted: true, converted_order_id: order.id, converted_at: new Date().toISOString() }).eq("id", recovered_from_incomplete);
    }

    return { ok: true as const, order_id: order.id, order_number: order.order_number, discount };
  });
