import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useCart } from "@/contexts/CartContext";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Cart — VoltBot" },
      { name: "description", content: "Review the items in your VoltBot cart before checkout." },
      { property: "og:title", content: "Cart — VoltBot" },
      { property: "og:description", content: "Review the items in your VoltBot cart." },
      { property: "og:url", content: "https://roboticsavijit.lovable.app/cart" },
    ],
    links: [{ rel: "canonical", href: "https://roboticsavijit.lovable.app/cart" }],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, subtotal, setQty, remove, count } = useCart();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Your cart</h1>
        <p className="text-sm text-muted-foreground mt-1">{count} item{count === 1 ? "" : "s"}</p>

        {lines.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-16 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Your cart is empty.</p>
            <Link to="/products" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
              Start shopping <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {lines.map((l) => (
                <div key={l.product_id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                  <Link to="/product/$slug" params={{ slug: l.slug }} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    {l.image_url && <img src={l.image_url} alt={l.name} className="h-full w-full object-cover" />}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to="/product/$slug" params={{ slug: l.slug }} className="text-sm font-semibold hover:text-primary line-clamp-2">{l.name}</Link>
                    <div className="mt-1 font-display text-lg font-bold text-primary">৳{l.price.toLocaleString()}</div>
                  </div>
                  <div className="inline-flex items-center rounded-lg border border-border bg-surface">
                    <button aria-label="Decrease quantity" onClick={() => setQty(l.product_id, l.quantity - 1)} className="px-2.5 py-2 hover:text-primary"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-8 text-center text-sm font-semibold">{l.quantity}</span>
                    <button aria-label="Increase quantity" onClick={() => setQty(l.product_id, l.quantity + 1)} className="px-2.5 py-2 hover:text-primary"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="w-24 text-right font-display text-lg font-bold">৳{(l.price * l.quantity).toLocaleString()}</div>
                  <button onClick={() => remove(l.product_id)} aria-label="Remove" className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <aside className="rounded-2xl border border-border bg-card p-6 h-fit sticky top-24">
              <h2 className="font-display text-xl font-bold">Order summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-semibold">৳{subtotal.toLocaleString()}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd className="text-muted-foreground">Calculated at checkout</dd></div>
              </dl>
              <div className="mt-4 flex justify-between border-t border-border pt-4">
                <span className="font-display text-lg font-bold">Total</span>
                <span className="font-display text-2xl font-bold text-primary">৳{subtotal.toLocaleString()}</span>
              </div>
              <Link to="/checkout" className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:brightness-110">
                Proceed to checkout <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/products" className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground">Continue shopping</Link>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
