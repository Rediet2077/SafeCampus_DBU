import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsub = onSnapshot(q, (snap) => {
      try {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const sorted = data.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setUsers(sorted);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    }, (err) => {
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 🧪 DEMO SEEDING: Quickly populate the database for the presentation
  const seedDemoData = async () => {
    const demoUsers = [
      { id: "demo1", name: "Abebe Kebede", email: "abebe@dbu.edu.et", trustScore: 95, createdAt: new Date().toISOString() },
      { id: "demo2", name: "Chala Bekele", email: "chala@dbu.edu.et", trustScore: 80, createdAt: new Date().toISOString() },
      { id: "demo3", name: "Marta Alemu", email: "marta@dbu.edu.et", trustScore: 100, createdAt: new Date().toISOString() },
    ];

    for (const user of demoUsers) {
      await setDoc(doc(db, "users", user.id), user);
    }
  };

  const updateTrust = async (userId, current) => {
    const newScore = prompt("Enter new Trust Score (0-100):", current);
    if (newScore !== null) {
      await updateDoc(doc(db, "users", userId), { trustScore: parseInt(newScore) });
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 bg-gray-950 min-h-screen text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">User <span className="text-red-600">Management</span></h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Administrative Control Center</p>
          </div>
          <div className="flex gap-4">
            <button onClick={seedDemoData} className="px-5 py-3 bg-red-600/10 border border-red-600/30 text-red-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Seed Demo Data</button>
            <div className="w-full md:w-80 relative group">
              <input 
                type="text" 
                placeholder="SEARCH STUDENTS..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-red-600 transition-all shadow-2xl"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center animate-pulse">
             <div className="w-12 h-12 border-4 border-gray-800 border-t-red-600 rounded-full animate-spin mx-auto mb-6" />
             <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Decrypting Secure Registry...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-32 text-center bg-gray-900/30 rounded-[40px] border-2 border-dashed border-gray-800 flex flex-col items-center">
             <span className="text-6xl block mb-6 opacity-20">📂</span>
             <p className="text-gray-500 font-black text-[10px] uppercase tracking-widest mb-8">Registry currently empty</p>
             <button onClick={seedDemoData} className="px-8 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-red-900/20 active:scale-95 transition-all">Initialize Demo Students</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map(user => (
              <div key={user.id} className="bg-gray-900 border border-gray-800 rounded-[32px] p-8 hover:border-red-600/30 transition-all group relative overflow-hidden shadow-xl animate-in zoom-in duration-300">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-8xl group-hover:scale-110 transition-transform -rotate-12">🎓</div>
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center text-3xl border border-red-600/20 shadow-inner">👤</div>
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-tight leading-none mb-1">{user.displayName || user.name || 'Anonymous'}</h3>
                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{user.email}</p>
                  </div>
                </div>
                <div className="space-y-3 mb-8">
                  <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-gray-800/50">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Security Trust</span>
                    <span className={`font-black text-xs ${user.trustScore > 80 ? 'text-green-500' : 'text-yellow-500'}`}>{user.trustScore || 100}%</span>
                  </div>
                </div>
                <div className="flex gap-3">
                   <button onClick={() => updateTrust(user.id, user.trustScore || 100)} className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">Trust Score</button>
                   <button onClick={() => window.confirm("Ban this user?") && deleteDoc(doc(db, "users", user.id))} className="px-5 py-4 bg-red-950/30 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-red-900/30">Ban</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
