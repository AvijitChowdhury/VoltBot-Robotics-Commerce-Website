import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ProductCard } from "@/components/site/ProductCard";
import { getProductDetail } from "@/lib/storefront.functions";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Star, ShoppingCart, Truck, ShieldCheck, RotateCcw, Minus, Plus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const detailOpts = (slug: string) => queryOptions({
  queryKey: ["product", slug],
  queryFn: () => getProductDetail({ data: { slug } }),
});

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(detailOpts(params.slug));
    if (!d.product) throw notFound();
    return d;
  },
  head: ({ loaderData, params }) => {
    const p = loaderData?.product;
    const url = `https://roboticsavijit.lovable.app/product/${params.slug}`;
    const desc = p?.description?.slice(0, 160) ?? "VoltBot product";
    const title = `${p?.name ?? "Product"} — VoltBot`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(p?.image_url ? [
          { property: "og:image", content: p.image_url },
          { name: "twitter:image", content: p.image_url },
        ] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: p ? [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          image: p.image_url ? [p.image_url] : undefined,
          description: p.description ?? undefined,
          sku: p.id,
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: "BDT",
            price: Number(p.price),
            availability: p.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
          ...(p.rating && p.reviews_count ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: p.rating,
              reviewCount: p.reviews_count,
            },
          } : {}),
        }),
      }] : [],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background"><Header /><div className="p-16 text-center"><h1 className="font-display text-3xl">Product not found</h1><Link to="/products" className="text-primary mt-4 inline-block">Browse all products</Link></div><Footer /></div>
  ),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(detailOpts(slug));
  const product = data.product!;
  const allImages = [product.image_url, ...data.images.map((i) => i.url)].filter(Boolean) as string[];
  const [activeImg, setActiveImg] = useState(allImages[0] ?? "");
  const [qty, setQty] = useState(1);
  const cart = useCart();
  const navigate = useNavigate();

  const specs = (product.specs ?? {}) as Record<string, string>;
  const discount = product.compare_at_price && Number(product.compare_at_price) > Number(product.price)
    ? Math.round(((Number(product.compare_at_price) - Number(product.price)) / Number(product.compare_at_price)) * 100) : 0;

  function addToCart(goCheckout = false) {
    cart.add({
      product_id: product.id, name: product.name, slug: product.slug,
      price: Number(product.price), image_url: product.image_url, stock: product.stock,
    }, qty);
    if (goCheckout) navigate({ to: "/checkout" });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <nav className="text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Home</Link> / <Link to="/products" className="hover:text-foreground">Products</Link> / <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-surface">
              {activeImg ? <img src={activeImg} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>}
            </div>
            {allImages.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {allImages.map((u, i) => (
                  <button key={i} onClick={() => setActiveImg(u)} className={`aspect-square overflow-hidden rounded-lg border ${activeImg === u ? "border-primary" : "border-border"}`}>
                    <img src={u} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-primary">{(product as any).categories?.name ?? "Components"}</span>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{product.name}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(product.rating) ? "fill-warning text-warning" : "text-muted-foreground"}`} />)}
              </div>
              <span className="text-muted-foreground">{product.rating.toFixed(1)} · {product.reviews_count} reviews</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="font-mono text-xs text-muted-foreground">SKU: {product.sku}</span>
            </div>

            <div className="mt-6 flex items-end gap-3">
              <span className="font-display text-4xl font-bold text-primary">৳{Number(product.price).toLocaleString()}</span>
              {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                <>
                  <span className="text-lg text-muted-foreground line-through">৳{Number(product.compare_at_price).toLocaleString()}</span>
                  <span className="rounded-md bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">-{discount}%</span>
                </>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {product.stock > 0 ? <span className="text-success">● In stock ({product.stock} left)</span> : <span className="text-destructive">● Out of stock</span>}
            </p>

            <p className="mt-6 text-foreground/80 leading-relaxed">{product.description}</p>

            <div className="mt-6 flex items-center gap-3">
              <div className="inline-flex items-center rounded-lg border border-border bg-surface">
                <button aria-label="Decrease quantity" onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2.5 hover:text-primary"><Minus className="h-4 w-4" /></button>
                <span className="w-10 text-center text-sm font-semibold">{qty}</span>
                <button aria-label="Increase quantity" onClick={() => setQty(Math.min(product.stock, qty + 1))} className="px-3 py-2.5 hover:text-primary"><Plus className="h-4 w-4" /></button>
              </div>
              <button onClick={() => addToCart(false)} disabled={product.stock === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50">
                <ShoppingCart className="h-4 w-4" /> Add to cart
              </button>
              <button onClick={() => addToCart(true)} disabled={product.stock === 0}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:brightness-110 disabled:opacity-50">
                Buy now
              </button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-border bg-surface p-3"><Truck className="h-4 w-4 text-primary mb-1" />Fast delivery</div>
              <div className="rounded-lg border border-border bg-surface p-3"><ShieldCheck className="h-4 w-4 text-primary mb-1" />Authentic parts</div>
              <div className="rounded-lg border border-border bg-surface p-3"><RotateCcw className="h-4 w-4 text-primary mb-1" />7-day returns</div>
            </div>
          </div>
        </div>

        {Object.keys(specs).length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-bold">Specifications</h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(specs).map(([k, v], i) => (
                    <tr key={k} className={i % 2 ? "bg-surface/40" : ""}>
                      <td className="px-4 py-3 font-medium text-muted-foreground w-1/3 capitalize">{k.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold">Reviews ({data.reviews.length})</h2>
          {data.reviews.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {data.reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    {r.customer_avatar ? <img src={r.customer_avatar} alt="" className="h-8 w-8 rounded-full object-cover" /> : <div className="h-8 w-8 rounded-full bg-primary/20" />}
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{r.customer_name}</div>
                      <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />)}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-foreground/80">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {data.related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-bold">Related products</h2>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {data.related.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
