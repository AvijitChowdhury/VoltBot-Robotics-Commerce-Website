import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin, Zap } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-border/60 bg-surface/40">
      <div className="absolute inset-x-0 top-0 circuit-divider" />
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/40">
                <Zap className="h-5 w-5" />
              </span>
              <span className="font-display text-xl font-bold">Volt<span className="text-primary">Bot</span></span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Bangladesh's destination for premium electronics & robotics components. Genuine parts, fast delivery, real engineers on chat.
            </p>
            <div className="mt-5 flex gap-2">
              {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
                <a key={i} href="#" aria-label="social" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Shop" links={[
            { label: "All Products", to: "/products" },
            { label: "Arduino & MCU", to: "/products" },
            { label: "Sensors", to: "/products" },
            { label: "Robotic Arms", to: "/products" },
            { label: "3D Printing", to: "/products" },
          ]} />
          <FooterCol title="Support" links={[
            { label: "My Account", to: "/account" },
            { label: "Order Tracking", to: "/account" },
            { label: "Shipping & Returns", to: "/" },
            { label: "FAQ", to: "/" },
            { label: "Live Chat", to: "/" },
          ]} />
          <div>
            <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-foreground">Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-primary" /> Dhanmondi 27, Dhaka, Bangladesh</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> +880 1700-000000</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> hello@voltbot.bd</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} VoltBot. All rights reserved.</p>
          <p className="font-mono">Built for makers · Powered by curiosity</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h4>
      <ul className="space-y-2.5 text-sm">
        {links.map((l, i) => (
          <li key={i}>
            <Link to={l.to} className="text-muted-foreground transition-colors hover:text-primary">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
