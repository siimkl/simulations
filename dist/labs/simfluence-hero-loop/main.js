(async () => {
const THREE = await import('https://unpkg.com/three@0.180.0/build/three.module.js');

const TAU = Math.PI * 2;

const CONFIG = {
  loopDuration: 10,
  maxPixelRatio: 1.75,
  mobilePixelRatio: 1.35,
  agentsPerSide: 110,
  agentRadius: 0.082,
  world: {
    leftX: -4.3,
    rightX: 4.3,
    spawnY: -4.9,
    goalY: 3.45
  },
  colors: {
    bg: 0x0a2540,
    divider: 0x3b6c91,
    weak: 0x627286,
    weakGlow: 0x8ea0b4,
    strong: 0x11a8ff,
    strongGlow: 0xa7e4ff,
    success: 0xff8c2a,
    successGlow: 0xffc084,
    particle: 0xa4b8cf
  }
};

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const mix = (a, b, t) => a + (b - a) * t;
const fract = (value) => value - Math.floor(value);
const smoothstep = (edge0, edge1, value) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const hash = (value) => fract(Math.sin(value * 127.1 + 311.7) * 43758.5453123);

const mount = document.querySelector('[data-hero-scene]');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.85;
renderer.domElement.setAttribute('aria-hidden', 'true');
mount.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = null;
scene.fog = new THREE.FogExp2(CONFIG.colors.bg, 0.018);

const world = new THREE.Group();
scene.add(world);

const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 60);
camera.position.set(0, 0.55, 18.5);
camera.lookAt(0, 0.5, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const weakRimLight = new THREE.DirectionalLight(0xdbe8f5, 1.3);
weakRimLight.position.set(-9, 6, 7);
scene.add(weakRimLight);

const strongRimLight = new THREE.DirectionalLight(CONFIG.colors.strongGlow, 2.1);
strongRimLight.position.set(7, 8, 8);
scene.add(strongRimLight);

const strongKeyLight = new THREE.PointLight(CONFIG.colors.strong, 1.55, 28, 2);
strongKeyLight.position.set(4.35, 2.85, 2.2);
scene.add(strongKeyLight);

const successKeyLight = new THREE.PointLight(CONFIG.colors.success, 0.88, 18, 2);
successKeyLight.position.set(4.25, 3.95, 1.7);
scene.add(successKeyLight);

const weakFillLight = new THREE.PointLight(0x91a5bb, 0.45, 16, 2);
weakFillLight.position.set(-4.35, 2.6, 1.7);
scene.add(weakFillLight);

function createPanel(width, height, color, opacity) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false
    })
  );
}

function createRibbon(width, height, color, opacity) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
}

