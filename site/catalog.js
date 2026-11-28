(() => {
  "use strict";

  const search = document.querySelector("#search");
  const filters = document.querySelector("#filters");
  const cards = document.querySelector("#cards");
  const status = document.querySelector("#status");
  const languageSelector = document.querySelector("#language");
  const englishTopics = {
    Andmepädevus: "Data literacy",
    Igapäevaelu: "Everyday life",
    Keskkond: "Environment",
    Majandus: "Economics",
    Organisatsioonid: "Organizations",
    Tehisaru: "Artificial intelligence",
    Tööprotsessid: "Workflows",
    Ühiskond: "Society"
  };
  const messages = {
    en: {
      intro: "This catalog contains interactive learning models. Each entry states the subject of the model and the relationship it represents.",
      catalog: "Simulation catalog", language: "Language", filters: "Filter by topic",
      search: "Search the catalog", placeholder: "Title, topic, or keyword", all: "All",
      loading: "Loading the catalog…", error: "Couldn’t load the catalog. Refresh the page to try again.",
      empty: "No results. Try another search or topic.",
      count: total => `${total} ${total === 1 ? "simulation" : "simulations"}`
    },
    et: {
      intro: "Kataloog sisaldab interaktiivseid õppemudeleid. Iga kirje nimetab mudeli teema ja seose, mida see kujutab.",
      catalog: "Simulatsioonide kataloog", language: "Keel", filters: "Teemafiltrid",
      search: "Otsi kataloogist", placeholder: "Pealkiri, teema või märksõna", all: "Kõik",
      loading: "Laadin kataloogi…", error: "Kataloogi ei õnnestunud laadida. Värskenda lehte ja proovi uuesti.",
      empty: "Tulemusi ei leitud. Proovi teist otsingut või teemat.",
      count: total => `${total} ${total === 1 ? "simulatsioon" : "simulatsiooni"}`
    }
  };
  const normalize = text => text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  let language = new URLSearchParams(location.search).get("lang") === "et" ? "et" : "en";
  let topic = "";
  let catalog = null;
  let loadFailed = false;

  const topicLabel = name => language === "en" ? englishTopics[name] ?? name : name;

  function cardFor(entry) {
    const card = document.createElement("a");
    card.className = "card";
    card.href = entry.href;

    const image = document.createElement("img");
    image.src = entry.image;
    image.alt = "";
    image.width = 640;
    image.height = 360;
    image.loading = "lazy";
    image.decoding = "async";

    const details = document.createElement("div");
    details.className = "card-info";
    const label = document.createElement("p");
    label.className = "card-topic";
    label.textContent = topicLabel(entry.topics[0]);
    const translation = language === "en" ? entry.en : entry;
    const title = document.createElement("h2");
    title.textContent = translation.title ?? entry.title;
    const description = document.createElement("p");
    description.className = "card-description";
    description.textContent = translation.description;
    details.append(label, title, description);
    card.append(image, details);
    return card;
  }

  function render() {
    const copy = messages[language];
    if (!catalog) {
      status.textContent = loadFailed ? copy.error : copy.loading;
      return;
    }
    const words = normalize(search.value).trim().split(/\s+/u).filter(Boolean);
    const visible = catalog.filter(entry => (!topic || entry.topics.includes(topic)) && words.every(word => entry.searchable.includes(word)));
    cards.replaceChildren(...visible.map(cardFor));
    status.textContent = visible.length ? copy.count(visible.length) : copy.empty;
  }

  function buildFilters() {
    const topics = [...new Set(catalog.flatMap(entry => entry.topics))]
      .sort((a, b) => topicLabel(a).localeCompare(topicLabel(b), language));
    filters.replaceChildren();
    for (const name of ["", ...topics]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = name ? topicLabel(name) : messages[language].all;
      button.setAttribute("aria-pressed", String(name === topic));
      button.addEventListener("click", () => {
        topic = name;
        for (const filter of filters.children) filter.setAttribute("aria-pressed", String(filter === button));
        render();
      });
      filters.append(button);
    }
  }

  function applyLanguage() {
    const copy = messages[language];
    document.documentElement.lang = language;
    document.querySelector("#intro-copy").textContent = copy.intro;
    document.querySelector("#search-label").textContent = copy.search;
    document.querySelector(".catalog").setAttribute("aria-label", copy.catalog);
    search.placeholder = copy.placeholder;
    filters.setAttribute("aria-label", copy.filters);
    languageSelector.setAttribute("aria-label", copy.language);
    for (const button of languageSelector.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", String(button.dataset.language === language));
    }
    if (catalog) buildFilters();
    render();
  }

  languageSelector.addEventListener("click", event => {
    const button = event.target.closest("button[data-language]");
    if (!button || button.dataset.language === language) return;
    language = button.dataset.language;
    const url = new URL(location.href);
    if (language === "en") url.searchParams.delete("lang");
    else url.searchParams.set("lang", language);
    history.replaceState(null, "", url);
    applyLanguage();
  });
  search.addEventListener("input", render);
  applyLanguage();

  fetch(new URL("./catalog.json?v=2", location.href))
    .then(response => {
      if (!response.ok) throw new Error("Couldn’t load the catalog");
      return response.json();
    })
    .then(entries => {
      catalog = entries.map(entry => ({
        ...entry,
        searchable: normalize([
          entry.title, entry.description, entry.en.title, entry.en.description,
          ...entry.topics, ...entry.topics.map(name => englishTopics[name]), ...entry.keywords
        ].join(" "))
      }));
      search.disabled = false;
      buildFilters();
      render();
    })
    .catch(() => {
      catalog = null;
      loadFailed = true;
      search.disabled = true;
      filters.replaceChildren();
      render();
    });
})();
