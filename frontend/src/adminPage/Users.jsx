import { useEffect, useState } from "react";
import { rtdb } from "../firebase";
import { ref, onValue, set, remove, update } from "firebase/database";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    // 🔄 Sync with Realtime Database (FREE & INSTANT)
    const usersRef = ref(rtdb, 'users');
    const unsub = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setUsers(userList.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
      } else {
        setUsers([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("RTDB Error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const sendNotification = async (user) => {
    const msg = prompt(`Send personal alert to ${user.name || user.displayName}:`, "SAFETY ALERT: Please report to the administration office.");
    if (!msg) return;
    setSendingId(user.id);
    try {
      // 1. Update Realtime Database for in-app alert (Global dashboard for visibility)
      await set(ref(rtdb, 'system_status/current'), {
        level: "High",
        message: `DIRECT ALERT for ${user.displayName}: ${msg}`,
        timestamp: new Date().toISOString()
      });

      // 2. Send individual security email via backend
      await fetch('http://localhost:5000/send-individual-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          toEmail: user.email, 
          message: msg,
          userName: user.name || user.displayName 
        })
      });

      alert(`✅ Personal Security Alert sent to ${user.email}`);
    } catch(e) { alert("Failed: " + e.message); }
    finally { setSendingId(null); }
  };

  const broadcastAlert = async () => {
    const msg = prompt("🚨 BROADCAST EMERGENCY ALERT TO ALL STUDENTS:", "CRITICAL SAFETY ALERT: Please remain indoors and await further instructions.");
    if (!msg) return;
    
    setLoading(true);
    const emails = studentUsers.map(u => u.email).filter(e => e);
    
    try {
      // 1. Update Global Dashboard
      await set(ref(rtdb, 'system_status/current'), {
        level: "Critical",
        message: msg,
        timestamp: new Date().toISOString()
      });

      // 2. Call Broadcast Email Backend
      const res = await fetch('http://localhost:5000/broadcast-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, message: msg })
      });

      if (res.ok) {
        alert(`🚨 BROADCAST SUCCESSFUL!\nEmergency alert sent to ${emails.length} students via email and dashboard.`);
      } else {
        throw new Error("Broadcast failed at server");
      }
    } catch(e) {
      alert("Broadcast Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const seedDemoData = async () => {
    const demoUsers = {
      "demo_abebe": { name: "Abebe Kebede", displayName: "Abebe Kebede", email: "abebe@dbu.edu.et", trustScore: 95, createdAt: new Date().toISOString() },
      "demo_chala": { name: "Chala Bekele", displayName: "Chala Bekele", email: "chala@dbu.edu.et", trustScore: 80, createdAt: new Date().toISOString() },
      "demo_marta": { name: "Marta Alemu", displayName: "Marta Alemu", email: "marta@dbu.edu.et", trustScore: 100, createdAt: new Date().toISOString() },
    };
    await update(ref(rtdb, 'users'), demoUsers);
    alert("Demo students added!");
  };

  const studentUsers = users.filter(u => u.role !== "admin").filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.displayName || u.name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s);
  });

  return (
    <div className="p-8 bg-gray-950 min-h-screen text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">User <span className="text-red-600">Management</span></h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">{studentUsers.length} registered student{studentUsers.length !== 1 ? 's' : ''} • Realtime Data</p>
          </div>
          <div className="flex gap-3">
            <button onClick={broadcastAlert} className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-900/20 transition-all flex items-center gap-2">
              <span className="animate-pulse text-lg">🚨</span> Broadcast to All
            </button>
            <button onClick={seedDemoData} className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">+ Demo</button>
            <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56 bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3 text-[10px] font-black uppercase outline-none focus:border-red-600" />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-gray-800 border-t-red-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[10px] font-black text-gray-500 uppercase">Syncing...</p>
          </div>
        ) : studentUsers.length === 0 ? (
          <div className="py-20 text-center bg-gray-900/30 rounded-[40px] border-2 border-dashed border-gray-800">
            <span className="text-5xl block mb-4 opacity-20">👥</span>
            <p className="text-gray-500 font-black text-xs uppercase mb-2">No students yet</p>
            <p className="text-gray-600 text-[10px] mb-6">Realtime Database is connected but empty.</p>
            <button onClick={seedDemoData} className="px-6 py-3 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase active:scale-95 transition-all">Add Demo Students</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {studentUsers.map(user => (
              <div key={user.id} className="bg-gray-900 border border-gray-800 rounded-[28px] p-6 hover:border-red-600/30 transition-all">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 bg-red-600/10 rounded-xl flex items-center justify-center text-xl font-black border border-red-600/20">
                    {(user.displayName || user.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm uppercase truncate">{user.displayName || user.name || 'Unknown'}</h3>
                    <p className="text-[9px] text-gray-500 font-black uppercase truncate">{user.email}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-5">
                  <div className="flex justify-between bg-black/30 p-3 rounded-xl border border-gray-800/50">
                    <span className="text-[9px] font-black text-gray-500 uppercase">Trust</span>
                    <span className={`font-black text-[10px] ${(user.trustScore||100) > 80 ? 'text-green-500' : 'text-yellow-500'}`}>{user.trustScore || 100}%</span>
                  </div>
                  <div className="flex justify-between bg-black/30 p-3 rounded-xl border border-gray-800/50">
                    <span className="text-[9px] font-black text-gray-500 uppercase">Phone</span>
                    <span className="text-[10px] font-black text-gray-400">{user.emergencyContacts?.[0] || 'N/A'}</span>
                  </div>
                </div>
                <button onClick={() => sendNotification(user)} disabled={sendingId === user.id} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[9px] font-black uppercase mb-2 active:scale-95 transition-all">
                  {sendingId === user.id ? "Sending..." : "📧 Send Alert"}
                </button>
                <div className="flex gap-2">
                  <button onClick={() => { const s = prompt("Trust Score (0-100):", user.trustScore||100); if(s) update(ref(rtdb,"users/"+user.id),{trustScore:parseInt(s)}); }} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-[9px] font-black uppercase transition-all">Score</button>
                  <button onClick={() => window.confirm("Ban?") && remove(ref(rtdb,"users/"+user.id))} className="px-3 py-2 bg-red-950/30 text-red-500 hover:bg-red-600 hover:text-white rounded-lg text-[9px] font-black uppercase transition-all">Ban</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
