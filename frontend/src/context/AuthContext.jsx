import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";

// Create context
const AuthContext = createContext(null);

// Provider: wraps the whole app
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading

  useEffect(() => {
    // Listen for login/logout events from Firebase
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser); // null = logged out, object = logged in
    });
    return () => unsubscribe();
  }, []);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook — use this anywhere: const { user, logout } = useAuth()
export function useAuth() {
  return useContext(AuthContext);
}
