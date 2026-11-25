(() => {
  const DEFAULTS = Object.freeze({
    aiAccessibility: 70,
    aiLiteracy: 50,
    validationDiscipline: 45,
    platformConcentration: 65,
    workPacePressure: 60,
    localModelMaturity: 35
  });

  const INPUT_KEYS = Object.keys(DEFAULTS);
  const SCENARIO_DEFAULTS = Object.freeze([
    {
      title: "Scenario 1",
      description: "Minimum settings",
      values: {
        aiAccessibility: 0,
        aiLiteracy: 0,
        validationDiscipline: 0,
        platformConcentration: 0,
        workPacePressure: 0,
        localModelMaturity: 0
      }
    },
    {
      title: "Scenario 2",
      description: "Middle settings",
      values: {
        aiAccessibility: 50,
        aiLiteracy: 50,
        validationDiscipline: 50,
        platformConcentration: 50,
        workPacePressure: 50,
        localModelMaturity: 50
      }
    },
    {
      title: "Scenario 3",
      description: "Maximum settings",
      values: {
        aiAccessibility: 100,
        aiLiteracy: 100,
        validationDiscipline: 100,
        platformConcentration: 100,
        workPacePressure: 100,
        localModelMaturity: 100
      }
    }
  ]);
  const SCENARIO_COUNT = SCENARIO_DEFAULTS.length;
  const SCENARIO_STORAGE_KEY = "sim25-genai-custom-scenarios-v3";

  const dom = {
    body: document.body,
    shell: document.getElementById("genaiShell"),
    mapSurface: document.querySelector(".map-surface"),
    mapLinks: document.querySelector(".map-links"),
    scenarioButtons: Array.from(document.querySelectorAll("[data-scenario-slot]")),
    activeScenarioLabel: document.getElementById("activeScenarioLabel"),
    warningList: document.getElementById("warningList"),
    societyMeter: document.getElementById("societyMeter"),
    societyMeterTrack: document.getElementById("societyMeterTrack"),
    societyMeterValue: document.getElementById("societyMeterValue"),
    societyMeterStatus: document.getElementById("societyMeterStatus"),
    societyMeterNote: document.getElementById("societyMeterNote"),
    societyMeterShape: document.getElementById("societyMeterShape"),
    nodeAccess: document.getElementById("nodeAccess"),
    nodeKnowledge: document.getElementById("nodeKnowledge"),
    nodeExpertise: document.getElementById("nodeExpertise"),
    nodeSpeed: document.getElementById("nodeSpeed"),
    nodePseudo: document.getElementById("nodePseudo"),
    nodeDependency: document.getElementById("nodeDependency"),
    nodeAccessScore: document.getElementById("nodeAccessScore"),
    nodeKnowledgeScore: document.getElementById("nodeKnowledgeScore"),
    nodeExpertiseScore: document.getElementById("nodeExpertiseScore"),
    nodeSpeedScore: document.getElementById("nodeSpeedScore"),
    nodePseudoScore: document.getElementById("nodePseudoScore"),
    nodeDependencyScore: document.getElementById("nodeDependencyScore"),
    links: {
      accessKnowledge: document.getElementById("linkAccessKnowledge"),
      accessExpertise: document.getElementById("linkAccessExpertise"),
      accessSpeed: document.getElementById("linkAccessSpeed"),
      knowledgeExpertise: document.getElementById("linkKnowledgeExpertise"),
      expertisePseudo: document.getElementById("linkExpertisePseudo"),
      speedPseudo: document.getElementById("linkSpeedPseudo"),
      accessDependency: document.getElementById("linkAccessDependency")
    },
    inputs: {},
    inputOutputs: {}
  };

  const state = {
    embedResizer: null,
    geometryFrame: 0,
    mapPulseTimer: 0,
    activeScenarioIndex: 1,
    scenarios: []
  };

  INPUT_KEYS.forEach((key) => {
    dom.inputs[key] = document.getElementById(key);
    dom.inputOutputs[key] = document.getElementById(`${key}Value`);
  });

  function clamp(value) {
    return Math.min(100, Math.max(0, value));
  }

  function score(value) {
    return Math.round(clamp(value));
  }

  function interaction(a, b) {
    return clamp(a) * clamp(b) / 100;
  }

  function sanitizeValues(source = {}) {
    return INPUT_KEYS.reduce((values, key) => {
      const fallback = DEFAULTS[key];
      const raw = Number(source[key]);
      values[key] = score(Number.isFinite(raw) ? raw : fallback);
      return values;
    }, {});
  }

  function buildScenarioSlot(index, overrides = {}) {
    const preset = SCENARIO_DEFAULTS[index - 1] || {};

    return {
      id: `scenario-${index}`,
      title: preset.title || `Scenario ${index}`,
      description: preset.description || "Custom setup",
      values: sanitizeValues(overrides.values || preset.values || DEFAULTS),
      touched: Boolean(overrides.touched)
    };
  }

  function getDefaultScenarioSlots() {
    return Array.from({ length: SCENARIO_COUNT }, (_, index) => buildScenarioSlot(index + 1));
  }

  function loadScenarioSlots() {
    const defaults = getDefaultScenarioSlots();

    try {
      const raw = window.localStorage.getItem(SCENARIO_STORAGE_KEY);
      if (!raw) return defaults;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return defaults;

      return defaults.map((fallback, index) => {
        const saved = parsed[index];
        if (!saved || typeof saved !== "object") return fallback;

        return buildScenarioSlot(index + 1, {
          values: saved.values || saved.inputs || fallback.values,
          touched: Boolean(saved.touched)
        });
      });
    } catch (error) {
      void error;
      return defaults;
    }
  }

  function persistScenarioSlots() {
    try {
      window.localStorage.setItem(
        SCENARIO_STORAGE_KEY,
        JSON.stringify(
          state.scenarios.map((slot) => ({
            id: slot.id,
            title: slot.title,
            description: slot.description,
            values: slot.values,
            touched: slot.touched
          }))
        )
      );
    } catch (error) {
      void error;
    }
  }

  function updateActiveScenario(values) {
    const activeSlot = state.scenarios[state.activeScenarioIndex];
    if (!activeSlot) return;

    activeSlot.values = sanitizeValues(values);
    activeSlot.touched = true;
    persistScenarioSlots();
  }

  function calculateMetrics(values) {
    const expertiseShift = clamp(
      0.42 * values.aiAccessibility
      + 0.22 * values.aiLiteracy
      + 0.18 * values.localModelMaturity
      + 0.13 * values.workPacePressure
      + 0.05 * values.validationDiscipline
    );
    const aiExposure = clamp(
      0.50 * values.aiAccessibility
      + 0.25 * values.workPacePressure
      + 0.25 * expertiseShift
    );
    const guardrailGap = clamp(
      0.65 * (100 - values.validationDiscipline)
      + 0.35 * (100 - values.aiLiteracy)
    );

    return {
      knowledgeAccess: clamp(
        0.42 * values.aiAccessibility
        + 0.18 * values.aiLiteracy
        + 0.18 * values.localModelMaturity
        + 0.12 * values.validationDiscipline
        + 0.10 * interaction(values.aiAccessibility, 100 - values.platformConcentration)
      ),
      timeSpaceCompression: clamp(
        0.48 * values.aiAccessibility
        + 0.25 * values.workPacePressure
        + 0.15 * values.localModelMaturity
        + 0.12 * values.aiLiteracy
      ),
      expertiseShift,
      pseudoExpertRisk: clamp(
        aiExposure * (0.25 + 0.75 * guardrailGap / 100)
      ),
      platformDependency: clamp(
        0.45 * values.platformConcentration
        + 0.25 * values.aiAccessibility
        + 0.15 * values.workPacePressure
        + 0.15 * interaction(values.platformConcentration, 100 - values.localModelMaturity)
      )
    };
  }

  function calculateSocietyShift(values, metrics) {
    return clamp(
      0.27 * metrics.knowledgeAccess
      + 0.22 * metrics.expertiseShift
      + 0.18 * metrics.timeSpaceCompression
      + 0.13 * values.aiAccessibility
      + 0.10 * values.localModelMaturity
      + 0.10 * values.aiLiteracy
    );
  }

  function describeSocietyShift(values, metrics, shift) {
    let status = "Expert-led knowledge society";
    let note = "Most useful knowledge still flows through specialists, institutions, and slower expert channels.";

    if (shift >= 80) {
      status = "Mass Knowledge Society";
      note = "AI makes knowledge work widely available. The main social question becomes how people check quality and share power.";
    } else if (shift >= 55) {
      status = "Mass knowledge is emerging";
      note = "AI is moving more knowledge work toward everyday users, but checking and platform power still shape the outcome.";
    } else if (shift >= 40) {
      status = "Early transition";
      note = "AI is starting to widen access, but expert institutions still carry much of the trust, skill, and responsibility.";
    }

    let shape = "Social shape: wider access with mixed guardrails.";

    if (metrics.pseudoExpertRisk > 70 && metrics.platformDependency > 70) {
      shape = "Social shape: wide access, weak trust, and strong platform dependence.";
    } else if (values.aiAccessibility > 65 && values.aiLiteracy < 45) {
      shape = "Social shape: access is spreading faster than public AI literacy.";
    } else if (metrics.pseudoExpertRisk > 70) {
      shape = "Social shape: wide access, but fake confidence can spread.";
    } else if (metrics.platformDependency > 70) {
      shape = "Social shape: wide access through a few powerful platforms.";
    } else if (metrics.knowledgeAccess > 75 && metrics.pseudoExpertRisk < 50) {
      shape = "Social shape: broad access with stronger checking habits.";
    } else if (values.localModelMaturity > 70 && values.platformConcentration < 50) {
      shape = "Social shape: more local control over AI knowledge tools.";
    }

    return { status, note, shape };
  }

  function readInputs() {
    return INPUT_KEYS.reduce((values, key) => {
      values[key] = Number(dom.inputs[key].value);
      return values;
    }, {});
  }

  function writeInputs(values) {
    INPUT_KEYS.forEach((key) => {
      dom.inputs[key].value = values[key];
    });
  }

  function setInputOutput(key, value) {
    const input = dom.inputs[key];
    dom.inputOutputs[key].textContent = `${value} / 100`;
    input.style.setProperty("--fill", `${value}%`);
  }

  function renderInputs(values) {
    INPUT_KEYS.forEach((key) => setInputOutput(key, values[key]));
  }

  function setNodeScore(node, value) {
    node.style.setProperty("--node-score", `${clamp(value)}%`);
  }

  function setLinkStrength(link, value) {
    const strength = clamp(value);
    link.style.setProperty("--link-opacity", "1");
    link.style.setProperty("--link-width", "4.6");
    link.style.setProperty("--link-focus-width", "4.6");
    link.classList.toggle("is-strong", strength >= 70);
  }

  function roundSvg(value) {
    return Number(value.toFixed(1));
  }

  function svgPoint(x, y, matrix) {
    const point = new DOMPoint(x, y).matrixTransform(matrix.inverse());
    return { x: roundSvg(point.x), y: roundSvg(point.y) };
  }

  function getSvgBox(node, matrix) {
    const rect = node.getBoundingClientRect();
    const topLeft = svgPoint(rect.left, rect.top, matrix);
    const bottomRight = svgPoint(rect.right, rect.bottom, matrix);

    return {
      left: topLeft.x,
      top: topLeft.y,
      right: bottomRight.x,
      bottom: bottomRight.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    };
  }

  function edgePoint(box, side, ratio = 0.5) {
    if (side === "left") return { x: box.left, y: roundSvg(box.top + box.height * ratio) };
    if (side === "right") return { x: box.right, y: roundSvg(box.top + box.height * ratio) };
    if (side === "top") return { x: roundSvg(box.left + box.width * ratio), y: box.top };
    return { x: roundSvg(box.left + box.width * ratio), y: box.bottom };
  }

  function outsideEdgePoint(box, side, ratio = 0.5, gap = 10) {
    const point = edgePoint(box, side, ratio);

    if (side === "left") return { x: roundSvg(point.x - gap), y: point.y };
    if (side === "right") return { x: roundSvg(point.x + gap), y: point.y };
    if (side === "top") return { x: point.x, y: roundSvg(point.y - gap) };
    return { x: point.x, y: roundSvg(point.y + gap) };
  }

  function clampBetween(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function horizontalElbow(start, end, laneX) {
    if (Math.abs(start.y - end.y) < 1) {
      return `M${start.x} ${start.y} H${end.x}`;
    }

    return `M${start.x} ${start.y} H${roundSvg(laneX)} V${end.y} H${end.x}`;
  }

  function updateLinkGeometry() {
    if (!dom.mapLinks || window.getComputedStyle(dom.mapLinks).display === "none") return;

    const matrix = dom.mapLinks.getScreenCTM();
    if (!matrix) return;

    const boxes = {
      access: getSvgBox(dom.nodeAccess, matrix),
      knowledge: getSvgBox(dom.nodeKnowledge, matrix),
      expertise: getSvgBox(dom.nodeExpertise, matrix),
      speed: getSvgBox(dom.nodeSpeed, matrix),
      pseudo: getSvgBox(dom.nodePseudo, matrix),
      dependency: getSvgBox(dom.nodeDependency, matrix)
    };

    const riskGap = boxes.pseudo.left - boxes.expertise.right;
    const riskLanes = {
      expertise: roundSvg(boxes.expertise.right + clampBetween(riskGap * 0.35, 22, Math.max(24, riskGap - 42)))
    };
    const svgHeight = dom.mapLinks.viewBox.baseVal.height || 840;
    const dependencyLaneY = roundSvg(svgHeight - 24);

    const accessKnowledgeStart = edgePoint(boxes.access, "top", 0.68);
    const accessKnowledgeEnd = outsideEdgePoint(boxes.knowledge, "left", 0.5);
    dom.links.accessKnowledge.setAttribute(
      "d",
      `M${accessKnowledgeStart.x} ${accessKnowledgeStart.y} V${accessKnowledgeEnd.y} H${accessKnowledgeEnd.x}`
    );

    const accessExpertiseStart = edgePoint(boxes.access, "right", 0.5);
    const accessExpertiseEnd = outsideEdgePoint(boxes.expertise, "left", 0.5);
    dom.links.accessExpertise.setAttribute(
      "d",
      horizontalElbow(accessExpertiseStart, accessExpertiseEnd, (accessExpertiseStart.x + accessExpertiseEnd.x) / 2)
    );

    const accessSpeedStart = edgePoint(boxes.access, "bottom", 0.42);
    const accessSpeedEnd = outsideEdgePoint(boxes.speed, "left", 0.5, 14);
    dom.links.accessSpeed.setAttribute(
      "d",
      `M${accessSpeedStart.x} ${accessSpeedStart.y} V${accessSpeedEnd.y} H${accessSpeedEnd.x}`
    );

    const knowledgeExpertiseStart = edgePoint(boxes.knowledge, "bottom", 0.5);
    const knowledgeExpertiseEnd = outsideEdgePoint(boxes.expertise, "top", 0.5);
    dom.links.knowledgeExpertise.setAttribute(
      "d",
      `M${knowledgeExpertiseStart.x} ${knowledgeExpertiseStart.y} V${knowledgeExpertiseEnd.y}`
    );

    const expertisePseudoStart = edgePoint(boxes.expertise, "right", 0.32);
    const expertisePseudoEnd = outsideEdgePoint(boxes.pseudo, "left", 0.36);
    dom.links.expertisePseudo.setAttribute(
      "d",
      horizontalElbow(expertisePseudoStart, expertisePseudoEnd, riskLanes.expertise)
    );

    const speedPseudoStart = edgePoint(boxes.speed, "right", 0.05);
    const speedPseudoEnd = edgePoint(boxes.pseudo, "bottom", 0.42);
    dom.links.speedPseudo.setAttribute(
      "d",
      `M${speedPseudoStart.x} ${speedPseudoStart.y} H${speedPseudoEnd.x} V${speedPseudoEnd.y}`
    );

    const accessDependencyStart = edgePoint(boxes.access, "left", 0.8);
    const accessDependencyEnd = edgePoint(boxes.dependency, "left", 0.5);
    const dependencyLaneX = roundSvg(Math.max(16, boxes.access.left - 26));
    const dependencyEntryLaneX = roundSvg(boxes.dependency.left - 28);
    dom.links.accessDependency.setAttribute(
      "d",
      `M${accessDependencyStart.x} ${accessDependencyStart.y} H${dependencyLaneX} V${dependencyLaneY} H${dependencyEntryLaneX} V${accessDependencyEnd.y} H${accessDependencyEnd.x}`
    );
  }

  function requestLinkGeometry() {
    if (state.geometryFrame) return;

    state.geometryFrame = requestAnimationFrame(() => {
      state.geometryFrame = 0;
      updateLinkGeometry();
    });
  }

  function applyMapFocus(values, metrics) {
    const hasSpeedTrap = values.workPacePressure > 75 && values.aiAccessibility > 75;
    const hasStableAccess = metrics.knowledgeAccess > 75 && metrics.pseudoExpertRisk < 50;
    const hasLocalIndependence = values.localModelMaturity > 70 && values.platformConcentration < 50;
    const hasLiteracyGap = values.aiAccessibility > 65 && values.aiLiteracy < 45;
    const platformDominant =
      metrics.platformDependency > 70 && metrics.platformDependency >= metrics.pseudoExpertRisk;
    const nodes = {
      access: dom.nodeAccess,
      knowledge: dom.nodeKnowledge,
      expertise: dom.nodeExpertise,
      speed: dom.nodeSpeed,
      pseudo: dom.nodePseudo,
      dependency: dom.nodeDependency
    };

    const links = {
      accessKnowledge: dom.links.accessKnowledge,
      accessExpertise: dom.links.accessExpertise,
      accessSpeed: dom.links.accessSpeed,
      knowledgeExpertise: dom.links.knowledgeExpertise,
      expertisePseudo: dom.links.expertisePseudo,
      speedPseudo: dom.links.speedPseudo,
      accessDependency: dom.links.accessDependency
    };

    let focusedNodes = ["access", "expertise", "speed"];
    let focusedLinks = ["accessExpertise", "accessSpeed"];

    if (hasStableAccess) {
      focusedNodes = ["access", "knowledge", "expertise"];
      focusedLinks = ["accessKnowledge", "knowledgeExpertise"];
    } else if (hasLocalIndependence) {
      focusedNodes = ["access", "knowledge", "dependency"];
      focusedLinks = ["accessKnowledge", "accessDependency"];
    } else if (platformDominant) {
      focusedNodes = ["access", "dependency"];
      focusedLinks = ["accessDependency"];
    } else if (hasLiteracyGap) {
      focusedNodes = ["access", "expertise", "pseudo"];
      focusedLinks = ["accessExpertise", "expertisePseudo"];
    } else if (hasSpeedTrap) {
      focusedNodes = ["access", "speed", "pseudo"];
      focusedLinks = ["accessSpeed", "speedPseudo"];
    } else if (metrics.pseudoExpertRisk > 70) {
      focusedNodes = ["access", "expertise", "speed", "pseudo"];
      focusedLinks = ["accessExpertise", "accessSpeed", "expertisePseudo", "speedPseudo"];
    } else if (metrics.platformDependency > 70) {
      focusedNodes = ["access", "dependency"];
      focusedLinks = ["accessDependency"];
    }

    const activeNodes = new Set(focusedNodes);
    const activeLinks = new Set(focusedLinks);

    dom.mapSurface.classList.toggle("has-focus", activeNodes.size > 0);

    Object.entries(nodes).forEach(([key, node]) => {
      node.classList.toggle("is-focused", activeNodes.has(key));
    });

    Object.entries(links).forEach(([key, link]) => {
      link.classList.toggle("is-focused", activeLinks.has(key));
    });
  }

  function renderMap(values, metrics) {
    dom.nodeAccessScore.textContent = score(values.aiAccessibility);
    dom.nodeKnowledgeScore.textContent = score(metrics.knowledgeAccess);
    dom.nodeExpertiseScore.textContent = score(metrics.expertiseShift);
    dom.nodeSpeedScore.textContent = score(metrics.timeSpaceCompression);
    dom.nodePseudoScore.textContent = score(metrics.pseudoExpertRisk);
    dom.nodeDependencyScore.textContent = score(metrics.platformDependency);

    setNodeScore(dom.nodeAccess, values.aiAccessibility);
    setNodeScore(dom.nodeKnowledge, metrics.knowledgeAccess);
    setNodeScore(dom.nodeExpertise, metrics.expertiseShift);
    setNodeScore(dom.nodeSpeed, metrics.timeSpaceCompression);
    setNodeScore(dom.nodePseudo, metrics.pseudoExpertRisk);
    setNodeScore(dom.nodeDependency, metrics.platformDependency);

    setLinkStrength(dom.links.accessKnowledge, metrics.knowledgeAccess);
    setLinkStrength(dom.links.accessExpertise, metrics.expertiseShift);
    setLinkStrength(dom.links.accessSpeed, metrics.timeSpaceCompression);
    setLinkStrength(dom.links.knowledgeExpertise, (metrics.knowledgeAccess + metrics.expertiseShift) / 2);
    setLinkStrength(dom.links.expertisePseudo, metrics.pseudoExpertRisk);
    setLinkStrength(dom.links.speedPseudo, (metrics.timeSpaceCompression + metrics.pseudoExpertRisk) / 2);
    setLinkStrength(dom.links.accessDependency, metrics.platformDependency);
    applyMapFocus(values, metrics);
    updateLinkGeometry();
  }

  function collectWarnings(values, metrics) {
    const badges = [];

    if (metrics.pseudoExpertRisk > 70) {
      badges.push({ label: "High pseudo-expert risk", tone: "risk" });
    }

    if (metrics.platformDependency > 70) {
      badges.push({ label: "High platform dependency", tone: "risk" });
    }

    if (values.workPacePressure > 75 && values.aiAccessibility > 75) {
      badges.push({ label: "Speed trap risk", tone: "risk" });
    }

    if (values.aiAccessibility > 65 && values.aiLiteracy < 45) {
      badges.push({ label: "Access outruns AI literacy", tone: "risk" });
    }

    if (metrics.knowledgeAccess > 75 && metrics.pseudoExpertRisk < 50) {
      badges.push({ label: "High access with stronger checks", tone: "good" });
    }

    if (values.localModelMaturity > 70 && values.platformConcentration < 50) {
      badges.push({ label: "More independent local AI", tone: "good" });
    }

    return badges;
  }

  function summarizeScenario(values) {
    const metrics = calculateMetrics(values);
    const warnings = collectWarnings(values, metrics);
    const riskBadge = warnings.find((badge) => badge.tone === "risk");
    const goodBadge = warnings.find((badge) => badge.tone === "good");
    const tone = riskBadge ? "risk" : goodBadge ? "good" : "neutral";

    return {
      shift: score(calculateSocietyShift(values, metrics)),
      label: riskBadge?.label || goodBadge?.label || "No major warning",
      tone
    };
  }

  function renderScenarioSlots() {
    dom.scenarioButtons.forEach((button, index) => {
      const slot = state.scenarios[index];
      if (!slot) return;

      const summary = summarizeScenario(slot.values);
      const isActive = index === state.activeScenarioIndex;

      button.classList.toggle("is-active", isActive);
      button.classList.toggle("is-risk", summary.tone === "risk");
      button.classList.toggle("is-good", summary.tone === "good");
      button.setAttribute("aria-pressed", String(isActive));
      if (isActive) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
      button.setAttribute(
        "aria-label",
        `${slot.title}, ${slot.description}. Transformation ${summary.shift} out of 100.`
      );

      button.innerHTML = `
        <span class="scenario-slot__name">${slot.title}</span>
        <strong>${summary.shift} / 100</strong>
        <small>${slot.description}</small>
        <em>${summary.label}</em>
      `;
    });

    const activeSlot = state.scenarios[state.activeScenarioIndex];
    if (dom.activeScenarioLabel && activeSlot) {
      dom.activeScenarioLabel.textContent = `Editing ${activeSlot.title}`;
    }
  }

  function loadScenarioSlot(index) {
    if (index < 0 || index >= state.scenarios.length || index === state.activeScenarioIndex) return;

    updateActiveScenario(readInputs());
    state.activeScenarioIndex = index;
    writeInputs(state.scenarios[index].values);
    render(true);
  }

  function renderWarnings(values, metrics) {
    const badges = collectWarnings(values, metrics);
    dom.warningList.replaceChildren();

    if (!badges.length) {
      badges.push({ label: "No major warning in this setup", tone: "neutral" });
    }

    badges.forEach((badge) => {
      const item = document.createElement("span");
      item.className = `warning-badge warning-badge--${badge.tone}`;
      item.textContent = badge.label;
      dom.warningList.append(item);
    });
  }

  function renderSocietyMeter(values, metrics) {
    const shift = calculateSocietyShift(values, metrics);
    const shiftScore = score(shift);
    const description = describeSocietyShift(values, metrics, shift);

    dom.societyMeter.style.setProperty("--society-score", `${shiftScore}%`);
    dom.societyMeterValue.textContent = `${shiftScore} / 100`;
    dom.societyMeterTrack.setAttribute("aria-valuenow", String(shiftScore));
    dom.societyMeterStatus.textContent = description.status;
    dom.societyMeterNote.textContent = description.note;
    dom.societyMeterShape.textContent = description.shape;
  }

  function pulseMap() {
    if (!dom.mapSurface) return;

    clearTimeout(state.mapPulseTimer);
    dom.mapSurface.classList.remove("is-updating");
    void dom.mapSurface.offsetWidth;
    dom.mapSurface.classList.add("is-updating");
    state.mapPulseTimer = setTimeout(() => {
      dom.mapSurface.classList.remove("is-updating");
    }, 520);
  }

  function render(animate = false) {
    const values = readInputs();
    const metrics = calculateMetrics(values);

    if (animate) pulseMap();
    renderInputs(values);
    renderScenarioSlots();
    renderMap(values, metrics);
    renderWarnings(values, metrics);
    renderSocietyMeter(values, metrics);

    if (state.embedResizer) state.embedResizer.request();
  }

  function attachEvents() {
    INPUT_KEYS.forEach((key) => {
      dom.inputs[key].addEventListener("input", () => {
        updateActiveScenario(readInputs());
        render(true);
      });
    });

    dom.scenarioButtons.forEach((button) => {
      button.addEventListener("click", () => {
        loadScenarioSlot(Number(button.dataset.scenarioSlot));
      });
    });

    window.addEventListener("resize", requestLinkGeometry, { passive: true });
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
      } catch {}

      try {
        window.parent.postMessage({ type: "simfluence-widget:resize", height }, "*");
      } catch {}
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
    setTimeout(request, 240);
    setTimeout(request, 800);
    request();

    return {
      request,
      disconnect() {
        if (resizeObserver) resizeObserver.disconnect();
        window.removeEventListener("message", handleMessage);
      }
    };
  }

  function applyEmbedMode() {
    const params = new URLSearchParams(window.location.search);
    let inFrame = false;

    try {
      inFrame = window.self !== window.top;
    } catch {
      inFrame = true;
    }

    if (params.get("embed") === "1" || params.get("embedMode") === "1" || inFrame) {
      dom.body.classList.add("embed-mode");
    }
  }

  function init() {
    applyEmbedMode();
    state.scenarios = loadScenarioSlots();
    writeInputs(state.scenarios[state.activeScenarioIndex]?.values || DEFAULTS);
    attachEvents();
    state.embedResizer = createEmbedResizer(dom.shell);
    render();
  }

  init();
})();
