import { Megaphone } from "lucide-react";

export function AnnouncementTicker({ items }: { items: { id: string; message: string }[] }) {
  if (!items.length) return null;
  const loop = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-b border-border/60 bg-surface/60 text-foreground/90">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <div className="flex items-center gap-3 py-2">
        <span className="ml-4 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/30 flex-shrink-0">
          <Megaphone className="h-3 w-3" /> News
        </span>
        <div className="marquee whitespace-nowrap text-sm">
          {loop.map((a, i) => (
            <span key={`${a.id}-${i}`} className="mx-8 inline-flex items-center gap-2">
              {a.message}
              <span className="text-primary/50">●</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
