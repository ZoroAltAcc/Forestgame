import * as THREE from 'three';
import { WorldGenerator, GroundData } from './WorldGenerator';
import { 
  createPlayerModel, 
  PlayerRig, 
  createDeerModel, 
  AnimalRig, 
  createZombieModel, 
  EnemyRig, 
  createSpiderModel,
  createAxeModel,
  createPickaxeModel,
  createFurnaceModel,
  createCampfireModel,
  createMeatModel,
  createWoodLogModel
} from './ProceduralModels';
import { sounds } from '../audio/SoundManager';

export interface InventoryState {
  wood: number;
  stone: number;
  rawMeat: number;
  cookedMeat: number;
  axe: boolean;
  pickaxe: boolean;
  furnaceCount: number;
  campfireCount: number;
}

export interface GameConfig {
  graphicsQuality: 'low' | 'medium' | 'high';
  difficulty: 'peaceful' | 'normal' | 'hard';
  rainIntensity: number; // 0.0 to 1.0
  daySpeed: number;
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  
  private ground!: GroundData;
  private playerRig!: PlayerRig;
  
  // Camera variables
  private cameraOffset = new THREE.Vector3(1.2, 2.2, 4.5); // Over-the-shoulder GTA perspective
  private cameraRotationAngle = 0;
  
  // Lights & Atmosphere
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private ambientLight!: THREE.AmbientLight;
  private fog!: THREE.FogExp2;
  
  // Particles
  private rainParticles!: THREE.Points;
  private fireflyParticles!: THREE.Points;
  
  // Dynamic Entities
  private animals: { rig: AnimalRig; pos: THREE.Vector3; vel: THREE.Vector3; health: number; state: 'graze' | 'flee'; timer: number }[] = [];
  private enemies: { group: THREE.Object3D; rigType: 'zombie' | 'spider'; rig?: EnemyRig; pos: THREE.Vector3; health: number; speed: number }[] = [];
  private droppedItems: { mesh: THREE.Mesh; type: 'wood' | 'stone' | 'rawMeat'; pos: THREE.Vector3 }[] = [];
  
  // Interaction & Physics State
  public playerPos = new THREE.Vector3(0, 5, 0);
  private activeTool: 'none' | 'axe' | 'pickaxe' | 'meat' = 'none';
  
  // Inputs
  public moveVector = new THREE.Vector2(0, 0); // from touch joystick or WASD
  public lookDelta = 0; // touch drag rotation
  public isAttacking = false;
  
  // Timers & Time of Day
  public timeOfDay = 0.3; // 0.0 to 1.0 (0.25 is sunrise, 0.5 is noon, 0.75 is sunset)
  public isNight = false;
  private clock = new THREE.Clock();
  private animationTime = 0;
  
  // Player Stats
  public health = 100;
  public hunger = 100;
  public stamina = 100;
  public inventory: InventoryState = {
    wood: 5, // give starter resources for immediate enjoyment
    stone: 3,
    rawMeat: 1,
    cookedMeat: 0,
    axe: false,
    pickaxe: false,
    furnaceCount: 0,
    campfireCount: 0
  };

  private config: GameConfig;
  private onUpdateHUD: () => void;
  private onAlert: (msg: string) => void;

  private isRunning = false;

