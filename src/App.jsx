import { useState, useRef, useEffect, useCallback } from "react";
import './index.css';

const COLORS = {
  bg: "#05080f",
  panel: "#0d1220",
  surface: "#111827",
  border: "#1e2d45",
  accent: "#00d4ff",
  accentDim: "#0099bb",
  green: "#00ff9d",
  orange: "#ff6b2b",
  red: "#ff4757",
  purple: "#a855f7",
  text: "#e2e8f0",
  muted: "#64748b",
};

const SYSTEM_PROMPT = `Siz dunyodagi eng tajribali va tanqidiy fikrlovchi High-End Senior Developer va Security Expertisiz. 
Sizning vazifangiz ZeroGravity IDE ichida foydalanuvchi yuborgan kodni shafqatsizlarcha va o'ta chuqur tahlil qilish.

MAJBURIY QOIDALAR:
1. Har bir kiritilgan kodni qat'iy va chuqur "Chain of Thought" (Mulohaza zanjiri) orqali tahlil qilasiz.
2. <thought>...</thought> teglari ichida o'zbek tilida quyidagilarni tahlil qiling:
   - Koddagi mantiqiy xatolar va "Edge cases" (kutilmagan holatlar).
   - Performance (tezlik) va xotira (memory leak) muammolari.
   - Xavfsizlik bo'shliqlari (security vulnerabilities).
   - "Qattiqroq o'ylash": Shunchaki yuzaki emas, eng tubidagi muammolarni qidiring.
3. Tahlildan keyingina foydalanuvchiga aniq, pro-level tavsiyalar va optimallashtirilgan kod variantini taqdim eting.
4. Agar kodda xato bo'lmasa ham, uni qanday qilib yanada "clean" va professional qilish mumkinligini ayting.
5. Doim o'zbek tilida, professional va do'stona muloqot qiling.`;

