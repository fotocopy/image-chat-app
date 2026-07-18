"use client";

import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; text: string; images?: string[] };

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, text: m.text }))
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages([...next, { role: "assistant", text: data.error || "Something went wrong." }]);
      } else {
        setMessages([...next, { role: "assistant", text: data.text || "", images: data.images || [] }]);
      }
    } catch {
      setMessages([...next, { role: "assistant", text: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="wrap">
      <header>
        <h1>Image Chat</h1>
        <a href="/api/login?logout=1">Log out</a>
      </header>

      <div className="messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="hint">
            Ask anything. To make a picture, say something like &quot;generate an image of a red fox in snow&quot;.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">
              {m.text}
              {m.images?.map((src, j) => (
                <div key={j}>
                  <img src={src} alt="generated" />
                  <a className="dl" href={src} target="_blank" rel="noreferrer">Open full size</a>
                </div>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="msg assistant">
            <div className="bubble">Thinking...</div>
          </div>
        )}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          rows={2}
          value={input}
          placeholder="Type a message..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
