(() => {
  "use strict";

  const CONFIG = {
    seed: 12345,
    sim: {
      minutesTotal: 480,
      minutesPerSecond: 4.8,
      fixedStepMinutes: 0.25,
      defaultSpeed: 1,
      autoReplayDelayMs: 4200,
    },
    world: {
      w: 1000,
      h: 600,
      unitsPerKm: 90,
      roadGrid: { cols: 10, rows: 6, diagonals: true },
      zones: [
        { id: "downtown", name: "Downtown", center: { x: 515, y: 250 }, r: 165, demandWeight: 0.31, color: "#58b7ff" },
        { id: "residential", name: "Residential", center: { x: 250, y: 418 }, r: 182, demandWeight: 0.24, color: "#89d39e" },
        { id: "business", name: "Business", center: { x: 760, y: 412 }, r: 170, demandWeight: 0.18, color: "#f0c56b" },
        { id: "transit", name: "Transit Hub", center: { x: 812, y: 170 }, r: 138, demandWeight: 0.16, color: "#ff8f7b" },
        { id: "campus", name: "Campus", center: { x: 184, y: 176 }, r: 136, demandWeight: 0.11, color: "#8e9dff" },
      ],
      odMatrix: {
        downtown: { residential: 0.34, business: 0.18, transit: 0.22, campus: 0.12, downtown: 0.14 },
        residential: { downtown: 0.42, business: 0.18, transit: 0.14, campus: 0.16, residential: 0.1 },
        business: { downtown: 0.31, residential: 0.28, transit: 0.16, campus: 0.09, business: 0.16 },
        transit: { downtown: 0.35, residential: 0.23, business: 0.18, campus: 0.14, transit: 0.1 },
        campus: { downtown: 0.26, residential: 0.24, business: 0.18, transit: 0.16, campus: 0.16 },
      },
    },
    drivers: {
      count: 10,
      speedKph: 28,
    },
    demand: {
      basePerMin: 0.18,
      peakMultiplier: 1.6,
      peakStartMin: 90,
      peakEndMin: 360,
      maxWaitMin: 18,
      burstChance: 0.04,
      elastic: {
        basePerMin: 0.24,
        activationWaitMaxMin: 4.2,
        activationMaxOpen: 4,
        activationMaxWarm: 1,
        activationMinReadyDrivers: 2,
        lookaheadMin: 10,
      },
    },
    scenarioA: {
      pickupRadius: 40,
      standWaitMin: { min: 7, max: 16 },
      cruiseAfterWaitChance: 0.22,
    },
    scenarioB: {
      dispatchMaxETAmin: 12,
      rebalance: {
        enabled: true,
        intervalMin: 3,
        maxDriversPerInterval: 3,
      },
    },
    market: {
      baseFare: 4.4,
      perKm: 1.05,
      perMin: 0.24,
      idleBurdenPerHour: 12.5,
      streetHailFrictionPerRide: 2.15,
      dispatchSupportPerRide: 0.75,
      dispatchEfficiencyCreditPerRide: 0.95,
      warmRequestPenalty: 1.35,
      driverShare: 0.78,
      targetDailyPay: 160,
      convenienceBaseA: 1.7,
      convenienceBaseB: 4.75,
    },
    visuals: {
      paddingPx: 14,
      gapPx: 16,
      trailSeconds: 10,
      trailSecondsReduced: 4,
      heatmapAlpha: 0.18,
      matchBezierLifespanSec: 1.6,
    },
  };

  const DRIVER_STATE = Object.freeze({
    IDLE: "IDLE_CRUISE",
    ASSIGNED: "ASSIGNED_TO_PICKUP",
    ON_TRIP: "ON_TRIP",
    REBALANCING: "REBALANCING",
    OFFSHIFT: "OFFSHIFT",
  });

  const REQUEST_STATE = Object.freeze({
    WAITING: "WAITING",
    ASSIGNED: "ASSIGNED",
    PICKED_UP: "PICKED_UP",
    COMPLETED: "COMPLETED",
    EXPIRED: "EXPIRED",
  });

  const STATE_COLORS = {
    [DRIVER_STATE.IDLE]: "#7d8b92",
    [DRIVER_STATE.ASSIGNED]: "#f0b24d",
    [DRIVER_STATE.ON_TRIP]: "#2aaf72",
    [DRIVER_STATE.REBALANCING]: "#95aab0",
    [DRIVER_STATE.OFFSHIFT]: "#c7d3d7",
  };

  const qs = (selector) => document.querySelector(selector);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const square = (value) => value * value;
  const mean = (values) => (values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : 0);
  const sampleRange = (rng, min, max) => min + rng() * (max - min);

  const dom = {
    shell: qs(".shell"),
    root: qs("#widgetRoot"),
    heroRunButton: qs("#heroRunButton"),
    heroSpeedSelect: qs("#heroSpeedSelect"),
    heroProgressFill: qs("#heroProgressFill"),
    outcomeText: qs("#outcomeText"),
    clockLabel: qs("#clockLabel"),
    demandWindowLabel: qs("#demandWindowLabel"),
    summaryText: qs("#summaryText"),
    summaryLive: qs("#summaryLive"),
    summaryOverlay: qs("#summaryOverlay"),
    summaryCloseButton: qs("#summaryCloseButton"),
    summaryOverlayTitle: qs("#summaryOverlayTitle"),
    summaryOverlayLead: qs("#summaryOverlayLead"),
    summaryOverlayFoot: qs("#summaryOverlayFoot"),
    overlayRidesA: qs("#overlayRidesA"),
    overlayCostA: qs("#overlayCostA"),
    overlayAvailabilityA: qs("#overlayAvailabilityA"),
    overlayConvenienceA: qs("#overlayConvenienceA"),
    overlayIdleHoursA: qs("#overlayIdleHoursA"),
    overlayIncomeA: qs("#overlayIncomeA"),
    overlayRidesB: qs("#overlayRidesB"),
    overlayCostB: qs("#overlayCostB"),
    overlayAvailabilityB: qs("#overlayAvailabilityB"),
    overlayConvenienceB: qs("#overlayConvenienceB"),
    overlayIdleHoursB: qs("#overlayIdleHoursB"),
    overlayIncomeB: qs("#overlayIncomeB"),
    overlayDeltaRides: qs("#overlayDeltaRides"),
    overlayDeltaCost: qs("#overlayDeltaCost"),
    overlayDeltaAvailability: qs("#overlayDeltaAvailability"),
    overlayDeltaConvenience: qs("#overlayDeltaConvenience"),
    overlayDeltaIdle: qs("#overlayDeltaIdle"),
    overlayDeltaIncome: qs("#overlayDeltaIncome"),
    canvas: qs("#simCanvas"),
    ridesA: qs("#ridesA"),
    ridesB: qs("#ridesB"),
    ridesDelta: qs("#ridesDelta"),
    costA: qs("#costA"),
    costB: qs("#costB"),
    costDelta: qs("#costDelta"),
    availabilityA: qs("#availabilityA"),
    availabilityB: qs("#availabilityB"),
    availabilityDelta: qs("#availabilityDelta"),
    convenienceA: qs("#convenienceA"),
    convenienceB: qs("#convenienceB"),
    convenienceDelta: qs("#convenienceDelta"),
    idleWaitA: qs("#idleWaitA"),
    idleWaitB: qs("#idleWaitB"),
    idleWaitDelta: qs("#idleWaitDelta"),
    targetHoursA: qs("#targetHoursA"),
    targetHoursB: qs("#targetHoursB"),
    targetHoursDelta: qs("#targetHoursDelta"),
    incomeA: qs("#incomeA"),
    incomeB: qs("#incomeB"),
    incomeDelta: qs("#incomeDelta"),
    riderValueText: qs("#riderValueText"),
    driverValueText: qs("#driverValueText"),
  };

  const reduceMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
  const params = new URLSearchParams(window.location.search);
  const isEmbed =
    window.parent !== window ||
    params.get("embed") === "1" ||
    params.get("embedMode") === "1" ||
    window.location.hash === "#embed";

  if (isEmbed) {
    document.documentElement.classList.add("embed-mode");
    document.body.classList.add("embed-mode");
  }

  function createRng(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let result = Math.imul(value ^ (value >>> 15), 1 | value);
      result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function samplePoisson(rng, lambda) {
    if (lambda <= 0) {
      return 0;
    }
    const limit = Math.exp(-lambda);
    let product = 1;
    let count = 0;
    do {
      count += 1;
      product *= rng();
    } while (product > limit);
    return count - 1;
  }

  function pickWeighted(rng, items, getWeight) {
    const total = items.reduce((sum, item) => sum + getWeight(item), 0);
    let cursor = rng() * total;
    for (const item of items) {
      cursor -= getWeight(item);
      if (cursor <= 0) {
        return item;
      }
    }
    return items[items.length - 1];
  }

  function formatMinutes(value) {
    return `${value.toFixed(value < 10 ? 1 : 0)} min`;
  }

  function formatPct(value, digits = 1) {
    return `${(value * 100).toFixed(digits)}%`;
  }

  function formatCurrency(value, digits = 2) {
    return `$${value.toFixed(digits)}`;
  }

  function formatSignedCurrency(value, digits = 2) {
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}$${Math.abs(value).toFixed(digits)}`;
  }

  function formatPoints(value) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)} pts`;
  }

  function formatSignedMinutes(value) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)} min`;
  }

  function formatWorkClock(minute) {
    const totalMinutes = 8 * 60 + Math.round(minute);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }

  function formatWorkdayProgress(minute) {
    return `${(minute / 60).toFixed(1)} of 8 work hours`;
  }

  function formatHours(value, digits = 1) {
    return `${value.toFixed(digits)} h`;
  }

  function formatHoursMinutes(value) {
    const totalMinutes = Math.max(0, Math.round(value * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m`;
  }

  function formatSignedHours(value, digits = 1) {
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}${Math.abs(value).toFixed(digits)} h`;
  }

  function formatSignedHoursMinutes(value) {
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}${formatHoursMinutes(Math.abs(value))}`;
  }

  function formatScore(value) {
    return `${value.toFixed(1)} / 5`;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  function distancePointToSegment(point, a, b) {
    const lengthSquared = square(b.x - a.x) + square(b.y - a.y);
    if (lengthSquared === 0) {
      return dist(point, a);
    }
    const projection = clamp(((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / lengthSquared, 0, 1);
    return dist(point, { x: lerp(a.x, b.x, projection), y: lerp(a.y, b.y, projection) });
  }

  function findClosestNodeId(world, point) {
    let bestNodeId = world.nodes[0].id;
    let bestDistance = Infinity;
    for (const node of world.nodes) {
      const currentDistance = square(node.x - point.x) + square(node.y - point.y);
      if (currentDistance < bestDistance) {
        bestDistance = currentDistance;
        bestNodeId = node.id;
      }
    }
    return bestNodeId;
  }

  function buildWorld() {
    const world = {
      ...CONFIG.world,
      nodes: [],
      edges: [],
      stands: [],
      adjacency: new Map(),
      zones: CONFIG.world.zones.map((zone) => ({ ...zone })),
      pathCache: new Map(),
    };

    const cols = CONFIG.world.roadGrid.cols;
    const rows = CONFIG.world.roadGrid.rows;
    const marginX = 78;
    const marginY = 72;
    const spanX = world.w - marginX * 2;
    const spanY = world.h - marginY * 2;

    let index = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = marginX + (col / (cols - 1)) * spanX;
        const y = marginY + (row / (rows - 1)) * spanY;
        world.nodes.push({ id: index, row, col, x, y });
        world.adjacency.set(index, []);
        index += 1;
      }
    }

    const connect = (fromId, toId) => {
      const from = world.nodes[fromId];
      const to = world.nodes[toId];
      const weight = dist(from, to);
      world.adjacency.get(fromId).push({ id: toId, dist: weight });
      world.adjacency.get(toId).push({ id: fromId, dist: weight });
      if (fromId < toId) {
        world.edges.push({ a: fromId, b: toId });
      }
    };

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const nodeId = row * cols + col;
        if (col < cols - 1) {
          connect(nodeId, nodeId + 1);
        }
        if (row < rows - 1) {
          connect(nodeId, nodeId + cols);
        }
        if (CONFIG.world.roadGrid.diagonals && row < rows - 1 && col < cols - 1 && (row + col) % 2 === 0) {
          connect(nodeId, nodeId + cols + 1);
        }
        if (CONFIG.world.roadGrid.diagonals && row < rows - 1 && col > 0 && (row + col) % 2 === 1) {
          connect(nodeId, nodeId + cols - 1);
        }
      }
    }

    for (const zone of world.zones) {
      zone.nodeIds = world.nodes.filter((node) => dist(node, zone.center) <= zone.r + 26).map((node) => node.id);
      if (!zone.nodeIds.length) {
        zone.nodeIds = [findClosestNodeId(world, zone.center)];
      }
      zone.anchorNodeId = findClosestNodeId(world, zone.center);
    }

    world.stands = world.zones.map((zone, index) => {
      const node = world.nodes[zone.anchorNodeId];
      return {
        id: `stand-${index + 1}`,
        nodeId: node.id,
        zoneId: zone.id,
        x: node.x,
        y: node.y,
      };
    });

    return world;
  }

  function findNearestStand(world, point) {
    let best = world.stands[0];
    let bestDistance = Infinity;
    for (const stand of world.stands) {
      const currentDistance = square(stand.x - point.x) + square(stand.y - point.y);
      if (currentDistance < bestDistance) {
        bestDistance = currentDistance;
        best = stand;
      }
    }
    return best;
  }

  function getPath(world, startId, endId) {
    const key = `${startId}:${endId}`;
    if (world.pathCache.has(key)) {
      return world.pathCache.get(key);
    }

    if (startId === endId) {
      const trivial = { ids: [startId], distance: 0 };
      world.pathCache.set(key, trivial);
      return trivial;
    }

    const size = world.nodes.length;
    const distScore = new Array(size).fill(Infinity);
    const estimate = new Array(size).fill(Infinity);
    const cameFrom = new Array(size).fill(-1);
    const open = new Set([startId]);
    distScore[startId] = 0;
    estimate[startId] = dist(world.nodes[startId], world.nodes[endId]);

    while (open.size) {
      let current = -1;
      let currentScore = Infinity;
      for (const candidate of open) {
        if (estimate[candidate] < currentScore) {
          currentScore = estimate[candidate];
          current = candidate;
        }
      }

      if (current === endId) {
        const ids = [];
        let cursor = current;
        while (cursor !== -1) {
          ids.push(cursor);
          cursor = cameFrom[cursor];
        }
        ids.reverse();
        const result = { ids, distance: distScore[endId] };
        world.pathCache.set(key, result);
        return result;
      }

      open.delete(current);
      for (const neighbor of world.adjacency.get(current)) {
        const tentative = distScore[current] + neighbor.dist;
        if (tentative < distScore[neighbor.id]) {
          cameFrom[neighbor.id] = current;
          distScore[neighbor.id] = tentative;
          estimate[neighbor.id] = tentative + dist(world.nodes[neighbor.id], world.nodes[endId]);
          open.add(neighbor.id);
        }
      }
    }

    const fallback = { ids: [startId, endId], distance: dist(world.nodes[startId], world.nodes[endId]) };
    world.pathCache.set(key, fallback);
    return fallback;
  }

  function getRoutePoints(world, startNodeId, endNodeId) {
    const path = getPath(world, startNodeId, endNodeId);
    return {
      distance: path.distance,
      points: path.ids.slice(1).map((id) => {
        const node = world.nodes[id];
        return { x: node.x, y: node.y, nodeId: id };
      }),
    };
  }

  function chooseDestinationZoneId(originZoneId, rng) {
    const matrix = CONFIG.world.odMatrix[originZoneId];
    const entries = Object.entries(matrix).map(([id, weight]) => ({ id, weight }));
    return pickWeighted(rng, entries, (entry) => entry.weight).id;
  }

  function generateRequestPlan(world, settings, seed, options = {}) {
    const rng = createRng(seed);
    const { basePerMin = CONFIG.demand.basePerMin, idPrefix = "r", counterStart = 1, source = "base" } = options;
    const plan = [];
    let counter = counterStart;
    for (let minute = 0; minute < CONFIG.sim.minutesTotal; minute += CONFIG.sim.fixedStepMinutes) {
      const peak =
        minute >= CONFIG.demand.peakStartMin && minute < CONFIG.demand.peakEndMin ? CONFIG.demand.peakMultiplier : 1;
      const lambda = basePerMin * settings.demandFactor * peak * CONFIG.sim.fixedStepMinutes;
      let count = samplePoisson(rng, lambda);
      if (rng() < CONFIG.demand.burstChance * peak) {
        count += 1;
      }

      for (let index = 0; index < count; index += 1) {
        const originZone = pickWeighted(rng, world.zones, (zone) => zone.demandWeight * (zone.id === "downtown" ? 1.1 : 1));
        const destinationZoneId = chooseDestinationZoneId(originZone.id, rng);
        const destinationZone = world.zones.find((zone) => zone.id === destinationZoneId) || world.zones[0];
        const pickupNodeId = originZone.nodeIds[Math.floor(rng() * originZone.nodeIds.length)];
        let dropoffNodeId = destinationZone.nodeIds[Math.floor(rng() * destinationZone.nodeIds.length)];
        if (dropoffNodeId === pickupNodeId && destinationZone.nodeIds.length > 1) {
          const currentIndex = destinationZone.nodeIds.indexOf(dropoffNodeId);
          dropoffNodeId = destinationZone.nodeIds[(currentIndex + 1) % destinationZone.nodeIds.length];
        }
        const pickupNode = world.nodes[pickupNodeId];
        const dropoffNode = world.nodes[dropoffNodeId];
        const tripRoute = getPath(world, pickupNodeId, dropoffNodeId);

        plan.push({
          id: `${idPrefix}${counter}`,
          numericId: counter,
          source,
          tCreatedMin: minute + rng() * CONFIG.sim.fixedStepMinutes,
          pickupNodeId,
          dropoffNodeId,
          pickup: { x: pickupNode.x, y: pickupNode.y, zoneId: originZone.id },
          dropoff: { x: dropoffNode.x, y: dropoffNode.y, zoneId: destinationZone.id },
          plannedDistance: tripRoute.distance,
        });
        counter += 1;
      }
    }
    plan.sort((a, b) => a.tCreatedMin - b.tCreatedMin);
    return plan;
  }

  function createDriver(world, nodeId, id, rng) {
    const node = world.nodes[nodeId];
    return {
      id: `d${id + 1}`,
      index: id,
      homeNodeId: nodeId,
      nodeId,
      pos: { x: node.x, y: node.y },
      heading: 0,
      state: DRIVER_STATE.IDLE,
      speedFactor: 0.92 + rng() * 0.18,
      route: [],
      routeIndex: 0,
      assignedRequestId: null,
      lastSegment: { a: { x: node.x, y: node.y }, b: { x: node.x, y: node.y } },
      time: {
        idle: 0,
        assigned: 0,
        onTrip: 0,
        rebalancing: 0,
        offshift: 0,
      },
      trail: [{ x: node.x, y: node.y, state: DRIVER_STATE.IDLE, tReal: 0 }],
      rebalanceZoneId: null,
      idlePlan: "stand",
      waitUntilMin: 0,
    };
  }

  function createPanel(world, settings, label, driverStartIds, seed) {
    const rng = createRng(seed);
    const drivers = driverStartIds.map((nodeId, index) => createDriver(world, nodeId, index, rng));
    return {
      label,
      rng,
      settings,
      world,
      currentMin: 0,
      requests: new Map(),
      waitingIds: [],
      completed: [],
      expired: 0,
      beziers: [],
      recentDemand: [],
      drivers,
      metrics: {
        avgWait: 0,
        idlePct: 0,
        utilPct: 0,
        offshiftPct: 0,
        avgRideCost: 0,
        availabilityScore: 0,
        convenienceScore: 0,
        idleHoursPerDriver: 0,
        workHoursPerDriver: 0,
        freeHoursPerDriver: 0,
        hoursToTargetPay: CONFIG.sim.minutesTotal / 60,
        driverTakeHomePerDriver: 0,
        completedTrips: 0,
        waitingNow: 0,
        expired: 0,
        warmRequests: 0,
        totalRequests: 0,
	      },
	      lastRebalanceMin: -Infinity,
	    };
	  }

  const app = {
    reduceMotion: reduceMotionMedia.matches,
    world: buildWorld(),
    settings: {
      speed: CONFIG.sim.defaultSpeed,
      driverCount: CONFIG.drivers.count,
      demandFactor: 1.08,
      rebalanceEnabled: CONFIG.scenarioB.rebalance.enabled,
    },
    simulation: null,
    running: false,
    finished: false,
    replayTimerId: 0,
    currentSimMin: 0,
    realRunSec: 0,
    lastFrameMs: 0,
    accumulatorMin: 0,
    needsRender: true,
    canvas: {
      ctx: dom.canvas.getContext("2d", { alpha: false }),
      width: 0,
      height: 0,
      dpr: 1,
      staticLayer: null,
      staticKey: "",
    },
  };

  function buildSimulation() {
    const seed =
      CONFIG.seed +
      app.settings.driverCount * 37 +
      Math.round(app.settings.demandFactor * 100) * 7 +
      (app.settings.rebalanceEnabled ? 19 : 0);

    const basePlan = generateRequestPlan(app.world, app.settings, seed + 101, {
      idPrefix: "r",
      counterStart: 1,
      source: "base",
    });
    const elasticPlanB = generateRequestPlan(app.world, app.settings, seed + 181, {
      basePerMin: CONFIG.demand.elastic.basePerMin,
      idPrefix: "x",
      counterStart: 10001,
      source: "elastic",
    });
    const startRng = createRng(seed + 303);
    const driverStartIds = Array.from({ length: app.settings.driverCount }, () => {
      return app.world.nodes[Math.floor(startRng() * app.world.nodes.length)].id;
    });

    const panelA = createPanel(app.world, app.settings, "Stand waiting + searching", driverStartIds, seed + 909);
    const panelB = createPanel(app.world, app.settings, "Dispatch on demand", driverStartIds, seed + 909);
    panelA.key = "A";
    panelB.key = "B";

    panelA.drivers.forEach((driver) => sendDriverToStand(panelA, driver, { immediate: true }));
    panelB.drivers.forEach((driver) => sendDriverOffshift(panelB, driver));

    app.simulation = {
      seed,
      basePlan,
      basePlanIndex: 0,
      elasticPlanB,
      elasticPlanIndexB: 0,
      panels: { A: panelA, B: panelB },
    };
  }

  function instantiateRequest(template) {
    return {
      ...template,
      state: REQUEST_STATE.WAITING,
      assignedDriverId: null,
      tAssignedMin: null,
      tPickedUpMin: null,
      tCompletedMin: null,
    };
  }

  function queueCruiseRoute(panel, driver) {
    const world = panel.world;
    const startNodeId = findClosestNodeId(world, driver.pos);
    const currentNode = world.nodes[startNodeId];
    const radius = 220;
    const candidates = world.nodes.filter((node) => node.id !== startNodeId && dist(node, currentNode) <= radius);
    const pool = candidates.length ? candidates : world.nodes.filter((node) => node.id !== startNodeId);
    const targetNode = pool[Math.floor(panel.rng() * pool.length)];
    const route = getRoutePoints(world, startNodeId, targetNode.id);
    driver.route = route.points;
    driver.routeIndex = 0;
    driver.nodeId = startNodeId;
    driver.rebalanceZoneId = null;
    driver.idlePlan = "cruise";
    driver.waitUntilMin = 0;
  }

  function setRouteToNode(panel, driver, targetNodeId) {
    const startNodeId = findClosestNodeId(panel.world, driver.pos);
    const route = getRoutePoints(panel.world, startNodeId, targetNodeId);
    driver.route = route.points;
    driver.routeIndex = 0;
    driver.nodeId = startNodeId;
    return route;
  }

  function placeDriverAtNode(world, driver, nodeId, state = driver.state) {
    const node = world.nodes[nodeId];
    driver.nodeId = nodeId;
    driver.pos.x = node.x;
    driver.pos.y = node.y;
    driver.heading = 0;
    driver.state = state;
    driver.route = [];
    driver.routeIndex = 0;
    driver.lastSegment = {
      a: { x: node.x, y: node.y },
      b: { x: node.x, y: node.y },
    };
  }

  function resetDriverTrail(driver, state = driver.state) {
    driver.trail = [{ x: driver.pos.x, y: driver.pos.y, state, tReal: app.realRunSec }];
  }

  function sendDriverToStand(panel, driver, { immediate = false } = {}) {
    const stand = findNearestStand(panel.world, driver.pos);
    const standWaitMin = sampleRange(panel.rng, CONFIG.scenarioA.standWaitMin.min, CONFIG.scenarioA.standWaitMin.max);
    driver.assignedRequestId = null;
    driver.rebalanceZoneId = null;
    driver.idlePlan = "stand";
    if (immediate) {
      driver.waitUntilMin = panel.currentMin + standWaitMin;
      placeDriverAtNode(panel.world, driver, stand.nodeId, DRIVER_STATE.IDLE);
      resetDriverTrail(driver, DRIVER_STATE.IDLE);
      return;
    }
    driver.state = DRIVER_STATE.IDLE;
    const route = setRouteToNode(panel, driver, stand.nodeId);
    const travelMin = route.distance / ((CONFIG.drivers.speedKph * panel.world.unitsPerKm) / 60 * driver.speedFactor);
    driver.waitUntilMin = panel.currentMin + travelMin + standWaitMin;
  }

  function sendDriverOffshift(panel, driver) {
    driver.assignedRequestId = null;
    driver.rebalanceZoneId = null;
    driver.idlePlan = "offshift";
    driver.waitUntilMin = 0;
    placeDriverAtNode(panel.world, driver, driver.homeNodeId, DRIVER_STATE.OFFSHIFT);
    resetDriverTrail(driver, DRIVER_STATE.OFFSHIFT);
  }

  function getWaitingRequests(panel) {
    return panel.waitingIds
      .map((id) => panel.requests.get(id))
      .filter((request) => request && request.state === REQUEST_STATE.WAITING)
      .sort((a, b) => a.tCreatedMin - b.tCreatedMin);
  }

  function countWarmWaitingRequests(panel, referenceMin = panel.currentMin) {
    return panel.waitingIds
      .map((id) => panel.requests.get(id))
      .filter(
        (request) =>
          request &&
          request.state === REQUEST_STATE.WAITING &&
          referenceMin - request.tCreatedMin > CONFIG.demand.maxWaitMin * 0.5
      ).length;
  }

  function hasActiveDispatchDemand(panel) {
    const hasOpenRequests = panel.waitingIds.some((id) => {
      const request = panel.requests.get(id);
      return request && (request.state === REQUEST_STATE.WAITING || request.state === REQUEST_STATE.ASSIGNED);
    });
    if (hasOpenRequests) {
      return true;
    }

    const hasActiveTrips = panel.drivers.some(
      (driver) =>
        driver.state === DRIVER_STATE.ASSIGNED ||
        driver.state === DRIVER_STATE.ON_TRIP ||
        driver.state === DRIVER_STATE.REBALANCING
    );
    if (hasActiveTrips) {
      return true;
    }

    const hasRecentDemand = panel.recentDemand.some((entry) => panel.currentMin - entry.t <= 8);
    if (hasRecentDemand) {
      return true;
    }

    const nextBaseRequest = app.simulation?.basePlan?.[app.simulation.basePlanIndex];
    const nextElasticRequest = panel.key === "B" ? app.simulation?.elasticPlanB?.[app.simulation.elasticPlanIndexB] : null;
    const lookaheadMin = CONFIG.demand.elastic.lookaheadMin;
    return Boolean(
      (nextBaseRequest && nextBaseRequest.tCreatedMin - app.currentSimMin <= lookaheadMin) ||
        (nextElasticRequest && nextElasticRequest.tCreatedMin - app.currentSimMin <= lookaheadMin)
    );
  }

  function assignBestRequestToDriver(panel, driver) {
    const waiting = getWaitingRequests(panel);
    if (!waiting.length) {
      return false;
    }

    let best = null;
    for (const request of waiting) {
      const startNodeId = findClosestNodeId(panel.world, driver.pos);
      const route = getPath(panel.world, startNodeId, request.pickupNodeId);
      const etaMin = route.distance / ((CONFIG.drivers.speedKph * panel.world.unitsPerKm) / 60 * driver.speedFactor);
      if (!best || etaMin < best.etaMin) {
        best = { request, etaMin };
      }
    }

    if (!best || best.etaMin > CONFIG.scenarioB.dispatchMaxETAmin) {
      return false;
    }

    assignDriverToRequest(panel, driver, best.request);
    return true;
  }

  function assignDriverToRequest(panel, driver, request) {
    request.state = REQUEST_STATE.ASSIGNED;
    request.assignedDriverId = driver.id;
    request.tAssignedMin = panel.currentMin;
    driver.state = DRIVER_STATE.ASSIGNED;
    driver.assignedRequestId = request.id;
    setRouteToNode(panel, driver, request.pickupNodeId);
    panel.beziers.push({
      start: { x: driver.pos.x, y: driver.pos.y },
      end: { x: request.pickup.x, y: request.pickup.y },
      bornAt: app.realRunSec,
    });

    if (!driver.route.length) {
      pickupAssignedRequest(panel, driver, request);
    }
  }

  function pickupAssignedRequest(panel, driver, request) {
    request.state = REQUEST_STATE.PICKED_UP;
    request.tPickedUpMin = panel.currentMin;
    driver.state = DRIVER_STATE.ON_TRIP;
    setRouteToNode(panel, driver, request.dropoffNodeId);
    if (!driver.route.length) {
      completeTrip(panel, driver, request);
    }
  }

  function completeTrip(panel, driver, request) {
    request.state = REQUEST_STATE.COMPLETED;
    request.tCompletedMin = panel.currentMin;
    panel.completed.push(request);
    driver.assignedRequestId = null;

    if (panel.key === "B") {
      driver.state = DRIVER_STATE.IDLE;
      driver.idlePlan = "standby";
      if (!assignBestRequestToDriver(panel, driver) && !hasActiveDispatchDemand(panel)) {
        sendDriverOffshift(panel, driver);
      }
      return;
    }

    sendDriverToStand(panel, driver);
  }

  function enqueueRequest(panel, template) {
    const request = instantiateRequest(template);
    panel.requests.set(request.id, request);
    panel.waitingIds.push(request.id);
    panel.recentDemand.push({ t: app.currentSimMin, zoneId: request.pickup.zoneId });
  }

  function canUnlockElasticDemand(panel) {
    const waiting = getWaitingRequests(panel);
    const warmRequests = countWarmWaitingRequests(panel, app.currentSimMin);
    const readyDrivers = panel.drivers.filter(
      (driver) => driver.state === DRIVER_STATE.IDLE || driver.state === DRIVER_STATE.OFFSHIFT
    ).length;
    const avgWaitOk = panel.completed.length < 6 || panel.metrics.avgWait <= CONFIG.demand.elastic.activationWaitMaxMin;
    const availabilityOk = panel.completed.length < 6 || panel.metrics.availabilityScore >= 4;
    const convenienceOk = panel.completed.length < 4 || panel.metrics.convenienceScore >= 4.1;
    return (
      waiting.length <= CONFIG.demand.elastic.activationMaxOpen &&
      warmRequests <= CONFIG.demand.elastic.activationMaxWarm &&
      readyDrivers >= CONFIG.demand.elastic.activationMinReadyDrivers &&
      avgWaitOk &&
      availabilityOk &&
      convenienceOk
    );
  }

  function spawnRequests() {
    const sim = app.simulation;
    while (sim.basePlanIndex < sim.basePlan.length && sim.basePlan[sim.basePlanIndex].tCreatedMin <= app.currentSimMin) {
      const template = sim.basePlan[sim.basePlanIndex];
      for (const panel of Object.values(sim.panels)) {
        enqueueRequest(panel, template);
      }
      sim.basePlanIndex += 1;
    }

    while (
      sim.elasticPlanIndexB < sim.elasticPlanB.length &&
      sim.elasticPlanB[sim.elasticPlanIndexB].tCreatedMin <= app.currentSimMin
    ) {
      const template = sim.elasticPlanB[sim.elasticPlanIndexB];
      if (canUnlockElasticDemand(sim.panels.B)) {
        enqueueRequest(sim.panels.B, template);
      }
      sim.elasticPlanIndexB += 1;
    }
  }

  function advanceDriver(panel, driver, dtMin) {
    if (driver.state === DRIVER_STATE.OFFSHIFT) {
      return;
    }

    const worldSpeedPerMin = (CONFIG.drivers.speedKph * panel.world.unitsPerKm) / 60;
    let remaining = worldSpeedPerMin * driver.speedFactor * dtMin;
    const previous = { x: driver.pos.x, y: driver.pos.y };

    while (remaining > 0.0001 && driver.routeIndex < driver.route.length) {
      const next = driver.route[driver.routeIndex];
      const segmentDistance = dist(driver.pos, next);
      if (segmentDistance <= remaining) {
        driver.heading = Math.atan2(next.y - driver.pos.y, next.x - driver.pos.x);
        driver.pos.x = next.x;
        driver.pos.y = next.y;
        driver.nodeId = next.nodeId;
        driver.routeIndex += 1;
        remaining -= segmentDistance;
      } else {
        const ratio = remaining / segmentDistance;
        driver.heading = Math.atan2(next.y - driver.pos.y, next.x - driver.pos.x);
        driver.pos.x = lerp(driver.pos.x, next.x, ratio);
        driver.pos.y = lerp(driver.pos.y, next.y, ratio);
        remaining = 0;
      }
    }

    driver.lastSegment = {
      a: previous,
      b: { x: driver.pos.x, y: driver.pos.y },
    };

    maybeRecordTrail(driver);
  }

  function maybeRecordTrail(driver) {
    const trailWindow = app.reduceMotion ? CONFIG.visuals.trailSecondsReduced : CONFIG.visuals.trailSeconds;
    const last = driver.trail[driver.trail.length - 1];
    if (!last || dist(last, driver.pos) > 8 || last.state !== driver.state) {
      driver.trail.push({
        x: driver.pos.x,
        y: driver.pos.y,
        state: driver.state,
        tReal: app.realRunSec,
      });
    }
    const cutoff = app.realRunSec - trailWindow;
    while (driver.trail.length > 2 && driver.trail[0].tReal < cutoff) {
      driver.trail.shift();
    }
  }

  function updateDriverStateTime(driver, dtMin) {
    if (driver.state === DRIVER_STATE.ON_TRIP) {
      driver.time.onTrip += dtMin;
    } else if (driver.state === DRIVER_STATE.ASSIGNED) {
      driver.time.assigned += dtMin;
    } else if (driver.state === DRIVER_STATE.REBALANCING) {
      driver.time.rebalancing += dtMin;
    } else if (driver.state === DRIVER_STATE.OFFSHIFT) {
      driver.time.offshift += dtMin;
    } else {
      driver.time.idle += dtMin;
    }
  }

  function processDriverArrivals(panel, driver) {
    const routeDone = driver.routeIndex >= driver.route.length;
    if (!routeDone) {
      return;
    }

    const activeRequest = driver.assignedRequestId ? panel.requests.get(driver.assignedRequestId) : null;
    if (driver.state === DRIVER_STATE.ASSIGNED && activeRequest) {
      pickupAssignedRequest(panel, driver, activeRequest);
      return;
    }

    if (driver.state === DRIVER_STATE.ON_TRIP && activeRequest) {
      completeTrip(panel, driver, activeRequest);
      return;
    }

    if (driver.state === DRIVER_STATE.REBALANCING) {
      driver.state = DRIVER_STATE.IDLE;
      driver.idlePlan = "standby";
      return;
    }

    if (driver.state === DRIVER_STATE.IDLE) {
      driver.idlePlan = driver.idlePlan || "stand";
    }
  }

  function manageIdleDriver(panel, driver) {
    if (driver.state !== DRIVER_STATE.IDLE || driver.routeIndex < driver.route.length) {
      return;
    }

    if (panel.key === "A") {
      if (driver.idlePlan === "stand") {
        if (panel.currentMin < driver.waitUntilMin) {
          return;
        }
        const hasBacklog = panel.waitingIds.some((id) => {
          const request = panel.requests.get(id);
          return request && request.state === REQUEST_STATE.WAITING;
        });
        const searchChance = CONFIG.scenarioA.cruiseAfterWaitChance + (hasBacklog ? 0.12 : 0);
        if (panel.rng() < searchChance) {
          queueCruiseRoute(panel, driver);
          return;
        }
        driver.waitUntilMin =
          panel.currentMin + sampleRange(panel.rng, CONFIG.scenarioA.standWaitMin.min * 0.65, CONFIG.scenarioA.standWaitMin.max * 0.8);
        return;
      }

      if (driver.idlePlan === "cruise") {
        sendDriverToStand(panel, driver);
        return;
      }

      sendDriverToStand(panel, driver, { immediate: true });
      return;
    }

    if (!assignBestRequestToDriver(panel, driver) && !hasActiveDispatchDemand(panel)) {
      sendDriverOffshift(panel, driver);
    }
  }

  function streetHailMatches(panel) {
    const waiting = getWaitingRequests(panel);

    if (!waiting.length) {
      return;
    }

    const matchedRequestIds = new Set();
    for (const driver of panel.drivers) {
      if (driver.state !== DRIVER_STATE.IDLE) {
        continue;
      }
      let chosenRequest = null;
      for (const request of waiting) {
        if (matchedRequestIds.has(request.id)) {
          continue;
        }
        const radius = CONFIG.scenarioA.pickupRadius;
        const closeEnough =
          distancePointToSegment(request.pickup, driver.lastSegment.a, driver.lastSegment.b) <= radius ||
          dist(request.pickup, driver.pos) <= radius;
        if (closeEnough) {
          chosenRequest = request;
          break;
        }
      }

      if (chosenRequest) {
        matchedRequestIds.add(chosenRequest.id);
        chosenRequest.state = REQUEST_STATE.PICKED_UP;
        chosenRequest.tPickedUpMin = panel.currentMin;
        driver.assignedRequestId = chosenRequest.id;
        driver.state = DRIVER_STATE.ON_TRIP;
        setRouteToNode(panel, driver, chosenRequest.dropoffNodeId);
        if (!driver.route.length) {
          completeTrip(panel, driver, chosenRequest);
        }
      }
    }
  }

  function dispatchWaitingRequests(panel) {
    const waiting = getWaitingRequests(panel);

    const available = panel.drivers.filter(
      (driver) =>
        driver.state === DRIVER_STATE.IDLE ||
        driver.state === DRIVER_STATE.REBALANCING ||
        driver.state === DRIVER_STATE.OFFSHIFT
    );

    if (!waiting.length || !available.length) {
      return;
    }

    for (const request of waiting) {
      let best = null;
      for (const driver of available) {
        const startNodeId = findClosestNodeId(panel.world, driver.pos);
        const route = getPath(panel.world, startNodeId, request.pickupNodeId);
        const etaMin = route.distance / ((CONFIG.drivers.speedKph * panel.world.unitsPerKm) / 60 * driver.speedFactor);
        if (!best || etaMin < best.etaMin) {
          best = { driver, etaMin };
        }
      }

      if (!best || best.etaMin > CONFIG.scenarioB.dispatchMaxETAmin) {
        continue;
      }

      assignDriverToRequest(panel, best.driver, request);
      const idx = available.indexOf(best.driver);
      if (idx >= 0) {
        available.splice(idx, 1);
      }
      if (!available.length) {
        break;
      }
    }
  }

  function rebalanceDrivers(panel) {
    if (!app.settings.rebalanceEnabled) {
      return;
    }
    if (panel.currentMin - panel.lastRebalanceMin < CONFIG.scenarioB.rebalance.intervalMin) {
      return;
    }
    panel.lastRebalanceMin = panel.currentMin;

    const idleDrivers = panel.drivers.filter((driver) => driver.state === DRIVER_STATE.IDLE);
    if (!idleDrivers.length) {
      return;
    }

    panel.recentDemand = panel.recentDemand.filter((entry) => panel.currentMin - entry.t < 6);
    const zoneScores = panel.world.zones.map((zone) => {
      const recent = panel.recentDemand.filter((entry) => entry.zoneId === zone.id).length;
      const waiting = panel.waitingIds
        .map((id) => panel.requests.get(id))
        .filter((request) => request && request.state === REQUEST_STATE.WAITING && request.pickup.zoneId === zone.id).length;
      const nearby = idleDrivers.filter((driver) => dist(driver.pos, zone.center) <= zone.r + 50).length;
      return { zone, score: recent * 1.4 + waiting * 2 - nearby * 0.9 };
    });

    zoneScores.sort((a, b) => b.score - a.score);
    const target = zoneScores[0];
    if (!target || target.score < 1.4) {
      return;
    }

    const candidates = idleDrivers
      .map((driver) => ({ driver, gap: dist(driver.pos, target.zone.center) }))
      .filter((entry) => entry.gap > target.zone.r * 0.45)
      .sort((a, b) => b.gap - a.gap);

    const cap = Math.min(
      CONFIG.scenarioB.rebalance.maxDriversPerInterval,
      Math.max(1, Math.round(target.score / 2.3))
    );

    for (let index = 0; index < Math.min(cap, candidates.length); index += 1) {
      const driver = candidates[index].driver;
      driver.state = DRIVER_STATE.REBALANCING;
      driver.assignedRequestId = null;
      driver.rebalanceZoneId = target.zone.id;
      setRouteToNode(panel, driver, target.zone.anchorNodeId);
    }
  }

  function expireOldRequests(panel) {
    for (const requestId of panel.waitingIds) {
      const request = panel.requests.get(requestId);
      if (!request || request.state !== REQUEST_STATE.WAITING) {
        continue;
      }
      if (panel.currentMin - request.tCreatedMin > CONFIG.demand.maxWaitMin) {
        request.state = REQUEST_STATE.EXPIRED;
        panel.expired += 1;
      }
    }
  }

  function computeMetrics(panel) {
    const totals = panel.drivers.reduce(
      (acc, driver) => {
        acc.idle += driver.time.idle;
        acc.assigned += driver.time.assigned;
        acc.onTrip += driver.time.onTrip;
        acc.rebalancing += driver.time.rebalancing;
        return acc;
      },
      { idle: 0, assigned: 0, onTrip: 0, rebalancing: 0 }
    );

    totals.offshift = panel.drivers.reduce((sum, driver) => sum + driver.time.offshift, 0);

    const completedWaits = panel.completed
      .map((request) => (request.tPickedUpMin ?? request.tCreatedMin) - request.tCreatedMin)
      .filter((value) => Number.isFinite(value));
    const completedTripMinutes = panel.completed
      .map((request) => (request.tCompletedMin ?? panel.currentMin) - (request.tPickedUpMin ?? request.tCreatedMin))
      .filter((value) => Number.isFinite(value) && value >= 0);

    const waitingRequests = panel.waitingIds
      .map((id) => panel.requests.get(id))
      .filter((request) => request && request.state === REQUEST_STATE.WAITING);

    const warmRequests = countWarmWaitingRequests(panel);
    const loggedInTotal = totals.idle + totals.assigned + totals.onTrip + totals.rebalancing;
    const totalDriverTime = loggedInTotal + totals.offshift;
    const completedTrips = panel.completed.length;
    const totalRequests = panel.requests.size;
    const avgWait = completedWaits.length
      ? mean(completedWaits)
      : mean(waitingRequests.map((request) => panel.currentMin - request.tCreatedMin));
    const totalTripKm = panel.completed.reduce(
      (sum, request) => sum + request.plannedDistance / panel.world.unitsPerKm,
      0
    );
    const totalTripMinutes = completedTripMinutes.reduce((sum, value) => sum + value, 0);
    const completionRate = completedTrips / Math.max(totalRequests, 1);
    const confirmationDelays = panel.completed
      .map((request) => (request.tAssignedMin ?? request.tPickedUpMin ?? request.tCreatedMin) - request.tCreatedMin)
      .filter((value) => Number.isFinite(value) && value >= 0);
    const avgConfirmationDelay = confirmationDelays.length ? mean(confirmationDelays) : avgWait;
    const baseCustomerSpend =
      completedTrips * CONFIG.market.baseFare +
      totalTripKm * CONFIG.market.perKm +
      totalTripMinutes * CONFIG.market.perMin;
    const idleBurden = (totals.idle / 60) * CONFIG.market.idleBurdenPerHour;
    const warmPenalty = warmRequests * CONFIG.market.warmRequestPenalty;
    const marketFriction =
      completedTrips *
      (panel.key === "A" ? CONFIG.market.streetHailFrictionPerRide : CONFIG.market.dispatchSupportPerRide);
    const coordinationCredit =
      panel.key === "B" ? completedTrips * CONFIG.market.dispatchEfficiencyCreditPerRide : 0;
    const totalCustomerSpend = completedTrips
      ? Math.max(completedTrips * 5.2, baseCustomerSpend + idleBurden + warmPenalty + marketFriction - coordinationCredit)
      : 0;
    const avgRideCost = completedTrips ? totalCustomerSpend / completedTrips : 0;
    const driverTakeHomeTotal = totalCustomerSpend * CONFIG.market.driverShare;
    const driverTakeHomePerDriver = driverTakeHomeTotal / Math.max(panel.drivers.length, 1);
    const driverTakeHomePerLoggedInHour = driverTakeHomeTotal / Math.max(loggedInTotal / 60, 0.01);
    const hoursToTargetPay = completedTrips
      ? clamp(CONFIG.market.targetDailyPay / Math.max(driverTakeHomePerLoggedInHour, 1), 0, CONFIG.sim.minutesTotal / 60 + 4)
      : CONFIG.sim.minutesTotal / 60 + 4;
    const availabilityScore = clamp(
      5 -
        avgWait * 0.23 -
        (panel.expired / Math.max(totalRequests, 1)) * 5.2 -
        (waitingRequests.length / Math.max(panel.drivers.length, 1)) * 0.42 +
        completionRate * 0.45 +
        (panel.key === "B" ? 0.12 : 0),
      0.6,
      5
    );
    const convenienceScore = clamp(
      (panel.key === "B" ? CONFIG.market.convenienceBaseB : CONFIG.market.convenienceBaseA) -
        avgConfirmationDelay * 0.12 -
        avgWait * 0.04 -
        (panel.expired / Math.max(totalRequests, 1)) * 1.7 +
        completionRate * 0.18,
      0.7,
      5
    );

    return {
      avgWait,
      idlePct: totals.idle / Math.max(loggedInTotal, 0.01),
      utilPct: (totals.assigned + totals.onTrip + totals.rebalancing) / Math.max(loggedInTotal, 0.01),
      offshiftPct: totals.offshift / Math.max(totalDriverTime, 0.01),
      avgRideCost,
      availabilityScore,
      convenienceScore,
      idleHoursPerDriver: totals.idle / Math.max(panel.drivers.length, 1) / 60,
      workHoursPerDriver: loggedInTotal / Math.max(panel.drivers.length, 1) / 60,
      freeHoursPerDriver: totals.offshift / Math.max(panel.drivers.length, 1) / 60,
      hoursToTargetPay,
      driverTakeHomePerDriver,
      completedTrips,
      waitingNow: waitingRequests.length,
      expired: panel.expired,
      warmRequests,
      totalRequests,
    };
  }

  function updatePanel(panel, dtMin) {
    panel.currentMin = app.currentSimMin;
    if (panel.key === "B") {
      rebalanceDrivers(panel);
      dispatchWaitingRequests(panel);
    }

    for (const driver of panel.drivers) {
      updateDriverStateTime(driver, dtMin);
      if (driver.state !== DRIVER_STATE.OFFSHIFT) {
        advanceDriver(panel, driver, dtMin);
        processDriverArrivals(panel, driver);
      }
    }

    if (panel.key === "A") {
      streetHailMatches(panel);
    } else {
      dispatchWaitingRequests(panel);
    }

    panel.drivers.forEach((driver) => manageIdleDriver(panel, driver));

    expireOldRequests(panel);
    panel.beziers = panel.beziers.filter(
      (item) => app.realRunSec - item.bornAt <= CONFIG.visuals.matchBezierLifespanSec
    );
    panel.metrics = computeMetrics(panel);
  }

  function simStep(dtMin) {
    if (!app.simulation || app.finished) {
      return;
    }
    app.currentSimMin = Math.min(CONFIG.sim.minutesTotal, app.currentSimMin + dtMin);
    spawnRequests();
    updatePanel(app.simulation.panels.A, dtMin);
    updatePanel(app.simulation.panels.B, dtMin);
    updateReadouts();
    if (app.currentSimMin >= CONFIG.sim.minutesTotal) {
      finishSimulation();
    }
  }

  function finishSimulation() {
    if (app.finished) {
      return;
    }
    clearReplayTimer();
    app.running = false;
    app.finished = true;
    app.accumulatorMin = 0;
    updateReadouts();
    updateSummaryOverlay();
    setSummaryOverlayVisible(true);
    dom.summaryLive.textContent = `${buildFinalLiveSummary()} Closing the card returns to the completed run.`;
  }

  function getPhase(minute) {
    if (minute < 1) {
      return {
        runtime: "Opening minute",
        phase: "Both arrangements begin with the same city demand and driver supply.",
        demandLabel: "Opening demand",
      };
    }
    if (minute < 90) {
      return {
        runtime: formatWorkdayProgress(minute),
        phase: "Morning: trip requests begin to reveal differences in price, availability, and driver waiting.",
        demandLabel: "Morning",
      };
    }
    if (minute < 240) {
      return {
        runtime: formatWorkdayProgress(minute),
        phase: "Midday: the model links availability and customer cost with the number of requested and completed trips.",
        demandLabel: "Midday",
      };
    }
    if (minute < 420) {
      return {
        runtime: formatWorkdayProgress(minute),
        phase: "Afternoon: cumulative trips, driver idle time, and take-home pay begin to diverge between the arrangements.",
        demandLabel: "Afternoon",
      };
    }
    return {
      runtime: formatWorkdayProgress(minute),
      phase: "Late shift: the model compares time to the pay target and take-home pay at the end of the workday.",
      demandLabel: "Late shift",
    };
  }

  function buildStageCommentary(metricsA, metricsB) {
    const minute = app.currentSimMin;
    const rideLift = metricsB.completedTrips - metricsA.completedTrips;
    const costDrop = Math.max(0, metricsA.avgRideCost - metricsB.avgRideCost);
    const availabilityLift = metricsB.availabilityScore - metricsA.availabilityScore;
    const idleCut = Math.max(0, metricsA.idleHoursPerDriver - metricsB.idleHoursPerDriver);
    const targetCut = Math.max(0, metricsA.hoursToTargetPay - metricsB.hoursToTargetPay);

    if (app.finished) {
      return rideLift > 0
        ? `Done. Right side finished ${rideLift} more rides at ${formatCurrency(costDrop, 2)} lower customer cost.`
        : "Done. Right side still turned coordination into a better customer and driver outcome.";
    }
    if (minute < 90) {
      return rideLift > 0
        ? `Morning: right side is already ${rideLift} rides ahead as ordering gets easier.`
        : "Morning: app ordering is already reducing friction on the right.";
    }
    if (minute < 240) {
      return costDrop > 0
        ? `Midday: right-side rides are ${formatCurrency(costDrop, 2)} cheaper with ${availabilityLift.toFixed(1)} pts better availability.`
        : "Midday: the coordinated side is turning the same fleet faster.";
    }
    if (minute < 420) {
      return idleCut > 0
        ? `Afternoon: B is saving drivers ${idleCut.toFixed(1)}h of idle wait while customers get more trips.`
        : "Afternoon: the right side stays denser, quicker, and easier to buy from.";
    }
    return targetCut > 0
      ? `Late shift: B reaches the same pay target ${targetCut.toFixed(1)}h sooner.`
      : "Late shift: the right side keeps turning coordination into driver upside.";
  }

  function buildFinalLiveSummary() {
    const metricsA = app.simulation.panels.A.metrics;
    const metricsB = app.simulation.panels.B.metrics;
    const rideLift = metricsB.completedTrips - metricsA.completedTrips;
    const costGap = metricsA.avgRideCost - metricsB.avgRideCost;
    const availabilityLift = metricsB.availabilityScore - metricsA.availabilityScore;
    const idleGap = metricsA.idleHoursPerDriver - metricsB.idleHoursPerDriver;
    const targetGap = metricsA.hoursToTargetPay - metricsB.hoursToTargetPay;
    const incomeGap = metricsB.driverTakeHomePerDriver - metricsA.driverTakeHomePerDriver;
    const rideText = rideLift >= 0 ? `${rideLift} more rides` : `${Math.abs(rideLift)} fewer rides`;
    const costText =
      costGap >= 0
        ? `${formatCurrency(costGap, 2)} lower customer cost`
        : `${formatCurrency(Math.abs(costGap), 2)} higher customer cost`;
    const idleText =
      idleGap >= 0
        ? `${idleGap.toFixed(1)} fewer idle hours per driver`
        : `${Math.abs(idleGap).toFixed(1)} more idle hours per driver`;
    const targetText =
      targetGap >= 0
        ? `${targetGap.toFixed(1)} hours sooner`
        : `${Math.abs(targetGap).toFixed(1)} hours later`;
    const incomeText =
      incomeGap >= 0
        ? `${formatCurrency(incomeGap, 0)} more in a full day`
        : `${formatCurrency(Math.abs(incomeGap), 0)} less in a full day`;
    return `Simulation complete. The same ${app.settings.driverCount} drivers produced ${rideText}, created ${costText}, lifted availability by ${availabilityLift.toFixed(
      1
    )} points, cut to ${idleText}, and let drivers hit the same $${CONFIG.market.targetDailyPay.toFixed(
      0
    )} pay target ${targetText} or take home ${incomeText}.`;
  }

  function buildLiveTakeaway(metricsA, metricsB) {
    const rideLift = metricsB.completedTrips - metricsA.completedTrips;
    const costGap = metricsA.avgRideCost - metricsB.avgRideCost;
    const availabilityLift = metricsB.availabilityScore - metricsA.availabilityScore;
    const idleGap = metricsA.idleHoursPerDriver - metricsB.idleHoursPerDriver;
    const targetGap = metricsA.hoursToTargetPay - metricsB.hoursToTargetPay;

    if (metricsB.completedTrips < 4) {
      return "The coordinated side is building its edge by making rides easier to order and easier to fulfill with the same fleet.";
    }

    return `So far B is serving ${rideLift >= 0 ? rideLift : 0} more rides at ${formatCurrency(
      Math.max(0, costGap),
      2
    )} lower average customer cost, with ${availabilityLift.toFixed(
      1
    )} points better availability. That is already cutting wasted driver wait by ${Math.max(
      0,
      idleGap
    ).toFixed(1)} hours and shortening the path to the same pay target by ${Math.max(0, targetGap).toFixed(1)} hours.`;
  }

  function buildRiderValueText(metricsA, metricsB) {
    const rideLift = metricsB.completedTrips - metricsA.completedTrips;
    const costGap = metricsA.avgRideCost - metricsB.avgRideCost;
    const convenienceLift = metricsB.convenienceScore - metricsA.convenienceScore;

    if (metricsB.completedTrips < 3) {
      return "Early on, the right side is proving that fast matching and simple ordering can make more customers willing to buy trips.";
    }

    return `Customers have already taken ${Math.max(0, rideLift)} more trips on B. Average ride cost is down by ${formatCurrency(
      Math.max(0, costGap),
      2
    )}, and order / payment convenience is ${convenienceLift.toFixed(1)} points higher.`;
  }

  function buildDriverValueText(metricsA, metricsB) {
    const idleCut = Math.max(0, metricsA.idleHoursPerDriver - metricsB.idleHoursPerDriver);
    const targetCut = Math.max(0, metricsA.hoursToTargetPay - metricsB.hoursToTargetPay);
    const incomeLift = Math.max(0, metricsB.driverTakeHomePerDriver - metricsA.driverTakeHomePerDriver);

    if (metricsB.completedTrips < 3) {
      return "As demand organizes on the right, driver time starts shifting out of waste and into either real work or real personal time.";
    }

    return `Drivers are saving ${idleCut.toFixed(1)} hours of idle waiting. That means the same $${CONFIG.market.targetDailyPay.toFixed(
      0
    )} target arrives ${targetCut.toFixed(1)} hours sooner, or a full day yields ${formatCurrency(
      incomeLift,
      0
    )} more take-home.`;
  }

  function classifyDelta(value, goodWhen) {
    if (Math.abs(value) < 0.05) {
      return "metric-neutral";
    }
    if ((goodWhen === "positive" && value > 0) || (goodWhen === "negative" && value < 0)) {
      return "metric-good";
    }
    return "metric-bad";
  }

  function setMetricElement(element, text, className) {
    element.textContent = text;
    element.classList.remove("metric-good", "metric-bad", "metric-neutral");
    element.classList.add(className);
  }

  function setOverlayPill(element, text, className) {
    if (!element) {
      return;
    }
    element.textContent = text;
    element.classList.remove("metric-good", "metric-bad", "metric-neutral");
    element.classList.add(className);
  }

  function setSummaryOverlayVisible(visible) {
    if (!dom.summaryOverlay) {
      return;
    }
    dom.summaryOverlay.hidden = !visible;
    dom.summaryOverlay.classList.toggle("is-visible", visible);
    scheduleEmbedHeight();
  }

  function isMobileStageLayout() {
    return app.canvas.width < 760;
  }

  function updateSummaryOverlay() {
    if (!dom.summaryOverlay || !app.simulation) {
      return;
    }

    const metricsA = app.simulation.panels.A.metrics;
    const metricsB = app.simulation.panels.B.metrics;
    const ridesLift = metricsB.completedTrips - metricsA.completedTrips;
    const costLift = metricsB.avgRideCost - metricsA.avgRideCost;
    const availabilityLift = metricsB.availabilityScore - metricsA.availabilityScore;
    const convenienceLift = metricsB.convenienceScore - metricsA.convenienceScore;
    const idleLift = metricsB.idleHoursPerDriver - metricsA.idleHoursPerDriver;
    const incomeLift = metricsB.driverTakeHomePerDriver - metricsA.driverTakeHomePerDriver;

    dom.summaryOverlayTitle.textContent = "Results for the two modeled service arrangements";
    dom.summaryOverlayLead.textContent = `Under the model assumptions, centralized dispatch produced ${Math.max(
      0,
      ridesLift
    )} additional completed trips. The table shows the associated differences in price, availability, idle time, and pay.`;
    dom.summaryOverlayFoot.textContent = "Closing this card returns to the completed run. The Run button repeats the same workday.";

    dom.overlayRidesA.textContent = String(metricsA.completedTrips);
    dom.overlayCostA.textContent = formatCurrency(metricsA.avgRideCost);
    dom.overlayAvailabilityA.textContent = formatScore(metricsA.availabilityScore);
    dom.overlayConvenienceA.textContent = formatScore(metricsA.convenienceScore);
    dom.overlayIdleHoursA.textContent = formatHoursMinutes(metricsA.idleHoursPerDriver);
    dom.overlayIncomeA.textContent = formatCurrency(metricsA.driverTakeHomePerDriver, 0);

    dom.overlayRidesB.textContent = String(metricsB.completedTrips);
    dom.overlayCostB.textContent = formatCurrency(metricsB.avgRideCost);
    dom.overlayAvailabilityB.textContent = formatScore(metricsB.availabilityScore);
    dom.overlayConvenienceB.textContent = formatScore(metricsB.convenienceScore);
    dom.overlayIdleHoursB.textContent = formatHoursMinutes(metricsB.idleHoursPerDriver);
    dom.overlayIncomeB.textContent = formatCurrency(metricsB.driverTakeHomePerDriver, 0);

    setOverlayPill(
      dom.overlayDeltaRides,
      `${ridesLift > 0 ? "+" : ""}${ridesLift} rides`,
      classifyDelta(ridesLift, "positive")
    );
    setOverlayPill(
      dom.overlayDeltaCost,
      costLift <= 0 ? `${formatSignedCurrency(costLift)} / ride` : `${formatSignedCurrency(costLift)} / ride`,
      classifyDelta(costLift, "negative")
    );
    setOverlayPill(
      dom.overlayDeltaAvailability,
      `${availabilityLift > 0 ? "+" : ""}${availabilityLift.toFixed(1)} pts availability`,
      classifyDelta(availabilityLift, "positive")
    );
    setOverlayPill(
      dom.overlayDeltaConvenience,
      `${convenienceLift > 0 ? "+" : ""}${convenienceLift.toFixed(1)} pts convenience`,
      classifyDelta(convenienceLift, "positive")
    );
    setOverlayPill(
      dom.overlayDeltaIdle,
      `${formatSignedHoursMinutes(idleLift)} idle`,
      classifyDelta(idleLift, "negative")
    );
    setOverlayPill(
      dom.overlayDeltaIncome,
      `${formatSignedCurrency(incomeLift, 0)} take-home`,
      classifyDelta(incomeLift, "positive")
    );
  }

  function dismissSummaryOverlay() {
    clearReplayTimer();
    setSummaryOverlayVisible(false);
    dom.summaryLive.textContent = `${buildFinalLiveSummary()} Pressing Run starts the same scenario again.`;
  }

  function syncPlaybackButton() {
    if (!dom.heroRunButton) {
      return;
    }
    const label = app.running ? "Pause" : "Run";
    dom.heroRunButton.textContent = label;
    dom.heroRunButton.setAttribute("aria-pressed", app.running ? "true" : "false");
    dom.heroRunButton.setAttribute(
      "aria-label",
      app.running ? "Pause simulation" : app.finished ? "Run simulation again" : "Run simulation"
    );
  }

  function updateReadouts() {
    if (!app.simulation) {
      return;
    }

    const metricsA = app.simulation.panels.A.metrics;
    const metricsB = app.simulation.panels.B.metrics;
    const ridesDelta = metricsB.completedTrips - metricsA.completedTrips;
    const costDelta = metricsB.avgRideCost - metricsA.avgRideCost;
    const availabilityDelta = metricsB.availabilityScore - metricsA.availabilityScore;
    const convenienceDelta = metricsB.convenienceScore - metricsA.convenienceScore;
    const idleWaitDelta = metricsB.idleHoursPerDriver - metricsA.idleHoursPerDriver;
    const targetHoursDelta = metricsB.hoursToTargetPay - metricsA.hoursToTargetPay;
    const incomeDelta = metricsB.driverTakeHomePerDriver - metricsA.driverTakeHomePerDriver;
    const phase = getPhase(app.currentSimMin);
    const progress = clamp(app.currentSimMin / CONFIG.sim.minutesTotal, 0, 1);

    dom.heroProgressFill.style.width = `${(progress * 100).toFixed(2)}%`;
    dom.clockLabel.textContent = `${formatWorkClock(app.currentSimMin)} / 16:00`;
    dom.demandWindowLabel.textContent = phase.demandLabel;
    dom.outcomeText.textContent = buildStageCommentary(metricsA, metricsB);

    dom.ridesA.textContent = String(metricsA.completedTrips);
    dom.ridesB.textContent = String(metricsB.completedTrips);
    setMetricElement(dom.ridesDelta, `${ridesDelta > 0 ? "+" : ""}${ridesDelta}`, classifyDelta(ridesDelta, "positive"));

    dom.costA.textContent = formatCurrency(metricsA.avgRideCost);
    dom.costB.textContent = formatCurrency(metricsB.avgRideCost);
    setMetricElement(dom.costDelta, formatSignedCurrency(costDelta), classifyDelta(costDelta, "negative"));

    dom.availabilityA.textContent = formatScore(metricsA.availabilityScore);
    dom.availabilityB.textContent = formatScore(metricsB.availabilityScore);
    setMetricElement(dom.availabilityDelta, formatPoints(availabilityDelta), classifyDelta(availabilityDelta, "positive"));

    dom.convenienceA.textContent = formatScore(metricsA.convenienceScore);
    dom.convenienceB.textContent = formatScore(metricsB.convenienceScore);
    setMetricElement(dom.convenienceDelta, formatPoints(convenienceDelta), classifyDelta(convenienceDelta, "positive"));

    dom.idleWaitA.textContent = formatHoursMinutes(metricsA.idleHoursPerDriver);
    dom.idleWaitB.textContent = formatHoursMinutes(metricsB.idleHoursPerDriver);
    setMetricElement(
      dom.idleWaitDelta,
      formatSignedHoursMinutes(idleWaitDelta),
      classifyDelta(idleWaitDelta, "negative")
    );

    dom.targetHoursA.textContent = formatHours(metricsA.hoursToTargetPay);
    dom.targetHoursB.textContent = formatHours(metricsB.hoursToTargetPay);
    setMetricElement(dom.targetHoursDelta, formatSignedHours(targetHoursDelta), classifyDelta(targetHoursDelta, "negative"));

    dom.incomeA.textContent = formatCurrency(metricsA.driverTakeHomePerDriver, 0);
    dom.incomeB.textContent = formatCurrency(metricsB.driverTakeHomePerDriver, 0);
    setMetricElement(dom.incomeDelta, formatSignedCurrency(incomeDelta, 0), classifyDelta(incomeDelta, "positive"));

    dom.summaryText.textContent = app.finished
      ? `${buildFinalLiveSummary()} Close the end card, then press Run to replay the same seeded workday.`
      : buildLiveTakeaway(metricsA, metricsB);
    if (dom.riderValueText) {
      dom.riderValueText.textContent = buildRiderValueText(metricsA, metricsB);
    }
    if (dom.driverValueText) {
      dom.driverValueText.textContent = buildDriverValueText(metricsA, metricsB);
    }
    syncPlaybackButton();
  }

  function getPanelRects() {
    const width = app.canvas.width;
    const height = app.canvas.height;
    const isMobileStack = isMobileStageLayout();
    const padding = isMobileStack ? 4 : CONFIG.visuals.paddingPx;
    const gap = isMobileStack ? 6 : CONFIG.visuals.gapPx;
    if (isMobileStack) {
      const panelW = width - padding * 2;
      const panelH = (height - padding * 2 - gap) / 2;
      return {
        A: { x: padding, y: padding, w: panelW, h: panelH },
        B: { x: padding, y: padding + panelH + gap, w: panelW, h: panelH },
      };
    }
    const panelW = (width - padding * 2 - gap) / 2;
    const panelH = height - padding * 2;
    return {
      A: { x: padding, y: padding, w: panelW, h: panelH },
      B: { x: padding + panelW + gap, y: padding, w: panelW, h: panelH },
    };
  }

  function mapWorldToRect(rect, point) {
    return {
      x: rect.x + (point.x / app.world.w) * rect.w,
      y: rect.y + (point.y / app.world.h) * rect.h,
    };
  }

  function rebuildStaticLayer() {
    const rects = getPanelRects();
    const rect = { x: 0, y: 0, w: Math.round(rects.A.w), h: Math.round(rects.A.h) };
    const key = `${rect.w}x${rect.h}:${app.settings.demandFactor.toFixed(2)}`;
    if (key === app.canvas.staticKey) {
      return;
    }

    const layer = document.createElement("canvas");
    layer.width = Math.max(1, rect.w);
    layer.height = Math.max(1, rect.h);
    const ctx = layer.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, rect.h);
    gradient.addColorStop(0, "#eef7f4");
    gradient.addColorStop(1, "#dae8e4");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.w, rect.h);

    const vignette = ctx.createRadialGradient(rect.w * 0.5, rect.h * 0.45, rect.w * 0.08, rect.w * 0.5, rect.h * 0.45, rect.w * 0.72);
    vignette.addColorStop(0, "rgba(255,255,255,0)");
    vignette.addColorStop(1, "rgba(34,61,67,0.12)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, rect.w, rect.h);

    const localRect = { x: 0, y: 0, w: rect.w, h: rect.h };
    for (const zone of app.world.zones) {
      const center = mapWorldToRect(localRect, zone.center);
      const radius = (zone.r / app.world.w) * rect.w;
      const fill = ctx.createRadialGradient(center.x, center.y, radius * 0.15, center.x, center.y, radius);
      fill.addColorStop(0, `${zone.color}40`);
      fill.addColorStop(1, `${zone.color}08`);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(40,70,76,0.15)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(22,51,56,0.55)";
      ctx.font = "700 12px Aptos, Segoe UI, sans-serif";
      ctx.fillText(zone.name, center.x - radius * 0.35, center.y - radius * 0.82);
    }

    ctx.lineCap = "round";
    for (const edge of app.world.edges) {
      const a = mapWorldToRect(localRect, app.world.nodes[edge.a]);
      const b = mapWorldToRect(localRect, app.world.nodes[edge.b]);
      ctx.strokeStyle = "rgba(63, 86, 92, 0.18)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    for (const node of app.world.nodes) {
      const point = mapWorldToRect(localRect, node);
      ctx.fillStyle = "rgba(37, 66, 72, 0.3)";
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }

    const heatAlpha = CONFIG.visuals.heatmapAlpha * (0.85 + app.settings.demandFactor * 0.2);
    ctx.globalCompositeOperation = "lighter";
    for (const zone of app.world.zones) {
      const center = mapWorldToRect(localRect, zone.center);
      const radius = (zone.r / app.world.w) * rect.w * 1.15;
      const heat = ctx.createRadialGradient(center.x, center.y, radius * 0.08, center.x, center.y, radius);
      heat.addColorStop(0, `rgba(59,156,243,${heatAlpha * zone.demandWeight * 2.2})`);
      heat.addColorStop(0.55, `rgba(28,186,150,${heatAlpha * zone.demandWeight * 1.1})`);
      heat.addColorStop(1, "rgba(28,186,150,0)");
      ctx.fillStyle = heat;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";

    app.canvas.staticLayer = layer;
    app.canvas.staticKey = key;
  }

  function getRequestColor(_waitMin, alpha = 1) {
    return `rgba(88, 183, 255, ${alpha})`;
  }

  function drawPanelAtmosphere(ctx, panel, rect) {
    ctx.save();
    if (panel.key === "A") {
      const haze = clamp(0.08 + panel.metrics.waitingNow * 0.02, 0.08, 0.24);
      const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      wash.addColorStop(0, `rgba(240, 178, 77, ${haze * 0.9})`);
      wash.addColorStop(1, `rgba(213, 103, 77, ${haze * 0.45})`);
      ctx.fillStyle = wash;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

      for (const stand of app.world.stands) {
        const point = mapWorldToRect(rect, stand);
        const glow = ctx.createRadialGradient(point.x, point.y, 4, point.x, point.y, 34);
        glow.addColorStop(0, "rgba(255, 220, 168, 0.16)");
        glow.addColorStop(1, "rgba(255, 220, 168, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 34, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const confidence = clamp((panel.metrics.availabilityScore + panel.metrics.convenienceScore) / 10, 0.2, 1);
      const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      wash.addColorStop(0, `rgba(28, 186, 150, ${0.07 + confidence * 0.08})`);
      wash.addColorStop(1, `rgba(59, 156, 243, ${0.05 + confidence * 0.07})`);
      ctx.fillStyle = wash;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

      for (const zone of app.world.zones) {
        const center = mapWorldToRect(rect, zone.center);
        const radius = (zone.r / app.world.w) * rect.w * 0.95;
        const glow = ctx.createRadialGradient(center.x, center.y, radius * 0.12, center.x, center.y, radius);
        glow.addColorStop(0, `rgba(28, 186, 150, ${0.07 + confidence * 0.08})`);
        glow.addColorStop(1, "rgba(28, 186, 150, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawTrails(ctx, panel, rect) {
    const trailWindow = app.reduceMotion ? CONFIG.visuals.trailSecondsReduced : CONFIG.visuals.trailSeconds;
    for (const driver of panel.drivers) {
      if (driver.state === DRIVER_STATE.OFFSHIFT) {
        continue;
      }
      for (let index = 1; index < driver.trail.length; index += 1) {
        const a = driver.trail[index - 1];
        const b = driver.trail[index];
        if (a.state === DRIVER_STATE.OFFSHIFT || b.state === DRIVER_STATE.OFFSHIFT || !STATE_COLORS[b.state]) {
          continue;
        }
        const age = clamp((app.realRunSec - b.tReal) / trailWindow, 0, 1);
        const alpha = 1 - age;
        if (alpha <= 0) {
          continue;
        }
        const start = mapWorldToRect(rect, a);
        const end = mapWorldToRect(rect, b);
        ctx.strokeStyle = `${STATE_COLORS[b.state]}${Math.round(alpha * 180).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = b.state === DRIVER_STATE.ON_TRIP ? 3.4 : 2.2;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    }
  }

  function drawTaxiStands(ctx, rect) {
    for (const stand of app.world.stands) {
      const point = mapWorldToRect(rect, stand);
      ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
      roundRectPath(ctx, point.x - 11, point.y - 11, 22, 22, 7);
      ctx.fill();
      ctx.strokeStyle = "rgba(19, 63, 69, 0.78)";
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.fillStyle = "rgba(19, 63, 69, 0.88)";
      roundRectPath(ctx, point.x - 4.5, point.y - 4.5, 9, 9, 3);
      ctx.fill();
    }
  }

  function drawRequests(ctx, panel, rect) {
    const timeSeed = app.realRunSec;
    for (const requestId of panel.waitingIds) {
      const request = panel.requests.get(requestId);
      if (!request || (request.state !== REQUEST_STATE.WAITING && request.state !== REQUEST_STATE.ASSIGNED)) {
        continue;
      }

      const point = mapWorldToRect(rect, request.pickup);
      const waitMin = panel.currentMin - request.tCreatedMin;
      const color = getRequestColor(waitMin);

      if (request.state === REQUEST_STATE.WAITING) {
        if (app.reduceMotion) {
          ctx.strokeStyle = getRequestColor(waitMin, 0.22);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const rings = waitMin > 7 ? 2 : 1;
          for (let ring = 0; ring < rings; ring += 1) {
            const cycle = (timeSeed * 0.55 + request.numericId * 0.17 + ring * 0.33) % 1;
            const radius = 7 + cycle * (18 + waitMin * 0.7);
            ctx.strokeStyle = getRequestColor(waitMin, (1 - cycle) * 0.24);
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      if (request.source === "elastic") {
        const pulse = app.reduceMotion ? 0.4 : (Math.sin(timeSeed * 4 + request.numericId * 0.1) + 1) * 0.5;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 + pulse * 0.24})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 11 + pulse * 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y - 2, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(point.x, point.y + 8);
      ctx.lineTo(point.x - 4, point.y + 1);
      ctx.lineTo(point.x + 4, point.y + 1);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawDriver(ctx, rect, driver) {
    const point = mapWorldToRect(rect, driver.pos);
    const ring = STATE_COLORS[driver.state];
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(driver.heading || 0);

    ctx.strokeStyle = ring;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.96)";
    roundRectPath(ctx, -7.5, -4.8, 15, 9.6, 3.6);
    ctx.fill();
    ctx.strokeStyle = "rgba(33,55,60,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "rgba(22,51,56,0.7)";
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(9.5, -2.4);
    ctx.lineTo(9.5, 2.4);
    ctx.closePath();
    ctx.fill();

    if (driver.state === DRIVER_STATE.ON_TRIP) {
      ctx.fillStyle = "#2aaf72";
      ctx.beginPath();
      ctx.arc(-7.5, -7.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDrivers(ctx, panel, rect) {
    for (const driver of panel.drivers) {
      if (driver.state === DRIVER_STATE.OFFSHIFT) {
        continue;
      }
      drawDriver(ctx, rect, driver);
    }
  }

  function drawBezierAnimations(ctx, panel, rect) {
    for (const item of panel.beziers) {
      const age = clamp((app.realRunSec - item.bornAt) / CONFIG.visuals.matchBezierLifespanSec, 0, 1);
      const progress = app.reduceMotion ? 1 : easeOutCubic(age);
      const alpha = 1 - age;
      const start = mapWorldToRect(rect, item.start);
      const end = mapWorldToRect(rect, item.end);
      const control = {
        x: (start.x + end.x) / 2,
        y: Math.min(start.y, end.y) - Math.abs(end.x - start.x) * 0.12 - 24,
      };
      const linePoints = [];
      for (let step = 0; step <= 18; step += 1) {
        const t = (step / 18) * progress;
        linePoints.push({
          x: square(1 - t) * start.x + 2 * (1 - t) * t * control.x + square(t) * end.x,
          y: square(1 - t) * start.y + 2 * (1 - t) * t * control.y + square(t) * end.y,
        });
      }

      ctx.strokeStyle = `rgba(31, 115, 218, ${alpha * 0.36})`;
      ctx.lineWidth = 7.4;
      ctx.beginPath();
      for (let step = 0; step < linePoints.length; step += 1) {
        const point = linePoints[step];
        if (step === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();

      ctx.strokeStyle = `rgba(83, 157, 255, ${alpha})`;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      for (let step = 0; step < linePoints.length; step += 1) {
        const point = linePoints[step];
        if (step === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();

      if (!app.reduceMotion) {
        const travel = (app.realRunSec * 2.6 + item.bornAt * 0.85) % 1;
        const pulseIndex = Math.min(linePoints.length - 1, Math.round(travel * (linePoints.length - 1)));
        const pulse = linePoints[pulseIndex];
        const glow = ctx.createRadialGradient(pulse.x, pulse.y, 0, pulse.x, pulse.y, 14);
        glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.92})`);
        glow.addColorStop(0.35, `rgba(83, 157, 255, ${alpha * 0.9})`);
        glow.addColorStop(1, "rgba(83, 157, 255, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = `rgba(31, 115, 218, ${alpha * 0.96})`;
      ctx.beginPath();
      ctx.arc(end.x, end.y, 2.8 + (1 - age) * 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.72})`;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.arc(end.x, end.y, 6 + (1 - age) * 4.6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(31, 115, 218, ${alpha * 0.55})`;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(end.x, end.y, 10 + (1 - age) * 6.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawHudMetricCard(ctx, x, y, w, h, label, value, accentFill, accentStroke) {
    ctx.fillStyle = accentFill;
    ctx.strokeStyle = accentStroke;
    ctx.lineWidth = 1;
    roundRectPath(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();

    const labelFontSize = label.length > 9 ? 7 : 8;
    const valueFontSize = value.length > 7 ? 9 : 10;
    ctx.fillStyle = "rgba(22,51,56,0.56)";
    ctx.font = `800 ${labelFontSize}px Aptos, Segoe UI, sans-serif`;
    ctx.fillText(label, x + 6, y + 10);

    ctx.fillStyle = "#183338";
    ctx.font = `700 ${valueFontSize}px Bahnschrift, Aptos, sans-serif`;
    ctx.fillText(value, x + 6, y + 19);
  }

  function drawPanelHud(ctx, panel, rect) {
    const metrics = panel.metrics;
    const hudX = rect.x + 12;
    const hudY = rect.y + 12;
    if (isMobileStageLayout()) {
      const labelText = panel.key === "A" ? "A | Stand wait" : "B | Dispatch";
      const tagW = panel.key === "A" ? 116 : 104;
      const tagH = 28;
      const fill = panel.key === "A" ? "rgba(240, 178, 77, 0.24)" : "rgba(28, 186, 150, 0.24)";
      const stroke = panel.key === "A" ? "rgba(161, 103, 9, 0.9)" : "rgba(8, 92, 73, 0.92)";

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.strokeStyle = "rgba(31,72,80,0.12)";
      ctx.lineWidth = 1;
      roundRectPath(ctx, hudX, hudY, tagW, tagH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = fill;
      roundRectPath(ctx, hudX, hudY, tagW, 5, 5);
      ctx.fill();

      ctx.fillStyle = stroke;
      ctx.font = "800 10px Aptos, Segoe UI, sans-serif";
      ctx.fillText(labelText, hudX + 10, hudY + 18);
      return;
    }

    const hudW = Math.min(rect.w * 0.44, 212);
    const hudH = 128;
    const accentFill = panel.key === "A" ? "rgba(240, 178, 77, 0.12)" : "rgba(28, 186, 150, 0.12)";
    const accentStroke = panel.key === "A" ? "rgba(240, 178, 77, 0.24)" : "rgba(28, 186, 150, 0.24)";

    ctx.fillStyle = "rgba(255,255,255,0.84)";
    ctx.strokeStyle = "rgba(31,72,80,0.16)";
    ctx.lineWidth = 1;
    roundRectPath(ctx, hudX, hudY, hudW, hudH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = panel.key === "A" ? "rgba(240, 178, 77, 0.95)" : "rgba(28, 186, 150, 0.95)";
    roundRectPath(ctx, hudX, hudY, hudW, 6, 6);
    ctx.fill();

    ctx.fillStyle = "rgba(22,51,56,0.55)";
    ctx.font = "800 10px Aptos, Segoe UI, sans-serif";
    ctx.fillText(panel.key === "A" ? "A | STAND WAIT" : "B | DISPATCH", hudX + 12, hudY + 21);

    ctx.fillStyle = "#183338";
    ctx.font = "700 14px Bahnschrift, Aptos, sans-serif";
    ctx.fillText(panel.label, hudX + 12, hudY + 40);

    ctx.fillStyle = "rgba(22,51,56,0.62)";
    ctx.font = "600 9px Aptos, Segoe UI, sans-serif";
    ctx.fillText("Customer + driver snapshot", hudX + 12, hudY + 54);

    const innerX = hudX + 12;
    const innerY = hudY + 61;
    const innerW = hudW - 24;
    const gap = 6;
    const cardW = (innerW - gap * 2) / 3;
    const cardH = 23;
    const cards = [
      { label: "Rides", value: String(metrics.completedTrips) },
      { label: "Cost", value: formatCurrency(metrics.avgRideCost, 1) },
      { label: "Same pay", value: formatHours(metrics.hoursToTargetPay) },
      { label: "Availability", value: `${metrics.availabilityScore.toFixed(1)}/5` },
      { label: "Idle", value: formatHoursMinutes(metrics.idleHoursPerDriver) },
      { label: "8h pay", value: formatCurrency(metrics.driverTakeHomePerDriver, 0) },
    ];

    cards.forEach((card, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      drawHudMetricCard(
        ctx,
        innerX + col * (cardW + gap),
        innerY + row * (cardH + gap),
        cardW,
        cardH,
        card.label,
        card.value,
        accentFill,
        accentStroke
      );
    });
  }

  function drawPanel(ctx, panel, rect) {
    ctx.save();
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 24);
    ctx.clip();
    ctx.drawImage(app.canvas.staticLayer, rect.x, rect.y, rect.w, rect.h);
    drawPanelAtmosphere(ctx, panel, rect);
    drawTrails(ctx, panel, rect);
    if (panel.key === "A") {
      drawTaxiStands(ctx, rect);
    }
    drawRequests(ctx, panel, rect);
    drawDrivers(ctx, panel, rect);
    if (panel.key === "B") {
      drawBezierAnimations(ctx, panel, rect);
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(34,61,67,0.16)";
    ctx.lineWidth = 1.2;
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 24);
    ctx.stroke();
    drawPanelHud(ctx, panel, rect);
  }

  function render() {
    if (!app.canvas.ctx || !app.simulation) {
      return;
    }

    rebuildStaticLayer();

    const ctx = app.canvas.ctx;
    const width = app.canvas.width;
    const height = app.canvas.height;
    ctx.clearRect(0, 0, width, height);

    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, "#edf5f2");
    background.addColorStop(1, "#d9e6e2");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const rects = getPanelRects();
    drawPanel(ctx, app.simulation.panels.A, rects.A);
    drawPanel(ctx, app.simulation.panels.B, rects.B);

    ctx.strokeStyle = "rgba(22,51,56,0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (isMobileStageLayout()) {
      const y = rects.A.y + rects.A.h + 5;
      ctx.moveTo(rects.A.x + 18, y);
      ctx.lineTo(rects.A.x + rects.A.w - 18, y);
    } else {
      const x = rects.A.x + rects.A.w + 8;
      ctx.moveTo(x, rects.A.y + 24);
      ctx.lineTo(x, rects.A.y + rects.A.h - 24);
    }
    ctx.stroke();

    app.needsRender = false;
  }

  function resizeCanvas() {
    const frame = dom.canvas.parentElement;
    const width = Math.max(320, frame.clientWidth - 2);
    const height =
      width < 760
        ? clamp(Math.round(width * 1.28), 480, 780)
        : clamp(Math.round(width * 0.56), 360, 540);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    app.canvas.width = width;
    app.canvas.height = height;
    app.canvas.dpr = dpr;

    dom.canvas.width = Math.round(width * dpr);
    dom.canvas.height = Math.round(height * dpr);
    dom.canvas.style.width = `${width}px`;
    dom.canvas.style.height = `${height}px`;

    app.canvas.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    app.canvas.staticKey = "";
    app.needsRender = true;
    scheduleEmbedHeight();
  }

  function clearReplayTimer() {
    if (!app.replayTimerId) {
      return;
    }
    window.clearTimeout(app.replayTimerId);
    app.replayTimerId = 0;
  }

  function resetSimulation() {
    clearReplayTimer();
    buildSimulation();
    app.running = true;
    app.finished = false;
    app.currentSimMin = 0;
    app.realRunSec = 0;
    app.lastFrameMs = 0;
    app.accumulatorMin = 0;
    app.needsRender = true;
    dom.summaryLive.textContent = "";
    setSummaryOverlayVisible(false);
    updateReadouts();
    scheduleEmbedHeight();
  }

  function runSimulation() {
    if (app.finished && dom.summaryOverlay && !dom.summaryOverlay.hidden) {
      return;
    }
    if (app.finished) {
      resetSimulation();
      return;
    }
    clearReplayTimer();
    app.running = true;
    app.lastFrameMs = 0;
    app.needsRender = true;
    updateReadouts();
  }

  function pauseSimulation() {
    clearReplayTimer();
    app.running = false;
    app.needsRender = true;
    updateReadouts();
  }

  function togglePlayback() {
    if (app.running) {
      pauseSimulation();
      return;
    }
    runSimulation();
  }

  function updateSimulationSpeed(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    app.settings.speed = parsed;
    if (dom.heroSpeedSelect && dom.heroSpeedSelect.value !== String(parsed)) {
      dom.heroSpeedSelect.value = String(parsed);
    }
  }

  function setupEmbedHeight(root) {
    if (!isEmbed || !root) {
      return () => {};
    }

    let rafId = 0;
    let lastHeight = 0;
    let forceDispatch = false;
    let forceDispatchesRemaining = 0;

    const measureHeight = () => {
      const doc = document.documentElement;
      const body = document.body;
      const docHeight = Math.ceil(
        Math.max(
          doc ? doc.scrollHeight : 0,
          doc ? doc.offsetHeight : 0,
          body ? body.scrollHeight : 0,
          body ? body.offsetHeight : 0
        )
      );
      const rect = root.getBoundingClientRect();
      const styles = getComputedStyle(root);
      const marginTop = parseFloat(styles.marginTop) || 0;
      const marginBottom = parseFloat(styles.marginBottom) || 0;
      const rootHeight = Math.ceil(rect.height + marginTop + marginBottom);
      return rootHeight > 0 ? rootHeight : docHeight;
    };

    const sendHeight = () => {
      rafId = 0;
      const height = measureHeight();
      const shouldForce = forceDispatch || forceDispatchesRemaining > 0;
      forceDispatch = false;
      if (!shouldForce && Math.abs(height - lastHeight) < 1) {
        return;
      }
      lastHeight = height;
      if (forceDispatchesRemaining > 0) {
        forceDispatchesRemaining -= 1;
      }
      document.documentElement.style.minHeight = `${height}px`;
      document.body.style.minHeight = `${height}px`;
      try {
        const frame = window.frameElement;
        if (frame) {
          frame.style.height = `${height}px`;
          frame.setAttribute("height", String(height));
        }
      } catch (_error) {
      }
      try {
        window.parent.postMessage({ type: "widget:resize", widget: "sim14-ride-platform", height }, "*");
        window.parent.postMessage({ type: "sim14-ride-platform:height", height }, "*");
        window.parent.postMessage(
          { type: "simfluence-widget:resize", widget: "sim14-ride-platform", height, mode: "default" },
          "*"
        );
      } catch (_error) {
      }
    };

    const schedule = (force = false) => {
      if (force) {
        forceDispatch = true;
      }
      if (!rafId) {
        rafId = window.requestAnimationFrame(sendHeight);
      }
    };

    forceDispatchesRemaining = 8;
    schedule(true);

    window.addEventListener(
      "message",
      (event) => {
        if (!event.data || typeof event.data !== "object") {
          return;
        }
        if (
          event.data.type === "widget:request-height" ||
          event.data.type === "sim14-ride-platform:request-height" ||
          event.data.type === "simfluence-widget:request-height"
        ) {
          schedule(true);
        }
      },
      { passive: true }
    );

    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("load", () => schedule(true));
    window.addEventListener("pageshow", () => schedule(true));
    document.addEventListener("readystatechange", () => schedule(true), { passive: true });
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(schedule);
      observer.observe(root);
    }
    if ("MutationObserver" in window) {
      const observer = new MutationObserver(() => schedule(true));
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }
    if (document.fonts && typeof document.fonts.ready?.then === "function") {
      document.fonts.ready.then(() => schedule(true)).catch(() => {});
    }

    window.setTimeout(() => schedule(true), 60);
    window.setTimeout(() => schedule(true), 280);
    window.setTimeout(() => schedule(true), 900);
    window.setTimeout(() => schedule(true), 1800);
    window.setTimeout(() => schedule(true), 3200);
    return schedule;
  }

  const scheduleEmbedHeight = setupEmbedHeight(dom.shell || dom.root);

  function loop(frameMs) {
    window.requestAnimationFrame(loop);

    if (!app.running) {
      app.lastFrameMs = frameMs;
      if (app.needsRender) {
        render();
      }
      return;
    }

    const dtSec = Math.min(0.1, app.lastFrameMs ? (frameMs - app.lastFrameMs) / 1000 : 0);
    app.lastFrameMs = frameMs;
    app.realRunSec += dtSec;
    app.accumulatorMin += dtSec * CONFIG.sim.minutesPerSecond * app.settings.speed;

    while (app.accumulatorMin >= CONFIG.sim.fixedStepMinutes) {
      simStep(CONFIG.sim.fixedStepMinutes);
      app.accumulatorMin -= CONFIG.sim.fixedStepMinutes;
    }

    render();
  }

  function bindEvents() {
    dom.heroRunButton.addEventListener("click", togglePlayback);
    if (dom.heroSpeedSelect) {
      dom.heroSpeedSelect.value = String(app.settings.speed);
      dom.heroSpeedSelect.addEventListener("change", (event) => {
        updateSimulationSpeed(event.currentTarget.value);
      });
    }
    if (dom.summaryCloseButton) {
      dom.summaryCloseButton.addEventListener("click", dismissSummaryOverlay);
    }
    window.addEventListener("resize", resizeCanvas, { passive: true });
    document.addEventListener("visibilitychange", () => {
      app.lastFrameMs = 0;
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        resizeCanvas();
        scheduleEmbedHeight();
      });
    }

    if (reduceMotionMedia.addEventListener) {
      reduceMotionMedia.addEventListener("change", () => {
        app.reduceMotion = reduceMotionMedia.matches;
        app.needsRender = true;
      });
    } else if (reduceMotionMedia.addListener) {
      reduceMotionMedia.addListener(() => {
        app.reduceMotion = reduceMotionMedia.matches;
        app.needsRender = true;
      });
    }
  }

  function init() {
    resizeCanvas();
    bindEvents();
    resetSimulation();
    window.requestAnimationFrame(loop);
  }

  init();
})();
