import { Link, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function Sidebar() {
  const location = useLocation();

  const menu = [
    { name: "Overview", path: "/", icon: "📊" },
    { name: "Live Alerts", path: "/alerts", icon: "🚨" },
    { name: "User Management", path: "/users", icon: "👥" },
    { name: "Campus Map", path: "/map", icon: "🗺️" },
    { name: "System Settings", path: "/settings", icon: "⚙️" },
  ];

  return (
    <div className="w-72 bg-gray-950 border-r border-gray-900 flex flex-col h-screen sticky top-0">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-12 cursor-pointer" onClick={() => window.location.href = "/"}>
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/40">
            <span className="text-white font-black text-xl">S</span>
          </div>
          <span className="text-white font-black text-xl tracking-tighter uppercase italic">Safe<span className="text-red-600">Campus</span></span>
        </div>

        <nav className="space-y-2">
          {menu.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
                location.pathname === item.path
                  ? "bg-red-600 text-white shadow-xl shadow-red-900/20 scale-105"
                  : "text-gray-500 hover:bg-gray-900 hover:text-white"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                {item.name}
              </span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-8 border-t border-gray-900">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-lg shadow-inner">🛡️</div>
          <div>
            <p className="text-[10px] font-black text-white uppercase">Admin Officer</p>
            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Level 5 Access</p>
          </div>
        </div>
        <button 
          onClick={() => signOut(auth)}
          className="w-full py-4 bg-gray-900 hover:bg-red-900/20 text-gray-500 hover:text-red-500 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-red-900/30"
        >
          System Logout
        </button>
      </div>
    </div>
  );
}
