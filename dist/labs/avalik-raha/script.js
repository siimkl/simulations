(() => {
  "use strict";

  const DURATION = 20;
  const IFRAME_RESIZE_MSG = "simfluence-widget:resize";

  const SCENES = [
    { start: 0, end: 3, text: "Taxes create a shared public budget." },
    { start: 3, end: 6, text: "But the budget is limited - and society has many needs." },
    { start: 6, end: 10, text: "Politics begins when legitimate needs draw on the same limited budget." },
    { start: 10, end: 14, text: "Institutions counterbalance, test, and organize competing claims." },
    { start: 14, end: 18, text: "Compromise redirects the budget into uneven but workable support." },
    { start: 18, end: 20.1, text: "A stable society is not conflict-free. It has institutions that process conflict." }
  ];

  const GROUPS = [
    { id: "healthcare", label: "Healthcare", demand: "More doctors", color: "#2777b8", allocation: 1.24, tension: 1.04, subgroups: ["Patients", "Doctors", "Nurses", "Hospitals"] },
    { id: "education", label: "Education", demand: "Better schools", color: "#2c8b74", allocation: 1.14, tension: 1.0, subgroups: ["Students", "Teachers", "Parents", "Universities"] },
    { id: "pensions", label: "Pensions", demand: "Income security", color: "#b47b1d", allocation: 1.12, tension: 1.06, subgroups: ["Retirees", "Carers", "Funds", "Low income"] },
    { id: "defence", label: "Defence", demand: "Safer borders", color: "#6b68a9", allocation: 1.08, tension: .98, subgroups: ["Army", "Cyber", "Reservists", "Veterans"] },
    { id: "infrastructure", label: "Infrastructure", demand: "Reliable roads", color: "#c6674a", allocation: .78, tension: .82, subgroups: ["Roads", "Rail", "Energy", "Water"] },
    { id: "local", label: "Local services", demand: "Services nearby", color: "#3c7f9e", allocation: .72, tension: .78, subgroups: ["Towns", "Childcare", "Libraries", "Waste"] },
    { id: "environment", label: "Environment", demand: "Long-term protection", color: "#3d8e58", allocation: .52, tension: .7, subgroups: ["Climate", "Forests", "Water", "Wildlife"] },
    { id: "business", label: "Business", demand: "Jobs and investment", color: "#8667a6", allocation: .5, tension: .68, subgroups: ["SMEs", "Startups", "Exporters", "Employers"] }
  ];

  const INSTITUTIONS = [
    "Parliament",
    "Media",
    "NGOs",
    "Elections",
    "Public debate",
    "Experts",
    "Protests",
    "Rules"
  ];

  const INSTITUTION_EFFECTS = {
    Parliament: { color: "#256fbd", accent: "#1f8f70", phase: .03, mode: "vote" },
    Media: { color: "#2f7ea6", accent: "#d6654f", phase: .16, mode: "scan" },
    NGOs: { color: "#1f8f70", accent: "#3d8e58", phase: .29, mode: "bridge" },
    Elections: { color: "#6b68a9", accent: "#256fbd", phase: .42, mode: "cycle" },
    "Public debate": { color: "#b47b1d", accent: "#d6654f", phase: .55, mode: "speech" },
    Experts: { color: "#3c7f9e", accent: "#1f8f70", phase: .68, mode: "measure" },
    Protests: { color: "#c6674a", accent: "#b47b1d", phase: .81, mode: "surge" },
    Rules: { color: "#256fbd", accent: "#1f8f70", phase: .94, mode: "brace" }
  };

  const els = {
    canvas: document.getElementById("budgetCanvas"),
    playToggle: document.getElementById("playToggle"),
    playLabel: document.getElementById("playLabel"),
    resetButton: document.getElementById("resetButton"),
    statusLabel: document.getElementById("statusLabel"),
    timeReadout: document.getElementById("timeReadout"),
    progressTrack: document.getElementById("progressTrack"),
    progressFill: document.getElementById("progressFill"),
    sceneCaption: document.getElementById("sceneCaption"),
    widget: document.getElementById("budgetWidget")
  };

  const ctx = els.canvas.getContext("2d");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const state = {
    time: 0,
    running: false,
    completed: false,
    completedAtClock: 0,
    lastFrame: 0,
    reducedMotion: reducedMotionQuery.matches,
    activeScene: -1,
    userInteracted: false,
    autoplayTimer: 0,
    canvasWidth: 0,
    canvasHeight: 0
  };

  const taxParticles = createTaxParticles(128);

  function clamp(value, min, max){
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t){
    return a + (b - a) * t;
  }

  function smoothstep(t){
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function easeOutCubic(t){
    const x = clamp(t, 0, 1);
    return 1 - Math.pow(1 - x, 3);
  }

  function rand(seed){
    const x = Math.sin(seed * 999.137) * 10000;
    return x - Math.floor(x);
  }

  function createTaxParticles(count){
    return Array.from({ length: count }, (_, index) => ({
      lane: rand(index + 1),
      phase: rand(index + 31),
      speed: lerp(.14, .32, rand(index + 67)),
      size: lerp(1.7, 4.2, rand(index + 101)),
      wobble: lerp(-1, 1, rand(index + 145))
    }));
  }

  function getTaxpayerBuildings(layout){
    const { w, cityY, mobile } = layout;
    const buildingCount = mobile ? 14 : 24;
    const gap = w / buildingCount;
    const minHeight = mobile ? 13 : 16;
    const maxHeight = mobile ? 32 : 40;
    const buildings = [];
    for(let index = 0; index < buildingCount; index++){
      const bh = lerp(minHeight, maxHeight, rand(index + 300));
      const bw = Math.max(10, gap * lerp(.36, .62, rand(index + 330)));
      const bx = index * gap + gap * .18;
      const centerX = bx + bw / 2;
      if(!mobile && Math.abs(centerX - w * .5) < 96){
        continue;
      }
      const roofKind = rand(index + 390) > .32 ? "gable" : "flat";
      const depthX = lerp(mobile ? 2.5 : 3.4, mobile ? 4.6 : 6.4, rand(index + 420));
      const depthY = lerp(mobile ? 2.2 : 3.2, mobile ? 4.4 : 5.8, rand(index + 450));
      const roofHeight = roofKind === "gable"
        ? Math.min(mobile ? 8 : 10, Math.max(4, bw * .32))
        : depthY + 1.5;
      const by = cityY - bh;
      buildings.push({
        index,
        kind: roofKind,
        x: bx,
        y: by,
        width: bw,
        height: bh,
        depthX,
        depthY,
        roofHeight,
        centerX,
        roofY: by - roofHeight,
        colorIndex: index % 3
      });
    }
    return buildings;
  }

  function getSceneIndex(time){
    for(let i = SCENES.length - 1; i >= 0; i--){
      if(time >= SCENES[i].start){
        return i;
      }
    }
    return 0;
  }

  function progressBetween(start, end){
    return clamp((state.time - start) / (end - start), 0, 1);
  }

  function formatTime(seconds){
    return "00:" + String(Math.floor(seconds)).padStart(2, "0");
  }

  function resizeCanvas(){
    const rect = els.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = Math.max(1, Math.round(rect.width));
    const cssHeight = Math.max(1, Math.round(rect.height));
    const targetWidth = Math.round(cssWidth * dpr);
    const targetHeight = Math.round(cssHeight * dpr);

    if(els.canvas.width !== targetWidth || els.canvas.height !== targetHeight){
      els.canvas.width = targetWidth;
      els.canvas.height = targetHeight;
      state.canvasWidth = cssWidth;
      state.canvasHeight = cssHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function setRunning(nextRunning){
    state.running = nextRunning;
    if(nextRunning){
      state.completed = false;
    }
    syncControls();
  }

  function reset({ run = false } = {}){
    state.time = 0;
    state.completed = false;
    state.completedAtClock = 0;
    state.activeScene = -1;
    setRunning(run);
    syncUI(true);
    draw(performance.now() / 1000);
    scheduleHeightPost(true);
  }

  function togglePlayback(){
    state.userInteracted = true;
    if(state.autoplayTimer){
      clearTimeout(state.autoplayTimer);
      state.autoplayTimer = 0;
    }

    if(state.completed || state.time >= DURATION){
      reset({ run: true });
      return;
    }

    setRunning(!state.running);
  }

  function syncControls(){
    els.playToggle.classList.toggle("is-playing", state.running);
    els.playToggle.classList.toggle("is-complete", state.completed);
    els.playToggle.setAttribute("aria-pressed", state.running ? "true" : "false");

    if(state.completed){
      els.playLabel.textContent = "Replay animation";
      els.playToggle.setAttribute("aria-label", "Replay budget compromise animation");
      els.statusLabel.textContent = "Complete";
    } else if(state.running){
      els.playLabel.textContent = "Pause animation";
      els.playToggle.setAttribute("aria-label", "Pause budget compromise animation");
      els.statusLabel.textContent = "Running";
    } else if(state.time > 0){
      els.playLabel.textContent = "Resume animation";
      els.playToggle.setAttribute("aria-label", "Resume budget compromise animation");
      els.statusLabel.textContent = "Paused";
    } else {
      els.playLabel.textContent = "Run animation";
      els.playToggle.setAttribute("aria-label", "Start budget compromise animation");
      els.statusLabel.textContent = state.reducedMotion ? "Ready" : "Ready";
    }
  }

  function syncUI(forceScene = false){
    const clampedTime = clamp(state.time, 0, DURATION);
    const progress = clampedTime / DURATION;
    els.progressFill.style.width = (progress * 100).toFixed(2) + "%";
    els.progressTrack.setAttribute("aria-valuenow", clampedTime.toFixed(1));
    els.timeReadout.textContent = `${formatTime(clampedTime)} / 00:20`;
    els.timeReadout.setAttribute("datetime", `PT${Math.round(clampedTime)}S`);

    const sceneIndex = getSceneIndex(clampedTime);
    els.widget.classList.toggle("is-final-scene", sceneIndex === SCENES.length - 1);
    if(forceScene || sceneIndex !== state.activeScene){
      state.activeScene = sceneIndex;
      els.sceneCaption.textContent = SCENES[sceneIndex].text;
      scheduleHeightPost();
    }

    syncControls();
  }

  function getLayout(w, h){
    const mobile = w < 640;
    const cityY = h - (mobile ? 36 : 32);
    const center = {
      x: w * .5,
      y: mobile ? h * .47 : h * .45
    };
    const radius = clamp(Math.min(w, h) * (mobile ? .108 : .108), mobile ? 44 : 50, mobile ? 66 : 76);
    const ringRadius = radius + (mobile ? 46 : 66);
    const orbitX = mobile ? w * .34 : Math.min(w * .38, 420);
    const orbitY = mobile ? h * .32 : Math.min(h * .34, 245);

    const positions = mobile
      ? {
          healthcare: { x: w * .26, y: h * .155 },
          education: { x: w * .74, y: h * .155 },
          pensions: { x: w * .18, y: h * .34 },
          defence: { x: w * .82, y: h * .34 },
          infrastructure: { x: w * .18, y: h * .63 },
          local: { x: w * .82, y: h * .63 },
          environment: { x: w * .29, y: Math.min(cityY - 42, h * .82) },
          business: { x: w * .71, y: Math.min(cityY - 42, h * .82) }
        }
      : {
          healthcare: { x: center.x, y: Math.max(58, center.y - orbitY - 18) },
          education: { x: center.x - orbitX * .86, y: center.y - orbitY * .56 },
          pensions: { x: center.x, y: Math.min(cityY - 42, center.y + orbitY + 30) },
          defence: { x: center.x + orbitX * .9, y: center.y - orbitY * .14 },
          infrastructure: { x: center.x - orbitX * .72, y: Math.min(cityY - 42, center.y + orbitY * .56) },
          local: { x: center.x - orbitX, y: center.y + 10 },
          environment: { x: center.x + orbitX * .72, y: Math.min(cityY - 42, center.y + orbitY * .58) },
          business: { x: center.x + orbitX * .72, y: center.y - orbitY * .68 }
        };

    for(const group of GROUPS){
      const pos = positions[group.id];
      pos.x = clamp(pos.x, mobile ? 44 : 70, w - (mobile ? 44 : 70));
      pos.y = clamp(pos.y, mobile ? 58 : 54, cityY - 32);
    }

    return { w, h, mobile, center, radius, ringRadius, cityY, positions };
  }

  function getBudgetDynamics(layout, clock){
    const rawFight = smoothstep(progressBetween(6, 9.5)) * (1 - smoothstep(progressBetween(14.8, 16)));
    const process = smoothstep(progressBetween(10, 14));
    const allocation = smoothstep(progressBetween(14, 18));
    const equilibrium = smoothstep(progressBetween(18, 20));
    const stabilization = smoothstep(progressBetween(14.8, 16.5));
    const conflict = smoothstep(progressBetween(6, 9.3)) * (1 - smoothstep(progressBetween(14.8, 16)));
    const earlyFight = smoothstep(progressBetween(6, 7.25)) * (1 - smoothstep(progressBetween(12.8, 14.8)));
    const institutionalTension = smoothstep(progressBetween(10, 12.5)) * (1 - smoothstep(progressBetween(14.5, 16)));
    const tug = smoothstep(progressBetween(6, 8.2)) * (1 - smoothstep(progressBetween(14.6, 15.8)));
    const fight = clamp(rawFight * (1.18 - process * .12), 0, 1);
    const stress = clamp((conflict * 1.34 + earlyFight * .94 + institutionalTension * .58) * (1 - process * .1) * (1 - allocation * .58), 0, 1);
    const tear = clamp((tug * 1.02 + earlyFight * .56 + institutionalTension * .36) * (1 - allocation * .62), 0, 1);
    const residualInstability = stabilization * (.075 + (state.reducedMotion ? 0 : (.5 + .5 * Math.sin(clock * .72)) * .022));
    const syncWave = state.reducedMotion ? 0 : Math.sin(clock * 2.8);
    const conflictWave = state.reducedMotion ? 0 : Math.sin(clock * 6.8);
    const jitterX = state.reducedMotion ? 0 : fight * (Math.sin(clock * 7.4) * 10.8 + Math.sin(clock * 12.7) * 5.8) + residualInstability * Math.sin(clock * .63) * 26;
    const jitterY = state.reducedMotion ? 0 : fight * (Math.cos(clock * 6.8) * 8.9 + Math.sin(clock * 10.9) * 4.6) + residualInstability * Math.cos(clock * .57) * 21;
    const pulse = state.reducedMotion ? 0 : syncWave * (.024 + fight * .046) + Math.sin(clock * .82) * residualInstability * .18;

    return {
      center: {
        x: layout.center.x + jitterX,
        y: layout.center.y + jitterY
      },
      rawFight,
      fight,
      conflict,
      tug,
      process,
      allocation,
      equilibrium,
      stabilization,
      residualInstability,
      earlyFight,
      institutionalTension,
      stress,
      tear,
      pulse,
      syncWave,
      syncBeat: .5 + .5 * syncWave,
      conflictWave,
      processCalm: process * .46 + allocation * .35
    };
  }

  function draw(nowSeconds){
    resizeCanvas();

    const w = state.canvasWidth || els.canvas.clientWidth;
    const h = state.canvasHeight || els.canvas.clientHeight;
    const layout = getLayout(w, h);
    const clock = state.reducedMotion ? 0 : nowSeconds;
    const budgetDynamics = getBudgetDynamics(layout, clock);

    ctx.clearRect(0, 0, w, h);
    drawBackdrop(w, h, layout);
    drawCityLayer(w, h, layout, clock);
    drawCivicMembershipThreads(layout, clock, budgetDynamics);
    drawTaxStreams(layout, clock);
    drawClaimLines(layout, clock, budgetDynamics);
    drawClaimSiphons(layout, clock, budgetDynamics);
    drawBudgetTugBands(layout, clock, budgetDynamics);
    drawPoliticalRing(layout, clock);
    drawInstitutionCounterbalance(layout, clock);
    drawAllocationStreams(layout, clock);
    drawBudgetSphere(layout, clock, budgetDynamics);
    drawSubgroups(layout, clock, budgetDynamics);
    drawGroups(layout, clock, budgetDynamics);
    drawCanvasLegend(layout, clock);
  }

  function drawBackdrop(w, h, layout){
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#f9fbfd");
    bg.addColorStop(.48, "#edf4f8");
    bg.addColorStop(1, "#e8f0f3");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = .5;
    ctx.strokeStyle = "#d8e4ec";
    ctx.lineWidth = 1;
    const grid = layout.mobile ? 54 : 64;
    for(let x = grid; x < w; x += grid){
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for(let y = grid; y < h; y += grid){
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    const horizon = ctx.createLinearGradient(0, layout.cityY - 90, 0, layout.cityY + 22);
    horizon.addColorStop(0, "rgba(255,255,255,0)");
    horizon.addColorStop(1, "rgba(215,226,234,.76)");
    ctx.fillStyle = horizon;
    ctx.fillRect(0, layout.cityY - 92, w, 116);
  }

  function drawCanvasLegend(layout, clock){
    const { mobile } = layout;
    const x = mobile ? 10 : 14;
    const y = mobile ? 10 : 14;
    const padX = mobile ? 10 : 12;
    const row1 = y + (mobile ? 20 : 22);
    const row2 = row1 + (mobile ? 21 : 23);
    const iconStart = x + padX + 2;
    const iconLength = mobile ? 34 : 42;
    const iconEnd = iconStart + iconLength;
    const iconCenter = (iconStart + iconEnd) / 2;
    const textX = iconEnd + (mobile ? 9 : 11);
    const labelFont = `850 ${mobile ? 9.4 : 11}px ${fontStack()}`;

    ctx.save();
    ctx.font = labelFont;
    const labelWidth = Math.ceil(Math.max(
      ctx.measureText("Collected taxes").width,
      ctx.measureText("Interests").width
    ));
    const width = Math.ceil((textX - x) + labelWidth + padX);
    const height = (row2 - y) + (mobile ? 13 : 15);

    ctx.globalAlpha = .94;
    ctx.fillStyle = "rgba(255,255,255,.78)";
    ctx.strokeStyle = "rgba(130,151,174,.28)";
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, width, height, mobile ? 7 : 8, true, true);

    ctx.globalAlpha = .9;
    ctx.font = labelFont;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#1d3e58";

    const pulse = state.reducedMotion ? .55 : .5 + .5 * Math.sin(clock * 3.6);
    const bubbleCount = 4;
    for(let i = 0; i < bubbleCount; i++){
      const u = i / (bubbleCount - 1);
      const bx = lerp(iconStart, iconEnd, u);
      const by = row1 + (state.reducedMotion ? 0 : Math.sin(clock * 2.5 + i * 1.15) * (mobile ? 1.4 : 1.8)) - (i % 2) * (mobile ? 2 : 2.4);
      const r = (mobile ? 2.25 : 2.75) + (i % 2) * .45;
      ctx.fillStyle = i % 2 === 0
        ? colorToRgba("#256fbd", .56 + pulse * .18)
        : colorToRgba("#1f8f70", .56 + (1 - pulse) * .2);
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#1d3e58";
    ctx.fillText("Collected taxes", textX, row1, width - (textX - x) - 8);

    ctx.strokeStyle = colorToRgba("#2c8b74", .78);
    ctx.lineWidth = mobile ? 1.05 : 1.2;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = state.reducedMotion ? 0 : -clock * 12;
    ctx.beginPath();
    ctx.moveTo(iconStart, row2);
    ctx.quadraticCurveTo(iconCenter, row2 - (mobile ? 7 : 8), iconEnd, row2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#1d3e58";
    ctx.fillText("Interests", textX, row2, width - (textX - x) - 8);
    ctx.restore();
  }

  function drawCivicMembershipThreads(layout, clock, dynamics){
    const appear = smoothstep(progressBetween(3.5, 5.8));
    if(appear <= .01){
      return;
    }

    const conflict = smoothstep(progressBetween(6, 8.2)) * (1 - smoothstep(progressBetween(12.2, 14.4)));
    const needFocus = smoothstep(progressBetween(3, 7.2)) * (1 - smoothstep(progressBetween(9.8, 12.2)));
    const process = smoothstep(progressBetween(10, 14));
    const settle = smoothstep(progressBetween(14, 18));
    const buildings = getTaxpayerBuildings(layout);
    const targets = [];

    for(let i = 0; i < GROUPS.length; i++){
      const group = GROUPS[i];
      const groupAppear = smoothstep((state.time - 3.25 - i * .08) / .72);
      if(groupAppear <= .01){
        continue;
      }
      const pos = layout.positions[group.id];
      const bob = state.reducedMotion ? 0 : Math.sin(clock * 1.7 + i) * (1.6 - settle * 1.1);
      const parent = getGroupRenderState(group, pos.x, pos.y + bob, layout, dynamics);
      const chips = getSubgroupTugPoints(group, parent, layout, needFocus, parent.visualConflict, clock, i, settle);
      for(let c = 0; c < chips.length; c++){
        targets.push({
          x: chips[c].x,
          y: chips[c].y,
          color: group.color,
          groupIndex: i,
          chipIndex: c,
          alpha: groupAppear * chips[c].alpha
        });
      }
    }

    if(!targets.length || !buildings.length){
      return;
    }

    const linkCount = layout.mobile ? 3 : 4;
    const baseAlpha = appear * (.54 + needFocus * .28 + process * .12) * (1 - conflict * .06);
    const lineWidth = layout.mobile ? 1.22 : 1.42;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash(state.reducedMotion ? [] : [3, 8]);

    for(const building of buildings){
      const start = {
        x: building.centerX,
        y: building.roofY - (layout.mobile ? 2 : 3)
      };

      for(let link = 0; link < linkCount; link++){
        const target = targets[(building.index * 7 + link * 11 + (link % 2 ? 3 : 0)) % targets.length];
        const seed = building.index * 17 + target.groupIndex * 31 + target.chipIndex * 13 + link * 23;
        const wave = state.reducedMotion ? 0 : Math.sin(clock * (1.2 + link * .18) + seed);
        const sway = (layout.mobile ? 9 : 16) * wave;
        const lift = layout.mobile ? 34 + link * 10 : 48 + link * 16;
        const cp1 = {
          x: lerp(start.x, target.x, .22) + sway * .38,
          y: Math.min(start.y, target.y) - lift
        };
        const cp2 = {
          x: lerp(start.x, target.x, .68) - sway,
          y: lerp(start.y, target.y, .68) - lift * .34
        };
        const pulse = state.reducedMotion ? .55 : .5 + .5 * Math.sin(clock * 2.7 + seed * .37);

        ctx.globalAlpha = baseAlpha * target.alpha * (.24 + pulse * .12);
        ctx.strokeStyle = colorToRgba("#ffffff", .92);
        ctx.lineWidth = lineWidth + (layout.mobile ? 1.5 : 1.9);
        ctx.lineDashOffset = state.reducedMotion ? 0 : -clock * (9 + rand(seed + 701) * 9) - seed;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, target.x, target.y);
        ctx.stroke();

        ctx.globalAlpha = baseAlpha * target.alpha * (.72 + pulse * .26);
        ctx.strokeStyle = colorToRgba(target.color, .78);
        ctx.lineWidth = lineWidth;
        ctx.lineDashOffset = state.reducedMotion ? 0 : -clock * (9 + rand(seed + 701) * 9) - seed;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, target.x, target.y);
        ctx.stroke();

        if(!state.reducedMotion){
          const u = (clock * (.055 + link * .01) + rand(seed + 503)) % 1;
          const bead = cubicPoint(u, start, cp1, cp2, target);
          ctx.globalAlpha = baseAlpha * target.alpha * (.8 + pulse * .28);
          ctx.fillStyle = colorToRgba(target.color, .82);
          ctx.beginPath();
          ctx.arc(bead.x, bead.y, layout.mobile ? 1.65 : 1.95, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawCityLayer(w, h, layout, clock){
    const finalGlow = smoothstep(progressBetween(18, 20));
    const y = layout.cityY;

    const base = ctx.createLinearGradient(0, y - 38, 0, h);
    base.addColorStop(0, `rgba(70, 112, 139, ${.12 + finalGlow * .08})`);
    base.addColorStop(1, `rgba(39, 67, 82, ${.24 + finalGlow * .12})`);
    ctx.fillStyle = base;
    ctx.fillRect(0, y - 34, w, h - y + 34);

    const buildings = getTaxpayerBuildings(layout);
    for(const building of buildings){
      drawTaxpayerBuilding(building, finalGlow, layout.mobile);
    }

    ctx.font = `${layout.mobile ? 10 : 12}px ${fontStack()}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#31485d";
    ctx.fillText("Citizens | Workers | Businesses | Communities", w * .5, h - (layout.mobile ? 8 : 9));
  }

  function drawTaxpayerBuilding(building, finalGlow, mobile){
    const {
      index,
      kind,
      x,
      y,
      width,
      height,
      depthX,
      depthY,
      roofHeight,
      colorIndex
    } = building;
    const palettes = [
      { front: "#68879a", side: "#526e7e", roof: "#5f7482", trim: "#b7d5df" },
      { front: "#6e8f82", side: "#58766b", roof: "#657d73", trim: "#cfe0c8" },
      { front: "#7f7b91", side: "#69657c", roof: "#766e86", trim: "#d4cfe2" }
    ];
    const colors = palettes[colorIndex % palettes.length];
    const glow = finalGlow * .14;
    const right = x + width;
    const bottom = y + height;
    const doorWidth = Math.max(3.2, width * .22);
    const doorHeight = Math.min(height * .42, mobile ? 11 : 14);

    ctx.save();
    ctx.globalAlpha = .86 + finalGlow * .1;
    ctx.fillStyle = `rgba(36, 61, 75, ${.12 + finalGlow * .08})`;
    ctx.beginPath();
    ctx.ellipse(x + width * .55 + depthX * .45, bottom + 2.2, width * .62 + depthX, mobile ? 3.2 : 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = adjustColor(colors.side, glow - .04);
    ctx.beginPath();
    ctx.moveTo(right, y + depthY);
    ctx.lineTo(right + depthX, y);
    ctx.lineTo(right + depthX, bottom - depthY);
    ctx.lineTo(right, bottom);
    ctx.closePath();
    ctx.fill();

    const front = ctx.createLinearGradient(x, y, right, bottom);
    front.addColorStop(0, adjustColor(colors.front, .12 + glow));
    front.addColorStop(.58, adjustColor(colors.front, glow));
    front.addColorStop(1, adjustColor(colors.side, -.04 + glow));
    ctx.fillStyle = front;
    roundRect(ctx, x, y + depthY, width, height - depthY, mobile ? 2.4 : 3.2, true, false);

    if(kind === "gable"){
      ctx.fillStyle = adjustColor(colors.roof, .05 + glow);
      ctx.beginPath();
      ctx.moveTo(x - 1, y + depthY + 1);
      ctx.lineTo(x + width * .5, y - roofHeight);
      ctx.lineTo(right + 1.5, y + depthY + 1);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = adjustColor(colors.side, -.08 + glow);
      ctx.beginPath();
      ctx.moveTo(x + width * .5, y - roofHeight);
      ctx.lineTo(right + depthX, y - roofHeight + depthY);
      ctx.lineTo(right + 1.5, y + depthY + 1);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = adjustColor(colors.roof, .07 + glow);
      ctx.beginPath();
      ctx.moveTo(x - 1, y + depthY);
      ctx.lineTo(x + depthX, y - roofHeight);
      ctx.lineTo(right + depthX + 1, y - roofHeight);
      ctx.lineTo(right + 1, y + depthY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = adjustColor(colors.side, -.1 + glow);
      ctx.beginPath();
      ctx.moveTo(right + 1, y + depthY);
      ctx.lineTo(right + depthX + 1, y - roofHeight);
      ctx.lineTo(right + depthX + 1, y);
      ctx.lineTo(right, y + depthY + roofHeight);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = .2 + finalGlow * .2;
    ctx.strokeStyle = "rgba(255,255,255,.82)";
    ctx.lineWidth = mobile ? .7 : .9;
    ctx.beginPath();
    ctx.moveTo(x + width * .1, y + depthY + 1);
    ctx.lineTo(right - width * .08, y + depthY + 1);
    ctx.stroke();

    const rows = Math.max(1, Math.floor((height - depthY - 6) / (mobile ? 12 : 14)));
    const cols = width > (mobile ? 16 : 19) ? 2 : 1;
    const winW = Math.max(2.2, width * (cols === 2 ? .16 : .24));
    const winH = mobile ? 3.4 : 4.2;
    for(let row = 0; row < rows; row++){
      for(let col = 0; col < cols; col++){
        const wx = x + width * (cols === 2 ? (col === 0 ? .25 : .61) : .4);
        const wy = y + depthY + 6 + row * (mobile ? 10 : 12);
        const lit = rand(index * 41 + row * 7 + col * 13) > .38;
        ctx.globalAlpha = lit ? .56 + finalGlow * .22 : .22 + finalGlow * .1;
        ctx.fillStyle = lit ? (index % 2 === 0 ? "#f2c875" : "#c9e8ff") : colors.trim;
        roundRect(ctx, wx, wy, winW, winH, 1.2, true, false);
      }
    }

    ctx.globalAlpha = .5 + finalGlow * .16;
    ctx.fillStyle = adjustColor(colors.side, -.12);
    roundRect(ctx, x + width * .48 - doorWidth / 2, bottom - doorHeight, doorWidth, doorHeight, 1.4, true, false);
    ctx.globalAlpha = .64 + finalGlow * .18;
    ctx.fillStyle = "#d8c17a";
    ctx.beginPath();
    ctx.arc(x + width * .48 + doorWidth * .22, bottom - doorHeight * .5, mobile ? .65 : .8, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = .28 + finalGlow * .18;
    ctx.strokeStyle = "rgba(27, 47, 61, .5)";
    ctx.lineWidth = mobile ? .7 : .9;
    ctx.beginPath();
    ctx.moveTo(right, y + depthY + 1);
    ctx.lineTo(right, bottom - .5);
    ctx.stroke();

    ctx.restore();
  }

  function drawTaxStreams(layout, clock){
    const collectAlpha = Math.max(.15 * smoothstep(progressBetween(18, 20)), 1 - smoothstep(progressBetween(5.4, 8)));
    const strongScene = 1 - smoothstep(progressBetween(3.3, 5.2));
    const alpha = clamp(collectAlpha + strongScene * .18, 0, 1);
    if(alpha <= .01){
      return;
    }

    const { center, radius, cityY, w, h } = layout;
    const buildings = getTaxpayerBuildings(layout);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for(const building of buildings){
      const i = building.index;
      const sourcePulse = state.reducedMotion ? .65 : .45 + .55 * Math.max(0, Math.sin(clock * 3.4 + i * .73));
      const startX = building.centerX;
      const startY = building.roofY - (layout.mobile ? 2 : 3);
      const lane = startX - center.x;
      const endX = center.x + lane * .1;
      const endY = center.y + radius * .78;
      const cp1x = startX + lane * .05;
      const cp1y = lerp(startY, endY, .32);
      const cp2x = center.x + lane * .18;
      const cp2y = lerp(startY, endY, .74);

      const grad = ctx.createLinearGradient(startX, startY, endX, endY);
      grad.addColorStop(0, "rgba(31, 143, 112, .12)");
      grad.addColorStop(.52, "rgba(37, 111, 189, .22)");
      grad.addColorStop(1, "rgba(37, 111, 189, .5)");
      ctx.strokeStyle = grad;
      ctx.globalAlpha = alpha * (.18 + sourcePulse * .17);
      ctx.lineWidth = layout.mobile ? 1.05 : 1.45;
      ctx.setLineDash(state.reducedMotion ? [] : [4, 11]);
      ctx.lineDashOffset = state.reducedMotion ? 0 : -clock * (28 + rand(i + 801) * 26) - i * 3;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.stroke();

      if(strongScene > .02){
        ctx.globalAlpha = alpha * strongScene * (.22 + sourcePulse * .28);
        ctx.fillStyle = building.colorIndex === 1 ? "#1f8f70" : "#256fbd";
        ctx.beginPath();
        ctx.arc(startX, startY, layout.mobile ? 2.1 : 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.setLineDash([]);

    if(!state.reducedMotion){
      for(const p of taxParticles){
        const building = buildings[Math.min(buildings.length - 1, Math.floor(p.lane * buildings.length))];
        const startX = building.centerX + p.wobble * (layout.mobile ? 2.4 : 4);
        const startY = building.roofY - (layout.mobile ? 3 : 4);
        const lane = startX - center.x;
        const endX = center.x + lane * .12;
        const endY = center.y + radius * .74;
        const u = (clock * p.speed + p.phase) % 1;
        const visible = alpha * smoothstep(progressBetween(0, 2.2));
        if(visible <= .02){
          continue;
        }
        const pt = cubicPoint(
          u,
          { x: startX, y: startY },
          { x: startX + lane * .06, y: lerp(startY, endY, .34) },
          { x: center.x + lane * .17, y: lerp(startY, endY, .76) },
          { x: endX, y: endY }
        );
        const pulse = .62 + .38 * Math.sin(clock * 5.8 + p.phase * 8);
        ctx.globalAlpha = visible * (.44 + pulse * .5);
        ctx.fillStyle = p.wobble > 0 ? "#256fbd" : "#1f8f70";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, p.size * (layout.mobile ? .88 : 1.05), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const labelAlpha = alpha * (1 - smoothstep(progressBetween(6.2, 9.5))) * (1 - smoothstep(progressBetween(10, 12)));
    ctx.globalAlpha = labelAlpha;
    ctx.font = `800 ${layout.mobile ? 10 : 12}px ${fontStack()}`;
    ctx.fillStyle = "#35556d";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    if(labelAlpha > .02){
      ctx.fillText("Taxes", clamp(center.x - (layout.mobile ? 128 : 190), 20, w - 80), lerp(cityY, center.y, .47));
    }
    ctx.textAlign = "right";
    if(labelAlpha > .02){
      ctx.fillText("Public revenue", clamp(center.x + (layout.mobile ? 128 : 190), 100, w - 20), lerp(cityY, center.y, .58));
    }
    ctx.restore();
  }

  function drawClaimLines(layout, clock, dynamics){
    const appear = smoothstep(progressBetween(3, 6));
    if(appear <= .01){
      return;
    }

    const conflict = smoothstep(progressBetween(6, 8.2)) * (1 - smoothstep(progressBetween(13.6, 15)));
    const process = smoothstep(progressBetween(10, 14));
    const allocation = smoothstep(progressBetween(14, 18));
    const { positions } = layout;
    const center = dynamics?.center || layout.center;
    const radius = layout.radius * (1 + (dynamics?.pulse || 0));

    ctx.save();
    for(let i = 0; i < GROUPS.length; i++){
      const group = GROUPS[i];
      const pos = positions[group.id];
      const v = normalize(pos.x - center.x, pos.y - center.y);
      const start = {
        x: center.x + v.x * (radius + 5),
        y: center.y + v.y * (radius + 5)
      };
      const end = {
        x: pos.x - v.x * (layout.mobile ? 24 : 29),
        y: pos.y - v.y * (layout.mobile ? 24 : 29)
      };
      const wiggle = state.reducedMotion ? 0 : Math.sin(clock * 4.6 + i * 1.7) * conflict * (layout.mobile ? 6 : 10);
      const mid = {
        x: lerp(start.x, end.x, .48) + -v.y * wiggle,
        y: lerp(start.y, end.y, .48) + v.x * wiggle
      };

      ctx.globalAlpha = appear * (.42 + conflict * .36) * (1 - allocation * .48);
      ctx.strokeStyle = colorToRgba(group.color, .62 + conflict * .2);
      ctx.lineWidth = 1.2 + conflict * group.tension * 2.2;
      ctx.setLineDash(conflict > .1 && !state.reducedMotion ? [5, 7] : []);
      ctx.lineDashOffset = -clock * 24;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      if(process > .1){
        const ringPoint = {
          x: center.x + v.x * layout.ringRadius,
          y: center.y + v.y * layout.ringRadius
        };
        ctx.quadraticCurveTo(ringPoint.x, ringPoint.y, mid.x, mid.y);
        ctx.quadraticCurveTo(mid.x, mid.y, end.x, end.y);
      } else {
        ctx.quadraticCurveTo(mid.x, mid.y, end.x, end.y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawClaimSiphons(layout, clock, dynamics){
    const conflict = smoothstep(progressBetween(6, 8.2)) * (1 - smoothstep(progressBetween(10.5, 12.6)));
    if(conflict <= .01){
      return;
    }

    const { ringRadius, positions } = layout;
    const center = dynamics?.center || layout.center;
    const radius = layout.radius * (1 + (dynamics?.pulse || 0));
    const flowScale = layout.mobile ? .72 : 1;
    const processBlock = smoothstep(progressBetween(10, 12.4));
    ctx.save();
    ctx.lineCap = "round";
    for(let i = 0; i < GROUPS.length; i++){
      const group = GROUPS[i];
      const pos = positions[group.id];
      const v = normalize(pos.x - center.x, pos.y - center.y);
      const startDistance = lerp(radius + 8, ringRadius - (layout.mobile ? 7 : 10), processBlock * .86);
      const start = {
        x: center.x + v.x * startDistance,
        y: center.y + v.y * startDistance
      };
      const end = {
        x: pos.x - v.x * (layout.mobile ? 28 : 34),
        y: pos.y - v.y * (layout.mobile ? 28 : 34)
      };
      const bendSign = i % 2 === 0 ? 1 : -1;
      const bend = {
        x: lerp(start.x, end.x, .54) - v.y * (layout.mobile ? 9 : 18) * bendSign,
        y: lerp(start.y, end.y, .54) + v.x * (layout.mobile ? 9 : 18) * bendSign
      };
      const strength = conflict * group.tension;
      const baseWidth = (layout.mobile ? 8 : 12) * flowScale * (.7 + group.tension * .36);

      ctx.globalAlpha = strength * .12;
      ctx.strokeStyle = group.color;
      ctx.lineWidth = baseWidth;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(bend.x, bend.y, end.x, end.y);
      ctx.stroke();

      ctx.globalAlpha = strength * .42;
      ctx.strokeStyle = colorToRgba(group.color, .74);
      ctx.lineWidth = Math.max(2.4, baseWidth * .34);
      ctx.setLineDash(state.reducedMotion ? [] : [3, 10]);
      ctx.lineDashOffset = state.reducedMotion ? 0 : -clock * (42 + group.tension * 18) - i * 7;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(bend.x, bend.y, end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);

      if(!state.reducedMotion){
        const dotCount = layout.mobile ? 2 : 4;
        for(let d = 0; d < dotCount; d++){
          const u = (clock * (.26 + group.tension * .055) + d / dotCount + i * .047) % 1;
          const pt = quadraticPoint(u, start, bend, end);
          const size = (layout.mobile ? 2.5 : 3.3) + group.tension * 1.2 * (1 - Math.abs(.5 - u));
          ctx.globalAlpha = strength * (.38 + u * .44);
          ctx.fillStyle = u > .72 ? "#ffffff" : group.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const mouth = 1 + (state.reducedMotion ? 0 : Math.sin(clock * 5.4 + i) * .12);
      ctx.globalAlpha = strength * .24;
      ctx.strokeStyle = colorToRgba(group.color, .9);
      ctx.lineWidth = layout.mobile ? 2 : 2.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, (layout.mobile ? 28 : 34) * mouth, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBudgetTugBands(layout, clock, dynamics){
    const tug = dynamics?.tug || 0;
    if(tug <= .02){
      return;
    }

    const { positions, mobile } = layout;
    const center = dynamics.center;
    const radius = layout.radius * (1 + (dynamics.pulse || 0));
    const processBlock = smoothstep(progressBetween(10, 13.4));
    const alphaBase = tug * (1 - dynamics.allocation * .62);
    const widthScale = mobile ? .72 : 1;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for(let i = 0; i < GROUPS.length; i++){
      const group = GROUPS[i];
      const pos = positions[group.id];
      const v = normalize(pos.x - center.x, pos.y - center.y);
      const perp = { x: -v.y, y: v.x };
      const beat = state.reducedMotion ? 1 : .74 + .26 * Math.sin(clock * (5.1 + group.tension * .4) + i * 1.2);
      const strength = alphaBase * group.tension * beat;
      const start = {
        x: center.x + v.x * (radius + (mobile ? 8 : 11)),
        y: center.y + v.y * (radius + (mobile ? 8 : 11))
      };
      const end = {
        x: pos.x - v.x * (mobile ? 35 : 46),
        y: pos.y - v.y * (mobile ? 35 : 46)
      };
      const pullBow = (mobile ? 16 : 29) * (1 - processBlock * .38);
      const bend = {
        x: lerp(start.x, end.x, .52) + perp.x * Math.sin(clock * 3.4 + i) * pullBow,
        y: lerp(start.y, end.y, .52) + perp.y * Math.sin(clock * 3.4 + i) * pullBow
      };
      const wide = (mobile ? 12 : 19) * widthScale * (.76 + group.tension * .56);

      ctx.globalAlpha = strength * .18;
      ctx.strokeStyle = group.color;
      ctx.lineWidth = wide * 1.7;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(bend.x, bend.y, end.x, end.y);
      ctx.stroke();

      ctx.globalAlpha = strength * .4;
      ctx.strokeStyle = colorToRgba(group.color, .92);
      ctx.lineWidth = wide;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(bend.x, bend.y, end.x, end.y);
      ctx.stroke();

      ctx.globalAlpha = strength * .58;
      ctx.strokeStyle = "rgba(255,255,255,.82)";
      ctx.lineWidth = Math.max(1.8, wide * .18);
      ctx.setLineDash(state.reducedMotion ? [] : [7, 13]);
      ctx.lineDashOffset = state.reducedMotion ? 0 : -clock * (56 + group.tension * 20) - i * 7;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(bend.x, bend.y, end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = strength * .82;
      ctx.fillStyle = colorToRgba(group.color, .9);
      ctx.strokeStyle = "rgba(255,255,255,.76)";
      ctx.lineWidth = mobile ? 1.1 : 1.4;
      ctx.beginPath();
      ctx.arc(start.x, start.y, mobile ? 4.4 : 5.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if(!state.reducedMotion){
        const dotCount = mobile ? 3 : 5;
        for(let d = 0; d < dotCount; d++){
          const u = (clock * (.34 + group.tension * .06) + d / dotCount + i * .061) % 1;
          const pt = quadraticPoint(u, start, bend, end);
          const size = (mobile ? 2.3 : 3.2) + Math.sin(u * Math.PI) * (mobile ? 1.2 : 1.8);
          ctx.globalAlpha = strength * (.44 + Math.sin(u * Math.PI) * .34);
          ctx.fillStyle = d % 2 === 0 ? "#ffffff" : group.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  function drawPoliticalRing(layout, clock){
    const ringAlpha = smoothstep(progressBetween(10, 12.1));
    if(ringAlpha <= .01){
      return;
    }

    const { center, ringRadius, mobile } = layout;
    const organize = smoothstep(progressBetween(10, 14));
    const spin = getInstitutionSpin(clock);
    const pulse = state.reducedMotion ? 0 : Math.sin(clock * 2.1) * .02 + spin.wobble;
    const radius = ringRadius * (1 + pulse * ringAlpha);

    ctx.save();
    ctx.globalAlpha = ringAlpha;
    ctx.lineWidth = mobile ? 6 : 8;
    ctx.strokeStyle = `rgba(37, 111, 189, ${.16 + organize * .1})`;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(31, 143, 112, ${.44 + organize * .2})`;
    ctx.setLineDash(state.reducedMotion ? [] : [8, 9]);
    ctx.lineDashOffset = state.reducedMotion ? 0 : -spin.angle * (mobile ? 18 : 24);
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const visibleInstitutions = getVisibleInstitutions(layout);
    const total = visibleInstitutions.length;
    for(let i = 0; i < total; i++){
      const text = visibleInstitutions[i];
      const angle = -Math.PI / 2 + i * (Math.PI * 2 / total) + spin.angle;
      const actorOrbit = radius + (mobile ? 19 : 25) + spin.active * Math.sin(clock * 2.4 + i) * (mobile ? 5 : 8);
      const point = {
        x: center.x + Math.cos(angle) * actorOrbit,
        y: center.y + Math.sin(angle) * actorOrbit
      };
      drawInstitutionChip(text, point.x, point.y, angle, ringAlpha, mobile, layout);
    }
    ctx.restore();
  }

  function getVisibleInstitutions(layout){
    return layout.mobile
      ? ["Parliament", "NGOs", "Protests", "Rules"]
      : INSTITUTIONS;
  }

  function getInstitutionSpin(clock){
    const entrance = smoothstep(progressBetween(10, 11.8));
    const active = entrance * (1 - smoothstep(progressBetween(18.2, 20)));
    if(state.reducedMotion){
      return { active, angle: 0, wobble: 0, idle: 0 };
    }
    const runElapsed = clamp(state.time - 10, 0, DURATION - 10);
    const idleElapsed = state.completed && state.completedAtClock
      ? Math.max(0, clock - state.completedAtClock)
      : 0;
    return {
      active,
      angle: entrance * runElapsed * .075 + idleElapsed * .12,
      wobble: active * Math.sin(clock * 1.15) * .006,
      idle: state.completed ? 1 : 0
    };
  }

  function drawInstitutionCounterbalance(layout, clock){
    const process = smoothstep(progressBetween(10, 12.2)) * (1 - smoothstep(progressBetween(14.2, 15.7)));
    const settlement = smoothstep(progressBetween(18, 20)) * .32;
    const alpha = clamp(process + settlement, 0, 1);
    if(alpha <= .01){
      return;
    }

    const { center, radius, ringRadius, positions } = layout;
    const visibleInstitutions = getVisibleInstitutions(layout);
    const processRadius = ringRadius;
    const spin = getInstitutionSpin(clock);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for(let i = 0; i < GROUPS.length; i++){
      const group = GROUPS[i];
      const pos = positions[group.id];
      const v = normalize(pos.x - center.x, pos.y - center.y);
      const p = {
        x: center.x + v.x * processRadius,
        y: center.y + v.y * processRadius
      };
      const q = {
        x: center.x + v.x * (radius + (layout.mobile ? 18 : 24)),
        y: center.y + v.y * (radius + (layout.mobile ? 18 : 24))
      };
      const perp = { x: -v.y, y: v.x };
      const gateSpan = (layout.mobile ? 17 : 24) + group.tension * (layout.mobile ? 3 : 5);
      const pulse = state.reducedMotion ? .65 : .55 + .45 * Math.sin(clock * 3.1 + i * 1.4);

      ctx.globalAlpha = alpha * (.55 + pulse * .24);
      ctx.strokeStyle = colorToRgba("#1f8f70", .78);
      ctx.lineWidth = layout.mobile ? 5.2 : 7.2;
      ctx.beginPath();
      ctx.moveTo(p.x - perp.x * gateSpan, p.y - perp.y * gateSpan);
      ctx.lineTo(p.x + perp.x * gateSpan, p.y + perp.y * gateSpan);
      ctx.stroke();

      ctx.globalAlpha = alpha * .92;
      ctx.fillStyle = "rgba(255,255,255,.88)";
      ctx.strokeStyle = colorToRgba("#1f8f70", .7);
      ctx.lineWidth = layout.mobile ? 1.6 : 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, layout.mobile ? 5.5 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = alpha * .4;
      ctx.strokeStyle = colorToRgba("#256fbd", .75);
      ctx.lineWidth = layout.mobile ? 2.2 : 3;
      ctx.setLineDash(state.reducedMotion ? [] : [8, 9]);
      ctx.lineDashOffset = state.reducedMotion ? 0 : clock * 34 + i * 4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(lerp(p.x, q.x, .45) - perp.x * 10, lerp(p.y, q.y, .45) - perp.y * 10, q.x, q.y);
      ctx.stroke();
      ctx.setLineDash([]);

      if(!state.reducedMotion){
        for(let d = 0; d < 2; d++){
          const u = (clock * (.22 + d * .04) + i * .083 + d * .42) % 1;
          const pt = quadraticPoint(1 - u, p, {
            x: lerp(p.x, q.x, .45) - perp.x * 10,
            y: lerp(p.y, q.y, .45) - perp.y * 10
          }, q);
          ctx.globalAlpha = alpha * .42;
          ctx.fillStyle = d === 0 ? "#1f8f70" : "#256fbd";
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, layout.mobile ? 2.2 : 3.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    for(let i = 0; i < visibleInstitutions.length; i++){
      const angle = -Math.PI / 2 + i * (Math.PI * 2 / visibleInstitutions.length) + spin.angle;
      const anchor = {
        x: center.x + Math.cos(angle) * (processRadius + (layout.mobile ? 10 : 16)),
        y: center.y + Math.sin(angle) * (processRadius + (layout.mobile ? 10 : 16))
      };
      const inner = {
        x: center.x + Math.cos(angle) * (processRadius - (layout.mobile ? 14 : 20)),
        y: center.y + Math.sin(angle) * (processRadius - (layout.mobile ? 14 : 20))
      };
      ctx.globalAlpha = alpha * (.18 + .12 * (state.reducedMotion ? 1 : Math.max(0, Math.sin(clock * 4 + i))));
      ctx.strokeStyle = colorToRgba(i % 2 === 0 ? "#256fbd" : "#1f8f70", .7);
      ctx.lineWidth = layout.mobile ? 1.6 : 2;
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(inner.x, inner.y);
      ctx.stroke();
    }

    drawInstitutionActorEffects(layout, visibleInstitutions, processRadius, alpha, clock, spin);
    ctx.restore();
  }

  function drawInstitutionActorEffects(layout, institutions, processRadius, alpha, clock, spin = { angle: 0, active: 0 }){
    const { center, mobile } = layout;
    const count = institutions.length;
    for(let i = 0; i < count; i++){
      const name = institutions[i];
      const effect = INSTITUTION_EFFECTS[name] || INSTITUTION_EFFECTS.Rules;
      const angle = -Math.PI / 2 + i * (Math.PI * 2 / count) + spin.angle;
      const outward = { x: Math.cos(angle), y: Math.sin(angle) };
      const tangent = { x: -outward.y, y: outward.x };
      const ringPoint = {
        x: center.x + outward.x * processRadius,
        y: center.y + outward.y * processRadius
      };
      const chipOrbit = processRadius + (mobile ? 30 : 42) + spin.active * Math.sin(clock * 2.2 + i * .8) * (mobile ? 5 : 8);
      const chipPoint = {
        x: center.x + outward.x * chipOrbit,
        y: center.y + outward.y * chipOrbit
      };
      const beat = state.reducedMotion ? .72 : .5 + .5 * Math.sin(clock * 4.8 + effect.phase * Math.PI * 2);

      if(effect.mode === "surge"){
        drawProtestSurge(layout, ringPoint, chipPoint, outward, tangent, effect, alpha, beat, clock);
      } else if(effect.mode === "bridge"){
        drawNgoBridge(layout, ringPoint, chipPoint, outward, tangent, effect, alpha, beat, clock);
      } else if(effect.mode === "scan"){
        drawMediaScan(layout, ringPoint, chipPoint, outward, tangent, effect, alpha, beat, clock);
      } else if(effect.mode === "brace"){
        drawRulesBrace(layout, ringPoint, tangent, effect, alpha, beat, clock);
      } else if(effect.mode === "measure"){
        drawExpertMeasure(layout, ringPoint, outward, tangent, effect, alpha, beat, clock);
      } else if(effect.mode === "speech"){
        drawDebateSpeech(layout, ringPoint, chipPoint, tangent, effect, alpha, beat, clock);
      } else if(effect.mode === "cycle"){
        drawElectionCycle(layout, ringPoint, effect, alpha, beat, clock);
      } else {
        drawParliamentVote(layout, ringPoint, tangent, effect, alpha, beat, clock);
      }
    }
  }

  function drawProtestSurge(layout, ringPoint, chipPoint, outward, tangent, effect, alpha, beat, clock){
    ctx.save();
    ctx.lineCap = "round";
    const waves = layout.mobile ? 3 : 4;
    for(let i = 0; i < waves; i++){
      const travel = state.reducedMotion ? i / waves : (clock * .9 + i / waves + effect.phase) % 1;
      const x = lerp(chipPoint.x, ringPoint.x, travel);
      const y = lerp(chipPoint.y, ringPoint.y, travel);
      const span = (layout.mobile ? 12 : 18) + travel * (layout.mobile ? 16 : 26);
      ctx.globalAlpha = alpha * (1 - travel) * .56;
      ctx.strokeStyle = colorToRgba(effect.color, .82);
      ctx.lineWidth = layout.mobile ? 2.2 : 3.1;
      ctx.beginPath();
      ctx.moveTo(x - tangent.x * span, y - tangent.y * span);
      ctx.lineTo(x + tangent.x * span, y + tangent.y * span);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha * (.36 + beat * .28);
    ctx.strokeStyle = colorToRgba(effect.accent, .72);
    ctx.lineWidth = layout.mobile ? 2.8 : 3.8;
    ctx.beginPath();
    ctx.arc(ringPoint.x, ringPoint.y, layout.mobile ? 15 + beat * 7 : 20 + beat * 10, Math.atan2(outward.y, outward.x) - .78, Math.atan2(outward.y, outward.x) + .78);
    ctx.stroke();

    ctx.globalAlpha = alpha * (.22 + beat * .18);
    ctx.fillStyle = colorToRgba(effect.color, .34);
    ctx.beginPath();
    ctx.arc(chipPoint.x, chipPoint.y, layout.mobile ? 13 + beat * 6 : 18 + beat * 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawNgoBridge(layout, ringPoint, chipPoint, outward, tangent, effect, alpha, beat, clock){
    ctx.save();
    ctx.lineCap = "round";
    const span = layout.mobile ? 34 : 52;
    const inner = {
      x: ringPoint.x - outward.x * (layout.mobile ? 26 : 36),
      y: ringPoint.y - outward.y * (layout.mobile ? 26 : 36)
    };
    const top = { x: ringPoint.x + tangent.x * span, y: ringPoint.y + tangent.y * span };
    const bottom = { x: ringPoint.x - tangent.x * span, y: ringPoint.y - tangent.y * span };
    ctx.globalAlpha = alpha * .68;
    ctx.strokeStyle = colorToRgba(effect.color, .72);
    ctx.lineWidth = layout.mobile ? 2.5 : 3.5;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.quadraticCurveTo(chipPoint.x, chipPoint.y, bottom.x, bottom.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(chipPoint.x, chipPoint.y);
    ctx.quadraticCurveTo(ringPoint.x, ringPoint.y, inner.x, inner.y);
    ctx.stroke();

    for(let i = 0; i < 4; i++){
      const u = state.reducedMotion ? i / 3 : (clock * .24 + i * .25 + effect.phase) % 1;
      const pt = quadraticPoint(u, chipPoint, ringPoint, inner);
      ctx.globalAlpha = alpha * (.42 + beat * .28);
      ctx.fillStyle = i % 2 === 0 ? effect.color : effect.accent;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, layout.mobile ? 3.1 : 4.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = alpha * (.2 + beat * .18);
    ctx.strokeStyle = colorToRgba(effect.accent, .66);
    ctx.lineWidth = layout.mobile ? 1.4 : 1.8;
    ctx.beginPath();
    ctx.arc(ringPoint.x, ringPoint.y, layout.mobile ? 19 : 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawMediaScan(layout, ringPoint, chipPoint, outward, tangent, effect, alpha, beat, clock){
    ctx.save();
    const sweep = state.reducedMotion ? .5 : (clock * .55 + effect.phase) % 1;
    const span = lerp(-1, 1, sweep) * (layout.mobile ? 44 : 68);
    const scanA = {
      x: chipPoint.x + tangent.x * span,
      y: chipPoint.y + tangent.y * span
    };
    ctx.globalAlpha = alpha * .26;
    ctx.fillStyle = colorToRgba(effect.color, .36);
    ctx.beginPath();
    ctx.moveTo(scanA.x, scanA.y);
    ctx.lineTo(ringPoint.x + tangent.x * (layout.mobile ? 18 : 28), ringPoint.y + tangent.y * (layout.mobile ? 18 : 28));
    ctx.lineTo(ringPoint.x - tangent.x * (layout.mobile ? 18 : 28), ringPoint.y - tangent.y * (layout.mobile ? 18 : 28));
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = alpha * (.35 + beat * .2);
    ctx.strokeStyle = colorToRgba(effect.accent, .72);
    ctx.lineWidth = layout.mobile ? 1.7 : 2.3;
    ctx.beginPath();
    ctx.moveTo(scanA.x - tangent.x * 10, scanA.y - tangent.y * 10);
    ctx.lineTo(scanA.x + tangent.x * 10, scanA.y + tangent.y * 10);
    ctx.stroke();
    ctx.restore();
  }

  function drawRulesBrace(layout, ringPoint, tangent, effect, alpha, beat, clock){
    ctx.save();
    const span = layout.mobile ? 26 : 38;
    const depth = layout.mobile ? 12 : 16;
    ctx.globalAlpha = alpha * (.46 + beat * .18);
    ctx.strokeStyle = colorToRgba(effect.color, .82);
    ctx.lineWidth = layout.mobile ? 2.4 : 3.2;
    for(let side = -1; side <= 1; side += 2){
      ctx.beginPath();
      ctx.moveTo(ringPoint.x + tangent.x * span * side, ringPoint.y + tangent.y * span * side);
      ctx.lineTo(ringPoint.x + tangent.x * span * side - tangent.y * depth, ringPoint.y + tangent.y * span * side + tangent.x * depth);
      ctx.lineTo(ringPoint.x + tangent.x * span * side - tangent.y * depth * 2, ringPoint.y + tangent.y * span * side + tangent.x * depth * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawExpertMeasure(layout, ringPoint, outward, tangent, effect, alpha, beat, clock){
    ctx.save();
    const tickCount = layout.mobile ? 4 : 6;
    ctx.globalAlpha = alpha * .42;
    ctx.strokeStyle = colorToRgba(effect.color, .78);
    ctx.lineWidth = layout.mobile ? 1.5 : 2;
    for(let i = 0; i < tickCount; i++){
      const step = (i - (tickCount - 1) / 2) * (layout.mobile ? 9 : 12);
      const base = {
        x: ringPoint.x + tangent.x * step,
        y: ringPoint.y + tangent.y * step
      };
      const len = (layout.mobile ? 9 : 13) + (i % 2) * 4 + beat * 4;
      ctx.beginPath();
      ctx.moveTo(base.x - outward.x * len, base.y - outward.y * len);
      ctx.lineTo(base.x + outward.x * len * .45, base.y + outward.y * len * .45);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawDebateSpeech(layout, ringPoint, chipPoint, tangent, effect, alpha, beat, clock){
    ctx.save();
    const bubbles = layout.mobile ? 3 : 5;
    for(let i = 0; i < bubbles; i++){
      const u = state.reducedMotion ? i / bubbles : (clock * .18 + i / bubbles + effect.phase) % 1;
      const pt = quadraticPoint(u, chipPoint, {
        x: lerp(chipPoint.x, ringPoint.x, .55) + tangent.x * (i % 2 === 0 ? 18 : -18),
        y: lerp(chipPoint.y, ringPoint.y, .55) + tangent.y * (i % 2 === 0 ? 18 : -18)
      }, ringPoint);
      const size = (layout.mobile ? 3 : 4) + beat * 2;
      ctx.globalAlpha = alpha * (.12 + u * .26);
      ctx.fillStyle = i % 2 === 0 ? effect.color : effect.accent;
      roundRect(ctx, pt.x - size * 1.6, pt.y - size, size * 3.2, size * 2, size, true, false);
    }
    ctx.restore();
  }

  function drawElectionCycle(layout, ringPoint, effect, alpha, beat, clock){
    ctx.save();
    const orbit = layout.mobile ? 15 : 21;
    ctx.globalAlpha = alpha * .3;
    ctx.strokeStyle = colorToRgba(effect.color, .7);
    ctx.lineWidth = layout.mobile ? 1.5 : 2;
    ctx.beginPath();
    ctx.arc(ringPoint.x, ringPoint.y, orbit, 0, Math.PI * 2);
    ctx.stroke();
    for(let i = 0; i < 3; i++){
      const angle = (state.reducedMotion ? i / 3 : clock * .9 + i * Math.PI * 2 / 3) + effect.phase * Math.PI * 2;
      ctx.globalAlpha = alpha * (.32 + beat * .18);
      ctx.fillStyle = i === 0 ? effect.accent : effect.color;
      ctx.beginPath();
      ctx.arc(ringPoint.x + Math.cos(angle) * orbit, ringPoint.y + Math.sin(angle) * orbit, layout.mobile ? 2.5 : 3.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawParliamentVote(layout, ringPoint, tangent, effect, alpha, beat, clock){
    ctx.save();
    const bars = layout.mobile ? 4 : 5;
    const gap = layout.mobile ? 5 : 7;
    for(let i = 0; i < bars; i++){
      const height = (layout.mobile ? 8 : 12) + (state.reducedMotion ? 3 : (Math.sin(clock * 4 + i) + 1) * 5);
      const x = ringPoint.x + tangent.x * ((i - (bars - 1) / 2) * gap);
      const y = ringPoint.y + tangent.y * ((i - (bars - 1) / 2) * gap);
      ctx.globalAlpha = alpha * (.26 + beat * .16);
      ctx.strokeStyle = i % 2 === 0 ? effect.color : effect.accent;
      ctx.lineWidth = layout.mobile ? 2 : 2.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - height);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAllocationStreams(layout, clock){
    const allocation = smoothstep(progressBetween(14, 17));
    const equilibrium = smoothstep(progressBetween(18, 20));
    const alpha = clamp(allocation + equilibrium * .3, 0, 1);
    if(alpha <= .01){
      return;
    }

    const { center, radius, positions } = layout;
    ctx.save();
    for(let i = 0; i < GROUPS.length; i++){
      const group = GROUPS[i];
      const pos = positions[group.id];
      const v = normalize(pos.x - center.x, pos.y - center.y);
      const start = {
        x: center.x + v.x * (radius + 6),
        y: center.y + v.y * (radius + 6)
      };
      const end = {
        x: pos.x - v.x * (layout.mobile ? 26 : 31),
        y: pos.y - v.y * (layout.mobile ? 26 : 31)
      };
      const bend = {
        x: lerp(start.x, end.x, .5) + -v.y * (layout.mobile ? 12 : 22) * (i % 2 === 0 ? 1 : -1),
        y: lerp(start.y, end.y, .5) + v.x * (layout.mobile ? 12 : 22) * (i % 2 === 0 ? 1 : -1)
      };
      const width = (layout.mobile ? 2.1 : 2.4) + group.allocation * (layout.mobile ? 2.1 : 3.3);
      ctx.globalAlpha = alpha * (.58 + equilibrium * .2);
      ctx.strokeStyle = colorToRgba(group.color, .76);
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.setLineDash(state.reducedMotion ? [] : [12, 13]);
      ctx.lineDashOffset = -clock * (24 + group.allocation * 24) - i * 9;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(bend.x, bend.y, end.x, end.y);
      ctx.stroke();

      if(!state.reducedMotion){
        const dotCount = group.allocation > 1 ? 3 : 2;
        for(let d = 0; d < dotCount; d++){
          const u = (clock * (.12 + group.allocation * .035) + d / dotCount + i * .073) % 1;
          const pt = quadraticPoint(u, start, bend, end);
          ctx.globalAlpha = alpha * .68;
          ctx.fillStyle = group.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(2.5, width * .54), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawBudgetSphere(layout, clock, dynamics = getBudgetDynamics(layout, clock)){
    const { radius } = layout;
    const center = dynamics.center;
    const sphereLayout = { ...layout, center };
    const claimDrain = smoothstep(progressBetween(6, 9.4)) * (1 - smoothstep(progressBetween(13.8, 15.4))) * .31;
    const processReturn = smoothstep(progressBetween(10, 14)) * .11;
    const fillProgress = clamp(
      smoothstep(progressBetween(0, 3)) * (1 - .08 * smoothstep(progressBetween(6, 10))) +
      .92 * smoothstep(progressBetween(3, 4)) -
      claimDrain +
      processReturn,
      0,
      1
    );
    const equilibrium = dynamics.equilibrium;
    const stress = dynamics.stress;
    const pulse = dynamics.pulse;
    const points = createBudgetBlob(sphereLayout, stress, clock, radius * (1 + pulse), dynamics);

    ctx.save();
    ctx.globalAlpha = .28 + fillProgress * .42 + equilibrium * .1;
    drawBlobPath(points);
    ctx.fillStyle = colorToRgba("#256fbd", .18);
    ctx.fill();

    for(let i = 0; i < 3; i++){
      ctx.globalAlpha = (.12 - i * .026) * (1 + equilibrium * .5);
      ctx.lineWidth = 10 + i * 12;
      ctx.strokeStyle = i === 1 ? colorToRgba("#1f8f70", .26) : colorToRgba("#256fbd", .3);
      drawBlobPath(points);
      ctx.stroke();
    }

    ctx.save();
    drawBlobPath(points);
    ctx.clip();
    const bounds = getPointBounds(points);
    const body = ctx.createLinearGradient(bounds.left, bounds.top, bounds.right, bounds.bottom);
    body.addColorStop(0, "#79bdec");
    body.addColorStop(.5, "#2f86c9");
    body.addColorStop(1, "#1f8f70");
    ctx.fillStyle = body;
    ctx.globalAlpha = .9 + fillProgress * .08;
    drawBlobPath(points);
    ctx.fill();

    const fillExtent = Math.max(radius * 2.85, (bounds.right - bounds.left) * .82);
    const fillY = lerp(bounds.bottom + radius * .1, bounds.top - radius * .08, fillProgress);
    const waveAmp = state.reducedMotion ? 0 : (4.2 + stress * 8.5);
    const liquidBottom = bounds.bottom + radius * .34;
    ctx.beginPath();
    ctx.moveTo(center.x - fillExtent, liquidBottom);
    ctx.lineTo(center.x - fillExtent, fillY);
    const steps = 22;
    for(let i = 0; i <= steps; i++){
      const x = center.x - fillExtent + (fillExtent * 2 * i / steps);
      const y = fillY + Math.sin(i * .9 + clock * 3.2) * waveAmp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(center.x + fillExtent, liquidBottom);
    ctx.closePath();
    const liquid = ctx.createLinearGradient(center.x, fillY, center.x, center.y + radius);
    liquid.addColorStop(0, "#5eabe3");
    liquid.addColorStop(.54, "#2f86c9");
    liquid.addColorStop(1, "#1f8f70");
    ctx.fillStyle = liquid;
    ctx.globalAlpha = .42 + fillProgress * .24;
    ctx.fill();

    if(stress > .03){
      drawBudgetTurbulence(center, radius, stress, clock, layout.mobile);
    }

    ctx.globalAlpha = .18;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(center.x - radius * .28, center.y - radius * .36, radius * .46, radius * .18, -.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.2 + stress * 2.1;
    ctx.strokeStyle = colorToRgba(stress > .35 ? "#d6654f" : "#256fbd", .58);
    drawBlobPath(points);
    ctx.stroke();

    if(stress > .04){
      drawBudgetWarningContour(sphereLayout, points, stress, clock);
    }

    if((dynamics.tear || 0) > .04){
      drawBudgetTearMarks(sphereLayout, points, radius, dynamics.tear, clock);
    }

    const finiteAlpha = smoothstep(progressBetween(3, 6)) * (1 - smoothstep(progressBetween(14, 16)));
    if(finiteAlpha > .02){
      ctx.globalAlpha = finiteAlpha * .85;
      ctx.setLineDash([5, 7]);
      ctx.lineDashOffset = state.reducedMotion ? 0 : -clock * 18;
      ctx.strokeStyle = colorToRgba("#1b415f", .42);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 1.12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = .96;
    ctx.font = `900 ${layout.mobile ? 12 : 15}px ${fontStack()}`;
    ctx.fillText("Shared", center.x, center.y - (layout.mobile ? 7 : 9));
    ctx.font = `900 ${layout.mobile ? 12 : 15}px ${fontStack()}`;
    ctx.fillText("public budget", center.x, center.y + (layout.mobile ? 9 : 11));
    ctx.restore();
  }

  function drawBudgetTurbulence(center, radius, stress, clock, mobile){
    ctx.save();
    ctx.lineCap = "round";
    const bands = mobile ? 5 : 7;
    for(let i = 0; i < bands; i++){
      const offset = lerp(-radius * .56, radius * .56, i / Math.max(1, bands - 1));
      const wave = state.reducedMotion ? 0 : Math.sin(clock * (3.8 + i * .3) + i * 1.7) * radius * .11 * stress;
      const y = center.y + offset + wave;
      const left = center.x - radius * (.82 - i * .018);
      const right = center.x + radius * (.82 - i * .018);
      const cp1 = {
        x: center.x - radius * .38,
        y: y + Math.sin(clock * 4.7 + i) * radius * .2 * stress
      };
      const cp2 = {
        x: center.x + radius * .36,
        y: y - Math.cos(clock * 4.2 + i) * radius * .2 * stress
      };

      ctx.globalAlpha = stress * (i % 2 === 0 ? .26 : .16);
      ctx.strokeStyle = i % 2 === 0 ? "#ffffff" : "#d6654f";
      ctx.lineWidth = mobile ? 1.7 : 2.2;
      ctx.setLineDash(state.reducedMotion ? [] : [7, 10]);
      ctx.lineDashOffset = -clock * (22 + i * 5);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, right, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    if(!state.reducedMotion){
      for(let i = 0; i < 14; i++){
        const angle = clock * (1.1 + i * .015) + i * 2.18;
        const orbit = radius * (.22 + .54 * rand(i + 901));
        const x = center.x + Math.cos(angle) * orbit;
        const y = center.y + Math.sin(angle * 1.23) * orbit * .72;
      ctx.globalAlpha = stress * (.16 + .22 * rand(i + 931));
        ctx.fillStyle = i % 3 === 0 ? "#d6654f" : "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, 1.6 + rand(i + 955) * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawBudgetWarningContour(layout, points, stress, clock){
    const { center, positions, mobile } = layout;
    ctx.save();
    ctx.lineCap = "round";
    ctx.globalAlpha = stress * .55;
    ctx.strokeStyle = colorToRgba("#d6654f", .84);
    ctx.lineWidth = mobile ? 1.6 : 2.1;
    ctx.setLineDash(state.reducedMotion ? [] : [10, 8]);
    ctx.lineDashOffset = state.reducedMotion ? 0 : -clock * 38;
    drawBlobPath(points);
    ctx.stroke();
    ctx.setLineDash([]);

    for(let i = 0; i < GROUPS.length; i++){
      const group = GROUPS[i];
      const pos = positions[group.id];
      const v = normalize(pos.x - center.x, pos.y - center.y);
      const angle = Math.atan2(v.y, v.x);
      const spokeRadius = Math.max(36, Math.hypot(points[0].x - center.x, points[0].y - center.y));
      const start = {
        x: center.x + Math.cos(angle - .045) * spokeRadius,
        y: center.y + Math.sin(angle - .045) * spokeRadius
      };
      const end = {
        x: center.x + Math.cos(angle + .045) * spokeRadius,
        y: center.y + Math.sin(angle + .045) * spokeRadius
      };
      ctx.globalAlpha = stress * (.22 + group.tension * .08);
      ctx.strokeStyle = colorToRgba(group.color, .88);
      ctx.lineWidth = mobile ? 2.2 : 3;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBudgetTearMarks(layout, points, radius, tear, clock){
    const { center, positions, mobile } = layout;
    ctx.save();
    drawBlobPath(points);
    ctx.clip();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for(let i = 0; i < GROUPS.length; i++){
      const group = GROUPS[i];
      const pos = positions[group.id];
      const v = normalize(pos.x - center.x, pos.y - center.y);
      const perp = { x: -v.y, y: v.x };
      const pulse = state.reducedMotion ? 1 : .72 + .28 * Math.sin(clock * (5.6 + group.tension * .4) + i * 1.27);
      const start = {
        x: center.x + v.x * radius * (.15 + group.tension * .035),
        y: center.y + v.y * radius * (.15 + group.tension * .035)
      };
      const end = {
        x: center.x + v.x * radius * (.98 + tear * .28 * pulse),
        y: center.y + v.y * radius * (.98 + tear * .28 * pulse)
      };
      const bend = {
        x: lerp(start.x, end.x, .58) + perp.x * Math.sin(clock * 4.2 + i) * radius * .18 * tear,
        y: lerp(start.y, end.y, .58) + perp.y * Math.sin(clock * 4.2 + i) * radius * .18 * tear
      };

      ctx.globalAlpha = tear * (.22 + group.tension * .075) * pulse;
      ctx.strokeStyle = colorToRgba(group.color, .9);
      ctx.lineWidth = mobile ? 2.5 : 3.4;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(bend.x, bend.y, end.x, end.y);
      ctx.stroke();

      ctx.globalAlpha = tear * .28 * pulse;
      ctx.strokeStyle = "rgba(255,255,255,.88)";
      ctx.lineWidth = mobile ? .9 : 1.2;
      ctx.setLineDash(state.reducedMotion ? [] : [4, 7]);
      ctx.lineDashOffset = state.reducedMotion ? 0 : -clock * 28 - i * 3;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(bend.x, bend.y, end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  function createBudgetBlob(layout, stress, clock, baseRadius, dynamics){
    const { center, positions } = layout;
    const points = [];
    const count = 96;
    const tear = dynamics?.tear || 0;
    const tug = dynamics?.tug || 0;
    const residual = dynamics?.residualInstability || 0;
    for(let i = 0; i < count; i++){
      const angle = i / count * Math.PI * 2;
      let r = baseRadius;
      if(stress > .01){
        for(let g = 0; g < GROUPS.length; g++){
          const group = GROUPS[g];
          const pos = positions[group.id];
          const dir = Math.atan2(pos.y - center.y, pos.x - center.x);
          const influence = Math.pow(Math.max(0, Math.cos(angle - dir)), 4);
          const hardGrip = Math.pow(Math.max(0, Math.cos(angle - dir)), 10);
          const crossFight = Math.sin((angle - dir) * 5 + clock * (5.5 + g * .21));
          const ripple = state.reducedMotion ? 1 : .84 + .16 * Math.sin(clock * 6.8 + g * 1.3);
          const yank = state.reducedMotion ? 1 : .78 + .22 * Math.sin(clock * (5.4 + group.tension * .7) + g * 1.1);
          r += baseRadius * (.52 + tear * .24) * stress * group.tension * influence * ripple;
          r += baseRadius * .26 * tug * group.tension * hardGrip * yank;
          r += baseRadius * (.05 + tear * .05) * stress * crossFight * Math.pow(Math.max(0, Math.cos(angle - dir)), 2);
        }
      }
      r -= state.reducedMotion ? 0 : Math.pow(Math.max(0, Math.sin(angle * 8 + clock * 2.2)), 5) * baseRadius * .065 * tear;
      r += (state.reducedMotion ? 0 : Math.sin(angle * 7 + clock * 4.3) * baseRadius * (.045 + tear * .035) * stress);
      r += (state.reducedMotion ? 0 : Math.sin(angle * 13 - clock * 6.2) * baseRadius * (.024 + tear * .03) * stress);
      if(residual > .001){
        const slowOrganic =
          Math.sin(angle * 3 + clock * .46) * .58 +
          Math.sin(angle * 5 - clock * .31 + .8) * .3 +
          Math.cos(angle * 2 + clock * .24) * .22;
        r += baseRadius * residual * slowOrganic;
      }
      points.push({
        x: center.x + Math.cos(angle) * r,
        y: center.y + Math.sin(angle) * r
      });
    }
    return points;
  }

  function drawBlobPath(points){
    if(!points.length){
      return;
    }
    ctx.beginPath();
    for(let i = 0; i < points.length; i++){
      const current = points[i];
      const next = points[(i + 1) % points.length];
      const mx = (current.x + next.x) / 2;
      const my = (current.y + next.y) / 2;
      if(i === 0){
        ctx.moveTo(mx, my);
      } else {
        ctx.quadraticCurveTo(current.x, current.y, mx, my);
      }
    }
    const first = points[0];
    const second = points[1];
    ctx.quadraticCurveTo(first.x, first.y, (first.x + second.x) / 2, (first.y + second.y) / 2);
    ctx.closePath();
  }

  function getPointBounds(points){
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for(const point of points){
      left = Math.min(left, point.x);
      top = Math.min(top, point.y);
      right = Math.max(right, point.x);
      bottom = Math.max(bottom, point.y);
    }
    return { left, top, right, bottom };
  }

  function drawGroups(layout, clock, dynamics){
    const appearAll = smoothstep(progressBetween(3, 6));
    if(appearAll <= .01){
      return;
    }

    for(let i = 0; i < GROUPS.length; i++){
      const group = GROUPS[i];
      const stagger = smoothstep((state.time - 3 - i * .2) / .8);
      const settle = smoothstep(progressBetween(14, 18));
      const alpha = clamp(appearAll * stagger, 0, 1);
      const pos = layout.positions[group.id];
      const bob = state.reducedMotion ? 0 : Math.sin(clock * 1.7 + i) * (1.6 - settle * 1.1);
      const renderState = getGroupRenderState(group, pos.x, pos.y + bob, layout, dynamics);
      drawGroupNode(group, renderState, alpha, layout, dynamics, clock, i);
    }
  }

  function getGroupRenderState(group, x, y, layout, dynamics){
    const mobile = layout.mobile;
    const needFocus = smoothstep(progressBetween(3, 7.2)) * (1 - smoothstep(progressBetween(9.8, 12.2)));
    const conflict = smoothstep(progressBetween(6, 8.4)) * (1 - smoothstep(progressBetween(10.8, 12.5)));
    const processFocus = smoothstep(progressBetween(10, 14));
    const settlement = smoothstep(progressBetween(14, 18));
    const budgetFight = clamp((dynamics?.tear || 0) * .86 + (dynamics?.stress || 0) * .54 + (dynamics?.tug || 0) * .34, 0, 1);
    const visualConflict = clamp(Math.max(conflict, budgetFight), 0, 1);
    const visualCalm = clamp((processFocus * .28 + settlement * .72 + (dynamics?.allocation || 0) * .22) * (1 - budgetFight * .82), 0, 1);
    const budgetCenter = dynamics?.center || layout.center;
    const toBudget = normalize(budgetCenter.x - x, budgetCenter.y - y);
    const tangent = { x: -toBudget.y, y: toBudget.x };
    const syncStress = (dynamics?.stress || 0) * group.tension * (1 - settlement * .62);
    const syncBeat = dynamics?.syncBeat ?? .5;
    const syncWave = dynamics?.syncWave || 0;
    const grabIn = syncStress * (mobile ? 2.2 : 3.7) * (.36 + syncBeat * .32);
    const pullBack = (dynamics?.tug || 0) * group.tension * (1 - processFocus * .4) * (1 - settlement * .72) * (mobile ? 7.4 : 12.2) * (.38 + syncBeat * .72);
    const syncShear = state.reducedMotion ? 0 : syncStress * (mobile ? 2.6 : 4.4) * (dynamics?.conflictWave || 0);
    x += toBudget.x * grabIn - toBudget.x * pullBack + tangent.x * syncShear;
    y += toBudget.y * grabIn - toBudget.y * pullBack + tangent.y * syncShear;

    const baseRx = mobile ? 29 : 38;
    const baseRy = mobile ? 22 : 28;
    const syncSwell = syncStress * (.38 + syncBeat * .62);
    const fightingSwell = visualConflict * group.tension * (mobile ? 2.8 : 4.5) * (1 - visualCalm * .7);
    const rx = baseRx + needFocus * (mobile ? 18 : 28) + syncSwell * (mobile ? 5.5 : 8.5) + fightingSwell - visualCalm * (mobile ? 4 : 7);
    const ry = baseRy + needFocus * (mobile ? 12 : 18) + syncSwell * (mobile ? 3.8 : 6.2) + fightingSwell * .72 - visualCalm * (mobile ? 3 : 5);

    return {
      x,
      y,
      rx,
      ry,
      needFocus,
      conflict,
      processFocus,
      visualConflict,
      visualCalm,
      budgetFight,
      settlement,
      syncStress,
      syncBeat,
      syncWave,
      budgetCenter
    };
  }

  function drawGroupNode(group, renderState, alpha, layout, dynamics, clock, groupIndex){
    const mobile = layout.mobile;
    const {
      x,
      y,
      rx,
      ry,
      needFocus,
      conflict,
      processFocus,
      visualConflict,
      visualCalm,
      syncStress,
      syncBeat,
      syncWave,
      budgetCenter
    } = renderState;
    const labelFont = mobile ? 9.5 : 11.5;
    const demandFont = mobile ? 7.6 : 9.3;
    const claimActive = clamp(
      smoothstep(progressBetween(6, 8.2)) * (1 - smoothstep(progressBetween(10.4, 12.4))) +
      visualConflict * .78,
      0,
      1
    );
    const subgroupTugs = getSubgroupTugPoints(group, { x, y }, layout, needFocus, visualConflict, clock, groupIndex);
    ctx.save();
    ctx.globalAlpha = alpha;

    if(claimActive > .03 || processFocus > .04){
      const haloPulse = state.reducedMotion ? 1 : clamp(1 + syncStress * (syncWave * .12 + (dynamics?.conflictWave || 0) * .04), .84, 1.18);
      ctx.globalAlpha = alpha * (claimActive * .34 + processFocus * .2);
      ctx.strokeStyle = colorToRgba(group.color, .88);
      ctx.lineWidth = mobile ? 1.8 : 2.2;
      ctx.beginPath();
      ctx.ellipse(x, y, (rx + (mobile ? 7 : 10)) * haloPulse, (ry + (mobile ? 6 : 9)) * haloPulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha * (claimActive * .14 + processFocus * .08);
      ctx.fillStyle = group.color;
      ctx.beginPath();
      ctx.ellipse(x, y, rx + (mobile ? 12 : 17), ry + (mobile ? 10 : 14), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
    }

    const bubblePoints = createGroupBubblePoints(x, y, rx, ry, visualConflict + needFocus * .26, visualCalm, state.time + group.tension * 13, budgetCenter, dynamics, group, subgroupTugs);
    drawGroupBubblePath(bubblePoints);
    const body = ctx.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
    body.addColorStop(0, colorToRgba("#ffffff", .86));
    body.addColorStop(.28, colorToRgba(group.color, .34 + needFocus * .14));
    body.addColorStop(1, colorToRgba(group.color, .78));
    ctx.fillStyle = body;
    ctx.fill();

    if(needFocus > .08 || visualConflict > .03){
      ctx.save();
      drawGroupBubblePath(bubblePoints);
      ctx.clip();
      drawNeedPressureDroplets(group, x, y, rx, ry, needFocus, visualConflict, alpha, mobile, dynamics);
      ctx.restore();
    }

    if(subgroupTugs.some((tug) => tug.strength > .03)){
      drawInterestGroupTearMarks(group, x, y, rx, ry, bubblePoints, subgroupTugs, alpha, mobile, clock);
    }

    ctx.globalAlpha = alpha * (.76 + needFocus * .16);
    ctx.strokeStyle = visualCalm > .36 ? colorToRgba("#1f8f70", .72) : colorToRgba(group.color, .78);
    ctx.lineWidth = 1.6 + needFocus * .6 + visualConflict * .48 + visualCalm * .28;
    drawGroupBubblePath(bubblePoints);
    ctx.stroke();

    if(processFocus > .04){
      drawProcessShareArc(group, x, y, rx, ry, processFocus, alpha, mobile);
      drawProcessCorrelationMark(group, x, y, rx, ry, processFocus, layout);
    }

    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#163047";
    ctx.font = `900 ${labelFont}px ${fontStack()}`;
    ctx.fillText(group.label, x, y - (needFocus > .35 ? (mobile ? 5 : 7) : 0), rx * 1.72);

    if(needFocus > .12){
      ctx.globalAlpha = alpha * smoothstep((needFocus - .08) / .4);
      ctx.fillStyle = colorToRgba("#163047", .76);
      ctx.font = `800 ${demandFont}px ${fontStack()}`;
      const demand = mobile && group.demand.length > 15 ? shortDemand(group.demand) : group.demand;
      ctx.fillText(demand, x, y + (mobile ? 10 : 12), rx * 1.62);
    }
    ctx.restore();
  }

  function drawNeedPressureDroplets(group, x, y, rx, ry, needFocus, conflict, alpha, mobile, dynamics){
    const strength = clamp(needFocus * .72 + conflict * .48 + (dynamics?.stress || 0) * .42, 0, 1);
    if(strength <= .03){
      return;
    }

    const count = mobile ? 5 : 7;
    const speed = state.reducedMotion ? 0 : state.time * (.48 + group.tension * .18) + (dynamics?.syncWave || 0) * .38;
    ctx.save();

    for(let i = 0; i < count; i++){
      const turn = speed + i * 2.06 + group.tension * 4.1;
      const depth = .18 + (i % 4) * .11;
      const px = x + Math.cos(turn) * rx * depth + Math.sin(turn * 1.7) * rx * .06 * conflict;
      const py = y + Math.sin(turn * 1.18) * ry * (depth + .05);
      const r = (mobile ? 2.5 : 3.3) + (i % 3) * (mobile ? .7 : .9) + strength * (mobile ? .8 : 1.2);
      const pulse = state.reducedMotion ? 1 : .8 + .2 * Math.sin(state.time * 5.2 + i + (dynamics?.syncBeat || .5) * Math.PI);
      const dot = ctx.createRadialGradient(px - r * .35, py - r * .35, 0, px, py, r * 1.55);
      dot.addColorStop(0, "rgba(255,255,255,.9)");
      dot.addColorStop(.42, colorToRgba(group.color, .28 + strength * .16));
      dot.addColorStop(1, colorToRgba(group.color, .05));
      ctx.globalAlpha = alpha * strength * (.52 + conflict * .16) * pulse;
      ctx.fillStyle = dot;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = alpha * strength * .12;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = mobile ? 1 : 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * (.42 + conflict * .12), ry * (.38 + conflict * .12), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawInterestGroupTearMarks(group, x, y, rx, ry, bubblePoints, subgroupTugs, alpha, mobile, clock){
    ctx.save();
    drawGroupBubblePath(bubblePoints);
    ctx.clip();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for(let i = 0; i < subgroupTugs.length; i++){
      const tug = subgroupTugs[i];
      if(tug.strength <= .03){
        continue;
      }
      const v = normalize(tug.x - x, tug.y - y);
      const perp = { x: -v.y, y: v.x };
      const pulse = state.reducedMotion ? 1 : .72 + .28 * Math.sin(clock * (4.7 + i * .2) + i * 1.6);
      const start = {
        x: x + v.x * rx * .18,
        y: y + v.y * ry * .18
      };
      const end = {
        x: x + v.x * rx * (.82 + tug.strength * .22 * pulse),
        y: y + v.y * ry * (.82 + tug.strength * .22 * pulse)
      };
      const bend = {
        x: lerp(start.x, end.x, .62) + perp.x * rx * .08 * tug.strength * Math.sin(clock * 4.2 + i),
        y: lerp(start.y, end.y, .62) + perp.y * ry * .08 * tug.strength * Math.sin(clock * 4.2 + i)
      };

      ctx.globalAlpha = alpha * tug.strength * .34 * pulse;
      ctx.strokeStyle = colorToRgba(group.color, .86);
      ctx.lineWidth = mobile ? 1.3 : 1.8;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(bend.x, bend.y, end.x, end.y);
      ctx.stroke();

      ctx.globalAlpha = alpha * tug.strength * .2 * pulse;
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.lineWidth = mobile ? .75 : 1;
      ctx.setLineDash(state.reducedMotion ? [] : [3, 5]);
      ctx.lineDashOffset = state.reducedMotion ? 0 : -clock * 24 - i * 4;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(bend.x, bend.y, end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  function drawProcessShareArc(group, x, y, rx, ry, processFocus, alpha, mobile){
    const amount = clamp(group.allocation / 1.28, .35, .98);
    const arcAlpha = alpha * smoothstep((processFocus - .04) / .55);
    const start = -Math.PI * .62 + group.tension * .28;
    const span = Math.PI * 1.55 * amount;
    const end = start + span;
    const ringRx = rx + (mobile ? 8 : 11);
    const ringRy = ry + (mobile ? 7 : 10);
    const beadX = x + Math.cos(end) * ringRx;
    const beadY = y + Math.sin(end) * ringRy;

    ctx.save();
    ctx.globalAlpha = arcAlpha * .8;
    ctx.strokeStyle = colorToRgba("#1f8f70", .78);
    ctx.lineWidth = mobile ? 2 : 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.ellipse(x, y, ringRx, ringRy, 0, start, end);
    ctx.stroke();

    ctx.globalAlpha = arcAlpha;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = colorToRgba("#1f8f70", .82);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(beadX, beadY, mobile ? 3.3 : 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function shortDemand(text){
    if(text === "Long-term protection") return "Long-term care";
    if(text === "Jobs and investment") return "Jobs";
    if(text === "Services nearby") return "Nearby services";
    if(text === "Income security") return "Security";
    if(text === "Reliable roads") return "Roads";
    return text;
  }

  function createGroupBubblePoints(x, y, rx, ry, intensity, processFocus, seed, budgetCenter, dynamics, group, subgroupTugs = []){
    const count = 56;
    const points = [];
    const calm = processFocus * .46 + (dynamics?.allocation || 0) * .26;
    const pullAngle = Math.atan2((budgetCenter?.y || y) - y, (budgetCenter?.x || x) - x);
    const syncStretch = (dynamics?.stress || 0) * (group?.tension || 1) * (1 - clamp(calm, 0, .78));
    const syncPulse = .82 + (dynamics?.syncBeat ?? .5) * .36;
    for(let i = 0; i < count; i++){
      const angle = i / count * Math.PI * 2;
      const wave =
        Math.sin(angle * 3 + seed * 1.3) * .06 +
        Math.sin(angle * 7 - seed * 1.7) * .035;
      const organic = state.reducedMotion ? 0 : wave * intensity * (1 - calm);
      const facingBudget = Math.pow(Math.max(0, Math.cos(angle - pullAngle)), 4);
      const awayFromBudget = Math.pow(Math.max(0, Math.cos(angle - pullAngle - Math.PI)), 3);
      const syncedPull = facingBudget * syncStretch * (.08 + syncPulse * .06) - awayFromBudget * syncStretch * .035;
      let subgroupPull = 0;
      let subgroupPinch = 0;
      for(let t = 0; t < subgroupTugs.length; t++){
        const tug = subgroupTugs[t];
        if(tug.strength <= .03){
          continue;
        }
        const dir = Math.atan2(tug.y - y, tug.x - x);
        const facingSubgroup = Math.pow(Math.max(0, Math.cos(angle - dir)), 8);
        const besideSubgroup = Math.pow(Math.max(0, Math.cos(angle - dir + Math.PI / 2)), 6);
        const localBeat = state.reducedMotion ? 1 : .8 + .2 * Math.sin(seed * .8 + t * 1.9);
        subgroupPull += facingSubgroup * tug.strength * (.055 + localBeat * .035);
        subgroupPinch += besideSubgroup * tug.strength * .018;
      }
      const rScale = 1 + organic + syncedPull + subgroupPull - subgroupPinch;
      points.push({
        x: x + Math.cos(angle) * rx * rScale,
        y: y + Math.sin(angle) * ry * rScale
      });
    }
    return points;
  }

  function drawGroupBubblePath(points){
    if(!points.length){
      return;
    }
    ctx.beginPath();
    for(let i = 0; i < points.length; i++){
      const current = points[i];
      const next = points[(i + 1) % points.length];
      const mx = (current.x + next.x) / 2;
      const my = (current.y + next.y) / 2;
      if(i === 0){
        ctx.moveTo(mx, my);
      } else {
        ctx.quadraticCurveTo(current.x, current.y, mx, my);
      }
    }
    const first = points[0];
    const second = points[1];
    ctx.quadraticCurveTo(first.x, first.y, (first.x + second.x) / 2, (first.y + second.y) / 2);
    ctx.closePath();
  }

  function drawProcessCorrelationMark(group, x, y, rx, ry, processFocus, layout){
    const v = normalize(layout.center.x - x, layout.center.y - y);
    const anchor = {
      x: x + v.x * rx * .94,
      y: y + v.y * ry * .94
    };
    const ring = {
      x: layout.center.x - v.x * layout.ringRadius,
      y: layout.center.y - v.y * layout.ringRadius
    };
    ctx.save();
    ctx.globalAlpha = processFocus * .42;
    ctx.strokeStyle = colorToRgba("#1f8f70", .72);
    ctx.lineWidth = layout.mobile ? 1.3 : 1.7;
    ctx.setLineDash(state.reducedMotion ? [] : [5, 7]);
    ctx.lineDashOffset = -state.time * 22;
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.quadraticCurveTo(lerp(anchor.x, ring.x, .48), lerp(anchor.y, ring.y, .48), ring.x, ring.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = processFocus * .76;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = colorToRgba("#1f8f70", .74);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, layout.mobile ? 4.2 : 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawSubgroups(layout, clock, dynamics){
    const appearAll = smoothstep(progressBetween(3.2, 5.4));
    if(appearAll <= .01){
      return;
    }

    const conflict = smoothstep(progressBetween(6, 8.2)) * (1 - smoothstep(progressBetween(12.2, 14.4)));
    const needFocus = smoothstep(progressBetween(3, 7.2)) * (1 - smoothstep(progressBetween(9.8, 12.2)));
    const settle = smoothstep(progressBetween(14, 18));
    ctx.save();
    for(let i = 0; i < GROUPS.length; i++){
      const group = GROUPS[i];
      const groupAppear = smoothstep((state.time - 3.25 - i * .08) / .72);
      const pos = layout.positions[group.id];
      const bob = state.reducedMotion ? 0 : Math.sin(clock * 1.7 + i) * (1.6 - settle * 1.1);
      const parent = getGroupRenderState(group, pos.x, pos.y + bob, layout, dynamics);
      const v = normalize(parent.x - layout.center.x, parent.y - layout.center.y);
      const alpha = appearAll * groupAppear * (.94 + conflict * .06);
      drawSubgroupCluster(group, parent, v, alpha, needFocus, parent.visualConflict, settle, clock, layout, i);
    }
    ctx.restore();
  }

  function drawSubgroupCluster(group, pos, outward, alpha, needFocus, conflict, settle, clock, layout, groupIndex){
    const chips = getSubgroupTugPoints(group, pos, layout, needFocus, conflict, clock, groupIndex, settle);
    drawSubgroupPulls(group, pos, chips, alpha, clock, layout);
    for(let i = 0; i < chips.length; i++){
      const chip = chips[i];
      drawSubgroupChip(chip.text, chip.x, chip.y, group.color, alpha * chip.alpha, layout.mobile, settle);
    }
  }

  function getSubgroupTugPoints(group, pos, layout, needFocus, conflict, clock, groupIndex, settle = 0){
    const outward = normalize(pos.x - layout.center.x, pos.y - layout.center.y);
    const chips = getSubgroupChipPositions(group, pos, outward, needFocus, conflict, clock, layout, groupIndex);
    const pull = getSubgroupPullStrength(needFocus, conflict, settle);
    for(let i = 0; i < chips.length; i++){
      chips[i].strength = pull * chips[i].alpha * (.86 + (i % 3) * .07);
    }
    return chips;
  }

  function getSubgroupPullStrength(needFocus, conflict, settle){
    return clamp((needFocus * .46 + conflict * .72) * (1 - settle * .64), 0, 1);
  }

  function getSubgroupChipPositions(group, pos, outward, needFocus, conflict, clock, layout, groupIndex){
    const mobile = layout.mobile;
    const chipPadding = mobile ? 18 : 24;
    const floorPadding = mobile ? 24 : 28;
    const nearFloor = pos.y + outward.y * (mobile ? 58 : 84) > layout.cityY - (mobile ? 34 : 42);
    const nearTop = pos.y + outward.y * (mobile ? 58 : 84) < (mobile ? 54 : 64);
    const lowerCluster = pos.y > layout.center.y + layout.radius * 1.05 && nearFloor;
    const upperCluster = pos.y < layout.center.y - layout.radius * 1.05 && nearTop;
    let clusterOutward = outward;
    let baseLift = 0;
    let distanceBoost = 0;
    if(lowerCluster){
      clusterOutward = normalize(outward.x || (pos.x < layout.center.x ? -1 : 1), mobile ? -.62 : -.56);
    } else if(upperCluster){
      const side = group.id === "healthcare" ? 1 : outward.x || (pos.x < layout.center.x ? -1 : 1);
      clusterOutward = normalize(side, mobile ? .62 : .56);
    }
    if(group.id === "pensions"){
      clusterOutward = normalize(1, mobile ? .22 : .02);
      distanceBoost = mobile ? 34 : 46;
    }
    if(group.id === "healthcare"){
      clusterOutward = normalize(1, mobile ? .2 : .14);
      baseLift = mobile ? -16 : -20;
    }
    const perpendicular = { x: -clusterOutward.y, y: clusterOutward.x };
    const visibleItems = mobile ? group.subgroups.slice(0, 2) : group.subgroups;
    const chipItems = mobile && group.subgroups.length > visibleItems.length ? [...visibleItems, "+2"] : visibleItems;
    const clusterDistance = (mobile ? 50 + needFocus * 9 + conflict * 2 : 72 + needFocus * 12 + conflict * 5) + distanceBoost;
    const spacing = group.id === "healthcare"
      ? (mobile ? 30 : 36)
      : (mobile ? 24 : 29);
    const base = {
      x: pos.x + clusterOutward.x * clusterDistance,
      y: pos.y + clusterOutward.y * clusterDistance + baseLift
    };
    const drift = state.reducedMotion ? 0 : Math.sin(clock * 1.9 + groupIndex * 1.6) * (2.2 + conflict * 3.2);
    const chips = [];

    for(let i = 0; i < chipItems.length; i++){
      const item = chipItems[i];
      const offset = i - (chipItems.length - 1) / 2;
      const pulse = state.reducedMotion ? 0 : Math.sin(clock * 3.4 + groupIndex + i * .9) * conflict * (mobile ? 2.3 : 3.4);
      const x = clamp(
        base.x + perpendicular.x * offset * spacing + clusterOutward.x * pulse + perpendicular.x * drift,
        chipPadding,
        layout.w - chipPadding
      );
      const y = clamp(
        base.y + perpendicular.y * offset * spacing + clusterOutward.y * pulse + perpendicular.y * drift,
        chipPadding,
        layout.cityY - floorPadding
      );
      chips.push({
        text: item,
        x,
        y,
        alpha: item === "+2" ? .72 : 1
      });
    }

    if(mobile && group.id === "pensions"){
      const floatX = state.reducedMotion ? 0 : Math.sin(clock * 1.45 + groupIndex) * (1.4 + conflict * 1.2);
      const floatY = state.reducedMotion ? 0 : Math.cos(clock * 1.25 + groupIndex) * (1.2 + conflict * .8);
      const stackX = clamp(pos.x + 88 + needFocus * 4, chipPadding, layout.w - chipPadding);
      const stackTop = clamp(pos.y - 84 - needFocus * 2, chipPadding, layout.cityY - floorPadding - 52);
      for(let i = 0; i < chips.length; i++){
        chips[i].x = clamp(stackX + i * 2 + floatX, chipPadding, layout.w - chipPadding);
        chips[i].y = clamp(stackTop + i * 26 + floatY, chipPadding, layout.cityY - floorPadding);
      }
    }

    if(group.id === "healthcare"){
      const minimumGap = mobile ? 22 : 25;
      for(let i = 1; i < chips.length; i++){
        chips[i].y = Math.min(
          layout.cityY - floorPadding,
          Math.max(chips[i].y, chips[i - 1].y + minimumGap)
        );
      }
    }

    return chips;
  }

  function drawSubgroupPulls(group, parent, chips, alpha, clock, layout){
    const mobile = layout.mobile;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for(let i = 0; i < chips.length; i++){
      const chip = chips[i];
      if(chip.strength <= .03){
        continue;
      }
      const v = normalize(chip.x - parent.x, chip.y - parent.y);
      const perp = { x: -v.y, y: v.x };
      const start = {
        x: parent.x + v.x * (mobile ? 25 : 34),
        y: parent.y + v.y * (mobile ? 21 : 29)
      };
      const end = {
        x: chip.x - v.x * (mobile ? 11 : 14),
        y: chip.y - v.y * (mobile ? 10 : 13)
      };
      const wobble = state.reducedMotion ? 0 : Math.sin(clock * 4.8 + i * 1.4) * chip.strength * (mobile ? 3.4 : 5.2);
      const bend = {
        x: lerp(start.x, end.x, .55) + perp.x * wobble,
        y: lerp(start.y, end.y, .55) + perp.y * wobble
      };

      ctx.globalAlpha = alpha * chip.strength * .18;
      ctx.strokeStyle = group.color;
      ctx.lineWidth = mobile ? 5.5 : 7.5;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(bend.x, bend.y, end.x, end.y);
      ctx.stroke();

      ctx.globalAlpha = alpha * chip.strength * .52;
      ctx.strokeStyle = colorToRgba(group.color, .9);
      ctx.lineWidth = mobile ? 1.8 : 2.4;
      ctx.setLineDash(state.reducedMotion ? [] : [4, 7]);
      ctx.lineDashOffset = state.reducedMotion ? 0 : -clock * (24 + i * 3);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(bend.x, bend.y, end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);

      if(!state.reducedMotion){
        const bead = quadraticPoint((clock * (.3 + i * .015) + i * .19) % 1, start, bend, end);
        ctx.globalAlpha = alpha * chip.strength * .62;
        ctx.fillStyle = i % 2 === 0 ? "#ffffff" : group.color;
        ctx.beginPath();
        ctx.arc(bead.x, bead.y, mobile ? 2.4 : 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawSubgroupChip(text, x, y, color, alpha, mobile, settle){
    const fontSize = mobile ? 8 : 9.5;
    ctx.save();
    ctx.globalAlpha = alpha * (.96 + settle * .04);
    ctx.font = `800 ${fontSize}px ${fontStack()}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    const label = mobile && text.length > 9 ? text.slice(0, 8) : text;
    const width = Math.min(ctx.measureText(label).width + (mobile ? 12 : 15), mobile ? 72 : 104);
    const height = mobile ? 18 : 21;

    ctx.fillStyle = "rgba(255,255,255,.88)";
    ctx.strokeStyle = colorToRgba(color, .22);
    roundRect(ctx, x - width / 2, y - height / 2, width, height, 6, true, true);

    ctx.fillStyle = colorToRgba(color, .82);
    ctx.beginPath();
    ctx.arc(x - width / 2 + (mobile ? 7 : 8), y, mobile ? 2.6 : 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#33495d";
    ctx.fillText(label, x + (mobile ? 4 : 5), y + .5, width - (mobile ? 16 : 19));
    ctx.restore();
  }

  function drawInstitutionChip(text, x, y, angle, alpha, mobile, layout){
    ctx.save();
    ctx.globalAlpha = alpha;
    const processActive = smoothstep(progressBetween(10, 12.2)) * (1 - smoothstep(progressBetween(14.2, 15.7)));
    const fontSize = mobile ? 9 : 10.5;
    ctx.font = `850 ${fontSize}px ${fontStack()}`;
    const width = Math.min(ctx.measureText(text).width + 15, mobile ? 96 : 126);
    const height = mobile ? 21 : 24;
    let bx = x - width / 2;
    let by = y - height / 2;
    bx = clamp(bx, 8, layout.w - width - 8);
    by = clamp(by, 8, layout.h - height - 8);
    if(processActive > .03){
      ctx.globalAlpha = alpha * processActive * .22;
      ctx.fillStyle = "#1f8f70";
      roundRect(ctx, bx - 4, by - 4, width + 8, height + 8, 9, true, false);
      ctx.globalAlpha = alpha;
    }
    ctx.fillStyle = processActive > .03 ? "rgba(245,255,251,.94)" : "rgba(255,255,255,.92)";
    ctx.strokeStyle = processActive > .03 ? colorToRgba("#1f8f70", .46) : "rgba(37,111,189,.24)";
    roundRect(ctx, bx, by, width, height, 7, true, true);
    ctx.fillStyle = angle > Math.PI * .5 && angle < Math.PI * 1.5 ? "#1f4f78" : "#233b51";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, bx + width / 2, by + height * .52, width - 8);
    ctx.restore();
  }

  function cubicPoint(t, p0, p1, p2, p3){
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    return {
      x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    };
  }

  function quadraticPoint(t, p0, p1, p2){
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
    };
  }

  function normalize(x, y){
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }

  function roundRect(context, x, y, width, height, radius, fill, stroke){
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
    if(fill){
      context.fill();
    }
    if(stroke){
      context.stroke();
    }
  }

  function colorToRgba(hex, alpha){
    const normalized = hex.replace("#", "");
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function adjustColor(hex, amount){
    const normalized = hex.replace("#", "");
    const r = clamp(parseInt(normalized.slice(0, 2), 16) + amount * 255, 0, 255);
    const g = clamp(parseInt(normalized.slice(2, 4), 16) + amount * 255, 0, 255);
    const b = clamp(parseInt(normalized.slice(4, 6), 16) + amount * 255, 0, 255);
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

  function fontStack(){
    return "Inter, ui-sans-serif, system-ui, Segoe UI, Arial, sans-serif";
  }

  function tick(now){
    if(!state.lastFrame){
      state.lastFrame = now;
    }
    const delta = Math.min(.08, (now - state.lastFrame) / 1000);
    state.lastFrame = now;

    if(state.running){
      state.time = Math.min(DURATION, state.time + delta);
      if(state.time >= DURATION){
        state.time = DURATION;
        state.running = false;
        state.completedAtClock = now / 1000;
        state.completed = true;
      }
    }

    syncUI();
    draw(now / 1000);
    requestAnimationFrame(tick);
  }

  function installEmbedMode(){
    const params = new URLSearchParams(window.location.search);
    let framed = false;
    try{
      framed = window.self !== window.top;
    } catch(_error){
      framed = true;
    }
    const embedded = framed || params.get("embed") === "1" || params.get("embedMode") === "1";
    if(embedded){
      document.documentElement.classList.add("embed-mode");
      document.body.classList.add("embed-mode");
    }
  }

  let heightPostFrame = 0;
  let lastPostedHeight = 0;

  function getDocumentHeight(){
    const body = document.body;
    const html = document.documentElement;
    const widgetRect = els.widget.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    return Math.ceil(Math.max(
      widgetRect.bottom - bodyRect.top,
      widgetRect.height,
      body.scrollHeight,
      body.offsetHeight,
      body.clientHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight,
      1
    ));
  }

  function scheduleHeightPost(force = false){
    if(heightPostFrame){
      cancelAnimationFrame(heightPostFrame);
    }
    heightPostFrame = requestAnimationFrame(() => {
      heightPostFrame = 0;
      const height = getDocumentHeight();
      if(!force && Math.abs(height - lastPostedHeight) < 2){
        return;
      }
      lastPostedHeight = height;
      if(window.parent && window.parent !== window){
        try{
          if(window.frameElement){
            window.frameElement.style.height = `${height}px`;
            window.frameElement.setAttribute("height", String(height));
          }
        } catch(_error){
          // Cross-origin parents rely on postMessage below.
        }

        try{
          window.parent.postMessage({
            type: IFRAME_RESIZE_MSG,
            id: "Sim30_Gov_Budget",
            height
          }, "*");
        } catch(_error){
          // A later scheduled report will retry if the parent is not ready yet.
        }
      }
    });
  }

  function bindEvents(){
    els.playToggle.addEventListener("click", togglePlayback);
    els.resetButton.addEventListener("click", () => {
      state.userInteracted = true;
      if(state.autoplayTimer){
        clearTimeout(state.autoplayTimer);
        state.autoplayTimer = 0;
      }
      reset({ run: false });
    });

    window.addEventListener("resize", () => {
      resizeCanvas();
      draw(performance.now() / 1000);
      scheduleHeightPost(true);
    });
    window.addEventListener("orientationchange", () => scheduleHeightPost(true), { passive: true });
    window.addEventListener("load", () => scheduleHeightPost(true), { once: true });
    window.addEventListener("pageshow", () => scheduleHeightPost(true));

    window.addEventListener("message", (event) => {
      const data = event.data;
      const type = typeof data === "string" ? data : data?.type;
      if(
        type === "simfluence-widget:measure" ||
        type === "widget:request-height" ||
        type === "widget:request-resize" ||
        type === "simfluence-widget:request-height" ||
        type === "simfluence-widget:request-resize"
      ){
        scheduleHeightPost(true);
      }
    });

    if(typeof reducedMotionQuery.addEventListener === "function"){
      reducedMotionQuery.addEventListener("change", (event) => {
        state.reducedMotion = event.matches;
        if(state.reducedMotion && !state.userInteracted){
          setRunning(false);
        }
        draw(performance.now() / 1000);
      });
    }

    if("ResizeObserver" in window){
      const observer = new ResizeObserver(() => scheduleHeightPost());
      observer.observe(els.widget);
      observer.observe(document.body);
    }

    if(document.fonts?.ready){
      document.fonts.ready.then(() => scheduleHeightPost(true)).catch(() => {});
    }
  }

  function scheduleInitialHeightReports(){
    [60, 240, 700, 1400, 2600, 4500, 8000].forEach((delay) => {
      window.setTimeout(() => scheduleHeightPost(true), delay);
    });
  }

  function startAutoplay(){
    if(state.reducedMotion){
      return;
    }
    state.autoplayTimer = window.setTimeout(() => {
      state.autoplayTimer = 0;
      if(!state.userInteracted && state.time === 0){
        setRunning(true);
      }
    }, 700);
  }

  function init(){
    installEmbedMode();
    bindEvents();
    resizeCanvas();
    syncUI(true);
    draw(performance.now() / 1000);
    startAutoplay();
    scheduleInitialHeightReports();
    requestAnimationFrame(tick);
    scheduleHeightPost(true);
  }

  init();
})();
