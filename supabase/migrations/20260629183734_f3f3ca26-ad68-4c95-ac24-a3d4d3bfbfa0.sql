
-- Extensions for cron + http
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============== ORDERS additions ==============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS fraud_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS fraud_data jsonb,
  ADD COLUMN IF NOT EXISTS fraud_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS courier_consignment_id text,
  ADD COLUMN IF NOT EXISTS courier_tracking_code text,
  ADD COLUMN IF NOT EXISTS courier_status text,
  ADD COLUMN IF NOT EXISTS courier_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount numeric(10,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON public.orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_courier_status ON public.orders(courier_status);

-- ============== COURIER SHIPMENTS ==============
CREATE TABLE IF NOT EXISTS public.courier_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'steadfast',
  consignment_id text,
  tracking_code text,
  invoice text,
  status text,
  cod_amount numeric(10,2),
  request_payload jsonb,
  response_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_shipments TO authenticated;
GRANT ALL ON public.courier_shipments TO service_role;
ALTER TABLE public.courier_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courier_shipments admin all" ON public.courier_shipments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_courier_shipments_updated BEFORE UPDATE ON public.courier_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== FRAUD CHECKS CACHE ==============
CREATE TABLE IF NOT EXISTS public.fraud_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  total_orders int NOT NULL DEFAULT 0,
  success_orders int NOT NULL DEFAULT 0,
  cancelled_orders int NOT NULL DEFAULT 0,
  success_rate numeric(5,2) NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'unknown', -- low | medium | high | unknown
  raw jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fraud_checks TO authenticated;
GRANT ALL ON public.fraud_checks TO service_role;
ALTER TABLE public.fraud_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fraud_checks admin all" ON public.fraud_checks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============== COUPONS ==============
DO $$ BEGIN
  CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type coupon_type NOT NULL DEFAULT 'percentage',
  value numeric(10,2) NOT NULL,
  min_order_amount numeric(10,2) NOT NULL DEFAULT 0,
  max_discount numeric(10,2),
  usage_limit int,
  used_count int NOT NULL DEFAULT 0,
  per_user_limit int,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons public read active" ON public.coupons
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "coupons admin write" ON public.coupons
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== BRANDS ==============
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  description text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands public read" ON public.brands FOR SELECT TO anon, authenticated USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "brands admin write" ON public.brands FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============== TAGS ==============
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags public read" ON public.tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tags admin write" ON public.tags FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============== PRODUCTS additions ==============
DO $$ BEGIN
  CREATE TYPE product_type AS ENUM ('simple', 'variable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS product_type product_type NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS custom_shipping_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS related_product_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE TABLE IF NOT EXISTS public.product_tags (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);
GRANT SELECT ON public.product_tags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_tags TO authenticated;
GRANT ALL ON public.product_tags TO service_role;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_tags public read" ON public.product_tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "product_tags admin write" ON public.product_tags FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============== VARIANTS ==============
CREATE TABLE IF NOT EXISTS public.product_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.product_attributes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_attributes TO authenticated;
GRANT ALL ON public.product_attributes TO service_role;
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa public read" ON public.product_attributes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pa admin write" ON public.product_attributes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text,
  price numeric(10,2) NOT NULL,
  compare_at_price numeric(10,2),
  stock int NOT NULL DEFAULT 0,
  image_url text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"Color":"Red","Size":"M"}
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pv public read" ON public.product_variants FOR SELECT TO anon, authenticated USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "pv admin write" ON public.product_variants FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============== APP SETTINGS ==============
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings admin all" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.app_settings(key, value) VALUES
  ('fraud', '{"enabled":true,"autoCheckOnNewOrder":true,"highRiskBelow":50,"mediumRiskBelow":75}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============== REVIEWS — verified buyer policy ==============
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_verified_purchase boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "reviews user create" ON public.reviews;
CREATE POLICY "reviews verified buyer create" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.user_id = auth.uid()
        AND oi.product_id = reviews.product_id
        AND o.status IN ('delivered'::order_status, 'shipped'::order_status)
    )
  );

-- ============== Hide trashed orders from default RLS reads ==============
DROP POLICY IF EXISTS "orders self read" ON public.orders;
CREATE POLICY "orders self read" ON public.orders
  FOR SELECT TO authenticated
  USING (
    (auth.uid() = user_id AND deleted_at IS NULL)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ============== Auto-purge trashed orders ==============
CREATE OR REPLACE FUNCTION public.purge_old_trashed_orders()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.orders
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days';
$$;

DO $$ BEGIN
  PERFORM cron.unschedule('purge-trashed-orders');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('purge-trashed-orders', '0 3 * * *', $$ SELECT public.purge_old_trashed_orders(); $$);
