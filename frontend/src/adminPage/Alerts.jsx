import { useEffect, useState, useRef } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const ALARM_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [actionId, setActionId] = useState(null);
  const [connStatus, setConnStatus] = useState("connecting");
  const audioRef = useRef(new Audio(ALARM_SOUND));

  useEffect(() => {
    // 🛡️ OFFLINE BACKUP SYNC
    const syncOffline = () => {
      const offline = JSON.parse(localStorage.getItem("offline_alerts") || "[]");
      return offline.map(a => ({ 
        ...a, 
        timestamp: { toDate: () => new Date(a.timestamp) } 
      }));
    };

    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cloudData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const offlineData = syncOffline();
      const combined = [...offlineData, ...cloudData];
      
      // Play Alarm for new Critical alerts
      const hasCritical = combined.find(a => a.status === 'active' && a.severity === 'critical');
      if (hasCritical) audioRef.current.play().catch(() => {});

      setAlerts(combined);
      setLoading(false);
      setConnStatus("live");
    }, (error) => {
      console.warn("Switching to Offline Bridge...");
      setAlerts(syncOffline());
      setLoading(false);
      setConnStatus("offline");
    });

    // 📡 Real-time Storage Listener (Instant Cross-Tab Sync)
    const handleStorage = () => {
      const offlineData = syncOffline();
      setAlerts(prev => {
        const cloudOnly = prev.filter(a => !a.id.toString().startsWith("offline_"));
        return [...offlineData, ...cloudOnly];
      });
      // Play sound for local alerts too
      if (offlineData.some(a => a.severity === 'critical')) audioRef.current.play().catch(() => {});
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleDispatch = async (alertId, guardName = "Officer Abebe") => {
    if (alertId.toString().startsWith("offline_")) {
        const offline = JSON.parse(localStorage.getItem("offline_alerts") || "[]");
        const updated = offline.map(a => a.id === alertId ? { ...a, status: "dispatched", assignedGuard: guardName, eta: "2:15" } : a);
        localStorage.setItem("offline_alerts", JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        return;
    }
    setActionId(alertId);
    try {
      await updateDoc(doc(db, "alerts", alertId), { status: "dispatched", assignedGuard: guardName, eta: "3:45" });
    } finally { setActionId(null); }
  };

  const handleResolve = async (alertId) => {
    if (alertId.toString().startsWith("offline_")) {
        const offline = JSON.parse(localStorage.getItem("offline_alerts") || "[]");
        const updated = offline.filter(a => a.id !== alertId);
        localStorage.setItem("offline_alerts", JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        return;
    }
    setActionId(alertId);
    try { await updateDoc(doc(db, "alerts", alertId), { status: "resolved" }); } finally { setActionId(null); }
  };

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case "critical": return "bg-red-600 text-white animate-pulse border-red-400";
      case "medical": return "bg-orange-500 text-white border-orange-300";
      case "suspicious": return "bg-yellow-500 text-black border-yellow-300";
      case "help": return "bg-blue-500 text-white border-blue-300";
      default: return "bg-gray-600 text-white";
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'active') return a.status === 'active' || a.status === 'dispatched';
    return a.status === filter;
  });

  return (
    <div className={`p-8 min-h-screen transition-all duration-500 ${alerts.some(a => a.status === 'active' && a.severity === 'critical') ? 'bg-red-950/20' : 'bg-gray-950'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full animate-ping ${connStatus === 'live' ? 'bg-green-500' : 'bg-orange-500'}`} />
              SMART DISPATCH {connStatus === 'offline' && <span className="text-xs text-orange-500 font-bold tracking-widest">(BACKUP BRIDGE)</span>}
            </h1>
            <p className="text-gray-400 mt-1 font-medium italic">Scanning University Grid • Satellite Mode</p>
          </div>

          <div className="flex bg-gray-900 border border-gray-800 p-1 rounded-2xl">
            {["active", "resolved", "all"].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-red-600 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-32 bg-gray-900/30 border-2 border-dashed border-gray-800 rounded-[40px]">
              <div className="text-6xl mb-6">🛡️</div>
              <h2 className="text-2xl font-bold text-gray-500 uppercase tracking-widest">Zone Status: 100% Secure</h2>
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <div key={alert.id} className={`group relative bg-gray-900 border-2 rounded-[32px] p-8 transition-all ${alert.severity === 'critical' ? 'border-red-600/50' : 'border-gray-800'}`}>
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border-2 ${getSeverityStyles(alert.severity)}`}>
                        {alert.severity || 'General'} Alert
                      </span>
                      {alert.status === 'dispatched' && (
                        <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-blue-600/20 text-blue-400 border-2 border-blue-400/20">
                          🛡️ Dispatched: {alert.assignedGuard}
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl font-black text-white mb-2 leading-tight uppercase tracking-tight">
                      {alert.userName ? `${alert.userName}: ` : ''}{alert.message}
                    </h3>
                    
                    <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                      <div className="flex items-center gap-1.5"><span className="text-red-600">📍</span> {alert.location}</div>
                      <div className="flex items-center gap-1.5">🕒 {alert.timestamp?.toDate ? alert.timestamp.toDate().toLocaleTimeString() : 'Just Now'}</div>
                    </div>

                    {alert.medicalInfo && (
                      <div className="mt-6 p-4 bg-red-600/5 border border-red-600/10 rounded-2xl flex items-center gap-6">
                        <div>
                          <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Blood Group</p>
                          <p className="text-white font-black">{alert.medicalInfo.bloodType || 'O+'}</p>
                        </div>
                        <div className="w-px h-8 bg-red-600/20" />
                        <div>
                          <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Allergies</p>
                          <p className="text-white font-black text-xs">{alert.medicalInfo.allergies || 'None'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="lg:w-80 flex flex-col gap-4">
                    {alert.coordinates && (
                      <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${alert.coordinates.lat},${alert.coordinates.lng}`, '_blank')} className="w-full h-32 rounded-3xl overflow-hidden relative group/map border-2 border-gray-800">
                        <img src="/assets/dbu_map.png" alt="Map Preview" className="w-full h-full object-cover opacity-40 group-hover/map:opacity-80 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="bg-white text-black px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-[0.2em]">Live Tracking</span>
                        </div>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {alert.status === 'active' ? (
                        <button onClick={() => handleDispatch(alert.id)} className="col-span-2 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-900/20 transition-all active:scale-95">Dispatch Responder</button>
                      ) : alert.status === 'dispatched' ? (
                        <div className="col-span-2 py-4 bg-gray-800 rounded-2xl flex flex-col items-center justify-center border border-gray-700">
                          <p className="text-[9px] text-gray-500 font-black uppercase mb-1">Estimated Arrival</p>
                          <p className="text-xl font-black text-blue-400 animate-pulse">{alert.eta || '3:45'}</p>
                        </div>
                      ) : null}

                      {alert.status !== 'resolved' && (
                        <button onClick={() => handleResolve(alert.id)} className="py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-green-900/20">Resolve</button>
                      )}
                      <button onClick={() => deleteDoc(doc(db, "alerts", alert.id))} className="py-4 bg-gray-800 text-gray-500 hover:text-red-500 rounded-2xl font-black transition-all">🗑️</button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
