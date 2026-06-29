import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "All Products — VoltBot" },
      { name: "description", content: "Browse the full VoltBot catalog of electronics and robotics components." },
    ],
  }),
  component: ProductsPlaceholder,
});

function ProductsPlaceholder() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center lg:px-8">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">Coming in Phase 2</span>
        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Product listing</h1>
        <p className="mt-4 text-muted-foreground">
          Filters by category, price and rating, sorting, and pagination are landing next.
        </p>
        <Link to="/" className="mt-8 inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
          Back to homepage
        </Link>
      </main>
      <Footer />
    </div>
  );
}
