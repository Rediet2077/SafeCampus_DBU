import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const activeCount = alerts.filter((a) => a.status === "active").length;
  const resolvedCount = alerts.filter((a) => a.status === "resolved").length;
  const pendingCount = alerts.filter((a) => a.status === "pending").length;

  const stats = [
    {
      label: "Total Alerts",
      value: alerts.length,
      icon: "📋",
      color: "from-blue-600 to-indigo-600",
      shadow: "shadow-blue-900/20",
    },
    {
      label: "Active Emergency",
      value: activeCount,
      icon: "🚨",
      color: "from-red-600 to-rose-600",
      shadow: "shadow-red-900/30",
    },
    {
      label: "Resolved",
      value: resolvedCount,
      icon: "✅",
      color: "from-emerald-600 to-teal-600",
      shadow: "shadow-emerald-900/20",
    },
    {
      label: "System Health",
      value: "100%",
      icon: "🛡️",
      color: "from-gray-700 to-gray-800",
      shadow: "shadow-black/20",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          System <span className="text-red-600">Overview</span>
        </h1>
        <p className="text-gray-400 mt-2 text-base max-w-2xl">
          Welcome back to the SafeCampus Command Center. Monitoring all campus security protocols and emergency response units.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`relative overflow-hidden bg-gray-900 border border-gray-800 rounded-3xl p-6 hover:border-gray-700 transition-all duration-300 group ${stat.shadow} hover:shadow-2xl`}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`} />
            
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl shadow-lg`}>
                {stat.icon}
              </div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Updates</div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-4xl font-black text-white mb-1">{stat.value}</span>
              <span className="text-sm font-semibold text-gray-400">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Recent Alerts + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Alerts Feed */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-3xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              Recent Incident Feed
            </h2>
            <Link to="/alerts" className="text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-wider transition-colors">
              View All Feed →
            </Link>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="py-10 text-center text-gray-500 animate-pulse text-sm">Syncing feed...</div>
            ) : alerts.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-gray-500 text-sm italic">"No active incidents reported."</p>
              </div>
            ) : (
              alerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60 transition-colors">
                   <div className={`w-2 h-10 rounded-full ${alert.status === 'active' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                   <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{alert.location || 'Unknown Location'}</p>
                   </div>
                   <div className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${alert.status === 'active' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                      {alert.status}
                   </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Command Center */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-3xl p-6 text-white shadow-xl shadow-red-900/20">
            <h3 className="text-lg font-bold mb-2">Emergency Hub</h3>
            <p className="text-red-100 text-sm mb-6 leading-relaxed">Instantly access the campus map or broadcast a mass emergency notification.</p>
            <div className="grid grid-cols-2 gap-3">
               <Link to="/map" className="bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95">
                  <span className="text-xl">🗺️</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide">Map view</span>
               </Link>
               <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95">
                  <span className="text-xl">📢</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide">Broadcast</span>
               </button>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">System Nodes</h3>
            <div className="space-y-4">
               {[
                 { label: 'Firebase Cloud', status: 'Active', color: 'bg-green-500' },
                 { label: 'Push Engine', status: 'Standby', color: 'bg-blue-500' },
                 { label: 'Auth Guard', status: 'Encrypted', color: 'bg-emerald-500' },
               ].map(node => (
                 <div key={node.label} className="flex items-center justify-between">
                    <span className="text-gray-300 text-xs font-medium">{node.label}</span>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-gray-500 uppercase">{node.status}</span>
                       <div className={`w-1.5 h-1.5 rounded-full ${node.color} shadow-[0_0_8px] shadow-current`}></div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
