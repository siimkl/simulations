(() => {
  const URL_PARAMS = new URLSearchParams(window.location.search);
  const IS_EMBEDDED = window.parent !== window || URL_PARAMS.get("embedMode") === "1" || URL_PARAMS.get("embed") === "1";
  const EMBED_WIDGET_ID = "sim10-time-cost";
  if (IS_EMBEDDED) {
    document.documentElement.classList.add("embedMode");
    document.body.classList.add("embedMode");
  }

  const SIM_CONFIG = {
    brandName: "Illustrative workflow model",
    title: "Manual and automated workflow costs",
    accent: "#1E96EC",
    warning: "#FF7F22",
    success: "#18A957",
    automationTaskTimeMultiplier: 0.58,
    automationFollowUpMultiplier: 0.45,
    automationHandoffMultiplier: 0.5,
    labels: {
      compareTitle: "Two processes under the same workload",
      compareText:
        "Both processes use the same team size, task volume, handling time, follow-up rate, and hourly cost. The differences are model estimates."
    }
  };

  const WORKING_DAYS = 500;
  const TICK_MS = 32;
  const EMPLOYEE_CAPACITY_MINUTES = 90;
  const FULL_TIME_HOURS = (WORKING_DAYS / 250) * 1800;
  const SMALL_TEAM_NO_CORRECTION_MAX = 10;
  const DEFAULT_HOURLY_COST = 45;
  const MAX_HOURLY_COST = 1000;

  const STABILITY_META = {
    stable: { label: "Stable" },
    strained: { label: "Strained" },
    unstable: { label: "Unstable" },
    overloaded: { label: "Overloaded" }
  };

  const number0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const number1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  const number2 = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const currency0 = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });

  const el = {
    simTitle: document.getElementById("simTitle"),
    brandName: document.getElementById("brandName"),
    modeTitle: document.getElementById("modeTitle"),
    modeText: document.getElementById("modeText"),
    outcomeText: document.getElementById("outcomeText"),
    dayCounter: document.getElementById("dayCounter"),
    progressLabel: document.getElementById("progressLabel"),
    timeProgressFill: document.getElementById("timeProgressFill"),
    pauseButton: document.getElementById("pauseButton"),
    resetButton: document.getElementById("resetButton"),

    teamSize: document.getElementById("teamSize"),
    tasksPerDay: document.getElementById("tasksPerDay"),
    minutesPerTask: document.getElementById("minutesPerTask"),
    errorRate: document.getElementById("errorRate"),
    hourlyCost: document.getElementById("hourlyCost"),
    teamSizeValue: document.getElementById("teamSizeValue"),
    tasksPerDayValue: document.getElementById("tasksPerDayValue"),
    minutesPerTaskValue: document.getElementById("minutesPerTaskValue"),
    errorRateValue: document.getElementById("errorRateValue"),

    manualCard: document.getElementById("manualCard"),
    autoCard: document.getElementById("autoCard"),
    manualStability: document.getElementById("manualStability"),
    autoStability: document.getElementById("autoStability"),
    manualBacklogMinutes: document.getElementById("manualBacklogMinutes"),
    autoBacklogMinutes: document.getElementById("autoBacklogMinutes"),
    manualBacklogFill: document.getElementById("manualBacklogFill"),
    autoBacklogFill: document.getElementById("autoBacklogFill"),
    manualHours: document.getElementById("manualHours"),
    autoHours: document.getElementById("autoHours"),
    manualCorrectionHours: document.getElementById("manualCorrectionHours"),
    autoCorrectionHours: document.getElementById("autoCorrectionHours"),
    manualLaborCost: document.getElementById("manualLaborCost"),
    autoLaborCost: document.getElementById("autoLaborCost"),
    manualFteEquivalent: document.getElementById("manualFteEquivalent"),
    autoFteEquivalent: document.getElementById("autoFteEquivalent"),
    deltaHoursSaved: document.getElementById("deltaHoursSaved"),
    deltaReworkSaved: document.getElementById("deltaReworkSaved"),
    deltaCostSaved: document.getElementById("deltaCostSaved"),
    deltaFteSaved: document.getElementById("deltaFteSaved"),

    statsModal: document.getElementById("statsModal"),
    statsClose: document.getElementById("statsClose"),
    popupManualHours: document.getElementById("popupManualHours"),
    popupAutoHours: document.getElementById("popupAutoHours"),
    popupManualFollowUp: document.getElementById("popupManualFollowUp"),
    popupAutoFollowUp: document.getElementById("popupAutoFollowUp"),
    popupManualCost: document.getElementById("popupManualCost"),
    popupAutoCost: document.getElementById("popupAutoCost"),
    popupManualFte: document.getElementById("popupManualFte"),
    popupAutoFte: document.getElementById("popupAutoFte"),
    popupHoursSaved: document.getElementById("popupHoursSaved"),
    popupCostSaved: document.getElementById("popupCostSaved"),
  };

  const manualScenario = createScenario("manualCanvas", el.manualCard, "manual");
  const autoScenario = createScenario("autoCanvas", el.autoCard, "auto");
  const syncEmbedHeight = setupEmbedAutoHeight();

  let tickHandle = null;
  let lastFrameTime = performance.now();
  let displayedProgressRatio = 0;
  let targetProgressRatio = 0;
  let pausedByStats = false;
  let pausedByUser = false;

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let prefersReducedMotion = reduceMotionQuery.matches;
  if (typeof reduceMotionQuery.addEventListener === "function") {
    reduceMotionQuery.addEventListener("change", (event) => {
      prefersReducedMotion = event.matches;
    });
  }

  applyConfig();
  bindEvents();
  updateControlLabels();
  resetAllScenarios();
  simulateDay();
  startSimulationLoop();
  requestAnimationFrame(renderFrame);

  function createScenario(canvasId, cardEl, role) {
    const canvas = document.getElementById(canvasId);
    return {
      role,
      canvas,
      ctx: canvas.getContext("2d"),
      cardEl,
      items: [],
      links: [],
      echoes: [],
      day: 0,
      backlogMinutes: 0,
      totalMinutes: 0,
      followUpMinutes: 0,
      dailyIncoming: 0,
      dailyCapacity: 0,
      overflowRatio: 0,
      stability: { key: "stable", ratio: 0 },
      flowCounts: { normal: 0, followUp: 0 },
      workerCursor: 0,
      spawnCarry: { normal: 0, followUp: 0 },
      width: 0,
      height: 0
    };
  }

  function applyConfig() {
    el.simTitle.textContent = SIM_CONFIG.title;
    el.brandName.textContent = SIM_CONFIG.brandName;
    el.modeTitle.textContent = SIM_CONFIG.labels.compareTitle;
    el.modeText.textContent = SIM_CONFIG.labels.compareText;
    document.documentElement.style.setProperty("--accent", SIM_CONFIG.accent);
    syncEmbedHeight();
  }

  function bindEvents() {
    [el.teamSize, el.tasksPerDay, el.minutesPerTask, el.errorRate].forEach((input) => {
      input.addEventListener("input", () => {
        updateControlLabels();
        syncEmbedHeight();
      });
      input.addEventListener("change", () => {
        closeInfoTips();
        resetAllScenarios();
        simulateDay();
        syncEmbedHeight();
      });
    });

    el.hourlyCost.addEventListener("input", () => {
      closeInfoTips();
      updateCompareOutputs();
      syncEmbedHeight();
    });

    el.hourlyCost.addEventListener("change", () => {
      closeInfoTips();
      el.hourlyCost.value = String(normalizeHourlyCostValue(el.hourlyCost.value));
      updateCompareOutputs();
      syncEmbedHeight();
    });

    el.resetButton.addEventListener("click", () => {
      closeInfoTips();
      pausedByUser = false;
      updatePauseButton();
      resetAllScenarios();
      simulateDay();
      syncEmbedHeight();
    });

    el.pauseButton.addEventListener("click", toggleUserPause);

    document.addEventListener("click", (event) => {
      const button = event.target.closest(".infoBtn");
      if (!button) {
        closeInfoTips();
        return;
      }

      const host = button.closest(".hasTip");
      if (!host) {
        return;
      }

      const shouldOpen = !host.classList.contains("hasTipOpen");
      closeInfoTips();
      host.classList.toggle("hasTipOpen", shouldOpen);
      button.setAttribute("aria-expanded", String(shouldOpen));
      syncEmbedHeight();
    });

    el.statsClose.addEventListener("click", closeStatsAndRestart);
    el.statsModal.addEventListener("click", (event) => {
      if (event.target === el.statsModal) {
        closeStatsAndRestart();
      }
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !el.statsModal.hidden) {
        closeStatsAndRestart();
      } else if (event.key === "Escape") {
        closeInfoTips();
      }
    });

    window.addEventListener("resize", () => {
      resizeScenarioCanvas(manualScenario);
      resizeScenarioCanvas(autoScenario);
      syncEmbedHeight();
    });
  }

  function setupEmbedAutoHeight() {
    if (!IS_EMBEDDED) {
      return () => {};
    }

    let rafId = 0;
    let lastHeight = 0;
    const rootEl = document.querySelector(".widget-shell");
    const modalEl = el.statsModal;

    const measureHeight = () => {
      const body = document.body;
      const html = document.documentElement;
      const docHeight = Math.ceil(Math.max(
        html ? html.scrollHeight : 0,
        html ? html.offsetHeight : 0,
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0
      ));

      let rootHeight = 0;
      if (rootEl) {
        const rectHeight = rootEl.getBoundingClientRect().height;
        const styles = getComputedStyle(rootEl);
        const marginTop = parseFloat(styles.marginTop) || 0;
        const marginBottom = parseFloat(styles.marginBottom) || 0;
        rootHeight = Math.ceil(rectHeight + marginTop + marginBottom);
      }

      let modalHeight = 0;
      if (modalEl && !modalEl.hidden) {
        const dialog = modalEl.querySelector(".stats-dialog");
        if (dialog) {
          modalHeight = Math.ceil(dialog.getBoundingClientRect().height + 32);
        }
      }

      const measuredHeight = Math.max(rootHeight, modalHeight);
      return measuredHeight > 0 ? measuredHeight : Math.max(docHeight, 1);
    };

    const pushHeight = () => {
      rafId = 0;
      const height = measureHeight();
      if (Math.abs(height - lastHeight) < 1) {
        return;
      }

      lastHeight = height;
      document.documentElement.style.minHeight = `${height}px`;
      document.body.style.minHeight = `${height}px`;

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
    };

    const schedule = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(pushHeight);
      }
    };

    schedule();
    window.setTimeout(schedule, 60);
    window.setTimeout(schedule, 240);
    window.setTimeout(schedule, 900);
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") {
        return;
      }

      if (
        data.type === "widget:request-height" ||
        data.type === `${EMBED_WIDGET_ID}:request-height` ||
        data.type === "simfluence-widget:request-height"
      ) {
        schedule();
      }
    }, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("load", schedule);

    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(schedule);
      if (rootEl) {
        observer.observe(rootEl);
      }
      if (modalEl) {
        observer.observe(modalEl);
      }
    }

    return schedule;
  }

  function startSimulationLoop() {
    if (pausedByUser || pausedByStats) {
      return;
    }
    if (tickHandle) {
      clearInterval(tickHandle);
    }
    tickHandle = setInterval(simulateDay, TICK_MS);
  }

  function stopSimulationLoop() {
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  }

  function closeInfoTips() {
    document.querySelectorAll(".hasTipOpen").forEach((element) => {
      element.classList.remove("hasTipOpen");
      const button = element.querySelector(".infoBtn");
      if (button) {
        button.setAttribute("aria-expanded", "false");
      }
    });
    syncEmbedHeight();
  }

  function isSimulationPaused() {
    return pausedByStats || pausedByUser;
  }

  function updatePauseButton() {
    el.pauseButton.textContent = pausedByUser ? "Resume" : "Pause";
    el.pauseButton.classList.toggle("is-paused", pausedByUser);
    el.pauseButton.setAttribute("aria-pressed", pausedByUser ? "true" : "false");
  }

  function toggleUserPause() {
    if (pausedByStats) {
      return;
    }

    pausedByUser = !pausedByUser;
    updatePauseButton();
    if (pausedByUser) {
      stopSimulationLoop();
    } else {
      lastFrameTime = performance.now();
      startSimulationLoop();
    }
  }

  function updateTimeProgress(day) {
    targetProgressRatio = clamp(day / WORKING_DAYS, 0, 1);
    el.progressLabel.textContent = `${Math.round(targetProgressRatio * 100)}%`;
  }

  function syncTimeProgress(dt = 1 / 60, force = false) {
    if (force) {
      displayedProgressRatio = targetProgressRatio;
    } else if (Math.abs(displayedProgressRatio - targetProgressRatio) > 0.0001) {
      const settle = 1 - Math.exp(-dt * 14);
      displayedProgressRatio = lerp(displayedProgressRatio, targetProgressRatio, settle);
      if (Math.abs(displayedProgressRatio - targetProgressRatio) < 0.0008) {
        displayedProgressRatio = targetProgressRatio;
      }
    }

    el.timeProgressFill.style.transform = `scaleX(${clamp(displayedProgressRatio, 0, 1)})`;
  }

  function updateControlLabels() {
    el.teamSizeValue.textContent = el.teamSize.value;
    el.tasksPerDayValue.textContent = el.tasksPerDay.value;
    el.minutesPerTaskValue.textContent = el.minutesPerTask.value;
    el.errorRateValue.textContent = `${el.errorRate.value}%`;
  }

  function getInputs() {
    return {
      teamSize: Number(el.teamSize.value),
      tasksPerDay: Number(el.tasksPerDay.value),
      minutesPerTask: Number(el.minutesPerTask.value),
      followUpRate: Number(el.errorRate.value) / 100,
      hourlyCost: normalizeHourlyCostValue(el.hourlyCost.value)
    };
  }

  function getEffectiveParams(inputs, automationOn) {
    if (!automationOn) {
      return {
        minutesPerTask: inputs.minutesPerTask,
        followUpRate: inputs.followUpRate,
        handoffMultiplier: 1
      };
    }

    return {
      minutesPerTask: inputs.minutesPerTask * SIM_CONFIG.automationTaskTimeMultiplier,
      followUpRate: inputs.followUpRate * SIM_CONFIG.automationFollowUpMultiplier,
      handoffMultiplier: SIM_CONFIG.automationHandoffMultiplier
    };
  }

  function simulateDay() {
    if (isSimulationPaused()) {
      return;
    }
    if (manualScenario.day >= WORKING_DAYS || autoScenario.day >= WORKING_DAYS) {
      return;
    }

    const inputs = getInputs();
    const dayNumber = manualScenario.day + 1;

    stepScenario(manualScenario, inputs, false, dayNumber);
    stepScenario(autoScenario, inputs, true, dayNumber);

    el.dayCounter.textContent = `Day ${manualScenario.day} / ${WORKING_DAYS}`;
    updateTimeProgress(manualScenario.day);
    const summary = updateCompareOutputs();

    if (dayNumber === WORKING_DAYS) {
      showStatsPopup(summary);
    }
  }

  function stepScenario(scenario, inputs, automationOn, dayNumber) {
    const effective = getEffectiveParams(inputs, automationOn);

    const dailyBaseMinutes = inputs.teamSize * inputs.tasksPerDay * effective.minutesPerTask;
    const dailyFollowUpTasks = inputs.teamSize * inputs.tasksPerDay * effective.followUpRate;
    const followUpMinutesPerTask = effective.minutesPerTask * 1.25;
    const dailyFollowUpMinutes = dailyFollowUpTasks * followUpMinutesPerTask;

    const handoffMinutes = dailyBaseMinutes * 0.16 * effective.handoffMultiplier;
    const dailyIncomingMinutes = dailyBaseMinutes + dailyFollowUpMinutes + handoffMinutes;
    const dailyCapacityMinutes = inputs.teamSize * EMPLOYEE_CAPACITY_MINUTES;

    scenario.backlogMinutes = Math.max(
      0,
      scenario.backlogMinutes + dailyIncomingMinutes - dailyCapacityMinutes
    );

    scenario.totalMinutes += dailyIncomingMinutes;
    scenario.followUpMinutes += dailyFollowUpMinutes;
    scenario.dailyIncoming = dailyIncomingMinutes;
    scenario.dailyCapacity = dailyCapacityMinutes;
    scenario.day = dayNumber;
    scenario.stability = getStability(scenario.backlogMinutes, scenario.dailyCapacity);
    scenario.overflowRatio = clamp(scenario.stability.ratio / 7, 0, 1);

    spawnParticles(scenario, inputs, effective);
  }

  function resetAllScenarios() {
    const inputs = getInputs();
    hideStatsPopup();
    pausedByStats = false;
    stopSimulationLoop();

    [manualScenario, autoScenario].forEach((scenario) => {
      scenario.day = 0;
      scenario.backlogMinutes = 0;
      scenario.totalMinutes = 0;
      scenario.followUpMinutes = 0;
      scenario.dailyIncoming = 0;
      scenario.dailyCapacity = inputs.teamSize * EMPLOYEE_CAPACITY_MINUTES;
      scenario.overflowRatio = 0;
      scenario.stability = { key: "stable", ratio: 0 };
      scenario.flowCounts = { normal: 0, followUp: 0 };
      scenario.workerCursor = 0;
      scenario.spawnCarry = { normal: 0, followUp: 0 };
      scenario.items.length = 0;
      scenario.links.length = 0;
      scenario.echoes.length = 0;
    });

    el.dayCounter.textContent = `Day 0 / ${WORKING_DAYS}`;
    updateCompareOutputs();
    updateTimeProgress(0);
    syncTimeProgress(1 / 60, true);
    updatePauseButton();
    startSimulationLoop();
    syncEmbedHeight();
  }

  function getStability(backlogMinutes, dailyCapacityMinutes) {
    const ratio = dailyCapacityMinutes > 0 ? backlogMinutes / dailyCapacityMinutes : 0;

    if (ratio < 1) {
      return { key: "stable", ratio };
    }
    if (ratio < 3) {
      return { key: "strained", ratio };
    }
    if (ratio < 7) {
      return { key: "unstable", ratio };
    }
    return { key: "overloaded", ratio };
  }

  function formatScenarioMetrics(scenario, hourlyCost) {
    const totalHours = scenario.totalMinutes / 60;
    const followUpHours = scenario.followUpMinutes / 60;
    const laborCost = totalHours * hourlyCost;
    const fteEquivalent = totalHours / FULL_TIME_HOURS;

    return {
      totalHours,
      followUpHours,
      laborCost,
      fteEquivalent,
      stability: scenario.stability
    };
  }

  function getCompareSummary() {
    const { hourlyCost } = getInputs();
    const manualMetrics = formatScenarioMetrics(manualScenario, hourlyCost);
    const autoMetrics = formatScenarioMetrics(autoScenario, hourlyCost);
    const hoursSaved = Math.max(0, manualMetrics.totalHours - autoMetrics.totalHours);
    const followUpSaved = Math.max(0, manualMetrics.followUpHours - autoMetrics.followUpHours);
    const costSaved = Math.max(0, manualMetrics.laborCost - autoMetrics.laborCost);
    const fteRecovered = Math.max(0, manualMetrics.fteEquivalent - autoMetrics.fteEquivalent);

    return {
      manualMetrics,
      autoMetrics,
      hoursSaved,
      followUpSaved,
      costSaved,
      fteRecovered
    };
  }

  function updateCompareOutputs(summary = getCompareSummary()) {
    const {
      manualMetrics,
      autoMetrics,
      hoursSaved,
      followUpSaved,
      costSaved,
      fteRecovered
    } = summary;

    el.manualStability.textContent = `${STABILITY_META[manualMetrics.stability.key].label} (${number1.format(
      manualMetrics.stability.ratio
    )}x)`;
    el.autoStability.textContent = `${STABILITY_META[autoMetrics.stability.key].label} (${number1.format(
      autoMetrics.stability.ratio
    )}x)`;

    el.manualBacklogMinutes.textContent = `${number0.format(manualScenario.backlogMinutes)} min`;
    el.autoBacklogMinutes.textContent = `${number0.format(autoScenario.backlogMinutes)} min`;
    el.manualBacklogFill.style.width = `${manualScenario.overflowRatio * 100}%`;
    el.autoBacklogFill.style.width = `${autoScenario.overflowRatio * 100}%`;

    setCardStabilityClass(el.manualCard, manualMetrics.stability.key);
    setCardStabilityClass(el.autoCard, autoMetrics.stability.key);

    el.manualHours.textContent = number0.format(manualMetrics.totalHours);
    el.autoHours.textContent = number0.format(autoMetrics.totalHours);
    el.manualCorrectionHours.textContent = number0.format(manualMetrics.followUpHours);
    el.autoCorrectionHours.textContent = number0.format(autoMetrics.followUpHours);
    el.manualLaborCost.textContent = currency0.format(manualMetrics.laborCost);
    el.autoLaborCost.textContent = currency0.format(autoMetrics.laborCost);
    el.manualFteEquivalent.textContent = number2.format(manualMetrics.fteEquivalent);
    el.autoFteEquivalent.textContent = number2.format(autoMetrics.fteEquivalent);

    el.deltaHoursSaved.textContent = number0.format(hoursSaved);
    el.deltaReworkSaved.textContent = number0.format(followUpSaved);
    el.deltaCostSaved.textContent = currency0.format(costSaved);
    el.deltaFteSaved.textContent = number2.format(fteRecovered);

    const queueSaved = Math.max(0, manualScenario.backlogMinutes - autoScenario.backlogMinutes);
    el.outcomeText.textContent = `Under the current assumptions, the automated workflow uses ${number0.format(
      hoursSaved
    )} fewer hours and ${currency0.format(costSaved)} less labor cost across 500 days. The backlog difference is ${number0.format(
      queueSaved
    )} minutes.`;
    return summary;
  }

  function setCardStabilityClass(cardEl, stabilityKey) {
    cardEl.classList.remove("is-stable", "is-strained", "is-unstable", "is-overloaded");
    cardEl.classList.add(`is-${stabilityKey}`);
  }

  function showStatsPopup(summary) {
    closeInfoTips();
    el.popupManualHours.textContent = number0.format(summary.manualMetrics.totalHours);
    el.popupAutoHours.textContent = number0.format(summary.autoMetrics.totalHours);
    el.popupManualFollowUp.textContent = number0.format(summary.manualMetrics.followUpHours);
    el.popupAutoFollowUp.textContent = number0.format(summary.autoMetrics.followUpHours);
    el.popupManualCost.textContent = currency0.format(summary.manualMetrics.laborCost);
    el.popupAutoCost.textContent = currency0.format(summary.autoMetrics.laborCost);
    el.popupManualFte.textContent = number2.format(summary.manualMetrics.fteEquivalent);
    el.popupAutoFte.textContent = number2.format(summary.autoMetrics.fteEquivalent);
    el.popupHoursSaved.textContent = `${number0.format(summary.hoursSaved)} h`;
    el.popupCostSaved.textContent = currency0.format(summary.costSaved);
    el.statsModal.hidden = false;
    pausedByStats = true;
    stopSimulationLoop();
    syncEmbedHeight();
  }

  function hideStatsPopup() {
    el.statsModal.hidden = true;
    syncEmbedHeight();
  }

  function closeStatsAndRestart() {
    hideStatsPopup();
    pausedByStats = false;
    pausedByUser = false;
    resetAllScenarios();
    simulateDay();
  }

  function resizeScenarioCanvas(scenario) {
    const dpr = window.devicePixelRatio || 1;
    const rect = scenario.canvas.getBoundingClientRect();
    const width = Math.max(280, Math.floor(rect.width));
    const height = Math.max(180, Math.floor(rect.height));
    const targetWidth = Math.floor(width * dpr);
    const targetHeight = Math.floor(height * dpr);

    if (scenario.canvas.width !== targetWidth || scenario.canvas.height !== targetHeight) {
      scenario.canvas.width = targetWidth;
      scenario.canvas.height = targetHeight;
      scenario.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    scenario.width = width;
    scenario.height = height;
  }

  function getLayout(scenario) {
    const w = scenario.width;
    const h = scenario.height;

    const compact = w < 520;
    const pad = compact ? 8 : 10;
    const headerY = compact ? 23 : 24;
    const stageGap = compact ? 6 : 8;

    const board = {
      x: pad,
      y: headerY,
      w: Math.max(250, w - pad * 2),
      h: Math.max(140, h - headerY - pad)
    };

    const innerPad = compact ? 8 : 10;
    const queueW = compact ? 40 : 52;
    const pipeline = {
      x: board.x + innerPad,
      y: board.y + innerPad + 7,
      w: Math.max(170, board.w - queueW - innerPad * 3),
      h: Math.max(120, board.h - innerPad * 2 - 4)
    };

    const queue = {
      x: pipeline.x + pipeline.w + innerPad,
      y: pipeline.y,
      w: queueW,
      h: pipeline.h
    };

    const doneW = Math.max(compact ? 30 : 34, pipeline.w * 0.12);
    const minWorkbenchW = compact ? 76 : 92;
    const entryW = clamp(
      pipeline.w * 0.24,
      compact ? 40 : 48,
      pipeline.w - doneW - stageGap * 2 - minWorkbenchW
    );

    const entry = {
      x: pipeline.x,
      y: pipeline.y,
      w: entryW,
      h: pipeline.h
    };
    const workbench = {
      x: entry.x + entry.w + stageGap,
      y: pipeline.y,
      w: Math.max(minWorkbenchW, pipeline.w - entry.w - doneW - stageGap * 2),
      h: pipeline.h
    };
    const done = {
      x: workbench.x + workbench.w + stageGap,
      y: pipeline.y,
      w: doneW,
      h: pipeline.h
    };

    const lanes = {
      normal: {
        y0: pipeline.y + pipeline.h * 0.13,
        y1: pipeline.y + pipeline.h * 0.34,
        label: compact ? "Core" : "Core workflow"
      },
      followUp: {
        y0: pipeline.y + pipeline.h * 0.66,
        y1: pipeline.y + pipeline.h * 0.87,
        label: compact ? "Follow-up" : "Follow-up work"
      }
    };
    const workerZone = {
      x: workbench.x + 12,
      y: pipeline.y + pipeline.h * 0.4,
      w: Math.max(42, workbench.w - 24),
      h: pipeline.h * 0.18
    };
    Object.values(lanes).forEach((lane) => {
      lane.yMid = (lane.y0 + lane.y1) / 2;
    });

    return {
      compact,
      board,
      pipeline,
      entry,
      workbench,
      done,
      workerZone,
      queue,
      lanes
    };
  }

  function getVisualStaffing(teamSize, role) {
    const size = clamp(Math.round(teamSize), 1, 100);
    if (role !== "auto") {
      return {
        ops: clamp(Math.ceil(size / 6), 2, 12),
        tech: 0,
        automation: 0
      };
    }

    return {
      ops: clamp(Math.ceil(size / 16), 1, 6),
      tech: size >= 14 ? 1 : 0,
      automation: clamp(Math.round(size / 35) + (size >= 18 ? 1 : 0), 1, 4)
    };
  }

  function addWorkerCluster(nodes, layout, options) {
    const {
      count,
      idPrefix,
      kind,
      label,
      x0,
      x1,
      y0,
      y1,
      size,
      phaseOffset = 0,
      showLabels = false,
      splitLanes = false,
      fixedLaneKey
    } = options;
    if (!count) {
      return;
    }

    const cols = count <= 2 ? 1 : count <= 6 ? 2 : 3;
    const rows = Math.ceil(count / cols);
    for (let i = 0; i < count; i += 1) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const colRatio = cols === 1 ? 0.5 : col / (cols - 1);
      const rowRatio = rows === 1 ? 0.5 : row / (rows - 1);
      const x = lerp(x0, x1, colRatio) + (((row + col) % 2 === 0 ? -1 : 1) * Math.min(2.2, size * 0.12));
      const y = lerp(y0, y1, rowRatio) + ((col % 2 === 0 ? -1 : 1) * Math.min(1.8, size * 0.1));
      const laneKey = fixedLaneKey
        ? fixedLaneKey
        : splitLanes
          ? rows === 1
            ? i % 2 === 0
              ? "normal"
              : "followUp"
            : row < rows / 2
              ? "normal"
              : "followUp"
          : y > layout.workbench.y + layout.workbench.h * 0.56
            ? "followUp"
            : "normal";
      const driftPad = Math.max(2.5, size * 0.38);
      nodes.push({
        id: `${idPrefix}-${i}`,
        kind,
        label,
        showLabel: showLabels && (count <= 2 || i === 0),
        laneKey,
        x,
        y,
        size,
        phase: phaseOffset + i * 0.82,
        minX: Math.min(x0, x1) - driftPad,
        maxX: Math.max(x0, x1) + driftPad,
        minY: Math.min(y0, y1) - driftPad,
        maxY: Math.max(y0, y1) + driftPad
      });
    }
  }

  function getWorkerNodes(layout, scenario) {
    const teamSize = Number(el.teamSize.value);
    const isAuto = scenario.role === "auto";
    const nodes = [];
    const staffing = getVisualStaffing(teamSize, scenario.role);
    const zone = layout.workerZone;

    if (!isAuto) {
      addWorkerCluster(nodes, layout, {
        count: staffing.ops,
        idPrefix: "manual",
        kind: "human",
        label: "Ops",
        x0: zone.x + zone.w * 0.18,
        x1: zone.x + zone.w * 0.82,
        y0: zone.y + zone.h * 0.2,
        y1: zone.y + zone.h * 0.8,
        size: layout.compact ? 8.1 : 9.2,
        splitLanes: true
      });
      return nodes;
    }

    addWorkerCluster(nodes, layout, {
      count: staffing.ops,
      idPrefix: "auto-human",
      kind: "human",
      label: "Ops",
        x0: zone.x + zone.w * 0.08,
        x1: zone.x + zone.w * 0.32,
        y0: zone.y + zone.h * 0.18,
        y1: zone.y + zone.h * 0.82,
        size: layout.compact ? 7.9 : 8.9,
        splitLanes: true
      });

    addWorkerCluster(nodes, layout, {
      count: staffing.tech,
      idPrefix: "auto-tech",
      kind: "tech",
      label: "IT",
      x0: zone.x + zone.w * 0.5,
      x1: zone.x + zone.w * 0.5,
      y0: zone.y + zone.h * 0.34,
      y1: zone.y + zone.h * 0.66,
      size: layout.compact ? 8.3 : 9.5,
      phaseOffset: 3.2,
      showLabels: true,
      fixedLaneKey: "normal"
    });

    addWorkerCluster(nodes, layout, {
      count: staffing.automation,
      idPrefix: "auto-system",
      kind: "system",
      label: "Auto",
      x0: zone.x + zone.w * 0.68,
      x1: zone.x + zone.w * 0.9,
      y0: zone.y + zone.h * 0.18,
      y1: zone.y + zone.h * 0.82,
      size: layout.compact ? 9.1 : 10.6,
      phaseOffset: 5.4,
      showLabels: true,
      splitLanes: true
    });

    return nodes;
  }

  function getWorkerPose(node, now, loadInfluence) {
    const isSystem = node.kind === "system";
    const isTech = node.kind === "tech";
    const floatScale = isSystem ? 2.4 : isTech ? 2 : 1.8;
    const driftX = Math.sin(now * (isSystem ? 0.0044 : isTech ? 0.0036 : 0.0032) + node.phase) * floatScale;
    const driftY =
      Math.cos(now * (isSystem ? 0.0052 : isTech ? 0.0043 : 0.0038) + node.phase * 1.3) *
      (floatScale + loadInfluence * 1.4);

    return {
      ...node,
      drawX: clamp(node.x + driftX, node.minX ?? -Infinity, node.maxX ?? Infinity),
      drawY: clamp(node.y + driftY, node.minY ?? -Infinity, node.maxY ?? Infinity),
      taskX: node.x - (isSystem ? 24 : 20),
      taskY: node.y + driftY * 0.35
    };
  }

  function pickWorkerNode(workers, scenario, type) {
    if (!workers.length) {
      return null;
    }

    const preferredLane = type === "followUp" ? "followUp" : "normal";
    const pool = workers.filter((worker) => worker.laneKey === preferredLane);
    const source = pool.length ? pool : workers;
    const worker = source[scenario.workerCursor % source.length];
    scenario.workerCursor += 1;
    return worker;
  }

  function pushScenarioLink(scenario, link) {
    scenario.links.push(link);
    if (scenario.links.length > 120) {
      scenario.links.splice(0, scenario.links.length - 120);
    }
  }

  function pushScenarioEcho(scenario, echo) {
    scenario.echoes.push(echo);
    if (scenario.echoes.length > 28) {
      scenario.echoes.splice(0, scenario.echoes.length - 28);
    }
  }

  function spawnParticles(scenario, inputs, effective) {
    if (!scenario.width || !scenario.height) {
      resizeScenarioCanvas(scenario);
    }

    const isAuto = scenario.role === "auto";
    const reduceScale = prefersReducedMotion ? 0.5 : 1;
    const baseTasks = inputs.teamSize * inputs.tasksPerDay;
    const layout = getLayout(scenario);
    const workers = getWorkerNodes(layout, scenario);
    const loadRatio = scenario.dailyCapacity > 0 ? scenario.dailyIncoming / scenario.dailyCapacity : 1;

    let desiredNormal = clamp(baseTasks / (isAuto ? 850 : 950), 0.22, 1.6);
    let desiredFollowUp = clamp((baseTasks * effective.followUpRate) / (isAuto ? 1700 : 1450), 0, 0.65);

    if (inputs.teamSize <= SMALL_TEAM_NO_CORRECTION_MAX) {
      desiredFollowUp = 0;
    }

    if (loadRatio > 1.08) {
      desiredNormal *= 1.16;
    }
    if (scenario.stability.key === "overloaded") {
      desiredNormal *= 1.2;
      desiredFollowUp *= 1.2;
    }

    desiredNormal *= reduceScale;
    desiredFollowUp *= reduceScale;

    scenario.spawnCarry.normal += desiredNormal;
    scenario.spawnCarry.followUp += desiredFollowUp;

    let normalCount = Math.floor(scenario.spawnCarry.normal);
    let followUpCount = Math.floor(scenario.spawnCarry.followUp);
    scenario.spawnCarry.normal -= normalCount;
    scenario.spawnCarry.followUp -= followUpCount;

    if (Math.random() < scenario.spawnCarry.normal) {
      normalCount += 1;
      scenario.spawnCarry.normal = 0;
    }
    if (Math.random() < scenario.spawnCarry.followUp) {
      followUpCount += 1;
      scenario.spawnCarry.followUp = 0;
    }

    scenario.flowCounts = {
      normal: normalCount,
      followUp: followUpCount
    };

    const laneJitter = isAuto ? 1.2 : 2.4;
    const spawnSet = [];
    for (let i = 0; i < normalCount; i += 1) {
      spawnSet.push({ type: "normal", laneKey: "normal", slot: i, slotCount: Math.max(3, normalCount + 1) });
    }
    for (let i = 0; i < followUpCount; i += 1) {
      spawnSet.push({
        type: "followUp",
        laneKey: "followUp",
        slot: i,
        slotCount: Math.max(2, followUpCount + 1)
      });
    }

    spawnSet.forEach((spawnMeta) => {
      const worker = pickWorkerNode(workers, scenario, spawnMeta.type);
      if (!worker) {
        return;
      }

      const lane = layout.lanes[spawnMeta.laneKey];
      const laneY = slotY(lane, spawnMeta.slot, spawnMeta.slotCount, laneJitter);
      scenario.items.push({
        type: spawnMeta.type,
        laneKey: spawnMeta.laneKey,
        state: "active",
        x: layout.entry.x + random(10, 26),
        y: laneY,
        laneY,
        size: random(3.8, 4.7),
        progress: random(0, 0.035),
        speed: random(isAuto ? 0.22 : 0.18, isAuto ? 0.29 : 0.24),
        workerId: worker.id,
        wobbleAmp: random(isAuto ? 0.4 : 0.9, isAuto ? 1.2 : 1.8),
        wobbleRate: random(0.005, 0.009),
        phase: random(0, Math.PI * 2),
        assist: 0,
        handled: false,
        doneEchoed: false,
        lastWorkerId: worker.id,
        interactionCooldown: random(0.04, 0.18),
        queueX: layout.queue.x + layout.queue.w / 2 + random(-layout.queue.w * 0.16, layout.queue.w * 0.16),
        queueY: layout.queue.y + layout.queue.h - random(12, layout.queue.h * 0.86),
        life: 1
      });
    });

    if (scenario.items.length > 220) {
      const removable = scenario.items.filter((item) => item.state === "queued");
      const removeCount = Math.min(removable.length, scenario.items.length - 220);
      for (let i = 0; i < removeCount; i += 1) {
        const target = removable[i];
        const idx = scenario.items.indexOf(target);
        if (idx >= 0) {
          scenario.items.splice(idx, 1);
        }
      }
    }
  }

  function renderFrame(now) {
    if (isSimulationPaused()) {
      lastFrameTime = now;
      syncTimeProgress(1 / 60);
      requestAnimationFrame(renderFrame);
      return;
    }

    const dt = Math.min(0.04, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    syncTimeProgress(dt);

    drawScenario(manualScenario, dt, now);
    drawScenario(autoScenario, dt, now);

    requestAnimationFrame(renderFrame);
  }

  function drawScenario(scenario, dt, now) {
    resizeScenarioCanvas(scenario);

    const { ctx } = scenario;
    const layout = getLayout(scenario);
    const isAuto = scenario.role === "auto";
    const workerNodes = getWorkerNodes(layout, scenario);
    const loadRatio = clamp(scenario.dailyIncoming / Math.max(1, scenario.dailyCapacity), 0, 2.2);
    const workerPoses = new Map(
      workerNodes.map((node) => [node.id, getWorkerPose(node, now, clamp(loadRatio - 0.8, 0, 1.2))])
    );
    ctx.clearRect(0, 0, scenario.width, scenario.height);

    drawScenarioBackdrop(ctx, layout, scenario, now, loadRatio, isAuto);
    drawQueueColumn(ctx, layout, scenario);
    updateAndDrawEchoes(ctx, scenario, dt);
    updateAndDrawLinks(ctx, scenario, workerPoses, dt);
    drawWorkers(ctx, layout, workerNodes, workerPoses, isAuto, scenario.stability.ratio, now);
    updateAndDrawItems(ctx, scenario, layout, workerPoses, dt, now);
    if (scenario.flowCounts.followUp === 0 && Number(el.teamSize.value) <= SMALL_TEAM_NO_CORRECTION_MAX) {
      ctx.fillStyle = "rgba(17,45,68,0.58)";
      ctx.font = layout.compact ? '600 8px "IBM Plex Sans"' : '600 9px "IBM Plex Sans"';
      ctx.fillText("Low follow-up demand in this setup", layout.workbench.x + 16, layout.lanes.followUp.yMid + 18);
    }
  }

  function drawScenarioBackdrop(ctx, layout, scenario, now, loadRatio, isAuto) {
    const bg = ctx.createLinearGradient(0, 0, layout.board.w, layout.board.h);
    if (isAuto) {
      bg.addColorStop(0, "rgba(233,251,255,0.95)");
      bg.addColorStop(0.54, "rgba(76,210,255,0.10)");
      bg.addColorStop(1, "rgba(16,181,158,0.12)");
    } else {
      bg.addColorStop(0, "rgba(255,247,240,0.95)");
      bg.addColorStop(0.54, "rgba(255,162,82,0.11)");
      bg.addColorStop(1, "rgba(225,108,78,0.12)");
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, layout.board.x + layout.board.w + 8, layout.board.y + layout.board.h + 8);
    drawBoardAmbient(ctx, layout, isAuto, now);

    drawTag(
      ctx,
      layout.board.x,
      4,
      isAuto ? "AUTOMATED WORKFLOW" : "MANUAL WORKFLOW",
      isAuto ? "rgba(35,186,240,0.16)" : "rgba(255,150,72,0.18)",
      "rgba(17,45,68,0.82)"
    );
    drawTag(
      ctx,
      layout.queue.x - 12,
      4,
      "QUEUE BACKLOG",
      "rgba(225,77,77,0.12)",
      "rgba(17,45,68,0.82)"
    );

    drawRoundedRect(
      ctx,
      layout.board.x,
      layout.board.y,
      layout.board.w,
      layout.board.h,
      18,
      "rgba(255,255,255,0.26)",
      "rgba(17,45,68,0.14)",
      1
    );

    const stagePanels = [
      {
        box: layout.entry,
        label: layout.compact ? "Intake" : "Task intake",
        fill: isAuto ? "rgba(81,201,255,0.10)" : "rgba(255,178,102,0.12)",
        accent: isAuto ? "#4AC7E6" : "#F0A05F"
      },
      {
        box: layout.workbench,
        label: layout.compact ? "Workers" : "Worker handling",
        fill: isAuto ? "rgba(21,168,255,0.16)" : "rgba(255,154,73,0.16)",
        accent: isAuto ? "#35BDE7" : "#FF9D57"
      },
      {
        box: layout.done,
        label: layout.compact ? "Done" : "Completed work",
        fill: isAuto ? "rgba(24,169,87,0.12)" : "rgba(24,169,87,0.08)",
        accent: "#49B97E"
      }
    ];

    stagePanels.forEach((stage) => {
      const panelFill = ctx.createLinearGradient(stage.box.x, stage.box.y, stage.box.x + stage.box.w, stage.box.y + stage.box.h);
      panelFill.addColorStop(0, "rgba(255,255,255,0.72)");
      panelFill.addColorStop(0.2, stage.fill);
      panelFill.addColorStop(1, "rgba(255,255,255,0.18)");
      ctx.save();
      ctx.shadowColor = hexToRgba(stage.accent, 0.12);
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      drawRoundedRect(
        ctx,
        stage.box.x,
        stage.box.y,
        stage.box.w,
        stage.box.h,
        16,
        panelFill,
        "rgba(255,255,255,0.18)",
        0.9
      );
      ctx.restore();
      ctx.save();
      roundedRectPath(ctx, stage.box.x, stage.box.y, stage.box.w, stage.box.h, 16);
      ctx.clip();
      const stageGloss = ctx.createLinearGradient(0, stage.box.y, 0, stage.box.y + stage.box.h);
      stageGloss.addColorStop(0, "rgba(255,255,255,0.28)");
      stageGloss.addColorStop(0.35, "rgba(255,255,255,0)");
      ctx.fillStyle = stageGloss;
      ctx.fillRect(stage.box.x, stage.box.y, stage.box.w, stage.box.h * 0.45);
      ctx.fillStyle = hexToRgba(stage.accent, 0.14);
      ctx.fillRect(stage.box.x, stage.box.y, stage.box.w, 3);
      ctx.restore();
      ctx.fillStyle = "rgba(17,45,68,0.74)";
      ctx.font = layout.compact ? '700 9px "IBM Plex Sans"' : '700 10px "IBM Plex Sans"';
      ctx.fillText(stage.label, stage.box.x + 9, stage.box.y + 14);
    });

    ctx.save();
    ctx.globalAlpha = 0.8;
    drawTaskBubble(
      ctx,
      layout.entry.x + layout.entry.w * 0.18,
      layout.lanes.normal.yMid + 2,
      layout.compact ? 3.7 : 4.2,
      isAuto ? "#2B8A98" : "#4F67AA",
      "approach",
      false
    );
    drawTaskBubble(
      ctx,
      layout.entry.x + layout.entry.w * 0.12,
      layout.lanes.normal.yMid - 12,
      layout.compact ? 3.3 : 3.8,
      "#909CB6",
      "approach",
      false
    );
    ctx.restore();

    ctx.fillStyle = "rgba(17,45,68,0.52)";
    ctx.font = layout.compact ? '600 8px "IBM Plex Sans"' : '600 9px "IBM Plex Sans"';
    ctx.fillText("new tasks", layout.entry.x + 10, layout.entry.y + layout.entry.h - 12);
    ctx.fillText("resolved", layout.done.x + 10, layout.done.y + layout.done.h - 12);

    const flowStartX = layout.entry.x + 12;
    const flowEndX = layout.done.x + layout.done.w - 12;
    drawFlowRail(
      ctx,
      flowStartX,
      flowEndX,
      layout.lanes.normal.yMid,
      isAuto ? "#41C7E7" : "#5E7FDB",
      now,
      0.04,
      layout.compact
    );
    drawFlowRail(
      ctx,
      flowStartX,
      flowEndX,
      layout.lanes.followUp.yMid,
      "#D69A52",
      now,
      0.46,
      layout.compact
    );

    const entryPulse = clamp(loadRatio - 0.55, 0, 1) * (0.5 + 0.5 * Math.sin(now * 0.005));
    if (entryPulse > 0) {
      const entryGlow = ctx.createLinearGradient(layout.entry.x, layout.entry.y, layout.entry.x + layout.entry.w, layout.entry.y);
      entryGlow.addColorStop(0, `rgba(255,106,61,${0.06 + entryPulse * 0.18})`);
      entryGlow.addColorStop(1, "rgba(255,106,61,0)");
      ctx.save();
      roundedRectPath(ctx, layout.entry.x, layout.entry.y, layout.entry.w, layout.entry.h, 16);
      ctx.clip();
      ctx.fillStyle = entryGlow;
      ctx.fillRect(layout.entry.x, layout.entry.y, layout.entry.w, layout.entry.h);
      ctx.restore();
    }

    ["normal", "followUp"].forEach((laneKey) => {
      const lane = layout.lanes[laneKey];
      const laneFill =
        laneKey === "normal"
          ? isAuto
            ? "rgba(46,185,255,0.14)"
            : "rgba(30,150,236,0.11)"
          : "rgba(255,145,68,0.15)";
      drawRoundedRect(
        ctx,
        layout.workbench.x + 8,
        lane.y0,
        layout.workbench.w - 16,
        lane.y1 - lane.y0,
        10,
        laneFill,
        "rgba(255,255,255,0.13)",
        0.8
      );
      ctx.fillStyle = "rgba(17,45,68,0.66)";
      ctx.font = layout.compact ? '600 8px "IBM Plex Sans"' : '600 9px "IBM Plex Sans"';
      ctx.textAlign = "right";
      ctx.fillText(lane.label, layout.workbench.x + layout.workbench.w - 16, lane.y1 - 8);
      ctx.textAlign = "start";
    });

    drawRoundedRect(
      ctx,
      layout.workerZone.x,
      layout.workerZone.y,
      layout.workerZone.w,
      layout.workerZone.h,
      12,
      isAuto ? "rgba(72,197,220,0.10)" : "rgba(255,161,91,0.10)",
      isAuto ? "rgba(66,189,219,0.18)" : "rgba(255,166,92,0.18)",
      0.9
    );
    ctx.fillStyle = "rgba(17,45,68,0.58)";
    ctx.font = layout.compact ? '700 8px "IBM Plex Sans"' : '700 9px "IBM Plex Sans"';
    ctx.textAlign = "right";
    ctx.fillText(
      isAuto ? "Support team" : "Handling team",
      layout.workerZone.x + layout.workerZone.w - 10,
      layout.workerZone.y + layout.workerZone.h - 8
    );
    ctx.textAlign = "start";

    if (!isAuto) {
      const collapse = clamp(scenario.stability.ratio / 3.4, 0, 1.15);
      if (collapse > 0.22) {
        ctx.save();
        roundedRectPath(
          ctx,
          layout.workbench.x,
          layout.workbench.y,
          layout.workbench.w,
          layout.workbench.h,
          16
        );
        ctx.clip();
        ctx.strokeStyle = `rgba(255,106,61,${0.10 + collapse * 0.17})`;
        ctx.lineWidth = 1;
        const spacing = 16;
        for (
          let lineX = layout.workbench.x - layout.workbench.h;
          lineX < layout.workbench.x + layout.workbench.w + layout.workbench.h;
          lineX += spacing
        ) {
          ctx.beginPath();
          ctx.moveTo(lineX, layout.workbench.y + layout.workbench.h);
          ctx.lineTo(lineX + layout.workbench.h, layout.workbench.y);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (collapse > 0.14) {
        const hotspot = ctx.createRadialGradient(
          layout.workbench.x + layout.workbench.w * 0.46,
          layout.workbench.y + layout.workbench.h * 0.46,
          10,
          layout.workbench.x + layout.workbench.w * 0.46,
          layout.workbench.y + layout.workbench.h * 0.46,
          layout.workbench.w * 0.6
        );
        hotspot.addColorStop(0, `rgba(255,120,72,${0.04 + collapse * 0.08})`);
        hotspot.addColorStop(1, "rgba(255,120,72,0)");
        ctx.save();
        roundedRectPath(ctx, layout.workbench.x, layout.workbench.y, layout.workbench.w, layout.workbench.h, 16);
        ctx.clip();
        ctx.fillStyle = hotspot;
        ctx.fillRect(layout.workbench.x, layout.workbench.y, layout.workbench.w, layout.workbench.h);
        ctx.restore();
      }
    } else {
      const laneCount = clamp(Math.ceil(getWorkerNodes(layout, scenario).length / 2), 3, 6);
      for (let i = 1; i <= laneCount; i += 1) {
        const guideY = layout.workerZone.y + (layout.workerZone.h * i) / (laneCount + 1);
        ctx.strokeStyle = "rgba(29,233,255,0.18)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(layout.workerZone.x + 10, guideY);
        ctx.lineTo(layout.workerZone.x + layout.workerZone.w - 10, guideY);
        ctx.stroke();
      }
      const doneGlow = ctx.createRadialGradient(
        layout.done.x + layout.done.w * 0.56,
        layout.done.y + layout.done.h * 0.52,
        10,
        layout.done.x + layout.done.w * 0.56,
        layout.done.y + layout.done.h * 0.52,
        layout.done.w * 1.12
      );
      doneGlow.addColorStop(0, "rgba(24,169,87,0.14)");
      doneGlow.addColorStop(1, "rgba(24,169,87,0)");
      ctx.save();
      roundedRectPath(ctx, layout.done.x, layout.done.y, layout.done.w, layout.done.h, 16);
      ctx.clip();
      ctx.fillStyle = doneGlow;
      ctx.fillRect(layout.done.x, layout.done.y, layout.done.w, layout.done.h);
      ctx.restore();

      const scanW = Math.max(22, layout.workerZone.w * 0.16);
      const scanX =
        layout.workerZone.x +
        6 +
        ((now * 0.08) % Math.max(28, layout.workerZone.w - 12 + scanW)) -
        scanW;
      drawRoundedRect(
        ctx,
        scanX,
        layout.workerZone.y + 4,
        scanW,
        layout.workerZone.h - 8,
        10,
        "rgba(93,226,255,0.14)",
        null
      );
    }

    ["normal", "followUp"].forEach((laneKey, laneIndex) => {
      const lane = layout.lanes[laneKey];
      const arrowCount = clamp(Math.floor(layout.pipeline.w / 112), 3, 7);
      ctx.fillStyle =
        laneKey === "normal"
          ? isAuto
            ? "rgba(168,244,255,0.56)"
            : "rgba(124,155,228,0.54)"
          : "rgba(232,191,136,0.54)";
      for (let i = 0; i < arrowCount; i += 1) {
        const t = (i + 1) / (arrowCount + 1);
        const x = lerp(layout.entry.x + 22, layout.done.x - 10, t);
        const bob = Math.sin(now * 0.0038 + laneIndex * 1.8 + i * 0.85) * 0.9;
        const y = lane.yMid + bob;
        ctx.beginPath();
        ctx.moveTo(x - 3, y - 3.5);
        ctx.lineTo(x + 4.5, y);
        ctx.lineTo(x - 3, y + 3.5);
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  function drawWorkers(ctx, layout, workerNodes, workerPoses, isAuto, loadRatio, now) {
    if (isAuto) {
      const operators = workerNodes.filter((node) => node.kind !== "system");
      const systems = workerNodes.filter((node) => node.kind === "system");
      operators.forEach((human) => {
        const from = workerPoses.get(human.id);
        systems.forEach((agent) => {
          const to = workerPoses.get(agent.id);
          ctx.strokeStyle = human.kind === "tech" ? "rgba(99,203,236,0.18)" : "rgba(29,233,255,0.12)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(from.drawX + 7, from.drawY - 2);
          ctx.quadraticCurveTo(
            (from.drawX + to.drawX) * 0.52,
            Math.min(from.drawY, to.drawY) - 10,
            to.drawX - 7,
            to.drawY - 2
          );
          ctx.stroke();
        });
      });
    } else if (loadRatio > 1.05 && workerNodes.length > 1) {
      for (let i = 0; i < workerNodes.length - 1; i += 1) {
        const from = workerPoses.get(workerNodes[i].id);
        const to = workerPoses.get(workerNodes[i + 1].id);
        ctx.strokeStyle = `rgba(255,142,79,${Math.min(0.24, 0.08 + loadRatio * 0.05)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(from.drawX + 4, from.drawY);
        ctx.quadraticCurveTo((from.drawX + to.drawX) * 0.5, (from.drawY + to.drawY) * 0.5 - 8, to.drawX - 4, to.drawY);
        ctx.stroke();
      }
    }

    workerNodes.forEach((node) => {
      const pose = workerPoses.get(node.id) || node;
      drawWorkerBase(ctx, pose.drawX, pose.drawY, node.size, node.kind, isAuto);
      if (node.kind === "system") {
        drawAutomationGlyph(ctx, pose.drawX, pose.drawY, node.size, true);
        ctx.save();
        ctx.strokeStyle = `rgba(104,228,255,${0.32 + 0.14 * Math.sin(now * 0.005 + node.phase)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pose.drawX, pose.drawY, node.size * (0.9 + 0.06 * Math.sin(now * 0.004 + node.phase)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else {
        drawHumanGlyph(
          ctx,
          pose.drawX,
          pose.drawY,
          node.size,
          isAuto ? (node.kind === "tech" ? "#1B9BB3" : "#4F67AA") : "#FF9A49",
          true
        );
      }

      if (node.showLabel) {
        drawWorkerChip(
          ctx,
          pose.drawX,
          pose.drawY + node.size + 6,
          node.label || "Ops",
          node.kind === "system"
            ? "rgba(32,97,123,0.82)"
            : node.kind === "tech"
              ? "rgba(35,108,130,0.78)"
              : "rgba(49,88,142,0.74)"
        );
      }
    });
  }

  function updateAndDrawLinks(ctx, scenario, workerPoses, dt) {
    for (let i = scenario.links.length - 1; i >= 0; i -= 1) {
      const link = scenario.links[i];
      const isSystem = link.kind === "system";
      const isTech = link.kind === "tech";
      link.life -= dt * (isSystem ? 2.7 : isTech ? 2.35 : 2.1);
      if (link.life <= 0) {
        scenario.links.splice(i, 1);
        continue;
      }

      const pulseAlpha = clamp(link.life, 0, 1) * (isSystem ? 0.96 : isTech ? 0.82 : 0.74);
      ctx.strokeStyle = isSystem
        ? `rgba(29,233,255,${pulseAlpha})`
        : isTech
          ? `rgba(85,191,232,${pulseAlpha})`
          : `rgba(196,128,85,${pulseAlpha})`;
      ctx.save();
      ctx.strokeStyle = isSystem
        ? `rgba(29,233,255,${pulseAlpha * 0.28})`
        : isTech
          ? `rgba(85,191,232,${pulseAlpha * 0.24})`
          : `rgba(196,128,85,${pulseAlpha * 0.18})`;
      ctx.lineWidth = isSystem ? 5.6 : isTech ? 4.4 : 3.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(link.fromX, link.fromY);
      ctx.quadraticCurveTo(
        (link.fromX + link.toX) * 0.5,
        Math.min(link.fromY, link.toY) - 6,
        link.toX,
        link.toY
      );
      ctx.stroke();
      ctx.restore();
      ctx.lineWidth = isSystem ? 2.1 : isTech ? 1.8 : 1.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(link.fromX, link.fromY);
      ctx.quadraticCurveTo(
        (link.fromX + link.toX) * 0.5,
        Math.min(link.fromY, link.toY) - 6,
        link.toX,
        link.toY
      );
      ctx.stroke();

      const progress = 1 - link.life;
      const pulseX = link.fromX + (link.toX - link.fromX) * progress;
      const pulseY = link.fromY + (link.toY - link.fromY) * progress;
      ctx.fillStyle = isSystem
        ? `rgba(112,232,255,${pulseAlpha})`
        : isTech
          ? `rgba(132,213,244,${pulseAlpha})`
          : `rgba(255,176,123,${pulseAlpha})`;
      ctx.beginPath();
      ctx.arc(pulseX, pulseY, isSystem ? 2.6 : isTech ? 2.3 : 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function updateAndDrawEchoes(ctx, scenario, dt) {
    for (let i = scenario.echoes.length - 1; i >= 0; i -= 1) {
      const echo = scenario.echoes[i];
      echo.life -= dt * 1.8;
      if (echo.life <= 0) {
        scenario.echoes.splice(i, 1);
        continue;
      }

      const alpha = clamp(echo.life, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(24,169,87,0.88)";
      ctx.lineWidth = 1.8;
      roundedRectPath(
        ctx,
        echo.x - (echo.size * 1.18 + (1 - alpha) * 6),
        echo.y - (echo.size * 0.84 + (1 - alpha) * 4.2),
        echo.size * 2.36 + (1 - alpha) * 12,
        echo.size * 1.68 + (1 - alpha) * 8.4,
        Math.max(3, echo.size * 0.5 + (1 - alpha) * 1.2)
      );
      ctx.stroke();
      drawTaskBubble(ctx, echo.x, echo.y, echo.size * 0.9, "#18A957", "done", false);
      ctx.globalAlpha = 1;
    }
  }

  function drawQueueColumn(ctx, layout, scenario) {
    drawRoundedRect(
      ctx,
      layout.queue.x,
      layout.queue.y,
      layout.queue.w,
      layout.queue.h,
      layout.queue.w / 2,
      "rgba(17,45,68,0.12)",
      "rgba(17,45,68,0.24)",
      1
    );

    const fillH = layout.queue.h * scenario.overflowRatio;
    const fillY = layout.queue.y + layout.queue.h - fillH;
    roundedRectPath(
      ctx,
      layout.queue.x + 2,
      layout.queue.y + 2,
      layout.queue.w - 4,
      layout.queue.h - 4,
      (layout.queue.w - 4) / 2
    );
    ctx.save();
    ctx.clip();
    const fillGrad = ctx.createLinearGradient(0, fillY, 0, layout.queue.y + layout.queue.h);
    fillGrad.addColorStop(0, getBacklogColor(scenario.stability.key));
    fillGrad.addColorStop(1, "rgba(17,45,68,0.35)");
    ctx.fillStyle = fillGrad;
    ctx.fillRect(layout.queue.x + 2, fillY, layout.queue.w - 4, layout.queue.y + layout.queue.h - fillY);
    const glass = ctx.createLinearGradient(layout.queue.x, 0, layout.queue.x + layout.queue.w, 0);
    glass.addColorStop(0, "rgba(255,255,255,0.22)");
    glass.addColorStop(0.4, "rgba(255,255,255,0.06)");
    glass.addColorStop(1, "rgba(255,255,255,0.16)");
    ctx.fillStyle = glass;
    ctx.fillRect(layout.queue.x + 2, layout.queue.y + 2, layout.queue.w - 4, layout.queue.h - 4);
    ctx.restore();

    ctx.fillStyle = "rgba(17,45,68,0.72)";
    ctx.font = layout.compact ? '700 8px "IBM Plex Sans"' : '700 9px "IBM Plex Sans"';
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(scenario.overflowRatio * 100)}%`, layout.queue.x + layout.queue.w / 2, layout.queue.y + 14);
    ctx.fillStyle = "rgba(17,45,68,0.54)";
    ctx.font = layout.compact ? '600 7px "IBM Plex Sans"' : '600 8px "IBM Plex Sans"';
    ctx.fillText(layout.compact ? "waiting" : "not handled", layout.queue.x + layout.queue.w / 2, layout.queue.y + 26);
    ctx.textAlign = "start";
  }

  function updateAndDrawItems(ctx, scenario, layout, workerPoses, dt, now) {
    const pathStartX = layout.entry.x + 8;
    const pathEndX = layout.done.x + layout.done.w - 10;
    const pathSpan = Math.max(40, pathEndX - pathStartX);
    const procStart = clamp((layout.workbench.x + 12 - pathStartX) / pathSpan, 0.12, 0.6);
    const procEnd = clamp((layout.workbench.x + layout.workbench.w - 12 - pathStartX) / pathSpan, procStart + 0.08, 0.9);
    const procEndHit = procEnd - 0.018;
    const doneStart = clamp((layout.done.x - pathStartX) / pathSpan, procEnd + 0.03, 0.96);
    const doneMid = clamp(
      (layout.done.x + layout.done.w * 0.5 - pathStartX) / pathSpan,
      doneStart + 0.04,
      0.98
    );
    const doneFadeStart = Math.max(doneStart + 0.012, doneMid - 0.06);
    const overloadPressure = clamp((scenario.overflowRatio - 0.08) / 0.92, 0, 1);
    const interactionBase = scenario.role === "auto" ? 0.86 : 0.62;

    for (let i = scenario.items.length - 1; i >= 0; i -= 1) {
      const item = scenario.items[i];
      if (item.state === "queued") {
        item.x += (item.queueX - item.x) * Math.min(1, dt * 3.4);
        item.y += (item.queueY - item.y) * Math.min(1, dt * 3.6);
        item.life -= dt * 0.42;
        if (item.life <= 0.1) {
          scenario.items.splice(i, 1);
          continue;
        }
        drawTaskGlyph(ctx, item, scenario.role, scenario.stability.key);
        continue;
      }

      const inProcessing = item.progress >= procStart && item.progress < procEnd;
      const currentWorker = workerPoses.get(item.lastWorkerId) || workerPoses.get(item.workerId);
      let move = item.speed;

      if (inProcessing) {
        const baseProcSpeed = scenario.role === "auto" ? 0.12 : 0.085;
        const slowFactor = scenario.role === "auto" ? 0.94 : 1 - overloadPressure * 0.38;
        move = Math.max(0.045, baseProcSpeed * (1 + item.assist * 0.55) * slowFactor);
        item.interactionCooldown -= dt;

        if (!item.handled && currentWorker && item.interactionCooldown <= 0) {
          const interactionChance = clamp(
            interactionBase - overloadPressure * (scenario.role === "auto" ? 0.08 : 0.2),
            0.22,
            0.94
          );
          if (Math.random() < interactionChance) {
            const worker = currentWorker;
            item.lastWorkerId = worker.id;
            const assistBoost = worker.kind === "system" ? 0.48 : worker.kind === "tech" ? 0.36 : 0.28;
            item.assist = clamp(item.assist + assistBoost, 0, 1);
            item.handled =
              Math.random() <
              clamp(
                (scenario.role === "auto" ? 0.78 : 0.56) +
                  item.assist * 0.16 -
                  (item.type === "followUp" ? 0.08 : 0),
                0.24,
                0.98
              );

            pushScenarioLink(scenario, {
              fromX: worker.drawX,
              fromY: worker.drawY,
              toX: lerp(pathStartX, pathEndX, item.progress),
              toY: item.laneY,
              kind: worker.kind,
              life: 1
            });
          }
          item.interactionCooldown = random(
            scenario.role === "auto" ? 0.06 : 0.1,
            scenario.role === "auto" ? 0.16 : 0.24
          );
        }
      } else if (item.handled && item.progress >= procEnd) {
        move = scenario.role === "auto" ? 0.24 : 0.2;
      }

      item.progress += move * dt;
      item.assist = Math.max(0, item.assist - dt * 0.24);

      item.x = lerp(pathStartX, pathEndX, clamp(item.progress, 0, 1.08));
      const laneDrift = item.handled ? Math.sin(now * 0.003 + item.phase) * 0.8 : 0;
      item.y = item.laneY + Math.sin(now * item.wobbleRate + item.phase) * item.wobbleAmp + laneDrift;

      if (!item.handled && item.progress >= procEndHit) {
        item.state = "queued";
        item.life = 1;
        drawTaskGlyph(ctx, item, scenario.role, scenario.stability.key);
        continue;
      }

      if (item.handled && !item.doneEchoed && item.progress >= doneStart) {
        item.doneEchoed = true;
        const doneY = clamp(item.y, layout.done.y + 14, layout.done.y + layout.done.h - 14);
        pushScenarioEcho(scenario, {
          x: item.x,
          y: doneY,
          size: item.size * 0.9,
          life: 1
        });
      }

      if ((item.handled && item.progress >= doneMid) || item.progress >= 1.04) {
        scenario.items.splice(i, 1);
        continue;
      }

      const fadeAlpha =
        item.handled && item.progress >= doneFadeStart
          ? clamp((doneMid - item.progress) / Math.max(0.001, doneMid - doneFadeStart), 0, 1)
          : 1;

      drawTaskGlyph(ctx, item, scenario.role, scenario.stability.key, fadeAlpha);
    }
  }

  function drawHumanGlyph(ctx, x, y, size, color, glow) {
    const headR = size * 0.2;
    const headY = y - size * 0.68;
    const shoulderY = y - size * 0.28;
    const torsoY = y - size * 0.16;
    const hipY = y + size * 0.24;
    const footY = y + size * 0.74;

    if (glow) {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.arc(x, y - size * 0.02, size * 0.84, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    const torsoFill = ctx.createLinearGradient(0, torsoY, 0, torsoY + size * 0.44);
    torsoFill.addColorStop(0, "rgba(255,255,255,0.16)");
    torsoFill.addColorStop(0.18, color);
    torsoFill.addColorStop(1, hexToRgba(color, 0.92));
    drawRoundedRect(ctx, x - size * 0.2, torsoY, size * 0.4, size * 0.44, size * 0.12, torsoFill, null);
    ctx.fillStyle = "rgba(255,255,255,0.34)";
    ctx.fillRect(x - size * 0.07, torsoY + size * 0.07, size * 0.14, size * 0.06);

    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1.2, size * 0.1);
    ctx.beginPath();
    ctx.moveTo(x - size * 0.15, shoulderY);
    ctx.lineTo(x - size * 0.34, y + size * 0.1);
    ctx.moveTo(x + size * 0.15, shoulderY);
    ctx.lineTo(x + size * 0.34, y + size * 0.1);
    ctx.moveTo(x - size * 0.08, hipY);
    ctx.lineTo(x - size * 0.18, footY);
    ctx.moveTo(x + size * 0.08, hipY);
    ctx.lineTo(x + size * 0.18, footY);
    ctx.stroke();
  }

  function drawAutomationGlyph(ctx, x, y, size, glow) {
    if (glow) {
      ctx.fillStyle = "rgba(18,91,255,0.18)";
      ctx.beginPath();
      ctx.arc(x, y, size * 1.22, 0, Math.PI * 2);
      ctx.fill();
    }

    const bodyFill = ctx.createLinearGradient(0, y - size * 0.68, 0, y + size * 0.68);
    bodyFill.addColorStop(0, "rgba(39,82,128,0.96)");
    bodyFill.addColorStop(1, "rgba(21,50,82,0.94)");
    drawRoundedRect(ctx, x - size * 0.68, y - size * 0.68, size * 1.36, size * 1.36, size * 0.32, bodyFill, "rgba(29,233,255,0.92)", 1.2);
    ctx.fillStyle = "rgba(153,245,255,0.9)";
    ctx.beginPath();
    ctx.arc(x, y, size * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ["-0.36,-0.36", "0.36,-0.36", "-0.36,0.36", "0.36,0.36"].forEach((pair) => {
      const [dx, dy] = pair.split(",").map(Number);
      ctx.beginPath();
      ctx.arc(x + size * dx, y + size * dy, size * 0.06, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = "rgba(29,233,255,0.9)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.26, y - size * 0.12);
    ctx.lineTo(x - size * 0.02, y - size * 0.28);
    ctx.lineTo(x + size * 0.08, y - size * 0.02);
    ctx.lineTo(x + size * 0.24, y - size * 0.18);
    ctx.lineTo(x + size * 0.04, y + size * 0.22);
    ctx.lineTo(x - size * 0.04, y + size * 0.02);
    ctx.lineTo(x - size * 0.2, y + size * 0.18);
    ctx.stroke();
  }

  function drawTaskBubble(ctx, x, y, radius, color, state, glow = true) {
    const w = radius * 1.9;
    const h = radius * 1.36;
    const left = x - w / 2;
    const top = y - h / 2;
    const corner = Math.max(1.2, radius * 0.18);
    const bandH = Math.max(1.8, h * 0.24);

    ctx.save();

    if (glow) {
      ctx.shadowColor = hexToRgba(color, state === "queued" ? 0.08 : 0.14);
      ctx.shadowBlur = state === "queued" ? 2.5 : 4.5;
    }

    const bodyFill = ctx.createLinearGradient(0, top, 0, top + h);
    bodyFill.addColorStop(0, "rgba(255,255,255,0.98)");
    bodyFill.addColorStop(1, state === "done" ? hexToRgba(color, 0.18) : hexToRgba(color, state === "queued" ? 0.16 : 0.08));
    roundedRectPath(ctx, left, top, w, h, corner);
    ctx.fillStyle = bodyFill;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = hexToRgba(color, state === "queued" ? 0.34 : 0.48);
    ctx.lineWidth = state === "done" ? 1.05 : 0.9;
    roundedRectPath(ctx, left, top, w, h, corner);
    ctx.stroke();

    roundedRectPath(ctx, left + 0.55, top + 0.55, w - 1.1, bandH, Math.max(1.2, corner * 0.8));
    ctx.fillStyle = hexToRgba(color, state === "queued" ? 0.62 : 0.86);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.84)";
    ctx.beginPath();
    ctx.moveTo(left + w - corner * 1.58, top + 0.7);
    ctx.lineTo(left + w - 0.7, top + 0.7);
    ctx.lineTo(left + w - 0.7, top + corner * 1.52);
    ctx.closePath();
    ctx.fill();

    const iconX = left + radius * 0.28;
    const iconY = y - radius * 0.06;
    const iconW = radius * 0.46;
    const iconH = radius * 0.46;
    ctx.strokeStyle = state === "done" ? hexToRgba(color, 0.9) : "rgba(17,45,68,0.52)";
    ctx.lineWidth = 0.82;
    roundedRectPath(ctx, iconX, iconY, iconW, iconH, Math.max(0.8, radius * 0.1));
    ctx.stroke();

    const lineX = iconX + iconW + radius * 0.18;
    const lineW = Math.max(radius * 0.34, left + w - lineX - radius * 0.18);
    ctx.strokeStyle = state === "done" ? "rgba(22,74,50,0.62)" : "rgba(17,45,68,0.42)";
    ctx.lineCap = "round";
    ctx.lineWidth = 0.82;
    ctx.beginPath();
    ctx.moveTo(lineX, y - radius * 0.01);
    ctx.lineTo(lineX + lineW, y - radius * 0.01);
    ctx.moveTo(lineX, y + radius * 0.2);
    ctx.lineTo(lineX + lineW * 0.68, y + radius * 0.2);
    ctx.stroke();

    if (state === "done") {
      ctx.strokeStyle = hexToRgba(color, 0.94);
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.moveTo(iconX + iconW * 0.18, iconY + iconH * 0.5);
      ctx.lineTo(iconX + iconW * 0.42, iconY + iconH * 0.76);
      ctx.lineTo(iconX + iconW * 0.84, iconY + iconH * 0.18);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawTaskGlyph(ctx, item, role, stabilityKey, alphaFactor = 1) {
    let color = role === "auto" ? "#2B8A98" : "#4F67AA";
    if (item.type === "followUp") {
      color = role === "auto" ? "#C48C3A" : "#BE7942";
    }
    if (item.state === "queued") {
      color = getBacklogColorSolid(stabilityKey);
    } else if (item.handled) {
      color = "#2E8F60";
    }

    ctx.save();
    ctx.globalAlpha = (item.state === "queued" ? clamp(item.life, 0.28, 1) : 1) * alphaFactor;
    drawTaskBubble(
      ctx,
      item.x,
      item.y,
      item.size,
      color,
      item.handled ? "done" : item.state,
      true
    );
    ctx.restore();
  }

  function drawBoardAmbient(ctx, layout, isAuto, now) {
    ctx.save();
    roundedRectPath(ctx, layout.board.x, layout.board.y, layout.board.w, layout.board.h, 18);
    ctx.clip();

    const glowA = ctx.createRadialGradient(
      layout.board.x + layout.board.w * 0.16,
      layout.board.y + layout.board.h * 0.12,
      14,
      layout.board.x + layout.board.w * 0.16,
      layout.board.y + layout.board.h * 0.12,
      layout.board.w * 0.45
    );
    glowA.addColorStop(0, isAuto ? "rgba(104,236,255,0.18)" : "rgba(255,195,122,0.18)");
    glowA.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glowA;
    ctx.fillRect(layout.board.x, layout.board.y, layout.board.w, layout.board.h);

    const glowB = ctx.createRadialGradient(
      layout.board.x + layout.board.w * 0.82,
      layout.board.y + layout.board.h * 0.82,
      14,
      layout.board.x + layout.board.w * 0.82,
      layout.board.y + layout.board.h * 0.82,
      layout.board.w * 0.42
    );
    glowB.addColorStop(0, isAuto ? "rgba(58,202,172,0.14)" : "rgba(255,150,105,0.14)");
    glowB.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glowB;
    ctx.fillRect(layout.board.x, layout.board.y, layout.board.w, layout.board.h);

    const gloss = ctx.createLinearGradient(0, layout.board.y, 0, layout.board.y + layout.board.h);
    gloss.addColorStop(0, "rgba(255,255,255,0.28)");
    gloss.addColorStop(0.22, "rgba(255,255,255,0.08)");
    gloss.addColorStop(0.58, "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    ctx.fillRect(layout.board.x, layout.board.y, layout.board.w, layout.board.h * 0.5);

    ctx.strokeStyle = isAuto ? "rgba(63,188,226,0.08)" : "rgba(229,145,88,0.08)";
    ctx.lineWidth = 1;
    for (let i = -1; i < 8; i += 1) {
      const drift = Math.sin(now * 0.0009 + i * 0.8) * 4;
      ctx.beginPath();
      ctx.moveTo(layout.board.x + i * 26 + drift, layout.board.y);
      ctx.lineTo(layout.board.x + i * 26 + layout.board.h * 0.32 + drift, layout.board.y + layout.board.h);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawFlowRail(ctx, x0, x1, y, color, now, phase, compact) {
    const rail = ctx.createLinearGradient(x0, y, x1, y);
    rail.addColorStop(0, "rgba(255,255,255,0)");
    rail.addColorStop(0.14, hexToRgba(color, 0.12));
    rail.addColorStop(0.5, hexToRgba(color, 0.34));
    rail.addColorStop(0.86, hexToRgba(color, 0.12));
    rail.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = rail;
    ctx.lineWidth = compact ? 2.1 : 2.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();

    ctx.strokeStyle = hexToRgba(color, compact ? 0.2 : 0.26);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0 + 8, y);
    ctx.lineTo(x1 - 8, y);
    ctx.stroke();

    const beadCount = compact ? 4 : 6;
    for (let i = 0; i < beadCount; i += 1) {
      const t = (now * 0.00013 + phase + i / beadCount) % 1;
      const beadX = lerp(x0, x1, t);
      const beadW = compact ? 8 : 10;
      const beadH = compact ? 3 : 3.6;
      drawRoundedRect(ctx, beadX - beadW / 2, y - beadH / 2, beadW, beadH, beadH / 2, hexToRgba(color, 0.28), null);
      ctx.fillStyle = hexToRgba(color, 0.66);
      ctx.beginPath();
      ctx.arc(beadX + beadW * 0.28, y, compact ? 1.1 : 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWorkerBase(ctx, x, y, size, kind, isAuto) {
    ctx.save();
    const haloColor =
      kind === "system"
        ? "rgba(67,221,255,0.20)"
        : kind === "tech"
          ? "rgba(73,184,213,0.16)"
          : isAuto
            ? "rgba(95,131,211,0.14)"
            : "rgba(255,156,83,0.18)";
    const shadow = ctx.createRadialGradient(x, y + size * 0.48, 1, x, y + size * 0.48, size * 1.1);
    shadow.addColorStop(0, haloColor);
    shadow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.48, size * 1.08, size * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle =
      kind === "system"
        ? "rgba(71,224,255,0.34)"
        : kind === "tech"
          ? "rgba(78,185,214,0.28)"
          : isAuto
            ? "rgba(95,131,211,0.22)"
            : "rgba(255,163,92,0.26)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.48, size * 0.9, size * 0.22, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawWorkerChip(ctx, centerX, topY, text, fill) {
    ctx.save();
    ctx.font = '700 8px "IBM Plex Sans"';
    const chipW = Math.ceil(ctx.measureText(text).width) + 12;
    const chipH = 13;
    drawRoundedRect(ctx, centerX - chipW / 2, topY, chipW, chipH, 7, fill, "rgba(255,255,255,0.18)", 0.8);
    ctx.fillStyle = "rgba(241,248,255,0.92)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, centerX, topY + chipH / 2 + 0.5);
    ctx.restore();
  }

  function drawTag(
    ctx,
    x,
    y,
    text,
    fill,
    ink,
    radius = 9,
    font = '700 9px "IBM Plex Sans"'
  ) {
    ctx.save();
    ctx.font = font;
    const tagW = Math.ceil(ctx.measureText(text).width) + 12;
    const tagH = 15;
    drawRoundedRect(ctx, x, y, tagW, tagH, radius, fill, "rgba(255, 255, 255, 0.18)", 0.8);
    ctx.fillStyle = ink;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + 6, y + tagH / 2 + 0.5);
    ctx.restore();
  }

  function drawRoundedRect(ctx, x, y, w, h, r, fill, stroke, lineWidth = 1) {
    ctx.save();
    roundedRectPath(ctx, x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
    ctx.restore();
  }

  function roundedRectPath(ctx, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.arcTo(x + w, y, x + w, y + radius, radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
    ctx.lineTo(x + radius, y + h);
    ctx.arcTo(x, y + h, x, y + h - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }

  function slotY(lane, slotIndex, slotCount, jitter) {
    const usableTop = lane.y0 + 8;
    const usableH = Math.max(10, lane.y1 - lane.y0 - 16);
    const step = usableH / (slotCount + 1);
    return usableTop + step * (slotIndex + 1) + random(-jitter, jitter);
  }

  function getBacklogDiversionChance(scenario, type) {
    // No diversion while capacity is healthy; diversify only under visible pressure.
    if (scenario.overflowRatio < 0.12) {
      return 0;
    }

    const pressure = (scenario.overflowRatio - 0.12) / 0.88;
    let chance = clamp(pressure, 0, 1) * 0.62;
    if (type === "followUp") {
      chance += 0.06 * pressure;
    }

    return clamp(chance, 0, 0.82);
  }

  function normalizeHourlyCostValue(rawValue) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return DEFAULT_HOURLY_COST;
    }
    return Math.round(clamp(parsed, 1, MAX_HOURLY_COST));
  }

  function getBacklogColorSolid(stabilityKey) {
    switch (stabilityKey) {
      case "stable":
        return "#74B88A";
      case "strained":
        return "#F3B659";
      case "unstable":
        return "#EE8A3E";
      default:
        return "#D75454";
    }
  }

  function getBacklogColor(stabilityKey) {
    switch (stabilityKey) {
      case "stable":
        return "rgba(24, 169, 87, 0.78)";
      case "strained":
        return "rgba(255, 178, 74, 0.8)";
      case "unstable":
        return "rgba(255, 127, 34, 0.82)";
      default:
        return "rgba(225, 77, 77, 0.86)";
    }
  }

  function hexToRgba(hex, alpha) {
    const clean = hex.replace("#", "");
    const bigint = Number.parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }
})();
