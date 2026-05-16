import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [step, setStep] = useState(1); // 1: Details, 2: OTP
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!email || !password || !name || !emergencyPhone) {
      setError("Please fill all fields, including emergency contact");
      return;
    }
    
    setLoading(true);
    // Simulate sending OTP
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      console.log(`[DEBUG] OTP for ${email}: ${code}`);
      alert(`Demo OTP sent to ${email}: ${code}`); // For demo purposes
      setStep(2);
      setLoading(false);
      setError("");
    }, 1500);
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (otp !== generatedOtp) {
      setError("Invalid verification code. Please try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      await setDoc(doc(db, "users", user.uid), {
        name: name,
        email: email,
        emergencyContacts: [emergencyPhone],
        createdAt: new Date().toISOString(),
      });

      navigate("/user");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6B46C1]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-red-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8 animate-in fade-in duration-700">
          <div className="w-16 h-16 bg-[#6B46C1] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-xl shadow-purple-900/40">
            🛡️
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight italic">SAFE<span className="text-red-600">CAMPUS</span></h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Identity Verification</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[#6B46C1] focus:ring-1 focus:ring-[#6B46C1]/50 transition-all"
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">University Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[#6B46C1] focus:ring-1 focus:ring-[#6B46C1]/50 transition-all"
                  placeholder="student@dbu.edu.et"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Secure Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[#6B46C1] focus:ring-1 focus:ring-[#6B46C1]/50 transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 text-red-400">Emergency Contact (Family/Friend)</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full bg-red-500/5 border border-red-500/20 text-white rounded-2xl px-5 py-4 pl-12 text-sm focus:outline-none focus:border-red-500 transition-all"
                    placeholder="+2519..."
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">📞</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6B46C1] hover:bg-[#553C9A] disabled:bg-gray-800 text-white font-black py-4 rounded-2xl transition-all mt-4 shadow-lg shadow-purple-900/20 active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Send Verification Code ➔</>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndRegister} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">📧</div>
                <h2 className="text-xl font-bold text-white">Check your email</h2>
                <p className="text-gray-400 text-sm mt-1">We've sent a 6-digit code to <br/><span className="text-white font-bold">{email}</span></p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 block text-center">Verification Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-2xl px-5 py-5 text-2xl font-black tracking-[0.5em] text-center focus:outline-none focus:border-[#6B46C1] focus:ring-1 focus:ring-[#6B46C1]/50 transition-all"
                  placeholder="000000"
                />
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#6B46C1] hover:bg-[#553C9A] disabled:bg-gray-800 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-purple-900/20 active:scale-[0.98] flex items-center justify-center"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Verify & Create Account"
                  )}
                </button>
                
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full py-2 text-gray-500 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Change Email
                </button>
              </div>
            </form>
          )}
          
          <p className="mt-8 text-center text-xs text-gray-500 font-bold uppercase tracking-widest">
            Already registered? <Link to="/login" className="text-[#6B46C1] hover:text-[#9F7AEA] transition-colors">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
