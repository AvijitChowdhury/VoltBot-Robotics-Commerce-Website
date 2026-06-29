import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { retryOrderPayment } from "@/lib/payments.functions";
import { LogOut, Package, User as UserIcon, RefreshCw } from "lucide-react";

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
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary capitalize">{o.status}</span></td>
                      <td className="px-4 py-3 text-xs capitalize">{o.payment_method} · {o.payment_status}</td>
                      <td className="px-4 py-3 text-right font-semibold">৳{Number(o.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
