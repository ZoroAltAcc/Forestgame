import * as THREE from 'three';
import { WorldGenerator, GroundData } from './WorldGenerator';
import { 
  createPlayerModel, PlayerRig, createDeerModel, createRabbitModel, AnimalRig, 
  createZombieModel, EnemyRig, createSpiderModel, createAxeModel, createPickaxeModel, 
  createFurnaceModel, createCampfireModel, createMeatModel, createWoodLogModel, 
  createStoneModel, createBurningEffect, createWorkbenchModel, createCarrotModel
} from './ProceduralModels';
import { sounds } from '../audio/SoundManager';
import { createFireflyMaterial, createSkyMaterial, createDustMaterial } from './Shaders';

export interface InventoryState {
  wood: number;
  stone: number;
  rawMeat: number;
  cookedMeat: number;
  carrot: number;
  axe: boolean;
  pickaxe: boolean;
  workbench: boolean;
  furnaceCount: number;
  campfireCount: number;
}

export interface GameConfig {
  graphicsQuality: 'low' | 'medium' | 'high';
  difficulty: 'peaceful' | 'normal' | 'hard';
  rainIntensity: number;
  daySpeed: number;
}

interface DroppedItem {
  mesh: THREE.Object3D;
  type: 'wood' | 'stone' | 'rawMeat' | 'carrot';
  pos: THREE.Vector3;
  bobOffset: number;
}

interface Animal {
  rig: AnimalRig;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  health: number;
  state: 'graze' | 'flee';
  timer: number;
  animalType: 'deer' | 'rabbit';
}

interface Enemy {
  group: THREE.Object3D;
  rigType: 'zombie' | 'spider';
  rig?: EnemyRig;
  pos: THREE.Vector3;
  health: number;
  speed: number;
  isBurning: boolean;
  burningEffect?: THREE.Group;
  burnTimer: number;
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private ground!: GroundData;
  private playerRig!: PlayerRig;

  // Camera
  private cameraOffset = new THREE.Vector3(1.0, 2.5, 5.0);
  private cameraRotationAngle = 0;
  private cameraPitch = 0.3; // Slight downward look

  // Lights
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private fog!: THREE.FogExp2;
  private sunLight!: THREE.PointLight;
  private rimLight!: THREE.DirectionalLight;

  // Particles
  private rainParticles!: THREE.Points;
  private fireflyParticles!: THREE.Points;
  private fireflyMaterial!: THREE.ShaderMaterial;
  private leafParticles!: THREE.Points;
  private dustParticles!: THREE.Points;
  private dustMaterial!: THREE.ShaderMaterial;
  
  // Sky
  private skyMesh!: THREE.Mesh;
  private skyMaterial!: THREE.ShaderMaterial;
  
  // Water reference for updates
  private waterMaterial!: THREE.ShaderMaterial;

  // Entities
  private animals: Animal[] = [];
  private enemies: Enemy[] = [];
  private droppedItems: DroppedItem[] = [];

  // Player state
  public playerPos = new THREE.Vector3(0, 5, 0);
  private activeTool: 'none' | 'axe' | 'pickaxe' | 'meat' = 'none';

  // Inputs
  public moveVector = new THREE.Vector2(0, 0);
  public lookDelta = 0;
  public isAttacking = false;
  private isPointerLocked = false;
  
  // Mobile touch look
  private touchLookActive = false;
  private lastTouchX = 0;
  private lastTouchY = 0;

  // Time
  public timeOfDay = 0.3;
  public isNight = false;
  private clock = new THREE.Clock();
  private animationTime = 0;

  // Stats
  public health = 100;
  public hunger = 100;
  public stamina = 100;

  public inventory: InventoryState = {
    wood: 8,
    stone: 5,
    rawMeat: 0,
    cookedMeat: 0,
    carrot: 0,
    axe: false,
    pickaxe: false,
    workbench: false,
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

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1510);
    this.fog = new THREE.FogExp2(0x1a2820, 0.012);
    this.scene.fog = this.fog;