function addFieldDecor() {
  const weakPanel = createPanel(6.4, 12.8, 0x305371, 0.19);
  weakPanel.position.set(CONFIG.world.leftX, -0.25, -2.5);
  weakPanel.rotation.z = 0.035;
  world.add(weakPanel);

  const strongPanel = createPanel(6.4, 12.8, 0x224f74, 0.2);
  strongPanel.position.set(CONFIG.world.rightX, -0.1, -2.6);
  strongPanel.rotation.z = -0.035;
  world.add(strongPanel);

  const weakShards = [
    { x: -5.55, y: -0.95, h: 3.7, r: 0.11, opacity: 0.038 },
    { x: -4.85, y: 0.15, h: 2.5, r: -0.06, opacity: 0.036 },
    { x: -4.1, y: -0.2, h: 4.3, r: 0.04, opacity: 0.042 },
    { x: -3.2, y: 1.05, h: 2.1, r: 0.09, opacity: 0.034 }
  ];

  const strongLanes = [
    { x: 3.2, y: -0.45, h: 5.4, r: -0.09, opacity: 0.14 },
    { x: 3.95, y: -0.05, h: 6.0, r: -0.03, opacity: 0.165 },
    { x: 4.7, y: 0.1, h: 6.2, r: 0.03, opacity: 0.18 },
    { x: 5.45, y: -0.3, h: 5.4, r: 0.09, opacity: 0.14 }
  ];

  for (const shard of weakShards) {
    const ribbon = createRibbon(0.18, shard.h, CONFIG.colors.weakGlow, shard.opacity);
    ribbon.position.set(shard.x, shard.y, -1.25);
    ribbon.rotation.z = shard.r;
    ribbon.rotation.x = Math.PI * 0.04;
    world.add(ribbon);
  }

  for (const lane of strongLanes) {
    const ribbon = createRibbon(0.18, lane.h, CONFIG.colors.strong, lane.opacity);
    ribbon.position.set(lane.x, lane.y, -1.1);
    ribbon.rotation.z = lane.r;
    ribbon.rotation.x = -Math.PI * 0.04;
    world.add(ribbon);
  }

  const strongSpine = createRibbon(0.26, 7.4, CONFIG.colors.strongGlow, 0.2);
  strongSpine.position.set(CONFIG.world.rightX, 0.25, -1.35);
  world.add(strongSpine);

  const strongShelf = createRibbon(2.3, 0.42, CONFIG.colors.success, 0.2);
  strongShelf.position.set(CONFIG.world.rightX, CONFIG.world.goalY - 0.15, -0.92);
  world.add(strongShelf);

  const weakDepthHalo = new THREE.Mesh(
    new THREE.CircleGeometry(2.25, 40),
    new THREE.MeshBasicMaterial({
      color: 0x6f89a2,
      transparent: true,
      opacity: 0.08,
      depthWrite: false
    })
  );
  weakDepthHalo.position.set(CONFIG.world.leftX, 0.95, -2.25);
  world.add(weakDepthHalo);

  const strongDepthHalo = new THREE.Mesh(
    new THREE.CircleGeometry(2.55, 48),
    new THREE.MeshBasicMaterial({
      color: CONFIG.colors.strongGlow,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  strongDepthHalo.position.set(CONFIG.world.rightX, 1.15, -2.2);
  world.add(strongDepthHalo);
}

function createDivider() {
  const group = new THREE.Group();

  const glow = createPanel(0.55, 14.4, CONFIG.colors.divider, 0.16);
  glow.position.z = -1.8;
  group.add(glow);

  const line = createPanel(0.038, 13.2, 0xd9e9f7, 0.62);
  line.position.z = -0.6;
  group.add(line);

  world.add(group);

  return { group, glow, line };
}

function createGoalZone(x, ringColor, haloColor, coreColor, stronger = false) {
  const group = new THREE.Group();
  group.position.set(x, CONFIG.world.goalY, 0.05);

  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 48),
    new THREE.MeshBasicMaterial({
      color: haloColor,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  halo.position.z = -0.55;
  group.add(halo);

  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.02, 0.05, 12, 72),
    new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.32,
      depthWrite: false
    })
  );
  outerRing.rotation.x = Math.PI * 0.5 + 0.12;
  group.add(outerRing);

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.025, 10, 64),
    new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.22,
      depthWrite: false
    })
  );
  innerRing.rotation.x = Math.PI * 0.5 + 0.12;
  innerRing.position.z = 0.1;
  group.add(innerRing);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 14, 14),
    new THREE.MeshStandardMaterial({
      color: coreColor,
      emissive: coreColor,
      emissiveIntensity: 1.3,
      roughness: 0.28,
      metalness: 0.05,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    })
  );
  core.position.z = 0.24;
  group.add(core);

  let crown = null;
  let beam = null;

  if (stronger) {
    crown = new THREE.Mesh(
      new THREE.TorusGeometry(1.34, 0.026, 10, 72),
      new THREE.MeshBasicMaterial({
        color: coreColor,
        transparent: true,
        opacity: 0.16,
        depthWrite: false
      })
    );
    crown.rotation.x = Math.PI * 0.5 + 0.12;
    crown.position.z = -0.18;
    group.add(crown);

    beam = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 5.5),
      new THREE.MeshBasicMaterial({
        color: haloColor,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    beam.position.set(0, -1.7, -0.62);
    group.add(beam);
  }

  world.add(group);

  return {
    group,
    halo,
    outerRing,
    innerRing,
    core,
    crown,
    beam
  };
}

