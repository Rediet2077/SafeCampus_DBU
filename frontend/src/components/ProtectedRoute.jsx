import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();

  // Still checking auth state — show spinner
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm animate-pulse">Verifying security clearance...</p>
        </div>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin-only check
  if (adminOnly && !user.isAdmin) {
    console.warn("Security Alert: Unauthorized access attempt to Admin Dashboard.");
    return <Navigate to="/user" replace />;
  }

  // Logged in → show the page
  return children;
}
