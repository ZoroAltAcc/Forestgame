import { useState } from 'react';
import { GameConfig } from '../game/GameEngine';
import { TreePine, Swords, CloudRain, Volume2, Monitor, Clock, ChevronRight, Sparkles } from 'lucide-react';

interface TitleScreenProps {
  config: GameConfig;
  onUpdateConfig: (cfg: Partial<GameConfig>) => void;
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  config,
  onUpdateConfig,
  onStartGame
}) => {
  const [soundVolume, setSoundVolume] = useState(80);
  const [activeTab, setActiveTab] = useState<'world' | 'settings'>('world');

  const difficultyInfo: Record<string, { icon: string; desc: string; color: string }> = {
    peaceful: { icon: '🌿', desc: 'No enemies, pure exploration', color: 'emerald' },
    normal: { icon: '⚔️', desc: 'Balanced survival challenge', color: 'amber' },
    hard: { icon: '💀', desc: 'Ruthless enemies, scarce resources', color: 'red' },
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden">
      {/* Animated dark forest background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#060d08] via-[#0a1a0e] to-[#040806]" />
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_30%_20%,rgba(16,185,129,0.15),transparent_60%),radial-gradient(ellipse_at_70%_80%,rgba(245,158,11,0.1),transparent_60%)]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">

        {/* Hero Header */}
        <div className="safe-top px-5 pt-6 pb-4 md:pt-10 md:pb-6 text-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-800/40 text-emerald-400 text-xs mb-3">
            <Sparkles className="w-3 h-3" />
            <span>Low-Poly 3D Browser Game</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-emerald-300 via-green-200 to-emerald-400 bg-clip-text text-transparent">
              CozyWood
            </span>
          </h1>
          <p className="text-stone-500 text-sm md:text-base mt-1 font-medium tracking-wide">
            SURVIVAL CHRONICLES
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 mb-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex bg-stone-900/60 rounded-2xl p-1 border border-stone-800/50 max-w-md mx-auto">
            <button
              onClick={() => setActiveTab('world')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'world'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-stone-400 hover:text-stone-300'
              }`}
            >
              <TreePine className="w-4 h-4" />
              World
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'settings'
                  ? 'bg-stone-700 text-white shadow-lg shadow-stone-900/40'
                  : 'text-stone-400 hover:text-stone-300'
              }`}
            >
              <Monitor className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Scrollable Card Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4">
          <div className="max-w-md mx-auto space-y-4 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>

            {activeTab === 'world' ? (
              <>
                {/* Story Card */}
                <div className="relative rounded-2xl overflow-hidden border border-stone-800/40">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 to-stone-950/90" />
                  <div className="relative p-4">
                    <p className="text-sm text-stone-300 leading-relaxed">
                      You awaken in an ancient forest — heavy rain patters through towering canopies,
                      a winding river cuts through the valley, and mysterious crystals pulse in the distance.
                      <span className="text-emerald-400 font-medium"> Gather, craft, build, and survive the night.</span>
                    </p>
                  </div>
                </div>

                {/* Difficulty Selection */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2.5 px-1">
                    <Swords className="w-3.5 h-3.5" />
                    Difficulty
                  </label>
                  <div className="space-y-2">
                    {(['peaceful', 'normal', 'hard'] as const).map(diff => {
                      const info = difficultyInfo[diff];
                      const selected = config.difficulty === diff;
                      return (
                        <button
                          key={diff}
                          onClick={() => onUpdateConfig({ difficulty: diff })}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                            selected
                              ? 'bg-emerald-900/40 border-emerald-600/60 shadow-lg shadow-emerald-900/20'
                              : 'bg-stone-900/40 border-stone-800/40 hover:border-stone-700'
                          }`}
                        >
                          <span className="text-xl">{info.icon}</span>
                          <div className="flex-1 text-left">
                            <p className={`text-sm font-semibold ${selected ? 'text-emerald-300' : 'text-stone-300'}`}>
                              {diff.charAt(0).toUpperCase() + diff.slice(1)}
                            </p>
                            <p className="text-xs text-stone-500">{info.desc}</p>
                          </div>
                          {selected && (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rain Intensity */}
                <div className="bg-stone-900/40 rounded-2xl p-4 border border-stone-800/40">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                      Rainfall
                    </label>
                    <span className="text-sm font-bold text-cyan-400">
                      {Math.round(config.rainIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.rainIntensity}
                    onChange={(e) => onUpdateConfig({ rainIntensity: parseFloat(e.target.value) })}
                    className="w-full bg-stone-800 rounded-full cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-xs text-stone-600 mt-2">
                    <span>☀️ Clear</span>
                    <span>🌦️ Drizzle</span>
                    <span>⛈️ Storm</span>
                  </div>
                </div>

                {/* Day Speed */}
                <div className="bg-stone-900/40 rounded-2xl p-4 border border-stone-800/40">
                  <label className="flex items-center gap-2 text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    Day/Night Speed
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 0.5, label: 'Slow', sub: '0.5×' },
                      { val: 1.0, label: 'Normal', sub: '1×' },
                      { val: 2.0, label: 'Fast', sub: '2×' },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => onUpdateConfig({ daySpeed: opt.val })}
                        className={`py-2.5 rounded-xl text-center transition-all duration-200 active:scale-95 ${
                          config.daySpeed === opt.val
                            ? 'bg-purple-600/80 border border-purple-500/60 text-white shadow-lg shadow-purple-900/30'
                            : 'bg-stone-800/60 border border-stone-700/40 text-stone-400 hover:text-stone-300'
                        }`}
                      >
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="text-xs opacity-70">{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Graphics Quality */}
                <div className="bg-stone-900/40 rounded-2xl p-4 border border-stone-800/40">
                  <label className="flex items-center gap-2 text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                    <Monitor className="w-3.5 h-3.5 text-amber-400" />
                    Graphics Quality
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { val: 'low' as const, label: 'Low', desc: 'Best FPS', icon: '⚡' },
                      { val: 'medium' as const, label: 'Medium', desc: 'Balanced', icon: '✨' },
                      { val: 'high' as const, label: 'High', desc: 'Best look', icon: '💎' },
                    ]).map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => onUpdateConfig({ graphicsQuality: opt.val })}
                        className={`py-3 rounded-xl text-center transition-all duration-200 active:scale-95 ${
                          config.graphicsQuality === opt.val
                            ? 'bg-amber-600/80 border border-amber-500/60 text-white shadow-lg shadow-amber-900/30'
                            : 'bg-stone-800/60 border border-stone-700/40 text-stone-400 hover:text-stone-300'
                        }`}
                      >
                        <p className="text-lg mb-0.5">{opt.icon}</p>
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="text-xs opacity-60">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audio Volume */}
                <div className="bg-stone-900/40 rounded-2xl p-4 border border-stone-800/40">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      Sound Volume
                    </label>
                    <span className="text-sm font-bold text-amber-400">{soundVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(parseInt(e.target.value))}
                    className="w-full bg-stone-800 rounded-full cursor-pointer accent-amber-400"
                  />
                  <p className="text-xs text-stone-600 mt-2">
                    Procedurally synthesized — no files to download
                  </p>
                </div>

                {/* Controls Info */}
                <div className="bg-stone-900/40 rounded-2xl p-4 border border-stone-800/40">
                  <label className="flex items-center gap-2 text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                    🎮 Controls
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-20 text-right">
                        <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-xs text-stone-300 font-mono">WASD</kbd>
                      </span>
                      <span className="text-stone-400">Move character</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-20 text-right">
                        <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-xs text-stone-300 font-mono">Mouse</kbd>
                      </span>
                      <span className="text-stone-400">Rotate camera (click to lock)</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-20 text-right">
                        <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-xs text-stone-300 font-mono">Space</kbd>
                      </span>
                      <span className="text-stone-400">Action / Attack</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-20 text-right">
                        <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-xs text-stone-300 font-mono">1 2 3</kbd>
                      </span>
                      <span className="text-stone-400">Equip tools</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-stone-800/50">
                    <p className="text-xs text-stone-500">
                      📱 Mobile: Use on-screen joystick and action buttons
                    </p>
                  </div>
                </div>

                {/* About */}
                <div className="bg-stone-900/40 rounded-2xl p-4 border border-stone-800/40">
                  <p className="text-xs text-stone-500 leading-relaxed text-center">
                    Fully procedural world • Custom shaders • Web Audio synthesis
                    <br />
                    No downloads required • Works offline after first load
                  </p>
                </div>
              </>
            )}

          </div>
        </div>

        {/* Fixed Bottom Play Button */}
        <div className="safe-bottom px-5 pt-3 pb-4 bg-gradient-to-t from-[#060d08] via-[#060d08]/95 to-transparent">
          <div className="max-w-md mx-auto">
            <button
              onClick={onStartGame}
              className="animate-pulse-glow w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-600 text-white text-lg font-bold rounded-2xl active:scale-[0.97] transition-transform shadow-2xl shadow-emerald-900/50"
            >
              <span>Enter the Forest</span>
              <ChevronRight className="w-5 h-5" />
            </button>
            <p className="text-center text-xs text-stone-600 mt-2">
              Tap to begin your survival adventure
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
