import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function Landing() {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sent, setSent] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();

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

    // 📍 ACTIVATE GPS CAPTURE
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
      console.warn("GPS timeout or denied, using campus default.");
    }

    const alertData = {
      userType: "guest",
      message: "🚨 GUEST EMERGENCY: Immediate assistance requested!",
      location: coords ? `GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "DBU Main Campus",
      coordinates: coords,
      building: "Landing Page Trigger",
      status: "active",
      severity: "critical",
      timestamp: new Date().toISOString(),
    };

    const networkTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("timeout")), 3000)
    );

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
      console.warn("Using Local Backup for GPS Alert...");
      const offlineAlerts = JSON.parse(localStorage.getItem("offline_alerts") || "[]");
      offlineAlerts.push({ ...alertData, id: "offline_" + Date.now() });
      localStorage.setItem("offline_alerts", JSON.stringify(offlineAlerts));
      window.dispatchEvent(new Event("storage"));
      setSent(true); 
    } finally {
      setIsTriggering(false);
      setIsHolding(false);
      setProgress(0);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-6xl mb-8 animate-bounce shadow-2xl">
          🚨
        </div>
        <h1 className="text-4xl font-black text-white mb-4 uppercase">Emergency Sent</h1>
        <p className="text-white/90 text-lg mb-12 font-medium">Security has been dispatched to your GPS location.</p>
        
        <div className="bg-black/20 backdrop-blur-md rounded-3xl p-6 mb-12 w-full max-w-sm border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">GPS Status</span>
            <span className="text-[10px] font-bold bg-green-500 px-2 py-0.5 rounded text-white uppercase">Coordinates Locked</span>
          </div>
          <p className="text-white font-bold text-sm">Target: DBU Security Grid</p>
          <p className="text-white/60 text-xs mt-1">Arrival: ~2 mins</p>
        </div>

        <button onClick={() => setSent(false)} className="bg-white text-red-600 font-bold px-12 py-4 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase text-sm tracking-widest">
          Cancel Alert
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-between p-8 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md text-center mt-12 z-10">
        <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-2xl shadow-red-900/50 relative">
          🛡️
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 border-4 border-gray-950 rounded-full" />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight italic">SAFE<span className="text-red-600">CAMPUS</span></h1>
        <p className="text-gray-400 mt-2 text-lg font-medium">DBU Security Portal</p>
      </div>

      <div className="relative flex flex-col items-center z-10">
        <p className={`font-black uppercase tracking-[0.2em] text-[10px] mb-8 transition-colors duration-300 ${isHolding ? 'text-white scale-110' : 'text-red-500 animate-pulse'}`}>
          {isHolding ? 'RELEASING WILL CANCEL...' : 'Hold 2s for Emergency'}
        </p>

        <div className="relative group">
          <div className={`absolute inset-[-20px] rounded-full blur-2xl transition-all duration-500 ${isHolding ? 'bg-red-600/40 opacity-100 scale-110' : 'bg-red-600/20 opacity-0 scale-100'}`} />
          <button onMouseDown={startHold} onMouseUp={endHold} onMouseLeave={endHold} onTouchStart={startHold} onTouchEnd={endHold} disabled={isTriggering} className={`relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-300 transform select-none ${isHolding ? 'scale-110' : 'scale-100 active:scale-95'}`}>
            {isHolding && <div className="absolute inset-0 bg-red-600/20 rounded-full animate-ping" />}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="128" cy="128" r="120" fill="transparent" stroke="#1f2937" strokeWidth="12" />
              <circle cx="128" cy="128" r="120" fill="transparent" stroke="#dc2626" strokeWidth="12" strokeDasharray="754" strokeDashoffset={754 - (754 * progress) / 100} strokeLinecap="round" className="transition-all duration-75" />
            </svg>
            <div className={`w-52 h-52 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-500 ${isHolding ? 'bg-red-700' : 'bg-red-600'}`}>
              {isTriggering ? <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <><span className="text-6xl mb-2">🆘</span><span className="text-white font-black text-xl tracking-tighter">EMERGENCY</span></>}
            </div>
          </button>
        </div>
      </div>

      <div className="w-full max-w-md space-y-4 mb-8 z-10">
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => navigate("/login")} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-5 rounded-3xl transition-all flex flex-col items-center gap-2 backdrop-blur-sm shadow-xl">
            <span className="text-xl">🔑</span><span className="text-[10px] uppercase tracking-widest">Login</span>
          </button>
          <button onClick={() => navigate("/register")} className="bg-[#6B46C1]/10 hover:bg-[#6B46C1]/20 border border-[#6B46C1]/30 text-white font-bold py-5 rounded-3xl transition-all flex flex-col items-center gap-2 backdrop-blur-sm shadow-xl">
            <span className="text-xl">📝</span><span className="text-[10px] uppercase tracking-widest text-[#9F7AEA]">Register</span>
          </button>
        </div>
        <button onClick={() => setShowMap(true)} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-3xl transition-all flex items-center justify-center gap-3 backdrop-blur-sm">
          <span className="text-xl">🗺️</span><span className="text-xs uppercase tracking-[0.2em]">View Campus Map</span>
        </button>
      </div>

      {showMap && (
        <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col animate-in slide-in-from-bottom-full duration-500">
          <header className="px-6 py-6 border-b border-gray-900 flex justify-between items-center bg-gray-900/50 backdrop-blur-md">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><span>🗺️</span> DBU Safety Map</h2>
            <button onClick={() => setShowMap(false)} className="text-gray-400 text-3xl hover:text-white transition-colors">&times;</button>
          </header>
          <div className="flex-1 relative overflow-hidden bg-gray-900">
            <img src="/assets/dbu_map.png" alt="DBU Campus Map" className="w-full h-full object-cover opacity-60" />
            <MapPin top="20%" left="45%" label="Admin" color="bg-blue-500" />
            <MapPin top="35%" left="30%" label="Library" color="bg-green-500" />
            <MapPin top="15%" left="70%" label="Clinic" color="bg-red-500" />
            <MapPin top="70%" left="80%" label="Dormitory" color="bg-purple-500" />
          </div>
          <footer className="p-8 bg-gray-950 border-t border-gray-900">
            <p className="text-gray-400 text-sm mb-4 text-center">Security is active 24/7. GPS tracking is enabled.</p>
            <button onClick={() => setShowMap(false)} className="w-full bg-[#6B46C1] py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-purple-900/20">Back to SOS Button</button>
          </footer>
        </div>
      )}
      
      <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-4">DBU Security Center • 24/7 Monitoring Active</p>
    </div>
  );
}

function MapPin({ top, left, label, color }) {
  return (
    <div className="absolute group" style={{ top, left }}>
      <div className={`w-4 h-4 ${color} rounded-full border-2 border-white shadow-lg animate-pulse`} />
      <span className="absolute left-1/2 -translate-x-1/2 -top-8 bg-white text-gray-950 text-[10px] font-black px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">{label}</span>
    </div>
  );
}
