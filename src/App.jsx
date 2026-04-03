import { useState, useRef, useEffect } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, collection, onSnapshot, deleteDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";
import './index.css';

const C = {
  bg: "#0a0a0a", sidebar: "#111111", surface: "#1a1a1a", surfaceHover: "#222",
  border: "#2a2a2a", accent: "#8b5cf6", accentLight: "#a78bfa",
  text: "#fafafa", muted: "#888", dim: "#555",
  green: "#34d399", blue: "#60a5fa", pink: "#f472b6",
};

const SYSTEM = `Siz AbdGPT — foydalanuvchilar uchun eng iliq, do'stona va aqlli AI yordamchisiz.
Siz har qanday savolga javob berasiz: hayotiy maslahatlar, motivatsiya, o'quv savollari, kundalik muammolar — hamma narsa.
QOIDALAR:
1. Har doim O'zbek tilida, iliq va samimiy tarzda javob bering.
2. Ko'ngilni ko'taring. Insonlarga o'zlariga ishonch beradigan, ruhlantiradigan so'zlar ayting.
3. Javoblaringiz aniq, foydali va qisqa bo'lsin. Lekin kerak joyda chuqur tushuntiring.
4. Sizning ismingiz: AbdGPT. Balki foydalanuvchi "Sen kimsan?" desa o'zingizni shunday tanishtiring.
5. Har bir javobingiz haqiqiy do'st suhbatiga o'xshab ko'rinsin.`;

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// ============ LOGIN SCREEN ============
function AuthScreen() {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login xatoligi:", error);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div className="fade-in" style={{ width: 400, padding: 40, background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, textAlign: "center" }}>
        <div style={{ marginBottom: 35 }}>
          <div style={{ fontSize: 36, fontWeight: 900, background: `linear-gradient(135deg, ${C.accent}, ${C.pink}, ${C.blue})`, backgroundSize: "200% 200%", animation: "gradient 4s ease infinite", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>AbdGPT</div>
          <div style={{ color: C.muted, fontSize: 14 }}>Sizning shaxsiy AI yordamchingiz</div>
        </div>

        <button onClick={handleGoogleLogin} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px", background: "white", border: "none", borderRadius: 12, color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "0.2s" }}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" width="20" height="20" />
          Google orqali kirish
        </button>
      </div>
    </div>
  );
}

// ============ MAIN APP ============
function ChatApp({ user }) {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiInput, setShowApiInput] = useState(false);
  const chatEndRef = useRef(null);

  // Firestore'dan API Key va Chatlarni yuklash
  useEffect(() => {
    if (!user) return;
    
    // API Keyni yuklash
    const fetchApiKey = async () => {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().apiKey) {
        setApiKey(docSnap.data().apiKey);
      }
    };
    fetchApiKey();

    // Chatlarni real-vaqtda yuklash
    const chatsRef = collection(db, "users", user.uid, "chats");
    const unsubscribe = onSnapshot(chatsRef, (snapshot) => {
      const loadedChats = snapshot.docs.map(doc => doc.data());
      // Sana bo'yicha saralash (eng yangisi tepada)
      loadedChats.sort((a, b) => b.createdAt - a.createdAt);
      setChats(loadedChats);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chats, activeChatId]);

  // API Key saqlanganda Firestore'ga yozish
  const handleApiKeyChange = async (newKey) => {
    setApiKey(newKey);
    await setDoc(doc(db, "users", user.uid), { apiKey: newKey }, { merge: true });
  };

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeMessages = activeChat?.messages || [];

  const createNewChat = () => {
    const newId = generateId();
    setActiveChatId(newId);
  };

  const deleteChat = async (id, e) => {
    e.stopPropagation();
    if (activeChatId === id) setActiveChatId(null);
    await deleteDoc(doc(db, "users", user.uid, "chats", id));
  };

  const sendMessage = async (customMsg = null) => {
    const msg = customMsg || input.trim();
    if (!msg || loading || !apiKey) return;
    if (!customMsg) setInput("");
    setLoading(true);

    let chatId = activeChatId;
    let chatTitle = activeChat?.title || "Yangi suhbat";
    let currentMsgs = activeMessages;

    if (!chatId || currentMsgs.length === 0) {
      chatId = chatId || generateId();
      chatTitle = msg.slice(0, 40);
      setActiveChatId(chatId);
    }

    const newMsgs = [...currentMsgs, { role: "user", content: msg }];
    const chatDocRef = doc(db, "users", user.uid, "chats", chatId);

    // Xabarni vaqtinchalik yozib ko'ramiz (foydalanuvchi qismi)
    await setDoc(chatDocRef, { id: chatId, title: chatTitle, messages: newMsgs, createdAt: activeChat?.createdAt || Date.now() });

    try {
      const apiMsgs = newMsgs.map(m => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] }));
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: apiMsgs })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      const reply = data.candidates[0].content.parts[0].text;
      
      // AI javobini Firestore'ga qo'shamiz
      await setDoc(chatDocRef, { id: chatId, title: chatTitle, messages: [...newMsgs, { role: "assistant", content: reply }], createdAt: activeChat?.createdAt || Date.now() });

    } catch (err) {
      await setDoc(chatDocRef, { id: chatId, title: chatTitle, messages: [...newMsgs, { role: "assistant", content: `❌ Xatolik: ${err.message}` }], createdAt: activeChat?.createdAt || Date.now() });
    }

    setLoading(false);
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg }}>
      {/* Sidebar */}
      <div style={{ width: 280, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 18px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 22, fontWeight: 900, background: `linear-gradient(135deg, ${C.accent}, ${C.pink})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 15 }}>AbdGPT</div>
          <button onClick={createNewChat} style={{ width: "100%", padding: "12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>+</span> Yangi suhbat
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {chats.map(chat => (
            <div key={chat.id} onClick={() => setActiveChatId(chat.id)}
              style={{ padding: "12px 14px", marginBottom: 4, borderRadius: 10, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                background: activeChatId === chat.id ? C.surface : "transparent",
                border: activeChatId === chat.id ? `1px solid ${C.border}` : "1px solid transparent"
              }}>
              <span style={{ fontSize: 13, color: activeChatId === chat.id ? C.text : C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{chat.title}</span>
              <span onClick={(e) => deleteChat(chat.id, e)} style={{ fontSize: 16, color: C.dim, cursor: "pointer", marginLeft: 8, padding: "0 5px" }}>×</span>
            </div>
          ))}
        </div>

        <div style={{ padding: "15px", borderTop: `1px solid ${C.border}` }}>
          <div onClick={() => setShowApiInput(!showApiInput)} style={{ fontSize: 12, color: C.muted, cursor: "pointer", marginBottom: showApiInput ? 10 : 0 }}>⚙️ API Kalit sozlamalari</div>
          {showApiInput && <input type="password" value={apiKey} onChange={e => handleApiKeyChange(e.target.value)} placeholder="sk-ant-..." style={{ width: "100%", padding: "8px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, outline: "none", marginBottom: 10 }} />}
          
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, padding: "10px", background: C.surface, borderRadius: 10 }}>
            {user.photoURL ? <img src={user.photoURL} alt="Avatar" style={{ width: 32, height: 32, borderRadius: "50%" }} /> : <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: "bold" }}>{user.displayName?.charAt(0)}</div>}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: "bold", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{user.displayName}</div>
              <div onClick={() => signOut(auth)} style={{ fontSize: 11, color: "#ef4444", cursor: "pointer" }}>Chiqish</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!activeChatId || activeMessages.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 15 }}>
            <div style={{ fontSize: 48, fontWeight: 900, background: `linear-gradient(135deg, ${C.accent}, ${C.pink}, ${C.blue})`, backgroundSize: "200% 200%", animation: "gradient 4s ease infinite", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Salom, {user.displayName?.split(" ")[0]}!</div>
            <div style={{ color: C.muted, fontSize: 18, maxWidth: 500, textAlign: "center", lineHeight: 1.6 }}>Men AbdGPT — sizning shaxsiy AI do'stingizman. Har qanday savolingizga javob beraman!</div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap", justifyContent: "center" }}>
              {["Bugun kayfiyatim yaxshi emas 😔", "Mengamaslahat siri kerak", "Qiziq fakt aytib ber 🧠", "AbdGPT kimsan?"].map(s => (
                <button key={s} onClick={() => sendMessage(s)} style={{ padding: "10px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, color: C.text, fontSize: 13, cursor: "pointer" }}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "30px 0" }}>
              <div style={{ maxWidth: 750, margin: "0 auto", padding: "0 20px" }}>
                {activeMessages.map((m, i) => (
                  <div key={i} className="fade-in" style={{ marginBottom: 25 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      {m.role === "user" ? (
                         user.photoURL ? <img src={user.photoURL} alt="U" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} /> : <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, background: C.surface, color: C.muted }}>U</div>
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, background: `linear-gradient(135deg, ${C.accent}, ${C.pink})`, color: "white" }}>A</div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>{m.role === "user" ? user.displayName : "AbdGPT"}</div>
                        <div style={{ fontSize: 15, lineHeight: 1.7, color: C.text, whiteSpace: "pre-wrap" }}>{m.content}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="fade-in" style={{ display: "flex", gap: 14, marginBottom: 25 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.pink})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 14 }}>A</div>
                    <div style={{ color: C.muted, fontSize: 14, paddingTop: 6 }}>
                      <span style={{ animation: "pulse 1.5s infinite" }}>AbdGPT o'ylanmoqda</span>
                      <span style={{ animation: "pulse 1.5s infinite 0.3s" }}>.</span>
                      <span style={{ animation: "pulse 1.5s infinite 0.6s" }}>.</span>
                      <span style={{ animation: "pulse 1.5s infinite 0.9s" }}>.</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            <div style={{ padding: "20px 0 30px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ maxWidth: 750, margin: "0 auto", padding: "0 20px" }}>
                {!apiKey && <div style={{ textAlign: "center", color: "#ef4444", fontSize: 13, marginBottom: 10 }}>⚠️ Chap panel (⚙️) dan API Kalitni kiritishingiz kerak</div>}
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                  <textarea value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Xabar yozing (AbdGPT siz bilan)..." rows={1}
                    style={{ flex: 1, padding: "16px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, color: C.text, fontSize: 15, outline: "none", resize: "none", minHeight: 52, maxHeight: 150, lineHeight: 1.5 }}
                    onFocus={e => e.target.style.borderColor = C.accent}
                    onBlur={e => e.target.style.borderColor = C.border}
                    onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px"; }}
                  />
                  <button onClick={() => sendMessage()} disabled={loading || !input.trim() || !apiKey}
                    style={{ width: 52, height: 52, borderRadius: 16, border: "none", cursor: (loading || !input.trim() || !apiKey) ? "not-allowed" : "pointer", fontSize: 20, fontWeight: 900, flexShrink: 0, color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                      background: (loading || !input.trim() || !apiKey) ? C.surface : `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`,
                      opacity: (loading || !input.trim() || !apiKey) ? 0.5 : 1
                    }}>↑</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============ ROOT ============
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{ height: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: C.accent }}>Yuklanmoqda...</div></div>;
  if (!user) return <AuthScreen />;
  return <ChatApp user={user} />;
}
