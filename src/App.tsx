import { useEffect, useRef, useState } from 'react';
import { GameEngine, GameConfig, InventoryState } from './game/GameEngine';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { sounds } from './audio/SoundManager';

export default function App() {
  const [inLobby, setInLobby] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Live replicated state for HUD rendering
  const [config, setConfig] = useState<GameConfig>({
    graphicsQuality: 'medium',
    difficulty: 'normal',
    rainIntensity: 0.4,
    daySpeed: 1.0,
  });

  const [health, setHealth] = useState(100);
  const [hunger, setHunger] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [timeOfDay, setTimeOfDay] = useState(0.3);
  const [isNight, setIsNight] = useState(false);
  const [alertMsg, setAlertMsg] = useState("Welcome to CozyWood. Break trees to craft tools!");
  
  const [inventory, setInventory] = useState<InventoryState>({
    wood: 8,
    stone: 5,
    rawMeat: 0,
    cookedMeat: 0,
    carrot: 0,
    axe: false,
    pickaxe: false,
    workbench: false,
    furnaceCount: 0,
    campfireCount: 0,
  });

  // Replicate state from GameEngine to React HUD safely
  const handleUpdateHUD = () => {
    if (!engineRef.current) return;
    const eng = engineRef.current;
    
    setHealth(Math.round(eng.health));
    setHunger(Math.round(eng.hunger));
    setStamina(Math.round(eng.stamina));
    setTimeOfDay(eng.timeOfDay);
    setIsNight(eng.isNight);
    setInventory({ ...eng.inventory });
  };

  const handleAlert = (msg: string) => {
    setAlertMsg(msg);
    // Clear alert after a few seconds
    setTimeout(() => {
      setAlertMsg((prev) => (prev === msg ? "" : prev));
    }, 4500);
  };

  // Initialize engine once container mounts
  useEffect(() => {
    if (!containerRef.current) return;

    // Prevent duplicate instantiation in React 18 strict mode
    if (!engineRef.current) {
      engineRef.current = new GameEngine(
        containerRef.current,
        config,
        handleUpdateHUD,
        handleAlert
      );
    }

    return () => {
      // Cleanup
      if (engineRef.current) {
        engineRef.current.pause();
      }
    };
  }, []);

  // Update engine config live when options change
  const handleUpdateConfig = (newCfg: Partial<GameConfig>) => {
    const updated = { ...config, ...newCfg };
    setConfig(updated);
    if (engineRef.current) {
      engineRef.current.setConfigParameters(newCfg);
    }
  };

  // Start active gameplay
  const handleStartGame = () => {
    sounds.init(); // unlocks Web Audio context safely
    setInLobby(false);
    
    if (engineRef.current) {
      engineRef.current.start();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans select-none">
      
      {/* 3D Three.js Fullscreen Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 w-full h-full block" 
      />

      {/* Title Screen Lobby Overlay */}
      {inLobby ? (
        <TitleScreen 
          config={config}
          onUpdateConfig={handleUpdateConfig}
          onStartGame={handleStartGame}
        />
      ) : (
        /* Immersive Cozy Survival Touch HUD Overlay */
        engineRef.current && (
          <HUD 
            engine={engineRef.current}
            health={health}
            hunger={hunger}
            stamina={stamina}
            inventory={inventory}
            timeOfDay={timeOfDay}
            isNight={isNight}
            rainIntensity={config.rainIntensity}
            alertMsg={alertMsg}
          />
        )
      )}

    </div>
  );
}
