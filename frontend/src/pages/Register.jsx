import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, rtdb } from "../firebase";
import { ref, set } from "firebase/database";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [step, setStep] = useState(1); // 1: Details, 2: Simulating, 3: OTP
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [simStep, setSimStep] = useState(0); // 0: Start, 1: Connecting, 2: Encrypting, 3: Dispatched
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || !password || !name || !emergencyPhone) {
      setError("Please fill all security fields");
      return;
    }
    
    setLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setStep(2); // Move to Simulation

    // 🔥 ACTUALLY SEND THE EMAIL VIA LOCAL BACKEND
    try {
      fetch('http://localhost:5000/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: email, otpCode: code, userName: name })
      });
    } catch(err) {
      console.error("Backend error:", err);
    }

    // 🚀 HIGH-FIDELITY EMAIL DISPATCH SIMULATION
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setSimStep(currentStep);
      if (currentStep === 4) {
        clearInterval(interval);
        setStep(3); // Move to OTP entry
        setLoading(false);
      }
    }, 800);
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (otp !== generatedOtp) {
      setError("Invalid code. Please check the code in your email.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1: Create Firebase Auth user (this is fast)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      // Step 2: Save to Realtime Database (FREE, instant)
      await set(ref(rtdb, 'users/' + userCredential.user.uid), {
        name, displayName: name, email,
        emergencyContacts: [emergencyPhone],
        trustScore: 100,
        createdAt: new Date().toISOString(),
      });

      // Step 3: Navigate
      navigate("/user");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please log in instead.");
      } else if (err.code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else {
        setError(err.message || "Registration failed. Try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600/5 via-transparent to-transparent" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#6B46C1]/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-[#6B46C1] to-red-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-[0_0_50px_rgba(107,70,193,0.3)] border border-white/10">🛡️</div>
          <h1 className="text-4xl font-black text-white tracking-tightest uppercase italic">Safe<span className="text-red-600">Campus</span></h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Identity Shield v4.0</p>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-[48px] p-10 shadow-2xl relative overflow-hidden">
          {error && <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3"><span>⚠️</span> {error}</div>}

          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-6 py-4 text-sm focus:border-red-600 outline-none transition-all" placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">University Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-6 py-4 text-sm focus:border-red-600 outline-none transition-all" placeholder="student@dbu.edu.et" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Secure Password</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-6 py-4 text-sm focus:border-red-600 outline-none transition-all" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">Emergency Phone</label>
                <input type="tel" required value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="w-full bg-red-500/5 border border-red-500/20 text-white rounded-2xl px-6 py-4 text-sm focus:border-red-600 outline-none transition-all" placeholder="+251..." />
              </div>
              <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-red-900/20 transition-all uppercase text-[11px] tracking-[0.2em] mt-4 active:scale-[0.98]">Request Access ➔</button>
            </form>
          )}

          {step === 2 && (
            <div className="py-12 flex flex-col items-center text-center animate-in zoom-in duration-500">
               <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-8 relative">
                  <div className="absolute inset-0 border-4 border-red-600/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-red-600 rounded-full border-t-transparent animate-spin" />
                  <span className="text-3xl">📧</span>
               </div>
               <h2 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2">Dispatching Seal</h2>
               <div className="w-full max-w-[200px] space-y-3">
                  <p className={`text-[10px] font-black uppercase transition-all ${simStep >= 1 ? 'text-green-500' : 'text-gray-600'}`}>● Connecting to DBU Node</p>
                  <p className={`text-[10px] font-black uppercase transition-all ${simStep >= 2 ? 'text-green-500' : 'text-gray-600'}`}>● Encrypting Payload</p>
                  <p className={`text-[10px] font-black uppercase transition-all ${simStep >= 3 ? 'text-green-500' : 'text-gray-600'}`}>● Signal Transmitted</p>
               </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleVerifyAndRegister} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <div className="text-center">
                  <div className="text-5xl mb-4">📧</div>
                  <h2 className="text-xl font-black text-white uppercase italic">Check Your Email</h2>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">6-digit code sent to:</p>
                  <p className="text-white text-sm font-black mt-1">{email}</p>
                  <p className="text-green-500 text-[9px] font-black uppercase tracking-widest mt-4">✓ Email dispatched. Check inbox & spam folder.</p>
               </div>
               <input type="text" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="w-full bg-gray-800 border-2 border-gray-700 text-white rounded-3xl px-5 py-6 text-4xl font-black tracking-[0.5em] text-center outline-none focus:border-red-600 transition-all shadow-inner" placeholder="000000" />
               <button type="submit" disabled={loading} className="w-full bg-red-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-red-900/20 uppercase text-[11px] tracking-widest active:scale-[0.98]">{loading ? "Verifying..." : "Authorize Connection"}</button>
               <div className="flex gap-3">
                  <button type="button" onClick={() => {
                    const code = Math.floor(100000 + Math.random() * 900000).toString();
                    setGeneratedOtp(code);
                    fetch('http://localhost:5000/send-otp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ toEmail: email, otpCode: code, userName: name })
                    });
                    alert("New code sent! Check your email.");
                  }} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">📧 Resend Code</button>
                  <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">← Change Email</button>
               </div>
            </form>
          )}

          <p className="mt-10 text-center text-[9px] font-black text-gray-500 uppercase tracking-widest">Already authorized? <Link to="/login" className="text-red-600 hover:text-red-400">Login</Link></p>
        </div>
      </div>
    </div>
  );
}
