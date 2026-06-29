import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My Account — VoltBot" }] }),
  component: AccountPlaceholder,
});

function AccountPlaceholder() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center lg:px-8">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">Coming in Phase 4</span>
        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">My account</h1>
        <p className="mt-4 text-muted-foreground">Order history & tracking, profile, address book and wishlist are coming in Phase 4.</p>
        <Link to="/" className="mt-8 inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow">Back home</Link>
      </main>
      <Footer />
    </div>
  );
}
