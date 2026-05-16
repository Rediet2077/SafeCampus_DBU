import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function UserLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-gray-900 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col relative overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-[#6B46C1] text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg">🛡️</div>
            <span className="font-bold tracking-tight">SafeCampus</span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors border border-white/20"
          >
            Logout
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-20">
          <Outlet />
        </main>

        {/* Bottom Navigation */}
        <nav className="bg-white border-t border-gray-100 px-8 py-3 flex justify-between items-center sticky bottom-0 z-10">
          <NavItem 
            active={location.pathname === "/user"} 
            onClick={() => navigate("/user")}
            icon="🏠"
            label="Home"
          />
          <NavItem 
            active={location.pathname === "/user/alerts"} 
            onClick={() => navigate("/user/alerts")}
            icon="📋"
            label="My Alerts"
          />
          <NavItem 
            active={location.pathname === "/user/profile"} 
            onClick={() => navigate("/user/profile")}
            icon="👤"
            label="Profile"
          />
        </nav>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${active ? "text-[#6B46C1]" : "text-gray-400 hover:text-gray-600"}`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      {active && <div className="w-1 h-1 bg-[#6B46C1] rounded-full mt-0.5" />}
    </button>
  );
}
