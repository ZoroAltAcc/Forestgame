import React, { useEffect, useRef } from 'react';
import { GameEngine, InventoryState } from '../game/GameEngine';
import { 
  Heart, 
  Utensils, 
  Zap, 
  Sun, 
  Moon, 
  Hammer, 
  PlusCircle, 
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

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

  // Keyboard navigation fallback for desktop/laptop enjoyment
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') engine.moveVector.y = 1;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') engine.moveVector.y = -1;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') engine.moveVector.x = -1;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') engine.moveVector.x = 1;
      if (e.code === 'Space') engine.triggerAction();
      if (e.code === 'Digit1') engine.equipTool(inventory.axe ? 'axe' : 'none');
      if (e.code === 'Digit2') engine.equipTool(inventory.pickaxe ? 'pickaxe' : 'none');
      if (e.code === 'Digit3') engine.equipTool(inventory.cookedMeat > 0 ? 'meat' : 'none');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'KeyS' || e.code === 'ArrowDown') engine.moveVector.y = 0;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft' || e.code === 'KeyD' || e.code === 'ArrowRight') engine.moveVector.x = 0;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine, inventory]);

  // Touch Virtual Joystick Logic
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const touch = e.targetTouches[0];
    
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    touchStartRef.current = center;
    
    updateJoystickVector(touch.clientX, touch.clientY, center);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.targetTouches[0];
    updateJoystickVector(touch.clientX, touch.clientY, touchStartRef.current);
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    engine.moveVector.set(0, 0);
  };

  const updateJoystickVector = (tx: number, ty: number, center: { x: number; y: number }) => {
    const dx = tx - center.x;
    const dy = ty - center.y;
    const maxRadius = 45;
    
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    const clampedDist = Math.min(dist, maxRadius);
    
    // Normalize vector from -1 to 1
    const vx = (Math.cos(angle) * clampedDist) / maxRadius;
    const vy = -(Math.sin(angle) * clampedDist) / maxRadius; // invert Y for standard forward
    
    engine.moveVector.set(vx, vy);
  };

  // Compute time label
  const timeLabel = isNight 
    ? "Midnight Threats" 
    : timeOfDay < 0.35 ? "Golden Sunrise" 
    : timeOfDay < 0.65 ? "Bright Noon" 
    : "Cozy Sunset";

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 select-none z-40 font-sans">
      
      {/* --- TOP HEADER BAR: STATS, TIME, & NOTIFICATIONS --- */}
      <div className="w-full flex flex-col gap-2 pointer-events-auto max-w-6xl mx-auto pt-2">
        
        {/* Status notification prompt */}
        {alertMsg && (
          <div className="bg-stone-900/95 border border-amber-500/50 text-amber-300 text-xs py-1.5 px-4 rounded-xl shadow-lg mx-auto text-center animate-bounce font-bold tracking-wide">
            {alertMsg}
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-stone-950/70 backdrop-blur-md p-3 rounded-2xl border border-stone-800/80 shadow-xl">
          
          {/* Top Left: Survival Stats */}
          <div className="flex items-center gap-4">
            
            {/* Health Bar */}
            <div className="flex flex-col gap-1 w-24 md:w-32">
              <div className="flex justify-between text-[10px] font-bold text-stone-300 uppercase">
                <span className="flex items-center gap-1 text-red-400">
                  <Heart className="w-3 h-3 fill-red-400" /> HP
                </span>
                <span>{health}%</span>
              </div>
              <div className="w-full bg-stone-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-stone-800">
                <div 
                  className="bg-gradient-to-r from-red-600 to-red-400 h-full rounded-full transition-all duration-300" 
                  style={{ width: `${health}%` }}
                />
              </div>
            </div>

            {/* Hunger Bar */}
            <div className="flex flex-col gap-1 w-24 md:w-32">
              <div className="flex justify-between text-[10px] font-bold text-stone-300 uppercase">
                <span className="flex items-center gap-1 text-amber-500">
                  <Utensils className="w-3 h-3" /> Hunger
                </span>
                <span>{hunger}%</span>
              </div>
              <div className="w-full bg-stone-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-stone-800">
                <div 
                  className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-300" 
                  style={{ width: `${hunger}%` }}
                />
              </div>
            </div>

            {/* Stamina Bar */}
            <div className="flex flex-col gap-1 w-24 md:w-32">
              <div className="flex justify-between text-[10px] font-bold text-stone-300 uppercase">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Zap className="w-3 h-3 fill-emerald-400" /> Stam
                </span>
                <span>{stamina}%</span>
              </div>
              <div className="w-full bg-stone-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-stone-800">
                <div 
                  className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-100" 
                  style={{ width: `${stamina}%` }}
                />
              </div>
            </div>

          </div>

          {/* Top Right: Clock & Resources Info */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-stone-800">
            
            {/* Cinematic Day cycle view */}
            <div className="flex items-center gap-2 bg-stone-900/80 px-3 py-1.5 rounded-lg border border-stone-700/50">
              {isNight ? (
                <Moon className="w-4 h-4 text-cyan-400 animate-spin" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
              )}
              <div className="text-left">
                <div className="text-[10px] text-stone-400 uppercase font-bold">{timeLabel}</div>
                <div className="text-xs font-mono text-stone-200 font-bold">
                  {rainIntensity > 0.1 ? '🌧️ Heavy Rain' : '🌲 Dark Cozy Forest'}
                </div>
              </div>
            </div>

            {/* Collected Backpack Counters */}
            <div className="flex items-center gap-3 bg-stone-900/80 px-3 py-1.5 rounded-lg border border-stone-700/50 text-xs font-bold">
              <div className="flex items-center gap-1 text-amber-600" title="Wood Logs">
                <Layers className="w-3.5 h-3.5" /> 
                <span className="text-stone-200 font-mono">{inventory.wood}</span>
              </div>
              <div className="flex items-center gap-1 text-stone-400" title="Faceted Stone">
                <span className="text-sm">🪨</span> 
                <span className="text-stone-200 font-mono">{inventory.stone}</span>
              </div>
              <div className="flex items-center gap-1 text-red-400" title="Raw Meat">
                <span className="text-sm">🥩</span> 
                <span className="text-stone-200 font-mono">{inventory.rawMeat}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400" title="Cooked Meat">
                <span className="text-sm">🍖</span> 
                <span className="text-stone-200 font-mono">{inventory.cookedMeat}</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* --- DEAD/RESPAWN OVERLAY TRIGGER --- */}
      {health <= 0 && (
        <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md pointer-events-auto flex flex-col items-center justify-center p-6 text-center z-50 animate-fade-in">
          <div className="text-6xl mb-2">💀</div>
          <h2 className="text-3xl font-black text-red-400 tracking-wider mb-2">
            YOU HAVE PERISHED
          </h2>
          <p className="text-xs text-stone-300 max-w-sm mb-6">
            The deep dark forest consumed your energy. The heavy rain patters against your abandoned pack.
          </p>
          <button
            onClick={() => engine.respawn()}
            className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-stone-950 font-black px-8 py-3 rounded-xl text-sm tracking-widest shadow-xl transition-all cursor-pointer"
          >
            AWAKEN ANEW (RESPAWN)
          </button>
        </div>
      )}

      {/* --- MIDDLE SIDE CRAFTING RECIPE LIST --- */}
      <div className="w-full flex justify-between items-end gap-2 pointer-events-auto max-w-6xl mx-auto my-auto py-2">
        
        {/* Crafting recipes menu list */}
        <div className="bg-stone-950/80 backdrop-blur-md p-2.5 rounded-xl border border-stone-800 text-stone-200 max-w-[200px] shadow-lg">
          <div className="flex items-center gap-1 text-[10px] text-amber-400 uppercase font-black tracking-wider border-b border-stone-800 pb-1 mb-1">
            <Hammer className="w-3 h-3" /> Survival Bench
          </div>
          
          <div className="flex flex-col gap-1.5">
            {/* Axe */}
            <button
              onClick={() => engine.craftItem('axe')}
              disabled={inventory.wood < 3 || inventory.stone < 2}
              className={`w-full text-left p-1.5 rounded flex items-center justify-between text-[11px] font-bold border transition-colors ${
                inventory.wood >= 3 && inventory.stone >= 2
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:bg-emerald-900 cursor-pointer'
                  : 'bg-stone-900/40 border-stone-800/60 text-stone-500 cursor-not-allowed'
              }`}
            >
              <span>🪓 Custom Axe</span>
              <span className="text-[9px] font-mono">3W 2S</span>
            </button>

            {/* Pickaxe */}
            <button
              onClick={() => engine.craftItem('pickaxe')}
              disabled={inventory.wood < 2 || inventory.stone < 3}
              className={`w-full text-left p-1.5 rounded flex items-center justify-between text-[11px] font-bold border transition-colors ${
                inventory.wood >= 2 && inventory.stone >= 3
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:bg-emerald-900 cursor-pointer'
                  : 'bg-stone-900/40 border-stone-800/60 text-stone-500 cursor-not-allowed'
              }`}
            >
              <span>⛏️ Pickaxe</span>
              <span className="text-[9px] font-mono">2W 3S</span>
            </button>

            {/* Campfire */}
            <button
              onClick={() => engine.craftItem('campfire')}
              disabled={inventory.wood < 4}
              className={`w-full text-left p-1.5 rounded flex items-center justify-between text-[11px] font-bold border transition-colors ${
                inventory.wood >= 4
                  ? 'bg-amber-950/60 border-amber-700 text-amber-300 hover:bg-amber-900 cursor-pointer'
                  : 'bg-stone-900/40 border-stone-800/60 text-stone-500 cursor-not-allowed'
              }`}
            >
              <span>🔥 Campfire Kit</span>
              <span className="text-[9px] font-mono">4W</span>
            </button>

            {/* Furnace */}
            <button
              onClick={() => engine.craftItem('furnace')}
              disabled={inventory.stone < 6}
              className={`w-full text-left p-1.5 rounded flex items-center justify-between text-[11px] font-bold border transition-colors ${
                inventory.stone >= 6
                  ? 'bg-amber-950/60 border-amber-700 text-amber-300 hover:bg-amber-900 cursor-pointer'
                  : 'bg-stone-900/40 border-stone-800/60 text-stone-500 cursor-not-allowed'
              }`}
            >
              <span>🧱 Stone Furnace</span>
              <span className="text-[9px] font-mono">6S</span>
            </button>
          </div>

          <div className="text-[9px] text-stone-500 mt-1 text-center font-mono">
            W=Wood • S=Stone
          </div>
        </div>

        {/* Custom Structure Placement Helpers */}
        <div className="flex flex-col gap-2">
          {inventory.campfireCount > 0 && (
            <button
              onClick={() => engine.placeStructure('campfire')}
              className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs px-3 py-2 rounded-xl flex items-center gap-1 shadow-lg animate-pulse cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Place Campfire ({inventory.campfireCount})
            </button>
          )}

          {inventory.furnaceCount > 0 && (
            <button
              onClick={() => engine.placeStructure('furnace')}
              className="bg-stone-300 hover:bg-white text-stone-950 font-black text-xs px-3 py-2 rounded-xl flex items-center gap-1 shadow-lg animate-pulse cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Place Furnace ({inventory.furnaceCount})
            </button>
          )}

          {/* Quick instructions reminder */}
          <div className="bg-stone-950/80 p-2 rounded-lg border border-stone-800 text-[10px] text-stone-400 text-right">
            <div>🌲 Break Trees for Wood</div>
            <div>🪨 Break Rocks for Stone</div>
            <div>🥩 Hunt Deer for Meat</div>
            <div>🧱 Furnace cooks raw meat</div>
          </div>
        </div>

      </div>

      {/* --- BOTTOM ROW: SAFE VIRTUAL DUAL CONTROLS & TOOL EQUIPPING --- */}
      {/* Kept beautifully padded away from bottom screen edges so iOS tab bars or Android home bars never block the game! */}
      <div className="w-full pointer-events-auto max-w-6xl mx-auto pb-6 md:pb-3 flex flex-col gap-3 mt-auto">
        
        {/* Equipped Tool Quick Slots */}
        <div className="flex justify-center gap-2 bg-stone-950/80 backdrop-blur-sm p-1.5 rounded-xl border border-stone-800 mx-auto">
          <button
            onClick={() => engine.equipTool('none')}
            className="px-3 py-1 rounded bg-stone-900 text-[11px] font-bold text-stone-300 hover:bg-stone-800 cursor-pointer"
          >
            ✋ Hand
          </button>
          
          {inventory.axe && (
            <button
              onClick={() => engine.equipTool('axe')}
              className="px-3 py-1 rounded bg-emerald-900/60 border border-emerald-600 text-[11px] font-bold text-emerald-300 animate-fade-in cursor-pointer"
            >
              🪓 Axe
            </button>
          )}

          {inventory.pickaxe && (
            <button
              onClick={() => engine.equipTool('pickaxe')}
              className="px-3 py-1 rounded bg-emerald-900/60 border border-emerald-600 text-[11px] font-bold text-emerald-300 animate-fade-in cursor-pointer"
            >
              ⛏️ Pickaxe
            </button>
          )}

          {inventory.cookedMeat > 0 && (
            <button
              onClick={() => engine.equipTool('meat')}
              className="px-3 py-1 rounded bg-amber-900/60 border border-amber-500 text-[11px] font-bold text-amber-300 animate-bounce cursor-pointer"
            >
              🍖 Hold Cooked Meat ({inventory.cookedMeat})
            </button>
          )}
        </div>

        {/* Touch Dual Controls Dashboard */}
        <div className="flex justify-between items-center px-2 gap-4">
          
          {/* Left Side: Interactive Virtual Traversal Joystick */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">
              MOVE CONTROLLER
            </div>
            <div 
              ref={joystickRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-stone-900/80 border-2 border-stone-700 flex items-center justify-center shadow-inner relative active:scale-95 transition-transform"
            >
              {/* Inner knob indicating move angle */}
              <div 
                className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-800 shadow-md flex items-center justify-center border border-emerald-400 absolute transition-all duration-75 pointer-events-none"
                style={{
                  transform: `translate(${engine.moveVector.x * 25}px, ${-engine.moveVector.y * 25}px)`
                }}
              >
                <div className="w-2 h-2 rounded-full bg-white/80" />
              </div>

              {/* Decorative crosshairs */}
              <div className="absolute inset-x-2 h-px bg-stone-800 pointer-events-none" />
              <div className="absolute inset-y-2 w-px bg-stone-800 pointer-events-none" />
            </div>
            <div className="text-[9px] text-stone-600 mt-1 font-mono">Touch Drag / WASD</div>
          </div>

          {/* Center Orbit Camera Helpers for robust mobile orientation */}
          <div className="flex items-center gap-2 bg-stone-950/60 p-2 rounded-xl border border-stone-800">
            <button
              onTouchStart={() => { engine.lookDelta = -1.2; }}
              onMouseDown={() => { engine.lookDelta = -1.2; }}
              className="p-3 bg-stone-900 hover:bg-stone-800 rounded-lg text-stone-300 flex flex-col items-center cursor-pointer active:bg-emerald-900"
              title="Rotate Camera Left"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-[8px] font-bold mt-0.5">LOOK L</span>
            </button>
            <div className="text-[9px] text-stone-500 font-bold uppercase text-center leading-none px-1">
              ORBIT<br/>CAMERA
            </div>
            <button
              onTouchStart={() => { engine.lookDelta = 1.2; }}
              onMouseDown={() => { engine.lookDelta = 1.2; }}
              className="p-3 bg-stone-900 hover:bg-stone-800 rounded-lg text-stone-300 flex flex-col items-center cursor-pointer active:bg-emerald-900"
              title="Rotate Camera Right"
            >
              <ChevronRight className="w-5 h-5" />
              <span className="text-[8px] font-bold mt-0.5">LOOK R</span>
            </button>
          </div>

          {/* Right Side: Big Clear Survival Action Triggers */}
          <div className="flex flex-col items-end gap-2">
            
            {/* If holding cooked meat, show specialized big instant-eat button */}
            {inventory.cookedMeat > 0 && (
              <button
                onClick={() => {
                  engine.equipTool('meat');
                  setTimeout(() => engine.triggerAction(), 50);
                }}
                className="bg-gradient-to-r from-amber-500 to-red-500 text-stone-950 font-black text-xs px-4 py-2 rounded-xl shadow-lg animate-bounce flex items-center gap-1 cursor-pointer"
              >
                🍖 EAT MEAT (+35 HP)
              </button>
            )}

            {/* Giant master ACTION button */}
            <button
              onClick={() => engine.triggerAction()}
              onTouchStart={(e) => {
                e.preventDefault();
                engine.triggerAction();
              }}
              className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-amber-500 via-emerald-600 to-emerald-900 hover:from-amber-400 text-stone-950 font-black flex flex-col items-center justify-center border-2 border-emerald-400 shadow-xl active:scale-90 transition-all cursor-pointer select-none"
            >
              <span className="text-xl">⛏️</span>
              <span className="text-xs font-black tracking-wider mt-1">ACTION</span>
              <span className="text-[8px] text-emerald-100 font-mono tracking-tighter uppercase mt-0.5">
                Chop / Attack
              </span>
            </button>
            <div className="text-[9px] text-stone-600 font-mono text-right">Tap / SPACEBAR</div>

          </div>

        </div>

      </div>

    </div>
  );
};
