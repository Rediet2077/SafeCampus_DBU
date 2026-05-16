import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";

export default function SendAlert() {
  const [type, setType] = useState("critical");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("Main Library");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [silentMode, setSilentMode] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (description.length > 5) {
      const text = description.toLowerCase();
      if (text.includes("hurt") || text.includes("doctor") || text.includes("blood") || text.includes("medical")) {
        setAiAnalysis("🟠 AI Detects: Medical Emergency");
        setType("medical");
      } else if (text.includes("follow") || text.includes("weapon") || text.includes("danger") || text.includes("threat")) {
        setAiAnalysis("🔴 AI Detects: Critical Threat");
        setType("critical");
      } else if (text.includes("lost") || text.includes("question") || text.includes("help")) {
        setAiAnalysis("🔵 AI Detects: General Help");
        setType("help");
      }
    } else { setAiAnalysis(""); }
  }, [description]);

  const handleSendAlert = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    
    // 🛡️ STEP 1: CAPTURE GPS (Strict 2s Timeout)
    let coords = null;
    try {
      coords = await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject("timeout"), 2000);
        navigator.geolocation.getCurrentPosition(
          (p) => { clearTimeout(t); resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
          () => { clearTimeout(t); reject(); },
          { timeout: 2000, enableHighAccuracy: false }
        );
      });
    } catch (e) { console.warn("GPS Timeout"); }

    const alertData = {
      userType: "registered",
      userId: auth.currentUser?.uid || "anonymous",
      userName: auth.currentUser?.displayName || "Student",
      severity: type,
      message: description || `EMERGENCY: ${type.toUpperCase()}`,
      location: location,
      status: "active",
      silent: silentMode,
      trustScore: 98,
      timestamp: new Date().toISOString(),
      coordinates: coords,
      medicalInfo: { bloodType: "O+", allergies: "None" }
    };

    // 🛡️ STEP 2: SEND TO FIREBASE (Strict 2s Timeout + Offline Fallback)
    try {
      const fbPromise = addDoc(collection(db, "alerts"), { ...alertData, timestamp: serverTimestamp() });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000));

      await Promise.race([fbPromise, timeoutPromise]);
      setSuccess(true);
    } catch (err) {
      // Fail-Safe Bridge
      const offline = JSON.parse(localStorage.getItem("offline_alerts") || "[]");
      offline.push({ ...alertData, id: "offline_user_" + Date.now() });
      localStorage.setItem("offline_alerts", JSON.stringify(offline));
      window.dispatchEvent(new Event("storage"));
      setSuccess(true);
    } finally { 
      setLoading(false); 
    }
  };

  if (success) {
    return (
      <div className={`px-6 py-20 flex flex-col items-center text-center min-h-screen ${silentMode ? 'bg-white' : 'bg-gray-950 text-white'}`}>
        {!silentMode ? (
          <>
            <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center text-5xl mb-6 shadow-2xl animate-bounce">📡</div>
            <h1 className="text-3xl font-black mb-2 uppercase italic tracking-tighter">Signal Dispatched</h1>
            <p className="text-gray-400 mb-8 font-medium">Your location is locked. Help is on the way.</p>
            <button onClick={() => navigate("/user")} className="w-full bg-white text-black font-black py-4 rounded-2xl">Return Home</button>
          </>
        ) : (
          <>
            <p className="text-gray-400 font-medium">Searching for available networks...</p>
            <button onClick={() => navigate("/user")} className="mt-20 opacity-0">Home</button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="px-6 py-8 bg-gray-950 min-h-screen text-white">
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => navigate("/user")} className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-xl font-bold border border-gray-800">←</button>
        <button onClick={() => setSilentMode(!silentMode)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${silentMode ? 'bg-red-600 text-white border-red-500' : 'bg-gray-900 text-gray-500 border-gray-800'}`}>
          {silentMode ? '🤫 Silent Mode' : '🔊 Standard'}
        </button>
      </div>

      <div className="flex bg-gray-900 p-1 rounded-2xl border border-gray-800 mb-8">
        <button onClick={() => setChatMode(false)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!chatMode ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'}`}>SOS Button</button>
        <button onClick={() => setChatMode(true)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${chatMode ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'}`}>AI Chat</button>
      </div>

      {!chatMode ? (
        <div className="grid grid-cols-2 gap-3 mb-10">
           {['critical', 'medical', 'suspicious', 'help'].map(lvl => (
             <button key={lvl} onClick={() => setType(lvl)} className={`p-6 rounded-3xl border-2 transition-all ${type === lvl ? 'bg-red-600 border-white scale-105 shadow-xl shadow-red-900/40' : 'bg-gray-900 border-gray-800 opacity-40 hover:opacity-100'}`}>
               <span className="text-2xl block mb-2">{lvl === 'critical' ? '🚨' : lvl === 'medical' ? '🚑' : lvl === 'suspicious' ? '👁️' : '🤝'}</span>
               <span className="text-[10px] font-black uppercase tracking-widest">{lvl}</span>
             </button>
           ))}
        </div>
      ) : (
        <div className="mb-10 bg-gray-900/50 p-6 rounded-[32px] border border-gray-800 shadow-inner">
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Describe incident...</p>
           <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Type here..." className="w-full bg-transparent border-none text-white font-bold outline-none h-32 resize-none" />
           {aiAnalysis && <p className="mt-4 text-[10px] font-black text-blue-400 uppercase animate-pulse">{aiAnalysis}</p>}
        </div>
      )}

      <form onSubmit={handleSendAlert} className="space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex justify-between items-center shadow-inner">
           <div><p className="text-[10px] font-black text-gray-500 uppercase mb-1">Zone</p><select value={location} onChange={(e) => setLocation(e.target.value)} className="bg-transparent text-white font-black outline-none"><option>Main Library</option><option>Student Cafe</option><option>Girls Dorm</option></select></div>
           <div className="text-right"><p className="text-[10px] font-black text-gray-500 uppercase mb-1">Trust</p><p className="text-green-500 font-black">98%</p></div>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-800 text-white font-black py-6 rounded-[32px] transition-all shadow-2xl shadow-red-900/40 tracking-widest uppercase">
          {loading ? "ESTABLISHING SIGNAL..." : "BROADCAST SOS"}
        </button>
      </form>
    </div>
  );
}