    // Camera
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 250);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: config.graphicsQuality === 'high',
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(config.graphicsQuality === 'low' ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = config.graphicsQuality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.setupEnvironment();
    this.setupParticles();
    this.setupWorld();
    this.setupPlayer();
    this.setupAnimals();
    this.setupControls();

    window.addEventListener('resize', this.onWindowResize);
  }

  private setupControls() {
    const canvas = this.renderer.domElement;

    // Desktop: Pointer lock
    canvas.addEventListener('click', () => {
      if (!this.isPointerLocked && !('ontouchstart' in window)) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isPointerLocked) return;
      this.cameraRotationAngle -= e.movementX * 0.003;
      this.cameraPitch = Math.max(-0.5, Math.min(0.8, this.cameraPitch + e.movementY * 0.002));
    });

    // Mobile: Touch to look around (right side of screen)
    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      const touch = e.touches[0];
      // Only activate look if touching right half of screen
      if (touch.clientX > window.innerWidth * 0.4) {
        this.touchLookActive = true;
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      if (!this.touchLookActive) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.lastTouchX;
      const deltaY = touch.clientY - this.lastTouchY;
      
      this.cameraRotationAngle -= deltaX * 0.005;
      this.cameraPitch = Math.max(-0.5, Math.min(0.8, this.cameraPitch + deltaY * 0.003));
      
      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      this.touchLookActive = false;
    }, { passive: true });
  }

  private setupEnvironment() {
    // Hemisphere light - sky/ground colors
    this.hemiLight = new THREE.HemisphereLight(0x88ccff, 0x223311, 0.6);
    this.hemiLight.position.set(0, 100, 0);
    this.scene.add(this.hemiLight);

    // Ambient fill
    const ambient = new THREE.AmbientLight(0x334433, 0.25);
    this.scene.add(ambient);

    // Main directional sun/moon light
    this.dirLight = new THREE.DirectionalLight(0xfffaf0, 1.8);
    this.dirLight.position.set(60, 100, 60);
    this.dirLight.castShadow = this.config.graphicsQuality !== 'low';

    if (this.dirLight.castShadow) {
      this.dirLight.shadow.camera.top = 80;
      this.dirLight.shadow.camera.bottom = -80;
      this.dirLight.shadow.camera.left = -80;
      this.dirLight.shadow.camera.right = 80;
      this.dirLight.shadow.camera.near = 0.1;
      this.dirLight.shadow.camera.far = 250;
      this.dirLight.shadow.mapSize.width = this.config.graphicsQuality === 'high' ? 4096 : 2048;
      this.dirLight.shadow.mapSize.height = this.config.graphicsQuality === 'high' ? 4096 : 2048;
      this.dirLight.shadow.bias = -0.0002;
      this.dirLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.dirLight);
    
    // Sun glow (point light at sun position)
    this.sunLight = new THREE.PointLight(0xffeecc, 0.5, 300);
    this.sunLight.position.copy(this.dirLight.position);
    this.scene.add(this.sunLight);
    
    // Rim/back light for depth
    this.rimLight = new THREE.DirectionalLight(0xaaddff, 0.3);
    this.rimLight.position.set(-40, 60, -40);
    this.scene.add(this.rimLight);
    
    // Sky dome
    const skyGeo = new THREE.SphereGeometry(200, 32, 16);
    this.skyMaterial = createSkyMaterial();
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMaterial);
    this.scene.add(this.skyMesh);
  }

  private setupParticles() {
    // Rain
    const rainCount = this.config.graphicsQuality === 'high' ? 2500 : 1000;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 120;
      rainPos[i * 3 + 1] = Math.random() * 50;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0xaabbdd,
      size: 0.12,
      transparent: true,
      opacity: 0.6,
    });
    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.scene.add(this.rainParticles);

    // Fireflies with custom shader
    const fireflyCount = 150;
    const fireflyGeo = new THREE.BufferGeometry();
    const fireflyPos = new Float32Array(fireflyCount * 3);
    const fireflyPhase = new Float32Array(fireflyCount);
    const fireflySpeed = new Float32Array(fireflyCount);
    
    for (let i = 0; i < fireflyCount; i++) {
      fireflyPos[i * 3] = (Math.random() - 0.5) * 80;
      fireflyPos[i * 3 + 1] = 0.5 + Math.random() * 4;
      fireflyPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
      fireflyPhase[i] = Math.random() * Math.PI * 2;
      fireflySpeed[i] = 0.5 + Math.random() * 1.5;
    }
    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
    fireflyGeo.setAttribute('aPhase', new THREE.BufferAttribute(fireflyPhase, 1));
    fireflyGeo.setAttribute('aSpeed', new THREE.BufferAttribute(fireflySpeed, 1));
    
    this.fireflyMaterial = createFireflyMaterial();
    this.fireflyParticles = new THREE.Points(fireflyGeo, this.fireflyMaterial);
    this.fireflyParticles.visible = false;
    this.scene.add(this.fireflyParticles);

    // Falling leaves
    const leafCount = 80;
    const leafGeo = new THREE.BufferGeometry();
    const leafPos = new Float32Array(leafCount * 3);
    const leafPhase = new Float32Array(leafCount);
    const leafSpeed = new Float32Array(leafCount);
    
    for (let i = 0; i < leafCount; i++) {
      leafPos[i * 3] = (Math.random() - 0.5) * 100;
      leafPos[i * 3 + 1] = 5 + Math.random() * 15;
      leafPos[i * 3 + 2] = (Math.random() - 0.5) * 100;
      leafPhase[i] = Math.random() * Math.PI * 2;
      leafSpeed[i] = 0.3 + Math.random() * 0.7;
    }
    leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPos, 3));
    
    const leafMat = new THREE.PointsMaterial({
      color: 0x558844,
      size: 0.3,
      transparent: true,
      opacity: 0.7,
    });
    this.leafParticles = new THREE.Points(leafGeo, leafMat);
    this.scene.add(this.leafParticles);
    
    // Dust motes / pollen particles
    const dustCount = this.config.graphicsQuality === 'high' ? 200 : 80;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    const dustPhase = new Float32Array(dustCount);
    const dustSpeed = new Float32Array(dustCount);
    
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 60;
      dustPos[i * 3 + 1] = 1 + Math.random() * 8;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
      dustPhase[i] = Math.random() * Math.PI * 2;
      dustSpeed[i] = 0.2 + Math.random() * 0.8;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(dustPhase, 1));
    dustGeo.setAttribute('aSpeed', new THREE.BufferAttribute(dustSpeed, 1));
    
    this.dustMaterial = createDustMaterial();
    this.dustParticles = new THREE.Points(dustGeo, this.dustMaterial);
    this.scene.add(this.dustParticles);
  }

  private setupWorld() {
    const worldGen = new WorldGenerator();
    this.ground = worldGen.generate();

    this.scene.add(this.ground.terrainMesh);
    this.scene.add(this.ground.waterMesh);
    this.scene.add(this.ground.grassGroup);
    
    // Store water material reference for updates
    this.waterMaterial = this.ground.waterMesh.material as THREE.ShaderMaterial;

    this.ground.items.forEach(item => {
      this.scene.add(item.mesh);
    });
  }

  private setupPlayer() {
    this.playerRig = createPlayerModel();
    const startY = this.ground.getHeightAt(0, 0);
    this.playerPos.set(0, startY, 0);
    this.playerRig.group.position.copy(this.playerPos);
    this.scene.add(this.playerRig.group);
    this.onUpdateHUD();
  }

  private setupAnimals() {
    // Deer
    for (let i = 0; i < 12; i++) {
      const ax = (Math.random() - 0.5) * 120;
      const az = (Math.random() - 0.5) * 120;
      const ay = this.ground.getHeightAt(ax, az);

      if (ay > 0 && ay < 5) {
        const rig = createDeerModel();
        rig.group.position.set(ax, ay, az);
        this.scene.add(rig.group);

        this.animals.push({
          rig,
          pos: new THREE.Vector3(ax, ay, az),
          vel: new THREE.Vector3(),
          health: 40,
          state: 'graze',
          timer: Math.random() * 5,
          animalType: 'deer'
        });
      }
    }

    // Rabbits
    for (let i = 0; i < 20; i++) {
      const ax = (Math.random() - 0.5) * 100;
      const az = (Math.random() - 0.5) * 100;
      const ay = this.ground.getHeightAt(ax, az);

      if (ay > 0 && ay < 4) {
        const rig = createRabbitModel();
        rig.group.position.set(ax, ay, az);
        this.scene.add(rig.group);

        this.animals.push({
          rig,
          pos: new THREE.Vector3(ax, ay, az),
          vel: new THREE.Vector3(),
          health: 15,
          state: 'graze',
          timer: Math.random() * 3,
          animalType: 'rabbit'
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

    setTimeout(() => {
      this.onAlert("🌲 Welcome! Explore the forest, gather resources, and survive!");
    }, 1500);

    // Stat decay
    setInterval(() => {
      if (!this.isRunning) return;
      this.hunger = Math.max(0, this.hunger - 0.4);
      if (this.hunger === 0) {
        this.health = Math.max(0, this.health - 0.5);
      }
      if (this.moveVector.length() < 0.1) {
        this.stamina = Math.min(100, this.stamina + 3);
      }
      this.onUpdateHUD();
    }, 2000);
  }

  public pause() {
    this.isRunning = false;
  }

  public equipTool(tool: 'none' | 'axe' | 'pickaxe' | 'meat') {
    this.activeTool = tool;

    while (this.playerRig.toolSlot.children.length > 0) {
      this.playerRig.toolSlot.remove(this.playerRig.toolSlot.children[0]);
    }

    if (tool === 'axe' && this.inventory.axe) {
      this.playerRig.toolSlot.add(createAxeModel());
      sounds.playCraft();
    } else if (tool === 'pickaxe' && this.inventory.pickaxe) {
      this.playerRig.toolSlot.add(createPickaxeModel());
      sounds.playCraft();
    } else if (tool === 'meat' && this.inventory.cookedMeat > 0) {
      const meat = createMeatModel(true);
      meat.scale.setScalar(0.8);
      this.playerRig.toolSlot.add(meat);
    }
    this.onUpdateHUD();
  }

  public triggerAction() {
    if (!this.isRunning || this.health <= 0) return;

    // Eat meat if holding it
    if (this.activeTool === 'meat' && this.inventory.cookedMeat > 0) {
      this.inventory.cookedMeat--;
      this.health = Math.min(100, this.health + 30);
      this.hunger = Math.min(100, this.hunger + 40);
      sounds.playSizzle();
      this.onAlert("🍖 Delicious! +30 HP, +40 Hunger");
      if (this.inventory.cookedMeat === 0) this.equipTool('none');
      this.onUpdateHUD();
      return;
    }

    this.isAttacking = true;
    this.stamina = Math.max(0, this.stamina - 5);
    setTimeout(() => { this.isAttacking = false; }, 300);

    const interactDist = 3.0;

    // Check dropped items first
    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const drop = this.droppedItems[i];
      if (drop.pos.distanceTo(this.playerPos) < 2.5) {
        if (drop.type === 'wood') this.inventory.wood++;
        else if (drop.type === 'stone') this.inventory.stone++;
        else if (drop.type === 'rawMeat') this.inventory.rawMeat++;
        else if (drop.type === 'carrot') {
          this.inventory.carrot++;
          this.hunger = Math.min(100, this.hunger + 15);
        }
        sounds.playPickup();
        this.onAlert(`+1 ${drop.type}`);
        this.scene.remove(drop.mesh);
        this.droppedItems.splice(i, 1);
        this.onUpdateHUD();
        return;
      }
    }

    // Check enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.pos.distanceTo(this.playerPos) < interactDist) {
        const dmg = this.activeTool === 'axe' ? 35 : 20;
        enemy.health -= dmg;
        sounds.playChop();

        if (enemy.health <= 0) {
          this.scene.remove(enemy.group);
          if (enemy.burningEffect) this.scene.remove(enemy.burningEffect);
          this.enemies.splice(i, 1);
          this.onAlert("💀 Enemy defeated!");
        }
        this.onUpdateHUD();
        return;
      }
    }

    // Check animals
    for (let i = this.animals.length - 1; i >= 0; i--) {
      const animal = this.animals[i];
      if (animal.pos.distanceTo(this.playerPos) < interactDist) {
        const dmg = this.activeTool === 'axe' ? 25 : 15;
        animal.health -= dmg;
        animal.state = 'flee';
        sounds.playAnimalHurt();

        if (animal.health <= 0) {
          // Drop meat
          const meatCount = animal.animalType === 'deer' ? 2 : 1;
          for (let j = 0; j < meatCount; j++) {
            const meatMesh = createMeatModel(false);
            const dropPos = animal.pos.clone();
            dropPos.x += (Math.random() - 0.5) * 1.5;
            dropPos.z += (Math.random() - 0.5) * 1.5;
            dropPos.y += 0.3;
            meatMesh.position.copy(dropPos);
            this.scene.add(meatMesh);
            this.droppedItems.push({ mesh: meatMesh, type: 'rawMeat', pos: dropPos, bobOffset: Math.random() * Math.PI * 2 });
          }
          this.scene.remove(animal.rig.group);
          this.animals.splice(i, 1);
          this.onAlert(`🥩 Hunted ${animal.animalType}! Meat dropped.`);
        }
        this.onUpdateHUD();
        return;
      }
    }

    // Check world items
    for (const item of this.ground.items) {
      if (item.position.distanceTo(this.playerPos) < interactDist && item.health > 0) {
        
        // Workbench interaction
        if (item.type === 'workbench') {
          this.inventory.workbench = true;
          this.onAlert("📦 Workbench ready! Open crafting menu.");
          this.onUpdateHUD();
          return;
        }

        // Campfire cooking
        if (item.type === 'campfire') {
          if (this.inventory.rawMeat > 0) {
            this.inventory.rawMeat--;
            sounds.playSizzle();
            this.onAlert("🔥 Cooking meat...");
            setTimeout(() => {
              this.inventory.cookedMeat++;
              sounds.playCraft();
              this.onAlert("🍖 Meat cooked!");
              this.onUpdateHUD();
            }, 2000);
            this.onUpdateHUD();
            return;
          } else {
            this.onAlert("🔥 Warming up by the fire...");
            this.health = Math.min(100, this.health + 2);
            return;
          }
        }

        // Furnace cooking
        if (item.type === 'furnace') {
          if (this.inventory.rawMeat > 0 && this.inventory.wood > 0) {
            this.inventory.rawMeat--;
            this.inventory.wood--;
            sounds.playSizzle();
            this.onAlert("🔥 Smelting...");
            setTimeout(() => {
              this.inventory.cookedMeat++;
              sounds.playCraft();
              this.onAlert("🍖 Meat cooked in furnace!");
              this.onUpdateHUD();
            }, 1500);
            this.onUpdateHUD();
            return;
          }
        }

        // Harvest carrot
        if (item.type === 'carrot') {
          const carrotMesh = createCarrotModel();
          carrotMesh.position.copy(item.position);
          carrotMesh.position.y += 0.3;
          this.scene.add(carrotMesh);
          this.droppedItems.push({ mesh: carrotMesh, type: 'carrot', pos: item.position.clone(), bobOffset: Math.random() * Math.PI * 2 });
          this.scene.remove(item.mesh);
          item.health = 0;
          sounds.playPickup();
          this.onAlert("🥕 Carrot harvested!");
          return;
        }

        // Harvest flower (decorative, small hunger)
        if (item.type === 'flower') {
          this.hunger = Math.min(100, this.hunger + 5);
          this.scene.remove(item.mesh);
          item.health = 0;
          sounds.playPickup();
          this.onAlert("🌸 Ate flower petals (+5 hunger)");
          this.onUpdateHUD();
          return;
        }

        // Mining/Chopping
        let dmg = 15;
        if (item.type === 'tree') {
          dmg = this.activeTool === 'axe' ? 40 : 18;
          sounds.playChop();
          item.mesh.rotation.z += (Math.random() - 0.5) * 0.1;
          setTimeout(() => { item.mesh.rotation.z = 0; }, 100);
        } else if (item.type === 'rock' || item.type === 'crystal') {
          dmg = this.activeTool === 'pickaxe' ? 45 : 12;
          sounds.playMine();
        }

        item.health -= dmg;

        if (item.health <= 0) {
          this.scene.remove(item.mesh);

          if (item.type === 'tree') {
            for (let j = 0; j < 3; j++) {
              const logMesh = createWoodLogModel();
              const dropPos = item.position.clone();
              dropPos.x += (Math.random() - 0.5) * 2;
              dropPos.z += (Math.random() - 0.5) * 2;
              dropPos.y += 0.3;
              logMesh.position.copy(dropPos);
              this.scene.add(logMesh);
              this.droppedItems.push({ mesh: logMesh, type: 'wood', pos: dropPos, bobOffset: Math.random() * Math.PI * 2 });
            }
            this.onAlert("🪵 Tree felled! Wood dropped.");
          } else if (item.type === 'rock') {
            for (let j = 0; j < 2; j++) {
              const stoneMesh = createStoneModel();
              const dropPos = item.position.clone();
              dropPos.x += (Math.random() - 0.5) * 1.5;
              dropPos.z += (Math.random() - 0.5) * 1.5;
              dropPos.y += 0.3;
              stoneMesh.position.copy(dropPos);
              this.scene.add(stoneMesh);
              this.droppedItems.push({ mesh: stoneMesh, type: 'stone', pos: dropPos, bobOffset: Math.random() * Math.PI * 2 });
            }
            this.onAlert("🪨 Rock shattered! Stone dropped.");
          } else if (item.type === 'crystal') {
            this.inventory.stone += 15;
            this.inventory.wood += 8;
            this.onAlert("✨ Ancient crystal! +15 Stone, +8 Wood!");
          }
        }
        this.onUpdateHUD();
        return;
      }
    }

    this.onAlert("Nothing nearby to interact with.");
  }

  public craft(recipe: 'workbench' | 'axe' | 'pickaxe' | 'campfire' | 'furnace') {
    if (recipe === 'workbench') {
      if (this.inventory.wood >= 4) {
        this.inventory.wood -= 4;
        this.inventory.workbench = true;
        
        // Place workbench
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotationAngle);
        const placePos = this.playerPos.clone().addScaledVector(forward, 2.5);
        placePos.y = this.ground.getHeightAt(placePos.x, placePos.z);
        
        const wb = createWorkbenchModel();
        wb.position.copy(placePos);
        this.scene.add(wb);
        this.ground.items.push({
          id: `workbench_${Date.now()}`,
          type: 'workbench',
          mesh: wb,
          position: placePos,
          health: 200,
          maxHealth: 200,
          isCustomPlaced: true
        });
        
        sounds.playCraft();
        this.onAlert("🔨 Workbench crafted and placed!");
      } else {
        this.onAlert("Need 4 Wood for Workbench.");
      }
    } else if (recipe === 'axe') {
      if (!this.inventory.workbench) {
        this.onAlert("Need a Workbench to craft tools!");
        return;
      }
      if (this.inventory.wood >= 3 && this.inventory.stone >= 2) {
        this.inventory.wood -= 3;
        this.inventory.stone -= 2;
        this.inventory.axe = true;
        sounds.playCraft();
        this.onAlert("🪓 Axe crafted!");
      } else {
        this.onAlert("Need 3 Wood + 2 Stone for Axe.");
      }
    } else if (recipe === 'pickaxe') {
      if (!this.inventory.workbench) {
        this.onAlert("Need a Workbench to craft tools!");
        return;
      }
      if (this.inventory.wood >= 2 && this.inventory.stone >= 3) {
        this.inventory.wood -= 2;
        this.inventory.stone -= 3;
        this.inventory.pickaxe = true;
        sounds.playCraft();
        this.onAlert("⛏️ Pickaxe crafted!");
      } else {
        this.onAlert("Need 2 Wood + 3 Stone for Pickaxe.");
      }
    } else if (recipe === 'campfire') {
      if (this.inventory.wood >= 5 && this.inventory.stone >= 3) {
        this.inventory.wood -= 5;
        this.inventory.stone -= 3;
        this.inventory.campfireCount++;
        sounds.playCraft();
        this.onAlert("🔥 Campfire kit ready! Place it.");
      } else {
        this.onAlert("Need 5 Wood + 3 Stone for Campfire.");
      }
    } else if (recipe === 'furnace') {
      if (!this.inventory.workbench) {
        this.onAlert("Need a Workbench first!");
        return;
      }
      if (this.inventory.stone >= 8) {
        this.inventory.stone -= 8;
        this.inventory.furnaceCount++;
        sounds.playCraft();
        this.onAlert("🧱 Furnace kit ready!");
      } else {
        this.onAlert("Need 8 Stone for Furnace.");
      }
    }
    this.onUpdateHUD();
  }

  public placeStructure(type: 'campfire' | 'furnace') {
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotationAngle);
    const placePos = this.playerPos.clone().addScaledVector(forward, 2.5);
    placePos.y = this.ground.getHeightAt(placePos.x, placePos.z);

    if (type === 'campfire' && this.inventory.campfireCount > 0) {
      this.inventory.campfireCount--;
      const mesh = createCampfireModel();
      mesh.position.copy(placePos);
      this.scene.add(mesh);
      this.ground.items.push({
        id: `campfire_${Date.now()}`,
        type: 'campfire',
        mesh,
        position: placePos,
        health: 100,
        maxHealth: 100,
        isCustomPlaced: true
      });
      sounds.playCraft();
      this.onAlert("🔥 Campfire placed! Use to cook meat.");
    } else if (type === 'furnace' && this.inventory.furnaceCount > 0) {
      this.inventory.furnaceCount--;
      const mesh = createFurnaceModel();
      mesh.position.copy(placePos);
      this.scene.add(mesh);
      this.ground.items.push({
        id: `furnace_${Date.now()}`,
        type: 'furnace',
        mesh,
        position: placePos,
        health: 200,
        maxHealth: 200,
        isCustomPlaced: true
      });
      sounds.playCraft();
      this.onAlert("🧱 Furnace placed!");
    }
    this.onUpdateHUD();
  }

  private updateAtmosphere(delta: number) {
    this.timeOfDay += delta * 0.012 * this.config.daySpeed;
    if (this.timeOfDay > 1.0) {
      this.timeOfDay = 0.0;
      this.onAlert("🌅 A new day dawns...");
    }

    const wasNight = this.isNight;
    this.isNight = this.timeOfDay < 0.22 || this.timeOfDay > 0.78;

    if (this.isNight && !wasNight) {
      this.onAlert("🌙 Night falls. Beware of monsters!");
      sounds.playZombieAlert();
      this.spawnNightEnemies();
    }

    // Sun position calculation
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const sunAltitude = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle) * 100;
    const sunY = Math.max(10, sunAltitude * 100);
    const sunZ = Math.sin(sunAngle) * 100;
    const sunDir = new THREE.Vector3(sunX, sunY, sunZ).normalize();
    
    // Update sun position
    this.dirLight.position.set(sunX, sunY, sunZ);
    this.sunLight.position.copy(this.dirLight.position);
    
    if (!this.isNight) {
      const warmth = Math.max(0, sunAltitude);
      
      // Golden hour (sunset)
      if (this.timeOfDay > 0.65 && this.timeOfDay < 0.78) {
        const goldenProgress = (this.timeOfDay - 0.65) / 0.13;
        this.dirLight.color.setHSL(0.06 - goldenProgress * 0.02, 0.8, 0.55);
        this.dirLight.intensity = 1.5 - goldenProgress * 0.5;
        this.sunLight.color.setHSL(0.05, 0.9, 0.6);
        this.sunLight.intensity = 0.8;
        this.hemiLight.color.setHSL(0.08, 0.6, 0.6);
        this.hemiLight.groundColor.setHSL(0.08, 0.4, 0.2);
        this.fog.color.setHSL(0.07, 0.5, 0.12 + (1 - goldenProgress) * 0.08);
        
        // Sky colors for sunset
        if (this.skyMaterial.uniforms) {
          this.skyMaterial.uniforms.uTopColor.value.setHSL(0.6, 0.5, 0.25);
          this.skyMaterial.uniforms.uMiddleColor.value.setHSL(0.08, 0.7, 0.5);
          this.skyMaterial.uniforms.uBottomColor.value.setHSL(0.05, 0.8, 0.4);
          this.skyMaterial.uniforms.uSunColor.value.setHSL(0.05, 0.9, 0.7);
          this.skyMaterial.uniforms.uSunIntensity.value = 3.0;
        }
        this.renderer.toneMappingExposure = 1.0;
        
      // Dawn (sunrise)
      } else if (this.timeOfDay > 0.22 && this.timeOfDay < 0.35) {
        const dawnProgress = (this.timeOfDay - 0.22) / 0.13;
        this.dirLight.color.setHSL(0.08, 0.6 + dawnProgress * 0.2, 0.5 + dawnProgress * 0.2);
        this.dirLight.intensity = 0.6 + dawnProgress * 0.8;
        this.sunLight.color.setHSL(0.08, 0.7, 0.6);
        this.sunLight.intensity = 0.5 + dawnProgress * 0.3;
        this.hemiLight.color.setHSL(0.1, 0.5, 0.5 + dawnProgress * 0.2);
        this.fog.color.setHSL(0.55, 0.3, 0.08 + dawnProgress * 0.07);
        
        if (this.skyMaterial.uniforms) {
          this.skyMaterial.uniforms.uTopColor.value.setHSL(0.58, 0.4 + dawnProgress * 0.3, 0.3 + dawnProgress * 0.2);
          this.skyMaterial.uniforms.uMiddleColor.value.setHSL(0.1, 0.5, 0.5 + dawnProgress * 0.2);
          this.skyMaterial.uniforms.uBottomColor.value.setHSL(0.08, 0.6, 0.35 + dawnProgress * 0.15);
          this.skyMaterial.uniforms.uSunColor.value.setHSL(0.08, 0.8, 0.6);
          this.skyMaterial.uniforms.uSunIntensity.value = 2.0 + dawnProgress;
        }
        this.renderer.toneMappingExposure = 0.8 + dawnProgress * 0.3;
        
      // Mid-day
      } else {
        this.dirLight.color.setHSL(0.12, 0.15, 0.9);
        this.dirLight.intensity = 1.2 + warmth * 0.6;
        this.sunLight.color.setHex(0xffffee);
        this.sunLight.intensity = 0.4;
        this.hemiLight.color.setHSL(0.55, 0.4, 0.7);
        this.hemiLight.groundColor.setHex(0x334422);
        this.fog.color.setHSL(0.55, 0.3, 0.12 + warmth * 0.1);
        
        if (this.skyMaterial.uniforms) {
          this.skyMaterial.uniforms.uTopColor.value.setHSL(0.58, 0.7, 0.5);
          this.skyMaterial.uniforms.uMiddleColor.value.setHSL(0.55, 0.5, 0.7);
          this.skyMaterial.uniforms.uBottomColor.value.setHSL(0.5, 0.3, 0.8);
          this.skyMaterial.uniforms.uSunColor.value.setHex(0xffffee);
          this.skyMaterial.uniforms.uSunIntensity.value = 2.5;
        }
        this.renderer.toneMappingExposure = 1.0 + warmth * 0.2;
      }
      
      this.fireflyParticles.visible = false;
      this.dustParticles.visible = true;
      (this.dustMaterial.uniforms.uColor as THREE.IUniform).value.setHSL(0.12, 0.3, 0.9);
      
    } else {
      // Night time
      this.dirLight.color.setHSL(0.6, 0.4, 0.3);
      this.dirLight.intensity = 0.2;
      this.sunLight.intensity = 0.0;
      this.hemiLight.color.setHSL(0.6, 0.3, 0.15);
      this.hemiLight.groundColor.setHex(0x050808);
      this.fog.color.setHex(0x050a0c);
      
      if (this.skyMaterial.uniforms) {
        this.skyMaterial.uniforms.uTopColor.value.setHex(0x000511);
        this.skyMaterial.uniforms.uMiddleColor.value.setHex(0x051525);
        this.skyMaterial.uniforms.uBottomColor.value.setHex(0x0a1a25);
        this.skyMaterial.uniforms.uSunColor.value.setHex(0xaabbff);
        this.skyMaterial.uniforms.uSunDir.value.set(-0.3, 0.6, 0.5).normalize();
        this.skyMaterial.uniforms.uSunIntensity.value = 0.8;
      }
      
      this.fireflyParticles.visible = true;
      this.dustParticles.visible = false;
      this.renderer.toneMappingExposure = 0.5;
    }

    // Update sky sun direction
    if (this.skyMaterial.uniforms && !this.isNight) {
      this.skyMaterial.uniforms.uSunDir.value.copy(sunDir);
    }

    // Update water shader with all parameters
    if (this.waterMaterial.uniforms) {
      this.waterMaterial.uniforms.uTime.value = this.animationTime;
      this.waterMaterial.uniforms.uRainIntensity.value = this.config.rainIntensity;
      this.waterMaterial.uniforms.uIsNight.value = this.isNight ? 1.0 : 0.0;
      this.waterMaterial.uniforms.uSunDir.value.copy(sunDir);
      
      // Update water colors based on time
      if (this.isNight) {
        this.waterMaterial.uniforms.uDeepColor.value.setHex(0x020810);
        this.waterMaterial.uniforms.uShallowColor.value.setHex(0x0a2535);
        this.waterMaterial.uniforms.uSkyColor.value.setHex(0x1a2a40);
      } else if (this.timeOfDay > 0.65 && this.timeOfDay < 0.78) {
        this.waterMaterial.uniforms.uDeepColor.value.setHex(0x102030);
        this.waterMaterial.uniforms.uShallowColor.value.setHex(0x2a5555);
        this.waterMaterial.uniforms.uSkyColor.value.setHSL(0.08, 0.6, 0.5);
        this.waterMaterial.uniforms.uSunColor.value.setHSL(0.06, 0.8, 0.6);
      } else {
        this.waterMaterial.uniforms.uDeepColor.value.setHex(0x041520);
        this.waterMaterial.uniforms.uShallowColor.value.setHex(0x0a5a5a);
        this.waterMaterial.uniforms.uSkyColor.value.setHex(0x87ceeb);
        this.waterMaterial.uniforms.uSunColor.value.setHex(0xffffee);
      }
    }

    // Firefly shader
    if (this.fireflyMaterial.uniforms) {
      this.fireflyMaterial.uniforms.uTime.value = this.animationTime;
    }
    
    // Dust motes shader
    if (this.dustMaterial.uniforms) {
      this.dustMaterial.uniforms.uTime.value = this.animationTime;
    }

    // Rain particles
    if (this.config.rainIntensity > 0.05) {
      const pAttr = this.rainParticles.geometry.attributes.position as THREE.BufferAttribute;
      const posArr = pAttr.array as Float32Array;
      const fallSpeed = 25 * delta * (0.5 + this.config.rainIntensity * 2);

      for (let i = 1; i < posArr.length; i += 3) {
        posArr[i] -= fallSpeed;
        if (posArr[i] < 0) {
          posArr[i] = 50 + Math.random() * 10;
          posArr[i - 1] = this.playerPos.x + (Math.random() - 0.5) * 100;
          posArr[i + 1] = this.playerPos.z + (Math.random() - 0.5) * 100;
        }
      }
      pAttr.needsUpdate = true;
      (this.rainParticles.material as THREE.PointsMaterial).opacity = 0.3 + this.config.rainIntensity * 0.5;
      (this.rainParticles.material as THREE.PointsMaterial).size = 0.1 + this.config.rainIntensity * 0.08;
    } else {
      (this.rainParticles.material as THREE.PointsMaterial).opacity = 0.0;
    }

    // Falling leaves
    const leafAttr = this.leafParticles.geometry.attributes.position as THREE.BufferAttribute;
    const leafArr = leafAttr.array as Float32Array;
    for (let i = 0; i < leafArr.length; i += 3) {
      leafArr[i] += Math.sin(this.animationTime * 1.5 + i * 0.1) * 0.03;
      leafArr[i + 1] -= delta * (1.0 + Math.sin(i) * 0.5);
      leafArr[i + 2] += Math.cos(this.animationTime * 1.2 + i * 0.15) * 0.03;
      if (leafArr[i + 1] < 0) {
        leafArr[i + 1] = 15 + Math.random() * 10;
        leafArr[i] = this.playerPos.x + (Math.random() - 0.5) * 80;
        leafArr[i + 2] = this.playerPos.z + (Math.random() - 0.5) * 80;
      }
    }
    leafAttr.needsUpdate = true;

    // Audio
    const nearFire = this.ground.items.some(it => 
      (it.type === 'campfire' || it.type === 'furnace') && it.position.distanceTo(this.playerPos) < 6
    );
    sounds.updateEnvironment(this.config.rainIntensity, this.isNight, nearFire);

    // Animate campfires
    this.ground.items.forEach(item => {
      if (item.type === 'campfire') {
        item.mesh.traverse((obj: THREE.Object3D) => {
          if (obj.name === "CampfireFlame") {
            obj.scale.y = 0.8 + Math.sin(this.animationTime * 12) * 0.25;
            obj.scale.x = 0.9 + Math.cos(this.animationTime * 10) * 0.15;
            obj.rotation.y = this.animationTime * 2;
          }
          if (obj.name === "CampfireInnerFlame") {
            obj.scale.y = 0.85 + Math.sin(this.animationTime * 15) * 0.2;
          }
          if (obj.name === "CampfireLight") {
            (obj as THREE.PointLight).intensity = 2.5 + Math.sin(this.animationTime * 18) * 0.6;
            (obj as THREE.PointLight).color.setHSL(0.08, 0.9, 0.5 + Math.sin(this.animationTime * 20) * 0.1);
          }
          if (obj.name.startsWith('ember_')) {
            const idx = parseFloat(obj.name.split('_')[1]);
            obj.position.y = 0.3 + Math.sin(this.animationTime * 6 + idx) * 0.15 + idx * 0.05;
            obj.position.x = (Math.sin(this.animationTime * 4 + idx * 2) * 0.2);
          }
        });
      }
    });
  }

  private spawnNightEnemies() {
    if (this.config.difficulty === 'peaceful') return;
    
    const count = this.config.difficulty === 'hard' ? 6 : 4;
    const types: ('zombie' | 'spider')[] = ['zombie', 'zombie', 'spider', 'spider', 'zombie', 'spider'];
    
    for (let i = 0; i < count; i++) {
      const spawnDir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(30 + Math.random() * 20);

      const pos = this.playerPos.clone().add(spawnDir);
      pos.y = this.ground.getHeightAt(pos.x, pos.z);

      let group: THREE.Object3D;
      let rig: EnemyRig | undefined;

      if (types[i % types.length] === 'zombie') {
        rig = createZombieModel();
        group = rig.group;
      } else {
        group = createSpiderModel();
      }

      group.position.copy(pos);
      this.scene.add(group);

      this.enemies.push({
        group,
        rigType: types[i % types.length],
        rig,
        pos,
        health: types[i % types.length] === 'zombie' ? 50 : 30,
        speed: types[i % types.length] === 'zombie' ? 2.0 : 3.5,
        isBurning: false,
        burnTimer: 0
      });
    }
  }

  private animate = () => {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.animationTime += delta;

    this.updateAtmosphere(delta);

    // Camera rotation (touch buttons fallback)
    if (!this.isPointerLocked && !this.touchLookActive) {
      this.cameraRotationAngle += this.lookDelta * delta * 2.5;
      this.lookDelta *= 0.85;
    }

    // Movement
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotationAngle);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotationAngle);

    const targetMove = new THREE.Vector3();
    targetMove.addScaledVector(forward, this.moveVector.y);
    targetMove.addScaledVector(right, this.moveVector.x);

    if (targetMove.lengthSq() > 0) {
      targetMove.normalize();

      const currentHeight = this.ground.getHeightAt(this.playerPos.x, this.playerPos.z);
      const isSwimming = currentHeight < -0.8;
      const speedMult = isSwimming ? 0.35 : 1.0;

      const moveSpeed = 6.0 * speedMult * delta;
      this.playerPos.addScaledVector(targetMove, moveSpeed);
      this.stamina = Math.max(0, this.stamina - delta * 2);

      const targetAngle = Math.atan2(targetMove.x, targetMove.z);
      let angleDiff = targetAngle - this.playerRig.group.rotation.y;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      this.playerRig.group.rotation.y += angleDiff * 0.12;

      if (Math.floor(this.animationTime * 12) % 5 === 0) {
        sounds.playStep(isSwimming || this.config.rainIntensity > 0.3);
      }
    }

    // Terrain following
    const terrainY = this.ground.getHeightAt(this.playerPos.x, this.playerPos.z);
    this.playerPos.y += (terrainY - this.playerPos.y) * 0.15;
    this.playerRig.group.position.copy(this.playerPos);

    // Player animation
    const isMoving = this.moveVector.length() > 0.05;
    if (this.isAttacking) {
      const attackPhase = Math.sin(this.animationTime * 25);
      this.playerRig.rightArm.rotation.x = attackPhase * 1.8;
      this.playerRig.leftArm.rotation.x = -attackPhase * 0.4;
    } else if (isMoving) {
      const walkCycle = Math.sin(this.animationTime * 14);
      this.playerRig.leftArm.rotation.x = walkCycle * 0.7;
      this.playerRig.rightArm.rotation.x = -walkCycle * 0.7;
      this.playerRig.leftLeg.rotation.x = -walkCycle * 0.8;
      this.playerRig.rightLeg.rotation.x = walkCycle * 0.8;
      this.playerRig.group.position.y += Math.abs(Math.sin(this.animationTime * 28)) * 0.06;
    } else {
      this.playerRig.leftArm.rotation.x = Math.sin(this.animationTime * 2) * 0.04;
      this.playerRig.rightArm.rotation.x = -Math.sin(this.animationTime * 2) * 0.04;
      this.playerRig.leftLeg.rotation.x = 0;
      this.playerRig.rightLeg.rotation.x = 0;
    }

    // Camera
    const camOffset = this.cameraOffset.clone();
    camOffset.y += this.cameraPitch * 2;
    camOffset.z += this.cameraPitch * 1;
    const camOffsetRotated = camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotationAngle);
    const targetCamPos = this.playerPos.clone().add(camOffsetRotated);
    this.camera.position.lerp(targetCamPos, 0.08);
    
    const lookTarget = this.playerPos.clone().add(new THREE.Vector3(0, 1.5 - this.cameraPitch, 0));
    this.camera.lookAt(lookTarget);

    // Dropped items bobbing
    this.droppedItems.forEach(item => {
      item.mesh.position.y = item.pos.y + 0.2 + Math.sin(this.animationTime * 3 + item.bobOffset) * 0.1;
      item.mesh.rotation.y += delta * 1.5;
    });

    // Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const distToPlayer = enemy.pos.distanceTo(this.playerPos);

      // Burn in daylight
      if (!this.isNight && !enemy.isBurning) {
        enemy.isBurning = true;
        enemy.burningEffect = createBurningEffect();
        enemy.burningEffect.position.copy(enemy.pos);
        this.scene.add(enemy.burningEffect);
      }

      if (enemy.isBurning) {
        enemy.burnTimer += delta;
        enemy.health -= delta * 15;
        
        // Animate burning effect
        if (enemy.burningEffect) {
          enemy.burningEffect.position.copy(enemy.pos);
          enemy.burningEffect.traverse((obj: THREE.Object3D) => {
            if (obj.name.startsWith('flame_')) {
              obj.scale.y = 0.8 + Math.sin(this.animationTime * 20 + parseFloat(obj.name.split('_')[1])) * 0.3;
              obj.position.y = 0.5 + Math.sin(this.animationTime * 15) * 0.2;
            }
            if (obj.name === 'fireCore') {
              obj.scale.setScalar(0.8 + Math.sin(this.animationTime * 25) * 0.2);
            }
          });
        }

        if (enemy.health <= 0) {
          this.scene.remove(enemy.group);
          if (enemy.burningEffect) this.scene.remove(enemy.burningEffect);
          this.enemies.splice(i, 1);
          continue;
        }
      }

      if (distToPlayer > 60) {
        this.scene.remove(enemy.group);
        if (enemy.burningEffect) this.scene.remove(enemy.burningEffect);
        this.enemies.splice(i, 1);
        continue;
      }

      // Chase player
      if (distToPlayer > 1.0 && !enemy.isBurning) {
        const moveDir = this.playerPos.clone().sub(enemy.pos).normalize();
        enemy.pos.addScaledVector(moveDir, enemy.speed * delta);
        enemy.pos.y = this.ground.getHeightAt(enemy.pos.x, enemy.pos.z);
        enemy.group.position.copy(enemy.pos);
        enemy.group.rotation.y = Math.atan2(moveDir.x, moveDir.z);

        // Animation
        if (enemy.rigType === 'zombie' && enemy.rig) {
          const zCycle = Math.sin(this.animationTime * 8);
          enemy.rig.leftLeg.rotation.x = zCycle * 0.5;
          enemy.rig.rightLeg.rotation.x = -zCycle * 0.5;
          enemy.rig.leftArm.rotation.z = Math.sin(this.animationTime * 4) * 0.15;
        } else {
          enemy.group.traverse((child: THREE.Object3D) => {
            if (child.name.startsWith('spider_leg_')) {
              const idx = parseInt(child.name.replace('spider_leg_', ''));
              child.rotation.z += Math.sin(this.animationTime * 25 + idx) * 0.04;
            }
          });
        }
      } else if (distToPlayer < 1.5 && !enemy.isBurning) {
        if (Math.random() < 0.015) {
          const dmg = enemy.rigType === 'zombie' ? 10 : 6;
          this.health = Math.max(0, this.health - dmg);
          sounds.playHurt();
          this.onAlert(`${enemy.rigType === 'zombie' ? '🧟' : '🕷️'} Hit! -${dmg} HP`);
          this.onUpdateHUD();
        }
      }
    }

    // Animals
    this.animals.forEach(animal => {
      animal.timer -= delta;

      if (animal.state === 'flee') {
        const fleeDir = animal.pos.clone().sub(this.playerPos).normalize();
        const fleeSpeed = animal.animalType === 'rabbit' ? 10.0 : 6.0;
        animal.pos.addScaledVector(fleeDir, fleeSpeed * delta);
        animal.rig.group.rotation.y = Math.atan2(fleeDir.x, fleeDir.z);

        const runCycle = Math.sin(this.animationTime * (animal.animalType === 'rabbit' ? 25 : 18));
        animal.rig.frontLeftLeg.rotation.x = runCycle * 0.9;
        animal.rig.frontRightLeg.rotation.x = -runCycle * 0.9;
        animal.rig.backLeftLeg.rotation.x = -runCycle * 0.9;
        animal.rig.backRightLeg.rotation.x = runCycle * 0.9;

        if (animal.pos.distanceTo(this.playerPos) > 30) {
          animal.state = 'graze';
        }
      } else {
        if (animal.timer < 0) {
          animal.timer = 2 + Math.random() * 4;
          animal.vel.set((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5);
          if (animal.vel.length() > 0) {
            animal.rig.group.rotation.y = Math.atan2(animal.vel.x, animal.vel.z);
          }
        }
        animal.pos.addScaledVector(animal.vel, delta);

        const walkCycle = Math.sin(this.animationTime * 5);
        animal.rig.frontLeftLeg.rotation.x = walkCycle * 0.25;
        animal.rig.frontRightLeg.rotation.x = -walkCycle * 0.25;
        animal.rig.backLeftLeg.rotation.x = -walkCycle * 0.25;
        animal.rig.backRightLeg.rotation.x = walkCycle * 0.25;
        animal.rig.head.rotation.x = 0.25 + Math.sin(this.animationTime * 2.5) * 0.12;
      }

      animal.pos.y = this.ground.getHeightAt(animal.pos.x, animal.pos.z);
      animal.rig.group.position.copy(animal.pos);
    });

    this.renderer.render(this.scene, this.camera);
  };

  public setConfigParameters(newConfig: Partial<GameConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public respawn() {
    this.health = 100;
    this.hunger = 100;
    this.stamina = 100;
    const startY = this.ground.getHeightAt(0, 0);
    this.playerPos.set(0, startY, 0);
    this.timeOfDay = 0.3;
    this.onAlert("✨ Respawned! Stay close to campfires at night.");
    this.onUpdateHUD();
    this.start();
  }
}
