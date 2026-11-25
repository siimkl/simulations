(() => {
  const ns = window.StockCanvasViews = window.StockCanvasViews || {};
  const utils = ns.utils || {};
  const clamp = utils.clamp || ((value, min, max) => Math.min(max, Math.max(min, value)));
  const ease = utils.ease || ((value) => value);
  const cubicPoint = utils.cubicPoint || ((p0, p1, p2, p3, t) => ({ x: 0, y: 0 }));
  const formatCurrency = utils.formatCurrency || ((value) => String(value));
  const formatPercent = utils.formatPercent || ((value) => `${value}%`);
  const CVI = {
    navy: "#0A2540",
    layer: "#0D3156",
    blue: "#1E96EC",
    blueRgb: "31,151,237",
    blueSoft: "#8FD7FF",
    blueSoftRgb: "143,215,255",
    blueLiftRgb: "116,203,255",
    bluePale: "#ECF7FF",
    blueFrost: "#F4FBFF",
    orange: "#FF7F22",
    orangeRgb: "255,127,34",
    orangeSoft: "#FFB072",
    orangeSoftRgb: "255,176,114",
    orangePale: "#FFF0E4"
  };

  function makeCanvas(width, height, dpr) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    return canvas;
  }

  function paletteFor(stage) {
    if (stage.key === "buy") {
      return {
        core: CVI.orange,
        rim: CVI.orangePale,
        glow: CVI.orangeRgb,
        bridge: "255,166,104",
        lift: "255,194,148",
        drag: CVI.orangeRgb
      };
    }
    if (stage.key === "current") {
      if (stage.gainDirection === "loss") {
        return {
          core: "#FF8A30",
          rim: CVI.orangePale,
          glow: "255,138,48",
          bridge: "255,173,112",
          lift: "255,200,156",
          drag: CVI.orangeRgb
        };
      }
      return {
        core: CVI.blue,
        rim: CVI.bluePale,
        glow: CVI.blueRgb,
        bridge: "108,194,248",
        lift: CVI.blueSoftRgb,
        drag: CVI.orangeRgb
      };
    }
    if (stage.gainDirection === "loss") {
      return {
        core: "#FF9A4A",
        rim: "#FFF4EA",
        glow: "255,154,74",
        bridge: "255,184,128",
        lift: "255,210,170",
        drag: CVI.orangeRgb
      };
    }
    return {
      core: "#74CBFF",
      rim: CVI.blueFrost,
      glow: CVI.blueLiftRgb,
      bridge: "150,219,255",
      lift: "183,232,255",
      drag: CVI.orangeRgb
    };
  }

  function drawGlow(ctx, x, y, radius, color, alpha) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(${color},${alpha})`);
    glow.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function sampleLink(link, reveal, segments) {
    const cap = clamp(reveal, 0, 1);
    if (cap <= 0.001) return [];
    const total = Math.max(6, Math.round(segments * cap));
    const points = [];
    for (let i = 0; i <= total; i++) {
      const t = cap * (i / total);
      points.push(cubicPoint(link.p0, link.cp1, link.cp2, link.p3, t));
    }
    return points;
  }

  function buildOrbLinkPoints(link) {
    const dx = link.to.x - link.from.x;
    const y1 = link.from.visualY;
    const y2 = link.to.visualY;
    const bend = Math.max(28, Math.abs(y2 - y1) * 0.72);
    const ridge = y2 <= y1 ? Math.min(y1, y2) - bend : Math.max(y1, y2) + bend * 0.44;
    return {
      p0: { x: link.from.x, y: y1 },
      cp1: { x: link.from.x + dx * 0.34, y: y1 + (ridge - y1) * 0.88 },
      cp2: { x: link.from.x + dx * 0.66, y: y2 + (ridge - y2) * 0.88 },
      p3: { x: link.to.x, y: y2 }
    };
  }

  function tracePoints(ctx, points) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  }

  function sceneOffset(frame) {
    return frame.mobile ? 36 : frame.compact ? 48 : 58;
  }

  function drawInvestmentPlane(ctx, frame, reducedMotion) {
    const sceneLift = sceneOffset(frame);
    const topZoneTop = -sceneLift;
    const topZoneHeight = Math.max(0, frame.baselineY - topZoneTop);
    const bottomZoneBottom = frame.height - sceneLift;
    const bottomZoneHeight = Math.max(0, bottomZoneBottom - frame.baselineY);
    const zoneLeft = 0;
    const zoneWidth = frame.width;

    if (topZoneHeight > 0) {
      const profitZone = ctx.createLinearGradient(0, topZoneTop, 0, frame.baselineY);
      profitZone.addColorStop(0, `rgba(${CVI.blueRgb},0.18)`);
      profitZone.addColorStop(0.34, `rgba(${CVI.blueRgb},0.10)`);
      profitZone.addColorStop(1, `rgba(${CVI.blueRgb},0)`);
      ctx.fillStyle = profitZone;
      ctx.fillRect(zoneLeft, topZoneTop, zoneWidth, topZoneHeight);

      const profitBloom = ctx.createRadialGradient(
        frame.width * 0.76,
        topZoneTop + topZoneHeight * 0.26,
        0,
        frame.width * 0.76,
        topZoneTop + topZoneHeight * 0.26,
        frame.width * 0.44
      );
      profitBloom.addColorStop(0, `rgba(${CVI.blueSoftRgb},0.12)`);
      profitBloom.addColorStop(1, `rgba(${CVI.blueSoftRgb},0)`);
      ctx.fillStyle = profitBloom;
      ctx.fillRect(zoneLeft, topZoneTop, zoneWidth, topZoneHeight);
    }

    if (bottomZoneHeight > 0) {
      const lossZone = ctx.createLinearGradient(0, frame.baselineY, 0, bottomZoneBottom);
      lossZone.addColorStop(0, `rgba(${CVI.orangeRgb},0)`);
      lossZone.addColorStop(0.42, `rgba(${CVI.orangeRgb},0.12)`);
      lossZone.addColorStop(1, `rgba(${CVI.orangeRgb},0.24)`);
      ctx.fillStyle = lossZone;
      ctx.fillRect(zoneLeft, frame.baselineY, zoneWidth, bottomZoneHeight);

      const lossBloom = ctx.createRadialGradient(
        frame.width * 0.22,
        frame.baselineY + bottomZoneHeight * 0.72,
        0,
        frame.width * 0.22,
        frame.baselineY + bottomZoneHeight * 0.72,
        frame.width * 0.40
      );
      lossBloom.addColorStop(0, `rgba(${CVI.orangeRgb},0.13)`);
      lossBloom.addColorStop(1, `rgba(${CVI.orangeRgb},0)`);
      ctx.fillStyle = lossBloom;
      ctx.fillRect(zoneLeft, frame.baselineY, zoneWidth, bottomZoneHeight);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(frame.plot.left, frame.plot.top + frame.plot.height * 0.24);
    ctx.lineTo(frame.plot.right, frame.plot.top + frame.plot.height * 0.24);
    ctx.moveTo(frame.plot.left, frame.plot.top + frame.plot.height * 0.72);
    ctx.lineTo(frame.plot.right, frame.plot.top + frame.plot.height * 0.72);
    ctx.stroke();

    if (!reducedMotion) {
      const zoneSweepY = topZoneTop + ((Math.sin(frame.idle * 0.48) + 1) * 0.5) * Math.max(topZoneHeight - 28, 1);
      const zoneSweep = ctx.createLinearGradient(0, zoneSweepY - 22, 0, zoneSweepY + 22);
      zoneSweep.addColorStop(0, "rgba(255,255,255,0)");
      zoneSweep.addColorStop(0.5, "rgba(255,255,255,0.05)");
      zoneSweep.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = zoneSweep;
      ctx.fillRect(zoneLeft, topZoneTop, zoneWidth, Math.max(topZoneHeight, 0));
    }

    const top = frame.baselineY - (frame.mobile ? 18 : 22);
    const height = frame.mobile ? 36 : 44;
    const plane = ctx.createLinearGradient(0, top, 0, top + height);
    plane.addColorStop(0, "rgba(255,255,255,0)");
    plane.addColorStop(0.48, "rgba(238,247,255,0.12)");
    plane.addColorStop(0.52, "rgba(255,226,181,0.20)");
    plane.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = plane;
    ctx.fillRect(frame.plot.left - 18, top, frame.plot.width + 36, height);

    const line = ctx.createLinearGradient(frame.plot.left, 0, frame.plot.right, 0);
    line.addColorStop(0, `rgba(${CVI.orangeRgb},0.38)`);
    line.addColorStop(0.5, "rgba(255,255,255,0.24)");
    line.addColorStop(1, `rgba(${CVI.blueSoftRgb},0.34)`);
    ctx.strokeStyle = line;
    ctx.lineWidth = frame.mobile ? 1.4 : 1.6;
    ctx.beginPath();
    ctx.moveTo(frame.plot.left + 10, frame.baselineY);
    ctx.lineTo(frame.plot.right - 10, frame.baselineY);
    ctx.stroke();

    if (!reducedMotion) {
      const sweep = frame.plot.left + ((frame.idle * 58) % frame.plot.width);
      const beam = ctx.createLinearGradient(sweep - 46, 0, sweep + 46, 0);
      beam.addColorStop(0, "rgba(255,255,255,0)");
      beam.addColorStop(0.5, "rgba(255,255,255,0.12)");
      beam.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = beam;
      ctx.lineWidth = frame.mobile ? 8 : 10;
      ctx.beginPath();
      ctx.moveTo(frame.plot.left + 12, frame.baselineY);
      ctx.lineTo(frame.plot.right - 12, frame.baselineY);
      ctx.stroke();
    }

  }

  function drawAnchorPad(ctx, frame, stage, palette, reducedMotion) {
    const y = frame.baselineY;
    const rx = frame.mobile ? 18 : 24;
    const ry = frame.mobile ? 6 : 8;
    const alpha = 0.18 + stage.reveal * 0.14;
    drawGlow(ctx, stage.x, y, rx * 2.6, palette.glow, alpha);
    ctx.fillStyle = `rgba(${palette.glow},${0.10 + stage.reveal * 0.10})`;
    ctx.beginPath();
    ctx.ellipse(stage.x, y + 0.5, rx * 1.7, ry * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.18 + stage.reveal * 0.12})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(stage.x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (!reducedMotion && stage.key === "predicted") {
      ctx.strokeStyle = `rgba(${palette.glow},0.26)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(stage.x, y, rx * (1.3 + Math.sin(frame.idle * 1.2) * 0.05), ry * 1.32, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawValueStem(ctx, frame, stage, palette) {
    const width = clamp(stage.radius * 0.4, frame.mobile ? 7 : 8, frame.mobile ? 10 : 12);
    const y1 = stage.visualColumnTop;
    const y2 = stage.visualColumnBottom;
    const stem = ctx.createLinearGradient(stage.x, y1, stage.x, y2);
    if (stage.gainDirection === "gain") {
      stem.addColorStop(0, `rgba(${palette.glow},0.26)`);
      stem.addColorStop(0.42, `rgba(${palette.glow},0.12)`);
      stem.addColorStop(1, "rgba(255,255,255,0)");
    } else {
      stem.addColorStop(0, `rgba(${palette.glow},0.10)`);
      stem.addColorStop(0.45, `rgba(${palette.glow},0.18)`);
      stem.addColorStop(1, "rgba(255,255,255,0)");
    }
    ctx.fillStyle = stem;
    ctx.beginPath();
    ctx.roundRect(stage.x - width / 2, y1, width, Math.max(10, y2 - y1), width / 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${0.08 + stage.reveal * 0.10})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(stage.x, frame.baselineY);
    ctx.lineTo(stage.x, stage.visualY);
    ctx.stroke();
  }

  function drawLinkRibbon(ctx, frame, link, reducedMotion) {
    const curve = buildOrbLinkPoints(link);
    const sampledLink = { ...link, ...curve };
    const points = sampleLink(sampledLink, link.reveal, frame.detail === "low" ? 16 : frame.detail === "medium" ? 24 : 32);
    if (points.length < 2) return;
    const fromPalette = paletteFor(link.from);
    const toPalette = paletteFor(link.to);
    const glow = ctx.createLinearGradient(curve.p0.x, curve.p0.y, curve.p3.x, curve.p3.y);
    glow.addColorStop(0, `rgba(${fromPalette.bridge},${0.12 + link.energy * 0.14})`);
    glow.addColorStop(0.5, "rgba(255,255,255,0.10)");
    glow.addColorStop(1, `rgba(${toPalette.bridge},${0.15 + link.energy * 0.18})`);
    ctx.strokeStyle = glow;
    ctx.lineWidth = frame.mobile ? 8 : 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    tracePoints(ctx, points);
    ctx.stroke();

    const core = ctx.createLinearGradient(curve.p0.x, curve.p0.y, curve.p3.x, curve.p3.y);
    core.addColorStop(0, `rgba(${fromPalette.glow},${0.44 + link.energy * 0.10})`);
    core.addColorStop(0.42, "rgba(244,252,255,0.66)");
    core.addColorStop(1, `rgba(${toPalette.glow},${0.50 + link.energy * 0.12})`);
    ctx.strokeStyle = core;
    ctx.lineWidth = frame.mobile ? 2.4 : 2.8;
    tracePoints(ctx, points);
    ctx.stroke();

    if (!reducedMotion) {
      const count = frame.mobile ? 2 : 3;
      for (let i = 0; i < count; i++) {
        const phase = (frame.idle * (0.1 + i * 0.02) + link.index * 0.17 + i * 0.21) % 1;
        if (phase > link.reveal) continue;
        const point = cubicPoint(curve.p0, curve.cp1, curve.cp2, curve.p3, phase);
        drawGlow(ctx, point.x, point.y, frame.mobile ? 7 : 9, toPalette.glow, 0.14);
        ctx.fillStyle = "rgba(255,255,255,0.86)";
        ctx.beginPath();
        ctx.arc(point.x, point.y, frame.mobile ? 1.4 : 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawStartAccent(ctx, frame, stage, palette, reducedMotion) {
    ctx.save();
    ctx.translate(stage.x, stage.visualY);
    ctx.rotate(-0.16);
    const wake = ctx.createLinearGradient(-stage.radius * 2.4, 0, stage.radius * 0.3, 0);
    wake.addColorStop(0, `rgba(${CVI.orangeRgb},0)`);
    wake.addColorStop(0.78, `rgba(${palette.glow},0.22)`);
    wake.addColorStop(1, `rgba(${palette.glow},0.04)`);
    ctx.fillStyle = wake;
    ctx.beginPath();
    ctx.moveTo(-stage.radius * 2.2, -stage.radius * 0.42);
    ctx.quadraticCurveTo(-stage.radius * 1.1, -stage.radius * 1.02, stage.radius * 0.18, -stage.radius * 0.18);
    ctx.lineTo(stage.radius * 0.18, stage.radius * 0.18);
    ctx.quadraticCurveTo(-stage.radius * 1.08, stage.radius * 1.06, -stage.radius * 2.2, stage.radius * 0.42);
    ctx.closePath();
    ctx.fill();
    if (!reducedMotion) {
      ctx.strokeStyle = `rgba(${palette.glow},0.22)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(-stage.radius * 0.1, 0, stage.radius * (1.3 + Math.sin(frame.idle * 2.0) * 0.05), Math.PI * 0.9, Math.PI * 1.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCurrentBeacon(ctx, frame, stage, reducedMotion) {
    const top = frame.plot.top - (frame.mobile ? 6 : 10);
    const bottom = frame.baselineY + (frame.mobile ? 54 : 68);
    const width = Math.max(stage.radius * 3.8, frame.mobile ? 94 : 122);
    const beam = ctx.createLinearGradient(0, top, 0, bottom);
    beam.addColorStop(0, `rgba(${CVI.blueSoftRgb},0)`);
    beam.addColorStop(0.18, `rgba(${CVI.blueSoftRgb},0.07)`);
    beam.addColorStop(0.55, `rgba(${CVI.blueRgb},0.18)`);
    beam.addColorStop(1, `rgba(${CVI.blueRgb},0)`);
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.roundRect(stage.x - width / 2, top, width, Math.max(20, bottom - top), width * 0.3);
    ctx.fill();

    ctx.strokeStyle = `rgba(${CVI.blueSoftRgb},${0.22 + stage.reveal * 0.28})`;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([6, 9]);
    ctx.beginPath();
    ctx.moveTo(stage.x, top + 12);
    ctx.lineTo(stage.x, bottom - 18);
    ctx.stroke();
    ctx.setLineDash([]);

    drawGlow(ctx, stage.x, stage.visualY, stage.radius * 4.8, CVI.blueRgb, 0.11 + stage.reveal * 0.04);
    drawGlow(ctx, stage.x, frame.baselineY, stage.radius * 3.4, CVI.blueSoftRgb, 0.09 + stage.reveal * 0.04);

    const pulse = reducedMotion ? 1 : 1 + Math.sin(frame.idle * 1.85) * 0.08;
    ctx.strokeStyle = `rgba(${CVI.blueSoftRgb},${0.26 + stage.reveal * 0.34})`;
    ctx.lineWidth = 1.45;
    ctx.beginPath();
    ctx.ellipse(stage.x, frame.baselineY, stage.radius * 1.9 * pulse, stage.radius * 0.6 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (!reducedMotion) {
      ctx.strokeStyle = `rgba(${CVI.blueRgb},0.26)`;
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.ellipse(stage.x, frame.baselineY, stage.radius * 2.35 * pulse, stage.radius * 0.82 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawCurrentAccent(ctx, frame, stage, palette, reducedMotion) {
    const orbitX = stage.radius * 1.65;
    const orbitY = stage.radius * 1.12;
    ctx.strokeStyle = `rgba(${palette.glow},${0.26 + stage.hoverBoost * 0.14})`;
    ctx.lineWidth = 1.45;
    ctx.beginPath();
    ctx.ellipse(stage.x, stage.visualY, orbitX, orbitY, -0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${CVI.blueSoftRgb},${0.18 + stage.hoverBoost * 0.1})`;
    ctx.lineWidth = 1.05;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.ellipse(stage.x, stage.visualY, orbitX * 1.22, orbitY * 1.18, -0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!reducedMotion) {
      const phase = frame.idle * 1.5 + stage.index;
      const px = stage.x + Math.cos(phase) * orbitX * 0.9;
      const py = stage.visualY + Math.sin(phase) * orbitY * 0.78;
      drawGlow(ctx, px, py, frame.mobile ? 6 : 8, palette.glow, 0.14);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(px, py, frame.mobile ? 1.4 : 1.7, 0, Math.PI * 2);
      ctx.fill();

      const phase2 = frame.idle * 1.1 + stage.index + 1.2;
      const px2 = stage.x + Math.cos(phase2) * orbitX * 1.06;
      const py2 = stage.visualY + Math.sin(phase2 * 1.08) * orbitY * 0.98;
      drawGlow(ctx, px2, py2, frame.mobile ? 5 : 7, CVI.blueSoftRgb, 0.12);
      ctx.fillStyle = "rgba(244,251,255,0.78)";
      ctx.beginPath();
      ctx.arc(px2, py2, frame.mobile ? 1.1 : 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGoalAccent(ctx, frame, stage, palette, reducedMotion) {
    const pulse = reducedMotion ? 1 : 1 + Math.sin(frame.idle * 1.45) * 0.05;
    ctx.strokeStyle = `rgba(${palette.glow},${0.22 + stage.hoverBoost * 0.10})`;
    ctx.lineWidth = 1.15;
    ctx.setLineDash([5, 8]);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(stage.x, stage.visualY, stage.radius * (1.45 + i * 0.28) * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const beam = ctx.createLinearGradient(stage.x, stage.visualY - stage.radius * 2.7, stage.x, stage.visualY + stage.radius * 0.3);
    beam.addColorStop(0, `rgba(${palette.glow},0)`);
    beam.addColorStop(0.6, `rgba(${palette.glow},0.18)`);
    beam.addColorStop(1, `rgba(${palette.glow},0)`);
    ctx.strokeStyle = beam;
    ctx.lineWidth = frame.mobile ? 5 : 6;
    ctx.beginPath();
    ctx.moveTo(stage.x, stage.visualY - stage.radius * 2.4);
    ctx.lineTo(stage.x, stage.visualY - stage.radius * 0.4);
    ctx.stroke();
  }

  function drawStageSignals(ctx, frame, stage, palette, reducedMotion) {
    if (stage.boostRatio > 0.005) {
      const height = stage.radius * (0.6 + stage.boostRatio * 1.8);
      const lift = ctx.createLinearGradient(stage.x, stage.visualY - height * 1.3, stage.x, stage.visualY);
      lift.addColorStop(0, `rgba(${stage.key === "buy" ? palette.glow : CVI.blueSoftRgb},0)`);
      lift.addColorStop(1, `rgba(${stage.key === "buy" ? palette.glow : CVI.blueSoftRgb},${0.12 + stage.boostRatio * 0.22})`);
      ctx.fillStyle = lift;
      ctx.beginPath();
      ctx.ellipse(stage.x, stage.visualY - stage.radius * 0.84, stage.radius * (0.36 + stage.boostRatio * 0.32), height, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (stage.dragRatio > 0.01 && stage.key !== "buy") {
      const dragDepth = stage.radius * (0.8 + stage.dragRatio * 1.8);
      const drag = ctx.createLinearGradient(stage.x, stage.visualY, stage.x, stage.visualY + dragDepth * 1.3);
      drag.addColorStop(0, `rgba(${palette.drag},${0.18 + stage.dragRatio * 0.18})`);
      drag.addColorStop(1, `rgba(${palette.drag},0)`);
      ctx.fillStyle = drag;
      ctx.beginPath();
      ctx.ellipse(stage.x, stage.visualY + stage.radius * 0.96, stage.radius * (0.36 + stage.dragRatio * 0.24), dragDepth, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!reducedMotion) {
        ctx.strokeStyle = `rgba(${palette.drag},0.20)`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(stage.x, stage.visualY + stage.radius * 0.34, stage.radius * (1.1 + Math.sin(frame.idle * 1.7 + stage.index) * 0.04), Math.PI * 0.08, Math.PI * 0.92);
        ctx.stroke();
      }
    }
  }

  function drawOrb(ctx, frame, stage, reducedMotion) {
    if (stage.reveal <= 0.01) return;
    const palette = paletteFor(stage);
    const focus = stage.isHovered || (frame.focusStage && frame.focusStage.key === stage.key);
    const pulse = reducedMotion ? 1 : 1 + Math.sin(frame.idle * (1.9 + stage.index * 0.16) + stage.index) * 0.028;
    const radius = Math.max(6, stage.radius * stage.reveal * pulse * (1 + stage.hoverBoost * 0.08));

    drawGlow(ctx, stage.x, stage.visualY, radius * 2.8, palette.glow, 0.16 + stage.hoverBoost * 0.06);
    drawGlow(ctx, stage.x, stage.visualY, radius * 1.82, palette.glow, 0.14 + stage.hoverBoost * 0.05);
    drawStageSignals(ctx, frame, stage, palette, reducedMotion);

    const shell = ctx.createRadialGradient(stage.x, stage.visualY - radius * 0.1, radius * 0.18, stage.x, stage.visualY, radius * 1.3);
    shell.addColorStop(0, "rgba(255,255,255,0.34)");
    shell.addColorStop(0.4, `rgba(${palette.glow},0.14)`);
    shell.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.arc(stage.x, stage.visualY, radius * 1.36, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(stage.x - radius * 0.24, stage.visualY - radius * 0.32, radius * 0.12, stage.x, stage.visualY, radius);
    body.addColorStop(0, palette.rim);
    body.addColorStop(0.3, palette.core);
    body.addColorStop(1, `rgba(${palette.glow},0.82)`);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(stage.x, stage.visualY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${0.42 + stage.hoverBoost * 0.14})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(stage.x, stage.visualY, radius * 0.98, 0, Math.PI * 2);
    ctx.stroke();

    const gloss = ctx.createLinearGradient(stage.x - radius, stage.visualY - radius, stage.x + radius, stage.visualY + radius);
    gloss.addColorStop(0, "rgba(255,255,255,0.34)");
    gloss.addColorStop(0.35, "rgba(255,255,255,0.10)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.arc(stage.x, stage.visualY, radius * 0.95, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.36)";
    ctx.beginPath();
    ctx.arc(stage.x - radius * 0.28, stage.visualY - radius * 0.3, radius * 0.17, 0, Math.PI * 2);
    ctx.fill();

    if (stage.key === "buy") drawStartAccent(ctx, frame, stage, palette, reducedMotion);
    else if (stage.key === "current") drawCurrentAccent(ctx, frame, stage, palette, reducedMotion);
    else if (stage.key === "predicted") drawGoalAccent(ctx, frame, stage, palette, reducedMotion);

    if (!reducedMotion) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(stage.x, stage.visualY, radius * 0.9, 0, Math.PI * 2);
      ctx.clip();
      const sparkCount = frame.detail === "low" ? 2 : frame.detail === "medium" ? 3 : 4;
      for (let i = 0; i < sparkCount; i++) {
        const drift = frame.idle * (0.34 + i * 0.08) + stage.index * 0.8 + i;
        const px = stage.x + Math.cos(drift) * radius * (0.18 + i * 0.12);
        const py = stage.visualY + Math.sin(drift * 1.2) * radius * (0.14 + i * 0.1);
        ctx.fillStyle = `rgba(255,255,255,${0.08 + i * 0.04})`;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1, radius * 0.05 - i * 0.18), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (focus) {
      ctx.strokeStyle = `rgba(${palette.glow},0.30)`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(stage.x, stage.visualY, radius * 1.7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawStageLabel(ctx, frame, stage) {
    const currency = frame.derived.inputs.currency;
    const titleY = frame.baselineY + (frame.mobile ? 18 : 22);
    const subY = titleY + (frame.mobile ? 14 : 16);
    const valueY = stage.visualY - stage.radius - (frame.mobile ? 12 : 16);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(248,251,255,0.96)";
    ctx.strokeStyle = "rgba(6,16,28,0.66)";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";

    ctx.font = `800 ${frame.mobile ? 11 : 12}px ${getComputedStyle(document.documentElement).getPropertyValue("--font") || "sans-serif"}`;
    ctx.strokeText(stage.title, stage.x, titleY);
    ctx.fillText(stage.title, stage.x, titleY);

    ctx.font = `700 ${frame.mobile ? 10 : 11}px ${getComputedStyle(document.documentElement).getPropertyValue("--font") || "sans-serif"}`;
    ctx.fillStyle = "rgba(218,231,245,0.76)";
    ctx.strokeText(formatCurrency(stage.price, currency, { digits: 2 }), stage.x, subY);
    ctx.fillText(formatCurrency(stage.price, currency, { digits: 2 }), stage.x, subY);

    ctx.font = `800 ${frame.mobile ? 11 : 13}px ${getComputedStyle(document.documentElement).getPropertyValue("--font") || "sans-serif"}`;
    ctx.fillStyle = "rgba(248,251,255,0.98)";
    ctx.strokeText(formatCurrency(stage.netValue, currency, { compact: true }), stage.x, valueY);
    ctx.fillText(formatCurrency(stage.netValue, currency, { compact: true }), stage.x, valueY);
    ctx.restore();
  }

  class OrbRenderer {
    constructor() {
      this.backdrop = null;
      this.backdropKey = "";
    }

    setData(data) {
      this.data = data;
    }

    resize() {
      this.backdropKey = "";
    }

    update(runtime) {
      this.runtime = runtime;
    }

    ensureBackdrop(frame) {
      const key = `${frame.width}x${frame.height}x${frame.pixelRatio}x${frame.detail}x${Math.round(frame.baselineY)}`;
      if (this.backdrop && this.backdropKey === key) return;
      this.backdropKey = key;
      this.backdrop = makeCanvas(frame.width, frame.height, frame.pixelRatio);
      const ctx = this.backdrop.getContext("2d");
      ctx.setTransform(frame.pixelRatio, 0, 0, frame.pixelRatio, 0, 0);

      const fill = ctx.createLinearGradient(0, frame.plot.top, 0, frame.height);
      fill.addColorStop(0, "rgba(13,49,86,0.98)");
      fill.addColorStop(0.54, "rgba(10,37,64,0.98)");
      fill.addColorStop(1, "rgba(8,28,49,0.99)");
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, frame.width, frame.height);

      const topGlow = ctx.createRadialGradient(frame.plot.left + frame.plot.width * 0.18, frame.plot.top + frame.plot.height * 0.2, 0, frame.plot.left + frame.plot.width * 0.18, frame.plot.top + frame.plot.height * 0.2, frame.plot.width * 0.42);
      topGlow.addColorStop(0, `rgba(${CVI.orangeRgb},0.11)`);
      topGlow.addColorStop(1, `rgba(${CVI.orangeRgb},0)`);
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, frame.width, frame.height);

      const centerGlow = ctx.createRadialGradient(frame.plot.left + frame.plot.width * 0.5, frame.plot.top + frame.plot.height * 0.32, 0, frame.plot.left + frame.plot.width * 0.5, frame.plot.top + frame.plot.height * 0.32, frame.plot.width * 0.38);
      centerGlow.addColorStop(0, `rgba(${CVI.blueRgb},0.10)`);
      centerGlow.addColorStop(1, `rgba(${CVI.blueRgb},0)`);
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, frame.width, frame.height);

      const rightGlow = ctx.createRadialGradient(frame.plot.left + frame.plot.width * 0.82, frame.plot.top + frame.plot.height * 0.18, 0, frame.plot.left + frame.plot.width * 0.82, frame.plot.top + frame.plot.height * 0.18, frame.plot.width * 0.38);
      rightGlow.addColorStop(0, `rgba(${CVI.blueSoftRgb},0.12)`);
      rightGlow.addColorStop(1, `rgba(${CVI.blueSoftRgb},0)`);
      ctx.fillStyle = rightGlow;
      ctx.fillRect(0, 0, frame.width, frame.height);

      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      const bands = frame.detail === "low" ? 2 : 3;
      for (let i = 0; i < bands; i++) {
        const y = frame.plot.top + (frame.plot.height / (bands + 1)) * (i + 1);
        ctx.beginPath();
        ctx.moveTo(frame.plot.left, y);
        ctx.lineTo(frame.plot.right, y);
        ctx.stroke();
      }
    }

    render({ ctx, frame, reducedMotion, role, transitionPhase, transitionProgress }) {
      this.ensureBackdrop(frame);
      if (this.backdrop) ctx.drawImage(this.backdrop, 0, 0, frame.width, frame.height);

      const blend = transitionPhase === "idle"
        ? 1
        : role === "outgoing"
          ? 1 - ease(transitionProgress) * 0.16
          : 0.88 + ease(transitionProgress) * 0.12;

      ctx.save();
      ctx.translate(0, sceneOffset(frame));

      drawInvestmentPlane(ctx, frame, reducedMotion);
      const currentStage = frame.stages.find((stage) => stage.key === "current" && stage.reveal > 0.02);
      if (currentStage) drawCurrentBeacon(ctx, frame, currentStage, reducedMotion);

      for (const stage of frame.stages) {
        if (stage.reveal <= 0.02) continue;
        const palette = paletteFor(stage);
        drawAnchorPad(ctx, frame, stage, palette, reducedMotion);
        drawValueStem(ctx, frame, stage, palette);
      }

      for (const link of frame.links) {
        drawLinkRibbon(ctx, frame, link, reducedMotion);
      }

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (const stage of frame.stages) {
        if (stage.reveal <= 0.02) continue;
        const palette = paletteFor(stage);
        const drift = reducedMotion ? 0 : Math.sin(frame.idle * (0.54 + stage.index * 0.08)) * stage.radius * 0.08;
        drawGlow(ctx, stage.x + drift, stage.visualY - stage.radius * 0.14, stage.radius * 4, palette.glow, 0.05 * blend);
      }
      ctx.restore();

      for (const stage of frame.stages) {
        drawOrb(ctx, frame, stage, reducedMotion);
      }

      for (const stage of frame.stages) {
        if (stage.reveal <= 0.06) continue;
        drawStageLabel(ctx, frame, stage);
      }
      ctx.restore();
    }
  }

  ns.OrbRenderer = OrbRenderer;
})();
