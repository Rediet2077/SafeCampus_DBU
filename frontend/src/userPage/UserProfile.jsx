import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

export default function UserProfile() {
  const { user, logout } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [trustedCircle, setTrustedCircle] = useState([]);
  const [newContact, setNewContact] = useState("");
  const [newFriend, setNewFriend] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.uid) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setContacts(data.emergencyContacts || []);
        setTrustedCircle(data.trustedCircle || []);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.trim() || !user?.uid) return;
    setLoading(true);
    try {
      const updatedContacts = [...contacts, newContact.trim()];
      await setDoc(doc(db, "users", user.uid), { emergencyContacts: updatedContacts }, { merge: true });
      setContacts(updatedContacts);
      setNewContact("");
    } catch (err) { alert("Failed to add contact."); }
    finally { setLoading(false); }
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!newFriend.trim() || !user?.uid) return;
    setLoading(true);
    try {
      const updatedCircle = [...trustedCircle, newFriend.trim().toLowerCase()];
      await setDoc(doc(db, "users", user.uid), { trustedCircle: updatedCircle }, { merge: true });
      setTrustedCircle(updatedCircle);
      setNewFriend("");
    } catch (err) { alert("Failed to add friend."); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="px-6 py-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate("/user")} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm transition-all active:scale-90">←</button>
        <h1 className="text-xl font-black text-gray-900 uppercase italic">Security <span className="text-red-600">Profile</span></h1>
      </div>

      <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm text-center mb-8">
        <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 border border-purple-200 shadow-inner">👤</div>
        <h2 className="text-xl font-black text-gray-900 uppercase italic">{user?.displayName || "Student User"}</h2>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">{user?.email}</p>
      </div>

      {/* 🛡️ TRUSTED CIRCLE SECTION */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-2">
           <h3 className="font-black text-xs text-gray-900 uppercase italic flex items-center gap-2">🛡️ Trusted Circle</h3>
           <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-black uppercase">{trustedCircle.length} Active</span>
        </div>
        <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm">
           <p className="text-[10px] text-gray-400 font-bold uppercase mb-4 px-1">Friends who receive live updates during your SOS</p>
           <div className="space-y-2 mb-6">
              {trustedCircle.map((email, i) => (
                <div key={i} className="flex items-center justify-between bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50">
                   <span className="text-xs font-black text-blue-900">{email}</span>
                   <button onClick={async () => {
                      const updated = trustedCircle.filter((_, idx) => idx !== i);
                      await setDoc(doc(db, "users", user.uid), { trustedCircle: updated }, { merge: true });
                      setTrustedCircle(updated);
                   }} className="text-red-500 font-black text-[10px] uppercase">Remove</button>
                </div>
              ))}
           </div>
           <form onSubmit={handleAddFriend} className="flex gap-2">
              <input type="email" placeholder="friend@dbu.edu.et" value={newFriend} onChange={(e) => setNewFriend(e.target.value)} className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:border-blue-500 transition-all" />
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-100">Add</button>
           </form>
        </div>
      </div>

      {/* 📞 EMERGENCY CONTACTS */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="font-black text-xs text-gray-900 uppercase italic flex items-center gap-2">📞 Family Contacts</h3>
          <span className="text-[10px] bg-red-50 text-red-600 px-3 py-1 rounded-full font-black uppercase">{contacts.length} Linked</span>
        </div>
        <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm">
           <div className="space-y-2 mb-6">
              {contacts.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-red-50/30 p-4 rounded-2xl border border-red-100/50">
                   <span className="text-xs font-black text-red-900">{c}</span>
                   <button onClick={async () => {
                      const updated = contacts.filter((_, idx) => idx !== i);
                      await setDoc(doc(db, "users", user.uid), { emergencyContacts: updated }, { merge: true });
                      setContacts(updated);
                   }} className="text-red-500 font-black text-[10px] uppercase">Remove</button>
                </div>
              ))}
           </div>
           <form onSubmit={handleAddContact} className="flex gap-2">
              <input type="text" placeholder="+251..." value={newContact} onChange={(e) => setNewContact(e.target.value)} className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:border-red-500 transition-all" />
              <button type="submit" disabled={loading} className="bg-red-600 text-white px-6 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-red-100">Add</button>
           </form>
        </div>
      </div>

      <button onClick={handleLogout} className="w-full flex items-center justify-between p-6 bg-red-600 text-white rounded-[32px] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-red-100">
        <span>Terminate Security Session</span>
        <span>→</span>
      </button>
    </div>
  );
}