  constructor(
    container: HTMLElement, 
    config: GameConfig, 
    onUpdateHUD: () => void,
    onAlert: (msg: string) => void
  ) {
    this.container = container;
    this.config = config;
    this.onUpdateHUD = onUpdateHUD;
    this.onAlert = onAlert;

    // Create Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b120c);
    
    // Volumetric distance fog approximation
    this.fog = new THREE.FogExp2(0x13241d, 0.025);
    this.scene.fog = this.fog;

    // Perspective Camera setup
    this.camera = new THREE.PerspectiveCamera(
      65, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      180
    );

    // Highly optimized Renderer with pixel ratios tuned for low-end mobile devices
    this.renderer = new THREE.WebGLRenderer({ antialias: config.graphicsQuality === 'high', alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(config.graphicsQuality === 'low' ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = config.graphicsQuality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    this.container.appendChild(this.renderer.domElement);

    this.setupEnvironment();
    this.setupParticles();
    this.setupWorld();
    this.setupPlayer();
    this.setupAnimals();

    // Bind window resize
    window.addEventListener('resize', this.onWindowResize);
  }

  private setupEnvironment() {
    // Hemisphere light for lovely atmospheric ambient scattering
    this.hemiLight = new THREE.HemisphereLight(0xddeeff, 0x0f1913, 0.6);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Ambient fill light
    this.ambientLight = new THREE.AmbientLight(0x223322, 0.4);
    this.scene.add(this.ambientLight);

    // Main directional sunlight/moonlight with soft cascaded shadows
    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    this.dirLight.position.set(40, 60, 40);
    this.dirLight.castShadow = this.config.graphicsQuality !== 'low';
    
    if (this.dirLight.castShadow) {
      this.dirLight.shadow.camera.top = 40;
      this.dirLight.shadow.camera.bottom = -40;
      this.dirLight.shadow.camera.left = -40;
      this.dirLight.shadow.camera.right = 40;
      this.dirLight.shadow.camera.near = 0.1;
      this.dirLight.shadow.camera.far = 150;
      this.dirLight.shadow.mapSize.width = this.config.graphicsQuality === 'high' ? 1024 : 512;
      this.dirLight.shadow.mapSize.height = this.config.graphicsQuality === 'high' ? 1024 : 512;
      this.dirLight.shadow.bias = -0.0005;
    }
    this.scene.add(this.dirLight);
  }

  private setupParticles() {
    // Cozy Heavy Rainfall Streaks
    const rainCount = this.config.graphicsQuality === 'high' ? 1500 : 600;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPos[i] = (Math.random() - 0.5) * 80;
      rainPos[i + 1] = Math.random() * 40;
      rainPos[i + 2] = (Math.random() - 0.5) * 80;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    
    const rainMat = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.3,
      transparent: true,
      opacity: 0.6
    });
    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.scene.add(this.rainParticles);

    // Glowing Ambient Night Fireflies
    const fireflyCount = 120;
    const flyGeo = new THREE.BufferGeometry();
    const flyPos = new Float32Array(fireflyCount * 3);
    for (let i = 0; i < fireflyCount * 3; i += 3) {
      flyPos[i] = (Math.random() - 0.5) * 60;
      flyPos[i + 1] = 1 + Math.random() * 5;
      flyPos[i + 2] = (Math.random() - 0.5) * 60;
    }
    flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
    const flyMat = new THREE.PointsMaterial({
      color: 0xeefa00,
      size: 0.4,
      transparent: true,
      opacity: 0.0 // invisible during day
    });
    this.fireflyParticles = new THREE.Points(flyGeo, flyMat);
    this.scene.add(this.fireflyParticles);
  }

  private setupWorld() {
    const generator = new WorldGenerator();
    this.ground = generator.generate();
    
    this.scene.add(this.ground.terrainMesh);
    this.scene.add(this.ground.waterMesh);
    this.scene.add(this.ground.grassGroup);

    // Add all generated interactive objects (Trees, Rocks, Furnaces, Monoliths)
    this.ground.items.forEach(item => {
      this.scene.add(item.mesh);
    });
  }

  private setupPlayer() {
    this.playerRig = createPlayerModel();
    // Spawn player safely at origin
    const startY = this.ground.getHeightAt(0, 0);
    this.playerPos.set(0, startY, 0);
    this.playerRig.group.position.copy(this.playerPos);
    
    this.scene.add(this.playerRig.group);
    
    // Trigger initial HUD refresh
    this.onUpdateHUD();
  }

  private setupAnimals() {
    // Spawn a few animated grazing deer
    for (let i = 0; i < 6; i++) {
      const rig = createDeerModel();
      const ax = (Math.random() - 0.5) * 60;
      const az = (Math.random() - 0.5) * 60;
      const ay = this.ground.getHeightAt(ax, az);
      
      if (ay > 0 && ay < 5) {
        const pos = new THREE.Vector3(ax, ay, az);
        rig.group.position.copy(pos);
        this.scene.add(rig.group);
        
        this.animals.push({
          rig,
          pos,
          vel: new THREE.Vector3(0, 0, 0),
          health: 40,
          state: 'graze',
          timer: Math.random() * 5
        });
      }
    }
  }

  private onWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.animate();
    
    // Welcome tutorial hint
    setTimeout(() => {
      this.onAlert("Hint: Walk near trees or rocks and tap ACTION to gather resources!");
    }, 1500);

    // Continuous stat decay loops
    setInterval(() => {
      if (!this.isRunning) return;
      // Hunger decay
      this.hunger = Math.max(0, this.hunger - 0.5);
      if (this.hunger === 0) {
        this.health = Math.max(0, this.health - 1);
        sounds.playAnimalHurt();
      }
      // Stamina recovery
      if (this.moveVector.length() < 0.1 && !this.isAttacking) {
        this.stamina = Math.min(100, this.stamina + 3);
      }
      this.onUpdateHUD();
    }, 2000);
  }

