import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, rtdb } from "../firebase";
import { ref, onValue, query, limitToLast } from "firebase/database";

export default function UserDashboard() {
  const [activeAlert, setActiveAlert] = useState(null);
  const [circleAlerts, setCircleAlerts] = useState([]);
  const [userName, setUserName] = useState("Student");
  const [safetyStatus, setSafetyStatus] = useState({ level: "Secure", color: "green", message: "All campus sectors are currently under normal surveillance." });
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.currentUser) {
      setUserName(auth.currentUser.displayName || "Student");
    }

    // 📡 LATEST SAFETY BROADCAST (From Admin - RTDB)
    const safetyRef = ref(rtdb, 'system_status/current');
    const unsubSafety = onValue(safetyRef, (snap) => {
      const data = snap.val();
      if (data) setSafetyStatus(data);
    });

    // 🚨 ALERT SYNC (Personal & Trusted Circle)
    const alertsRef = ref(rtdb, 'alerts');
    const unsubAlert = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allAlerts = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        
        // 1. My personal active alerts
        const myActive = allAlerts.find(a => a.userId === auth.currentUser?.uid && (a.status === "active" || a.status === "dispatched"));
        setActiveAlert(myActive || null);

        // 2. Trusted Circle alerts (People who added ME to their circle)
        const myEmail = auth.currentUser?.email?.toLowerCase();
        const circleActive = allAlerts.filter(a => 
          a.userId !== auth.currentUser?.uid && 
          a.trustedCircle?.some(email => email.toLowerCase() === myEmail) &&
          (a.status === "active" || a.status === "dispatched")
        );
        setCircleAlerts(circleActive);
      } else {
        setActiveAlert(null);
        setCircleAlerts([]);
      }
    });

    return () => { unsubSafety(); unsubAlert(); };
  }, []);

  return (
    <div className="px-6 py-10 bg-white min-h-screen font-sans">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase leading-none">
          Welcome back, <br /><span className="text-red-600">{userName}</span>
        </h1>
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-3">Identity Verified • DBU Secure Grid</p>
      </div>

      {/* 🛡️ NEW BENEFIT: LIVE CAMPUS SAFETY STATUS */}
      <div className={`p-8 rounded-[40px] border-2 transition-all duration-500 mb-6 ${safetyStatus.level === 'Critical' ? 'bg-red-50 border-red-200 shadow-xl shadow-red-900/10' : 'bg-gray-50 border-gray-100'}`}>
         <div className="flex justify-between items-start mb-6">
            <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${safetyStatus.level === 'Critical' ? 'bg-red-600 text-white animate-pulse' : 'bg-green-600 text-white'}`}>
               Campus Status: {safetyStatus.level}
            </div>
            <span className="text-2xl">{safetyStatus.level === 'Critical' ? '⚠️' : '🛡️'}</span>
         </div>
         <h3 className={`text-xl font-black uppercase italic mb-2 ${safetyStatus.level === 'Critical' ? 'text-red-900' : 'text-gray-900'}`}>{safetyStatus.message}</h3>
         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {safetyStatus.level === 'Critical' ? '📧 Email notification sent to your registered address' : 'Normal surveillance active in all sectors'}
         </p>
      </div>

      {/* 🛰️ CIRCLE INTELLIGENCE: NOTIFICATIONS FROM FRIENDS */}
      {circleAlerts.length > 0 && (
        <div className="mb-8 space-y-4">
           <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] px-4">Circle Intelligence Live</p>
           {circleAlerts.map(alert => (
             <div key={alert.id} className="bg-blue-600 p-8 rounded-[40px] shadow-2xl shadow-blue-900/20 border-4 border-blue-200 flex flex-col gap-4 animate-in zoom-in duration-300">
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-blue-900/30">🤝</div>
                      <div>
                         <p className="text-white font-black text-xs uppercase italic tracking-tight">{alert.userName} in Distress</p>
                         <p className="text-blue-200 text-[8px] font-black uppercase tracking-widest">At {alert.location}</p>
                      </div>
                   </div>
                   <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${alert.coordinates?.lat},${alert.coordinates?.lng}`, '_blank')} className="px-5 py-2.5 bg-white text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl">Locate Friend</button>
                </div>
                <div className="bg-blue-700/50 p-4 rounded-2xl border border-blue-400/20">
                   <p className="text-white/80 text-[10px] font-bold italic leading-relaxed">"{alert.message}"</p>
                </div>
             </div>
           ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 mb-12">
        <Link 
          to="/user/send-alert" 
          className="bg-red-600 p-10 rounded-[48px] shadow-2xl shadow-red-900/30 flex flex-col items-center justify-center group hover:scale-[1.02] transition-all border-8 border-red-100"
        >
          <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">🆘</span>
          <span className="text-white font-black text-2xl uppercase tracking-tighter italic">Trigger SOS</span>
          <span className="text-white/60 font-bold text-[10px] uppercase mt-2 tracking-[0.2em]">Press in immediate danger</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/user/alerts" className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 flex flex-col items-center gap-3">
          <span className="text-2xl">📡</span>
          <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest text-center">Alert Tracker</span>
        </Link>
        <Link to="/user/tips" className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 flex flex-col items-center gap-3">
          <span className="text-2xl">💡</span>
          <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest text-center">Safety Tips</span>
        </Link>
      </div>

      {activeAlert && (
        <div className="fixed bottom-6 left-6 right-6 bg-red-600 text-white p-6 rounded-[32px] shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-10 z-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-ping">🚨</div>
            <div>
               <p className="font-black text-sm uppercase italic">Alert Broadcast Active</p>
               <p className="text-[9px] font-bold uppercase opacity-80">Unit Response: {activeAlert.status}</p>
            </div>
          </div>
          <button onClick={() => navigate("/user/alerts")} className="bg-white text-red-600 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase">Monitor</button>
        </div>
      )}

      {/* 🛰️ SATELLITE SYNC STATUS */}
      {localStorage.getItem("satellite_pings") && JSON.parse(localStorage.getItem("satellite_pings")).length > 0 && (
        <div className="fixed bottom-6 left-6 right-6 bg-orange-600 text-white p-6 rounded-[32px] shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-10 z-[60]">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse text-xl">🛰️</div>
              <div>
                 <p className="font-black text-sm uppercase italic">Satellite Link Pending</p>
                 <p className="text-[9px] font-bold uppercase opacity-80">Scanning for Orbital Uplink... ({JSON.parse(localStorage.getItem("satellite_pings")).length} Cached)</p>
              </div>
           </div>
           <button 
             onClick={async () => {
                const pings = JSON.parse(localStorage.getItem("satellite_pings") || "[]");
                try {
                   for (const ping of pings) {
                      const newRef = push(ref(rtdb, 'alerts'));
                      await set(newRef, { ...ping, id: newRef.key, isSatellitePing: false, status: 'active' });
                   }
                   localStorage.removeItem("satellite_pings");
                   alert("🚀 SATELLITE UPLINK SUCCESSFUL! Signals transmitted to DBU Command.");
                   window.location.reload();
                } catch(e) { alert("Link unstable. Still scanning..."); }
             }}
             className="bg-white text-orange-600 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase"
           >
             Manual Uplink
           </button>
        </div>
      )}
    </div>
  );
}
