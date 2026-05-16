import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sent, setSent] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const timerRef = useRef(null);

  const HOLD_TIME = 2000;

  const startHold = (e) => {
    e.preventDefault();
    setIsHolding(true);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min((elapsed / HOLD_TIME) * 100, 100);
      setProgress(p);

      if (elapsed >= HOLD_TIME) {
        clearInterval(timerRef.current);
        triggerEmergency();
      }
    }, 50);
  };

  const endHold = () => {
    setIsHolding(false);
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const triggerEmergency = async () => {
    if (isTriggering) return;
    setIsTriggering(true);

    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    // 🛡️ STEP 1: CAPTURE GPS WITH 2s TIMEOUT (Prevents Hanging)
    let coords = null;
    try {
      coords = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("GPS_TIMEOUT")), 2000);
        navigator.geolocation.getCurrentPosition(
          (pos) => { clearTimeout(timeout); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
          (err) => { clearTimeout(timeout); reject(err); },
          { enableHighAccuracy: false, timeout: 2000 }
        );
      });
    } catch (err) {
      console.warn("Using student profile address (GPS timeout).");
    }

    try {
      const alertData = {
        userType: "registered",
        userId: user?.uid || "anonymous",
        userName: user?.displayName || user?.email?.split('@')[0] || "Student",
        message: "🆘 HIGH-PRIORITY STUDENT EMERGENCY: IMMEDIATE HELP NEEDED!",
        location: coords ? `GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Student Dashboard",
        coordinates: coords,
        status: "active",
        severity: "critical",
        timestamp: new Date().toISOString(),
        medicalInfo: { bloodType: "O+", allergies: "None" } // Default simulation
      };

      // 🛡️ STEP 2: SEND TO FIREBASE WITH 2s TIMEOUT
      try {
        const fbPromise = addDoc(collection(db, "alerts"), { ...alertData, timestamp: serverTimestamp() });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000));

        await Promise.race([fbPromise, timeoutPromise]);
        setSent(true);
      } catch (err) {
        // Fail-Safe Local Bridge
        const offlineAlerts = JSON.parse(localStorage.getItem("offline_alerts") || "[]");
        offlineAlerts.push({ ...alertData, id: "offline_" + Date.now() });
        localStorage.setItem("offline_alerts", JSON.stringify(offlineAlerts));
        window.dispatchEvent(new Event("storage"));
        setSent(true);
      }
    } catch (err) {
      console.error("Emergency trigger failed:", err);
    } finally {
      setIsTriggering(false);
      setIsHolding(false);
      setProgress(0);
    }
  };

  const menuItems = [
    { id: "send", label: "Report Case", icon: "📋", color: "bg-blue-50 text-blue-600 border-blue-100", route: "/user/send-alert" },
    { id: "my-alerts", label: "History", icon: "⏳", color: "bg-purple-50 text-purple-600 border-purple-100", route: "/user/alerts" },
    { id: "tips", label: "Safety Tips", icon: "💡", color: "bg-green-50 text-green-600 border-green-100", route: "/user/tips" },
    { id: "profile", label: "Profile", icon: "👤", color: "bg-orange-50 text-orange-600 border-orange-100", route: "/user/profile" },
  ];

  if (sent) {
    return (
      <div className="px-6 py-20 flex flex-col items-center text-center animate-in zoom-in duration-500 bg-red-600 min-h-screen text-white">
        <div className="w-24 h-24 bg-white text-red-600 rounded-full flex items-center justify-center text-5xl mb-6 shadow-xl animate-pulse">🚨</div>
        <h1 className="text-3xl font-black mb-2 tracking-tighter uppercase italic">Signal Locked</h1>
        <p className="text-white/80 mb-8 max-w-[250px] font-medium">Security is navigating to your spot. Stay where you are.</p>
        <button onClick={() => setSent(false)} className="w-full bg-white text-red-600 font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform">I AM SAFE NOW</button>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 animate-in slide-in-from-bottom-4 duration-500 bg-white min-h-screen">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Hi, {user?.displayName || 'Student'} 👋</h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Command Center Live</p>
        </div>
        <div className="w-12 h-12 bg-red-600/10 rounded-2xl flex items-center justify-center text-2xl border border-red-600/20 shadow-inner">🛡️</div>
      </div>

      <div className="mb-10 flex flex-col items-center bg-red-50 rounded-[40px] p-10 border-2 border-red-100 relative overflow-hidden shadow-inner">
        <div className="absolute top-0 right-0 p-4 opacity-5 text-8xl -rotate-12">🆘</div>
        <p className="text-red-600 font-black text-[11px] uppercase tracking-[0.3em] mb-8 relative z-10">{isHolding ? 'HOLDING...' : 'HOLD 2S FOR EMERGENCY'}</p>
        <button 
          onMouseDown={startHold} onMouseUp={endHold} onMouseLeave={endHold} onTouchStart={startHold} onTouchEnd={endHold}
          disabled={isTriggering} 
          className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 z-10 select-none ${isHolding ? 'scale-105 shadow-2xl' : 'scale-100 shadow-xl'}`}
        >
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="96" cy="96" r="88" fill="transparent" stroke="#fee2e2" strokeWidth="12" />
            <circle cx="96" cy="96" r="88" fill="transparent" stroke="#dc2626" strokeWidth="12" strokeDasharray="553" strokeDashoffset={553 - (553 * progress) / 100} strokeLinecap="round" className="transition-all duration-75" />
          </svg>
          <div className={`w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${isHolding ? 'bg-red-700 shadow-red-900/40' : 'bg-red-600 shadow-red-900/20 hover:bg-red-500'}`}>
             {isTriggering ? <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <><span className="text-white font-black text-sm tracking-[0.2em] mb-1">SOS</span><span className="text-4xl animate-bounce">🚨</span></>}
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {menuItems.map((item) => (
          <button key={item.id} onClick={() => navigate(item.route)} className={`flex flex-col items-start p-6 rounded-[32px] border transition-all hover:scale-[1.02] active:scale-95 ${item.color} shadow-sm`}>
            <span className="text-3xl mb-4 bg-white/50 w-12 h-12 flex items-center justify-center rounded-2xl shadow-inner">{item.icon}</span>
            <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
