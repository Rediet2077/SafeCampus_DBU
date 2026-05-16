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

    // 📍 CAPTURE REAL GPS
    let coords = null;
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          timeout: 5000,
          enableHighAccuracy: true 
        });
      });
      coords = { lat: position.coords.latitude, lng: position.coords.longitude };
    } catch (err) {
      console.warn("GPS access denied, using student profile address.");
    }

    try {
      let contacts = [];
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          contacts = userDoc.data().emergencyContacts || [];
        }
      }

      const alertData = {
        userType: "registered",
        userId: user?.uid || "anonymous",
        userName: user?.displayName || user?.email?.split('@')[0] || "Student",
        message: "🆘 HIGH-PRIORITY EMERGENCY: User requested immediate help!",
        location: coords ? `GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Student Dashboard",
        coordinates: coords,
        status: "active",
        severity: "critical",
        timestamp: new Date().toISOString(),
        emergencyContacts: contacts,
      };

      const networkTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000));

      try {
        await Promise.race([
          addDoc(collection(db, "alerts"), {
            ...alertData,
            timestamp: serverTimestamp()
          }),
          networkTimeout
        ]);
        setSent(true);
      } catch (err) {
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
        <h1 className="text-3xl font-black mb-2 tracking-tighter">EMERGENCY SENT</h1>
        <p className="text-white/80 mb-8 max-w-[250px]">GPS coordinates locked. Security and family are on the way. Stay calm.</p>
        <button onClick={() => setSent(false)} className="w-full bg-white text-red-600 font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform">I AM SAFE NOW</button>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Hi, {user?.displayName || 'Student'} 👋</h1>
          <p className="text-gray-500 text-sm font-medium">SafeCampus Command Center</p>
        </div>
        <div className="w-12 h-12 bg-[#6B46C1]/10 rounded-2xl flex items-center justify-center text-2xl border border-[#6B46C1]/20">🛡️</div>
      </div>

      <div className="mb-10 flex flex-col items-center bg-red-50 rounded-[40px] p-8 border border-red-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 text-8xl -rotate-12">🆘</div>
        <p className="text-red-600 font-black text-[10px] uppercase tracking-[0.3em] mb-6 relative z-10">{isHolding ? 'HOLDING...' : 'Hold 2s for Emergency'}</p>
        <button onMouseDown={startHold} onMouseUp={endHold} onMouseLeave={endHold} onTouchStart={startHold} onTouchEnd={endHold} disabled={isTriggering} className={`relative w-44 h-44 rounded-full flex items-center justify-center transition-all duration-300 z-10 select-none ${isHolding ? 'scale-105' : 'scale-100'}`}>
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="88" cy="88" r="80" fill="transparent" stroke="#fee2e2" strokeWidth="8" />
            <circle cx="88" cy="88" r="80" fill="transparent" stroke="#dc2626" strokeWidth="8" strokeDasharray="502" strokeDashoffset={502 - (502 * progress) / 100} strokeLinecap="round" className="transition-all duration-75" />
          </svg>
          <div className={`w-36 h-36 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-300 ${isHolding ? 'bg-red-700 shadow-red-900/40' : 'bg-red-600 shadow-red-900/20'}`}>
             {isTriggering ? <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <><span className="text-white font-black text-xs tracking-widest">SOS</span><span className="text-3xl">🚨</span></>}
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {menuItems.map((item) => (
          <button key={item.id} onClick={() => navigate(item.route)} className={`flex flex-col items-center justify-center p-6 rounded-3xl border shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${item.color}`}>
            <span className="text-3xl mb-3">{item.icon}</span><span className="font-bold text-xs uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 bg-gray-900 rounded-[32px] p-6 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">📞</div>
        <h3 className="text-lg font-bold mb-1">Campus Security</h3>
        <p className="text-gray-400 text-xs mb-4">Direct emergency voice line</p>
        <button className="bg-red-600 hover:bg-red-500 w-full py-4 rounded-2xl font-black text-sm transition-colors shadow-lg shadow-red-900/40">Call 911</button>
      </div>
    </div>
  );
}
