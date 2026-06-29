import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkIsAdmin, claimFirstAdmin, getAdminDashboard,
  listOrders, updateOrder,
  listIncompleteOrders, convertIncompleteOrder, deleteIncompleteOrder,
  listProductsAdmin, upsertProduct, deleteProduct,
} from "@/lib/admin.functions";
import {
  LayoutDashboard, ShoppingBag, Package, AlertCircle, TrendingUp,
  ShieldAlert, Trash2, RotateCw, X, Edit3, Plus, Search,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — VoltBot" }] }),
  component: AdminPage,
});

type Tab = "dashboard" | "orders" | "incomplete" | "products";

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");
  const check = useServerFn(checkIsAdmin);
  const claim = useServerFn(claimFirstAdmin);
  const [status, setStatus] = useState<"checking" | "admin" | "denied">("checking");
  const [claimErr, setClaimErr] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    check().then((r) => setStatus(r.isAdmin ? "admin" : "denied")).catch(() => setStatus("denied"));
  }, [user]);

  if (loading || !user || status === "checking") {
    return <div className="min-h-screen bg-background"><Header /><div className="p-16 text-center text-muted-foreground">Loading…</div></div>;
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-md px-4 py-16">
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 font-display text-2xl font-bold">Admin access required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account doesn't have admin permissions. If you're the site owner and no admin exists yet, claim it below.
            </p>
            {claimErr && <p className="mt-3 text-xs text-destructive">{claimErr}</p>}
            <button
              onClick={async () => {
                setClaimErr(null);
                const r = await claim();
                if (r.ok) setStatus("admin"); else setClaimErr(r.error ?? "Failed");
              }}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Claim admin (first-time setup)
            </button>
            <Link to="/" className="mt-3 block text-xs text-muted-foreground hover:text-foreground">← Back home</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Control panel</span>
            <h1 className="font-display text-3xl font-bold">Admin</h1>
          </div>
        </div>
        <nav className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
          {([
            ["dashboard", "Dashboard", LayoutDashboard],
            ["orders", "Orders", ShoppingBag],
            ["incomplete", "Incomplete & Recovery", AlertCircle],
            ["products", "Products", Package],
          ] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === k ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {tab === "dashboard" && <DashboardTab />}
          {tab === "orders" && <OrdersTab />}
          {tab === "incomplete" && <IncompleteTab />}
          {tab === "products" && <ProductsTab />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StatCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"} p-5`}>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function DashboardTab() {
  const fn = useServerFn(getAdminDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => fn() });
  if (isLoading || !data) return <p className="text-muted-foreground">Loading metrics…</p>;
  const { stats, recent, chart } = data;
  const max = Math.max(1, ...chart.map(c => c.total));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue (paid)" value={`৳${stats.revenue.toLocaleString()}`} accent />
        <StatCard label="Orders" value={String(stats.totalOrders)} hint={`${stats.pending} pending`} />
        <StatCard label="Customers" value={String(stats.customers)} />
        <StatCard label="Products" value={String(stats.products)} />
        <StatCard label="Incomplete orders" value={String(stats.incompleteTotal)} hint={`${stats.incompleteConverted} recovered`} />
        <StatCard label="Recovery rate" value={`${stats.conversionRate}%`} accent />
        <StatCard label="Recovered revenue" value={`৳${stats.recoveredRevenue.toLocaleString()}`} />
        <StatCard label="Pending fulfillment" value={String(stats.pending)} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold">Revenue — last 14 days</h2>
        </div>
        <div className="flex h-40 items-end gap-1.5">
          {chart.map(c => (
            <div key={c.date} className="flex-1 group relative">
              <div className="rounded-t bg-primary/70 hover:bg-primary transition-colors" style={{ height: `${(c.total / max) * 100}%`, minHeight: 2 }} />
              <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-surface-2 px-2 py-0.5 text-[10px] opacity-0 group-hover:opacity-100">{c.date}: ৳{c.total.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display font-semibold mb-4">Recent orders</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr><th className="py-2">Order</th><th>Customer</th><th>Payment</th><th>Status</th><th className="text-right">Total</th></tr>
          </thead>
          <tbody>
            {recent.map(o => (
              <tr key={o.id} className="border-t border-border">
                <td className="py-2 font-mono text-xs">{o.order_number}</td>
                <td>{o.customer_name}</td>
                <td className="capitalize text-xs">{o.payment_method} · {o.payment_status}</td>
                <td><span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary capitalize">{o.status}</span></td>
                <td className="text-right font-semibold">৳{Number(o.total).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrdersTab() {
  const fn = useServerFn(listOrders);
  const update = useServerFn(updateOrder);
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", statusFilter, q],
    queryFn: () => fn({ data: { status: statusFilter, q } }),
  });
  const [open, setOpen] = useState<any | null>(null);
  const mut = useMutation({
    mutationFn: (p: any) => update({ data: p }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "orders"] }); qc.invalidateQueries({ queryKey: ["admin", "dashboard"] }); setOpen(null); },
  });

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by order #, name, phone…" className="w-full rounded-lg border border-border bg-surface pl-10 pr-3 py-2 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          {["all", "pending", "processing", "shipped", "delivered", "cancelled"].map(s => <option key={s} value={s} className="bg-background">{s}</option>)}
        </select>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="px-3 py-2">Order</th><th>Customer</th><th>Items</th><th>Payment</th><th>Status</th><th className="text-right">Total</th><th></th></tr>
            </thead>
            <tbody>
              {(data ?? []).map((o: any) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{o.order_number}<div className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</div></td>
                  <td>{o.customer_name}<div className="text-[10px] text-muted-foreground">{o.customer_phone}</div></td>
                  <td className="text-xs">{o.order_items?.length ?? 0}</td>
                  <td className="text-xs capitalize">{o.payment_method}<div className="text-[10px] text-muted-foreground">{o.payment_status}{o.transaction_id ? ` · ${o.transaction_id}` : ""}</div></td>
                  <td><span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary capitalize">{o.status}</span></td>
                  <td className="text-right font-semibold">৳{Number(o.total).toLocaleString()}</td>
                  <td><button onClick={() => setOpen(o)} className="rounded-md p-1.5 hover:bg-surface-2"><Edit3 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <OrderEditor order={open} onClose={() => setOpen(null)} onSave={(p) => mut.mutate({ id: open.id, ...p })} saving={mut.isPending} />}
    </div>
  );
}

function OrderEditor({ order, onClose, onSave, saving }: any) {
  const [status, setStatus] = useState(order.status);
  const [payment_status, setPS] = useState(order.payment_status);
  const [transaction_id, setTx] = useState(order.transaction_id ?? "");
  const [sender_number, setSN] = useState(order.sender_number ?? "");
  const [amount_paid, setAP] = useState(Number(order.amount_paid ?? 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">Order {order.order_number}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{order.customer_name} · {order.customer_phone} · {order.city}</div>
        <div className="mt-1 text-xs text-muted-foreground">{order.shipping_address}</div>

        <div className="mt-4 rounded-lg border border-border bg-surface p-3 text-sm">
          {(order.order_items ?? []).map((it: any) => (
            <div key={it.id} className="flex justify-between py-1">
              <span>{it.product_name} × {it.quantity}</span>
              <span>৳{(Number(it.unit_price) * it.quantity).toLocaleString()}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
            <span>Total</span><span>৳{Number(order.total).toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs">Status
            <select value={status} onChange={e => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              {["pending", "processing", "shipped", "delivered", "cancelled"].map(s => <option key={s} value={s} className="bg-background">{s}</option>)}
            </select>
          </label>
          <label className="text-xs">Payment status
            <select value={payment_status} onChange={e => setPS(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              {["unpaid", "partial", "paid", "refunded", "failed"].map(s => <option key={s} value={s} className="bg-background">{s}</option>)}
            </select>
          </label>
          <label className="text-xs sm:col-span-2">UddoktaPay transaction ID
            <input value={transaction_id} onChange={e => setTx(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono" placeholder="e.g. TXN1234ABCD" />
          </label>
          <label className="text-xs">Sender number
            <input value={sender_number} onChange={e => setSN(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" placeholder="01XXXXXXXXX" />
          </label>
          <label className="text-xs">Amount paid (৳)
            <input type="number" value={amount_paid} onChange={e => setAP(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={() => onSave({ status, payment_status, transaction_id, sender_number, amount_paid })} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function IncompleteTab() {
  const fn = useServerFn(listIncompleteOrders);
  const convert = useServerFn(convertIncompleteOrder);
  const del = useServerFn(deleteIncompleteOrder);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "incomplete"], queryFn: () => fn() });
  const [msg, setMsg] = useState<string | null>(null);

  const mConvert = useMutation({
    mutationFn: (id: string) => convert({ data: { id } }),
    onSuccess: (r: any) => { setMsg(r.ok ? `Converted → ${r.order_number}` : r.error); qc.invalidateQueries({ queryKey: ["admin"] }); },
  });
  const mDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "incomplete"] }),
  });

  const rows = data ?? [];
  const converted = rows.filter((r: any) => r.is_converted).length;
  const conversionRate = rows.length ? Math.round((converted / rows.length) * 100) : 0;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="Total" value={String(rows.length)} />
        <StatCard label="Recovered" value={String(converted)} accent />
        <StatCard label="Recovery rate" value={`${conversionRate}%`} />
      </div>

      {msg && <div className="mb-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">{msg}</div>}

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="px-3 py-2">When</th><th>Customer</th><th>Stopped at</th><th>Cart</th><th className="text-right">Total</th><th>State</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r: any) => {
                const items = ((r.cart_snapshot as any[]) ?? []).length;
                const canConvert = !r.is_converted && r.customer_name && r.customer_phone && r.shipping_address && r.delivery_zone_id;
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                    <td>{r.customer_name ?? <span className="text-muted-foreground">—</span>}<div className="text-[10px] text-muted-foreground">{r.customer_phone ?? ""}</div></td>
                    <td className="text-xs text-muted-foreground">{r.last_field_updated ?? "—"}</td>
                    <td className="text-xs">{items} items</td>
                    <td className="text-right font-semibold">৳{Number(r.total).toLocaleString()}</td>
                    <td>
                      {r.is_converted
                        ? <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">Recovered</span>
                        : <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground">Open</span>}
                    </td>
                    <td className="flex gap-1 py-2">
                      {canConvert && (
                        <button onClick={() => mConvert.mutate(r.id)} className="rounded-md bg-primary/15 p-1.5 text-primary hover:bg-primary/25" title="Convert to order">
                          <RotateCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => mDel.mutate(r.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProductsTab() {
  const fn = useServerFn(listProductsAdmin);
  const upsert = useServerFn(upsertProduct);
  const del = useServerFn(deleteProduct);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "products"], queryFn: () => fn() });
  const [edit, setEdit] = useState<any | null>(null);

  const mSave = useMutation({
    mutationFn: (p: any) => upsert({ data: p }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "products"] }); setEdit(null); },
  });
  const mDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4" /> New product
        </button>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="px-3 py-2">Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {(data?.products ?? []).map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2 flex items-center gap-2">
                    {p.image_url && <img src={p.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                    <span className="font-medium">{p.name}</span>
                  </td>
                  <td className="text-xs text-muted-foreground">{p.categories?.name ?? "—"}</td>
                  <td>৳{Number(p.price).toLocaleString()}</td>
                  <td>{p.stock}</td>
                  <td>
                    {p.is_active
                      ? <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Active</span>
                      : <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground">Hidden</span>}
                    {p.is_featured && <span className="ml-1 rounded-md bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">Featured</span>}
                  </td>
                  <td className="flex gap-1 py-2">
                    <button onClick={() => setEdit(p)} className="rounded-md p-1.5 hover:bg-surface-2"><Edit3 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => mDel.mutate(p.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && <ProductEditor product={edit} categories={data?.categories ?? []} onClose={() => setEdit(null)} onSave={(p) => mSave.mutate(p)} saving={mSave.isPending} />}
    </div>
  );
}

function ProductEditor({ product, categories, onClose, onSave, saving }: any) {
  const isNew = !product.id;
  const [name, setName] = useState(product.name ?? "");
  const [slug, setSlug] = useState(product.slug ?? "");
  const [category_id, setCat] = useState(product.category_id ?? categories[0]?.id ?? "");
  const [price, setPrice] = useState(Number(product.price ?? 0));
  const [compare_at_price, setCAP] = useState(Number(product.compare_at_price ?? 0));
  const [stock, setStock] = useState(Number(product.stock ?? 0));
  const [image_url, setImg] = useState(product.image_url ?? "");
  const [description, setDesc] = useState(product.description ?? "");
  const [is_active, setActive] = useState(product.is_active ?? true);
  const [is_featured, setFeat] = useState(product.is_featured ?? false);

  function autoSlug(v: string) {
    setName(v);
    if (isNew) setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{isNew ? "New product" : "Edit product"}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs sm:col-span-2">Name
            <input value={name} onChange={e => autoSlug(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">Slug
            <input value={slug} onChange={e => setSlug(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono" />
          </label>
          <label className="text-xs">Category
            <select value={category_id} onChange={e => setCat(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              {categories.map((c: any) => <option key={c.id} value={c.id} className="bg-background">{c.name}</option>)}
            </select>
          </label>
          <label className="text-xs">Price (৳)
            <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">Compare-at (৳)
            <input type="number" value={compare_at_price} onChange={e => setCAP(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">Stock
            <input type="number" value={stock} onChange={e => setStock(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">Image URL
            <input value={image_url} onChange={e => setImg(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="text-xs sm:col-span-2">Description
            <textarea value={description} onChange={e => setDesc(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={is_active} onChange={e => setActive(e.target.checked)} /> Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={is_featured} onChange={e => setFeat(e.target.checked)} /> Featured
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving || !name || !slug || !category_id}
            onClick={() => onSave({
              id: product.id, name, slug, category_id,
              price, compare_at_price: compare_at_price || null,
              stock, image_url: image_url || null, description: description || null,
              is_active, is_featured,
            })}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            {saving ? "Saving…" : "Save product"}
          </button>
        </div>
      </div>
    </div>
  );
}
