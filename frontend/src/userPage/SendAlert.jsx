import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, rtdb } from "../firebase";
import { ref, push, set, serverTimestamp } from "firebase/database";

export default function SendAlert() {
  const [type, setType] = useState("critical");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("Main Library");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [silentMode, setSilentMode] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const DBU_COORDS = { lat: 9.6823, lng: 39.5312 };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    // Initialize hidden camera for silent snapshot
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      .then(stream => { if(videoRef.current) videoRef.current.srcObject = stream; })
      .catch(err => console.warn("Camera blocked"));
  }, []);

  const handleSendAlert = async () => {
    setLoading(true);
    setError("");
    
    // 🛡️ STEP 1: FETCH FULL USER PROFILE
    let userProfile = null;
    try {
      const userRef = ref(rtdb, `users/${auth.currentUser?.uid}`);
      const snapshot = await new Promise((res) => {
        const unsub = onValue(userRef, (s) => { unsub(); res(s); });
      });
      userProfile = snapshot.val();
    } catch (e) { console.warn("Profile fetch fail"); }

    // 🛡️ STEP 2: CAPTURE GPS
    let coords = null;
    try {
      coords = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => reject(),
          { timeout: 5000 }
        );
      });

      const dist = getDistance(coords.lat, coords.lng, DBU_COORDS.lat, DBU_COORDS.lng);
      if (dist > 10) {
        setError("Invalid Location: You must be on the DBU Campus to trigger this SOS.");
        setLoading(false);
        setShowConfirm(false);
        return;
      }
    } catch (e) { console.warn("GPS Unavailable"); }

    // 📸 SILENT FRONT CAMERA SNAPSHOT
    let photo = null;
    try {
      if (videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        canvasRef.current.width = 400;
        canvasRef.current.height = 300;
        context.drawImage(videoRef.current, 0, 0, 400, 300);
        photo = canvasRef.current.toDataURL('image/jpeg', 0.5);
      }
    } catch (e) { console.warn("Photo failed"); }

    const alertData = {
      userType: auth.currentUser ? "registered" : "guest",
      userId: auth.currentUser?.uid || "guest_anonymous",
      userName: userProfile?.name || auth.currentUser?.displayName || "Guest User",
      userEmail: userProfile?.email || auth.currentUser?.email || "No Email",
      userPhone: userProfile?.emergencyContacts ? userProfile.emergencyContacts[0] : "N/A",
      idCardImage: userProfile?.idCardImage || null,
      severity: type,
      message: description || `EMERGENCY: ${type.toUpperCase()}`,
      location: location,
      status: "active",
      silent: silentMode,
      trustScore: userProfile?.trustScore || 100,
      timestamp: Date.now(),
      coordinates: coords,
      evidencePhoto: photo,
      isVerified: !!coords || !!photo
    };

    try {
      const alertsRef = ref(rtdb, 'alerts');
      const newAlertRef = push(alertsRef);
      await set(newAlertRef, { ...alertData, id: newAlertRef.key });
      setSuccess(true);
    } catch (err) {
      setError("Network failed. Storing offline...");
    } finally { 
      setLoading(false); 
    }
  };

  if (success) {
    return (
      <div className={`px-6 py-20 flex flex-col items-center text-center min-h-screen ${silentMode ? 'bg-white' : 'bg-gray-950 text-white'}`}>
        {!silentMode ? (
          <>
            <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center text-5xl mb-6 shadow-2xl animate-bounce">📡</div>
            <h1 className="text-3xl font-black mb-2 uppercase italic tracking-tighter">Signal Dispatched</h1>
            <p className="text-gray-400 mb-8 font-medium">Verification complete. Help is on the way.</p>
            <button 
              onClick={() => navigate(auth.currentUser ? "/user" : "/")} 
              className="w-full bg-white text-black font-black py-4 rounded-2xl active:scale-95 transition-all shadow-xl"
            >
              Return Home
            </button>
          </>
        ) : (
          <button onClick={() => navigate(auth.currentUser ? "/user" : "/")} className="mt-20 opacity-0 cursor-default">Home</button>
        )}
      </div>
    );
  }

  return (
    <div className="px-6 py-8 bg-gray-950 min-h-screen text-white relative">
      <video ref={videoRef} autoPlay playsInline className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex justify-between items-center mb-8">
        <button onClick={() => navigate("/user")} className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-xl font-bold border border-gray-800">←</button>
        <button onClick={() => setSilentMode(!silentMode)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${silentMode ? 'bg-red-600 text-white border-red-500' : 'bg-gray-900 text-gray-500 border-gray-800'}`}>
          {silentMode ? '🤫 Silent Mode' : '🔊 Standard'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-600/20 border border-red-600/50 rounded-2xl text-[10px] font-black uppercase text-red-500 animate-bounce">
          ⚠ {error}
        </div>
      )}

      <div className="flex bg-gray-900 p-1 rounded-2xl border border-gray-800 mb-8">
        <button onClick={() => setChatMode(false)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!chatMode ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'}`}>SOS Button</button>
        <button onClick={() => setChatMode(true)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${chatMode ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'}`}>AI Chat</button>
      </div>

      {!chatMode ? (
        <div className="grid grid-cols-2 gap-3 mb-10">
           {['critical', 'medical', 'suspicious', 'help'].map(lvl => (
             <button key={lvl} onClick={() => setType(lvl)} className={`p-6 rounded-3xl border-2 transition-all ${type === lvl ? 'bg-red-600 border-white scale-105 shadow-xl shadow-red-900/40' : 'bg-gray-900 border-gray-800 opacity-40 hover:opacity-100'}`}>
               <span className="text-2xl block mb-2">{lvl === 'critical' ? '🚨' : lvl === 'medical' ? '🚑' : lvl === 'suspicious' ? '👁️' : '🤝'}</span>
               <span className="text-[10px] font-black uppercase tracking-widest">{lvl}</span>
             </button>
           ))}
        </div>
      ) : (
        <div className="mb-10 bg-gray-900/50 p-6 rounded-[32px] border border-gray-800 shadow-inner">
           <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your emergency..." className="w-full bg-transparent border-none text-white font-bold h-32 resize-none" />
           {aiAnalysis && <p className="mt-4 text-[10px] font-black text-blue-400 uppercase">{aiAnalysis}</p>}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex justify-between items-center mb-8">
         <div><p className="text-[10px] font-black text-gray-500 uppercase mb-1">Zone</p><select value={location} onChange={(e) => setLocation(e.target.value)} className="bg-transparent text-white font-black outline-none"><option>Main Library</option><option>Student Cafe</option><option>Girls Dorm</option></select></div>
         <div className="text-right"><p className="text-[10px] font-black text-gray-500 uppercase mb-1">Verification</p><p className="text-green-500 font-black uppercase text-[10px]">Active</p></div>
      </div>

      <button onClick={() => setShowConfirm(true)} className="w-full bg-red-600 text-white font-black py-6 rounded-[32px] shadow-2xl shadow-red-900/40 uppercase tracking-widest">
        Broadcast SOS
      </button>

      {/* 🛡️ CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-gray-900 border border-gray-800 rounded-[48px] p-10 w-full max-w-sm text-center">
            <span className="text-6xl mb-6 block">⚠</span>
            <h2 className="text-2xl font-black uppercase italic mb-4">Emergency Confirmation</h2>
            <p className="text-gray-400 text-sm mb-8 font-medium">Are you sure you want to trigger a campus-wide alert? Fake reports are punishable.</p>
            <div className="space-y-4">
              <button 
                onClick={handleSendAlert}
                disabled={loading}
                className="w-full bg-red-600 py-5 rounded-2xl font-black uppercase tracking-widest text-xs animate-pulse"
              >
                {loading ? 'Transmitting...' : 'YES, SEND ALERT'}
              </button>
              <button 
                onClick={() => setShowConfirm(false)}
                className="w-full bg-gray-800 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
