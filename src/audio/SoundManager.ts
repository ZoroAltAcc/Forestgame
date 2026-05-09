// Highly robust Web Audio API procedural sound synthesizer for CozyWood Survival
// Zero external files required; fully responsive to master volume and ambient settings.

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  
  private rainSource: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  
  private fireSource: AudioBufferSourceNode | null = null;
  private fireGain: GainNode | null = null;
  
  private nightGain: GainNode | null = null;

  public initialized = false;
  public masterVolume = 0.8;
  public rainIntensity = 0.5;
  public isNight = false;

  constructor() {
    // Audio context will be initialized on first user interaction
  }

  public init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1.0;
      
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.7;
      
      this.sfxGain.connect(this.masterGain);
      this.ambientGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      
      this.initialized = true;
      
      // Start continuous loops
      this.startRainLoop();
      this.startFireLoop();
      this.startNightLoop();
      
      // Unlock audio context for iOS/Safari
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn("Web Audio API not fully available", e);
    }
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.1);
    }
  }

  public updateEnvironment(rain: number, isNight: boolean, nearFire: boolean) {
    if (!this.initialized || !this.ctx) return;
    
    this.rainIntensity = rain;
    this.isNight = isNight;

    // Adjust rain sound
    if (this.rainGain) {
      const targetRainGain = rain > 0.05 ? 0.1 + rain * 0.4 : 0.0;
      this.rainGain.gain.setTargetAtTime(targetRainGain, this.ctx.currentTime, 0.5);
    }

    // Adjust fire sound
    if (this.fireGain) {
      const targetFireGain = nearFire ? 0.6 : 0.0;
      this.fireGain.gain.setTargetAtTime(targetFireGain, this.ctx.currentTime, 0.5);
    }

    // Adjust night crickets/ambience
    if (this.nightGain) {
      const targetNightGain = isNight ? 0.25 : 0.02;
      this.nightGain.gain.setTargetAtTime(targetNightGain, this.ctx.currentTime, 1.0);
    }
  }

  // Generates brownian/pink noise buffer for realistic rain & wind
  private createNoiseBuffer(duration: number, type: 'white' | 'pink' | 'brown'): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'brown') {
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Compensate volume
      } else if (type === 'pink') {
        output[i] = white * 0.5 + lastOut * 0.5;
        lastOut = output[i];
      } else {
        output[i] = white * 0.5;
      }
    }
    return buffer;
  }

  private startRainLoop() {
    if (!this.ctx || !this.ambientGain) return;
    const buffer = this.createNoiseBuffer(5, 'pink');
    if (!buffer) return;
    
    this.rainSource = this.ctx.createBufferSource();
    this.rainSource.buffer = buffer;
    this.rainSource.loop = true;
    
    // Lowpass filter for deep cozy rainfall sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0.0;
    
    this.rainSource.connect(filter);
    filter.connect(this.rainGain);
    this.rainGain.connect(this.ambientGain);
    
    this.rainSource.start();
  }

  private startFireLoop() {
    if (!this.ctx || !this.ambientGain) return;
    // Brown noise works perfectly for deep crackling campfire ember base
    const buffer = this.createNoiseBuffer(3, 'brown');
    if (!buffer) return;

    this.fireSource = this.ctx.createBufferSource();
    this.fireSource.buffer = buffer;
    this.fireSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 1.5;

    this.fireGain = this.ctx.createGain();
    this.fireGain.gain.value = 0.0;

    this.fireSource.connect(filter);
    filter.connect(this.fireGain);
    this.fireGain.connect(this.ambientGain);

    this.fireSource.start();
    
    // Add intermittent crackle pops
    setInterval(() => {
      if (this.fireGain && this.fireGain.gain.value > 0.1) {
        this.playCracklePop();
      }
    }, 400);
  }

  private startNightLoop() {
    if (!this.ctx || !this.ambientGain) return;
    // Synth crickets using modulated high frequency oscillators
    this.nightGain = this.ctx.createGain();
    this.nightGain.gain.value = 0.02;
    this.nightGain.connect(this.ambientGain);

    // Create dual frequency crickets
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = 4500;

    const oscGain = this.ctx.createGain();
    oscGain.gain.value = 0.05;

    // Modulate cricket chirp rate
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 12; // 12 chirps per second
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 4500; // modulate amplitude heavily

    osc1.connect(oscGain);
    oscGain.connect(this.nightGain);
    osc1.start();
  }

  public playCracklePop() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  public playChop() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  public playMine() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(280, this.ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  public playCraft() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.setValueAtTime(660, this.ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.35);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  public playAnimalHurt() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(150, this.ctx.currentTime + 0.25);
    
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.25);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  public playZombieAlert() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.5);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    gain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.55);
  }

  public playPlayerHit() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  public playSizzle() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    // Short pink noise burst for cooking meat sizzle
    const buffer = this.createNoiseBuffer(0.5, 'white');
    if (!buffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2500;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  public playStep(isWet: boolean) {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isWet ? 140 : 85, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);

    // Play puddle slap if heavy rain wet ground
    if (isWet && Math.random() > 0.4) {
      const oscWet = this.ctx.createOscillator();
      const gainWet = this.ctx.createGain();
      oscWet.type = 'triangle';
      oscWet.frequency.setValueAtTime(600, this.ctx.currentTime);
      oscWet.frequency.linearRampToValueAtTime(200, this.ctx.currentTime + 0.04);
      gainWet.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gainWet.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.04);
      oscWet.connect(gainWet);
      gainWet.connect(this.sfxGain);
      oscWet.start();
      oscWet.stop(this.ctx.currentTime + 0.05);
    }
  }
}

export const sounds = new SoundManager();
