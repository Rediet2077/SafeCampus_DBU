import { useEffect, useState } from "react";
import { rtdb } from "../firebase";
import { ref, onValue } from "firebase/database";

const dbuLocations = [
  { id: 'zone_1', name: "Administration Block", coords: { top: "20%", left: "45%" }, safetyLevel: "Safe", aiReason: "High surveillance, well-lit" },
  { id: 'zone_2', name: "Main Library", coords: { top: "35%", left: "30%" }, safetyLevel: "Safe", aiReason: "Continuous security presence" },
  { id: 'zone_3', name: "Engineering Complex", coords: { top: "50%", left: "20%" }, safetyLevel: "Moderate", aiReason: "Isolated after 8:00 PM" },
  { id: 'zone_4', name: "Student Cafe 1", coords: { top: "45%", left: "60%" }, safetyLevel: "Safe", aiReason: "High foot traffic" },
  { id: 'zone_5', name: "Medical Center", coords: { top: "15%", left: "70%" }, safetyLevel: "Safe", aiReason: "24/7 Staffed" },
  { id: 'zone_6', name: "Girls' Dormitory Path", coords: { top: "70%", left: "80%" }, safetyLevel: "Moderate", aiReason: "Dark area, lighting malfunction" },
  { id: 'zone_7', name: "Boys' Dormitory", coords: { top: "75%", left: "40%" }, safetyLevel: "Safe", aiReason: "Standard patrol" },
  { id: 'zone_8', name: "Sport Stadium", coords: { top: "10%", left: "10%" }, safetyLevel: "Dangerous", aiReason: "Repeated incidents, isolated zone" },
  { id: 'zone_9', name: "Block 10 (Main Hall)", coords: { top: "30%", left: "55%" }, safetyLevel: "Dangerous", aiReason: "Low visibility, blind spots detected" },
];

export default function CampusMap() {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    const alertsRef = ref(rtdb, 'alerts');
    const unsubscribe = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const alerts = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(a => a.status === "active");
        setActiveAlerts(alerts);
      } else {
        setActiveAlerts([]);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Campus <span className="text-red-600">Incident Map</span></h1>
          <p className="text-gray-400 mt-1 text-sm">Visualizing {activeAlerts.length} active emergency reports across DBU.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
            <span className="text-[10px] font-bold text-white uppercase">Critical Alert</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1">
        {/* Map View */}
        <div className="lg:col-span-3 relative bg-gray-900 rounded-[32px] overflow-hidden border border-gray-800 shadow-2xl min-h-[500px]">
          <iframe 
            src="https://maps.google.com/maps?q=9.6569,39.5220&t=k&z=17&output=embed" 
            className="w-full h-full border-0 grayscale invert contrast-125 opacity-70"
            allowFullScreen="" 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
          
          {/* 🛡️ AI THREAT ZONES OVERLAY */}
          <div className="absolute inset-0 pointer-events-none z-10">
            {dbuLocations.map((zone) => (
              <div 
                key={zone.id}
                className="absolute pointer-events-auto group"
                style={{ top: zone.coords.top, left: zone.coords.left, transform: 'translate(-50%, -50%)' }}
              >
                {/* Zone Radius Indicator */}
                <div className={`w-32 h-32 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 transition-all duration-700 ${
                  zone.safetyLevel === 'Dangerous' ? 'bg-red-600 animate-[ping_3s_ease-in-out_infinite]' :
                  zone.safetyLevel === 'Moderate' ? 'bg-yellow-500 animate-[ping_4s_ease-in-out_infinite]' :
                  'bg-green-500 opacity-5'
                }`} />
                
                {/* Zone Marker */}
                <div className={`w-4 h-4 rounded-full border-2 border-gray-900 shadow-xl z-10 relative ${
                  zone.safetyLevel === 'Dangerous' ? 'bg-red-500' :
                  zone.safetyLevel === 'Moderate' ? 'bg-yellow-400' :
                  'bg-green-500'
                }`} />

                {/* AI Hover Intelligence */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48 bg-black/90 backdrop-blur-xl border border-gray-800 rounded-2xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2 mb-2">Sector Intelligence</p>
                   <p className="text-white font-bold text-xs leading-tight mb-1">{zone.name}</p>
                   <div className="flex items-center gap-2 mb-2">
                     <span className={`w-2 h-2 rounded-full ${zone.safetyLevel === 'Dangerous' ? 'bg-red-500' : zone.safetyLevel === 'Moderate' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                     <span className="text-[9px] font-black uppercase text-gray-300">{zone.safetyLevel} Zone</span>
                   </div>
                   <p className="text-[8px] font-black text-blue-400 uppercase leading-relaxed bg-blue-900/20 p-2 rounded-lg border border-blue-900/50">
                     🤖 AI Note: {zone.aiReason}
                   </p>
                </div>
              </div>
            ))}
          </div>

          {/* Active Incident Pins - Overlaying on Map */}
          <div className="absolute inset-0 pointer-events-none z-20">
            {activeAlerts.map((alert) => {
              const loc = dbuLocations.find(l => l.name === alert.location);
              if (!loc) return null;

              return (
                <div 
                  key={alert.id}
                  className="absolute cursor-pointer transition-transform hover:scale-125 pointer-events-auto"
                  style={{ top: loc.coords.top, left: loc.coords.left }}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div className="relative flex flex-col items-center">
                    <div className="bg-red-600 text-white p-2 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] border-2 border-white animate-bounce relative z-30">
                      🚨
                    </div>
                    <div className="absolute -bottom-8 bg-black/80 backdrop-blur-md border border-red-600/30 text-[9px] font-black text-white px-2 py-1 rounded-lg whitespace-nowrap shadow-2xl uppercase tracking-widest z-30">
                      {alert.userName || 'CRITICAL'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Map Overlay Info */}
          <div className="absolute bottom-6 left-6 bg-black/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl">
            <p className="text-[9px] font-black text-red-600 uppercase tracking-[0.3em] mb-1">Live DBU Campus Grid</p>
            <p className="text-white font-black text-[11px] flex items-center gap-2 uppercase italic">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> 
              Real-time Satellite Sync
            </p>
          </div>
        </div>

        {/* Incident Sidebar */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest px-2">Active Reports</h3>
          <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2">
            {activeAlerts.length === 0 ? (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center">
                <p className="text-gray-500 text-xs italic">No active incidents</p>
              </div>
            ) : (
              activeAlerts.map(alert => (
                <button
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedAlert?.id === alert.id 
                    ? 'bg-red-600/10 border-red-500/50 shadow-lg' 
                    : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <p className="text-xs font-black text-red-500 uppercase mb-1">{alert.type || 'Emergency'}</p>
                  <p className="text-sm font-bold text-white mb-2">{alert.message}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold">
                    <span>📍 {alert.location}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {selectedAlert && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 animate-in slide-in-from-bottom-4">
              <h4 className="text-xs font-bold text-white mb-2 uppercase">Quick Actions</h4>
              <button 
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedAlert.coordinates?.lat},${selectedAlert.coordinates?.lng}`, '_blank')}
                className="w-full bg-blue-600 py-3 rounded-xl text-xs font-bold hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
              >
                <span>🧭</span> Open Navigation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
