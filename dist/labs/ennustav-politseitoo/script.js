(() => {
  const TOTAL_WEEKS = 50;
  const POPULATION = 500;
  const INITIAL_PRIORS = 10;
  const BASE_WIDTH = 960;
  const BASE_HEIGHT = 620;
  const WATCH_THRESHOLD = 8;
  const WEEK_DURATION_MS = 420;
  const PLAYBACK_BASE_RATE = 1 / 3;
  const KAARSILD_T = 0.425;
  const RIVER_POINTS = [
    [-40, 248],
    [68, 244],
    [178, 240],
    [302, 246],
    [434, 240],
    [556, 224],
    [672, 228],
    [758, 258],
    [832, 302],
    [904, 346],
    [1000, 388]
  ];

  const DISTRICT_BLUEPRINTS = [
    {
      id: "tahtvere",
      name: "Tahtvere",
      populationWeight: 0.07,
      center: [122, 404],
      label: [124, 378],
      polygon: [[34, 344], [154, 336], [212, 378], [194, 466], [96, 482], [28, 420]],
      neighbors: ["supilinn", "veeriku", "kesklinn"]
    },
    {
      id: "supilinn",
      name: "Supilinn",
      populationWeight: 0.06,
      center: [252, 308],
      label: [252, 282],
      polygon: [[166, 268], [286, 260], [330, 286], [320, 336], [242, 346], [154, 314]],
      neighbors: ["tahtvere", "kesklinn", "raadi"]
    },
    {
      id: "veeriku",
      name: "Veeriku",
      populationWeight: 0.09,
      center: [108, 536],
      label: [108, 510],
      polygon: [[22, 482], [146, 474], [184, 522], [170, 606], [38, 606], [12, 550]],
      neighbors: ["tahtvere", "tammelinn", "karlova"]
    },
    {
      id: "tammelinn",
      name: "Tammelinn",
      populationWeight: 0.10,
      center: [302, 522],
      label: [302, 496],
      polygon: [[230, 468], [360, 462], [404, 522], [378, 606], [244, 606], [208, 528]],
      neighbors: ["veeriku", "karlova", "ropka"]
    },
    {
      id: "kesklinn",
      name: "Kesklinn",
      populationWeight: 0.09,
      center: [468, 304],
      label: [468, 276],
      polygon: [[372, 248], [516, 242], [594, 270], [586, 338], [492, 378], [388, 352], [344, 292]],
      neighbors: ["tahtvere", "supilinn", "karlova", "ulejoe", "annelinn"]
    },
    {
      id: "ulejoe",
      name: "Ulejoe",
      populationWeight: 0.09,
      center: [520, 142],
      label: [520, 114],
      polygon: [[400, 58], [568, 52], [636, 104], [620, 184], [526, 206], [424, 176], [388, 132]],
      neighbors: ["supilinn", "kesklinn", "raadi", "annelinn"]
    },
    {
      id: "raadi",
      name: "Raadi",
      populationWeight: 0.07,
      center: [278, 154],
      label: [278, 126],
      polygon: [[176, 60], [328, 54], [390, 118], [372, 212], [248, 224], [170, 180]],
      neighbors: ["supilinn", "kesklinn", "ulejoe"]
    },
    {
      id: "annelinn",
      name: "Annelinn",
      populationWeight: 0.18,
      center: [754, 162],
      label: [754, 134],
      polygon: [[654, 54], [816, 50], [864, 120], [838, 234], [726, 250], [646, 186]],
      neighbors: ["kesklinn", "ulejoe", "ropka"]
    },
    {
      id: "karlova",
      name: "Karlova",
      populationWeight: 0.11,
      center: [512, 472],
      label: [514, 446],
      polygon: [[430, 390], [556, 384], [606, 434], [594, 524], [494, 560], [420, 486]],
      neighbors: ["veeriku", "tammelinn", "kesklinn", "ropka"]
    },
    {
      id: "ropka",
      name: "Ropka",
      populationWeight: 0.08,
      center: [752, 526],
      label: [752, 500],
      polygon: [[648, 446], [798, 442], [878, 518], [860, 606], [708, 606], [628, 530]],
      neighbors: ["tammelinn", "karlova", "annelinn", "ihaste"]
    },
    {
      id: "ihaste",
      name: "Ihaste",
      populationWeight: 0.06,
      center: [922, 252],
      label: [922, 324],
      polygon: [[900, 176], [958, 190], [958, 302], [922, 332], [886, 278], [890, 216]],
      gap: 8,
      neighbors: ["ropka"]
    }
  ];

  const MODE_META = {
    score: {
      headline: "Score-based policing allocates more patrols to districts with higher recorded risk.",
      controlNote: "Under the modeled rule, higher recorded risk leads to more patrol attention and therefore more opportunities to record incidents."
    },
    equal: {
      headline: "Equal patrols keep attention flatter, so detections stay closer to the underlying citywide pattern.",
      controlNote: "This baseline spreads attention evenly across districts, reducing self-reinforcing patrol concentration."
    },
    support: {
      headline: "The support-led scenario reallocates part of the response to services in high-score districts.",
      controlNote: "In this scenario, support activity reduces part of the modeled risk score while patrol activity continues."
    }
  };

  const dom = {
    body: document.body,
    widget: document.getElementById("crimeWidget"),
    shell: document.getElementById("crimeShell"),
    canvas: document.getElementById("cityCanvas"),
    stageWrap: document.getElementById("stageWrap"),
    progressFill: document.getElementById("progressFill"),
    runStateLabel: document.getElementById("runStateLabel"),
    strategyHeadline: document.getElementById("strategyHeadline"),
    liveTargetDistrict: document.getElementById("liveTargetDistrict"),
    insightTitle: document.getElementById("insightTitle"),
    insightCopy: document.getElementById("insightCopy"),
    metricGap: document.getElementById("metricGap"),
    metricWatch: document.getElementById("metricWatch"),
    metricFalsePositive: document.getElementById("metricFalsePositive"),
    metricProperty: document.getElementById("metricProperty"),
    metricInequality: document.getElementById("metricInequality"),
    metricConcentration: document.getElementById("metricConcentration"),
    controlNote: document.getElementById("controlNote"),
    trendChart: document.getElementById("trendChart"),
    chartCaption: document.getElementById("chartCaption"),
    headerNote: document.getElementById("headerNote"),
    playPauseButton: document.getElementById("playPauseButton"),
    replayButton: document.getElementById("replayButton"),
    speedButtons: Array.from(document.querySelectorAll(".speed-btn")),
    modeButtons: Array.from(document.querySelectorAll(".mode-btn")),
    patrolPressure: document.getElementById("patrolPressure"),
    socialAmplification: document.getElementById("socialAmplification"),
    stigmaSensitivity: document.getElementById("stigmaSensitivity"),
    patrolPressureValue: document.getElementById("patrolPressureValue"),
    socialAmplificationValue: document.getElementById("socialAmplificationValue"),
    stigmaSensitivityValue: document.getElementById("stigmaSensitivityValue")
  };

  const ctx = dom.canvas.getContext("2d");
  const state = {
    reducedMotion: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    embedMode: false,
    scenario: null,
    metrics: null,
    running: true,
    speed: 1,
    clock: 0,
    accumulator: 0,
    lastFrame: 0,
    resizeObserver: null,
    embedResizer: null,
    stageSize: { width: BASE_WIDTH, height: BASE_HEIGHT }
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function mix(a, b, t) {
    return lerp(a, b, clamp(t, 0, 1));
  }

  function round(value, digits = 0) {
    return Number(value.toFixed(digits));
  }

  function pct(value, digits = 0) {
    return `${(value * 100).toFixed(digits)}%`;
  }

  function pts(value) {
    const amount = Math.round(value * 100);
    const prefix = amount > 0 ? "+" : "";
    return `${prefix}${amount} pts`;
  }

  function ratio(value) {
    return `${value.toFixed(1)}x`;
  }

  function colorFromProperty(propertyValue) {
    const t = clamp((propertyValue - 0.58) / 0.47, 0, 1);
    const hue = mix(12, 166, t);
    const saturation = mix(40, 28, t);
    const lightness = mix(18, 28, t);
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  }

  function pathFromPoints(points) {
    return points.map((point, index) => `${index === 0 ? "M" : "L"}${point[0]},${point[1]}`).join(" ") + " Z";
  }

  function traceCurve(context, points) {
    if (!points.length) return;
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i += 1) {
      const midX = (points[i][0] + points[i + 1][0]) * 0.5;
      const midY = (points[i][1] + points[i + 1][1]) * 0.5;
      context.quadraticCurveTo(points[i][0], points[i][1], midX, midY);
    }
    const last = points.length - 1;
    context.quadraticCurveTo(
      points[last - 1][0],
      points[last - 1][1],
      points[last][0],
      points[last][1]
    );
  }

  function getCurveMidpoint(a, b) {
    return [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5];
  }

  function buildSmoothCurveSegments(points) {
    if (points.length < 2) return [];
    if (points.length === 2) {
      return [{ start: points[0], control: points[0], end: points[1], linear: true }];
    }

    const segments = [{
      start: points[0],
      control: points[1],
      end: getCurveMidpoint(points[1], points[2])
    }];

    for (let i = 1; i < points.length - 2; i += 1) {
      segments.push({
        start: getCurveMidpoint(points[i], points[i + 1]),
        control: points[i + 1],
        end: getCurveMidpoint(points[i + 1], points[i + 2])
      });
    }

    segments.push({
      start: getCurveMidpoint(points[points.length - 2], points[points.length - 1]),
      control: points[points.length - 2],
      end: points[points.length - 1]
    });

    return segments;
  }

  function sampleSmoothCurve(points, t) {
    if (!points.length) return { x: 0, y: 0, angle: 0 };
    if (points.length === 1) return { x: points[0][0], y: points[0][1], angle: 0 };

    const segments = buildSmoothCurveSegments(points);
    const normalized = clamp(t, 0, 0.999999);
    const scaled = normalized * segments.length;
    const index = Math.min(segments.length - 1, Math.floor(scaled));
    const localT = scaled - index;
    const segment = segments[index];

    if (segment.linear) {
      const x = mix(segment.start[0], segment.end[0], localT);
      const y = mix(segment.start[1], segment.end[1], localT);
      return {
        x,
        y,
        angle: Math.atan2(segment.end[1] - segment.start[1], segment.end[0] - segment.start[0])
      };
    }

    const point = getQuadraticPoint(
      segment.start[0],
      segment.start[1],
      segment.control[0],
      segment.control[1],
      segment.end[0],
      segment.end[1],
      localT
    );

    const tangentX = 2 * (1 - localT) * (segment.control[0] - segment.start[0])
      + 2 * localT * (segment.end[0] - segment.control[0]);
    const tangentY = 2 * (1 - localT) * (segment.control[1] - segment.start[1])
      + 2 * localT * (segment.end[1] - segment.control[1]);

    return {
      x: point.x,
      y: point.y,
      angle: Math.atan2(tangentY, tangentX)
    };
  }

  function buildPolygonPerimeter(points) {
    if (!points.length) return { segments: [], totalLength: 0 };

    const segments = [];
    let totalLength = 0;
    for (let i = 0; i < points.length; i += 1) {
      const start = points[i];
      const end = points[(i + 1) % points.length];
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const length = Math.hypot(dx, dy);
      if (length < 0.001) continue;
      segments.push({
        start,
        end,
        length,
        startLength: totalLength
      });
      totalLength += length;
    }

    return { segments, totalLength };
  }

  function samplePolygonPerimeter(perimeter, t) {
    if (!perimeter?.segments?.length || !perimeter.totalLength) {
      return { x: 0, y: 0, angle: 0 };
    }

    const normalized = ((t % 1) + 1) % 1;
    const distance = normalized * perimeter.totalLength;
    const segment = perimeter.segments.find((entry) => distance <= entry.startLength + entry.length)
      || perimeter.segments[perimeter.segments.length - 1];
    const localDistance = distance - segment.startLength;
    const localT = clamp(localDistance / segment.length, 0, 1);
    return {
      x: mix(segment.start[0], segment.end[0], localT),
      y: mix(segment.start[1], segment.end[1], localT),
      angle: Math.atan2(segment.end[1] - segment.start[1], segment.end[0] - segment.start[0])
    };
  }

  function insetPolygon(points, center, inset) {
    return points.map(([x, y]) => {
      const dx = center[0] - x;
      const dy = center[1] - y;
      const length = Math.hypot(dx, dy) || 1;
      const distance = Math.min(inset, length * 0.38);
      return [
        round(x + (dx / length) * distance, 2),
        round(y + (dy / length) * distance, 2)
      ];
    });
  }

  function toneRgb(tone) {
    if (tone === "support") return "92,236,182";
    if (tone === "watch") return "255,204,98";
    if (tone === "patrol") return "92,206,255";
    return "255,108,108";
  }

  function getAgentRenderPosition(agent, animationTime) {
    const orbit = 0.65 + Math.min(agent.detectedTotal, 2) * 0.2 + (agent.riskScore >= WATCH_THRESHOLD ? 0.16 : 0);
    return {
      x: agent.homeX + Math.cos(animationTime * 0.58 + agent.pulse) * orbit,
      y: agent.homeY + Math.sin(animationTime * 0.76 + agent.pulse * 1.14) * orbit * 0.72
    };
  }

  function getQuadraticControlPoint(x1, y1, x2, y2, liftBias = 0) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    const midX = (x1 + x2) * 0.5;
    const midY = (y1 + y2) * 0.5;
    const normalX = -dy / length;
    const normalY = dx / length;
    const lift = Math.min(length * 0.18, 34) * liftBias;
    return {
      x: midX + normalX * lift,
      y: midY + normalY * lift
    };
  }

  function getQuadraticPoint(x1, y1, cx, cy, x2, y2, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * x1 + 2 * mt * t * cx + t * t * x2,
      y: mt * mt * y1 + 2 * mt * t * cy + t * t * y2
    };
  }

  function pointInPolygon(x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];
      const intersect = ((yi > y) !== (yj > y))
        && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 0.000001) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function makeSeed(config) {
    return hashSeed([
      config.mode,
      config.patrolPressure,
      config.socialAmplification,
      config.stigmaSensitivity
    ].join("|"));
  }

  function normalizeCounts(weights, total) {
    const counts = [];
    let runningTotal = 0;
    for (let i = 0; i < weights.length; i += 1) {
      const raw = total * weights[i];
      const count = i === weights.length - 1 ? total - runningTotal : Math.floor(raw);
      counts.push(count);
      runningTotal += count;
    }
    let diff = total - runningTotal;
    let index = 0;
    while (diff > 0) {
      counts[index % counts.length] += 1;
      diff -= 1;
      index += 1;
    }
    return counts;
  }

  function readConfig() {
    const activeMode = dom.modeButtons.find((button) => button.classList.contains("is-active"));
    return {
      mode: activeMode ? activeMode.dataset.mode : "score",
      patrolPressure: Number(dom.patrolPressure.value),
      socialAmplification: Number(dom.socialAmplification.value),
      stigmaSensitivity: Number(dom.stigmaSensitivity.value)
    };
  }

  function updateControlOutputs() {
    dom.patrolPressureValue.textContent = `${dom.patrolPressure.value} units`;
    dom.socialAmplificationValue.textContent = `${dom.socialAmplification.value}%`;
    dom.stigmaSensitivityValue.textContent = `${dom.stigmaSensitivity.value}%`;
  }

  function pickPointInDistrict(district, rng) {
    const xs = district.polygon.map((point) => point[0]);
    const ys = district.polygon.map((point) => point[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    for (let attempt = 0; attempt < 200; attempt += 1) {
      const x = lerp(minX + 8, maxX - 8, rng());
      const y = lerp(minY + 8, maxY - 8, rng());
      if (pointInPolygon(x, y, district.polygon)) {
        return { x, y };
      }
    }

    return { x: district.center[0], y: district.center[1] };
  }

  function addEdge(edgeSet, adjacency, agents, aId, bId) {
    if (aId === bId) return;
    const low = Math.min(aId, bId);
    const high = Math.max(aId, bId);
    const key = `${low}:${high}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    adjacency[low].add(high);
    adjacency[high].add(low);
    agents[low].contacts.push(high);
    agents[high].contacts.push(low);
  }

  function computeInitialRisk(agent, agents, rng) {
    let score = rng() * 2;
    if (agent.priorOffense) score += 10;

    let householdFlags = 0;
    for (let i = 0; i < agent.household.length; i += 1) {
      const other = agents[agent.household[i]];
      if (other.priorOffense) householdFlags += 1;
    }

    let socialFlags = 0;
    for (let i = 0; i < agent.contacts.length; i += 1) {
      const other = agents[agent.contacts[i]];
      if (other.priorOffense) socialFlags += 1;
    }

    score += householdFlags * 1;
    score += socialFlags * 2;
    return score;
  }

  function buildScenario(config) {
    const rng = mulberry32(makeSeed(config));
    const districts = DISTRICT_BLUEPRINTS.map((blueprint, index) => {
      const polygon = insetPolygon(blueprint.polygon, blueprint.center, blueprint.gap ?? 10);
      return {
        ...blueprint,
        polygon,
        polygonPath: pathFromPoints(polygon),
        perimeterPath: buildPolygonPerimeter(polygon),
        population: 0,
        agentIds: [],
        propertyBase: round(0.97 + (rng() - 0.5) * 0.06, 3),
        propertyValue: 1,
        baseIncidentRate: round(0.0106 + (rng() - 0.5) * 0.0015, 4),
        detectedThisWeek: 0,
        trueThisWeek: 0,
        detectedTotal: 0,
        trueTotal: 0,
        watchCount: 0,
        falsePositiveWatchCount: 0,
        signal: 0,
        signalNorm: 0,
        avgRisk: 0,
        patrolShare: 1 / DISTRICT_BLUEPRINTS.length,
        patrolUnits: 0,
        supportUnits: 0,
        heat: 0.1 + index * 0.005,
        stigma: 0.05,
        supportIndex: 0,
        exitPressure: 0,
        recentActivity: 0
      };
    });

    districts.forEach((district) => {
      district.propertyValue = district.propertyBase;
    });

    const counts = normalizeCounts(
      districts.map((district) => district.populationWeight),
      POPULATION
    );

    const agents = [];
    const householdGroups = [];
    let householdId = 0;

    districts.forEach((district, districtIndex) => {
      district.population = counts[districtIndex];
      let remaining = counts[districtIndex];
      while (remaining > 0) {
        const size = Math.min(remaining, 2 + Math.floor(rng() * 4));
        const household = [];
        for (let i = 0; i < size; i += 1) {
          const point = pickPointInDistrict(district, rng);
          const agent = {
            id: agents.length,
            districtId: district.id,
            householdId,
            household: [],
            contacts: [],
            homeX: point.x,
            homeY: point.y,
            x: point.x + (rng() - 0.5) * 2.4,
            y: point.y + (rng() - 0.5) * 2.4,
            pulse: rng() * Math.PI * 2,
            baseIncidentChance: clamp(district.baseIncidentRate * (0.82 + rng() * 0.42) + (rng() < 0.1 ? 0.002 : 0), 0.004, 0.028),
            riskScore: 0,
            priorOffense: false,
            detectedTotal: 0,
            trueIncidentCount: 0,
            falsePositiveMarks: 0,
            supportBuffer: 0,
            scoreFlash: 0,
            scoreTrend: 0,
            lastDetectedWeek: -999,
            detectedInCurrentWeek: false,
            actualIncident: false,
            wasContactedThisWeek: false
          };
          agents.push(agent);
          household.push(agent.id);
          district.agentIds.push(agent.id);
          remaining -= 1;
        }
        householdGroups.push(household);
        householdId += 1;
      }
    });

    householdGroups.forEach((group) => {
      group.forEach((agentId) => {
        agents[agentId].household = group.filter((id) => id !== agentId);
      });
    });

    const districtById = Object.fromEntries(districts.map((district) => [district.id, district]));
    const edgeSet = new Set();
    const adjacency = agents.map(() => new Set());

    householdGroups.forEach((group) => {
      for (let i = 0; i < group.length; i += 1) {
        for (let j = i + 1; j < group.length; j += 1) {
          addEdge(edgeSet, adjacency, agents, group[i], group[j]);
        }
      }
    });

    districts.forEach((district) => {
      const ids = district.agentIds;
      ids.forEach((agentId) => {
        for (let i = 0; i < 2; i += 1) {
          const otherId = ids[Math.floor(rng() * ids.length)];
          addEdge(edgeSet, adjacency, agents, agentId, otherId);
        }

        if (rng() < 0.34) {
          const neighborId = district.neighbors[Math.floor(rng() * district.neighbors.length)];
          const neighborDistrict = districtById[neighborId];
          const otherId = neighborDistrict.agentIds[Math.floor(rng() * neighborDistrict.agentIds.length)];
          addEdge(edgeSet, adjacency, agents, agentId, otherId);
        }
      });
    });

    const priorDistrictOrder = districts
      .slice()
      .sort(() => rng() - 0.5);
    const priorAgents = [];
    while (priorAgents.length < INITIAL_PRIORS) {
      const district = priorDistrictOrder[priorAgents.length % priorDistrictOrder.length];
      const available = district.agentIds.filter((agentId) => !agents[agentId].priorOffense);
      const chosen = available[Math.floor(rng() * available.length)];
      agents[chosen].priorOffense = true;
      priorAgents.push(chosen);
    }

    agents.forEach((agent) => {
      agent.riskScore = computeInitialRisk(agent, agents, rng);
    });

    const edges = Array.from(edgeSet).map((key) => {
      const [aId, bId] = key.split(":").map(Number);
      const sameDistrict = agents[aId].districtId === agents[bId].districtId;
      return {
        aId,
        bId,
        sameDistrict,
        visibleBias: rng(),
        curveBias: (rng() - 0.5) * (sameDistrict ? 0.9 : 1.5),
        particleOffset: rng()
      };
    });

    const scenario = {
      rng,
      config,
      districts,
      districtById,
      agents,
      edges,
      renderEdges: edges.filter((edge) => edge.visibleBias < 0.42),
      interactions: [],
      pulses: [],
      week: 0,
      history: []
    };

    recalculateDistrictSignals(scenario);
    allocatePatrols(scenario);
    scenario.patrolCars = createPatrolCars(scenario);
    rebalancePatrolCars(scenario, { instant: true });
    return scenario;
  }

  function recalculateDistrictSignals(scenario) {
    const { districts, districtById, agents } = scenario;
    let maxSignal = 0;
    let minSignal = Infinity;

    districts.forEach((district) => {
      district.watchCount = 0;
      district.falsePositiveWatchCount = 0;
      district.signal = 0;
      district.avgRisk = 0;
    });

    agents.forEach((agent) => {
      const district = districtById[agent.districtId];
      district.avgRisk += agent.riskScore;
      const underWatch = agent.riskScore >= WATCH_THRESHOLD || agent.detectedTotal > 0;
      if (underWatch) {
        district.watchCount += 1;
        if (agent.trueIncidentCount === 0) {
          district.falsePositiveWatchCount += 1;
        }
      }
    });

    districts.forEach((district) => {
      const population = Math.max(district.population, 1);
      district.avgRisk /= population;
      district.signal = (
        district.avgRisk * 13
        + district.detectedTotal * 0.55
        + district.watchCount * 0.28
        + district.heat * 12
        + district.stigma * 8
      );
      maxSignal = Math.max(maxSignal, district.signal);
      minSignal = Math.min(minSignal, district.signal);
    });

    districts.forEach((district) => {
      district.signalNorm = clamp((district.signal - minSignal) / Math.max(maxSignal - minSignal, 0.0001), 0, 1);
    });
  }

  function allocatePatrols(scenario) {
    const { districts, config } = scenario;
    const weights = [];
    let totalWeight = 0;
    const totalPatrolCars = Math.max(1, Math.round(config.patrolPressure));

    districts.forEach((district) => {
      let weight = 1;
      if (config.mode === "score") {
        weight = 0.45 + Math.pow(district.signal + 1, 1.08);
      } else if (config.mode === "equal") {
        weight = 1;
      } else {
        weight = 1.4 + Math.pow(district.signal + 1, 0.48) * 0.28;
      }
      weights.push(weight);
      totalWeight += weight;
    });

    const counts = normalizeCounts(
      weights.map((weight) => weight / Math.max(totalWeight, 0.0001)),
      totalPatrolCars
    );

    districts.forEach((district, index) => {
      district.patrolUnits = counts[index];
      district.patrolShare = counts[index] / totalPatrolCars;
      district.supportUnits = config.mode === "support"
        ? Math.pow(district.signalNorm, 0.8) * (config.patrolPressure * 0.78 + 4)
        : 0;
    });

    scenario.totalPatrolCars = totalPatrolCars;
  }

  function shortestDistrictPath(scenario, startId, targetId) {
    if (startId === targetId) return [startId];
    const queue = [[startId]];
    const visited = new Set([startId]);

    while (queue.length) {
      const path = queue.shift();
      const currentId = path[path.length - 1];
      const district = scenario.districtById[currentId];
      if (!district) continue;

      for (let i = 0; i < district.neighbors.length; i += 1) {
        const neighborId = district.neighbors[i];
        if (visited.has(neighborId)) continue;
        const nextPath = path.concat(neighborId);
        if (neighborId === targetId) return nextPath;
        visited.add(neighborId);
        queue.push(nextPath);
      }
    }

    return [startId, targetId];
  }

  function placePatrolCarOnDistrictBorder(car, district) {
    const point = samplePolygonPerimeter(district.perimeterPath, car.perimeterOffset);
    car.currentDistrictId = district.id;
    car.state = "patrol";
    car.routeDistrictIds = [district.id];
    car.routeIndex = 0;
    car.x = point.x;
    car.y = point.y;
    car.heading = point.angle + (car.perimeterDirection < 0 ? Math.PI : 0);
  }

  function createPatrolCars(scenario) {
    const cars = [];
    scenario.districts.forEach((district) => {
      for (let i = 0; i < district.patrolUnits; i += 1) {
        const perimeterOffset = scenario.rng();
        const perimeterDirection = scenario.rng() < 0.5 ? -1 : 1;
        const point = samplePolygonPerimeter(district.perimeterPath, perimeterOffset);
        cars.push({
          id: cars.length,
          assignedDistrictId: district.id,
          currentDistrictId: district.id,
          state: "patrol",
          routeDistrictIds: [district.id],
          routeIndex: 0,
          x: point.x,
          y: point.y,
          heading: point.angle + (perimeterDirection < 0 ? Math.PI : 0),
          perimeterOffset,
          perimeterDirection,
          patrolSpeed: 0.72 + scenario.rng() * 0.34,
          transferSpeed: 0.62 + scenario.rng() * 0.2
        });
      }
    });
    return cars;
  }

  function setPatrolCarRoute(car, scenario, targetDistrictId, options = {}) {
    const { instant = false } = options;
    const targetDistrict = scenario.districtById[targetDistrictId];
    if (!targetDistrict) return;

    car.assignedDistrictId = targetDistrictId;
    if (instant || car.currentDistrictId === targetDistrictId) {
      placePatrolCarOnDistrictBorder(car, targetDistrict);
      return;
    }

    car.state = "transfer";
    car.routeDistrictIds = shortestDistrictPath(scenario, car.currentDistrictId, targetDistrictId);
    car.routeIndex = 0;
    car.transferSpeed = 0.68 + targetDistrict.signalNorm * 0.34 + scenario.rng() * 0.18;
  }

  function rebalancePatrolCars(scenario, options = {}) {
    const { instant = false } = options;
    if (!scenario.patrolCars || !scenario.patrolCars.length) return;

    const grouped = Object.fromEntries(scenario.districts.map((district) => [district.id, []]));
    scenario.patrolCars.forEach((car) => {
      if (!grouped[car.assignedDistrictId]) grouped[car.assignedDistrictId] = [];
      grouped[car.assignedDistrictId].push(car);
    });

    const surplusCars = [];
    scenario.districts.forEach((district) => {
      const cars = grouped[district.id] || [];
      cars.sort((a, b) => {
        const aSettled = a.state === "patrol" && a.currentDistrictId === district.id ? 1 : 0;
        const bSettled = b.state === "patrol" && b.currentDistrictId === district.id ? 1 : 0;
        return bSettled - aSettled;
      });
      while (cars.length > district.patrolUnits) {
        surplusCars.push(cars.pop());
      }
      grouped[district.id] = cars;
    });

    scenario.districts.forEach((district) => {
      const assignedCars = grouped[district.id] || [];
      while (assignedCars.length < district.patrolUnits && surplusCars.length) {
        let bestIndex = 0;
        let bestScore = Infinity;
        for (let i = 0; i < surplusCars.length; i += 1) {
          const car = surplusCars[i];
          const source = scenario.districtById[car.currentDistrictId] || scenario.districtById[car.assignedDistrictId];
          const dx = (source?.center?.[0] ?? car.x) - district.center[0];
          const dy = (source?.center?.[1] ?? car.y) - district.center[1];
          const distanceScore = Math.hypot(dx, dy);
          if (distanceScore < bestScore) {
            bestScore = distanceScore;
            bestIndex = i;
          }
        }
        const [car] = surplusCars.splice(bestIndex, 1);
        if (!car) break;
        assignedCars.push(car);
        setPatrolCarRoute(car, scenario, district.id, { instant });
      }
    });
  }

  function advancePatrolCars(scenario, deltaMs, animationTime) {
    if (!scenario?.patrolCars?.length) return;

    scenario.patrolCars.forEach((car) => {
      if (car.state === "transfer") {
        let remaining = deltaMs * car.transferSpeed;
        while (remaining > 0 && car.state === "transfer") {
          const nextDistrictId = car.routeDistrictIds[car.routeIndex + 1];
          if (!nextDistrictId) {
            setPatrolCarRoute(car, scenario, car.assignedDistrictId, { instant: true });
            break;
          }

          const targetDistrict = scenario.districtById[nextDistrictId];
          const dx = targetDistrict.center[0] - car.x;
          const dy = targetDistrict.center[1] - car.y;
          const distance = Math.hypot(dx, dy) || 1;
          if (distance <= remaining) {
            car.x = targetDistrict.center[0];
            car.y = targetDistrict.center[1];
            car.heading = Math.atan2(dy, dx);
            car.currentDistrictId = nextDistrictId;
            car.routeIndex += 1;
            remaining -= distance;
            if (car.routeIndex >= car.routeDistrictIds.length - 1) {
              placePatrolCarOnDistrictBorder(car, targetDistrict);
            }
          } else {
            car.x += (dx / distance) * remaining;
            car.y += (dy / distance) * remaining;
            car.heading = Math.atan2(dy, dx);
            remaining = 0;
          }
        }
        return;
      }

      const district = scenario.districtById[car.currentDistrictId] || scenario.districtById[car.assignedDistrictId];
      if (!district) return;

      const focus = district.signalNorm;
      const perimeterRate = (0.000042 + focus * 0.000022) * car.patrolSpeed;
      car.perimeterOffset += deltaMs * perimeterRate * car.perimeterDirection;
      const point = samplePolygonPerimeter(district.perimeterPath, car.perimeterOffset);
      car.heading = point.angle + (car.perimeterDirection < 0 ? Math.PI : 0);
      car.x = point.x;
      car.y = point.y;
    });
  }

  function pickContactAgent(ids, agents, rng, mode, avoidRecentOnly = false) {
    let best = null;
    let bestScore = -Infinity;
    const checks = Math.min(8, ids.length);
    for (let i = 0; i < checks; i += 1) {
      const candidate = agents[ids[Math.floor(rng() * ids.length)]];
      if (!candidate) continue;
      if (avoidRecentOnly && candidate.detectedInCurrentWeek) continue;
      const riskWeight = mode === "score" ? 1.15 : mode === "equal" ? 0.3 : 0.18;
      const score = (
        rng() * 1.8
        + candidate.riskScore * riskWeight
        + candidate.detectedTotal * 0.8
        + (candidate.priorOffense ? 2.8 : 0)
        + (candidate.falsePositiveMarks > 0 ? 0.8 : 0)
      );
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    return best || agents[ids[Math.floor(rng() * ids.length)]];
  }

  function pushInteraction(scenario, fromX, fromY, toX, toY, tone) {
    scenario.interactions.push({
      fromX,
      fromY,
      toX,
      toY,
      tone,
      progress: 0,
      alpha: tone === "support" ? 0.7 : 0.84,
      speed: tone === "support" ? 0.018 : tone === "patrol" ? 0.024 : 0.028,
      liftBias: (scenario.rng() - 0.5) * 1.2
    });
    if (scenario.interactions.length > 220) {
      scenario.interactions.splice(0, scenario.interactions.length - 220);
    }
  }

  function adjustAgentRisk(agent, delta, options = {}) {
    const {
      min = 0,
      max = 44,
      visualize = true
    } = options;

    const previous = agent.riskScore;
    agent.riskScore = clamp(previous + delta, min, max);
    const applied = agent.riskScore - previous;

    if (visualize && Math.abs(applied) > 0.02) {
      agent.scoreFlash = clamp(agent.scoreFlash + Math.abs(applied) * 0.14, 0, 1.4);
      agent.scoreTrend = clamp(agent.scoreTrend * 0.35 + Math.sign(applied) * Math.min(1, Math.abs(applied) / 3.6), -1.2, 1.2);
    }

    return applied;
  }

  function registerPulse(scenario, x, y, tone) {
    scenario.pulses.push({
      x,
      y,
      tone,
      radius: tone === "support" ? 4.5 : 4,
      alpha: tone === "support" ? 0.34 : 0.3
    });
    if (scenario.pulses.length > 120) {
      scenario.pulses.splice(0, scenario.pulses.length - 120);
    }
  }

  function registerDetection(scenario, district, agent, wasTrueIncident) {
    const { agents, config } = scenario;
    district.detectedThisWeek += 1;
    district.detectedTotal += 1;
    district.recentActivity += 1;
    district.heat = clamp(district.heat + 0.07, 0, 2);
    district.stigma = clamp(district.stigma + 0.02, 0, 1.8);

    agent.detectedTotal += 1;
    agent.detectedInCurrentWeek = true;
    agent.lastDetectedWeek = scenario.week;
    adjustAgentRisk(agent, (wasTrueIncident ? 5.2 : 3.6) + district.patrolShare * 5, {
      min: 0,
      max: 44,
      visualize: true
    });

    if (!wasTrueIncident) {
      agent.falsePositiveMarks += 1;
    }

    agent.household.forEach((otherId) => {
      const other = agents[otherId];
      adjustAgentRisk(other, 0.78, { min: 0, max: 34, visualize: true });
    });

    const spillover = config.socialAmplification / 100;
    agent.contacts.forEach((otherId) => {
      const other = agents[otherId];
      adjustAgentRisk(other, 0.46 * spillover, { min: 0, max: 34, visualize: true });
    });

    pushInteraction(scenario, district.center[0], district.center[1], agent.homeX, agent.homeY, "patrol");
    pushInteraction(scenario, agent.homeX, agent.homeY, district.center[0], district.center[1], wasTrueIncident ? "detected" : "watch");

    const spillTargets = Array.from(new Set([
      ...agent.household.slice(0, 2),
      ...agent.contacts.slice(0, 3)
    ]));

    spillTargets.slice(0, 4).forEach((otherId) => {
      const other = agents[otherId];
      if (!other) return;
      pushInteraction(scenario, agent.homeX, agent.homeY, other.homeX, other.homeY, "watch");
    });

  }

  function applySupportContact(scenario, district, agent) {
    const { agents } = scenario;
    const relief = 1.1 + scenario.config.socialAmplification / 120;
    adjustAgentRisk(agent, -relief, { min: 0, max: 44, visualize: true });
    agent.supportBuffer = clamp(agent.supportBuffer + 0.22, 0, 1.6);
    district.supportIndex = clamp(district.supportIndex + 0.05, 0, 1.4);
    pushInteraction(scenario, district.center[0], district.center[1], agent.homeX, agent.homeY, "support");
    const supportNeighborId = agent.household[0] ?? agent.contacts[0];
    if (supportNeighborId !== undefined) {
      const other = agents[supportNeighborId];
      if (other) {
        pushInteraction(scenario, agent.homeX, agent.homeY, other.homeX, other.homeY, "support");
      }
    }
    registerPulse(scenario, agent.homeX, agent.homeY, "support");
  }

  function simulateWeek(scenario) {
    const { districts, districtById, agents, config, rng } = scenario;
    scenario.week += 1;

    districts.forEach((district) => {
      district.detectedThisWeek = 0;
      district.trueThisWeek = 0;
      district.recentActivity = 0;
    });

    agents.forEach((agent) => {
      agent.detectedInCurrentWeek = false;
      agent.wasContactedThisWeek = false;
      const district = districtById[agent.districtId];
      const stressLift = district.heat * 0.08 + district.stigma * 0.04;
      const supportLift = config.mode === "support" ? district.supportIndex * 0.18 + agent.supportBuffer * 0.14 : 0;
      const chance = clamp(agent.baseIncidentChance * (1 + stressLift - supportLift), 0.0025, 0.05);
      agent.actualIncident = rng() < chance;
      if (agent.actualIncident) {
        district.trueThisWeek += 1;
        district.trueTotal += 1;
        agent.trueIncidentCount += 1;
      }
    });

    allocatePatrols(scenario);
    rebalancePatrolCars(scenario);

    districts.forEach((district) => {
      const aggressiveStops = Math.max(1, Math.round(district.patrolUnits * (config.mode === "score" ? 5.8 : config.mode === "equal" ? 4.8 : 3.7)));
      const ids = district.agentIds;
      for (let i = 0; i < aggressiveStops; i += 1) {
        const agent = pickContactAgent(ids, agents, rng, config.mode, false);
        if (!agent) continue;
        const falsePositiveBase = config.mode === "score" ? 0.048 : config.mode === "equal" ? 0.02 : 0.008;
        const detectionChance = agent.actualIncident
          ? 0.62 + district.patrolShare * (config.mode === "score" ? 0.4 : config.mode === "equal" ? 0.22 : 0.12)
          : falsePositiveBase + district.patrolShare * (config.mode === "score" ? 0.22 : config.mode === "equal" ? 0.08 : 0.03) + Math.max(agent.riskScore - 6, 0) * 0.007;
        if (!agent.detectedInCurrentWeek && rng() < clamp(detectionChance, 0, 0.94)) {
          registerDetection(scenario, district, agent, agent.actualIncident);
        }
      }
    });

    if (config.mode === "support") {
      districts.forEach((district) => {
        const supportContacts = Math.round(district.supportUnits);
        for (let i = 0; i < supportContacts; i += 1) {
          const agent = pickContactAgent(district.agentIds, agents, rng, "score", true);
          if (agent) {
            applySupportContact(scenario, district, agent);
          }
        }
      });
    }

    agents.forEach((agent) => {
      const district = districtById[agent.districtId];
      const decay = config.mode === "support" ? 0.88 : config.mode === "equal" ? 0.46 : 0.22;
      const supportRelief = district.supportIndex * 0.22 + agent.supportBuffer * 0.52;
      const memoryFloor = agent.priorOffense ? 1.9 : 0;
      agent.riskScore = Math.max(memoryFloor, agent.riskScore - decay - supportRelief);
      agent.supportBuffer *= 0.84;
      agent.scoreFlash *= 0.82;
      agent.scoreTrend *= 0.8;
      agent.pulse += 0.08;
    });

    recalculateDistrictSignals(scenario);

    districts.forEach((district) => {
      const watchRate = district.watchCount / Math.max(district.population, 1);
      const detectionPressure = district.detectedThisWeek / Math.max(district.population, 1);
      const stigmaForce = (
        watchRate * 0.78
        + district.patrolShare * 1.14
        + detectionPressure * 4.2
        + district.heat * 0.11
      ) * (config.stigmaSensitivity / 100);

      let drift = 0;
      if (config.mode === "score") {
        drift = -0.0205 * stigmaForce;
      } else if (config.mode === "equal") {
        drift = -0.0115 * stigmaForce + 0.0012;
      } else {
        drift = -0.0055 * stigmaForce + 0.0105 * district.supportIndex;
      }

      district.propertyValue = clamp(district.propertyValue + drift, 0.58, 1.08);
      district.stigma = clamp(district.stigma * 0.92 + Math.max(0, -drift) * 5.2, 0, 1.8);
      district.heat = clamp(district.heat * 0.87 + district.detectedThisWeek * 0.022, 0.04, 2.2);
      district.supportIndex = config.mode === "support"
        ? clamp(district.supportIndex * 0.82, 0, 1.6)
        : district.supportIndex * 0.55;
      district.exitPressure += Math.max(0, 0.82 - district.propertyValue) * watchRate * 6;
    });

    recalculateDistrictSignals(scenario);
    captureHistory(scenario);
  }

  function captureHistory(scenario) {
    const metrics = computeMetrics(scenario);
    scenario.history.push({
      week: scenario.week,
      maxDetectedShare: metrics.maxDetectedShare,
      maxTrueShare: metrics.maxTrueShare,
      patrolConcentration: metrics.topDistrict ? metrics.topDistrict.patrolShare : 0,
      propertyIndex: metrics.propertyIndex
    });
    scenario.metrics = metrics;
    state.metrics = metrics;
  }

  function computeMetrics(scenario) {
    const { districts, agents } = scenario;
    const totalDetected = districts.reduce((sum, district) => sum + district.detectedTotal, 0);
    const totalTrue = districts.reduce((sum, district) => sum + district.trueTotal, 0);
    const watchCount = agents.filter((agent) => agent.riskScore >= WATCH_THRESHOLD || agent.detectedTotal > 0).length;
    const falsePositiveWatch = agents.filter(
      (agent) => (agent.riskScore >= WATCH_THRESHOLD || agent.detectedTotal > 0) && agent.trueIncidentCount === 0
    ).length;

    let maxDetectedShare = 0;
    let maxTrueShare = 0;
    let topDistrict = null;
    let lowestSignal = Infinity;
    let highestSignal = 0;
    let propertyTotal = 0;

    districts.forEach((district) => {
      const detectedShare = totalDetected > 0 ? district.detectedTotal / totalDetected : 0;
      const trueShare = totalTrue > 0 ? district.trueTotal / totalTrue : 0;
      district.detectedShare = detectedShare;
      district.trueShare = trueShare;
      if (!topDistrict || district.patrolShare > topDistrict.patrolShare || (district.patrolShare === topDistrict.patrolShare && district.signal > topDistrict.signal)) {
        topDistrict = district;
      }
      maxDetectedShare = Math.max(maxDetectedShare, detectedShare);
      maxTrueShare = Math.max(maxTrueShare, trueShare);
      highestSignal = Math.max(highestSignal, district.signal);
      lowestSignal = Math.min(lowestSignal, district.signal);
      propertyTotal += district.propertyValue;
    });

    return {
      totalDetected,
      totalTrue,
      watchCount,
      falsePositiveWatch,
      maxDetectedShare,
      maxTrueShare,
      gap: maxDetectedShare - maxTrueShare,
      propertyIndex: Math.round((propertyTotal / districts.length) * 100),
      inequality: (highestSignal + 18) / Math.max(lowestSignal + 18, 0.0001),
      topDistrict
    };
  }

  function buildInsight(metrics, config, week) {
    if (week === 0) {
      return {
        title: "Balanced start",
        copy: "The city begins with similar baseline offending across districts, but the patrol model decides where evidence accumulates."
      };
    }

    if (config.mode === "score") {
      if (metrics.gap > 0.16) {
        return {
          title: "The recorded hotspot is becoming self-reinforcing",
          copy: "Recorded incidents are concentrating faster than the model's underlying incidents because patrol attention also affects where incidents are detected."
        };
      }
      if (metrics.topDistrict && metrics.topDistrict.patrolShare > 0.26) {
        return {
          title: "Patrols are narrowing onto one district",
          copy: "The highest-score district is receiving a disproportionate share of checks, so each new detection is more likely to happen there again."
        };
      }
      return {
        title: "The score is beginning to compound",
        copy: "Linked contacts and repeated checks add more residents to the watchlist than the model's underlying incidents alone would produce."
      };
    }

    if (config.mode === "equal") {
      if (metrics.gap < 0.07) {
        return {
          title: "Detection stays closer to the city baseline",
          copy: "When patrol attention is spread evenly, the hotspot grows more slowly and detected incidents track the true pattern more closely."
        };
      }
      return {
        title: "Some drift remains, but less of it compounds",
        copy: "Equal patrols do not erase bias completely, yet they reduce the self-fulfilling pressure created by score-led deployment."
      };
    }

    if (metrics.propertyIndex >= 94) {
      return {
        title: "Support changes the score trajectory",
        copy: "Risk scores still change, while the modeled support effect reduces part of the accumulated score and property-value impact."
      };
    }

    return {
      title: "Recorded risk becomes less concentrated",
      copy: "Compared with score-led patrols alone, the support scenario produces fewer watchlisted residents and a smaller modeled property-value change."
    };
  }

  function updateTrendChart(history) {
    const width = 520;
    const height = 220;
    const left = 44;
    const right = 18;
    const top = 16;
    const bottom = 30;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const maxY = 0.6;

    const gridValues = [0, 0.2, 0.4, 0.6];
    const grid = gridValues.map((value) => {
      const y = top + plotHeight - (value / maxY) * plotHeight;
      return `
        <line class="trend-grid-line" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line>
        <text class="trend-axis-label" x="${left - 8}" y="${y + 4}" text-anchor="end">${Math.round(value * 100)}%</text>
      `;
    }).join("");

    const xLabel = `<text class="trend-axis-label" x="${width - right}" y="${height - 8}" text-anchor="end">Weeks</text>`;
    const yLabel = `<text class="trend-axis-label" x="${left}" y="${top - 4}">Hotspot share</text>`;

    const buildPath = (key) => history.map((point, index) => {
      const x = left + (history.length <= 1 ? 0 : (index / (history.length - 1)) * plotWidth);
      const y = top + plotHeight - (clamp(point[key], 0, maxY) / maxY) * plotHeight;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    }).join(" ");

    const detectedPath = history.length ? buildPath("maxDetectedShare") : "";
    const truePath = history.length ? buildPath("maxTrueShare") : "";
    const last = history[history.length - 1] || { maxDetectedShare: 0, maxTrueShare: 0 };
    const lastX = history.length <= 1 ? left : left + plotWidth;
    const lastDetectedY = top + plotHeight - (clamp(last.maxDetectedShare, 0, maxY) / maxY) * plotHeight;
    const lastTrueY = top + plotHeight - (clamp(last.maxTrueShare, 0, maxY) / maxY) * plotHeight;

    dom.trendChart.innerHTML = `
      ${grid}
      <path class="trend-path trend-path--detected" d="${detectedPath}"></path>
      <path class="trend-path trend-path--true" d="${truePath}"></path>
      <circle class="trend-endpoint trend-endpoint--detected" cx="${lastX}" cy="${lastDetectedY}" r="5"></circle>
      <circle class="trend-endpoint trend-endpoint--true" cx="${lastX}" cy="${lastTrueY}" r="5"></circle>
      ${xLabel}
      ${yLabel}
    `;
  }

  function updateRunStateLabel() {
    const week = state.scenario ? state.scenario.week : 0;
    if (week >= TOTAL_WEEKS && !state.running) {
      dom.runStateLabel.textContent = `Completed week ${TOTAL_WEEKS} of ${TOTAL_WEEKS}`;
      return;
    }
    if (state.running) {
      dom.runStateLabel.textContent = `Running week ${week} of ${TOTAL_WEEKS}`;
    } else {
      dom.runStateLabel.textContent = `Paused at week ${week} of ${TOTAL_WEEKS}`;
    }
  }

  function updateButtons() {
    const completed = state.scenario && state.scenario.week >= TOTAL_WEEKS;
    dom.playPauseButton.textContent = completed ? "Run again" : state.running ? "Pause" : "Resume";
    dom.playPauseButton.setAttribute("aria-pressed", String(state.running));
  }

  function updateUI() {
    const { scenario, metrics } = state;
    if (!scenario || !metrics) return;
    const config = scenario.config;
    const insight = buildInsight(metrics, config, scenario.week);

    dom.progressFill.style.width = `${(scenario.week / TOTAL_WEEKS) * 100}%`;
    dom.strategyHeadline.textContent = MODE_META[config.mode].headline;
    dom.controlNote.textContent = MODE_META[config.mode].controlNote;
    dom.liveTargetDistrict.textContent = metrics.topDistrict ? metrics.topDistrict.name : "Balanced city";
    dom.insightTitle.textContent = insight.title;
    dom.insightCopy.textContent = insight.copy;
    dom.metricGap.textContent = pts(metrics.gap);
    dom.metricWatch.textContent = String(metrics.watchCount);
    dom.metricFalsePositive.textContent = String(metrics.falsePositiveWatch);
    dom.metricProperty.textContent = String(metrics.propertyIndex);
    dom.metricInequality.textContent = ratio(metrics.inequality);
    dom.metricConcentration.textContent = pct(metrics.topDistrict ? metrics.topDistrict.patrolShare : 0, 0);
    dom.chartCaption.textContent = metrics.gap > 0.12
      ? "The hotspot now claims a much larger share of recorded incidents than of the underlying city signal."
      : metrics.gap > 0.05
        ? "Detected incidents are starting to drift away from the underlying true pattern."
        : "Hotspot share is still close to the underlying signal.";
    dom.headerNote.textContent = config.mode === "support"
      ? "Key question: what changes when the city responds with support instead of only surveillance?"
      : "Key question: did crime increase, or did surveillance increase?";

    updateTrendChart(scenario.history);
    updateRunStateLabel();
    updateButtons();
    if (state.embedResizer) state.embedResizer.request();
  }

  function drawRoundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function drawDistrictLabelChip(context, district, isTopDistrict) {
    const title = district.name;
    const subtitle = `P ${Math.round(district.propertyValue * 100)} · W ${district.watchCount}`;
    const accentRgb = district.supportIndex > 0.24 ? "84,193,160" : isTopDistrict ? "244,180,88" : "146,196,224";

    context.save();
    context.font = "700 13px 'Space Grotesk','Manrope',sans-serif";
    const titleWidth = context.measureText(title).width;
    context.font = "600 10px 'Space Grotesk','Manrope',sans-serif";
    const subtitleWidth = context.measureText(subtitle).width;
    const width = Math.max(titleWidth, subtitleWidth) + 30;
    const height = 38;
    const x = district.label[0] - width * 0.5;
    const y = district.label[1] - 30;

    context.shadowColor = "rgba(3,9,16,0.42)";
    context.shadowBlur = 16;
    context.shadowOffsetY = 5;
    drawRoundedRect(context, x, y, width, height, 14);
    context.fillStyle = "rgba(8,18,30,0.72)";
    context.fill();
    context.strokeStyle = `rgba(${accentRgb},${isTopDistrict ? 0.68 : 0.34})`;
    context.lineWidth = isTopDistrict ? 1.6 : 1.1;
    context.stroke();
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;

    context.fillStyle = `rgba(${accentRgb},0.94)`;
    context.beginPath();
    context.arc(x + 12, y + 11, 3.2, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(246,251,255,0.96)";
    context.font = "700 13px 'Space Grotesk','Manrope',sans-serif";
    context.textAlign = "left";
    context.fillText(title, x + 20, y + 15);

    context.fillStyle = "rgba(205,223,236,0.8)";
    context.font = "600 10px 'Space Grotesk','Manrope',sans-serif";
    context.fillText(subtitle, x + 20, y + 28);
    context.restore();
  }

  function drawRiverBoat(context, x, y, angle, scale, style, animationTime) {
    const bob = Math.sin(animationTime * 1.2 + x * 0.01) * 1.2;

    context.save();
    context.translate(x, y + bob);
    context.rotate(angle);

    context.globalAlpha = 0.18;
    context.fillStyle = "rgba(220,240,252,0.4)";
    context.beginPath();
    context.ellipse(2, 12 * scale, 22 * scale, 5 * scale, 0, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 1;
    context.strokeStyle = "rgba(230,246,255,0.28)";
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(-32 * scale, 0);
    context.quadraticCurveTo(-42 * scale, -2 * scale, -52 * scale, -8 * scale);
    context.moveTo(-24 * scale, 4 * scale);
    context.quadraticCurveTo(-34 * scale, 6 * scale, -46 * scale, 0);
    context.stroke();

    context.fillStyle = style.hull;
    context.strokeStyle = style.hullStroke;
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(-20 * scale, 6 * scale);
    context.lineTo(-11 * scale, -4 * scale);
    context.lineTo(17 * scale, -4 * scale);
    context.lineTo(24 * scale, 5 * scale);
    context.quadraticCurveTo(3 * scale, 11 * scale, -20 * scale, 6 * scale);
    context.closePath();
    context.fill();
    context.stroke();

    context.fillStyle = "rgba(238,214,162,0.95)";
    context.fillRect(-11 * scale, -6 * scale, 13 * scale, 5 * scale);

    context.strokeStyle = "rgba(83,55,37,0.95)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-2 * scale, -4 * scale);
    context.lineTo(-2 * scale, -28 * scale);
    context.stroke();

    context.fillStyle = style.sail;
    context.strokeStyle = "rgba(153,112,74,0.9)";
    context.lineWidth = 1.1;
    context.beginPath();
    context.moveTo(-2 * scale, -26 * scale);
    context.quadraticCurveTo(15 * scale, -21 * scale, 14 * scale, -6 * scale);
    context.lineTo(-2 * scale, -10 * scale);
    context.closePath();
    context.fill();
    context.stroke();

    context.fillStyle = style.flag;
    context.beginPath();
    context.moveTo(-2 * scale, -28 * scale);
    context.lineTo(8 * scale, -25 * scale);
    context.lineTo(-2 * scale, -21 * scale);
    context.closePath();
    context.fill();

    context.restore();
  }

  function drawRiverTraffic(context, animationTime) {
    const boats = [
      { offset: 0.14, speed: 0.011, scale: 0.96, style: { hull: "#6f4328", hullStroke: "#b88959", sail: "rgba(242,231,203,0.94)", flag: "#d8a352" } },
      { offset: 0.43, speed: 0.009, scale: 1.08, style: { hull: "#7f4b2b", hullStroke: "#c49a67", sail: "rgba(248,237,208,0.95)", flag: "#d1714a" } },
      { offset: 0.73, speed: 0.012, scale: 0.9, style: { hull: "#654025", hullStroke: "#b78854", sail: "rgba(239,226,195,0.92)", flag: "#e0ba67" } }
    ];

    boats.forEach((boat, index) => {
      const motion = state.reducedMotion ? boat.offset : (boat.offset + animationTime * boat.speed) % 1;
      const riverT = 0.08 + motion * 0.82;
      const sample = sampleSmoothCurve(RIVER_POINTS, riverT);
      drawRiverBoat(context, sample.x, sample.y, sample.angle, boat.scale, boat.style, animationTime + index * 0.5);
    });
  }

  function drawKaarsild(context, animationTime) {
    const anchor = sampleSmoothCurve(RIVER_POINTS, KAARSILD_T);
    const angle = anchor.angle + Math.PI / 2;
    const shimmer = state.reducedMotion ? 0.78 : 0.78 + Math.sin(animationTime * 1.15) * 0.05;
    const deckLength = 126;
    const deckWidth = 13;
    const archHalfSpan = 54;
    const archOffset = -42;
    const anchorBlockWidth = 14;
    const anchorBlockHeight = 24;
    const hangerTs = [0.12, 0.24, 0.36, 0.5, 0.64, 0.76, 0.88];

    context.save();
    context.translate(anchor.x, anchor.y);
    context.rotate(angle);

    context.globalAlpha = 0.16;
    context.fillStyle = "rgba(11,24,41,0.42)";
    context.beginPath();
    context.ellipse(0, 10, 60, 11, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(6,14,24,0.18)";
    context.beginPath();
    context.ellipse(0, 18, 34, 6, 0, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 1;
    const abutmentFill = context.createLinearGradient(0, -anchorBlockHeight * 0.5, 0, anchorBlockHeight * 0.5);
    abutmentFill.addColorStop(0, "rgba(182,194,202,0.96)");
    abutmentFill.addColorStop(1, "rgba(116,131,144,0.96)");
    context.fillStyle = abutmentFill;
    context.strokeStyle = "rgba(235,244,248,0.28)";
    context.lineWidth = 1.1;
    drawRoundedRect(context, -deckLength * 0.5 - anchorBlockWidth + 2, -anchorBlockHeight * 0.5, anchorBlockWidth, anchorBlockHeight, 4);
    context.fill();
    context.stroke();
    drawRoundedRect(context, deckLength * 0.5 - 2, -anchorBlockHeight * 0.5, anchorBlockWidth, anchorBlockHeight, 4);
    context.fill();
    context.stroke();

    const archShadowY = archOffset + 5;
    context.strokeStyle = "rgba(7,16,26,0.38)";
    context.lineWidth = 10;
    context.beginPath();
    context.moveTo(-archHalfSpan, -3);
    context.quadraticCurveTo(0, archShadowY, archHalfSpan, -3);
    context.stroke();

    context.strokeStyle = "rgba(186,225,244,0.24)";
    context.lineWidth = 22;
    context.beginPath();
    context.moveTo(-archHalfSpan, -3);
    context.quadraticCurveTo(0, archOffset, archHalfSpan, -2.5);
    context.stroke();

    context.shadowColor = "rgba(6,14,22,0.56)";
    context.shadowBlur = 12;
    context.shadowOffsetY = 4;
    context.strokeStyle = "rgba(10,20,30,0.34)";
    context.lineWidth = 10;
    context.beginPath();
    context.moveTo(-archHalfSpan + 1, -1.5);
    context.quadraticCurveTo(0, archOffset + 7, archHalfSpan - 1, -1.5);
    context.stroke();
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;

    const deckShadow = context.createLinearGradient(0, -deckWidth * 0.5, 0, deckWidth * 0.75);
    deckShadow.addColorStop(0, "rgba(92,110,124,0.95)");
    deckShadow.addColorStop(1, "rgba(58,72,84,0.98)");
    context.fillStyle = deckShadow;
    drawRoundedRect(context, -deckLength * 0.5, -deckWidth * 0.5 + 2, deckLength, deckWidth, 7);
    context.fill();

    const deckSurface = context.createLinearGradient(0, -deckWidth * 0.5, 0, deckWidth * 0.5);
    deckSurface.addColorStop(0, "rgba(247,250,252,0.98)");
    deckSurface.addColorStop(0.52, "rgba(222,230,236,0.98)");
    deckSurface.addColorStop(1, "rgba(198,208,216,0.98)");
    context.fillStyle = deckSurface;
    drawRoundedRect(context, -deckLength * 0.5 + 2, -deckWidth * 0.5 - 1, deckLength - 4, deckWidth - 2, 7);
    context.fill();

    context.shadowColor = "rgba(4,10,18,0.44)";
    context.shadowBlur = 14;
    context.shadowOffsetY = 7;
    context.fillStyle = "rgba(34,48,60,0.78)";
    drawRoundedRect(context, -deckLength * 0.5 + 6, -deckWidth * 0.02, deckLength - 12, deckWidth * 0.34, 5);
    context.fill();
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;

    context.strokeStyle = "rgba(248,252,255,0.72)";
    context.lineWidth = 1.1;
    drawRoundedRect(context, -deckLength * 0.5 + 2, -deckWidth * 0.5 - 1, deckLength - 4, deckWidth - 2, 7);
    context.stroke();

    context.strokeStyle = `rgba(238,247,252,${0.42 + shimmer * 0.18})`;
    context.lineWidth = 1.1;
    context.beginPath();
    context.moveTo(-deckLength * 0.46, -deckWidth * 0.34);
    context.lineTo(deckLength * 0.46, -deckWidth * 0.34);
    context.moveTo(-deckLength * 0.46, deckWidth * 0.18);
    context.lineTo(deckLength * 0.46, deckWidth * 0.18);
    context.stroke();

    context.strokeStyle = "rgba(214,230,240,0.58)";
    context.lineWidth = 0.9;
    for (let i = -5; i <= 5; i += 1) {
      const x = i * 10.2;
      context.beginPath();
      context.moveTo(x, -deckWidth * 0.34);
      context.lineTo(x, deckWidth * 0.18);
      context.stroke();
    }

    context.shadowColor = "rgba(214,240,255,0.62)";
    context.shadowBlur = 16;
    context.strokeStyle = "rgba(246,251,255,0.99)";
    context.lineWidth = 8.2;
    context.beginPath();
    context.moveTo(-archHalfSpan, -2.5);
    context.quadraticCurveTo(0, archOffset, archHalfSpan, -2.5);
    context.stroke();

    context.strokeStyle = "rgba(168,214,236,0.98)";
    context.lineWidth = 2.6;
    context.beginPath();
    context.moveTo(-archHalfSpan, -2.5);
    context.quadraticCurveTo(0, archOffset + 1.2, archHalfSpan, -2.5);
    context.stroke();

    context.strokeStyle = "rgba(252,254,255,0.9)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(-archHalfSpan + 1, -3.5);
    context.quadraticCurveTo(0, archOffset - 1.5, archHalfSpan - 1, -3.5);
    context.stroke();

    context.shadowBlur = 0;
    context.strokeStyle = "rgba(224,241,249,0.88)";
    context.lineWidth = 1.7;
    hangerTs.forEach((t) => {
      const archPoint = getQuadraticPoint(-archHalfSpan, -2.5, 0, archOffset, archHalfSpan, -2.5, t);
      const deckX = mix(-archHalfSpan * 0.92, archHalfSpan * 0.92, t);
      context.beginPath();
      context.moveTo(archPoint.x, archPoint.y + 1.6);
      context.lineTo(deckX, -deckWidth * 0.36);
      context.stroke();
    });

    context.strokeStyle = `rgba(198,234,252,${0.66 + shimmer * 0.18})`;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(-archHalfSpan + 6, -5.5);
    context.quadraticCurveTo(0, archOffset - 4.5, archHalfSpan - 6, -5.5);
    context.stroke();

    context.fillStyle = "rgba(245,250,255,0.92)";
    [-42, -22, -2, 18, 38].forEach((x, index) => {
      context.globalAlpha = 0.26 + ((index % 2) * 0.08) + shimmer * 0.14;
      context.beginPath();
      context.arc(x, -deckWidth * 0.08, 1.5, 0, Math.PI * 2);
      context.fill();
    });
    context.globalAlpha = 1;

    context.restore();
  }

  function drawBackdropMesh(context, scenario, animationTime) {
    context.save();

    const ambient = context.createRadialGradient(
      BASE_WIDTH * 0.48,
      BASE_HEIGHT * 0.42,
      120,
      BASE_WIDTH * 0.48,
      BASE_HEIGHT * 0.42,
      BASE_WIDTH * 0.72
    );
    ambient.addColorStop(0, "rgba(22,76,116,0.08)");
    ambient.addColorStop(1, "rgba(8,18,30,0)");
    context.fillStyle = ambient;
    context.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    context.strokeStyle = "rgba(173,214,242,0.016)";
    context.lineWidth = 1;
    for (let x = 26; x < BASE_WIDTH; x += 82) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, BASE_HEIGHT);
      context.stroke();
    }
    for (let y = 22; y < BASE_HEIGHT; y += 72) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(BASE_WIDTH, y);
      context.stroke();
    }

    const seen = new Set();
    scenario.districts.forEach((district) => {
      district.neighbors.forEach((neighborId) => {
        const key = [district.id, neighborId].sort().join(":");
        if (seen.has(key)) return;
        seen.add(key);
        const neighbor = scenario.districtById[neighborId];
        const pulse = 0.015 + district.signalNorm * 0.028;
        context.strokeStyle = `rgba(118,181,224,${pulse})`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(district.center[0], district.center[1]);
        context.lineTo(neighbor.center[0], neighbor.center[1]);
        context.stroke();
      });
    });

    context.strokeStyle = `rgba(110,177,224,${0.04 + Math.sin(animationTime * 0.65) * 0.012})`;
    context.lineWidth = 1.3;
    for (let i = 0; i < 4; i += 1) {
      const y = 76 + i * 126;
      context.beginPath();
      context.moveTo(-30, y + Math.sin(animationTime * 0.7 + i) * 10);
      context.bezierCurveTo(180, y - 36, 410, y + 30, BASE_WIDTH + 40, y - 10);
      context.stroke();
    }

    context.restore();
  }

  function drawRiver(context, animationTime) {
    context.save();
    context.lineJoin = "round";
    context.lineCap = "round";
    context.shadowBlur = 28;
    context.shadowColor = "rgba(8,28,52,0.32)";
    context.lineWidth = 62;
    context.strokeStyle = "rgba(17,58,96,0.24)";
    traceCurve(context, RIVER_POINTS);
    context.stroke();

    context.shadowBlur = 0;
    context.lineWidth = 40;
    context.strokeStyle = "rgba(56,126,180,0.92)";
    traceCurve(context, RIVER_POINTS);
    context.stroke();

    context.lineWidth = 28;
    context.strokeStyle = "rgba(98,182,224,0.88)";
    traceCurve(context, RIVER_POINTS);
    context.stroke();

    context.lineWidth = 12;
    context.strokeStyle = "rgba(176,230,252,0.28)";
    traceCurve(context, RIVER_POINTS);
    context.stroke();

    context.setLineDash([14, 18]);
    context.lineDashOffset = -animationTime * 18;
    context.lineWidth = 2.2;
    context.strokeStyle = `rgba(228,246,255,${0.22 + Math.sin(animationTime * 0.9) * 0.04})`;
    traceCurve(context, RIVER_POINTS);
    context.stroke();

    context.setLineDash([]);
    context.globalAlpha = 0.18;
    for (let i = 1; i < RIVER_POINTS.length - 1; i += 2) {
      const [x, y] = RIVER_POINTS[i];
      context.beginPath();
      context.ellipse(
        x + 8,
        y + 6 + Math.sin(animationTime * 1.1 + i) * 2,
        18,
        5,
        0.2,
        0,
        Math.PI * 2
      );
      context.fillStyle = "rgba(238,250,255,0.45)";
      context.fill();
    }

    context.globalAlpha = 1;
    drawRiverTraffic(context, animationTime);
    context.restore();
  }

  function drawDistrictFocus(context, scenario, animationTime) {
    const baseline = 1 / scenario.districts.length;
    context.save();
    scenario.districts.forEach((district, index) => {
      const focus = clamp((district.patrolShare - baseline) / 0.24, 0, 1);
      const watchRate = district.watchCount / Math.max(district.population, 1);
      const intensity = Math.max(focus, district.signalNorm * 0.52, watchRate * 1.2);
      if (intensity < 0.12) return;

      const outerRadius = 26 + intensity * 42 + Math.sin(animationTime * 1.8 + index) * 2.5;
      const innerRadius = 10 + intensity * 18;

      context.strokeStyle = `rgba(92,206,255,${0.16 + focus * 0.32})`;
      context.lineWidth = 1.45;
      context.setLineDash([4, 9]);
      context.beginPath();
      context.arc(district.center[0], district.center[1], outerRadius, 0, Math.PI * 2);
      context.stroke();

      context.setLineDash([]);
      context.strokeStyle = district.supportIndex > 0.24
        ? `rgba(92,236,182,${0.24 + district.supportIndex * 0.22})`
        : `rgba(255,169,104,${0.2 + district.signalNorm * 0.22})`;
      context.lineWidth = 1.8;
      context.beginPath();
      context.arc(district.center[0], district.center[1], innerRadius, 0, Math.PI * 2);
      context.stroke();

      context.fillStyle = `rgba(230,244,255,${0.06 + intensity * 0.14})`;
      context.beginPath();
      context.arc(district.center[0], district.center[1], 5 + intensity * 2, 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
  }

  function drawDistricts(context, scenario, animationTime) {
    const topDistrictId = scenario.metrics?.topDistrict?.id || "";
    scenario.districts.forEach((district, districtIndex) => {
      context.save();
      const fill = colorFromProperty(district.propertyValue);
      const path = new Path2D(district.polygonPath);
      const isTopDistrict = district.id === topDistrictId;

      context.fillStyle = fill;
      context.fill(path);

      context.save();
      context.clip(path);

      const gloss = context.createLinearGradient(0, district.center[1] - 120, 0, district.center[1] + 120);
      gloss.addColorStop(0, "rgba(255,255,255,0.08)");
      gloss.addColorStop(0.35, "rgba(255,255,255,0.02)");
      gloss.addColorStop(1, "rgba(7,15,24,0.22)");
      context.fillStyle = gloss;
      context.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

      const glow = context.createRadialGradient(
        district.center[0],
        district.center[1],
        24,
        district.center[0],
        district.center[1],
        180
      );
      glow.addColorStop(0, `rgba(${district.supportIndex > 0.32 ? "92,236,182" : "255,108,108"}, ${0.18 + district.signalNorm * 0.36})`);
      glow.addColorStop(1, "rgba(255,108,108,0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

      context.strokeStyle = `rgba(255,255,255,${0.018 + district.signalNorm * 0.028})`;
      context.lineWidth = 1;
      for (let offset = -BASE_HEIGHT; offset < BASE_WIDTH + BASE_HEIGHT; offset += 18) {
        const shift = (districtIndex * 11 + animationTime * 12) % 18;
        context.beginPath();
        context.moveTo(offset + shift, 0);
        context.lineTo(offset + BASE_HEIGHT * 0.74 + shift, BASE_HEIGHT);
        context.stroke();
      }

      context.restore();

      context.strokeStyle = isTopDistrict ? "rgba(255,224,154,0.94)" : "rgba(222,236,247,0.46)";
      context.lineWidth = isTopDistrict ? 3 : 2;
      context.stroke(path);

      if (district.signalNorm > 0.28 || district.supportIndex > 0.22) {
        context.strokeStyle = district.supportIndex > 0.22
          ? `rgba(92,236,182,${0.36 + district.supportIndex * 0.2})`
          : `rgba(255,154,110,${0.3 + district.signalNorm * 0.2})`;
        context.lineWidth = 1.4;
        context.stroke(path);
      }

      context.restore();
    });
  }

  function drawDistrictLabels(context, scenario) {
    const topDistrictId = scenario.metrics?.topDistrict?.id || "";
    scenario.districts.forEach((district) => {
      drawDistrictLabelChip(context, district, district.id === topDistrictId);
    });
  }

  function drawEdges(context, scenario, agentPositions, animationTime) {
    const highlightCutoff = scenario.week - 2;
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";

    scenario.renderEdges.forEach((edge) => {
      const a = scenario.agents[edge.aId];
      const b = scenario.agents[edge.bId];
      const from = agentPositions[edge.aId];
      const to = agentPositions[edge.bId];
      const recentlyTouched = a.lastDetectedWeek >= highlightCutoff || b.lastDetectedWeek >= highlightCutoff;
      const watchy = a.riskScore >= WATCH_THRESHOLD || b.riskScore >= WATCH_THRESHOLD;
      const scoreActive = Math.abs(a.scoreTrend) > 0.12 || Math.abs(b.scoreTrend) > 0.12 || a.scoreFlash > 0.1 || b.scoreFlash > 0.1;
      if (!recentlyTouched && !watchy && !scoreActive && edge.visibleBias > 0.2) return;

      const control = getQuadraticControlPoint(from.x, from.y, to.x, to.y, edge.curveBias);

      if (recentlyTouched) {
        const gradient = context.createLinearGradient(from.x, from.y, to.x, to.y);
        gradient.addColorStop(0, "rgba(255,214,135,0.14)");
        gradient.addColorStop(0.45, "rgba(255,126,110,0.56)");
        gradient.addColorStop(1, "rgba(255,236,184,0.18)");
        context.strokeStyle = gradient;
        context.lineWidth = 2.1;
      } else if (scoreActive) {
        const trend = (a.scoreTrend + b.scoreTrend) * 0.5;
        const positive = trend >= 0;
        const gradient = context.createLinearGradient(from.x, from.y, to.x, to.y);
        gradient.addColorStop(0, positive ? "rgba(255,206,120,0.12)" : "rgba(124,245,198,0.12)");
        gradient.addColorStop(0.5, positive ? "rgba(255,174,84,0.44)" : "rgba(92,236,182,0.42)");
        gradient.addColorStop(1, positive ? "rgba(255,232,190,0.14)" : "rgba(215,255,242,0.12)");
        context.strokeStyle = gradient;
        context.lineWidth = 1.75;
      } else if (watchy) {
        context.strokeStyle = edge.sameDistrict
          ? "rgba(255,204,98,0.24)"
          : "rgba(168,226,255,0.18)";
        context.lineWidth = 1.2;
      } else {
        context.strokeStyle = edge.sameDistrict
          ? "rgba(154,204,236,0.09)"
          : "rgba(126,176,208,0.07)";
        context.lineWidth = 0.95;
      }

      context.beginPath();
      context.moveTo(from.x, from.y);
      context.quadraticCurveTo(control.x, control.y, to.x, to.y);
      context.stroke();

      if (recentlyTouched || watchy || scoreActive) {
        const trend = (a.scoreTrend + b.scoreTrend) * 0.5;
        const positive = trend >= 0;
        const travel = (animationTime * (recentlyTouched ? 0.7 : scoreActive ? 0.54 : 0.38) + edge.particleOffset) % 1;
        const point = getQuadraticPoint(from.x, from.y, control.x, control.y, to.x, to.y, travel);
        context.shadowBlur = recentlyTouched ? 10 : scoreActive ? 8 : 6;
        context.shadowColor = recentlyTouched
          ? "rgba(255,160,126,0.68)"
          : scoreActive
            ? positive
              ? "rgba(255,189,98,0.64)"
              : "rgba(92,236,182,0.6)"
            : "rgba(168,226,255,0.56)";
        context.fillStyle = recentlyTouched
          ? "rgba(255,228,172,0.96)"
          : scoreActive
            ? positive
              ? "rgba(255,214,132,0.94)"
              : "rgba(176,255,224,0.92)"
            : "rgba(214,243,255,0.88)";
        context.beginPath();
        context.arc(point.x, point.y, recentlyTouched ? 2.4 : scoreActive ? 1.95 : 1.7, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
      }
    });
    context.restore();
  }

  function drawInteractions(context, scenario) {
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.globalCompositeOperation = "lighter";

    for (let i = scenario.interactions.length - 1; i >= 0; i -= 1) {
      const interaction = scenario.interactions[i];
      interaction.progress += interaction.speed;
      interaction.alpha -= interaction.tone === "support" ? 0.006 : 0.008;
      if (interaction.progress >= 1.02 || interaction.alpha <= 0.04) {
        scenario.interactions.splice(i, 1);
        continue;
      }

      const rgb = toneRgb(interaction.tone);
      const control = getQuadraticControlPoint(
        interaction.fromX,
        interaction.fromY,
        interaction.toX,
        interaction.toY,
        interaction.liftBias
      );
      const head = getQuadraticPoint(
        interaction.fromX,
        interaction.fromY,
        control.x,
        control.y,
        interaction.toX,
        interaction.toY,
        clamp(interaction.progress, 0, 1)
      );

      context.strokeStyle = `rgba(${rgb},${interaction.alpha * 0.38})`;
      context.lineWidth = interaction.tone === "support" ? 1.8 : 2.2;
      context.beginPath();
      context.moveTo(interaction.fromX, interaction.fromY);
      context.quadraticCurveTo(control.x, control.y, interaction.toX, interaction.toY);
      context.stroke();

      context.shadowBlur = interaction.tone === "support" ? 12 : 14;
      context.shadowColor = `rgba(${rgb},${interaction.alpha * 0.72})`;
      context.fillStyle = `rgba(${rgb},${interaction.alpha})`;
      context.beginPath();
      context.arc(head.x, head.y, interaction.tone === "support" ? 2.9 : 3.2, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;

      context.fillStyle = `rgba(255,248,240,${interaction.alpha * 0.68})`;
      context.beginPath();
      context.arc(head.x, head.y, interaction.tone === "support" ? 1.1 : 1.25, 0, Math.PI * 2);
      context.fill();

      if (interaction.progress > 0.8) {
        const arrival = 1 - interaction.progress;
        context.strokeStyle = `rgba(${rgb},${interaction.alpha * 0.68})`;
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(interaction.toX, interaction.toY, 4 + (1 - arrival) * 7, 0, Math.PI * 2);
        context.stroke();
      }
    }

    context.restore();
  }

  function drawAgents(context, scenario, agentPositions, animationTime) {
    context.save();
    scenario.agents.forEach((agent, index) => {
      agent.scoreFlash *= 0.955;
      agent.scoreTrend *= 0.965;
      const pos = agentPositions[index];
      const pulse = 0.5 + Math.sin(animationTime * 2.2 + agent.pulse) * 0.5;
      const recentlyDetected = scenario.week - agent.lastDetectedWeek <= 2;
      const underWatch = agent.riskScore >= WATCH_THRESHOLD || agent.detectedTotal > 0;
      const supported = agent.supportBuffer > 0.22;
      const scoreLevel = clamp(agent.riskScore / 24, 0, 1);

      if (recentlyDetected || supported || underWatch || agent.scoreFlash > 0.06) {
        const haloRgb = recentlyDetected
          ? "255,126,110"
          : supported || agent.scoreTrend < -0.08
            ? "92,236,182"
            : "255,204,98";
        context.fillStyle = `rgba(${haloRgb},${0.035 + pulse * 0.04 + agent.scoreFlash * 0.05})`;
        context.beginPath();
        context.arc(pos.x, pos.y, 4.2 + pulse * 0.9 + agent.scoreFlash * 1.4, 0, Math.PI * 2);
        context.fill();
      }

      let coreColor = "rgba(214,240,255,0.78)";
      let radius = 2.05;
      if (agent.priorOffense || recentlyDetected) {
        coreColor = `rgba(255,108,108,${agent.priorOffense && !recentlyDetected ? 0.94 : 0.99})`;
        radius = 3.3;
      } else if (supported) {
        coreColor = `rgba(92,236,182,${0.88 + pulse * 0.08})`;
        radius = 2.95;
      } else if (underWatch) {
        coreColor = `rgba(255,204,98,${0.84 + pulse * 0.12})`;
        radius = 2.95;
      }

      context.shadowBlur = agent.priorOffense || recentlyDetected ? 12 : supported ? 9 : underWatch ? 7 : 0;
      context.shadowColor = agent.priorOffense || recentlyDetected
        ? "rgba(255,108,108,0.64)"
        : supported
          ? "rgba(92,236,182,0.52)"
          : underWatch
            ? "rgba(255,204,98,0.48)"
            : "rgba(214,240,255,0)";
      context.fillStyle = coreColor;
      context.beginPath();
      context.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;

      if (scoreLevel > 0.14 || supported || agent.scoreFlash > 0.06) {
        const arcRgb = supported || agent.scoreTrend < -0.08
          ? "92,236,182"
          : recentlyDetected
            ? "255,126,110"
            : "255,204,98";
        const startAngle = -Math.PI * 0.78;
        const endAngle = startAngle + scoreLevel * Math.PI * 1.62 + agent.scoreFlash * 0.12;
        const arcRadius = radius + 2.4;

        context.strokeStyle = "rgba(214,233,244,0.12)";
        context.lineWidth = 1.2;
        context.beginPath();
        context.arc(pos.x, pos.y, arcRadius, -Math.PI * 0.78, Math.PI * 0.78);
        context.stroke();

        context.strokeStyle = `rgba(${arcRgb},${0.48 + scoreLevel * 0.34 + agent.scoreFlash * 0.18})`;
        context.lineWidth = recentlyDetected ? 1.8 : 1.55;
        context.beginPath();
        context.arc(pos.x, pos.y, arcRadius, startAngle, endAngle);
        context.stroke();

        const tipX = pos.x + Math.cos(endAngle) * arcRadius;
        const tipY = pos.y + Math.sin(endAngle) * arcRadius;
        context.fillStyle = `rgba(${arcRgb},${0.74 + agent.scoreFlash * 0.18})`;
        context.beginPath();
        context.arc(tipX, tipY, 1.15 + agent.scoreFlash * 0.55, 0, Math.PI * 2);
        context.fill();
      }

      if (agent.priorOffense || recentlyDetected) {
        context.fillStyle = "rgba(255,247,240,0.9)";
        context.beginPath();
        context.arc(pos.x, pos.y, 1.12, 0, Math.PI * 2);
        context.fill();
      } else if (supported || underWatch || scoreLevel > 0.14) {
        context.fillStyle = "rgba(255,252,244,0.74)";
        context.beginPath();
        context.arc(pos.x, pos.y, 0.92, 0, Math.PI * 2);
        context.fill();
      }
    });
    context.restore();
  }

  function drawPatrolUnit(context, x, y, scale, focus, heading, animationTime) {
    const flash = state.reducedMotion ? 0.84 : 0.58 + Math.sin(animationTime * 8.2 + x * 0.03 + y * 0.02) * 0.42;
    const blueFlash = clamp(0.38 + flash * 0.58, 0.22, 1);
    const redFlash = clamp(0.38 + (1 - flash) * 0.58, 0.22, 1);

    context.save();
    context.translate(x, y);
    context.rotate(heading);
    context.scale(scale, scale);

    context.fillStyle = `rgba(6,16,28,${0.22 + focus * 0.26})`;
    context.beginPath();
    context.ellipse(2.4, 10.6, 25.2, 4.8, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(34,38,46,0.96)";
    context.beginPath();
    context.ellipse(-10.5, 8.8, 4.6, 4.6, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(12.5, 8.8, 4.6, 4.6, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(72,82,92,0.9)";
    context.beginPath();
    context.moveTo(-19.2, 4.6);
    context.lineTo(17.8, 4.6);
    context.quadraticCurveTo(20.8, 4.9, 20.8, 7.2);
    context.lineTo(-19.2, 7.2);
    context.closePath();
    context.fill();

    const bodyGradient = context.createLinearGradient(0, -7.2, 0, 8.2);
    bodyGradient.addColorStop(0, "rgba(253,254,255,0.99)");
    bodyGradient.addColorStop(0.44, "rgba(242,247,251,0.99)");
    bodyGradient.addColorStop(1, "rgba(201,213,221,0.98)");
    context.fillStyle = bodyGradient;
    context.beginPath();
    context.moveTo(-21.6, 3.2);
    context.quadraticCurveTo(-20.4, 0.2, -16.5, 0.2);
    context.lineTo(-13.4, -2.3);
    context.quadraticCurveTo(-10.2, -6.2, -4.4, -6.2);
    context.lineTo(5.9, -6.2);
    context.quadraticCurveTo(10.4, -6.2, 13.2, -2.9);
    context.lineTo(16.3, -0.4);
    context.quadraticCurveTo(21.2, 0.1, 23.2, 3.4);
    context.lineTo(23.2, 5.4);
    context.quadraticCurveTo(22.3, 7.9, 18.8, 7.9);
    context.lineTo(-18.4, 7.9);
    context.quadraticCurveTo(-21.3, 7.5, -21.8, 5.5);
    context.closePath();
    context.fill();

    context.strokeStyle = "rgba(214,228,238,0.96)";
    context.lineWidth = 1;
    context.stroke();

    context.fillStyle = "rgba(32,82,170,0.98)";
    context.beginPath();
    context.moveTo(-19.4, 2.9);
    context.lineTo(18.4, 2.9);
    context.quadraticCurveTo(20.8, 3.2, 20.8, 5.2);
    context.lineTo(20.8, 5.8);
    context.quadraticCurveTo(20, 7.3, 17.8, 7.3);
    context.lineTo(-18.6, 7.3);
    context.quadraticCurveTo(-20.5, 7.2, -20.9, 5.8);
    context.lineTo(-20.9, 4.9);
    context.quadraticCurveTo(-20.6, 3.2, -19.4, 2.9);
    context.closePath();
    context.fill();

    context.fillStyle = "rgba(240,214,64,0.98)";
    drawRoundedRect(context, -4.4, 2.9, 14.4, 4.4, 1.4);
    context.fill();
    context.strokeStyle = "rgba(248,239,158,0.7)";
    context.lineWidth = 0.62;
    context.stroke();

    const glassGradient = context.createLinearGradient(0, -5.6, 0, 2.2);
    glassGradient.addColorStop(0, "rgba(14,28,42,0.98)");
    glassGradient.addColorStop(1, "rgba(35,58,78,0.96)");
    context.fillStyle = glassGradient;
    context.beginPath();
    context.moveTo(-12.1, 1.2);
    context.lineTo(-9.3, -2.4);
    context.quadraticCurveTo(-7.5, -4.8, -4.1, -4.8);
    context.lineTo(5.3, -4.8);
    context.quadraticCurveTo(8.8, -4.8, 10.8, -2.3);
    context.lineTo(13.1, 1.2);
    context.closePath();
    context.fill();

    context.fillStyle = "rgba(182,224,255,0.52)";
    context.beginPath();
    context.moveTo(-8.5, 0.4);
    context.lineTo(-6.7, -2.1);
    context.lineTo(-2.1, -2.1);
    context.lineTo(-0.4, 0.4);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(1.2, 0.4);
    context.lineTo(2.7, -2.1);
    context.lineTo(8.3, -2.1);
    context.lineTo(10.2, 0.4);
    context.closePath();
    context.fill();

    context.strokeStyle = "rgba(232,244,252,0.56)";
    context.lineWidth = 0.7;
    context.beginPath();
    context.moveTo(-0.6, -4.7);
    context.lineTo(-0.6, 1.1);
    context.stroke();

    context.fillStyle = "rgba(244,248,252,0.74)";
    drawRoundedRect(context, -11.6, 0.7, 4.3, 1.4, 0.5);
    context.fill();
    drawRoundedRect(context, 10.2, 0.8, 3.1, 1.3, 0.5);
    context.fill();

    context.fillStyle = "rgba(28,61,118,0.95)";
    context.font = "700 3.9px 'Space Grotesk','Manrope',sans-serif";
    context.textAlign = "center";
    context.fillText("POLITSEI", 2.8, 5.85);

    context.fillStyle = "rgba(30,34,41,0.98)";
    [-10.6, 12.6].forEach((wheelX) => {
      context.beginPath();
      context.arc(wheelX, 7.7, 3.7, 0, Math.PI * 2);
      context.fill();
    });

    context.fillStyle = "rgba(110,122,132,0.98)";
    [-10.6, 12.6].forEach((wheelX) => {
      context.beginPath();
      context.arc(wheelX, 7.7, 1.75, 0, Math.PI * 2);
      context.fill();
    });

    context.fillStyle = `rgba(100,214,255,${0.22 + blueFlash * 0.32})`;
    context.beginPath();
    context.ellipse(3.8, -6.4, 7.1, 2.8, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = `rgba(255,116,116,${0.2 + redFlash * 0.3})`;
    context.beginPath();
    context.ellipse(-3.8, -6.4, 7.1, 2.8, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(228,236,243,0.98)";
    drawRoundedRect(context, -7.2, -7.3, 14.4, 2.9, 1.2);
    context.fill();

    context.fillStyle = `rgba(255,82,82,${0.52 + redFlash * 0.48})`;
    drawRoundedRect(context, -6.3, -6.95, 5.2, 2, 0.8);
    context.fill();

    context.fillStyle = `rgba(86,214,255,${0.52 + blueFlash * 0.48})`;
    drawRoundedRect(context, 1, -6.95, 5.2, 2, 0.8);
    context.fill();

    context.fillStyle = "rgba(255,249,238,0.95)";
    drawRoundedRect(context, 20.2, 1.7, 2, 1.8, 0.7);
    context.fill();
    drawRoundedRect(context, 20.2, 4.1, 2, 1.8, 0.7);
    context.fill();

    context.fillStyle = "rgba(255,122,96,0.9)";
    drawRoundedRect(context, -21.7, 2.1, 1.8, 1.7, 0.7);
    context.fill();
    drawRoundedRect(context, -21.7, 4.4, 1.8, 1.7, 0.7);
    context.fill();

    context.strokeStyle = "rgba(255,255,255,0.3)";
    context.lineWidth = 0.75;
    context.beginPath();
    context.moveTo(-16.2, 0.6);
    context.quadraticCurveTo(-2.2, -2.8, 12.8, 0.5);
    context.stroke();

    context.restore();
  }

  function drawPatrols(context, scenario, animationTime) {
    context.save();
    scenario.patrolCars.forEach((car) => {
      const district = scenario.districtById[car.assignedDistrictId] || scenario.districtById[car.currentDistrictId];
      if (!district) return;
      const focus = district.signalNorm;

      if (car.state === "transfer") {
        context.strokeStyle = `rgba(92,206,255,${0.14 + focus * 0.24})`;
        context.lineWidth = 1.1;
        context.setLineDash([5, 7]);
        context.beginPath();
        context.moveTo(car.x, car.y);
        context.lineTo(district.center[0], district.center[1]);
        context.stroke();
        context.setLineDash([]);
      }

      drawPatrolUnit(context, car.x, car.y, 1.12 + focus * 0.12, focus, car.heading, animationTime);
    });
    context.restore();
  }

  function drawPulses(context, scenario) {
    context.save();
    context.globalCompositeOperation = "lighter";
    for (let i = scenario.pulses.length - 1; i >= 0; i -= 1) {
      const pulse = scenario.pulses[i];
      pulse.radius += pulse.tone === "support" ? 0.55 : 0.7;
      pulse.alpha -= pulse.tone === "support" ? 0.018 : 0.02;
      if (pulse.alpha <= 0) {
        scenario.pulses.splice(i, 1);
        continue;
      }
      const rgb = toneRgb(pulse.tone);
      context.strokeStyle = `rgba(${rgb},${Math.min(1, pulse.alpha * 0.85)})`;
      context.lineWidth = pulse.tone === "support" ? 1.5 : 1.7;
      context.beginPath();
      context.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
      context.stroke();

      context.fillStyle = `rgba(${rgb},${pulse.alpha * 0.08})`;
      context.beginPath();
      context.arc(pulse.x, pulse.y, pulse.radius * 0.5, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function render() {
    if (!state.scenario) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, state.stageSize.width, state.stageSize.height);

    const scaleX = state.stageSize.width / BASE_WIDTH;
    const scaleY = state.stageSize.height / BASE_HEIGHT;
    const animationTime = state.clock / 1000;
    const agentPositions = state.scenario.agents.map((agent) => getAgentRenderPosition(agent, animationTime));

    ctx.save();
    ctx.scale(scaleX, scaleY);

    const sky = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    sky.addColorStop(0, "#071320");
    sky.addColorStop(0.55, "#0a1826");
    sky.addColorStop(1, "#040b14");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    drawBackdropMesh(ctx, state.scenario, animationTime);
    drawDistricts(ctx, state.scenario, animationTime);
    drawRiver(ctx, animationTime);
    drawDistrictFocus(ctx, state.scenario, animationTime);
    drawEdges(ctx, state.scenario, agentPositions, animationTime);
    drawInteractions(ctx, state.scenario);
    drawPatrols(ctx, state.scenario, animationTime);
    drawAgents(ctx, state.scenario, agentPositions, animationTime);
    drawPulses(ctx, state.scenario);
    drawKaarsild(ctx, animationTime);
    drawDistrictLabels(ctx, state.scenario);

    ctx.restore();
  }

  function resizeCanvas() {
    const width = dom.stageWrap.clientWidth || BASE_WIDTH;
    const height = width < 700 ? Math.round(width * 0.78) : Math.round(width * 0.645);
    state.stageSize.width = width;
    state.stageSize.height = height;
    const ratio = window.devicePixelRatio || 1;
    dom.canvas.width = Math.round(width * ratio);
    dom.canvas.height = Math.round(height * ratio);
    dom.canvas.style.height = `${height}px`;
    dom.canvas.style.width = `${width}px`;
    render();
    if (state.embedResizer) state.embedResizer.request();
  }

  function setMode(mode) {
    dom.modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
  }

  function setSpeed(speed) {
    state.speed = speed;
    dom.speedButtons.forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.speed) === speed);
    });
  }

  function resetSimulation(options = {}) {
    const { autoRun = !state.reducedMotion } = options;
    state.scenario = buildScenario(readConfig());
    state.metrics = computeMetrics(state.scenario);
    state.scenario.metrics = state.metrics;
    state.scenario.history = [];
    captureHistory(state.scenario);
    state.running = autoRun;
    state.accumulator = 0;
    updateUI();
    resizeCanvas();
  }

  function handlePlayPause() {
    if (!state.scenario) return;
    if (state.scenario.week >= TOTAL_WEEKS) {
      resetSimulation({ autoRun: true });
      return;
    }
    state.running = !state.running;
    updateRunStateLabel();
    updateButtons();
  }

  function createEmbedResizer(root) {
    if (!root || window.parent === window) {
      return { request() {}, disconnect() {} };
    }

    let raf = 0;
    let lastHeight = 0;
    let resizeObserver = null;
    let handleMessage = null;

    const measure = () => {
      const doc = document.documentElement;
      const body = document.body;
      return Math.ceil(Math.max(
        root.getBoundingClientRect().height,
        doc ? doc.scrollHeight : 0,
        doc ? doc.offsetHeight : 0,
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0
      ));
    };

    const post = () => {
      raf = 0;
      const height = measure();
      if (Math.abs(height - lastHeight) < 1) return;
      lastHeight = height;

      try {
        if (window.frameElement) {
          window.frameElement.style.height = `${height}px`;
          window.frameElement.setAttribute("height", String(height));
        }
      } catch {}

      try {
        window.parent.postMessage({ type: "simfluence-widget:resize", height }, "*");
      } catch {}
    };

    const request = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(post);
    };

    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => request());
      resizeObserver.observe(root);
    }

    handleMessage = (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (
        data.type === "widget:request-height"
        || data.type === "widget:request-resize"
        || data.type === "simfluence-widget:request-height"
        || data.type === "simfluence-widget:request-resize"
      ) {
        request();
      }
    };

    window.addEventListener("load", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });
    window.addEventListener("orientationchange", request, { passive: true });
    window.addEventListener("message", handleMessage);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(request).catch(() => {});
    }

    request();
    setTimeout(request, 60);
    setTimeout(request, 220);
    setTimeout(request, 800);

    return {
      request,
      disconnect() {
        if (resizeObserver) resizeObserver.disconnect();
        if (handleMessage) window.removeEventListener("message", handleMessage);
      }
    };
  }

  function applyEmbedMode() {
    const params = new URLSearchParams(window.location.search);
    state.embedMode = params.get("embed") === "1" || params.get("embedMode") === "1" || window.self !== window.top;
    if (state.embedMode) {
      dom.body.classList.add("embed-mode");
    }
  }

  function attachEvents() {
    dom.playPauseButton.addEventListener("click", handlePlayPause);
    dom.replayButton.addEventListener("click", () => resetSimulation({ autoRun: true }));

    dom.speedButtons.forEach((button) => {
      button.addEventListener("click", () => setSpeed(Number(button.dataset.speed)));
    });

    dom.modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setMode(button.dataset.mode);
        resetSimulation({ autoRun: true });
      });
    });

    [dom.patrolPressure, dom.socialAmplification, dom.stigmaSensitivity].forEach((input) => {
      input.addEventListener("input", updateControlOutputs);
      input.addEventListener("change", () => resetSimulation({ autoRun: true }));
    });

    window.addEventListener("resize", resizeCanvas, { passive: true });
    if ("ResizeObserver" in window) {
      state.resizeObserver = new ResizeObserver(() => resizeCanvas());
      state.resizeObserver.observe(dom.stageWrap);
    }
  }

  function tick(timestamp) {
    if (!state.lastFrame) state.lastFrame = timestamp;
    const delta = Math.min(80, timestamp - state.lastFrame);
    state.lastFrame = timestamp;
    state.clock += delta;

    if (state.running && state.scenario) {
      state.accumulator += delta * state.speed * PLAYBACK_BASE_RATE;
      while (state.accumulator >= WEEK_DURATION_MS && state.scenario.week < TOTAL_WEEKS) {
        simulateWeek(state.scenario);
        state.accumulator -= WEEK_DURATION_MS;
        updateUI();
      }

      if (state.scenario.week >= TOTAL_WEEKS && state.running) {
        state.running = false;
        updateUI();
      }
    }

    if (state.scenario) {
      advancePatrolCars(state.scenario, delta, state.clock / 1000);
    }

    render();
    requestAnimationFrame(tick);
  }

  function init() {
    applyEmbedMode();
    updateControlOutputs();
    attachEvents();
    setSpeed(1);
    resetSimulation({ autoRun: !state.reducedMotion });
    if (state.reducedMotion) {
      updateRunStateLabel();
      updateButtons();
    }
    state.embedResizer = createEmbedResizer(dom.shell);
    requestAnimationFrame(tick);
  }

  init();
})();