  public pause() {
    this.isRunning = false;
  }

  // --- EQUIPPING TOOLS ---
  public equipTool(tool: 'none' | 'axe' | 'pickaxe' | 'meat') {
    this.activeTool = tool;
    
    // Clear previously equipped mesh
    while (this.playerRig.toolSlot.children.length > 0) {
      this.playerRig.toolSlot.remove(this.playerRig.toolSlot.children[0]);
    }

    if (tool === 'axe') {
      const axeMesh = createAxeModel();
      this.playerRig.toolSlot.add(axeMesh);
      sounds.playCraft();
      this.onAlert("Equipped Custom Axe! Chops trees faster.");
    } else if (tool === 'pickaxe') {
      const pickMesh = createPickaxeModel();
      this.playerRig.toolSlot.add(pickMesh);
      sounds.playCraft();
      this.onAlert("Equipped Custom Pickaxe! Breaks rocks faster.");
    } else if (tool === 'meat') {
      const meatMesh = createMeatModel(true);
      this.playerRig.toolSlot.add(meatMesh);
      this.onAlert("Equipped Cooked Meat. Tap Action to eat!");
    }
    this.onUpdateHUD();
  }

  // --- INTERACTION & COMBAT ACTION ---
  public triggerAction() {
    if (!this.isRunning || this.health <= 0) return;
    
    // If holding cooked meat, eat it instantly!
    if (this.activeTool === 'meat' && this.inventory.cookedMeat > 0) {
      this.inventory.cookedMeat--;
      this.health = Math.min(100, this.health + 35);
      this.hunger = Math.min(100, this.hunger + 50);
      sounds.playSizzle();
      this.onAlert("Ate delicious warm cooked meat! (+35 HP)");
      if (this.inventory.cookedMeat === 0) {
        this.equipTool('none');
      }
      this.onUpdateHUD();
      return;
    }

    // Play swing animation
    this.isAttacking = true;
    this.stamina = Math.max(0, this.stamina - 5);
    setTimeout(() => { this.isAttacking = false; }, 300);

    // 1. Check for nearby interactive targets (Trees, Rocks, Enemies, Pickups, Furnaces)
    let closestDist = 2.8;
    let hitSomething = false;

    // Check custom dropped resource pickups
    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const drop = this.droppedItems[i];
      if (drop.pos.distanceTo(this.playerPos) < 2.0) {
        this.scene.remove(drop.mesh);
        if (drop.type === 'wood') {
          this.inventory.wood += 2;
          sounds.playCraft();
          this.onAlert("Collected +2 Wood Logs!");
        } else if (drop.type === 'stone') {
          this.inventory.stone += 2;
          sounds.playMine();
          this.onAlert("Collected +2 Faceted Stones!");
        } else if (drop.type === 'rawMeat') {
          this.inventory.rawMeat += 1;
          sounds.playSizzle();
          this.onAlert("Collected +1 Raw Animal Meat!");
        }
        this.droppedItems.splice(i, 1);
        this.onUpdateHUD();
        return;
      }
    }

    // Check enemies first for snappy survival combat response
    this.enemies.forEach(enemy => {
      if (enemy.pos.distanceTo(this.playerPos) < closestDist) {
        enemy.health -= this.activeTool === 'axe' ? 45 : 25;
        sounds.playPlayerHit();
        hitSomething = true;
        
        // Push enemy back
        const pushDir = enemy.pos.clone().sub(this.playerPos).normalize();
        enemy.pos.addScaledVector(pushDir, 0.8);
        
        if (enemy.health <= 0) {
          this.scene.remove(enemy.group);
          this.onAlert(`Defeated a crawling ${enemy.rigType}! (+1 Raw Meat)`);
          this.inventory.rawMeat += 1;
          this.onUpdateHUD();
        }
      }
    });

    if (hitSomething) return;

