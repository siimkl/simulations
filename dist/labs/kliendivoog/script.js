(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const EMBED_WIDGET_ID = "sim15-customer-flow";
  const STAGE_KEYS = ["clickGate", "signupPool", "demoBridge", "purchaseEngine", "loyaltyLoop"];

  const DEFAULT_CONFIG = {
    seed: 12345,
    sim: {
      logicalWidth: 1280,
      logicalHeight: 720,
      fixedStep: 1 / 60,
      runDuration: 90,
      settleDuration: 24,
      maxParticles: 900,
      speed: 2,
      speedOptions: [0.5, 1, 2, 4, 10],
      uiUpdateInterval: 0.12,
      liveReadInterval: 4.8,
      insightInterval: 7,
      metricsEventInterval: 0.35,
    },
    funnel: {
      impressionsPerSecond: 50,
      clickRate: 0.08,
      signupRate: 0.15,
      demoRate: 0.4,
      closeRate: 0.25,
      repeatRate: 0.1,
      bridgeCapacity: 4,
      queuePatience: 6.6,
      purchaseValue: 1200,
      repeatValue: 540,
    },
    visuals: {
      particleSize: 5.8,
      pulseLife: 0.8,
      burstLife: 0.75,
      leakFadeSeconds: 3,
    },
    callbacks: {
      onStageEnter: null,
      onPurchase: null,
      onMetricsUpdate: null,
      onSummary: null,
    },
  };

  const PRESETS = {
    low: {
      label: "Low Traffic",
      funnel: {
        impressionsPerSecond: 20,
        clickRate: 0.05,
        signupRate: 0.1,
        demoRate: 0.3,
        closeRate: 0.18,
        repeatRate: 0.07,
        bridgeCapacity: 2,
      },
    },
    medium: {
      label: "Medium Traffic",
      funnel: {
        impressionsPerSecond: 50,
        clickRate: 0.08,
        signupRate: 0.15,
        demoRate: 0.4,
        closeRate: 0.25,
        repeatRate: 0.1,
        bridgeCapacity: 4,
      },
    },
    high: {
      label: "High Traffic",
      funnel: {
        impressionsPerSecond: 60,
        clickRate: 0.1,
        signupRate: 0.18,
        demoRate: 0.5,
        closeRate: 0.28,
        repeatRate: 0.14,
        bridgeCapacity: 7,
      },
    },
  };

  const PARTICLE_KIND = {
    neutral: "neutral",
    engaged: "engaged",
    buyer: "buyer",
    loyal: "loyal",
    leak: "leak",
  };

  const PARTICLE_STATE = {
    impression: "impression",
    signupPool: "signupPool",
    demoDecision: "demoDecision",
    demoQueue: "demoQueue",
    demoCross: "demoCross",
    purchase: "purchase",
    loyalty: "loyalty",
    returnArc: "returnArc",
    drop: "drop",
  };

  const qs = (root, selector) => root.querySelector(selector);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const pct = (value) => `${(value * 100).toFixed(1)}%`;
  const whole = (value) => Math.round(value).toLocaleString();
  const money = (value) => `$${Math.round(value).toLocaleString()}`;
  const ratio = (num, den) => (den > 0 ? num / den : 0);
  const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

  function deepMerge(base, override) {
    const output = { ...base };
    for (const [key, value] of Object.entries(override || {})) {
      if (value && typeof value === "object" && !Array.isArray(value) && base[key] && typeof base[key] === "object") {
        output[key] = deepMerge(base[key], value);
      } else {
        output[key] = value;
      }
    }
    return output;
  }

  function createRng(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let result = Math.imul(state ^ (state >>> 15), 1 | state);
      result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createParticle() {
    return {
      active: false,
      id: 0,
      kind: PARTICLE_KIND.neutral,
      colorKey: PARTICLE_KIND.neutral,
      state: PARTICLE_STATE.impression,
      x: 0,
      y: 0,
      prevX: 0,
      prevY: 0,
      vx: 0,
      vy: 0,
      alpha: 1,
      size: 4,
      age: 0,
      stageAge: 0,
      queueAge: 0,
      queueTag: 0,
      orbitAngle: 0,
      orbitRadius: 0,
      returnProgress: 0,
      returnBurstFired: false,
      returnStart: null,
      returnControl: null,
      seed: 0,
      decisionAt: 0,
      loyaltyLocked: false,
      persistentReturn: false,
      dropTarget: null,
      dropOrigin: null,
      dropControl: null,
    };
  }

  function createEffect(type, x, y, color, size, life) {
    return { type, x, y, color, size, life, maxLife: life };
  }

  function formatClock(current, total) {
    const now = Math.max(0, Math.floor(current));
    const end = Math.max(1, Math.floor(total));
    return `${String(Math.floor(now / 60)).padStart(2, "0")}:${String(now % 60).padStart(2, "0")} / ${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
  }

  function stageLabel(key) {
    switch (key) {
      case "clickGate":
        return "Click Gate";
      case "signupPool":
        return "Signup Pool";
      case "demoBridge":
        return "Demo Bridge";
      case "purchaseEngine":
        return "Purchase Engine";
      case "loyaltyLoop":
        return "Loyalty Loop";
      default:
        return key;
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function bezierPoint(p0, p1, p2, t) {
    const a = mix(p0, p1, t);
    const b = mix(p1, p2, t);
    return mix(a, b, t);
  }

  function cubicBezierPoint(p0, p1, p2, p3, t) {
    const a = mix(p0, p1, t);
    const b = mix(p1, p2, t);
    const c = mix(p2, p3, t);
    const d = mix(a, b, t);
    const e = mix(b, c, t);
    return mix(d, e, t);
  }

  function drawLabel(ctx, text, x, y, color) {
    ctx.fillStyle = color;
    ctx.font = '800 20px "Aptos Display", "Bahnschrift", sans-serif';
    ctx.fillText(text, x, y);
  }

  function drawSubLabel(ctx, text, x, y) {
    ctx.fillStyle = "rgba(73,102,113,0.82)";
    ctx.font = '600 13px "Aptos", "Bahnschrift", sans-serif';
    ctx.fillText(text, x, y);
  }

  function drawSoftHalo(ctx, x, y, rx, ry, stops) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const gradient = ctx.createRadialGradient(0, 0, 0.04, 0, 0, 1);
    for (const [offset, color] of stops) {
      gradient.addColorStop(offset, color);
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawStageBadge(ctx, { x, y, width = 188, title, subtitle, index, accentStart, accentEnd }) {
    const height = subtitle ? 58 : 44;
    ctx.save();
    const fill = ctx.createLinearGradient(x, y, x, y + height);
    fill.addColorStop(0, "rgba(255,255,255,0.97)");
    fill.addColorStop(1, "rgba(244,249,250,0.9)");
    ctx.shadowColor = "rgba(102,127,138,0.14)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 10;
    roundRect(ctx, x, y, width, height, 18);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "rgba(108,144,156,0.14)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const accent = ctx.createLinearGradient(x + 10, y + 10, x + 38, y + 36);
    accent.addColorStop(0, accentStart);
    accent.addColorStop(1, accentEnd || accentStart);
    roundRect(ctx, x + 10, y + 10, 28, 28, 14);
    ctx.fillStyle = accent;
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = '800 12px "Aptos", "Bahnschrift", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index).padStart(2, "0"), x + 24, y + 24);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#163540";
    ctx.font = '800 18px "Aptos Display", "Bahnschrift", sans-serif';
    ctx.fillText(title, x + 48, y + 27);
    if (subtitle) {
      ctx.fillStyle = "rgba(82,108,118,0.88)";
      ctx.font = '600 12px "Aptos", "Bahnschrift", sans-serif';
      ctx.fillText(subtitle, x + 48, y + 45);
    }
    ctx.restore();
  }

  function quadraticTangent(p0, p1, p2, t) {
    return {
      x: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
      y: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
    };
  }

  function cubicBezierTangent(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return {
      x:
        3 * mt * mt * (p1.x - p0.x) +
        6 * mt * t * (p2.x - p1.x) +
        3 * t * t * (p3.x - p2.x),
      y:
        3 * mt * mt * (p1.y - p0.y) +
        6 * mt * t * (p2.y - p1.y) +
        3 * t * t * (p3.y - p2.y),
    };
  }

  function drawCapsule(ctx, x, y, length, height, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    roundRect(ctx, -length * 0.5, -height * 0.5, length, height, height * 0.5);
    ctx.restore();
  }

  function drawGuideStem(ctx, start, control, end, color) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 8]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  class CustomerFlowEngine extends EventTarget {
    constructor(root, config = {}) {
      super();
      this.root = root;
      this.config = deepMerge(DEFAULT_CONFIG, config);
      this.settings = { ...this.config.funnel };
      this.callbacks = this.config.callbacks;
      this.dom = this.getDom();
      this.geometry = this.createGeometry();
      this.metrics = this.createMetrics();
      this.calibration = this.createCalibration();
      this.queue = [];
      this.effects = [];
      this.particles = Array.from({ length: this.config.sim.maxParticles }, createParticle);
      this.particleCursor = 0;

      this.state = {
        currentPreset: "medium",
        running: true,
        speed: this.config.sim.speed,
        seed: this.config.seed,
        simTime: 0,
        lastFrameTime: 0,
        accumulator: 0,
        spawnAccumulator: 0,
        bridgeTokens: 0,
        nextParticleId: 1,
        nextQueueTag: 1,
        activeCount: 0,
        uiElapsed: 0,
        liveReadIndex: 0,
        liveReadElapsed: 0,
        insightElapsed: 0,
        metricsElapsed: 0,
        peakQueue: 0,
        summaryVisible: false,
        accessibilityBucket: -1,
      };
      this.liveReadSlides = [];
      this.liveReadSwapTimer = null;

      this.backgroundCtx = this.dom.bgCanvas.getContext("2d");
      this.fxCtx = this.dom.fxCanvas.getContext("2d");
      this.sprites = this.buildSprites();
      this.rng = createRng(this.state.seed);
      this.embedHeightRafId = 0;
      this.lastEmbedHeight = 0;
      this.embedHeightForceDispatch = false;
      this.embedHeightForceDispatchesRemaining = 0;
      this.handleFrame = (ts) => this.frame(ts);
      this.handleResize = () => this.resize();
      this.handleMessage = (event) => this.onMessage(event);
      this.handleObservedResize = () => this.resize();
      this.handleEmbedHeightLoad = () => this.syncEmbedHeight(true);
      this.handleEmbedHeightPageShow = () => this.syncEmbedHeight(true);
      this.handleReadyStateChange = () => this.syncEmbedHeight(true);

      this.installEmbedMode();
      this.bindUi();
      this.resize();
      this.syncControlValues();
      this.updateTargetLabels();
      this.updateUi(true);
      this.updateInsight();
      this.updateRunButtons();

      if ("ResizeObserver" in window) {
        this.resizeObserver = new ResizeObserver(this.handleObservedResize);
        this.resizeObserver.observe(this.dom.shell);
        this.resizeObserver.observe(this.root);
      }

      if (this.embedded) {
        this.embedHeightForceDispatchesRemaining = 8;
        window.addEventListener("load", this.handleEmbedHeightLoad);
        window.addEventListener("pageshow", this.handleEmbedHeightPageShow);
        document.addEventListener("readystatechange", this.handleReadyStateChange);

        if ("MutationObserver" in window) {
          this.embedMutationObserver = new MutationObserver(() => this.syncEmbedHeight(true));
          this.embedMutationObserver.observe(this.root, {
            childList: true,
            subtree: true,
            attributes: true,
          });
        }

        if (document.fonts && typeof document.fonts.ready?.then === "function") {
          document.fonts.ready.then(() => this.syncEmbedHeight(true)).catch(() => {});
        }

        window.setTimeout(() => this.syncEmbedHeight(true), 60);
        window.setTimeout(() => this.syncEmbedHeight(true), 240);
        window.setTimeout(() => this.syncEmbedHeight(true), 900);
        window.setTimeout(() => this.syncEmbedHeight(true), 1800);
        this.syncEmbedHeight(true);
      }

      window.addEventListener("resize", this.handleResize);
      window.addEventListener("message", this.handleMessage);
      requestAnimationFrame(this.handleFrame);
    }

    getDom() {
      const root = this.root;
      return {
        root,
        shell: qs(root, "#canvasShell"),
        bgCanvas: qs(root, "#bgCanvas"),
        fxCanvas: qs(root, "#fxCanvas"),
        runButtonSecondary: qs(root, "#runButtonSecondary"),
        stepButton: qs(root, "#stepButton"),
        summaryReplayButton: qs(root, "#summaryReplayButton"),
        summaryCloseButton: qs(root, "#summaryCloseButton"),
        summaryBackdrop: qs(root, "#summaryBackdrop"),
        presetLabel: qs(root, "#presetLabel"),
        presetSelect: qs(root, "#presetSelect"),
        speedSelect: qs(root, "#speedSelect"),
        progressFill: qs(root, "#progressFill"),
        clockLabel: qs(root, "#clockLabel"),
        heroNarrative: qs(root, "#heroNarrative"),
        metricImpressions: qs(root, "#metricImpressions"),
        metricClicks: qs(root, "#metricClicks"),
        metricSignups: qs(root, "#metricSignups"),
        metricDemos: qs(root, "#metricDemos"),
        metricPurchases: qs(root, "#metricPurchases"),
        metricRepeats: qs(root, "#metricRepeats"),
        metricRevenue: qs(root, "#metricRevenue"),
        actualCtr: qs(root, "#actualCtr"),
        actualSignup: qs(root, "#actualSignup"),
        actualDemo: qs(root, "#actualDemo"),
        actualClose: qs(root, "#actualClose"),
        actualRepeat: qs(root, "#actualRepeat"),
        targetCtr: qs(root, "#targetCtr"),
        targetSignup: qs(root, "#targetSignup"),
        targetDemo: qs(root, "#targetDemo"),
        targetClose: qs(root, "#targetClose"),
        targetRepeat: qs(root, "#targetRepeat"),
        bottleneckTitle: qs(root, "#bottleneckTitle"),
        bottleneckCopy: qs(root, "#bottleneckCopy"),
        multiplierValue: qs(root, "#multiplierValue"),
        multiplierCopy: qs(root, "#multiplierCopy"),
        queueValue: qs(root, "#queueValue"),
        queueCopy: qs(root, "#queueCopy"),
        efficiencyValue: qs(root, "#efficiencyValue"),
        efficiencyCopy: qs(root, "#efficiencyCopy"),
        demoHeldValue: qs(root, "#demoHeldValue"),
        demoHeldCopy: qs(root, "#demoHeldCopy"),
        repeatRevenueValue: qs(root, "#repeatRevenueValue"),
        repeatRevenueCopy: qs(root, "#repeatRevenueCopy"),
        summaryTitle: qs(root, "#summaryTitle"),
        summaryLead: qs(root, "#summaryLead"),
        summaryPeakQueue: qs(root, "#summaryPeakQueue"),
        summaryPurchaseYield: qs(root, "#summaryPurchaseYield"),
        summaryRepeatYield: qs(root, "#summaryRepeatYield"),
        summaryRevenue: qs(root, "#summaryRevenue"),
        summaryFoot: qs(root, "#summaryFoot"),
        ariaLive: qs(root, "#ariaLive"),
        sliders: {
          impressionsPerSecond: qs(root, "#impressionsInput"),
          clickRate: qs(root, "#clickInput"),
          signupRate: qs(root, "#signupInput"),
          demoRate: qs(root, "#demoInput"),
          closeRate: qs(root, "#closeInput"),
          repeatRate: qs(root, "#repeatInput"),
          bridgeCapacity: qs(root, "#bridgeInput"),
        },
        valueInputs: {
          purchaseValue: qs(root, "#purchaseValueInput"),
          repeatValue: qs(root, "#repeatValueInput"),
        },
        sliderOutputs: {
          impressionsPerSecond: qs(root, "#impressionsValue"),
          clickRate: qs(root, "#clickValue"),
          signupRate: qs(root, "#signupValue"),
          demoRate: qs(root, "#demoValue"),
          closeRate: qs(root, "#closeValue"),
          repeatRate: qs(root, "#repeatValue"),
          bridgeCapacity: qs(root, "#bridgeValue"),
        },
        leakLabels: STAGE_KEYS.map((_, index) => qs(root, `#leakLabel${index}`)),
        leakFills: STAGE_KEYS.map((_, index) => qs(root, `#leakFill${index}`)),
      };
    }

    refreshRevenue() {
      this.metrics.revenue = this.metrics.purchases * this.settings.purchaseValue + this.metrics.repeats * this.settings.repeatValue;
    }

    createMetrics() {
      return {
        impressions: 0,
        clicks: 0,
        signups: 0,
        demos: 0,
        demoSessions: 0,
        demoMisses: 0,
        purchases: 0,
        repeats: 0,
        revenue: 0,
        leaks: {
          clickGate: 0,
          signupPool: 0,
          demoBridge: 0,
          purchaseEngine: 0,
          loyaltyLoop: 0,
        },
      };
    }

    hasPersistentRepeatLoop() {
      return this.settings.repeatRate >= 0.999;
    }

    createCalibration() {
      return {
        click: { attempts: 0, successes: 0 },
        signup: { attempts: 0, successes: 0 },
        demo: { attempts: 0, successes: 0 },
        close: { attempts: 0, successes: 0 },
        repeat: { attempts: 0, successes: 0 },
      };
    }

    createGeometry() {
      return {
        w: 1280,
        h: 720,
        adRect: { x: 76, y: 72, w: 208, h: 148 },
        clickGate: { x: 398, y: 214, r: 64 },
        signupPool: { x: 542, y: 560, rx: 112, ry: 72 },
        demoBridge: { x: 664, y: 334, w: 184, h: 42 },
        purchaseEngine: { x: 946, y: 326, r: 72 },
        loyaltyLoop: { x: 1112, y: 220, r: 54 },
        demoDecisionAnchor: { x: 618, y: 462 },
        queueAnchor: { x: 628, y: 355 },
        returnArcControl: { x: 1038, y: 112 },
        dropZones: [
          { x: 392, y: 616 },
          { x: 528, y: 618 },
          { x: 738, y: 618 },
          { x: 946, y: 618 },
          { x: 1112, y: 618 },
        ],
      };
    }

    buildSprites() {
      const palette = {
        [PARTICLE_KIND.neutral]: {
          fill: "#bccbd3",
          core: "#f5fbfd",
          stroke: "rgba(255,255,255,0.94)",
          glow: "rgba(122,148,158,0.24)",
          ring: "rgba(97,120,131,0.26)",
          highlight: "rgba(255,255,255,0.82)",
          shadow: "rgba(58,83,93,0.11)",
          haloAlpha: 0.72,
        },
        [PARTICLE_KIND.engaged]: {
          fill: "#1ebdff",
          core: "#e2f8ff",
          stroke: "rgba(255,255,255,0.96)",
          glow: "rgba(30,189,255,0.34)",
          ring: "rgba(30,189,255,0.42)",
          highlight: "rgba(255,255,255,0.92)",
          shadow: "rgba(19,102,138,0.14)",
          haloAlpha: 0.82,
        },
        [PARTICLE_KIND.buyer]: {
          fill: "#ff9552",
          core: "#fff0df",
          stroke: "rgba(255,255,255,0.96)",
          glow: "rgba(255,149,82,0.34)",
          ring: "rgba(255,149,82,0.4)",
          highlight: "rgba(255,252,245,0.92)",
          shadow: "rgba(161,93,48,0.14)",
          haloAlpha: 0.84,
        },
        [PARTICLE_KIND.loyal]: {
          fill: "#ffd364",
          core: "#fff5cb",
          stroke: "rgba(255,255,255,0.98)",
          glow: "rgba(255,211,100,0.36)",
          ring: "rgba(255,211,100,0.42)",
          highlight: "rgba(255,252,233,0.94)",
          shadow: "rgba(168,129,34,0.14)",
          haloAlpha: 0.88,
        },
        [PARTICLE_KIND.leak]: {
          fill: "#afbbc2",
          core: "#e6eef1",
          stroke: "rgba(255,255,255,0.8)",
          glow: "rgba(145,159,166,0.18)",
          ring: "rgba(145,159,166,0.2)",
          highlight: "rgba(255,255,255,0.56)",
          shadow: "rgba(76,92,100,0.1)",
          haloAlpha: 0.58,
        },
      };
      return palette;
    }

    installEmbedMode() {
      const params = new URLSearchParams(window.location.search);
      const embedded =
        window.parent !== window ||
        params.get("embed") === "1" ||
        params.get("embedMode") === "1" ||
        window.location.hash === "#embed";
      this.embedded = embedded;
      if (embedded) {
        document.documentElement.classList.add("embed-mode");
        document.body.classList.add("embed-mode");
      }
    }

    syncEmbedHeight(force = false) {
      if (!this.embedded) {
        return;
      }
      if (force) {
        this.embedHeightForceDispatch = true;
      }
      if (this.embedHeightRafId) {
        return;
      }
      this.embedHeightRafId = window.requestAnimationFrame(() => {
        this.embedHeightRafId = 0;
        const doc = document.documentElement;
        const body = document.body;
        const rootStyles = getComputedStyle(this.root);
        const rootHeight = Math.ceil(
          this.root.getBoundingClientRect().height +
            (parseFloat(rootStyles.marginTop) || 0) +
            (parseFloat(rootStyles.marginBottom) || 0)
        );
        const docHeight = Math.max(
          rootHeight,
          doc?.scrollHeight || 0,
          doc?.offsetHeight || 0,
          body?.scrollHeight || 0,
          body?.offsetHeight || 0,
          Math.ceil(body?.getBoundingClientRect().height || 0)
        );
        const height = Math.max(1, Math.ceil(docHeight));
        const shouldForceDispatch = this.embedHeightForceDispatch || this.embedHeightForceDispatchesRemaining > 0;
        this.embedHeightForceDispatch = false;
        if (!shouldForceDispatch && Math.abs(height - this.lastEmbedHeight) < 1) {
          return;
        }

        this.lastEmbedHeight = height;
        if (this.embedHeightForceDispatchesRemaining > 0) {
          this.embedHeightForceDispatchesRemaining -= 1;
        }
        if (doc) {
          doc.style.minHeight = `${height}px`;
        }
        if (body) {
          body.style.minHeight = `${height}px`;
        }

        try {
          const frame = window.frameElement;
          if (frame) {
            frame.style.height = `${height}px`;
            frame.setAttribute("height", String(height));
          }
        } catch (_) {}

        try {
          window.parent?.postMessage({ type: "widget:resize", widget: EMBED_WIDGET_ID, height }, "*");
          window.parent?.postMessage({ type: `${EMBED_WIDGET_ID}:height`, height }, "*");
          window.parent?.postMessage(
            { type: "simfluence-widget:resize", widget: EMBED_WIDGET_ID, height, mode: "default" },
            "*"
          );
        } catch (_) {}
      });
    }

    onMessage(event) {
      if (
        event?.data?.type === "simfluence:request-height" ||
        event?.data?.type === "simfluence-widget:request-height" ||
        event?.data?.type === "simfluence:request-resize" ||
        event?.data?.type === "simfluence-widget:request-resize" ||
        event?.data?.type === "widget:request-resize" ||
        event?.data?.type === "widget:request-height" ||
        event?.data?.type === `${EMBED_WIDGET_ID}:request-height`
      ) {
        this.syncEmbedHeight(true);
      }
    }

    bindUi() {
      const toggle = () => this.toggleRun(!this.state.running);
      this.dom.runButtonSecondary.addEventListener("click", toggle);
      this.dom.stepButton.addEventListener("click", () => this.stepOnce());
      this.dom.summaryReplayButton.addEventListener("click", () => {
        this.hideSummary();
        this.resetRun({ autoStart: true, freshSeed: true });
      });
      this.dom.summaryCloseButton.addEventListener("click", () => this.hideSummary());
      this.dom.summaryBackdrop.addEventListener("click", (event) => {
        if (event.target === this.dom.summaryBackdrop) {
          this.hideSummary();
        }
      });

      for (const [key, slider] of Object.entries(this.dom.sliders)) {
        slider.addEventListener("input", () => {
          const value = Number(slider.value);
          if (key === "impressionsPerSecond" || key === "bridgeCapacity") {
            this.settings[key] = value;
          } else {
            this.settings[key] = value / 100;
          }
          this.syncControlValues();
          this.updateTargetLabels();
          this.updateUi(true);
        });
      }

      for (const [key, input] of Object.entries(this.dom.valueInputs)) {
        input.addEventListener("change", () => {
          const value = Math.max(0, Number(input.value) || 0);
          this.settings[key] = value;
          input.value = String(Math.round(value));
          this.refreshRevenue();
          this.updateUi(true);
        });
      }

      this.dom.presetSelect.addEventListener("change", () => this.applyPreset(this.dom.presetSelect.value || "medium"));
      this.dom.speedSelect.addEventListener("change", () => this.setSpeed(Number(this.dom.speedSelect.value)));

      document.addEventListener("keydown", (event) => {
        const target = event.target;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
          return;
        }
        if (event.code === "Space") {
          event.preventDefault();
          toggle();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          this.stepOnce();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          this.cycleSpeed(1);
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          this.cycleSpeed(-1);
        }
      });
    }

    cycleSpeed(direction) {
      const options = this.config.sim.speedOptions;
      const currentIndex = options.indexOf(this.state.speed);
      const nextIndex = clamp(currentIndex + direction, 0, options.length - 1);
      this.setSpeed(options[nextIndex]);
    }

    setSpeed(value) {
      this.state.speed = value;
      this.dom.speedSelect.value = String(value);
      this.updateUi(true);
    }

    applyPreset(name) {
      const preset = PRESETS[name] || PRESETS.medium;
      this.state.currentPreset = name;
      this.settings = { ...this.settings, ...preset.funnel };
      this.dom.presetLabel.textContent = preset.label;
      this.dom.presetSelect.value = name;
      this.syncControlValues();
      this.updateTargetLabels();
      this.resetRun({ autoStart: true, freshSeed: true });
    }

    syncControlValues() {
      const formatters = {
        impressionsPerSecond: (value) => String(Math.round(value)),
        bridgeCapacity: (value) => String(Math.round(value)),
        clickRate: (value) => pct(value),
        signupRate: (value) => pct(value),
        demoRate: (value) => pct(value),
        closeRate: (value) => pct(value),
        repeatRate: (value) => pct(value),
      };
      for (const [key, slider] of Object.entries(this.dom.sliders)) {
        const value = this.settings[key];
        slider.value = key === "impressionsPerSecond" || key === "bridgeCapacity" ? String(value) : String(value * 100);
        this.dom.sliderOutputs[key].textContent = formatters[key](value);
      }
      for (const [key, input] of Object.entries(this.dom.valueInputs)) {
        input.value = String(Math.round(this.settings[key]));
      }
      this.dom.presetSelect.value = this.state.currentPreset;
      this.dom.speedSelect.value = String(this.state.speed);
    }

    updateTargetLabels() {
      this.dom.targetCtr.textContent = pct(this.settings.clickRate);
      this.dom.targetSignup.textContent = pct(this.settings.signupRate);
      this.dom.targetDemo.textContent = pct(this.settings.demoRate);
      this.dom.targetClose.textContent = pct(this.settings.closeRate);
      this.dom.targetRepeat.textContent = pct(this.settings.repeatRate);
    }

    resize() {
      const rect = this.dom.shell.getBoundingClientRect();
      const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
      const isPhone = rect.width <= 760;
      const viewBox = isPhone
        ? { x: 40, y: 48, width: 1168, height: 624 }
        : { x: 0, y: 0, width: this.geometry.w, height: this.geometry.h };
      const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height);
      const sceneWidth = viewBox.width * scale;
      const sceneHeight = viewBox.height * scale;
      this.viewport = {
        width: rect.width,
        height: rect.height,
        dpr,
        scale,
        offsetX: (rect.width - sceneWidth) * 0.5,
        offsetY: (rect.height - sceneHeight) * 0.5,
        viewBox,
      };
      [this.dom.bgCanvas, this.dom.fxCanvas].forEach((canvas) => {
        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      });
      this.drawBackground();
      this.syncEmbedHeight();
    }

    applyCanvasTransform(ctx) {
      const { scale, dpr, offsetX = 0, offsetY = 0, viewBox } = this.viewport;
      const translateX = offsetX - (viewBox?.x || 0) * scale;
      const translateY = offsetY - (viewBox?.y || 0) * scale;
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, translateX * dpr, translateY * dpr);
    }

    getConnectorGeometry() {
      const { adRect, clickGate, signupPool, demoBridge, purchaseEngine, loyaltyLoop, returnArcControl } = this.geometry;
      const adCenter = { x: adRect.x + adRect.w * 0.5, y: adRect.y + adRect.h * 0.5 };
      const clickCenter = { x: clickGate.x, y: clickGate.y };
      const signupCenter = { x: signupPool.x, y: signupPool.y };
      const bridgeCenter = { x: demoBridge.x + demoBridge.w * 0.5, y: demoBridge.y + demoBridge.h * 0.5 };
      const purchaseCenter = { x: purchaseEngine.x, y: purchaseEngine.y };
      const loyaltyCenter = { x: loyaltyLoop.x, y: loyaltyLoop.y };
      const main = [
        {
          start: adCenter,
          cp1: { x: 248, y: 140 },
          cp2: { x: 306, y: 176 },
          end: clickCenter,
          color: "rgba(47,153,222,0.94)",
          glow: "rgba(47,153,222,0.24)",
        },
        {
          start: clickCenter,
          cp1: { x: 446, y: 284 },
          cp2: { x: 506, y: 446 },
          end: signupCenter,
          color: "rgba(63,186,247,0.94)",
          glow: "rgba(63,186,247,0.22)",
        },
        {
          start: signupCenter,
          cp1: { x: 614, y: 594 },
          cp2: { x: 684, y: 452 },
          end: bridgeCenter,
          color: "rgba(76,207,181,0.94)",
          glow: "rgba(76,207,181,0.22)",
        },
        {
          start: bridgeCenter,
          cp1: { x: 834, y: 356 },
          cp2: { x: 888, y: 344 },
          end: purchaseCenter,
          color: "rgba(239,154,78,0.94)",
          glow: "rgba(239,154,78,0.22)",
        },
        {
          start: purchaseCenter,
          cp1: { x: 1008, y: 286 },
          cp2: { x: 1058, y: 236 },
          end: loyaltyCenter,
          color: "rgba(215,171,68,0.96)",
          glow: "rgba(215,171,68,0.24)",
        },
      ];

      return {
        main,
        returnArc: {
          start: loyaltyCenter,
          control: { x: returnArcControl.x, y: returnArcControl.y },
          end: purchaseCenter,
          color: "rgba(255,209,102,0.92)",
          glow: "rgba(255,209,102,0.18)",
        },
      };
    }

    traceMainConnector(ctx, segments) {
      ctx.beginPath();
      ctx.moveTo(segments[0].start.x, segments[0].start.y);
      let cursor = segments[0].start;
      for (const segment of segments) {
        if (dist(cursor, segment.start) > 0.5) {
          ctx.lineTo(segment.start.x, segment.start.y);
        }
        ctx.bezierCurveTo(segment.cp1.x, segment.cp1.y, segment.cp2.x, segment.cp2.y, segment.end.x, segment.end.y);
        cursor = segment.end;
      }
    }

    traceReturnConnector(ctx, connector) {
      ctx.beginPath();
      ctx.moveTo(connector.start.x, connector.start.y);
      ctx.quadraticCurveTo(connector.control.x, connector.control.y, connector.end.x, connector.end.y);
    }

    drawBackground() {
      const ctx = this.backgroundCtx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.dom.bgCanvas.width, this.dom.bgCanvas.height);
      this.applyCanvasTransform(ctx);
      const { w, h, adRect, clickGate, signupPool, demoBridge, purchaseEngine, loyaltyLoop } = this.geometry;
      const connectors = this.getConnectorGeometry();
      const connectorStart = connectors.main[0].start;
      const connectorEnd = connectors.main[connectors.main.length - 1].end;
      const background = ctx.createLinearGradient(0, 0, 0, h);
      background.addColorStop(0, "#fbfffe");
      background.addColorStop(0.5, "#f4fbfb");
      background.addColorStop(1, "#eef5f6");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
      drawSoftHalo(ctx, 182, 88, 320, 220, [
        [0, "rgba(60,198,222,0.16)"],
        [0.45, "rgba(60,198,222,0.08)"],
        [1, "rgba(60,198,222,0)"],
      ]);
      drawSoftHalo(ctx, 748, 426, 420, 260, [
        [0, "rgba(76,207,181,0.1)"],
        [0.5, "rgba(76,207,181,0.05)"],
        [1, "rgba(76,207,181,0)"],
      ]);
      drawSoftHalo(ctx, 1118, 134, 280, 220, [
        [0, "rgba(255,173,88,0.14)"],
        [0.54, "rgba(255,173,88,0.06)"],
        [1, "rgba(255,173,88,0)"],
      ]);

      ctx.fillStyle = "rgba(123,153,164,0.045)";
      for (let x = 40; x < w; x += 80) {
        ctx.fillRect(x, 0, 1, h);
      }
      for (let y = 40; y < h; y += 80) {
        ctx.fillRect(0, y, w, 1);
      }
      ctx.fillStyle = "rgba(123,153,164,0.08)";
      for (let x = 40; x < w; x += 160) {
        for (let y = 40; y < h; y += 160) {
          ctx.beginPath();
          ctx.arc(x, y, 1.4, 0, TAU);
          ctx.fill();
        }
      }
      ctx.save();
      ctx.strokeStyle = "rgba(132,160,170,0.08)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 16]);
      [
        [{ x: 56, y: 116 }, { x: 266, y: 62 }, { x: 624, y: 120 }, { x: 932, y: 92 }, { x: 1228, y: 144 }],
        [{ x: 24, y: 310 }, { x: 250, y: 266 }, { x: 606, y: 342 }, { x: 930, y: 284 }, { x: 1254, y: 324 }],
        [{ x: 42, y: 586 }, { x: 296, y: 548 }, { x: 658, y: 604 }, { x: 974, y: 548 }, { x: 1232, y: 590 }],
      ].forEach((line) => {
        ctx.beginPath();
        ctx.moveTo(line[0].x, line[0].y);
        ctx.bezierCurveTo(line[1].x, line[1].y, line[2].x, line[2].y, line[3].x, line[3].y);
        ctx.quadraticCurveTo(line[4].x - 58, line[4].y - 10, line[4].x, line[4].y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();
      drawSoftHalo(ctx, 708, 318, 468, 106, [
        [0, "rgba(255,255,255,0.44)"],
        [0.38, "rgba(255,255,255,0.2)"],
        [1, "rgba(255,255,255,0)"],
      ]);

      const connectorGlow = ctx.createLinearGradient(connectorStart.x, connectorStart.y, connectorEnd.x, connectorEnd.y);
      connectorGlow.addColorStop(0, "rgba(47,153,222,0.18)");
      connectorGlow.addColorStop(0.24, "rgba(63,186,247,0.2)");
      connectorGlow.addColorStop(0.5, "rgba(76,207,181,0.18)");
      connectorGlow.addColorStop(0.76, "rgba(239,154,78,0.18)");
      connectorGlow.addColorStop(1, "rgba(215,171,68,0.18)");

      const connectorCore = ctx.createLinearGradient(connectorStart.x, connectorStart.y, connectorEnd.x, connectorEnd.y);
      connectorCore.addColorStop(0, "rgba(47,153,222,0.78)");
      connectorCore.addColorStop(0.24, "rgba(63,186,247,0.74)");
      connectorCore.addColorStop(0.5, "rgba(76,207,181,0.72)");
      connectorCore.addColorStop(0.76, "rgba(239,154,78,0.68)");
      connectorCore.addColorStop(1, "rgba(215,171,68,0.74)");

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(93,125,136,0.12)";
      ctx.shadowBlur = 24;
      ctx.strokeStyle = "rgba(255,255,255,0.94)";
      ctx.lineWidth = 30;
      this.traceMainConnector(ctx, connectors.main);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(195,214,223,0.34)";
      ctx.lineWidth = 21;
      this.traceMainConnector(ctx, connectors.main);
      ctx.stroke();
      ctx.strokeStyle = connectorGlow;
      ctx.lineWidth = 13;
      this.traceMainConnector(ctx, connectors.main);
      ctx.stroke();
      ctx.strokeStyle = connectorCore;
      ctx.lineWidth = 6.4;
      this.traceMainConnector(ctx, connectors.main);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.56)";
      ctx.lineWidth = 1.4;
      this.traceMainConnector(ctx, connectors.main);
      ctx.stroke();

      const returnGradient = ctx.createLinearGradient(
        connectors.returnArc.start.x,
        connectors.returnArc.start.y,
        connectors.returnArc.end.x,
        connectors.returnArc.end.y
      );
      returnGradient.addColorStop(0, "rgba(255,212,112,0.36)");
      returnGradient.addColorStop(1, "rgba(255,154,87,0.26)");
      ctx.strokeStyle = "rgba(255,255,255,0.86)";
      ctx.lineWidth = 18;
      this.traceReturnConnector(ctx, connectors.returnArc);
      ctx.stroke();
      ctx.strokeStyle = returnGradient;
      ctx.lineWidth = 8;
      this.traceReturnConnector(ctx, connectors.returnArc);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.42)";
      ctx.lineWidth = 1.4;
      this.traceReturnConnector(ctx, connectors.returnArc);
      ctx.stroke();
      ctx.restore();

      [
        { x: adRect.x + adRect.w * 0.5, y: adRect.y + adRect.h + 28, rx: 136, ry: 26 },
        { x: clickGate.x, y: clickGate.y + 96, rx: 86, ry: 22 },
        { x: signupPool.x, y: signupPool.y + 98, rx: 140, ry: 24 },
        { x: demoBridge.x + demoBridge.w * 0.5, y: demoBridge.y + demoBridge.h + 28, rx: 126, ry: 20 },
        { x: purchaseEngine.x, y: purchaseEngine.y + 98, rx: 100, ry: 24 },
        { x: loyaltyLoop.x, y: loyaltyLoop.y + 82, rx: 80, ry: 20 },
      ].forEach((pad) => {
        drawSoftHalo(ctx, pad.x, pad.y, pad.rx, pad.ry, [
          [0, "rgba(100,125,135,0.13)"],
          [0.42, "rgba(100,125,135,0.07)"],
          [1, "rgba(100,125,135,0)"],
        ]);
      });

      const connectorNodes = [
        { point: connectors.main[0].start, tone: connectors.main[0] },
        ...connectors.main.map((segment) => ({ point: segment.end, tone: segment })),
      ];
      connectorNodes.forEach(({ point, tone }, index) => {
        drawSoftHalo(ctx, point.x, point.y, index === 0 ? 18 : 20, index === 0 ? 18 : 20, [
          [0, tone.glow.replace("0.24", "0.34").replace("0.22", "0.3")],
          [0.55, tone.glow],
          [1, "rgba(255,255,255,0)"],
        ]);
        ctx.fillStyle = "rgba(255,255,255,0.98)";
        ctx.beginPath();
        ctx.arc(point.x, point.y, index === 0 ? 6.6 : 7.2, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = tone.color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, index === 0 ? 6.6 : 7.2, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.62)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(point.x, point.y, index === 0 ? 12.5 : 13.5, 0, TAU);
        ctx.stroke();
      });

      drawSoftHalo(ctx, adRect.x + adRect.w * 0.5, adRect.y + adRect.h * 0.48, 172, 104, [
        [0, "rgba(47,153,222,0.1)"],
        [0.62, "rgba(47,153,222,0.04)"],
        [1, "rgba(47,153,222,0)"],
      ]);
      const adShell = ctx.createLinearGradient(adRect.x, adRect.y, adRect.x + adRect.w, adRect.y + adRect.h);
      adShell.addColorStop(0, "rgba(255,255,255,0.98)");
      adShell.addColorStop(0.55, "rgba(246,251,253,0.95)");
      adShell.addColorStop(1, "rgba(237,247,250,0.92)");
      ctx.fillStyle = adShell;
      roundRect(ctx, adRect.x, adRect.y, adRect.w, adRect.h, 32);
      ctx.fill();
      ctx.strokeStyle = "rgba(47,153,222,0.18)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      roundRect(ctx, adRect.x + 18, adRect.y + 18, 98, 18, 9);
      ctx.fillStyle = "rgba(47,153,222,0.11)";
      ctx.fill();
      const adTiles = [
        { x: adRect.x + 18, y: adRect.y + 50, w: 78 },
        { x: adRect.x + 106, y: adRect.y + 50, w: 88 },
        { x: adRect.x + 18, y: adRect.y + 84, w: 96 },
        { x: adRect.x + 126, y: adRect.y + 84, w: 68 },
      ];
      adTiles.forEach((tile, index) => {
        const fill = ctx.createLinearGradient(tile.x, tile.y, tile.x + tile.w, tile.y + 18);
        fill.addColorStop(0, index % 2 === 0 ? "rgba(80,181,233,0.16)" : "rgba(76,207,181,0.14)");
        fill.addColorStop(1, "rgba(255,255,255,0.34)");
        roundRect(ctx, tile.x, tile.y, tile.w, 18, 9);
        ctx.fillStyle = fill;
        ctx.fill();
      });
      for (let i = 0; i < 3; i += 1) {
        const dotX = adRect.x + adRect.w - 42 - i * 18;
        ctx.fillStyle = i === 0 ? "rgba(76,207,181,0.52)" : "rgba(47,153,222,0.2)";
        ctx.beginPath();
        ctx.arc(dotX, adRect.y + 28, 5 - i * 0.6, 0, TAU);
        ctx.fill();
      }

      drawSoftHalo(ctx, clickGate.x, clickGate.y, 112, 112, [
        [0, "rgba(63,186,247,0.12)"],
        [0.46, "rgba(63,186,247,0.06)"],
        [1, "rgba(63,186,247,0)"],
      ]);
      const gateFill = ctx.createRadialGradient(clickGate.x - 12, clickGate.y - 12, 8, clickGate.x, clickGate.y, clickGate.r);
      gateFill.addColorStop(0, "rgba(255,255,255,0.98)");
      gateFill.addColorStop(0.72, "rgba(235,248,252,0.92)");
      gateFill.addColorStop(1, "rgba(219,240,247,0.84)");
      ctx.fillStyle = gateFill;
      ctx.beginPath();
      ctx.arc(clickGate.x, clickGate.y, clickGate.r - 10, 0, TAU);
      ctx.fill();
      for (let i = 0; i < 12; i += 1) {
        const start = -Math.PI * 0.82 + i * 0.17;
        const end = start + 0.1;
        ctx.strokeStyle = i % 3 === 0 ? "rgba(63,186,247,0.42)" : "rgba(63,186,247,0.18)";
        ctx.lineWidth = i % 3 === 0 ? 4 : 2;
        ctx.beginPath();
        ctx.arc(clickGate.x, clickGate.y, clickGate.r + 8, start, end);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(47,153,222,0.62)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(clickGate.x, clickGate.y, clickGate.r, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = "rgba(76,207,181,0.24)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(clickGate.x, clickGate.y, clickGate.r - 14, 0, TAU);
      ctx.stroke();
      for (let i = -1; i <= 1; i += 1) {
        roundRect(ctx, clickGate.x - 26 + i * 18, clickGate.y - 28, 10, 56, 5);
        ctx.fillStyle = i === 0 ? "rgba(47,153,222,0.28)" : "rgba(47,153,222,0.14)";
        ctx.fill();
      }

      drawSoftHalo(ctx, signupPool.x, signupPool.y, 176, 116, [
        [0, "rgba(76,207,181,0.14)"],
        [0.5, "rgba(76,207,181,0.07)"],
        [1, "rgba(76,207,181,0)"],
      ]);
      const poolGradient = ctx.createLinearGradient(signupPool.x, signupPool.y - signupPool.ry, signupPool.x, signupPool.y + signupPool.ry);
      poolGradient.addColorStop(0, "rgba(255,255,255,0.9)");
      poolGradient.addColorStop(0.3, "rgba(141,236,215,0.26)");
      poolGradient.addColorStop(1, "rgba(62,182,210,0.18)");
      ctx.fillStyle = poolGradient;
      ctx.beginPath();
      ctx.ellipse(signupPool.x, signupPool.y, signupPool.rx, signupPool.ry, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(76,207,181,0.54)";
      ctx.lineWidth = 3.2;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.52)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(signupPool.x, signupPool.y - 12, signupPool.rx * 0.78, signupPool.ry * 0.28, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = "rgba(76,207,181,0.18)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(signupPool.x, signupPool.y + 12, signupPool.rx * 0.64, signupPool.ry * 0.2, 0, 0, TAU);
      ctx.stroke();

      drawSoftHalo(ctx, demoBridge.x + demoBridge.w * 0.5, demoBridge.y + demoBridge.h * 0.5, 166, 58, [
        [0, "rgba(255,183,80,0.15)"],
        [0.52, "rgba(255,183,80,0.06)"],
        [1, "rgba(255,183,80,0)"],
      ]);
      roundRect(ctx, demoBridge.x - 18, demoBridge.y - 12, demoBridge.w + 36, demoBridge.h + 24, 24);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fill();
      const bridgeGradient = ctx.createLinearGradient(demoBridge.x, demoBridge.y, demoBridge.x + demoBridge.w, demoBridge.y + demoBridge.h);
      bridgeGradient.addColorStop(0, "rgba(255,242,214,0.9)");
      bridgeGradient.addColorStop(1, "rgba(255,228,196,0.92)");
      ctx.fillStyle = bridgeGradient;
      roundRect(ctx, demoBridge.x, demoBridge.y, demoBridge.w, demoBridge.h, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(215,171,68,0.54)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.54)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(demoBridge.x + 20, demoBridge.y + demoBridge.h * 0.5);
      ctx.lineTo(demoBridge.x + demoBridge.w - 20, demoBridge.y + demoBridge.h * 0.5);
      ctx.stroke();
      for (let i = 0; i < 5; i += 1) {
        const x = demoBridge.x + 26 + i * 28;
        roundRect(ctx, x, demoBridge.y + 9, 16, demoBridge.h - 18, 8);
        ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.54)" : "rgba(255,209,102,0.26)";
        ctx.fill();
      }
      [demoBridge.x + 10, demoBridge.x + demoBridge.w - 10].forEach((x) => {
        drawSoftHalo(ctx, x, demoBridge.y + demoBridge.h * 0.5, 16, 16, [
          [0, "rgba(255,209,102,0.4)"],
          [1, "rgba(255,209,102,0)"],
        ]);
      });

      drawSoftHalo(ctx, purchaseEngine.x, purchaseEngine.y, 136, 120, [
        [0, "rgba(255,149,82,0.16)"],
        [0.54, "rgba(255,149,82,0.07)"],
        [1, "rgba(255,149,82,0)"],
      ]);
      const engineGradient = ctx.createRadialGradient(
        purchaseEngine.x - 10,
        purchaseEngine.y - 12,
        10,
        purchaseEngine.x,
        purchaseEngine.y,
        purchaseEngine.r + 18
      );
      engineGradient.addColorStop(0, "rgba(255,255,255,0.98)");
      engineGradient.addColorStop(0.36, "rgba(255,216,183,0.72)");
      engineGradient.addColorStop(1, "rgba(255,159,94,0.22)");
      ctx.fillStyle = engineGradient;
      ctx.beginPath();
      ctx.arc(purchaseEngine.x, purchaseEngine.y, purchaseEngine.r + 10, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,149,82,0.56)";
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(purchaseEngine.x, purchaseEngine.y, purchaseEngine.r, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = "rgba(190,130,88,0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(purchaseEngine.x, purchaseEngine.y, purchaseEngine.r - 18, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 6; i += 1) {
        const angle = i * (TAU / 6) + 0.2;
        ctx.strokeStyle = i % 2 === 0 ? "rgba(255,149,82,0.32)" : "rgba(255,209,102,0.26)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(purchaseEngine.x + Math.cos(angle) * 20, purchaseEngine.y + Math.sin(angle) * 20);
        ctx.lineTo(purchaseEngine.x + Math.cos(angle) * 42, purchaseEngine.y + Math.sin(angle) * 42);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,255,0.76)";
      ctx.beginPath();
      ctx.arc(purchaseEngine.x, purchaseEngine.y, 18, 0, TAU);
      ctx.fill();

      drawSoftHalo(ctx, loyaltyLoop.x, loyaltyLoop.y, 110, 94, [
        [0, "rgba(255,209,102,0.16)"],
        [0.56, "rgba(255,209,102,0.08)"],
        [1, "rgba(255,209,102,0)"],
      ]);
      ctx.strokeStyle = "rgba(215,171,68,0.68)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(loyaltyLoop.x, loyaltyLoop.y, loyaltyLoop.r, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,234,186,0.74)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(loyaltyLoop.x, loyaltyLoop.y, loyaltyLoop.r - 12, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,209,102,0.18)";
      ctx.beginPath();
      ctx.arc(loyaltyLoop.x, loyaltyLoop.y, 26, 0, TAU);
      ctx.fill();
      for (let i = 0; i < 3; i += 1) {
        const angle = -Math.PI * 0.18 + i * (TAU / 3);
        ctx.fillStyle = i === 0 ? "rgba(255,255,255,0.86)" : "rgba(255,230,176,0.52)";
        ctx.beginPath();
        ctx.arc(loyaltyLoop.x + Math.cos(angle) * (loyaltyLoop.r - 6), loyaltyLoop.y + Math.sin(angle) * (loyaltyLoop.r - 6), 4.2 - i * 0.6, 0, TAU);
        ctx.fill();
      }

      drawGuideStem(
        ctx,
        { x: adRect.x + 88, y: adRect.y - 2 },
        { x: adRect.x + 112, y: adRect.y + 18 },
        { x: adRect.x + 124, y: adRect.y + 42 },
        "rgba(47,153,222,0.18)"
      );
      drawGuideStem(
        ctx,
        { x: clickGate.x + 12, y: clickGate.y - 88 },
        { x: clickGate.x + 8, y: clickGate.y - 56 },
        { x: clickGate.x + 2, y: clickGate.y - 28 },
        "rgba(63,186,247,0.18)"
      );
      drawGuideStem(
        ctx,
        { x: signupPool.x + 12, y: signupPool.y - 96 },
        { x: signupPool.x + 18, y: signupPool.y - 62 },
        { x: signupPool.x + 24, y: signupPool.y - 28 },
        "rgba(76,207,181,0.18)"
      );
      drawGuideStem(
        ctx,
        { x: demoBridge.x + 116, y: demoBridge.y - 12 },
        { x: demoBridge.x + 110, y: demoBridge.y + 2 },
        { x: demoBridge.x + 98, y: demoBridge.y + 18 },
        "rgba(245,178,88,0.18)"
      );
      drawGuideStem(
        ctx,
        { x: purchaseEngine.x + 16, y: purchaseEngine.y - 92 },
        { x: purchaseEngine.x + 18, y: purchaseEngine.y - 62 },
        { x: purchaseEngine.x + 12, y: purchaseEngine.y - 26 },
        "rgba(255,154,67,0.18)"
      );
      drawGuideStem(
        ctx,
        { x: loyaltyLoop.x + 8, y: loyaltyLoop.y - 76 },
        { x: loyaltyLoop.x + 10, y: loyaltyLoop.y - 48 },
        { x: loyaltyLoop.x + 6, y: loyaltyLoop.y - 18 },
        "rgba(255,209,102,0.18)"
      );

      drawStageBadge(ctx, {
        x: adRect.x - 2,
        y: adRect.y - 60,
        width: 196,
        title: "Ad Cloud",
        subtitle: "Impressions spawn in waves",
        index: 1,
        accentStart: "#2fa0de",
        accentEnd: "#49c8ef",
      });
      drawStageBadge(ctx, {
        x: clickGate.x - 84,
        y: clickGate.y - 144,
        width: 194,
        title: "Click Gate",
        subtitle: "Passed agents turn blue",
        index: 2,
        accentStart: "#2fa0de",
        accentEnd: "#4ccfb5",
      });
      drawStageBadge(ctx, {
        x: signupPool.x - 100,
        y: signupPool.y - 150,
        width: 216,
        title: "Signup Pool",
        subtitle: "Swirl, decide, then split",
        index: 3,
        accentStart: "#46d2b8",
        accentEnd: "#6ce5ce",
      });
      drawStageBadge(ctx, {
        x: demoBridge.x + 6,
        y: demoBridge.y - 70,
        width: 218,
        title: "Demo Bridge",
        subtitle: "Capacity shapes conversion",
        index: 4,
        accentStart: "#f5b258",
        accentEnd: "#f39a53",
      });
      drawStageBadge(ctx, {
        x: purchaseEngine.x - 108,
        y: purchaseEngine.y - 148,
        width: 228,
        title: "Purchase Engine",
        subtitle: "Revenue ignites here",
        index: 5,
        accentStart: "#ff9b4f",
        accentEnd: "#ff7f63",
      });
      drawStageBadge(ctx, {
        x: loyaltyLoop.x - 94,
        y: loyaltyLoop.y - 132,
        width: 212,
        title: "Loyalty Loop",
        subtitle: "Return buyers orbit back",
        index: 6,
        accentStart: "#e4b451",
        accentEnd: "#ffd364",
      });
    }

    toggleRun(next) {
      if (next && this.state.simTime >= this.config.sim.runDuration) {
        this.resetRun({ autoStart: true, freshSeed: true });
        return;
      }
      this.state.running = next;
      this.updateRunButtons();
      this.syncEmbedHeight();
    }

    updateRunButtons() {
      const label = this.state.running ? "Pause" : this.state.simTime >= this.config.sim.runDuration ? "Replay" : "Run";
      this.dom.runButtonSecondary.textContent = label;
      this.dom.runButtonSecondary.setAttribute("aria-pressed", String(this.state.running));
    }

    resolveStageTrial(key, probability) {
      const stage = this.calibration[key];
      if (!stage) {
        return this.rng() < probability;
      }
      const rate = clamp(probability, 0, 1);
      stage.attempts += 1;
      const expectedSuccesses = rate * stage.attempts;
      const guaranteedSuccesses = Math.floor(expectedSuccesses);

      let success;
      if (stage.successes < guaranteedSuccesses) {
        success = true;
      } else {
        const capSuccesses = Math.ceil(expectedSuccesses);
        if (stage.successes >= capSuccesses) {
          success = false;
        } else {
          success = this.rng() < expectedSuccesses - guaranteedSuccesses;
        }
      }

      if (success) {
        stage.successes += 1;
      }
      return success;
    }

    resetRun({ autoStart = false, freshSeed = false } = {}) {
      if (freshSeed) {
        this.state.seed = this.randomSeedValue();
      }
      this.rng = createRng(this.state.seed);
      this.metrics = this.createMetrics();
      this.calibration = this.createCalibration();
      this.queue.length = 0;
      this.effects.length = 0;
      this.state.simTime = 0;
      this.state.accumulator = 0;
      this.state.spawnAccumulator = 0;
      this.state.bridgeTokens = 0;
      this.state.activeCount = 0;
      this.state.uiElapsed = 0;
      this.state.liveReadIndex = 0;
      this.state.liveReadElapsed = 0;
      this.state.insightElapsed = 0;
      this.state.metricsElapsed = 0;
      this.state.peakQueue = 0;
      this.state.accessibilityBucket = -1;
      if (this.liveReadSwapTimer) {
        clearTimeout(this.liveReadSwapTimer);
        this.liveReadSwapTimer = null;
      }
      this.liveReadSlides = [];
      for (const particle of this.particles) {
        particle.active = false;
      }
      this.hideSummary();
      if (autoStart) {
        this.state.running = true;
      }
      this.updateRunButtons();
      this.updateUi(true);
      this.updateInsight();
      this.syncEmbedHeight();
    }

    randomSeedValue() {
      return Math.floor(Math.random() * 900000) + 10000;
    }

    stepOnce() {
      if (this.state.running) {
        return;
      }
      this.advance(0.5);
      if (this.state.simTime >= this.config.sim.runDuration) {
        this.finishRun();
      }
      this.drawFrame();
      this.updateUi(true);
    }

    frame(timestamp) {
      const elapsedMs = this.state.lastFrameTime ? timestamp - this.state.lastFrameTime : 16.67;
      this.state.lastFrameTime = timestamp;
      const deltaSeconds = clamp(elapsedMs / 1000, 0.001, 0.05);

      if (this.state.running && !this.state.summaryVisible) {
        this.state.accumulator += deltaSeconds * this.state.speed;
        while (this.state.accumulator >= this.config.sim.fixedStep) {
          this.advance(this.config.sim.fixedStep);
          this.state.accumulator -= this.config.sim.fixedStep;
          if (this.state.simTime >= this.config.sim.runDuration) {
            this.finishRun();
            break;
          }
        }
      }

      this.drawFrame();
      requestAnimationFrame(this.handleFrame);
    }

    finishRun() {
      this.state.running = false;
      this.state.accumulator = 0;
      this.drainRemainingFlow();
      this.state.simTime = this.config.sim.runDuration;
      this.updateRunButtons();
      this.updateUi(true);
      this.showSummary();
      this.syncEmbedHeight();
    }

    drainRemainingFlow() {
      const maxDrain = this.config.sim.settleDuration;
      let elapsed = 0;
      while (elapsed < maxDrain) {
        const unresolved =
          this.queue.length > 0 ||
          this.particles.some((particle) => particle.active && !(particle.state === PARTICLE_STATE.loyalty && particle.loyaltyLocked));
        if (!unresolved) {
          break;
        }
        this.advance(this.config.sim.fixedStep, {
          spawn: false,
          updateUi: false,
          updateInsight: false,
          emitMetrics: false,
        });
        elapsed += this.config.sim.fixedStep;
      }
      this.effects.length = 0;
    }

    advance(dt, options = {}) {
      const {
        spawn = true,
        updateUi = true,
        updateInsight = true,
        emitMetrics = true,
      } = options;
      this.state.simTime += dt;
      if (spawn) {
        this.state.spawnAccumulator += this.settings.impressionsPerSecond * dt;
      }
      this.state.bridgeTokens += this.settings.bridgeCapacity * dt;
      if (spawn) {
        this.spawnParticles();
      }
      this.processQueue(dt);
      this.updateParticles(dt);
      this.updateEffects(dt);

      if (!updateUi && !updateInsight && !emitMetrics) {
        return;
      }

      this.state.uiElapsed += dt;
      this.advanceLiveRead(dt);
      this.state.insightElapsed += dt;
      this.state.metricsElapsed += dt;

      if (updateUi && this.state.uiElapsed >= this.config.sim.uiUpdateInterval) {
        this.updateUi();
        this.state.uiElapsed = 0;
      }
      if (updateInsight && this.state.insightElapsed >= this.config.sim.insightInterval) {
        this.updateInsight();
        this.state.insightElapsed = 0;
      }
      if (emitMetrics && this.state.metricsElapsed >= this.config.sim.metricsEventInterval) {
        this.emitMetrics();
        this.state.metricsElapsed = 0;
      }
    }

    advanceLiveRead(dt) {
      if (this.liveReadSlides.length <= 1) {
        return;
      }
      this.state.liveReadElapsed += dt;
      if (this.state.liveReadElapsed < this.config.sim.liveReadInterval) {
        return;
      }
      this.state.liveReadElapsed = 0;
      const nextIndex = (this.state.liveReadIndex + 1) % this.liveReadSlides.length;
      this.state.liveReadIndex = nextIndex;
      this.swapLiveRead(this.liveReadSlides[nextIndex]);
    }

    spawnParticles() {
      let count = Math.floor(this.state.spawnAccumulator);
      if (count <= 0) {
        return;
      }
      count = Math.min(count, 24);
      this.state.spawnAccumulator -= count;

      for (let i = 0; i < count; i += 1) {
        const particle = this.acquireParticle();
        if (!particle) {
          return;
        }
        const { adRect } = this.geometry;
        const x = adRect.x + 16 + this.rng() * (adRect.w - 32);
        const y = adRect.y + 14 + this.rng() * (adRect.h - 28);
        particle.active = true;
        particle.id = this.state.nextParticleId++;
        particle.kind = PARTICLE_KIND.neutral;
        particle.colorKey = PARTICLE_KIND.neutral;
        particle.state = PARTICLE_STATE.impression;
        particle.x = x;
        particle.y = y;
        particle.prevX = x;
        particle.prevY = y;
        particle.vx = 30 + this.rng() * 46;
        particle.vy = -16 + this.rng() * 32;
        particle.alpha = 0.98;
        particle.size = this.config.visuals.particleSize + this.rng() * 1.8;
        particle.age = 0;
        particle.stageAge = 0;
        particle.queueAge = 0;
        particle.queueTag = 0;
        particle.orbitAngle = this.rng() * TAU;
        particle.orbitRadius = 0;
        particle.returnProgress = 0;
        particle.returnBurstFired = false;
        particle.returnStart = null;
        particle.returnControl = null;
        particle.seed = this.rng();
        particle.decisionAt = 0.8 + this.rng() * 0.5;
        particle.loyaltyLocked = false;
        particle.persistentReturn = false;
        particle.dropTarget = null;
        particle.dropOrigin = null;
        particle.dropControl = null;
        this.metrics.impressions += 1;
      }
    }

    acquireParticle() {
      const total = this.particles.length;
      for (let i = 0; i < total; i += 1) {
        const index = (this.particleCursor + i) % total;
        const particle = this.particles[index];
        if (!particle.active) {
          this.particleCursor = (index + 1) % total;
          return particle;
        }
      }
      return null;
    }

    processQueue(dt) {
      const kept = [];
      for (const particle of this.queue) {
        if (!particle.active || particle.state !== PARTICLE_STATE.demoQueue) {
          continue;
        }
        particle.queueAge += dt;
        const patience = this.settings.queuePatience * (0.76 + particle.seed * 0.55);
        if (particle.queueAge > patience && this.rng() < dt * 0.62) {
          this.failParticle(particle, "demoBridge");
        } else {
          kept.push(particle);
        }
      }
      this.queue = kept;

      let cursor = 0;
      while (this.state.bridgeTokens >= 1 && cursor < this.queue.length) {
        const particle = this.queue[cursor];
        if (particle.queueAge < 0.25) {
          cursor += 1;
          continue;
        }
        this.state.bridgeTokens -= 1;
        this.queue.splice(cursor, 1);
        particle.state = PARTICLE_STATE.demoCross;
        particle.stageAge = 0;
        particle.kind = PARTICLE_KIND.engaged;
        particle.colorKey = PARTICLE_KIND.engaged;
        particle.decisionAt = 1.05 + particle.seed * 0.3;
        this.metrics.demoSessions += 1;
        this.addEffect("pulse", this.geometry.demoBridge.x + this.geometry.demoBridge.w * 0.5, this.geometry.demoBridge.y + this.geometry.demoBridge.h * 0.5, "rgba(255,209,102,0.7)", 24, this.config.visuals.pulseLife);
      }

      this.state.peakQueue = Math.max(this.state.peakQueue, this.queue.length);
    }

    updateParticles(dt) {
      let activeCount = 0;
      for (const particle of this.particles) {
        if (!particle.active) {
          continue;
        }
        activeCount += 1;
        particle.prevX = particle.x;
        particle.prevY = particle.y;
        particle.age += dt;
        particle.stageAge += dt;
        switch (particle.state) {
          case PARTICLE_STATE.impression:
            this.updateImpression(particle, dt);
            break;
          case PARTICLE_STATE.signupPool:
            this.updateSignupPool(particle, dt);
            break;
          case PARTICLE_STATE.demoDecision:
            this.updateDemoDecision(particle, dt);
            break;
          case PARTICLE_STATE.demoQueue:
            this.updateDemoQueue(particle, dt);
            break;
          case PARTICLE_STATE.demoCross:
            this.updateDemoCross(particle);
            break;
          case PARTICLE_STATE.purchase:
            this.updatePurchase(particle, dt);
            break;
          case PARTICLE_STATE.loyalty:
            this.updateLoyalty(particle, dt);
            break;
          case PARTICLE_STATE.returnArc:
            this.updateReturnArc(particle, dt);
            break;
          case PARTICLE_STATE.drop:
            this.updateDrop(particle, dt);
            break;
          default:
            break;
        }
      }
      this.state.activeCount = activeCount;
    }

    seek(particle, target, dt, force, damp, maxSpeed) {
      const dx = target.x - particle.x;
      const dy = target.y - particle.y;
      particle.vx += dx * force * dt;
      particle.vy += dy * force * dt;
      particle.vx *= damp;
      particle.vy *= damp;
      const speed = Math.hypot(particle.vx, particle.vy);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        particle.vx *= scale;
        particle.vy *= scale;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }

    updateImpression(particle, dt) {
      const gate = this.geometry.clickGate;
      const target = {
        x: gate.x - gate.r * 0.64 + Math.cos(particle.seed * TAU + particle.stageAge * 1.7) * 14,
        y: gate.y + Math.sin(particle.seed * TAU * 1.3 + particle.stageAge * 2.1) * 16,
      };
      this.seek(particle, target, dt, 1.9, 0.96, 158);
      particle.vx += (particle.seed - 0.5) * 10 * dt;
      particle.vy += Math.sin(particle.age * 3 + particle.seed * 4) * 2.5 * dt;

      if (dist(particle, gate) < gate.r * 0.78 || particle.x > gate.x - 12) {
        if (this.resolveStageTrial("click", this.settings.clickRate)) {
          particle.state = PARTICLE_STATE.signupPool;
          particle.stageAge = 0;
          particle.kind = PARTICLE_KIND.engaged;
          particle.colorKey = PARTICLE_KIND.engaged;
          particle.x = gate.x + gate.r * 0.62;
          particle.y = gate.y + 10;
          particle.vx = 46;
          particle.vy = 34;
          particle.decisionAt = 0;
          this.metrics.clicks += 1;
          this.addEffect("pulse", gate.x, gate.y, "rgba(63,186,247,0.72)", 28, this.config.visuals.pulseLife);
          this.emitStageEnter("click", particle);
        } else {
          this.failParticle(particle, "clickGate");
        }
      }
    }

    updateSignupPool(particle, dt) {
      const pool = this.geometry.signupPool;
      const normX = (particle.x - pool.x) / Math.max(pool.rx - 12, 1);
      const normY = (particle.y - pool.y) / Math.max(pool.ry - 12, 1);
      const insidePool = normX * normX + normY * normY <= 1;
      const drift = insidePool
        ? {
            x: pool.x + Math.cos(particle.age * 2.4 + particle.seed * 11) * 34,
            y: pool.y + Math.sin(particle.age * 2 + particle.seed * 8) * 18 + 16,
          }
        : {
            x: pool.x - pool.rx * 0.2 + Math.cos(particle.age * 1.8 + particle.seed * 7) * 18,
            y: pool.y - pool.ry * 0.08 + Math.sin(particle.age * 1.5 + particle.seed * 5) * 12,
          };
      this.seek(particle, drift, dt, insidePool ? 1.25 : 2.3, insidePool ? 0.92 : 0.9, insidePool ? 116 : 156);
      if (insidePool) {
        if (particle.decisionAt === 0) {
          particle.stageAge = 0;
          particle.decisionAt = 0.9 + particle.seed * 0.6;
          particle.vx *= 0.35;
          particle.vy *= 0.35;
        }
        particle.vx += (this.rng() - 0.5) * 18 * dt;
        particle.vy += 14 * dt;
      } else {
        particle.vx += 18 * dt;
        particle.vy += 20 * dt;
      }

      if (insidePool && particle.decisionAt > 0 && particle.stageAge > particle.decisionAt) {
        if (this.resolveStageTrial("signup", this.settings.signupRate)) {
          this.metrics.signups += 1;
          this.addEffect("pulse", pool.x + 64, pool.y - 28, "rgba(92,225,198,0.7)", 26, this.config.visuals.pulseLife);
          this.addEffect("burst", pool.x + 64, pool.y - 28, "rgba(255,255,255,0.52)", 18, 0.34);
          this.emitStageEnter("signup", particle);
          particle.state = PARTICLE_STATE.demoDecision;
          particle.stageAge = 0;
          particle.decisionAt = 0.48 + particle.seed * 0.36;
          particle.x = pool.x + 64;
          particle.y = pool.y - 28;
          particle.vx = 0;
          particle.vy = 0;
        } else {
          this.addEffect("pulse", pool.x - 18, pool.y + pool.ry - 14, "rgba(152,165,172,0.22)", 16, 0.28);
          this.addEffect("burst", pool.x - 10, pool.y + pool.ry - 10, "rgba(152,165,172,0.2)", 14, 0.24);
          this.failParticle(particle, "signupPool");
        }
      }
    }

    updateDemoDecision(particle, dt) {
      const anchor = this.geometry.demoDecisionAnchor;
      const target = {
        x: anchor.x + Math.cos(particle.age * 2.3 + particle.seed * 9) * 18,
        y: anchor.y + Math.sin(particle.age * 2 + particle.seed * 7) * 10,
      };
      this.seek(particle, target, dt, 2.6, 0.88, 148);
      particle.alpha = 0.98;

      if (particle.stageAge > particle.decisionAt) {
        if (this.resolveStageTrial("demo", this.settings.demoRate)) {
          this.metrics.demos += 1;
          particle.state = PARTICLE_STATE.demoQueue;
          particle.stageAge = 0;
          particle.queueAge = 0;
          particle.queueTag = this.state.nextQueueTag++;
          this.addEffect("pulse", this.geometry.queueAnchor.x - 6, this.geometry.queueAnchor.y - 8, "rgba(78,212,197,0.82)", 22, this.config.visuals.pulseLife);
          this.emitStageEnter("demo", particle);
          this.queue.push(particle);
        } else {
          this.metrics.demoMisses += 1;
          this.addEffect("pulse", anchor.x + 8, anchor.y + 10, "rgba(152,165,172,0.26)", 18, 0.28);
          this.addEffect("burst", anchor.x + 4, anchor.y + 12, "rgba(152,165,172,0.22)", 14, 0.24);
          this.failParticle(particle, "demoBridge");
        }
      }
    }

    updateDemoQueue(particle, dt) {
      const index = this.queue.indexOf(particle);
      const row = Math.floor(Math.max(index, 0) / 6);
      const col = Math.max(index, 0) % 6;
      const target = {
        x: this.geometry.queueAnchor.x - col * 26,
        y: this.geometry.queueAnchor.y + row * 18 - row * 2,
      };
      this.seek(particle, target, dt, 3.8, 0.82, 186);
      particle.alpha = 0.96;
    }

    updateDemoCross(particle) {
      const bridge = this.geometry.demoBridge;
      const duration = 1.08;
      const t = clamp(particle.stageAge / duration, 0, 1);
      const eased = easeInOutSine(t);
      particle.x = lerp(bridge.x - 6, bridge.x + bridge.w + 10, eased);
      particle.y = bridge.y + bridge.h / 2 + Math.sin(particle.age * 12) * 3;
      particle.alpha = 1;

      if (t >= 1) {
        particle.state = PARTICLE_STATE.purchase;
        particle.stageAge = 0;
        particle.decisionAt = 1 + particle.seed * 0.4;
      }
    }

    updatePurchase(particle, dt) {
      const engine = this.geometry.purchaseEngine;
      particle.orbitAngle += dt * (3 + particle.seed * 2.4);
      const radius = lerp(engine.r * 0.72, 10, clamp(particle.stageAge / particle.decisionAt, 0, 1));
      particle.x = engine.x + Math.cos(particle.orbitAngle) * radius;
      particle.y = engine.y + Math.sin(particle.orbitAngle) * radius * 0.82;
      particle.alpha = 0.96;

      if (particle.stageAge > particle.decisionAt) {
        if (this.resolveStageTrial("close", this.settings.closeRate)) {
          particle.state = PARTICLE_STATE.loyalty;
          particle.stageAge = 0;
          particle.kind = PARTICLE_KIND.buyer;
          particle.colorKey = PARTICLE_KIND.buyer;
          particle.orbitAngle = this.rng() * TAU;
          particle.orbitRadius = 26 + particle.seed * 24;
          this.metrics.purchases += 1;
          this.refreshRevenue();
          this.addEffect("burst", engine.x, engine.y, "rgba(255,154,67,0.78)", 38, this.config.visuals.burstLife);
          this.emitStageEnter("purchase", particle);
          this.emitPurchase(particle);
        } else {
          this.failParticle(particle, "purchaseEngine");
        }
      }
    }

    updateLoyalty(particle, dt) {
      const loop = this.geometry.loyaltyLoop;
      if (particle.loyaltyLocked && !this.hasPersistentRepeatLoop()) {
        particle.loyaltyLocked = false;
        particle.stageAge = 0;
      }
      particle.orbitAngle += dt * (1.6 + particle.seed * 1.1 + (particle.loyaltyLocked ? 0.36 : 0));
      particle.x = loop.x + Math.cos(particle.orbitAngle) * particle.orbitRadius;
      particle.y = loop.y + Math.sin(particle.orbitAngle) * particle.orbitRadius * 0.76;
      particle.alpha = particle.loyaltyLocked ? 1 : 0.98;
      if (particle.loyaltyLocked) {
        return;
      }
      const dwell = 1.6 + particle.seed * 0.9;
      if (particle.stageAge > dwell) {
        const persistentRepeat = this.hasPersistentRepeatLoop();
        if (persistentRepeat || this.resolveStageTrial("repeat", this.settings.repeatRate)) {
          particle.state = PARTICLE_STATE.returnArc;
          particle.stageAge = 0;
          particle.kind = PARTICLE_KIND.loyal;
          particle.colorKey = PARTICLE_KIND.loyal;
          particle.returnProgress = 0;
          particle.returnBurstFired = false;
          particle.persistentReturn = persistentRepeat;
          particle.returnStart = { x: particle.x, y: particle.y };
          particle.returnControl = {
            x: this.geometry.returnArcControl.x + (particle.seed - 0.5) * 40,
            y: this.geometry.returnArcControl.y - particle.seed * 26,
          };
          this.metrics.repeats += 1;
          this.refreshRevenue();
          this.addEffect("pulse", loop.x, loop.y, "rgba(255,209,102,0.82)", 26, this.config.visuals.pulseLife);
        } else {
          this.failParticle(particle, "loyaltyLoop");
        }
      }
    }

    updateReturnArc(particle, dt) {
      const end = { x: this.geometry.purchaseEngine.x - 6, y: this.geometry.purchaseEngine.y - 58 };
      if (particle.persistentReturn) {
        const forwardDuration = 1.12;
        const fullDuration = 2.1;
        const forwardShare = forwardDuration / fullDuration;
        particle.returnProgress += dt / fullDuration;
        const t = clamp(particle.returnProgress, 0, 1);
        if (!particle.returnBurstFired && t >= forwardShare) {
          this.addEffect("burst", this.geometry.purchaseEngine.x, this.geometry.purchaseEngine.y - 24, "rgba(255,209,102,0.82)", 28, this.config.visuals.burstLife);
          particle.returnBurstFired = true;
        }
        if (t < forwardShare) {
          const forwardT = clamp(t / forwardShare, 0, 1);
          const point = bezierPoint(particle.returnStart, particle.returnControl, end, forwardT);
          particle.x = point.x;
          particle.y = point.y;
        } else {
          const loop = this.geometry.loyaltyLoop;
          const loyaltySegment = this.getConnectorGeometry().main[4];
          const returnT = clamp((t - forwardShare) / (1 - forwardShare), 0, 1);
          const point = cubicBezierPoint(loyaltySegment.start, loyaltySegment.cp1, loyaltySegment.cp2, loyaltySegment.end, returnT);
          particle.x = point.x;
          particle.y = point.y;
          particle.alpha = 1;
          if (returnT >= 0.999) {
            particle.state = PARTICLE_STATE.loyalty;
            particle.stageAge = 0;
            particle.loyaltyLocked = true;
            particle.persistentReturn = false;
            particle.orbitRadius = clamp(Math.max(particle.orbitRadius, 30 + particle.seed * 18), 24, loop.r - 4);
            particle.orbitAngle = this.rng() * TAU;
            particle.x = loop.x + Math.cos(particle.orbitAngle) * particle.orbitRadius;
            particle.y = loop.y + Math.sin(particle.orbitAngle) * particle.orbitRadius * 0.76;
            this.addEffect("pulse", loop.x, loop.y, "rgba(255,209,102,0.72)", 20, 0.42);
            return;
          }
        }
      } else {
        particle.returnProgress += dt / 1.18;
        const point = bezierPoint(particle.returnStart, particle.returnControl, end, clamp(particle.returnProgress, 0, 1));
        particle.x = point.x;
        particle.y = point.y;
      }
      particle.alpha = 1;
      if (particle.state === PARTICLE_STATE.returnArc && particle.returnProgress >= 1) {
        this.addEffect("burst", this.geometry.purchaseEngine.x, this.geometry.purchaseEngine.y - 24, "rgba(255,209,102,0.82)", 28, this.config.visuals.burstLife);
        if (!particle.persistentReturn) {
          this.releaseParticle(particle);
        }
      }
    }

    updateDrop(particle, dt) {
      const life = this.config.visuals.leakFadeSeconds;
      const t = clamp(particle.stageAge / life, 0, 1);
      const eased = easeInOutSine(t);
      if (particle.dropOrigin && particle.dropControl && particle.dropTarget) {
        const point = bezierPoint(particle.dropOrigin, particle.dropControl, particle.dropTarget, eased);
        particle.x = point.x;
        particle.y = point.y;
      }
      particle.alpha = 0.82 * (1 - t);
      if (t >= 1 || particle.alpha <= 0.02 || particle.y > this.geometry.h + 42) {
        this.releaseParticle(particle);
      }
    }

    failParticle(particle, leakKey) {
      if (particle.state === PARTICLE_STATE.demoQueue) {
        this.queue = this.queue.filter((entry) => entry !== particle);
      }
      particle.state = PARTICLE_STATE.drop;
      particle.stageAge = 0;
      particle.kind = PARTICLE_KIND.leak;
      particle.colorKey = PARTICLE_KIND.leak;
      particle.dropTarget = this.geometry.dropZones[STAGE_KEYS.indexOf(leakKey)];
      particle.dropOrigin = { x: particle.x, y: particle.y };
      particle.dropControl = {
        x: lerp(particle.x, particle.dropTarget.x, 0.32) + (particle.dropTarget.x >= particle.x ? 1 : -1) * (18 + this.rng() * 28),
        y: lerp(particle.y, particle.dropTarget.y, 0.42) + 44 + this.rng() * 26,
      };
      particle.vx = 0;
      particle.vy = 0;
      particle.alpha = 0.92;
      this.metrics.leaks[leakKey] += 1;
      this.addEffect("pulse", particle.x, particle.y, "rgba(124,142,153,0.18)", 10, 0.24);
    }

    releaseParticle(particle) {
      particle.active = false;
      particle.queueTag = 0;
      particle.loyaltyLocked = false;
      particle.persistentReturn = false;
      particle.returnBurstFired = false;
      particle.returnStart = null;
      particle.returnControl = null;
      particle.dropTarget = null;
      particle.dropOrigin = null;
      particle.dropControl = null;
    }

    updateEffects(dt) {
      this.effects = this.effects.filter((effect) => {
        effect.life -= dt;
        return effect.life > 0;
      });
    }

    addEffect(type, x, y, color, size, life) {
      this.effects.push(createEffect(type, x, y, color, size, life));
    }

    drawFrame() {
      const ctx = this.fxCtx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.dom.fxCanvas.width, this.dom.fxCanvas.height);
      this.applyCanvasTransform(ctx);
      this.drawDynamicStage(ctx);
      this.drawParticles(ctx);
      this.drawEffects(ctx);
    }

    drawDynamicStage(ctx) {
      const queueIntensity = clamp(this.queue.length / Math.max(1, this.settings.bridgeCapacity * 2), 0, 1);
      const adRect = this.geometry.adRect;
      const gate = this.geometry.clickGate;
      const pool = this.geometry.signupPool;
      const bridge = this.geometry.demoBridge;
      const engine = this.geometry.purchaseEngine;
      const loop = this.geometry.loyaltyLoop;
      const connectors = this.getConnectorGeometry();
      const decisionAnchor = this.geometry.demoDecisionAnchor;
      const queueAnchor = this.geometry.queueAnchor;
      const poolPortal = { x: pool.x + 64, y: pool.y - 28 };
      const poolOutflow = { x: queueAnchor.x - 8, y: queueAnchor.y - 10 };
      let impressionActive = 0;
      let poolResidents = 0;
      let poolDecisionPressure = 0;
      let demoDecisionActive = 0;
      let demoDecisionPressure = 0;
      let demoBookedActive = 0;
      let purchaseActive = 0;
      let loyaltyActive = 0;
      for (const particle of this.particles) {
        if (particle.active && particle.state === PARTICLE_STATE.impression) {
          impressionActive += 1;
        } else if (particle.active && particle.state === PARTICLE_STATE.signupPool) {
          poolResidents += 1;
          const decisionAge = particle.decisionAt > 0 ? clamp(particle.stageAge / particle.decisionAt, 0, 1) : 0;
          poolDecisionPressure += decisionAge;
        } else if (particle.active && particle.state === PARTICLE_STATE.demoDecision) {
          demoDecisionActive += 1;
          const decisionAge = particle.decisionAt > 0 ? clamp(particle.stageAge / particle.decisionAt, 0, 1) : 0;
          demoDecisionPressure += decisionAge;
        } else if (particle.active && (particle.state === PARTICLE_STATE.demoQueue || particle.state === PARTICLE_STATE.demoCross)) {
          demoBookedActive += 1;
        } else if (particle.active && particle.state === PARTICLE_STATE.purchase) {
          purchaseActive += 1;
        } else if (particle.active && (particle.state === PARTICLE_STATE.loyalty || particle.state === PARTICLE_STATE.returnArc)) {
          loyaltyActive += 1;
        }
      }
      const poolIntensity = clamp(poolResidents / 28, 0, 1);
      const poolDecisionIntensity = poolResidents > 0 ? clamp(poolDecisionPressure / poolResidents, 0, 1) : 0;
      const demoDecisionIntensity = demoDecisionActive > 0 ? clamp(demoDecisionPressure / demoDecisionActive, 0, 1) : 0;
      const demoBookingIntensity = clamp(demoBookedActive / Math.max(1, this.settings.bridgeCapacity * 1.3), 0, 1);
      const purchaseIntensity = clamp(purchaseActive / 12, 0, 1);
      const loyaltyIntensity = clamp(loyaltyActive / 10, 0, 1);
      const repeatSetting = clamp(this.settings.repeatRate, 0, 1);
      const loyaltyLoopDrive = clamp(0.08 + repeatSetting * 0.78 + loyaltyIntensity * 0.26 + purchaseIntensity * 0.18, 0, 1);
      const adCloudIntensity = clamp(impressionActive / 34, 0, 1);
      const gateIntensity = clamp((impressionActive + poolResidents * 0.2) / 36, 0, 1);
      const demoSuccessShare = clamp(this.settings.demoRate, 0.08, 0.92);
      const signupDecisionAlpha = 0.12 + poolDecisionIntensity * 0.12 + demoDecisionIntensity * 0.14;
      const demoStreamAlpha = 0.1 + demoSuccessShare * 0.28 + demoBookingIntensity * 0.18;
      const poolTime = this.state.simTime;
      const connectorStart = connectors.main[0].start;
      const connectorEnd = connectors.main[connectors.main.length - 1].end;
      const connectorFlowIntensity = clamp(
        0.2 + this.settings.impressionsPerSecond / 70 + this.state.activeCount / 260 + queueIntensity * 0.08,
        0.28,
        1
      );
      const flowDotCount = 4;
      const decisionDotCount = 8;
      const successDotCount = Math.max(1, Math.round(decisionDotCount * demoSuccessShare));
      const slotCount = Math.max(4, Math.min(8, this.settings.bridgeCapacity + 2));
      const loyaltyOrbitCount = 1 + Math.round(repeatSetting * 6);
      const loyaltyRibbonCount = 1 + Math.round(repeatSetting * 4);
      const returnPulseCount = 1 + Math.round(repeatSetting * 6);
      const returnCapsuleCount = 1 + Math.round(repeatSetting * 4);

      ctx.save();
      ctx.save();
      roundRect(ctx, adRect.x + 8, adRect.y + 8, adRect.w - 16, adRect.h - 16, 24);
      ctx.clip();
      const adSweepY = adRect.y - 24 + ((poolTime * 58) % (adRect.h + 48));
      const adSweep = ctx.createLinearGradient(adRect.x, adSweepY - 28, adRect.x, adSweepY + 28);
      adSweep.addColorStop(0, "rgba(255,255,255,0)");
      adSweep.addColorStop(0.45, `rgba(255,255,255,${0.08 + adCloudIntensity * 0.08})`);
      adSweep.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = adSweep;
      ctx.fillRect(adRect.x, adRect.y, adRect.w, adRect.h);
      ctx.restore();

      for (let i = 0; i < 3; i += 1) {
        const pulse = (poolTime * (0.56 + i * 0.12) + i * 0.28) % 1;
        const radius = 8 + pulse * 20;
        const x = adRect.x + 42 + i * 58 + Math.sin(poolTime * 0.8 + i) * 3;
        const y = adRect.y + 46 + i * 17;
        ctx.strokeStyle = `rgba(47,153,222,${(1 - pulse) * (0.12 + adCloudIntensity * 0.18)})`;
        ctx.lineWidth = 2.2 - pulse * 0.7;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = `rgba(76,207,181,${0.08 + adCloudIntensity * 0.16})`;
        ctx.beginPath();
        ctx.arc(x, y, 3.6, 0, TAU);
        ctx.fill();
      }
      for (let i = 0; i < 3; i += 1) {
        const cardPhase = poolTime * (0.52 + i * 0.08) + i * 0.7;
        const x = adRect.x + 42 + i * 44 + Math.sin(cardPhase) * 8;
        const y = adRect.y + 96 - i * 12 + Math.cos(cardPhase * 1.2) * 5;
        ctx.globalAlpha = 0.34 + adCloudIntensity * 0.14;
        ctx.fillStyle = i === 1 ? "rgba(76,207,181,0.42)" : "rgba(255,255,255,0.68)";
        drawCapsule(ctx, x, y, 28, 12, -0.1 + Math.sin(cardPhase * 0.8) * 0.12);
        ctx.fill();
        ctx.globalAlpha = 0.86;
        ctx.fillStyle = "rgba(255,255,255,0.84)";
        drawCapsule(ctx, x - 2, y, 10, 2.2, -0.1 + Math.sin(cardPhase * 0.8) * 0.12);
        ctx.fill();
      }

      ctx.globalAlpha = 0.8;
      ctx.fillStyle = `rgba(255, 209, 102, ${0.06 + queueIntensity * 0.12})`;
      roundRect(ctx, bridge.x - 42, bridge.y - 16, bridge.w + 54, bridge.h + 32, 22);
      ctx.fill();
      drawSoftHalo(ctx, gate.x, gate.y, 118, 118, [
        [0, `rgba(63,186,247,${0.08 + gateIntensity * 0.12})`],
        [1, "rgba(63,186,247,0)"],
      ]);
      drawSoftHalo(ctx, pool.x, pool.y, 178, 118, [
        [0, `rgba(92,225,198,${0.08 + poolIntensity * 0.14})`],
        [1, "rgba(92,225,198,0)"],
      ]);
      drawSoftHalo(ctx, bridge.x + bridge.w * 0.5, bridge.y + bridge.h * 0.5, 164, 58, [
        [0, `rgba(255,209,102,${0.08 + queueIntensity * 0.16})`],
        [1, "rgba(255,209,102,0)"],
      ]);
      drawSoftHalo(ctx, engine.x, engine.y, 132, 114, [
        [0, `rgba(255,154,67,${0.08 + purchaseIntensity * 0.14})`],
        [1, "rgba(255,154,67,0)"],
      ]);
      drawSoftHalo(ctx, loop.x, loop.y, 108, 92, [
        [0, `rgba(255,209,102,${0.08 + loyaltyIntensity * 0.14})`],
        [1, "rgba(255,209,102,0)"],
      ]);
      const bridgeSweep = (poolTime * 86) % (bridge.w + 80);
      ctx.save();
      roundRect(ctx, bridge.x, bridge.y, bridge.w, bridge.h, 18);
      ctx.clip();
      const bridgeSheen = ctx.createLinearGradient(bridge.x + bridgeSweep - 70, bridge.y, bridge.x + bridgeSweep, bridge.y + bridge.h);
      bridgeSheen.addColorStop(0, "rgba(255,255,255,0)");
      bridgeSheen.addColorStop(0.55, `rgba(255,255,255,${0.14 + queueIntensity * 0.08})`);
      bridgeSheen.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = bridgeSheen;
      ctx.fillRect(bridge.x, bridge.y, bridge.w, bridge.h);
      ctx.restore();
      for (let i = 0; i < slotCount; i += 1) {
        const x = bridge.x + 18 + (i * (bridge.w - 36)) / Math.max(slotCount - 1, 1);
        const active = i < Math.min(slotCount, Math.ceil(queueIntensity * slotCount + demoBookingIntensity * 2));
        roundRect(ctx, x - 9, bridge.y + bridge.h * 0.5 - 5, 18, 10, 5);
        ctx.fillStyle = active ? "rgba(255,209,102,0.54)" : "rgba(255,255,255,0.26)";
        ctx.fill();
      }
      for (let i = 0; i < 3; i += 1) {
        const t = (poolTime * (0.24 + i * 0.04) + i * 0.22) % 1;
        const x = bridge.x + 14 + t * (bridge.w - 28);
        const y = bridge.y + bridge.h * 0.5 + Math.sin(poolTime * 2.2 + i) * 1.2;
        ctx.globalAlpha = 0.34 + demoBookingIntensity * 0.18;
        ctx.fillStyle = i === 1 ? "rgba(255,209,102,0.58)" : "rgba(255,255,255,0.72)";
        drawCapsule(ctx, x, y, 20, 7, 0);
        ctx.fill();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        drawCapsule(ctx, x + 2, y, 7, 2.4, 0);
        ctx.fill();
      }

      const connectorFlowGradient = ctx.createLinearGradient(connectorStart.x, connectorStart.y, connectorEnd.x, connectorEnd.y);
      connectorFlowGradient.addColorStop(0, "rgba(47,153,222,0.32)");
      connectorFlowGradient.addColorStop(0.28, "rgba(63,186,247,0.34)");
      connectorFlowGradient.addColorStop(0.54, "rgba(76,207,181,0.32)");
      connectorFlowGradient.addColorStop(0.78, "rgba(239,154,78,0.3)");
      connectorFlowGradient.addColorStop(1, "rgba(215,171,68,0.34)");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = connectorFlowGradient;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.08 + connectorFlowIntensity * 0.1;
      ctx.setLineDash([16, 20]);
      ctx.lineDashOffset = -this.state.simTime * (34 + this.state.speed * 7);
      this.traceMainConnector(ctx, connectors.main);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      const connectorDotCount = 3;
      connectors.main.forEach((segment, segmentIndex) => {
        for (let i = 0; i < connectorDotCount; i += 1) {
          const t = (this.state.simTime * (0.18 + segmentIndex * 0.025) + i / connectorDotCount + segmentIndex * 0.14) % 1;
          const point = cubicBezierPoint(segment.start, segment.cp1, segment.cp2, segment.end, t);
          ctx.globalAlpha = 0.18 + connectorFlowIntensity * 0.12;
          ctx.fillStyle = segment.glow;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 7 + connectorFlowIntensity * 2.4, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 0.72 + connectorFlowIntensity * 0.12;
          ctx.fillStyle = segment.color;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2.4 + (i % 2) * 0.5, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 0.84;
          ctx.fillStyle = "rgba(255,255,255,0.82)";
          ctx.beginPath();
          ctx.arc(point.x, point.y, 1, 0, TAU);
          ctx.fill();
        }
      });
      connectors.main.forEach((segment, segmentIndex) => {
        for (let i = 0; i < 2; i += 1) {
          const t = (poolTime * (0.11 + segmentIndex * 0.02) + i * 0.38 + segmentIndex * 0.16) % 1;
          const point = cubicBezierPoint(segment.start, segment.cp1, segment.cp2, segment.end, t);
          const tangent = cubicBezierTangent(segment.start, segment.cp1, segment.cp2, segment.end, t);
          const angle = Math.atan2(tangent.y, tangent.x);
          ctx.globalAlpha = 0.42;
          ctx.fillStyle = segment.color.replace("0.94", "0.22").replace("0.96", "0.24");
          drawCapsule(ctx, point.x, point.y, 16, 6.2, angle);
          ctx.fill();
          ctx.globalAlpha = 0.92;
          ctx.fillStyle = "rgba(255,255,255,0.82)";
          drawCapsule(ctx, point.x, point.y, 6.8, 2.2, angle);
          ctx.fill();
        }
      });
      connectors.main.forEach((segment, segmentIndex) => {
        const pulse = 0.45 + 0.55 * Math.sin(poolTime * 1.8 + segmentIndex * 0.72);
        ctx.globalAlpha = 0.4 + pulse * 0.16;
        ctx.strokeStyle = segment.color.replace("0.94", "0.2").replace("0.96", "0.22");
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(segment.end.x, segment.end.y, 13 + pulse * 3, 0, TAU);
        ctx.stroke();
      });

      for (let i = 0; i < returnPulseCount; i += 1) {
        const t = (poolTime * (0.12 + repeatSetting * 0.07) + i / returnPulseCount + 0.2) % 1;
        const point = bezierPoint(connectors.returnArc.start, connectors.returnArc.control, connectors.returnArc.end, t);
        ctx.globalAlpha = 0.12 + loyaltyLoopDrive * 0.08 + i * 0.01;
        ctx.fillStyle = connectors.returnArc.glow;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6.8 + loyaltyLoopDrive * 2.6, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.7 + loyaltyLoopDrive * 0.18;
        ctx.fillStyle = connectors.returnArc.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2.1 + (i % 2) * 0.45, 0, TAU);
        ctx.fill();
      }
      for (let i = 0; i < returnCapsuleCount; i += 1) {
        const t = (poolTime * (0.11 + repeatSetting * 0.05) + i / returnCapsuleCount + 0.48) % 1;
        const point = bezierPoint(connectors.returnArc.start, connectors.returnArc.control, connectors.returnArc.end, t);
        const tangent = quadraticTangent(connectors.returnArc.start, connectors.returnArc.control, connectors.returnArc.end, t);
        const angle = Math.atan2(tangent.y, tangent.x);
        ctx.globalAlpha = 0.32 + loyaltyLoopDrive * 0.16;
        ctx.fillStyle = "rgba(255,209,102,0.34)";
        drawCapsule(ctx, point.x, point.y, 13 + repeatSetting * 4, 5.2 + loyaltyLoopDrive * 1.1, angle);
        ctx.fill();
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = "rgba(255,255,255,0.86)";
        drawCapsule(ctx, point.x, point.y, 5.8, 2.1, angle);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const gatePulse = 0.6 + 0.4 * Math.sin(this.state.simTime * 4.6);
      ctx.strokeStyle = `rgba(63,186,247,${0.14 + gatePulse * 0.16})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(gate.x, gate.y, gate.r + 18, 0, TAU);
      ctx.stroke();
      const gateScanStart = -Math.PI * 0.78 + ((poolTime * 1.2) % 1) * Math.PI * 1.52;
      ctx.strokeStyle = `rgba(255,255,255,${0.18 + gateIntensity * 0.16})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(gate.x, gate.y, gate.r + 6, gateScanStart, gateScanStart + 0.46);
      ctx.stroke();
      for (let i = -1; i <= 1; i += 1) {
        roundRect(ctx, gate.x - 26 + i * 18, gate.y - 30, 10, 60, 5);
        ctx.fillStyle = `rgba(47,153,222,${0.12 + gateIntensity * 0.12 + (i === 0 ? 0.06 : 0)})`;
        ctx.fill();
      }

      const poolSurfaceGlow = 0.45 + 0.55 * Math.sin(poolTime * 2.2 + 0.4);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(pool.x, pool.y, pool.rx - 4, pool.ry - 4, 0, 0, TAU);
      ctx.clip();

      const poolCoreGlow = ctx.createRadialGradient(pool.x + 18, pool.y + 6, 16, pool.x + 18, pool.y + 6, pool.rx + 10);
      poolCoreGlow.addColorStop(0, `rgba(255,255,255,${0.06 + poolDecisionIntensity * 0.1})`);
      poolCoreGlow.addColorStop(0.48, `rgba(92,225,198,${0.06 + poolIntensity * 0.12})`);
      poolCoreGlow.addColorStop(1, "rgba(92,225,198,0)");
      ctx.fillStyle = poolCoreGlow;
      ctx.fillRect(pool.x - pool.rx - 20, pool.y - pool.ry - 20, pool.rx * 2 + 40, pool.ry * 2 + 40);

      const poolSheen = ctx.createLinearGradient(
        pool.x - pool.rx,
        pool.y - pool.ry + Math.sin(poolTime * 0.9) * 12,
        pool.x + pool.rx,
        pool.y + pool.ry + Math.sin(poolTime * 0.9) * 12
      );
      poolSheen.addColorStop(0, "rgba(255,255,255,0)");
      poolSheen.addColorStop(0.24, `rgba(255,255,255,${0.03 + poolIntensity * 0.04})`);
      poolSheen.addColorStop(0.58, `rgba(255,255,255,${0.06 + poolIntensity * 0.06 + poolSurfaceGlow * 0.05})`);
      poolSheen.addColorStop(1, `rgba(92,225,198,${0.03 + poolIntensity * 0.08})`);
      ctx.fillStyle = poolSheen;
      ctx.fillRect(pool.x - pool.rx - 18, pool.y - pool.ry - 18, pool.rx * 2 + 36, pool.ry * 2 + 36);

      for (let i = 0; i < 3; i += 1) {
        const phase = poolTime * (1.15 + i * 0.22) + i * 1.6;
        ctx.strokeStyle = `rgba(92,225,198,${0.08 + poolIntensity * 0.08 + i * 0.02})`;
        ctx.lineWidth = 1.6 + i * 0.45;
        ctx.beginPath();
        ctx.ellipse(
          pool.x + Math.cos(phase * 0.72) * (8 + i * 5),
          pool.y + 12 + Math.sin(phase) * (4 + poolIntensity * 5),
          pool.rx * (0.56 + i * 0.12),
          10 + i * 6 + Math.cos(phase * 0.82) * 2.2,
          Math.sin(phase * 0.35) * 0.08,
          0,
          TAU
        );
        ctx.stroke();
      }

      const signupLanes = [
        {
          start: { x: pool.x - pool.rx + 18, y: pool.y - 20 },
          control: { x: pool.x - 24, y: pool.y - 54 },
          end: poolPortal,
        },
        {
          start: { x: pool.x - pool.rx + 30, y: pool.y + 10 },
          control: { x: pool.x - 10, y: pool.y + 22 },
          end: poolPortal,
        },
        {
          start: { x: pool.x - 18, y: pool.y + 34 },
          control: { x: pool.x + 26, y: pool.y + 6 },
          end: poolPortal,
        },
      ];

      ctx.lineCap = "round";
      ctx.setLineDash([10, 14]);
      ctx.lineDashOffset = -poolTime * 28;
      signupLanes.forEach((lane, index) => {
        ctx.strokeStyle = `rgba(255,255,255,${0.08 + poolIntensity * 0.08 + poolDecisionIntensity * 0.08 - index * 0.01})`;
        ctx.lineWidth = 1.6 + index * 0.35;
        ctx.beginPath();
        ctx.moveTo(lane.start.x, lane.start.y);
        ctx.quadraticCurveTo(lane.control.x, lane.control.y, lane.end.x, lane.end.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      signupLanes.forEach((lane, laneIndex) => {
        for (let i = 0; i < flowDotCount; i += 1) {
          const t = (poolTime * (0.24 + laneIndex * 0.05) + i / flowDotCount + laneIndex * 0.17) % 1;
          const point = bezierPoint(lane.start, lane.control, lane.end, t);
          const radius = 2.6 + laneIndex * 0.45 + (i % 2) * 0.4;
          ctx.fillStyle = `rgba(255,255,255,${0.16 + poolDecisionIntensity * 0.16 + poolIntensity * 0.08})`;
          ctx.beginPath();
          ctx.arc(point.x, point.y, radius, 0, TAU);
          ctx.fill();
        }
      });
      for (let i = 0; i < 2; i += 1) {
        const phase = poolTime * (0.8 + i * 0.12) + i * 1.4;
        ctx.strokeStyle = `rgba(255,255,255,${0.08 + poolIntensity * 0.08})`;
        ctx.lineWidth = 1.3 + i * 0.3;
        ctx.beginPath();
        ctx.ellipse(
          pool.x + Math.sin(phase) * 12,
          pool.y + 6 + Math.cos(phase * 1.1) * 5,
          pool.rx * (0.24 + i * 0.08),
          pool.ry * (0.1 + i * 0.02),
          Math.sin(phase) * 0.18,
          0,
          TAU
        );
        ctx.stroke();
      }
      ctx.restore();

      const signupDecisionControl = {
        x: lerp(poolPortal.x, decisionAnchor.x, 0.48),
        y: poolPortal.y - 34 - demoDecisionIntensity * 18,
      };

      for (let i = 0; i < flowDotCount; i += 1) {
        const t = (poolTime * 0.28 + i / flowDotCount + 0.12) % 1;
        const point = bezierPoint(
          { x: poolPortal.x + 10, y: poolPortal.y - 2 },
          signupDecisionControl,
          decisionAnchor,
          t
        );
        ctx.fillStyle = `rgba(92,225,198,${0.2 + demoDecisionIntensity * 0.18})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3.1 + demoDecisionIntensity * 0.4 + (i % 2) * 0.5, 0, TAU);
        ctx.fill();
      }

      const decisionPulse = 0.38 + 0.62 * Math.sin(poolTime * 2.8 + 0.6);
      ctx.strokeStyle = `rgba(78,212,197,${0.14 + demoDecisionIntensity * 0.18 + decisionPulse * 0.08})`;
      ctx.lineWidth = 3.1;
      ctx.beginPath();
      ctx.arc(decisionAnchor.x, decisionAnchor.y, 12 + decisionPulse * 4, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.1 + demoDecisionIntensity * 0.08})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(decisionAnchor.x, decisionAnchor.y, 7 + decisionPulse * 2, 0, TAU);
      ctx.stroke();

      const successLaneControl = {
        x: lerp(decisionAnchor.x, poolOutflow.x, 0.5),
        y: decisionAnchor.y - 40 - demoBookingIntensity * 18,
      };
      ctx.strokeStyle = `rgba(92,225,198,${demoStreamAlpha})`;
      ctx.lineWidth = 2.8 + demoSuccessShare * 2.2;
      ctx.setLineDash([12, 16]);
      ctx.lineDashOffset = -poolTime * 36;
      ctx.beginPath();
      ctx.moveTo(decisionAnchor.x + 8, decisionAnchor.y - 2);
      ctx.quadraticCurveTo(successLaneControl.x, successLaneControl.y, poolOutflow.x, poolOutflow.y);
      ctx.stroke();
      ctx.setLineDash([]);

      for (let i = 0; i < successDotCount; i += 1) {
        const t = (poolTime * 0.3 + i / Math.max(successDotCount, 1) + 0.14) % 1;
        const point = bezierPoint(
          { x: decisionAnchor.x + 8, y: decisionAnchor.y - 2 },
          successLaneControl,
          poolOutflow,
          t
        );
        ctx.fillStyle = `rgba(92,225,198,${0.22 + demoSuccessShare * 0.22 + demoBookingIntensity * 0.14})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3.1 + demoBookingIntensity * 0.4 + (i % 2) * 0.4, 0, TAU);
        ctx.fill();
      }

      const enginePulse = 0.55 + 0.45 * Math.sin(this.state.simTime * 5.8 + 0.6);
      const rotorAngle = poolTime * (1.4 + this.state.speed * 0.08);
      for (let i = 0; i < 6; i += 1) {
        const angle = rotorAngle + i * (TAU / 6);
        ctx.strokeStyle = i % 2 === 0 ? "rgba(255,154,67,0.28)" : "rgba(255,209,102,0.22)";
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.moveTo(engine.x + Math.cos(angle) * 22, engine.y + Math.sin(angle) * 22);
        ctx.lineTo(engine.x + Math.cos(angle) * 46, engine.y + Math.sin(angle) * 46);
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(255,154,67,${0.12 + enginePulse * 0.18})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(engine.x, engine.y, engine.r + 18, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${0.1 + enginePulse * 0.12})`;
      ctx.beginPath();
      ctx.arc(engine.x, engine.y, 18 + enginePulse * 4, 0, TAU);
      ctx.fill();
      for (let i = 0; i < 3; i += 1) {
        const angle = -rotorAngle * 0.7 + i * (TAU / 3);
        const x = engine.x + Math.cos(angle) * 26;
        const y = engine.y + Math.sin(angle) * 18;
        ctx.globalAlpha = 0.24 + purchaseIntensity * 0.18;
        ctx.fillStyle = i === 0 ? "rgba(255,154,67,0.76)" : "rgba(255,223,188,0.82)";
        ctx.beginPath();
        ctx.arc(x, y, 4.6, 0, TAU);
        ctx.fill();
      }

      const loopPulse = 0.42 + 0.58 * Math.sin(this.state.simTime * (3.4 + repeatSetting * 1.4) + 1.2);
      ctx.strokeStyle = `rgba(255,209,102,${0.12 + loopPulse * 0.16 + loyaltyLoopDrive * 0.08})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(loop.x, loop.y, loop.r + 12, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.12 + loopPulse * 0.1 + loyaltyLoopDrive * 0.08})`;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([7, 10]);
      ctx.lineDashOffset = -poolTime * (22 + repeatSetting * 18);
      ctx.beginPath();
      ctx.arc(loop.x, loop.y, loop.r - 12, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < loyaltyRibbonCount; i += 1) {
        const start = poolTime * (0.7 + repeatSetting * 0.9 + i * 0.08) + i * (TAU / loyaltyRibbonCount);
        const span = 0.52 + repeatSetting * 0.34;
        ctx.globalAlpha = 0.32 + loyaltyLoopDrive * 0.18 - i * 0.03;
        ctx.strokeStyle = i % 2 === 0 ? "rgba(255,209,102,0.82)" : "rgba(255,243,209,0.7)";
        ctx.lineWidth = 4.4 + (i % 2) * 0.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(loop.x, loop.y, loop.r - 4 - i * 6, start, start + span);
        ctx.stroke();
      }
      for (let i = 0; i < loyaltyOrbitCount; i += 1) {
        const lane = i % 2;
        const orbitRadius = loop.r - 6 - lane * 10;
        const angle = poolTime * (0.9 + repeatSetting * 0.8 + lane * 0.14) + i * (TAU / loyaltyOrbitCount);
        const x = loop.x + Math.cos(angle) * orbitRadius;
        const y = loop.y + Math.sin(angle) * orbitRadius * 0.88;
        const tangentAngle = angle + Math.PI * 0.5;
        ctx.globalAlpha = 0.14 + loyaltyLoopDrive * 0.12;
        ctx.fillStyle = "rgba(255,209,102,0.54)";
        ctx.beginPath();
        ctx.arc(x, y, 6.2 + lane * 0.6, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.3 + loyaltyLoopDrive * 0.16;
        ctx.fillStyle = lane === 0 ? "rgba(255,209,102,0.36)" : "rgba(255,244,224,0.3)";
        drawCapsule(ctx, x, y, 12 + repeatSetting * 5, 4.2 + lane * 0.4, tangentAngle);
        ctx.fill();
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.arc(x, y, 2 + lane * 0.2, 0, TAU);
        ctx.fill();
      }
      for (let i = 0; i < 2; i += 1) {
        const angle = -poolTime * (1.05 + repeatSetting * 0.8 + i * 0.08) + i * Math.PI;
        const x = loop.x + Math.cos(angle) * (16 + i * 6);
        const y = loop.y + Math.sin(angle) * (11 + i * 4);
        ctx.globalAlpha = 0.18 + loyaltyLoopDrive * 0.14;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        drawCapsule(ctx, x, y, 11 + repeatSetting * 4, 4, angle + 0.4);
        ctx.fill();
      }
      ctx.restore();
    }

    drawParticles(ctx) {
      for (const particle of this.particles) {
        if (!particle.active) {
          continue;
        }
        const style = this.sprites[particle.colorKey] || this.sprites[PARTICLE_KIND.neutral];
        let scale = 1.08;
        if (particle.kind === PARTICLE_KIND.loyal) {
          scale = 1.42;
        } else if (particle.kind === PARTICLE_KIND.buyer) {
          scale = 1.32;
        } else if (particle.kind === PARTICLE_KIND.engaged) {
          scale =
            particle.state === PARTICLE_STATE.demoDecision || particle.state === PARTICLE_STATE.demoQueue || particle.state === PARTICLE_STATE.demoCross
              ? 1.28
              : 1.14;
        } else if (particle.kind === PARTICLE_KIND.leak) {
          scale = 0.94;
        }
        const size = particle.size * scale;
        const pulse = particle.kind === PARTICLE_KIND.leak ? 1 : 0.95 + 0.05 * Math.sin(this.state.simTime * 4.8 + particle.id * 0.37);
        const haloSize = size * (particle.kind === PARTICLE_KIND.leak ? 1.26 : 1.58) * pulse;
        const dx = particle.x - particle.prevX;
        const dy = particle.y - particle.prevY;
        const motion = Math.hypot(dx, dy) || 1;
        const dirX = dx / motion;
        const dirY = dy / motion;
        const angle = motion > 0.2 ? Math.atan2(dy, dx) : 0;
        const stretch = particle.kind === PARTICLE_KIND.leak ? 1 : clamp(1 + motion * 0.042, 1, 1.18);
        const squash = particle.kind === PARTICLE_KIND.leak ? 1 : clamp(1 - (stretch - 1) * 0.46, 0.86, 1);
        const haloRx = haloSize * (particle.kind === PARTICLE_KIND.leak ? 1 : stretch * 0.96);
        const haloRy = haloSize * (particle.kind === PARTICLE_KIND.leak ? 1 : squash * 1.04);
        const bodyRx = size * stretch;
        const bodyRy = size * squash;
        const coreRx = bodyRx * 0.6;
        const coreRy = bodyRy * 0.6;

        ctx.globalAlpha = particle.alpha * (particle.kind === PARTICLE_KIND.leak ? 0.08 : 0.16);
        ctx.fillStyle = style.shadow || "rgba(58,83,93,0.1)";
        ctx.beginPath();
        ctx.ellipse(particle.x + dirX * size * 0.24, particle.y + size * 0.92, size * 0.76, size * 0.42, 0, 0, TAU);
        ctx.fill();

        // Layer each agent as halo + body + core + highlight so it stays legible on busy stages.
        ctx.globalAlpha = particle.alpha * style.haloAlpha;
        ctx.fillStyle = style.glow;
        ctx.beginPath();
        ctx.ellipse(particle.x, particle.y, haloRx, haloRy, angle, 0, TAU);
        ctx.fill();

        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = style.fill;
        ctx.beginPath();
        ctx.ellipse(particle.x, particle.y, bodyRx, bodyRy, angle, 0, TAU);
        ctx.fill();

        ctx.fillStyle = style.core;
        ctx.beginPath();
        ctx.ellipse(particle.x, particle.y, coreRx, coreRy, angle, 0, TAU);
        ctx.fill();

        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = Math.max(1.1, size * 0.24);
        ctx.beginPath();
        ctx.ellipse(particle.x, particle.y, bodyRx, bodyRy, angle, 0, TAU);
        ctx.stroke();

        ctx.globalAlpha = particle.alpha * (particle.kind === PARTICLE_KIND.leak ? 0.52 : 0.8);
        ctx.strokeStyle = style.ring;
        ctx.lineWidth = Math.max(0.9, size * 0.13);
        ctx.beginPath();
        ctx.ellipse(particle.x, particle.y, bodyRx * 1.18, bodyRy * 1.18, angle, 0, TAU);
        ctx.stroke();

        ctx.globalAlpha = particle.alpha * (particle.kind === PARTICLE_KIND.leak ? 0.36 : 0.74);
        ctx.fillStyle = style.highlight;
        ctx.beginPath();
        ctx.arc(particle.x - size * 0.34 + dirX * size * 0.14, particle.y - size * 0.36 + dirY * size * 0.08, size * 0.28, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = particle.alpha * (particle.kind === PARTICLE_KIND.leak ? 0.18 : 0.38);
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(particle.x + dirX * size * 0.18, particle.y + dirY * size * 0.18, size * 0.24, 0, TAU);
        ctx.stroke();

        if (particle.kind === PARTICLE_KIND.buyer || particle.kind === PARTICLE_KIND.loyal) {
          ctx.globalAlpha = particle.alpha * 0.42;
          ctx.strokeStyle = style.ring;
          ctx.lineWidth = Math.max(0.9, size * 0.11);
          ctx.beginPath();
          ctx.arc(particle.x + dirX * size * 0.26, particle.y + dirY * size * 0.26, size * 0.46, 0, TAU);
          ctx.stroke();
          ctx.globalAlpha = particle.alpha * 0.28;
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(particle.x - size * 0.12, particle.y);
          ctx.lineTo(particle.x + size * 0.12, particle.y);
          ctx.moveTo(particle.x, particle.y - size * 0.12);
          ctx.lineTo(particle.x, particle.y + size * 0.12);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    drawEffects(ctx) {
      for (const effect of this.effects) {
        const t = clamp(effect.life / effect.maxLife, 0, 1);
        ctx.globalAlpha = t;
        if (effect.type === "pulse") {
          ctx.fillStyle = effect.color;
          ctx.globalAlpha = t * 0.16;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.size * (1.08 - t * 0.18), 0, TAU);
          ctx.fill();
          ctx.globalAlpha = t;
          ctx.strokeStyle = effect.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.size * (1.4 - t * 0.4), 0, TAU);
          ctx.stroke();
          ctx.globalAlpha = t * 0.42;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.size * (1.9 - t * 0.32), 0, TAU);
          ctx.stroke();
        } else if (effect.type === "burst") {
          ctx.fillStyle = effect.color;
          ctx.globalAlpha = t * 0.18;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.size * (0.44 + (1 - t) * 0.16), 0, TAU);
          ctx.fill();
          ctx.globalAlpha = t;
          ctx.strokeStyle = effect.color;
          ctx.lineWidth = 2;
          for (let i = 0; i < 8; i += 1) {
            const angle = (i / 8) * TAU;
            const radius = effect.size * (1 - t * 0.65);
            ctx.beginPath();
            ctx.moveTo(effect.x + Math.cos(angle) * radius * 0.35, effect.y + Math.sin(angle) * radius * 0.35);
            ctx.lineTo(effect.x + Math.cos(angle) * radius, effect.y + Math.sin(angle) * radius);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    getBottleneck() {
      let key = "clickGate";
      let value = -1;
      for (const entry of STAGE_KEYS) {
        if (this.metrics.leaks[entry] > value) {
          value = this.metrics.leaks[entry];
          key = entry;
        }
      }
      const copyMap = {
        clickGate: "Most future revenue is dying before engagement happens.",
        signupPool: "Interest exists, but too few prospects are making it through onboarding.",
        demoBridge: "The queue is proving that capacity can become a revenue leak on its own.",
        purchaseEngine: "Qualified demand is arriving, but close friction is still large.",
        loyaltyLoop: "Acquisition is working better than retention and repeat behavior.",
      };
      return { key, value, copy: copyMap[key] };
    }

    getHeroNarrative(bottleneckKey, ctr, closeRate) {
      if (bottleneckKey === "demoBridge") {
        return "The bridge is now the choke point. Marketing is feeding more demand than demos can absorb.";
      }
      if (bottleneckKey === "purchaseEngine") {
        return "Traffic is making it deeper into the funnel, but the close stage is still thinning revenue sharply.";
      }
      if (bottleneckKey === "loyaltyLoop") {
        return "First purchases are happening, but the repeat loop is still fragile.";
      }
      if (ctr < this.settings.clickRate * 0.8) {
        return "The click gate is filtering most of the traffic before downstream conversion can even matter.";
      }
      if (closeRate > 0.22) {
        return "Upstream friction is easing enough that downstream revenue is starting to compound.";
      }
      return "The click gate remains the largest visible leak in the current run.";
    }

    getLiveReadSlides(bottleneckKey) {
      const slideMap = {
        clickGate: [
          "Most traffic is leaking at the click gate.",
          "Too few visitors are turning into engaged prospects.",
          "Every extra click feeds all later stages.",
          "This is still the highest-leverage fix.",
        ],
        signupPool: [
          "Signup friction is starving the bridge.",
          "Interest is arriving, but onboarding is thinning it.",
          "More clean exits here would lift demo flow.",
          "The pool is now the clearest conversion drag.",
        ],
        demoBridge: [
          "The demo bridge is the active choke point.",
          "Booked prospects are queueing before sales.",
          "Capacity is limiting progress more than traffic.",
          "A wider bridge would cut downstream churn.",
        ],
        purchaseEngine: [
          "Closing is the next multiplier to fix.",
          "Qualified demand is reaching the sales stage.",
          "Too many strong prospects still stall before purchase.",
          "Better closes would amplify revenue fast.",
        ],
        loyaltyLoop: [
          "Repeat revenue is still a thin gold loop.",
          "First purchases are landing, but loyalty is light.",
          "A wider return loop would compound revenue.",
          "Retention is the next layer of growth.",
        ],
      };
      return slideMap[bottleneckKey] || slideMap.clickGate;
    }

    syncLiveReadSlides(slides) {
      const nextSlides = slides.filter(Boolean).slice(0, 5);
      if (nextSlides.length === 0) {
        return;
      }
      const currentKey = this.liveReadSlides.join("|");
      const nextKey = nextSlides.join("|");
      this.liveReadSlides = nextSlides;
      if (currentKey === nextKey) {
        return;
      }
      this.state.liveReadIndex = 0;
      this.state.liveReadElapsed = 0;
      this.swapLiveRead(nextSlides[0], { immediate: true });
    }

    swapLiveRead(text, { immediate = false } = {}) {
      const el = this.dom.heroNarrative;
      if (!el) {
        return;
      }
      if (this.liveReadSwapTimer) {
        clearTimeout(this.liveReadSwapTimer);
        this.liveReadSwapTimer = null;
      }
      if (immediate || !el.textContent) {
        el.classList.remove("is-swapping");
        el.textContent = text;
        return;
      }
      if (el.textContent === text) {
        return;
      }
      el.classList.add("is-swapping");
      this.liveReadSwapTimer = window.setTimeout(() => {
        el.textContent = text;
        el.classList.remove("is-swapping");
        this.liveReadSwapTimer = null;
      }, 180);
    }

    getStageNarrative(bottleneckKey) {
      switch (bottleneckKey) {
        case "clickGate":
          return "Most particles are bouncing off the click gate. Small CTR gains here would feed every later stage.";
        case "signupPool":
          return "Prospects are entering the pool, but too few are finding the signup portal before they sink away.";
        case "demoBridge":
          return "Signup volume is arriving faster than demo capacity can move it, so queue friction is creating churn.";
        case "purchaseEngine":
          return "The funnel is healthy enough to produce demos, but the purchase engine is still dissolving too many leads.";
        case "loyaltyLoop":
          return "First purchases are happening, but the loop back to repeat revenue remains thin and inconsistent.";
        default:
          return "Neutral particles start as impressions, blue particles have progressed, orange particles have purchased, and gold particles are returning buyers.";
      }
    }

    getObservedRates() {
      const resolvedCtr = this.metrics.clicks + this.metrics.leaks.clickGate;
      const resolvedSignup = this.metrics.signups + this.metrics.leaks.signupPool;
      const resolvedDemo = this.metrics.demos + this.metrics.demoMisses;
      const resolvedClose = this.metrics.purchases + this.metrics.leaks.purchaseEngine;
      const resolvedRepeat = this.metrics.repeats + this.metrics.leaks.loyaltyLoop;

      return {
        ctr: resolvedCtr > 0 ? ratio(this.metrics.clicks, resolvedCtr) : ratio(this.metrics.clicks, this.metrics.impressions),
        signupRate:
          resolvedSignup > 0 ? ratio(this.metrics.signups, resolvedSignup) : ratio(this.metrics.signups, this.metrics.clicks),
        demoRate: resolvedDemo > 0 ? ratio(this.metrics.demos, resolvedDemo) : ratio(this.metrics.demos, this.metrics.signups),
        closeRate:
          resolvedClose > 0 ? ratio(this.metrics.purchases, resolvedClose) : ratio(this.metrics.purchases, this.metrics.demoSessions),
        repeatRate:
          resolvedRepeat > 0 ? ratio(this.metrics.repeats, resolvedRepeat) : ratio(this.metrics.repeats, this.metrics.purchases),
      };
    }

    updateUi(force = false) {
      if (!force && this.state.uiElapsed < this.config.sim.uiUpdateInterval) {
        return;
      }
      this.refreshRevenue();
      const progress = clamp(this.state.simTime / this.config.sim.runDuration, 0, 1);
      const { ctr, signupRate, demoRate, closeRate, repeatRate } = this.getObservedRates();
      const bottleneck = this.getBottleneck();
      const repeatsPerImpression = ratio(this.metrics.repeats, this.metrics.impressions);
      const revenuePerThousand = ratio(this.metrics.revenue, Math.max(this.metrics.impressions, 1)) * 1000;
      const demoHeldRate = ratio(this.metrics.demoSessions, this.metrics.demos);
      const repeatRevenue = this.metrics.repeats * this.settings.repeatValue;
      const repeatRevenueShare = ratio(repeatRevenue, this.metrics.revenue);
      const displayTime = Math.min(this.state.simTime, this.config.sim.runDuration);

      this.dom.progressFill.style.width = `${(progress * 100).toFixed(2)}%`;
      this.dom.clockLabel.textContent = formatClock(displayTime, this.config.sim.runDuration);
      this.dom.metricImpressions.textContent = whole(this.metrics.impressions);
      this.dom.metricClicks.textContent = whole(this.metrics.clicks);
      this.dom.metricSignups.textContent = whole(this.metrics.signups);
      this.dom.metricDemos.textContent = whole(this.metrics.demos);
      this.dom.metricPurchases.textContent = whole(this.metrics.purchases);
      this.dom.metricRepeats.textContent = whole(this.metrics.repeats);
      this.dom.metricRevenue.textContent = money(this.metrics.revenue);
      this.dom.actualCtr.textContent = pct(ctr);
      this.dom.actualSignup.textContent = pct(signupRate);
      this.dom.actualDemo.textContent = pct(demoRate);
      this.dom.actualClose.textContent = pct(closeRate);
      this.dom.actualRepeat.textContent = pct(repeatRate);
      this.dom.bottleneckTitle.textContent = stageLabel(bottleneck.key);
      this.dom.bottleneckCopy.textContent = bottleneck.copy;
      this.dom.multiplierValue.textContent = pct(repeatsPerImpression);
      this.dom.multiplierCopy.textContent = `${pct(ratio(this.metrics.purchases, this.metrics.impressions))} of impressions became first-time buyers.`;
      this.dom.queueValue.textContent = `${whole(this.queue.length)} waiting`;
      this.dom.queueCopy.textContent =
        this.queue.length > this.settings.bridgeCapacity * 2
          ? "The demo bridge is now capacity-bound, so some prospects are dying while they wait."
          : "Demo capacity is still keeping up with demand.";
      this.dom.efficiencyValue.textContent = money(revenuePerThousand);
      this.dom.efficiencyCopy.textContent = `Peak queue reached ${whole(this.state.peakQueue)} prospects in this run.`;
      this.dom.demoHeldValue.textContent = pct(demoHeldRate);
      this.dom.demoHeldCopy.textContent =
        this.metrics.demos === 0
          ? "No booked demos have reached session completion yet."
          : demoHeldRate < 0.75
            ? "Bridge throughput is leaving too many booked demos unresolved before they can be held."
            : "Most booked demos are clearing into real sessions without much bridge loss.";
      this.dom.repeatRevenueValue.textContent = pct(repeatRevenueShare);
      this.dom.repeatRevenueCopy.textContent =
        this.metrics.revenue <= 0
          ? "Repeat buyers have not contributed revenue yet."
          : repeatRevenueShare < 0.2
            ? "Revenue is still dominated by first purchases rather than returning buyers."
            : `${money(repeatRevenue)} of revenue is now coming from repeat purchases.`;

      STAGE_KEYS.forEach((key, index) => {
        const value = this.metrics.leaks[key];
        const maxLeak = Math.max(...STAGE_KEYS.map((entry) => this.metrics.leaks[entry]), 1);
        this.dom.leakLabels[index].textContent = `${whole(value)} lost`;
        this.dom.leakFills[index].style.width = `${(value / maxLeak) * 100}%`;
      });
      const bucket = Math.floor(progress * 6);
      if (bucket !== this.state.accessibilityBucket || force) {
        this.state.accessibilityBucket = bucket;
        this.dom.ariaLive.textContent =
          `Run progress ${Math.round(progress * 100)} percent. ${whole(this.metrics.impressions)} impressions, ` +
          `${whole(this.metrics.purchases)} purchases, ${whole(this.metrics.repeats)} repeat purchases, current bottleneck ${stageLabel(bottleneck.key)}.`;
      }
    }

    updateInsight() {
      const bottleneck = this.getBottleneck();
      const { ctr, signupRate, closeRate, repeatRate } = this.getObservedRates();
      const messages = {
        clickGate: {
          title: "Most traffic is leaking at the click gate.",
          body: `Only ${pct(ctr)} of resolved click-gate outcomes have become clicks so far. A small CTR gain compounds through every later stage.`,
        },
        signupPool: {
          title: "Signup friction is starving the bridge.",
          body: `The pool is collecting prospects, but only ${pct(signupRate)} of resolved signup-pool outcomes are turning into signups.`,
        },
        demoBridge: {
          title: "The demo bridge is now overloaded.",
          body: `${whole(this.queue.length)} prospects are currently waiting, and delayed prospects are starting to churn before the sales stage.`,
        },
        purchaseEngine: {
          title: "Closing is the next multiplier to fix.",
          body: `The current close rate is ${pct(closeRate)} across resolved purchase outcomes. Better sales conversion would lift both revenue and repeat potential.`,
        },
        loyaltyLoop: {
          title: "Repeat revenue is the thinnest gold stream.",
          body: `${pct(repeatRate)} of resolved loyalty outcomes are coming back in this run. Retention work would widen the loyalty loop.`,
        },
      };
      const message = messages[bottleneck.key];
      this.syncLiveReadSlides(this.getLiveReadSlides(bottleneck.key, { ctr, signupRate, closeRate, repeatRate }));
      if (!this.dom.heroNarrative.textContent) {
        this.swapLiveRead(message.title, { immediate: true });
      }
    }

    showSummary() {
      const purchaseYield = ratio(this.metrics.purchases, this.metrics.impressions);
      const repeatYield = ratio(this.metrics.repeats, this.metrics.purchases);
      const bottleneck = this.getBottleneck();
      this.dom.summaryTitle.textContent =
        purchaseYield > 0.02
          ? "The funnel produced buyers, but the leak pattern still tells you where the next growth comes from."
          : "Small leaks compounded into a very thin buyer stream.";
      this.dom.summaryLead.textContent =
        `Out of ${whole(this.metrics.impressions)} impressions, ${whole(this.metrics.purchases)} reached purchase and ` +
        `${whole(this.metrics.repeats)} returned to buy again. The largest leak formed at ${stageLabel(bottleneck.key)}.`;
      this.dom.summaryPeakQueue.textContent = whole(this.state.peakQueue);
      this.dom.summaryPurchaseYield.textContent = pct(purchaseYield);
      this.dom.summaryRepeatYield.textContent = pct(repeatYield);
      this.dom.summaryRevenue.textContent = money(this.metrics.revenue);
      this.dom.summaryFoot.textContent =
        `Replay to run the current settings again. Peak queue in this run: ${whole(this.state.peakQueue)}.`;
      this.dom.summaryBackdrop.hidden = false;
      this.state.summaryVisible = true;
      this.emit("summary", { metrics: this.snapshotMetrics(), bottleneck: bottleneck.key });
      if (typeof this.callbacks.onSummary === "function") {
        this.callbacks.onSummary(this.snapshotMetrics());
      }
    }

    hideSummary() {
      this.dom.summaryBackdrop.hidden = true;
      this.state.summaryVisible = false;
      this.syncEmbedHeight();
    }

    snapshotMetrics() {
      this.refreshRevenue();
      return {
        seed: this.state.seed,
        time: this.state.simTime,
        speed: this.state.speed,
        settings: { ...this.settings },
        observedRates: this.getObservedRates(),
        metrics: {
          ...this.metrics,
          leaks: { ...this.metrics.leaks },
        },
      };
    }

    emit(name, detail) {
      this.dispatchEvent(new CustomEvent(name, { detail }));
      this.root.dispatchEvent(new CustomEvent(`customerflow:${name}`, { detail }));
    }

    emitStageEnter(stageName, particle) {
      const detail = { stageName, particleId: particle.id, time: this.state.simTime };
      this.emit("stageenter", detail);
      if (typeof this.callbacks.onStageEnter === "function") {
        this.callbacks.onStageEnter(detail);
      }
    }

    emitPurchase(particle) {
      this.refreshRevenue();
      const detail = { particleId: particle.id, time: this.state.simTime, revenue: this.metrics.revenue };
      this.emit("purchase", detail);
      if (typeof this.callbacks.onPurchase === "function") {
        this.callbacks.onPurchase(detail);
      }
    }

    emitMetrics() {
      const snapshot = this.snapshotMetrics();
      this.emit("metrics", snapshot);
      if (typeof this.callbacks.onMetricsUpdate === "function") {
        this.callbacks.onMetricsUpdate(snapshot);
      }
    }
  }

  window.CustomerFlowEngine = CustomerFlowEngine;

  const root = document.getElementById("widgetRoot");
  if (root) {
    window.customerFlowEngine = new CustomerFlowEngine(root);
  }
})();
