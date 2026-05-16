import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default function Settings() {
  const { user } = useAuth();

  const [preferences, setPreferences] = useState({
    notifications: localStorage.getItem('safecampus_notifications') !== 'false',
    sound: localStorage.getItem('safecampus_sound') === 'true',
    autoArchive: localStorage.getItem('safecampus_archive') !== 'false'
  });
  const [resetMsg, setResetMsg] = useState("");

  const togglePreference = (key) => {
    setPreferences(prev => {
      const newState = { ...prev, [key]: !prev[key] };
      localStorage.setItem(`safecampus_${key}`, newState[key].toString());
      return newState;
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white tracking-tight">System Settings</h1>
        <p className="text-gray-400 mt-1 text-sm">Manage your account and command center preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            👤 Administrator Profile
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Account Email</label>
                <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-300 text-sm">
                  {user === undefined ? "Loading..." : user?.email || "No Email Associated"}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Access Level</label>
                <div className="bg-gray-800/50 border border-red-900/30 rounded-xl px-4 py-3 text-red-400 text-sm font-bold">
                  Full Administrative Access
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Preferences */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            ⚙️ Dashboard Preferences
          </h2>
          
          <div className="space-y-4">
            {[
              { id: 'notifications', label: "Real-time Notifications", desc: "Show desktop popups when new alerts arrive" },
              { id: 'sound', label: "Notification Sound", desc: "Play a beep when an active alert is received" },
              { id: 'autoArchive', label: "Auto-Archive", desc: "Move resolved alerts to history after 24 hours" },
            ].map((pref) => (
              <div key={pref.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-800/30 border border-gray-700/50">
                <div>
                  <p className="text-sm font-bold text-white">{pref.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{pref.desc}</p>
                </div>
                <button 
                  onClick={() => togglePreference(pref.id)}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-200 focus:outline-none ${preferences[pref.id] ? 'bg-red-600' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-md ${preferences[pref.id] ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl border-b-red-900/20">
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            🔐 Security
          </h2>
          <p className="text-gray-500 text-xs mb-6">Security protocols for the command center.</p>
          
          <button 
            onClick={async () => {
              if (!user?.email) return;
              try {
                await sendPasswordResetEmail(auth, user.email);
                setResetMsg("Reset email sent! Please check your inbox.");
              } catch (e) {
                setResetMsg("Failed to send reset email.");
              }
            }}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-xl transition-all active:scale-95 border border-gray-700"
          >
            Send Password Reset
          </button>
          {resetMsg && <p className="text-[10px] font-black uppercase text-red-500 mt-4 tracking-widest">{resetMsg}</p>}
        </div>
      </div>

      {/* Version Info */}
      <div className="mt-12 text-center">
        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.2em]">SafeCampus Admin Engine v1.0.4</p>
      </div>
    </div>
  );
}
