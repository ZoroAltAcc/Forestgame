import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED WATER SHADER - Realistic stylized water with reflections, caustics,
// foam, depth fog, fresnel, and animated waves
// ═══════════════════════════════════════════════════════════════════════════

export const WaterShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uWaveHeight;
    uniform float uWaveSpeed;
    
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vWaveHeight;
    varying vec3 vViewDir;
    
    // Simplex-like noise for organic waves
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Multi-octave waves
      float t = uTime * uWaveSpeed;
      
      // Large slow swells
      float wave1 = snoise(vec3(pos.x * 0.02, pos.y * 0.02, t * 0.3)) * 1.2;
      // Medium waves
      float wave2 = snoise(vec3(pos.x * 0.05 + 10.0, pos.y * 0.05, t * 0.5)) * 0.5;
      // Small ripples
      float wave3 = snoise(vec3(pos.x * 0.15, pos.y * 0.15, t * 0.8)) * 0.2;
      // Tiny detail
      float wave4 = snoise(vec3(pos.x * 0.4, pos.y * 0.4, t * 1.2)) * 0.08;
      
      float totalWave = (wave1 + wave2 + wave3 + wave4) * uWaveHeight;
      pos.z += totalWave;
      vWaveHeight = totalWave;
      
      // Calculate normal from wave derivatives
      float eps = 0.5;
      float hL = snoise(vec3((pos.x - eps) * 0.05, pos.y * 0.05, t * 0.5));
      float hR = snoise(vec3((pos.x + eps) * 0.05, pos.y * 0.05, t * 0.5));
      float hD = snoise(vec3(pos.x * 0.05, (pos.y - eps) * 0.05, t * 0.5));
      float hU = snoise(vec3(pos.x * 0.05, (pos.y + eps) * 0.05, t * 0.5));
      
      vec3 waveNormal = normalize(vec3(hL - hR, hD - hU, 2.0));
      
      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
      vWorldPos = worldPosition.xyz;
      vNormal = normalize(normalMatrix * waveNormal);
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vViewDir = normalize(-mvPosition.xyz);
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform vec3 uFoamColor;
    uniform vec3 uSkyColor;
    uniform vec3 uSunColor;
    uniform vec3 uSunDir;
    uniform float uRainIntensity;
    uniform float uIsNight;
    uniform float uTransparency;
    uniform float uFresnelPower;
    uniform float uSpecularPower;
    
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vWaveHeight;
    varying vec3 vViewDir;
    
    // Pseudo-random for effects
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    // Value noise
    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    // Fractal Brownian Motion
    float fbm(vec2 st) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewDir);
      
      // ─── DEPTH & BASE COLOR ───
      float depth = smoothstep(-3.0, 1.0, vWaveHeight);
      vec3 waterColor = mix(uDeepColor, uShallowColor, depth);
      
      // ─── FRESNEL REFLECTION ───
      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), uFresnelPower);
      fresnel = clamp(fresnel, 0.0, 1.0);
      
      // Fake sky reflection
      vec3 reflectDir = reflect(-viewDir, normal);
      float skyGradient = smoothstep(-0.2, 0.5, reflectDir.y);
      vec3 skyReflection = mix(uSkyColor * 0.5, uSkyColor, skyGradient);
      
      // ─── CAUSTICS ───
      vec2 causticsUv = vWorldPos.xz * 0.08;
      float causticTime = uTime * 0.8;
      
      float caustic1 = fbm(causticsUv + vec2(causticTime * 0.3, causticTime * 0.2));
      float caustic2 = fbm(causticsUv * 1.5 - vec2(causticTime * 0.2, causticTime * 0.4));
      float caustics = caustic1 * caustic2;
      caustics = pow(caustics, 2.0) * 2.0;
      
      // Caustics only visible in shallows during day
      float causticMask = smoothstep(-0.5, 0.5, vWaveHeight) * (1.0 - uIsNight * 0.8);
      waterColor += caustics * causticMask * vec3(0.15, 0.25, 0.2);
      
      // ─── FOAM ───
      // Wave crest foam
      float crestFoam = smoothstep(0.3, 0.6, vWaveHeight);
      crestFoam *= fbm(vWorldPos.xz * 2.0 + uTime * 0.5);
      
      // Shore foam (where water meets land)
      float shoreFoam = smoothstep(0.0, 0.4, vWaveHeight) * smoothstep(0.8, 0.0, vWaveHeight);
      shoreFoam *= fbm(vWorldPos.xz * 4.0 - uTime * 0.3) * 1.5;
      
      // Moving foam streaks
      vec2 foamUv = vWorldPos.xz * 0.5 + vec2(uTime * 0.1, uTime * 0.05);
      float foamStreaks = fbm(foamUv * 3.0);
      foamStreaks = smoothstep(0.55, 0.7, foamStreaks) * 0.4;
      
      float totalFoam = crestFoam + shoreFoam + foamStreaks;
      totalFoam = clamp(totalFoam, 0.0, 1.0);
      
      // ─── RAIN RIPPLES ───
      float rainEffect = 0.0;
      if (uRainIntensity > 0.05) {
        // Multiple ripple layers
        for (float i = 0.0; i < 3.0; i++) {
          vec2 rippleUv = vWorldPos.xz * (2.0 + i * 0.5);
          rippleUv += vec2(uTime * 0.1 * (i + 1.0), sin(uTime + i) * 0.5);
          
          vec2 cell = fract(rippleUv) - 0.5;
          float dist = length(cell);
          float ripple = sin(dist * 30.0 - uTime * 10.0 * (1.0 + i * 0.2));
          ripple *= smoothstep(0.5, 0.0, dist);
          ripple *= smoothstep(0.0, 0.3, dist);
          
          rainEffect += ripple * 0.15;
        }
        rainEffect *= uRainIntensity;
      }
      
      // ─── SPECULAR HIGHLIGHT ───
      vec3 halfDir = normalize(uSunDir + viewDir);
      float spec = pow(max(dot(normal, halfDir), 0.0), uSpecularPower);
      spec *= (1.0 - uIsNight * 0.9); // Reduce at night
      vec3 specular = uSunColor * spec * 0.8;
      
      // ─── SUBSURFACE SCATTERING APPROXIMATION ───
      float sss = pow(max(dot(viewDir, -uSunDir), 0.0), 4.0);
      sss *= smoothstep(0.0, 0.5, vWaveHeight);
      sss *= (1.0 - uIsNight * 0.8);
      vec3 subsurface = uShallowColor * sss * 0.5;
      
      // ─── COMBINE ───
      vec3 finalColor = waterColor;
      
      // Add caustics
      finalColor += caustics * causticMask * 0.15;
      
      // Blend in sky reflection with fresnel
      finalColor = mix(finalColor, skyReflection, fresnel * 0.6);
      
      // Add foam
      finalColor = mix(finalColor, uFoamColor, totalFoam);
      
      // Add rain ripple highlights
      finalColor += rainEffect * vec3(0.3, 0.35, 0.4);
      
      // Add specular
      finalColor += specular;
      
      // Add subsurface
      finalColor += subsurface;
      
      // ─── NIGHT ADJUSTMENTS ───
      if (uIsNight > 0.5) {
        // Moonlight reflection
        float moonSpec = pow(max(dot(normal, normalize(vec3(0.3, 0.8, 0.5))), 0.0), 64.0);
        finalColor += vec3(0.3, 0.35, 0.5) * moonSpec * 0.4;
        
        // Darker, more blue tint
        finalColor = mix(finalColor, finalColor * vec3(0.4, 0.5, 0.7), 0.4);
      }
      
      // ─── DEPTH FOG ───
      float fogFactor = smoothstep(0.0, -2.5, vWaveHeight);
      finalColor = mix(finalColor, uDeepColor * 0.5, fogFactor * 0.5);
      
      // ─── TRANSPARENCY ───
      float alpha = uTransparency;
      alpha = mix(alpha, alpha * 0.9, fresnel);
      alpha = mix(alpha, 1.0, totalFoam * 0.5);
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};