    // Check grazing animals
    this.animals.forEach(animal => {
      if (animal.pos.distanceTo(this.playerPos) < closestDist) {
        animal.health -= this.activeTool === 'axe' ? 35 : 20;
        animal.state = 'flee'; // trigger panic flee
        sounds.playAnimalHurt();
        hitSomething = true;

        if (animal.health <= 0) {
          this.scene.remove(animal.rig.group);
          this.onAlert("Hunted deer! Dropped +2 Raw Meat.");
          this.inventory.rawMeat += 2;
          this.onUpdateHUD();
          
          // Re-spawn far away so the wilderness stays alive
          animal.pos.set((Math.random() - 0.5) * 80, 10, (Math.random() - 0.5) * 80);
          animal.pos.y = this.ground.getHeightAt(animal.pos.x, animal.pos.z);
          animal.health = 40;
          animal.state = 'graze';
          this.scene.add(animal.rig.group);
        }
      }
    });

    if (hitSomething) return;

    // Check interactable static World items (Trees, Rocks, Interactive Furnaces)
    this.ground.items.forEach(item => {
      if (item.position.distanceTo(this.playerPos) < closestDist) {
        hitSomething = true;

        // If target is an interactive furnace, open smelting trigger!
        if (item.type === 'furnace') {
          if (this.inventory.rawMeat > 0 && this.inventory.wood > 0) {
            // Cook meat
            this.inventory.rawMeat--;
            this.inventory.wood--;
            sounds.playSizzle();
            this.onAlert("🔥 Smelting furnace cooking... sizzle!");
            
            setTimeout(() => {
              this.inventory.cookedMeat++;
              sounds.playCraft();
              this.onAlert("🍖 Successfully cooked meat using the furnace!");
              this.onUpdateHUD();
            }, 2500);
            
            this.onUpdateHUD();
            return;
          } else {
            this.onAlert("Furnace requires 1 Raw Meat + 1 Wood log to cook!");
            return;
          }
        }

        // If campfire, just warm up
        if (item.type === 'campfire') {
          sounds.playCracklePop();
          this.onAlert("Warming hands by the cozy ambient campfire...");
          return;
        }

        // Apply mining/chopping damage
        let dmg = 15;
        if (item.type === 'tree') {
          dmg = this.activeTool === 'axe' ? 40 : 20;
          sounds.playChop();
          
          // Subtle shake reaction
          item.mesh.rotation.z += (Math.random() - 0.5) * 0.1;
          setTimeout(() => { item.mesh.rotation.z = 0; }, 100);

        } else if (item.type === 'rock' || item.type === 'crystal') {
          dmg = this.activeTool === 'pickaxe' ? 40 : 15;
          sounds.playMine();
        }

        item.health -= dmg;
        
        if (item.health <= 0) {
          // Remove from world
          this.scene.remove(item.mesh);
          item.position.set(999, -999, 999); // push away

          if (item.type === 'tree') {
            this.inventory.wood += 3;
            this.onAlert("Chopped down stylized fir tree! (+3 Wood)");
            // Drop visual logs
            this.spawnDroppedItem('wood', item.position);
          } else if (item.type === 'rock') {
            this.inventory.stone += 3;
            this.onAlert("Mined ancient faceted rock! (+3 Stone)");
            this.spawnDroppedItem('stone', item.position);
          } else if (item.type === 'crystal') {
            this.inventory.stone += 10;
            this.onAlert("✨ Shattered ancient glowing Monolith! Obtained pure survival power.");
          }
          this.onUpdateHUD();
        } else {
          this.onAlert(`Gathering ${item.type}... (${item.health}/${item.maxHealth} HP)`);
        }
      }
    });

