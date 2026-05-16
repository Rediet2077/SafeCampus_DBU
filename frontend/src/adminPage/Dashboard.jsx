import { useState, useEffect, useRef } from "react";
import { auth, rtdb } from "../firebase";
import { ref, onValue, update } from "firebase/database";
import { Link } from "react-router-dom";

const ALARM_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export default function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nightMode, setNightMode] = useState(true);
  const [connStatus, setConnStatus] = useState("connecting");
  const [actionId, setActionId] = useState(null);
  const [zoomPhoto, setZoomPhoto] = useState(null);
  const [hoveredAlert, setHoveredAlert] = useState(null);
  const audioRef = useRef(new Audio(ALARM_SOUND));
  const announcedIds = useRef(new Set());

  const speakAlert = (message) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(`New Emergency Alert: ${message}`);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const syncOffline = () => {
      const offline = JSON.parse(localStorage.getItem("offline_alerts") || "[]");
      return offline.map(a => ({ ...a, timestamp: a.timestamp }));
    };

    const alertsRef = ref(rtdb, 'alerts');
    const unsub = onValue(alertsRef, (snapshot) => {
      const cloudDataRaw = snapshot.val();
      const cloudData = cloudDataRaw ? Object.keys(cloudDataRaw).map(key => ({ id: key, ...cloudDataRaw[key] })) : [];
      const offlineData = syncOffline();
      const combined = [...offlineData, ...cloudData].sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      combined.forEach(a => {
        if (a.status === 'active' && a.severity === 'critical' && !announcedIds.current.has(a.id)) {
          audioRef.current.play().catch(() => {});
          speakAlert(a.message || a.location);
          announcedIds.current.add(a.id);
        }
      });

      setAlerts(combined);
      setLoading(false);
      setConnStatus("live");
    }, (error) => {
      setLoading(false);
    });

    const handleStorage = () => {
      const offlineData = syncOffline();
      setAlerts(prev => {
        const cloudOnly = prev.filter(a => !a.id.toString().includes("offline"));
        return [...offlineData, ...cloudOnly].sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
      });
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      unsub();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleQuickResolve = async (alertId) => {
    setActionId(alertId);
    try {
      if (alertId.toString().includes("offline")) {
          const offline = JSON.parse(localStorage.getItem("offline_alerts") || "[]");
          const updated = offline.map(a => 
            a.id.toString() === alertId.toString() 
            ? { ...a, status: "resolved", resolvedAt: new Date().toISOString() } 
            : a
          );
          localStorage.setItem("offline_alerts", JSON.stringify(updated));
          window.dispatchEvent(new Event("storage"));
          return;
      }
      await update(ref(rtdb, `alerts/${alertId}`), { status: "resolved", resolvedAt: new Date().toISOString() });
    } finally { setActionId(null); }
  };

  const activeAlerts = alerts.filter(a => a.status === 'active' || a.status === 'dispatched');
  const locationStats = alerts.reduce((acc, a) => {
    acc[a.location] = (acc[a.location] || 0) + 1;
    return acc;
  }, {});
  const topLocations = Object.entries(locationStats).sort((a,b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className={`p-8 min-h-screen transition-all duration-700 relative ${nightMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {zoomPhoto && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-10 cursor-zoom-out" onClick={() => setZoomPhoto(null)}>
          <img src={zoomPhoto} alt="Evidence Zoom" className="max-w-full max-h-[85vh] rounded-[48px] shadow-2xl border border-white/10" />
          <button className="mt-8 px-12 py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-2xl">Close Evidence</button>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Dispatch <span className="text-red-600">Commander</span></h1>
          <div className="flex gap-4">
             <button onClick={() => setNightMode(!nightMode)} className={`px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${nightMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
                {nightMode ? '☀️ Day' : '🌙 Night'}
             </button>
             <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border ${connStatus === 'live' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest">{connStatus === 'live' ? 'SATELLITE LIVE' : 'BACKUP MODE'}</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className={`lg:col-span-2 rounded-[40px] p-10 border relative ${nightMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-100 shadow-xl'}`}>
            <h2 className="text-xl font-black mb-8 uppercase italic flex items-center gap-3">
              <span className="w-3 h-3 bg-red-600 rounded-full animate-ping" /> Live Pipeline
            </h2>
            {/* 🛰️ HOVER INFO TOOLTIP */}
            {hoveredAlert && (
              <div className="absolute top-10 right-10 z-50 w-72 bg-black/95 backdrop-blur-2xl border border-red-600/30 rounded-[40px] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-200 pointer-events-none">
                 <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" /> Dual-Verification Peek
                 </p>
                 
                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                       {hoveredAlert.idCardImage && (
                         <div className="space-y-2">
                            <p className="text-[7px] font-black text-gray-500 uppercase text-center">Official ID</p>
                            <div className="w-full aspect-square rounded-2xl overflow-hidden border border-gray-800 shadow-inner">
                               <img src={hoveredAlert.idCardImage} className="w-full h-full object-cover" />
                            </div>
                         </div>
                       )}
                       {hoveredAlert.evidencePhoto && (
                         <div className="space-y-2">
                            <p className="text-[7px] font-black text-red-500 uppercase text-center">Live Snapshot</p>
                            <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-red-600/30 shadow-lg shadow-red-900/20">
                               <img src={hoveredAlert.evidencePhoto} className="w-full h-full object-cover" />
                            </div>
                         </div>
                       )}
                    </div>

                    <div className="bg-gray-800/20 p-4 rounded-2xl border border-gray-800/50">
                       <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Subject Identity</p>
                       <p className="text-xs font-black text-white uppercase italic tracking-tight">{hoveredAlert.userName}</p>
                       <p className="text-[9px] font-bold text-gray-400 truncate mt-1">{hoveredAlert.userEmail || "Anonymous Guest"}</p>
                    </div>

                    <div className="flex justify-between items-center px-2">
                       <div>
                          <p className="text-[7px] font-black text-gray-600 uppercase">Emergency Contact</p>
                          <p className="text-[10px] font-black text-red-500">{hoveredAlert.userPhone || "N/A"}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[7px] font-black text-gray-600 uppercase">Trust Score</p>
                          <p className="text-[10px] font-black text-green-500">{hoveredAlert.trustScore}%</p>
                       </div>
                    </div>
                 </div>
              </div>
            )}

            <div className="space-y-4">
              {loading ? (
                <div className="py-20 text-center animate-pulse text-[10px] font-black text-gray-500 uppercase tracking-widest">Scanning Grid...</div>
              ) : activeAlerts.length === 0 ? (
                <div className="py-20 text-center opacity-30 italic font-black uppercase tracking-widest">All Sectors Secure.</div>
              ) : (
                activeAlerts.map(alert => (
                  <div 
                    key={alert.id} 
                    onMouseEnter={() => setHoveredAlert(alert)}
                    onMouseLeave={() => setHoveredAlert(null)}
                    className={`flex items-center gap-5 p-6 rounded-[32px] border ${nightMode ? 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-800 hover:border-red-600/20' : 'bg-gray-50 border-gray-200'} transition-all cursor-crosshair`}
                  >
                     <div className={`w-1.5 h-12 rounded-full ${alert.severity === 'critical' ? 'bg-red-600 shadow-[0_0_12px_red]' : 'bg-blue-600'}`} />
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-black uppercase tracking-tight truncate">{alert.message}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">📍 {alert.location}</p>
                     </div>
                     {alert.evidencePhoto && (
                       <div 
                         onClick={() => setZoomPhoto(alert.evidencePhoto)}
                         className="w-12 h-12 rounded-xl overflow-hidden border border-gray-700 shadow-lg cursor-zoom-in hover:scale-110 transition-transform"
                       >
                         <img src={alert.evidencePhoto} alt="Thumb" className="w-full h-full object-cover grayscale" />
                       </div>
                     )}
                     <div className="flex items-center gap-2">
                        {alert.coordinates && <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${alert.coordinates.lat},${alert.coordinates.lng}`, '_blank')} className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20">🧭</button>}
                        <button onClick={() => handleQuickResolve(alert.id)} disabled={actionId === alert.id} className="px-6 py-3 bg-green-600 hover:bg-green-50 rounded-2xl text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-green-900/20">
                          {actionId === alert.id ? "..." : "Resolve"}
                        </button>
                     </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className={`rounded-[40px] p-8 border ${nightMode ? 'bg-gray-900 border-gray-800 shadow-2xl' : 'bg-white border-gray-100 shadow-xl'}`}>
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-8">Heatmap Analytics</h3>
              <div className="space-y-6">
                {topLocations.map(([loc, count]) => (
                  <div key={loc}>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-2"><span>{loc}</span><span className="text-red-500">{count} Incidents</span></div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-red-600 shadow-[0_0_8px_red]" style={{ width: `${(count / Math.max(alerts.length, 1)) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
