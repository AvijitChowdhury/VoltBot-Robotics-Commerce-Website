import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartLine = {
  product_id: string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  image_url: string | null;
  stock: number;
};

type CartCtx = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  setQty: (product_id: string, qty: number) => void;
  remove: (product_id: string) => void;
  clear: () => void;
  sessionId: string;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "voltbot.cart.v1";
const SESS_KEY = "voltbot.session.v1";

function getSessionId() {
  if (typeof window === "undefined") return "";
  let s = window.localStorage.getItem(SESS_KEY);
  if (!s) {
    s = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.localStorage.setItem(SESS_KEY, s);
  }
  return s;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    setSessionId(getSessionId());
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines]);

  const add: CartCtx["add"] = (line, qty = 1) => {
    setLines((prev) => {
      const i = prev.findIndex((p) => p.product_id === line.product_id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: Math.min(line.stock, next[i].quantity + qty) };
        return next;
      }
      return [...prev, { ...line, quantity: Math.min(line.stock, qty) }];
    });
  };
  const setQty: CartCtx["setQty"] = (id, qty) => {
    setLines((prev) => prev.map((l) => l.product_id === id ? { ...l, quantity: Math.max(1, Math.min(l.stock, qty)) } : l));
  };
  const remove: CartCtx["remove"] = (id) => setLines((prev) => prev.filter((l) => l.product_id !== id));
  const clear = () => setLines([]);

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  return <Ctx.Provider value={{ lines, count, subtotal, add, setQty, remove, clear, sessionId }}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used within CartProvider");
  return v;
}
