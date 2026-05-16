import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

export default function UserProfile() {
  const { user, logout } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.uid) {
      fetchContacts();
    }
  }, [user]);

  const fetchContacts = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setContacts(userDoc.data().emergencyContacts || []);
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.trim() || !user?.uid) return;

    setLoading(true);
    try {
      const updatedContacts = [...contacts, newContact.trim()];
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        emergencyContacts: updatedContacts
      }, { merge: true });
      
      setContacts(updatedContacts);
      setNewContact("");
    } catch (err) {
      console.error("Error adding contact:", err);
      alert("Failed to add contact.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate("/user")} className="text-2xl">←</button>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm text-center mb-8">
        <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border-4 border-purple-50">
          👤
        </div>
        <h2 className="text-lg font-bold text-gray-900">{user?.displayName || "Student User"}</h2>
        <p className="text-gray-500 text-xs mb-4">{user?.email}</p>
        
        <div className="flex justify-center gap-3">
          <div className="bg-gray-50 px-4 py-2 rounded-2xl flex-1">
            <span className="block text-[8px] uppercase text-gray-400 font-bold tracking-widest">ID</span>
            <span className="text-xs font-bold text-gray-700">#STU_2024</span>
          </div>
          <div className="bg-gray-50 px-4 py-2 rounded-2xl flex-1">
            <span className="block text-[8px] uppercase text-gray-400 font-bold tracking-widest">Status</span>
            <span className="text-xs font-bold text-green-600">Verified</span>
          </div>
        </div>
      </div>

      {/* Emergency Contacts Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <span>📞</span> Emergency Contacts
          </h3>
          <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-full font-bold">
            {contacts.length} Added
          </span>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
          {contacts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4 italic">No contacts added yet.</p>
          ) : (
            <div className="space-y-2">
              {contacts.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <span className="text-sm font-bold text-gray-700">{c}</span>
                  <button className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddContact} className="flex gap-2">
            <input 
              type="text" 
              placeholder="+2519..."
              value={newContact}
              onChange={(e) => setNewContact(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
            <button 
              type="submit"
              disabled={loading}
              className="bg-[#6B46C1] text-white px-4 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-purple-100 disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-3">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-5 bg-red-50 text-red-600 rounded-2xl font-bold transition-all hover:bg-red-100"
        >
          <div className="flex items-center gap-3">
            <span>🚪</span>
            <span>Sign Out</span>
          </div>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