function createParticles() {
  const count = 88;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    positions[i * 3 + 0] = mix(-12, 12, hash(i + 0.21));
    positions[i * 3 + 1] = mix(-7, 7, hash(i + 2.13));
    positions[i * 3 + 2] = mix(-3, -12, hash(i + 4.37));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: CONFIG.colors.particle,
    size: 0.045,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);
  points.position.z = -1;
  world.add(points);

  return points;
}

addFieldDecor();
const divider = createDivider();
const weakGoal = createGoalZone(
  CONFIG.world.leftX,
  CONFIG.colors.weakGlow,
  0x38556f,
  CONFIG.colors.weakGlow
);
const strongGoal = createGoalZone(
  CONFIG.world.rightX,
  CONFIG.colors.success,
  CONFIG.colors.success,
  CONFIG.colors.successGlow,
  true
);
const particles = createParticles();

const sphereGeometry = new THREE.SphereGeometry(CONFIG.agentRadius, 12, 12);

const weakAgentMaterial = new THREE.MeshStandardMaterial({
  color: CONFIG.colors.weak,
  emissive: CONFIG.colors.weakGlow,
  emissiveIntensity: 0.58,
  roughness: 0.26,
  metalness: 0.04,
  transparent: true,
  opacity: 0.9,
  depthWrite: false
});

const strongAgentMaterial = new THREE.MeshStandardMaterial({
  color: CONFIG.colors.strong,
  emissive: CONFIG.colors.strongGlow,
  emissiveIntensity: 1.95,
  roughness: 0.2,
  metalness: 0.06,
  transparent: true,
  opacity: 1,
  depthWrite: false
});

