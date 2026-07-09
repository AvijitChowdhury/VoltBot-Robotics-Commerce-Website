import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { getDeliveryZones, saveIncompleteOrder, createOrder } from "@/lib/storefront.functions";
import { validateCoupon } from "@/lib/coupons.functions";
import { createUddoktaPayCharge } from "@/lib/payments.functions";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Tag } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — VoltBot" },
      { name: "description", content: "Complete your VoltBot order with cash on delivery, partial payment, or prepaid options." },
      { property: "og:title", content: "Checkout — VoltBot" },
      { property: "og:description", content: "Complete your VoltBot order securely." },
      { property: "og:url", content: "https://roboticsavijit.lovable.app/checkout" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://roboticsavijit.lovable.app/checkout" }],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { lines, subtotal, sessionId, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    shipping_address: "", city: "", delivery_zone_id: "",
    notes: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "uddoktapay" | "partial">("cod");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ order_number: string } | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponErr, setCouponErr] = useState<string | null>(null);

  const zonesQ = useQuery({ queryKey: ["delivery-zones"], queryFn: () => getDeliveryZones() });
  const zone = zonesQ.data?.find((z) => z.id === form.delivery_zone_id);
  const deliveryFee = Number(zone?.fee ?? 0);
  const discount = coupon?.discount ?? 0;
  const total = subtotal + deliveryFee - discount;

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, customer_email: f.customer_email || user.email || "" }));
  }, [user]);

  // Debounced auto-save incomplete order
  const saveFn = useServerFn(saveIncompleteOrder);
  const lastField = useRef<string>("");
  useEffect(() => {
    if (lines.length === 0 || !sessionId) return;
    if (!form.customer_email && !form.customer_phone && !form.customer_name) return;
    const t = setTimeout(() => {
      saveFn({ data: {
        session_id: sessionId,
        ...form,
        delivery_zone_id: form.delivery_zone_id || null,
        cart: lines.map((l) => ({ product_id: l.product_id, name: l.name, price: l.price, quantity: l.quantity, image_url: l.image_url })),
        subtotal, total, last_field_updated: lastField.current,
      } }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, lines, subtotal, total, sessionId]);

  function update<K extends keyof typeof form>(k: K, v: string) {
    lastField.current = k;
    setForm((f) => ({ ...f, [k]: v }));
  }

  const createFn = useServerFn(createOrder);
  const chargeFn = useServerFn(createUddoktaPayCharge);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) return;
    if (!form.delivery_zone_id) { setErr("Select a delivery zone"); return; }
    setSubmitting(true); setErr(null);
    try {
      const res = await createFn({ data: {
        user_id: user?.id ?? null,
        incomplete_session_id: sessionId,
        ...form,
        cart: lines.map((l) => ({ product_id: l.product_id, name: l.name, price: l.price, quantity: l.quantity, image_url: l.image_url })),
        payment_method: paymentMethod,
        coupon_code: coupon?.code ?? null,
      } });
      if (!res.ok) throw new Error(res.error);
      // For online or partial payments, redirect to UddoktaPay
      if (paymentMethod !== "cod") {
        const charge = await chargeFn({ data: { order_id: res.order_id, mode: paymentMethod === "partial" ? "partial_delivery" : "full" } });
        if (!charge.ok) throw new Error(charge.error);
        clear();
        window.location.href = charge.payment_url;
        return;
      }
      setSuccess({ order_number: res.order_number });
      clear();
    } catch (e: any) { setErr(e.message ?? "Failed to place order"); }
    finally { setSubmitting(false); }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-xl px-4 py-20 text-center lg:px-8">
          <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
          <h1 className="mt-4 font-display text-3xl font-bold">Order placed!</h1>
          <p className="mt-2 text-muted-foreground">Your order number is</p>
          <p className="mt-2 font-mono text-lg font-bold text-primary">{success.order_number}</p>
          <p className="mt-6 text-sm text-muted-foreground">We've recorded your order. You can track it from your account.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/account" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">View my orders</Link>
            <Link to="/products" className="rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold">Keep shopping</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Checkout</h1>

        {lines.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Link to="/products" className="mt-4 inline-block text-primary font-semibold">Browse products</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              {!user && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
                  Have an account? <Link to="/auth" className="font-semibold text-primary hover:underline">Sign in</Link> for faster checkout — or continue as guest.
                </div>
              )}

              <Section title="Contact information">
                <Input label="Full name" required value={form.customer_name} onChange={(v) => update("customer_name", v)} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Email" type="email" required value={form.customer_email} onChange={(v) => update("customer_email", v)} />
                  <Input label="Phone" required value={form.customer_phone} onChange={(v) => update("customer_phone", v)} />
                </div>
              </Section>

              <Section title="Shipping address">
                <Input label="Address" required value={form.shipping_address} onChange={(v) => update("shipping_address", v)} />
                <Input label="City / Area" required value={form.city} onChange={(v) => update("city", v)} />
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Delivery zone</label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {zonesQ.data?.map((z) => (
                      <button key={z.id} type="button" onClick={() => update("delivery_zone_id", z.id)}
                        className={`rounded-lg border p-3 text-left text-sm transition-colors ${form.delivery_zone_id === z.id ? "border-primary bg-primary/10" : "border-border bg-surface hover:bg-surface-2"}`}>
                        <div className="font-semibold">{z.name}</div>
                        <div className="text-xs text-muted-foreground">৳{Number(z.fee).toLocaleString()} · {z.estimated_days}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </Section>

              <Section title="Payment method">
                <div className="grid gap-2 sm:grid-cols-3">
                  {([
                    { v: "cod", label: "Cash on delivery", sub: "Pay when you receive" },
                    { v: "uddoktapay", label: "Online (UddoktaPay)", sub: "bKash, Nagad, card" },
                    { v: "partial", label: "Partial (delivery online)", sub: "Pay delivery now, rest COD" },
                  ] as const).map((o) => (
                    <button key={o.v} type="button" onClick={() => setPaymentMethod(o.v)}
                      className={`rounded-lg border p-3 text-left text-sm ${paymentMethod === o.v ? "border-primary bg-primary/10" : "border-border bg-surface hover:bg-surface-2"}`}>
                      <div className="font-semibold">{o.label}</div>
                      <div className="text-xs text-muted-foreground">{o.sub}</div>
                    </button>
                  ))}
                </div>
                {paymentMethod !== "cod" && (
                  <p className="mt-2 text-xs text-muted-foreground">Online payment is wired up in Phase 7 (UddoktaPay). For now, the order will be created with payment pending.</p>
                )}
              </Section>

              <Section title="Order notes (optional)">
                <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </Section>

              {err && <p className="text-sm text-destructive">{err}</p>}
            </div>

            <aside className="rounded-2xl border border-border bg-card p-6 h-fit sticky top-24">
              <h2 className="font-display text-xl font-bold">Your order</h2>
              <ul className="mt-4 space-y-3">
                {lines.map((l) => (
                  <li key={l.product_id} className="flex items-center gap-3 text-sm">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-2">
                      {l.image_url && <img src={l.image_url} alt={l.name} className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="line-clamp-1 font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground">× {l.quantity}</div>
                    </div>
                    <div className="text-sm font-semibold">৳{(l.price * l.quantity).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-border pt-4">
                {coupon ? (
                  <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm">
                    <span className="inline-flex items-center gap-2 font-mono"><Tag className="h-3 w-3" /> {coupon.code} · −৳{coupon.discount.toLocaleString()}</span>
                    <button type="button" onClick={() => { setCoupon(null); setCouponInput(""); }} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Coupon code" className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-primary/40" />
                      <button type="button" onClick={async () => {
                        setCouponErr(null);
                        const r = await validateCoupon({ data: { code: couponInput, subtotal } });
                        if (r.ok) setCoupon({ code: r.code, discount: r.discount });
                        else setCouponErr(r.error);
                      }} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-semibold hover:bg-primary/20">Apply</button>
                    </div>
                    {couponErr && <p className="mt-1 text-xs text-destructive">{couponErr}</p>}
                  </div>
                )}
              </div>
              <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>৳{subtotal.toLocaleString()}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>{zone ? `৳${deliveryFee.toLocaleString()}` : "—"}</dd></div>
                {discount > 0 && <div className="flex justify-between text-success"><dt>Discount</dt><dd>−৳{discount.toLocaleString()}</dd></div>}
                <div className="flex justify-between border-t border-border pt-2 font-display text-lg font-bold"><dt>Total</dt><dd className="text-primary">৳{total.toLocaleString()}</dd></div>
              </dl>
              <button disabled={submitting} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:brightness-110 disabled:opacity-60">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Place order
              </button>
            </aside>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Input({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}{required && " *"}</span>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
    </label>
  );
}
