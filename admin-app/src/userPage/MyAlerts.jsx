import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

export default function MyAlerts() {
  const [activeTab, setActiveTab] = useState("Active");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 🛡️ SYNC ENGINE: Merges Cloud and Local Backup
    const getMergedData = (cloudData = []) => {
      const offline = JSON.parse(localStorage.getItem("offline_alerts") || "[]");
      const currentUserId = auth.currentUser?.uid || "anonymous";
      
      const myOffline = offline
        .filter(a => a.userId === currentUserId)
        .map(a => ({ 
          ...a, 
          timestamp: a.timestamp?.toDate ? a.timestamp : { toDate: () => new Date(a.timestamp) } 
        }));

      // Merge: Favor cloud data if IDs match
      const combined = [...cloudData];
      myOffline.forEach(oa => {
        const index = combined.findIndex(ca => ca.id.toString() === oa.id.toString());
        if (index === -1) combined.push(oa);
        else combined[index] = { ...combined[index], ...oa }; // Merge local status
      });

      return combined.sort((a, b) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return tB - tA;
      });
    };

    const q = query(
      collection(db, "alerts"),
      where("userId", "==", auth.currentUser?.uid || "anonymous"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAlerts(getMergedData(cloudData));
      setLoading(false);
    }, (error) => {
      setAlerts(getMergedData([]));
      setLoading(false);
    });

    // 📡 TAB-TO-TAB SYNC: Fires when Admin resolves an alert in another tab
    const handleStorageChange = () => {
       setAlerts(prev => getMergedData(prev.filter(a => !a.id.toString().includes("offline"))));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === "Active") {
      return alert.status === "active" || alert.status === "dispatched";
    }
    return alert.status === "resolved";
  });

  return (
    <div className="px-6 py-8 bg-white min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate("/user")} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl font-bold">←</button>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight italic uppercase">Alert Tracker</h1>
      </div>

      <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-10 shadow-inner">
        {["Active", "Resolved"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab 
                ? "bg-[#6B46C1] text-white shadow-lg" 
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="py-20 text-center animate-pulse text-[10px] font-black text-gray-500 uppercase tracking-widest">Syncing Grid...</div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-24 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
            <span className="text-5xl mb-6 block opacity-20">🛡️</span>
            <p className="text-gray-400 font-black text-xs uppercase tracking-widest">No {activeTab} Records</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div key={alert.id} className="bg-white border-2 border-gray-50 rounded-[32px] p-6 shadow-xl shadow-gray-200/50 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <div className={`absolute top-6 left-0 w-1.5 h-12 rounded-r-full ${alert.status === 'resolved' ? 'bg-green-500' : 'bg-red-600 shadow-[0_0_10px_red]'}`} />
              
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                  alert.status === "active" ? "bg-red-600 text-white" : 
                  alert.status === "dispatched" ? "bg-blue-600 text-white" : "bg-green-600 text-white shadow-lg shadow-green-900/20"
                }`}>
                  {alert.status}
                </span>
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                  {alert.timestamp?.toDate ? alert.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                </span>
              </div>

              <h3 className="font-black text-gray-900 text-lg mb-2 leading-tight uppercase italic">{alert.message}</h3>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-6">📍 {alert.location || 'DBU Campus'}</p>

              {alert.status === "dispatched" && (
                <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">🚓</div>
                      <div>
                         <p className="text-[8px] font-black text-blue-600 uppercase">Dispatch Unit</p>
                         <p className="text-xs font-black text-blue-900">{alert.assignedGuard || "Rapid Unit 04"}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[8px] font-black text-blue-600 uppercase">ETA</p>
                      <p className="text-xs font-black text-blue-900 animate-pulse">2:45</p>
                   </div>
                </div>
              )}

              {alert.status === "resolved" && (
                <div className="mt-4 pt-6 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">✓</div>
                    <span className="text-gray-900 font-black text-xs uppercase italic">Incident Closed</span>
                  </div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleTimeString() : ''}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
