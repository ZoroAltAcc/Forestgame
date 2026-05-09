import React, { useState } from 'react';
import { GameConfig } from '../game/GameEngine';
import { TreePine, Flame, CloudRain, ShieldAlert, Sparkles, Play, Compass, Volume2 } from 'lucide-react';

interface TitleScreenProps {
  config: GameConfig;
  onUpdateConfig: (newConfig: Partial<GameConfig>) => void;
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  config,
  onUpdateConfig,
  onStartGame
}) => {
  const [worldSeedName, setWorldSeedName] = useState('Cozy Forest Delta');
  const [soundVolume, setSoundVolume] = useState(80);

  return (
    <div className="absolute inset-0 bg-[#0d1611] text-stone-100 flex flex-col justify-between overflow-y-auto p-4 md:p-8 select-none z-50 font-sans">
      {/* Top Atmosphere Bar */}
      <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 border-b border-stone-800 pb-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-800 to-stone-900 flex items-center justify-center border border-emerald-600 shadow-lg shadow-emerald-950">
            <TreePine className="w-8 h-8 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wider bg-gradient-to-r from-emerald-400 via-amber-200 to-stone-300 bg-clip-text text-transparent">
              COZYWOOD: SURVIVAL
            </h1>
            <p className="text-xs text-emerald-500/80 tracking-widest uppercase font-semibold">
              Low-Poly Stylized Procedural Universe
            </p>
          </div>
        </div>

        {/* Browser install reminder badge */}
        <div className="bg-stone-900/90 border border-stone-700/60 px-3 py-1.5 rounded-lg text-[11px] text-stone-300 flex items-center gap-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Add to Home Screen for fullscreen native app immersion</span>
        </div>
      </div>

      {/* Center Options Panel */}
      <div className="w-full max-w-4xl mx-auto my-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Column: World Setup & Narrative Storytelling */}
        <div className="bg-stone-900/60 backdrop-blur-md border border-stone-800/80 p-5 rounded-2xl flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-2 font-bold tracking-wide text-sm">
              <Compass className="w-4 h-4" />
              <span>IMMERSIVE WORLD BUILDER</span>
            </div>
            
            <p className="text-xs text-stone-300 leading-relaxed mb-4">
              You awaken stranded in an ancient cozy forest filled with heavy rainfall, winding flowing rivers, high cliffs, and mysterious glowing relics. Break trees, collect wood and stone, build axes and furnaces, cook wild hunted meat, and survive the crawling nighttime threats!
            </p>

            {/* Custom World Name */}
            <div className="mb-4">
              <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1">
                World Identity
              </label>
              <input 
                type="text" 
                value={worldSeedName}
                onChange={(e) => setWorldSeedName(e.target.value)}
                maxLength={24}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-emerald-300 font-mono outline-none focus:border-emerald-500 transition-colors" 
              />
            </div>

            {/* Difficulty Option */}
            <div className="mb-4">
              <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1">
                Wilderness Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['peaceful', 'normal', 'hard'] as const).map(diff => (
                  <button
                    key={diff}
                    onClick={() => onUpdateConfig({ difficulty: diff })}
                    className={`py-2 rounded-lg text-xs font-bold capitalize border transition-all ${
                      config.difficulty === diff 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm' 
                        : 'bg-stone-950/60 border-stone-800 text-stone-500 hover:border-stone-700'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Rain Intensity Adjuster */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] uppercase tracking-wider text-stone-400 font-bold flex items-center gap-1">
                  <CloudRain className="w-3 h-3 text-cyan-400" />
                  <span>Rainfall & Storm Shaders</span>
                </label>
                <span className="text-xs font-mono text-cyan-300">{Math.round(config.rainIntensity * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={config.rainIntensity} 
                onChange={(e) => onUpdateConfig({ rainIntensity: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 bg-stone-950 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-500 mt-1">
                <span>Clear Sky</span>
                <span>Cozy Mist</span>
                <span>Heavy Torrent</span>
              </div>
            </div>

          </div>

          <div className="mt-6 bg-emerald-950/40 border border-emerald-900/50 rounded-xl p-3 text-xs text-emerald-300 flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Features high quality mobile-optimized water flow shaders, wet terrain specular highlights, wind-reactive foliage, and 3D positional Web Audio.
            </span>
          </div>
        </div>

        {/* Right Column: Hardware Customization & Launch */}
        <div className="bg-stone-900/60 backdrop-blur-md border border-stone-800/80 p-5 rounded-2xl flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 mb-2 font-bold tracking-wide text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>BROWSER COMPATIBILITY TUNING</span>
            </div>

            <p className="text-xs text-stone-400 mb-4">
              Configure rendering targets to match your smartphone GPU or desktop browser speed. Fully supports Safari, Chrome, and iOS Web Apps.
            </p>

            {/* Graphics Preset */}
            <div className="mb-4">
              <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1">
                Graphics Quality & Shadows
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map(quality => (
                  <button
                    key={quality}
                    onClick={() => onUpdateConfig({ graphicsQuality: quality })}
                    className={`py-2.5 rounded-lg text-xs font-bold capitalize border transition-all ${
                      config.graphicsQuality === quality 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm' 
                        : 'bg-stone-950/60 border-stone-800 text-stone-500 hover:border-stone-700'
                    }`}
                  >
                    {quality === 'low' ? 'Low (60 FPS)' : quality === 'medium' ? 'Medium (Balanced)' : 'High (Ultra Shadows)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Volume synthesizer preview */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] uppercase tracking-wider text-stone-400 font-bold flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-amber-400" />
                  <span>Synthesized Web Audio Volume</span>
                </label>
                <span className="text-xs font-mono text-amber-300">{soundVolume}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={soundVolume}
                onChange={(e) => setSoundVolume(parseInt(e.target.value))}
                className="w-full accent-amber-400 bg-stone-950 h-2 rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-stone-500 mt-1">
                Pure algorithmic synthesized ambient forest wind, rain ripples, and crackling logs.
              </p>
            </div>

            {/* Cinematic Day cycle speed */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1">
                Day / Night Cycle Speed
              </label>
              <div className="flex gap-2">
                {[0.5, 1.0, 2.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => onUpdateConfig({ daySpeed: spd })}
                    className={`flex-1 py-1.5 rounded-md text-xs font-mono border ${
                      config.daySpeed === spd 
                        ? 'bg-stone-800 border-stone-400 text-stone-200' 
                        : 'bg-stone-950 border-stone-900 text-stone-600'
                    }`}
                  >
                    {spd}x Speed
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Gorgeous Big Launch Button */}
          <button
            onClick={onStartGame}
            className="w-full mt-6 bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-stone-950 font-black text-lg py-4 rounded-xl shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-3 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Play className="w-6 h-6 fill-stone-950" />
            <span>ENTER THE WILDERNESS</span>
          </button>
        </div>

      </div>

      {/* Bottom Aesthetic Footer */}
      <div className="w-full max-w-4xl mx-auto text-center border-t border-stone-800 pt-3 text-[11px] text-stone-500 flex flex-col md:flex-row justify-between items-center gap-2 pb-6 md:pb-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-500" /> Warm Orange Fire Glow
          </span>
          <span>•</span>
          <span>Atmospheric Perspective</span>
          <span>•</span>
          <span>3D Third-Person Camera</span>
        </div>
        <div>
          <span>Designed with absolute mobile safeties • Fully Custom Stylized Geometries</span>
        </div>
      </div>
    </div>
  );
};
