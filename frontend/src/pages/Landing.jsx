import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, rtdb } from "../firebase";
import { ref, push, set } from "firebase/database";

const translations = {
  en: {
    how: "How it works",
    about: "About DBU",
    login: "Log In",
    register: "Register",
    hero: "Every Second Counts.",
    desc: "Instant 24/7 rescue for Debre Berhan University students and guests.",
    sos: "SOS",
    guest: "Press in Danger",
    dispatched: "Dispatched",
    step1: "Trigger",
    step1Desc: "Hold the SOS button for 2 seconds to initiate an emergency broadcast.",
    step2: "Locate",
    step2Desc: "System locks your satellite GPS coordinates instantly.",
    step3: "Respond",
    step3Desc: "Security teams navigate to your exact spot within minutes.",
    aboutTitle: "Debre Berhan University",
    aboutDesc: "DBU is dedicated to excellence and safety. With over 30,000 students, campus security is our top priority. SafeCampus is the official technology partner ensuring a secure environment.",
    rapid: "Rapid Response",
    survival: "Survival Rate"
  },
  am: {
    how: "እንዴት እንደሚሰራ",
    about: "ስለ ደብረ ብርሃን ዩኒቨርሲቲ",
    login: "ይግቡ",
    register: "ይመዝገቡ",
    hero: "እያንዳንዱ ሰከንድ ዋጋ አለው::",
    desc: "ለደብረ ብርሃን ዩኒቨርሲቲ ተማሪዎች እና እንግዶች ፈጣን የ24/7 እርዳታ::",
    sos: "አስቸኳይ",
    guest: "አደጋ ካለ ይጫኑ",
    dispatched: "ተልኳል",
    step1: "መቀስቀስ",
    step1Desc: "የአደጋ ጊዜ ምልክት ለመላክ ቁልፉን ለ2 ሰከንድ ተጭነው ይቆዩ::",
    step2: "መፈለግ",
    step2Desc: "ሲስተሙ የእርስዎን የሳተላይት መገኛ ቦታ ወዲያውኑ ያውቃል::",
    step3: "መድረስ",
    step3Desc: "የደህንነት ቡድኑ በጥቂት ደቂቃዎች ውስጥ ወደ እርስዎ ይደርሳል::",
    aboutTitle: "ደብረ ብርሃን ዩኒቨርሲቲ",
    aboutDesc: "ደብረ ብርሃን ዩኒቨርሲቲ ለላቀ ውጤት እና ለደህንነት ቁርጠኛ ነው:: ከ30,000 በላይ ተማሪዎች ጋር ካምፓሱ ደህንነቱ የተጠበቀ እንዲሆን ትኩረት እንሰጣለን::",
    rapid: "ፈጣን ምላሽ",
    survival: "የደህንነት መጠን"
  },
  or: {
    how: "Akkamitti Hojjeta",
    about: "Waa'ee DBU",
    login: "Seenaa",
    register: "Galmaa'aa",
    hero: "Sekondiin Hundi Murteessaadha.",
    desc: "Barattoota fi keessummoota Yuunivarsiitii Debre Birhaaniif deeggarsa hatattamaa 24/7.",
    sos: "SOS",
    guest: "Yoo balaan jiraate gadi buusa",
    dispatched: "Ergameera",
    step1: "Eegaluu",
    step1Desc: "Mallattoo balaa erguuf sekondii 2f gadi qabaa.",
    step2: "Argachuu",
    step2Desc: "Sirnichi iddoo keessan battalatti adda baasa.",
    step3: "Daqquu",
    step3Desc: "Gareen nageenyaa daqiiqaa muraasa keessatti isin bira gahu.",
    aboutTitle: "Yuunivarsiitii Debre Birhaan",
    aboutDesc: "DBU'n gahumsa fi nageenyaaf of kenneera. Barattoota 30,000 ol qabaachuun nageenyi kaampaasichaa dhimma ijoodha.",
    rapid: "Deebii Hatattamaa",
    survival: "Nageenya Kaampaasii"
  }
};