export function createWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWaveHeight: { value: 0.8 },
      uWaveSpeed: { value: 1.0 },
      uDeepColor: { value: new THREE.Color(0x041520) },
      uShallowColor: { value: new THREE.Color(0x0a5a5a) },
      uFoamColor: { value: new THREE.Color(0xcceeee) },
      uSkyColor: { value: new THREE.Color(0x87ceeb) },
      uSunColor: { value: new THREE.Color(0xffffee) },
      uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
      uRainIntensity: { value: 0.0 },
      uIsNight: { value: 0.0 },
      uTransparency: { value: 0.85 },
      uFresnelPower: { value: 3.0 },
      uSpecularPower: { value: 256.0 }
    },
    vertexShader: WaterShader.vertexShader,
    fragmentShader: WaterShader.fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FIREFLY SHADER - Glowing particles with organic motion
// ═══════════════════════════════════════════════════════════════════════════

export const FireflyShader = {
  vertexShader: `
    uniform float uTime;
    attribute float aPhase;
    attribute float aSpeed;
    attribute float aSize;
    varying float vBrightness;
    varying vec3 vColor;
    
    void main() {
      vec3 pos = position;
      
      // Organic floating motion
      float t = uTime * aSpeed;
      pos.x += sin(t + aPhase) * 0.8 + sin(t * 0.5 + aPhase * 2.0) * 0.4;
      pos.y += cos(t * 0.7 + aPhase) * 0.4 + sin(t * 0.3) * 0.3;
      pos.z += cos(t * 0.9 + aPhase * 1.5) * 0.8 + cos(t * 0.4 + aPhase) * 0.3;
      
      // Pulsing brightness with variation
      float pulse1 = sin(uTime * 3.0 + aPhase * 10.0);
      float pulse2 = sin(uTime * 1.5 + aPhase * 5.0);
      float pulse3 = sin(uTime * 0.5 + aPhase);
      vBrightness = 0.3 + 0.7 * max(0.0, pulse1 * pulse2 * 0.5 + 0.5);
      vBrightness *= 0.7 + 0.3 * pulse3;
      
      // Color variation (warm yellow to green)
      float colorShift = sin(aPhase * 3.0) * 0.5 + 0.5;
      vColor = mix(vec3(0.9, 1.0, 0.3), vec3(0.5, 1.0, 0.4), colorShift);
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size with distance attenuation and variation
      gl_PointSize = (aSize * 50.0 * vBrightness) / -mvPosition.z;
      gl_PointSize = clamp(gl_PointSize, 2.0, 30.0);
    }
  `,
  fragmentShader: `
    varying float vBrightness;
    varying vec3 vColor;
    
    void main() {
      // Soft glowing circle
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      
      // Multi-layered glow
      float core = smoothstep(0.15, 0.0, dist);
      float glow = smoothstep(0.5, 0.0, dist);
      float outer = smoothstep(0.5, 0.2, dist) * 0.3;
      
      float alpha = (core + glow * 0.5 + outer) * vBrightness;
      
      // Brighter core
      vec3 color = vColor;
      color = mix(color, vec3(1.0, 1.0, 0.9), core * 0.5);
      
      gl_FragColor = vec4(color, alpha * 0.95);
    }
  `
};

