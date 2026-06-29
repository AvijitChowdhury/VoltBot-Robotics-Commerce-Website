import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingCart, User, Menu, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Shop" },
  { to: "/products", label: "Categories" },
  { to: "/products", label: "Deals" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { count } = useCart();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-all ${
        scrolled
          ? "border-border/60 bg-background/80 backdrop-blur-xl"
          : "border-transparent bg-background/40 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/40">
            <Zap className="h-5 w-5" />
            <span className="absolute inset-0 rounded-lg shadow-glow-soft pointer-events-none" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">
            Volt<span className="text-primary">Bot</span>
          </span>
        </Link>

        <nav className="ml-6 hidden lg:flex items-center gap-1">
          {navLinks.map((l, i) => (
            <Link
              key={i}
              to={l.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex flex-1 items-center justify-end gap-2 lg:flex-none lg:gap-3">
          <div className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 py-2 w-72">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search Arduino, ESP32, sensors…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </div>
          <Link to="/account" aria-label="Account" className="rounded-md p-2 text-muted-foreground hover:bg-surface hover:text-foreground transition-colors">
            <User className="h-5 w-5" />
          </Link>
          <Link to="/cart" aria-label="Cart" className="relative rounded-md p-2 text-muted-foreground hover:bg-surface hover:text-foreground transition-colors">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">0</span>
          </Link>
          <button aria-label="Menu" className="lg:hidden rounded-md p-2 text-muted-foreground hover:bg-surface hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
