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
