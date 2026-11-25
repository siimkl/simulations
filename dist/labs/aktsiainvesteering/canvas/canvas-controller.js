(() => {
  const ns = window.StockCanvasViews = window.StockCanvasViews || {};
  const VIEW_KEYS = ["classic", "orb"];
  const TRANSITION_MS = 360;
  const PHASE_MS = TRANSITION_MS / 2;
  const MAX_DPR = 2;
  const EPSILON = 1e-6;
  const formatterCache = new Map();

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function ease(value) {
    const t = clamp(value, 0, 1);
    return 1 - Math.pow(1 - t, 3);
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / Math.max(edge1 - edge0, EPSILON), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function formatCurrency(value, currency, options = {}) {
    const digits = Object.prototype.hasOwnProperty.call(options, "digits") ? options.digits : 0;
    const compact = !!options.compact;
    const key = `${currency}|${digits}|${compact}`;
    if (!formatterCache.has(key)) {
      formatterCache.set(key, new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        notation: compact ? "compact" : "standard",
        minimumFractionDigits: compact ? 0 : digits,
        maximumFractionDigits: digits
      }));
    }
    const formatter = formatterCache.get(key);
    const text = formatter.format(Math.abs(value));
    if (value < 0) return `-${text}`;
    if (options.signed && value > 0) return `+${text}`;
    return text;
  }

  function formatPercent(value, digits = 1, signed = true) {
    const absValue = Math.abs(value).toFixed(digits);
    if (value < 0) return `-${absValue}%`;
    if (signed && value > 0) return `+${absValue}%`;
    return `${absValue}%`;
  }

  function stageRevealWindow(index, total) {
    if (total <= 2) return index === 0 ? [0.02, 0.34] : [0.42, 0.82];
    return [[0.02, 0.26], [0.30, 0.62], [0.66, 0.96]][index] || [0, 1];
  }

  function stagePositions(total, width, inset) {
    const left = inset;
    const right = width - inset;
    const span = right - left;
    if (total <= 2) return [left + span * 0.28, left + span * 0.72];
    return [left + span * 0.16, left + span * 0.50, left + span * 0.84];
  }

  function classifyStage(stage, derived) {
    if (stage.key === "buy") return "buy";
    if (stage.netProfit < -EPSILON || stage.price + EPSILON < derived.breakEvenPrice) return "stressed";
    if (Math.abs(stage.netProfit) <= Math.max(derived.investmentValue, 1) * 0.02) return "neutral";
    return stage.key === "predicted" ? "strong" : "steady";
  }

  function cubicPoint(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
    };
  }

  function buildSharedModel(data) {
    if (!data) return null;
    const stages = data.stages.map((stage) => ({ ...stage }));
    const current = data.metrics.current;
    const predicted = data.metrics.predicted || current;
    const buy = stages.find((stage) => stage.key === "buy") || stages[0];
    const currentStage = stages.find((stage) => stage.key === "current") || stages[0];
    const projectedStage = stages.find((stage) => stage.key === "predicted") || currentStage;
    const values = stages.map((stage) => stage.netValue).concat([data.metrics.totalInvestment, 0]);
    const profits = stages.map((stage) => stage.netProfit).concat([current.netProfit, predicted.netProfit, 0]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const maxAbsValue = Math.max(...values.map((value) => Math.abs(value)), 1);
    const maxAbsProfit = Math.max(...profits.map((value) => Math.abs(value)), 1);
    const valueSpan = Math.max(maxValue - minValue, maxAbsValue * 0.28, 1);
    return {
      inputs: data.inputs,
      stages,
      stageCount: stages.length,
      domain: { ...data.domain },
      investmentValue: data.metrics.totalInvestment,
      currentNetValue: current.netValue,
      projectedNetValue: predicted.netValue,
      breakEvenPrice: data.metrics.breakEvenPrice,
      breakEvenValue: data.metrics.breakEvenPrice,
      currentProfit: current.netProfit,
      projectedProfit: predicted.netProfit,
      currentReturn: current.roiPercent,
      projectedReturn: predicted.roiPercent,
      totalFees: data.metrics.totalFees,
      visual: {
        minValue,
        maxValue,
        maxAbsValue,
        maxAbsProfit,
        valueSpan,
        buyRatio: clamp(buy.netValue / Math.max(maxValue, 1), 0, 1),
        currentRatio: clamp(current.netValue / Math.max(maxValue, 1), 0, 1),
        projectedRatio: clamp(predicted.netValue / Math.max(maxValue, 1), 0, 1),
        isLoss: currentStage.netProfit < -EPSILON,
        isProfit: projectedStage.netProfit > EPSILON,
        momentum: clamp((projectedStage.netValue - currentStage.netValue) / Math.max(maxAbsValue, 1), -1, 1),
        tension: clamp((data.metrics.breakEvenPrice - data.inputs.currentPrice) / Math.max(Math.abs(data.metrics.breakEvenPrice), 1), -1, 1)
      }
    };
  }

  function buildFrameModel(shared, size, progress, hoverKey, now) {
    if (!shared) return null;
    const mobile = size.width <= 560;
    const compact = size.width <= 768;
    const detail = mobile ? "low" : compact ? "medium" : "high";
    const padding = mobile
      ? { top: 42, right: 16, bottom: 70, left: 16 }
      : compact
        ? { top: 50, right: 24, bottom: 78, left: 24 }
        : { top: 58, right: 36, bottom: 88, left: 36 };
    const plot = {
      left: padding.left,
      top: padding.top,
      right: size.width - padding.right,
      bottom: size.height - padding.bottom
    };
    plot.width = plot.right - plot.left;
    plot.height = plot.bottom - plot.top;

    const minBase = shared.visual.minValue;
    const maxBase = shared.visual.maxValue;
    const span = Math.max(maxBase - minBase, Math.abs(maxBase), 1);
    const ceiling = maxBase + Math.max(span * 0.18, shared.investmentValue * 0.08, 60);
    const floor = minBase - Math.max(span * 0.14, shared.investmentValue * 0.06, 50);
    const valueToY = (value) => plot.bottom - ((value - floor) / Math.max(ceiling - floor, 1)) * plot.height;
    const positions = stagePositions(shared.stageCount, size.width, mobile ? 38 : compact ? 48 : 68);
    const laneY = size.height - (mobile ? 34 : compact ? 38 : 42);
    const horizonY = plot.top + plot.height * 0.2;
    const centerY = plot.top + plot.height * 0.54;
    const breakEvenY = valueToY(shared.investmentValue);
    const expressiveStrength = mobile ? 1.08 : compact ? 1.18 : 1.32;
    const autoFocusKey = progress < 0.34
      ? "buy"
      : progress < (shared.stageCount === 3 ? 0.74 : 0.72)
        ? "current"
        : (shared.stages.some((stage) => stage.key === "predicted") ? "predicted" : "current");

    const stages = shared.stages.map((stage, index) => {
      const [start, end] = stageRevealWindow(index, shared.stageCount);
      const reveal = ease((progress - start) / Math.max(end - start, 0.001));
      const settle = smoothstep(start + (end - start) * 0.5, end + 0.12, progress);
      const finalY = valueToY(stage.netValue);
      const displayY = lerp(laneY - 8, finalY, reveal);
      const normalizedValue = clamp((stage.netValue - floor) / Math.max(ceiling - floor, 1), 0, 1);
      const relativeProfit = clamp(stage.netProfit / Math.max(shared.visual.maxAbsProfit, 1), -1, 1);
      const relativeValue = clamp((stage.netValue - shared.investmentValue) / Math.max(shared.visual.maxAbsValue, 1), -1, 1);
      const dragValue = Math.max(0, stage.totalFees + stage.estimatedTax);
      const boostValue = Math.max(0, stage.dividends);
      const dragRatio = clamp(dragValue / Math.max(shared.investmentValue, 1), 0, 1);
      const boostRatio = clamp(boostValue / Math.max(shared.investmentValue, 1), 0, 1);
      const netShift = stage.netValue - shared.investmentValue;
      const amplifiedRelative = Math.sign(relativeValue) * Math.pow(Math.abs(relativeValue), 0.72);
      const expressiveY = clamp(
        breakEvenY - amplifiedRelative * plot.height * expressiveStrength,
        plot.top + (mobile ? 22 : 26),
        plot.bottom - (mobile ? 18 : 24)
      );
      const visualY = lerp(displayY, expressiveY, 0.82);
      const sizeRatio = clamp((Math.abs(stage.netValue) + shared.investmentValue * 0.12) / Math.max(shared.visual.maxAbsValue + shared.investmentValue * 0.12, 1), 0, 1);
      const radiusBase = mobile ? 18 : compact ? 22 : 26;
      const radius = lerp(radiusBase, mobile ? 30 : compact ? 40 : 50, Math.pow(sizeRatio, 0.78));
      const quality = classifyStage(stage, shared);
      const isHovered = hoverKey === stage.key;
      const hoverBoost = isHovered ? 1 : 0;
      const energy = clamp(
        (quality === "stressed" ? 0.52 : quality === "strong" ? 0.94 : quality === "steady" ? 0.78 : quality === "neutral" ? 0.66 : 0.72)
          + normalizedValue * 0.12
          + hoverBoost * 0.12,
        0.36,
        1.12
      );
      return {
        ...stage,
        index,
        start,
        end,
        x: positions[index],
        finalY,
        displayY,
        reveal,
        settle,
        quality,
        radius,
        hitRadius: radius + (mobile ? 24 : 30),
        isHovered,
        hoverBoost,
        normalizedValue,
        relativeProfit,
        relativeValue,
        dragValue,
        boostValue,
        dragRatio,
        boostRatio,
        netShift,
        energy,
        expressiveY,
        visualY,
        aboveBreakEven: stage.price + EPSILON >= shared.breakEvenPrice,
        breakEvenOffset: stage.price - shared.breakEvenPrice,
        baselineY: breakEvenY,
        columnTop: Math.min(displayY, breakEvenY),
        columnBottom: Math.max(displayY, breakEvenY),
        columnHeight: Math.abs(displayY - breakEvenY),
        visualColumnTop: Math.min(visualY, breakEvenY),
        visualColumnBottom: Math.max(visualY, breakEvenY),
        visualColumnHeight: Math.abs(visualY - breakEvenY),
        gainDirection: netShift >= 0 ? "gain" : "loss"
      };
    });

    const links = stages.slice(0, -1).map((stage, index) => {
      const next = stages[index + 1];
      const fromY = stage.displayY;
      const toY = next.displayY;
      const dx = next.x - stage.x;
      const lift = Math.max(plot.height * 0.08, Math.abs(stage.finalY - next.finalY) * 0.54);
      const midY = next.finalY <= stage.finalY
        ? Math.min(stage.finalY, next.finalY) - lift
        : Math.max(stage.finalY, next.finalY) + lift * 0.56;
      const cp1 = { x: stage.x + dx * 0.34, y: lerp(fromY, midY, 0.9) };
      const cp2 = { x: stage.x + dx * 0.66, y: lerp(toY, midY, 0.9) };
      const start = stage.start + 0.04;
      const end = next.end - 0.02;
      return {
        key: `${stage.key}-${next.key}`,
        index,
        from: stage,
        to: next,
        p0: { x: stage.x, y: fromY },
        cp1,
        cp2,
        p3: { x: next.x, y: toY },
        reveal: ease((progress - start) / Math.max(end - start, 0.001)),
        direction: next.netValue >= stage.netValue ? "up" : "down",
        deltaValue: next.netValue - stage.netValue,
        tension: clamp(Math.abs(next.netValue - stage.netValue) / Math.max(shared.visual.maxAbsValue, 1), 0, 1),
        energy: clamp((stage.energy + next.energy) * 0.5 + (next.netValue >= stage.netValue ? 0.06 : 0), 0.32, 1.08),
        travel: clamp(Math.abs(next.netValue - stage.netValue) / Math.max(shared.visual.valueSpan, 1), 0, 1),
        netDirection: next.netValue >= stage.netValue ? 1 : -1
      };
    });

    const focusStage = stages.find((stage) => stage.key === hoverKey && stage.reveal > 0.16)
      || stages.find((stage) => stage.key === autoFocusKey && stage.reveal > 0.18)
      || stages.find((stage) => stage.reveal > 0.18)
      || stages[0];

    return {
      now,
      progress,
      compact,
      mobile,
      detail,
      width: size.width,
      height: size.height,
      pixelRatio: size.dpr,
      plot,
      laneY,
      horizonY,
      centerY,
      breakEvenY,
      baselineY: breakEvenY,
      floor,
      ceiling,
      valueToY,
      idle: now / 1000,
      derived: shared,
      visual: shared.visual,
      stages,
      links,
      focusStage,
      particleBudget: detail === "low" ? 3 : detail === "medium" ? 5 : 7,
      hazeBudget: detail === "low" ? 2 : detail === "medium" ? 3 : 4
    };
  }

  class CanvasController {
    constructor({ surface, svg, canvas, switcher, buttons, reducedMotion, requestRender }) {
      this.surface = surface;
      this.svg = svg;
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
      this.switcher = switcher;
      this.buttons = buttons || [];
      this.reducedMotion = !!reducedMotion;
      this.requestRender = typeof requestRender === "function" ? requestRender : null;
      this.size = { width: 0, height: 0, dpr: 1 };
      this.hoverStageKey = null;
      this.lastFrame = null;
      this.lastNow = 0;
      this.focusListener = null;
      this.classic = null;
      this.state = {
        activeView: "orb",
        pendingView: null,
        isRunning: false,
        speedMultiplier: 0.5,
        animationProgress: 0,
        transitionPhase: "idle",
        transitionProgress: 1,
        scenarioData: null,
        derived: null
      };
      this.transition = { startedAt: 0, duration: TRANSITION_MS };
      this.transitionTimers = [];
      this.renderers = {
        orb: ns.OrbRenderer ? new ns.OrbRenderer() : null
      };
      this.hidden = document.hidden;
      this.bind();
      this.updateButtons();
      this.applyLayerState();
    }

    bind() {
      this.buttons.forEach((button, index) => {
        button.addEventListener("click", () => this.setView(button.dataset.view || "classic"));
        button.addEventListener("keydown", (event) => this.handleButtonKeydown(event, index));
      });
      this.surface.addEventListener("pointermove", (event) => this.handlePointerMove(event));
      this.surface.addEventListener("pointerleave", () => this.handlePointerLeave());
      document.addEventListener("visibilitychange", () => {
        this.hidden = document.hidden;
        if (this.hidden) {
          this.clearCanvas();
        } else if (this.requestRender) {
          this.requestRender();
        }
      });
    }

    attachClassic(renderer) {
      this.classic = renderer;
      this.syncClassicInteractivity();
    }

    setFocusListener(listener) {
      this.focusListener = listener;
    }

    setReducedMotion(value) {
      this.reducedMotion = !!value;
    }

    setData(data) {
      this.state.scenarioData = data;
      this.state.derived = buildSharedModel(data);
      if (this.classic && typeof this.classic.setData === "function") this.classic.setData(data);
      if (!data) {
        this.lastFrame = null;
        this.hoverStageKey = null;
        this.clearCanvas();
      }
      Object.values(this.renderers).forEach((renderer) => {
        if (renderer && typeof renderer.setData === "function") renderer.setData(this.state.derived);
      });
      this.resize();
    }

    setRuntime({ isRunning, speedMultiplier, animationProgress }) {
      this.state.isRunning = !!isRunning;
      this.state.speedMultiplier = speedMultiplier;
      this.state.animationProgress = animationProgress;
    }

    setView(view) {
      if (!VIEW_KEYS.includes(view)) return;
      const visibleView = this.state.pendingView || this.state.activeView;
      if (view === visibleView && this.state.transitionPhase === "idle") return;
      this.clearTransitionTimers();
      if (this.hidden || this.reducedMotion) {
        this.state.activeView = view;
        this.state.pendingView = null;
        this.state.transitionPhase = "idle";
        this.state.transitionProgress = 1;
        this.updateButtons();
        if (this.requestRender) this.requestRender();
        return;
      }
      this.state.pendingView = view;
      this.state.transitionPhase = "fadingOut";
      this.state.transitionProgress = 0;
      this.transition.startedAt = performance.now();
      this.updateButtons();
      this.transitionTimers.push(setTimeout(() => {
        this.state.activeView = this.state.pendingView || view;
        this.state.pendingView = null;
        this.state.transitionPhase = "fadingIn";
        this.state.transitionProgress = 0;
        this.transition.startedAt = performance.now();
        this.updateButtons();
        if (this.requestRender) this.requestRender();
      }, PHASE_MS));
      this.transitionTimers.push(setTimeout(() => {
        this.state.transitionPhase = "idle";
        this.state.transitionProgress = 1;
        this.updateButtons();
        if (this.requestRender) this.requestRender();
      }, TRANSITION_MS));
      if (this.requestRender) this.requestRender();
    }

    resize() {
      const rect = this.surface.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const dpr = clamp(window.devicePixelRatio || 1, 1, MAX_DPR);
      if (width === this.size.width && height === this.size.height && dpr === this.size.dpr) return;
      this.size = { width, height, dpr };
      this.canvas.width = Math.max(1, Math.round(width * dpr));
      this.canvas.height = Math.max(1, Math.round(height * dpr));
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = true;
      Object.values(this.renderers).forEach((renderer) => {
        if (renderer && typeof renderer.resize === "function") renderer.resize(this.size);
      });
    }

    needsFrames() {
      if (!this.state.derived) return false;
      if (this.state.transitionPhase !== "idle") return true;
      if (this.hidden) return false;
      if (this.state.activeView === "classic") return false;
      return !this.reducedMotion;
    }

    render(now) {
      this.resize();
      this.updateTransition(now);
      this.syncClassicInteractivity();

      const needsClassic = this.state.activeView === "classic" || this.state.pendingView === "classic";
      if (this.classic && needsClassic) {
        this.classic.render(this.state.animationProgress, now);
      }

      if (!this.state.derived) {
        this.applyLayerState();
        this.clearCanvas();
        return;
      }

      const frame = buildFrameModel(this.state.derived, this.size, this.state.animationProgress, this.hoverStageKey, now);
      this.lastFrame = frame;
      const dt = this.lastNow ? Math.max(0, Math.min((now - this.lastNow) / 1000, 0.12)) : 1 / 60;
      this.lastNow = now;

      const phase = this.state.transitionPhase;
      const t = ease(this.state.transitionProgress);
      const drawQueue = [];
      let svgOpacity = 0;
      let canvasOpacity = 0;

      if (phase === "idle") {
        if (this.state.activeView === "classic") {
          svgOpacity = 1;
        } else {
          canvasOpacity = 1;
          drawQueue.push({ view: this.state.activeView, alpha: 1, role: "active" });
        }
      } else if (phase === "fadingOut") {
        const outgoing = this.state.activeView;
        const incoming = this.state.pendingView || outgoing;
        if (outgoing === "classic") {
          svgOpacity = 1 - t * 0.9;
          if (incoming !== "classic") {
            canvasOpacity = clamp(0.12 + t * 0.7, 0, 1);
            drawQueue.push({ view: incoming, alpha: 0.18 + t * 0.82, role: "incoming" });
          }
        } else if (incoming === "classic") {
          svgOpacity = clamp(t * 0.86, 0, 1);
          canvasOpacity = 1 - t * 0.22;
          drawQueue.push({ view: outgoing, alpha: 1 - t * 0.34, role: "outgoing" });
        } else {
          canvasOpacity = 1;
          drawQueue.push({ view: outgoing, alpha: 1 - t * 0.58, role: "outgoing" });
          drawQueue.push({ view: incoming, alpha: 0.16 + t * 0.84, role: "incoming" });
        }
      } else if (phase === "fadingIn") {
        if (this.state.activeView === "classic") {
          svgOpacity = t;
        } else {
          canvasOpacity = t;
          drawQueue.push({ view: this.state.activeView, alpha: t, role: "active" });
        }
      }

      this.applyLayerState(svgOpacity, canvasOpacity);
      this.clearCanvas();

      for (const item of drawQueue) {
        this.drawRenderer(item.view, frame, item.alpha, item.role, dt);
      }

      if (this.focusListener && (this.state.activeView !== "classic" || this.state.transitionPhase !== "idle")) {
        this.focusListener(frame.focusStage);
      }
    }

    drawRenderer(view, frame, alpha, role, dt) {
      const renderer = this.renderers[view];
      if (!renderer || !frame || alpha <= 0) return;
      if (typeof renderer.update === "function") {
        renderer.update({
          frame,
          dt,
          alpha,
          role,
          reducedMotion: this.reducedMotion || this.hidden,
          transitionPhase: this.state.transitionPhase,
          transitionProgress: this.state.transitionProgress
        });
      }
      this.ctx.save();
      this.ctx.globalAlpha = clamp(alpha, 0, 1);
      renderer.render({
        ctx: this.ctx,
        frame,
        alpha,
        role,
        reducedMotion: this.reducedMotion || this.hidden,
        transitionPhase: this.state.transitionPhase,
        transitionProgress: this.state.transitionProgress
      });
      this.ctx.restore();
    }

    clearCanvas() {
      this.ctx.clearRect(0, 0, this.size.width || 1, this.size.height || 1);
    }

    updateTransition(now) {
      if (this.state.transitionPhase === "idle") {
        this.state.transitionProgress = 1;
        return;
      }
      const raw = clamp((now - this.transition.startedAt) / PHASE_MS, 0, 1);
      this.state.transitionProgress = raw;
    }

    clearTransitionTimers() {
      while (this.transitionTimers.length) clearTimeout(this.transitionTimers.pop());
    }

    applyLayerState(svgOpacity = this.state.activeView === "classic" ? 1 : 0, canvasOpacity = this.state.activeView === "classic" ? 0 : 1) {
      this.svg.style.opacity = `${clamp(svgOpacity, 0, 1)}`;
      this.canvas.style.opacity = `${clamp(canvasOpacity, 0, 1)}`;
    }

    syncClassicInteractivity() {
      if (!this.classic || typeof this.classic.setInteractive !== "function") return;
      const enabled = this.state.activeView === "classic" && this.state.transitionPhase === "idle";
      this.classic.setInteractive(enabled);
    }

    handlePointerMove(event) {
      if (this.state.activeView === "classic" || !this.lastFrame) return;
      const rect = this.surface.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      let best = null;
      let bestScore = Infinity;
      for (const stage of this.lastFrame.stages) {
        if (stage.reveal <= 0.14) continue;
        const dx = x - stage.x;
        const dy = y - stage.displayY;
        const score = Math.hypot(dx, dy * 0.8) - stage.hitRadius;
        if (score < bestScore) {
          bestScore = score;
          best = stage;
        }
      }
      const nextKey = best && bestScore < 32 ? best.key : null;
      if (nextKey === this.hoverStageKey) return;
      this.hoverStageKey = nextKey;
      if (this.focusListener && this.lastFrame) {
        const focus = this.lastFrame.stages.find((stage) => stage.key === nextKey) || this.lastFrame.focusStage;
        this.focusListener(focus);
      }
      if (this.requestRender) this.requestRender();
    }

    handlePointerLeave() {
      if (this.state.activeView === "classic") return;
      this.hoverStageKey = null;
      if (this.requestRender) this.requestRender();
    }

    handleButtonKeydown(event, index) {
      const current = this.buttons[index];
      if (!current) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        this.focusButton((index + 1) % this.buttons.length);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        this.focusButton((index - 1 + this.buttons.length) % this.buttons.length);
      } else if (event.key === "Home") {
        event.preventDefault();
        this.focusButton(0);
      } else if (event.key === "End") {
        event.preventDefault();
        this.focusButton(this.buttons.length - 1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.setView(current.dataset.view || "classic");
      }
    }

    focusButton(index) {
      const target = this.buttons[index];
      if (target) target.focus();
    }

    updateButtons() {
      const visibleView = this.state.pendingView || this.state.activeView;
      this.buttons.forEach((button) => {
        const isActive = (button.dataset.view || "classic") === visibleView;
        button.setAttribute("aria-selected", isActive ? "true" : "false");
        button.tabIndex = isActive ? 0 : -1;
      });
    }
  }

  ns.CanvasController = CanvasController;
  ns.utils = {
    clamp,
    lerp,
    ease,
    smoothstep,
    cubicPoint,
    stageRevealWindow,
    formatCurrency,
    formatPercent
  };
})();
