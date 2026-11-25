(() => {
  const RECORDS = [
    {
      id: "2024-coastal-ridge-a",
      campaign: "Campaign 2024",
      module: "Coastal North",
      subModule: "Ridge A",
      inputs: { week: 17, h2o: 56, n: 40, p: 24, k: 43, temperature: 20, humidity: 74, wind: 8, rain: 15, solar: 6.9 },
      site: { canopy: 0.68, drainage: 0.71, shelter: 0.66, fruitPotential: 0.74, lightBias: 0.1, heatBias: -0.5 }
    },
    {
      id: "2024-coastal-ridge-b",
      campaign: "Campaign 2024",
      module: "Coastal North",
      subModule: "Ridge B",
      inputs: { week: 18, h2o: 60, n: 42, p: 26, k: 45, temperature: 21, humidity: 72, wind: 9, rain: 13, solar: 7.1 },
      site: { canopy: 0.7, drainage: 0.69, shelter: 0.62, fruitPotential: 0.76, lightBias: 0.2, heatBias: -0.2 }
    },
    {
      id: "2024-valley-central",
      campaign: "Campaign 2024",
      module: "Valley Block",
      subModule: "Central Bed",
      inputs: { week: 18, h2o: 63, n: 44, p: 27, k: 47, temperature: 22, humidity: 69, wind: 10, rain: 12, solar: 7.5 },
      site: { canopy: 0.66, drainage: 0.64, shelter: 0.59, fruitPotential: 0.72, lightBias: 0.35, heatBias: 0.4 }
    },
    {
      id: "2025-high-tunnel-east",
      campaign: "Campaign 2025",
      module: "High Tunnel",
      subModule: "East Canopy",
      inputs: { week: 19, h2o: 58, n: 46, p: 29, k: 50, temperature: 23, humidity: 71, wind: 5, rain: 8, solar: 7.8 },
      site: { canopy: 0.76, drainage: 0.79, shelter: 0.84, fruitPotential: 0.83, lightBias: 0.25, heatBias: 0.2 }
    },
    {
      id: "2025-high-tunnel-west",
      campaign: "Campaign 2025",
      module: "High Tunnel",
      subModule: "West Canopy",
      inputs: { week: 20, h2o: 61, n: 48, p: 30, k: 52, temperature: 24, humidity: 69, wind: 6, rain: 7, solar: 8.1 },
      site: { canopy: 0.78, drainage: 0.77, shelter: 0.82, fruitPotential: 0.84, lightBias: 0.32, heatBias: 0.35 }
    },
    {
      id: "2025-coastal-morning",
      campaign: "Campaign 2025",
      module: "Coastal Block",
      subModule: "Morning Row",
      inputs: { week: 19, h2o: 57, n: 43, p: 27, k: 48, temperature: 21, humidity: 76, wind: 9, rain: 16, solar: 6.7 },
      site: { canopy: 0.69, drainage: 0.74, shelter: 0.7, fruitPotential: 0.77, lightBias: -0.05, heatBias: -0.4 }
    },
    {
      id: "2026-research-alpha",
      campaign: "Campaign 2026",
      module: "Research Block",
      subModule: "Trial Alpha",
      inputs: { week: 18, h2o: 55, n: 47, p: 28, k: 51, temperature: 22, humidity: 68, wind: 11, rain: 10, solar: 8.2 },
      site: { canopy: 0.72, drainage: 0.76, shelter: 0.57, fruitPotential: 0.82, lightBias: 0.5, heatBias: 0.5 }
    },
    {
      id: "2026-research-beta",
      campaign: "Campaign 2026",
      module: "Research Block",
      subModule: "Trial Beta",
      inputs: { week: 21, h2o: 64, n: 49, p: 31, k: 56, temperature: 24, humidity: 66, wind: 12, rain: 9, solar: 8.6 },
      site: { canopy: 0.74, drainage: 0.72, shelter: 0.55, fruitPotential: 0.86, lightBias: 0.58, heatBias: 0.6 }
    },
    {
      id: "2026-foothill-terrace",
      campaign: "Campaign 2026",
      module: "Foothill Terrace",
      subModule: "Late Slope",
      inputs: { week: 22, h2o: 66, n: 45, p: 29, k: 54, temperature: 25, humidity: 64, wind: 13, rain: 8, solar: 8.8 },
      site: { canopy: 0.67, drainage: 0.81, shelter: 0.51, fruitPotential: 0.79, lightBias: 0.68, heatBias: 0.9 }
    }
  ];

  const DEFAULT_RECORD = RECORDS.find((record) => record.id === "2025-coastal-morning") || RECORDS[0];
  const CANVAS_COLORS = {
    navy: "#0A2540",
    navyRgb: "10,37,64",
    layer: "#0D3156",
    layerRgb: "13,49,86",
    accent: "#1E96EC",
    accentRgb: "31,151,237",
    orange: "#FF7F22",
    orangeRgb: "255,127,34"
  };
  const PLANT_COLORS = {
    bladeRgb: "124,214,98",
    bladeLightRgb: "212,255,182",
    bladeShadowRgb: "56,126,66",
    stemRgb: "150,196,95",
    huskRgb: "146,201,108",
    kernelRgb: "255,220,146"
  };

  const RANGES = {
    week: { min: 10, max: 30, step: 1, suffix: " wk", digits: 0 },
    h2o: { min: 30, max: 90, step: 1, suffix: " mm", digits: 0 },
    n: { min: 18, max: 72, step: 1, suffix: " kg/ha", digits: 0 },
    p: { min: 10, max: 48, step: 1, suffix: " kg/ha", digits: 0 },
    k: { min: 18, max: 78, step: 1, suffix: " kg/ha", digits: 0 },
    temperature: { min: 10, max: 35, step: 1, suffix: " C", digits: 0 },
    humidity: { min: 35, max: 95, step: 1, suffix: "%", digits: 0 },
    wind: { min: 0, max: 30, step: 1, suffix: " km/h", digits: 0 },
    rain: { min: 0, max: 55, step: 1, suffix: " mm", digits: 0 },
    solar: { min: 3, max: 11, step: 0.1, suffix: " MJ", digits: 1 }
  };

  const CLASS_META = [
    { min: 84, key: "reserve", label: "Reserve", tone: "#135b3f", fill: "linear-gradient(135deg,rgba(121,214,162,.28),rgba(98,183,255,.14))" },
    { min: 72, key: "premium", label: "Premium", tone: "#1c5d8b", fill: "linear-gradient(135deg,rgba(98,183,255,.22),rgba(121,214,162,.14))" },
    { min: 60, key: "strong", label: "Strong", tone: "#6d4a14", fill: "linear-gradient(135deg,rgba(255,190,99,.24),rgba(121,214,162,.14))" },
    { min: 48, key: "watch", label: "Watch", tone: "#8d5830", fill: "linear-gradient(135deg,rgba(255,190,99,.22),rgba(215,108,164,.14))" },
    { min: 0, key: "risk", label: "At Risk", tone: "#8f3747", fill: "linear-gradient(135deg,rgba(208,95,95,.24),rgba(215,108,164,.14))" }
  ];

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const round = (value, digits = 0) => Number(value.toFixed(digits));
  const norm = (value, min, max) => clamp((value - min) / Math.max(max - min, 0.0001), 0, 1);
  const smoothstep = (edge0, edge1, value) => {
    const t = clamp((value - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const ease = (value) => 1 - Math.pow(1 - clamp(value, 0, 1), 3);
  const gaussian = (value, center, spread) => Math.exp(-Math.pow((value - center) / Math.max(spread, 0.0001), 2));
  const logistic = (value) => 1 / (1 + Math.exp(-value));

  function fmt(value, digits = 0) {
    return Number(value).toFixed(digits);
  }

  function signed(value, digits = 1, suffix = "") {
    const n = Number(value);
    const prefix = n > 0 ? "+" : "";
    return `${prefix}${n.toFixed(digits)}${suffix}`;
  }

  function deepBlend(fromValue, toValue, t) {
    if (typeof fromValue === "number" && typeof toValue === "number") return lerp(fromValue, toValue, t);
    if (Array.isArray(fromValue) && Array.isArray(toValue)) return toValue.map((item, index) => deepBlend(fromValue[index], item, t));
    if (fromValue && toValue && typeof fromValue === "object" && typeof toValue === "object") {
      const out = {};
      Object.keys(toValue).forEach((key) => {
        out[key] = deepBlend(fromValue[key], toValue[key], t);
      });
      return out;
    }
    return t < 0.5 ? fromValue : toValue;
  }

  function productionClass(score) {
    return CLASS_META.find((entry) => score >= entry.min) || CLASS_META[CLASS_META.length - 1];
  }

  function qualityLabel(value) {
    if (value >= 78) return "High quality";
    if (value >= 62) return "Strong quality";
    if (value >= 42) return "Developing";
    return "Early quality";
  }

  function vigorLabel(value) {
    if (value >= 0.84) return "Very high";
    if (value >= 0.74) return "High";
    if (value >= 0.62) return "Balanced";
    if (value >= 0.5) return "Fragile";
    return "Stressed";
  }

  function maturityLabel(value) {
    if (value >= 88) return "Ready window";
    if (value >= 72) return "Maturing";
    if (value >= 54) return "Fill stage";
    if (value >= 36) return "Set stage";
    return "Early stage";
  }

  function normalizeSplit(big, medium, small) {
    const total = Math.max(big + medium + small, 0.0001);
    const bigPct = (big / total) * 100;
    const smallPct = (small / total) * 100;
    const mediumPct = 100 - bigPct - smallPct;
    return { big: bigPct, medium: mediumPct, small: smallPct };
  }

  function describeResource(metrics) {
    if (metrics.balances.resourceFit >= 82) return "Input balance is close to plant demand.";
    if (metrics.balances.resourceFit >= 68) return "Inputs are generally on track, but the mix still has room to tighten.";
    return "Inputs are drifting away from plant demand, so performance is starting to soften.";
  }

  function describeVigor(metrics) {
    if (metrics.states.ndvi >= 0.82) return "Canopy energy is supporting strong stem growth and site retention.";
    if (metrics.states.ndvi >= 0.68) return "Plant structure is stable, though growth is no longer accelerating quickly.";
    return "The plant is spending more energy on stress management than on fresh growth.";
  }

  function describeOutcome(metrics) {
    if (metrics.outcomes.qualityIndex >= 78 && metrics.outcomes.big >= 40) return "Quality and size are aligned for a stronger final result.";
    if (metrics.outcomes.qualityIndex >= 62) return "Output quality is moving in the right direction, led by a better finish and stronger sizing.";
    return "Output quality is still developing, so the mix leans more medium and small than large premium units.";
  }

  function describeStress(metrics) {
    if (metrics.balances.stress <= 0.2) return "Environmental drag remains manageable this week.";
    if (metrics.balances.stress <= 0.35) return "Some wind, moisture, or heat stress is visible but not yet dominant.";
    return "Stress is becoming a major driver of yield loss, smaller output, and a weaker final class.";
  }

  function buildStory(metrics) {
    const dominant = metrics.balances.resourceFit >= 78
      ? "Input balance is supporting strong plant performance."
      : metrics.balances.stress > 0.35
        ? "Stress is overtaking the production pipeline."
        : "Plant performance is stable, but not fully optimized.";

    let copy = "";
    if (metrics.balances.resourceFit >= 78) {
      copy = "Water, nutrient timing, and moderate weather are supporting plant vigor first, then moving the result toward better quality and larger output.";
    } else if (metrics.balances.stress > 0.35) {
      copy = "Wind, moisture imbalance, or temperature drag is interrupting the flow from inputs to plant performance, which is showing up as more loss and a smaller output mix.";
    } else {
      copy = "The plant is progressing, but one or two conditions are keeping growth and maturity from turning into a stronger final class.";
    }
    return { title: dominant, copy };
  }

  function blendNumericObject(from, to, progress) {
    const out = {};
    Object.keys(to).forEach((key) => {
      out[key] = lerp(from[key], to[key], progress);
    });
    return out;
  }

  function decorateScenarioMetrics(metrics) {
    const classMeta = productionClass(metrics.score);
    const qualityIndex = clamp(norm(metrics.outcomes.brix, 10.5, 18.2) * 100, 0, 100);
    const story = buildStory({
      balances: { resourceFit: metrics.balances.resourceFit, stress: metrics.balances.stress },
      states: { ndvi: metrics.states.ndvi },
      outcomes: { brix: metrics.outcomes.brix, big: metrics.outcomes.big }
    });

    return {
      ...metrics,
      classMeta,
      derived: {
        qualityIndex
      },
      labels: {
        vigor: vigorLabel(metrics.states.ndvi),
        maturity: maturityLabel(metrics.states.maturation),
        quality: qualityLabel(qualityIndex)
      },
      insight: {
        title: story.title,
        copy: story.copy,
        hero: classMeta.label === "Reserve"
          ? "The plant is converting clean inputs into high output quality and a strong final class."
          : classMeta.label === "Premium"
            ? "Input balance is supporting steady vigor and a stronger quality profile."
            : classMeta.label === "Strong"
              ? "The scenario is commercially solid, but the final profile still depends on tightening one or two conditions."
              : classMeta.label === "Watch"
                ? "The plant is progressing, though stress or imbalance is holding back a better final result."
                : "Too much stress is leaking value between plant performance and final output."
      },
      footer: {
        resource: describeResource({ balances: { resourceFit: metrics.balances.resourceFit } }),
        vigor: describeVigor({ states: { ndvi: metrics.states.ndvi } }),
        output: describeOutcome({ outcomes: { qualityIndex, big: metrics.outcomes.big } }),
        stress: describeStress({ balances: { stress: metrics.balances.stress } })
      }
    };
  }
  function buildSimulationFrame(startMetrics, targetMetrics, progress) {
    if (!targetMetrics) return null;
    if (!startMetrics) return targetMetrics;

    const t = clamp(progress, 0, 1);
    const plantT = smoothstep(0.12, 0.72, t);
    const outcomeT = smoothstep(0.42, 1, t);
    const base = {
      score: lerp(startMetrics.score, targetMetrics.score, outcomeT),
      inputs: { ...targetMetrics.inputs },
      adjusted: { ...targetMetrics.adjusted },
      balances: blendNumericObject(startMetrics.balances, targetMetrics.balances, smoothstep(0, 0.46, t)),
      states: blendNumericObject(startMetrics.states, targetMetrics.states, plantT),
      outcomes: blendNumericObject(startMetrics.outcomes, targetMetrics.outcomes, outcomeT)
    };

    const mix = normalizeSplit(base.outcomes.big, base.outcomes.medium, base.outcomes.small);
    base.outcomes.big = mix.big;
    base.outcomes.medium = mix.medium;
    base.outcomes.small = mix.small;
    return decorateScenarioMetrics(base);
  }

  function computeSimulation(record, controls) {
    const site = record.site;

    const week = clamp(controls.week, RANGES.week.min, RANGES.week.max);
    const flowering = gaussian(week, 13.5, 3.8);
    const fruitSet = gaussian(week, 18.4, 4.2);
    const ripening = logistic((week - 20.5) / 2.3);
    const lateSeason = logistic((week - 25.2) / 1.9);

    const adjusted = {
      h2o: controls.h2o,
      n: controls.n,
      p: controls.p,
      k: controls.k,
      temperature: controls.temperature,
      humidity: controls.humidity,
      wind: controls.wind,
      rain: controls.rain,
      solar: controls.solar
    };

    // Calibrate agronomy around both shortage and excess so each crop slider
    // can visibly move plant state and commercial outcome.
    const targetWater = 47 + fruitSet * 8 + ripening * 5 + site.drainage * 3.2;
    const targetN = 32 + flowering * 10 + fruitSet * 6;
    const targetP = 18 + flowering * 7 + fruitSet * 6.5;
    const targetK = 29 + fruitSet * 9 + ripening * 16;
    const targetTemp = 18.5 + ripening * 4.2 + site.heatBias;
    const targetHumidity = 67 + flowering * 5 + fruitSet * 4;
    const targetSolar = 6.1 + ripening * 2.2 + site.lightBias;

    const waterSupply =
      adjusted.h2o +
      adjusted.rain * 0.48 +
      adjusted.humidity * 0.06 -
      adjusted.wind * 0.42 -
      Math.max(0, adjusted.temperature - 21) * 0.7 -
      adjusted.solar * 0.9;
    const waterBalance = gaussian(waterSupply, targetWater, 11);
    const nBalance = gaussian(adjusted.n, targetN, 10.5);
    const pBalance = gaussian(adjusted.p, targetP, 7.2);
    const kBalance = gaussian(adjusted.k, targetK, 11.5);
    const nutrientBalance = clamp(nBalance * 0.36 + pBalance * 0.24 + kBalance * 0.4, 0, 1);
    const tempBalance = gaussian(adjusted.temperature, targetTemp, 4.3);
    const humidityBalance = gaussian(adjusted.humidity, targetHumidity, 13);
    const solarBalance = gaussian(adjusted.solar, targetSolar, 1.5);
    const climateComfort = clamp(tempBalance * 0.42 + humidityBalance * 0.25 + solarBalance * 0.33, 0, 1);

    const waterDeficit = clamp((targetWater - waterSupply) / 18, 0, 1);
    const waterExcess = clamp((waterSupply - (targetWater + 7)) / 18, 0, 1);
    const nDeficit = clamp((targetN - adjusted.n) / 16, 0, 1);
    const nExcess = clamp((adjusted.n - (targetN + 7)) / 18, 0, 1);
    const pDeficit = clamp((targetP - adjusted.p) / 10, 0, 1);
    const pExcess = clamp((adjusted.p - (targetP + 4)) / 9, 0, 1);
    const kDeficit = clamp((targetK - adjusted.k) / 16, 0, 1);
    const kExcess = clamp((adjusted.k - (targetK + 7)) / 16, 0, 1);

    const windStress = norm(adjusted.wind, 10, 26);
    const rainStress = norm(adjusted.rain, 24, 55);
    const heatStress = norm(adjusted.temperature, 28, 35);
    const moistureStress = norm(adjusted.humidity, 85, 95);
    const fertilityStress = clamp(nExcess * 0.42 + pExcess * 0.24 + kExcess * 0.28, 0, 1);
    const deficiencyStress = clamp(nDeficit * 0.34 + pDeficit * 0.28 + kDeficit * 0.32, 0, 1);
    const stress = clamp(
      windStress * 0.18 +
      rainStress * 0.16 +
      heatStress * 0.24 +
      moistureStress * 0.1 +
      waterDeficit * 0.24 +
      waterExcess * 0.18 +
      fertilityStress * 0.16 +
      deficiencyStress * 0.14 +
      (1 - climateComfort) * 0.18,
      0,
      0.95
    );

    const rootStrength = clamp(
      0.26 +
      waterBalance * 0.28 +
      pBalance * 0.28 +
      site.drainage * 0.16 -
      waterExcess * 0.14 -
      stress * 0.16,
      0,
      1
    );

    const canopyPush = clamp(
      0.18 +
      waterBalance * 0.24 +
      nBalance * 0.22 +
      pBalance * 0.11 +
      climateComfort * 0.16 +
      rootStrength * 0.12 +
      site.canopy * 0.12 -
      nExcess * 0.12 -
      stress * 0.16,
      0,
      1
    );

    const fruitFill = clamp(
      0.2 +
      kBalance * 0.24 +
      waterBalance * 0.18 +
      nutrientBalance * 0.14 +
      climateComfort * 0.12 +
      rootStrength * 0.12 +
      site.fruitPotential * 0.14 -
      stress * 0.2 -
      waterExcess * 0.1,
      0,
      1
    );

    const resourceEnergy = clamp(rootStrength * 0.34 + canopyPush * 0.33 + fruitFill * 0.33, 0, 1);
    const resourceFit = clamp(
      (
        waterBalance * 0.3 +
        nutrientBalance * 0.28 +
        climateComfort * 0.2 +
        rootStrength * 0.1 +
        fruitFill * 0.12
      ) * 100,
      0,
      100
    );

    const ndvi = clamp(
      0.34 +
      canopyPush * 0.38 +
      flowering * 0.05 +
      fruitSet * 0.04 -
      lateSeason * 0.05 -
      stress * 0.11,
      0.28,
      0.92
    );

    const evo = clamp(36 + canopyPush * 28 + rootStrength * 16 + fruitFill * 8 + ripening * 9 - stress * 16, 24, 94);
    const lr = clamp(0.48 + kBalance * 0.22 + fruitFill * 0.16 + climateComfort * 0.08 - stress * 0.18, 0.34, 1.22);
    const stemsPerMeter = clamp(
      6.6 +
      canopyPush * 5.1 +
      nBalance * 1.8 +
      waterBalance * 1.4 +
      site.canopy * 2.4 -
      nExcess * 1.4 -
      stress * 2.2,
      5.6,
      17.4
    );
    const overcrowd = clamp((stemsPerMeter - 13.1) / 3.8, 0, 1);
    const totalBuds = clamp(
      66 +
      stemsPerMeter * 7.8 +
      flowering * 40 +
      fruitSet * 52 +
      pBalance * 22 +
      nBalance * 18 +
      site.fruitPotential * 28 -
      deficiencyStress * 50 -
      stress * 64 -
      overcrowd * 24,
      52,
      320
    );
    const budsPerBunches = clamp(
      3 +
      nutrientBalance * 2 +
      pBalance * 0.45 +
      rootStrength * 0.8 +
      fruitSet * 1.6 +
      site.fruitPotential * 0.9 -
      deficiencyStress * 1 -
      stress * 1.1,
      2.4,
      8.8
    );
    const maturation = clamp(
      12 +
      ripening * 56 +
      climateComfort * 9 +
      solarBalance * 9 +
      kBalance * 6 +
      pBalance * 6 -
      waterExcess * 8 -
      stress * 20,
      8,
      100
    );
    const aborted = clamp(
      5.2 +
      stress * 23 +
      waterDeficit * 6 +
      waterExcess * 4 +
      deficiencyStress * 6 +
      rainStress * 3.5 +
      overcrowd * 7 -
      site.shelter * 4.2,
      2.5,
      44
    );

    const sizeSplit = normalizeSplit(
      1.1 + fruitFill * 1.6 + kBalance * 0.8 + (maturation / 100) * 0.65 - stress * 0.8 - waterExcess * 0.35,
      1.6 + nutrientBalance * 0.7 + climateComfort * 0.6 + fruitSet * 0.42,
      0.9 + stress * 1.3 + waterDeficit * 0.7 + deficiencyStress * 0.55 + overcrowd * 0.6
    );

    const brix = clamp(
      8.4 +
      (maturation / 100) * 5.8 +
      solarBalance * 1.6 +
      kBalance * 1.5 +
      climateComfort * 0.7 -
      nExcess * 0.8 -
      waterExcess * 1 -
      stress * 2.2 -
      rainStress * 0.5,
      8,
      19.4
    );

    const qualityScore = clamp(norm(brix, 10.5, 18.2) * 100, 0, 100);
    const sizeScore = clamp(sizeSplit.big * 1.25 - sizeSplit.small * 0.45, 0, 100);
    const vigorScore = clamp(norm(ndvi, 0.44, 0.88) * 100, 0, 100);
    const lossScore = clamp(100 - aborted * 2.3, 0, 100);
    const maturityScore = clamp(maturation, 0, 100);

    const score = clamp(
      qualityScore * 0.23 +
      sizeScore * 0.2 +
      vigorScore * 0.2 +
      lossScore * 0.16 +
      maturityScore * 0.09 +
      canopyPush * 100 * 0.06 +
      fruitFill * 100 * 0.06,
      18,
      97
    );

    return decorateScenarioMetrics({
      score,
      inputs: { ...controls },
      adjusted,
      balances: {
        waterBalance,
        nutrientBalance,
        climateComfort,
        solarBalance,
        stress,
        resourceEnergy,
        resourceFit
      },
      states: {
        ndvi,
        evo,
        lr,
        stemsPerMeter,
        totalBuds,
        budsPerBunches,
        maturation
      },
      outcomes: {
        brix,
        big: sizeSplit.big,
        medium: sizeSplit.medium,
        small: sizeSplit.small,
        aborted
      }
    });
  }

  class CropWidget {
    constructor(root) {
      this.root = root;
      this.canvas = document.getElementById("simCanvas");
      this.ctx = this.canvas.getContext("2d");
      this.surface = document.getElementById("canvasSurface");
      this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      this.refs = {
        runButton: document.getElementById("runButton"),
        progressBar: document.getElementById("progressBar"),
        classBadge: document.getElementById("classBadge"),
        classScore: document.getElementById("classScore"),
        classCopy: document.getElementById("classCopy"),
        resourceFitValue: document.getElementById("resourceFitValue"),
        resourceFitCopy: document.getElementById("resourceFitCopy"),
        vigorLabel: document.getElementById("vigorLabel"),
        vigorCopy: document.getElementById("vigorCopy"),
        fruitSignalValue: document.getElementById("fruitSignalValue"),
        fruitSignalCopy: document.getElementById("fruitSignalCopy"),
        stressValue: document.getElementById("stressValue"),
        stressCopy: document.getElementById("stressCopy"),
        storyTitle: document.getElementById("storyTitle"),
        storyCopy: document.getElementById("storyCopy"),
        distributionLabel: document.getElementById("distributionLabel"),
        bigSegment: document.getElementById("bigSegment"),
        mediumSegment: document.getElementById("mediumSegment"),
        smallSegment: document.getElementById("smallSegment"),
        simulationNote: document.getElementById("simulationNote")
      };

      this.metricRefs = {
        ndvi: document.getElementById("ndviMetric"),
        maturation: document.getElementById("maturationMetric"),
        brix: document.getElementById("brixMetric"),
        aborted: document.getElementById("abortedMetric"),
        big: document.getElementById("bigMetric"),
        medium: document.getElementById("mediumMetric"),
        small: document.getElementById("smallMetric"),
        evo: document.getElementById("evoMetric"),
        lr: document.getElementById("lrMetric"),
        stems: document.getElementById("stemsMetric"),
        buds: document.getElementById("budsMetric"),
        bunch: document.getElementById("bunchMetric")
      };

      this.inputs = {};
      Object.keys(RANGES).forEach((key) => {
        this.inputs[key] = {
          input: document.getElementById(`${key}Input`),
          output: document.getElementById(`${key}Value`)
        };
      });

      this.state = {
        controls: { ...DEFAULT_RECORD.inputs },
        isRunning: false,
        hasPendingChanges: false,
        simulationProgress: 0,
        targetMetrics: null,
        committedMetrics: null,
        animationStartMetrics: null,
        displayMetrics: null,
        runDurationMs: 2200,
        lastFrame: performance.now()
      };

      this.bind();
      this.syncInputs();
      const baselineMetrics = this.computeCurrentMetrics();
      this.state.targetMetrics = baselineMetrics;
      this.state.committedMetrics = baselineMetrics;
      this.state.animationStartMetrics = baselineMetrics;
      this.state.displayMetrics = baselineMetrics;
      this.renderDom(baselineMetrics);
      this.syncSimulationUi();
      this.resizeCanvas();
      this.loop(performance.now());
      window.addEventListener("resize", () => this.resizeCanvas(), { passive: true });
    }

    bind() {
      Object.entries(this.inputs).forEach(([key, ref]) => {
        if (!ref.input) return;
        ref.input.addEventListener("input", () => {
          this.state.controls[key] = Number(ref.input.value);
          this.syncSliderValue(key);
          this.queueScenarioReset({ preserveDisplay: true });
        });
      });

      this.refs.runButton.addEventListener("click", () => this.runSimulation());
    }

    syncInputs() {
      Object.keys(this.inputs).forEach((key) => {
        if (!this.inputs[key].input) return;
        this.inputs[key].input.value = `${this.state.controls[key]}`;
        this.syncSliderValue(key);
      });
    }

    syncSliderValue(key) {
      const ref = this.inputs[key];
      if (!ref || !ref.output) return;
      const range = RANGES[key];
      ref.output.textContent = `${fmt(this.state.controls[key], range.digits)}${range.suffix}`;
    }

    computeCurrentMetrics() {
      return computeSimulation(DEFAULT_RECORD, this.state.controls);
    }

    queueScenarioReset({ preserveDisplay = true } = {}) {
      this.state.isRunning = false;
      this.state.simulationProgress = 0;
      this.state.targetMetrics = this.computeCurrentMetrics();
      this.state.hasPendingChanges = preserveDisplay;
      if (!preserveDisplay || !this.state.displayMetrics) {
        this.state.committedMetrics = this.state.targetMetrics;
        this.state.animationStartMetrics = this.state.targetMetrics;
        this.state.displayMetrics = this.state.targetMetrics;
        this.renderDom(this.state.displayMetrics);
      } else if (this.state.committedMetrics) {
        this.state.displayMetrics = this.state.committedMetrics;
        this.renderDom(this.state.displayMetrics);
      }
      this.syncSimulationUi();
    }

    runSimulation() {
      if (this.state.isRunning) return;
      if (!this.state.targetMetrics) this.queueScenarioReset({ preserveDisplay: false });
      this.state.animationStartMetrics = this.state.committedMetrics || this.state.displayMetrics || this.state.targetMetrics;
      this.state.simulationProgress = 0;
      this.state.hasPendingChanges = false;
      this.state.displayMetrics = buildSimulationFrame(this.state.animationStartMetrics, this.state.targetMetrics, 0);
      this.renderDom(this.state.displayMetrics);
      if (this.reducedMotion) {
        this.state.isRunning = false;
        this.state.simulationProgress = 1;
        this.state.displayMetrics = buildSimulationFrame(this.state.animationStartMetrics, this.state.targetMetrics, 1);
        this.state.committedMetrics = this.state.targetMetrics;
        this.state.animationStartMetrics = this.state.targetMetrics;
        this.renderDom(this.state.displayMetrics);
        this.syncSimulationUi();
        return;
      }
      this.state.isRunning = true;
      this.syncSimulationUi();
    }

    syncSimulationUi() {
      this.root.classList.toggle("is-running", this.state.isRunning);
      this.refs.runButton.textContent = this.state.isRunning ? "Simulation running" : "Run simulation";
      if (this.state.isRunning) {
        this.refs.simulationNote.textContent = "Simulation is running. Watch the canvas carry the scenario from inputs to outcome.";
        return;
      }

      if (this.state.hasPendingChanges) {
        this.refs.simulationNote.textContent = "Inputs changed. Outputs still show the last simulated result. Press Run to apply the new scenario.";
        return;
      }

      if (this.state.simulationProgress >= 1) {
        this.refs.simulationNote.textContent = "Simulation complete. Adjust inputs and press Run to simulate a new scenario.";
        return;
      }

      if (this.state.simulationProgress > 0) {
        this.refs.simulationNote.textContent = "Simulation staged at the latest frame. Press Run to replay it or change inputs to prepare a new scenario.";
        return;
      }

      this.refs.simulationNote.textContent = "Current scenario loaded. Adjust inputs and press Run when you want to simulate changes.";
    }

    resizeCanvas() {
      const rect = this.surface.getBoundingClientRect();
      const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      if (this.canvas.width === Math.round(width * dpr) && this.canvas.height === Math.round(height * dpr)) return;
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    updateSimulation(dt) {
      if (!this.state.isRunning) return;
      const delta = dt / Math.max(this.state.runDurationMs / 1000, 0.001);
      this.state.simulationProgress = clamp(this.state.simulationProgress + delta, 0, 1);
      this.state.displayMetrics = buildSimulationFrame(this.state.animationStartMetrics, this.state.targetMetrics, this.state.simulationProgress);
      if (this.state.simulationProgress >= 1) {
        this.state.isRunning = false;
        this.state.committedMetrics = this.state.targetMetrics;
        this.state.animationStartMetrics = this.state.targetMetrics;
        this.syncSimulationUi();
      }
    }

    renderDom(metrics) {
      if (!metrics) return;
      const classMeta = productionClass(metrics.score);

      this.refs.progressBar.style.width = `${(this.state.simulationProgress * 100).toFixed(1)}%`;
      this.refs.classBadge.textContent = classMeta.label;
      this.refs.classBadge.style.background = classMeta.fill;
      this.refs.classBadge.style.color = classMeta.tone;
      this.refs.classScore.textContent = fmt(metrics.score, 0);
      this.refs.classCopy.textContent = `${metrics.labels.vigor} vigor, ${metrics.labels.maturity.toLowerCase()}, and ${metrics.labels.quality.toLowerCase()} across the current scenario.`;

      this.refs.resourceFitValue.textContent = fmt(metrics.balances.resourceFit, 0);
      this.refs.resourceFitCopy.textContent = metrics.footer.resource;
      this.refs.vigorLabel.textContent = metrics.labels.vigor;
      this.refs.vigorCopy.textContent = metrics.footer.vigor;
      this.refs.fruitSignalValue.textContent = `${fmt(metrics.derived.qualityIndex, 0)} / 100`;
      this.refs.fruitSignalCopy.textContent = metrics.footer.output;
      this.refs.stressValue.textContent = `${fmt(metrics.balances.stress * 100, 0)}%`;
      this.refs.stressCopy.textContent = metrics.footer.stress;
      this.refs.storyTitle.textContent = metrics.insight.title;
      this.refs.storyCopy.textContent = metrics.insight.copy;
      this.refs.distributionLabel.textContent = `${metrics.labels.quality} output profile`;

      this.metricRefs.ndvi.textContent = fmt(metrics.states.ndvi, 2);
      this.metricRefs.maturation.textContent = `${fmt(metrics.states.maturation, 0)}%`;
      this.metricRefs.brix.textContent = fmt(metrics.derived.qualityIndex, 0);
      this.metricRefs.aborted.textContent = `${fmt(metrics.outcomes.aborted, 1)}%`;
      this.metricRefs.big.textContent = `${fmt(metrics.outcomes.big, 0)}%`;
      this.metricRefs.medium.textContent = `${fmt(metrics.outcomes.medium, 0)}%`;
      this.metricRefs.small.textContent = `${fmt(metrics.outcomes.small, 0)}%`;
      this.metricRefs.evo.textContent = fmt(metrics.states.evo, 0);
      this.metricRefs.lr.textContent = fmt(metrics.states.lr, 2);
      this.metricRefs.stems.textContent = fmt(metrics.states.stemsPerMeter, 1);
      this.metricRefs.buds.textContent = fmt(metrics.states.totalBuds, 0);
      this.metricRefs.bunch.textContent = fmt(metrics.states.budsPerBunches, 1);

      this.refs.bigSegment.style.width = `${metrics.outcomes.big.toFixed(2)}%`;
      this.refs.mediumSegment.style.width = `${metrics.outcomes.medium.toFixed(2)}%`;
      this.refs.smallSegment.style.width = `${metrics.outcomes.small.toFixed(2)}%`;
    }

    loop(now) {
      const dt = Math.min((now - this.state.lastFrame) / 1000, 0.1);
      this.state.lastFrame = now;
      this.updateSimulation(dt);
      const metrics = this.state.displayMetrics || buildSimulationFrame(this.state.animationStartMetrics, this.state.targetMetrics, this.state.simulationProgress);
      this.renderDom(metrics);
      this.drawCanvas(metrics, now);
      requestAnimationFrame((time) => this.loop(time));
    }

    drawCanvas(metrics, now) {
      const rect = this.surface.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const ctx = this.ctx;
      if (!width || !height) return;

      ctx.clearRect(0, 0, width, height);

      const progress = this.reducedMotion ? 1 : this.state.simulationProgress;
      const runActive = this.state.isRunning && !this.reducedMotion;
      const inputPhase = smoothstep(0, 0.38, progress);
      const plantPhase = smoothstep(0.02, 0.74, progress);
      const outcomePhase = smoothstep(0.56, 1, progress);
      const idle = now * 0.001;

      const leftX = width * 0.18;
      const centerX = width * 0.5;
      const rightX = width * 0.82;
      const centerY = height * 0.52;
      const zoneWidth = width * 0.24;
      const zoneHeight = height * 0.64;

      this.drawBackdrop(ctx, width, height, metrics, idle, runActive);
      this.drawZoneGlow(ctx, leftX, centerY, zoneWidth, zoneHeight, CANVAS_COLORS.accentRgb, 0.14, runActive);
      this.drawZoneGlow(ctx, centerX, centerY, zoneWidth, zoneHeight, CANVAS_COLORS.layerRgb, 0.18, runActive);
      this.drawZoneGlow(ctx, rightX, centerY, zoneWidth, zoneHeight, CANVAS_COLORS.orangeRgb, 0.12, runActive);
      this.drawFlowLinks(ctx, leftX, centerX, rightX, centerY, metrics, idle, inputPhase, plantPhase, outcomePhase, runActive);
      this.drawResources(ctx, leftX, centerY, metrics, idle, inputPhase, runActive);
      this.drawPlant(ctx, centerX, centerY, metrics, idle, plantPhase, runActive);
      this.drawOutcome(ctx, rightX, centerY, metrics, idle, outcomePhase, runActive);
      this.drawZoneCaptions(ctx, width, height, metrics);
    }

    drawBackdrop(ctx, width, height, metrics, idle, runActive) {
      const fill = ctx.createLinearGradient(0, 0, 0, height);
      fill.addColorStop(0, CANVAS_COLORS.navy);
      fill.addColorStop(0.56, "#0B2845");
      fill.addColorStop(1, "#081C31");
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, width, height);

      const orchard = ctx.createLinearGradient(0, height * 0.42, 0, height);
      orchard.addColorStop(0, "rgba(10,37,64,0)");
      orchard.addColorStop(1, "rgba(13,49,86,0.48)");
      ctx.fillStyle = orchard;
      ctx.fillRect(0, height * 0.42, width, height * 0.58);

      for (let i = 0; i < 4; i += 1) {
        const x = width * (0.14 + i * 0.21);
        const y = height * (0.2 + (i % 2) * 0.04);
        const radius = width * 0.12;
        const haze = ctx.createRadialGradient(x, y, 0, x, y, radius);
        haze.addColorStop(0, `rgba(${CANVAS_COLORS.accentRgb},${0.04 + Math.sin(idle + i) * 0.005})`);
        haze.addColorStop(1, `rgba(${CANVAS_COLORS.accentRgb},0)`);
        ctx.fillStyle = haze;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const solarAlpha = 0.12 + metrics.balances.solarBalance * 0.12;
      const solarGlow = ctx.createRadialGradient(width * 0.72, height * 0.14, 0, width * 0.72, height * 0.14, width * 0.26);
      solarGlow.addColorStop(0, `rgba(${CANVAS_COLORS.orangeRgb},${solarAlpha})`);
      solarGlow.addColorStop(1, `rgba(${CANVAS_COLORS.orangeRgb},0)`);
      ctx.fillStyle = solarGlow;
      ctx.fillRect(0, 0, width, height);

      if (runActive) {
        const sweep = (idle * 280) % (width + 260) - 180;
        const beam = ctx.createLinearGradient(sweep - 120, 0, sweep + 120, 0);
        beam.addColorStop(0, "rgba(31,151,237,0)");
        beam.addColorStop(0.42, "rgba(31,151,237,0.02)");
        beam.addColorStop(0.52, "rgba(31,151,237,0.18)");
        beam.addColorStop(0.62, "rgba(255,127,34,0.14)");
        beam.addColorStop(1, "rgba(255,127,34,0)");
        ctx.fillStyle = beam;
        ctx.fillRect(0, 0, width, height);
      }
    }

    drawZoneGlow(ctx, x, y, width, height, color, alpha, runActive) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, width);
      glow.addColorStop(0, `rgba(${color},${alpha + (runActive ? 0.08 : 0)})`);
      glow.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawFlowLinks(ctx, leftX, centerX, rightX, centerY, metrics, idle, inputPhase, plantPhase, outcomePhase, runActive) {
      const curves = [
        {
          start: { x: leftX + 56, y: centerY + 74 },
          c1: { x: leftX + 134, y: centerY + 110 },
          c2: { x: centerX - 132, y: centerY + 104 },
          end: { x: centerX - 28, y: centerY + 78 },
          color: CANVAS_COLORS.accentRgb,
          phase: inputPhase,
          kind: "resource"
        },
        {
          start: { x: leftX + 70, y: centerY - 56 },
          c1: { x: leftX + 142, y: centerY - 118 },
          c2: { x: centerX - 122, y: centerY - 102 },
          end: { x: centerX - 34, y: centerY - 26 },
          color: CANVAS_COLORS.layerRgb,
          phase: inputPhase * 0.82,
          kind: "climate"
        },
        {
          start: { x: centerX + 70, y: centerY + 12 },
          c1: { x: centerX + 150, y: centerY - 54 },
          c2: { x: rightX - 148, y: centerY - 46 },
          end: { x: rightX - 70, y: centerY + 10 },
          color: CANVAS_COLORS.orangeRgb,
          phase: plantPhase,
          kind: "outcome"
        }
      ];

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      curves.forEach((curve, index) => {
        const path = new Path2D();
        path.moveTo(curve.start.x, curve.start.y);
        path.bezierCurveTo(curve.c1.x, curve.c1.y, curve.c2.x, curve.c2.y, curve.end.x, curve.end.y);
        const alpha = curve.phase * 0.9 + (runActive ? 0.12 : 0);
        const visiblePhase = clamp(curve.phase, 0, 1);
        const stroke = ctx.createLinearGradient(curve.start.x, curve.start.y, curve.end.x, curve.end.y);
        if (curve.kind === "resource") {
          stroke.addColorStop(0, `rgba(${CANVAS_COLORS.accentRgb},${(0.24 + alpha * 0.36) * visiblePhase})`);
          stroke.addColorStop(0.56, `rgba(${CANVAS_COLORS.accentRgb},${(0.2 + alpha * 0.32) * visiblePhase})`);
          stroke.addColorStop(1, `rgba(${PLANT_COLORS.bladeLightRgb},${(0.24 + alpha * 0.3) * visiblePhase})`);
        } else if (curve.kind === "climate") {
          stroke.addColorStop(0, `rgba(${CANVAS_COLORS.layerRgb},${(0.12 + alpha * 0.18) * visiblePhase})`);
          stroke.addColorStop(0.54, `rgba(${CANVAS_COLORS.accentRgb},${(0.08 + alpha * 0.14) * visiblePhase})`);
          stroke.addColorStop(1, `rgba(${PLANT_COLORS.bladeRgb},${(0.08 + alpha * 0.12) * visiblePhase})`);
        } else {
          stroke.addColorStop(0, `rgba(${CANVAS_COLORS.accentRgb},${(0.14 + alpha * 0.28) * visiblePhase})`);
          stroke.addColorStop(0.5, `rgba(${CANVAS_COLORS.layerRgb},${(0.12 + alpha * 0.24) * visiblePhase})`);
          stroke.addColorStop(1, `rgba(${CANVAS_COLORS.orangeRgb},${(0.12 + alpha * 0.22) * visiblePhase})`);
        }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = curve.kind === "resource"
          ? (runActive ? 22 : 16)
          : (curve.kind === "climate" ? (runActive ? 11 : 8) : (runActive ? 15 : 12));
        ctx.stroke(path);

        ctx.strokeStyle = curve.kind === "resource"
          ? `rgba(${curve.color},${(0.26 + alpha * 0.22) * visiblePhase})`
          : `rgba(${curve.color},${(0.16 + alpha * 0.16) * visiblePhase})`;
        ctx.lineWidth = curve.kind === "resource" ? (runActive ? 5 : 3.2) : (runActive ? 3.2 : 2.2);
        ctx.stroke(path);

        if (curve.kind === "resource") {
          this.drawTransferNode(ctx, curve.start.x, curve.start.y, CANVAS_COLORS.accentRgb, 0.18 + curve.phase * 0.26 + (runActive ? 0.12 : 0), 24, true);
          this.drawTransferNode(ctx, curve.end.x, curve.end.y, PLANT_COLORS.bladeLightRgb, 0.22 + curve.phase * 0.28 + (runActive ? 0.14 : 0), 30, true);
        } else if (curve.kind === "outcome") {
          this.drawTransferNode(ctx, curve.start.x, curve.start.y, PLANT_COLORS.kernelRgb, 0.18 + curve.phase * 0.22 + (runActive ? 0.12 : 0), 24, true);
          this.drawTransferNode(ctx, curve.end.x, curve.end.y, CANVAS_COLORS.orangeRgb, 0.22 + curve.phase * 0.26 + (runActive ? 0.14 : 0), 28, true);
        }

        if (runActive) {
          const pulseCount = curve.kind === "resource" ? 6 : (curve.kind === "climate" ? 2 : 3);
          for (let pulseIndex = 0; pulseIndex < pulseCount; pulseIndex += 1) {
            const speed = curve.kind === "resource" ? 0.62 : (0.44 + index * 0.06);
            const travel = (idle * speed + pulseIndex * (curve.kind === "resource" ? 0.18 : 0.28) + index * 0.12) % 1;
            const pulseColor = curve.kind === "resource" && pulseIndex % 2 === 1
              ? CANVAS_COLORS.orangeRgb
              : curve.color;
            const pulseRadius = curve.kind === "resource" ? 14 - pulseIndex * 0.9 : 10 - pulseIndex * 1.5;
            this.drawCurvePulse(ctx, curve, travel, pulseColor, pulseRadius, 0.28 + alpha * 0.42);
          }

          if (curve.kind === "outcome") {
            for (let harvestIndex = 0; harvestIndex < 4; harvestIndex += 1) {
              const travel = (idle * 0.56 + harvestIndex * 0.19) % 1;
              this.drawOutcomeTransferUnit(
                ctx,
                curve,
                travel,
                0.54 + alpha * 0.34 - harvestIndex * 0.06,
                0.5 + harvestIndex * 0.06
              );
            }
          }
        }
      });

      if (this.reducedMotion) return;

      const sweepX = lerp(leftX + 80, rightX - 80, (Math.sin(idle * 1.6) + 1) * 0.5);
      const sweepY = centerY - 30 + Math.sin(idle * 2.4) * 18;
      const pulse = ctx.createRadialGradient(sweepX, sweepY, 0, sweepX, sweepY, 26);
      pulse.addColorStop(0, `rgba(${CANVAS_COLORS.accentRgb},${0.24 + outcomePhase * 0.16 + (runActive ? 0.12 : 0)})`);
      pulse.addColorStop(1, `rgba(${CANVAS_COLORS.accentRgb},0)`);
      ctx.fillStyle = pulse;
      ctx.beginPath();
      ctx.arc(sweepX, sweepY, 26, 0, Math.PI * 2);
      ctx.fill();
    }

    pointOnBezier(start, c1, c2, end, t) {
      const mt = 1 - t;
      return {
        x: (mt ** 3 * start.x) + (3 * mt * mt * t * c1.x) + (3 * mt * t * t * c2.x) + (t ** 3 * end.x),
        y: (mt ** 3 * start.y) + (3 * mt * mt * t * c1.y) + (3 * mt * t * t * c2.y) + (t ** 3 * end.y)
      };
    }

    angleOnBezier(curve, t) {
      const from = this.pointOnBezier(curve.start, curve.c1, curve.c2, curve.end, clamp(t, 0, 1));
      const to = this.pointOnBezier(curve.start, curve.c1, curve.c2, curve.end, clamp(t + 0.018, 0, 1));
      return Math.atan2(to.y - from.y, to.x - from.x);
    }

    drawCurvePulse(ctx, curve, travel, color, radius, alpha) {
      const lead = this.pointOnBezier(curve.start, curve.c1, curve.c2, curve.end, travel);
      const tail = this.pointOnBezier(curve.start, curve.c1, curve.c2, curve.end, Math.max(0, travel - 0.08));
      const glow = ctx.createRadialGradient(lead.x, lead.y, 0, lead.x, lead.y, radius * 2.8);
      glow.addColorStop(0, `rgba(${color},${alpha})`);
      glow.addColorStop(0.6, `rgba(${color},${alpha * 0.34})`);
      glow.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lead.x, lead.y, radius * 2.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(${color},${alpha * 0.9})`;
      ctx.lineWidth = Math.max(3, radius * 0.7);
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(lead.x, lead.y);
      ctx.stroke();

      ctx.fillStyle = `rgba(245,250,255,${Math.min(1, alpha + 0.18)})`;
      ctx.beginPath();
      ctx.arc(lead.x, lead.y, Math.max(2.4, radius * 0.45), 0, Math.PI * 2);
      ctx.fill();
    }

    drawTransferNode(ctx, x, y, color, alpha, radius = 26, ring = false) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, `rgba(${color},${alpha})`);
      glow.addColorStop(0.58, `rgba(${color},${alpha * 0.26})`);
      glow.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (ring) {
        ctx.strokeStyle = `rgba(${color},${alpha * 0.82})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.56, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    drawOutcomeTransferUnit(ctx, curve, travel, alpha, scale = 0.54) {
      const point = this.pointOnBezier(curve.start, curve.c1, curve.c2, curve.end, travel);
      const angle = this.angleOnBezier(curve, travel);

      const wake = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 22);
      wake.addColorStop(0, `rgba(${CANVAS_COLORS.orangeRgb},${alpha * 0.42})`);
      wake.addColorStop(0.62, `rgba(${CANVAS_COLORS.orangeRgb},${alpha * 0.16})`);
      wake.addColorStop(1, `rgba(${CANVAS_COLORS.orangeRgb},0)`);
      ctx.fillStyle = wake;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 22, 0, Math.PI * 2);
      ctx.fill();

      this.drawCornEar(ctx, point.x, point.y, scale, angle + 0.12, alpha, 0.04);

      ctx.fillStyle = `rgba(${PLANT_COLORS.kernelRgb},${0.22 + alpha * 0.28})`;
      for (let i = 0; i < 4; i += 1) {
        const dx = Math.cos(angle + Math.PI * 0.86) * (6 + i * 4.4);
        const dy = Math.sin(angle + Math.PI * 0.86) * (4 + i * 3.4);
        ctx.beginPath();
        ctx.ellipse(point.x + dx, point.y + dy, 2.4 - i * 0.3, 1.3, angle, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawGroundBed(ctx, x, y, width, depth, alpha = 1) {
      const fill = ctx.createLinearGradient(0, y - depth * 0.24, 0, y + depth);
      fill.addColorStop(0, `rgba(${CANVAS_COLORS.layerRgb},${0.2 * alpha})`);
      fill.addColorStop(0.42, `rgba(${CANVAS_COLORS.navyRgb},${0.42 * alpha})`);
      fill.addColorStop(1, `rgba(${CANVAS_COLORS.navyRgb},${0.76 * alpha})`);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(x - width * 0.58, y);
      ctx.bezierCurveTo(x - width * 0.3, y - depth * 0.24, x + width * 0.28, y - depth * 0.22, x + width * 0.58, y);
      ctx.lineTo(x + width * 0.48, y + depth);
      ctx.lineTo(x - width * 0.48, y + depth);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `rgba(${CANVAS_COLORS.orangeRgb},${0.14 * alpha})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x - width * 0.58, y);
      ctx.bezierCurveTo(x - width * 0.3, y - depth * 0.24, x + width * 0.28, y - depth * 0.22, x + width * 0.58, y);
      ctx.stroke();

      for (let i = 0; i < 3; i += 1) {
        const rowY = y + depth * (0.32 + i * 0.2);
        ctx.strokeStyle = `rgba(${CANVAS_COLORS.layerRgb},${0.1 * alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - width * (0.42 - i * 0.04), rowY);
        ctx.lineTo(x + width * (0.4 - i * 0.03), rowY);
        ctx.stroke();
      }
    }

    drawLeaf(ctx, x, y, length, width, angle, colorRgb, alpha = 1) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      const fill = ctx.createLinearGradient(0, -width, length, width);
      fill.addColorStop(0, `rgba(240,248,255,${0.2 * alpha})`);
      fill.addColorStop(0.34, `rgba(${colorRgb},${0.26 + alpha * 0.5})`);
      fill.addColorStop(1, `rgba(${CANVAS_COLORS.layerRgb},${0.22 + alpha * 0.28})`);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(length * 0.34, -width, length, 0);
      ctx.quadraticCurveTo(length * 0.34, width, 0, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `rgba(236,246,255,${0.14 + alpha * 0.26})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(length * 0.82, 0);
      ctx.stroke();
      ctx.restore();
    }

    drawSeedHead(ctx, x, y, scale, tilt, colorRgb, alpha = 1) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      ctx.strokeStyle = `rgba(${colorRgb},${0.22 + alpha * 0.3})`;
      ctx.lineWidth = Math.max(1.4, scale * 1.22);
      ctx.beginPath();
      ctx.moveTo(0, scale * 10);
      ctx.quadraticCurveTo(scale * 1.4, scale * 1.6, 0, -scale * 18);
      ctx.stroke();

      for (let i = 0; i < 7; i += 1) {
        const gy = scale * 7 - i * scale * 4.2;
        const grain = scale * (0.9 + i * 0.06);
        const fill = ctx.createLinearGradient(-grain * 1.6, gy - grain, grain * 1.6, gy + grain);
        fill.addColorStop(0, `rgba(248,250,255,${0.2 + alpha * 0.16})`);
        fill.addColorStop(1, `rgba(${colorRgb},${0.34 + alpha * 0.48})`);
        ctx.fillStyle = fill;
        [-1, 1].forEach((side) => {
          ctx.beginPath();
          ctx.ellipse(side * (grain * (1.42 + i * 0.06)), gy, grain * 1.28, grain * 0.74, side * 0.56, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.restore();
    }

    drawCornBlade(ctx, x, y, length, width, angle, colorRgb, alpha = 1, droop = 0, curl = 0) {
      if (length <= 0 || width <= 0 || alpha <= 0) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const tipDrop = droop * length * 0.18;
      const sweep = curl * length * 0.12;
      const edgeRgb = colorRgb === CANVAS_COLORS.layerRgb ? CANVAS_COLORS.accentRgb : PLANT_COLORS.bladeLightRgb;
      const shadowRgb = colorRgb === CANVAS_COLORS.layerRgb ? CANVAS_COLORS.layerRgb : PLANT_COLORS.bladeShadowRgb;
      const fill = ctx.createLinearGradient(0, -width, length, width);
      fill.addColorStop(0, `rgba(245,251,255,${0.08 * alpha})`);
      fill.addColorStop(0.18, `rgba(${edgeRgb},${0.24 + alpha * 0.24})`);
      fill.addColorStop(0.5, `rgba(${colorRgb},${0.48 + alpha * 0.4})`);
      fill.addColorStop(1, `rgba(${shadowRgb},${0.28 + alpha * 0.24})`);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        length * 0.18,
        -width * 1.28,
        length * 0.56,
        -width * (0.24 + Math.abs(curl) * 0.44),
        length,
        tipDrop + sweep
      );
      ctx.bezierCurveTo(
        length * 0.78,
        width * (0.16 + droop * 0.34) + sweep * 0.18,
        length * 0.18,
        width * 1.12,
        0,
        0
      );
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `rgba(248,253,255,${0.18 + alpha * 0.34})`;
      ctx.lineWidth = Math.max(1, width * 0.12);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(length * 0.42, 0, length * 0.9, tipDrop * 0.7 + sweep * 0.5);
      ctx.stroke();

      ctx.strokeStyle = `rgba(${shadowRgb},${0.08 + alpha * 0.12})`;
      ctx.lineWidth = Math.max(0.6, width * 0.06);
      for (let i = 0; i < 3; i += 1) {
        const t = 0.24 + i * 0.18;
        const px = length * t;
        const py = (i - 1) * width * 0.1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + length * 0.12, py - width * (0.22 - i * 0.05));
        ctx.stroke();
      }

      ctx.restore();
    }

    drawCornEar(ctx, x, y, scale, angle, alpha = 1, wilt = 0) {
      if (scale <= 0 || alpha <= 0) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const earLength = 22 * scale;
      const earWidth = 8 * scale;
      const huskTilt = wilt * 0.2;

      ctx.fillStyle = `rgba(${PLANT_COLORS.huskRgb},${0.18 + alpha * 0.22})`;
      ctx.beginPath();
      ctx.moveTo(-2 * scale, 0);
      ctx.quadraticCurveTo(earLength * 0.24, -earWidth * (1.4 + huskTilt), earLength * 0.88, -earWidth * 0.2);
      ctx.quadraticCurveTo(earLength * 0.44, earWidth * 0.44, 0, earWidth * 0.18);
      ctx.closePath();
      ctx.fill();

      const cobFill = ctx.createLinearGradient(0, -earWidth, earLength, earWidth);
      cobFill.addColorStop(0, `rgba(${PLANT_COLORS.kernelRgb},${0.14 + alpha * 0.18})`);
      cobFill.addColorStop(1, `rgba(${CANVAS_COLORS.orangeRgb},${0.28 + alpha * 0.34})`);
      ctx.fillStyle = cobFill;
      ctx.beginPath();
      ctx.ellipse(earLength * 0.42, 0, earWidth * 0.76, earLength * 0.42, 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${PLANT_COLORS.kernelRgb},${0.22 + alpha * 0.28})`;
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 2; col += 1) {
          const px = earLength * (0.28 + col * 0.15) + (row % 2) * scale * 1.1;
          const py = -earLength * 0.18 + row * scale * 4.2;
          ctx.beginPath();
          ctx.ellipse(px, py, scale * 1.2, scale * 1.5, 0.16, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.fillStyle = `rgba(${PLANT_COLORS.bladeShadowRgb},${0.12 + alpha * 0.16})`;
      ctx.beginPath();
      ctx.moveTo(earLength * 0.08, -earWidth * 0.2);
      ctx.quadraticCurveTo(earLength * 0.66, -earWidth * 0.84, earLength * 1.02, -earWidth * (0.04 + huskTilt));
      ctx.quadraticCurveTo(earLength * 0.64, earWidth * 0.12, earLength * 0.18, earWidth * 0.08);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    drawCornTassel(ctx, x, y, scale, alpha = 1, sway = 0, wilt = 0) {
      if (scale <= 0 || alpha <= 0) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(sway);

      ctx.strokeStyle = `rgba(${CANVAS_COLORS.orangeRgb},${0.2 + alpha * 0.32})`;
      ctx.lineWidth = Math.max(1.1, scale * 0.9);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, scale * 7);
      ctx.lineTo(0, -scale * 14);
      ctx.stroke();

      for (let i = 0; i < 6; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        const by = scale * (4 - i * 2.8);
        const bx = side * scale * (3.2 + i * 0.8);
        ctx.beginPath();
        ctx.moveTo(0, by);
        ctx.lineTo(bx, by - scale * (3.6 + wilt * 1.4));
        ctx.stroke();

        ctx.fillStyle = `rgba(${PLANT_COLORS.kernelRgb},${0.16 + alpha * 0.24})`;
        ctx.beginPath();
        ctx.ellipse(bx, by - scale * (3.6 + wilt * 1.4), scale * 0.9, scale * 1.5, side * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    drawCornPlant(ctx, options) {
      const {
        baseX,
        baseY,
        height,
        stalkWidth = 8,
        leafCount = 6,
        leafLength = 72,
        bend = 0,
        colorRgb = CANVAS_COLORS.accentRgb,
        alpha = 1,
        growth = 1,
        maturity = 0,
        wilt = 0,
        tasselScale = 1,
        earScale = 1
      } = options;

      if (alpha <= 0 || growth <= 0 || height <= 0) return;

      const effectiveHeight = Math.max(6, height * (0.18 + growth * 0.82));
      const topX = baseX + bend * (0.34 + growth * 0.66);
      const topY = baseY - effectiveHeight;

      ctx.fillStyle = `rgba(${CANVAS_COLORS.navyRgb},${0.1 + alpha * 0.14})`;
      ctx.beginPath();
      ctx.ellipse(baseX, baseY + 8, stalkWidth * 1.3 + growth * 6, stalkWidth * 0.34 + growth * 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      const stalkFill = ctx.createLinearGradient(baseX, baseY, topX, topY);
      stalkFill.addColorStop(0, `rgba(${PLANT_COLORS.bladeShadowRgb},${0.24 + alpha * 0.3})`);
      stalkFill.addColorStop(0.46, `rgba(${colorRgb},${0.36 + alpha * 0.56})`);
      stalkFill.addColorStop(1, `rgba(${PLANT_COLORS.bladeLightRgb},${0.08 + alpha * 0.16})`);
      ctx.strokeStyle = stalkFill;
      ctx.lineWidth = Math.max(4.8, stalkWidth * (0.52 + growth * 0.82));
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(baseX + bend * 0.22, baseY - effectiveHeight * 0.34, topX, topY);
      ctx.stroke();

      const visibleLeafCount = Math.max(2, leafCount);
      for (let i = 0; i < visibleLeafCount; i += 1) {
        const t = 0.18 + (i / Math.max(1, visibleLeafCount - 1)) * 0.62;
        const nx = lerp(baseX, topX, t) + Math.sin(t * Math.PI) * bend * 0.08;
        const ny = lerp(baseY, topY, t);
        const side = i % 2 === 0 ? -1 : 1;
        const leafGrowth = clamp((growth - t * 0.08) * 2.1, 0, 1);

        ctx.strokeStyle = `rgba(236,248,255,${(0.06 + alpha * 0.16) * Math.max(growth, 0.18)})`;
        ctx.lineWidth = Math.max(0.9, stalkWidth * 0.12);
        ctx.beginPath();
        ctx.moveTo(nx - stalkWidth * 0.42, ny);
        ctx.lineTo(nx + stalkWidth * 0.42, ny);
        ctx.stroke();

        if (leafGrowth <= 0.04) continue;

        const length = leafLength * (0.92 + (1 - t) * 0.48) * leafGrowth;
        const width = Math.max(8.4, leafLength * 0.16 * (0.88 + (1 - t) * 0.24) * leafGrowth);
        const angle = side * (0.74 + (1 - t) * 0.42) - side * wilt * 0.34 + bend / Math.max(72, height) * 0.18;
        const droop = clamp(wilt * (0.22 + t * 0.44) + (1 - leafGrowth) * 0.14, 0, 0.86);
        const curl = side * (0.16 + t * 0.12);
        this.drawCornBlade(ctx, nx, ny, length, width, angle, colorRgb, alpha * (0.6 + leafGrowth * 0.4), droop, curl);
      }

      const earVisibility = clamp((growth - 0.42) * 1.7, 0, 1) * clamp(0.18 + maturity * 0.92, 0, 1);
      if (earVisibility > 0.04) {
        const earT = 0.56;
        const earX = lerp(baseX, topX, earT) + stalkWidth * 1.18;
        const earY = lerp(baseY, topY, earT);
        this.drawCornEar(
          ctx,
          earX,
          earY,
          earScale * (0.78 + maturity * 0.36) * earVisibility,
          0.18 - wilt * 0.12,
          alpha * earVisibility,
          wilt
        );
      }

      const tasselVisibility = clamp((growth - 0.62) * 2.2, 0, 1) * (0.24 + maturity * 0.76);
      if (tasselVisibility > 0.04) {
        this.drawCornTassel(
          ctx,
          topX,
          topY - stalkWidth * 0.3,
          tasselScale * (0.72 + maturity * 0.38) * tasselVisibility,
          alpha * tasselVisibility,
          bend * 0.006,
          wilt
        );
      }
    }

    drawHarvestCrate(ctx, x, y, width, height, alpha = 1, outlineOnly = false) {
      const left = x - width / 2;
      const right = x + width / 2;
      const top = y - height;
      const depth = Math.max(10, width * 0.12);
      const backTop = top - depth * 0.55;
      const backLeft = left + depth;
      const backRight = right + depth;

      if (!outlineOnly) {
        ctx.fillStyle = `rgba(${CANVAS_COLORS.layerRgb},${0.14 + alpha * 0.16})`;
        ctx.beginPath();
        ctx.moveTo(left, top);
        ctx.lineTo(right, top);
        ctx.lineTo(backRight, backTop);
        ctx.lineTo(backLeft, backTop);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = `rgba(${CANVAS_COLORS.navyRgb},${0.24 + alpha * 0.24})`;
        ctx.fillRect(left, top, width, height);
      }

      ctx.strokeStyle = `rgba(${CANVAS_COLORS.orangeRgb},${0.14 + alpha * 0.24})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(right, top);
      ctx.lineTo(backRight, backTop);
      ctx.lineTo(backLeft, backTop);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, y);
      ctx.lineTo(right, y);
      ctx.lineTo(right, top);
      ctx.stroke();

      const slatCount = 3;
      for (let i = 1; i < slatCount; i += 1) {
        const sx = lerp(left, right, i / slatCount);
        ctx.beginPath();
        ctx.moveTo(sx, top);
        ctx.lineTo(sx, y);
        ctx.stroke();
      }

      for (let i = 1; i <= 2; i += 1) {
        const sy = lerp(top, y, i / 3);
        ctx.beginPath();
        ctx.moveTo(left, sy);
        ctx.lineTo(right, sy);
        ctx.stroke();
      }
    }

    drawHarvestCornPile(ctx, x, y, options) {
      const {
        count,
        spread = 26,
        rowLift = 11,
        baseScale = 1,
        alpha = 1,
        tilt = 0
      } = options;

      if (count <= 0 || alpha <= 0) return;

      const cols = Math.max(2, Math.min(4, Math.ceil(Math.sqrt(count))));
      for (let i = 0; i < count; i += 1) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const rowCount = Math.min(cols, count - row * cols);
        const px = x + (col - (rowCount - 1) / 2) * spread * (1 - row * 0.08);
        const py = y - row * rowLift + (col % 2) * 2;
        const earScale = baseScale * (1 - row * 0.08 + (col % 2) * 0.03);
        const angle = tilt + (-0.26 + col * 0.18) + row * 0.04;
        this.drawCornEar(ctx, px, py, earScale, angle, alpha * (1 - row * 0.06), 0.04);
      }
    }

    drawCropStalk(ctx, options) {
      const {
        baseX,
        baseY,
        height,
        bend = 0,
        leafCount = 4,
        leafSize = 26,
        colorRgb = CANVAS_COLORS.accentRgb,
        alpha = 1,
        headScale = 0,
        headTint = CANVAS_COLORS.orangeRgb,
        phase = 1,
        wilt = 0
      } = options;

      const topX = baseX + bend;
      const topY = baseY - height;
      ctx.strokeStyle = `rgba(${colorRgb},${0.16 + alpha * 0.42})`;
      ctx.lineWidth = 2.2 + alpha * 1.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(baseX + bend * 0.32, baseY - height * 0.34, topX, topY);
      ctx.stroke();

      for (let i = 0; i < leafCount; i += 1) {
        const t = (i + 1) / (leafCount + 1);
        const px = lerp(baseX, topX, t) + Math.sin(t * Math.PI) * bend * 0.08;
        const py = lerp(baseY, topY, t);
        const side = i % 2 === 0 ? -1 : 1;
        const openness = lerp(0.34, 0.82, phase);
        const droop = wilt * 0.72;
        const angle = side * (0.46 + openness * 0.38) - side * droop * 0.28 + droop * 0.58;
        const length = leafSize * (0.82 + t * 0.28) * (1 - wilt * 0.18);
        const width = leafSize * 0.28 * (1 - wilt * 0.2);
        this.drawLeaf(ctx, px, py, length, width, angle, colorRgb, alpha);
      }

      if (headScale > 0) {
        this.drawSeedHead(ctx, topX, topY, headScale, bend * 0.004 + wilt * 0.16, headTint, alpha);
      }
    }

    drawResources(ctx, x, y, metrics, idle, phase, runActive) {
      const resourceStrength = clamp(
        (metrics.balances.resourceFit / 100) * 0.58 +
        metrics.balances.resourceEnergy * 0.24 +
        metrics.balances.climateComfort * 0.08 +
        (1 - metrics.balances.stress) * 0.1,
        0,
        1
      );
      const gapStrength = 1 - resourceStrength;
      const waterSignal = clamp(metrics.balances.waterBalance * 0.72 + resourceStrength * 0.28, 0, 1);
      const resourceReveal = smoothstep(0.02, 0.86, phase);
      const climateReveal = smoothstep(0.08, 0.68, phase);
      const rootReveal = smoothstep(0.14, 0.86, phase);
      const transferReveal = smoothstep(0.18, 0.94, phase);
      const soilY = y + 84;
      const rootY = soilY + 10;
      const climateX = x - 58;
      const climateY = y - 116;
      const moistureWidth = lerp(0, lerp(36, 88, waterSignal), resourceReveal);
      const moistureDepth = lerp(0, lerp(18, 44, resourceStrength), resourceReveal);
      const rootCount = Math.round(lerp(0, 4 + resourceStrength * 7, rootReveal));

      this.drawGroundBed(ctx, x - 4, soilY, 188, 74, 0.18 + resourceReveal * 0.8);

      if (moistureWidth > 2 && moistureDepth > 1) {
        const moisture = ctx.createRadialGradient(x - 10, soilY + 28, 0, x - 10, soilY + 28, moistureWidth * 1.4);
        moisture.addColorStop(0, `rgba(${CANVAS_COLORS.accentRgb},${(0.12 + waterSignal * 0.18) * resourceReveal})`);
        moisture.addColorStop(0.52, `rgba(${CANVAS_COLORS.layerRgb},${(0.08 + resourceStrength * 0.1) * resourceReveal})`);
        moisture.addColorStop(1, `rgba(${CANVAS_COLORS.accentRgb},0)`);
        ctx.fillStyle = moisture;
        ctx.beginPath();
        ctx.ellipse(x - 10, soilY + 28, moistureWidth, moistureDepth, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      const sunRadius = lerp(0, lerp(14, 28, metrics.balances.climateComfort), climateReveal);
      if (sunRadius > 1) {
        const sunGlow = ctx.createRadialGradient(climateX, climateY, 0, climateX, climateY, sunRadius * 2.8);
        sunGlow.addColorStop(0, `rgba(${CANVAS_COLORS.orangeRgb},${(0.18 + metrics.balances.solarBalance * 0.18) * climateReveal})`);
        sunGlow.addColorStop(1, `rgba(${CANVAS_COLORS.orangeRgb},0)`);
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(climateX, climateY, sunRadius * 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${CANVAS_COLORS.orangeRgb},${(0.14 + metrics.balances.solarBalance * 0.22) * climateReveal})`;
        ctx.beginPath();
        ctx.arc(climateX, climateY, sunRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      const humidityAlpha = clamp((norm(metrics.adjusted.humidity, 54, 92) * 0.16 + gapStrength * 0.04) * climateReveal, 0, 0.24);
      if (humidityAlpha > 0.01) {
        ctx.fillStyle = `rgba(215,240,255,${humidityAlpha})`;
        [
          { x: climateX + 28, y: climateY + 2, r: lerp(0, 16, climateReveal) },
          { x: climateX + 46, y: climateY - 6, r: lerp(0, 18, climateReveal) },
          { x: climateX + 64, y: climateY + 4, r: lerp(0, 14, climateReveal) }
        ].forEach((cloud) => {
          ctx.beginPath();
          ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillRect(climateX + 18, climateY + 6, 58 * climateReveal, 20 * climateReveal);
      }

      const pipeY = y - 128;
      ctx.strokeStyle = `rgba(${CANVAS_COLORS.layerRgb},${0.08 + resourceReveal * 0.26})`;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - 94, pipeY);
      ctx.lineTo(lerp(x - 94, x + 44, resourceReveal), pipeY);
      ctx.stroke();

      for (let i = 0; i < 3; i += 1) {
        const emitterX = x - 72 + i * 34;
        const dripDepth = lerp(0, lerp(34, 112, waterSignal) * (0.86 + i * 0.04), resourceReveal);
        ctx.strokeStyle = `rgba(${CANVAS_COLORS.accentRgb},${(0.12 + waterSignal * 0.22) * resourceReveal})`;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(emitterX, pipeY);
        ctx.lineTo(emitterX, pipeY + 16 * resourceReveal);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(emitterX, pipeY + 16 * resourceReveal);
        ctx.bezierCurveTo(
          emitterX - 6,
          pipeY + 38 * resourceReveal,
          emitterX + 10,
          lerp(pipeY + 18, soilY - 20, resourceReveal),
          x - 18 + i * 10,
          soilY + dripDepth * 0.12
        );
        ctx.stroke();
      }

      const nutrientMarkers = [
        { label: "N", x: x + 34, color: CANVAS_COLORS.layerRgb, value: metrics.adjusted.n / RANGES.n.max },
        { label: "P", x: x + 56, color: CANVAS_COLORS.orangeRgb, value: metrics.adjusted.p / RANGES.p.max },
        { label: "K", x: x + 78, color: CANVAS_COLORS.accentRgb, value: metrics.adjusted.k / RANGES.k.max }
      ];

      nutrientMarkers.forEach((item, index) => {
        const dropY = soilY + 18 + index * 8;
        const pelletSize = lerp(0, lerp(4, 9, item.value), transferReveal);
        if (pelletSize > 0.8) {
          ctx.fillStyle = `rgba(${item.color},${(0.18 + item.value * 0.36) * transferReveal})`;
          ctx.beginPath();
          ctx.ellipse(item.x, dropY, pelletSize * 1.3, pelletSize * 0.78, -0.2 + index * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      for (let i = 0; i < rootCount; i += 1) {
        const offset = (i - (rootCount - 1) / 2) * 7.6;
        const reach = lerp(0, lerp(30, 86, resourceStrength) * (0.84 + (i % 3) * 0.08), rootReveal);
        const spread = lerp(0, lerp(12, 40, resourceStrength) * (i % 2 === 0 ? -1 : 1), rootReveal);
        ctx.strokeStyle = `rgba(${CANVAS_COLORS.layerRgb},${(0.1 + resourceStrength * 0.2) * rootReveal})`;
        ctx.lineWidth = 1.2 + resourceStrength * 0.5;
        ctx.beginPath();
        ctx.moveTo(x - 10 + offset * 0.2, rootY);
        ctx.bezierCurveTo(x - 8 + offset, rootY + 14, x - 6 + spread * 0.34, rootY + reach * 0.58, x + spread, rootY + reach);
        ctx.stroke();
      }

      const outletX = x + 82;
      const outletY = soilY + 6;
      const outletPath = new Path2D();
      outletPath.moveTo(x + 8, rootY + 2);
      outletPath.bezierCurveTo(x + 34, rootY - 12, x + 60, soilY - 4, outletX, outletY);
      ctx.strokeStyle = `rgba(${CANVAS_COLORS.accentRgb},${(0.08 + phase * 0.18 + (runActive ? 0.08 : 0)) * transferReveal})`;
      ctx.lineWidth = runActive ? 7 : 5;
      ctx.stroke(outletPath);
      ctx.strokeStyle = `rgba(${PLANT_COLORS.bladeLightRgb},${(0.06 + phase * 0.12) * transferReveal})`;
      ctx.lineWidth = 2.2;
      ctx.stroke(outletPath);
      this.drawTransferNode(ctx, outletX, outletY, CANVAS_COLORS.accentRgb, (0.12 + phase * 0.16 + (runActive ? 0.1 : 0)) * transferReveal, 18, true);

      const stressCount = Math.round(gapStrength * 5);
      if (stressCount > 0) {
        ctx.strokeStyle = `rgba(${CANVAS_COLORS.orangeRgb},${0.1 + gapStrength * 0.16})`;
        ctx.lineWidth = 1.2;
        for (let i = 0; i < stressCount; i += 1) {
          const crackX = x - 60 + i * 26;
          ctx.beginPath();
          ctx.moveTo(crackX, soilY + 6);
          ctx.lineTo(crackX - 6, soilY + 18 + i * 4);
          ctx.lineTo(crackX + 4, soilY + 32 + i * 6);
          ctx.stroke();
        }
      }

      if (runActive && resourceReveal > 0.05) {
        const dropletCount = Math.max(1, Math.round(lerp(0, 5, resourceReveal)));
        for (let i = 0; i < dropletCount; i += 1) {
          const emitterX = x - 72 + (i % 3) * 34;
          const travel = (idle * 1.8 + i * 0.22) % 1;
          const dx = lerp(emitterX, x - 18 + (i % 3) * 10, travel);
          const dy = lerp(pipeY + 18, soilY + 14 + travel * 28, travel);
          const drop = ctx.createRadialGradient(dx, dy, 0, dx, dy, 10);
          drop.addColorStop(0, "rgba(236,248,255,0.92)");
          drop.addColorStop(0.55, `rgba(${CANVAS_COLORS.accentRgb},0.42)`);
          drop.addColorStop(1, `rgba(${CANVAS_COLORS.accentRgb},0)`);
          ctx.fillStyle = drop;
          ctx.beginPath();
          ctx.arc(dx, dy, 10, 0, Math.PI * 2);
          ctx.fill();
        }

        nutrientMarkers.forEach((item, index) => {
          const travel = (idle * 1.4 + index * 0.22) % 1;
          const px = item.x - 18 + travel * 20;
          const py = soilY + 6 + travel * 26;
          ctx.fillStyle = `rgba(${item.color},${(0.24 + phase * 0.36) * transferReveal})`;
          ctx.beginPath();
          ctx.arc(px, py, 3.8, 0, Math.PI * 2);
          ctx.fill();
        });

        for (let i = 0; i < Math.max(1, Math.round(lerp(0, 4, transferReveal))); i += 1) {
          const travel = (idle * 0.84 + i * 0.2) % 1;
          const point = this.pointOnBezier(
            { x: x + 8, y: rootY + 2 },
            { x: x + 34, y: rootY - 12 },
            { x: x + 60, y: soilY - 4 },
            { x: outletX, y: outletY },
            travel
          );
          const pulse = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 9);
          pulse.addColorStop(0, "rgba(236,248,255,0.94)");
          pulse.addColorStop(0.46, `rgba(${i % 2 === 0 ? CANVAS_COLORS.accentRgb : CANVAS_COLORS.orangeRgb},0.42)`);
          pulse.addColorStop(1, `rgba(${CANVAS_COLORS.accentRgb},0)`);
          ctx.fillStyle = pulse;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    drawPlant(ctx, x, y, metrics, idle, phase, runActive) {
      const plantStrength = clamp(
        norm(metrics.states.ndvi, 0.42, 0.88) * 0.42 +
        norm(metrics.states.evo, 36, 92) * 0.24 +
        norm(metrics.states.maturation, 18, 88) * 0.16 +
        norm(metrics.states.stemsPerMeter, 6, 15.5) * 0.08 +
        (1 - norm(metrics.balances.stress, 0.08, 0.38)) * 0.1,
        0,
        1
      );
      const gapStrength = 1 - plantStrength;
      const growthPhase = clamp(phase, 0, 1);
      const seedlingPhase = smoothstep(0, 0.18, growthPhase);
      const vegetativePhase = smoothstep(0.12, 0.72, growthPhase);
      const canopyPhase = smoothstep(0.26, 0.82, growthPhase);
      const maturityReveal = smoothstep(0.56, 1, growthPhase);
      const baseY = y + lerp(146, 90, vegetativePhase);
      const stemBaseY = baseY + 2;
      const canopyGlowY = lerp(y + 56, y - 26, canopyPhase);
      const guidePhase = smoothstep(0.38, 0.86, growthPhase);
      const targetLeafCount = 5 + plantStrength * 3.6;
      const leafCount = Math.max(2, Math.round(lerp(2, targetLeafCount, canopyPhase)));
      const maturityPhase = metrics.states.maturation / 100;
      const wilt = clamp(gapStrength * 0.7 + Math.max(0, metrics.balances.stress - 0.18) * 1.1, 0, 1) * canopyPhase;
      const guideHeight = 166;
      const fullHeight = lerp(112, 214, plantStrength);
      const canopyRadiusX = lerp(10, lerp(84, 146, plantStrength), canopyPhase);
      const canopyRadiusY = lerp(8, lerp(56, 118, plantStrength), canopyPhase);
      const mainLeafLength = lerp(70, 138, plantStrength);
      const mainStalkWidth = lerp(8.4, 18.6, plantStrength);

      this.drawGroundBed(ctx, x, baseY, 172, 68, 0.94);

      const plantShadow = ctx.createRadialGradient(x, baseY + 8, 0, x, baseY + 8, lerp(20, 88, canopyPhase));
      plantShadow.addColorStop(0, `rgba(${CANVAS_COLORS.navyRgb},${0.12 + canopyPhase * 0.16})`);
      plantShadow.addColorStop(1, `rgba(${CANVAS_COLORS.navyRgb},0)`);
      ctx.fillStyle = plantShadow;
      ctx.beginPath();
      ctx.ellipse(x, baseY + 8, lerp(22, 92, canopyPhase), lerp(7, 22, canopyPhase), 0, 0, Math.PI * 2);
      ctx.fill();

      const canopyGlow = ctx.createRadialGradient(x, canopyGlowY, 0, x, canopyGlowY, Math.max(canopyRadiusX, canopyRadiusY) * 1.08);
      canopyGlow.addColorStop(0, `rgba(${PLANT_COLORS.bladeLightRgb},${(0.06 + plantStrength * 0.14) * canopyPhase})`);
      canopyGlow.addColorStop(0.5, `rgba(${PLANT_COLORS.bladeRgb},${(0.04 + plantStrength * 0.12) * canopyPhase})`);
      canopyGlow.addColorStop(1, `rgba(${PLANT_COLORS.bladeRgb},0)`);
      ctx.fillStyle = canopyGlow;
      ctx.beginPath();
      ctx.ellipse(x, canopyGlowY, canopyRadiusX, canopyRadiusY, 0, 0, Math.PI * 2);
      ctx.fill();

      const intakeX = x - 26;
      const intakeY = baseY + 6;
      const intakePath = new Path2D();
      intakePath.moveTo(intakeX - 26, intakeY + 8);
      intakePath.bezierCurveTo(intakeX - 8, intakeY - 4, x - 10, intakeY - 2, x, stemBaseY - 4);
      ctx.strokeStyle = `rgba(${PLANT_COLORS.bladeLightRgb},${0.08 + canopyPhase * 0.14 + (runActive ? 0.08 : 0)})`;
      ctx.lineWidth = runActive ? 7 : 5;
      ctx.stroke(intakePath);
      ctx.strokeStyle = `rgba(${CANVAS_COLORS.accentRgb},${0.06 + canopyPhase * 0.12})`;
      ctx.lineWidth = 2;
      ctx.stroke(intakePath);
      this.drawTransferNode(ctx, intakeX, intakeY, PLANT_COLORS.bladeLightRgb, 0.14 + canopyPhase * 0.18 + (runActive ? 0.12 : 0), 18, true);

      const guideOffsets = [-28, 26];
      guideOffsets.forEach((offset) => {
        this.drawCornPlant(ctx, {
          baseX: x + offset,
          baseY: stemBaseY,
          height: lerp(16, guideHeight * 0.74, guidePhase),
          stalkWidth: lerp(1.8, 4.2, guidePhase),
          leafCount: Math.max(2, Math.round(lerp(2, 4, guidePhase))),
          leafLength: lerp(14, 46, guidePhase),
          bend: offset * 0.14 * guidePhase,
          colorRgb: PLANT_COLORS.bladeShadowRgb,
          alpha: guidePhase * 0.12,
          growth: guidePhase,
          maturity: maturityReveal * 0.7,
          wilt: 0.04,
          tasselScale: 0.74,
          earScale: 0.7
        });
      });

      const heroGrowth = Math.max(seedlingPhase, vegetativePhase);
      const heroBend = (Math.sin(idle * 0.7) * 4.2 + gapStrength * -5.4) * heroGrowth;
      const heroHeight = fullHeight * 1.1;
      const heroTopX = x + heroBend;
      const heroTopY = stemBaseY - heroHeight * heroGrowth;
      const heroStem = ctx.createLinearGradient(x, stemBaseY, heroTopX, heroTopY);
      heroStem.addColorStop(0, `rgba(${PLANT_COLORS.bladeShadowRgb},${0.76 + canopyPhase * 0.12})`);
      heroStem.addColorStop(0.46, `rgba(${PLANT_COLORS.stemRgb},${0.9})`);
      heroStem.addColorStop(1, `rgba(${PLANT_COLORS.bladeLightRgb},${0.42 + canopyPhase * 0.18})`);
      ctx.strokeStyle = heroStem;
      ctx.lineWidth = lerp(6, 22, canopyPhase);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, stemBaseY);
      ctx.quadraticCurveTo(x + heroBend * 0.24, stemBaseY - heroHeight * 0.34 * heroGrowth, heroTopX, heroTopY);
      ctx.stroke();

      const boldLeaves = [
        { t: 0.22, side: -1, length: mainLeafLength * 0.84, lift: 0.6, width: 16 },
        { t: 0.34, side: 1, length: mainLeafLength * 0.92, lift: 0.58, width: 17 },
        { t: 0.48, side: -1, length: mainLeafLength * 0.72, lift: 0.52, width: 14 },
        { t: 0.62, side: 1, length: mainLeafLength * 0.58, lift: 0.46, width: 12 },
        { t: 0.74, side: -1, length: mainLeafLength * 0.42, lift: 0.38, width: 9 }
      ];

      boldLeaves.forEach((leaf, index) => {
        const ax = lerp(x, heroTopX, leaf.t);
        const ay = lerp(stemBaseY, heroTopY, leaf.t);
        const effectiveLength = leaf.length * heroGrowth;
        const tipX = ax + leaf.side * effectiveLength;
        const tipY = ay - effectiveLength * leaf.lift + wilt * effectiveLength * 0.08;
        const controlUpX = ax + leaf.side * effectiveLength * 0.28;
        const controlUpY = ay - leaf.width * (1.8 + index * 0.12);
        const controlDownX = ax + leaf.side * effectiveLength * 0.54;
        const controlDownY = ay + leaf.width * 0.5;
        const fill = ctx.createLinearGradient(ax, ay - leaf.width, tipX, tipY + leaf.width);
        fill.addColorStop(0, `rgba(${PLANT_COLORS.bladeLightRgb},0.84)`);
        fill.addColorStop(0.42, `rgba(${PLANT_COLORS.bladeRgb},0.92)`);
        fill.addColorStop(1, `rgba(${PLANT_COLORS.bladeShadowRgb},0.82)`);
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(controlUpX, controlUpY, tipX, tipY);
        ctx.quadraticCurveTo(controlDownX, controlDownY, ax + leaf.side * 10, ay + 6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `rgba(${PLANT_COLORS.bladeShadowRgb},0.42)`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.strokeStyle = "rgba(248,253,255,0.24)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(ax + leaf.side * effectiveLength * 0.38, ay - leaf.width * 0.72, tipX, tipY);
        ctx.stroke();

        ctx.fillStyle = `rgba(${PLANT_COLORS.bladeLightRgb},0.2)`;
        ctx.beginPath();
        ctx.ellipse(ax, ay, 4.2, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      if (maturityReveal > 0.12) {
        const earX = lerp(x, heroTopX, 0.56) + mainStalkWidth * 0.9;
        const earY = lerp(stemBaseY, heroTopY, 0.56);
        this.drawCornEar(
          ctx,
          earX,
          earY,
          (1.08 + plantStrength * 0.34) * maturityReveal,
          0.18 - wilt * 0.1,
          0.82 * maturityReveal,
          wilt
        );
      }

      if (maturityReveal > 0.16) {
        this.drawCornTassel(
          ctx,
          heroTopX,
          heroTopY - mainStalkWidth * 0.34,
          (0.96 + plantStrength * 0.24) * maturityReveal,
          0.88 * maturityReveal,
          heroBend * 0.006,
          wilt
        );
      }

      const crownGlowRadius = lerp(4, lerp(18, 44, plantStrength), canopyPhase);
      const crownGlow = ctx.createRadialGradient(x, baseY - 10, 0, x, baseY - 10, crownGlowRadius);
      crownGlow.addColorStop(0, `rgba(244,251,255,${0.24 + canopyPhase * 0.7})`);
      crownGlow.addColorStop(0.42, `rgba(${PLANT_COLORS.bladeLightRgb},${(0.18 + plantStrength * 0.26) * canopyPhase})`);
      crownGlow.addColorStop(1, `rgba(${PLANT_COLORS.bladeRgb},0)`);
      ctx.fillStyle = crownGlow;
      ctx.beginPath();
      ctx.arc(x, baseY - 10, crownGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      if (gapStrength > 0.22 && canopyPhase > 0.45) {
        ctx.strokeStyle = `rgba(${CANVAS_COLORS.orangeRgb},${(0.14 + gapStrength * 0.22) * canopyPhase})`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 7]);
        for (let i = 0; i < 4; i += 1) {
          const tx = x - 20 + i * 16;
          ctx.beginPath();
          ctx.moveTo(tx, baseY - lerp(12, 24, canopyPhase));
          ctx.lineTo(tx - 10, baseY + 24 + i * 5);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      if (runActive && vegetativePhase > 0.08) {
        const pulseCount = 2;
        for (let i = 0; i < pulseCount; i += 1) {
          const bend = (Math.sin(idle * 0.7) * 3.4 + (gapStrength * -4.6)) * vegetativePhase;
          const travel = (idle * 1.5 + i * 0.18) % 1;
          const px = lerp(x, x + bend, travel);
          const py = lerp(stemBaseY, stemBaseY - fullHeight, travel);
          const spark = ctx.createRadialGradient(px, py, 0, px, py, lerp(6, 14, canopyPhase));
          spark.addColorStop(0, "rgba(238,248,255,0.96)");
          spark.addColorStop(0.45, `rgba(${CANVAS_COLORS.accentRgb},${0.12 + canopyPhase * 0.24})`);
          spark.addColorStop(1, `rgba(${CANVAS_COLORS.accentRgb},0)`);
          ctx.fillStyle = spark;
          ctx.beginPath();
          ctx.arc(px, py, lerp(6, 14, canopyPhase), 0, Math.PI * 2);
          ctx.fill();
        }

        for (let i = 0; i < 3; i += 1) {
          const travel = (idle * 0.86 + i * 0.22) % 1;
          const point = this.pointOnBezier(
            { x: intakeX - 26, y: intakeY + 8 },
            { x: intakeX - 8, y: intakeY - 4 },
            { x: x - 10, y: intakeY - 2 },
            { x, y: stemBaseY - 4 },
            travel
          );
          const intakePulse = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 8);
          intakePulse.addColorStop(0, "rgba(246,252,255,0.94)");
          intakePulse.addColorStop(0.52, `rgba(${i % 2 === 0 ? PLANT_COLORS.bladeLightRgb : CANVAS_COLORS.accentRgb},0.42)`);
          intakePulse.addColorStop(1, `rgba(${PLANT_COLORS.bladeLightRgb},0)`);
          ctx.fillStyle = intakePulse;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    drawOutcome(ctx, x, y, metrics, idle, phase, runActive) {
      const sweetness = norm(metrics.outcomes.brix, 8, 19.4);
      const qualityIndex = metrics.derived && typeof metrics.derived.qualityIndex === "number"
        ? metrics.derived.qualityIndex
        : sweetness * 100;
      const outcomeStrength = clamp(
        norm(metrics.score, 42, 86) * 0.42 +
        norm(metrics.outcomes.big, 18, 48) * 0.28 +
        norm(qualityIndex, 32, 84) * 0.16 +
        (1 - norm(metrics.outcomes.aborted, 6, 22)) * 0.22,
        0,
        1
      );
      const gapStrength = 1 - outcomeStrength;
      const harvestReveal = smoothstep(0.08, 0.98, phase);
      const crateReveal = smoothstep(0.18, 0.86, phase);
      const looseReveal = smoothstep(0.32, 1, phase);
      const baseY = y + 92;
      const haloRadius = lerp(0, lerp(54, 126, outcomeStrength), harvestReveal);
      const maturityPhase = clamp((qualityIndex / 100) * 0.56 + outcomeStrength * 0.44, 0, 1);
      const crateFill = clamp((0.24 + outcomeStrength * 0.72) * crateReveal, 0, 1);
      const backCrateFill = clamp((outcomeStrength - 0.22) * 1.1 * crateReveal, 0, 1);
      const pileCount = Math.round(lerp(0, 3 + outcomeStrength * 7 + metrics.outcomes.big / 18, harvestReveal));
      const backPileCount = Math.round(lerp(0, 1 + clamp((outcomeStrength - 0.22) * 1.1, 0, 1) * 4, harvestReveal));
      const looseCount = Math.round(lerp(0, 1 + outcomeStrength * 4, looseReveal));

      this.drawGroundBed(ctx, x, baseY, 194, 72, 0.16 + harvestReveal * 0.8);

      if (haloRadius > 2) {
        const harvestGlow = ctx.createRadialGradient(x, y - 18, 0, x, y - 18, haloRadius);
        harvestGlow.addColorStop(0, `rgba(${CANVAS_COLORS.orangeRgb},${(0.08 + outcomeStrength * 0.14) * harvestReveal})`);
        harvestGlow.addColorStop(0.42, `rgba(${PLANT_COLORS.kernelRgb},${(0.08 + sweetness * 0.12) * harvestReveal})`);
        harvestGlow.addColorStop(1, `rgba(${CANVAS_COLORS.orangeRgb},0)`);
        ctx.fillStyle = harvestGlow;
        ctx.beginPath();
        ctx.ellipse(
          x,
          y - 14,
          lerp(0, lerp(48, 112, outcomeStrength), harvestReveal),
          lerp(0, lerp(34, 88, outcomeStrength), harvestReveal),
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      if (crateReveal > 0.03) {
        this.drawHarvestCrate(ctx, x + 34, baseY - 2, lerp(12, 86, crateReveal), lerp(10, 56, crateReveal), 0.06 + crateReveal * 0.12, true);
        this.drawHarvestCrate(ctx, x - 38, baseY + 4, lerp(12, 78, crateReveal), lerp(10, 50, crateReveal), 0.04 + crateReveal * 0.1, true);
      }

      this.drawHarvestCrate(
        ctx,
        x + 30,
        baseY + 2,
        lerp(12, 82, crateReveal),
        lerp(10, 52, crateReveal),
        0.12 + backCrateFill * 0.18
      );
      this.drawHarvestCornPile(ctx, x + 28, baseY - 8, {
        count: backPileCount,
        spread: lerp(8, 20, crateReveal),
        rowLift: lerp(4, 9, crateReveal),
        baseScale: (0.88 + maturityPhase * 0.18) * harvestReveal,
        alpha: (0.18 + backCrateFill * 0.26) * harvestReveal,
        tilt: 0.08
      });

      this.drawHarvestCrate(
        ctx,
        x - 12,
        baseY + 10,
        lerp(14, 100, crateReveal),
        lerp(12, 60, crateReveal),
        0.14 + crateFill * 0.24
      );
      this.drawHarvestCornPile(ctx, x - 8, baseY - 4, {
        count: pileCount,
        spread: lerp(8, 24, crateReveal),
        rowLift: lerp(4, 10, crateReveal),
        baseScale: (1 + maturityPhase * 0.22) * harvestReveal,
        alpha: (0.22 + outcomeStrength * 0.28) * harvestReveal,
        tilt: -0.04
      });

      for (let i = 0; i < looseCount; i += 1) {
        const px = x - 56 + i * 18;
        const py = baseY + 10 + (i % 2) * 6;
        this.drawCornEar(
          ctx,
          px,
          py,
          (0.52 + (i % 3) * 0.06) * looseReveal,
          -0.2 + i * 0.06,
          (0.12 + outcomeStrength * 0.16) * looseReveal,
          0.06
        );
      }

      if (gapStrength > 0.2 && harvestReveal > 0.08) {
        ctx.strokeStyle = `rgba(${CANVAS_COLORS.orangeRgb},${(0.14 + gapStrength * 0.24) * harvestReveal})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 88, y - 74);
        ctx.lineTo(x + 88, y - 74 + 118 * clamp(gapStrength * 0.78, 0.16, 0.72) * harvestReveal);
        ctx.stroke();
      }

      const droppedCount = Math.round(lerp(0, metrics.outcomes.aborted / 4 + gapStrength * 3, harvestReveal));
      ctx.fillStyle = `rgba(${CANVAS_COLORS.orangeRgb},${0.16 + phase * 0.2})`;
      for (let i = 0; i < droppedCount; i += 1) {
        const px = x + 8 + i * 12;
        const py = baseY + 18 + (i % 3) * 6 + Math.sin(idle * 2 + i) * 2;
        ctx.beginPath();
        ctx.ellipse(px, py, 5 + (i % 2), 2.8 + (i % 2) * 0.4, -0.4 + i * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }

      if (runActive && harvestReveal > 0.06) {
        for (let i = 0; i < Math.min(Math.max(1, pileCount), 5); i += 1) {
          const travel = (idle * 1.4 + i * 0.18) % 1;
          const px = lerp(x - 42, x + 30, travel);
          const py = lerp(baseY - 14, baseY - 54, Math.sin(travel * Math.PI));
          const flare = ctx.createRadialGradient(px, py, 0, px, py, 14);
          flare.addColorStop(0, "rgba(255,248,234,0.92)");
          flare.addColorStop(0.46, `rgba(${CANVAS_COLORS.orangeRgb},0.38)`);
          flare.addColorStop(1, `rgba(${CANVAS_COLORS.orangeRgb},0)`);
          ctx.fillStyle = flare;
          ctx.beginPath();
          ctx.arc(px, py, 14, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    drawZoneCaptions(ctx, width, height, metrics) {
      const labels = [
        { x: width * 0.18, title: "Input pressure", copy: `${fmt(metrics.balances.resourceFit, 0)} fit` },
        { x: width * 0.5, title: "Plant state", copy: `${metrics.labels.vigor} vigor` },
        { x: width * 0.82, title: "Yield outcome", copy: `${metrics.classMeta.label} class` }
      ];

      ctx.textAlign = "center";
      labels.forEach((item) => {
        ctx.fillStyle = `rgba(${CANVAS_COLORS.accentRgb},0.68)`;
        ctx.font = "700 11px 'Space Grotesk', sans-serif";
        ctx.fillText(item.title.toUpperCase(), item.x, height - 40);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "800 18px 'Space Grotesk', sans-serif";
        ctx.fillText(item.copy, item.x, height - 18);
      });
    }
  }

  const root = document.getElementById("cropWidget");
  if (root) new CropWidget(root);
})();
