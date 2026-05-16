import { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

const SIREN_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRef = useRef(new Audio(SIREN_SOUND));
  const spokenIds = useRef(new Set());

  const speak = (text) => {
    if (!window.speechSynthesis || !audioEnabled) return;
    window.speechSynthesis.cancel(); // Clear queue
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 0.85;
    msg.pitch = 1;
    window.speechSynthesis.speak(msg);
  };

  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // 🔊 VOICE & SIREN LOGIC
      data.forEach(alert => {
        if (alert.status === "active" && !spokenIds.current.has(alert.id)) {
           if (audioEnabled) {
             audioRef.current.play().catch(() => {});
             speak(`Attention! New ${alert.severity} alert. ${alert.message || 'Emergency signal'} at ${alert.location || 'DBU Campus'}`);
           }
           spokenIds.current.add(alert.id);
        }
      });

      setAlerts(data);
      setLoading(false);
    });
    return () => unsub();
  }, [audioEnabled]);

  const handleResolve = async (id) => {
    if (!window.confirm("Archive this incident?")) return;
    await updateDoc(doc(db, "alerts", id), { 
      status: "resolved", 
      resolvedAt: new Date().toISOString() 
    });
  };

  const activeAlerts = alerts.filter(a => a.status === "active" || a.status === "dispatched");
  const resolvedAlerts = alerts.filter(a => a.status === "resolved");

  return (
    <div className="p-8 bg-gray-950 min-h-screen text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Emergency <span className="text-red-600">Response</span></h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">Global Surveillance Active</p>
          </div>
          
          <button 
            onClick={() => {
              setAudioEnabled(!audioEnabled);
              // Unlock audio for Chrome/Edge
              audioRef.current.play().then(() => audioRef.current.pause());
            }}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${audioEnabled ? 'bg-red-600 shadow-lg shadow-red-900/40' : 'bg-gray-800'}`}
          >
            {audioEnabled ? "🔊 System Voice Live" : "🔈 Unlock Audio"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* 🚨 ACTIVE INCIDENTS */}
          <div className="space-y-6">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-4">
               <span className="w-12 h-[1px] bg-gray-800" /> Active Threats
            </h2>
            {activeAlerts.map(alert => (
              <div key={alert.id} className="bg-gray-900/80 border border-gray-800 rounded-[40px] p-8 relative overflow-hidden group hover:border-red-600/30 transition-all">
                <div className={`absolute top-0 left-0 w-2 h-full ${alert.severity === 'critical' ? 'bg-red-600 animate-pulse shadow-[0_0_15px_red]' : 'bg-blue-600'}`} />
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20">{alert.severity}</span>
                    <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mt-2">{alert.timestamp?.toDate ? alert.timestamp.toDate().toLocaleString() : 'Just now'}</p>
                  </div>
                  <button onClick={() => handleResolve(alert.id)} className="px-5 py-2.5 bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Close</button>
                </div>

                <h3 className="text-xl font-black uppercase italic mb-4 leading-tight">{alert.message}</h3>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-black/30 p-4 rounded-2xl border border-gray-800">
                      <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Target Identity</p>
                      <p className="text-xs font-black text-white">{alert.userName || 'Anonymous'}</p>
                   </div>
                   <div className="bg-black/30 p-4 rounded-2xl border border-gray-800">
                      <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Location Node</p>
                      <p className="text-xs font-black text-white truncate">{alert.location || 'DBU Sector'}</p>
                   </div>
                </div>
              </div>
            ))}
          </div>

          {/* 📜 RESOLVED LOGS */}
          <div className="space-y-6 opacity-60 hover:opacity-100 transition-opacity">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-4">
               <span className="w-12 h-[1px] bg-gray-800" /> Archive Records
            </h2>
            {resolvedAlerts.slice(0, 5).map(alert => (
               <div key={alert.id} className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-green-500">✓</div>
                     <div>
                        <p className="text-[10px] font-black uppercase">{alert.message}</p>
                        <p className="text-[8px] text-gray-500 font-black uppercase">Resolved at {new Date(alert.resolvedAt).toLocaleTimeString()}</p>
                     </div>
                  </div>
                  <span className="text-[8px] font-black text-gray-600 uppercase italic">Archived</span>
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