export function createFireflyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }
    },
    vertexShader: FireflyShader.vertexShader,
    fragmentShader: FireflyShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SKY GRADIENT SHADER - Beautiful atmospheric sky
// ═══════════════════════════════════════════════════════════════════════════

export const SkyShader = {
  vertexShader: `
    varying vec3 vWorldPosition;
    varying vec3 vPosition;
    
    void main() {
      vPosition = position;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uTopColor;
    uniform vec3 uMiddleColor;
    uniform vec3 uBottomColor;
    uniform vec3 uSunColor;
    uniform vec3 uSunDir;
    uniform float uSunIntensity;
    uniform float uTime;
    
    varying vec3 vWorldPosition;
    varying vec3 vPosition;
    
    void main() {
      vec3 viewDir = normalize(vPosition);
      float y = viewDir.y;
      
      // Sky gradient
      vec3 skyColor;
      if (y > 0.0) {
        skyColor = mix(uMiddleColor, uTopColor, pow(y, 0.8));
      } else {
        skyColor = mix(uMiddleColor, uBottomColor, pow(-y, 0.5));
      }
      
      // Sun glow
      float sunDot = max(dot(viewDir, normalize(uSunDir)), 0.0);
      float sunGlow = pow(sunDot, 8.0) * 0.5;
      float sunCore = pow(sunDot, 64.0) * uSunIntensity;
      float sunHalo = pow(sunDot, 2.0) * 0.15;
      
      skyColor += uSunColor * (sunGlow + sunCore + sunHalo);
      
      // Atmospheric scattering at horizon
      float horizonGlow = 1.0 - abs(y);
      horizonGlow = pow(horizonGlow, 4.0);
      skyColor += uSunColor * horizonGlow * 0.2;
      
      gl_FragColor = vec4(skyColor, 1.0);
    }
  `
};

export function createSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTopColor: { value: new THREE.Color(0x0077be) },
      uMiddleColor: { value: new THREE.Color(0x87ceeb) },
      uBottomColor: { value: new THREE.Color(0xffeedd) },
      uSunColor: { value: new THREE.Color(0xffffee) },
      uSunDir: { value: new THREE.Vector3(0.5, 0.3, 0.5) },
      uSunIntensity: { value: 2.0 },
      uTime: { value: 0 }
    },
    vertexShader: SkyShader.vertexShader,
    fragmentShader: SkyShader.fragmentShader,
    side: THREE.BackSide,
    depthWrite: false
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DUST MOTES SHADER - Atmospheric particles
// ═══════════════════════════════════════════════════════════════════════════

export function createDustMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xffffee) }
    },
    vertexShader: `
      uniform float uTime;
      attribute float aPhase;
      attribute float aSpeed;
      varying float vAlpha;
      
      void main() {
        vec3 pos = position;
        
        // Slow drifting motion
        float t = uTime * aSpeed * 0.2;
        pos.x += sin(t + aPhase) * 2.0;
        pos.y += cos(t * 0.5 + aPhase) * 1.0 + sin(t * 0.2) * 0.5;
        pos.z += sin(t * 0.7 + aPhase * 2.0) * 2.0;
        
        // Fade based on height and distance
        vAlpha = 0.15 + 0.1 * sin(uTime + aPhase);
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = 3.0 / -mvPosition.z;
        gl_PointSize = clamp(gl_PointSize, 1.0, 4.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        if (dist > 0.5) discard;
        
        float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}
