import { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";

const ALARM_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export default function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nightMode, setNightMode] = useState(true);
  const [connStatus, setConnStatus] = useState("connecting");
  const [actionId, setActionId] = useState(null);
  const audioRef = useRef(new Audio(ALARM_SOUND));
  const processedAlertIds = useRef(new Set()); // 🛡️ TRACKS ALREADY-SOUNDED ALERTS

  useEffect(() => {
    const syncOffline = () => {
      const offline = JSON.parse(localStorage.getItem("offline_alerts") || "[]");
      return offline.map(a => ({ ...a, timestamp: { toDate: () => new Date(a.timestamp) } }));
    };

    const forceLoadTimeout = setTimeout(() => {
      if (loading) {
        setAlerts(syncOffline());
        setLoading(false);
        setConnStatus("offline");
      }
    }, 3000);

    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      clearTimeout(forceLoadTimeout);
      const cloudData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const offlineData = syncOffline();
      const combined = [...offlineData, ...cloudData];
      
      // 🔔 SMART ALARM: ONLY PLAY FOR *NEW* CRITICAL ALERTS
      combined.forEach(alert => {
        if (alert.status === 'active' && alert.severity === 'critical' && !processedAlertIds.current.has(alert.id)) {
            audioRef.current.play().catch(() => {});
            processedAlertIds.current.add(alert.id); // Mark as sounded
        }
      });

      setAlerts(combined);
      setLoading(false);
      setConnStatus("live");
    }, (error) => {
      clearTimeout(forceLoadTimeout);
      setAlerts(syncOffline());
      setLoading(false);
      setConnStatus("offline");
    });

    const handleStorage = () => {
      const offlineData = syncOffline();
      setAlerts(prev => {
        const cloudOnly = prev.filter(a => !a.id.toString().startsWith("offline_"));
        const merged = [...offlineData, ...cloudOnly];
        
        // Check for new offline alerts to play sound
        offlineData.forEach(alert => {
          if (alert.severity === 'critical' && !processedAlertIds.current.has(alert.id)) {
            audioRef.current.play().catch(() => {});
            processedAlertIds.current.add(alert.id);
          }
        });

        return merged;
      });
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      unsub();
      clearTimeout(forceLoadTimeout);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleQuickResolve = async (alertId) => {
    if (!window.confirm("Mark this incident as RESOLVED? It will be removed from the active feed.")) return;
    setActionId(alertId);

    if (alertId.toString().startsWith("offline_")) {
        const offline = JSON.parse(localStorage.getItem("offline_alerts") || "[]");
        localStorage.setItem("offline_alerts", JSON.stringify(offline.filter(a => a.id !== alertId)));
        window.dispatchEvent(new Event("storage"));
        setActionId(null);
        return;
    }

    try {
      await updateDoc(doc(db, "alerts", alertId), { status: "resolved" });
    } finally { setActionId(null); }
  };

  const activeAlerts = alerts.filter(a => a.status === 'active' || a.status === 'dispatched');
  const locationStats = alerts.reduce((acc, a) => {
    acc[a.location] = (acc[a.location] || 0) + 1;
    return acc;
  }, {});
  const topLocations = Object.entries(locationStats).sort((a,b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className={`p-8 min-h-screen transition-all duration-700 ${nightMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">COMMAND <span className="text-red-600">CENTER</span></h1>
            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">Satellite System Active</p>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setNightMode(!nightMode)} className={`px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${nightMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
                {nightMode ? '☀️ Day' : '🌙 Night'}
             </button>
             <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border ${connStatus === 'live' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'}`}>
                <span className={`w-2 h-2 rounded-full animate-ping ${connStatus === 'live' ? 'bg-green-500' : 'bg-orange-500'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">{connStatus === 'live' ? 'LIVE' : 'BACKUP'}</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Active SOS', val: activeAlerts.length, icon: '🚨', color: 'bg-red-600' },
            { label: 'Guard Units', val: '12', icon: '👮', color: 'bg-blue-600' },
            { label: 'Response', val: '2.4m', icon: '⚡', color: 'bg-emerald-600' },
            { label: 'Health', val: '100%', icon: '🛡️', color: 'bg-indigo-600' },
          ].map(s => (
            <div key={s.label} className={`rounded-[32px] p-6 border transition-all hover:scale-[1.02] ${nightMode ? 'bg-gray-900 border-gray-800 shadow-2xl' : 'bg-white border-gray-100 shadow-xl'}`}>
              <div className={`${s.color} w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4 shadow-lg shadow-black/20`}>{s.icon}</div>
              <h3 className="text-3xl font-black">{s.val}</h3>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className={`lg:col-span-2 rounded-[40px] p-8 border ${nightMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-100 shadow-xl'}`}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_12px_red]" />
                Live Incident Pipeline
              </h2>
              <Link to="/admin/alerts" className="text-[9px] font-black bg-red-600 text-white px-5 py-2.5 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-red-900/40">Open Detailed View →</Link>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="py-20 text-center animate-pulse text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Establishing secure link...</div>
              ) : activeAlerts.length === 0 ? (
                <div className="py-20 text-center opacity-30 italic font-black uppercase tracking-widest">Zone Clear • Surveillance Active</div>
              ) : (
                activeAlerts.map(alert => (
                  <div key={alert.id} className={`group flex items-center gap-5 p-5 rounded-[32px] border transition-all hover:bg-gray-800/60 ${nightMode ? 'bg-gray-800/40 border-gray-700/50 shadow-inner' : 'bg-gray-50 border-gray-200'}`}>
                     <div className={`w-1.5 h-12 rounded-full ${alert.severity === 'critical' ? 'bg-red-600 shadow-[0_0_12px_red]' : 'bg-blue-600'}`} />
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                           <p className="text-sm font-black uppercase tracking-tight truncate">{alert.message}</p>
                           <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${alert.severity === 'critical' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>{alert.severity}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">📍 {alert.location}</p>
                     </div>

                     <div className="flex items-center gap-2">
                        {alert.coordinates && (
                          <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${alert.coordinates.lat},${alert.coordinates.lng}`, '_blank')} className="w-11 h-11 bg-blue-600 hover:bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20 transition-all active:scale-90" title="Navigate to Spot">
                             🧭
                          </button>
                        )}
                        <button 
                          onClick={() => handleQuickResolve(alert.id)}
                          disabled={actionId === alert.id}
                          className="px-5 py-3 bg-green-600 hover:bg-green-500 rounded-2xl text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-green-900/20 transition-all active:scale-95 disabled:opacity-50"
                        >
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
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-8">Danger Hotspots</h3>
              <div className="space-y-6">
                {topLocations.length === 0 ? <p className="text-xs text-gray-500 italic opacity-50">No data available.</p> : topLocations.map(([loc, count]) => (
                  <div key={loc}>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                      <span>{loc}</span><span className="text-red-500">{count} Events</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                       <div className="h-full bg-red-600 transition-all duration-1000 shadow-[0_0_8px_red]" style={{ width: `${(count / Math.max(alerts.length, 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-600 rounded-[40px] p-8 text-white shadow-2xl shadow-red-900/40 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-8xl -rotate-12 group-hover:scale-110 transition-transform duration-700">🆘</div>
              <h3 className="text-xl font-black italic mb-2 tracking-tighter">BROADCAST</h3>
              <p className="text-red-100 text-[10px] font-black uppercase tracking-widest mb-8">Campus Lockdown Signal</p>
              <button className="w-full bg-white text-red-600 font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all">ACTIVATE ALARM</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