export default function App() {
  const [code, setCode] = useState("// Fayl yuklang yoki kod yozing...\\nfunction hello() { console.log('ZeroGravity AI'); }");
  const [apiKey, setApiKey] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Salom! Men ZeroGravity Deep-Think AI yordamchingizman. Faylingizni yuklang yoki kodni shu yerga joylang, men uni shafqatsizlarcha tahlil qilib beraman! ⚡" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [output, setOutput] = useState("");
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCode(event.target.result);
      setMessages(prev => [...prev, { role: "assistant", content: `📁 Fayl yuklandi: **${file.name}**. Endi tahlil tugmasini bosib xatolarni ko'rishingiz mumkin!` }]);
    };
    reader.readAsText(file);
  };

  const sendMessage = async (customMsg = null) => {
    const msgToSend = customMsg || input.trim();
    if (!msgToSend || loading || !apiKey) return;
    
    if (!customMsg) setInput("");
    setLoading(true);
    
    const newMsgs = [...messages, { role: "user", content: msgToSend }];
    setMessages(newMsgs);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-api-key": apiKey, 
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true" 
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: `KO'RIB CHIQILADIGAN KOD:\n\`\`\`javascript\n${code}\n\`\`\`\n\nTOPSHIRIQ: ${msgToSend}` }]
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      setMessages([...newMsgs, { role: "assistant", content: data.content[0].text }]);
    } catch (err) {
      setMessages([...newMsgs, { role: "assistant", content: `❌ XATOLIK: ${err.message}. API kodingizni yoki internetni tekshiring.` }]);
    } finally { setLoading(false); }
  };

  const runCode = () => {
    setActiveTab("output"); setOutput("");
    const logs = [];
    const origLog = console.log, origErr = console.error;
    console.log = (...a) => logs.push("› " + a.join(" "));
    console.error = (...a) => logs.push("✖ " + a.join(" "));
    try { 
      new Function(code)(); 
      setOutput(logs.join("\\n") || "✓ Kod muvaffaqiyatli bajarildi (output bo'sh)"); 
    }
    catch (e) { setOutput("❌ ERROR: " + e.message); }
    finally { console.log = origLog; console.error = origErr; }
  };

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, height: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ height: 65, display: "flex", alignItems: "center", justifySpaceBetween: "space-between", padding: "0 25px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.panel, boxShadow: "0 4px 15px rgba(0,0,0,0.4)", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.green})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-1px" }}>◈ ZeroGravity IDE</h1>
          <span style={{ fontSize: 10, color: COLORS.muted, border: `1px solid ${COLORS.border}`, padding: "2px 6px", borderRadius: 4 }}>v2.0 PRO</span>
        </div>
        
        <div style={{ display: "flex", flex: 1, justifyContent: "flex-end", alignItems: "center", gap: 15 }}>
          <input type="password" placeholder="sk-ant-api..." value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ background: COLORS.surface, border: `1px solid \${COLORS.border}`, borderRadius: 8, color: "white", padding: "8px 12px", fontSize: 12, width: 180, outline: "none" }} />
          
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current.click()} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>📁 Fayl Yuklash</button>
          
          <button onClick={() => sendMessage("Bu kodni chuqur tahlil qil va uning eng tubidagi yashirin xatolarini topib ber.")} disabled={!apiKey || loading} style={{ background: `${COLORS.purple}22`, border: `1px solid ${COLORS.purple}`, color: COLORS.purple, padding: "8px 20px", borderRadius: 8, fontWeight: 700, cursor: "pointer", opacity: apiKey ? 1 : 0.4 }}>⚡ CHUQUR TAHLIL</button>
          
          <button onClick={runCode} style={{ background: COLORS.green, padding: "8px 24px", borderRadius: 8, fontWeight: 800, color: "#000", border: "none", cursor: "pointer", boxShadow: `0 4px 12px ${COLORS.green}33` }}>▶ ISHGA TUSHIR</button>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Muharrir */}
        <div style={{ width: "55%", display: "flex", flexDirection: "column", borderRight: `1px solid \${COLORS.border}` }}>
          <div style={{ display: "flex", background: COLORS.panel, borderBottom: `1px solid ${COLORS.border}` }}>
            <button onClick={() => setActiveTab("editor")} style={{ flex: 1, padding: 14, background: activeTab === "editor" ? COLORS.surface : "transparent", color: activeTab === "editor" ? COLORS.accent : COLORS.muted, border: "none", fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>EDITOR</button>
            <button onClick={() => setActiveTab("output")} style={{ flex: 1, padding: 14, background: activeTab === "output" ? COLORS.surface : "transparent", color: activeTab === "output" ? COLORS.green : COLORS.muted, border: "none", fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>OUTPUT</button>
          </div>
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            {activeTab === "editor" ? 
              <textarea value={code} onChange={e => setCode(e.target.value)} style={{ width: "100%", height: "100%", background: "transparent", color: "#a8d8ea", padding: 25, border: "none", outline: "none", fontFamily: "'JetBrains Mono', monospace", fontSize: 14, resize: "none", lineHeight: 1.7 }} /> :
              <div style={{ padding: 25, whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, height: "100%", overflowY: "auto", color: COLORS.text }}>{output || "Output bu yerda aks etadi..."}</div>
            }
          </div>
        </div>

        {/* AI Chat */}
        <div style={{ width: "45%", display: "flex", flexDirection: "column", background: COLORS.panel }}>
          <div style={{ padding: "15px 25px", background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, background: COLORS.green, borderRadius: "50%", boxShadow: `0 0 10px ${COLORS.green}` }}></div>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>AI ANALITIK</span>
            {loading && <span style={{ fontSize: 11, color: COLORS.purple, fontStyle: "italic", marginLeft: "auto" }}>🧠 O'ylanmoqda...</span>}
          </div>
          
          <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "90%" }}>
                <div style={{ background: m.role === "user" ? COLORS.surface : "transparent", padding: "14px 18px", borderRadius: 16, border: `1px solid ${m.role === "user" ? COLORS.accent + "44" : COLORS.border}`, boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
                  {m.content.includes("<thought>") ? (
                    <div>
                      <div style={{ fontSize: 12, color: COLORS.muted, fontStyle: "italic", background: `${COLORS.purple}11`, padding: 10, borderRadius: 8, borderLeft: `2px solid ${COLORS.purple}`, marginBottom: 12 }}>
                         <strong>🧠 Tahlil:</strong><br/>
                         {m.content.split("</thought>")[0].replace("<thought>", "").trim()}
                      </div>
                      <div style={{ lineHeight: 1.6, fontSize: 14, whiteSpace: "pre-wrap" }}>{m.content.split("</thought>")[1].trim()}</div>
                    </div>
                  ) : <div style={{ lineHeight: 1.6, fontSize: 14, whiteSpace: "pre-wrap" }}>{m.content}</div>}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: 20, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 12, background: COLORS.panel }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={apiKey ? "Kod haqida so'rang..." : "API kalitni kiriting..."} style={{ flex: 1, background: COLORS.surface, border: `1px solid \${COLORS.border}`, borderRadius: 10, padding: "12px 16px", color: "white", outline: "none", fontSize: 14 }} />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim() || !apiKey} style={{ background: COLORS.accent, border: "none", borderRadius: 10, width: 50, color: "#000", fontWeight: 800, cursor: "pointer", transition: "0.2s" }}>↑</button>
          </div>
        </div>
      </main>
    </div>
  );
}
