import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { retryOrderPayment } from "@/lib/payments.functions";
import { LogOut, Package, User as UserIcon, RefreshCw, Star, Send } from "lucide-react";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My Account — VoltBot" }] }),
  component: AccountPage,
});

type Order = {
  id: string; order_number: string; total: number; status: string; payment_status: string;
  payment_method: string; created_at: string;
};

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders")
      .select("id,order_number,total,status,payment_status,payment_method,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data ?? []) as Order[]));
  }, [user]);

  if (loading || !user) {
    return <div className="min-h-screen bg-background"><Header /><div className="p-16 text-center text-muted-foreground">Loading…</div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/15 text-primary ring-1 ring-primary/40 flex items-center justify-center">
              <UserIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold">Welcome back</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <button onClick={() => signOut().then(() => navigate({ to: "/" }))}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Your orders</h2>
          {orders === null ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading orders…</p>
          ) : orders.length === 0 ? (
            <div className="mt-4 rounded-xl border border-border bg-card p-10 text-center">
              <p className="text-muted-foreground">You haven't placed any orders yet.</p>
              <Link to="/products" className="mt-4 inline-block font-semibold text-primary hover:underline">Start shopping →</Link>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <OrderRow key={o.id} order={o} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ReviewableItems userId={user.id} />
      </main>
      <Footer />
    </div>
  );
}

function OrderRow({ order: o }: { order: Order }) {
  const retry = useServerFn(retryOrderPayment);
  const [busy, setBusy] = useState(false);
  const canRetry = o.payment_method !== "cod" && (o.payment_status === "unpaid" || o.payment_status === "failed" || o.payment_status === "partial");

  async function onRetry() {
    setBusy(true);
    const r = await retry({ data: { order_id: o.id } });
    if (r.ok) window.location.href = r.payment_url;
    else { alert(r.error ?? "Failed"); setBusy(false); }
  }

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
      <td className="px-4 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
      <td className="px-4 py-3"><span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary capitalize">{o.status}</span></td>
      <td className="px-4 py-3 text-xs capitalize">{o.payment_method} · {o.payment_status}</td>
      <td className="px-4 py-3 text-right font-semibold">৳{Number(o.total).toLocaleString()}</td>
      <td className="px-4 py-3 text-right">
        {canRetry && (
          <button disabled={busy} onClick={onRetry} className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/25 disabled:opacity-60">
            <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} /> Retry payment
          </button>
        )}
      </td>
    </tr>
  );
}

type Reviewable = { order_id: string; product_id: string; product_name: string; product_image: string | null; order_number: string };

function ReviewableItems({ userId }: { userId: string }) {
  const [items, setItems] = useState<Reviewable[] | null>(null);

  async function load() {
    // Fetch delivered/shipped order items that the user hasn't reviewed yet
    const { data: orders } = await supabase
      .from("orders")
      .select("id,order_number,status,order_items(product_id,product_name,product_image)")
      .eq("user_id", userId)
      .in("status", ["delivered", "shipped"]);

    const all: Reviewable[] = [];
    (orders ?? []).forEach((o: any) => {
      (o.order_items ?? []).forEach((i: any) => {
        if (i.product_id) all.push({ order_id: o.id, order_number: o.order_number, product_id: i.product_id, product_name: i.product_name, product_image: i.product_image });
      });
    });

    const { data: existing } = await supabase.from("reviews").select("product_id").eq("user_id", userId);
    const reviewed = new Set((existing ?? []).map((r: any) => r.product_id));
    setItems(all.filter(x => !reviewed.has(x.product_id)));
  }

  useEffect(() => { load(); }, [userId]);

  if (!items || items.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold flex items-center gap-2"><Star className="h-5 w-5 text-warning" /> Write a review</h2>
      <p className="mt-1 text-sm text-muted-foreground">Help other shoppers — leave a review for products you've received.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <ReviewForm key={it.product_id + it.order_id} item={it} onDone={load} />
        ))}
      </div>
    </section>
  );
}

function ReviewForm({ item, onDone }: { item: Reviewable; onDone: () => void }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!user || !comment.trim()) { setErr("Write a short comment"); return; }
    setBusy(true); setErr(null);
    const { data: prof } = await supabase.from("profiles").select("full_name,avatar_url").eq("id", user.id).maybeSingle();
    const { error } = await supabase.from("reviews").insert({
      product_id: item.product_id,
      order_id: item.order_id,
      user_id: user.id,
      customer_name: prof?.full_name ?? user.email ?? "Customer",
      customer_avatar: prof?.avatar_url ?? null,
      rating, comment: comment.trim(),
      is_verified_purchase: true,
      is_approved: true,
    } as any);
    if (error) { setErr(error.message); setBusy(false); return; }
    onDone();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        {item.product_image ? <img src={item.product_image} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-surface-2" />}
        <div className="flex-1 min-w-0">
          <div className="line-clamp-1 text-sm font-semibold">{item.product_name}</div>
          <div className="font-mono text-[10px] text-muted-foreground">{item.order_number}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-1">
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => setRating(n)} type="button" aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}>
            <Star className={`h-5 w-5 ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Share your experience…"
        className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
      <button onClick={submit} disabled={busy} className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
        <Send className="h-3 w-3" /> Submit review
      </button>
    </div>
  );
}