const strongTrailMaterial = new THREE.MeshBasicMaterial({
  color: CONFIG.colors.strongGlow,
  transparent: true,
  opacity: 0.36,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

const weakMesh = new THREE.InstancedMesh(
  sphereGeometry,
  weakAgentMaterial,
  CONFIG.agentsPerSide
);
weakMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
weakMesh.frustumCulled = false;
world.add(weakMesh);

const strongTrailMesh = new THREE.InstancedMesh(
  sphereGeometry,
  strongTrailMaterial,
  CONFIG.agentsPerSide
);
strongTrailMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
strongTrailMesh.frustumCulled = false;
world.add(strongTrailMesh);

const strongMesh = new THREE.InstancedMesh(
  sphereGeometry,
  strongAgentMaterial,
  CONFIG.agentsPerSide
);
strongMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
strongMesh.frustumCulled = false;
world.add(strongMesh);

function createAgents(side) {
  const agents = [];
  const lanePattern = side > 0 ? [-1.05, -0.52, 0, 0.52, 1.05] : [-1.45, -0.72, 0, 0.8, 1.48];

  for (let i = 0; i < CONFIG.agentsPerSide; i += 1) {
    const n = i + 1;
    const laneBase = lanePattern[i % lanePattern.length];
    agents.push({
      side,
      offset: hash(n * 0.37 + side * 0.17),
      cycle: hash(n * 1.19 + (side > 0 ? 0.61 : 1.71)) > (side > 0 ? 0.52 : 0.78) ? 2 : 1,
      startX: laneBase + mix(-0.44, 0.44, hash(n * 1.73 + 0.29)),
      lane: laneBase * (side > 0 ? 0.72 : 0.9) + mix(-0.2, 0.2, hash(n * 1.91 + 0.83)),
      spawnYJitter: mix(-0.3, 0.95, hash(n * 2.09 + 0.37)),
      depthBase: mix(-1.5, 1.5, hash(n * 2.33 + 0.49)),
      depthTarget: mix(-0.24, 0.24, hash(n * 2.71 + 0.91)),
      size: mix(0.78, 1.28, hash(n * 2.97 + 0.13)),
      sway: mix(0.55, 1.1, hash(n * 3.19 + 0.21)),
      drift: mix(0.7, 1.45, hash(n * 3.47 + 0.58)),
      stall: mix(0.15, 0.9, hash(n * 3.77 + 0.74)),
      pulse: hash(n * 4.07 + 0.14) * TAU,
      phaseA: hash(n * 4.31 + 0.2) * TAU,
      phaseB: hash(n * 4.61 + 0.41) * TAU,
      orbitAngle: hash(n * 4.91 + 0.09) * TAU,
      orbitRadius: mix(0.28, 0.82, hash(n * 5.23 + 0.33)),
      affinity: hash(n * 5.61 + 0.17),
      trailLength: mix(side > 0 ? 1.7 : 1.2, side > 0 ? 2.8 : 2.0, hash(n * 5.83 + 0.67)),
      loopA: 1 + Math.floor(hash(n * 6.11 + 0.32) * 2),
      loopB: 1 + Math.floor(hash(n * 6.49 + 0.17) * 3),
      merge: mix(-0.2, 0.2, hash(n * 6.83 + 0.43)),
      position: new THREE.Vector3(),
      previous: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      currentState: { scale: 0, successWeight: 0 },
      previousState: { scale: 0, successWeight: 0 }
    });
  }

  return agents;
}

const weakAgents = createAgents(-1);
const strongAgents = createAgents(1);

const dummy = new THREE.Object3D();
const trailDummy = new THREE.Object3D();
const trailScale = new THREE.Vector3();
const trailMidpoint = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);

function sampleAgent(agent, phase, intro, divergence, showcase, fade, outPosition, state) {
  const local = fract(phase * agent.cycle + agent.offset);
  const localIn = smoothstep(0.0, 0.05, local);
  const localOut = 1 - smoothstep(0.92, 1.0, local);
  const density = 0.78 + 0.22 * intro;
  const visibility = density * localIn * localOut * fade;

  const centerX = agent.side > 0 ? CONFIG.world.rightX : CONFIG.world.leftX;
  const spawnY = CONFIG.world.spawnY + agent.spawnYJitter;
  const goalX = centerX;
  const goalY = CONFIG.world.goalY;
  const startX = centerX + agent.startX;
  const laneX = centerX + agent.lane;

  const travel = clamp01((local - 0.05) / 0.66);
  const travelEase = easeInOutCubic(travel);
  const resolve = easeInOutCubic(clamp01((local - 0.72) / 0.16));
  const recycle = smoothstep(0.9, 1.0, local);

  const successChance = agent.side > 0
    ? mix(0.62, 0.98, divergence * 0.74 + showcase * 0.26)
    : mix(0.24, 0.06, divergence * 0.7 + showcase * 0.3);

  const arrivalFactor = smoothstep(
    agent.affinity - 0.13,
    agent.affinity + 0.13,
    successChance
  );

  let x;
  let y;
  let z;

  if (agent.side > 0) {
    const laneBlend = mix(0.58, 0.995, divergence);
    const laneGuide = mix(startX, laneX, easeOutCubic(Math.min(1, travel * 1.28)));
    const goalGuide = mix(
      laneGuide,
      goalX + agent.merge * mix(0.14, 0.03, divergence),
      laneBlend * smoothstep(0.22, 0.88, travel)
    );
    const sway = Math.sin(local * TAU * (1 + agent.cycle * 0.18) + agent.phaseA)
      * agent.sway
      * mix(0.09, 0.018, divergence);
    const glide = Math.sin(phase * TAU * agent.loopA + agent.phaseB) * (1 - divergence) * 0.028;
    const lift = Math.sin(local * TAU + agent.phaseB) * (1 - divergence) * 0.024;

    x = goalGuide + sway + glide;
    y = mix(spawnY, goalY - 0.05, travelEase) + lift;
    z = mix(agent.depthBase * 0.48, agent.depthTarget, easeOutCubic(travel))
      + Math.cos(phase * TAU * agent.loopB + agent.phaseB) * (1 - divergence) * 0.028;
  } else {
    const turbulence = mix(0.42, 0.95, divergence) * agent.sway;
    const stallWindow = smoothstep(0.18, 0.44, travel) * (1 - smoothstep(0.54, 0.82, travel));
    const slowdown = 1 - stallWindow * mix(0.18, 0.38, divergence) * (0.55 + agent.stall * 0.45);
    const driftA = Math.sin(local * TAU * (1.02 + agent.drift * 0.08) + agent.phaseA);
    const driftB = Math.cos(local * TAU * (2.0 + agent.drift * 0.22) + agent.phaseB);
    const crossDrift = Math.sin(local * TAU * 0.7 + phase * TAU * 1.2 + agent.phaseA) * mix(0.22, 0.42, divergence);

    x = mix(startX, laneX, travel * 0.36) + driftA * turbulence + driftB * turbulence * 0.28 + crossDrift;
    y = spawnY
      + (goalY - spawnY - 1.42)
      * easeInOutCubic(travel * slowdown * mix(0.92, 0.82, divergence))
      + Math.sin(local * TAU * 2.2 + phase * TAU * agent.loopA + agent.phaseB) * 0.08 * turbulence;
    z = mix(agent.depthBase, agent.depthBase * 0.3, travel)
      + Math.sin(local * TAU * 1.45 + agent.phaseA) * (0.3 + divergence * 0.18)
      + Math.cos(phase * TAU * agent.loopB + agent.phaseB) * 0.14;
  }

  const orbitAngle = agent.orbitAngle + phase * TAU * agent.loopA + local * TAU * 0.26;
  const goalPosX = goalX + Math.cos(orbitAngle) * agent.orbitRadius * (agent.side > 0 ? 0.26 : 0.62);
  const goalPosY = goalY + 0.08 + Math.sin(orbitAngle * 1.2) * (agent.side > 0 ? 0.12 : 0.1);
  const goalPosZ = Math.sin(orbitAngle * 1.6) * (agent.side > 0 ? 0.16 : 0.12);

  const failPosX = agent.side > 0
    ? x + Math.sin(agent.phaseA + resolve * TAU * agent.loopA) * 0.2
    : x + Math.sin(agent.phaseA + resolve * TAU * agent.loopA) * (0.56 + divergence * 0.6);
  const failPosY = agent.side > 0 ? y - resolve * 0.28 : y + 0.1 - resolve * 1.45;
  const failPosZ = agent.side > 0
    ? z + Math.cos(agent.phaseB + resolve * TAU * agent.loopB) * 0.08
    : z + Math.cos(agent.phaseB + resolve * TAU * agent.loopB) * 0.22;

  const goalBlend = resolve * (agent.side > 0 ? mix(0.38, 1, arrivalFactor) : mix(0.01, 0.28, arrivalFactor));
  x = mix(failPosX, goalPosX, goalBlend);
  y = mix(failPosY, goalPosY, goalBlend);
  z = mix(failPosZ, goalPosZ, goalBlend);

  const resetX = startX;
  const resetY = spawnY + 0.5;
  const resetZ = agent.depthBase * 0.45;

  x = mix(x, resetX, recycle);
  y = mix(y, resetY, recycle);
  z = mix(z, resetZ, recycle);

  outPosition.set(x, y, z);

  const pulse = 1 + Math.sin(agent.pulse + phase * TAU * agent.loopB) * (agent.side > 0 ? 0.052 : 0.022);
  const buildUp = mix(0.9, 1.02, intro);
  const scale = Math.max(
    0.0001,
    agent.size
      * visibility
      * pulse
      * buildUp
      * mix(0.94, 1.2, resolve * arrivalFactor)
  );

  state.scale = scale;
  state.successWeight = visibility * resolve * arrivalFactor;
}

function updateAgentSet(agents, mesh, phase, intro, divergence, showcase, fade) {
  let successLoad = 0;

  for (let i = 0; i < agents.length; i += 1) {
    const agent = agents[i];
    sampleAgent(agent, phase, intro, divergence, showcase, fade, agent.position, agent.currentState);
    successLoad += agent.currentState.successWeight;

    dummy.position.copy(agent.position);
    dummy.scale.setScalar(agent.currentState.scale);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  return successLoad;
}

function updateStrongTrails(phase, previousPhase, intro, divergence, showcase, fade, previousIntro, previousDivergence, previousShowcase, previousFade) {
  for (let i = 0; i < strongAgents.length; i += 1) {
    const agent = strongAgents[i];
    sampleAgent(
      agent,
      previousPhase,
      previousIntro,
      previousDivergence,
      previousShowcase,
      previousFade,
      agent.previous,
      agent.previousState
    );

    agent.direction.copy(agent.position).sub(agent.previous);
    const length = agent.direction.length();
    const visible = agent.currentState.scale > 0.02 && agent.previousState.scale > 0.01;

    if (!visible || length < 0.01) {
      trailDummy.position.copy(agent.position);
      trailDummy.scale.setScalar(0.0001);
      trailDummy.rotation.set(0, 0, 0);
      trailDummy.updateMatrix();
      strongTrailMesh.setMatrixAt(i, trailDummy.matrix);
      continue;
    }

    trailMidpoint.copy(agent.position).add(agent.previous).multiplyScalar(0.5);
    trailDummy.position.copy(trailMidpoint);
    trailDummy.quaternion.setFromUnitVectors(upAxis, agent.direction.normalize());

    trailScale.set(
      CONFIG.agentRadius * 0.82 * agent.currentState.scale,
      Math.min(0.7, length * agent.trailLength) + agent.currentState.scale * 0.08,
      CONFIG.agentRadius * 0.82 * agent.currentState.scale
    );
    trailDummy.scale.copy(trailScale);
    trailDummy.updateMatrix();
    strongTrailMesh.setMatrixAt(i, trailDummy.matrix);
  }

  strongTrailMesh.instanceMatrix.needsUpdate = true;
}

function updateGoalZone(zone, load, phase, stronger) {
  const drift = Math.sin(phase * TAU + (stronger ? 0.35 : 0.08));
  const shimmer = 0.5 + 0.5 * Math.sin(phase * TAU * 2 + (stronger ? 0.6 : 0.2));
  const ringScale = 1 + load * (stronger ? 0.16 : 0.08);
  zone.halo.material.opacity = stronger ? 0.3 + load * 0.4 + shimmer * 0.06 : 0.09 + load * 0.12;
  zone.outerRing.material.opacity = stronger ? 0.54 + load * 0.42 : 0.22 + load * 0.12;
  zone.innerRing.material.opacity = stronger ? 0.38 + load * 0.28 : 0.16 + load * 0.08;
  zone.core.material.opacity = stronger ? 0.92 + load * 0.08 : 0.6 + load * 0.1;
  zone.core.material.emissiveIntensity = stronger ? 1.95 + load * 1.2 + shimmer * 0.26 : 0.48 + load * 0.3;

  zone.group.rotation.z = drift * (stronger ? 0.025 : 0.03);
  zone.halo.scale.setScalar(1 + load * 0.24 + shimmer * (stronger ? 0.04 : 0.01));
  zone.outerRing.scale.setScalar(ringScale + shimmer * (stronger ? 0.03 : 0.01));
  zone.innerRing.scale.setScalar(1 + load * 0.18);
  zone.core.scale.setScalar(stronger ? 0.88 + load * 0.82 : 0.68 + load * 0.34);

  if (zone.crown) {
    zone.crown.material.opacity = 0.34 + load * 0.28 + shimmer * 0.06;
    zone.crown.scale.setScalar(1 + load * 0.14 + shimmer * 0.04);
  }

  if (zone.beam) {
    zone.beam.material.opacity = 0.2 + load * 0.28 + shimmer * 0.05;
    zone.beam.scale.set(1 + load * 0.08, 1 + load * 0.16 + shimmer * 0.04, 1);
  }
}

function updateLayout() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;
  const mobileBlend = clamp01((1.05 - aspect) / 0.55);

  camera.fov = mix(43, 52, mobileBlend);
  camera.aspect = aspect;
  camera.position.set(0, mix(0.55, 0.7, mobileBlend), mix(18.5, 22.1, mobileBlend));
  camera.lookAt(0, 0.5, 0);
  camera.updateProjectionMatrix();

  world.scale.set(mix(1, 0.86, mobileBlend), mix(1, 0.92, mobileBlend), mix(1, 0.9, mobileBlend));

  const pixelRatioLimit = mobileBlend > 0 ? CONFIG.mobilePixelRatio : CONFIG.maxPixelRatio;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioLimit));
  renderer.setSize(width, height, false);
}

