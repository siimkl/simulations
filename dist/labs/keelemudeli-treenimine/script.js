(function () {
  "use strict";

  const svg = document.getElementById("networkSvg");
  const networkStage = document.querySelector(".network-stage");
  const widget = document.getElementById("widget");
  const pageTitle = document.getElementById("pageTitle");
  const subtitleText = document.getElementById("subtitleText");
  const modeButtons = Array.from(document.querySelectorAll(".mode-button"));
  const macroCanvas = document.getElementById("macroNetworkCanvas");
  const macroContext = macroCanvas.getContext("2d");
  const metricOneLabel = document.getElementById("metricOneLabel");
  const metricTwoLabel = document.getElementById("metricTwoLabel");
  const metricThreeLabel = document.getElementById("metricThreeLabel");
  const epochTip = document.getElementById("epochTip");
  const lossTip = document.getElementById("lossTip");
  const accuracyTip = document.getElementById("accuracyTip");
  const epochLabel = document.getElementById("epochLabel");
  const lossLabel = document.getElementById("lossLabel");
  const accuracyLabel = document.getElementById("accuracyLabel");
  const lossMetric = document.getElementById("lossMetric");
  const accuracyMetric = document.getElementById("accuracyMetric");
  const confidenceMetric = document.getElementById("confidenceMetric");
  const lossLine = document.getElementById("lossLine");
  const progressPercent = document.getElementById("progressPercent");
  const progressBar = document.getElementById("progressBar");
  const progressFill = document.getElementById("progressFill");
  const startButton = document.getElementById("startButton");
  const pauseButton = document.getElementById("pauseButton");
  const resetButton = document.getElementById("resetButton");
  const progressLabelText = document.getElementById("progressLabelText");
  const zoneEyebrow = document.getElementById("zoneEyebrow");
  const networkTitle = document.getElementById("networkTitle");
  const weightChip = document.getElementById("weightChip");
  const layerLabels = [
    document.getElementById("layerInputLabel"),
    document.getElementById("layerHiddenLabel"),
    document.getElementById("layerOutputLabel")
  ];
  const promptCardRole = document.getElementById("promptCardRole");
  const promptCardText = document.getElementById("promptCardText");
  const promptCardHint = document.getElementById("promptCardHint");
  const replyCardRole = document.getElementById("replyCardRole");
  const replyCardText = document.getElementById("replyCardText");
  const replyCardHint = document.getElementById("replyCardHint");
  const flowLabels = {
    forward: document.querySelector(".flow-label--forward"),
    backprop: document.querySelector(".flow-label--backward"),
    update: document.querySelector(".flow-label--adjust")
  };
  const networkCaption = document.getElementById("networkCaption");
  const processStrip = document.querySelector(".process-strip");
  const processStepLabels = Array.from(document.querySelectorAll(".process-step span"));
  const legendSubtitle = document.getElementById("legendSubtitle");
  const legendItems = Array.from(document.querySelectorAll(".legend-item"));
  const bars = Array.from(document.querySelectorAll(".bar-mini i"));
  const confidenceDots = Array.from(document.querySelectorAll(".confidence-dots i"));
  const phaseSteps = Array.from(document.querySelectorAll(".phase-step"));

  const ns = "http://www.w3.org/2000/svg";
  const widgetResizeEvent = "simfluence-widget:resize";
  const legacyResizeEvent = "simfluence:resize";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const layerCounts = [7, 11, 13, 11, 3];
  let activeMode = "train";
  let outputNames = ["adjusting", "finding", "guessing"];
  let chartWidth = 1600;
  const chartHeight = 585;
  const introDuration = 5000;
  let layoutMode = "";
  let xPositions = [];
  const topY = 52;
  const bottomY = 510;
  const initialSeed = 3209;

  let seed = initialSeed;
  let nodes = [];
  let connections = [];
  let renderedConnections = [];
  let renderedNodes = [];
  let renderedLabels = [];
  let renderedFields = [];
  let renderedPackets = [];
  let renderedSparks = [];
  let renderedOutputRings = [];
  let renderedOutputBars = [];
  let renderedActivationRings = [];
  let renderedErrorWaves = [];
  let renderedFocusHalo = null;
  let renderedLayerMeters = [];
  let renderedLossRipples = [];
  let renderedMemoryTrails = [];
  let renderedContextPieces = [];
  let progress = reducedMotion ? 0.72 : 0;
  let running = !reducedMotion;
  let lastTime = 0;
  let resizeTimer = 0;
  let heightPostFrame = 0;
  let lastPostedHeight = 0;
  let introStartTime = 0;
  let introActive = !reducedMotion;
  let macroNodes = [];
  let macroLinks = [];
  let macroBlocks = [];
  let macroWorld = { width: 3200, height: 1500 };

  const viewModes = {
    use: {
      documentTitle: "How a Trained LLM Builds a Reply | Tokens in Motion",
      title: "How a Trained LLM Builds a Reply",
      subtitle: "Using a Trained LLM",
      metrics: ["Token step", "Uncertainty", "Confidence"],
      tooltips: [
        "The current generation step. A chatbot chooses one token, adds it to the reply, then repeats.",
        "How spread out the next-token choices are. Lower uncertainty means the model has a clearer continuation.",
        "The strength of the leading next-token choice. Higher confidence means the reply direction is more settled."
      ],
      progressLabel: "Reply progress",
      zoneEyebrow: "Prompt tokens attend across layers",
      networkTitle: "Transformer Language Model",
      chipByPhase: {
        forward: "Prompt encoded",
        backprop: "Attention scores",
        update: "Token generated"
      },
      layerLabels: ["Prompt tokens", "Attention blocks", "Next token"],
      svgLabel: "Transformer-style language model using prompt tokens, attention connections, hidden token states, and next-token probabilities",
      promptCard: ["User prompt", "Explain neural networks simply", "Words become tokens"],
      replyCard: ["Assistant draft", "A neural network learns by ...", "Next token chosen again and again"],
      phaseLabels: ["Tokenize", "Attend", "Generate"],
      flowLabels: ["Prompt encoded", "Attention scores", "Next token chosen"],
      caption: "From prompt context to next-token probabilities",
      processAria: "Using a trained LLM to answer a prompt",
      process: ["Prompt", "Tokenize", "Attend", "Predict token", "Reply grows"],
      legendSubtitle: "LLM inference terms and signals",
      legend: [
        ["Fixed parameter", "Numbers inside nodes are frozen learned values; they stay constant while the answer is generated."],
        ["Attention score", "A temporary score computed during this prompt; it is not a permanent model-weight change."],
        ["Context flow", "Prompt meaning moving through stacked transformer blocks."],
        ["No weight update", "During one answer, trained weights stay fixed; only activations and attention scores change."],
        ["Next-token choice", "Candidate continuations compete; the strongest token is appended to the reply."],
        ["Step, uncertainty, confidence", "Step counts generated tokens; uncertainty falls as confidence rises."]
      ],
      outputs: ["adjusting", "finding", "guessing"]
    },
    train: {
      documentTitle: "How an LLM Learns | Training Tokens in Motion",
      title: "How an LLM Learns During Training",
      subtitle: "Training Tokens in Motion",
      metrics: ["Epoch", "Loss", "Target prob"],
      tooltips: [
        "One pass over many text examples. More epochs give the model more chances to improve.",
        "How wrong the predicted next token is compared with the target. Lower loss means less error.",
        "The probability assigned to the known target token. During training this should rise."
      ],
      progressLabel: "Training progress",
      zoneEyebrow: "Text examples tune model weights",
      networkTitle: "LLM Training Loop",
      chipByPhase: {
        forward: "Prediction pass",
        backprop: "Backpropagation",
        update: "Weights update"
      },
      layerLabels: ["Training tokens", "Transformer layers", "Target token"],
      svgLabel: "Transformer training loop with text examples, model-weight updates, loss signals, and target-token probabilities",
      promptCard: ["Training example", "A neural network learns by [MASK]", "Target token: adjusting"],
      replyCard: ["Teacher signal", "Target: adjusting weights", "Loss pushes probability toward target"],
      phaseLabels: ["Predict", "Backprop", "Update"],
      flowLabels: ["Prediction forward", "Backpropagation", "Weights update"],
      caption: "From wrong guesses to stronger next-token predictions",
      processAria: "Training an LLM on text examples",
      process: ["Example", "Predict", "Measure loss", "Backprop", "Update weights"],
      legendSubtitle: "LLM training terms and signals",
      legend: [
        ["Token activation", "A circle showing how a training token is represented inside the model."],
        ["Model weight", "A learned connection strength that changes slowly during training."],
        ["Prediction pass", "The model guesses the next token from the training text."],
        ["Backpropagation", "Loss gradients flow backward through layers to calculate weight changes."],
        ["Weight update", "Backprop nudges weights so useful paths strengthen and weak paths fade."],
        ["Epoch, loss, target prob", "Epoch counts passes; loss should fall; target-token probability should rise."]
      ],
      outputs: ["adjusting", "guessing", "finding"]
    }
  };

  function setChartLayout() {
    const nextMode = window.matchMedia("(max-width: 720px)").matches ? "compact" : "wide";
    if (nextMode === layoutMode && xPositions.length) {
      return false;
    }

    layoutMode = nextMode;

    if (layoutMode === "compact") {
      chartWidth = 460;
      xPositions = [38, 145, 235, 325, 392];
    } else {
      chartWidth = 1600;
      xPositions = [92, 445, 760, 1075, 1455];
    }

    svg.setAttribute("viewBox", `0 0 ${chartWidth} ${chartHeight}`);
    return true;
  }

  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  function easeInOutCubic(value) {
    return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  function signed(value) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  }

  function connectionDisplayValue(connection, learned) {
    if (activeMode === "train") {
      return connection.baseWeight + (connection.targetWeight - connection.baseWeight) * learned;
    }

    return connection.targetWeight;
  }

  function attentionScore(value) {
    return clamp(Math.abs(value) / 1.42, 0, 0.99).toFixed(2);
  }

  function attentionLabel(value) {
    return `attn ${attentionScore(value).replace(/^0/, ".")}`;
  }

  function setText(element, text) {
    if (element) {
      element.textContent = text;
    }
  }

  function currentMode() {
    return viewModes[activeMode];
  }

  function applyMode(mode, rerender = true) {
    if (!viewModes[mode]) {
      return;
    }

    activeMode = mode;
    const config = currentMode();
    outputNames = config.outputs.slice();
    widget.dataset.mode = mode;
    document.title = config.documentTitle;

    modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    setText(pageTitle, config.title);
    setText(subtitleText, config.subtitle);
    setText(metricOneLabel, config.metrics[0]);
    setText(metricTwoLabel, config.metrics[1]);
    setText(metricThreeLabel, config.metrics[2]);
    setText(epochTip, config.tooltips[0]);
    setText(lossTip, config.tooltips[1]);
    setText(accuracyTip, config.tooltips[2]);
    setText(progressLabelText, config.progressLabel);
    setText(zoneEyebrow, config.zoneEyebrow);
    setText(networkTitle, config.networkTitle);
    setText(weightChip, config.chipByPhase.forward);

    config.layerLabels.forEach((label, index) => setText(layerLabels[index], label));
    svg.setAttribute("aria-label", config.svgLabel);
    setText(promptCardRole, config.promptCard[0]);
    setText(promptCardText, config.promptCard[1]);
    setText(promptCardHint, config.promptCard[2]);
    setText(replyCardRole, config.replyCard[0]);
    setText(replyCardText, config.replyCard[1]);
    setText(replyCardHint, config.replyCard[2]);
    phaseSteps.forEach((step, index) => setText(step.querySelector("span"), config.phaseLabels[index]));
    setText(flowLabels.forward, config.flowLabels[0]);
    setText(flowLabels.backprop, config.flowLabels[1]);
    setText(flowLabels.update, config.flowLabels[2]);
    setText(networkCaption, config.caption);
    processStrip.setAttribute("aria-label", config.processAria);
    processStepLabels.forEach((label, index) => setText(label, config.process[index]));
    setText(legendSubtitle, config.legendSubtitle);

    legendItems.forEach((item, index) => {
      const term = config.legend[index];
      if (!term) {
        return;
      }
      setText(item.querySelector("dt"), term[0]);
      setText(item.querySelector("dd"), term[1]);
    });

    if (rerender) {
      renderNetwork();
      updateNetwork(progress);
      updateMetrics(progress);
      syncEmbedHeight();
    }
  }

  function macroRandomFactory() {
    let macroSeed = 91357;
    return function macroRandom() {
      macroSeed = (macroSeed * 48271) % 2147483647;
      return (macroSeed - 1) / 2147483646;
    };
  }

  function buildMacroNetwork() {
    const macroRandom = macroRandomFactory();
    const compact = layoutMode === "compact";
    const totalLayers = compact ? 42 : 58;
    const focusStart = Math.floor(totalLayers / 2) - 2;
    const layerGap = compact ? 74 : 118;
    const width = layerGap * (totalLayers - 1) + (compact ? 760 : 1280);
    const height = compact ? 2600 : 2600;
    const focusX = (focusStart + 2 - (totalLayers - 1) / 2) * layerGap;
    const focusWidth = layerGap * 4 + (compact ? 128 : 210);
    const focusHeight = compact ? 590 : 430;
    const sourceCenterY = (topY + bottomY) / 2;
    const sourceSpanY = bottomY - topY;
    const hiddenPattern = compact ? [9, 12, 10, 13, 11, 8, 14] : [10, 14, 12, 16, 11, 15, 13, 9];
    macroNodes = [];
    macroLinks = [];
    macroBlocks = [];
    macroWorld = { width, height, focusX, focusY: 0, focusWidth, focusHeight, focusStart, totalLayers, layerGap };

    for (let layer = 0; layer < totalLayers; layer += 1) {
      const focusOffset = layer - focusStart;
      const isFocusLayer = focusOffset >= 0 && focusOffset < layerCounts.length;
      const count = isFocusLayer ? layerCounts[focusOffset] : hiddenPattern[layer % hiddenPattern.length];
      const x = (layer - (totalLayers - 1) / 2) * layerGap;
      const layerSpan = height * (compact ? 0.9 : 0.88);
      const focusSpan = focusHeight * 0.84;
      const layerBlock = { id: layer, x, count, focus: isFocusLayer, span: layerSpan, focusSpan };
      macroBlocks.push(layerBlock);

      const spacing = sourceSpanY / Math.max(1, count - 1);
      for (let index = 0; index < count; index += 1) {
        const sourceY = topY + spacing * index;
        const hiddenJitter = isFocusLayer && (focusOffset === 0 || focusOffset === layerCounts.length - 1)
          ? 0
          : (macroRandom() - 0.5) * height * (compact ? 0.012 : 0.014);
        const normalizedY = (sourceY - sourceCenterY) / sourceSpanY;
        const farY = normalizedY * layerSpan + hiddenJitter;
        const focusY = normalizedY * focusSpan + hiddenJitter * 0.18;
        macroNodes.push({
          layer,
          focusLayer: focusOffset,
          index,
          output: isFocusLayer && focusOffset === layerCounts.length - 1,
          x,
          y: isFocusLayer ? focusY : farY,
          farY,
          focusY,
          r: compact ? 4.2 + macroRandom() * 0.75 : 4 + macroRandom() * 0.85,
          heat: macroRandom(),
          value: -0.75 + macroRandom() * 1.55
        });
      }
    }

    for (let layer = 0; layer < totalLayers - 1; layer += 1) {
      const fromNodes = macroNodes.filter((node) => node.layer === layer);
      const toNodes = macroNodes.filter((node) => node.layer === layer + 1);
      fromNodes.forEach((from) => {
        toNodes.forEach((to) => {
          const weight = -0.82 + macroRandom() * 1.7;
          macroLinks.push({
            from,
            to,
            strength: Math.abs(weight),
            negative: weight < 0,
            focus: layer >= focusStart && layer < focusStart + layerCounts.length - 1,
            phase: macroRandom(),
            packet: macroRandom() > 0.8,
            error: macroRandom() > 0.9
          });
        });
      });
    }
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function resizeMacroCanvas() {
    const rect = macroCanvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    macroCanvas.width = Math.max(1, Math.round(rect.width * ratio));
    macroCanvas.height = Math.max(1, Math.round(rect.height * ratio));
    macroContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function renderMacroIntro(time) {
    if (!introActive) {
      return;
    }

    if (!introStartTime) {
      introStartTime = time;
      networkStage.classList.add("is-intro");
      resizeMacroCanvas();
    }

    const rect = macroCanvas.getBoundingClientRect();
    const raw = clamp((time - introStartTime) / introDuration, 0, 1);
    const cameraRaw = clamp((raw - 0.44) / 0.56, 0, 1);
    const zoom = easeInOutCubic(cameraRaw);
    const ctx = macroContext;
    const width = rect.width;
    const height = rect.height;
    if (!macroBlocks.length) {
      return;
    }

    const fitFullWidth = width / (macroWorld.width * (layoutMode === "compact" ? 1.08 : 1.1));
    const fillFullHeight = height / (macroWorld.height * (layoutMode === "compact" ? 0.98 : 0.96));
    const farScale = Math.max(
      fitFullWidth,
      fillFullHeight
    );
    const nearScale = Math.min(
      width / (macroWorld.focusWidth * (layoutMode === "compact" ? 1.08 : 1.04)),
      height / (macroWorld.focusHeight * (layoutMode === "compact" ? 1.08 : 1.05))
    );
    const scale = farScale + (nearScale - farScale) * zoom;
    const startPanX = layoutMode === "compact" ? -macroWorld.layerGap * 1.2 : -macroWorld.layerGap * 2;
    const startPanY = layoutMode === "compact" ? -macroWorld.focusHeight * 0.08 : -macroWorld.focusHeight * 0.04;
    const targetX = macroWorld.focusX + startPanX * (1 - zoom);
    const targetY = macroWorld.focusY + startPanY * (1 - zoom);
    const fadeOut = raw > 0.9 ? 1 - (raw - 0.9) / 0.1 : 1;
    const currentOpacity = clamp(fadeOut, 0, 1);
    const distanceView = Math.pow(1 - zoom, 1.22);

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = currentOpacity;
    ctx.fillStyle = `rgba(236, 247, 255, ${0.74 - zoom * 0.28})`;
    ctx.fillRect(0, 0, width, height);
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-targetX, -targetY);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    function layerVisibility(layer) {
      const distance = Math.abs(layer.x - macroWorld.focusX);
      const fadeDistance = layoutMode === "compact" ? 1180 : 2050;
      return clamp(1 - zoom * clamp(distance / fadeDistance, 0, 0.96), 0.06 + distanceView * 0.18, 1);
    }

    function linePoint(from, to, t) {
      return {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t
      };
    }

    function layerDrawSpan(layer) {
      return layer.focus ? layer.span * distanceView + layer.focusSpan * (1 - distanceView) : layer.span;
    }

    function nodePoint(node) {
      const layer = macroBlocks[node.layer];
      const y = layer.focus ? node.farY * distanceView + node.focusY * (1 - distanceView) : node.farY;
      return { x: node.x, y };
    }

    const outerTop = -macroWorld.height * 0.48;
    const outerBottom = macroWorld.height * 0.48;
    const focusLeft = macroBlocks[macroWorld.focusStart].x;
    const focusRight = macroBlocks[macroWorld.focusStart + layerCounts.length - 1].x;
    const focusAlpha = clamp((zoom - 0.36) / 0.42, 0, 1);

    ctx.strokeStyle = `rgba(35, 116, 225, ${0.035 + distanceView * 0.045})`;
    ctx.lineWidth = 1.1;
    for (let lane = 0; lane < 9; lane += 1) {
      const y = outerTop + ((lane + 1) / 10) * (outerBottom - outerTop);
      ctx.beginPath();
      ctx.moveTo(-macroWorld.width / 2, y);
      ctx.lineTo(macroWorld.width / 2, y + Math.sin(raw * Math.PI * 2 + lane) * 18 * distanceView);
      ctx.stroke();
    }

    macroBlocks.forEach((layer) => {
      const visibility = layerVisibility(layer);
      const span = layerDrawSpan(layer);
      const top = -span / 2;
      const bottom = span / 2;

      if (layer.focus && focusAlpha > 0) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(35, 116, 225, ${0.018 * focusAlpha})`;
        ctx.ellipse(layer.x, 0, macroWorld.layerGap * 0.34, span * 0.58, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = layer.focus
        ? `rgba(35, 116, 225, ${0.08 + visibility * 0.13 + focusAlpha * 0.08})`
        : `rgba(35, 116, 225, ${0.04 + visibility * 0.075})`;
      ctx.lineWidth = layer.focus ? 1.4 + focusAlpha * 0.9 : 0.85 + visibility * 0.35;
      ctx.beginPath();
      ctx.moveTo(layer.x, top);
      ctx.lineTo(layer.x, bottom);
      ctx.stroke();

      if (layer.id % 4 === 0 || layer.focus) {
        ctx.strokeStyle = `rgba(35, 116, 225, ${0.025 + visibility * 0.04})`;
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(layer.x - macroWorld.layerGap * 0.16, top);
        ctx.lineTo(layer.x - macroWorld.layerGap * 0.16, bottom);
        ctx.stroke();
      }
    });

    macroLinks.forEach((link) => {
      const visibility = Math.min(layerVisibility(macroBlocks[link.from.layer]), layerVisibility(macroBlocks[link.to.layer]));
      const pulse = 0.5 + Math.sin(raw * Math.PI * 9 + link.phase * 7) * 0.5;
      const alpha = (0.026 + link.strength * 0.078 + pulse * 0.024 + (link.focus ? zoom * 0.018 : 0)) * visibility;
      const fromPoint = nodePoint(link.from);
      const toPoint = nodePoint(link.to);
      ctx.strokeStyle = link.negative
        ? `rgba(242, 118, 50, ${alpha * 0.72})`
        : `rgba(35, 116, 225, ${alpha})`;
      ctx.lineWidth = (0.48 + link.strength * 1.45 + distanceView * 0.18 + zoom * (link.focus ? 0.55 : 0.08)) * visibility;
      ctx.beginPath();
      ctx.moveTo(fromPoint.x, fromPoint.y);
      ctx.lineTo(toPoint.x, toPoint.y);
      ctx.stroke();

      if (link.packet && (link.focus || distanceView > 0.46)) {
        const dot = linePoint(fromPoint, toPoint, (raw * 2.6 + link.phase) % 1);
        ctx.beginPath();
        ctx.fillStyle = `rgba(35, 116, 225, ${0.2 + visibility * 0.45})`;
        ctx.arc(dot.x, dot.y, (2.2 + zoom * 1.2) * visibility, 0, Math.PI * 2);
        ctx.fill();
      }

      if (link.error && (link.focus || distanceView > 0.58)) {
        const dot = linePoint(toPoint, fromPoint, (raw * 2.1 + link.phase * 0.7) % 1);
        ctx.beginPath();
        ctx.fillStyle = activeMode === "train"
          ? `rgba(242, 118, 50, ${0.16 + visibility * 0.34})`
          : `rgba(67, 183, 216, ${0.14 + visibility * 0.32})`;
        ctx.arc(dot.x, dot.y, (1.9 + zoom) * visibility, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    macroNodes.forEach((node) => {
      const layer = macroBlocks[node.layer];
      const visibility = layerVisibility(layer);
      const point = nodePoint(node);
      const glow = 0.35 + Math.sin(raw * Math.PI * 8 + node.heat * 6) * 0.3;
      const isOutput = node.output;
      const isHot = node.heat > 0.84;
      if (isOutput) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(31, 159, 107, ${0.16 + visibility * 0.38})`;
        ctx.lineWidth = (2.1 + glow * 1.6 + zoom * 1.3) * visibility;
        ctx.arc(point.x, point.y, node.r * (2.4 + zoom * 0.58), 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = `rgba(31, 159, 107, ${0.08 + visibility * 0.16})`;
        ctx.lineWidth = 2.2 * visibility;
        ctx.moveTo(point.x + node.r * 2.8, point.y);
        ctx.lineTo(point.x + node.r * (8 + zoom * 8), point.y);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.fillStyle = isHot
        ? `rgba(242, 118, 50, ${0.28 + glow * 0.36 + visibility * 0.12})`
        : `rgba(35, 116, 225, ${0.34 + glow * 0.3 + visibility * 0.1})`;
      ctx.arc(point.x, point.y, node.r * (0.95 + distanceView * 0.62 + zoom * 0.2) * visibility, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 + visibility * 0.25})`;
      ctx.lineWidth = 0.85 * visibility;
      ctx.arc(point.x, point.y, node.r * (1.38 + zoom * 0.18) * visibility, 0, Math.PI * 2);
      ctx.stroke();

      if (activeMode === "train" && layer.focus && zoom > 0.62 && (node.focusLayer === 0 || node.focusLayer === 2 || isOutput) && node.index % 2 === 0) {
        ctx.fillStyle = `rgba(13, 54, 96, ${(zoom - 0.62) * 0.55})`;
        ctx.font = `${layoutMode === "compact" ? 8 : 10}px Inter, Segoe UI, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(node.value.toFixed(2), point.x, point.y + 3);
        ctx.textAlign = "left";
      }

      if (layer.focus && zoom > 0.74 && isOutput) {
        ctx.fillStyle = `rgba(13, 54, 96, ${(zoom - 0.74) * 1.4})`;
        ctx.font = `${layoutMode === "compact" ? 11 : 13}px Inter, Segoe UI, sans-serif`;
        ctx.fillText(outputNames[node.index] || "", point.x + node.r * 4.2, point.y + 4);
      }
    });

    if (focusAlpha > 0) {
      ctx.strokeStyle = `rgba(67, 183, 216, ${0.08 * focusAlpha})`;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([12, 14]);
      ctx.beginPath();
      ctx.moveTo(focusLeft - macroWorld.layerGap * 0.5, -macroWorld.focusHeight * 0.48);
      ctx.lineTo(focusRight + macroWorld.layerGap * 0.5, -macroWorld.focusHeight * 0.48);
      ctx.moveTo(focusLeft - macroWorld.layerGap * 0.5, macroWorld.focusHeight * 0.48);
      ctx.lineTo(focusRight + macroWorld.layerGap * 0.5, macroWorld.focusHeight * 0.48);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    const tunnel = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.05, width / 2, height / 2, Math.max(width, height) * 0.66);
    tunnel.addColorStop(0, `rgba(255, 255, 255, ${0.08 + zoom * 0.16})`);
    tunnel.addColorStop(0.48, "rgba(255, 255, 255, 0)");
    tunnel.addColorStop(1, `rgba(237, 247, 255, ${0.72 * currentOpacity})`);
    ctx.fillStyle = tunnel;
    ctx.fillRect(0, 0, width, height);

    if (raw >= 1) {
      introActive = false;
      networkStage.classList.remove("is-intro");
      networkStage.classList.add("is-settling");
      setTimeout(() => networkStage.classList.remove("is-settling"), 820);
      ctx.clearRect(0, 0, width, height);
    }
  }

  function outputProbabilities(learned, value) {
    if (activeMode === "train") {
      const target = clamp(24 + learned * 66 + Math.sin(value * Math.PI * 5) * 1.8, 20, 90);
      const nearMiss = clamp(48 - learned * 31 - Math.sin(value * Math.PI * 4) * 1.2, 14, 50);
      const weak = clamp(28 - learned * 18 + Math.sin(value * Math.PI * 3) * 0.9, 6, 30);
      const total = target + nearMiss + weak;
      return [target, nearMiss, weak].map((item) => item / total * 100);
    }

    const chosen = clamp(36 + learned * 45 + Math.sin(value * Math.PI * 5) * 2.2, 30, 84);
    const plausible = clamp(42 - learned * 20 - Math.sin(value * Math.PI * 4) * 1.4, 18, 48);
    const weak = clamp(22 - learned * 16 + Math.sin(value * Math.PI * 3) * 0.9, 5, 24);
    const total = chosen + plausible + weak;
    return [chosen, plausible, weak].map((item) => item / total * 100);
  }

  function buildData() {
    seed = initialSeed;
    nodes = [];
    connections = [];

    layerCounts.forEach((count, layerIndex) => {
      const spacing = (bottomY - topY) / Math.max(1, count - 1);
      for (let index = 0; index < count; index += 1) {
        const jitter = layerIndex === 0 || layerIndex === layerCounts.length - 1 ? 0 : (random() - 0.5) * 6;
        const baseValue = -0.72 + random() * 1.7;
        const targetValue = -0.24 + random() * 1.76;
        nodes.push({
          id: `n-${layerIndex}-${index}`,
          layer: layerIndex,
          index,
          x: xPositions[layerIndex],
          y: topY + spacing * index + jitter,
          baseValue,
          targetValue,
          hot: random() > 0.64
        });
      }
    });

    for (let layer = 0; layer < layerCounts.length - 1; layer += 1) {
      const fromNodes = nodes.filter((node) => node.layer === layer);
      const toNodes = nodes.filter((node) => node.layer === layer + 1);

      fromNodes.forEach((from) => {
        toNodes.forEach((to) => {
          const density = layer === 3 ? 0.96 : 0.72;
          if (random() > density) {
            return;
          }

          const baseWeight = -0.78 + random() * 1.56;
          const targetLift = random() > 0.36 ? 0.55 + random() * 0.86 : -0.26 + random() * 0.42;
          const targetWeight = clamp(baseWeight + (baseWeight >= 0 ? targetLift : -targetLift * 0.46), -1.32, 1.42);
          const strength = Math.abs(targetWeight);
          const isStrong = strength > 0.72 || (layer === 2 && random() > 0.78);
          const isAdjust = random() > 0.875 || (layer >= 2 && random() > 0.82);
          connections.push({
            from,
            to,
            baseWeight,
            targetWeight,
            strong: isStrong,
            adjust: isAdjust,
            label: false,
            signal: isStrong && random() > 0.58,
            primary: false
          });
        });
      });
    }

    const highlightedPath = [
      [0, 2, 1, 6],
      [1, 6, 2, 7],
      [2, 7, 3, 5],
      [3, 5, 4, 0],
      [0, 4, 1, 8],
      [1, 8, 2, 5],
      [2, 5, 3, 4],
      [3, 4, 4, 0]
    ];

    function ensureConnection(fromLayer, fromIndex, toLayer, toIndex) {
      let match = connections.find((connection) =>
        connection.from.layer === fromLayer &&
        connection.from.index === fromIndex &&
        connection.to.layer === toLayer &&
        connection.to.index === toIndex
      );

      if (!match) {
        match = {
          from: nodes.find((node) => node.layer === fromLayer && node.index === fromIndex),
          to: nodes.find((node) => node.layer === toLayer && node.index === toIndex),
          baseWeight: -0.28 + random() * 0.56,
          targetWeight: 0.48 + random() * 0.72,
          strong: false,
          adjust: false,
          label: false,
          signal: false,
          primary: false
        };
        connections.push(match);
      }

      return match;
    }

    highlightedPath.forEach(([fromLayer, fromIndex, toLayer, toIndex], pathIndex) => {
      const match = ensureConnection(fromLayer, fromIndex, toLayer, toIndex);
      if (match) {
        match.strong = true;
        match.signal = true;
        match.primary = true;
        match.label = pathIndex === 0 || pathIndex === 3 || pathIndex === 5;
        match.targetWeight = pathIndex % 3 === 0 ? 1.14 : 0.82 + pathIndex * 0.03;
      }
    });

    [
      [0, 1, 1, 3, 0.42, false],
      [0, 5, 1, 7, -0.67, true],
      [1, 2, 2, 6, -0.31, true],
      [1, 9, 2, 4, 0.65, false],
      [2, 3, 3, 6, -0.07, true],
      [2, 8, 3, 2, 0.53, false],
      [3, 2, 4, 1, -0.31, true],
      [3, 8, 4, 2, 0.74, false]
    ].forEach(([fromLayer, fromIndex, toLayer, toIndex, targetWeight, adjust]) => {
      const match = ensureConnection(fromLayer, fromIndex, toLayer, toIndex);
      match.label = true;
      match.adjust = adjust;
      match.strong = Math.abs(targetWeight) > 0.62;
      match.signal = match.strong && !adjust;
      match.primary = match.primary || (!adjust && Math.abs(targetWeight) > 0.72);
      match.targetWeight = targetWeight;
      match.baseWeight = targetWeight * 0.52;
    });
  }

  function makeSvgElement(name, attributes) {
    const element = document.createElementNS(ns, name);
    Object.entries(attributes || {}).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
  }

  function renderNetwork() {
    svg.innerHTML = "";
    renderedConnections = [];
    renderedNodes = [];
    renderedLabels = [];
    renderedFields = [];
    renderedPackets = [];
    renderedSparks = [];
    renderedOutputRings = [];
    renderedOutputBars = [];
    renderedActivationRings = [];
    renderedErrorWaves = [];
    renderedFocusHalo = null;
    renderedLayerMeters = [];
    renderedLossRipples = [];
    renderedMemoryTrails = [];
    renderedContextPieces = [];

    const defs = makeSvgElement("defs");
    defs.innerHTML = `
      <filter id="blueGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.3" result="blur"></feGaussianBlur>
        <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
      </filter>
      <filter id="orangeGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.1" result="blur"></feGaussianBlur>
        <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
      </filter>
      <filter id="greenGlow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.8" result="blur"></feGaussianBlur>
        <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
      </filter>
      <filter id="packetGlow" x="-90%" y="-90%" width="280%" height="280%">
        <feGaussianBlur stdDeviation="3.2" result="blur"></feGaussianBlur>
        <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
      </filter>
      <filter id="nodeGlow" x="-70%" y="-70%" width="240%" height="240%">
        <feDropShadow dx="0" dy="0" stdDeviation="2.4" flood-color="#2374e1" flood-opacity="0.28"></feDropShadow>
      </filter>
      <filter id="hotGlow" x="-80%" y="-80%" width="260%" height="260%">
        <feDropShadow dx="0" dy="0" stdDeviation="4.4" flood-color="#2374e1" flood-opacity="0.52"></feDropShadow>
      </filter>
      <linearGradient id="nodeBlue" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#ffffff"></stop>
        <stop offset="100%" stop-color="#a9d8ff"></stop>
      </linearGradient>
      <linearGradient id="nodeGreen" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#ffffff"></stop>
        <stop offset="100%" stop-color="#acebc8"></stop>
      </linearGradient>
      <linearGradient id="nodeOrange" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#ffffff"></stop>
        <stop offset="100%" stop-color="#ffd0ad"></stop>
      </linearGradient>
      <radialGradient id="fieldBlue">
        <stop offset="0%" stop-color="#2374e1" stop-opacity="0.22"></stop>
        <stop offset="72%" stop-color="#43b7d8" stop-opacity="0.07"></stop>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"></stop>
      </radialGradient>
      <radialGradient id="fieldCyan">
        <stop offset="0%" stop-color="#43b7d8" stop-opacity="0.2"></stop>
        <stop offset="74%" stop-color="#2374e1" stop-opacity="0.06"></stop>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"></stop>
      </radialGradient>
      <radialGradient id="fieldGreen">
        <stop offset="0%" stop-color="#1f9f6b" stop-opacity="0.22"></stop>
        <stop offset="72%" stop-color="#75d39d" stop-opacity="0.08"></stop>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"></stop>
      </radialGradient>
      <radialGradient id="packetBlue">
        <stop offset="0%" stop-color="#ffffff"></stop>
        <stop offset="42%" stop-color="#43b7d8"></stop>
        <stop offset="100%" stop-color="#2374e1"></stop>
      </radialGradient>
      <radialGradient id="packetOrange">
        <stop offset="0%" stop-color="#ffffff"></stop>
        <stop offset="42%" stop-color="#f7c948"></stop>
        <stop offset="100%" stop-color="#f27632"></stop>
      </radialGradient>
    `;
    svg.appendChild(defs);

    const contextGroup = makeSvgElement("g", { class: "network-context-layer" });
    const fieldGroup = makeSvgElement("g", { class: "field-layer" });
    const focusGroup = makeSvgElement("g", { class: "focus-layer" });
    const trailGroup = makeSvgElement("g", { class: "trail-layer" });
    const waveGroup = makeSvgElement("g", { class: "wave-layer" });
    const connectionGroup = makeSvgElement("g", { class: "connection-layer" });
    const sparkGroup = makeSvgElement("g", { class: "spark-layer" });
    const packetGroup = makeSvgElement("g", { class: "packet-layer" });
    const labelGroup = makeSvgElement("g", { class: "weight-label-layer" });
    const ringGroup = makeSvgElement("g", { class: "ring-layer" });
    const nodeGroup = makeSvgElement("g", { class: "node-layer" });
    svg.append(contextGroup, fieldGroup, focusGroup, trailGroup, waveGroup, connectionGroup, sparkGroup, packetGroup, labelGroup, ringGroup, nodeGroup);

    const layerNode = (layer, index) => nodes.find((node) => node.layer === layer && node.index === index);
    const ghostNodes = [
      { x: -26, y: 74, r: 15, target: layerNode(0, 1) },
      { x: -18, y: 212, r: 11, target: layerNode(0, 3), deep: true },
      { x: -32, y: 384, r: 17, target: layerNode(0, 5) },
      { x: chartWidth + 24, y: 92, r: 15, target: layerNode(4, 0) },
      { x: chartWidth + 18, y: 286, r: 12, target: layerNode(4, 1), deep: true },
      { x: chartWidth + 32, y: 486, r: 17, target: layerNode(4, 2) },
      { x: chartWidth * 0.24, y: -18, r: 12, target: layerNode(1, 1), deep: true },
      { x: chartWidth * 0.52, y: -24, r: 16, target: layerNode(2, 2) },
      { x: chartWidth * 0.74, y: chartHeight + 20, r: 15, target: layerNode(3, 9), deep: true },
      { x: chartWidth * 0.42, y: chartHeight + 24, r: 13, target: layerNode(2, 11) }
    ];

    ghostNodes.forEach((ghost, index) => {
      if (ghost.target) {
        const line = makeSvgElement("line", {
          x1: ghost.x,
          y1: ghost.y,
          x2: ghost.target.x,
          y2: ghost.target.y,
          class: "context-connection"
        });
        contextGroup.appendChild(line);
        renderedContextPieces.push({ element: line, index, kind: "line" });
      }

      const node = makeSvgElement("circle", {
        cx: ghost.x,
        cy: ghost.y,
        r: ghost.r,
        class: `context-node${ghost.deep ? " context-node--deep" : ""}`
      });
      contextGroup.appendChild(node);
      renderedContextPieces.push({ element: node, index, kind: "node" });
    });

    [
      { cx: -54, cy: 292, rx: layoutMode === "compact" ? 74 : 126, ry: 292 },
      { cx: chartWidth + 54, cy: 292, rx: layoutMode === "compact" ? 74 : 126, ry: 292 },
      { cx: chartWidth * 0.52, cy: -48, rx: layoutMode === "compact" ? 160 : 330, ry: 112, warm: true },
      { cx: chartWidth * 0.48, cy: chartHeight + 48, rx: layoutMode === "compact" ? 170 : 360, ry: 116 }
    ].forEach((ring, index) => {
      const ellipse = makeSvgElement("ellipse", {
        cx: ring.cx,
        cy: ring.cy,
        rx: ring.rx,
        ry: ring.ry,
        class: `context-depth-ring${ring.warm ? " context-depth-ring--warm" : ""}`
      });
      contextGroup.appendChild(ellipse);
      renderedContextPieces.push({ element: ellipse, index: index + ghostNodes.length, kind: "ring" });
    });

    xPositions.forEach((x, index) => {
      const field = makeSvgElement("ellipse", {
        cx: x,
        cy: 281,
        rx: layoutMode === "compact" ? 42 : index === 4 ? 88 : 108,
        ry: 270,
        class: `layer-field ${index === 0 ? "layer-field--input" : index === 4 ? "layer-field--output" : "layer-field--hidden"}`
      });
      fieldGroup.appendChild(field);
      renderedFields.push({ field, layer: index });
    });

    const halo = makeSvgElement("ellipse", {
      cx: xPositions[0],
      cy: 281,
      rx: layoutMode === "compact" ? 48 : 118,
      ry: 282,
      class: "layer-focus-halo"
    });
    focusGroup.appendChild(halo);
    renderedFocusHalo = halo;

    xPositions.forEach((x, layer) => {
      const meter = makeSvgElement("g", {
        class: "layer-meter",
        transform: `translate(${x - (layoutMode === "compact" ? 14 : 24)} ${layoutMode === "compact" ? 536 : 542})`
      });
      const segments = [];
      for (let index = 0; index < 4; index += 1) {
        const rect = makeSvgElement("rect", {
          x: index * (layoutMode === "compact" ? 7 : 12),
          y: 0,
          width: layoutMode === "compact" ? 5 : 9,
          height: 18,
          rx: 3,
          class: "layer-meter-segment"
        });
        meter.appendChild(rect);
        segments.push(rect);
      }
      focusGroup.appendChild(meter);
      renderedLayerMeters.push({ meter, segments, layer });
    });

    connections
      .filter((connection) => connection.primary)
      .slice(0, layoutMode === "compact" ? 7 : 12)
      .forEach((connection, index) => {
        const trail = makeSvgElement("line", {
          x1: connection.from.x,
          y1: connection.from.y,
          x2: connection.to.x,
          y2: connection.to.y,
          class: "memory-trail"
        });
        trailGroup.appendChild(trail);
        renderedMemoryTrails.push({ trail, connection, index });
      });

    [
      [4, 0, 3, 2],
      [4, 1, 3, 5],
      [4, 2, 3, 8],
      [3, 3, 2, 4],
      [3, 7, 2, 9]
    ].forEach(([fromLayer, fromIndex, toLayer, toIndex], index) => {
      const from = nodes.find((node) => node.layer === fromLayer && node.index === fromIndex);
      const to = nodes.find((node) => node.layer === toLayer && node.index === toIndex);
      if (!from || !to) {
        return;
      }
      const bend = layoutMode === "compact" ? 28 : 72;
      const path = makeSvgElement("path", {
        d: `M ${from.x} ${from.y} C ${from.x - bend} ${from.y - 18}, ${to.x + bend} ${to.y + 18}, ${to.x} ${to.y}`,
        class: activeMode === "train" ? "error-wave" : "attention-wave"
      });
      waveGroup.appendChild(path);
      renderedErrorWaves.push({ path, index });
    });

    connections.forEach((connection) => {
      const line = makeSvgElement("line", {
        x1: connection.from.x,
        y1: connection.from.y,
        x2: connection.to.x,
        y2: connection.to.y,
        class: "connection connection--weak"
      });
      connectionGroup.appendChild(line);
      renderedConnections.push({ line, connection });

      if (connection.label) {
        const label = makeSvgElement("text", {
          x: (connection.from.x + connection.to.x) / 2,
          y: (connection.from.y + connection.to.y) / 2 - 4,
          class: "weight-label"
        });
        label.textContent = activeMode === "train" ? signed(connection.baseWeight) : attentionLabel(connection.targetWeight);
        labelGroup.appendChild(label);
        renderedLabels.push({ label, connection });
      }
    });

    const signalConnections = connections
      .filter((connection) => connection.primary || (connection.signal && connection.strong))
      .slice(0, layoutMode === "compact" ? 8 : 14);
    const errorConnections = connections
      .filter((connection) => connection.adjust)
      .slice(0, layoutMode === "compact" ? 5 : 9);

    signalConnections.forEach((connection, index) => {
      const packet = makeSvgElement("circle", {
        r: layoutMode === "compact" ? 4.4 : 5.8,
        class: "signal-packet"
      });
      packetGroup.appendChild(packet);
      renderedPackets.push({
        packet,
        connection,
        direction: 1,
        type: "signal",
        offset: index / Math.max(1, signalConnections.length),
        speed: 9.5 + index * 0.35
      });
    });

    errorConnections.forEach((connection, index) => {
      const packet = makeSvgElement("circle", {
        r: layoutMode === "compact" ? 4.2 : 5.4,
        class: activeMode === "train" ? "error-packet" : "attention-packet"
      });
      packetGroup.appendChild(packet);
      renderedPackets.push({
        packet,
        connection,
        direction: activeMode === "train" ? -1 : 1,
        type: activeMode === "train" ? "error" : "attention",
        offset: index / Math.max(1, errorConnections.length),
        speed: (activeMode === "train" ? 7.2 : 5.8) + index * 0.28
      });

      if (activeMode === "train") {
        const x = (connection.from.x + connection.to.x) / 2;
        const y = (connection.from.y + connection.to.y) / 2;
        const spark = makeSvgElement("g", {
          class: "weight-spark",
          transform: `translate(${x} ${y}) scale(0.1)`
        });
        spark.innerHTML = `
          <circle r="${layoutMode === "compact" ? 6 : 8}"></circle>
          <path d="M-12 0 L-5 0 M5 0 L12 0 M0 -12 L0 -5 M0 5 L0 12"></path>
        `;
        sparkGroup.appendChild(spark);

        const delta = connection.targetWeight - connection.baseWeight;
        const badge = makeSvgElement("g", {
          class: "weight-delta",
          transform: `translate(${x + (layoutMode === "compact" ? 8 : 16)} ${y - (layoutMode === "compact" ? 12 : 16)})`
        });
        const badgeText = `${delta >= 0 ? "+" : "-"}${Math.abs(delta).toFixed(2)}`;
        const badgeWidth = layoutMode === "compact" ? 34 : 44;
        badge.innerHTML = `
          <rect x="${-badgeWidth / 2}" y="-10" width="${badgeWidth}" height="18" rx="9"></rect>
          <text y="3">${badgeText}</text>
        `;
        sparkGroup.appendChild(badge);
        renderedSparks.push({ spark, badge, connection, offset: index * 0.14 });
      }
    });

    nodes.forEach((node) => {
      if (node.layer > 0 && node.layer < 4 && (node.hot || node.index % 4 === 0)) {
        const ring = makeSvgElement("circle", {
          cx: node.x,
          cy: node.y,
          r: 21,
          class: "activation-ring"
        });
        ringGroup.appendChild(ring);
        renderedActivationRings.push({ ring, node });
      }

      const group = makeSvgElement("g", {
        class: `neuron${node.hot ? " neuron--hot" : ""}`,
        transform: `translate(${node.x} ${node.y})`
      });
      const fill = node.layer === layerCounts.length - 1 ? "url(#nodeGreen)" : node.hot ? "url(#nodeOrange)" : "url(#nodeBlue)";
      const circle = makeSvgElement("circle", { r: 16, fill });
      const text = makeSvgElement("text", { y: 0 });
      text.textContent = activeMode === "use" ? node.targetValue.toFixed(2) : node.baseValue.toFixed(2);
      group.append(circle, text);
      nodeGroup.appendChild(group);
      renderedNodes.push({ group, circle, text, node });
    });

    outputNames.forEach((name, index) => {
      const node = nodes.find((item) => item.layer === 4 && item.index === index);
      const ring = makeSvgElement("circle", {
        cx: node.x,
        cy: node.y,
        r: 24,
        class: "output-ring"
      });
      ringGroup.appendChild(ring);
      renderedOutputRings.push({ ring, node, index });

      for (let rippleIndex = 0; rippleIndex < 2; rippleIndex += 1) {
        const ripple = makeSvgElement("circle", {
          cx: node.x,
          cy: node.y,
          r: 30 + rippleIndex * 10,
          class: `loss-ripple loss-ripple--${index === 0 ? "target" : "error"}`
        });
        ringGroup.appendChild(ripple);
        renderedLossRipples.push({ ripple, index, rippleIndex });
      }

      const compactOutput = layoutMode === "compact";
      const barWidth = compactOutput ? 36 : 44;
      const barX = compactOutput ? node.x - 73 : node.x + 28;
      const barY = compactOutput ? node.y + 21 : node.y + 12;
      const barGroup = makeSvgElement("g", {
        class: "output-probability",
        transform: `translate(${barX} ${barY})`
      });
      const barBack = makeSvgElement("rect", {
        x: 0,
        y: 0,
        width: barWidth,
        height: 6,
        rx: 3
      });
      const barFill = makeSvgElement("rect", {
        x: 0,
        y: 0,
        width: 8,
        height: 6,
        rx: 3,
        class: "output-probability-fill"
      });
      const barText = makeSvgElement("text", {
        x: compactOutput ? barWidth : barWidth + 5,
        y: 6,
        class: "output-probability-text",
        ...(compactOutput ? { "text-anchor": "end" } : {})
      });
      barText.textContent = "0%";
      barGroup.append(barBack, barFill, barText);
      ringGroup.appendChild(barGroup);
      renderedOutputBars.push({ group: barGroup, fill: barFill, text: barText, index, barWidth });

      const text = makeSvgElement("text", {
        x: compactOutput ? node.x - 22 : node.x + 28,
        y: compactOutput ? node.y - 24 : node.y + 5,
        class: "output-label",
        ...(compactOutput ? { "text-anchor": "end" } : {})
      });
      text.textContent = name;
      nodeGroup.appendChild(text);
    });
  }

  function updateNetwork(value) {
    const learned = easeOutCubic(value);
    const trainingMode = activeMode === "train";
    const errorWave = Math.max(0, Math.sin(value * Math.PI * 5.8));
    const cycle = (value * 12) % 1;
    const activePhase = cycle < 0.44 ? "forward" : cycle < 0.68 ? "backprop" : "update";
    const probabilities = outputProbabilities(learned, value);

    phaseSteps.forEach((step) => {
      step.classList.toggle("is-active", step.dataset.phase === activePhase);
    });
    weightChip.textContent = currentMode().chipByPhase[activePhase];

    let activeLayerValue = 0;
    if (activePhase === "forward") {
      activeLayerValue = clamp(cycle / 0.44 * 4, 0, 4);
    } else if (activePhase === "backprop") {
      activeLayerValue = clamp(4 - ((cycle - 0.44) / 0.24) * 4, 0, 4);
    } else {
      activeLayerValue = 1 + ((cycle - 0.68) / 0.32) * 3;
    }
    const lowerLayer = Math.floor(activeLayerValue);
    const upperLayer = Math.min(4, lowerLayer + 1);
    const layerMix = activeLayerValue - lowerLayer;
    const activeX = xPositions[lowerLayer] + (xPositions[upperLayer] - xPositions[lowerLayer]) * layerMix;

    if (renderedFocusHalo) {
      const haloStroke = trainingMode
        ? activePhase === "backprop" ? "rgba(242, 118, 50, 0.26)" : activePhase === "update" ? "rgba(31, 159, 107, 0.24)" : "rgba(35, 116, 225, 0.2)"
        : activePhase === "backprop" ? "rgba(67, 183, 216, 0.34)" : activePhase === "update" ? "rgba(31, 159, 107, 0.22)" : "rgba(35, 116, 225, 0.2)";
      renderedFocusHalo.setAttribute("cx", activeX.toFixed(1));
      renderedFocusHalo.setAttribute("rx", (layoutMode === "compact" ? 44 : 108 + Math.sin(value * Math.PI * 8) * 8).toFixed(1));
      renderedFocusHalo.style.opacity = activePhase === "update" ? "0.54" : "0.42";
      renderedFocusHalo.style.stroke = haloStroke;
    }

    renderedContextPieces.forEach(({ element, index, kind }) => {
      const shimmer = 0.5 + Math.sin(value * Math.PI * 3 + index * 0.7) * 0.5;
      const baseOpacity = kind === "ring" ? 0.18 : kind === "line" ? 0.34 : 0.28;
      element.style.opacity = (baseOpacity + shimmer * 0.12).toFixed(2);
      if (kind !== "node") {
        element.style.strokeDashoffset = (value * 90 + index * 9).toFixed(1);
      }
    });

    renderedLayerMeters.forEach(({ segments, layer }) => {
      const local = clamp(1 - Math.abs(layer - activeLayerValue) / 2.2, 0, 1);
      const fillCount = clamp(Math.ceil(local * (trainingMode ? 2.4 : 2.8) + (trainingMode ? learned * 1.8 : 0.2)), 0, 4);
      segments.forEach((segment, index) => {
        const active = index < fillCount;
        segment.classList.toggle("is-active", active);
        segment.style.opacity = active ? (0.55 + local * 0.42).toFixed(2) : "0.28";
        segment.setAttribute("transform", active ? `translate(0 ${-(local * 2.5).toFixed(1)})` : "translate(0 0)");
      });
    });

    renderedConnections.forEach(({ line, connection }) => {
      const currentWeight = connectionDisplayValue(connection, learned);
      const strength = Math.abs(currentWeight);
      const width = 0.55 + strength * (connection.primary ? 4.25 : 3.15);
      const opacity = trainingMode
        ? 0.16 + strength * 0.46 + learned * 0.16
        : 0.14 + strength * 0.5;

      line.style.strokeWidth = width.toFixed(2);
      line.style.opacity = clamp(opacity, 0.1, 0.92).toFixed(2);

      const activeAdjust = trainingMode && connection.adjust && value > 0.18 && errorWave > 0.12;
      const connectionClass = trainingMode
        ? activeAdjust ? "connection--adjust" : connection.primary && value > 0.18 ? "connection--primary" : connection.strong && value > 0.24 ? "connection--strong" : "connection--weak"
        : connection.primary ? "connection--primary" : connection.strong ? "connection--strong" : "connection--weak";
      line.setAttribute(
        "class",
        [
          "connection",
          connectionClass,
          trainingMode && connection.signal && running ? "connection--signal" : ""
        ].filter(Boolean).join(" ")
      );
    });

    renderedLabels.forEach(({ label, connection }) => {
      const currentWeight = connectionDisplayValue(connection, learned);
      if (trainingMode) {
        label.textContent = signed(currentWeight);
        label.setAttribute("class", `weight-label${currentWeight < 0 ? " weight-label--negative" : ""}`);
        label.style.opacity = connection.adjust ? 0.66 + errorWave * 0.3 : 0.74 + learned * 0.18;
      } else {
        label.textContent = attentionLabel(connection.targetWeight);
        label.setAttribute("class", "weight-label weight-label--attention");
        label.style.opacity = connection.signal || connection.primary ? "0.72" : "0.38";
      }
    });

    renderedFields.forEach(({ field, layer }) => {
      const forwardFocus = activePhase === "forward" ? 1 - Math.abs(layer - cycle * 4) / 4 : 0.24;
      const backFocus = activePhase === "backprop" ? 1 - Math.abs(layer - (4 - ((cycle - 0.44) / 0.24) * 4)) / 4 : 0.18;
      const updateFocus = trainingMode && activePhase === "update" && layer > 0 && layer < 4 ? 0.62 : 0;
      const intensity = clamp(0.14 + (trainingMode ? learned * 0.18 : 0) + forwardFocus * 0.22 + backFocus * 0.18 + updateFocus, 0.1, 0.76);
      const scale = 1 + intensity * (trainingMode ? 0.08 : 0.035) + Math.sin(value * Math.PI * 10 + layer) * (trainingMode ? 0.015 : 0.006);
      field.style.opacity = intensity.toFixed(2);
      field.setAttribute("transform", `scale(${scale.toFixed(3)} 1) translate(${((1 - scale) * xPositions[layer]).toFixed(1)} 0)`);
    });

    renderedMemoryTrails.forEach(({ trail, index }) => {
      const shimmer = Math.max(0, Math.sin(value * Math.PI * 6 + index * 0.6));
      trail.style.opacity = (trainingMode ? 0.04 + learned * 0.22 + shimmer * 0.05 : 0.1 + shimmer * 0.04).toFixed(2);
      trail.style.strokeWidth = (trainingMode ? layoutMode === "compact" ? 4.5 : 7 + learned * 8 : layoutMode === "compact" ? 4.5 : 7).toFixed(1);
    });

    renderedErrorWaves.forEach(({ path, index }) => {
      const wavePulse = Math.max(0, Math.sin((cycle + index * 0.11) * Math.PI * 2));
      const activeWave = activePhase === "backprop";
      const idleOpacity = trainingMode ? 0.03 + errorWave * 0.05 : 0.04;
      path.style.opacity = activeWave
        ? (trainingMode ? 0.18 + wavePulse * 0.5 : 0.16 + wavePulse * 0.38).toFixed(2)
        : idleOpacity.toFixed(2);
      path.style.strokeDashoffset = (trainingMode ? value * 150 + index * 11 : -(value * 110 + index * 17)).toFixed(1);
      path.style.strokeWidth = (layoutMode === "compact"
        ? trainingMode ? 2.2 : 1.8
        : trainingMode ? 2.8 + wavePulse * 1.3 : 1.7 + wavePulse * 1.1).toFixed(1);
    });

    renderedPackets.forEach(({ packet, connection, direction, offset, speed, type }) => {
      const packetPhase = (value * speed + offset) % 1;
      const t = direction === 1 ? packetPhase : 1 - packetPhase;
      const x = connection.from.x + (connection.to.x - connection.from.x) * t;
      const y = connection.from.y + (connection.to.y - connection.from.y) * t;
      const packetActive = type === "attention"
        ? activePhase === "backprop"
        : type === "error" ? activePhase === "backprop" : activePhase === "forward";
      const attentionPulse = 0.5 + Math.sin(value * Math.PI * 10 + offset * 8) * 0.5;
      const scale = type === "attention"
        ? 0.82 + attentionPulse * 0.36
        : type === "error" ? 0.95 + errorWave * 0.35 : 1 + (trainingMode ? learned * 0.45 : 0.12);

      packet.setAttribute("cx", x.toFixed(1));
      packet.setAttribute("cy", y.toFixed(1));
      packet.setAttribute("r", ((layoutMode === "compact" ? 4.2 : 5.2) * scale).toFixed(2));
      packet.style.opacity = packetActive && running ? "0.94" : "0.08";
    });

    renderedSparks.forEach(({ spark, badge, offset }) => {
      const flash = Math.max(0, Math.sin((cycle + offset) * Math.PI * 2));
      const active = activePhase === "update" ? flash : errorWave * 0.28;
      const scale = 0.25 + active * (layoutMode === "compact" ? 0.55 : 0.85);
      const opacity = clamp(active, 0.05, 0.95);
      const baseTransform = spark.getAttribute("transform");
      spark.setAttribute("transform", baseTransform.replace(/scale\([^)]*\)/, `scale(${scale.toFixed(2)})`));
      spark.style.opacity = opacity.toFixed(2);
      badge.style.opacity = (activePhase === "update" ? clamp(active * 1.1, 0.08, 0.95) : clamp(errorWave * 0.18, 0.02, 0.28)).toFixed(2);
    });

    renderedActivationRings.forEach(({ ring, node }) => {
      const local = Math.max(0, Math.sin(value * Math.PI * 9 + node.layer * 0.7 + node.index * 0.33));
      if (trainingMode) {
        ring.setAttribute("r", (19 + local * 13 + learned * 4).toFixed(1));
        ring.style.opacity = (0.06 + local * 0.2 + learned * 0.08).toFixed(2);
      } else {
        ring.setAttribute("r", layoutMode === "compact" ? "20" : "22");
        ring.style.opacity = node.hot ? "0.16" : "0.09";
      }
    });

    renderedOutputRings.forEach(({ ring, index }) => {
      const targetBoost = probabilities[index] / 100;
      const pulse = Math.sin(value * Math.PI * 8 + index) * 2.2;
      ring.setAttribute("r", (22 + targetBoost * 18 + pulse).toFixed(1));
      ring.style.opacity = (0.22 + targetBoost * 0.48).toFixed(2);
      ring.style.strokeWidth = (2.2 + targetBoost * 2.8).toFixed(1);
    });

    renderedLossRipples.forEach(({ ripple, index, rippleIndex }) => {
      const isTarget = index === 0;
      const probability = probabilities[index] / 100;
      const unresolvedError = isTarget ? 1 - probability : probability;
      const pulse = (value * 9 + rippleIndex * 0.38 + index * 0.11) % 1;
      const baseRadius = layoutMode === "compact" ? 22 : 28;
      const radius = baseRadius + pulse * (layoutMode === "compact" ? 18 : 28) * (0.32 + unresolvedError);
      ripple.setAttribute("r", radius.toFixed(1));
      ripple.style.opacity = (unresolvedError * (1 - pulse) * (isTarget ? 0.18 : 0.46)).toFixed(2);
      ripple.style.strokeDashoffset = (value * 120 + rippleIndex * 14).toFixed(1);
    });

    renderedOutputBars.forEach(({ fill, text, index, barWidth }) => {
      const probability = probabilities[index];
      fill.setAttribute("width", Math.max(4, barWidth * probability / 100).toFixed(1));
      text.textContent = `${Math.round(probability)}%`;
      text.style.display = "block";
    });

    renderedNodes.forEach(({ group, text, node }) => {
      const pulse = Math.sin(value * Math.PI * 8 + node.index + node.layer) * 0.08;
      const currentValue = node.baseValue + (node.targetValue - node.baseValue) * learned + pulse;
      if (trainingMode) {
        text.textContent = currentValue.toFixed(2);
        group.style.opacity = 0.78 + learned * 0.2;
        group.setAttribute("class", `neuron${node.hot || currentValue > 0.72 ? " neuron--hot" : ""}`);
      } else {
        text.textContent = node.targetValue.toFixed(2);
        group.style.opacity = "0.88";
        group.setAttribute("class", `neuron${node.hot ? " neuron--hot" : ""}`);
      }
    });
  }

  function updateMetrics(value) {
    const learned = easeOutCubic(value);
    const wiggle = Math.sin(value * Math.PI * 8) * 0.018;
    const loss = clamp(0.82 - learned * 0.68 + wiggle, 0.1, 0.89);
    const probabilities = outputProbabilities(learned, value);
    const targetProbability = probabilities[0];
    const confidence = Math.max(...probabilities);
    const uncertainty = clamp(1 - confidence / 100 + wiggle * 0.5, 0.05, 0.88);
    const step = String(Math.max(1, Math.round(1 + value * 19))).padStart(2, "0");
    const percent = Math.round(value * 100);
    const middleMetric = activeMode === "train" ? loss.toFixed(2) : uncertainty.toFixed(2);
    const rightMetric = `${Math.round(activeMode === "train" ? targetProbability : confidence)}%`;

    epochLabel.textContent = step;
    lossLabel.textContent = middleMetric;
    if (lossMetric) {
      lossMetric.textContent = middleMetric;
    }
    accuracyLabel.textContent = rightMetric;
    if (accuracyMetric) {
      accuracyMetric.textContent = rightMetric;
    }
    if (confidenceMetric) {
      confidenceMetric.textContent = rightMetric;
    }
    progressPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
    progressBar.setAttribute("aria-valuenow", String(percent));

    bars.forEach((bar, index) => {
      const base = 20 + index * 10;
      const height = clamp(base + learned * (38 + index * 4), 18, 95);
      bar.style.height = `${height}%`;
    });

    const filledDots = Math.max(1, Math.round(confidence / 20));
    confidenceDots.forEach((dot, index) => {
      dot.classList.toggle("is-filled", index < filledDots);
    });

    if (lossLine) {
      const lossY = [13, 16, 20, 27, 31, 34].map((point, index) => {
        const adjusted = point + learned * (index * 1.3 - 2) - Math.sin(value * Math.PI * (index + 1)) * 0.9;
        return Math.round(clamp(adjusted, 7, 36));
      });
      lossLine.setAttribute(
        "points",
        `8,${lossY[0]} 28,${lossY[1]} 48,${lossY[2]} 68,${lossY[3]} 90,${lossY[4]} 112,${lossY[5]}`
      );
    }
  }

  function setRunning(nextRunning) {
    running = nextRunning;
    pauseButton.classList.toggle("is-paused", !running);
    pauseButton.setAttribute("aria-pressed", String(!running));
    pauseButton.lastChild.textContent = running ? "Pause" : "Resume";
  }

  function tick(time) {
    if (!lastTime) {
      lastTime = time;
    }
    const delta = Math.min(80, time - lastTime);
    lastTime = time;

    renderMacroIntro(time);

    if (running && !introActive) {
      progress += delta / 20000;
      if (progress >= 1) {
        progress = 1;
        setRunning(false);
      }
    }

    updateNetwork(progress);
    updateMetrics(progress);
    syncEmbedHeight();
    window.requestAnimationFrame(tick);
  }

  function reset() {
    progress = 0;
    lastTime = 0;
    introStartTime = 0;
    introActive = !reducedMotion;
    networkStage.classList.remove("is-settling");
    if (introActive) {
      buildMacroNetwork();
      networkStage.classList.add("is-intro");
    } else {
      networkStage.classList.remove("is-intro");
    }
    setRunning(!reducedMotion);
    updateNetwork(progress);
    updateMetrics(progress);
  }

  function start() {
    if (progress >= 1) {
      progress = 0;
    }
    setRunning(true);
  }

  function setupEmbedMode() {
    const params = new URLSearchParams(window.location.search);
    let framed = false;
    try {
      framed = window.self !== window.top;
    } catch (_error) {
      framed = true;
    }

    const embedded = framed || params.get("embedMode") === "1" || params.get("embed") === "1";
    if (embedded) {
      document.documentElement.classList.add("embed-mode");
      document.body.classList.add("embed-mode");
    }

    window.addEventListener("message", (event) => {
      const type = typeof event.data === "string" ? event.data : event.data?.type;
      if (type === "simfluence:measure" || type === "simfluence-widget:measure") {
        syncEmbedHeight(true);
      }
    });

    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(() => syncEmbedHeight());
      observer.observe(widget);
      observer.observe(document.body);
    }

    window.addEventListener("load", () => syncEmbedHeight(true), { once: true });
    window.addEventListener("pageshow", () => syncEmbedHeight(true));

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => syncEmbedHeight(true)).catch(() => {});
    }

    syncEmbedHeight(true);
  }

  function measureEmbedHeight() {
    const body = document.body;
    const html = document.documentElement;
    const bodyRect = body.getBoundingClientRect();
    const widgetRect = widget.getBoundingClientRect();

    return Math.ceil(Math.max(
      widgetRect.bottom - bodyRect.top,
      widgetRect.height,
      body.scrollHeight,
      body.offsetHeight,
      html.scrollHeight,
      html.offsetHeight,
      1
    ));
  }

  function syncEmbedHeight(force = false) {
    const embedded = document.documentElement.classList.contains("embed-mode") || window.parent !== window;
    if (!embedded) {
      return;
    }

    if (heightPostFrame) {
      if (!force) {
        return;
      }
      window.cancelAnimationFrame(heightPostFrame);
    }

    heightPostFrame = window.requestAnimationFrame(() => {
      heightPostFrame = 0;
      const height = measureEmbedHeight();
      if (!force && Math.abs(height - lastPostedHeight) < 2) {
        return;
      }
      lastPostedHeight = height;

      try {
        if (window.frameElement) {
          window.frameElement.style.height = `${height}px`;
          window.frameElement.setAttribute("height", String(height));
        }
      } catch (_error) {
        // Cross-origin parents resize via postMessage.
      }

      if (window.parent && window.parent !== window) {
        const payload = {
          type: widgetResizeEvent,
          id: "Sim32_AI_Neural_Network",
          height
        };
        window.parent.postMessage(payload, "*");
        window.parent.postMessage({ ...payload, type: legacyResizeEvent }, "*");
      }
    });
  }

  startButton.addEventListener("click", start);
  pauseButton.addEventListener("click", () => setRunning(!running));
  resetButton.addEventListener("click", reset);
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.mode !== activeMode) {
        applyMode(button.dataset.mode);
        reset();
      }
    });
  });

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (!setChartLayout()) {
        return;
      }
      buildData();
      buildMacroNetwork();
      renderNetwork();
      updateNetwork(progress);
      updateMetrics(progress);
      syncEmbedHeight();
    }, 120);
  });

  const initialParams = new URLSearchParams(window.location.search);
  activeMode = viewModes[initialParams.get("mode")] ? initialParams.get("mode") : widget.dataset.mode || activeMode;
  applyMode(activeMode, false);
  setupEmbedMode();
  setChartLayout();
  buildMacroNetwork();
  if (introActive) {
    networkStage.classList.add("is-intro");
  }
  buildData();
  renderNetwork();
  setRunning(running);
  updateNetwork(progress);
  updateMetrics(progress);
  window.requestAnimationFrame(tick);
}());
