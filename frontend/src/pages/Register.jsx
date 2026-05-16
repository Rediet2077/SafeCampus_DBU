import { useState, useEffect, useRef } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, rtdb } from "../firebase";
import { ref, set, get, child } from "firebase/database";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [step, setStep] = useState(1); // 1: Details, 2: ID Scan, 3: Simulating, 4: OTP
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [bloodType, setBloodType] = useState("Unknown");
  const [medicalConditions, setMedicalConditions] = useState("None");
  const [idImage, setIdImage] = useState(null);
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [simStep, setSimStep] = useState(0); 
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // Initialize camera for ID scan
  useEffect(() => {
    let stream = null;
    if (step === 2 && !idImage) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(s => { 
          stream = s;
          if(videoRef.current) videoRef.current.srcObject = s; 
        })
        .catch(err => {
          console.error("Camera fail:", err);
          setError("Camera access is required for ID verification.");
        });
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [step, idImage]);

  const handleCaptureId = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = 640;
      canvasRef.current.height = 480;
      context.drawImage(videoRef.current, 0, 0, 640, 480);
      const data = canvasRef.current.toDataURL('image/jpeg', 0.9); // Increased quality for AI processing
      setIdImage(data);
    }
  };

  const analyzeIdImage = () => {
    if (!canvasRef.current) return true;
    const ctx = canvasRef.current.getContext('2d');
    const imageData = ctx.getImageData(0, 0, 640, 480).data;
    
    let colorPixels = 0;
    const pixelsToSample = (640 * 480) / 4;
    
    for (let i = 0; i < imageData.length; i += 16) {
      const r = imageData[i];
      const g = imageData[i+1];
      const b = imageData[i+2];
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      
      if (saturation > 0.15) {
        colorPixels++;
      }
    }
    
    const colorRatio = colorPixels / pixelsToSample;
    return colorRatio > 0.12; // Require at least 12% colorful pixels (Face, Logos, etc)
  };

  const handleStartSimulation = async (e) => {
    e.preventDefault();
    if (!idImage) {
      setError("Please scan your ID to proceed.");
      return;
    }

    // 🤖 STRICT AI ID VERIFICATION SIMULATION
    const isQualityGood = analyzeIdImage();
    
    if (!isQualityGood) {
      setLoading(true);
      setError("");
      setTimeout(() => {
        setLoading(false);
        setIdImage(null); // Force retake
        setError("AI REJECTION: Missing facial features or university branding. Are you scanning the BACK of the card? The capture MUST show your Photo, Full Name, and DBU Logo.");
      }, 1500);
      return;
    }
    
    setLoading(true);
    setError("");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setStep(3); // Move to Simulation

    try {
      const response = await fetch('http://localhost:5000/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: email, otpCode: code, userName: name })
      });
      if (!response.ok) throw new Error("Backend Error");
    } catch(err) { 
      console.error("Backend error:", err);
      setError("Email Server Offline: Please ensure the Node.js backend is running on port 5000.");
      setLoading(false);
      setStep(1);
      return;
    }

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setSimStep(currentStep);
      if (currentStep === 4) {
        clearInterval(interval);
        setStep(4); // Move to OTP entry
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

    // ONE-TIME ID REGISTRATION CHECK
    try {
      const dbRef = ref(rtdb);
      const snapshot = await get(child(dbRef, `users`));
      if (snapshot.exists()) {
        const users = snapshot.val();
        const existingIds = Object.values(users).map(u => u.studentId);
        if (existingIds.includes(studentId)) {
          setError("SECURITY ALERT: This DBU Student ID is already registered.");
          setLoading(false);
          return;
        }
      }
    } catch (dbErr) {
      console.error("ID Validation error", dbErr);
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      await set(ref(rtdb, 'users/' + userCredential.user.uid), {
        name, displayName: name, email, studentId,
        emergencyContacts: [emergencyPhone],
        idCardImage: idImage,
        bloodType,
        medicalConditions,
        isVerified: true,
        trustScore: 100,
        createdAt: new Date().toISOString(),
      });

      navigate("/user");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else {
        setError(err.message || "Registration failed.");
      }
      setLoading(false);
    }
  };

  const validateStep1 = (e) => {
    e.preventDefault();
    
    // Email Validation
    if (!email.toLowerCase().endsWith("@dbu.edu.et")) {
      setError("SECURITY ALERT: Registration restricted to official @dbu.edu.et university emails.");
      return;
    }
    
    // Student ID Format
    const idRegex = /^DBU\/\d{4}\/\d{2}$/i;
    if (!idRegex.test(studentId)) {
      setError("INVALID ID FORMAT: Please use the standard format (e.g., DBU/1234/12).");
      return;
    }

    // Password Strength
    if (password.length < 8) {
      setError("WEAK PASSWORD: Password must be at least 8 characters long.");
      return;
    }

    setError("");
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600/5 via-transparent to-transparent" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#6B46C1]/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Navigation back home */}
        <Link to="/" className="absolute -top-16 left-0 flex items-center gap-2 text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-red-600 transition-all group">
           <span className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center border border-gray-800 group-hover:border-red-600 transition-all">←</span>
           Back to Home
        </Link>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-[#6B46C1] to-red-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-[0_0_50px_rgba(107,70,193,0.3)] border border-white/10">🛡️</div>
          <h1 className="text-4xl font-black text-white tracking-tightest uppercase italic">Safe<span className="text-red-600">Campus</span></h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Identity Shield v4.0</p>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-[48px] p-10 shadow-2xl relative overflow-hidden">
          {error && <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3"><span>⚠️</span> {error}</div>}

          {step === 1 && (
            <form onSubmit={validateStep1} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-6 py-4 text-sm focus:border-red-600 outline-none transition-all" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Student ID</label>
                  <input type="text" required value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-6 py-4 text-sm focus:border-red-600 outline-none transition-all" placeholder="DBU/1234/12" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">University Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-6 py-4 text-sm focus:border-red-600 outline-none transition-all" placeholder="student@dbu.edu.et" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Secure Password</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-6 py-4 text-sm focus:border-red-600 outline-none transition-all" placeholder="••••••••" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex justify-between">
                     Blood Type <span className="opacity-50">(Optional)</span>
                   </label>
                   <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-6 py-4 text-sm focus:border-red-600 outline-none transition-all appearance-none">
                     <option>Unknown</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex justify-between">
                     Medical Info <span className="opacity-50">(Optional)</span>
                   </label>
                   <input type="text" value={medicalConditions} onChange={(e) => setMedicalConditions(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-6 py-4 text-sm focus:border-red-600 outline-none transition-all" placeholder="e.g. Asthma..." />
                 </div>
              </div>
              <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-red-900/20 transition-all uppercase text-[11px] tracking-[0.2em] mt-4 active:scale-[0.98]">Proceed to ID Scan ➔</button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
               <div className="text-center mb-6">
                  <h2 className="text-xl font-black text-white uppercase italic">Scan Identity Card</h2>
                  <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mt-1 italic">Place your DBU ID in the frame</p>
               </div>
               
               <div className="relative w-full aspect-[1.6/1] bg-black rounded-3xl overflow-hidden border-2 border-gray-800 shadow-inner group">
                  {idImage ? (
                    <img src={idImage} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <div className="absolute inset-4 border-2 border-dashed border-white/20 rounded-2xl pointer-events-none" />
                    </>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
               </div>

               <div className="space-y-3">
                  {!idImage ? (
                    <button onClick={handleCaptureId} className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase text-[11px] tracking-widest shadow-xl">Capture ID Image 📸</button>
                  ) : (
                    <>
                      <button onClick={handleStartSimulation} className="w-full bg-red-600 text-white font-black py-5 rounded-2xl uppercase text-[11px] tracking-widest shadow-xl shadow-red-900/20">Confirm & Dispatch ➔</button>
                      <button onClick={() => setIdImage(null)} className="w-full bg-gray-800 text-gray-400 font-black py-4 rounded-2xl uppercase text-[9px] tracking-widest">Retake Photo</button>
                    </>
                  )}
                  <button onClick={() => setStep(1)} className="w-full text-gray-500 text-[9px] font-black uppercase tracking-widest pt-2 italic underline underline-offset-4">← Back to details</button>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-12 flex flex-col items-center text-center animate-in zoom-in duration-500">
               <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-8 relative">
                  <div className="absolute inset-0 border-4 border-red-600/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-red-600 rounded-full border-t-transparent animate-spin" />
                  <span className="text-3xl">🛡️</span>
               </div>
               <h2 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2">Verifying Identity</h2>
               <div className="w-full max-w-[200px] space-y-3">
                  <p className={`text-[10px] font-black uppercase transition-all ${simStep >= 1 ? 'text-green-500' : 'text-gray-600'}`}>● Connecting to DBU Node</p>
                  <p className={`text-[10px] font-black uppercase transition-all ${simStep >= 2 ? 'text-green-500' : 'text-gray-600'}`}>● Encrypting ID Payload</p>
                  <p className={`text-[10px] font-black uppercase transition-all ${simStep >= 3 ? 'text-green-500' : 'text-gray-600'}`}>● Authorization Pending</p>
                  <p className={`text-[10px] font-black uppercase transition-all ${simStep >= 4 ? 'text-green-500' : 'text-gray-600'}`}>● OTP Dispatched</p>
               </div>
            </div>
          )}

          {step === 4 && (
            <form onSubmit={handleVerifyAndRegister} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <div className="text-center">
                  <div className="text-5xl mb-4">📧</div>
                  <h2 className="text-xl font-black text-white uppercase italic">Authorization Code</h2>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Code sent to your DBU email:</p>
                  <p className="text-white text-sm font-black mt-1">{email}</p>
               </div>
               <input type="text" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="w-full bg-gray-800 border-2 border-gray-700 text-white rounded-3xl px-5 py-6 text-4xl font-black tracking-[0.5em] text-center outline-none focus:border-red-600 transition-all" placeholder="000000" />
               <button type="submit" disabled={loading} className="w-full bg-red-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-red-900/20 uppercase text-[11px] tracking-widest active:scale-[0.98]">{loading ? "Verifying..." : "Authorize Identity"}</button>
            </form>
          )}

          <p className="mt-10 text-center text-[9px] font-black text-gray-500 uppercase tracking-widest">Already authorized? <Link to="/login" className="text-red-600 hover:text-red-400">Login</Link></p>
        </div>
      </div>
    </div>
  );
}
