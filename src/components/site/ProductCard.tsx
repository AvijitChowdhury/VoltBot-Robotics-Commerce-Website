import { Link } from "@tanstack/react-router";
import { Star, ShoppingCart } from "lucide-react";

export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  rating: number;
  reviews_count: number;
  stock: number;
};

export function ProductCard({ p }: { p: StoreProduct }) {
  const discount = p.compare_at_price && p.compare_at_price > p.price
    ? Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100)
    : 0;
  return (
    <Link
      to="/product/$slug"
      params={{ slug: p.slug }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card card-hover"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
        )}
        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-md bg-accent px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
            -{discount}%
          </span>
        )}
        {p.stock <= 5 && p.stock > 0 && (
          <span className="absolute right-3 top-3 rounded-md bg-warning/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-warning ring-1 ring-warning/30">
            Low stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          {p.name}
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-warning text-warning" />
          <span>{p.rating.toFixed(1)}</span>
          <span>·</span>
          <span>{p.reviews_count} reviews</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <div className="font-display text-lg font-bold text-primary">৳{Number(p.price).toLocaleString()}</div>
            {p.compare_at_price && p.compare_at_price > p.price && (
              <div className="text-xs text-muted-foreground line-through">৳{Number(p.compare_at_price).toLocaleString()}</div>
            )}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); }}
            aria-label="Add to cart"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-glow"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}
