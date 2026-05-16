import { useEffect, useState } from "react";
import { rtdb } from "../firebase";
import { ref, onValue, set, remove, update } from "firebase/database";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sendingId, setSendingId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const usersRef = ref(rtdb, 'users');
    const unsub = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setUsers(userList.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
      } else {
        setUsers([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const sendNotification = async (user) => {
    const msg = prompt(`Send personal alert to ${user.name || user.displayName}:`, "SAFETY ALERT: Please report to the administration office.");
    if (!msg) return;
    setSendingId(user.id);
    try {
      await set(ref(rtdb, 'system_status/current'), {
        level: "High",
        message: `DIRECT ALERT for ${user.displayName}: ${msg}`,
        timestamp: new Date().toISOString()
      });
      await fetch('http://localhost:5000/send-individual-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: user.email, message: msg, userName: user.name || user.displayName })
      });
      alert(`✅ Personal Security Alert sent to ${user.email}`);
    } catch(e) { alert("Failed: " + e.message); }
    finally { setSendingId(null); }
  };

  const broadcastAlert = async () => {
    const msg = prompt("🚨 BROADCAST EMERGENCY ALERT TO ALL STUDENTS:", "CRITICAL SAFETY ALERT: Please remain indoors and await further instructions.");
    if (!msg) return;
    setLoading(true);
    const emails = users.filter(u => u.role !== "admin").map(u => u.email).filter(e => e);
    try {
      await set(ref(rtdb, 'system_status/current'), { level: "Critical", message: msg, timestamp: new Date().toISOString() });
      await fetch('http://localhost:5000/broadcast-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, message: msg })
      });
      alert(`🚨 BROADCAST SUCCESSFUL!`);
    } catch(e) { alert("Broadcast Error: " + e.message); }
    finally { setLoading(false); }
  };

  const seedDemoData = async () => {
    const demoUsers = {
      "demo_abebe": { name: "Abebe Kebede", displayName: "Abebe Kebede", email: "abebe@dbu.edu.et", trustScore: 95, emergencyContacts: ["+251 911 223 344"], idCardImage: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&q=80&w=400&h=560", createdAt: new Date().toISOString() },
      "demo_chala": { name: "Chala Bekele", displayName: "Chala Bekele", email: "chala@dbu.edu.et", trustScore: 80, emergencyContacts: ["+251 922 556 677"], idCardImage: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400&h=560", createdAt: new Date().toISOString() },
      "demo_marta": { name: "Marta Alemu", displayName: "Marta Alemu", email: "marta@dbu.edu.et", trustScore: 100, emergencyContacts: ["+251 933 889 900"], idCardImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400&h=560", createdAt: new Date().toISOString() },
    };
    await update(ref(rtdb, 'users'), demoUsers);
  };

  const studentUsers = users.filter(u => u.role !== "admin").filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.displayName || u.name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s);
  });

  return (
    <div className="p-8 bg-gray-950 min-h-screen text-white relative">
      {selectedUser && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-gray-900 border border-gray-800 w-full max-w-4xl rounded-[48px] overflow-hidden flex flex-col md:flex-row shadow-2xl relative">
              <button onClick={() => setSelectedUser(null)} className="absolute top-8 right-8 w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-xl font-black z-10">×</button>
              <div className="w-full md:w-1/2 bg-black flex flex-col items-center justify-center p-12 border-r border-gray-800">
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 italic">Official ID Scan</p>
                 <div className="relative group w-full max-w-[300px] aspect-[1/1.4] rounded-3xl overflow-hidden border-2 border-gray-800 shadow-2xl">
                    {selectedUser.idCardImage ? (
                      <img src={selectedUser.idCardImage} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-700 text-xs font-black uppercase italic">No ID Captured</div>
                    )}
                 </div>
              </div>
              <div className="w-full md:w-1/2 p-12 overflow-y-auto">
                 <div className="mb-10">
                    <h2 className="text-3xl font-black uppercase italic mb-2">{selectedUser.name || selectedUser.displayName}</h2>
                    <p className="text-sm font-black text-red-600 uppercase tracking-widest">{selectedUser.email}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="bg-gray-800/40 p-5 rounded-3xl border border-gray-800">
                       <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Trust</p>
                       <p className="text-xl font-black text-green-500">{selectedUser.trustScore || 100}%</p>
                    </div>
                 </div>
                 <div className="space-y-6">
                    <div>
                       <p className="text-[9px] font-black text-gray-500 uppercase mb-3">Emergency Phone</p>
                       <div className="bg-black/40 p-5 rounded-3xl border border-gray-800 flex items-center justify-between">
                          <span className="text-xs font-black">{selectedUser.emergencyContacts?.[0] || 'N/A'}</span>
                       </div>
                    </div>
                 </div>
                 <div className="mt-12 pt-10 border-t border-gray-800">
                    <button onClick={() => sendNotification(selectedUser)} className="w-full bg-red-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Send Direct Alert</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">User <span className="text-red-600">Management</span></h1>
          <div className="flex gap-3">
            <button onClick={broadcastAlert} className="px-5 py-3 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">Broadcast to All</button>
            <button onClick={seedDemoData} className="px-4 py-3 bg-gray-800 text-gray-400 rounded-2xl text-[9px] font-black uppercase">+ Demo</button>
            <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56 bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3 text-[10px] font-black uppercase" />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center animate-pulse uppercase font-black text-[10px] text-gray-500">Syncing Grid...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {studentUsers.map(user => (
              <div key={user.id} onClick={() => setSelectedUser(user)} className="bg-gray-900 border border-gray-800 rounded-[28px] p-6 hover:border-red-600/30 transition-all cursor-pointer group">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 bg-red-600/10 rounded-xl flex items-center justify-center text-xl font-black border border-red-600/20 group-hover:bg-red-600 group-hover:text-white transition-all">
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
                    <span className="font-black text-[10px] text-green-500">{user.trustScore || 100}%</span>
                  </div>
                  <div className="flex justify-between bg-black/30 p-3 rounded-xl border border-gray-800/50">
                    <span className="text-[9px] font-black text-gray-500 uppercase">ID Status</span>
                    <span className="text-[10px] font-black text-gray-400">{user.idCardImage ? '✓ Captured' : '× Missing'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={(e) => { e.stopPropagation(); sendNotification(user); }} className="flex-1 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[9px] font-black uppercase transition-all">Alert</button>
                   <button onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-[9px] font-black uppercase transition-all">Profile</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
