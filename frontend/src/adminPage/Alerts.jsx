import { useState, useEffect, useRef } from "react";
import { rtdb } from "../firebase";
import { ref, onValue, update, push, get } from "firebase/database";
import { useAuth } from "../context/AuthContext";

export default function Alerts() {
  const { user: adminUser } = useAuth();
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

  const handleResolve = async (alertId, isFalseAlarm, userId) => {
    try {
      // 1. Mark alert as resolved
      await update(ref(rtdb, `alerts/${alertId}`), {
        status: "resolved",
        resolvedAt: Date.now(),
        resolvedBy: adminUser?.email || "System Admin",
        resolutionType: isFalseAlarm ? "false_alarm" : "actual_emergency"
      });
      
      // 2. Audit Log
      const logRef = ref(rtdb, 'audit_logs');
      await push(logRef, {
        action: "RESOLVE_ALERT",
        alertId,
        admin: adminUser?.email || "System Admin",
        timestamp: Date.now(),
        type: isFalseAlarm ? "FALSE_ALARM" : "ACTUAL"
      });

      // 3. Trust Score Penalty
      if (isFalseAlarm && userId && userId !== "guest_anonymous") {
        const userRef = ref(rtdb, `users/${userId}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
           const currentScore = snapshot.val().trustScore || 100;
           await update(userRef, { trustScore: Math.max(0, currentScore - 25) });
        }
      }
    } catch (err) {
      console.error("Resolution failed", err);
    }
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
                  "demo_1": { 
                    severity: "critical", 
                    message: "Armed intruder reported near Block 10", 
                    location: "Block 10 (Main Hall)", 
                    status: "active", 
                    userType: "registered",
                    userName: "Abebe Kebede", 
                    userEmail: "abebe.k@dbu.edu.et",
                    userPhone: "+251 911 223 344",
                    idCardImage: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&q=80&w=200&h=280",
                    timestamp: Date.now() 
                  },
                  "demo_2": { 
                    severity: "medical", 
                    message: "Student collapsed with severe breathing issues", 
                    location: "Main Library", 
                    status: "active", 
                    userType: "registered",
                    userName: "Marta Alemu", 
                    userEmail: "marta.a@dbu.edu.et",
                    userPhone: "+251 922 556 677",
                    idCardImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=280",
                    timestamp: Date.now() - 5000 
                  },
                  "demo_3": { 
                    severity: "help", 
                    message: "Power outage and stuck elevator", 
                    location: "Engineering Complex", 
                    status: "active", 
                    userType: "registered",
                    userName: "Chala Bekele", 
                    userEmail: "chala.b@dbu.edu.et",
                    userPhone: "+251 933 889 900",
                    idCardImage: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200&h=280",
                    timestamp: Date.now() - 10000 
                  },
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
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                   <div className="bg-black/30 p-4 rounded-2xl border border-gray-800">
                      <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Target Identity</p>
                      <p className="text-xs font-black text-white">{alert.userName || 'Anonymous'}</p>
                      {alert.userType === "registered" && <p className="text-[7px] text-green-500 font-black uppercase mt-1">✓ DBU VERIFIED</p>}
                   </div>
                   <div className="bg-black/30 p-4 rounded-2xl border border-gray-800">
                      <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Location Node</p>
                      <p className="text-xs font-black text-white truncate">{alert.location || 'DBU Sector'}</p>
                   </div>
                </div>

                {alert.userType === "registered" && (
                  <div className="bg-gray-800/20 rounded-[32px] p-6 border border-gray-800/50 mb-4">
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Verified Profile Data</p>
                     <div className="flex gap-6 items-center">
                        {alert.idCardImage && (
                          <div onClick={() => setZoomPhoto(alert.idCardImage)} className="w-20 h-28 bg-black rounded-xl overflow-hidden border border-gray-700 cursor-zoom-in group-hover:border-red-600/30 transition-all">
                             <img src={alert.idCardImage} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="space-y-3 flex-1">
                           <div className="grid grid-cols-2 gap-3">
                              <div>
                                 <p className="text-[8px] font-black text-gray-500 uppercase">University Email</p>
                                 <p className="text-[10px] font-black text-white truncate">{alert.userEmail}</p>
                              </div>
                              <div>
                                 <p className="text-[8px] font-black text-gray-500 uppercase">Emergency Phone</p>
                                 <p className="text-[10px] font-black text-red-500">{alert.userPhone}</p>
                              </div>
                           </div>
                           <div className="bg-red-600/10 border border-red-600/20 p-3 rounded-xl mt-2">
                              <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-1"><span>🏥</span> Medical Fast Response</p>
                              <div className="flex gap-4">
                                 <div>
                                    <p className="text-[7px] text-gray-400 font-bold uppercase">Blood Type</p>
                                    <p className="text-[11px] font-black text-red-400">{alert.bloodType || 'Unknown'}</p>
                                 </div>
                                 <div>
                                    <p className="text-[7px] text-gray-400 font-bold uppercase">Condition</p>
                                    <p className="text-[10px] font-black text-white">{alert.medicalConditions || 'None'}</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                {/* ⏱️ AUTO-RECORDING TIMELINE */}
                {alert.incidentTimeline && alert.incidentTimeline.length > 0 && (
                  <div className="bg-gray-950 rounded-3xl p-6 border border-gray-800 relative overflow-hidden mt-4">
                     <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span>⏱️</span> Auto-Recording Timeline</p>
                     
                     <div className="space-y-4 relative z-10">
                        {alert.incidentTimeline.map((event, index) => (
                           <div key={index} className="flex gap-4 items-start relative">
                              {index !== alert.incidentTimeline.length - 1 && (
                                <div className="absolute top-8 left-[11px] w-[2px] h-full bg-gray-800 -z-10" />
                              )}
                              <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs shadow-inner flex-shrink-0 z-10">
                                 {event.icon}
                              </div>
                              <div>
                                 <p className="text-[10px] font-bold text-white uppercase">{event.log}</p>
                                 <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mt-1">
                                    {new Date(event.time).toLocaleTimeString()}
                                 </p>
                              </div>
                           </div>
                        ))}
                     </div>
                      <div className="absolute top-0 right-0 p-4">
                         <span className="flex items-center gap-2 text-[7px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-2 py-1 rounded-full animate-pulse">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Recording Live
                         </span>
                      </div>
                   </div>
                 )}

                 {/* 🛠️ ACTION BUTTONS */}
                 <div className="flex gap-4 mt-8">
                    <button 
                       onClick={() => handleResolve(alert.id, false, alert.userId)}
                       className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-2xl text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-green-900/20"
                    >
                       Mark Resolved ✓
                    </button>
                    <button 
                       onClick={() => handleResolve(alert.id, true, alert.userId)}
                       className="flex-1 bg-gray-800 hover:bg-red-600 text-white font-black py-4 rounded-2xl text-[9px] uppercase tracking-widest transition-all"
                    >
                       False Alarm ⚠
                    </button>
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
