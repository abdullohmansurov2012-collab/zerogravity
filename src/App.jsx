import { useState, useRef, useEffect } from "react";
import './index.css';

const C = {
  bg: "#0a0a0a", surface: "#1a1a1a",
  border: "#2a2a2a", accent: "#8b5cf6", accentLight: "#a78bfa",
  text: "#fafafa", muted: "#888",
  green: "#34d399", blue: "#60a5fa", pink: "#f472b6",
};

const SYSTEM = `Siz AbdGPT — foydalanuvchilar uchun eng iliq, do'stona va aqlli AI yordamchisiz.
Har qanday savolga O'zbek tilida, iliq va samimiy javob bering.
Ko'ngilni ko'taradigan, motivatsiya beradigan gaplar bilan gapiring.
Ismingiz: AbdGPT.`;

// OPENROUTER API KALITINI SHU YERGA QO'YING
const API_KEY = "OPENROUTER_API_KEY_SHU_YERGA";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (customMsg = null) => {
    const msg = customMsg || input.trim();
    if (!msg || loading) return;
    if (!customMsg) setInput("");
    setLoading(true);

    const newMsgs = [...messages, { role: "user", content: msg }];
    setMessages(newMsgs);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.1-8b-instruct:free", // Tekin model!
          messages: [{ role: "system", content: SYSTEM }, ...newMsgs]
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "Xatolik");
      const reply = data.choices[0].message.content;
      setMessages([...newMsgs, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages([...newMsgs, { role: "assistant", content: `Xatolik: ${err.message}` }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg }}>
      <header style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 24, fontWeight: 900, background: `linear-gradient(135deg, ${C.accent}, ${C.pink}, ${C.blue})`, backgroundSize: "200% 200%", animation: "gradient 4s ease infinite", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AbdGPT</div>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "30px 0" }}>
        <div style={{ maxWidth: 750, margin: "0 auto", padding: "0 20px" }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", marginTop: 100 }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: "white", marginBottom: 20 }}>Salom! ✨</div>
              <div style={{ color: C.muted, fontSize: 18 }}>Men AbdGPT — sizning AI do'stingizman.</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className="fade-in" style={{ marginBottom: 25 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800,
                  background: m.role === "user" ? C.surface : `linear-gradient(135deg, ${C.accent}, ${C.pink})`,
                  color: "white" }}>{m.role === "user" ? "👤" : "A"}</div>
                <div style={{ flex: 1, lineHeight: 1.7, color: C.text, fontSize: 15, whiteSpace: "pre-wrap" }}>{m.content}</div>
              </div>
            </div>
          ))}
          {loading && <div style={{ color: C.muted, fontSize: 14 }}>AbdGPT o'ylamoqda...</div>}
          <div ref={chatEndRef} />
        </div>
      </div>

      <div style={{ padding: "20px 20px 40px", maxWidth: 750, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", background: C.surface, padding: "8px", borderRadius: 16, border: `1px solid ${C.border}` }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Xabar yozing..." rows={1}
            style={{ flex: 1, padding: "12px 14px", background: "transparent", border: "none", color: C.text, fontSize: 15, outline: "none", resize: "none", minHeight: 46 }}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            style={{ width: 46, height: 46, borderRadius: 12, border: "none", cursor: "pointer", background: C.accent, color: "white", fontWeight: 900, transition: "0.2s" }}>↑</button>
        </div>
      </div>
    </div>
  );
}
