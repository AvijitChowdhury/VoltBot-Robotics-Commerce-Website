import { Link } from "@tanstack/react-router";
import { ArrowRight, Cpu, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import heroImg from "@/assets/hero-voltbot.jpg";

type Banner = { id: string; title: string; subtitle: string | null; cta_text: string | null; cta_link: string | null };

export function Hero({ banners }: { banners: Banner[] }) {
  const slides = banners.length ? banners : [{ id: "0", title: "Build the Future.", subtitle: "Premium electronics & robotics.", cta_text: "Shop", cta_link: "/products" }];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [slides.length]);
  const cur = slides[i];

  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute inset-0 radial-spotlight" />
      <img
        src={heroImg}
        alt="Robotic hand holding a glowing microchip on a circuit board"
        width={1920}
        height={1024}
        className="absolute inset-0 h-full w-full object-cover opacity-70 mix-blend-screen"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/10" />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 lg:grid-cols-2 lg:py-32 lg:px-8">
        <div className="flex flex-col justify-center">
          <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono uppercase tracking-widest text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-glow" /> VoltBot · BD
          </span>
          <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
            <span className="text-gradient">{cur.title}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            {cur.subtitle ?? "Premium components for makers, engineers, and dreamers."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={cur.cta_link ?? "/products"}
              className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:translate-y-[-1px] hover:bg-primary/90"
            >
              {cur.cta_text ?? "Shop now"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
            >
              Browse categories
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Fast nationwide delivery</div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> 7-day money-back</div>
            <div className="flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" /> Genuine components</div>
          </div>

          {slides.length > 1 && (
            <div className="mt-8 flex gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setI(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-primary" : "w-3 bg-border hover:bg-muted-foreground"}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
