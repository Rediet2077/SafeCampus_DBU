import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", icon: "🏠", label: "Dashboard" },
  { to: "/alerts", icon: "🔴", label: "Live Alerts" },
  { to: "/map", icon: "🗺️", label: "Campus Map" },
  { to: "/settings", icon: "⚙️", label: "Settings" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  // Get avatar initial from email
  const initial = user?.email?.charAt(0).toUpperCase() ?? "A";

  return (
    <aside className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-red-900/50">
            🛡️
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">SafeCampus</h1>
            <p className="text-gray-500 text-xs">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-red-600/20 text-red-400 border border-red-600/30"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User Footer + Logout */}
      <div className="px-4 py-4 border-t border-gray-800 space-y-3">
        {/* User Info */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">
              {user?.email ?? "Admin"}
            </p>
            <p className="text-gray-500 text-xs">Administrator</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          id="logout-btn"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 hover:text-red-400 hover:bg-red-600/10 border border-transparent hover:border-red-600/20 px-3 py-2 rounded-xl transition-all duration-150"
        >
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}