    if (!hitSomething) {
      // Swung at air
      sounds.playChop();
    }
  }

  private spawnDroppedItem(type: 'wood' | 'stone' | 'rawMeat', sourcePos: THREE.Vector3) {
    const mesh = type === 'wood' ? createWoodLogModel() : createMeatModel();
    // Scatter slightly around base
    const dropPos = sourcePos.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 1.0,
      0.5,
      (Math.random() - 0.5) * 1.0
    ));
    dropPos.y = this.ground.getHeightAt(dropPos.x, dropPos.z) + 0.2;
    mesh.position.copy(dropPos);
    this.scene.add(mesh);
    this.droppedItems.push({ mesh, type, pos: dropPos });
  }

  // --- CRAFTING COMMANDS ---
  public craftItem(recipe: 'axe' | 'pickaxe' | 'campfire' | 'furnace') {
    if (recipe === 'axe') {
      if (this.inventory.wood >= 3 && this.inventory.stone >= 2) {
        this.inventory.wood -= 3;
        this.inventory.stone -= 2;
        this.inventory.axe = true;
        sounds.playCraft();
        this.onAlert("Crafted Custom Axe successfully!");
      } else {
        this.onAlert("Need 3 Wood + 2 Stone to craft an Axe.");
      }
    } else if (recipe === 'pickaxe') {
      if (this.inventory.wood >= 2 && this.inventory.stone >= 3) {
        this.inventory.wood -= 2;
        this.inventory.stone -= 3;
        this.inventory.pickaxe = true;
        sounds.playCraft();
        this.onAlert("Crafted Custom Pickaxe successfully!");
      } else {
        this.onAlert("Need 2 Wood + 3 Stone to craft a Pickaxe.");
      }
    } else if (recipe === 'campfire') {
      if (this.inventory.wood >= 4) {
        this.inventory.wood -= 4;
        this.inventory.campfireCount++;
        sounds.playCraft();
        this.onAlert("Crafted Campfire kit! Place it anywhere.");
      } else {
        this.onAlert("Need 4 Wood to craft a Campfire.");
      }
    } else if (recipe === 'furnace') {
      if (this.inventory.stone >= 6) {
        this.inventory.stone -= 6;
        this.inventory.furnaceCount++;
        sounds.playCraft();
        this.onAlert("Crafted Stone Smelting Furnace! Place it to cook meat.");
      } else {
        this.onAlert("Need 6 Stone to craft a Furnace.");
      }
    }
    this.onUpdateHUD();
  }

  public placeStructure(type: 'campfire' | 'furnace') {
    if (type === 'campfire' && this.inventory.campfireCount > 0) {
      this.inventory.campfireCount--;
      const mesh = createCampfireModel();
      // Place directly in front of the player
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotationAngle);
      const placePos = this.playerPos.clone().addScaledVector(forward, 2.0);
      placePos.y = this.ground.getHeightAt(placePos.x, placePos.z);
      
      mesh.position.copy(placePos);
      this.scene.add(mesh);
      
      this.ground.items.push({
        id: `custom_camp_${Date.now()}`,
        type: 'campfire',
        mesh,
        position: placePos,
        health: 100,
        maxHealth: 100,
        isCustomPlaced: true
      });
      sounds.playCraft();
      this.onAlert("🔥 Placed warm glowing Campfire!");

    } else if (type === 'furnace' && this.inventory.furnaceCount > 0) {
      this.inventory.furnaceCount--;
      const mesh = createFurnaceModel();
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotationAngle);
      const placePos = this.playerPos.clone().addScaledVector(forward, 2.5);
      placePos.y = this.ground.getHeightAt(placePos.x, placePos.z);
      
      mesh.position.copy(placePos);
      this.scene.add(mesh);

      this.ground.items.push({
        id: `custom_furnace_${Date.now()}`,
        type: 'furnace',
        mesh,
        position: placePos,
        health: 200,
        maxHealth: 200,
        isCustomPlaced: true
      });
      sounds.playCraft();
      this.onAlert("🧱 Placed Stone Smelting Furnace! Tap Action nearby to cook meat.");
    }
    this.onUpdateHUD();
  }

  // --- UPDATING ENVIRONMENT & CYCLE ---
  private updateAtmosphere(delta: number) {
    // Increment day/night cycle
    this.timeOfDay += delta * 0.015 * this.config.daySpeed;
    if (this.timeOfDay > 1.0) {
      this.timeOfDay = 0.0;
      this.onAlert("🌅 A brand new cozy dawn rises over the deep dark forest...");
    }

    // Determine phase
    // 0.2 to 0.75 is Daytime. Else Nighttime.
    const wasNight = this.isNight;
    this.isNight = this.timeOfDay < 0.2 || this.timeOfDay > 0.8;

    if (this.isNight && !wasNight) {
      this.onAlert("🌙 Night has fallen. Wild zombies and giant spiders emerge from the dark shadows!");
      sounds.playZombieAlert();
      this.spawnNightEnemies();
    }

    // Interpolate beautifully between warm day colors and moonlight ambience
    // Sunset orange highlight around 0.75
    const sunAltitude = Math.sin((this.timeOfDay - 0.2) * Math.PI / 0.6);
    
    if (!this.isNight) {
      // Gorgeous daytime parameters
      const warmBlend = Math.max(0, sunAltitude);
      this.dirLight.color.setHSL(0.1 + warmBlend * 0.05, 0.4, 0.5 + warmBlend * 0.4);
      this.dirLight.intensity = 0.4 + warmBlend * 1.0;
      this.scene.background = new THREE.Color().setHSL(0.55, 0.3, 0.05 + warmBlend * 0.15);
      this.fog.color.setHSL(0.55, 0.4, 0.08 + warmBlend * 0.15);
      
      // Move directional sun
      this.dirLight.position.set(
        Math.cos(this.timeOfDay * Math.PI * 2) * 60,
        Math.max(10, Math.sin(this.timeOfDay * Math.PI * 2) * 60),
        Math.sin(this.timeOfDay * Math.PI * 2) * 60
      );

      // Hide fireflies
      (this.fireflyParticles.material as THREE.PointsMaterial).opacity = 0.0;

    } else {
      // Cozy moonlit night parameters
      this.dirLight.color.setHex(0x3a5c78);
      this.dirLight.intensity = 0.3; // subtle moonlight
      this.scene.background = new THREE.Color(0x05090b);
      this.fog.color.setHex(0x081014);

      // Show beautiful glowing fireflies
      (this.fireflyParticles.material as THREE.PointsMaterial).opacity = 0.7;
    }

    // Update Rain Particles speed & visibility
    if (this.config.rainIntensity > 0.05) {
      const pAttr = this.rainParticles.geometry.attributes.position as THREE.BufferAttribute;
      const posArr = pAttr.array as Float32Array;
      const fallSpeed = 15 * delta * (0.5 + this.config.rainIntensity * 1.5);
      
      for (let i = 1; i < posArr.length; i += 3) {
        posArr[i] -= fallSpeed;
        if (posArr[i] < 0) {
          posArr[i] = 40; // recycle back to sky
        }
      }
      pAttr.needsUpdate = true;
      (this.rainParticles.material as THREE.PointsMaterial).opacity = 0.3 + this.config.rainIntensity * 0.4;
    } else {
      (this.rainParticles.material as THREE.PointsMaterial).opacity = 0.0;
    }

    // Check if player is standing near a custom campfire for cozy audio/health boosts
    let nearFire = false;
    this.ground.items.forEach(it => {
      if (it.type === 'campfire' && it.position.distanceTo(this.playerPos) < 4.0) {
        nearFire = true;
      }
    });

    // Notify sound manager with seamless Web Audio synthesis
    sounds.updateEnvironment(this.config.rainIntensity, this.isNight, nearFire);

    // Update custom Water Shader time uniforms
    const waterMat = this.ground.waterMesh.material as THREE.ShaderMaterial;
    if (waterMat && waterMat.uniforms) {
      waterMat.uniforms.uTime.value += delta;
      waterMat.uniforms.uRainIntensity.value = this.config.rainIntensity;
    }

    // Animate glowing Campfire flame sprites
    this.scene.traverse(obj => {
      if (obj.name === "CampfireFlame") {
        obj.scale.y = 0.8 + Math.sin(this.animationTime * 15) * 0.2;
        obj.scale.x = 0.9 + Math.cos(this.animationTime * 12) * 0.1;
      }
      if (obj.name === "CampfireLight") {
        (obj as THREE.PointLight).intensity = 1.8 + Math.sin(this.animationTime * 20) * 0.4;
      }
    });
  }

  private spawnNightEnemies() {
    // Spawn 2 wild zombies and 2 giant spiders dynamically at forest edge
    const types: ('zombie' | 'spider')[] = ['zombie', 'zombie', 'spider', 'spider'];
    
    types.forEach(type => {
      const spawnDir = new THREE.Vector3(
        (Math.random() - 0.5) * 2.0,
        0,
        (Math.random() - 0.5) * 2.0
      ).normalize().multiplyScalar(25); // emerge 25 meters away
      
      const pos = this.playerPos.clone().add(spawnDir);
      pos.y = this.ground.getHeightAt(pos.x, pos.z);

      let group: THREE.Object3D;
      let rig: EnemyRig | undefined;

      if (type === 'zombie') {
        rig = createZombieModel();
        group = rig.group;
      } else {
        group = createSpiderModel();
      }

      group.position.copy(pos);
      this.scene.add(group);

      this.enemies.push({
        group,
        rigType: type,
        rig,
        pos,
        health: type === 'zombie' ? 60 : 40,
        speed: type === 'zombie' ? 2.5 : 4.0 // spiders crawl faster
      });
    });
  }

  // --- MASTER ANIMATION & LOGIC LOOP ---
  private animate = () => {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1); // prevent huge lag spikes
    this.animationTime += delta;

    this.updateAtmosphere(delta);

    // 1. Process Input & Camera Rotation (GTA Over-the-shoulder perspective)
    this.cameraRotationAngle += this.lookDelta * delta * 2.5;
    this.lookDelta *= 0.8; // smooth drag momentum decay

    // Compute forward movement vector based on current camera look angle
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotationAngle);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotationAngle);

    const targetMove = new THREE.Vector3();
    targetMove.addScaledVector(forward, this.moveVector.y);
    targetMove.addScaledVector(right, -this.moveVector.x); // invert side touch joystick

    if (targetMove.lengthSq() > 0) {
      targetMove.normalize();
      
      // Determine ground surface penalty: deep river water slows down traversal beautifully
      const currentHeight = this.ground.getHeightAt(this.playerPos.x, this.playerPos.z);
      const isSwimming = currentHeight < -0.4;
      const moveSpeed = isSwimming ? 2.0 : 5.5;

      this.playerPos.addScaledVector(targetMove, moveSpeed * delta);
      
      // Rotate player multi-part mesh group to face traversal direction
      const targetRotation = Math.atan2(targetMove.x, targetMove.z);
      // Smooth lerp orientation
      let angleDiff = targetRotation - this.playerRig.group.rotation.y;
      // Normalize wrap
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      this.playerRig.group.rotation.y += angleDiff * 0.15;

      // Play wet/dry step sounds periodically
      if (Math.floor(this.animationTime * 15) % 6 === 0) {
        sounds.playStep(isSwimming || this.config.rainIntensity > 0.3);
      }
    }

    // Align player beautifully to computed procedural elevation terrain
    const terrainY = this.ground.getHeightAt(this.playerPos.x, this.playerPos.z);
    // Smooth stepping
    this.playerPos.y += (terrainY - this.playerPos.y) * 0.2;
    this.playerRig.group.position.copy(this.playerPos);

    // 2. Animate Custom Over-The-Shoulder Character Model Parts
    const isMoving = this.moveVector.length() > 0.05;
    
    if (this.isAttacking) {
      // Snappy chopping/attacking arm swing
      const attackPhase = Math.sin(this.animationTime * 30);
      this.playerRig.rightArm.rotation.x = attackPhase * 1.5;
      this.playerRig.leftArm.rotation.x = -attackPhase * 0.5;
    } else if (isMoving) {
      // Coherent walking/running arm and leg pendulums
      const walkCycle = Math.sin(this.animationTime * 12);
      this.playerRig.leftArm.rotation.x = walkCycle * 0.8;
      this.playerRig.rightArm.rotation.x = -walkCycle * 0.8;
      this.playerRig.leftLeg.rotation.x = -walkCycle * 0.9;
      this.playerRig.rightLeg.rotation.x = walkCycle * 0.9;
      
      // Small body bobbing
      this.playerRig.group.position.y += Math.abs(Math.sin(this.animationTime * 24)) * 0.08;
    } else {
      // Cozy idle breathing cycle
      this.playerRig.leftArm.rotation.x = Math.sin(this.animationTime * 2) * 0.05;
      this.playerRig.rightArm.rotation.x = -Math.sin(this.animationTime * 2) * 0.05;
      this.playerRig.leftLeg.rotation.x = 0;
      this.playerRig.rightLeg.rotation.x = 0;
    }

    // 3. Update Camera Over-The-Shoulder GTA tracking
    // Position camera behind and to the right of the character
    const camOffsetRotated = this.cameraOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotationAngle);
    const targetCamPos = this.playerPos.clone().add(camOffsetRotated);
    
    // Smooth camera pull
    this.camera.position.lerp(targetCamPos, 0.1);
    
    // Look directly at character head offset
    const lookTarget = this.playerPos.clone().add(new THREE.Vector3(0, 1.4, 0));
    this.camera.lookAt(lookTarget);

    // 4. Process Nighttime Enemies AI Chasing
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const distToPlayer = enemy.pos.distanceTo(this.playerPos);

      // If extremely far away, remove them to save performance
      if (distToPlayer > 50) {
        this.scene.remove(enemy.group);
        this.enemies.splice(i, 1);
        continue;
      }

      // Chase player
      if (distToPlayer > 0.8) {
        const moveDir = this.playerPos.clone().sub(enemy.pos).normalize();
        enemy.pos.addScaledVector(moveDir, enemy.speed * delta);
        enemy.pos.y = this.ground.getHeightAt(enemy.pos.x, enemy.pos.z);
        enemy.group.position.copy(enemy.pos);
        
        // Face player
        enemy.group.rotation.y = Math.atan2(moveDir.x, moveDir.z);

        // Procedural enemy part animation
        if (enemy.rigType === 'zombie' && enemy.rig) {
          const zCycle = Math.sin(this.animationTime * 8);
          enemy.rig.leftLeg.rotation.x = zCycle * 0.6;
          enemy.rig.rightLeg.rotation.x = -zCycle * 0.6;
          // Stumbling arm tilts
          enemy.rig.leftArm.rotation.z = Math.sin(this.animationTime * 4) * 0.2;
        } else {
          // Animate 8 spider legs rapidly
          enemy.group.traverse(child => {
            if (child.name.startsWith('spider_leg_')) {
              const idx = parseInt(child.name.replace('spider_leg_', ''));
              child.rotation.z += Math.sin(this.animationTime * 30 + idx) * 0.05;
            }
          });
        }
      } else {
        // Attack Player!
        if (Math.random() < 0.08) {
          this.health = Math.max(0, this.health - (enemy.rigType === 'zombie' ? 12 : 8));
          sounds.playPlayerHit();
          this.onAlert(`💥 Attacked by wild ${enemy.rigType}! Watch your health.`);
          this.onUpdateHUD();
          
          if (this.health <= 0) {
            this.pause();
            this.onAlert("💀 YOU SUCCUMBED TO THE DEEP DARK COZY FOREST. Tap respawn to play again.");
          }
        }
      }
    }

    // 5. Process Grazing Animals AI
    this.animals.forEach(animal => {
      animal.timer -= delta;
      
      if (animal.state === 'flee') {
        // Run away from player rapidly
        const fleeDir = animal.pos.clone().sub(this.playerPos).normalize();
        animal.pos.addScaledVector(fleeDir, 7.0 * delta);
        animal.rig.group.rotation.y = Math.atan2(fleeDir.x, fleeDir.z);

        // Frantic running animation
        const runCycle = Math.sin(this.animationTime * 20);
        animal.rig.frontLeftLeg.rotation.x = runCycle * 0.8;
        animal.rig.frontRightLeg.rotation.x = -runCycle * 0.8;
        animal.rig.backLeftLeg.rotation.x = -runCycle * 0.8;
        animal.rig.backRightLeg.rotation.x = runCycle * 0.8;

        if (animal.pos.distanceTo(this.playerPos) > 25) {
          animal.state = 'graze'; // calmed down
        }
      } else {
        // Gentle random grazing
        if (animal.timer <= 0) {
          animal.timer = 2 + Math.random() * 4;
          // Pick new random direction angle
          animal.vel.set(
            (Math.random() - 0.5) * 1.5,
            0,
            (Math.random() - 0.5) * 1.5
          );
          if (animal.vel.lengthSq() > 0) {
            animal.rig.group.rotation.y = Math.atan2(animal.vel.x, animal.vel.z);
          }
        }

        animal.pos.addScaledVector(animal.vel, delta);
        
        // Idle bobbing/leg swaying
        const walkCycle = Math.sin(this.animationTime * 6);
        animal.rig.frontLeftLeg.rotation.x = walkCycle * 0.3;
        animal.rig.frontRightLeg.rotation.x = -walkCycle * 0.3;
        animal.rig.backLeftLeg.rotation.x = -walkCycle * 0.3;
        animal.rig.backRightLeg.rotation.x = walkCycle * 0.3;
        
        // Dip head to graze
        animal.rig.head.rotation.x = 0.3 + Math.sin(this.animationTime * 3) * 0.15;
      }

      // Align animal to terrain
      animal.pos.y = this.ground.getHeightAt(animal.pos.x, animal.pos.z);
      animal.rig.group.position.copy(animal.pos);
    });

    // Render beautiful frame
    this.renderer.render(this.scene, this.camera);
  };

  public setConfigParameters(newConfig: Partial<GameConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public respawn() {
    this.health = 100;
    this.hunger = 100;
    this.stamina = 100;
    // Safely place back at origin
    const startY = this.ground.getHeightAt(0, 0);
    this.playerPos.set(0, startY, 0);
    this.timeOfDay = 0.3; // back to nice morning
    this.onAlert("✨ Respawned near the cozy ancient campfire. Stay warm!");
    this.onUpdateHUD();
    this.start();
  }
}
