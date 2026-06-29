import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkIsAdmin, claimFirstAdmin, getAdminDashboard,
  listOrders, updateOrder,
  listIncompleteOrders, convertIncompleteOrder, deleteIncompleteOrder,
  listProductsAdmin, upsertProduct, deleteProduct,
  trashOrders, restoreOrders, permanentDeleteOrders, listTrashedOrders, bulkUpdateOrders, createManualOrder,
  getRecoveryAnalytics,
} from "@/lib/admin.functions";
import { pushOrderToSteadfast, pushOrdersBulkToSteadfast, syncOrderCourierStatus } from "@/lib/couriers.functions";
import { checkPhoneFraud, autoCheckOrderFraud, getFraudSettingsFn, updateFraudSettings, testBdCourierConnection } from "@/lib/fraud.functions";
import { listCoupons, upsertCoupon, deleteCoupon } from "@/lib/coupons.functions";
import {
  LayoutDashboard, ShoppingBag, Package, AlertCircle, TrendingUp,
  ShieldAlert, Trash2, RotateCw, X, Edit3, Plus, Search, MessageCircle, Send,
  Truck, ShieldCheck, Tag, Settings, RefreshCw, AlertTriangle, CheckCircle2, Undo2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — VoltBot" }] }),
  component: AdminPage,
});

type Tab = "dashboard" | "orders" | "trash" | "incomplete" | "products" | "coupons" | "chat" | "settings";

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
            ["trash", "Trash", Trash2],
            ["incomplete", "Incomplete & Recovery", AlertCircle],
            ["products", "Products", Package],
            ["coupons", "Coupons", Tag],
            ["chat", "Live Chat", MessageCircle],
            ["settings", "Settings", Settings],
          ] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === k ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {tab === "dashboard" && <DashboardTab />}
          {tab === "orders" && <OrdersTab />}
          {tab === "trash" && <TrashTab />}
          {tab === "incomplete" && <IncompleteTab />}
          {tab === "products" && <ProductsTab />}
          {tab === "coupons" && <CouponsTab />}
          {tab === "chat" && <ChatInboxTab />}
          {tab === "settings" && <SettingsTab />}
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

