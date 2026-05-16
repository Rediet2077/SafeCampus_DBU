import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, rtdb } from "../firebase";
import { ref, onValue } from "firebase/database";

// Create context
const AuthContext = createContext(null);

// Provider: wraps the whole app
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading

  useEffect(() => {
    let unsubscribeProfile = () => {};
    // Listen for login/logout events from Firebase
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userRef = ref(rtdb, `users/${firebaseUser.uid}`);
        unsubscribeProfile = onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          // Merge Firebase Auth data with RTDB Profile data (contains role)
          setUser({ ...firebaseUser, ...data, isAdmin: data?.role === 'admin' || firebaseUser.email === 'admin@safecampus.com' });
        });
      } else {
        setUser(null);
        unsubscribeProfile();
      }
    });
    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
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
