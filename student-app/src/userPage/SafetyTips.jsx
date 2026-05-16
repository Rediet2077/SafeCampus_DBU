import { useNavigate } from "react-router-dom";

export default function SafetyTips() {
  const navigate = useNavigate();

  const tips = [
    { title: "Night Safety", content: "Always walk in well-lit areas and try to have a companion when crossing campus after dark.", icon: "🌙" },
    { title: "Emergency Numbers", content: "Save the campus security number (911) in your speed dial for immediate access.", icon: "📞" },
    { title: "Suspicious Activity", content: "If you see something, say something. Use the alert system to report unusual behavior.", icon: "👀" },
    { title: "Fire Safety", content: "Know your nearest exit and evacuation assembly points in every building.", icon: "🔥" },
  ];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate("/user")} className="text-2xl">←</button>
        <h1 className="text-2xl font-bold text-gray-900">Safety Tips</h1>
      </div>

      <div className="space-y-4">
        {tips.map((tip, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-xl">
                {tip.icon}
              </div>
              <h3 className="font-bold text-gray-900">{tip.title}</h3>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">{tip.content}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-[#6B46C1] rounded-3xl p-6 text-white text-center">
        <h3 className="font-bold mb-2">Need a Security Escort?</h3>
        <p className="text-white/70 text-xs mb-4">Available 24/7 for on-campus transfers</p>
        <button className="bg-white text-[#6B46C1] font-bold px-6 py-3 rounded-2xl text-sm w-full transition-transform active:scale-95">
          Request Escort
        </button>
      </div>
    </div>
  );
}
