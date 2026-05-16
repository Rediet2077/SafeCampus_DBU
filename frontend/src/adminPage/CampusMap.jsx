import { useEffect, useState } from "react";
import { rtdb } from "../firebase";
import { ref, onValue } from "firebase/database";

const dbuLocations = [
  { name: "Administration Block", coords: { top: "20%", left: "45%" } },
  { name: "Main Library", coords: { top: "35%", left: "30%" } },
  { name: "Engineering Complex", coords: { top: "50%", left: "20%" } },
  { name: "Student Cafe 1", coords: { top: "45%", left: "60%" } },
  { name: "Medical Center", coords: { top: "15%", left: "70%" } },
  { name: "Girls' Dormitory", coords: { top: "70%", left: "80%" } },
  { name: "Boys' Dormitory", coords: { top: "75%", left: "40%" } },
  { name: "Sport Stadium", coords: { top: "10%", left: "10%" } },
  { name: "Block 10 (Main Hall)", coords: { top: "30%", left: "55%" } },
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
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m13!1m3!1d15739.066421115264!2d39.5222!3d9.6823!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1647f38df483665b%3A0xe72688820015f8a0!2sDebre%20Berhan%20University!5e0!3m2!1sen!2set!4v1715870000000!5m2!1sen!2set" 
            className="w-full h-full border-0 grayscale invert contrast-125 opacity-70"
            allowFullScreen="" 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
          
          {/* Active Incident Pins - Overlaying on Map */}
          <div className="absolute inset-0 pointer-events-none">
            {activeAlerts.map((alert) => {
              const loc = dbuLocations.find(l => l.name === alert.location);
              if (!loc) return null;

              return (
                <div 
                  key={alert.id}
                  className="absolute cursor-pointer transition-transform hover:scale-125 z-20 pointer-events-auto"
                  style={{ top: loc.coords.top, left: loc.coords.left }}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div className="relative flex flex-col items-center">
                    <div className="bg-red-600 text-white p-2 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] border-2 border-white animate-bounce">
                      🚨
                    </div>
                    <div className="absolute -bottom-8 bg-black/80 backdrop-blur-md border border-red-600/30 text-[9px] font-black text-white px-2 py-1 rounded-lg whitespace-nowrap shadow-2xl uppercase tracking-widest">
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
