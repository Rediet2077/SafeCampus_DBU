import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const HELP_NODES = [
  { id: 1, name: "Main Security HQ", type: "Security Office", location: "Near Gate 1", coords: { lat: 9.6825, lng: 39.5315 }, icon: "👮" },
  { id: 2, name: "Campus Medical Clinic", type: "Clinic", location: "Block 4 - Ground Floor", coords: { lat: 9.6818, lng: 39.5308 }, icon: "🏥" },
  { id: 3, name: "Student Safe Zone A", type: "Safe Zone", location: "Library Basement", coords: { lat: 9.6823, lng: 39.5312 }, icon: "🛡️" },
  { id: 4, name: "Guard Post 7", type: "Guard Station", location: "Engineering Wing", coords: { lat: 9.6830, lng: 39.5320 }, icon: "💂" },
];

export default function FindHelp() {
  const [userCoords, setUserCoords] = useState(null);
  const [sortedNodes, setSortedNodes] = useState(HELP_NODES);
  const navigate = useNavigate();

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const coords = { lat: p.coords.latitude, lng: p.coords.longitude };
        setUserCoords(coords);
        
        // Sort by distance
        const sorted = [...HELP_NODES].sort((a, b) => {
          const distA = Math.sqrt(Math.pow(a.coords.lat - coords.lat, 2) + Math.pow(a.coords.lng - coords.lng, 2));
          const distB = Math.sqrt(Math.pow(b.coords.lat - coords.lat, 2) + Math.pow(b.coords.lng - coords.lng, 2));
          return distA - distB;
        });
        setSortedNodes(sorted);
      },
      () => console.warn("GPS Access Denied")
    );
  }, []);

  return (
    <div className="px-6 py-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate("/user")} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm transition-all active:scale-90">←</button>
        <h1 className="text-xl font-black text-gray-900 uppercase italic">Nearest <span className="text-red-600">Help</span></h1>
      </div>

      <div className="mb-8 p-6 bg-red-600 rounded-[32px] text-white shadow-xl shadow-red-900/10 border-4 border-red-500">
         <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Current Status</span>
            <span className="animate-pulse">🟢 Active Scan</span>
         </div>
         <h2 className="text-2xl font-black uppercase italic leading-none">Scanning for <br />Help Nodes...</h2>
      </div>

      <div className="space-y-4">
        {sortedNodes.map((node, index) => (
          <div key={node.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-red-600/30 transition-all">
            <div className="flex items-center gap-5">
               <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-red-50 transition-all shadow-inner border border-gray-100">{node.icon}</div>
               <div>
                  <div className="flex items-center gap-2">
                     <p className="font-black text-sm uppercase italic tracking-tight">{node.name}</p>
                     {index === 0 && <span className="text-[7px] bg-green-500 text-white px-2 py-0.5 rounded-full font-black uppercase">Closest</span>}
                  </div>
                  <p className="text-[8px] font-black text-red-600 uppercase tracking-widest mt-1">{node.type}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">{node.location}</p>
               </div>
            </div>
            <button 
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${node.coords.lat},${node.coords.lng}`, '_blank')}
              className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white text-xs group-hover:bg-red-600 transition-all"
            >
              ➔
            </button>
          </div>
        ))}
      </div>

      <div className="mt-10 p-8 bg-gray-900 rounded-[40px] text-center">
         <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Cannot Reach Help?</p>
         <button onClick={() => navigate("/user/send-alert")} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-900/20">Trigger Remote SOS</button>
      </div>
    </div>
  );
}
