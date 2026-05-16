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
import UserLayout from "./userPage/UserLayout";
import UserDashboard from "./userPage/UserDashboard";
import SendAlert from "./userPage/SendAlert";
import MyAlerts from "./userPage/MyAlerts";
import UserProfile from "./userPage/UserProfile";
import SafetyTips from "./userPage/SafetyTips";
import FindHelp from "./userPage/FindHelp";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
           {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin Protected routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="users" element={<Users />} /> {/* 🛠️ ADDED USER MANAGEMENT ROUTE */}
            <Route path="map" element={<CampusMap />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* User/Student routes */}
          <Route
            path="/user"
            element={
              <ProtectedRoute>
                <UserLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<UserDashboard />} />
            <Route path="send-alert" element={<SendAlert />} />
            <Route path="alerts" element={<MyAlerts />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="tips" element={<SafetyTips />} />
            <Route path="find-help" element={<FindHelp />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;