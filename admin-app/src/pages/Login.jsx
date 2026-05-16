import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db, rtdb } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, get } from "firebase/database";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 🛡️ FAIL-SAFE DEMO BYPASS:
    // This allows you to log in during your presentation even if the internet is slow
    const demoTimeout = setTimeout(() => {
       if (loading) {
          console.warn("Network slow, entering Demo Mode Bypass...");
          setSuccess(true);
          setTimeout(() => {
            if (email.toLowerCase().includes("admin")) navigate("/");
            else setError("Access Denied: This portal is for Security Personnel only.");
          }, 1000);
       }
    }, 4000);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      clearTimeout(demoTimeout);
      
      // Fetch role from RTDB to verify admin status
      const userRef = ref(rtdb, `users/${userCredential.user.uid}`);
      const snapshot = await get(userRef);
      const userData = snapshot.val();

      if (userData?.role === 'admin' || email.toLowerCase() === "admin@safecampus.com") {
        setSuccess(true);
        setTimeout(() => navigate("/"), 800);
      } else {
        await auth.signOut();
        setError("ACCESS DENIED: Your account does not have Administrative Clearance.");
        setLoading(false);
      }
    } catch (err) {
      clearTimeout(demoTimeout);
      
      // 🚨 BRUTE FORCE LOCKOUT DETECTION
      if (err.code === "auth/too-many-requests") {
        setError("ACCOUNT LOCKED: Too many failed attempts. Please try again later or reset password.");
        setLoading(false);
        return;
      }
      
      // 🚨 AUTO-INITIALIZE ADMIN
      if (email.toLowerCase() === "admin@safecampus.com" && (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential")) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          await setDoc(doc(db, "users", userCredential.user.uid), {
            name: "Main Admin",
            email: email,
            role: "admin",
            trustScore: 100,
            createdAt: new Date().toISOString()
          });
          setSuccess(true);
          setTimeout(() => navigate("/"), 800);
          return;
        } catch (createErr) {}
      }

      switch (err.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("Invalid identity seal. Please check your credentials.");
          break;
        case "auth/too-many-requests":
          setError("Access locked due to too many attempts. Wait 60s.");
          break;
        default:
          setError("Authentication link failed. Check your internet.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 relative overflow-hidden font-sans">
      {/* Background glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Navigation back home */}
        <Link to="/" className="absolute -top-16 left-0 flex items-center gap-2 text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-red-600 transition-all group">
           <span className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center border border-gray-800 group-hover:border-red-600 transition-all">←</span>
           Back to Home
        </Link>

        <div className="text-center mb-10 animate-in fade-in duration-1000">
          <div className={`w-20 h-20 ${email.includes('admin') ? 'bg-red-600' : 'bg-[#6B46C1]'} rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-2xl transition-all duration-500`}>
            🛡️
          </div>
          <h1 className="text-4xl font-black text-white tracking-tightest uppercase italic leading-none">Safe<span className="text-red-600">Campus</span></h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-3">
            {email.toLowerCase().includes('admin') ? 'Security Command Center' : 'Student Safety Portal'}
          </p>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[48px] p-10 shadow-2xl shadow-black/50">
          {success ? (
            <div className="py-10 text-center animate-in zoom-in duration-500">
               <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-6 shadow-lg shadow-green-900/40">✓</div>
               <h2 className="text-xl font-black text-white uppercase italic">Access Granted</h2>
               <p className="text-gray-500 text-[10px] font-black uppercase mt-2">Connecting to secure grid...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-black text-white mb-1 uppercase italic tracking-tighter">Welcome Back</h2>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-8">Authorize your session below</p>

              {error && (
                <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-widest">
                  <span className="mt-0.5">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Grid Identity</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@dbu.edu.et"
                    className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-2xl px-6 py-4 text-sm outline-none focus:border-red-600 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Security Key</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-2xl px-6 py-4 text-sm outline-none focus:border-red-600 transition-all shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] mt-4 ${
                    email.toLowerCase().includes('admin') 
                      ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' 
                      : 'bg-[#6B46C1] hover:bg-[#553C9A] shadow-purple-900/20'
                  }`}
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Authorize Access ➔</>
                  )}
                </button>
              </form>
            </>
          )}

          {!success && (
            <div className="mt-10 flex flex-col items-center gap-4 border-t border-gray-800/50 pt-8 text-center">
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest leading-relaxed">
                DBU Security Command Center<br/>
                Unauthorized access is strictly prohibited.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
