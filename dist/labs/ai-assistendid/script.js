(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const ui = {
    widget: $("#aiWidget"),
    modelButtons: $$(".model-button"),
    anatomyAssistantMark: $("#anatomyAssistantMark"),
    anatomyAssistantName: $("#anatomyAssistantName"),
    modelDifferenceText: $("#modelDifferenceText"),
    simpleLane: $("#simpleLane"),
    complexLane: $("#complexLane"),
    taskTabs: $$(".task-tab"),
    scenarioList: $("#scenarioList"),
    complexityBadge: $("#complexityBadge"),
    ingredientList: $("#ingredientList"),
    phaseMap: $("#phaseMap"),
    stageRouteLabel: $("#stageRouteLabel"),
    journeyTitle: $("#journeyTitle"),
    stageQuestion: $("#stageQuestion"),
    phaseNumber: $("#phaseNumber"),
    phaseStatus: $("#phaseStatus"),
    visualStage: $("#visualStage"),
    watchForText: $("#watchForText"),
    replaySceneButton: $("#replaySceneButton"),
    plainTitle: $("#plainTitle"),
    plainBody: $("#plainBody"),
    analogyText: $("#analogyText"),
    technicalTitle: $("#technicalTitle"),
    technicalBody: $("#technicalBody"),
    mythText: $("#mythText")
  };

  const models = {
    chatgpt: {
      name: "ChatGPT",
      mark: "O",
      difference: "OpenAI decides which model, memory behavior, tools, safety layers, and interface features make up each ChatGPT experience."
    },
    claude: {
      name: "Claude",
      mark: "A",
      difference: "Anthropic decides which Claude model, context handling, tool connections, safety layers, and interface features make up each Claude experience."
    },
    gemini: {
      name: "Gemini",
      mark: "G",
      difference: "Google decides which Gemini model, multimodal handling, connected services, safety layers, and interface features make up each Gemini experience."
    }
  };

  const scenarios = {
    explain: {
      id: "explain",
      complexity: "simple",
      icon: "?",
      name: "Explain an idea",
      subtitle: "Use the language model's learned patterns",
      prompt: "Explain why the sky is blue to a 10-year-old.",
      response: "Sunlight looks white, but it contains every color of the rainbow. When sunlight enters Earth's atmosphere, tiny air molecules scatter blue light more strongly than red light. That scattered blue light reaches your eyes from every direction, so the sky looks blue.",
      tool: null,
      toolResult: null,
      cycles: 1,
      context: ["Product instructions", "Your request", "Conversation"],
      ingredients: [
        { label: "Your prompt", kind: "prompt" },
        { label: "Behavior rules", kind: "rule" },
        { label: "Chat context", kind: "chat" }
      ],
      workLog: [
        { title: "Receive the request", detail: "Read the audience and goal", phase: 0 },
        { title: "Connect the clues", detail: "Relate sky, light, and age level", phase: 2 },
        { title: "Draft the explanation", detail: "Choose a simple analogy and wording", phase: 5 },
        { title: "Deliver the answer", detail: "Stream the result to the chat", phase: 5 }
      ],
    },
    email: {
      id: "email",
      complexity: "simple",
      icon: "@",
      name: "Write an email",
      subtitle: "Follow instructions for tone and format",
      prompt: "Write a polite email asking Maya if Friday's deadline is still realistic.",
      response: "Subject: Friday deadline check-in\n\nHi Maya,\n\nI wanted to check whether Friday's deadline still feels realistic. Please let me know if anything has changed or if I can help remove a blocker.\n\nBest,\nAlex",
      tool: null,
      toolResult: null,
      cycles: 1,
      context: ["Product instructions", "Your request", "Requested tone"],
      ingredients: [
        { label: "Your prompt", kind: "prompt" },
        { label: "Polite tone", kind: "rule" },
        { label: "Email format", kind: "chat" }
      ],
      workLog: [
        { title: "Read the request", detail: "Identify recipient, goal, and tone", phase: 0 },
        { title: "Shape the message", detail: "Choose a polite direct structure", phase: 2 },
        { title: "Draft the email", detail: "Generate subject and body", phase: 5 },
        { title: "Deliver the answer", detail: "Stream the finished draft", phase: 5 }
      ],
    },
    calculate: {
      id: "calculate",
      complexity: "simple",
      icon: "#",
      name: "Calculate a total",
      subtitle: "Call a calculator for exact math",
      prompt: "Calculate an 18% tip on a $74.50 restaurant bill and give me the total.",
      response: "An 18% tip on $74.50 is $13.41. Add that to the bill and the total is $87.91.",
      tool: "Calculator",
      toolResult: "$74.50 x 0.18 = $13.41; total = $87.91",
      cycles: 2,
      context: ["Product instructions", "Your request", "Calculator result"],
      ingredients: [
        { label: "Your prompt", kind: "prompt" },
        { label: "Calculator", kind: "tool" },
        { label: "Tool result", kind: "tool" }
      ],
      workLog: [
        { title: "Read the numbers", detail: "Identify bill, percentage, and goal", phase: 0 },
        { title: "Choose calculator", detail: "Ask an exact math tool", phase: 3 },
        { title: "Receive result", detail: "$13.41 tip and $87.91 total", phase: 4 },
        { title: "Explain clearly", detail: "Turn the result into a useful reply", phase: 5 }
      ],
    },
    research: {
      id: "research",
      complexity: "complex",
      icon: "W",
      name: "Research a purchase",
      subtitle: "Use web search to compare current sources",
      prompt: "Compare three reliable heat-pump dryers for a small apartment, using current information. Explain the trade-offs and recommend one.",
      response: "For a small apartment, the strongest choice is the compact model with the lowest measured noise and a reversible door. The lowest-cost option saves money upfront but has a longer cycle, while the premium option is faster and better connected. Before buying, verify local availability, dimensions, warranty terms, and the latest energy label.",
      tool: "Web search",
      toolResult: "Current product pages, dimensions, energy labels, warranty details, and independent reviews",
      cycles: 4,
      context: ["Product instructions", "Your criteria", "Search results", "Source notes"],
      ingredients: [
        { label: "Your criteria", kind: "prompt" },
        { label: "Live web search", kind: "tool" },
        { label: "Several sources", kind: "file" },
        { label: "Comparison table", kind: "chat" }
      ],
      workLog: [
        { title: "Turn request into criteria", detail: "Size, reliability, noise, and value", phase: 0 },
        { title: "Search current sources", detail: "Find product and review evidence", phase: 3 },
        { title: "Compare evidence", detail: "Normalize claims and trade-offs", phase: 4 },
        { title: "Check recommendation", detail: "Keep uncertainty and caveats visible", phase: 4 },
        { title: "Write the decision brief", detail: "Explain the winner and alternatives", phase: 5 }
      ],
    },
    report: {
      id: "report",
      complexity: "complex",
      icon: "F",
      name: "Analyze a report",
      subtitle: "Read files, calculate trends, and summarize",
      prompt: "Review the uploaded quarterly sales report, calculate the main changes, identify risks, and draft a one-page executive summary.",
      response: "The quarter shows growth concentrated in two product lines, while renewal performance weakened in the smallest customer segment. The main risk is that headline revenue growth hides a slower repeat-purchase rate. The executive summary should lead with the growth drivers, quantify the retention gap, and assign owners to the three follow-up actions.",
      tool: "File reader + calculator",
      toolResult: "Parsed tables, quarter-over-quarter changes, segment totals, and flagged anomalies",
      cycles: 4,
      context: ["Product instructions", "Your request", "Uploaded report", "Calculated trends"],
      ingredients: [
        { label: "Your prompt", kind: "prompt" },
        { label: "Uploaded report", kind: "file" },
        { label: "File reader", kind: "tool" },
        { label: "Calculator", kind: "tool" }
      ],
      workLog: [
        { title: "Understand the deliverable", detail: "Metrics, risks, and one-page format", phase: 0 },
        { title: "Read the report", detail: "Extract tables and relevant sections", phase: 3 },
        { title: "Calculate changes", detail: "Compare periods and segments", phase: 4 },
        { title: "Check for contradictions", detail: "Test headline against underlying data", phase: 4 },
        { title: "Draft executive summary", detail: "Prioritize decisions and next actions", phase: 5 }
      ],
    },
    trip: {
      id: "trip",
      complexity: "complex",
      icon: "P",
      name: "Plan a trip",
      subtitle: "Combine constraints, web search, and maps",
      prompt: "Plan a three-day Tallinn trip for two adults under EUR 700, with quiet hotels, vegetarian food, and minimal travel between activities.",
      response: "Use a compact city-center base so most activities stay walkable. Reserve one day for the Old Town and museums, one for Kalamaja and Telliskivi, and one flexible day for Kadriorg. Keep a budget buffer for weather changes, confirm current opening hours and hotel prices, and book the highest-constraint items first.",
      tool: "Web search + maps",
      toolResult: "Current hotel prices, opening hours, travel distances, restaurant options, and route estimates",
      cycles: 5,
      context: ["Product instructions", "Budget and preferences", "Search results", "Map distances", "Draft itinerary"],
      ingredients: [
        { label: "Budget + preferences", kind: "prompt" },
        { label: "Live search", kind: "tool" },
        { label: "Maps", kind: "tool" },
        { label: "Draft itinerary", kind: "chat" }
      ],
      workLog: [
        { title: "Extract constraints", detail: "Budget, food, quietness, and travel", phase: 0 },
        { title: "Find current options", detail: "Search hotels, hours, and restaurants", phase: 3 },
        { title: "Build a route", detail: "Cluster nearby activities", phase: 4 },
        { title: "Check the budget", detail: "Estimate costs and preserve a buffer", phase: 4 },
        { title: "Revise weak spots", detail: "Replace conflicts or over-budget choices", phase: 4 },
        { title: "Present the itinerary", detail: "Make the plan easy to follow", phase: 5 }
      ],
    }
  };

  const sceneDefinitions = [
    {
      short: "Load context",
      sub: "Build the context window",
      title: "Build the AI context window",
      question: "What information does the assistant have for this request?",
      watch: "The AI assistant can only use information that reaches its context window.",
      plainTitle: "It gathers the context for the task",
      plainBody: "The AI product combines your request with higher-priority instructions and useful conversation history. Files, images, saved memory, or retrieved data may be added when the feature is available.",
      analogy: "A desk being prepared with the right brief, rules, and reference pages.",
      technicalTitle: "This workspace is called the AI context window",
      technicalBody: "Context is supplied for this task. Training happened earlier and stored broad patterns in the model's learned weights. Context and training are not the same thing.",
      myth: "The assistant does not automatically remember every past chat or search the entire internet."
    },
    {
      short: "Encode input",
      sub: "Create tokens and embeddings",
      title: "Turn the prompt into tokens and embeddings",
      question: "How does a prompt, and sometimes other media, become something the AI model can process?",
      watch: "Tokens are processing pieces, not necessarily complete words.",
      plainTitle: "The AI model splits the prompt into tokens",
      plainBody: "Text is split into tokens. Each token is mapped to a long list of numbers that represents learned features. Images and audio use their own model-readable representations.",
      analogy: "Turning a sentence into labeled puzzle pieces, then giving every piece coordinates on a meaning map.",
      technicalTitle: "The numbers are called embeddings",
      technicalBody: "An embedding does not store a dictionary definition. It places learned features into a mathematical space where the transformer can combine relationships.",
      myth: "The model does not read letters and words exactly as a human does."
    },
    {
      short: "Connect clues",
      sub: "Transformer layers",
      title: "Use transformer layers to connect the clues",
      question: "Which parts of the request matter to each other right now?",
      watch: "Attention changes each token using relevant information from other tokens.",
      plainTitle: "It repeatedly connects related clues",
      plainBody: "Many layers in the transformer neural network mix information across the input. Words gain different meaning from their surroundings, instructions affect the requested output, and earlier details can shape later ones.",
      analogy: "A team of editors passing notes about which details matter for this exact sentence.",
      technicalTitle: "Attention is a learned weighting operation",
      technicalBody: "The visual network is a metaphor. Real models perform large parallel matrix operations across many layers and learned parameters.",
      myth: "Fluent output can resemble human thought, but the mechanism is learned numerical pattern processing."
    },
    {
      short: "Choose route",
      sub: "Answer, ask, or use a tool",
      title: "Choose whether to answer, ask, or use an AI tool",
      question: "Can the model answer now, or does the product need more information or an outside capability?",
      watch: "Tools are separate capabilities. The model requests them; another system executes them.",
      plainTitle: "The assistant may answer, ask, or use a tool",
      plainBody: "A straightforward language task can continue directly. A current, exact, file-based, or action-oriented task may need search, a calculator, code, an app, or a clarifying question.",
      analogy: "A worker deciding whether to write now, ask you a question, or reach for the right instrument.",
      technicalTitle: "AI tool use creates a structured request and response",
      technicalBody: "The model can emit a tool call. The application or provider runs that tool and returns the result to the model as new context.",
      myth: "The language model itself is not automatically a browser, calculator, database, or operating system."
    },
    {
      short: "Do the work",
      sub: "Run a multi-step workflow",
      title: "Run a multi-step AI task loop",
      question: "How does a complex task become several coordinated steps instead of one guess?",
      watch: "Complexity comes from repeated model-and-tool turns, not from one magical answer step.",
      plainTitle: "Complex tasks create a work loop",
      plainBody: "The product can alternate between model output, AI tool results, checks, and revisions. Each result becomes new context for the next cycle until the task is ready to present.",
      analogy: "Researching, checking notes, revising the draft, and repeating until the deliverable holds together.",
      technicalTitle: "Complex AI tasks use orchestration and repeated inference",
      technicalBody: "Products may use an AI agent loop, workflow code, several models, or human approval. The exact orchestration differs by product and task.",
      myth: "A complex answer is not proof that the model worked independently or verified every claim."
    },
    {
      short: "Build result",
      sub: "Generate one token at a time",
      title: "Generate the answer one token at a time",
      question: "How does the final response appear, and what still needs checking?",
      watch: "The visible answer is assembled sequentially, while product checks may wrap around it.",
      plainTitle: "The answer appears piece by piece",
      plainBody: "The model scores possible next tokens, selects one, adds it to the growing response, and repeats. The product streams those pieces to you and may apply formatting, citations, or safety checks.",
      analogy: "Very powerful autocomplete that rereads the working context after every new piece.",
      technicalTitle: "AI text generation is probabilistic, not database retrieval",
      technicalBody: "Settings and model behavior shape which likely token is selected. The same prompt can produce different wording, even when the broad answer stays similar.",
      myth: "There was no complete paragraph hidden inside the model waiting to be copied out."
    }
  ];

  const state = {
    model: "chatgpt",
    filter: "simple",
    scenarioId: "explain",
    phase: 0,
    generatedCount: 0,
    outputMatches: [],
    sceneKey: 0
  };

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const currentScenario = () => scenarios[state.scenarioId];

  function tokenPieces(text) {
    const raw = text.match(/[A-Za-z0-9$%EUR]+(?:['.,-][A-Za-z0-9]+)*|[^\sA-Za-z0-9]/g) || [];
    const pieces = [];
    raw.forEach((piece) => {
      if (/^[A-Za-z]{11,}$/.test(piece)) {
        const split = Math.ceil(piece.length * .58);
        pieces.push(piece.slice(0, split), "##" + piece.slice(split));
      } else pieces.push(piece);
    });
    return pieces;
  }

  function prepareOutput() {
    state.outputMatches = [...currentScenario().response.matchAll(/\n+|\S+/g)];
    state.generatedCount = 0;
  }

  function outputText(count = state.generatedCount) {
    if (!count || !state.outputMatches.length) return "";
    const match = state.outputMatches[Math.min(count, state.outputMatches.length) - 1];
    return currentScenario().response.slice(0, match.index + match[0].length);
  }

  function candidates() {
    const nextIndex = clamp(state.generatedCount, 0, Math.max(0, state.outputMatches.length - 1));
    const next = (state.outputMatches[nextIndex]?.[0] || "done").replace(/\n/g, "new line");
    const alternatives = ["the", "a", "because", "first", "however", "you", "this", "check"].filter((word) => word !== next.toLowerCase());
    const offset = (nextIndex * 3 + state.sceneKey) % alternatives.length;
    const spread = .45;
    const top = Math.round(80 - spread * 34);
    const second = Math.round(11 + spread * 11);
    const third = Math.round(6 + spread * 8);
    return [
      { text: next.length > 15 ? next.slice(0, 14) + "..." : next, value: top },
      { text: alternatives[offset], value: second },
      { text: alternatives[(offset + 2) % alternatives.length], value: third },
      { text: alternatives[(offset + 5) % alternatives.length], value: Math.max(1, 100 - top - second - third) }
    ];
  }

  function renderScenarios() {
    const visible = Object.values(scenarios).filter((scenario) => scenario.complexity === state.filter);
    ui.scenarioList.innerHTML = visible.map((scenario) => {
      const selected = scenario.id === state.scenarioId;
      return `
      <button class="scenario-button ${selected ? "is-active" : ""}" type="button" data-scenario="${scenario.id}" data-complexity="${scenario.complexity}" aria-label="${selected ? "Selected task" : "Choose task"}: ${escapeHtml(scenario.name)}" aria-pressed="${selected}">
        <span class="scenario-icon" aria-hidden="true">${scenario.icon}</span>
        <span class="scenario-copy"><strong>${scenario.name}</strong><small>${scenario.subtitle}</small></span>
        <span class="scenario-action" aria-hidden="true"><small>${selected ? "Selected" : "Choose"}</small><i></i></span>
      </button>
    `;
    }).join("");

    $$(".scenario-button").forEach((button) => {
      button.addEventListener("click", () => selectScenario(button.dataset.scenario, true));
    });
    bindArrowNavigation($$(".scenario-button"));
  }

  function renderPhaseMap() {
    ui.phaseMap.innerHTML = sceneDefinitions.map((scene, index) => `
      <button class="phase-button ${index === state.phase ? "is-active" : ""} ${index === 4 && currentScenario().complexity === "simple" ? "is-optional" : ""}" type="button" data-phase="${index}" aria-controls="visualStage" aria-label="${index === state.phase ? "Currently viewing" : "View"} scene ${index + 1}: ${escapeHtml(scene.title)}" ${index === state.phase ? 'aria-current="step"' : ""}>
        <span>${String(index + 1).padStart(2, "0")}</span><strong>${scene.short}</strong><small>${scene.sub}</small><i class="phase-action" aria-hidden="true">${index === state.phase ? "Viewing" : "View"}</i>
      </button>
    `).join("");

    $$(".phase-button").forEach((button) => {
      button.addEventListener("click", () => {
        setPhase(Number(button.dataset.phase), true);
      });
    });
    bindArrowNavigation($$(".phase-button"));
  }

  function bindArrowNavigation(buttons) {
    buttons.forEach((button, index) => {
      button.addEventListener("keydown", (event) => {
        const previous = event.key === "ArrowLeft" || event.key === "ArrowUp";
        const next = event.key === "ArrowRight" || event.key === "ArrowDown";
        if (!previous && !next && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        const targetIndex = event.key === "Home"
          ? 0
          : event.key === "End"
            ? buttons.length - 1
            : (index + (previous ? -1 : 1) + buttons.length) % buttons.length;
        buttons[targetIndex].focus();
        buttons[targetIndex].click();
      });
    });
  }

  function renderIngredients() {
    const scenario = currentScenario();
    ui.ingredientList.innerHTML = scenario.ingredients.map((item) => `
      <span class="ingredient-chip ${item.kind === "tool" ? "is-tool" : ""} ${item.kind === "file" ? "is-file" : ""}"><i></i>${escapeHtml(item.label)}</span>
    `).join("");
    ui.complexityBadge.textContent = scenario.complexity === "complex" ? "Complex loop" : scenario.tool ? "Simple + tool" : "Simple";
  }

  function routeStoryData(scenario) {
    if (scenario.complexity === "complex") {
      return { kind: "complex" };
    }

    if (scenario.tool) {
      return { kind: "tool" };
    }

    return { kind: "direct" };
  }

  function contextScene() {
    const scenario = currentScenario();
    const cards = [
      { icon: "R", title: "Product rules", detail: "Behavior, safety, and task instructions", color: "#5856e8", status: "Highest priority" },
      { icon: "U", title: "Your request", detail: scenario.prompt, color: "#a36cf5", status: "Required" },
      { icon: "H", title: "Useful history", detail: "Relevant conversation and preferences", color: "#25c1c4", status: "When relevant" }
    ];
    if (scenario.ingredients.some((item) => item.kind === "file")) cards.push({ icon: "F", title: "Attached material", detail: "The report or source files supplied for this task", color: "#25c1c4", status: "Task source" });
    const fill = Math.min(84, 30 + cards.length * 11);
    return `
      <div class="scene context-scene ${cards.length > 3 ? "has-many-inputs" : ""}" data-scene-key="${state.sceneKey}">
        <section class="context-inputs">
          <div class="scene-panel-head"><span class="scene-label">Available inputs</span><strong>Not everything is used</strong></div>
          ${cards.map((card, index) => `<article class="input-card" style="--delay:${index * .09}s;--card-color:${card.color}"><i>${card.icon}</i><div><strong>${card.title}</strong><small>${escapeHtml(card.detail)}</small></div><b>${card.status}</b></article>`).join("")}
        </section>
        <div class="context-funnel">
          <span class="scene-label">Select + order</span>
          <div class="context-filter"><i></i><b>1</b><small>Follow priority</small></div>
          <div class="context-filter"><i></i><b>2</b><small>Keep useful material</small></div>
          <span class="flow-arrow"></span>
        </div>
        <article class="context-window">
          <div class="context-window__head"><div><span class="scene-label">Context window</span><div class="scene-title">The package sent into the model</div></div><b><i></i> Ready for this turn</b></div>
          <div class="context-stack">
            ${scenario.context.map((item, index) => `<div class="context-band" style="--delay:${.25 + index * .1}s;--band-color:${["#5856e8", "#a36cf5", "#25c1c4", "#ff9a52", "#2fb77f"][index % 5]}"><span>Priority ${index + 1}</span><strong>${escapeHtml(item)}</strong><i>included</i></div>`).join("")}
          </div>
          <div class="context-capacity"><span>Illustrative context use</span><strong>${fill}%</strong></div><div class="context-meter"><i style="--fill:${fill}%"></i></div>
          <div class="context-takeaway"><i>!</i><span><strong>The model sees this temporary package.</strong><small>It does not automatically see every chat, file, or website.</small></span></div>
        </article>
      </div>`;
  }

  function tokenScene() {
    const prompt = currentScenario().prompt;
    const tokens = tokenPieces(prompt).slice(0, 16);
    const colors = ["#5856e8", "#25c1c4", "#a36cf5", "#ff9a52", "#2fb77f"];
    const tokenId = (token, index) => 1000 + ([...token].reduce((sum, char) => sum + char.charCodeAt(0), 0) * 17 + index * 97) % 8000;
    return `
      <div class="scene token-scene" data-scene-key="${state.sceneKey}">
        <div class="token-request"><span class="scene-label">1. Start with the request</span><div class="token-sentence"><strong>You:</strong> ${escapeHtml(prompt)}</div></div>
        <div class="token-transform">
          <section class="token-cloud"><div class="scene-panel-head"><span class="scene-label">2. Split into tokens</span><strong>Processing pieces</strong></div>${tokens.map((token, index) => `<span class="token-pill" style="--delay:${index * .035}s"><strong>${escapeHtml(token)}</strong><small>#${tokenId(token, index)}</small></span>`).join("")}</section>
          <div class="token-bridge"><span class="flow-arrow"></span><b>Lookup</b><small>Illustrative token IDs</small></div>
          <section class="vector-board">
            <div class="scene-panel-head"><span class="scene-label">3. Map to embeddings</span><strong>Learned features</strong></div>
            ${tokens.slice(0, 6).map((token, row) => `<div class="vector-row"><span>${escapeHtml(token)}</span><div class="vector-dots">${Array.from({ length: 10 }, (_, dot) => `<i style="--dot:${5 + ((row * 3 + dot * 2) % 5)}px;--dot-color:${colors[(row + dot) % colors.length]};--delay:${(row * 10 + dot) * .012}s"></i>`).join("")}</div></div>`).join("")}
          </section>
        </div>
        <div class="token-caption"><span><strong>${tokens.length}${tokenPieces(prompt).length > tokens.length ? "+" : ""} visible tokens</strong><small>A token may be a word, word-part, number, or punctuation mark.</small></span><span><strong>Numbers, not definitions</strong><small>Real embeddings contain many more dimensions than these colored dots.</small></span></div>
      </div>`;
  }

  function transformerScene() {
    const wordSets = {
      explain: ["explain", "sky", "blue", "10-year-old", "simple analogy", "clear"],
      email: ["polite", "Maya", "Friday", "deadline", "realistic", "help"],
      calculate: ["18%", "$74.50", "tip", "total", "exact", "calculator"],
      research: ["three dryers", "small apartment", "current", "reliable", "trade-offs", "recommend"],
      report: ["quarterly report", "calculate", "changes", "risks", "one-page", "summary"],
      trip: ["three days", "Tallinn", "EUR 700", "quiet", "vegetarian", "minimal travel"]
    };
    const words = wordSets[currentScenario().id] || wordSets.explain;
    const outcomes = currentScenario().complexity === "complex"
      ? ["Multi-part goal", "Constraints linked", "Tool likely"]
      : currentScenario().tool
        ? ["Exact result needed", "Numbers linked", "Tool likely"]
        : ["Audience understood", "Tone shaped", "Answer directly"];
    return `
      <div class="scene transformer-scene" data-scene-key="${state.sceneKey}">
        <section class="attention-workbench">
          <div class="scene-panel-head"><span class="scene-label">1. Attention connects relevant clues</span><strong>Focus changes with context</strong></div>
          <div class="attention-example">${words.map((word, index) => `<span class="attention-word ${index === 1 ? "is-focus" : ""} ${index === 0 || index === 3 || index === 4 ? "is-linked" : ""}" style="--delay:${index * .08}s">${escapeHtml(word)}</span>`).join("")}</div>
          <div class="attention-explanation"><b>${escapeHtml(words[1])}</b><span>pulls useful meaning from</span><strong>${escapeHtml(words[0])}, ${escapeHtml(words[3])}, and ${escapeHtml(words[4])}</strong></div>
        </section>
        <section class="transformer-machine">
          <div class="transformer-machine__head"><span class="scene-label">2. Many layers repeatedly update the representation</span><strong>Illustrative slice of a much larger network</strong></div>
          <div class="layer-pipeline">
            ${Array.from({ length: 7 }, (_, column) => `<div class="layer-column" style="--layer-delay:${column * .1}s">${Array.from({ length: 5 }, (_, row) => `<i class="neuron" style="--delay:${(column * 5 + row) * .045}s"></i>`).join("")}<span class="layer-name">${column === 0 ? "Notice" : column === 3 ? "Combine" : column === 6 ? "Refine" : `Layer ${column + 1}`}</span></div>`).join("")}
          </div>
          <div class="layer-story"><span>Earlier layers notice local relationships</span><i></i><span>Later layers combine them into task-relevant meaning</span></div>
        </section>
        <div class="transformer-output">${outcomes.map((outcome, index) => `<div class="meaning-chip" style="--delay:${.5 + index * .12}s"><span>${index === 0 ? "Goal" : index === 1 ? "Constraints" : "Next move"}</span><strong>${escapeHtml(outcome)}</strong><i></i></div>`).join("")}</div>
      </div>`;
  }

  function decisionScene() {
    const scenario = currentScenario();
    const toolAllowed = Boolean(scenario.tool);
    const chosen = toolAllowed ? "tool" : "answer";
    const checks = [
      { label: "Is the request clear?", value: "Yes", pass: true },
      { label: "Is current or exact data needed?", value: toolAllowed ? "Yes" : "No", pass: !toolAllowed },
      { label: "Is an outside action needed?", value: scenario.complexity === "complex" ? "Maybe" : "No", pass: scenario.complexity !== "complex" }
    ];
    return `
      <div class="scene decision-scene" data-scene-key="${state.sceneKey}">
        <section class="decision-core"><span class="scene-label">Task snapshot</span><div class="model-orb"></div><strong>${models[state.model].name} model</strong><span>Uses the prepared context to propose a useful next move</span><div class="decision-task"><b>${scenario.complexity === "complex" ? "Complex" : "Simple"}</b><small>${escapeHtml(scenario.name)}</small></div></section>
        <section class="decision-gates"><div class="scene-panel-head"><span class="scene-label">1. Check what the task needs</span><strong>Routing signals</strong></div>${checks.map((check, index) => `<article style="--delay:${index * .1}s"><i>${index + 1}</i><span><strong>${check.label}</strong><small>${check.value}</small></span><b class="${check.pass ? "is-pass" : "is-flag"}">${check.pass ? "clear" : "route signal"}</b></article>`).join("")}</section>
        <section class="route-options"><div class="scene-panel-head"><span class="scene-label">2. Choose the next move</span><strong>One route wins</strong></div>
          <article class="route-option ${chosen === "answer" ? "is-chosen" : ""}" style="--route-color:#2fb77f"><i>A</i><div><strong>Answer directly</strong><small>Use the context already available</small></div><b>${chosen === "answer" ? "selected" : "available"}</b></article>
          <article class="route-option ${chosen === "tool" ? "is-chosen" : ""}" style="--route-color:#ff9a52"><i>T</i><div><strong>Request ${escapeHtml(scenario.tool || "an outside tool")}</strong><small>${scenario.tool ? "Bring fresh, exact, or file-based data into context" : "No outside capability is needed here"}</small></div><b>${chosen === "tool" ? "selected" : "not needed"}</b></article>
          <article class="route-option" style="--route-color:#a36cf5"><i>?</i><div><strong>Ask a question</strong><small>Pause when missing information could change the result</small></div><b>available</b></article>
        </section>
        <p class="decision-caption"><strong>Important:</strong> the product can limit routes for safety, permissions, cost, or workflow rules.</p>
      </div>`;
  }

  function loopScene() {
    const scenario = currentScenario();
    const toolAllowed = Boolean(scenario.tool);
    if (!toolAllowed && scenario.complexity === "simple") {
      return `
        <div class="scene direct-route-story" data-scene-key="${state.sceneKey}">
          <section class="direct-route-check">
            <span class="scene-label">The route decision</span>
            <h4>Does this task need new information from outside the model?</h4>
            <div class="direct-proof-list">
              <div><i>1</i><span><strong>The request is clear</strong><small>The goal and audience are already supplied.</small></span></div>
              <div><i>2</i><span><strong>No fresh fact is required</strong><small>The answer can use learned language patterns.</small></span></div>
              <div><i>3</i><span><strong>No real-world action is required</strong><small>Nothing needs to be searched, opened, or changed.</small></span></div>
            </div>
            <div class="direct-verdict"><b>NO</b><span><small>No outside lookup is needed</small><strong>The context is enough to start the answer</strong></span><i><span>Answer readiness</span><strong>100%</strong></i></div>
          </section>
          <section class="direct-route-path">
            <span class="scene-label">What happens next</span>
            <div class="direct-path-line">
              <article><b>1</b><span><strong>Use the prepared context</strong><small>Request + instructions + useful history</small></span></article>
              <i aria-hidden="true"></i>
              <article class="is-skip"><b>2</b><span><strong>Skip the work loop</strong><small>No search, file reading, or calculator call</small></span></article>
              <i aria-hidden="true"></i>
              <article class="is-finish"><b>3</b><span><strong>Start writing the answer</strong><small>The model predicts the response token by token</small></span></article>
            </div>
            <div class="unused-tools"><span>Not needed for this task</span><i>Web search</i><i>Files</i><i>Calculator</i><i>Apps</i></div>
          </section>
        </div>`;
    }
    if (scenario.complexity === "simple") {
      return `
        <div class="scene tool-detour-story" data-scene-key="${state.sceneKey}">
          <section class="tool-detour-intro">
            <span class="scene-label">A short tool detour</span>
            <div class="tool-detour-icon">T</div>
            <h4>The language model asks for an exact result</h4>
            <p>The model coordinates the task, but <strong>${escapeHtml(scenario.tool)}</strong> performs the exact operation.</p>
          </section>
          <section class="tool-detour-flow">
            <article style="--delay:0s"><b>1</b><div><span>Model creates a tool request</span><strong>Use ${escapeHtml(scenario.tool)}</strong></div></article>
            <article style="--delay:.12s"><b>2</b><div><span>Outside system runs it</span><strong>The tool does the exact work</strong></div></article>
            <article style="--delay:.24s"><b>3</b><div><span>Result returns to context</span><strong>${escapeHtml(scenario.toolResult || "Fresh tool data")}</strong></div></article>
            <article class="is-finish" style="--delay:.36s"><b>4</b><div><span>Model continues with better information</span><strong>Explain the result clearly</strong></div></article>
            <div class="context-before-after"><span><small>Context before</small><strong>Request + rules</strong></span><i></i><span><small>Context after</small><strong>Request + exact tool result</strong></span></div>
            <div class="tool-detour-caption"><i></i><strong>The tool does not replace the model.</strong><span>It gives the model a reliable piece of information to use in the answer.</span></div>
          </section>
        </div>`;
    }
    const cycles = scenario.workLog.filter((item) => item.phase !== 5).slice(0, scenario.cycles);
    return `
      <div class="scene complex-work-story" data-scene-key="${state.sceneKey}">
        <section class="work-loop-explainer">
          <span class="scene-label">What one work cycle means</span>
          <h4>Each result changes the next decision</h4>
          <div class="work-loop-steps">
            <article><b>1</b><span><strong>Choose</strong><small>Pick the next useful step</small></span></article>
            <article><b>2</b><span><strong>Act</strong><small>Use ${escapeHtml(scenario.tool || "the available context")}</small></span></article>
            <article><b>3</b><span><strong>Read</strong><small>Inspect what came back</small></span></article>
            <article><b>4</b><span><strong>Update</strong><small>Add the result to context</small></span></article>
          </div>
          <div class="work-loop-return"><i aria-hidden="true"></i><span><strong>New evidence returns to the model</strong><small>The next cycle starts with more information than the last one.</small></span></div>
          <p>This is why a complex task is not one giant answer step. It is a sequence of smaller, connected decisions.</p>
        </section>
        <section class="work-cycle-story">
          <div class="work-cycle-story__head"><span>${scenario.cycles} work cycles in this example</span><strong>Watch the task become more complete</strong></div>
          <div class="work-cycle-list">
            ${cycles.map((item, index) => `
              <article class="work-cycle-card" style="--delay:${index * .11}s">
                <b><small>Cycle</small>${index + 1}</b>
                <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></div>
                <span><i></i>${index === cycles.length - 1 ? "Ready to answer" : "Context updated"}<em style="--progress:${Math.round(((index + 1) / cycles.length) * 100)}%"><u></u></em></span>
              </article>
            `).join("")}
          </div>
          <div class="work-cycle-result"><span>Collected result</span><strong>${escapeHtml(scenario.toolResult || "New information collected and checked")}</strong></div>
        </section>
      </div>`;
  }

  function currentSceneDefinition() {
    const scenario = currentScenario();
    const scene = sceneDefinitions[state.phase];
    if (state.phase !== 4) return scene;
    if (scenario.complexity === "complex") {
      return {
        ...scene,
        title: `Watch the task improve across ${scenario.cycles} connected work cycles`,
        question: "How does each new result become context for the next decision?",
        watch: "Complexity comes from connected model-and-tool turns: choose, act, inspect the result, update context, and repeat.",
        plainTitle: "Each cycle leaves the assistant better informed",
        plainBody: `This example uses ${scenario.cycles} work cycles. The assistant chooses a step, receives a result, checks it, and adds it to context before deciding what to do next.`,
        analogy: "Researching one question, adding the answer to your notes, and using those better notes to decide the next question.",
        technicalTitle: "Complex work is repeated inference with changing context",
        technicalBody: "The application orchestrates several model turns and tool calls. Every returned result expands or corrects the context used by the following turn.",
        myth: "The assistant does not solve the whole complex task in one invisible flash."
      };
    }
    if (scenario.tool) {
      return {
        ...scene,
        title: "Take a short tool detour for an exact result",
        question: "How can a simple task use a tool without becoming a long, complex workflow?",
        watch: "The tool runs outside the language model, then returns one reliable result to the context window.",
        plainTitle: "The assistant briefly steps out to get an exact answer",
        plainBody: `The model requests ${scenario.tool}, the product runs it, and the result comes back into context. The model then turns that result into a useful explanation.`,
        analogy: "Asking a calculator for the exact number, then explaining what that number means.",
        technicalTitle: "A tool call is a structured detour through the application",
        technicalBody: "The model produces a structured request. Application code executes the tool and supplies its output as new context for another model pass.",
        myth: "The language model did not perform the exact outside operation by itself."
      };
    }
    return {
      ...scene,
      title: "Skip the work loop when the context is enough",
      question: "Why can a simple task move directly from model processing to answer generation?",
      watch: "A direct route is appropriate when the request is clear and needs no fresh facts, files, calculation, or real-world action.",
      plainTitle: "The assistant already has what it needs",
      plainBody: "For a straightforward language task, the request and instructions provide enough context. The assistant can skip search and other outside tools and begin producing the response.",
      analogy: "Answering a familiar question from the notes already open on your desk.",
      technicalTitle: "The application continues directly to generation",
      technicalBody: "No tool call or multi-turn agent loop is needed. The processed context can feed directly into next-token generation.",
      myth: "Skipping tools does not mean skipping model computation; the transformer still processes the context."
    };
  }

  function outputScene() {
    const candidateData = candidates();
    const text = outputText();
    const scenario = currentScenario();
    const progress = state.outputMatches.length ? Math.round((state.generatedCount / state.outputMatches.length) * 100) : 0;
    return `
      <div class="scene output-scene" data-scene-key="${state.sceneKey}">
        <section class="generation-engine">
          <div class="scene-panel-head"><span class="scene-label">The repeating generation loop</span><strong>Runs once per new token</strong></div>
          <div class="generation-loop"><div class="output-model"><div class="model-orb"></div><strong>Read the full context again</strong></div><i></i><div><b>1</b><span>Score possible next tokens</span></div><i></i><div><b>2</b><span>Select one likely token</span></div><i></i><div><b>3</b><span>Add it to the response</span></div></div>
          <div class="candidate-board"><div class="candidate-board__head"><span>Illustrative next-token scores</span><strong>Highest score is selected</strong></div><div class="candidate-list">${candidateData.map((candidate, index) => `<div class="candidate-row"><span class="${index === 0 ? "is-top" : ""}">${escapeHtml(candidate.text)}</span><span class="candidate-track"><i style="--probability:${candidate.value}%"></i></span><span>${candidate.value}%</span></div>`).join("")}</div></div>
        </section>
        <section class="answer-board"><div class="answer-board__top"><span>Example answer being assembled</span><span class="output-token-count">${state.generatedCount} / ${state.outputMatches.length} pieces</span></div><div class="generation-progress"><i style="--progress:${progress}%"></i></div><p class="stream-text"><span class="stream-text-content">${escapeHtml(text)}</span><span class="stream-cursor"></span></p><div class="answer-status"><i></i><span><strong class="generation-status">Generating response</strong><small>The same loop repeats after every new piece.</small></span></div></section>
        <div class="output-validation"><span class="scene-label">Product-level finishing checks</span><div class="answer-checks"><span class="answer-check">Formatting</span><span class="answer-check">Task coverage</span><span class="answer-check">${scenario.tool ? "Tool result used" : "Tone matched"}</span><span class="answer-check">Ready to display</span></div><p>These checks surround model generation. They are not proof that every factual claim is correct.</p></div>
      </div>`;
  }

  let outputTimer = 0;

  function outputCandidateMarkup() {
    return candidates().map((candidate, index) => `<div class="candidate-row"><span class="${index === 0 ? "is-top" : ""}">${escapeHtml(candidate.text)}</span><span class="candidate-track"><i style="--probability:${candidate.value}%"></i></span><span>${candidate.value}%</span></div>`).join("");
  }

  function updateOutputFrame() {
    const total = state.outputMatches.length;
    const progress = total ? Math.round((state.generatedCount / total) * 100) : 0;
    const textNode = $(".stream-text-content");
    if (!textNode) return;
    textNode.textContent = outputText();
    $(".output-token-count").textContent = `${state.generatedCount} / ${total} pieces`;
    $(".generation-progress i").style.setProperty("--progress", `${progress}%`);
    $(".candidate-list").innerHTML = outputCandidateMarkup();
    if (state.generatedCount >= total) {
      $(".generation-status").textContent = "Response complete";
      $(".answer-status").classList.add("is-complete");
      $(".stream-cursor")?.classList.add("is-complete");
      $$(".answer-check").forEach((check, index) => setTimeout(() => check.classList.add("is-done"), index * 90));
    }
  }

  function startOutputAnimation() {
    clearInterval(outputTimer);
    state.generatedCount = 0;
    updateOutputFrame();
    const total = state.outputMatches.length;
    const step = Math.max(1, Math.ceil(total / 42));
    outputTimer = setInterval(() => {
      if (state.phase !== 5 || state.generatedCount >= total) {
        clearInterval(outputTimer);
        return;
      }
      state.generatedCount = Math.min(total, state.generatedCount + step);
      updateOutputFrame();
    }, 72);
  }

  function renderScene() {
    const renderers = [contextScene, tokenScene, transformerScene, decisionScene, loopScene, outputScene];
    const scene = currentSceneDefinition();
    ui.visualStage.dataset.scene = String(state.phase);
    ui.visualStage.dataset.route = routeStoryData(currentScenario()).kind;
    ui.visualStage.dataset.cycles = String(currentScenario().cycles);
    clearInterval(outputTimer);
    ui.visualStage.innerHTML = renderers[state.phase]();
    ui.visualStage.setAttribute("aria-label", `${scene.title}. ${scene.watch}`);
    if (state.phase === 5) startOutputAnimation();
  }

  function updateInterface() {
    const scenario = currentScenario();
    const scene = currentSceneDefinition();
    const model = models[state.model];
    ui.widget.dataset.model = state.model;
    ui.widget.dataset.complexity = scenario.complexity;
    ui.anatomyAssistantName.textContent = model.name;
    ui.anatomyAssistantMark.textContent = model.mark;
    ui.modelDifferenceText.textContent = model.difference;
    ui.simpleLane.classList.toggle("is-active", scenario.complexity === "simple");
    ui.complexLane.classList.toggle("is-active", scenario.complexity === "complex");
    ui.stageRouteLabel.textContent = scenario.complexity === "complex" ? `Complex route: ${scenario.cycles} connected work cycles` : scenario.tool ? "Simple route: one tool detour" : "Simple route: direct answer";
    ui.journeyTitle.textContent = scene.title;
    ui.stageQuestion.textContent = scene.question;
    ui.phaseNumber.textContent = `Scene ${state.phase + 1} of ${sceneDefinitions.length}`;
    ui.phaseStatus.textContent = "Viewing now";
    ui.watchForText.textContent = scene.watch;
    ui.plainTitle.textContent = scene.plainTitle;
    ui.plainBody.textContent = scene.plainBody;
    ui.analogyText.textContent = scene.analogy;
    ui.technicalTitle.textContent = scene.technicalTitle;
    ui.technicalBody.textContent = scene.technicalBody;
    ui.mythText.textContent = scene.myth;
    renderPhaseMap();
    renderScene();
    scheduleHeightPost();
  }

  function selectScenario(id, restoreFocus = false) {
    state.scenarioId = id;
    state.filter = scenarios[id].complexity;
    ui.taskTabs.forEach((button) => {
      const active = button.dataset.taskFilter === state.filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    renderScenarios();
    renderIngredients();
    state.phase = 0;
    state.sceneKey += 1;
    prepareOutput();
    updateInterface();
    if (restoreFocus) requestAnimationFrame(() => $(`.scenario-button[data-scenario="${id}"]`)?.focus());
  }

  function setPhase(index, restoreFocus = false) {
    state.phase = clamp(index, 0, sceneDefinitions.length - 1);
    state.sceneKey += 1;
    updateInterface();
    if (restoreFocus) requestAnimationFrame(() => $(`.phase-button[data-phase="${state.phase}"]`)?.focus());
  }

  function bindEvents() {
    ui.replaySceneButton.addEventListener("click", () => {
      state.sceneKey += 1;
      updateInterface();
    });
    ui.modelButtons.forEach((button) => button.addEventListener("click", () => {
      state.model = button.dataset.model;
      ui.modelButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", active ? "true" : "false");
      });
      updateInterface();
    }));
    bindArrowNavigation(ui.modelButtons);
    ui.taskTabs.forEach((button) => button.addEventListener("click", () => {
      state.filter = button.dataset.taskFilter;
      const first = Object.values(scenarios).find((scenario) => scenario.complexity === state.filter);
      selectScenario(first.id);
    }));
    bindArrowNavigation(ui.taskTabs);
    window.addEventListener("resize", () => scheduleHeightPost(true));
    window.addEventListener("orientationchange", () => scheduleHeightPost(true), { passive: true });
    window.addEventListener("load", scheduleHeightBurst, { once: true });
    window.addEventListener("pageshow", scheduleHeightBurst);
    window.addEventListener("message", (event) => {
      const type = typeof event.data === "string" ? event.data : event.data?.type;
      if (
        type === "simfluence-widget:measure" ||
        type === "widget:request-height" ||
        type === "widget:request-resize" ||
        type === "simfluence-widget:request-height" ||
        type === "simfluence-widget:request-resize"
      ) scheduleHeightPost(true);
    });
  }

  let heightFrame = 0;
  let lastHeight = 0;
  const resizeMessageType = "simfluence-widget:resize";
  function documentHeight() {
    const body = document.body;
    const html = document.documentElement;
    const widgetRect = ui.widget?.getBoundingClientRect();
    const shellRect = ui.widget?.parentElement?.getBoundingClientRect();
    return Math.ceil(Math.max(
      widgetRect ? widgetRect.bottom + window.scrollY : 0,
      shellRect ? shellRect.bottom + window.scrollY : 0,
      body.scrollHeight,
      body.offsetHeight,
      body.clientHeight,
      html.scrollHeight,
      html.offsetHeight,
      html.clientHeight,
      1
    ));
  }
  function scheduleHeightPost(force = false) {
    if (heightFrame) cancelAnimationFrame(heightFrame);
    heightFrame = requestAnimationFrame(() => {
      heightFrame = 0;
      const height = documentHeight();
      if (!force && Math.abs(height - lastHeight) < 2) return;
      lastHeight = height;
      if (window.parent && window.parent !== window) {
        try {
          if (window.frameElement) {
            window.frameElement.style.height = `${height}px`;
            window.frameElement.setAttribute("height", String(height));
          }
        } catch (_error) {
          // Cross-origin parents rely on postMessage below.
        }

        try {
          window.parent.postMessage({ type: resizeMessageType, id: "Sim31_AI_Transformer", height }, "*");
        } catch (_error) {
          // Later scheduled reports will retry if the parent is not ready yet.
        }
      }
    });
  }
  function scheduleHeightBurst() {
    [0, 80, 220, 500, 1000, 1800, 3000].forEach((delay) => {
      window.setTimeout(() => scheduleHeightPost(true), delay);
    });
  }
  function setupEmbedMode() {
    const params = new URLSearchParams(window.location.search);
    let framed = false;
    try { framed = window.self !== window.top; } catch { framed = true; }
    if (framed || params.get("embed") === "1" || params.get("embedMode") === "1") {
      document.documentElement.classList.add("embed-mode");
      document.body.classList.add("embed-mode");
    }
  }

  function init() {
    setupEmbedMode();
    bindEvents();
    renderScenarios();
    renderIngredients();
    prepareOutput();
    updateInterface();
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(() => scheduleHeightPost());
      observer.observe(ui.widget);
      observer.observe(document.body);
      if (ui.visualStage) observer.observe(ui.visualStage);
    }
    if (document.fonts?.ready) document.fonts.ready.then(scheduleHeightBurst).catch(() => {});
    window.SimfluenceAITransformer = {
      selectScenario,
      setPhase(index) {
        setPhase(Number(index) || 0);
      },
      getState() {
        return { model: state.model, scenario: state.scenarioId, complexity: currentScenario().complexity, phase: state.phase };
      }
    };
    scheduleHeightBurst();
  }

  init();
})();