const clock = new THREE.Clock();
let elapsed = 0;

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  elapsed += delta;

  const phase = fract(elapsed / CONFIG.loopDuration);
  const previousPhase = fract(phase - delta / CONFIG.loopDuration);

  const intro = smoothstep(0.04, 0.26, phase) * (1 - smoothstep(0.86, 1.0, phase));
  const divergence = smoothstep(0.14, 0.46, phase) * (1 - smoothstep(0.86, 1.0, phase));
  const showcase = smoothstep(0.52, 0.8, phase) * (1 - smoothstep(0.96, 1.0, phase));
  const fade = 0.82 + intro * 0.18;

  const previousIntro = smoothstep(0.04, 0.26, previousPhase) * (1 - smoothstep(0.86, 1.0, previousPhase));
  const previousDivergence = smoothstep(0.14, 0.46, previousPhase) * (1 - smoothstep(0.86, 1.0, previousPhase));
  const previousShowcase = smoothstep(0.52, 0.8, previousPhase) * (1 - smoothstep(0.96, 1.0, previousPhase));
  const previousFade = 0.82 + previousIntro * 0.18;

  const weakLoad = updateAgentSet(weakAgents, weakMesh, phase, intro, divergence, showcase, fade);
  const strongLoad = updateAgentSet(strongAgents, strongMesh, phase, intro, divergence, showcase, fade);
  updateStrongTrails(
    phase,
    previousPhase,
    intro,
    divergence,
    showcase,
    fade,
    previousIntro,
    previousDivergence,
    previousShowcase,
    previousFade
  );

  const weakGoalLoad = clamp01(weakLoad / 17);
  const strongGoalLoad = clamp01(strongLoad / 30);

  updateGoalZone(weakGoal, weakGoalLoad, phase, false);
  updateGoalZone(strongGoal, strongGoalLoad, phase, true);

  divider.glow.material.opacity = 0.12 + divergence * 0.08 + showcase * 0.04;
  divider.line.material.opacity = 0.44 + divergence * 0.16;

  particles.rotation.z = Math.sin(phase * TAU) * 0.05;
  particles.rotation.x = Math.sin(phase * TAU * 2) * 0.03;
  particles.material.opacity = 0.28 + divergence * 0.08 + showcase * 0.04;

  strongTrailMaterial.opacity = 0.3 + divergence * 0.16 + showcase * 0.1;
  strongAgentMaterial.emissiveIntensity = 1.72 + divergence * 0.62 + showcase * 0.28;
  weakAgentMaterial.emissiveIntensity = 0.44 + intro * 0.1;

  renderer.render(scene, camera);
}

window.addEventListener('resize', updateLayout);

updateLayout();
renderer.setAnimationLoop(animate);
})().catch((error) => {
  console.error('Sim17 hero failed to start.', error);
});
