import { useEffect, useRef, useState } from 'react';
import { GameEngine, InventoryState } from '../game/GameEngine';
import { Heart, Utensils, Zap, Sun, Moon, X, Hammer, Axe, Pickaxe, Flame } from 'lucide-react';

interface HUDProps {
  engine: GameEngine;
  health: number;
  hunger: number;
  stamina: number;
  inventory: InventoryState;
  timeOfDay: number;
  isNight: boolean;
  rainIntensity: number;
  alertMsg: string;
}

export const HUD: React.FC<HUDProps> = ({
  engine,
  health,
  hunger,
  stamina,
  inventory,
  timeOfDay,
  isNight,
  rainIntensity,
  alertMsg
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [craftOpen, setCraftOpen] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });

  // Keyboard
  useEffect(() => {
    const keysDown = new Set<string>();
    const updateMove = () => {
      let x = 0, y = 0;
      if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) y = 1;
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) y = -1;
      if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) x = -1;
      if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) x = 1;
      engine.moveVector.set(x, y);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keysDown.add(e.code);
      updateMove();
      if (e.code === 'Space') { e.preventDefault(); engine.triggerAction(); }
      if (e.code === 'Digit1') engine.equipTool(inventory.axe ? 'axe' : 'none');
      if (e.code === 'Digit2') engine.equipTool(inventory.pickaxe ? 'pickaxe' : 'none');
      if (e.code === 'Digit3') engine.equipTool(inventory.cookedMeat > 0 ? 'meat' : 'none');
      if (e.code === 'KeyE' || e.code === 'Tab') { e.preventDefault(); setCraftOpen(p => !p); }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
      updateMove();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine, inventory]);

  // Touch joystick
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!joystickRef.current) return;
    e.stopPropagation();
    const rect = joystickRef.current.getBoundingClientRect();
    const touch = e.targetTouches[0];
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    touchStartRef.current = center;
    updateJoystick(touch.clientX, touch.clientY, center);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.targetTouches[0];
    updateJoystick(touch.clientX, touch.clientY, touchStartRef.current);
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    engine.moveVector.set(0, 0);
    setJoystickPos({ x: 0, y: 0 });
  };

  const updateJoystick = (tx: number, ty: number, center: { x: number; y: number }) => {
    const dx = tx - center.x;
    const dy = ty - center.y;
    const maxR = 38;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxR);
    const angle = Math.atan2(dy, dx);
    const cx = Math.cos(angle) * dist;
    const cy = Math.sin(angle) * dist;
    engine.moveVector.set(cx / maxR, -cy / maxR);
    setJoystickPos({ x: cx, y: cy });
  };

  const timeLabel = isNight ? '🌙 Night' : timeOfDay < 0.35 ? '🌅 Dawn' : timeOfDay < 0.65 ? '☀️ Day' : '🌇 Dusk';

  // Stat bar
  const StatBar = ({ icon, value, color, bg }: { icon: React.ReactNode; value: number; color: string; bg: string }) => (
    <div className="flex items-center gap-1.5">
      <div className={color}>{icon}</div>
      <div className="w-16 h-1.5 bg-stone-800/80 rounded-full overflow-hidden">
        <div className={`h-full ${bg} transition-all duration-300`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 z-40 pointer-events-none flex flex-col">

      {/* ─── TOP BAR: Crafting + Stats + Resources ─── */}
      <div className="safe-top px-2 pt-2 pointer-events-auto">

        {/* Alert */}
        {alertMsg && (
          <div className="animate-slide-down mx-auto max-w-sm mb-2 px-3 py-1.5 bg-stone-950/90 border border-emerald-700/40 rounded-xl text-center text-xs text-emerald-300 backdrop-blur-md shadow-lg">
            {alertMsg}
          </div>
        )}

        <div className="flex items-start justify-between gap-2">

          {/* Crafting Button + Panel */}
          <div className="relative">
            <button
              onClick={() => setCraftOpen(!craftOpen)}
              className={`touch-btn w-11 h-11 rounded-xl backdrop-blur-sm transition-all active:scale-90 ${
                craftOpen ? 'bg-emerald-700/80 border-emerald-500/50' : 'bg-stone-900/80 border-stone-700/50'
              } border shadow-lg flex items-center justify-center`}
            >
              <Hammer className="w-5 h-5 text-emerald-400" />
            </button>
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-stone-500 whitespace-nowrap">E / TAB</span>

            {/* Minecraft-style Crafting Panel */}
            {craftOpen && (
              <div className="absolute top-14 left-0 z-50 animate-fade-in bg-stone-950/95 backdrop-blur-lg rounded-2xl border border-stone-700/50 shadow-2xl p-3 min-w-[280px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Hammer className="w-4 h-4" /> Crafting
                  </h3>
                  <button onClick={() => setCraftOpen(false)} className="touch-btn w-7 h-7 rounded-lg bg-stone-800/60 hover:bg-stone-700">
                    <X className="w-4 h-4 text-stone-400" />
                  </button>
                </div>

                {/* Inventory Grid */}
                <div className="grid grid-cols-5 gap-1 mb-3 p-2 bg-stone-900/60 rounded-xl border border-stone-800/40">
                  <div className="flex flex-col items-center p-1.5 bg-stone-800/40 rounded-lg">
                    <span className="text-lg">🪵</span>
                    <span className="text-xs font-bold text-amber-300">{inventory.wood}</span>
                  </div>
                  <div className="flex flex-col items-center p-1.5 bg-stone-800/40 rounded-lg">
                    <span className="text-lg">🪨</span>
                    <span className="text-xs font-bold text-stone-300">{inventory.stone}</span>
                  </div>
                  <div className="flex flex-col items-center p-1.5 bg-stone-800/40 rounded-lg">
                    <span className="text-lg">🥩</span>
                    <span className="text-xs font-bold text-red-300">{inventory.rawMeat}</span>
                  </div>
                  <div className="flex flex-col items-center p-1.5 bg-stone-800/40 rounded-lg">
                    <span className="text-lg">🍖</span>
                    <span className="text-xs font-bold text-orange-300">{inventory.cookedMeat}</span>
                  </div>
                  <div className="flex flex-col items-center p-1.5 bg-stone-800/40 rounded-lg">
                    <span className="text-lg">🥕</span>
                    <span className="text-xs font-bold text-orange-400">{inventory.carrot}</span>
                  </div>
                </div>

                {/* Crafting Recipes Grid */}
                <div className="space-y-1.5">
                  {/* Workbench */}
                  <button
                    onClick={() => engine.craft('workbench')}
                    disabled={inventory.workbench}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all active:scale-[0.98] ${
                      inventory.workbench
                        ? 'bg-emerald-900/30 border border-emerald-800/30'
                        : 'bg-stone-800/50 border border-stone-700/30 hover:bg-stone-700/50'
                    }`}
                  >
                    <span className="text-xl">🔨</span>
                    <div className="flex-1 text-left">
                      <p className="text-xs font-bold text-stone-200">{inventory.workbench ? '✓ Workbench' : 'Workbench'}</p>
                      <p className="text-[10px] text-stone-500">4 Wood — Required for tools</p>
                    </div>
                  </button>

                  {/* Axe */}
                  <button
                    onClick={() => engine.craft('axe')}
                    disabled={inventory.axe || !inventory.workbench}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all active:scale-[0.98] ${
                      inventory.axe
                        ? 'bg-emerald-900/30 border border-emerald-800/30'
                        : !inventory.workbench
                        ? 'bg-stone-900/30 border border-stone-800/20 opacity-50'
                        : 'bg-stone-800/50 border border-stone-700/30 hover:bg-stone-700/50'
                    }`}
                  >
                    <Axe className="w-5 h-5 text-amber-400" />
                    <div className="flex-1 text-left">
                      <p className="text-xs font-bold text-stone-200">{inventory.axe ? '✓ Axe' : 'Axe'}</p>
                      <p className="text-[10px] text-stone-500">3 Wood + 2 Stone</p>
                    </div>
                    {!inventory.workbench && <span className="text-[9px] text-red-400">Need Workbench</span>}
                  </button>

                  {/* Pickaxe */}
                  <button
                    onClick={() => engine.craft('pickaxe')}
                    disabled={inventory.pickaxe || !inventory.workbench}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all active:scale-[0.98] ${
                      inventory.pickaxe
                        ? 'bg-emerald-900/30 border border-emerald-800/30'
                        : !inventory.workbench
                        ? 'bg-stone-900/30 border border-stone-800/20 opacity-50'
                        : 'bg-stone-800/50 border border-stone-700/30 hover:bg-stone-700/50'
                    }`}
                  >
                    <Pickaxe className="w-5 h-5 text-stone-400" />
                    <div className="flex-1 text-left">
                      <p className="text-xs font-bold text-stone-200">{inventory.pickaxe ? '✓ Pickaxe' : 'Pickaxe'}</p>
                      <p className="text-[10px] text-stone-500">2 Wood + 3 Stone</p>
                    </div>
                  </button>

                  {/* Campfire */}
                  <button
                    onClick={() => engine.craft('campfire')}
                    className="w-full flex items-center gap-3 p-2 rounded-xl bg-stone-800/50 border border-stone-700/30 hover:bg-stone-700/50 transition-all active:scale-[0.98]"
                  >
                    <Flame className="w-5 h-5 text-orange-400" />
                    <div className="flex-1 text-left">
                      <p className="text-xs font-bold text-stone-200">Campfire</p>
                      <p className="text-[10px] text-stone-500">5 Wood + 3 Stone — Cook meat</p>
                    </div>
                    {inventory.campfireCount > 0 && <span className="text-xs text-emerald-400">×{inventory.campfireCount}</span>}
                  </button>

                  {/* Furnace */}
                  <button
                    onClick={() => engine.craft('furnace')}
                    disabled={!inventory.workbench}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all active:scale-[0.98] ${
                      !inventory.workbench
                        ? 'bg-stone-900/30 border border-stone-800/20 opacity-50'
                        : 'bg-stone-800/50 border border-stone-700/30 hover:bg-stone-700/50'
                    }`}
                  >
                    <span className="text-xl">🧱</span>
                    <div className="flex-1 text-left">
                      <p className="text-xs font-bold text-stone-200">Furnace</p>
                      <p className="text-[10px] text-stone-500">8 Stone — Fast cooking</p>
                    </div>
                    {inventory.furnaceCount > 0 && <span className="text-xs text-emerald-400">×{inventory.furnaceCount}</span>}
                  </button>
                </div>

                <p className="text-[10px] text-stone-600 mt-3 text-center">
                  Interact with campfire/furnace to cook raw meat
                </p>
              </div>
            )}
          </div>

          {/* Center: Stats */}
          <div className="bg-stone-950/70 backdrop-blur-md rounded-xl px-3 py-2 border border-stone-800/30 shadow-lg">
            <div className="flex gap-3 items-center">
              <StatBar icon={<Heart className="w-3 h-3" />} value={health} color="text-red-400" bg="bg-gradient-to-r from-red-600 to-red-400" />
              <StatBar icon={<Utensils className="w-3 h-3" />} value={hunger} color="text-orange-400" bg="bg-gradient-to-r from-orange-600 to-amber-400" />
              <StatBar icon={<Zap className="w-3 h-3" />} value={stamina} color="text-yellow-400" bg="bg-gradient-to-r from-yellow-500 to-yellow-300" />
            </div>
          </div>

          {/* Right: Time */}
          <div className="bg-stone-950/70 backdrop-blur-md rounded-xl px-2.5 py-2 border border-stone-800/30 shadow-lg">
            <div className="flex items-center gap-1.5">
              {isNight ? <Moon className="w-3.5 h-3.5 text-blue-300" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              <span className="text-xs font-semibold text-stone-300">{timeLabel}</span>
              {rainIntensity > 0.15 && <span className="text-xs">🌧️</span>}
            </div>
          </div>

        </div>
      </div>

      {/* ─── DEATH OVERLAY ─── */}
      {health <= 0 && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center pointer-events-auto animate-fade-in">
          <p className="text-7xl mb-4 animate-breathe">💀</p>
          <h2 className="text-2xl font-black text-red-500 mb-2">YOU HAVE FALLEN</h2>
          <p className="text-stone-500 mb-8 text-center max-w-xs text-sm px-4">
            The forest claims another soul...
          </p>
          <button
            onClick={() => engine.respawn()}
            className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-xl"
          >
            🔄 Respawn
          </button>
        </div>
      )}

      {/* ─── SPACER + PLACEMENT BUTTONS ─── */}
      <div className="flex-1 flex flex-col justify-end pointer-events-none">
        {(inventory.campfireCount > 0 || inventory.furnaceCount > 0) && (
          <div className="flex gap-2 px-3 justify-center mb-2 pointer-events-auto">
            {inventory.campfireCount > 0 && (
              <button
                onClick={() => engine.placeStructure('campfire')}
                className="px-3 py-2 bg-orange-600/80 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform shadow-lg"
              >
                🔥 Place Fire ×{inventory.campfireCount}
              </button>
            )}
            {inventory.furnaceCount > 0 && (
              <button
                onClick={() => engine.placeStructure('furnace')}
                className="px-3 py-2 bg-stone-600/80 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform shadow-lg"
              >
                🧱 Place Furnace ×{inventory.furnaceCount}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── BOTTOM CONTROLS ─── */}
      <div className="safe-bottom pointer-events-auto px-3 pb-4 pt-2">

        {/* Tool Slots */}
        <div className="flex justify-center gap-1.5 mb-3">
          <button onClick={() => engine.equipTool('none')} className="touch-btn w-11 h-11 rounded-xl bg-stone-900/80 border border-stone-700/50 text-lg active:scale-90 transition-transform">✊</button>
          {inventory.axe && (
            <button onClick={() => engine.equipTool('axe')} className="touch-btn w-11 h-11 rounded-xl bg-stone-900/80 border border-amber-600/40 active:scale-90 transition-transform">
              <Axe className="w-5 h-5 text-amber-400" />
            </button>
          )}
          {inventory.pickaxe && (
            <button onClick={() => engine.equipTool('pickaxe')} className="touch-btn w-11 h-11 rounded-xl bg-stone-900/80 border border-stone-500/40 active:scale-90 transition-transform">
              <Pickaxe className="w-5 h-5 text-stone-400" />
            </button>
          )}
          {inventory.cookedMeat > 0 && (
            <button onClick={() => engine.equipTool('meat')} className="touch-btn w-11 h-11 rounded-xl bg-stone-900/80 border border-orange-600/40 active:scale-90 transition-transform text-lg">🍖</button>
          )}
        </div>

        {/* Control Row */}
        <div className="flex justify-between items-end">

          {/* Joystick */}
          <div
            ref={joystickRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative w-[96px] h-[96px] bg-stone-900/50 rounded-full border border-stone-700/40 flex items-center justify-center touch-none backdrop-blur-sm shadow-inner"
          >
            <div className="absolute inset-3 rounded-full border border-stone-700/20" />
            <div
              className="absolute w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full shadow-lg border-2 border-emerald-400/60 transition-transform duration-75"
              style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }}
            />
          </div>

          {/* Camera Hint - Desktop */}
          <div className="hidden md:flex flex-col items-center text-stone-600 text-xs">
            <p>🖱️ Click to look</p>
            <p>WASD to move</p>
          </div>

          {/* Mobile swipe hint */}
          <div className="md:hidden flex flex-col items-center text-stone-600 text-[10px]">
            <p>Swipe right side</p>
            <p>to look around</p>
          </div>

          {/* Action Button */}
          <div className="flex flex-col items-center gap-2">
            {inventory.cookedMeat > 0 && (
              <button
                onClick={() => { engine.equipTool('meat'); engine.triggerAction(); }}
                className="px-3 py-1.5 bg-orange-600/80 text-white text-xs font-bold rounded-lg active:scale-90 transition-transform"
              >
                🍖 Eat
              </button>
            )}
            <button
              onClick={() => engine.triggerAction()}
              className="w-[76px] h-[76px] bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 rounded-[20px] text-white font-black shadow-2xl active:scale-90 transition-transform flex flex-col items-center justify-center border-2 border-emerald-400/40"
            >
              <span className="text-2xl leading-none mb-0.5">⚔️</span>
              <span className="text-[9px] font-bold tracking-wider">ACTION</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
