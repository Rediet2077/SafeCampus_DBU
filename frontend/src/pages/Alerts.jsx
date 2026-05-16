import { useEffect, useState } from "react";
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

// Custom robust Time Ago formatter (No external dependencies)
function formatTimeAgo(date) {
  if (!date) return "just now";
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [actionId, setActionId] = useState(null);
  const [filter, setFilter] = useState("all"); // 'all', 'active', 'resolved'

  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAlerts(data);
        setLoading(false);
        setConnectionStatus("live");
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
        setConnectionStatus("error");
      }
    );

    return () => unsubscribe();
  }, []);

  // ✅ Resolve Alert
  const handleResolve = async (alertId) => {
    setActionId(alertId);
    try {
      const alertRef = doc(db, "alerts", alertId);
      await updateDoc(alertRef, { status: "resolved" });
    } catch (err) {
      console.error("Failed to resolve alert:", err);
    } finally {
      setActionId(null);
    }
  };

  // 🗑️ Delete Alert
  const handleDelete = async (alertId) => {
    if (!window.confirm("Are you sure you want to delete this alert?")) return;
    setActionId(alertId);
    try {
      await deleteDoc(doc(db, "alerts", alertId));
    } catch (err) {
      console.error("Failed to delete alert:", err);
    } finally {
      setActionId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "resolved":
        return "bg-green-500/10 text-green-400 border border-green-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border border-gray-500/20";
    }
  };

  const getSeverityBorder = (status) => {
    switch (status) {
      case "active":
        return "border-l-red-500";
      case "resolved":
        return "border-l-green-500";
      default:
        return "border-l-gray-700";
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "all") return true;
    return alert.status === filter;
  });

  const activeCount = alerts.filter((a) => a.status === "active").length;
  const resolvedCount = alerts.filter((a) => a.status === "resolved").length;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Live Alerts Feed</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <p className="text-gray-400 text-sm">Real-time emergency monitoring</p>
            <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
            {connectionStatus === "live" ? (
              <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live
              </span>
            ) : (
              <span className="text-yellow-500 text-xs font-bold uppercase">Connecting...</span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex bg-gray-900/50 p-1 rounded-xl border border-gray-800">
          {["all", "active", "resolved"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 ${
                filter === f
                  ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total", count: alerts.length, color: "text-blue-400" },
          { label: "Active", count: activeCount, color: "text-red-400" },
          { label: "Resolved", count: resolvedCount, color: "text-green-400" },
          {
            label: "Filtered",
            count: filteredAlerts.length,
            color: "text-gray-400",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-gray-900/40 border border-gray-800/60 rounded-2xl p-4 flex flex-col items-center justify-center"
          >
            <span className={`text-2xl font-black ${s.color}`}>{s.count}</span>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mt-1">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 text-sm animate-pulse">Syncing with Command Center...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-gray-900/30 border-2 border-dashed border-gray-800 rounded-3xl p-16 text-center">
          <div className="text-5xl mb-6 grayscale opacity-50">🔔</div>
          <h2 className="text-xl font-bold text-gray-300">No {filter !== 'all' ? filter : ''} alerts found</h2>
          <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
            {filter === "all"
              ? "The campus is currently safe. No emergency reports have been filed."
              : `There are currently no alerts with the status "${filter}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`group bg-gray-900 border border-gray-800 border-l-4 ${getSeverityBorder(
                alert.status
              )} rounded-2xl p-6 hover:bg-gray-800/40 transition-all duration-300 hover:shadow-xl hover:shadow-black/40`}
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md ${getStatusBadge(
                        alert.status
                      )}`}
                    >
                      {alert.status}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {alert.timestamp
                        ? formatTimeAgo(alert.timestamp.toDate())
                        : "just now"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-red-400 transition-colors">
                    {alert.message}
                  </h3>
                  {alert.location && (
                    <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                      <span className="text-red-500/60">📍</span>
                      {alert.location}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="flex gap-2">
                    {alert.status === "active" && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        disabled={actionId === alert.id}
                        className="h-10 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                      >
                        {actionId === alert.id ? "..." : "Resolve"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(alert.id)}
                      disabled={actionId === alert.id}
                      className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-800 hover:bg-red-600/20 hover:text-red-500 text-gray-400 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
