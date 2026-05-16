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
    const q = query(
      collection(db, "alerts"),
      where("userId", "==", auth.currentUser?.uid || "anonymous"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAlerts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredAlerts = alerts.filter(alert => 
    activeTab === "Active" ? alert.status === "active" : alert.status === "resolved"
  );

  return (
    <div className="px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate("/user")} className="text-2xl">←</button>
        <h1 className="text-2xl font-bold text-gray-900">My Alerts</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-8">
        {["Active", "Resolved"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 rounded-[14px] text-sm font-bold transition-all ${
              activeTab === tab 
                ? "bg-[#6B46C1] text-white shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <span className="text-4xl mb-4 block opacity-20">📋</span>
            <p className="text-gray-400 font-medium">No {activeTab.toLowerCase()} alerts found</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div key={alert.id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${activeTab === "Active" ? "bg-red-500" : "bg-green-500"}`} />
              
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                  activeTab === "Active" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                }`}>
                  {alert.type || "General Alert"}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {alert.timestamp?.toDate ? new Date(alert.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                </span>
              </div>

              <h3 className="font-bold text-gray-900 mb-1">{alert.message}</h3>
              
              <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-3">
                <span>📍</span>
                <span>{alert.location}</span>
              </div>

              {alert.status === "resolved" && (
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-[10px]">✓</div>
                    <span className="text-green-600 font-bold text-[10px]">Resolved by Admin</span>
                  </div>
                  <span className="text-[10px] text-gray-400 italic">
                    {alert.resolvedAt?.toDate ? new Date(alert.resolvedAt.toDate()).toLocaleTimeString() : ""}
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
