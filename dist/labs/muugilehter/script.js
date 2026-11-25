(function initFunnelSim(global) {
  "use strict";

  const STAGES = ["Awareness", "Interest", "Evaluation", "Engagement", "Action", "Retention"];
  const STAGE_INDEX = Object.freeze(Object.fromEntries(STAGES.map((stage, index) => [stage, index])));
  const EMBED_WIDGET_ID = "sim16-sales-funnel";
  const STAGE_COLORS = Object.freeze({
    Awareness: "#3fb2ff",
    Interest: "#57ddff",
    Evaluation: "#6d7eff",
    Engagement: "#f6b34e",
    Action: "#56d68d",
    Retention: "#ffd362",
    Lost: "#ff7a66",
  });
  const ALLOWED = Object.freeze({
    acquisitionChannels: [
      "word_of_mouth",
      "cold_calling",
      "cold_email",
      "outbound_campaign",
      "viral_social_content",
      "podcast",
    ],
    intentSignals: ["form", "call", "message"],
    engagementTouches: [
      "ungated_whitepaper",
      "case_study",
      "pricing",
      "webinar_snippet",
      "email_signature_link",
    ],
    retentionCommunications: ["check_in", "help_using_product", "educational_content"],
  });
  const EVENT_TYPES = Object.freeze({
    createdAwareness: "created_awareness",
    enteredInterest: "entered_interest",
    speedToLeadContacted: "speed_to_lead_contacted",
    enteredEvaluation: "entered_evaluation",
    qualificationResult: "qualification_result",
    enteredEngagement: "entered_engagement",
    engagementTouch: "engagement_touch",
    enteredAction: "entered_action",
    dealClosedWon: "deal_closed_won",
    dealClosedLost: "deal_closed_lost",
    retentionCommunication: "retention_communication",
    referralCreatedAwareness: "referral_created_awareness",
  });
  const INTERNAL_EVENT_TYPES = Object.freeze({
    dailySpawn: "internal_daily_spawn",
    createdAwareness: "internal_created_awareness",
  });
  const DEFAULT_CONFIG = Object.freeze({
    seed: 42,
    simMinutesPerSecond: 180,
    runHorizonDays: 10,
    newAwarenessPerDay: 200,
    p_awareness_to_interest: 0.2,
    p_interest_to_evaluation: 0.85,
    p_evaluation_qualified: 0.6,
    p_engagement_to_action: 0.7,
    p_action_closed_won: 0.4,
    p_retention_generates_referral: 0.12,
    speedToLeadMaxMin: 5,
    fixedStepMs: 1000 / 30,
    delaysMin: {
      awareness_to_interest: { dist: "triangular", min: 30, mode: 360, max: 1440 },
      interest_to_evaluation: { dist: "triangular", min: 10, mode: 60, max: 240 },
      evaluation_to_engagement: { dist: "triangular", min: 60, mode: 240, max: 720 },
      engagement_touch_spacing: { dist: "uniform", min: 60, max: 240 },
      engagement_to_action: { dist: "triangular", min: 120, mode: 360, max: 1440 },
      action_to_decision: { dist: "triangular", min: 30, mode: 120, max: 480 },
      retention_to_referral: { dist: "triangular", min: 1440, mode: 2880, max: 5760 },
      retention_touch_spacing: { dist: "uniform", min: 720, max: 2160 },
    },
  });
  const SPEED_OPTIONS = Object.freeze([1, 3, 5, 10]);
  const SERIES_KEYS = ["closedWon", "closedLost", "fromReferrals"];
  const hasWindow = typeof window !== "undefined" && typeof document !== "undefined";
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const round = (value, digits = 0) => Number(value.toFixed(digits));
  const whole = (value) => Number(value || 0).toLocaleString("en-US");
  const pct = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;
  const byId = (root, id) => root.querySelector(`#${id}`);
  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const setNodeText = (node, value) => {
    if (node && node.textContent !== value) {
      node.textContent = value;
    }
  };
  const setNodeMarkup = (node, value) => {
    if (node && node.innerHTML !== value) {
      node.innerHTML = value;
    }
  };
  const setNodeWidth = (node, value) => {
    if (node && node.style.width !== value) {
      node.style.width = value;
    }
  };

  function mergeConfig(base, override) {
    const output = Array.isArray(base) ? base.slice() : { ...base };
    Object.entries(override || {}).forEach(([key, value]) => {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        base[key] &&
        typeof base[key] === "object" &&
        !Array.isArray(base[key])
      ) {
        output[key] = mergeConfig(base[key], value);
      } else {
        output[key] = value;
      }
    });
    return output;
  }

  function createPrng(seedInt) {
    let state = seedInt >>> 0;
    return {
      nextFloat01() {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      nextInt(maxExclusive) {
        return Math.floor(this.nextFloat01() * maxExclusive);
      },
    };
  }

  function normalizeNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function hashString(input) {
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `cfg-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function hashUint32(input) {
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function assertInvariant(condition, message, context) {
    if (!condition) {
      const error = new Error(message);
      error.context = context;
      throw error;
    }
  }

  function quantile(values, q) {
    if (!values.length) {
      return 0;
    }
    const sorted = values.slice().sort((a, b) => a - b);
    const position = clamp(q, 0, 1) * (sorted.length - 1);
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) {
      return sorted[lower];
    }
    return lerp(sorted[lower], sorted[upper], position - lower);
  }

  function formatSimDay(tMin) {
    return round(tMin / 1440, 1);
  }

  function sampleDelay(config, rng) {
    const rule = config || { dist: "uniform", min: 0, max: 0 };
    if (rule.dist === "triangular") {
      const u = rng.nextFloat01();
      const a = rule.min;
      const b = rule.max;
      const c = rule.mode;
      const f = (c - a) / (b - a);
      if (u < f) {
        return Math.round(a + Math.sqrt(u * (b - a) * (c - a)));
      }
      return Math.round(b - Math.sqrt((1 - u) * (b - a) * (b - c)));
    }
    return Math.round(rule.min + rng.nextFloat01() * (rule.max - rule.min));
  }

  class MinHeap {
    constructor() {
      this.heap = [];
    }

    push(item) {
      this.heap.push(item);
      this.bubbleUp(this.heap.length - 1);
    }

    peek() {
      return this.heap.length ? this.heap[0] : null;
    }

    pop() {
      if (!this.heap.length) {
        return null;
      }
      const top = this.heap[0];
      const end = this.heap.pop();
      if (this.heap.length && end) {
        this.heap[0] = end;
        this.sinkDown(0);
      }
      return top;
    }

    bubbleUp(index) {
      let current = index;
      while (current > 0) {
        const parent = Math.floor((current - 1) / 2);
        if (this.compare(this.heap[current], this.heap[parent]) >= 0) {
          break;
        }
        [this.heap[current], this.heap[parent]] = [this.heap[parent], this.heap[current]];
        current = parent;
      }
    }

    sinkDown(index) {
      let current = index;
      const length = this.heap.length;
      while (true) {
        const left = current * 2 + 1;
        const right = current * 2 + 2;
        let next = current;
        if (left < length && this.compare(this.heap[left], this.heap[next]) < 0) {
          next = left;
        }
        if (right < length && this.compare(this.heap[right], this.heap[next]) < 0) {
          next = right;
        }
        if (next === current) {
          break;
        }
        [this.heap[current], this.heap[next]] = [this.heap[next], this.heap[current]];
        current = next;
      }
    }

    compare(a, b) {
      if (a.tMin !== b.tMin) {
        return a.tMin - b.tMin;
      }
      return a.seq - b.seq;
    }
  }

  class LeadStore {
    constructor() {
      this.nextId = 1;
      this.leadsById = new Map();
    }

    createLead(payload) {
      const id = `L-${String(this.nextId).padStart(6, "0")}`;
      this.nextId += 1;
      const lead = {
        id,
        createdAtMin: payload.createdAtMin,
        stage: "Awareness",
        lifecycleStatus: "active",
        acquisition: {
          channel: payload.channel,
          isReferral: Boolean(payload.isReferral),
          sourceLeadId: payload.sourceLeadId || null,
        },
        interest: null,
        evaluation: null,
        engagement: { touches: [] },
        action: null,
        retention: { active: false, communications: [], referralsGenerated: 0 },
        closed: null,
      };
      this.leadsById.set(id, lead);
      return lead;
    }

    get(id) {
      const lead = this.leadsById.get(id);
      assertInvariant(Boolean(lead), "Lead does not exist", { leadId: id });
      return lead;
    }

    updateStage(id, stage) {
      assertInvariant(STAGES.includes(stage), "Stage is not one of the six locked names", { stage });
      const lead = this.get(id);
      assertInvariant(lead.lifecycleStatus !== "closed-lost", "Closed-lost lead attempted to transition", {
        leadId: id,
        stage,
      });
      lead.stage = stage;
      return lead;
    }

    markClosedLost(id, payload) {
      const lead = this.get(id);
      lead.lifecycleStatus = "closed-lost";
      lead.closed = { outcome: "closed-lost", ...payload };
      if (lead.action) {
        lead.action.outcome = "closed-lost";
      }
      return lead;
    }

    getActiveLeadStates() {
      return Array.from(this.leadsById.values())
        .filter((lead) => lead.lifecycleStatus !== "closed-lost")
        .map((lead) => ({
          id: lead.id,
          stage: lead.stage,
          isReferral: Boolean(lead.acquisition?.isReferral),
          sourceLeadId: lead.acquisition?.sourceLeadId || null,
        }));
    }
  }

  class MetricsAggregator {
    constructor() {
      this.stageCounts = Object.fromEntries(STAGES.map((stage) => [stage, 0]));
      this.stageEntries = Object.fromEntries(STAGES.map((stage) => [stage, 0]));
      this.closedWon = 0;
      this.closedLost = 0;
      this.qualifiedCount = 0;
      this.disqualifiedCount = 0;
      this.referralsGenerated = 0;
      this.awarenessFromReferrals = 0;
      this.speedToLeadValues = [];
      this.dailyBuckets = new Map();
    }

    getBucket(day) {
      if (!this.dailyBuckets.has(day)) {
        this.dailyBuckets.set(day, {
          day,
          newAwareness: 0,
          fromReferrals: 0,
          stageEntries: Object.fromEntries(STAGES.map((stage) => [stage, 0])),
          qualified: 0,
          disqualified: 0,
          closedWon: 0,
          closedLost: 0,
          closedLostCum: 0,
          retentionCum: 0,
        });
      }
      return this.dailyBuckets.get(day);
    }

    onEvent(event) {
      const day = Math.floor(event.tMin / 1440) + 1;
      const bucket = this.getBucket(day);
      switch (event.type) {
        case EVENT_TYPES.createdAwareness:
          this.stageCounts.Awareness += 1;
          this.stageEntries.Awareness += 1;
          bucket.newAwareness += 1;
          bucket.stageEntries.Awareness += 1;
          if (event.data.isReferral) {
            this.awarenessFromReferrals += 1;
            bucket.fromReferrals += 1;
          }
          break;
        case EVENT_TYPES.enteredInterest:
          this.stageCounts.Awareness -= 1;
          this.stageCounts.Interest += 1;
          this.stageEntries.Interest += 1;
          bucket.stageEntries.Interest += 1;
          break;
        case EVENT_TYPES.enteredEvaluation:
          this.stageCounts.Interest -= 1;
          this.stageCounts.Evaluation += 1;
          this.stageEntries.Evaluation += 1;
          bucket.stageEntries.Evaluation += 1;
          break;
        case EVENT_TYPES.speedToLeadContacted:
          this.speedToLeadValues.push(event.data.speedToLeadMin);
          break;
        case EVENT_TYPES.qualificationResult:
          if (event.data.qualified) {
            this.qualifiedCount += 1;
            bucket.qualified += 1;
          } else {
            this.disqualifiedCount += 1;
            bucket.disqualified += 1;
          }
          break;
        case EVENT_TYPES.enteredEngagement:
          this.stageCounts.Evaluation -= 1;
          this.stageCounts.Engagement += 1;
          this.stageEntries.Engagement += 1;
          bucket.stageEntries.Engagement += 1;
          break;
        case EVENT_TYPES.enteredAction:
          this.stageCounts.Engagement -= 1;
          this.stageCounts.Action += 1;
          this.stageEntries.Action += 1;
          bucket.stageEntries.Action += 1;
          break;
        case EVENT_TYPES.dealClosedWon:
          this.closedWon += 1;
          this.stageCounts.Action -= 1;
          this.stageCounts.Retention += 1;
          this.stageEntries.Retention += 1;
          bucket.closedWon += 1;
          bucket.stageEntries.Retention += 1;
          break;
        case EVENT_TYPES.dealClosedLost:
          this.closedLost += 1;
          bucket.closedLost += 1;
          if (event.fromStage === "Evaluation") {
            this.stageCounts.Evaluation -= 1;
          } else if (event.fromStage === "Action") {
            this.stageCounts.Action -= 1;
          }
          break;
        case EVENT_TYPES.referralCreatedAwareness:
          this.referralsGenerated += 1;
          break;
        default:
          break;
      }
      bucket.closedLostCum = this.closedLost;
      bucket.retentionCum = this.closedWon;
    }

    getDailySeries(totalDays) {
      const output = [];
      for (let day = 1; day <= totalDays; day += 1) {
        output.push(this.getBucket(day));
      }
      return output;
    }

    snapshot(config) {
      const qualificationTotal = this.qualifiedCount + this.disqualifiedCount;
      return {
        stageCounts: { ...this.stageCounts },
        stageEntries: { ...this.stageEntries },
        qualification: {
          qualifiedCount: this.qualifiedCount,
          disqualifiedCount: this.disqualifiedCount,
          passRate: qualificationTotal ? this.qualifiedCount / qualificationTotal : 0,
        },
        closed: { won: this.closedWon, lost: this.closedLost },
        speedToLead: {
          maxMin: this.speedToLeadValues.length ? Math.max(...this.speedToLeadValues) : 0,
          p95Min: this.speedToLeadValues.length ? quantile(this.speedToLeadValues, 0.95) : 0,
          capMin: config.speedToLeadMaxMin,
        },
        referrals: {
          generated: this.referralsGenerated,
          awarenessFromReferrals: this.awarenessFromReferrals,
        },
      };
    }
  }

  class FunnelSimulationEngine {
    constructor(config = {}) {
      this.config = mergeConfig(DEFAULT_CONFIG, config);
      this.prng = createPrng(this.config.seed);
      this.queue = new MinHeap();
      this.store = new LeadStore();
      this.metrics = new MetricsAggregator();
      this.events = [];
      this.currentTimeMin = 0;
      this.sequence = 1;
      this.running = true;
      this.completed = false;
      this.listeners = new Set();
      this.scheduleInitialEvents();
    }

    scheduleInitialEvents() {
      for (let day = 0; day < this.config.runHorizonDays; day += 1) {
        this.scheduleInternal(day * 1440, INTERNAL_EVENT_TYPES.dailySpawn, { dayIndex: day });
      }
    }

    onEvent(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    emit(event) {
      this.listeners.forEach((listener) => listener(event));
    }

    scheduleInternal(tMin, type, data) {
      this.queue.push({ tMin, type, data, seq: this.sequence, internal: true });
      this.sequence += 1;
    }

    scheduleEvent(tMin, type, leadId, data = {}) {
      this.queue.push({ tMin, type, leadId: leadId || null, data, seq: this.sequence, internal: false });
      this.sequence += 1;
    }

    run() {
      this.running = true;
    }

    pause() {
      this.running = false;
    }

    reset() {
      return new FunnelSimulationEngine(this.config);
    }

    tick(realDeltaMs) {
      if (!this.running || this.completed) {
        return [];
      }
      const appliedEvents = [];
      const simDeltaMin = (realDeltaMs / 1000) * this.config.simMinutesPerSecond;
      this.currentTimeMin = Math.min(this.currentTimeMin + simDeltaMin, this.config.runHorizonDays * 1440);
      let next = this.queue.peek();
      while (next && next.tMin <= this.currentTimeMin) {
        const due = this.queue.pop();
        const applied = due.internal ? this.applyInternalEvent(due) : this.applyEvent(due);
        if (Array.isArray(applied)) {
          applied.forEach((entry) => {
            if (entry) {
              appliedEvents.push(entry);
            }
          });
        } else if (applied) {
          appliedEvents.push(applied);
        }
        next = this.queue.peek();
      }
      if (!this.completed && this.currentTimeMin >= this.config.runHorizonDays * 1440) {
        this.completed = true;
        this.running = false;
      }
      return appliedEvents;
    }

    applyInternalEvent(event) {
      if (event.type === INTERNAL_EVENT_TYPES.dailySpawn) {
        this.spawnAwarenessForDay(event.data.dayIndex);
        return null;
      }
      if (event.type === INTERNAL_EVENT_TYPES.createdAwareness) {
        return this.createAwarenessLead(event.tMin, event.data);
      }
      return null;
    }

    spawnAwarenessForDay(dayIndex) {
      const dayStart = dayIndex * 1440;
      const spacing = 1440 / this.config.newAwarenessPerDay;
      for (let index = 0; index < this.config.newAwarenessPerDay; index += 1) {
        const tMin = Math.round(dayStart + index * spacing);
        const channel = ALLOWED.acquisitionChannels[index % ALLOWED.acquisitionChannels.length];
        this.scheduleInternal(tMin, INTERNAL_EVENT_TYPES.createdAwareness, {
          channel,
          isReferral: false,
          sourceLeadId: null,
        });
      }
    }

    createAwarenessLead(tMin, data) {
      const lead = this.store.createLead({
        createdAtMin: tMin,
        channel: data.channel,
        isReferral: data.isReferral,
        sourceLeadId: data.sourceLeadId,
      });
      const event = this.recordEvent({
        tMin,
        type: EVENT_TYPES.createdAwareness,
        leadId: lead.id,
        fromStage: null,
        toStage: "Awareness",
        data: {
          channel: data.channel,
          isReferral: Boolean(data.isReferral),
          sourceLeadId: data.sourceLeadId || null,
        },
      });
      if (this.prng.nextFloat01() < this.config.p_awareness_to_interest) {
        const delay = sampleDelay(this.config.delaysMin.awareness_to_interest, this.prng);
        this.scheduleEvent(tMin + delay, EVENT_TYPES.enteredInterest, lead.id, {});
      }
      return event;
    }

    recordEvent(event) {
      this.events.push(event);
      this.metrics.onEvent(event);
      this.emit(event);
      return event;
    }

    applyEvent(event) {
      switch (event.type) {
        case EVENT_TYPES.enteredInterest:
          return this.handleEnteredInterest(event);
        case EVENT_TYPES.speedToLeadContacted:
          return this.handleSpeedToLead(event);
        case EVENT_TYPES.enteredEvaluation:
          return this.handleEnteredEvaluation(event);
        case EVENT_TYPES.qualificationResult:
          return this.handleQualificationResult(event);
        case EVENT_TYPES.enteredEngagement:
          return this.handleEnteredEngagement(event);
        case EVENT_TYPES.engagementTouch:
          return this.handleEngagementTouch(event);
        case EVENT_TYPES.enteredAction:
          return this.handleEnteredAction(event);
        case EVENT_TYPES.dealClosedWon:
          return this.handleClosedWon(event);
        case EVENT_TYPES.dealClosedLost:
          return this.handleClosedLost(event);
        case EVENT_TYPES.retentionCommunication:
          return this.handleRetentionCommunication(event);
        case EVENT_TYPES.referralCreatedAwareness:
          return this.handleReferralCreatedAwareness(event);
        default:
          return null;
      }
    }

    handleEnteredInterest(event) {
      const lead = this.store.updateStage(event.leadId, "Interest");
      const intentSignal = ALLOWED.intentSignals[this.prng.nextInt(ALLOWED.intentSignals.length)];
      lead.interest = {
        intentSignal,
        requestedInfoAtMin: event.tMin,
        contactedAtMin: null,
        speedToLeadMin: null,
      };
      const logged = this.recordEvent({
        tMin: event.tMin,
        type: EVENT_TYPES.enteredInterest,
        leadId: lead.id,
        fromStage: "Awareness",
        toStage: "Interest",
        data: { intentSignal },
      });
      const delta = this.prng.nextInt(this.config.speedToLeadMaxMin + 1);
      const contactAt = event.tMin + delta;
      assertInvariant(contactAt - event.tMin <= this.config.speedToLeadMaxMin, "Speed-to-lead invariant violated", {
        leadId: lead.id,
      });
      this.scheduleEvent(contactAt, EVENT_TYPES.speedToLeadContacted, lead.id, { speedToLeadMin: delta });
      return logged;
    }

    handleSpeedToLead(event) {
      const lead = this.store.get(event.leadId);
      assertInvariant(Boolean(lead.interest), "Interest payload missing before contact", { leadId: lead.id });
      lead.interest.contactedAtMin = event.tMin;
      lead.interest.speedToLeadMin = event.data.speedToLeadMin;
      assertInvariant(
        lead.interest.contactedAtMin - lead.interest.requestedInfoAtMin <= this.config.speedToLeadMaxMin,
        "Speed-to-lead exceeded five minutes",
        { leadId: lead.id }
      );
      const logged = this.recordEvent({
        tMin: event.tMin,
        type: EVENT_TYPES.speedToLeadContacted,
        leadId: lead.id,
        fromStage: "Interest",
        toStage: "Interest",
        data: { speedToLeadMin: event.data.speedToLeadMin },
      });
      if (this.prng.nextFloat01() < this.config.p_interest_to_evaluation) {
        const delay = sampleDelay(this.config.delaysMin.interest_to_evaluation, this.prng);
        this.scheduleEvent(event.tMin + delay, EVENT_TYPES.enteredEvaluation, lead.id, {});
      }
      return logged;
    }

    handleEnteredEvaluation(event) {
      const lead = this.store.updateStage(event.leadId, "Evaluation");
      lead.evaluation = {
        evaluatedAtMin: event.tMin,
        qualified: null,
      };
      const logged = this.recordEvent({
        tMin: event.tMin,
        type: EVENT_TYPES.enteredEvaluation,
        leadId: lead.id,
        fromStage: "Interest",
        toStage: "Evaluation",
        data: {},
      });
      this.scheduleEvent(event.tMin + 1, EVENT_TYPES.qualificationResult, lead.id, {});
      return logged;
    }

    handleQualificationResult(event) {
      const lead = this.store.get(event.leadId);
      const qualified = this.prng.nextFloat01() < this.config.p_evaluation_qualified;
      lead.evaluation.qualified = qualified;
      const logged = this.recordEvent({
        tMin: event.tMin,
        type: EVENT_TYPES.qualificationResult,
        leadId: lead.id,
        fromStage: "Evaluation",
        toStage: qualified ? "Evaluation" : null,
        data: { qualified },
      });
      if (qualified) {
        const delay = sampleDelay(this.config.delaysMin.evaluation_to_engagement, this.prng);
        this.scheduleEvent(event.tMin + delay, EVENT_TYPES.enteredEngagement, lead.id, {});
      } else {
        this.scheduleEvent(event.tMin, EVENT_TYPES.dealClosedLost, lead.id, { reason: "disqualified" });
      }
      return logged;
    }

    handleEnteredEngagement(event) {
      const lead = this.store.get(event.leadId);
      assertInvariant(lead.evaluation && lead.evaluation.qualified === true, "Disqualified lead attempted Engagement", {
        leadId: lead.id,
      });
      this.store.updateStage(event.leadId, "Engagement");
      const logged = this.recordEvent({
        tMin: event.tMin,
        type: EVENT_TYPES.enteredEngagement,
        leadId: lead.id,
        fromStage: "Evaluation",
        toStage: "Engagement",
        data: {},
      });
      const touchCount = 2 + this.prng.nextInt(3);
      let touchAt = event.tMin;
      for (let index = 0; index < touchCount; index += 1) {
        touchAt += sampleDelay(this.config.delaysMin.engagement_touch_spacing, this.prng);
        const touchType = ALLOWED.engagementTouches[this.prng.nextInt(ALLOWED.engagementTouches.length)];
        this.scheduleEvent(touchAt, EVENT_TYPES.engagementTouch, lead.id, { touchType });
      }
      if (this.prng.nextFloat01() < this.config.p_engagement_to_action) {
        const delay = sampleDelay(this.config.delaysMin.engagement_to_action, this.prng);
        this.scheduleEvent(event.tMin + delay, EVENT_TYPES.enteredAction, lead.id, {});
      }
      return logged;
    }

    handleEngagementTouch(event) {
      const lead = this.store.get(event.leadId);
      if (lead.lifecycleStatus === "closed-lost" || lead.stage !== "Engagement") {
        return null;
      }
      lead.engagement.touches.push({ type: event.data.touchType, atMin: event.tMin });
      return this.recordEvent({
        tMin: event.tMin,
        type: EVENT_TYPES.engagementTouch,
        leadId: lead.id,
        fromStage: "Engagement",
        toStage: "Engagement",
        data: { touchType: event.data.touchType },
      });
    }

    handleEnteredAction(event) {
      const lead = this.store.updateStage(event.leadId, "Action");
      lead.action = { decisionAtMin: null, outcome: null };
      const logged = this.recordEvent({
        tMin: event.tMin,
        type: EVENT_TYPES.enteredAction,
        leadId: lead.id,
        fromStage: "Engagement",
        toStage: "Action",
        data: {},
      });
      const decisionAt = event.tMin + sampleDelay(this.config.delaysMin.action_to_decision, this.prng);
      if (this.prng.nextFloat01() < this.config.p_action_closed_won) {
        this.scheduleEvent(decisionAt, EVENT_TYPES.dealClosedWon, lead.id, {});
      } else {
        this.scheduleEvent(decisionAt, EVENT_TYPES.dealClosedLost, lead.id, { reason: "not_won" });
      }
      return logged;
    }

    handleClosedWon(event) {
      const lead = this.store.get(event.leadId);
      assertInvariant(lead.stage === "Action", "Closed-won event came from non-Action stage", {
        leadId: lead.id,
        stage: lead.stage,
      });
      this.store.updateStage(event.leadId, "Retention");
      lead.action.decisionAtMin = event.tMin;
      lead.action.outcome = "closed-won";
      lead.retention.active = true;
      const logged = this.recordEvent({
        tMin: event.tMin,
        type: EVENT_TYPES.dealClosedWon,
        leadId: lead.id,
        fromStage: "Action",
        toStage: "Retention",
        data: { outcome: "closed-won" },
      });
      let communicationAt = event.tMin;
      for (let index = 0; index < 2; index += 1) {
        communicationAt += sampleDelay(this.config.delaysMin.retention_touch_spacing, this.prng);
        if (communicationAt <= this.config.runHorizonDays * 1440) {
          const communicationType =
            ALLOWED.retentionCommunications[this.prng.nextInt(ALLOWED.retentionCommunications.length)];
          this.scheduleEvent(communicationAt, EVENT_TYPES.retentionCommunication, lead.id, { communicationType });
        }
      }
      if (this.prng.nextFloat01() < this.config.p_retention_generates_referral) {
        const referralAt = event.tMin + sampleDelay(this.config.delaysMin.retention_to_referral, this.prng);
        if (referralAt <= this.config.runHorizonDays * 1440) {
          this.scheduleEvent(referralAt, EVENT_TYPES.referralCreatedAwareness, lead.id, {});
        }
      }
      return logged;
    }

    handleClosedLost(event) {
      const lead = this.store.get(event.leadId);
      const fromStage = lead.stage;
      assertInvariant(fromStage === "Evaluation" || fromStage === "Action", "Closed-lost came from invalid stage", {
        leadId: lead.id,
        stage: fromStage,
      });
      this.store.markClosedLost(event.leadId, { atMin: event.tMin, reason: event.data.reason, fromStage });
      return this.recordEvent({
        tMin: event.tMin,
        type: EVENT_TYPES.dealClosedLost,
        leadId: lead.id,
        fromStage,
        toStage: null,
        data: { reason: event.data.reason || "not_won", outcome: "closed-lost" },
      });
    }

    handleRetentionCommunication(event) {
      const lead = this.store.get(event.leadId);
      assertInvariant(lead.stage === "Retention", "Retention communication hit non-Retention lead", { leadId: lead.id });
      lead.retention.communications.push({ type: event.data.communicationType, atMin: event.tMin });
      return this.recordEvent({
        tMin: event.tMin,
        type: EVENT_TYPES.retentionCommunication,
        leadId: lead.id,
        fromStage: "Retention",
        toStage: "Retention",
        data: { communicationType: event.data.communicationType },
      });
    }

    handleReferralCreatedAwareness(event) {
      const sourceLead = this.store.get(event.leadId);
      assertInvariant(sourceLead.stage === "Retention", "Referral created from non-Retention lead", { leadId: sourceLead.id });
      sourceLead.retention.referralsGenerated += 1;
      const logged = this.recordEvent({
        tMin: event.tMin,
        type: EVENT_TYPES.referralCreatedAwareness,
        leadId: sourceLead.id,
        fromStage: "Retention",
        toStage: "Awareness",
        data: {},
      });
      this.scheduleInternal(event.tMin, INTERNAL_EVENT_TYPES.createdAwareness, {
        channel: "word_of_mouth",
        isReferral: true,
        sourceLeadId: sourceLead.id,
      });
      return logged;
    }

    getSnapshot() {
      const summary = this.metrics.snapshot(this.config);
      return {
        configHash: hashString(JSON.stringify(this.config)),
        seed: this.config.seed,
        simTime: {
          tMin: round(this.currentTimeMin, 2),
          day: formatSimDay(this.currentTimeMin),
        },
        metrics: summary,
        activeLeads: this.store.getActiveLeadStates(),
        series: this.metrics.getDailySeries(this.config.runHorizonDays),
        totalEvents: this.events.length,
        completed: this.completed,
      };
    }

    export(format) {
      const snapshot = this.getSnapshot();
      if (format === "csv") {
        const header = [
          "day",
          "newAwareness",
          "fromReferrals",
          "awarenessEntries",
          "interestEntries",
          "evaluationEntries",
          "engagementEntries",
          "actionEntries",
          "retentionEntries",
          "qualified",
          "disqualified",
          "closedWon",
          "closedLost",
          "closedLostCum",
          "retentionCum",
        ];
        const rows = snapshot.series.map((bucket) => [
          bucket.day,
          bucket.newAwareness,
          bucket.fromReferrals,
          bucket.stageEntries.Awareness,
          bucket.stageEntries.Interest,
          bucket.stageEntries.Evaluation,
          bucket.stageEntries.Engagement,
          bucket.stageEntries.Action,
          bucket.stageEntries.Retention,
          bucket.qualified,
          bucket.disqualified,
          bucket.closedWon,
          bucket.closedLost,
          bucket.closedLostCum,
          bucket.retentionCum,
        ]);
        return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
      }
      return JSON.stringify(
        {
          config: this.config,
          seed: this.config.seed,
          events: this.events,
          dailySeries: snapshot.series,
          finalSnapshot: snapshot,
        },
        null,
        2
      );
    }
  }

  class StageRenderer {
    constructor(canvas, reducedMotion) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.reducedMotion = reducedMotion;
      this.particles = new Map();
    }

    resize(width, height) {
      this.width = Math.max(320, Math.floor(width));
      this.height = Math.max(360, Math.floor(height));
      this.dpr = hasWindow ? Math.max(1, window.devicePixelRatio || 1) : 1;
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    reset() {
      this.particles.clear();
    }

    pushEvent(event) {
      const baseDuration = this.reducedMotion ? 420 : 1180;
      switch (event.type) {
        case EVENT_TYPES.createdAwareness:
          this.handleCreatedLead(event, baseDuration);
          break;
        case EVENT_TYPES.enteredInterest:
        case EVENT_TYPES.enteredEvaluation:
        case EVENT_TYPES.enteredEngagement:
        case EVENT_TYPES.enteredAction:
        case EVENT_TYPES.dealClosedWon:
          this.moveLeadParticle(event, event.toStage, baseDuration);
          break;
        case EVENT_TYPES.dealClosedLost:
          this.sendLeadToLost(event, baseDuration + 120);
          break;
        case EVENT_TYPES.speedToLeadContacted:
          this.pulseLead(event.leadId, this.eventPulseColor("Interest"), 760, 1.3, "contact");
          break;
        case EVENT_TYPES.qualificationResult:
          this.pulseLead(
            event.leadId,
            event.data.qualified ? this.eventPulseColor("Action") : this.eventPulseColor("Lost"),
            760,
            1.38,
            event.data.qualified ? "qualified" : "rejected"
          );
          break;
        case EVENT_TYPES.engagementTouch:
          this.pulseLead(event.leadId, this.eventPulseColor("Engagement"), 820, 1.55, "touch");
          break;
        case EVENT_TYPES.retentionCommunication:
          this.pulseLead(event.leadId, this.eventPulseColor("Retention"), 860, 1.65, "retain");
          break;
        case EVENT_TYPES.referralCreatedAwareness:
          this.pulseLead(event.leadId, this.eventPulseColor("Retention"), baseDuration + 220, 1.85, "referral");
          break;
        default:
          break;
      }
    }

    handleCreatedLead(event, duration) {
      const particle = this.ensureParticle({
        id: event.leadId,
        stage: "Awareness",
        isReferral: Boolean(event.data?.isReferral),
      });
      particle.stage = "Awareness";
      particle.isReferral = Boolean(event.data?.isReferral);
      particle.motion = {
        kind: event.data?.isReferral ? "referral" : "spawn",
        start: Date.now(),
        duration: duration + (event.data?.isReferral ? 180 : 0),
      };
      particle.pulse = {
        color: event.data?.isReferral ? this.eventPulseColor("Retention") : this.eventPulseColor("Awareness"),
        start: Date.now(),
        duration: 640,
        scale: 1.22,
        mode: event.data?.isReferral ? "referral" : "spawn",
      };
    }

    moveLeadParticle(event, toStage, duration) {
      const particle = this.ensureParticle({
        id: event.leadId,
        stage: event.fromStage || toStage,
      });
      if (!toStage) {
        return;
      }
      particle.motion = {
        kind: "stage",
        start: Date.now(),
        duration,
        fromStage: event.fromStage || particle.stage,
        toStage,
        startX: particle.renderX,
        startY: particle.renderY,
      };
      particle.stage = toStage;
      particle.pulse = {
        color: this.eventPulseColor(toStage),
        start: Date.now(),
        duration: 680,
        scale: 1.18,
        mode: "advance",
      };
    }

    sendLeadToLost(event, duration) {
      const particle = this.ensureParticle({
        id: event.leadId,
        stage: event.fromStage || "Evaluation",
      });
      particle.motion = {
        kind: "lost",
        start: Date.now(),
        duration,
        fromStage: event.fromStage || particle.stage,
        startX: particle.renderX,
        startY: particle.renderY,
      };
      particle.stage = event.fromStage || particle.stage;
      particle.pulse = {
        color: this.eventPulseColor("Lost"),
        start: Date.now(),
        duration: duration,
        scale: 1.4,
        mode: "rejected",
      };
    }

    pulseLead(leadId, color, duration, scale, mode = "default") {
      if (!leadId) {
        return;
      }
      const particle = this.particles.get(leadId);
      if (!particle) {
        return;
      }
      particle.pulse = {
        color,
        start: Date.now(),
        duration,
        scale,
        mode,
      };
    }

    ensureParticle(leadState) {
      let particle = this.particles.get(leadState.id);
      if (!particle) {
        particle = {
          id: leadState.id,
          stage: leadState.stage,
          isReferral: Boolean(leadState.isReferral),
          seedU: this.unitFor(`${leadState.id}:u`),
          seedV: this.unitFor(`${leadState.id}:v`),
          seedW: this.unitFor(`${leadState.id}:w`),
          seedQ: this.unitFor(`${leadState.id}:q`),
          seedGlow: this.unitFor(`${leadState.id}:g`),
          radius: 1.9 + this.unitFor(`${leadState.id}:r`) * 2.05,
          renderX: null,
          renderY: null,
          motion: null,
          pulse: null,
        };
        this.particles.set(leadState.id, particle);
      } else {
        particle.stage = leadState.stage || particle.stage;
        particle.isReferral = Boolean(leadState.isReferral ?? particle.isReferral);
      }
      return particle;
    }

    unitFor(key) {
      return hashUint32(key) / 4294967295;
    }

    canvasScaleFactor() {
      if (this.width <= 420) {
        return 0.8;
      }
      if (this.width <= 560) {
        return 0.9;
      }
      return 1;
    }

    getLayout() {
      const compact = this.width <= 560;
      const phone = this.width <= 420;
      const top = phone ? 46 : compact ? 54 : 72;
      const sideMargin = clamp(this.width * (phone ? 0.028 : compact ? 0.03 : 0.034), phone ? 10 : 14, 28);
      const xRatios = phone
        ? [0.66, 0.69, 0.72, 0.69, 0.74, 0.78]
        : compact
          ? [0.58, 0.62, 0.66, 0.62, 0.68, 0.73]
          : [0.48, 0.54, 0.6, 0.55, 0.63, 0.7];
      const widths = phone
        ? [this.width * 0.42, this.width * 0.39, this.width * 0.36, this.width * 0.34, this.width * 0.31, this.width * 0.28]
        : compact
          ? [this.width * 0.38, this.width * 0.35, this.width * 0.32, this.width * 0.3, this.width * 0.27, this.width * 0.24]
          : [this.width * 0.34, this.width * 0.31, this.width * 0.29, this.width * 0.27, this.width * 0.24, this.width * 0.21];
      const rawHeights = phone ? [48, 52, 56, 60, 66, 74] : compact ? [54, 58, 64, 70, 78, 86] : [60, 66, 72, 78, 86, 96];
      const gap = phone ? 10 : compact ? 12 : 14;
      const bottomReserve = compact ? 104 : 122;
      const totalRawHeight = rawHeights.reduce((total, value) => total + value, 0) + gap * (rawHeights.length - 1);
      const availableHeight = Math.max(260, this.height - top - bottomReserve);
      const scale = Math.min(1, availableHeight / totalRawHeight);
      const heights = rawHeights.map((height) => Math.max(36, Math.round(height * scale)));
      const segments = [];
      let currentTop = top;
      STAGES.forEach((stage, index) => {
        const centerX = this.width * xRatios[index];
        const centerY = currentTop + heights[index] * 0.5;
        const zoneHeight = heights[index] * (phone ? 1.78 : compact ? 1.9 : 2);
        const segment = {
          stage,
          index,
          yTop: currentTop,
          yBottom: currentTop + heights[index],
          widthTop: widths[index] * 0.88,
          widthBottom: widths[index] * 0.7,
          centerX,
          centerY,
          zoneWidth: widths[index],
          zoneHeight,
          anchorX: centerX - widths[index] * 0.52,
          anchorY: centerY,
        };
        segments.push(segment);
        currentTop += heights[index] + gap;
      });
      const lostWidth = compact ? clamp(this.width * 0.24, 94, 118) : clamp(this.width * 0.16, 108, 134);
      const lostHeight = compact ? 74 : 86;
      const referralWidth = compact ? this.width - sideMargin * 2 : clamp(this.width * 0.3, 196, 240);
      const referralHeight = compact ? 78 : 92;
      const referralCard = {
        x: compact ? sideMargin : this.width - referralWidth - sideMargin,
        y: this.height - referralHeight - sideMargin,
        width: referralWidth,
        height: referralHeight,
      };
      const awarenessEntryX = segments[0].centerX;
      const awarenessEntryTargetY = segments[0].centerY - segments[0].zoneHeight * 0.34;
      return {
        compact,
        phone,
        sideMargin,
        labelColumnX: sideMargin,
        segments,
        lostBin: {
          x: this.width - lostWidth - sideMargin,
          y: compact
            ? clamp(segments[1].centerY - lostHeight * 0.45, top + 4, referralCard.y - lostHeight - 16)
            : clamp(segments[2].centerY - lostHeight * 0.45, top + 18, referralCard.y - lostHeight - 24),
          width: lostWidth,
          height: lostHeight,
        },
        referralCard,
        entryFlow: {
          x: awarenessEntryX,
          topY: 0,
          targetY: awarenessEntryTargetY,
        },
        loopPath: {
          start: {
            x: segments[5].centerX + segments[5].zoneWidth * 0.36,
            y: segments[5].centerY - 4,
          },
          c1: {
            x: compact ? this.width - sideMargin * 0.8 : referralCard.x + referralCard.width * 0.72,
            y: referralCard.y + referralCard.height * 0.3,
          },
          c2: {
            x: awarenessEntryX,
            y: Math.max(16, top - (compact ? 18 : 28)),
          },
          end: {
            x: awarenessEntryX,
            y: 0,
          },
        },
      };
    }

    draw(snapshot) {
      if (!this.width || !snapshot) {
        return;
      }
      const ctx = this.ctx;
      const now = Date.now();
      const layout = this.getLayout();
      this.reconcileParticles(snapshot);
      ctx.clearRect(0, 0, this.width, this.height);
      this.drawBackdrop(ctx, layout);
      this.drawSegments(ctx, layout, snapshot.metrics.stageCounts);
      this.drawLeadParticles(ctx, layout, now);
      this.drawLabels(ctx, layout, snapshot.metrics.stageCounts);
      this.drawLostBin(ctx, layout, snapshot.metrics.closed.lost);
      this.drawLoopLabel(ctx, layout, snapshot.metrics.referrals.generated);
    }

    drawBackdrop(ctx, layout) {
      ctx.save();
      const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
      gradient.addColorStop(0, "#06192b");
      gradient.addColorStop(0.45, "#0a2741");
      gradient.addColorStop(1, "#0f3554");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.width, this.height);
      const topGlow = ctx.createRadialGradient(
        this.width * 0.18,
        this.height * 0.06,
        20,
        this.width * 0.18,
        this.height * 0.06,
        this.width * 0.78
      );
      topGlow.addColorStop(0, "rgba(39, 143, 213, 0.28)");
      topGlow.addColorStop(0.6, "rgba(21, 83, 132, 0.16)");
      topGlow.addColorStop(1, "rgba(21, 83, 132, 0)");
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, this.width, this.height);
      const lowerGlow = ctx.createRadialGradient(
        this.width * 0.8,
        this.height * 0.82,
        26,
        this.width * 0.8,
        this.height * 0.82,
        this.width * 0.55
      );
      lowerGlow.addColorStop(0, "rgba(255, 140, 42, 0.16)");
      lowerGlow.addColorStop(0.56, "rgba(255, 140, 42, 0.07)");
      lowerGlow.addColorStop(1, "rgba(255, 140, 42, 0)");
      ctx.fillStyle = lowerGlow;
      ctx.fillRect(0, 0, this.width, this.height);
      const lostGlow = ctx.createRadialGradient(
        layout.lostBin.x + layout.lostBin.width * 0.5,
        layout.lostBin.y + layout.lostBin.height * 0.4,
        12,
        layout.lostBin.x + layout.lostBin.width * 0.5,
        layout.lostBin.y + layout.lostBin.height * 0.4,
        140
      );
      lostGlow.addColorStop(0, "rgba(255, 106, 74, 0.18)");
      lostGlow.addColorStop(1, "rgba(255, 106, 74, 0)");
      ctx.fillStyle = lostGlow;
      ctx.fillRect(0, 0, this.width, this.height);
      const minorStep = layout.phone ? 24 : layout.compact ? 28 : 34;
      const majorEvery = 4;
      ctx.lineWidth = 1;
      for (let x = 0, column = 0; x < this.width; x += minorStep, column += 1) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.height);
        ctx.strokeStyle = column % majorEvery === 0 ? "rgba(115, 205, 255, 0.1)" : "rgba(115, 205, 255, 0.05)";
        ctx.stroke();
      }
      for (let y = 0, row = 0; y < this.height; y += minorStep, row += 1) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
        ctx.strokeStyle = row % majorEvery === 0 ? "rgba(115, 205, 255, 0.08)" : "rgba(115, 205, 255, 0.04)";
        ctx.stroke();
      }
      layout.segments.forEach((segment, index) => {
        if (index === layout.segments.length - 1) {
          return;
        }
        const next = layout.segments[index + 1];
        const start = {
          x: segment.centerX + segment.zoneWidth * 0.28,
          y: segment.centerY + segment.zoneHeight * 0.08,
        };
        const end = {
          x: next.centerX - next.zoneWidth * 0.32,
          y: next.centerY - next.zoneHeight * 0.08,
        };
        const c1 = { x: lerp(start.x, end.x, 0.36), y: start.y - 10 };
        const c2 = { x: lerp(start.x, end.x, 0.66), y: end.y + 10 };
        const tone = this.stageTone(segment.stage);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
        ctx.strokeStyle = "rgba(107, 216, 255, 0.12)";
        ctx.lineWidth = layout.phone ? 4.4 : 5.8;
        ctx.lineCap = "round";
        ctx.stroke();
        const flowGradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
        flowGradient.addColorStop(0, this.alpha(tone.mesh, 0.18));
        flowGradient.addColorStop(0.5, "rgba(115, 205, 255, 0.22)");
        flowGradient.addColorStop(1, this.alpha(this.stageTone(next.stage).mesh, 0.16));
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
        ctx.strokeStyle = flowGradient;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      });
      const { start, c1, c2, end } = layout.loopPath;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
      ctx.strokeStyle = "rgba(255, 138, 42, 0.12)";
      ctx.lineWidth = layout.phone ? 10 : 14;
      ctx.lineCap = "round";
      ctx.stroke();
      const loopGradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      loopGradient.addColorStop(0, "rgba(255, 140, 42, 0.88)");
      loopGradient.addColorStop(0.46, "rgba(255, 184, 109, 0.54)");
      loopGradient.addColorStop(1, "rgba(93, 214, 255, 0.44)");
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
      ctx.strokeStyle = loopGradient;
      ctx.lineWidth = 2.8;
      ctx.setLineDash([10, 12]);
      ctx.stroke();
      ctx.setLineDash([]);
      const entryFlow = layout.entryFlow;
      ctx.beginPath();
      ctx.moveTo(entryFlow.x, entryFlow.topY);
      ctx.lineTo(entryFlow.x, entryFlow.targetY);
      ctx.strokeStyle = "rgba(255, 138, 42, 0.12)";
      ctx.lineWidth = layout.phone ? 10 : 14;
      ctx.lineCap = "round";
      ctx.stroke();
      const entryGradient = ctx.createLinearGradient(entryFlow.x, entryFlow.topY, entryFlow.x, entryFlow.targetY);
      entryGradient.addColorStop(0, "rgba(93, 214, 255, 0.34)");
      entryGradient.addColorStop(0.32, "rgba(255, 140, 42, 0.88)");
      entryGradient.addColorStop(1, "rgba(255, 184, 109, 0.56)");
      ctx.beginPath();
      ctx.moveTo(entryFlow.x, entryFlow.topY);
      ctx.lineTo(entryFlow.x, entryFlow.targetY);
      ctx.strokeStyle = entryGradient;
      ctx.lineWidth = 2.8;
      ctx.stroke();
      [0.14, 0.48, 0.84].forEach((t, index) => {
        const point = this.cubicPoint(start, c1, c2, end, t);
        const colors = ["#ff8a2a", "#ffc173", "#6bd8ff"];
        ctx.beginPath();
        ctx.fillStyle = "rgba(230, 238, 246, 0.92)";
        ctx.arc(point.x, point.y, layout.phone ? 6 : 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = colors[index];
        ctx.arc(point.x, point.y, layout.phone ? 2.8 : 3.4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    drawSegments(ctx, layout, stageCounts) {
      layout.segments.forEach((segment) => {
        this.drawStageCluster(ctx, segment, stageCounts[segment.stage] || 0, layout);
      });
    }

    drawStageCluster(ctx, segment, count, layout) {
      const tone = this.stageTone(segment.stage);
      const density = clamp(count / 180, 0, 1);
      const halo = ctx.createRadialGradient(
        segment.centerX,
        segment.centerY,
        segment.zoneWidth * 0.08,
        segment.centerX,
        segment.centerY,
        segment.zoneWidth * 0.78
      );
      halo.addColorStop(0, this.alpha(tone.zone, 0.14 + density * 0.24));
      halo.addColorStop(0.52, this.alpha(tone.zone, 0.08 + density * 0.1));
      halo.addColorStop(1, this.alpha(tone.zone, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(
        segment.centerX - segment.zoneWidth,
        segment.centerY - segment.zoneHeight,
        segment.zoneWidth * 2,
        segment.zoneHeight * 2
      );
      const accentGlow = ctx.createRadialGradient(
        segment.centerX + segment.zoneWidth * 0.12,
        segment.centerY - segment.zoneHeight * 0.08,
        4,
        segment.centerX + segment.zoneWidth * 0.12,
        segment.centerY - segment.zoneHeight * 0.08,
        segment.zoneWidth * 0.4
      );
      accentGlow.addColorStop(0, this.alpha(tone.accent, 0.18 + density * 0.12));
      accentGlow.addColorStop(1, this.alpha(tone.accent, 0));
      ctx.fillStyle = accentGlow;
      ctx.fillRect(
        segment.centerX - segment.zoneWidth * 0.8,
        segment.centerY - segment.zoneHeight * 0.8,
        segment.zoneWidth * 1.6,
        segment.zoneHeight * 1.6
      );
      ctx.beginPath();
      ctx.ellipse(segment.centerX, segment.centerY, segment.zoneWidth * 0.48, segment.zoneHeight * 0.46, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(4, 20, 34, 0.18)";
      ctx.fill();
      ctx.strokeStyle = this.alpha(tone.mesh, 0.14 + density * 0.08);
      ctx.lineWidth = 1;
      ctx.stroke();
      const points = this.getClusterNodes(segment);
      ctx.beginPath();
      for (let index = 1; index < points.length; index += 1) {
        const point = points[index];
        const next = points[index === points.length - 1 ? 1 : index + 1];
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(next.x, next.y);
        if (index % 2 === 1) {
          ctx.moveTo(points[0].x, points[0].y);
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.strokeStyle = this.alpha(tone.mesh, 0.14 + density * 0.06);
      ctx.lineWidth = 1;
      ctx.stroke();
      points.forEach((point, index) => {
        const outerRadius = index === 0 ? (layout.phone ? 4.2 : 5) : 2 + point.weight * 1.4;
        const innerRadius = index === 0 ? outerRadius * 0.48 : outerRadius * 0.42;
        ctx.beginPath();
        ctx.fillStyle = "rgba(230, 238, 246, 0.9)";
        ctx.arc(point.x, point.y, outerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = this.alpha(index === 0 ? tone.accent : tone.mesh, index === 0 ? 0.94 : 0.52);
        ctx.lineWidth = index === 0 ? 1.4 : 0.9;
        ctx.arc(point.x, point.y, outerRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = this.alpha(index === 0 ? tone.accent : tone.zone, index === 0 ? 0.96 : 0.68);
        ctx.arc(point.x, point.y, innerRadius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    getClusterNodes(segment) {
      const nodes = [
        {
          x: segment.centerX + segment.zoneWidth * 0.08,
          y: segment.centerY - segment.zoneHeight * 0.06,
          weight: 1,
        },
      ];
      const count = segment.index <= 1 ? 8 : segment.index <= 3 ? 7 : 6;
      for (let index = 0; index < count; index += 1) {
        const angle =
          (index / count) * Math.PI * 2 + this.unitFor(`${segment.stage}:cluster:${index}:angle`) * 0.72;
        const spread = 0.26 + this.unitFor(`${segment.stage}:cluster:${index}:spread`) * 0.38;
        const wobbleX = (this.unitFor(`${segment.stage}:cluster:${index}:x`) - 0.5) * segment.zoneWidth * 0.08;
        const wobbleY = (this.unitFor(`${segment.stage}:cluster:${index}:y`) - 0.5) * segment.zoneHeight * 0.1;
        nodes.push({
          x: segment.centerX + Math.cos(angle) * segment.zoneWidth * spread * 0.44 + wobbleX,
          y: segment.centerY + Math.sin(angle) * segment.zoneHeight * (0.2 + spread * 0.3) + wobbleY,
          weight: 0.45 + this.unitFor(`${segment.stage}:cluster:${index}:weight`) * 0.7,
        });
      }
      return nodes;
    }

    reconcileParticles(snapshot) {
      const activeLeads = snapshot.activeLeads || [];
      const activeIds = new Set();
      activeLeads.forEach((leadState) => {
        activeIds.add(leadState.id);
        this.ensureParticle(leadState);
      });
      this.particles.forEach((particle, leadId) => {
        const isLostMotion = particle.motion && particle.motion.kind === "lost";
        if (!activeIds.has(leadId) && !isLostMotion) {
          this.particles.delete(leadId);
        }
      });
    }

    drawLeadParticles(ctx, layout, now) {
      const particles = Array.from(this.particles.values());
      particles.sort((a, b) => {
        const motionBiasA = a.motion ? 1 : 0;
        const motionBiasB = b.motion ? 1 : 0;
        if (motionBiasA !== motionBiasB) {
          return motionBiasA - motionBiasB;
        }
        return STAGE_INDEX[a.stage] - STAGE_INDEX[b.stage];
      });
      particles.forEach((particle) => {
        const state = this.resolveParticleState(particle, layout, now);
        if (state.remove) {
          this.particles.delete(particle.id);
          return;
        }
        particle.renderX = state.x;
        particle.renderY = state.y;
        this.drawParticleTrail(ctx, particle, state, layout);
        this.drawParticle(ctx, particle, state, now);
      });
    }

    buildVisualState(particle, options) {
      const stage = options.stage ?? particle.stage;
      const isReferral = options.isReferral ?? particle.isReferral;
      const motionVector = options.motionVector || null;
      const speed = motionVector ? Math.min(42, Math.hypot(motionVector.x || 0, motionVector.y || 0)) : 0;
      const baseRadius = particle.radius * this.stageSizeMultiplier(stage, isReferral) * this.canvasScaleFactor();
      const radius = baseRadius * (options.radiusScale ?? 1);
      return {
        ...options,
        stage,
        isReferral,
        color: options.color || this.particleColor(stage, isReferral),
        accentColor: options.accentColor || this.particleAccent(stage, isReferral),
        radius,
        coreRadius: Math.max(1.2, radius * (0.58 + particle.seedQ * 0.08)),
        haloRadius: radius * (1.78 + particle.seedGlow * 0.24),
        haloAlpha: options.haloAlpha ?? clamp(0.14 + speed * 0.003 + particle.seedGlow * 0.04, 0.14, 0.34),
        stretch: options.stretch ?? clamp(1 + speed / 34, 1, 1.55),
        squash: options.squash ?? clamp(1 - speed / 120, 0.76, 1),
        rotation: options.rotation ?? (motionVector ? Math.atan2(motionVector.y, motionVector.x) : 0),
        motionVector,
        alpha: options.alpha ?? 0.94,
      };
    }

    resolveParticleState(particle, layout, now) {
      const segment = layout.segments[STAGE_INDEX[particle.stage]];
      const home = this.getStageHome(segment, particle, now);
      if (!particle.motion) {
        return this.buildVisualState(particle, {
          x: home.x,
          y: home.y,
          alpha: 0.92,
        });
      }
      const motion = particle.motion;
      const t = clamp((now - motion.start) / motion.duration, 0, 1);
      if (motion.kind === "spawn") {
        const entryFlow = layout.entryFlow || { x: segment.centerX, topY: 0 };
        const startX = entryFlow.x + (particle.seedU - 0.5) * Math.min(28, segment.zoneWidth * 0.14);
        const startY = entryFlow.topY - 18;
        if (t >= 1) {
          particle.motion = null;
          return this.buildVisualState(particle, {
            x: home.x,
            y: home.y,
            alpha: 0.94,
          });
        }
        const vector = { x: home.x - startX, y: home.y - startY };
        return {
          ...this.buildVisualState(particle, {
            x: lerp(startX, home.x, easeOutCubic(t)),
            y: lerp(startY, home.y, easeOutCubic(t)),
            stage: "Awareness",
            radiusScale: lerp(0.76, 1.08, t),
            alpha: 0.68 + t * 0.26,
            motionVector: vector,
            haloAlpha: 0.24,
            stretch: 1.38,
            squash: 0.82,
          }),
          trailFrom: { x: startX, y: startY },
        };
      }
      if (motion.kind === "referral") {
        const path = layout.loopPath;
        const curvePoint = this.cubicPoint(path.start, path.c1, path.c2, path.end, clamp(t / 0.8, 0, 1));
        if (t >= 1) {
          particle.motion = null;
          return this.buildVisualState(particle, {
            x: home.x,
            y: home.y,
            stage: "Awareness",
            isReferral: true,
            alpha: 0.96,
          });
        }
        if (t <= 0.8) {
          const trailT = clamp(t / 0.8, 0, 1);
          const nextPoint = this.cubicPoint(path.start, path.c1, path.c2, path.end, clamp(trailT + 0.025, 0, 1));
          return {
            ...this.buildVisualState(particle, {
              x: curvePoint.x,
              y: curvePoint.y,
              stage: "Awareness",
              isReferral: true,
              radiusScale: 1.2,
              alpha: 0.96,
              motionVector: { x: nextPoint.x - curvePoint.x, y: nextPoint.y - curvePoint.y },
              haloAlpha: 0.3,
              stretch: 1.46,
              squash: 0.8,
            }),
            trailPathT: trailT,
          };
        }
        const settle = easeOutCubic((t - 0.8) / 0.2);
        return {
          ...this.buildVisualState(particle, {
            x: lerp(path.end.x, home.x, settle),
            y: lerp(path.end.y, home.y, settle),
            stage: "Awareness",
            isReferral: true,
            alpha: 0.96,
            motionVector: { x: home.x - path.end.x, y: home.y - path.end.y },
            haloAlpha: 0.24,
            stretch: 1.18,
            squash: 0.88,
          }),
          trailFrom: path.end,
        };
      }
      if (motion.kind === "stage") {
        const fromSegment = layout.segments[STAGE_INDEX[motion.fromStage]];
        const toSegment = layout.segments[STAGE_INDEX[motion.toStage]];
        const fromHome = this.getStageHome(fromSegment, particle, motion.start);
        const toHome = this.getStageHome(toSegment, particle, now);
        const startX = Number.isFinite(motion.startX) ? motion.startX : fromHome.x;
        const startY = Number.isFinite(motion.startY) ? motion.startY : fromHome.y;
        const eased = easeOutCubic(t);
        if (t >= 1) {
          particle.motion = null;
          return this.buildVisualState(particle, {
            x: toHome.x,
            y: toHome.y,
            stage: motion.toStage,
            alpha: 0.94,
          });
        }
        return {
          ...this.buildVisualState(particle, {
            x: lerp(startX, toHome.x, eased),
            y: lerp(startY, toHome.y, eased),
            stage: motion.toStage,
            radiusScale: 1.08,
            alpha: 0.93,
            motionVector: { x: toHome.x - startX, y: toHome.y - startY },
            haloAlpha: 0.22,
            stretch: 1.28,
            squash: 0.84,
          }),
          trailFrom: { x: startX, y: startY },
        };
      }
      if (motion.kind === "lost") {
        const fromSegment = layout.segments[STAGE_INDEX[motion.fromStage]];
        const fromHome = this.getStageHome(fromSegment, particle, motion.start);
        const bin = layout.lostBin;
        const startX = Number.isFinite(motion.startX) ? motion.startX : fromHome.x;
        const startY = Number.isFinite(motion.startY) ? motion.startY : fromHome.y;
        const endX = bin.x + bin.width / 2;
        const endY = bin.y + bin.height * (0.38 + particle.seedV * 0.34);
        const eased = easeOutCubic(t);
        const controlX = lerp(startX, endX, 0.62) + 18;
        const controlY = Math.min(startY, endY) - 12;
        if (t >= 1) {
          return { remove: true };
        }
        const point = this.quadraticPoint({ x: startX, y: startY }, { x: controlX, y: controlY }, { x: endX, y: endY }, eased);
        return {
          ...this.buildVisualState(particle, {
            x: point.x,
            y: point.y,
            stage: "Lost",
            color: "#ffe4dc",
            accentColor: "#ff744c",
            radiusScale: 1.04,
            alpha: 0.95 - eased * 0.18,
            motionVector: { x: endX - startX, y: endY - startY },
            haloAlpha: 0.24,
            stretch: 1.34,
            squash: 0.82,
          }),
          trailFrom: { x: startX, y: startY },
        };
      }
      particle.motion = null;
      return this.buildVisualState(particle, {
        x: home.x,
        y: home.y,
        alpha: 0.92,
      });
    }

    getStageHome(segment, particle, now) {
      const depth = clamp(0.12 + this.unitFor(`${particle.id}:${segment.stage}:depth`) * 0.76, 0.12, 0.88);
      const orbit = this.unitFor(`${particle.id}:${segment.stage}:lane`) * Math.PI * 2;
      const phase = now * (0.00045 + particle.seedW * 0.00014) + particle.seedU * Math.PI * 2;
      const angle = orbit + (this.reducedMotion ? 0 : phase * 0.18);
      const radiusX = segment.zoneWidth * (0.12 + depth * 0.28);
      const radiusY = segment.zoneHeight * (0.1 + depth * 0.24);
      const sway = this.reducedMotion ? 0 : Math.cos(phase * 1.12) * (1 + particle.seedV * 2.2);
      const bob = this.reducedMotion ? 0 : Math.sin(phase * 0.94) * (0.8 + particle.seedU * 2.4);
      return {
        x: clamp(
          segment.centerX + Math.cos(angle) * radiusX + sway,
          segment.centerX - segment.zoneWidth * 0.44,
          segment.centerX + segment.zoneWidth * 0.44
        ),
        y: clamp(
          segment.centerY + Math.sin(angle) * radiusY + bob,
          segment.centerY - segment.zoneHeight * 0.42,
          segment.centerY + segment.zoneHeight * 0.42
        ),
      };
    }

    drawParticleTrail(ctx, particle, state, layout) {
      if (state.trailPathT) {
        const path = layout.loopPath;
        ctx.save();
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(path.start.x, path.start.y);
        const steps = 10;
        for (let index = 1; index <= steps; index += 1) {
          const point = this.cubicPoint(path.start, path.c1, path.c2, path.end, (state.trailPathT * index) / steps);
          ctx.lineTo(point.x, point.y);
        }
        ctx.strokeStyle = this.alpha(state.accentColor, 0.16 + state.haloAlpha * 0.45);
        ctx.lineWidth = Math.max(2.2, state.radius * 1.24);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(path.start.x, path.start.y);
        for (let index = 1; index <= steps; index += 1) {
          const point = this.cubicPoint(path.start, path.c1, path.c2, path.end, (state.trailPathT * index) / steps);
          ctx.lineTo(point.x, point.y);
        }
        ctx.strokeStyle = this.alpha(state.color, 0.42);
        ctx.lineWidth = Math.max(1.2, state.radius * 0.72);
        ctx.stroke();
        [0.1, 0.2, 0.3].forEach((offset, index) => {
          const dotT = clamp(state.trailPathT - offset, 0, 1);
          if (dotT <= 0) {
            return;
          }
          const dot = this.cubicPoint(path.start, path.c1, path.c2, path.end, dotT);
          ctx.beginPath();
          ctx.fillStyle = this.alpha(index === 0 ? state.color : state.accentColor, 0.24 - index * 0.05);
          ctx.arc(dot.x, dot.y, Math.max(1, state.radius * (0.34 - index * 0.06)), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
        return;
      }
      if (!state.trailFrom) {
        return;
      }
      const dx = state.x - state.trailFrom.x;
      const dy = state.y - state.trailFrom.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 3) {
        return;
      }
      ctx.save();
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(state.trailFrom.x, state.trailFrom.y);
      ctx.lineTo(state.x, state.y);
      ctx.strokeStyle = this.alpha(state.accentColor, 0.1 + Math.min(0.18, distance / 240));
      ctx.lineWidth = Math.max(2, state.radius * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(state.trailFrom.x, state.trailFrom.y);
      ctx.lineTo(state.x, state.y);
      ctx.strokeStyle = this.alpha(state.color, 0.16 + Math.min(0.22, distance / 180));
      ctx.lineWidth = Math.max(1.05, state.radius * 0.8);
      ctx.stroke();
      ctx.restore();
    }

    drawParticle(ctx, particle, state, now) {
      ctx.save();
      const pulse = particle.pulse && now - particle.pulse.start <= particle.pulse.duration ? particle.pulse : null;
      if (pulse) {
        this.drawPulseEffects(ctx, state, pulse, now);
      }
      ctx.translate(state.x, state.y);
      ctx.rotate(state.rotation);
      const bodyStretch = state.motionVector ? state.stretch : 1.06 + particle.seedGlow * 0.06;
      const bodySquash = state.motionVector ? state.squash : 0.94 + particle.seedQ * 0.04;
      ctx.scale(bodyStretch, bodySquash);
      ctx.beginPath();
      ctx.fillStyle = this.alpha(state.accentColor, state.haloAlpha);
      ctx.arc(0, 0, state.haloRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = this.alpha("#ffffff", Math.min(0.14, state.haloAlpha * 0.65));
      ctx.arc(0, 0, state.haloRadius * 0.68, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = this.alpha(state.color, state.alpha);
      ctx.arc(0, 0, state.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = this.alpha(state.accentColor, 0.94);
      ctx.lineWidth = Math.max(1, state.radius * 0.24);
      ctx.arc(0, 0, state.radius * 0.98, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      ctx.arc(-state.radius * 0.16, -state.radius * 0.12, state.coreRadius * 0.92, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = this.alpha(state.accentColor, 0.9);
      ctx.arc(state.radius * 0.18, state.radius * 0.08, Math.max(1, state.coreRadius * 0.56), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
      ctx.lineWidth = 0.8;
      ctx.arc(0, 0, state.radius * 0.76, Math.PI * 1.08, Math.PI * 1.84);
      ctx.stroke();
      ctx.restore();
    }

    drawPulseEffects(ctx, state, pulse, now) {
      const pulseT = clamp((now - pulse.start) / pulse.duration, 0, 1);
      const fade = 1 - pulseT;
      const outerRadius = state.radius + 2.8 + pulseT * (8 + pulse.scale * 3.4);
      const innerRadius = state.radius + 1.2 + pulseT * (4 + pulse.scale * 2.2);
      ctx.beginPath();
      ctx.fillStyle = this.alpha(pulse.color, 0.09 * fade);
      ctx.arc(state.x, state.y, outerRadius * 1.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = this.alpha(pulse.color, 0.42 * fade);
      ctx.lineWidth = 1.8;
      ctx.arc(state.x, state.y, outerRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.strokeStyle = this.alpha("#ffffff", 0.18 * fade);
      ctx.lineWidth = 1.1;
      ctx.arc(state.x, state.y, innerRadius, 0, Math.PI * 2);
      ctx.stroke();
      if (this.reducedMotion) {
        return;
      }
      const orbitCount =
        pulse.mode === "touch"
          ? 3
          : pulse.mode === "retain" || pulse.mode === "referral"
            ? 2
            : 1;
      const orbitRadius = state.radius + 4 + pulseT * (5 + pulse.scale * 2.8);
      for (let index = 0; index < orbitCount; index += 1) {
        const angle = pulseT * (pulse.mode === "touch" ? 8.8 : 6.2) + index * ((Math.PI * 2) / orbitCount) + state.radius * 0.08;
        const x = state.x + Math.cos(angle) * orbitRadius;
        const y = state.y + Math.sin(angle) * orbitRadius;
        ctx.beginPath();
        ctx.fillStyle = this.alpha(index % 2 === 0 ? pulse.color : state.accentColor, 0.5 * fade);
        ctx.arc(x, y, Math.max(0.75, state.radius * 0.26), 0, Math.PI * 2);
        ctx.fill();
      }
      if (pulse.mode === "contact" || pulse.mode === "qualified" || pulse.mode === "referral") {
        const sparkle = (1 - pulseT) * (pulse.mode === "qualified" ? 5.4 : 4.4);
        const angle = pulse.mode === "referral" ? Math.PI / 4 : Math.PI / 6;
        ctx.save();
        ctx.translate(state.x, state.y);
        ctx.rotate(angle);
        ctx.strokeStyle = this.alpha(pulse.mode === "referral" ? state.accentColor : pulse.color, 0.48 * fade);
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        ctx.moveTo(-sparkle, 0);
        ctx.lineTo(sparkle, 0);
        ctx.moveTo(0, -sparkle);
        ctx.lineTo(0, sparkle);
        if (pulse.mode !== "contact") {
          ctx.moveTo(-sparkle * 0.7, -sparkle * 0.7);
          ctx.lineTo(sparkle * 0.7, sparkle * 0.7);
          ctx.moveTo(-sparkle * 0.7, sparkle * 0.7);
          ctx.lineTo(sparkle * 0.7, -sparkle * 0.7);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    drawLabels(ctx, layout, stageCounts) {
      ctx.save();
      ctx.textBaseline = "middle";
      layout.segments.forEach((segment, index) => {
        const tone = this.stageTone(segment.stage);
        const x = layout.labelColumnX;
        const y = segment.centerY;
        const stageFont = layout.phone
          ? '800 13px "Aptos Display", "Segoe UI", sans-serif'
          : layout.compact
            ? '800 14px "Aptos Display", "Segoe UI", sans-serif'
            : '800 16px "Aptos Display", "Segoe UI", sans-serif';
        const stepFont = layout.phone
          ? '700 9px "Aptos", "Segoe UI", sans-serif'
          : layout.compact
            ? '700 10px "Aptos", "Segoe UI", sans-serif'
            : '700 11px "Aptos", "Segoe UI", sans-serif';
        const countFont = layout.phone
          ? '900 14px "Aptos Display", "Segoe UI", sans-serif'
          : layout.compact
            ? '900 15px "Aptos Display", "Segoe UI", sans-serif'
            : '900 16px "Aptos Display", "Segoe UI", sans-serif';
        const metaFont = layout.phone
          ? '700 8px "Aptos", "Segoe UI", sans-serif'
          : layout.compact
            ? '700 9px "Aptos", "Segoe UI", sans-serif'
            : '700 10px "Aptos", "Segoe UI", sans-serif';
        const stepLabel = layout.phone ? `S${index + 1}` : `STEP ${index + 1}`;
        const countLabel = whole(stageCounts[segment.stage]);
        const metaLabel = layout.phone ? "LIVE" : "ACTIVE";
        const paddingX = layout.phone ? 12 : layout.compact ? 14 : 18;
        const columnGap = layout.phone ? 10 : layout.compact ? 12 : 14;
        const cardHeight = layout.phone ? 40 : layout.compact ? 44 : 50;
        const radius = layout.phone ? 14 : 18;
        ctx.font = stageFont;
        const stageWidth = ctx.measureText(segment.stage).width;
        ctx.font = stepFont;
        const stepWidth = ctx.measureText(stepLabel).width;
        ctx.font = countFont;
        const countWidth = ctx.measureText(countLabel).width;
        ctx.font = metaFont;
        const metaWidth = ctx.measureText(metaLabel).width;
        const cardWidth = clamp(
          Math.ceil(Math.max(stageWidth, stepWidth) + Math.max(countWidth, metaWidth) + paddingX * 2 + columnGap),
          layout.phone ? 108 : layout.compact ? 126 : 168,
          layout.phone ? 140 : layout.compact ? 164 : 202
        );
        const rightX = x + cardWidth - paddingX;
        const cardY = y - cardHeight * 0.5;
        const connectorStartX = x + cardWidth;
        const connectorEndX = segment.anchorX;
        if (connectorEndX > connectorStartX + 6) {
          ctx.beginPath();
          ctx.moveTo(connectorStartX - 2, y);
          ctx.lineTo(connectorEndX, y);
          ctx.strokeStyle = "rgba(107, 216, 255, 0.16)";
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.beginPath();
          ctx.fillStyle = this.alpha(tone.accent, 0.96);
          ctx.arc(connectorEndX, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowColor = this.alpha(tone.accent, 0.14);
        ctx.shadowBlur = layout.phone ? 10 : 18;
        this.roundRect(ctx, x, cardY, cardWidth, cardHeight, radius);
        ctx.fillStyle = "rgba(7, 25, 42, 0.86)";
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(107, 180, 221, 0.24)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = this.alpha(tone.accent, 0.96);
        ctx.arc(x + 12, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
        ctx.font = stageFont;
        ctx.fillText(segment.stage, x + paddingX + 6, y - (layout.phone ? 4 : 5));
        ctx.fillStyle = "rgba(127, 155, 179, 0.92)";
        ctx.font = stepFont;
        ctx.fillText(stepLabel, x + paddingX + 6, y + (layout.phone ? 10 : 13));
        ctx.fillStyle = this.alpha(tone.accent, 0.98);
        ctx.font = countFont;
        ctx.textAlign = "right";
        ctx.fillText(countLabel, rightX, y - (layout.phone ? 4 : 5));
        ctx.fillStyle = "rgba(127, 155, 179, 0.82)";
        ctx.font = metaFont;
        ctx.fillText(metaLabel, rightX, y + (layout.phone ? 10 : 13));
        ctx.textAlign = "left";
      });
      ctx.restore();
    }

    drawLostBin(ctx, layout, closedLost) {
      const bin = layout.lostBin;
      ctx.save();
      const gradient = ctx.createLinearGradient(bin.x, bin.y, bin.x + bin.width, bin.y + bin.height);
      gradient.addColorStop(0, "rgba(8, 24, 40, 0.94)");
      gradient.addColorStop(1, "rgba(14, 38, 59, 0.92)");
      ctx.shadowColor = "rgba(255, 122, 74, 0.2)";
      ctx.shadowBlur = 20;
      this.roundRect(ctx, bin.x, bin.y, bin.width, bin.height, 18);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255, 122, 74, 0.34)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 122, 74, 0.12)";
      this.roundRect(ctx, bin.x + 12, bin.y + 12, bin.width - 24, 18, 9);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 238, 232, 0.84)";
      ctx.font = layout.compact ? '800 8px "Aptos", "Segoe UI", sans-serif' : '800 9px "Aptos", "Segoe UI", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("LOST LEADS", bin.x + bin.width / 2, bin.y + (layout.compact ? 21 : 22));
      ctx.fillStyle = "rgba(255, 140, 92, 0.98)";
      ctx.font = layout.phone
        ? '900 20px "Aptos Display", "Segoe UI", sans-serif'
        : layout.compact
          ? '900 22px "Aptos Display", "Segoe UI", sans-serif'
          : '900 28px "Aptos Display", "Segoe UI", sans-serif';
      ctx.fillText(whole(closedLost), bin.x + bin.width / 2, bin.y + bin.height * (layout.compact ? 0.64 : 0.66));
      ctx.restore();
    }

    drawLoopLabel(ctx, layout, referrals) {
      const card = layout.referralCard;
      ctx.save();
      const gradient = ctx.createLinearGradient(card.x, card.y, card.x + card.width, card.y + card.height);
      gradient.addColorStop(0, "rgba(8, 24, 40, 0.94)");
      gradient.addColorStop(1, "rgba(12, 40, 61, 0.92)");
      ctx.shadowColor = "rgba(255, 140, 42, 0.18)";
      ctx.shadowBlur = 22;
      this.roundRect(ctx, card.x, card.y, card.width, card.height, 22);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(107, 180, 221, 0.24)";
      ctx.lineWidth = 1;
      ctx.stroke();
      if (layout.compact) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(107, 216, 255, 0.4)";
        ctx.lineWidth = 2;
        ctx.moveTo(card.x + 18, card.y + 24);
        ctx.lineTo(card.x + 30, card.y + 17);
        ctx.lineTo(card.x + 42, card.y + 27);
        ctx.stroke();
        [["#ff8a2a", 18, 24], ["#ffc173", 30, 17], ["#6bd8ff", 42, 27]].forEach(([color, dx, dy]) => {
          ctx.beginPath();
          ctx.fillStyle = "rgba(230, 238, 246, 0.94)";
          ctx.arc(card.x + dx, card.y + dy, 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.arc(card.x + dx, card.y + dy, 3.8, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
        ctx.font = layout.phone
          ? '800 14px "Aptos Display", "Segoe UI", sans-serif'
          : '800 15px "Aptos Display", "Segoe UI", sans-serif';
        ctx.fillText("Referral loop", card.x + 54, card.y + 24);
        ctx.fillStyle = "rgba(127, 155, 179, 0.92)";
        ctx.font = layout.phone
          ? '700 10px "Aptos", "Segoe UI", sans-serif'
          : '700 11px "Aptos", "Segoe UI", sans-serif';
        ctx.fillText("new leads generated", card.x + 54, card.y + 40);
        const pillWidth = layout.phone ? 82 : 92;
        const pillHeight = 22;
        const pillX = card.x + card.width - pillWidth - 14;
        const pillY = card.y + card.height * 0.5 - pillHeight * 0.5;
        ctx.fillStyle = "rgba(10, 31, 47, 0.94)";
        this.roundRect(ctx, pillX, pillY, pillWidth, pillHeight, 11);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 140, 42, 0.32)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 140, 42, 0.98)";
        ctx.font = layout.phone
          ? '900 11px "Aptos Display", "Segoe UI", sans-serif'
          : '900 12px "Aptos Display", "Segoe UI", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(`+${whole(referrals)}`, pillX + pillWidth / 2, pillY + pillHeight * 0.6);
        ctx.textAlign = "left";
        ctx.restore();
        return;
      }
      ctx.beginPath();
      ctx.strokeStyle = "rgba(107, 216, 255, 0.42)";
      ctx.lineWidth = 2.2;
      ctx.moveTo(card.x + 22, card.y + 28);
      ctx.lineTo(card.x + 36, card.y + 20);
      ctx.lineTo(card.x + 50, card.y + 31);
      ctx.stroke();
      [["#ff8a2a", 22, 28], ["#ffc173", 36, 20], ["#6bd8ff", 50, 31]].forEach(([color, dx, dy]) => {
        ctx.beginPath();
        ctx.fillStyle = "rgba(230, 238, 246, 0.94)";
        ctx.arc(card.x + dx, card.y + dy, 4.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(card.x + dx, card.y + dy, 4.3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
      ctx.font = '800 16px "Aptos Display", "Segoe UI", sans-serif';
      ctx.fillText("Referral loop", card.x + 68, card.y + 30);
      ctx.fillStyle = "rgba(127, 155, 179, 0.92)";
      ctx.font = '700 11px "Aptos", "Segoe UI", sans-serif';
      ctx.fillText("new leads generated", card.x + 68, card.y + 48);
      ctx.fillStyle = "rgba(10, 31, 47, 0.94)";
      this.roundRect(ctx, card.x + 18, card.y + card.height - 30, card.width - 36, 18, 9);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 140, 42, 0.32)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 140, 42, 0.98)";
      ctx.font = '900 13px "Aptos Display", "Segoe UI", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(`+${whole(referrals)} new leads`, card.x + card.width / 2, card.y + card.height - 18);
      ctx.textAlign = "left";
      ctx.restore();
    }

    cubicPoint(p0, p1, p2, p3, t) {
      const mt = 1 - t;
      return {
        x:
          mt * mt * mt * p0.x +
          3 * mt * mt * t * p1.x +
          3 * mt * t * t * p2.x +
          t * t * t * p3.x,
        y:
          mt * mt * mt * p0.y +
          3 * mt * mt * t * p1.y +
          3 * mt * t * t * p2.y +
          t * t * t * p3.y,
      };
    }

    quadraticPoint(p0, p1, p2, t) {
      const mt = 1 - t;
      return {
        x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
      };
    }

    roundRect(ctx, x, y, width, height, radius) {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + width, y, x + width, y + height, r);
      ctx.arcTo(x + width, y + height, x, y + height, r);
      ctx.arcTo(x, y + height, x, y, r);
      ctx.arcTo(x, y, x + width, y, r);
      ctx.closePath();
    }

    stageTone(stage) {
      return (
        {
          Awareness: { zone: "#36b8ff", mesh: "#74d9ff", accent: "#ff8a2a", pulse: "#54d5ff" },
          Interest: { zone: "#4cc7ff", mesh: "#92e4ff", accent: "#ff8a2a", pulse: "#67dcff" },
          Evaluation: { zone: "#76a8ff", mesh: "#9dc5ff", accent: "#ff9337", pulse: "#89b8ff" },
          Engagement: { zone: "#ff8c2a", mesh: "#ffc173", accent: "#ff8a2a", pulse: "#ff9734" },
          Action: { zone: "#ff7a1a", mesh: "#ffb16a", accent: "#ff7a1a", pulse: "#ff8a2a" },
          Retention: { zone: "#ffb55e", mesh: "#ffd89d", accent: "#ff9a38", pulse: "#ffc26d" },
          Lost: { zone: "#ff6f4d", mesh: "#ffae9d", accent: "#ff744c", pulse: "#ff6f4d" },
        }[stage] || { zone: "#74d9ff", mesh: "#9fdfff", accent: "#ff8a2a", pulse: "#74d9ff" }
      );
    }

    eventPulseColor(stage) {
      return this.stageTone(stage).pulse;
    }

    particleColor(stage, isReferral = false) {
      if (stage === "Lost") {
        return "#ffe4dc";
      }
      if (stage === "Retention") {
        return "#fff1d7";
      }
      if (isReferral && stage === "Awareness") {
        return "#ebfffb";
      }
      return "#eef6ff";
    }

    particleAccent(stage, isReferral = false) {
      if (stage === "Lost") {
        return "#ff744c";
      }
      if (stage === "Retention") {
        return "#ffb55e";
      }
      if (isReferral && stage === "Awareness") {
        return "#5de7d4";
      }
      return "#ff8a2a";
    }

    stageSizeMultiplier(stage, isReferral = false) {
      const base =
        {
          Awareness: 0.96,
          Interest: 0.99,
          Evaluation: 1.02,
          Engagement: 1.06,
          Action: 1.1,
          Retention: 1.16,
          Lost: 0.98,
        }[stage] || 1;
      return base + (isReferral ? 0.1 : 0);
    }

    alpha(hex, alphaValue) {
      const value = hex.replace("#", "");
      const bigint = Number.parseInt(value, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alphaValue})`;
    }
  }

  class FunnelSimWidget {
    constructor(root, options = {}) {
      this.root = root;
      this.queryConfig = hasWindow ? parseQueryConfig(window.location.search) : {};
      this.config = mergeConfig(DEFAULT_CONFIG, mergeConfig(this.queryConfig, options.config || {}));
      this.reducedMotion = hasWindow && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.engine = new FunnelSimulationEngine(this.config);
      this.baseSimMinutesPerSecond = this.config.simMinutesPerSecond;
      this.speedMultiplierIndex = 0;
      this.dom = this.mapDom();
      this.stageRenderer = new StageRenderer(this.dom.stageCanvas, this.reducedMotion);
      this.lastFrame = 0;
      this.accumulator = 0;
      this.metricsDirty = false;
      this.lastRenderedEventCount = -1;
      this.summaryDismissed = false;
      this.embedHeightRafId = 0;
      this.lastEmbedHeight = 0;
      this.embedHeightForceDispatch = false;
      this.embedHeightForceDispatchesRemaining = 0;
      this.boundFrame = (ts) => this.frame(ts);
      this.boundResize = () => this.handleResize();
      this.boundMessage = (event) => this.handleMessage(event);
      this.boundObservedResize = () => this.handleResize();
      this.boundEmbedHeightLoad = () => this.syncEmbedHeight(true);
      this.boundEmbedHeightPageShow = () => this.syncEmbedHeight(true);
      this.boundReadyStateChange = () => this.syncEmbedHeight(true);
      this.currentSnapshot = this.engine.getSnapshot();
      this.installEmbedMode();
      this.bindUi();
      this.bindEngine();
      if (this.reducedMotion) {
        this.engine.pause();
      }
      this.updateUi(true);
      this.handleResize();
      if (hasWindow) {
        window.addEventListener("resize", this.boundResize, { passive: true });
        window.addEventListener("message", this.boundMessage);
        if ("ResizeObserver" in window) {
          this.resizeObserver = new ResizeObserver(this.boundObservedResize);
          this.resizeObserver.observe(this.root);
          this.resizeObserver.observe(this.dom.stageShell);
        }
        if (this.embedded) {
          this.embedHeightForceDispatchesRemaining = 8;
          window.addEventListener("load", this.boundEmbedHeightLoad);
          window.addEventListener("pageshow", this.boundEmbedHeightPageShow);
          document.addEventListener("readystatechange", this.boundReadyStateChange);
          if ("MutationObserver" in window) {
            this.embedMutationObserver = new MutationObserver(() => this.syncEmbedHeight(true));
            this.embedMutationObserver.observe(this.root, {
              childList: true,
              subtree: true,
              attributes: true,
            });
          }
          if (document.fonts && typeof document.fonts.ready?.then === "function") {
            document.fonts.ready.then(() => this.syncEmbedHeight(true)).catch(() => {});
          }
          window.setTimeout(() => this.syncEmbedHeight(true), 60);
          window.setTimeout(() => this.syncEmbedHeight(true), 240);
          window.setTimeout(() => this.syncEmbedHeight(true), 900);
          window.setTimeout(() => this.syncEmbedHeight(true), 1800);
          this.syncEmbedHeight(true);
        }
        requestAnimationFrame(this.boundFrame);
      }
    }

    mapDom() {
      return {
        runToggleButton: byId(this.root, "runToggleButton"),
        speedSelect: byId(this.root, "speedSelect"),
        runStateLabel: byId(this.root, "runStateLabel"),
        clockLabel: byId(this.root, "clockLabel"),
        progressFill: byId(this.root, "progressFill"),
        stageShell: byId(this.root, "stageShell"),
        stageCanvas: byId(this.root, "stageCanvas"),
        inFunnelValue: byId(this.root, "inFunnelValue"),
        inFunnelNote: byId(this.root, "inFunnelNote"),
        qualificationValue: byId(this.root, "qualificationValue"),
        qualificationNote: byId(this.root, "qualificationNote"),
        closedValue: byId(this.root, "closedValue"),
        closedNote: byId(this.root, "closedNote"),
        referralValue: byId(this.root, "referralValue"),
        referralNote: byId(this.root, "referralNote"),
        seriesChart: byId(this.root, "seriesChart"),
        summaryBackdrop: byId(this.root, "summaryBackdrop"),
        summaryCloseButton: byId(this.root, "summaryCloseButton"),
        summaryTitle: byId(this.root, "summaryTitle"),
        summaryText: byId(this.root, "summaryText"),
        summaryRetention: byId(this.root, "summaryRetention"),
        summaryWon: byId(this.root, "summaryWon"),
        summaryLost: byId(this.root, "summaryLost"),
        summaryReferrals: byId(this.root, "summaryReferrals"),
        summaryFoot: byId(this.root, "summaryFoot"),
        ariaLive: byId(this.root, "ariaLive"),
      };
    }

    bindUi() {
      this.dom.runToggleButton.addEventListener("click", () => this.toggleRunState());
      this.dom.speedSelect.addEventListener("change", (event) => this.handleSpeedChange(event));
      this.dom.summaryCloseButton.addEventListener("click", () => this.closeSummary());
      this.dom.summaryBackdrop.addEventListener("click", (event) => {
        if (event.target === this.dom.summaryBackdrop) {
          this.closeSummary();
        }
      });
    }

    bindEngine() {
      this.engine.onEvent((event) => {
        this.metricsDirty = true;
        this.stageRenderer.pushEvent(event);
        this.announceEvent(event);
      });
    }

    announceEvent(event) {
      if (
        event.type === EVENT_TYPES.dealClosedWon ||
        event.type === EVENT_TYPES.dealClosedLost ||
        event.type === EVENT_TYPES.referralCreatedAwareness
      ) {
        const message =
          event.type === EVENT_TYPES.dealClosedWon
            ? "Won deal"
            : event.type === EVENT_TYPES.dealClosedLost
              ? "Lost lead"
              : "Referral added";
        this.dom.ariaLive.textContent = message;
      }
    }

    toggleRunState() {
      if (this.engine.completed) {
        this.closeSummary();
        this.engine = this.engine.reset();
        this.applySpeedMultiplier();
        this.summaryDismissed = false;
        this.lastRenderedEventCount = -1;
        this.metricsDirty = true;
        this.currentSnapshot = null;
        this.refreshSnapshot(true);
        this.stageRenderer.reset();
        this.bindEngine();
        this.engine.run();
        this.updateUi(true);
        this.syncEmbedHeight(true);
        return;
      }
      if (this.engine.running) {
        this.engine.pause();
      } else {
        this.engine.run();
      }
      this.updateUi(true);
      this.syncEmbedHeight(true);
    }

    handleSpeedChange(event) {
      const nextMultiplier = Number(event.target.value);
      const nextIndex = SPEED_OPTIONS.indexOf(nextMultiplier);
      if (nextIndex === -1) {
        return;
      }
      this.speedMultiplierIndex = nextIndex;
      this.applySpeedMultiplier();
      this.updateUi(true);
    }

    applySpeedMultiplier() {
      const multiplier = SPEED_OPTIONS[this.speedMultiplierIndex];
      const nextSpeed = this.baseSimMinutesPerSecond * multiplier;
      this.config.simMinutesPerSecond = nextSpeed;
      this.engine.config.simMinutesPerSecond = nextSpeed;
    }

    refreshSnapshot(forceFull = false) {
      if (forceFull || this.metricsDirty || !this.currentSnapshot) {
        this.currentSnapshot = this.engine.getSnapshot();
        this.metricsDirty = false;
        return;
      }
      this.currentSnapshot.simTime.tMin = round(this.engine.currentTimeMin, 2);
      this.currentSnapshot.simTime.day = formatSimDay(this.engine.currentTimeMin);
      this.currentSnapshot.completed = this.engine.completed;
    }

    closeSummary() {
      this.summaryDismissed = true;
      this.dom.summaryBackdrop.hidden = true;
      this.syncEmbedHeight(true);
    }

    showSummary() {
      const snapshot = this.currentSnapshot;
      const metrics = snapshot.metrics;
      const stageCounts = metrics.stageCounts;
      const headline =
        metrics.closed.won > metrics.closed.lost
          ? "More deals were won, and customers kept bringing in new leads."
          : "More leads were lost than won.";
      this.dom.summaryTitle.textContent = headline;
      this.dom.summaryText.textContent =
        `This run ended with ${whole(metrics.closed.won)} won deals, ${whole(metrics.closed.lost)} lost leads, ` +
        `and ${whole(metrics.referrals.awarenessFromReferrals)} new leads from referrals.`;
      this.dom.summaryRetention.textContent = whole(stageCounts.Retention);
      this.dom.summaryWon.textContent = whole(metrics.closed.won);
      this.dom.summaryLost.textContent = whole(metrics.closed.lost);
      this.dom.summaryReferrals.textContent = whole(metrics.referrals.awarenessFromReferrals);
      this.dom.summaryFoot.textContent =
        `First contact stayed within ${this.config.speedToLeadMaxMin} minutes. Close this and press Run to play the same run again.`;
      this.dom.summaryBackdrop.hidden = false;
      this.syncEmbedHeight(true);
    }

    updateUi(force = false) {
      const snapshot = this.currentSnapshot || this.engine.getSnapshot();
      const metrics = snapshot.metrics;
      const day = snapshot.simTime.day;
      const progress = clamp(snapshot.simTime.tMin / (this.config.runHorizonDays * 1440), 0, 1);
      const inFunnel = STAGES.reduce((sum, stage) => sum + metrics.stageCounts[stage], 0);
      const metricsChanged = force || this.lastRenderedEventCount !== snapshot.totalEvents;
      const runState = this.engine.completed ? "Finished" : this.engine.running ? "Running" : "Paused";
      const runLabel = this.engine.completed ? "Run" : this.engine.running ? "Pause" : "Run";
      setNodeText(this.dom.runStateLabel, runState);
      setNodeText(this.dom.runToggleButton, runLabel);
      this.dom.runToggleButton.setAttribute("aria-pressed", String(this.engine.running));
      const speedValue = String(SPEED_OPTIONS[this.speedMultiplierIndex]);
      if (this.dom.speedSelect.value !== speedValue) {
        this.dom.speedSelect.value = speedValue;
      }
      setNodeText(this.dom.clockLabel, `Day ${day.toFixed(1)} / ${this.config.runHorizonDays}`);
      setNodeWidth(this.dom.progressFill, `${(progress * 100).toFixed(2)}%`);
      if (metricsChanged) {
        setNodeText(this.dom.inFunnelValue, whole(inFunnel));
        setNodeText(
          this.dom.inFunnelNote,
          `${whole(metrics.stageCounts.Awareness)} at the start, ${whole(metrics.stageCounts.Retention)} kept as customers`
        );
        setNodeText(this.dom.qualificationValue, pct(metrics.qualification.passRate));
        setNodeText(
          this.dom.qualificationNote,
          `${whole(metrics.qualification.qualifiedCount)} good fit / ${whole(metrics.qualification.disqualifiedCount)} not a fit`
        );
        setNodeText(this.dom.closedValue, `${whole(metrics.closed.won)} won / ${whole(metrics.closed.lost)} lost`);
        setNodeText(
          this.dom.closedNote,
          metrics.closed.lost > metrics.closed.won ? "More are being lost right now" : "Won and lost are close right now"
        );
        setNodeText(this.dom.referralValue, whole(metrics.referrals.generated));
        setNodeText(this.dom.referralNote, `${whole(metrics.referrals.awarenessFromReferrals)} new leads from referrals`);
        this.renderSeries(snapshot.series);
        this.lastRenderedEventCount = snapshot.totalEvents;
      }
      this.stageRenderer.draw(snapshot);
      if (this.engine.completed && !this.summaryDismissed && this.dom.summaryBackdrop.hidden) {
        this.showSummary();
      }
      if (force || metricsChanged) {
        this.syncEmbedHeight();
      }
    }

    renderSeries(series) {
      const width = 360;
      const height = 200;
      const padding = { top: 18, right: 12, bottom: 52, left: 38 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
      const maxValue = Math.max(1, ...series.flatMap((bucket) => SERIES_KEYS.map((key) => bucket[key] || 0)));
      const barWidth = chartWidth / series.length;
      let svg = `<rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="rgba(244,249,253,0.96)"></rect>`;
      for (let tick = 0; tick <= 4; tick += 1) {
        const y = padding.top + (chartHeight / 4) * tick;
        const value = Math.round((maxValue * (4 - tick)) / 4);
        svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(117,151,173,0.12)" stroke-width="1" />`;
        svg += `<text x="${padding.left - 8}" y="${y + 4}" fill="rgba(103,127,145,0.9)" text-anchor="end" font-size="10" font-family="Aptos, Segoe UI, sans-serif">${whole(value)}</text>`;
      }
      svg += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="rgba(117,151,173,0.14)" stroke-width="1" />`;
      svg += `<polyline fill="none" stroke="#56bb81" stroke-width="2.5" points="${series.map((bucket, index) => {
        const x = padding.left + barWidth * index + barWidth * 0.5;
        const y = padding.top + chartHeight - (bucket.closedWon / maxValue) * chartHeight;
        return `${x},${y}`;
      }).join(" ")}" />`;
      series.forEach((bucket, index) => {
        const x = padding.left + barWidth * index + barWidth * 0.18;
        const lostHeight = (bucket.closedLost / maxValue) * chartHeight;
        const wonY = padding.top + chartHeight - (bucket.closedWon / maxValue) * chartHeight;
        const referralY = padding.top + chartHeight - (bucket.fromReferrals / maxValue) * chartHeight;
        svg += `
          <rect x="${x}" y="${padding.top + chartHeight - lostHeight}" width="${Math.max(12, barWidth * 0.44)}" height="${lostHeight}" rx="8" fill="rgba(217,117,97,0.42)"></rect>
          <circle cx="${padding.left + barWidth * index + barWidth * 0.5}" cy="${wonY}" r="4" fill="#56bb81"></circle>
          <circle cx="${padding.left + barWidth * index + barWidth * 0.5}" cy="${referralY}" r="3.4" fill="#f2c36a"></circle>
          <text x="${padding.left + barWidth * index + barWidth * 0.5}" y="${height - 28}" fill="rgba(103,127,145,0.86)" text-anchor="middle" font-size="11" font-family="Aptos, Segoe UI, sans-serif">D${bucket.day}</text>
        `;
      });
      svg += `
        <rect x="58" y="${height - 12}" width="12" height="12" rx="4" fill="rgba(217,117,97,0.42)"></rect>
        <text x="76" y="${height - 2}" fill="rgba(103,127,145,0.92)" font-size="11" font-family="Aptos, Segoe UI, sans-serif">Lost</text>
        <line x1="144" y1="${height - 6}" x2="160" y2="${height - 6}" stroke="#56bb81" stroke-width="2.5" stroke-linecap="round"></line>
        <circle cx="152" cy="${height - 6}" r="3.8" fill="#56bb81"></circle>
        <text x="168" y="${height - 2}" fill="rgba(103,127,145,0.92)" font-size="11" font-family="Aptos, Segoe UI, sans-serif">Won</text>
        <circle cx="238" cy="${height - 6}" r="4" fill="#f2c36a"></circle>
        <text x="250" y="${height - 2}" fill="rgba(103,127,145,0.92)" font-size="11" font-family="Aptos, Segoe UI, sans-serif">Referrals</text>
      `;
      setNodeMarkup(this.dom.seriesChart, svg);
    }

    frame(timestamp) {
      if (!this.lastFrame) {
        this.lastFrame = timestamp;
      }
      const delta = Math.min(120, timestamp - this.lastFrame);
      this.lastFrame = timestamp;
      let advanced = false;
      if (this.engine.running) {
        this.accumulator += delta;
        while (this.accumulator >= this.config.fixedStepMs) {
          this.engine.tick(this.config.fixedStepMs);
          this.accumulator -= this.config.fixedStepMs;
          advanced = true;
        }
      }
      if (advanced) {
        this.refreshSnapshot();
      }
      this.updateUi();
      if (hasWindow) {
        requestAnimationFrame(this.boundFrame);
      }
    }

    handleResize() {
      const rect = this.dom.stageShell.getBoundingClientRect();
      this.stageRenderer.resize(rect.width, rect.height);
      this.stageRenderer.draw(this.currentSnapshot);
      this.syncEmbedHeight();
    }

    installEmbedMode() {
      if (!hasWindow) {
        return;
      }
      const search = new URLSearchParams(window.location.search);
      const embedMode =
        window.parent !== window ||
        search.get("embed") === "1" ||
        search.get("embedMode") === "1" ||
        window.location.hash === "#embed";
      if (embedMode) {
        document.documentElement.classList.add("embed-mode");
        document.body.classList.add("embed-mode");
      }
      this.embedded = embedMode;
    }

    syncEmbedHeight(force = false) {
      if (!hasWindow || !this.embedded) {
        return;
      }
      if (force) {
        this.embedHeightForceDispatch = true;
      }
      if (this.embedHeightRafId) {
        return;
      }
      this.embedHeightRafId = window.requestAnimationFrame(() => {
        this.embedHeightRafId = 0;
        const doc = document.documentElement;
        const body = document.body;
        const rootStyles = getComputedStyle(this.root);
        const rootHeight = Math.ceil(
          this.root.getBoundingClientRect().height +
            (parseFloat(rootStyles.marginTop) || 0) +
            (parseFloat(rootStyles.marginBottom) || 0)
        );
        const docHeight = Math.max(
          rootHeight,
          doc?.scrollHeight || 0,
          doc?.offsetHeight || 0,
          body?.scrollHeight || 0,
          body?.offsetHeight || 0,
          Math.ceil(body?.getBoundingClientRect().height || 0)
        );
        const height = Math.max(1, Math.ceil(docHeight));
        const shouldForceDispatch = this.embedHeightForceDispatch || this.embedHeightForceDispatchesRemaining > 0;
        this.embedHeightForceDispatch = false;
        if (!shouldForceDispatch && Math.abs(height - this.lastEmbedHeight) < 1) {
          return;
        }
        this.lastEmbedHeight = height;
        if (this.embedHeightForceDispatchesRemaining > 0) {
          this.embedHeightForceDispatchesRemaining -= 1;
        }
        if (doc) {
          doc.style.minHeight = `${height}px`;
        }
        if (body) {
          body.style.minHeight = `${height}px`;
        }
        try {
          const frame = window.frameElement;
          if (frame) {
            frame.style.height = `${height}px`;
            frame.setAttribute("height", String(height));
          }
        } catch (_) {}
        try {
          window.parent?.postMessage({ type: "funnelSim.height", value: height }, "*");
          window.parent?.postMessage({ type: "widget:resize", widget: EMBED_WIDGET_ID, height }, "*");
          window.parent?.postMessage({ type: `${EMBED_WIDGET_ID}:height`, height }, "*");
          window.parent?.postMessage(
            { type: "simfluence-widget:resize", widget: EMBED_WIDGET_ID, height, mode: "default" },
            "*"
          );
        } catch (_) {}
      });
    }

    handleMessage(event) {
      const type = event?.data?.type;
      if (
        type === "funnelSim.requestHeight" ||
        type === "funnelSim.resize" ||
        type === "simfluence:request-height" ||
        type === "simfluence-widget:request-height" ||
        type === "simfluence:request-resize" ||
        type === "simfluence-widget:request-resize" ||
        type === "widget:request-height" ||
        type === "widget:request-resize" ||
        type === `${EMBED_WIDGET_ID}:request-height`
      ) {
        this.syncEmbedHeight(true);
      }
    }

    destroy() {
      if (hasWindow) {
        window.removeEventListener("resize", this.boundResize);
        window.removeEventListener("message", this.boundMessage);
        window.removeEventListener("load", this.boundEmbedHeightLoad);
        window.removeEventListener("pageshow", this.boundEmbedHeightPageShow);
        document.removeEventListener("readystatechange", this.boundReadyStateChange);
      }
      if (this.embedHeightRafId) {
        window.cancelAnimationFrame(this.embedHeightRafId);
        this.embedHeightRafId = 0;
      }
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      if (this.embedMutationObserver) {
        this.embedMutationObserver.disconnect();
      }
    }

    getSnapshot() {
      return this.engine.getSnapshot();
    }

    run() {
      if (this.engine.completed) {
        this.toggleRunState();
      } else if (!this.engine.running) {
        this.engine.run();
        this.updateUi(true);
      }
    }

    pause() {
      this.engine.pause();
      this.updateUi(true);
    }

    export(format) {
      return this.engine.export(format);
    }
  }

  function parseQueryConfig(search) {
    if (!search) {
      return {};
    }
    const params = new URLSearchParams(search);
    let config = {};
    if (params.get("config")) {
      try {
        config = mergeConfig(config, JSON.parse(params.get("config")));
      } catch (error) {
        console.warn("Unable to parse config query parameter", error);
      }
    }
    const scalarKeys = [
      "seed",
      "simMinutesPerSecond",
      "runHorizonDays",
      "newAwarenessPerDay",
      "p_awareness_to_interest",
      "p_interest_to_evaluation",
      "p_evaluation_qualified",
      "p_engagement_to_action",
      "p_action_closed_won",
      "p_retention_generates_referral",
      "speedToLeadMaxMin",
    ];
    scalarKeys.forEach((key) => {
      if (params.has(key)) {
        config[key] = normalizeNumber(params.get(key), DEFAULT_CONFIG[key]);
      }
    });
    return config;
  }

  function mount(element, options = {}) {
    return new FunnelSimWidget(element, options);
  }

  function runDeterminismTest(config = {}) {
    const merged = mergeConfig(DEFAULT_CONFIG, config);
    const first = new FunnelSimulationEngine(merged);
    const second = new FunnelSimulationEngine(merged);
    while (!first.completed) {
      first.tick(merged.fixedStepMs);
    }
    while (!second.completed) {
      second.tick(merged.fixedStepMs);
    }
    const firstSnapshot = first.getSnapshot();
    const secondSnapshot = second.getSnapshot();
    return {
      eventsEqual: JSON.stringify(first.events) === JSON.stringify(second.events),
      seriesEqual: JSON.stringify(firstSnapshot.series) === JSON.stringify(secondSnapshot.series),
      snapshotEqual: JSON.stringify(firstSnapshot) === JSON.stringify(secondSnapshot),
      firstSnapshot,
      secondSnapshot,
    };
  }

  const api = {
    mount,
    defaults: deepClone(DEFAULT_CONFIG),
    FunnelSimulationEngine,
    runDeterminismTest,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.FunnelSim = api;

  if (hasWindow) {
    const root = document.getElementById("widgetRoot");
    if (root) {
      global.funnelSimWidget = mount(root);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