function FraudBadge({ score, level }: { score?: number | null; level?: string | null }) {
  if (score == null && !level) return <span className="text-[10px] text-muted-foreground">—</span>;
  const lvl = level ?? (score == null ? "unknown" : score < 50 ? "high" : score < 75 ? "medium" : "low");
  const map: Record<string, string> = {
    high: "bg-destructive/15 text-destructive border-destructive/30",
    medium: "bg-warning/15 text-warning border-warning/30",
    low: "bg-success/15 text-success border-success/30",
    unknown: "bg-surface-2 text-muted-foreground border-border",
  };
  const Icon = lvl === "high" ? AlertTriangle : lvl === "medium" ? AlertCircle : lvl === "low" ? ShieldCheck : ShieldAlert;
  return <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${map[lvl]}`}><Icon className="h-3 w-3" /> {lvl}{score != null ? ` ${Math.round(score)}%` : ""}</span>;
}

function OrdersTab() {
  const fn = useServerFn(listOrders);
  const update = useServerFn(updateOrder);
  const trash = useServerFn(trashOrders);
  const bulk = useServerFn(bulkUpdateOrders);
  const pushBulk = useServerFn(pushOrdersBulkToSteadfast);
  const pushOne = useServerFn(pushOrderToSteadfast);
  const syncOne = useServerFn(syncOrderCourierStatus);
  const autoFraud = useServerFn(autoCheckOrderFraud);
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", statusFilter, q],
    queryFn: () => fn({ data: { status: statusFilter, q } }),
  });
  const [open, setOpen] = useState<any | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const rows = (data ?? []) as any[];
  const allChecked = rows.length > 0 && rows.every(r => selected.has(r.id));

  const mut = useMutation({
    mutationFn: (p: any) => update({ data: p }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "orders"] }); qc.invalidateQueries({ queryKey: ["admin", "dashboard"] }); setOpen(null); },
  });

  function toggle(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function runBulkTrash() {
    if (!selected.size || !confirm(`Move ${selected.size} order(s) to trash?`)) return;
    const r = await trash({ data: { ids: Array.from(selected) } });
    if (r.ok) { setToast(`Moved ${r.count} to trash`); setSelected(new Set()); qc.invalidateQueries({ queryKey: ["admin", "orders"] }); }
  }
  async function runBulkStatus(status: string) {
    if (!selected.size) return;
    await bulk({ data: { ids: Array.from(selected), status } });
    setSelected(new Set()); qc.invalidateQueries({ queryKey: ["admin", "orders"] });
  }
  async function runBulkSteadfast() {
    if (!selected.size) return;
    const r = await pushBulk({ data: { order_ids: Array.from(selected) } });
    setToast(r.ok ? `Steadfast: ${r.succeeded}/${r.total} pushed` : r.error);
    setSelected(new Set()); qc.invalidateQueries({ queryKey: ["admin", "orders"] });
  }

  return (
    <div>
      {toast && <div className="mb-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">{toast}</div>}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by order #, name, phone…" className="w-full rounded-lg border border-border bg-surface pl-10 pr-3 py-2 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          {["all", "pending", "processing", "shipped", "delivered", "cancelled"].map(s => <option key={s} value={s} className="bg-background">{s}</option>)}
        </select>
        <button onClick={() => setManualOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4" /> Manual order
        </button>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs">
          <span className="font-semibold text-primary">{selected.size} selected</span>
          <span className="flex-1" />
          <button onClick={runBulkSteadfast} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 font-semibold text-primary-foreground"><Truck className="h-3 w-3" /> Send to Steadfast</button>
          <select onChange={e => { if (e.target.value) runBulkStatus(e.target.value); e.target.value = ""; }} className="rounded-md border border-border bg-surface px-2 py-1">
            <option value="">Set status…</option>
            {["pending","processing","shipped","delivered","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={runBulkTrash} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2.5 py-1 font-semibold text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /> Trash</button>
          <button onClick={() => setSelected(new Set())} className="rounded-md border border-border px-2 py-1">Clear</button>
        </div>
      )}

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 w-8"><input type="checkbox" checked={allChecked} onChange={e => setSelected(e.target.checked ? new Set(rows.map(r => r.id)) : new Set())} /></th>
                <th>Order</th><th>Customer</th><th>Fraud</th><th>Items</th><th>Payment</th><th>Status</th><th>Courier</th><th className="text-right">Total</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(o => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-3 py-2"><input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} /></td>
                  <td className="font-mono text-xs">{o.order_number}<div className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</div></td>
                  <td className="text-xs">{o.customer_name}<div className="text-[10px] text-muted-foreground">{o.customer_phone}</div></td>
                  <td><FraudBadge score={o.fraud_score} level={o.fraud_data?.risk_level} /></td>
                  <td className="text-xs">{o.order_items?.length ?? 0}</td>
                  <td className="text-xs capitalize">{o.payment_method}<div className="text-[10px] text-muted-foreground">{o.payment_status}</div></td>
                  <td><span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary capitalize">{o.status}</span></td>
                  <td className="text-xs">
                    {o.courier_tracking_code ? (
                      <div>
                        <div className="font-mono">{o.courier_tracking_code}</div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">{o.courier_status}
                          <button title="Sync" onClick={async () => { await syncOne({ data: { order_id: o.id } }); qc.invalidateQueries({ queryKey: ["admin", "orders"] }); }} className="hover:text-primary"><RefreshCw className="h-3 w-3" /></button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={async () => { const r = await pushOne({ data: { order_id: o.id } }); setToast(r.ok ? `Pushed → ${r.tracking_code}` : r.error); qc.invalidateQueries({ queryKey: ["admin", "orders"] }); }}
                        className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20">
                        <Truck className="h-3 w-3" /> Steadfast
                      </button>
                    )}
                  </td>
                  <td className="text-right font-semibold">৳{Number(o.total).toLocaleString()}</td>
                  <td className="space-x-1 whitespace-nowrap">
                    {!o.fraud_checked_at && <button title="Check fraud" onClick={async () => { await autoFraud({ data: { order_id: o.id } }); qc.invalidateQueries({ queryKey: ["admin", "orders"] }); }} className="rounded-md p-1.5 hover:bg-surface-2"><ShieldCheck className="h-3.5 w-3.5" /></button>}
                    <button onClick={() => setOpen(o)} className="rounded-md p-1.5 hover:bg-surface-2"><Edit3 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <OrderEditor order={open} onClose={() => setOpen(null)} onSave={(p: any) => mut.mutate({ id: open.id, ...p })} saving={mut.isPending} />}
      {manualOpen && <ManualOrderModal onClose={() => setManualOpen(false)} onCreated={() => { setManualOpen(false); qc.invalidateQueries({ queryKey: ["admin", "orders"] }); }} />}
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

      {edit && <ProductEditor product={edit} categories={data?.categories ?? []} onClose={() => setEdit(null)} onSave={(p: any) => mSave.mutate(p)} saving={mSave.isPending} />}
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

function ChatInboxTab() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    supabase.from("chat_sessions").select("*").order("last_message_at", { ascending: false, nullsFirst: false }).limit(100)
      .then(({ data }) => setSessions(data ?? []));
    const ch = supabase.channel("admin-chat-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_sessions" }, () => {
        supabase.from("chat_sessions").select("*").order("last_message_at", { ascending: false, nullsFirst: false }).limit(100)
          .then(({ data }) => setSessions(data ?? []));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let active = true;
    supabase.from("chat_messages").select("*").eq("session_id", activeId).order("created_at")
      .then(({ data }) => { if (active) setMessages(data ?? []); });
    supabase.from("chat_sessions").update({ unread_admin: 0 } as any).eq("id", activeId).then(() => {});
    const ch = supabase.channel(`admin-msgs:${activeId}`).on("postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${activeId}` },
      (p) => setMessages((m) => [...m, p.new])).subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [activeId]);

  async function reply() {
    if (!text.trim() || !activeId) return;
    const msg = text.trim();
    setText("");
    await supabase.from("chat_messages").insert({ session_id: activeId, sender: "admin", message: msg } as any);
    await supabase.from("chat_sessions").update({ last_message_at: new Date().toISOString() } as any).eq("id", activeId);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr] h-[640px]">
      <div className="rounded-xl border border-border bg-card overflow-y-auto">
        <div className="border-b border-border px-4 py-3 font-display font-semibold text-sm">Conversations</div>
        {sessions.length === 0 && <p className="p-4 text-xs text-muted-foreground">No chats yet.</p>}
        {sessions.map((s) => (
          <button key={s.id} onClick={() => setActiveId(s.id)} className={`block w-full text-left border-b border-border px-4 py-3 hover:bg-surface ${activeId === s.id ? "bg-surface" : ""}`}>
            <div className="flex justify-between gap-2">
              <span className="font-semibold text-sm truncate">{s.guest_name ?? s.guest_email ?? "User"}</span>
              {!!s.unread_admin && <span className="rounded-full bg-primary px-2 text-[10px] text-primary-foreground">{s.unread_admin}</span>}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.last_message_at ? new Date(s.last_message_at).toLocaleString() : "—"}</div>
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card flex flex-col">
        {!activeId ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Select a conversation</div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((m: any) => (
                <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${m.sender === "admin" ? "bg-primary text-primary-foreground" : "bg-surface"}`}>
                    {m.message}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); reply(); }} className="flex gap-2 border-t border-border p-3">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply…" className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
              <button disabled={!text.trim()} className="rounded-lg bg-primary px-3 py-2 text-primary-foreground shadow-glow disabled:opacity-60"><Send className="h-4 w-4" /></button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ============== TRASH ==============
function TrashTab() {
  const fn = useServerFn(listTrashedOrders);
  const restore = useServerFn(restoreOrders);
  const purge = useServerFn(permanentDeleteOrders);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "trash"], queryFn: () => fn() });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const rows = (data ?? []) as any[];

  async function doRestore() {
    if (!sel.size) return;
    await restore({ data: { ids: Array.from(sel) } });
    setSel(new Set()); qc.invalidateQueries({ queryKey: ["admin"] });
  }
  async function doPurge() {
    if (!sel.size || !confirm(`Permanently delete ${sel.size} order(s)? This cannot be undone.`)) return;
    await purge({ data: { ids: Array.from(sel) } });
    setSel(new Set()); qc.invalidateQueries({ queryKey: ["admin", "trash"] });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-xl font-bold">Trashed orders</h2>
          <p className="text-xs text-muted-foreground">Auto-purged after 30 days. Restore or delete permanently.</p>
        </div>
        {sel.size > 0 && (
          <div className="flex gap-2">
            <button onClick={doRestore} className="inline-flex items-center gap-1.5 rounded-md bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary"><Undo2 className="h-3 w-3" /> Restore ({sel.size})</button>
            <button onClick={doPurge} className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /> Delete forever</button>
          </div>
        )}
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">Trash is empty.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="px-3 py-2 w-8"></th><th>Order</th><th>Customer</th><th>Trashed</th><th className="text-right">Total</th></tr>
            </thead>
            <tbody>
              {rows.map(o => {
                const daysLeft = 30 - Math.floor((Date.now() - new Date(o.deleted_at).getTime()) / 86400e3);
                return (
                  <tr key={o.id} className="border-t border-border">
                    <td className="px-3 py-2"><input type="checkbox" checked={sel.has(o.id)} onChange={() => setSel(s => { const n = new Set(s); n.has(o.id) ? n.delete(o.id) : n.add(o.id); return n; })} /></td>
                    <td className="font-mono text-xs">{o.order_number}</td>
                    <td className="text-xs">{o.customer_name}<div className="text-[10px] text-muted-foreground">{o.customer_phone}</div></td>
                    <td className="text-xs">{new Date(o.deleted_at).toLocaleDateString()}<div className="text-[10px] text-warning">Purge in {daysLeft}d</div></td>
                    <td className="text-right font-semibold">৳{Number(o.total).toLocaleString()}</td>
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

// ============== MANUAL ORDER ==============
function ManualOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const createFn = useServerFn(createManualOrder);
  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    shipping_address: "", city: "", delivery_zone_id: "",
    payment_method: "cod" as const, notes: "",
  });
  const [zones, setZones] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<Array<{ product_id: string; quantity: number; unit_price: number }>>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("delivery_zones").select("id,name,fee").eq("is_active", true).then(({ data }) => setZones(data ?? []));
    supabase.from("products").select("id,name,price,stock").eq("is_active", true).order("name").then(({ data }) => setProducts(data ?? []));
  }, []);

  function addItem(productId: string) {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    setItems(it => [...it, { product_id: p.id, quantity: 1, unit_price: Number(p.price) }]);
  }
  const subtotal = items.reduce((s, l) => s + l.quantity * l.unit_price, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const r = await createFn({ data: { ...form, items } as any });
    if (r.ok) onCreated(); else { setErr(r.error ?? "Failed"); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit} className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">Manual order</h3>
          <button type="button" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Customer name" required value={form.customer_name} onChange={v => setForm(f => ({ ...f, customer_name: v }))} />
          <Field label="Phone" required value={form.customer_phone} onChange={v => setForm(f => ({ ...f, customer_phone: v }))} />
          <Field label="Email" value={form.customer_email} onChange={v => setForm(f => ({ ...f, customer_email: v }))} />
          <Field label="City" required value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} />
          <Field label="Address" required value={form.shipping_address} onChange={v => setForm(f => ({ ...f, shipping_address: v }))} className="sm:col-span-2" />
          <label className="text-xs">Delivery zone
            <select required value={form.delivery_zone_id} onChange={e => setForm(f => ({ ...f, delivery_zone_id: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="" className="bg-background">— select —</option>
              {zones.map(z => <option key={z.id} value={z.id} className="bg-background">{z.name} (৳{z.fee})</option>)}
            </select>
          </label>
          <label className="text-xs">Payment method
            <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value as any }))} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              {["cod","uddoktapay","partial"].map(m => <option key={m} value={m} className="bg-background">{m}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-semibold">Items</h4>
            <select onChange={e => { if (e.target.value) addItem(e.target.value); e.target.value = ""; }} className="rounded-md border border-border bg-surface px-2 py-1 text-xs">
              <option value="">+ add product…</option>
              {products.map(p => <option key={p.id} value={p.id} className="bg-background">{p.name} (৳{p.price})</option>)}
            </select>
          </div>
          {items.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">No items added yet.</p> : (
            <div className="mt-2 space-y-2">
              {items.map((it, i) => {
                const p = products.find(x => x.id === it.product_id);
                return (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2 text-xs">
                    <div className="flex-1 truncate">{p?.name}</div>
                    <input type="number" min={1} value={it.quantity} onChange={e => setItems(arr => arr.map((x,j) => j===i ? { ...x, quantity: Math.max(1, Number(e.target.value)) } : x))} className="w-16 rounded-md border border-border bg-surface px-2 py-1" />
                    <span>×</span>
                    <input type="number" value={it.unit_price} onChange={e => setItems(arr => arr.map((x,j) => j===i ? { ...x, unit_price: Number(e.target.value) } : x))} className="w-20 rounded-md border border-border bg-surface px-2 py-1" />
                    <button type="button" onClick={() => setItems(arr => arr.filter((_,j) => j!==i))} className="text-destructive"><X className="h-3 w-3" /></button>
                  </div>
                );
              })}
              <p className="text-right text-xs text-muted-foreground">Subtotal: <span className="font-semibold text-foreground">৳{subtotal.toLocaleString()}</span></p>
            </div>
          )}
        </div>

        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm">Cancel</button>
          <button disabled={busy || items.length===0} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">{busy ? "Creating…" : "Create order"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, required, className = "" }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; className?: string }) {
  return (
    <label className={`text-xs ${className}`}>
      {label}{required && " *"}
      <input required={required} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
    </label>
  );
}

// ============== COUPONS ==============
function CouponsTab() {
  const list = useServerFn(listCoupons);
  const upsert = useServerFn(upsertCoupon);
  const del = useServerFn(deleteCoupon);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "coupons"], queryFn: () => list() });
  const [open, setOpen] = useState<any | null>(null);
  const mut = useMutation({ mutationFn: (p: any) => upsert({ data: p }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "coupons"] }); setOpen(null); } });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div><h2 className="font-display text-xl font-bold">Coupons</h2><p className="text-xs text-muted-foreground">Percentage or fixed-amount with limits and date ranges.</p></div>
        <button onClick={() => setOpen({})} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow"><Plus className="h-4 w-4" /> New coupon</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr><th className="px-3 py-2">Code</th><th>Type</th><th>Value</th><th>Min</th><th>Used</th><th>Expires</th><th>Active</th><th></th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs font-semibold">{c.code}</td>
                <td className="text-xs">{c.type}</td>
                <td className="text-xs">{c.type === "percentage" ? `${c.value}%` : `৳${c.value}`}</td>
                <td className="text-xs">৳{c.min_order_amount}</td>
                <td className="text-xs">{c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ""}</td>
                <td className="text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                <td className="text-xs">{c.is_active ? "✓" : "—"}</td>
                <td className="space-x-1">
                  <button onClick={() => setOpen(c)} className="rounded-md p-1.5 hover:bg-surface-2"><Edit3 className="h-3.5 w-3.5" /></button>
                  <button onClick={async () => { if (confirm("Delete coupon?")) { await del({ data: { id: c.id } }); qc.invalidateQueries({ queryKey: ["admin", "coupons"] }); } }} className="rounded-md p-1.5 hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <CouponEditor coupon={open} onClose={() => setOpen(null)} onSave={(p: any) => mut.mutate(p)} saving={mut.isPending} />}
    </div>
  );
}

function CouponEditor({ coupon, onClose, onSave, saving }: any) {
  const [c, setC] = useState<any>({
    id: coupon.id, code: coupon.code ?? "", type: coupon.type ?? "percentage", value: coupon.value ?? 10,
    min_order_amount: coupon.min_order_amount ?? 0, max_discount: coupon.max_discount ?? null,
    usage_limit: coupon.usage_limit ?? null, per_user_limit: coupon.per_user_limit ?? null,
    starts_at: coupon.starts_at?.slice(0,10) ?? "", expires_at: coupon.expires_at?.slice(0,10) ?? "",
    is_active: coupon.is_active ?? true,
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="font-display text-xl font-bold">{coupon.id ? "Edit" : "New"} coupon</h3><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Code" required value={c.code} onChange={v => setC({ ...c, code: v.toUpperCase() })} />
          <label className="text-xs">Type
            <select value={c.type} onChange={e => setC({ ...c, type: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="percentage" className="bg-background">Percentage</option><option value="fixed" className="bg-background">Fixed amount</option>
            </select>
          </label>
          <label className="text-xs">Value
            <input type="number" value={c.value} onChange={e => setC({ ...c, value: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">Min order amount (৳)
            <input type="number" value={c.min_order_amount} onChange={e => setC({ ...c, min_order_amount: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">Max discount (৳, optional)
            <input type="number" value={c.max_discount ?? ""} onChange={e => setC({ ...c, max_discount: e.target.value ? Number(e.target.value) : null })} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">Usage limit (optional)
            <input type="number" value={c.usage_limit ?? ""} onChange={e => setC({ ...c, usage_limit: e.target.value ? Number(e.target.value) : null })} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">Starts at
            <input type="date" value={c.starts_at} onChange={e => setC({ ...c, starts_at: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">Expires at
            <input type="date" value={c.expires_at} onChange={e => setC({ ...c, expires_at: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="inline-flex items-center gap-2 text-xs sm:col-span-2"><input type="checkbox" checked={c.is_active} onChange={e => setC({ ...c, is_active: e.target.checked })} /> Active</label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={() => onSave({
            ...c,
            starts_at: c.starts_at || null,
            expires_at: c.expires_at || null,
          })} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

// ============== SETTINGS (fraud + recovery analytics) ==============
function SettingsTab() {
  const getF = useServerFn(getFraudSettingsFn);
  const setF = useServerFn(updateFraudSettings);
  const testF = useServerFn(testBdCourierConnection);
  const recAn = useServerFn(getRecoveryAnalytics);
  const phoneFraud = useServerFn(checkPhoneFraud);
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["admin", "fraud-settings"], queryFn: () => getF() });
  const { data: rec } = useQuery({ queryKey: ["admin", "recovery"], queryFn: () => recAn() });
  const [s, setS] = useState<any>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneResult, setPhoneResult] = useState<any>(null);

  useEffect(() => { if (settings && !s) setS(settings); }, [settings]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Fraud check (BD Courier)</h2>
        {!s ? <p className="mt-3 text-muted-foreground">Loading…</p> : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s.enabled} onChange={e => setS({ ...s, enabled: e.target.checked })} /> Enabled</label>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s.autoCheckOnNewOrder} onChange={e => setS({ ...s, autoCheckOnNewOrder: e.target.checked })} /> Auto-check on new order</label>
            <label className="text-xs">High risk if success-rate below
              <input type="number" value={s.highRiskBelow ?? 50} onChange={e => setS({ ...s, highRiskBelow: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
            </label>
            <label className="text-xs">Medium risk if success-rate below
              <input type="number" value={s.mediumRiskBelow ?? 75} onChange={e => setS({ ...s, mediumRiskBelow: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <button onClick={async () => { const r = await setF({ data: s }); if (r.ok) { setTestStatus("Saved"); qc.invalidateQueries({ queryKey: ["admin", "fraud-settings"] }); } }} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">Save settings</button>
              <button onClick={async () => { const r = await testF(); setTestStatus(r.ok ? `OK (HTTP ${r.status})` : `Failed (HTTP ${r.status})`); }} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm">Test connection</button>
              {testStatus && <span className="self-center text-xs text-muted-foreground">{testStatus}</span>}
            </div>
          </div>
        )}
        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Spot-check a phone</h3>
          <div className="mt-2 flex gap-2">
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
            <button onClick={async () => { const r = await phoneFraud({ data: { phone, force: true } }); setPhoneResult(r.ok ? r.result : { error: r.error }); }} className="rounded-lg bg-primary/15 px-4 py-2 text-sm font-semibold text-primary">Check</button>
          </div>
          {phoneResult && (
            <div className="mt-3 rounded-lg border border-border bg-surface p-3 text-xs">
              {phoneResult.error ? <span className="text-destructive">{phoneResult.error}</span> : (
                <div className="grid grid-cols-4 gap-2">
                  <div>Total: <b>{phoneResult.total_orders}</b></div>
                  <div>Success: <b className="text-success">{phoneResult.success_orders}</b></div>
                  <div>Cancelled: <b className="text-destructive">{phoneResult.cancelled_orders}</b></div>
                  <div>Rate: <b>{phoneResult.success_rate}%</b></div>
                  <div className="col-span-4"><FraudBadge score={phoneResult.success_rate} level={phoneResult.risk_level} /></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Recovery analytics (30d)</h2>
        {!rec ? <p className="mt-3 text-muted-foreground">Loading…</p> : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <StatCard label="Incomplete" value={String(rec.stats.total)} />
              <StatCard label="Converted" value={String(rec.stats.converted)} accent />
              <StatCard label="Conversion" value={`${rec.stats.conversionRate}%`} />
              <StatCard label="Recovered ৳" value={`৳${rec.stats.recoveredRevenue.toLocaleString()}`} />
            </div>
            <div className="mt-6">
              <h3 className="text-sm font-semibold">Funnel</h3>
              <div className="mt-2 space-y-2">
                {rec.funnel.map((f: any) => {
                  const pct = rec.funnel[0].value ? Math.round((f.value / rec.funnel[0].value) * 100) : 0;
                  return (
                    <div key={f.label}>
                      <div className="flex justify-between text-xs"><span>{f.label}</span><span className="text-muted-foreground">{f.value} ({pct}%)</span></div>
                      <div className="mt-1 h-2 rounded-full bg-surface"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-sm font-semibold">Conversions per day</h3>
              <div className="mt-2 flex h-32 items-end gap-1">
                {rec.series.map((d: any) => {
                  const max = Math.max(1, ...rec.series.map((x: any) => x.total));
                  return (
                    <div key={d.date} className="flex-1 group relative">
                      <div className="rounded-t bg-primary/30" style={{ height: `${(d.total/max)*100}%`, minHeight: 2 }} />
                      <div className="rounded-t bg-primary -mt-0.5" style={{ height: `${(d.converted/max)*100}%`, minHeight: 0 }} />
                      <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-surface-2 px-2 py-0.5 text-[10px] opacity-0 group-hover:opacity-100">{d.date}: {d.converted}/{d.total} · ৳{d.revenue.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-primary" /> converted</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-primary/30" /> total</span></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
