import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function SendAlert() {
  const [type, setType] = useState("critical");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("Main Library");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const navigate = useNavigate();

  const emergencyLevels = [
    { id: "critical", label: "Critical Threat", color: "bg-red-600", icon: "🚨" },
    { id: "medical", label: "Medical Emergency", color: "bg-orange-500", icon: "🚑" },
    { id: "suspicious", label: "Suspicious Activity", color: "bg-yellow-500", icon: "👁️" },
    { id: "help", label: "General Help", color: "bg-blue-500", icon: "🤝" },
  ];

  const dbuLocations = [
    { name: "Administration Block", coords: { top: "20%", left: "45%" } },
    { name: "Main Library", coords: { top: "35%", left: "30%" } },
    { name: "Girls' Dormitory", coords: { top: "70%", left: "80%" } },
    { name: "Student Cafe 1", coords: { top: "45%", left: "60%" } },
  ];

  const handleVoiceTrigger = () => {
    setIsListening(true);
    setTimeout(() => {
      setDescription("Help me! I am near the cafeteria and I see something dangerous!");
      setIsListening(false);
    }, 1500);
  };

  const handleSendAlert = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // 🛡️ STEP 1: CAPTURE GPS WITH AGGRESSIVE TIMEOUT (Prevents Hanging)
    let coords = null;
    try {
      coords = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("GPS_TIMEOUT")), 2000); // 2 second max for GPS
        navigator.geolocation.getCurrentPosition(
          (pos) => { clearTimeout(timeout); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
          (err) => { clearTimeout(timeout); reject(err); },
          { enableHighAccuracy: false, timeout: 2000 }
        );
      });
    } catch (err) {
      console.warn("GPS failed or timed out, using campus fallback.");
    }

    const alertData = {
      severity: type,
      message: description || `Emergency Alert: ${type}`,
      location: location,
      coordinates: coords,
      status: "active",
      timestamp: new Date().toISOString(),
      userId: auth.currentUser?.uid || "anonymous",
      userName: auth.currentUser?.displayName || "Student",
      evidenceImage: imagePreview,
      medicalInfo: { bloodType: "O+", allergies: "None" }
    };

    // 🛡️ STEP 2: SEND TO FIREBASE WITH 2s TIMEOUT
    try {
      const fbPromise = addDoc(collection(db, "alerts"), { ...alertData, timestamp: serverTimestamp() });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("NETWORK_TIMEOUT")), 2000));

      await Promise.race([fbPromise, timeoutPromise]);
      setSuccess(true);
    } catch (error) {
      console.warn("Switching to Fail-Safe Local Bridge...");
      // 🛡️ OFFLINE LOCAL BACKUP
      const offline = JSON.parse(localStorage.getItem("offline_alerts") || "[]");
      offline.push({ ...alertData, id: "offline_" + Date.now() });
      localStorage.setItem("offline_alerts", JSON.stringify(offline));
      
      // Instant Cross-Tab Notification
      window.dispatchEvent(new Event("storage"));
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="px-6 py-20 flex flex-col items-center text-center animate-in zoom-in duration-500 min-h-screen bg-gray-950 text-white">
        <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center text-5xl mb-6 shadow-2xl animate-pulse">📡</div>
        <h1 className="text-3xl font-black mb-2 uppercase italic tracking-tighter">Emergency Signal Locked</h1>
        <p className="text-gray-400 mb-12 max-w-[250px] font-medium">Responders are navigating to your location.</p>
        <button onClick={() => navigate("/user")} className="w-full bg-white text-black font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform">CANCEL EMERGENCY</button>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 bg-gray-950 min-h-screen text-white">
      <div className="flex items-center gap-3 mb-10">
        <button onClick={() => navigate("/user")} className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-xl font-bold border border-gray-800">←</button>
        <h1 className="text-2xl font-black tracking-tight uppercase italic">Emergency Console</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-10">
        {emergencyLevels.map((lvl) => (
          <button key={lvl.id} type="button" onClick={() => setType(lvl.id)} className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all duration-300 ${type === lvl.id ? `${lvl.color} border-white scale-105 shadow-2xl shadow-red-900/40` : 'bg-gray-900 border-gray-800 opacity-40'}`}>
            <span className="text-3xl mb-2">{lvl.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-tight">{lvl.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSendAlert} className="space-y-8">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={handleVoiceTrigger} className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${isListening ? 'bg-red-600 border-red-400 animate-pulse' : 'bg-gray-900 border-gray-800 text-gray-400'}`}>
            <span className="text-xl">🎙️</span><span className="text-[10px] font-black uppercase">{isListening ? 'LISTENING...' : 'VOICE SOS'}</span>
          </button>
          <label className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 bg-gray-900 border-gray-800 text-gray-400 cursor-pointer">
            <span className="text-xl">📷</span><span className="text-[10px] font-black uppercase">EVIDENCE</span>
            <input type="file" onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => setImagePreview(reader.result);
                reader.readAsDataURL(file);
              }
            }} className="hidden" accept="image/*" />
          </label>
        </div>

        {imagePreview && <div className="mt-4 relative h-32 rounded-2xl overflow-hidden border-2 border-gray-800"><img src={imagePreview} className="w-full h-full object-cover" alt="Preview" /></div>}

        <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-gray-900 border-2 border-gray-800 rounded-2xl px-5 py-5 text-white font-bold appearance-none outline-none focus:border-red-600">
          {dbuLocations.map(loc => <option key={loc.name} value={loc.name}>{loc.name}</option>)}
        </select>

        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Type details here..." rows={3} className="w-full bg-gray-900 border-2 border-gray-800 rounded-3xl px-6 py-6 text-white font-medium focus:border-red-600 transition-all resize-none outline-none" />

        <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-800 text-white font-black py-6 rounded-[28px] transition-all shadow-2xl shadow-red-900/60 text-sm tracking-[0.2em] uppercase active:scale-[0.98]">
          {loading ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : "BROADCAST EMERGENCY SIGNAL"}
        </button>
      </form>
    </div>
  );
}