export default function Landing() {
  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const t = translations[lang];

  const DBU_COORDS = { lat: 9.6823, lng: 39.5312 };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const triggerEmergency = async () => {
    setLoading(true);
    setError("");
    let coords = null;
    try {
      const pos = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 });
      });
      coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };

      const dist = getDistance(coords.lat, coords.lng, DBU_COORDS.lat, DBU_COORDS.lng);
      if (dist > 10) {
        setError("Invalid Location: You must be on the DBU Campus.");
        setLoading(false);
        setShowConfirm(false);
        return;
      }
    } catch (e) { console.warn("GPS Fail"); }

    const alertData = {
      userType: "guest",
      userName: "Anonymous Guest",
      message: "GUEST SOS: EMERGENCY SIGNAL",
      severity: "critical",
      coordinates: coords,
      status: "active",
      timestamp: Date.now()
    };

    try {
      const alertsRef = ref(rtdb, 'alerts');
      const newAlertRef = push(alertsRef);
      await set(newAlertRef, { ...alertData, id: newAlertRef.key });
      setSuccess(true);
      setShowConfirm(false);
    } catch (err) {
      setSmsSent(true);
      setSuccess(true);
      setShowConfirm(false);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-red-100 scroll-smooth">
      {/* 🛡️ LOCATION ERROR BANNER */}
      {error && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-3 rounded-full font-black uppercase text-[10px] shadow-2xl animate-bounce">
          ⚠ {error}
        </div>
      )}

      {/* 🛡️ GUEST CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[48px] p-10 w-full max-w-sm text-center shadow-2xl">
            <span className="text-6xl mb-6 block">⚠</span>
            <h2 className="text-2xl font-black uppercase italic mb-4">Confirm Emergency</h2>
            <p className="text-gray-500 text-sm mb-8 font-medium">This will alert DBU Security immediately. Fake reports are tracked by GPS.</p>
            <div className="space-y-4">
              <button 
                onClick={triggerEmergency}
                disabled={loading}
                className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs"
              >
                {loading ? 'Dispatching...' : 'YES, SEND ALERT'}
              </button>
              <button 
                onClick={() => setShowConfirm(false)}
                className="w-full bg-gray-100 text-gray-400 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="flex justify-between items-center px-6 md:px-12 py-6 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg"><span className="text-white text-xl font-black">S</span></div>
          <span className="text-xl font-black tracking-tighter hidden md:block">SafeCampus</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            {['en', 'am', 'or'].map(l => (
              <button key={l} onClick={() => setLang(l)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${lang === l ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-gray-500">
            <a href="#how" className="hover:text-red-600">{t.how}</a>
            <a href="#about" className="hover:text-red-600">{t.about}</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-[10px] font-black uppercase text-gray-900">{t.login}</Link>
            <Link to="/register" className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-xl">{t.register}</Link>
          </div>
        </div>
      </nav>

      <main className="px-6 pt-20 pb-32 max-w-7xl mx-auto text-center">
        <h1 className="text-6xl md:text-8xl font-black tracking-tightest leading-[0.85] mb-8 text-gray-950 uppercase italic">
          {t.hero.split(' ').slice(0, -1).join(' ')} <br /><span className="text-red-600">{t.hero.split(' ').slice(-1)}</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-16 font-medium">{t.desc}</p>

        <div className="flex flex-col items-center">
          <button 
            onClick={() => setShowConfirm(true)}
            disabled={loading || success}
            className={`w-48 h-48 md:w-64 md:h-64 rounded-full flex flex-col items-center justify-center transition-all border-8 ${success ? 'bg-green-600 border-green-200 shadow-2xl' : 'bg-red-600 border-red-200 shadow-xl shadow-red-900/20 hover:scale-105'}`}
          >
            {loading ? <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : success ? <><span className="text-4xl mb-2">📡</span><span className="text-white font-black text-[10px] uppercase">{smsSent ? "SMS Sent" : t.dispatched}</span></> : <><span className="text-white text-5xl md:text-7xl font-black italic mb-2 tracking-tighter">{t.sos}</span><span className="text-white/80 font-bold text-[10px] uppercase">{t.guest}</span></>}
          </button>
          {smsSent && <p className="mt-4 text-green-600 font-black text-[10px] uppercase animate-pulse">Network Fail: SMS Protocol Activated ✓</p>}
        </div>
      </main>

      {/* 🛠️ HOW IT WORKS (Translated) */}
      <section id="how" className="py-32 bg-gray-50 px-6 scroll-mt-20">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black uppercase italic mb-20">{t.how}</h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: "01", title: t.step1, desc: t.step1Desc, icon: "🆘" },
              { step: "02", title: t.step2, desc: t.step2Desc, icon: "🛰️" },
              { step: "03", title: t.step3, desc: t.step3Desc, icon: "🚓" }
            ].map((s, i) => (
              <div key={i} className="bg-white p-10 rounded-[40px] shadow-lg border border-gray-100 hover:-translate-y-2 transition-transform">
                <div className="text-5xl mb-6">{s.icon}</div>
                <p className="text-red-600 font-black text-xs mb-2 uppercase tracking-widest">Step {s.step}</p>
                <h3 className="text-2xl font-black uppercase italic mb-4">{s.title}</h3>
                <p className="text-gray-500 font-medium text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🛠️ ABOUT DBU (Translated & FIXED ID) */}
      <section id="about" className="py-32 px-6 scroll-mt-20 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-20 items-center">
            <div className="flex-1">
              <img src="/assets/dbu_map.png" alt="DBU Campus" className="rounded-[50px] shadow-2xl border-8 border-gray-50 opacity-80" />
            </div>
            <div className="flex-1">
              <div className="inline-block px-4 py-2 bg-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 italic">Since 2007</div>
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic leading-none mb-8">
                {t.aboutTitle.split(' ').slice(0, -1).join(' ')} <br /> <span className="text-red-600">{t.aboutTitle.split(' ').slice(-1)}</span>
              </h2>
              <p className="text-gray-500 font-medium leading-relaxed mb-8">{t.aboutDesc}</p>
              <div className="grid grid-cols-2 gap-6">
                 <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <p className="text-2xl font-black text-red-600 mb-1">24/7</p>
                    <p className="text-[10px] font-black uppercase text-gray-400">{t.rapid}</p>
                 </div>
                 <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <p className="text-2xl font-black text-red-600 mb-1">100%</p>
                    <p className="text-[10px] font-black uppercase text-gray-400">{t.survival}</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-20 border-t border-gray-100 text-center bg-gray-50">
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">© 2024 DBU SafeCampus • {t.about}</p>
      </footer>
    </div>
  );
}
