import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Landing from "./pages/Landing";
import Layout from "./adminPage/Layout";
import Dashboard from "./adminPage/Dashboard";
import Alerts from "./adminPage/Alerts";
import Users from "./adminPage/Users"; // 🛠️ IMPORTED USERS
import CampusMap from "./adminPage/CampusMap";
import Settings from "./adminPage/Settings";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
           {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin Protected routes (NOW AT ROOT) */}
          <Route
            path="/"
            element={
              <ProtectedRoute adminOnly={true}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="users" element={<Users />} />
            <Route path="map" element={<CampusMap />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;