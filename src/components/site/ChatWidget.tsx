import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle, X, Send } from "lucide-react";

type Msg = { id: string; session_id: string; sender: string; message: string; created_at: string };

const SESSION_KEY = "voltbot.chat.session";

export function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [guestName, setGuestName] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore existing session
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
    if (stored) setSessionId(stored);
    else if (!user) setNeedsName(true);
  }, [user]);

  // Load messages + subscribe
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    supabase.from("chat_messages").select("*").eq("session_id", sessionId).order("created_at").then(({ data }) => {
      if (active && data) setMessages(data as Msg[]);
    });
    const ch = supabase.channel(`chat:${sessionId}`).on("postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` },
      (p) => setMessages((prev) => [...prev, p.new as Msg])).subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  async function startSession(name: string) {
    const { data, error } = await supabase.from("chat_sessions").insert({
      user_id: user?.id ?? null,
      guest_name: user ? null : name,
      guest_email: user?.email ?? null,
      is_open: true,
    } as any).select("id").single();
    if (error || !data) return;
    localStorage.setItem(SESSION_KEY, data.id);
    setSessionId(data.id);
    setNeedsName(false);
  }

  async function send() {
    if (!text.trim() || !sessionId) return;
    const msg = text.trim();
    setText("");
    await supabase.from("chat_messages").insert({ session_id: sessionId, sender: "user", message: msg });
    await supabase.from("chat_sessions").update({ last_message_at: new Date().toISOString(), unread_admin: (messages.filter(m => m.sender === "user").length) + 1 }).eq("id", sessionId);
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Live chat"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow hover:brightness-110 transition-all"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[480px] w-[340px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse" />
            <div className="flex-1">
              <div className="font-display font-semibold text-sm">VoltBot Support</div>
              <div className="text-[10px] text-muted-foreground">We typically reply in minutes</div>
            </div>
          </div>

          {needsName && !sessionId ? (
            <div className="flex-1 p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground mb-3">Hi! What's your name?</p>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Your name"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
              <button
                disabled={!guestName.trim()}
                onClick={() => startSession(guestName.trim())}
                className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
              >
                Start chat
              </button>
            </div>
          ) : !sessionId ? (
            <div className="flex-1 p-4 flex flex-col justify-center text-center">
              <p className="text-sm text-muted-foreground mb-3">Start a conversation with our team</p>
              <button onClick={() => startSession(user?.email ?? "User")} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
                Start chat
              </button>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground mt-8">Say hi to get started 👋</div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender === "user" ? "bg-primary text-primary-foreground" : "bg-surface text-foreground"}`}>
                      {m.message}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-border p-3">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
                <button type="submit" aria-label="Send" className="rounded-lg bg-primary px-3 py-2 text-primary-foreground shadow-glow disabled:opacity-60" disabled={!text.trim()}>
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
