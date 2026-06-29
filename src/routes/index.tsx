import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Shield, Truck, Headphones, BadgeCheck, ChevronLeft, ChevronRight,
  Check, X, Star, Zap, RotateCw, Award,
} from "lucide-react";

import { getHomepageData } from "@/lib/storefront.functions";
import { Header } from "@/components/site/Header";
import { AnnouncementTicker } from "@/components/site/AnnouncementTicker";
import { Hero } from "@/components/site/Hero";
import { ProductCard } from "@/components/site/ProductCard";
import { Footer } from "@/components/site/Footer";
import promoEsp from "@/assets/promo-esp32.jpg";
import promoArm from "@/assets/promo-arm.jpg";

const homeQuery = queryOptions({
  queryKey: ["homepage"],
  queryFn: () => getHomepageData(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VoltBot — Electronics & Robotics Store in Bangladesh" },
      { name: "description", content: "Shop Arduino, ESP32, sensors, drones, robotic arms, 3D printers and more. Fast delivery, genuine parts, 7-day money-back." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: HomePage,
});

function HomePage() {
  const { data } = useSuspenseQuery(homeQuery);
  const heroBanners = data.banners.filter((b) => b.position === "hero");
  const promoBanners = data.banners.filter((b) => b.position === "promo");

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementTicker items={data.announcements} />
      <Header />
      <main>
        <Hero banners={heroBanners} />
        <CategorySlider categories={data.categories} />
        <FeaturedProducts products={data.featured} />
        <PromoBanners promos={promoBanners} />
        <AllProducts products={data.all} />
        <ReviewsCarousel reviews={data.reviews} />
        <ComparisonSection />
        <KeyPointsCards />
        <MoneyBackBanner />
      </main>
      <Footer />
    </div>
  );
}

/* ============ Sections ============ */

function SectionHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <span className="mb-2 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
            <span className="h-px w-6 bg-primary" /> {eyebrow}
          </span>
        )}
        <h2 className="font-display text-2xl font-bold sm:text-3xl lg:text-4xl">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function CategorySlider({ categories }: { categories: { id: string; name: string; slug: string; description: string | null }[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <SectionHeader
        eyebrow="Browse by category"
        title="Find your component"
        subtitle="From hobbyist boards to industrial robotics — everything in one place."
        action={
          <Link to="/products" className="hidden md:inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        }
      />
      <div className="flex gap-4 overflow-x-auto pb-3 [scrollbar-width:thin] snap-x">
        {categories.map((c, i) => (
          <Link
            key={c.id}
            to="/products"
            className="group relative flex min-w-[200px] flex-col overflow-hidden rounded-xl border border-border bg-card p-5 card-hover snap-start"
          >
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${i % 2 === 0 ? "bg-primary/10 text-primary ring-primary/30" : "bg-accent/10 text-accent ring-accent/30"}`}>
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">{c.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Explore <ChevronRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FeaturedProducts({ products }: { products: any[] }) {
  return (
    <section className="relative border-y border-border/60 bg-surface/30">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <SectionHeader
          eyebrow="Bestsellers"
          title="Featured products"
          subtitle="Hand-picked by our engineers — these fly off the shelves."
          action={
            <Link to="/products" className="hidden md:inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>
    </section>
  );
}

function PromoBanners({ promos }: { promos: { id: string; title: string; subtitle: string | null; cta_text: string | null; cta_link: string | null }[] }) {
  const imgs = [promoEsp, promoArm];
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <div className="grid gap-5 md:grid-cols-2">
        {promos.slice(0, 2).map((p, i) => (
          <Link
            key={p.id}
            to={p.cta_link ?? "/products"}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card min-h-[260px] card-hover"
          >
            <img src={imgs[i]} alt={p.title} width={1024} height={640} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/10" />
            <div className="relative flex h-full flex-col justify-center gap-3 p-7 md:p-9">
              <h3 className="font-display text-xl font-bold sm:text-2xl">{p.title}</h3>
              <p className="max-w-xs text-sm text-muted-foreground">{p.subtitle}</p>
              <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
                {p.cta_text ?? "Shop"} <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AllProducts({ products }: { products: any[] }) {
  const [visible, setVisible] = useState(8);
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <SectionHeader eyebrow="All products" title="Fresh from the lab" subtitle="The latest gear added to VoltBot's catalog." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.slice(0, visible).map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {visible < products.length && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => setVisible((v) => v + 4)}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-6 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-glow"
          >
            <RotateCw className="h-4 w-4" /> Load more
          </button>
        </div>
      )}
    </section>
  );
}

function ReviewsCarousel({ reviews }: { reviews: { id: string; customer_name: string; rating: number; comment: string }[] }) {
  const [i, setI] = useState(0);
  const total = reviews.length;
  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(() => setI((p) => (p + 1) % total), 5500);
    return () => clearInterval(id);
  }, [total]);
  if (!total) return null;

  return (
    <section className="relative border-y border-border/60 bg-surface/30">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <SectionHeader eyebrow="Loved by makers" title="What our customers say" />
        <div className="relative">
          <div className="overflow-hidden">
            <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${i * 100}%)` }}>
              {reviews.map((r) => (
                <div key={r.id} className="w-full flex-shrink-0 px-2">
                  <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 text-center neon-border">
                    <div className="mb-3 flex justify-center gap-1">
                      {Array.from({ length: 5 }).map((_, k) => (
                        <Star key={k} className={`h-5 w-5 ${k < r.rating ? "fill-warning text-warning" : "text-muted"}`} />
                      ))}
                    </div>
                    <p className="font-display text-lg italic text-foreground sm:text-xl">"{r.comment}"</p>
                    <p className="mt-5 text-sm font-semibold text-primary">— {r.customer_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => setI((p) => (p - 1 + total) % total)} aria-label="Prev" className="absolute -left-2 top-1/2 -translate-y-1/2 hidden md:inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setI((p) => (p + 1) % total)} aria-label="Next" className="absolute -right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="mt-6 flex justify-center gap-2">
            {reviews.map((_, idx) => (
              <button key={idx} onClick={() => setI(idx)} aria-label={`Review ${idx+1}`} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-primary" : "w-3 bg-border"}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  const rows = [
    { label: "Genuine, tested components", us: true, them: false },
    { label: "Same-day Dhaka delivery", us: true, them: false },
    { label: "Live engineer chat support", us: true, them: false },
    { label: "7-day money-back guarantee", us: true, them: false },
    { label: "Cash on delivery accepted", us: true, them: true },
    { label: "Bulk & student discounts", us: true, them: false },
    { label: "Project documentation links", us: true, them: false },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
      <SectionHeader eyebrow="Why VoltBot" title="Others vs Us" subtitle="See what makes VoltBot the obvious choice for makers and engineers." />
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-3 border-b border-border bg-surface/60 p-4 text-sm font-semibold">
          <span className="text-muted-foreground">Feature</span>
          <span className="text-center text-muted-foreground">Others</span>
          <span className="text-center text-primary">VoltBot</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} className={`grid grid-cols-3 items-center p-4 text-sm ${i % 2 === 0 ? "bg-surface/20" : ""}`}>
            <span className="text-foreground">{r.label}</span>
            <span className="flex justify-center">
              {r.them ? <Check className="h-5 w-5 text-muted-foreground" /> : <X className="h-5 w-5 text-destructive/70" />}
            </span>
            <span className="flex justify-center">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
                <Check className="h-4 w-4" />
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function KeyPointsCards() {
  const items = [
    { icon: BadgeCheck, title: "100% Genuine Parts", text: "Every component sourced from authorized distributors." },
    { icon: Truck, title: "Fast Delivery", text: "Same-day in Dhaka, 2–4 days nationwide." },
    { icon: Headphones, title: "Engineer Support", text: "Real engineers on live chat, not bots." },
    { icon: Award, title: "Maker Community", text: "Project files, tutorials & build inspiration." },
  ];
  return (
    <section className="relative border-y border-border/60 bg-surface/30">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <SectionHeader eyebrow="Why buy from us" title="Trust built into every order" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, text }, i) => (
            <div key={i} className="group rounded-2xl border border-border bg-card p-6 card-hover">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30 transition-all group-hover:shadow-glow">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MoneyBackBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 sm:p-14 neon-border">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr_auto]">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
            <Shield className="h-10 w-10" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold sm:text-3xl">7-Day Money-Back Guarantee</h3>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Not happy with your component? Send it back within 7 days — no questions asked, full refund.
            </p>
          </div>
          <Link to="/products" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:translate-y-[-1px]">
            Start shopping
          </Link>
        </div>
      </div>
    </section>
  );
}
