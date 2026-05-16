export default function CampusMap() {
  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Geographic <span className="text-red-600">Surveillance</span></h1>
        <p className="text-gray-400 mt-1 text-sm">Real-time incident location tracking and patrol routing.</p>
      </div>

      <div className="flex-1 min-h-[500px] bg-gray-900/50 border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        
        {/* Animated Radar Effect */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full border border-red-500/30 animate-ping absolute inset-0"></div>
          <div className="w-32 h-32 rounded-full border border-red-500/20 animate-pulse absolute inset-0 delay-75"></div>
          <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center text-4xl relative z-10 border border-gray-700">
            📡
          </div>
        </div>

        <div className="text-center mt-8 relative z-10">
          <h2 className="text-xl font-bold text-white">Map Engine Initializing</h2>
          <p className="text-gray-500 text-sm mt-2 max-w-sm px-4">
            The Google Maps API is ready for integration. All alert coordinates are currently being logged in the background.
          </p>
          
          <div className="mt-8 flex gap-3 justify-center">
            <span className="px-3 py-1 bg-red-600/10 border border-red-600/30 text-red-400 text-[10px] font-bold uppercase rounded-full">GPS: Enabled</span>
            <span className="px-3 py-1 bg-blue-600/10 border border-blue-600/30 text-blue-400 text-[10px] font-bold uppercase rounded-full">Tracking: Standby</span>
          </div>
        </div>
      </div>
    </div>
  );
}
