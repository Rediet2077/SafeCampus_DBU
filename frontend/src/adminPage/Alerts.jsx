import { useState, useEffect, useRef } from "react";
import { rtdb } from "../firebase";
import { ref, onValue, update } from "firebase/database";

const SIREN_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [zoomPhoto, setZoomPhoto] = useState(null);
  const audioRef = useRef(new Audio(SIREN_SOUND));
  const spokenIds = useRef(new Set());

  const speak = (text) => {
    if (!window.speechSynthesis || !audioEnabled) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 0.85;
    msg.pitch = 1;
    window.speechSynthesis.speak(msg);
  };

  useEffect(() => {
    const alertsRef = ref(rtdb, 'alerts');
    const unsub = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const alertList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        alertList.forEach(alert => {
          if (alert.status === "active" && !spokenIds.current.has(alert.id)) {
             if (audioEnabled) {
               audioRef.current.play().catch(() => {});
               speak(`Attention! New ${alert.severity} alert. ${alert.message || 'Emergency signal'} at ${alert.location || 'DBU Campus'}`);
             }
             spokenIds.current.add(alert.id);
          }
        });

        setAlerts(alertList);
      } else {
        setAlerts([]);
      }
      setLoading(false);
    }, (error) => {
      setLoading(false);
    });
    return () => unsub();
  }, [audioEnabled]);

  const handleResolve = async (id) => {
    if (!window.confirm("Archive this incident?")) return;
    await update(ref(rtdb, `alerts/${id}`), { 
      status: "resolved", 
      resolvedAt: new Date().toISOString() 
    });
  };

  const activeAlerts = alerts.filter(a => a.status === "active" || a.status === "dispatched");
  const resolvedAlerts = alerts.filter(a => a.status === "resolved");

  return (
    <div className="p-8 bg-gray-950 min-h-screen text-white relative">
      {/* 🔍 PHOTO ZOOM MODAL */}
      {zoomPhoto && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-10 cursor-zoom-out" onClick={() => setZoomPhoto(null)}>
          <img src={zoomPhoto} alt="Evidence Zoom" className="max-w-full max-h-[85vh] rounded-[48px] shadow-[0_0_100px_rgba(255,255,255,0.1)] border border-white/10" />
          <button className="mt-8 px-12 py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl">Close High-Res Evidence</button>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Emergency <span className="text-red-600">Response</span></h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">Global Surveillance Active</p>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={async () => {
                const demoAlerts = {
                  "demo_1": { severity: "critical", message: "Armed intruder reported near Block 10", location: "Block 10 (Main Hall)", status: "active", userName: "Abebe Kebede", timestamp: Date.now() },
                  "demo_2": { severity: "medical", message: "Student collapsed with severe breathing issues", location: "Main Library", status: "active", userName: "Marta Alemu", timestamp: Date.now() - 5000 },
                  "demo_3": { severity: "help", message: "Power outage and stuck elevator", location: "Engineering Complex", status: "active", userName: "Chala Bekele", timestamp: Date.now() - 10000 },
                };
                await update(ref(rtdb, 'alerts'), demoAlerts);
              }}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
            >
              + Demo Threats
            </button>
            <button 
              onClick={() => {
                setAudioEnabled(!audioEnabled);
                audioRef.current.play().then(() => audioRef.current.pause());
              }}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${audioEnabled ? 'bg-red-600 shadow-lg shadow-red-900/40' : 'bg-gray-800'}`}
            >
              {audioEnabled ? "🔊 System Voice Live" : "🔈 Unlock Audio"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
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
                    <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mt-2">Live Node</p>
                  </div>
                  <button onClick={() => handleResolve(alert.id)} className="px-5 py-2.5 bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Close</button>
                </div>

                <h3 className="text-xl font-black uppercase italic mb-4 leading-tight">{alert.message}</h3>
                
                {alert.evidencePhoto && (
                  <div 
                    onClick={() => setZoomPhoto(alert.evidencePhoto)}
                    className="mb-6 rounded-3xl overflow-hidden border border-gray-800 shadow-inner group-hover:border-red-600/20 transition-all cursor-zoom-in relative"
                  >
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all z-10">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Click to Zoom 🔍</span>
                    </div>
                    <p className="text-[8px] font-black text-gray-500 uppercase p-3 bg-black/40">🛰️ Live Evidence Capture</p>
                    <img src={alert.evidencePhoto} alt="SOS Evidence" className="w-full h-48 object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                  </div>
                )}
                
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
                        <p className="text-[8px] text-gray-500 font-black uppercase">Incident Resolved</p>
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
