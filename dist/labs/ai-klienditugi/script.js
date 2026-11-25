(() => {
  "use strict";

  const RUN_DAYS = 90;
  const BASE_DAYS_PER_SECOND = 2.05;
  const AUTOMATED_SUPPORT_DURATION_MULTIPLIER = 2.25;
  const MAX_DRAWN_ITEMS = 110;
  const NODE_SIZE_SCALE = 0.7;
  const NODE_LABEL_FONT_SIZE = 12;

  const CONTROL_KEYS = [
    "automationCoverage",
    "agentCoordination",
    "humanOversight"
  ];

  const PRESETS = Object.freeze({
    customerOps: {
      label: "Customer support operation",
      baselineCycle: 8.9,
      baselineVolume: 238,
      costPerDay: 640,
      caseValue: 460,
      controls: {
        demandIntensity: 74,
        processVariance: 58,
        automationCoverage: 78,
        agentCoordination: 76,
        humanOversight: 68,
        integrationMaturity: 70
      },
      workKinds: [
        { label: "billing dispute", color: "#4254a8", weight: 26, value: 420 },
        { label: "retention risk", color: "#d95f4f", weight: 21, value: 760 },
        { label: "technical incident", color: "#188fbd", weight: 24, value: 560 },
        { label: "onboarding blocker", color: "#0b8f7a", weight: 17, value: 680 },
        { label: "policy exception", color: "#d89a20", weight: 12, value: 520 }
      ]
    },
    financeClose: {
      label: "Finance close",
      baselineCycle: 8.8,
      baselineVolume: 142,
      costPerDay: 760,
      caseValue: 540,
      controls: {
        demandIntensity: 58,
        processVariance: 54,
        automationCoverage: 66,
        agentCoordination: 62,
        humanOversight: 78,
        integrationMaturity: 56
      },
      workKinds: [
        { label: "invoice", color: "#4254a8", weight: 30, value: 430 },
        { label: "accrual", color: "#d89a20", weight: 22, value: 620 },
        { label: "variance", color: "#d95f4f", weight: 18, value: 780 },
        { label: "reconcile", color: "#0b8f7a", weight: 30, value: 520 }
      ]
    },
    salesOps: {
      label: "Sales operations",
      baselineCycle: 5.4,
      baselineVolume: 214,
      costPerDay: 690,
      caseValue: 470,
      controls: {
        demandIntensity: 76,
        processVariance: 42,
        automationCoverage: 79,
        agentCoordination: 74,
        humanOversight: 58,
        integrationMaturity: 67
      },
      workKinds: [
        { label: "lead", color: "#0b8f7a", weight: 32, value: 410 },
        { label: "proposal", color: "#4254a8", weight: 24, value: 560 },
        { label: "pricing", color: "#d89a20", weight: 22, value: 510 },
        { label: "renewal", color: "#d95f4f", weight: 22, value: 470 }
      ]
    },
    supplyChain: {
      label: "Supply chain exceptions",
      baselineCycle: 7.6,
      baselineVolume: 164,
      costPerDay: 880,
      caseValue: 640,
      controls: {
        demandIntensity: 72,
        processVariance: 68,
        automationCoverage: 63,
        agentCoordination: 69,
        humanOversight: 70,
        integrationMaturity: 58
      },
      workKinds: [
        { label: "delay", color: "#d95f4f", weight: 28, value: 710 },
        { label: "supplier", color: "#d89a20", weight: 24, value: 680 },
        { label: "stockout", color: "#4254a8", weight: 22, value: 760 },
        { label: "routing", color: "#0b8f7a", weight: 26, value: 520 }
      ]
    }
  });

  const AGENTS = Object.freeze([
    {
      id: "intake",
      label: "AI case intake",
      role: "Detects intent and urgency",
      color: "#4254a8"
    },
    {
      id: "orchestrator",
      label: "Service orchestrator",
      role: "Coordinates case workflow",
      color: "#0b8f7a"
    },
    {
      id: "knowledge",
      label: "Knowledge agent",
      role: "Finds policy and history",
      color: "#188fbd"
    },
    {
      id: "resolution",
      label: "Resolution agent",
      role: "Prepares customer actions",
      color: "#0e9d8b"
    },
    {
      id: "validator",
      label: "Quality guardrail",
      role: "Checks risk and tone",
      color: "#d89a20"
    },
    {
      id: "human",
      label: "Human escalation lead",
      role: "Handles sensitive cases",
      color: "#d95f4f"
    }
  ]);

  const SPECIALIST_PODS = Object.freeze([
    "specialistDiscovery",
    "policyDecision",
    "specialistDrafting"
  ]);

  const NODE_LABELS = Object.freeze({
    intake: "AI intake",
    sentimentScan: "Intent + sentiment",
    customerContext: "Customer context",
    orchestrator: "Case triage",
    specialistDiscovery: "Knowledge search",
    policyDecision: "Policy check",
    specialistDrafting: "Resolution agent",
    validator: "Quality gate",
    actionExecutor: "Actions",
    human: "Escalation",
    delivery: "Resolved"
  });

  const PEOPLE_NODE_LABELS = Object.freeze({
    peopleIntake: "Manual intake",
    peopleQueue: "Queue sorting",
    peopleAnalyst: "Support rep",
    peopleCrm: "CRM lookup",
    peopleSpecialist: "Specialist",
    peopleBackOffice: "Back office",
    peopleReviewer: "Manual review",
    peopleManager: "Supervisor OK",
    peopleFollowup: "Follow-up",
    peopleDelivery: "Closed"
  });

  const dom = {
    body: document.body,
    shell: document.getElementById("automationShell"),
    canvas: document.getElementById("simulationCanvas"),
    peopleCanvas: document.getElementById("peopleCanvas"),
    impactCanvas: document.getElementById("impactCanvas"),
    dayOutput: document.getElementById("dayOutput"),
    runProgress: document.getElementById("runProgress"),
    toggleRun: document.getElementById("toggleRun"),
    resetRun: document.getElementById("resetRun"),
    speedSelect: document.getElementById("speedSelect"),
    agentCanvasMetric: document.getElementById("agentCanvasMetric"),
    peopleCanvasMetric: document.getElementById("peopleCanvasMetric"),
    growthCanvasMetric: document.getElementById("growthCanvasMetric"),
    cycleTimeMetric: document.getElementById("cycleTimeMetric"),
    cycleDeltaMetric: document.getElementById("cycleDeltaMetric"),
    deliveredMetric: document.getElementById("deliveredMetric"),
    throughputMetric: document.getElementById("throughputMetric"),
    costMetric: document.getElementById("costMetric"),
    focusMetric: document.getElementById("focusMetric"),
    exceptionMetric: document.getElementById("exceptionMetric"),
    qualityMetric: document.getElementById("qualityMetric"),
    agentRoster: document.getElementById("agentRoster"),
    summaryDialog: document.getElementById("summaryDialog"),
    summaryClose: document.getElementById("summaryClose"),
    summaryLead: document.getElementById("summaryLead"),
    summaryDelivered: document.getElementById("summaryDelivered"),
    summaryTimeSaved: document.getElementById("summaryTimeSaved"),
    summaryCostSaved: document.getElementById("summaryCostSaved"),
    summaryGrowth: document.getElementById("summaryGrowth")
  };

  const ctx = dom.canvas.getContext("2d");
  const peopleCtx = dom.peopleCanvas.getContext("2d");
  const impactCtx = dom.impactCanvas.getContext("2d");
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    running: !reducedMotion,
    speed: Number(dom.speedSelect.value),
    day: 1,
    spawnBank: 0,
    nextId: 1,
    items: [],
    peopleItems: [],
    completed: [],
    peopleCompleted: [],
    events: [],
    exceptions: 0,
    peopleExceptions: 0,
    humanTouches: 0,
    peopleHumanTouches: 0,
    reworkCount: 0,
    peopleReworkCount: 0,
    timeSaved: 0,
    costAvoided: 0,
    valueCreated: 0,
    lastStamp: 0,
    lastUiRender: 0,
    summaryShown: false,
    workflowKey: "customerOps",
    rng: mulberry32(1),
    embedResizer: null,
    canvasWidth: 1280,
    canvasHeight: 720,
    peopleCanvasWidth: 1280,
    peopleCanvasHeight: 720,
    impactCanvasWidth: 1280,
    impactCanvasHeight: 560
  };

  function clamp(value, min = 0, max = 100) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value, digits = 0) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  function mulberry32(seed) {
    return function random() {
      let value = seed += 0x6d2b79f5;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function getPreset() {
    return PRESETS[state.workflowKey] || PRESETS.customerOps;
  }

  function readControls() {
    const preset = getPreset();
    return { ...preset.controls };
  }

  function buildSeed() {
    const controls = readControls();
    const seedText = `${state.workflowKey}:${CONTROL_KEYS.map((key) => controls[key]).join(":")}`;
    return hashString(seedText) || 1;
  }

  function chooseWeighted(items) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let cursor = state.rng() * total;
    for (const item of items) {
      cursor -= item.weight;
      if (cursor <= 0) return item;
    }
    return items[items.length - 1];
  }

  function calculateModel(controls = readControls()) {
    const preset = getPreset();
    const demandLoad = 0.62 + controls.demandIntensity / 120;
    const variability = controls.processVariance / 100;
    const automation = controls.automationCoverage / 100;
    const coordination = controls.agentCoordination / 100;
    const oversight = controls.humanOversight / 100;
    const integration = controls.integrationMaturity / 100;

    const manualCycle = preset.baselineCycle * (1 + variability * 0.28 + controls.demandIntensity / 260);
    const agentFactor = clamp(
      0.82 - automation * 0.34 - coordination * 0.18 - integration * 0.15 + variability * 0.19,
      0.23,
      0.86
    );
    const agentCycle = manualCycle * agentFactor * AUTOMATED_SUPPORT_DURATION_MULTIPLIER;
    const exceptionProbability = clamp(
      0.38 + variability * 0.28 + controls.demandIntensity / 560
      - automation * 0.18 - coordination * 0.16 - oversight * 0.19 - integration * 0.12,
      0.04,
      0.42
    );
    const reviewProbability = clamp(
      0.42 - automation * 0.34 + oversight * 0.24 + variability * 0.1,
      0.08,
      0.5
    );
    const validationConfidence = clamp(
      22 + controls.automationCoverage * 0.24 + controls.agentCoordination * 0.21
      + controls.humanOversight * 0.27 + controls.integrationMaturity * 0.23
      - controls.processVariance * 0.16,
      0,
      99
    );
    const arrivalRate = preset.baselineVolume / RUN_DAYS * demandLoad;
    const manualThroughputRate = preset.baselineVolume / RUN_DAYS * clamp(
      0.78 - variability * 0.18 - controls.demandIntensity / 520,
      0.44,
      0.78
    );

    return {
      manualCycle,
      agentCycle,
      exceptionProbability,
      reviewProbability,
      validationConfidence,
      arrivalRate,
      manualThroughputRate,
      automationDepth: clamp(
        controls.automationCoverage * 0.42
        + controls.agentCoordination * 0.24
        + controls.integrationMaturity * 0.2
        + controls.humanOversight * 0.14
      )
    };
  }

  function isSpecialistPod(nodeId) {
    return SPECIALIST_PODS.includes(nodeId);
  }

  function chooseSpecialistPod(kind) {
    const label = (kind?.label || "").toLowerCase();

    if (/technical|incident|onboarding/.test(label)) {
      return "specialistDiscovery";
    }

    if (/billing|policy/.test(label)) {
      return "policyDecision";
    }

    if (/retention|cancellation|renewal/.test(label)) {
      return "specialistDrafting";
    }

    if (state.rng() < 0.28) {
      return SPECIALIST_PODS[Math.floor(state.rng() * SPECIALIST_PODS.length)];
    }

    return "specialistDrafting";
  }

  function makeRoute(hasHumanReview, hasRework) {
    const route = [
      "intake",
      "sentimentScan",
      "customerContext",
      "orchestrator",
      "specialistDiscovery",
      "policyDecision",
      "specialistDrafting",
      "validator"
    ];
    if (hasRework) {
      route.push("policyDecision", "specialistDrafting", "validator");
    }
    if (hasHumanReview) {
      route.push("human");
    }
    route.push("actionExecutor");
    route.push("delivery");
    return route;
  }

  function makePeopleRoute(hasHumanReview, hasRework) {
    const route = [
      "peopleIntake",
      "peopleQueue",
      "peopleAnalyst",
      "peopleCrm",
      "peopleSpecialist",
      "peopleBackOffice",
      "peopleReviewer"
    ];
    if (hasRework) {
      route.push("peopleBackOffice", "peopleReviewer");
    }
    if (hasHumanReview) {
      route.push("peopleManager");
    }
    route.push("peopleFollowup");
    route.push("peopleDelivery");
    return route;
  }

  function getPeopleSegmentWeight(from, to) {
    if (to === "peopleQueue") return 0.72;
    if (to === "peopleAnalyst") return 1.15;
    if (to === "peopleCrm") return 0.82;
    if (to === "peopleSpecialist") return from === "peopleReviewer" ? 1.35 : 1.75;
    if (to === "peopleBackOffice") return 1.45;
    if (to === "peopleReviewer") return 1.35;
    if (to === "peopleManager") return 1.2;
    if (to === "peopleFollowup") return 0.82;
    if (to === "peopleDelivery") return 0.72;
    return 1;
  }

  function createWorkItem(seedProgress = false) {
    const preset = getPreset();
    const controls = readControls();
    const model = calculateModel(controls);
    const kind = chooseWeighted(preset.workKinds);
    const complexity = clamp(0.56 + state.rng() * 0.86 + controls.processVariance / 280, 0.55, 1.78);
    const hasException = state.rng() < model.exceptionProbability * clamp(complexity, 0.75, 1.55);
    const humanReview = hasException || state.rng() < model.reviewProbability;
    const reworkRisk = clamp(0.08 + controls.processVariance / 420 - controls.humanOversight / 520, 0.03, 0.26);
    const hasRework = hasException && state.rng() < reworkRisk;
    const route = makeRoute(humanReview, hasRework);
    const manualCycle = model.manualCycle * complexity * (0.88 + state.rng() * 0.24);

    const item = {
      id: state.nextId,
      label: kind.label,
      color: kind.color,
      value: kind.value || preset.caseValue,
      route,
      segment: 0,
      progress: 0,
      startDay: state.day,
      complexity,
      hasException,
      hasRework,
      humanTouched: humanReview,
      manualCycle,
      loggedException: false,
      noise: route.map(() => 0.82 + state.rng() * 0.42)
    };

    state.nextId += 1;

    if (seedProgress) {
      item.segment = Math.floor(state.rng() * Math.max(1, route.length - 2));
      item.progress = state.rng();
      item.startDay = Math.max(1, state.day - state.rng() * model.agentCycle);
    }

    return item;
  }

  function createPeopleItemFrom(agentItem, seedProgress = false) {
    const route = makePeopleRoute(agentItem.humanTouched, agentItem.hasRework);
    const segmentWeights = route.slice(0, -1).map((node, index) => getPeopleSegmentWeight(node, route[index + 1]));
    const totalWeight = segmentWeights.reduce((sum, weight) => sum + weight, 0) || 1;
    const segmentDays = segmentWeights.map((weight) => {
      const jitter = 0.9 + state.rng() * 0.22;
      return Math.max(0.28, agentItem.manualCycle * weight / totalWeight * jitter);
    });

    const item = {
      id: agentItem.id,
      label: agentItem.label,
      color: agentItem.color,
      value: agentItem.value,
      route,
      segment: 0,
      progress: 0,
      startDay: agentItem.startDay,
      complexity: agentItem.complexity,
      hasException: agentItem.hasException,
      hasRework: agentItem.hasRework,
      humanTouched: true,
      manualCycle: agentItem.manualCycle,
      segmentDays
    };

    if (seedProgress) {
      item.segment = Math.floor(state.rng() * Math.max(1, route.length - 2));
      item.progress = state.rng();
      item.startDay = Math.max(1, state.day - state.rng() * agentItem.manualCycle * 0.72);
    }

    return item;
  }

  function createWorkPair(seedProgress = false) {
    const agentItem = createWorkItem(seedProgress);
    const peopleItem = createPeopleItemFrom(agentItem, seedProgress);
    return { agentItem, peopleItem };
  }

  function resetSimulation({ keepRunning = state.running } = {}) {
    state.day = 1;
    state.spawnBank = 0;
    state.nextId = 1;
    state.items = [];
    state.peopleItems = [];
    state.completed = [];
    state.peopleCompleted = [];
    state.events = [];
    state.exceptions = 0;
    state.peopleExceptions = 0;
    state.humanTouches = 0;
    state.peopleHumanTouches = 0;
    state.reworkCount = 0;
    state.peopleReworkCount = 0;
    state.timeSaved = 0;
    state.costAvoided = 0;
    state.valueCreated = 0;
    state.summaryShown = false;
    state.lastStamp = 0;
    state.lastUiRender = 0;
    state.rng = mulberry32(buildSeed());
    state.running = keepRunning && !reducedMotion;
    dom.summaryDialog.hidden = true;

    const seededCount = reducedMotion ? 5 : 8;
    for (let index = 0; index < seededCount; index += 1) {
      const pair = createWorkPair(true);
      state.items.push(pair.agentItem);
      state.peopleItems.push(pair.peopleItem);
    }

    logEvent("AI customer support automation starts with triage, knowledge retrieval, policy checks, resolution, and human escalation connected.");
    renderUi(true);
    draw();
    updatePlaybackButton();
  }

  function spawnWork(deltaDays) {
    const model = calculateModel();
    state.spawnBank += model.arrivalRate * deltaDays;

    let guard = 0;
    while (state.spawnBank >= 1 && guard < 8) {
      const pair = createWorkPair();
      state.items.push(pair.agentItem);
      state.peopleItems.push(pair.peopleItem);
      state.spawnBank -= 1;
      guard += 1;
    }
  }

  function getReviewQueueLength() {
    return state.items.filter((item) => item.route[item.segment] === "human" || item.route[item.segment + 1] === "human").length;
  }

  function segmentDuration(item) {
    const controls = readControls();
    const from = item.route[item.segment];
    const to = item.route[item.segment + 1];
    const reviewQueue = getReviewQueueLength();
    const noise = item.noise[item.segment] || 1;

    let base = 0.9;
    if (to === "sentimentScan") base = 0.26;
    if (to === "customerContext") base = 0.34;
    if (to === "orchestrator") base = 0.38;
    if (to === "specialistDiscovery") base = 0.58;
    if (to === "policyDecision") base = from === "validator" ? 0.68 : 0.62;
    if (to === "specialistDrafting") base = 0.74;
    if (to === "validator") base = 0.58;
    if (to === "actionExecutor") base = 0.34;
    if (to === "human") base = 1.1;
    if (to === "delivery") base = 0.46;

    if (to === "human" || from === "human") {
      return base
        * (0.74 + item.complexity * 0.52)
        * (0.88 + controls.humanOversight / 170)
        * (1 + reviewQueue / 24)
        * noise
        * AUTOMATED_SUPPORT_DURATION_MULTIPLIER;
    }

    const automationFactor = clamp(
      1.12 - controls.automationCoverage / 150 - controls.agentCoordination / 250 - controls.integrationMaturity / 260,
      0.32,
      1.12
    );
    const varianceFactor = 0.88 + controls.processVariance / 230;
    const demandFactor = 0.92 + Math.max(0, state.items.length - 16) / 160;

    return base
      * automationFactor
      * varianceFactor
      * demandFactor
      * item.complexity
      * noise
      * AUTOMATED_SUPPORT_DURATION_MULTIPLIER;
  }

  function getPeopleQueueLength() {
    return state.peopleItems.filter((item) => {
      const target = item.route[item.segment + 1] || item.route[item.segment];
      return target === "peopleReviewer" || target === "peopleManager";
    }).length;
  }

  function peopleSegmentDuration(item) {
    const controls = readControls();
    const target = item.route[item.segment + 1] || item.route[item.segment];
    const base = item.segmentDays[item.segment] || 1;
    const queueFactor = 1 + Math.max(0, state.peopleItems.length - 10) / 42;
    const reviewFactor = target === "peopleReviewer" || target === "peopleManager"
      ? 1 + getPeopleQueueLength() / 18
      : 1;
    const varianceFactor = 0.96 + controls.processVariance / 170;

    return base * queueFactor * reviewFactor * varianceFactor;
  }

  function advancePeopleSimulation(deltaDays) {
    const completedNow = [];

    for (const item of state.peopleItems) {
      let budget = deltaDays;
      let loopGuard = 0;

      while (budget > 0 && loopGuard < 5) {
        const duration = Math.max(0.16, peopleSegmentDuration(item));
        const remainingSegmentDays = (1 - item.progress) * duration;

        if (budget < remainingSegmentDays) {
          item.progress += budget / duration;
          budget = 0;
        } else {
          item.progress = 0;
          item.segment += 1;
          budget -= remainingSegmentDays;

          if (item.segment >= item.route.length - 1) {
            completedNow.push(item);
            break;
          }
        }

        loopGuard += 1;
      }
    }

    if (completedNow.length) {
      state.peopleItems = state.peopleItems.filter((item) => !completedNow.includes(item));
      completedNow.forEach(completePeopleItem);
    }
  }

  function advanceSimulation(deltaDays) {
    if (state.day >= RUN_DAYS) return;

    state.day = Math.min(RUN_DAYS, state.day + deltaDays);
    spawnWork(deltaDays);

    const completedNow = [];

    for (const item of state.items) {
      let budget = deltaDays;
      let loopGuard = 0;

      while (budget > 0 && loopGuard < 5) {
        const duration = Math.max(0.08, segmentDuration(item));
        const remainingSegmentDays = (1 - item.progress) * duration;

        if (budget < remainingSegmentDays) {
          item.progress += budget / duration;
          budget = 0;
        } else {
          item.progress = 0;
          item.segment += 1;
          budget -= remainingSegmentDays;

          if (item.route[item.segment] === "human" && item.hasException && !item.loggedException) {
            item.loggedException = true;
            logEvent(`Quality guardrail escalated a ${item.label} case for human-in-the-loop review.`);
          }

          if (item.segment >= item.route.length - 1) {
            completedNow.push(item);
            break;
          }
        }

        loopGuard += 1;
      }
    }

    if (completedNow.length) {
      state.items = state.items.filter((item) => !completedNow.includes(item));
      completedNow.forEach(completeItem);
    }

    advancePeopleSimulation(deltaDays);

    if (state.day >= RUN_DAYS && !state.summaryShown) {
      state.running = false;
      state.summaryShown = true;
      updatePlaybackButton();
      renderUi(true);
      openSummary();
    }
  }

  function completeItem(item) {
    const preset = getPreset();
    const actualCycle = Math.max(0.2, state.day - item.startDay);
    const timeSaved = Math.max(0, item.manualCycle - actualCycle);
    const automationShare = readControls().automationCoverage / 100;
    const costAvoided = timeSaved * preset.costPerDay + item.value * automationShare * 0.18;

    state.completed.push({
      id: item.id,
      label: item.label,
      actualCycle,
      manualCycle: item.manualCycle,
      timeSaved,
      costAvoided,
      humanTouched: item.humanTouched,
      hasException: item.hasException,
      hasRework: item.hasRework
    });

    state.timeSaved += timeSaved;
    state.costAvoided += costAvoided;
    state.valueCreated += item.value + timeSaved * preset.caseValue * 0.08;
    if (item.hasException) state.exceptions += 1;
    if (item.humanTouched) state.humanTouches += 1;
    if (item.hasRework) state.reworkCount += 1;

    if (state.completed.length % 18 === 0) {
      logEvent(`AI support automation resolved ${state.completed.length} cases while preserving human review for sensitive issues.`);
    } else if (!item.humanTouched && state.rng() < 0.12) {
      logEvent(`A ${item.label} case moved through automated support without a manual handoff.`);
    }
  }

  function completePeopleItem(item) {
    const actualCycle = Math.max(0.2, state.day - item.startDay);

    state.peopleCompleted.push({
      id: item.id,
      label: item.label,
      actualCycle,
      hasException: item.hasException,
      hasRework: item.hasRework
    });

    if (item.hasException) state.peopleExceptions += 1;
    if (item.hasRework) state.peopleReworkCount += 1;
    state.peopleHumanTouches += 1;
  }

  function calculateMetrics() {
    const controls = readControls();
    const preset = getPreset();
    const model = calculateModel(controls);
    const completedCount = state.completed.length;
    const peopleCompletedCount = state.peopleCompleted.length;
    const avgActual = completedCount
      ? state.completed.reduce((sum, item) => sum + item.actualCycle, 0) / completedCount
      : model.agentCycle;
    const avgManual = peopleCompletedCount
      ? state.peopleCompleted.reduce((sum, item) => sum + item.actualCycle, 0) / peopleCompletedCount
      : model.manualCycle;
    const expectedPeopleDelivered = Math.max(1, Math.min(state.nextId - 1, state.day * model.manualThroughputRate));
    const peopleComparisonCount = Math.max(1, peopleCompletedCount || expectedPeopleDelivered);
    const throughputGain = (completedCount / peopleComparisonCount - 1) * 100;
    const exceptionRate = completedCount ? state.exceptions / completedCount * 100 : model.exceptionProbability * 100;
    const peopleExceptionRate = peopleCompletedCount
      ? state.peopleExceptions / peopleCompletedCount * 100
      : clamp(18 + controls.processVariance * 0.16, 0, 45);
    const humanFocus = completedCount ? (1 - state.humanTouches / completedCount) * 100 : model.automationDepth * 0.62;
    const backlog = state.items.length;
    const peopleBacklog = state.peopleItems.length;
    const reviewQueue = getReviewQueueLength();
    const peopleReviewQueue = getPeopleQueueLength();
    const cycleReduction = avgManual ? (1 - avgActual / avgManual) * 100 : 0;
    const comparisonCostAvoided = Math.max(
      state.costAvoided,
      (avgManual - avgActual) * Math.max(0, completedCount) * preset.costPerDay
    );
    const roleDaysFreed = completedCount
      ? Math.max(
        state.timeSaved * 0.42 + completedCount * 0.34,
        Math.max(0, avgManual - avgActual) * completedCount * 0.36
      )
      : 0;
    const reassignedPeople = Math.max(0, Math.floor(roleDaysFreed / 18));
    const growthPipeline = Math.max(
      0,
      roleDaysFreed * 1180 + completedCount * preset.caseValue * 0.42
    );
    const costEfficiency = clamp(cycleReduction * 0.72 + model.automationDepth * 0.12, 0, 92);

    return {
      avgActual,
      avgManual,
      completedCount,
      peopleCompletedCount,
      throughputGain,
      exceptionRate,
      peopleExceptionRate,
      humanFocus,
      backlog,
      peopleBacklog,
      reviewQueue,
      peopleReviewQueue,
      cycleReduction,
      validationConfidence: model.validationConfidence,
      automationDepth: model.automationDepth,
      costAvoided: comparisonCostAvoided,
      timeSaved: state.timeSaved,
      roleDaysFreed,
      reassignedPeople,
      growthPipeline,
      costEfficiency,
      model
    };
  }

  function formatMoney(value) {
    if (value >= 1000000) return `$${round(value / 1000000, 1)}m`;
    return `$${Math.round(value / 1000)}k`;
  }

  function formatPercent(value) {
    return `${Math.round(value)}%`;
  }

  function formatPeopleCount(value) {
    const count = Math.round(value);
    return `${count} ${count === 1 ? "person" : "people"}`;
  }

  function formatDays(value) {
    return `${round(value, 1).toFixed(1)} days`;
  }

  function getBacklogLabel(backlog) {
    if (backlog >= 34) return "High";
    if (backlog >= 20) return "Rising";
    return "Low";
  }

  function getCoordinationLabel(value) {
    if (value >= 78) return "Synchronized";
    if (value >= 58) return "Balanced";
    return "Fragmented";
  }

  function renderUi(force = false) {
    const now = performance.now();
    if (!force && now - state.lastUiRender < 120) return;
    state.lastUiRender = now;

    const controls = readControls();
    const metrics = calculateMetrics();
    const preset = getPreset();
    const progress = clamp(state.day / RUN_DAYS * 100);

    dom.dayOutput.textContent = `Day ${Math.floor(state.day)} / ${RUN_DAYS}`;
    dom.runProgress.style.setProperty("--progress", `${progress}%`);
    dom.runProgress.setAttribute("aria-valuenow", String(Math.floor(state.day)));
    dom.agentCanvasMetric.textContent = `${metrics.completedCount} resolved`;
    dom.peopleCanvasMetric.textContent = `${metrics.peopleCompletedCount} resolved`;
    dom.growthCanvasMetric.textContent = `${Math.round(metrics.roleDaysFreed)} role-days freed`;

    const hasFreedCapacity = metrics.roleDaysFreed > 0;
    const hasShiftedPeople = metrics.reassignedPeople > 0;

    dom.cycleTimeMetric.textContent = formatDays(metrics.avgActual);
    dom.cycleDeltaMetric.textContent = `Manual support: ${formatDays(metrics.avgManual)}`;
    dom.deliveredMetric.textContent = `${Math.round(metrics.roleDaysFreed)} role-days`;
    dom.throughputMetric.textContent = hasFreedCapacity
      ? `Moved into retention, onboarding, and knowledge work`
      : `Capacity appears as automated cases resolve`;
    dom.costMetric.textContent = `${formatPercent(metrics.costEfficiency)} less effort`;
    dom.focusMetric.textContent = `Fewer handoffs, reviews, and repeat updates`;
    dom.exceptionMetric.textContent = formatPeopleCount(metrics.reassignedPeople);
    dom.qualityMetric.textContent = hasShiftedPeople
      ? `Retention, onboarding, and knowledge work`
      : `Growth roles open as capacity accumulates`;

    renderAgentRoster();
    syncEmbedHeight();
  }

  function renderAgentRoster() {
    const loads = AGENTS.reduce((map, agent) => {
      map[agent.id] = 0;
      return map;
    }, {});

    state.items.forEach((item) => {
      const target = item.route[item.segment + 1] || item.route[item.segment] || "delivery";
      if ((target === "sentimentScan" || target === "customerContext") && loads.intake !== undefined) {
        loads.intake += 1;
      } else if (target === "specialistDiscovery" && loads.knowledge !== undefined) {
        loads.knowledge += 1;
      } else if (target === "policyDecision" && loads.validator !== undefined) {
        loads.validator += 1;
      } else if ((target === "specialistDrafting" || target === "actionExecutor") && loads.resolution !== undefined) {
        loads.resolution += 1;
      } else if (loads[target] !== undefined) {
        loads[target] += 1;
      }
    });

    dom.agentRoster.replaceChildren();
    AGENTS.forEach((agent) => {
      const item = document.createElement("li");
      const token = document.createElement("i");
      const copy = document.createElement("div");
      const label = document.createElement("strong");
      const role = document.createElement("span");
      const load = document.createElement("small");

      token.className = "agent-token";
      token.style.background = agent.color;
      label.textContent = agent.label;
      role.textContent = agent.role;
      copy.append(label, role);
      load.className = "agent-load";
      load.textContent = `${loads[agent.id]} active`;
      item.append(token, copy, load);
      dom.agentRoster.append(item);
    });
  }

  function logEvent(text) {
    state.events.unshift({
      day: Math.max(1, Math.floor(state.day)),
      text
    });
    state.events = state.events.slice(0, 5);
  }

  function updatePlaybackButton() {
    dom.toggleRun.textContent = state.running ? "Pause" : "Resume";
    dom.toggleRun.setAttribute("aria-pressed", String(state.running));
  }

  function closeSummary() {
    dom.summaryDialog.hidden = true;
    syncEmbedHeight();
  }

  function attachEvents() {
    dom.toggleRun.addEventListener("click", () => {
      if (state.day >= RUN_DAYS) {
        resetSimulation({ keepRunning: true });
        return;
      }
      state.running = !state.running;
      updatePlaybackButton();
      renderUi(true);
    });

    dom.resetRun.addEventListener("click", () => {
      resetSimulation({ keepRunning: true });
    });

    dom.speedSelect.addEventListener("change", () => {
      state.speed = Number(dom.speedSelect.value);
    });

    dom.summaryClose.addEventListener("click", () => {
      closeSummary();
    });

    dom.summaryDialog.addEventListener("click", (event) => {
      if (event.target === dom.summaryDialog) {
        closeSummary();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !dom.summaryDialog.hidden) {
        closeSummary();
        dom.resetRun.focus({ preventScroll: true });
      }
    });
  }

  function openSummary() {
    const metrics = calculateMetrics();
    dom.summaryLead.textContent = metrics.cycleReduction > 45
      ? `Automation resolved ${metrics.completedCount} support cases and freed ${Math.round(metrics.roleDaysFreed)} role-days for growth work.`
      : `The support transformation shows ${metrics.completedCount} automated resolutions, less repetitive work, and capacity shifted into higher-value roles.`;
    dom.summaryDelivered.textContent = String(metrics.completedCount);
    dom.summaryTimeSaved.textContent = `${Math.round(metrics.timeSaved)} days`;
    dom.summaryCostSaved.textContent = `${formatPercent(metrics.costEfficiency)} less effort`;
    dom.summaryGrowth.textContent = formatPeopleCount(metrics.reassignedPeople);
    dom.summaryDialog.hidden = false;
    dom.summaryClose.focus({ preventScroll: true });
    syncEmbedHeight();
  }

  function isCompactCanvas(width, height) {
    return height > width * 0.75;
  }

  function getCanvasNodeConfig(width, compact, people = false) {
    if (compact) {
      return {
        radius: clamp(width * 0.08, 24, 29) * NODE_SIZE_SCALE,
        deliveryRadius: clamp(width * 0.074, 23, 27) * NODE_SIZE_SCALE,
        labelWidth: people ? clamp(width * 0.42, 118, 138) : clamp(width * 0.36, 104, 124),
        labelHeight: 24
      };
    }

    return {
      radius: clamp(width * 0.06, 30, 39) * NODE_SIZE_SCALE,
      deliveryRadius: clamp(width * 0.052, 28, 34) * NODE_SIZE_SCALE,
      labelWidth: people ? clamp(width * 0.2, 110, 124) : clamp(width * 0.17, 96, 112),
      labelHeight: 24
    };
  }

  function getNodeLabelWidth(label, maxWidth) {
    return clamp(label.length * 7.2 + 18, 66, maxWidth);
  }

  function createCanvasNode(width, height, xRatio, yRatio, label, color, radius, labelWidth, labelHeight) {
    return {
      x: width * xRatio,
      y: height * yRatio,
      label,
      color,
      radius,
      labelWidth: getNodeLabelWidth(label, labelWidth),
      labelHeight
    };
  }

  function getCanvasLabelX(center, labelWidth, canvasWidth) {
    return Math.min(
      Math.max(8, center - labelWidth / 2),
      Math.max(8, canvasWidth - labelWidth - 8)
    );
  }

  function getCanvasLabelY(center, radius, labelHeight, canvasHeight, below = false) {
    const target = below
      ? center + radius + 12
      : center - radius - labelHeight - 12;

    return Math.min(
      Math.max(8, target),
      Math.max(8, canvasHeight - labelHeight - 8)
    );
  }

  function getNodes() {
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const compact = isCompactCanvas(w, h);
    const config = getCanvasNodeConfig(w, compact);

    if (compact) {
      const node = (x, y, label, color, radius = config.radius) => (
        createCanvasNode(w, h, x, y, label, color, radius, config.labelWidth, config.labelHeight)
      );

      return {
        intake: node(0.18, 0.11, NODE_LABELS.intake, "#4254a8"),
        sentimentScan: node(0.55, 0.11, NODE_LABELS.sentimentScan, "#6a56c8"),
        customerContext: node(0.27, 0.28, NODE_LABELS.customerContext, "#188fbd"),
        orchestrator: node(0.73, 0.28, NODE_LABELS.orchestrator, "#0b8f7a"),
        specialistDiscovery: node(0.27, 0.45, NODE_LABELS.specialistDiscovery, "#188fbd"),
        policyDecision: node(0.73, 0.45, NODE_LABELS.policyDecision, "#d89a20"),
        specialistDrafting: node(0.27, 0.62, NODE_LABELS.specialistDrafting, "#0e9d8b"),
        validator: node(0.73, 0.62, NODE_LABELS.validator, "#d89a20"),
        human: node(0.28, 0.82, NODE_LABELS.human, "#d95f4f"),
        actionExecutor: node(0.58, 0.82, NODE_LABELS.actionExecutor, "#238b55"),
        delivery: node(0.84, 0.82, NODE_LABELS.delivery, "#4254a8", config.deliveryRadius)
      };
    }

    const top = Math.max(h * 0.28, config.radius + config.labelHeight + 28);
    const mid = h * 0.5;
    const low = Math.min(h * 0.73, h - config.radius - 40);
    const node = (x, y, label, color, radius = config.radius) => (
      createCanvasNode(w, h, x, y, label, color, radius, config.labelWidth, config.labelHeight)
    );

    return {
      intake: node(0.07, mid / h, NODE_LABELS.intake, "#4254a8"),
      sentimentScan: node(0.18, mid / h, NODE_LABELS.sentimentScan, "#6a56c8"),
      customerContext: node(0.30, top / h, NODE_LABELS.customerContext, "#188fbd"),
      orchestrator: node(0.40, mid / h, NODE_LABELS.orchestrator, "#0b8f7a"),
      specialistDiscovery: node(0.50, top / h, NODE_LABELS.specialistDiscovery, "#188fbd"),
      policyDecision: node(0.62, top / h, NODE_LABELS.policyDecision, "#d89a20"),
      specialistDrafting: node(0.58, mid / h, NODE_LABELS.specialistDrafting, "#0e9d8b"),
      validator: node(0.74, mid / h, NODE_LABELS.validator, "#d89a20"),
      human: node(0.72, low / h, NODE_LABELS.human, "#d95f4f"),
      actionExecutor: node(0.84, mid / h, NODE_LABELS.actionExecutor, "#238b55"),
      delivery: node(0.94, mid / h, NODE_LABELS.delivery, "#4254a8", config.deliveryRadius)
    };
  }

  function getPeopleNodes() {
    const w = state.peopleCanvasWidth;
    const h = state.peopleCanvasHeight;
    const compact = isCompactCanvas(w, h);
    const config = getCanvasNodeConfig(w, compact, true);

    if (compact) {
      const node = (x, y, label, color, radius = config.radius) => (
        createCanvasNode(w, h, x, y, label, color, radius, config.labelWidth, config.labelHeight)
      );

      return {
        peopleIntake: node(0.20, 0.1, PEOPLE_NODE_LABELS.peopleIntake, "#4254a8"),
        peopleQueue: node(0.62, 0.1, PEOPLE_NODE_LABELS.peopleQueue, "#6a56c8"),
        peopleAnalyst: node(0.28, 0.33, PEOPLE_NODE_LABELS.peopleAnalyst, "#d89a20"),
        peopleCrm: node(0.72, 0.27, PEOPLE_NODE_LABELS.peopleCrm, "#188fbd"),
        peopleSpecialist: node(0.28, 0.46, PEOPLE_NODE_LABELS.peopleSpecialist, "#188fbd"),
        peopleBackOffice: node(0.72, 0.46, PEOPLE_NODE_LABELS.peopleBackOffice, "#8f6b14"),
        peopleReviewer: node(0.58, 0.64, PEOPLE_NODE_LABELS.peopleReviewer, "#d95f4f"),
        peopleManager: node(0.28, 0.82, PEOPLE_NODE_LABELS.peopleManager, "#8f6b14"),
        peopleFollowup: node(0.62, 0.82, PEOPLE_NODE_LABELS.peopleFollowup, "#238b55"),
        peopleDelivery: node(0.84, 0.82, PEOPLE_NODE_LABELS.peopleDelivery, "#238b55", config.deliveryRadius)
      };
    }

    const mid = h * 0.5;
    const top = Math.max(h * 0.3, config.radius + config.labelHeight + 28);
    const low = Math.min(h * 0.73, h - config.radius - 40);
    const node = (x, y, label, color, radius = config.radius) => (
      createCanvasNode(w, h, x, y, label, color, radius, config.labelWidth, config.labelHeight)
    );

    return {
      peopleIntake: node(0.07, mid / h, PEOPLE_NODE_LABELS.peopleIntake, "#4254a8"),
      peopleQueue: node(0.18, mid / h, PEOPLE_NODE_LABELS.peopleQueue, "#6a56c8"),
      peopleAnalyst: node(0.30, top / h, PEOPLE_NODE_LABELS.peopleAnalyst, "#d89a20"),
      peopleCrm: node(0.42, mid / h, PEOPLE_NODE_LABELS.peopleCrm, "#188fbd"),
      peopleSpecialist: node(0.52, mid / h, PEOPLE_NODE_LABELS.peopleSpecialist, "#188fbd"),
      peopleBackOffice: node(0.62, top / h, PEOPLE_NODE_LABELS.peopleBackOffice, "#8f6b14"),
      peopleReviewer: node(0.74, mid / h, PEOPLE_NODE_LABELS.peopleReviewer, "#d95f4f"),
      peopleManager: node(0.74, low / h, PEOPLE_NODE_LABELS.peopleManager, "#8f6b14"),
      peopleFollowup: node(0.86, mid / h, PEOPLE_NODE_LABELS.peopleFollowup, "#238b55"),
      peopleDelivery: node(0.95, mid / h, PEOPLE_NODE_LABELS.peopleDelivery, "#238b55", config.deliveryRadius)
    };
  }

  function interpolate(a, b, t) {
    const eased = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
    return {
      x: a.x + (b.x - a.x) * eased,
      y: a.y + (b.y - a.y) * eased
    };
  }

  function getItemPosition(item, nodes) {
    const from = nodes[item.route[item.segment]] || nodes.intake;
    const to = nodes[item.route[item.segment + 1]] || nodes.delivery;
    return interpolate(from, to, clamp(item.progress, 0, 1));
  }

  function getPeopleItemPosition(item, nodes) {
    const from = nodes[item.route[item.segment]] || nodes.peopleIntake;
    const to = nodes[item.route[item.segment + 1]] || nodes.peopleDelivery;
    return interpolate(from, to, clamp(item.progress, 0, 1));
  }

  function resizeCanvasElement(canvas, context, widthKey, heightKey) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const backingWidth = Math.max(1, Math.floor(width * dpr));
    const backingHeight = Math.max(1, Math.floor(height * dpr));

    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
      canvas.width = backingWidth;
      canvas.height = backingHeight;
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    state[widthKey] = width;
    state[heightKey] = height;
  }

  function resizeCanvas() {
    resizeCanvasElement(dom.canvas, ctx, "canvasWidth", "canvasHeight");
    resizeCanvasElement(dom.peopleCanvas, peopleCtx, "peopleCanvasWidth", "peopleCanvasHeight");
    resizeCanvasElement(dom.impactCanvas, impactCtx, "impactCanvasWidth", "impactCanvasHeight");
  }

  function draw() {
    resizeCanvas();
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const nodes = getNodes();
    ctx.clearRect(0, 0, w, h);

    drawBackground(w, h);
    drawRoutes(nodes);
    drawItems(nodes);
    drawNodes(nodes);
    drawStageCounters(nodes);
    drawPeopleWorkflow();
    drawImpactWorkflow();
  }

  function drawBackground(w, h) {
    ctx.save();
    ctx.fillStyle = "#f8fbf7";
    ctx.fillRect(0, 0, w, h);

    const laneHeight = h / 3;
    const lanes = [
      { y: 0, color: "rgba(66,84,168,.055)" },
      { y: laneHeight, color: "rgba(11,143,122,.055)" },
      { y: laneHeight * 2, color: "rgba(216,154,32,.065)" }
    ];

    lanes.forEach((lane) => {
      ctx.fillStyle = lane.color;
      ctx.fillRect(0, lane.y, w, laneHeight);
    });

    ctx.strokeStyle = "rgba(24,32,41,.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRoutes(nodes) {
    const routes = [
      ["intake", "sentimentScan", "#4254a8"],
      ["sentimentScan", "customerContext", "#6a56c8"],
      ["customerContext", "orchestrator", "#188fbd"],
      ["orchestrator", "specialistDiscovery", "#0b8f7a"],
      ["orchestrator", "policyDecision", "#0b8f7a"],
      ["specialistDiscovery", "specialistDrafting", "#188fbd"],
      ["policyDecision", "specialistDrafting", "#d89a20"],
      ["specialistDrafting", "validator", "#0e9d8b"],
      ["validator", "policyDecision", "#d95f4f"],
      ["validator", "actionExecutor", "#238b55"],
      ["validator", "human", "#d95f4f"],
      ["human", "actionExecutor", "#d89a20"],
      ["actionExecutor", "delivery", "#4254a8"]
    ];

    ctx.save();
    routes.forEach(([from, to, color]) => {
      drawArrow(nodes[from], nodes[to], color);
    });
    ctx.restore();
  }

  function drawArrow(from, to, color, curved = false) {
    drawArrowOn(ctx, from, to, color, state.canvasWidth, curved);
  }

  function drawArrowOn(context, from, to, color, canvasWidth, curved = false) {
    if (!from || !to) return;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const startX = from.x + Math.cos(angle) * ((from.radius || 39) + 8);
    const startY = from.y + Math.sin(angle) * ((from.radius || 39) + 8);
    const endX = to.x - Math.cos(angle) * ((to.radius || 39) + 10);
    const endY = to.y - Math.sin(angle) * ((to.radius || 39) + 10);
    const arrowSize = clamp(canvasWidth * 0.024, 10, 16);

    context.strokeStyle = color;
    context.globalAlpha = 0.62;
    context.lineWidth = clamp(canvasWidth * 0.004, 2.4, 4);
    context.lineCap = "round";

    context.beginPath();
    context.moveTo(startX, startY);
    if (curved) {
      context.quadraticCurveTo((startX + endX) / 2, Math.min(startY, endY) - 90, endX, endY);
    } else {
      context.lineTo(endX, endY);
    }
    context.stroke();

    context.globalAlpha = 0.92;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(endX, endY);
    context.lineTo(
      endX - Math.cos(angle - 0.45) * arrowSize,
      endY - Math.sin(angle - 0.45) * arrowSize
    );
    context.lineTo(
      endX - Math.cos(angle + 0.45) * arrowSize,
      endY - Math.sin(angle + 0.45) * arrowSize
    );
    context.closePath();
    context.fill();
    context.globalAlpha = 1;
  }

  function drawNodes(nodes) {
    Object.entries(nodes).forEach(([id, node]) => {
      const isHuman = id === "human";
      const isDelivery = id === "delivery";
      const labelBelow = isHuman
        || id === "orchestrator"
        || id === "customerContext"
        || id === "specialistDrafting"
        || id === "actionExecutor"
        || isDelivery;
      const radius = node.radius || (isDelivery ? 34 : 39);
      const labelHeight = node.labelHeight || 24;
      const labelWidth = node.labelWidth || 100;
      const labelX = getCanvasLabelX(node.x, labelWidth, state.canvasWidth);
      const labelY = getCanvasLabelY(node.y, radius, labelHeight, state.canvasHeight, labelBelow);
      const pulse = state.running ? Math.sin(performance.now() / 520 + node.x * 0.004) * 3 : 0;

      ctx.save();
      ctx.fillStyle = `${node.color}1f`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 12 + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = node.color;
      ctx.lineWidth = clamp(state.canvasWidth * 0.004, 2.5, 3.5);
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y - radius * 0.2, isDelivery ? radius * 0.27 : radius * 0.3, 0, Math.PI * 2);
      ctx.fill();

      if (isHuman) {
        ctx.fillStyle = "#fff7e1";
      } else if (isDelivery) {
        ctx.fillStyle = "#eaf8ef";
      } else {
        ctx.fillStyle = "#eef7f4";
      }
      roundRect(ctx, labelX, labelY, labelWidth, labelHeight, 8);
      ctx.fill();

      ctx.fillStyle = "#1d2930";
      ctx.font = `800 ${NODE_LABEL_FONT_SIZE}px ${getCanvasFont()}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label, labelX + labelWidth / 2, labelY + labelHeight / 2, labelWidth - 8);
      ctx.restore();
    });
  }

  function drawItems(nodes) {
    const items = state.items.slice(-MAX_DRAWN_ITEMS);
    items.forEach((item, index) => {
      const pos = getItemPosition(item, nodes);
      const wobble = Math.sin((performance.now() / 260) + index) * 4;
      const width = clamp(state.canvasWidth * 0.07, 42, 52);
      const height = clamp(state.canvasWidth * 0.032, 22, 28);
      const fontSize = clamp(state.canvasWidth * 0.018, 10, 12);

      ctx.save();
      ctx.translate(pos.x, pos.y + wobble);
      ctx.fillStyle = item.hasException ? "rgba(217,95,79,.16)" : "rgba(255,255,255,.88)";
      ctx.strokeStyle = item.hasException ? "#d95f4f" : item.color;
      ctx.lineWidth = item.hasException ? 3 : 2;
      roundRect(ctx, -width / 2, -height / 2, width, height, 9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(-width / 2 + 11, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1f2a30";
      ctx.font = `800 ${fontSize}px ${getCanvasFont()}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`#${item.id}`, -width / 2 + 22, 0);
      ctx.restore();
    });
  }

  function drawStageCounters(nodes) {
    const counts = Object.keys(nodes).reduce((map, id) => {
      map[id] = 0;
      return map;
    }, {});

    state.items.forEach((item) => {
      const target = item.route[item.segment + 1] || item.route[item.segment];
      if (counts[target] !== undefined) counts[target] += 1;
    });

    Object.entries(counts).forEach(([id, count]) => {
      if (!count || !nodes[id]) return;
      const node = nodes[id];
      const badgeRadius = clamp(state.canvasWidth * 0.022, 11, 14);
      const offset = (node.radius || 39) * 0.74;
      const badgeX = Math.min(state.canvasWidth - badgeRadius - 4, node.x + offset);
      const badgeY = Math.min(state.canvasHeight - badgeRadius - 4, node.y + offset);
      ctx.save();
      ctx.fillStyle = "#182029";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${clamp(state.canvasWidth * 0.028, 10, 12)}px ${getCanvasFont()}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(count), badgeX, badgeY);
      ctx.restore();
    });
  }

  function drawPeopleWorkflow() {
    const w = state.peopleCanvasWidth;
    const h = state.peopleCanvasHeight;
    const nodes = getPeopleNodes();
    peopleCtx.clearRect(0, 0, w, h);

    drawPeopleBackground(w, h);
    drawPeopleRoutes(nodes);
    drawPeopleItems(nodes);
    drawPeopleNodes(nodes);
    drawPeopleCounters(nodes);
  }

  function drawPeopleBackground(w, h) {
    peopleCtx.save();
    peopleCtx.fillStyle = "#fffdf7";
    peopleCtx.fillRect(0, 0, w, h);

    const laneHeight = h / 3;
    const lanes = [
      { y: 0, color: "rgba(216,154,32,.08)" },
      { y: laneHeight, color: "rgba(66,84,168,.055)" },
      { y: laneHeight * 2, color: "rgba(217,95,79,.06)" }
    ];

    lanes.forEach((lane) => {
      peopleCtx.fillStyle = lane.color;
      peopleCtx.fillRect(0, lane.y, w, laneHeight);
    });

    peopleCtx.strokeStyle = "rgba(24,32,41,.08)";
    peopleCtx.lineWidth = 1;
    for (let x = 0; x <= w; x += 80) {
      peopleCtx.beginPath();
      peopleCtx.moveTo(x, 0);
      peopleCtx.lineTo(x, h);
      peopleCtx.stroke();
    }
    for (let y = 0; y <= h; y += 80) {
      peopleCtx.beginPath();
      peopleCtx.moveTo(0, y);
      peopleCtx.lineTo(w, y);
      peopleCtx.stroke();
    }

    peopleCtx.restore();
  }

  function drawPeopleRoutes(nodes) {
    const routes = [
      ["peopleIntake", "peopleQueue", "#4254a8"],
      ["peopleQueue", "peopleAnalyst", "#6a56c8"],
      ["peopleAnalyst", "peopleCrm", "#d89a20"],
      ["peopleCrm", "peopleSpecialist", "#188fbd"],
      ["peopleSpecialist", "peopleBackOffice", "#188fbd"],
      ["peopleBackOffice", "peopleReviewer", "#8f6b14"],
      ["peopleReviewer", "peopleBackOffice", "#d95f4f"],
      ["peopleReviewer", "peopleManager", "#d95f4f"],
      ["peopleReviewer", "peopleFollowup", "#238b55"],
      ["peopleManager", "peopleFollowup", "#8f6b14"],
      ["peopleFollowup", "peopleDelivery", "#238b55"]
    ];

    peopleCtx.save();
    routes.forEach(([from, to, color]) => {
      drawArrowOn(peopleCtx, nodes[from], nodes[to], color, state.peopleCanvasWidth);
    });
    peopleCtx.restore();
  }

  function drawPeopleNodes(nodes) {
    Object.entries(nodes).forEach(([id, node]) => {
      const isDelivery = id === "peopleDelivery";
      const isManager = id === "peopleManager";
      const labelBelow = isManager
        || id === "peopleIntake"
        || id === "peopleQueue"
        || id === "peopleCrm"
        || id === "peopleSpecialist"
        || isDelivery;
      const radius = node.radius || (isDelivery ? 34 : 39);
      const labelHeight = node.labelHeight || 24;
      const labelWidth = node.labelWidth || 124;
      const labelX = getCanvasLabelX(node.x, labelWidth, state.peopleCanvasWidth);
      const labelY = getCanvasLabelY(node.y, radius, labelHeight, state.peopleCanvasHeight, labelBelow);
      const pulse = state.running ? Math.sin(performance.now() / 620 + node.x * 0.004) * 2.5 : 0;

      peopleCtx.save();
      peopleCtx.fillStyle = `${node.color}1f`;
      peopleCtx.beginPath();
      peopleCtx.arc(node.x, node.y, radius + 12 + pulse, 0, Math.PI * 2);
      peopleCtx.fill();

      peopleCtx.fillStyle = "#ffffff";
      peopleCtx.strokeStyle = node.color;
      peopleCtx.lineWidth = clamp(state.peopleCanvasWidth * 0.004, 2.5, 3.5);
      peopleCtx.beginPath();
      peopleCtx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      peopleCtx.fill();
      peopleCtx.stroke();

      drawPersonIcon(peopleCtx, node.x, node.y - radius * 0.12, node.color, isManager, radius);

      peopleCtx.fillStyle = isDelivery ? "#eaf8ef" : "#fff8e8";
      roundRect(peopleCtx, labelX, labelY, labelWidth, labelHeight, 8);
      peopleCtx.fill();

      peopleCtx.fillStyle = "#1d2930";
      peopleCtx.font = `800 ${NODE_LABEL_FONT_SIZE}px ${getCanvasFont()}`;
      peopleCtx.textAlign = "center";
      peopleCtx.textBaseline = "middle";
      peopleCtx.fillText(node.label, labelX + labelWidth / 2, labelY + labelHeight / 2, labelWidth - 8);
      peopleCtx.restore();
    });
  }

  function drawPersonIcon(context, x, y, color, isManager = false, radius = 39) {
    const headRadius = isManager ? radius * 0.26 : radius * 0.23;
    const bodyWidth = radius * 0.76;
    const bodyHeight = radius * 0.48;

    context.save();
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y - radius * 0.18, headRadius, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.roundRect?.(x - bodyWidth / 2, y + radius * 0.15, bodyWidth, bodyHeight, 8);
    if (!context.roundRect) {
      roundRect(context, x - bodyWidth / 2, y + radius * 0.15, bodyWidth, bodyHeight, 8);
    }
    context.fill();
    context.restore();
  }

  function drawPeopleItems(nodes) {
    const items = state.peopleItems.slice(-MAX_DRAWN_ITEMS);
    items.forEach((item, index) => {
      const pos = getPeopleItemPosition(item, nodes);
      const wobble = Math.sin((performance.now() / 320) + index) * 3;
      const width = clamp(state.peopleCanvasWidth * 0.07, 42, 52);
      const height = clamp(state.peopleCanvasWidth * 0.032, 22, 28);
      const fontSize = clamp(state.peopleCanvasWidth * 0.018, 10, 12);

      peopleCtx.save();
      peopleCtx.translate(pos.x, pos.y + wobble);
      peopleCtx.fillStyle = item.hasException ? "rgba(217,95,79,.16)" : "rgba(255,255,255,.9)";
      peopleCtx.strokeStyle = item.hasException ? "#d95f4f" : item.color;
      peopleCtx.lineWidth = item.hasException ? 3 : 2;
      roundRect(peopleCtx, -width / 2, -height / 2, width, height, 9);
      peopleCtx.fill();
      peopleCtx.stroke();
      peopleCtx.fillStyle = item.color;
      peopleCtx.beginPath();
      peopleCtx.arc(-width / 2 + 11, 0, 5, 0, Math.PI * 2);
      peopleCtx.fill();
      peopleCtx.fillStyle = "#1f2a30";
      peopleCtx.font = `800 ${fontSize}px ${getCanvasFont()}`;
      peopleCtx.textAlign = "left";
      peopleCtx.textBaseline = "middle";
      peopleCtx.fillText(`#${item.id}`, -width / 2 + 22, 0);
      peopleCtx.restore();
    });
  }

  function drawPeopleCounters(nodes) {
    const counts = Object.keys(nodes).reduce((map, id) => {
      map[id] = 0;
      return map;
    }, {});

    state.peopleItems.forEach((item) => {
      const target = item.route[item.segment + 1] || item.route[item.segment];
      if (counts[target] !== undefined) counts[target] += 1;
    });

    Object.entries(counts).forEach(([id, count]) => {
      if (!count || !nodes[id]) return;
      const node = nodes[id];
      const badgeRadius = clamp(state.peopleCanvasWidth * 0.022, 11, 14);
      const offset = (node.radius || 39) * 0.74;
      const badgeX = Math.min(state.peopleCanvasWidth - badgeRadius - 4, node.x + offset);
      const badgeY = Math.min(state.peopleCanvasHeight - badgeRadius - 4, node.y + offset);
      peopleCtx.save();
      peopleCtx.fillStyle = "#182029";
      peopleCtx.strokeStyle = "#ffffff";
      peopleCtx.lineWidth = 3;
      peopleCtx.beginPath();
      peopleCtx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
      peopleCtx.fill();
      peopleCtx.stroke();
      peopleCtx.fillStyle = "#ffffff";
      peopleCtx.font = `900 ${clamp(state.peopleCanvasWidth * 0.028, 10, 12)}px ${getCanvasFont()}`;
      peopleCtx.textAlign = "center";
      peopleCtx.textBaseline = "middle";
      peopleCtx.fillText(String(count), badgeX, badgeY);
      peopleCtx.restore();
    });
  }

  function getImpactNodes() {
    const w = state.impactCanvasWidth;
    const h = state.impactCanvasHeight;
    const compact = isCompactCanvas(w, h);
    const radius = compact ? clamp(w * 0.072, 20, 26) : clamp(w * 0.036, 26, 34);
    const node = (x, y, label, sublabel, color) => ({
      x: w * x,
      y: h * y,
      label,
      sublabel,
      color,
      radius
    });

    if (compact) {
      return {
        queue: node(0.22, 0.2, "Manual queue", "repetitive tickets", "#4254a8"),
        automation: node(0.68, 0.2, "Automation layer", "self-serve resolution", "#0b8f7a"),
        freed: node(0.5, 0.42, "Freed team", "capacity pool", "#d89a20"),
        retention: node(0.25, 0.62, "Retention", "save at-risk customers", "#d95f4f"),
        onboarding: node(0.75, 0.62, "Onboarding", "activate accounts", "#188fbd"),
        knowledge: node(0.25, 0.82, "Knowledge ops", "prevent repeat issues", "#0e9d8b"),
        expansion: node(0.75, 0.82, "Expansion", "grow existing accounts", "#238b55")
      };
    }

    return {
      queue: node(0.11, 0.5, "Manual queue", "repetitive tickets", "#4254a8"),
      automation: node(0.29, 0.5, "Automation layer", "self-serve resolution", "#0b8f7a"),
      freed: node(0.47, 0.5, "Freed team", "capacity pool", "#d89a20"),
      retention: node(0.66, 0.28, "Retention", "save at-risk customers", "#d95f4f"),
      onboarding: node(0.66, 0.72, "Onboarding", "activate accounts", "#188fbd"),
      knowledge: node(0.84, 0.28, "Knowledge ops", "prevent repeat issues", "#0e9d8b"),
      expansion: node(0.84, 0.72, "Expansion", "grow existing accounts", "#238b55")
    };
  }

  function drawImpactWorkflow() {
    const w = state.impactCanvasWidth;
    const h = state.impactCanvasHeight;
    const nodes = getImpactNodes();
    const metrics = calculateMetrics();
    impactCtx.clearRect(0, 0, w, h);

    drawImpactBackground(w, h);
    drawImpactRoutes(nodes);
    drawImpactPeople(nodes, metrics);
    drawImpactNodes(nodes);
    drawImpactMetrics(metrics, w, h);
  }

  function drawImpactBackground(w, h) {
    impactCtx.save();
    impactCtx.fillStyle = "#f8fbff";
    impactCtx.fillRect(0, 0, w, h);

    const gradient = impactCtx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, "rgba(66,84,168,.08)");
    gradient.addColorStop(0.45, "rgba(11,143,122,.075)");
    gradient.addColorStop(1, "rgba(216,154,32,.08)");
    impactCtx.fillStyle = gradient;
    impactCtx.fillRect(0, 0, w, h);

    impactCtx.strokeStyle = "rgba(24,32,41,.075)";
    impactCtx.lineWidth = 1;
    for (let x = 0; x <= w; x += 86) {
      impactCtx.beginPath();
      impactCtx.moveTo(x, 0);
      impactCtx.lineTo(x, h);
      impactCtx.stroke();
    }
    for (let y = 0; y <= h; y += 86) {
      impactCtx.beginPath();
      impactCtx.moveTo(0, y);
      impactCtx.lineTo(w, y);
      impactCtx.stroke();
    }
    impactCtx.restore();
  }

  function drawImpactRoutes(nodes) {
    const routes = [
      ["queue", "automation", "#4254a8"],
      ["automation", "freed", "#0b8f7a"],
      ["freed", "retention", "#d95f4f"],
      ["freed", "onboarding", "#188fbd"],
      ["retention", "knowledge", "#0e9d8b"],
      ["onboarding", "expansion", "#238b55"],
      ["knowledge", "expansion", "#d89a20"]
    ];

    impactCtx.save();
    routes.forEach(([from, to, color]) => {
      drawArrowOn(impactCtx, nodes[from], nodes[to], color, state.impactCanvasWidth);
    });
    impactCtx.restore();
  }

  function drawImpactNodes(nodes) {
    Object.values(nodes).forEach((node) => {
      const labelWidth = clamp(state.impactCanvasWidth * 0.14, 106, 148);
      const labelHeight = 42;
      const labelX = getCanvasLabelX(node.x, labelWidth, state.impactCanvasWidth);
      const labelY = getCanvasLabelY(node.y, node.radius, labelHeight, state.impactCanvasHeight, true);

      impactCtx.save();
      impactCtx.fillStyle = `${node.color}21`;
      impactCtx.beginPath();
      impactCtx.arc(node.x, node.y, node.radius + 12, 0, Math.PI * 2);
      impactCtx.fill();

      impactCtx.fillStyle = "#ffffff";
      impactCtx.strokeStyle = node.color;
      impactCtx.lineWidth = clamp(state.impactCanvasWidth * 0.003, 2.5, 3.5);
      impactCtx.beginPath();
      impactCtx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      impactCtx.fill();
      impactCtx.stroke();

      drawPersonIcon(impactCtx, node.x, node.y - node.radius * 0.12, node.color, false, node.radius);

      impactCtx.fillStyle = "rgba(255,255,255,.88)";
      roundRect(impactCtx, labelX, labelY, labelWidth, labelHeight, 9);
      impactCtx.fill();

      impactCtx.fillStyle = "#1d2930";
      impactCtx.textAlign = "center";
      impactCtx.textBaseline = "middle";
      impactCtx.font = `900 ${NODE_LABEL_FONT_SIZE}px ${getCanvasFont()}`;
      impactCtx.fillText(node.label, labelX + labelWidth / 2, labelY + 14, labelWidth - 8);
      impactCtx.fillStyle = "#52666c";
      impactCtx.font = `800 ${Math.max(10, NODE_LABEL_FONT_SIZE - 2)}px ${getCanvasFont()}`;
      impactCtx.fillText(node.sublabel, labelX + labelWidth / 2, labelY + 29, labelWidth - 8);
      impactCtx.restore();
    });
  }

  function drawImpactPeople(nodes, metrics) {
    const paths = [
      [nodes.queue, nodes.automation],
      [nodes.automation, nodes.freed],
      [nodes.freed, nodes.retention],
      [nodes.freed, nodes.onboarding],
      [nodes.retention, nodes.knowledge],
      [nodes.onboarding, nodes.expansion],
      [nodes.knowledge, nodes.expansion]
    ];
    const count = metrics.roleDaysFreed > 0
      ? clamp(Math.round(metrics.reassignedPeople) + 4, 4, 14)
      : 0;
    const now = performance.now() / 1800;

    impactCtx.save();
    for (let index = 0; index < count; index += 1) {
      const path = paths[index % paths.length];
      const t = (now + index * 0.17) % 1;
      const pos = interpolate(path[0], path[1], t);
      const color = index % 3 === 0 ? "#0b8f7a" : index % 3 === 1 ? "#4254a8" : "#d89a20";

      impactCtx.fillStyle = "rgba(255,255,255,.92)";
      impactCtx.strokeStyle = color;
      impactCtx.lineWidth = 2;
      impactCtx.beginPath();
      impactCtx.arc(pos.x, pos.y, 9, 0, Math.PI * 2);
      impactCtx.fill();
      impactCtx.stroke();
      impactCtx.fillStyle = color;
      impactCtx.beginPath();
      impactCtx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2);
      impactCtx.fill();
    }
    impactCtx.restore();
  }

  function drawImpactMetrics(metrics, w, h) {
    const compact = isCompactCanvas(w, h);
    const items = [
      ["Role-days freed", `${Math.round(metrics.roleDaysFreed)}`],
      ["People shifted", `${metrics.reassignedPeople}`],
      ["Growth opportunity", formatMoney(metrics.growthPipeline)]
    ];
    const width = compact ? w - 28 : Math.min(520, w * 0.42);
    const x = compact ? 14 : w - width - 22;
    const y = compact ? 14 : 20;
    const colWidth = width / items.length;

    impactCtx.save();
    impactCtx.fillStyle = "rgba(255,255,255,.9)";
    impactCtx.strokeStyle = "rgba(30,43,48,.12)";
    impactCtx.lineWidth = 1;
    roundRect(impactCtx, x, y, width, 58, 12);
    impactCtx.fill();
    impactCtx.stroke();

    items.forEach(([label, value], index) => {
      const left = x + index * colWidth;
      impactCtx.fillStyle = "#596d72";
      impactCtx.font = `850 10px ${getCanvasFont()}`;
      impactCtx.textAlign = "center";
      impactCtx.textBaseline = "middle";
      impactCtx.fillText(label, left + colWidth / 2, y + 18, colWidth - 8);
      impactCtx.fillStyle = "#182029";
      impactCtx.font = `950 19px ${getCanvasFont()}`;
      impactCtx.fillText(value, left + colWidth / 2, y + 39, colWidth - 8);
    });
    impactCtx.restore();
  }

  function getCanvasFont() {
    return "Inter, Manrope, Avenir Next, Segoe UI, Arial, sans-serif";
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function animationLoop(timestamp) {
    if (!state.lastStamp) state.lastStamp = timestamp;
    const elapsed = Math.min(80, timestamp - state.lastStamp);
    state.lastStamp = timestamp;

    if (state.running) {
      const deltaDays = elapsed / 1000 * BASE_DAYS_PER_SECOND * state.speed;
      advanceSimulation(deltaDays);
    }

    draw();
    renderUi();
    requestAnimationFrame(animationLoop);
  }

  function createEmbedResizer(root) {
    if (!root || window.parent === window) {
      return { request() {}, disconnect() {} };
    }

    let frame = 0;
    let lastHeight = 0;
    let resizeObserver = null;

    const measure = () => {
      const doc = document.documentElement;
      return Math.ceil(Math.max(
        root.getBoundingClientRect().height,
        document.body.scrollHeight,
        doc.scrollHeight,
        doc.offsetHeight
      ));
    };

    const postHeight = () => {
      frame = 0;
      const height = measure();
      if (Math.abs(height - lastHeight) < 1) return;
      lastHeight = height;

      try {
        if (window.frameElement) {
          window.frameElement.style.height = `${height}px`;
          window.frameElement.setAttribute("height", String(height));
        }
      } catch (error) {
        void error;
      }

      try {
        window.parent.postMessage({ type: "simfluence-widget:resize", height }, "*");
      } catch (error) {
        void error;
      }
    };

    const request = () => {
      if (frame) return;
      frame = requestAnimationFrame(postHeight);
    };

    const handleMessage = (event) => {
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

    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(request);
      resizeObserver.observe(root);
    }

    window.addEventListener("load", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });
    window.addEventListener("orientationchange", request, { passive: true });
    window.addEventListener("message", handleMessage);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(request).catch(() => {});
    }

    setTimeout(request, 60);
    setTimeout(request, 260);
    setTimeout(request, 900);
    request();

    return {
      request,
      disconnect() {
        if (resizeObserver) resizeObserver.disconnect();
        window.removeEventListener("message", handleMessage);
      }
    };
  }

  function syncEmbedHeight() {
    if (state.embedResizer) state.embedResizer.request();
  }

  function applyEmbedMode() {
    const params = new URLSearchParams(window.location.search);
    let inFrame = false;

    try {
      inFrame = window.self !== window.top;
    } catch (error) {
      void error;
      inFrame = true;
    }

    if (params.get("embed") === "1" || params.get("embedMode") === "1" || inFrame) {
      dom.body.classList.add("embed-mode");
    }
  }

  function init() {
    applyEmbedMode();
    attachEvents();
    state.embedResizer = createEmbedResizer(dom.shell);
    resetSimulation({ keepRunning: !reducedMotion });

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(() => {
        draw();
        syncEmbedHeight();
      });
      resizeObserver.observe(dom.canvas);
      resizeObserver.observe(dom.peopleCanvas);
      resizeObserver.observe(dom.impactCanvas);
    } else {
      window.addEventListener("resize", draw, { passive: true });
    }

    requestAnimationFrame(animationLoop);
  }

  init();
})();
