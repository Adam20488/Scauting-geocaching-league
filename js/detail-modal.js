// Shared "team detail" / "geocache detail" modal, used by both the
// leaderboard and map pages. Reads from window.LEAGUE_DATA on demand.

function ensureModalRoot() {
  let root = document.getElementById("detail-modal-root");
  if (root) return root;
  root = document.createElement("div");
  root.id = "detail-modal-root";
  root.className = "modal-overlay hidden";
  root.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" aria-label="Zamknij">&times;</button>
      <div class="modal-content"></div>
    </div>`;
  document.body.appendChild(root);
  root.addEventListener("click", (e) => {
    if (e.target === root) closeModal();
  });
  root.querySelector(".modal-close").addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
  return root;
}

function closeModal() {
  const root = document.getElementById("detail-modal-root");
  if (root) root.classList.add("hidden");
}

function showModal(html) {
  const root = ensureModalRoot();
  root.querySelector(".modal-content").innerHTML = html;
  root.classList.remove("hidden");
}

function nameButton(kind, label) {
  const esc = label.replace(/"/g, "&quot;");
  const fn = kind === "team" ? "openTeamModal" : "openGeocacheModal";
  return `<button class="link-btn" onclick='${fn}(${JSON.stringify(label)})'>${esc}</button>`;
}

function mapsLink(coords) {
  if (!coords) return "";
  const url = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}`;
  return `<a class="maps-link" href="${url}" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="currentColor" d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/>
      </svg>
      Otwórz w Google Maps
    </a>`;
}

function openTeamModal(teamName) {
  const data = window.LEAGUE_DATA;
  const team = data && data.teams.get(teamName);
  if (!team) return;

  const created = team.createdCaches
    .map((g) => {
      const status = g.isValid
        ? `<span class="badge">${g.finders.length} znalazło</span>`
        : `<span class="invalid-badge">⚠ zła lokalizacja</span>`;
      return `<li>${nameButton("geocache", g.fullName)} ${status}</li>`;
    })
    .join("") || "<li class=\"muted\">Brak</li>";

  const found = team.foundCaches
    .map((g) => `<li>${nameButton("geocache", g.fullName)}</li>`)
    .join("") || "<li class=\"muted\">Brak</li>";

  showModal(`
    <h2><span class="color-dot" style="background:${team.color}"></span>${team.name}</h2>
    <p class="score-line">Wynik: <strong>${team.score}</strong>
      (stworzenie: ${team.stworzenie}, znalezienia: ${team.znalezienia}, suma: ${team.suma})</p>
    <h3>Utworzone skrytki <span class="badge">${team.createdCaches.length}</span></h3>
    <ul class="detail-list">${created}</ul>
    <h3>Znalezione skrytki <span class="badge">${team.foundCaches.length}</span></h3>
    <ul class="detail-list">${found}</ul>
  `);
}

function openGeocacheModal(fullName) {
  const data = window.LEAGUE_DATA;
  const geocache = data && data.geocaches.get(fullName);
  if (!geocache) return;

  const finders = geocache.finders.length
    ? `<ul class="detail-list">${geocache.finders
        .map((n) => `<li>${nameButton("team", n)}</li>`)
        .join("")}</ul>`
    : "<p class=\"muted\">Nikt jeszcze nie znalazł.</p>";

  const locationInfo = geocache.isValid
    ? mapsLink(geocache.coords)
    : `<p class="invalid-flag">⚠ Nieprawidłowa lokalizacja (${
        geocache.invalidReason === "out-of-bounds" ? "poza obszarem" : "nie udało się odczytać"
      }): <code>${geocache.rawLocation}</code></p>`;

  showModal(`
    <h2>${geocache.fullName}</h2>
    <p>Utworzona przez: ${nameButton("team", geocache.creatorTeam)}</p>
    <p class="hint-box"><strong>Wskazówka:</strong> ${geocache.hint || "<span class=\"muted\">brak</span>"}</p>
    ${locationInfo}
    <h3>Zespoły, które znalazły <span class="badge">${geocache.finders.length}</span></h3>
    ${finders}
  `);
}
