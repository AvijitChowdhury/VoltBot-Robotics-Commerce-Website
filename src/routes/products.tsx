import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ProductCard } from "@/components/site/ProductCard";
import { getProductsList } from "@/lib/storefront.functions";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Search, SlidersHorizontal } from "lucide-react";

const searchSchema = z.object({
  category: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  sort: z.enum(["newest", "oldest", "price-asc", "price-desc", "rating"]).catch("newest").default("newest"),
  minPrice: z.number().optional().catch(undefined),
  maxPrice: z.number().optional().catch(undefined),
  page: z.number().int().min(1).catch(1).default(1),
});

const listOpts = (deps: z.infer<typeof searchSchema>) =>
  queryOptions({
    queryKey: ["products", deps],
    queryFn: () => getProductsList({ data: { ...deps, pageSize: 12 } }),
  });

export const Route = createFileRoute("/products")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(listOpts(deps)),
  head: () => ({ meta: [{ title: "All Products — VoltBot" }, { name: "description", content: "Browse VoltBot's full catalog of electronics & robotics components." }] }),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  component: ProductsPage,
});

function ProductsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/products" });
  const { data } = useSuspenseQuery(listOpts(search));
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-primary">/ shop</span>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">All Products</h1>
            <p className="text-sm text-muted-foreground mt-1">{data.total} item{data.total === 1 ? "" : "s"}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                defaultValue={search.q ?? ""}
                onKeyDown={(e) => { if (e.key === "Enter") navigate({ search: (p: any) => ({ ...p, q: (e.target as HTMLInputElement).value || undefined, page: 1 }) }); }}
                placeholder="Search products…"
                className="bg-transparent text-sm outline-none w-56 placeholder:text-muted-foreground/70"
              />
            </div>
            <select
              value={search.sort}
              onChange={(e) => navigate({ search: (p: any) => ({ ...p, sort: e.target.value as any, page: 1 }) })}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top rated</option>
            </select>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Categories
              </div>
              <ul className="mt-3 space-y-1">
                <li>
                  <button onClick={() => navigate({ search: (p: any) => ({ ...p, category: undefined, page: 1 }) })}
                    className={`w-full text-left rounded-md px-3 py-2 text-sm ${!search.category ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}>
                    All categories
                  </button>
                </li>
                {data.categories.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => navigate({ search: (p: any) => ({ ...p, category: c.slug, page: 1 }) })}
                      className={`w-full text-left rounded-md px-3 py-2 text-sm ${search.category === c.slug ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}>
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Price (৳)</div>
              <div className="mt-3 flex gap-2">
                <input type="number" placeholder="Min" defaultValue={search.minPrice ?? ""}
                  onBlur={(e) => navigate({ search: (p: any) => ({ ...p, minPrice: e.target.value ? Number(e.target.value) : undefined, page: 1 }) })}
                  className="w-1/2 rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none" />
                <input type="number" placeholder="Max" defaultValue={search.maxPrice ?? ""}
                  onBlur={(e) => navigate({ search: (p: any) => ({ ...p, maxPrice: e.target.value ? Number(e.target.value) : undefined, page: 1 }) })}
                  className="w-1/2 rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none" />
              </div>
            </div>
          </aside>

          <section>
            {data.products.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">No products match your filters.</div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {data.products.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            )}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => navigate({ search: (p: any) => ({ ...p, page: n }) })}
                    className={`h-9 min-w-9 rounded-md px-3 text-sm font-medium ${n === search.page ? "bg-primary text-primary-foreground" : "border border-border bg-surface hover:bg-surface-2"}`}>
                    {n}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
