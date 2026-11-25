(() => {
  "use strict";

  const search = document.querySelector("#search");
  const filters = document.querySelector("#filters");
  const cards = document.querySelector("#cards");
  const status = document.querySelector("#status");
  const normalize = text => text.toLocaleLowerCase("et").normalize("NFD").replace(/\p{Diacritic}/gu, "");
  let topic = "";

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
    label.textContent = entry.topics[0];
    const title = document.createElement("h2");
    title.textContent = entry.title;
    const description = document.createElement("p");
    description.className = "card-description";
    description.textContent = entry.description;
    details.append(label, title, description);
    card.append(image, details);
    return card;
  }

  function showCatalog(entries) {
    const indexed = entries.map(entry => ({
      ...entry,
      searchable: normalize([entry.title, entry.description, ...entry.topics, ...entry.keywords].join(" "))
    }));
    const topics = [...new Set(entries.flatMap(entry => entry.topics))].sort((a, b) => a.localeCompare(b, "et"));

    function render() {
      const words = normalize(search.value).trim().split(/\s+/u).filter(Boolean);
      const visible = indexed.filter(entry => (!topic || entry.topics.includes(topic)) && words.every(word => entry.searchable.includes(word)));
      cards.replaceChildren(...visible.map(cardFor));
      status.textContent = visible.length ? `${visible.length} simulatsiooni` : "Tulemusi ei leitud. Proovi teist otsingut või teemat.";
    }

    for (const name of ["", ...topics]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = name || "Kõik";
      button.setAttribute("aria-pressed", String(name === topic));
      button.addEventListener("click", () => {
        topic = name;
        for (const filter of filters.children) filter.setAttribute("aria-pressed", String(filter === button));
        render();
      });
      filters.append(button);
    }

    search.disabled = false;
    search.addEventListener("input", render);
    render();
  }

  fetch(new URL("./catalog.json", location.href))
    .then(response => {
      if (!response.ok) throw new Error("Kataloogi laadimine ebaõnnestus");
      return response.json();
    })
    .then(showCatalog)
    .catch(() => { status.textContent = "Kataloogi ei õnnestunud laadida. Värskenda lehte ja proovi uuesti."; });
})();
