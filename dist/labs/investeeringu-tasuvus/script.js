(() => {
  const LOAD_ANIMATION_MS = 18000;
  const UPDATE_ANIMATION_MS = 1800;
  const EPSILON = 1e-9;
  const SIMULATION_SLOT_COUNT = 3;
  const SIMULATION_STORAGE_KEY = "sim21-roi-simulation-slots-v1";
  const DEFAULT_SIMULATION_INPUTS = {
    upfrontCost: 200000,
    delay: 6,
    adoptionSpeed: 1.1,
    peakMonthlyRevenue: 230000,
    monthlyOperatingCost: 61000,
    timeHorizon: 30
  };

  const presets = {
    saas: {
      upfrontCost: 120000,
      delay: 4,
      adoptionSpeed: 1,
      peakMonthlyRevenue: 135000,
      monthlyOperatingCost: 28000,
      timeHorizon: 30
    },
    marketing: {
      upfrontCost: 85000,
      delay: 2,
      adoptionSpeed: 1.35,
      peakMonthlyRevenue: 185000,
      monthlyOperatingCost: 22000,
      timeHorizon: 20
    },
    automation: {
      upfrontCost: 170000,
      delay: 3,
      adoptionSpeed: 0.8,
      peakMonthlyRevenue: 95000,
      monthlyOperatingCost: 18000,
      timeHorizon: 36
    }
  };

  const controlKeys = [
    "upfrontCost",
    "delay",
    "adoptionSpeed",
    "peakMonthlyRevenue",
    "monthlyOperatingCost",
    "timeHorizon"
  ];

  const viewCaptions = {
    profit: "Y-axis shows cumulative dollars. X-axis shows months. Red is the loss window before payback; green is the profit window after break-even.",
    revenueCost: "Y-axis shows cumulative dollars while the x-axis tracks months, so you can see exactly when revenue closes the cost gap.",
    roi: "Y-axis shows ROI percentage and the x-axis shows months, making the payback crossing easy to spot."
  };

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function formatCurrency(value, options = {}) {
    const { compact = false, signed = false } = options;
    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : signed && value > 0 ? "+" : "";

    if (compact && abs >= 1000) {
      if (abs >= 1000000) {
        const digits = abs >= 10000000 ? 0 : 1;
        return `${sign}$${(abs / 1000000).toFixed(digits)}m`;
      }
      const digits = abs >= 100000 ? 0 : 1;
      return `${sign}$${(abs / 1000).toFixed(digits)}k`;
    }

    return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
  }

  function formatPercent(decimalValue, options = {}) {
    const { signed = false, digits = 0 } = options;
    const percent = decimalValue * 100;
    const abs = Math.abs(percent);
    const sign = percent < 0 ? "-" : signed && percent > 0 ? "+" : "";
    return `${sign}${abs.toFixed(digits)}%`;
  }

  function formatMonths(value, options = {}) {
    const { compact = false } = options;
    const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
    if (compact) {
      return `Month ${rounded}`;
    }
    return `${rounded} ${rounded === 1 ? "month" : "months"}`;
  }

  function formatWholeNumber(value) {
    return Math.round(value).toLocaleString("en-US");
  }

  function paceLabel(value) {
    if (value < 0.8) return "Slow";
    if (value > 1.2) return "Fast";
    return "Steady";
  }

  function sanitizeInputs(rawInputs) {
    const next = { ...rawInputs };
    next.upfrontCost = clamp(Number(next.upfrontCost) || 0, 0, 400000);
    next.delay = clamp(Number(next.delay) || 0, 0, 12);
    next.adoptionSpeed = clamp(Number(next.adoptionSpeed) || 1, 0.4, 1.8);
    next.peakMonthlyRevenue = clamp(Number(next.peakMonthlyRevenue) || 0, 10000, 450000);
    next.monthlyOperatingCost = clamp(Number(next.monthlyOperatingCost) || 0, 2000, 120000);
    next.timeHorizon = clamp(Number(next.timeHorizon) || 24, 12, 48);
    next.delay = clamp(next.delay, 0, next.timeHorizon);
    return next;
  }

  function normalizeSShape(timeSinceLaunch, activeWindow) {
    const midpoint = activeWindow * 0.55;
    const steepness = 0.52;
    const raw = 1 / (1 + Math.exp(-steepness * (timeSinceLaunch - midpoint)));
    const baseline = 1 / (1 + Math.exp(steepness * midpoint));
    const ceiling = 1 / (1 + Math.exp(-steepness * (activeWindow - midpoint)));
    const span = ceiling - baseline;
    if (Math.abs(span) < EPSILON) return clamp(raw, 0, 1);
    return clamp((raw - baseline) / span, 0, 1);
  }

  function adoptionRampMonths(speed) {
    const normalizedSpeed = clamp(Number(speed) || 1, 0.4, 1.8);
    return clamp(18 / normalizedSpeed, 8, 30);
  }

  function computeUsersAtTime(t, inputs) {
    if (t < inputs.delay) return 0;

    const timeSinceLaunch = t - inputs.delay;
    const rampMonths = adoptionRampMonths(inputs.adoptionSpeed);
    return normalizeSShape(timeSinceLaunch, rampMonths);
  }

  function interpolateValue(prev, next, key, amount) {
    return lerp(prev[key], next[key], amount);
  }

  function interpolatePoint(points, t) {
    if (!points.length) return null;
    if (t <= points[0].t) return points[0];
    if (t >= points[points.length - 1].t) return points[points.length - 1];

    let low = 0;
    let high = points.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (points[mid].t < t) {
        low = mid + 1;
      } else if (points[mid].t > t) {
        high = mid - 1;
      } else {
        return points[mid];
      }
    }

    const next = points[low];
    const prev = points[low - 1];
    const span = next.t - prev.t || 1;
    const amount = (t - prev.t) / span;

    return {
      t,
      users: interpolateValue(prev, next, "users", amount),
      revenue: interpolateValue(prev, next, "revenue", amount),
      cost: interpolateValue(prev, next, "cost", amount),
      cumRevenue: interpolateValue(prev, next, "cumRevenue", amount),
      cumCost: interpolateValue(prev, next, "cumCost", amount),
      profit: interpolateValue(prev, next, "profit", amount),
      roi: interpolateValue(prev, next, "roi", amount),
      roiPct: interpolateValue(prev, next, "roiPct", amount)
    };
  }

  function computeNegativeDuration(points) {
    let total = 0;

    for (let index = 1; index < points.length; index += 1) {
      const prev = points[index - 1];
      const next = points[index];
      const dt = next.t - prev.t;

      if (prev.profit < 0 && next.profit < 0) {
        total += dt;
        continue;
      }

      if ((prev.profit < 0 && next.profit >= 0) || (prev.profit >= 0 && next.profit < 0)) {
        const span = next.profit - prev.profit;
        const mix = Math.abs(span) < EPSILON ? 0.5 : clamp((0 - prev.profit) / span, 0, 1);
        if (prev.profit < 0) {
          total += dt * mix;
        } else {
          total += dt * (1 - mix);
        }
      }
    }

    return total;
  }

  function computeBreakEven(points) {
    for (let index = 1; index < points.length; index += 1) {
      const prev = points[index - 1];
      const next = points[index];
      if (prev.profit < 0 && next.profit >= 0) {
        const span = next.profit - prev.profit;
        const mix = Math.abs(span) < EPSILON ? 0.5 : clamp((0 - prev.profit) / span, 0, 1);
        return {
          time: lerp(prev.t, next.t, mix),
          cumValue: lerp(prev.cumRevenue, next.cumRevenue, mix),
          roiPct: 0
        };
      }
    }

    if (points[0].profit >= 0) {
      return {
        time: 0,
        cumValue: points[0].cumRevenue,
        roiPct: points[0].roiPct
      };
    }

    return null;
  }

  function buildPhaseSegments(data) {
    const { inputs, metrics, finalPoint } = data;
    const horizon = inputs.timeHorizon;
    const delayWeight = Math.max(inputs.delay || 0, 1);
    const breakEven = metrics.breakEven;

    if (!breakEven) {
      return [
        {
          className: "roi-phase-pill roi-phase-pill--investment",
          label: "Investment",
          text: inputs.delay > 0 ? `You pay first, then wait until month ${Math.round(inputs.delay)} for go-live.` : "Upfront spend lands immediately.",
          grow: delayWeight
        },
        {
          className: "roi-phase-pill roi-phase-pill--recovery",
          label: "Recovery",
          text: "Revenue ramps in, but it never fully repays total cost in this window.",
          grow: Math.max(horizon - inputs.delay, 1)
        },
        {
          className: "roi-phase-pill roi-phase-pill--marker is-marker roi-phase-pill--marker",
          label: "No break-even",
          text: `${formatCurrency(finalPoint.profit, { compact: true, signed: true })} at the end of the window.`,
          grow: 0
        }
      ];
    }

    const recoveryDuration = Math.max(breakEven.time - inputs.delay, 1);
    const profitDuration = Math.max(horizon - breakEven.time, 1);

    return [
      {
        className: "roi-phase-pill roi-phase-pill--investment",
        label: "Investment",
        text: inputs.delay > 0 ? "Cost starts now, revenue waits." : "Spend starts immediately with no go-live delay.",
        grow: delayWeight
      },
      {
        className: "roi-phase-pill roi-phase-pill--recovery",
        label: "Recovery",
        text: "Revenue is climbing, but the project is still paying back the original spend.",
        grow: recoveryDuration
      },
      {
        className: "roi-phase-pill roi-phase-pill--marker is-marker roi-phase-pill--marker",
        label: "Break-even",
        text: formatMonths(breakEven.time, { compact: true }),
        grow: 0
      },
      {
        className: "roi-phase-pill roi-phase-pill--profit",
        label: "Profit",
        text: "Revenue has paid back the project and is now building return.",
        grow: profitDuration
      }
    ];
  }

  class ROIModel {
    static compute(rawInputs) {
      const inputs = sanitizeInputs(rawInputs);
      const samplesPerMonth = 8;
      const totalSteps = Math.max(24, Math.round(inputs.timeHorizon * samplesPerMonth));
      const dt = inputs.timeHorizon / totalSteps;
      const points = [];
      let cumRevenue = 0;
      let cumCost = inputs.upfrontCost;

      for (let index = 0; index <= totalSteps; index += 1) {
        const t = dt * index;
        const users = computeUsersAtTime(t, inputs);
        const revenue = t < inputs.delay ? 0 : users * inputs.peakMonthlyRevenue;
        const cost = inputs.monthlyOperatingCost;

        if (index > 0) {
          cumRevenue += revenue * dt;
          cumCost += cost * dt;
        }

        const profit = cumRevenue - cumCost;
        const roi = cumCost > EPSILON ? profit / cumCost : 0;

        points.push({
          t,
          users,
          revenue,
          cost,
          cumRevenue,
          cumCost,
          profit,
          roi,
          roiPct: roi * 100
        });
      }

      const finalPoint = points[points.length - 1];
      const breakEven = computeBreakEven(points);
      const minProfitPoint = points.reduce((lowest, point) => (point.profit < lowest.profit ? point : lowest), points[0]);
      const negativeDuration = computeNegativeDuration(points);

      return {
        inputs,
        points,
        finalPoint,
        metrics: {
          breakEven,
          maxLoss: Math.abs(minProfitPoint.profit),
          minProfitPoint,
          negativeDuration,
          finalRoi: finalPoint.roi,
          totalProfit: finalPoint.profit
        },
        phases: buildPhaseSegments({
          inputs,
          metrics: {
            breakEven
          },
          finalPoint
        })
      };
    }
  }

  function niceStep(rawStep) {
    const exponent = Math.floor(Math.log10(rawStep));
    const fraction = rawStep / Math.pow(10, exponent);
    let niceFraction = 1;

    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;

    return niceFraction * Math.pow(10, exponent);
  }

  function buildTicks(min, max, targetCount, includeZero = false) {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
    if (Math.abs(max - min) < EPSILON) return [min];

    const step = niceStep((max - min) / Math.max(targetCount - 1, 1));
    const start = Math.floor(min / step) * step;
    const end = Math.ceil(max / step) * step;
    const ticks = [];

    for (let value = start; value <= end + step * 0.5; value += step) {
      ticks.push(Number(value.toFixed(10)));
    }

    if (includeZero && !ticks.some((value) => Math.abs(value) < EPSILON)) {
      ticks.push(0);
      ticks.sort((a, b) => a - b);
    }

    return ticks;
  }

  function buildSmoothPath(points) {
    if (!points.length) return "";
    if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    for (let index = 0; index < points.length - 1; index += 1) {
      const p0 = points[index - 1] || points[index];
      const p1 = points[index];
      const p2 = points[index + 1];
      const p3 = points[index + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }

    return path;
  }

  function buildSeriesPath(points, mapX, mapY, valueAccessor) {
    return buildSmoothPath(
      points.map((point) => ({
        x: mapX(point.t),
        y: mapY(valueAccessor(point))
      }))
    );
  }

  function bandSegments(points, firstAccessor, secondAccessor) {
    const segments = [];
    let current = null;

    function diffSign(a, b) {
      const diff = a - b;
      if (Math.abs(diff) < EPSILON) return 0;
      return diff > 0 ? 1 : -1;
    }

    for (let index = 0; index < points.length - 1; index += 1) {
      const p1 = points[index];
      const p2 = points[index + 1];
      const a1 = firstAccessor(p1);
      const b1 = secondAccessor(p1);
      const a2 = firstAccessor(p2);
      const b2 = secondAccessor(p2);
      let s1 = diffSign(a1, b1);
      let s2 = diffSign(a2, b2);

      if (!current) {
        current = {
          sign: s1 === 0 ? (s2 === 0 ? 1 : s2) : s1,
          points: [{ t: p1.t, a: a1, b: b1 }]
        };
      }

      if (s1 === 0) s1 = current.sign;
      if (s2 === 0) s2 = s1;

      if (s1 === s2) {
        current.points.push({ t: p2.t, a: a2, b: b2 });
      } else {
        const denominator = (a2 - a1) - (b2 - b1);
        const mix = Math.abs(denominator) < EPSILON ? 0.5 : clamp((b1 - a1) / denominator, 0, 1);
        const cross = {
          t: lerp(p1.t, p2.t, mix),
          a: lerp(a1, a2, mix),
          b: lerp(b1, b2, mix)
        };

        current.points.push(cross);
        segments.push(current);
        current = {
          sign: s2,
          points: [cross, { t: p2.t, a: a2, b: b2 }]
        };
      }
    }

    if (current) {
      segments.push(current);
    }

    return {
      positive: segments.filter((segment) => segment.sign > 0),
      negative: segments.filter((segment) => segment.sign < 0)
    };
  }

  function buildBandPath(segments, mapX, mapY) {
    return segments
      .map((segment) => {
        if (segment.points.length < 2) return "";
        let path = `M ${mapX(segment.points[0].t).toFixed(2)} ${mapY(segment.points[0].a).toFixed(2)}`;

        for (let index = 1; index < segment.points.length; index += 1) {
          path += ` L ${mapX(segment.points[index].t).toFixed(2)} ${mapY(segment.points[index].a).toFixed(2)}`;
        }

        for (let index = segment.points.length - 1; index >= 0; index -= 1) {
          path += ` L ${mapX(segment.points[index].t).toFixed(2)} ${mapY(segment.points[index].b).toFixed(2)}`;
        }

        return `${path} Z`;
      })
      .join(" ");
  }

  function estimateTextWidth(text, fontSize = 12) {
    return text.length * fontSize * 0.58;
  }

  function buildChartBadge({
    x,
    y,
    title,
    subtitle = "",
    tone = "neutral",
    minX = -Infinity,
    maxX = Infinity
  }) {
    const titleSize = 10.5;
    const subtitleSize = 10;
    const paddingX = 15;
    const width = Math.max(
      92,
      estimateTextWidth(title, titleSize) + paddingX * 2,
      subtitle ? estimateTextWidth(subtitle, subtitleSize) + paddingX * 2 : 0
    );
    const height = subtitle ? 40 : 28;
    let left = x - width / 2;

    if (Number.isFinite(minX) && Number.isFinite(maxX)) {
      const maxLeft = Math.max(minX, maxX - width);
      left = clamp(left, minX, maxLeft);
    }

    return `
      <g class="roi-chart-badge roi-chart-badge--${tone}" transform="translate(${left.toFixed(2)} ${y.toFixed(2)})">
        <rect width="${width.toFixed(2)}" height="${height}" rx="14" ry="14"></rect>
        <text class="roi-chart-badge__title" x="${(width / 2).toFixed(2)}" y="${subtitle ? "16" : "18"}" text-anchor="middle">${title}</text>
        ${subtitle ? `<text class="roi-chart-badge__subtitle" x="${(width / 2).toFixed(2)}" y="30" text-anchor="middle">${subtitle}</text>` : ""}
      </g>
    `;
  }

  class ROIChart {
    constructor(root) {
      this.root = root;
      this.surface = root.querySelector("#chartSurface");
      this.svg = root.querySelector("#roiChart");
      this.gridLayer = root.querySelector("#gridLayer");
      this.axisLayer = root.querySelector("#axisLayer");
      this.annotationLayer = root.querySelector("#annotationLayer");
      this.revealRect = root.querySelector("#revealRect");
      this.positiveArea = root.querySelector("#positiveArea");
      this.negativeArea = root.querySelector("#negativeArea");
      this.revenueLine = root.querySelector("#revenueLine");
      this.costLine = root.querySelector("#costLine");
      this.roiLine = root.querySelector("#roiLine");
      this.currentRevenueHalo = root.querySelector("#currentRevenueHalo");
      this.currentRevenueDot = root.querySelector("#currentRevenueDot");
      this.currentCostHalo = root.querySelector("#currentCostHalo");
      this.currentCostDot = root.querySelector("#currentCostDot");
      this.currentRoiHalo = root.querySelector("#currentRoiHalo");
      this.currentRoiDot = root.querySelector("#currentRoiDot");
      this.zeroLine = root.querySelector("#zeroLine");
      this.currentLine = root.querySelector("#currentLine");
      this.breakEvenLine = root.querySelector("#breakEvenLine");
      this.breakEvenPulse = root.querySelector("#breakEvenPulse");
      this.drawdownDot = root.querySelector("#drawdownDot");
      this.breakEvenLabel = root.querySelector("#breakEvenLabel");
      this.drawdownLabel = root.querySelector("#drawdownLabel");
      this.hoverLine = root.querySelector("#hoverLine");
      this.hoverDot = root.querySelector("#hoverDot");
      this.tooltip = root.querySelector("#chartTooltip");
      this.tooltipTitle = root.querySelector("#tooltipTitle");
      this.tooltipRevenue = root.querySelector("#tooltipRevenue");
      this.tooltipCost = root.querySelector("#tooltipCost");
      this.tooltipProfit = root.querySelector("#tooltipProfit");
      this.tooltipRoi = root.querySelector("#tooltipRoi");
      this.hover = null;
      this.data = null;
      this.viewMode = "profit";
      this.geometry = null;
      this.onHover = null;
      this.onRenderPoint = null;

      this.handlePointerMove = this.handlePointerMove.bind(this);
      this.handlePointerLeave = this.handlePointerLeave.bind(this);

      this.surface.addEventListener("pointermove", this.handlePointerMove);
      this.surface.addEventListener("pointerleave", this.handlePointerLeave);
    }

    isCompactViewport() {
      return window.matchMedia("(max-width: 768px)").matches;
    }

    setData(data, viewMode) {
      this.data = data;
      this.viewMode = viewMode;
      this.buildGeometry();
    }

    setViewMode(viewMode) {
      this.viewMode = viewMode;
      this.buildGeometry();
    }

    buildGeometry() {
      if (!this.data) return;

      const compact = this.isCompactViewport();
      const width = 960;
      const height = 560;
      const padding = compact
        ? { top: 52, right: 20, bottom: 46, left: 58 }
        : { top: 40, right: 30, bottom: 58, left: 84 };
      const plot = {
        left: padding.left,
        right: width - padding.right,
        top: padding.top,
        bottom: height - padding.bottom
      };
      plot.width = plot.right - plot.left;
      plot.height = plot.bottom - plot.top;

      const points = this.data.points;
      const currencyView = this.viewMode !== "roi";
      let minValue = 0;
      let maxValue = 1;
      let yTicks = [];

      if (currencyView) {
        maxValue = Math.max(
          ...points.map((point) => point.cumRevenue),
          ...points.map((point) => point.cumCost),
          1
        );
        minValue = 0;
        yTicks = buildTicks(minValue, maxValue, compact ? 4 : 5, true);
      } else {
        minValue = Math.min(...points.map((point) => point.roiPct), 0);
        maxValue = Math.max(...points.map((point) => point.roiPct), 0);
        const range = maxValue - minValue || 1;
        minValue -= range * 0.12;
        maxValue += range * 0.12;
        yTicks = buildTicks(minValue, maxValue, compact ? 4 : 5, true);
      }

      maxValue = Math.max(maxValue, minValue + 1);

      const xScale = (t) => plot.left + (t / this.data.inputs.timeHorizon) * plot.width;
      const yScale = (value) => plot.bottom - ((value - minValue) / (maxValue - minValue)) * plot.height;
      const xTickCount = compact ? 4 : 5;
      const xTicks = Array.from({ length: xTickCount }, (_, index) => {
        const raw = this.data.inputs.timeHorizon * (index / Math.max(xTickCount - 1, 1));
        return Math.round(raw * 10) / 10;
      });

      const band = currencyView
        ? bandSegments(points, (point) => point.cumRevenue, (point) => point.cumCost)
        : bandSegments(points, (point) => point.roiPct, () => 0);

      const revenuePath = buildSeriesPath(points, xScale, yScale, (point) => point.cumRevenue);
      const costPath = buildSeriesPath(points, xScale, yScale, (point) => point.cumCost);
      const roiPath = buildSeriesPath(points, xScale, yScale, (point) => point.roiPct);
      const positiveArea = buildBandPath(band.positive, xScale, yScale);
      const negativeArea = buildBandPath(band.negative, xScale, yScale);
      const breakEven = this.data.metrics.breakEven;
      const minProfitPoint = this.data.metrics.minProfitPoint;
      const drawdownX = xScale(minProfitPoint.t);
      const drawdownY = currencyView
        ? (yScale(minProfitPoint.cumRevenue) + yScale(minProfitPoint.cumCost)) / 2
        : yScale(minProfitPoint.roiPct);

      const breakEvenGeometry = breakEven
        ? {
            x: xScale(breakEven.time),
            y: currencyView ? yScale(breakEven.cumValue) : yScale(0)
          }
        : null;

      this.geometry = {
        width,
        height,
        plot,
        minValue,
        maxValue,
        xScale,
        yScale,
        xTicks,
        yTicks,
        compact,
        currencyView,
        breakEven: breakEvenGeometry,
        revenuePath,
        costPath,
        roiPath,
        positiveArea,
        negativeArea,
        drawdown: {
          x: drawdownX,
          y: drawdownY
        }
      };

      this.renderStatic();
    }

    renderStatic() {
      if (!this.geometry || !this.data) return;

      const { plot, xTicks, yTicks, xScale, yScale, currencyView, compact } = this.geometry;
      const breakEven = this.data.metrics.breakEven;
      const delay = this.data.inputs.delay;
      const delayX = xScale(delay);
      const backgroundParts = [
        `<rect class="roi-plot-base" x="${plot.left}" y="${plot.top}" width="${plot.width}" height="${plot.height}" rx="22" ry="22"></rect>`
      ];
      const axisParts = [];
      const annotationParts = [];
      const gridParts = [];

      if (currencyView) {
        if (breakEven) {
          const lossWidth = Math.max(this.geometry.breakEven.x - plot.left, 0);
          const profitWidth = Math.max(plot.right - this.geometry.breakEven.x, 0);

          if (lossWidth > 0) {
            backgroundParts.push(
              `<rect class="roi-zone-wash roi-zone-wash--loss" x="${plot.left}" y="${plot.top}" width="${lossWidth.toFixed(2)}" height="${plot.height}" />`
            );
          }

          if (profitWidth > 0) {
            backgroundParts.push(
              `<rect class="roi-zone-wash roi-zone-wash--profit" x="${this.geometry.breakEven.x.toFixed(2)}" y="${plot.top}" width="${profitWidth.toFixed(2)}" height="${plot.height}" />`
            );
          }
        } else {
          backgroundParts.push(
            `<rect class="roi-zone-wash roi-zone-wash--loss" x="${plot.left}" y="${plot.top}" width="${plot.width}" height="${plot.height}" />`
          );
        }
      }

      axisParts.push(
        `<line class="roi-axis-line" x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${plot.bottom}"></line>`,
        `<line class="roi-axis-line" x1="${plot.left}" y1="${plot.bottom}" x2="${plot.right}" y2="${plot.bottom}"></line>`
      );

      yTicks.forEach((tick) => {
        const y = yScale(tick);
        gridParts.push(
          `<line class="roi-grid-line" x1="${plot.left}" y1="${y.toFixed(2)}" x2="${plot.right}" y2="${y.toFixed(2)}"></line>`
        );
        axisParts.push(
          `<line class="roi-axis-tick" x1="${plot.left - 8}" y1="${y.toFixed(2)}" x2="${plot.left}" y2="${y.toFixed(2)}"></line>`,
          `<text class="roi-axis-text" x="${plot.left - 14}" y="${(y + 4).toFixed(2)}" text-anchor="end">${
            currencyView ? formatCurrency(tick, { compact: true }) : `${Math.round(tick)}%`
          }</text>`
        );
      });

      xTicks.forEach((tick) => {
        const x = xScale(tick);
        gridParts.push(
          `<line class="roi-grid-line roi-grid-line--vertical" x1="${x.toFixed(2)}" y1="${plot.top}" x2="${x.toFixed(2)}" y2="${plot.bottom}"></line>`
        );
        axisParts.push(
          `<line class="roi-axis-tick" x1="${x.toFixed(2)}" y1="${plot.bottom}" x2="${x.toFixed(2)}" y2="${plot.bottom + 7}"></line>`,
          `<text class="roi-axis-text" x="${x.toFixed(2)}" y="${plot.bottom + 24}" text-anchor="middle">${Math.round(tick)}m</text>`
        );
      });

      if (!compact) {
        axisParts.push(
          `<text class="roi-axis-title" transform="translate(24 ${(plot.top + plot.height / 2).toFixed(2)}) rotate(-90)" text-anchor="middle">${
            currencyView ? "Cumulative dollars" : "ROI percent"
          }</text>`,
          `<text class="roi-axis-title" x="${(plot.left + plot.width / 2).toFixed(2)}" y="${plot.bottom + 47}" text-anchor="middle">Months</text>`
        );
      }

      if (delay > 0 && delay < this.data.inputs.timeHorizon) {
        gridParts.push(
          `<line class="roi-milestone-line" x1="${delayX.toFixed(2)}" y1="${plot.top}" x2="${delayX.toFixed(2)}" y2="${plot.bottom}"></line>`
        );
        annotationParts.push(
          buildChartBadge({
            x: delayX,
            y: plot.top + (compact ? 60 : 74),
            title: compact ? "LIVE" : "GO-LIVE",
            subtitle: compact ? "" : "Revenue starts",
            tone: "info",
            minX: plot.left + 8,
            maxX: plot.right - 8
          })
        );
      }

      if (currencyView && !compact) {
        const badgeTop = plot.top + 24;

        if (breakEven) {
          const lossWidth = Math.max(this.geometry.breakEven.x - plot.left, 0);
          const profitWidth = Math.max(plot.right - this.geometry.breakEven.x, 0);

          if (lossWidth > 128) {
            axisParts.push(
              buildChartBadge({
                x: plot.left + lossWidth / 2,
                y: badgeTop,
                title: "LOSS ZONE",
                subtitle: lossWidth > 190 ? "Cost above revenue" : "",
                tone: "loss",
                minX: plot.left + 8,
                maxX: this.geometry.breakEven.x - 8
              })
            );
          }

          if (profitWidth > 128) {
            axisParts.push(
              buildChartBadge({
                x: this.geometry.breakEven.x + profitWidth / 2,
                y: badgeTop,
                title: "PROFIT ZONE",
                subtitle: profitWidth > 190 ? "Revenue above cost" : "",
                tone: "profit",
                minX: this.geometry.breakEven.x + 8,
                maxX: plot.right - 8
              })
            );
          }
        } else {
          axisParts.push(
            buildChartBadge({
              x: plot.left + plot.width / 2,
              y: badgeTop,
              title: "LOSS ZONE",
              subtitle: "No break-even in this window",
              tone: "loss",
              minX: plot.left + 8,
              maxX: plot.right - 8
            })
          );
        }
      }

      this.gridLayer.innerHTML = backgroundParts.join("") + gridParts.join("");
      this.axisLayer.innerHTML = axisParts.join("");
      this.annotationLayer.innerHTML = annotationParts.join("");

      this.revealRect.setAttribute("x", String(this.geometry.plot.left));
      this.revealRect.setAttribute("y", "0");
      this.revealRect.setAttribute("height", String(this.geometry.height));

      this.positiveArea.setAttribute("d", this.geometry.positiveArea);
      this.negativeArea.setAttribute("d", this.geometry.negativeArea);
      this.revenueLine.setAttribute("d", this.geometry.revenuePath);
      this.costLine.setAttribute("d", this.geometry.costPath);
      this.roiLine.setAttribute("d", this.geometry.roiPath);

      if (this.viewMode === "profit") {
        this.positiveArea.style.opacity = "1";
        this.negativeArea.style.opacity = "1";
        this.revenueLine.style.opacity = "1";
        this.costLine.style.opacity = "1";
        this.roiLine.style.opacity = "0";
      } else if (this.viewMode === "revenueCost") {
        this.positiveArea.style.opacity = "0.56";
        this.negativeArea.style.opacity = "0.56";
        this.revenueLine.style.opacity = "1";
        this.costLine.style.opacity = "1";
        this.roiLine.style.opacity = "0";
      } else {
        this.positiveArea.style.opacity = "1";
        this.negativeArea.style.opacity = "1";
        this.revenueLine.style.opacity = "0";
        this.costLine.style.opacity = "0";
        this.roiLine.style.opacity = "1";
      }

      if (this.viewMode === "roi") {
        const zeroY = yScale(0);
        this.zeroLine.setAttribute("x1", String(plot.left));
        this.zeroLine.setAttribute("x2", String(plot.right));
        this.zeroLine.setAttribute("y1", String(zeroY));
        this.zeroLine.setAttribute("y2", String(zeroY));
        this.zeroLine.style.opacity = "1";
      } else {
        this.zeroLine.style.opacity = "0";
      }

      this.drawdownDot.setAttribute("cx", this.geometry.drawdown.x.toFixed(2));
      this.drawdownDot.setAttribute("cy", this.geometry.drawdown.y.toFixed(2));
      this.drawdownDot.setAttribute("r", "6");
      this.drawdownLabel.textContent = compact
        ? `Loss ${formatCurrency(this.data.metrics.maxLoss, { compact: true })}`
        : `Max loss ${formatCurrency(this.data.metrics.maxLoss, { compact: true })}`;
      const drawdownLabelInset = compact ? 68 : 86;
      const drawdownLabelX = clamp(this.geometry.drawdown.x, plot.left + drawdownLabelInset, plot.right - drawdownLabelInset);
      this.drawdownLabel.setAttribute("x", drawdownLabelX.toFixed(2));
      this.drawdownLabel.setAttribute("y", Math.max(plot.top + 18, this.geometry.drawdown.y - (compact ? 12 : 14)).toFixed(2));
      this.drawdownLabel.setAttribute("text-anchor", "middle");
    }

    getTimeAtClientX(clientX) {
      if (!this.geometry) return 0;
      const rect = this.surface.getBoundingClientRect();
      const plotLeft = (this.geometry.plot.left / this.geometry.width) * rect.width;
      const plotRight = (this.geometry.plot.right / this.geometry.width) * rect.width;
      const x = clamp(clientX - rect.left, plotLeft, plotRight);
      const normalized = (x - plotLeft) / Math.max(plotRight - plotLeft, 1);
      return normalized * this.data.inputs.timeHorizon;
    }

    positionTooltip(clientX, clientY) {
      const rect = this.surface.getBoundingClientRect();
      const tooltipWidth = this.tooltip.offsetWidth || 220;
      const tooltipHeight = this.tooltip.offsetHeight || 118;
      const left = clamp(clientX - rect.left + 18, 12, rect.width - tooltipWidth - 12);
      const top = clamp(clientY - rect.top - tooltipHeight - 14, 12, rect.height - tooltipHeight - 12);
      this.tooltip.style.left = `${left}px`;
      this.tooltip.style.top = `${top}px`;
    }

    updateTooltip(point, clientX, clientY) {
      this.tooltip.hidden = false;
      this.tooltipTitle.textContent = formatMonths(point.t, { compact: true });
      this.tooltipRevenue.textContent = formatCurrency(point.cumRevenue, { compact: true });
      this.tooltipCost.textContent = formatCurrency(point.cumCost, { compact: true });
      this.tooltipProfit.textContent = formatCurrency(point.profit, { compact: true, signed: true });
      this.tooltipProfit.className = point.profit >= 0 ? "is-positive" : "is-negative";
      this.tooltipRoi.textContent = formatPercent(point.roi, { signed: true });
      this.tooltipRoi.className = point.roi >= 0 ? "is-positive" : "is-negative";
      this.positionTooltip(clientX, clientY);
    }

    handlePointerMove(event) {
      if (!window.matchMedia("(pointer:fine)").matches || !this.data || !this.geometry) return;
      const time = this.getTimeAtClientX(event.clientX);
      this.hover = {
        time,
        clientX: event.clientX,
        clientY: event.clientY
      };
      if (typeof this.onHover === "function") {
        this.onHover(time);
      }
    }

    handlePointerLeave() {
      this.hover = null;
      this.tooltip.hidden = true;
      if (typeof this.onHover === "function") {
        this.onHover(null);
      }
    }

    render(progress, now) {
      if (!this.geometry || !this.data) return;

      const visibleTime = clamp(progress, 0, 1) * this.data.inputs.timeHorizon;
      const focusTime = this.hover ? this.hover.time : visibleTime;
      const currentPoint = interpolatePoint(this.data.points, visibleTime);
      const focusPoint = interpolatePoint(this.data.points, focusTime);
      const currentX = this.geometry.xScale(visibleTime);
      const currentRevenueY = this.geometry.yScale(currentPoint.cumRevenue);
      const currentCostY = this.geometry.yScale(currentPoint.cumCost);
      const currentRoiY = this.geometry.yScale(currentPoint.roiPct);
      const focusX = this.geometry.xScale(focusTime);
      const focusY = this.viewMode === "roi"
        ? this.geometry.yScale(focusPoint.roiPct)
        : this.geometry.yScale(focusPoint.cumRevenue);
      const pulseBase = 8 + (0.5 + 0.5 * Math.sin(now / 160)) * 4;

      this.revealRect.setAttribute("width", String(Math.max(currentX - this.geometry.plot.left, 0)));
      this.currentLine.setAttribute("x1", currentX.toFixed(2));
      this.currentLine.setAttribute("x2", currentX.toFixed(2));
      this.currentLine.setAttribute("y1", String(this.geometry.plot.top));
      this.currentLine.setAttribute("y2", String(this.geometry.plot.bottom));
      this.currentLine.style.opacity = progress < 1 ? "1" : "0.5";

      const showRevenueHead = this.viewMode !== "roi";
      const showCostHead = this.viewMode !== "roi";
      const showRoiHead = this.viewMode === "roi";
      const activeHeadOpacity = progress < 1 ? "1" : "0.78";

      this.currentRevenueHalo.style.opacity = showRevenueHead ? activeHeadOpacity : "0";
      this.currentRevenueDot.style.opacity = showRevenueHead ? "1" : "0";
      if (showRevenueHead) {
        this.currentRevenueHalo.setAttribute("cx", currentX.toFixed(2));
        this.currentRevenueHalo.setAttribute("cy", currentRevenueY.toFixed(2));
        this.currentRevenueHalo.setAttribute("r", pulseBase.toFixed(2));
        this.currentRevenueDot.setAttribute("cx", currentX.toFixed(2));
        this.currentRevenueDot.setAttribute("cy", currentRevenueY.toFixed(2));
        this.currentRevenueDot.setAttribute("r", "5.6");
      }

      this.currentCostHalo.style.opacity = showCostHead ? activeHeadOpacity : "0";
      this.currentCostDot.style.opacity = showCostHead ? "1" : "0";
      if (showCostHead) {
        this.currentCostHalo.setAttribute("cx", currentX.toFixed(2));
        this.currentCostHalo.setAttribute("cy", currentCostY.toFixed(2));
        this.currentCostHalo.setAttribute("r", (pulseBase - 1.1).toFixed(2));
        this.currentCostDot.setAttribute("cx", currentX.toFixed(2));
        this.currentCostDot.setAttribute("cy", currentCostY.toFixed(2));
        this.currentCostDot.setAttribute("r", "5.2");
      }

      this.currentRoiHalo.style.opacity = showRoiHead ? activeHeadOpacity : "0";
      this.currentRoiDot.style.opacity = showRoiHead ? "1" : "0";
      if (showRoiHead) {
        this.currentRoiHalo.setAttribute("cx", currentX.toFixed(2));
        this.currentRoiHalo.setAttribute("cy", currentRoiY.toFixed(2));
        this.currentRoiHalo.setAttribute("r", (pulseBase - 0.4).toFixed(2));
        this.currentRoiDot.setAttribute("cx", currentX.toFixed(2));
        this.currentRoiDot.setAttribute("cy", currentRoiY.toFixed(2));
        this.currentRoiDot.setAttribute("r", "5.4");
      }

      if (this.geometry.breakEven && visibleTime >= this.data.metrics.breakEven.time) {
        const pulse = 7 + (0.5 + 0.5 * Math.sin(now / 220)) * 4;
        this.breakEvenLine.style.opacity = "1";
        this.breakEvenLine.setAttribute("x1", this.geometry.breakEven.x.toFixed(2));
        this.breakEvenLine.setAttribute("x2", this.geometry.breakEven.x.toFixed(2));
        this.breakEvenLine.setAttribute("y1", String(this.geometry.plot.top));
        this.breakEvenLine.setAttribute("y2", String(this.geometry.plot.bottom));
        this.breakEvenPulse.style.opacity = "1";
        this.breakEvenPulse.setAttribute("cx", this.geometry.breakEven.x.toFixed(2));
        this.breakEvenPulse.setAttribute("cy", this.geometry.breakEven.y.toFixed(2));
        this.breakEvenPulse.setAttribute("r", pulse.toFixed(2));
        this.breakEvenLabel.textContent = this.geometry.compact
          ? `Break-even ${Math.round(this.data.metrics.breakEven.time)}m`
          : `Break-even ${formatMonths(this.data.metrics.breakEven.time, { compact: true })}`;
        this.breakEvenLabel.style.opacity = "1";
        const breakEvenLabelInset = this.geometry.compact ? 76 : 96;
        const breakEvenLabelX = clamp(
          this.geometry.breakEven.x,
          this.geometry.plot.left + breakEvenLabelInset,
          this.geometry.plot.right - breakEvenLabelInset
        );
        this.breakEvenLabel.setAttribute("x", breakEvenLabelX.toFixed(2));
        this.breakEvenLabel.setAttribute(
          "y",
          Math.max(this.geometry.plot.top + 18, this.geometry.breakEven.y - (this.geometry.compact ? 12 : 16)).toFixed(2)
        );
        this.breakEvenLabel.setAttribute("text-anchor", "middle");
      } else {
        this.breakEvenLine.style.opacity = "0";
        this.breakEvenPulse.style.opacity = "0";
        this.breakEvenLabel.style.opacity = "0";
      }

      if (visibleTime >= this.data.metrics.minProfitPoint.t) {
        this.drawdownDot.style.opacity = "1";
        this.drawdownLabel.style.opacity = "1";
      } else {
        this.drawdownDot.style.opacity = "0";
        this.drawdownLabel.style.opacity = "0";
      }

      if (this.hover) {
        this.hoverLine.style.opacity = "1";
        this.hoverLine.setAttribute("x1", focusX.toFixed(2));
        this.hoverLine.setAttribute("x2", focusX.toFixed(2));
        this.hoverLine.setAttribute("y1", String(this.geometry.plot.top));
        this.hoverLine.setAttribute("y2", String(this.geometry.plot.bottom));
        this.hoverDot.style.opacity = "1";
        this.hoverDot.setAttribute("cx", focusX.toFixed(2));
        this.hoverDot.setAttribute("cy", focusY.toFixed(2));
        this.hoverDot.setAttribute("r", "6");
        this.updateTooltip(focusPoint, this.hover.clientX, this.hover.clientY);
      } else {
        this.hoverLine.style.opacity = "0";
        this.hoverDot.style.opacity = "0";
        this.tooltip.hidden = true;
      }

      if (typeof this.onRenderPoint === "function") {
        this.onRenderPoint({
          currentPoint,
          focusPoint,
          visibleTime
        });
      }
    }
  }

  class ROIWidget {
    constructor(root) {
      this.root = root;
      this.isReducedMotion = reducedMotionQuery.matches;
      const simulations = this.loadSimulationSlots();
      const initialSimulation = simulations[0];

      this.state = {
        inputs: { ...initialSimulation.inputs },
        simulations,
        activeSimulationId: initialSimulation.id,
        viewMode: "profit",
        progress: initialSimulation.completed || this.isReducedMotion ? 1 : 0,
        running: false,
        hoverTime: null,
        playbackSpeed: 0.5
      };
      this.animation = {
        from: this.state.progress,
        to: this.state.progress,
        lastFrameTime: 0,
        elapsed: 0,
        duration: 0
      };
      this.rafId = 0;
      this.recomputeTimer = 0;
      this.lastHeight = 0;
      this.heightRaf = 0;

      this.elements = this.mapElements();
      this.chart = new ROIChart(root);
      this.chart.onHover = (time) => {
        this.state.hoverTime = time;
        this.renderFrame(performance.now());
      };
      this.chart.onRenderPoint = ({ focusPoint, visibleTime }) => {
        this.renderNarrative(focusPoint, visibleTime);
      };

      this.data = ROIModel.compute(this.state.inputs);

      this.bindEvents();
      this.applyEmbedMode();
      this.syncForm();
      this.updateStaticPanels();
      this.chart.setData(this.data, this.state.viewMode);
      this.renderFrame(performance.now());
      this.updateRunState();
      this.scheduleHeightReport(true);
    }

    mapElements() {
      return {
        progressBar: this.root.querySelector("#progressBar"),
        pauseButton: this.root.querySelector("#pauseButton"),
        replayButton: this.root.querySelector("#replayButton"),
        speedSelect: this.root.querySelector("#speedSelect"),
        runStatus: this.root.querySelector("#runStatus"),
        liveBadge: this.root.querySelector(".roi-live"),
        breakBanner: this.root.querySelector("#breakBanner"),
        viewCaption: this.root.querySelector("#viewCaption"),
        kpiBreakEven: this.root.querySelector("#kpiBreakEven"),
        kpiBreakEvenNote: this.root.querySelector("#kpiBreakEvenNote"),
        kpiMaxLoss: this.root.querySelector("#kpiMaxLoss"),
        kpiNegativeTime: this.root.querySelector("#kpiNegativeTime"),
        kpiFinalRoi: this.root.querySelector("#kpiFinalRoi"),
        kpiTotalProfit: this.root.querySelector("#kpiTotalProfit"),
        snapshotLabel: this.root.querySelector("#snapshotLabel"),
        snapshotText: this.root.querySelector("#snapshotText"),
        snapshotRevenue: this.root.querySelector("#snapshotRevenue"),
        snapshotCost: this.root.querySelector("#snapshotCost"),
        snapshotProfit: this.root.querySelector("#snapshotProfit"),
        snapshotRoi: this.root.querySelector("#snapshotRoi"),
        simulationButtons: Array.from(this.root.querySelectorAll("[data-run-slot]"))
      };
    }

    bindEvents() {
      controlKeys.forEach((key) => {
        const input = this.root.querySelector(`#${key}`);
        if (!input) return;

        input.addEventListener("input", () => {
          this.state.inputs[key] = Number(input.value);
          this.updateControlOutput(key);
          this.updateActiveSimulationDraft();
          this.scheduleRecompute();
        });

        input.addEventListener("change", () => {
          this.state.inputs[key] = Number(input.value);
          this.commitRecompute();
        });
      });

      this.elements.simulationButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const slotId = button.dataset.runId;
          if (!slotId) return;
          this.loadSimulationSlot(slotId);
        });
      });

      this.elements.pauseButton.addEventListener("click", () => {
        if (this.state.running) {
          this.pause();
        } else if (this.state.progress < 1) {
          this.resume();
        } else {
          this.restart();
        }
      });

      this.elements.replayButton.addEventListener("click", () => {
        this.reset();
      });

      if (this.elements.speedSelect) {
        this.elements.speedSelect.addEventListener("change", () => {
          this.state.playbackSpeed = clamp(Number(this.elements.speedSelect.value) || 0.5, 0.5, 2);
        });
      }

      window.addEventListener("resize", () => {
        this.chart.buildGeometry();
        this.renderFrame(performance.now());
        this.scheduleHeightReport(true);
      }, { passive: true });

      if ("ResizeObserver" in window) {
        this.resizeObserver = new ResizeObserver(() => {
          this.chart.buildGeometry();
          this.renderFrame(performance.now());
          this.scheduleHeightReport(true);
        });
        this.resizeObserver.observe(this.root);
      }

      reducedMotionQuery.addEventListener("change", (event) => {
        this.isReducedMotion = event.matches;
        if (this.isReducedMotion) {
          this.state.running = false;
          this.state.progress = 1;
          this.stopLoop();
          this.updateRunState();
          this.renderFrame(performance.now());
        }
      });

      window.addEventListener("message", (event) => {
        const data = event.data;
        if (!data || typeof data !== "object") return;
        if (
          data.type === "widget:request-height" ||
          data.type === "widget:request-resize" ||
          data.type === "simfluence-widget:request-height" ||
          data.type === "simfluence-widget:request-resize"
        ) {
          this.scheduleHeightReport(true);
        }
      });
    }

    applyEmbedMode() {
      const params = new URLSearchParams(window.location.search);
      const isEmbedded = params.get("embed") === "1" || params.get("embedMode") === "1" || window.self !== window.top;
      this.safeEmbedMode = params.get("safeEmbed") === "1";

      if (isEmbedded) {
        document.documentElement.classList.add("embed-mode");
        document.body.classList.add("embed-mode");
        this.scheduleHeightReport(true);
        window.setTimeout(() => this.scheduleHeightReport(true), 120);
        window.setTimeout(() => this.scheduleHeightReport(true), 600);
      }
    }

    syncForm() {
      controlKeys.forEach((key) => {
        const input = this.root.querySelector(`#${key}`);
        if (input) {
          input.value = String(this.state.inputs[key]);
        }
        this.updateControlOutput(key);
      });

      this.renderSimulationButtons();
      this.updateViewCaption();
    }

    updateControlOutput(key) {
      const output = this.root.querySelector(`#${key}Value`);
      const value = this.state.inputs[key];
      if (!output) return;

      if (key === "upfrontCost") output.textContent = formatCurrency(value, { compact: true });
      else if (key === "delay") output.textContent = formatMonths(value);
      else if (key === "adoptionSpeed") output.textContent = paceLabel(value);
      else if (key === "peakMonthlyRevenue" || key === "monthlyOperatingCost") {
        output.textContent = `${formatCurrency(value, { compact: true })}/mo`;
      } else if (key === "timeHorizon") {
        output.textContent = formatMonths(value);
      }
    }

    buildSimulationOutcome(data) {
      return {
        breakEvenMonths: data.metrics.breakEven ? Number(data.metrics.breakEven.time.toFixed(1)) : null,
        finalRoi: Number(data.metrics.finalRoi.toFixed(4)),
        totalProfit: Math.round(data.metrics.totalProfit)
      };
    }

    buildSimulationSlot(index, overrides = {}) {
      const inputs = sanitizeInputs(overrides.inputs || DEFAULT_SIMULATION_INPUTS);
      return {
        id: overrides.id || `simulation-${index}`,
        title: overrides.title || `Simulation ${index}`,
        inputs,
        dirty: Boolean(overrides.dirty),
        completed: Boolean(overrides.completed),
        outcome: overrides.outcome && typeof overrides.outcome === "object" ? overrides.outcome : null
      };
    }

    getDefaultSimulationSlots() {
      return Array.from({ length: SIMULATION_SLOT_COUNT }, (_, index) => (
        this.buildSimulationSlot(index + 1)
      ));
    }

    loadSimulationSlots() {
      const defaults = this.getDefaultSimulationSlots();

      try {
        const raw = window.localStorage.getItem(SIMULATION_STORAGE_KEY);
        if (!raw) return defaults;

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return defaults;

        return defaults.map((fallbackSlot, index) => {
          const saved = parsed[index];
          if (!saved || typeof saved !== "object") return fallbackSlot;

          return this.buildSimulationSlot(index + 1, {
            id: fallbackSlot.id,
            title: fallbackSlot.title,
            inputs: saved.inputs || fallbackSlot.inputs,
            dirty: Boolean(saved.dirty),
            completed: Boolean(saved.completed),
            outcome: saved.outcome
          });
        });
      } catch (error) {
        void error;
        return defaults;
      }
    }

    persistSimulationSlots() {
      try {
        window.localStorage.setItem(
          SIMULATION_STORAGE_KEY,
          JSON.stringify(
            this.state.simulations.map((slot) => ({
              id: slot.id,
              title: slot.title,
              inputs: slot.inputs,
              dirty: slot.dirty,
              completed: slot.completed,
              outcome: slot.outcome
            }))
          )
        );
      } catch (error) {
        void error;
      }
    }

    updateSimulationSlot(slotId, updates) {
      this.state.simulations = this.state.simulations.map((slot) => {
        if (slot.id !== slotId) return slot;

        return {
          ...slot,
          ...updates,
          inputs: updates.inputs ? sanitizeInputs(updates.inputs) : slot.inputs,
          outcome: Object.prototype.hasOwnProperty.call(updates, "outcome") ? updates.outcome : slot.outcome
        };
      });

      this.persistSimulationSlots();
    }

    getActiveSimulation() {
      return this.state.simulations.find((slot) => slot.id === this.state.activeSimulationId) || null;
    }

    updateActionButtonTone() {
      const activeSlot = this.getActiveSimulation();
      const useCompleteTone = Boolean(activeSlot && activeSlot.completed);

      [this.elements.pauseButton, this.elements.replayButton].forEach((button) => {
        if (!button) return;
        button.classList.toggle("is-complete-tone", useCompleteTone);
      });
    }

    updateActiveSimulationDraft() {
      this.updateSimulationSlot(this.state.activeSimulationId, {
        inputs: this.state.inputs,
        dirty: true,
        completed: false,
        outcome: null
      });
      this.renderSimulationButtons();
      this.updateActionButtonTone();
    }

    ensureActiveSimulationComplete() {
      const activeSlot = this.state.simulations.find((slot) => slot.id === this.state.activeSimulationId);
      if (!activeSlot || activeSlot.completed) return;

      this.updateSimulationSlot(activeSlot.id, {
        inputs: this.state.inputs,
        dirty: false,
        completed: true,
        outcome: this.buildSimulationOutcome(this.data)
      });
      this.renderSimulationButtons();
    }

    loadSimulationSlot(slotId) {
      const activeSlot = this.state.simulations.find((entry) => entry.id === this.state.activeSimulationId);
      if (activeSlot && (activeSlot.dirty || this.state.running || this.recomputeTimer)) {
        if (this.recomputeTimer) {
          window.clearTimeout(this.recomputeTimer);
          this.recomputeTimer = 0;
        }
        this.state.inputs = sanitizeInputs(this.state.inputs);
        this.data = ROIModel.compute(this.state.inputs);
        this.updateSimulationSlot(activeSlot.id, {
          inputs: this.state.inputs,
          dirty: false,
          completed: true,
          outcome: this.buildSimulationOutcome(this.data)
        });
      }

      this.stopLoop();

      const slot = this.state.simulations.find((entry) => entry.id === slotId);
      if (!slot) return;

      this.state.activeSimulationId = slot.id;
      this.state.inputs = { ...slot.inputs };
      this.state.running = false;
      this.state.progress = slot.completed || this.isReducedMotion ? 1 : 0;
      this.data = ROIModel.compute(this.state.inputs);

      this.syncForm();
      this.updateStaticPanels();
      this.chart.setData(this.data, this.state.viewMode);
      this.renderFrame(performance.now());
      this.updateRunState();
    }

    renderSimulationButtons() {
      this.elements.simulationButtons.forEach((button, index) => {
        const slot = this.state.simulations[index];
        if (!slot) return;

        const isActive = slot.id === this.state.activeSimulationId;
        button.dataset.runId = slot.id;
        button.disabled = false;
        button.classList.remove("is-empty");
        button.classList.toggle("is-active", isActive);
        button.classList.toggle("is-complete", slot.completed);
        button.classList.toggle("is-running", isActive && this.state.running);
        if (isActive) button.setAttribute("aria-current", "true");
        else button.removeAttribute("aria-current");
        button.innerHTML = `<strong class="roi-compare-title">${slot.title}</strong>`;
        button.setAttribute("aria-label", `${slot.title}${isActive ? ". Currently open." : ""}${slot.completed ? " Completed." : ""}`);
      });
    }

    updateViewCaption() {
      this.elements.viewCaption.textContent = viewCaptions[this.state.viewMode];
    }

    scheduleRecompute() {
      if (this.recomputeTimer) window.clearTimeout(this.recomputeTimer);
      this.recomputeTimer = window.setTimeout(() => {
        this.recomputeTimer = 0;
        this.commitRecompute();
      }, 120);
    }

    commitRecompute() {
      if (this.recomputeTimer) {
        window.clearTimeout(this.recomputeTimer);
        this.recomputeTimer = 0;
      }

      this.state.inputs = sanitizeInputs(this.state.inputs);
      this.data = ROIModel.compute(this.state.inputs);
      this.updateSimulationSlot(this.state.activeSimulationId, {
        inputs: this.state.inputs,
        dirty: false,
        completed: true,
        outcome: this.buildSimulationOutcome(this.data)
      });
      this.syncForm();

      this.updateStaticPanels();
      this.chart.setData(this.data, this.state.viewMode);

      if (this.isReducedMotion) {
        this.state.progress = 1;
        this.state.running = false;
        this.updateRunState();
        this.renderFrame(performance.now());
      } else {
        this.state.progress = 0;
        this.playTo(1, UPDATE_ANIMATION_MS);
      }
    }

    updateStaticPanels() {
      const { inputs, metrics, finalPoint } = this.data;
      const breakEven = metrics.breakEven;

      if (breakEven) {
        this.elements.breakBanner.textContent = `Break-even in ${formatMonths(breakEven.time)}. Ends at ${formatPercent(metrics.finalRoi, { signed: true })} ROI.`;
        this.elements.breakBanner.classList.remove("is-warning");
        if (this.elements.kpiBreakEven) {
          this.elements.kpiBreakEven.textContent = formatMonths(breakEven.time, { compact: true });
        }
        if (this.elements.kpiBreakEvenNote) {
          this.elements.kpiBreakEvenNote.textContent = "Revenue catches total cost inside the selected window.";
        }
      } else {
        this.elements.breakBanner.textContent = `No break-even in ${formatMonths(inputs.timeHorizon)}. Ends at ${formatPercent(metrics.finalRoi, { signed: true })} ROI.`;
        this.elements.breakBanner.classList.add("is-warning");
        if (this.elements.kpiBreakEven) {
          this.elements.kpiBreakEven.textContent = "No break-even";
        }
        if (this.elements.kpiBreakEvenNote) {
          this.elements.kpiBreakEvenNote.textContent = "Cumulative revenue never reaches cumulative cost in this window.";
        }
      }

      if (this.elements.kpiMaxLoss) {
        this.elements.kpiMaxLoss.textContent = formatCurrency(metrics.maxLoss, { compact: true });
      }
      if (this.elements.kpiNegativeTime) {
        this.elements.kpiNegativeTime.textContent = formatMonths(metrics.negativeDuration);
      }
      if (this.elements.kpiFinalRoi) {
        this.elements.kpiFinalRoi.textContent = formatPercent(metrics.finalRoi, { signed: true });
        this.elements.kpiFinalRoi.className = metrics.finalRoi >= 0 ? "is-positive" : "is-negative";
      }
      if (this.elements.kpiTotalProfit) {
        this.elements.kpiTotalProfit.textContent = formatCurrency(metrics.totalProfit, { compact: true, signed: true });
        this.elements.kpiTotalProfit.className = metrics.totalProfit >= 0 ? "is-positive" : "is-negative";
      }

      this.updateSnapshot(finalPoint, finalPoint.t);
    }

    describeFocus(point, visibleTime) {
      const breakEven = this.data.metrics.breakEven;
      const monthLabel = formatMonths(point.t, { compact: true });

      if (point.t < this.data.inputs.delay) {
        return `${monthLabel}: the upfront spend has landed, but go-live has not happened yet, so revenue is still at zero.`;
      }

      if (breakEven && Math.abs(point.t - breakEven.time) < 0.6) {
        return `${monthLabel}: cumulative revenue finally catches cumulative cost, so the project has paid for itself.`;
      }

      if (point.profit < 0) {
        const remaining = Math.abs(point.profit);
        return `${monthLabel}: revenue is building, but the project is still ${formatCurrency(remaining, { compact: true })} away from break-even.`;
      }

      if (!breakEven) {
        return `${monthLabel}: revenue never fully catches cost in this window, so the project stays below break-even.`;
      }

      if (visibleTime >= this.data.inputs.timeHorizon) {
        return `${monthLabel}: the scenario ends at ${formatPercent(this.data.finalPoint.roi, { signed: true })} ROI and ${formatCurrency(this.data.finalPoint.profit, { compact: true, signed: true })} total profit.`;
      }

      return `${monthLabel}: the project has already paid back its upfront cost, so each new month adds more return.`;
    }

    updateSnapshot(point, visibleTime) {
      this.elements.snapshotLabel.textContent = formatMonths(point.t, { compact: true });
      this.elements.snapshotRevenue.textContent = formatCurrency(point.cumRevenue, { compact: true });
      this.elements.snapshotCost.textContent = formatCurrency(point.cumCost, { compact: true });
      this.elements.snapshotProfit.textContent = formatCurrency(point.profit, { compact: true, signed: true });
      this.elements.snapshotRoi.textContent = formatPercent(point.roi, { signed: true });

      this.elements.snapshotProfit.className = point.profit >= 0 ? "is-positive" : "is-negative";
      this.elements.snapshotRoi.className = point.roi >= 0 ? "is-positive" : "is-negative";

      this.elements.snapshotText.textContent = this.describeFocus(point, visibleTime);
    }

    renderNarrative(point, visibleTime) {
      this.updateSnapshot(point, visibleTime);
    }

    playTo(target, duration) {
      this.animation = {
        from: this.state.progress,
        to: target,
        duration,
        elapsed: 0,
        lastFrameTime: performance.now()
      };
      this.state.running = true;
      this.updateRunState();
      this.startLoop();
    }

    restart() {
      if (this.isReducedMotion) {
        this.state.progress = 1;
        this.state.running = false;
        this.ensureActiveSimulationComplete();
        this.renderFrame(performance.now());
        this.updateRunState();
        return;
      }

      this.state.progress = 0;
      this.playTo(1, UPDATE_ANIMATION_MS);
    }

    reset() {
      this.state.running = false;
      this.state.progress = 0;
      this.animation.duration = 0;
      this.animation.elapsed = 0;
      this.animation.lastFrameTime = 0;
      this.stopLoop();
      this.renderFrame(performance.now());
      this.updateRunState();
    }

    pause() {
      this.state.running = false;
      this.animation.duration = 0;
      this.animation.elapsed = 0;
      this.animation.lastFrameTime = 0;
      this.updateRunState();
      this.stopLoop();
    }

    resume() {
      if (this.isReducedMotion) {
        this.state.progress = 1;
        this.state.running = false;
        this.ensureActiveSimulationComplete();
        this.renderFrame(performance.now());
        this.updateRunState();
        return;
      }

      if (this.state.progress <= EPSILON) {
        this.restart();
        return;
      }

      if (this.state.progress >= 1) {
        this.restart();
        return;
      }

      const remaining = Math.max((1 - this.state.progress) * LOAD_ANIMATION_MS, 600);
      this.playTo(1, remaining);
    }

    startLoop() {
      if (this.rafId) return;
      this.rafId = window.requestAnimationFrame((time) => this.frame(time));
    }

    stopLoop() {
      if (!this.rafId) return;
      window.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    frame(now) {
      if (this.state.running && this.animation.duration > 0) {
        if (!this.animation.lastFrameTime) {
          this.animation.lastFrameTime = now;
        }

        const delta = Math.max(0, now - this.animation.lastFrameTime);
        this.animation.lastFrameTime = now;
        this.animation.elapsed += delta * this.state.playbackSpeed;

        const raw = clamp(this.animation.elapsed / this.animation.duration, 0, 1);
        const eased = easeInOutCubic(raw);
        this.state.progress = lerp(this.animation.from, this.animation.to, eased);

        if (raw >= 1) {
          this.state.progress = this.animation.to;
          this.state.running = false;
          this.animation.duration = 0;
          this.animation.lastFrameTime = 0;
          if (this.state.progress >= 1) {
            this.ensureActiveSimulationComplete();
          }
          this.updateRunState();
        }
      }

      this.renderFrame(now);

      if (this.state.running) {
        this.rafId = window.requestAnimationFrame((time) => this.frame(time));
      } else {
        this.rafId = 0;
      }
    }

    renderFrame(now) {
      this.elements.progressBar.style.width = `${(this.state.progress * 100).toFixed(1)}%`;
      this.updateTimeCounter();
      this.chart.render(this.state.progress, now);
      this.scheduleHeightReport();
    }

    updateTimeCounter() {
      const horizon = Math.max(1, Math.round(this.data.inputs.timeHorizon));
      const rawMonth = this.state.progress * this.data.inputs.timeHorizon;
      const currentMonth = this.state.progress >= 1 ? horizon : Math.floor(clamp(rawMonth, 0, horizon));
      const activeSlot = this.getActiveSimulation();
      const label = activeSlot ? activeSlot.title : "Simulation";
      this.elements.runStatus.textContent = `${label} | Month ${currentMonth} / ${horizon}`;
    }

    updateRunState() {
      const complete = this.state.progress >= 1 && !this.state.running;
      this.updateActionButtonTone();
      this.elements.replayButton.textContent = "Reset";
      this.elements.replayButton.setAttribute("aria-label", "Reset");

      if (this.isReducedMotion) {
        this.updateTimeCounter();
        this.elements.liveBadge.classList.add("is-paused");
        this.elements.pauseButton.textContent = "Run";
        this.elements.pauseButton.setAttribute("aria-label", "Run");
        this.elements.pauseButton.setAttribute("aria-pressed", "false");
        this.renderSimulationButtons();
        return;
      }

      if (this.state.running) {
        this.elements.liveBadge.classList.remove("is-paused");
        this.elements.pauseButton.textContent = "Pause";
        this.elements.pauseButton.setAttribute("aria-label", "Pause");
        this.elements.pauseButton.setAttribute("aria-pressed", "true");
        this.renderSimulationButtons();
        return;
      }

      if (complete) {
        this.elements.liveBadge.classList.add("is-paused");
        this.elements.pauseButton.textContent = "Run";
        this.elements.pauseButton.setAttribute("aria-label", "Run");
        this.elements.pauseButton.setAttribute("aria-pressed", "false");
        this.renderSimulationButtons();
        return;
      }

      this.elements.liveBadge.classList.add("is-paused");
      this.elements.pauseButton.textContent = "Run";
      this.elements.pauseButton.setAttribute("aria-label", "Run");
      this.elements.pauseButton.setAttribute("aria-pressed", "false");
      this.renderSimulationButtons();
    }

    measureHeight() {
      const doc = document.documentElement;
      const body = document.body;
      return Math.ceil(
        Math.max(
          this.root.getBoundingClientRect().height,
          doc.scrollHeight,
          doc.offsetHeight,
          body.scrollHeight,
          body.offsetHeight
        )
      );
    }

    reportHeight(force = false) {
      const height = this.measureHeight();
      if (!force && Math.abs(height - this.lastHeight) < 1) return;
      this.lastHeight = height;

      if (!this.safeEmbedMode) {
        try {
          if (window.frameElement) {
            window.frameElement.style.height = `${height}px`;
            window.frameElement.setAttribute("height", String(height));
          }
        } catch (error) {
          void error;
        }
      }

      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "simfluence-widget:resize",
            widget: "roi-graphic",
            height
          },
          "*"
        );
      }
    }

    scheduleHeightReport(force = false) {
      if (this.heightRaf) return;
      this.heightRaf = window.requestAnimationFrame(() => {
        this.heightRaf = 0;
        this.reportHeight(force);
      });
    }
  }

  const root = document.querySelector("#roiWidget");
  if (root) {
    new ROIWidget(root);
  }
})();
