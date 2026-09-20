function coloredDivIcon(color) {
  return L.divIcon({
    className: "team-marker",
    html: `<span style="background:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

function renderMap(data) {
  const map = L.map("map").setView([52.4064, 16.9252], 12); // Poznań
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  const validCaches = data.geocacheList.filter((g) => g.isValid);

  validCaches.forEach((g) => {
    const team = data.teams.get(g.creatorTeam);
    const color = team ? team.color : "#888";
    const marker = L.marker([g.coords.lat, g.coords.lon], {
      icon: coloredDivIcon(color),
    }).addTo(map);

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${g.coords.lat},${g.coords.lon}`;
    marker.bindPopup(
      `
        <div class="popup-content">
          <h3>${g.fullName}</h3>
          <div class="hint-box">${g.hint || "<span class=\"muted\">brak wskazówki</span>"}</div>
          <p>Znalazło zespołów: <strong>${g.finders.length}</strong></p>
          <a class="maps-link" href="${mapsUrl}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path fill="currentColor" d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/>
            </svg>
            Otwórz w Google Maps
          </a>
        </div>`,
      { maxHeight: 260 }
    );

    // Quick preview on hover, full stats modal on click/tap — the leaflet
    // popup's own click-to-open is removed so it doesn't fight with that.
    marker.off("click");
    marker.on("mouseover", () => marker.openPopup());
    marker.on("mouseout", () => marker.closePopup());
    marker.on("click", () => openGeocacheModal(g.fullName));
  });

  if (validCaches.length) {
    const bounds = L.latLngBounds(validCaches.map((g) => [g.coords.lat, g.coords.lon]));
    map.fitBounds(bounds.pad(0.2));
  }
}

function renderLegend(data) {
  const el = document.getElementById("legend-list");
  el.innerHTML = data.teamList
    .map(
      (t) =>
        `<li><span class="color-dot" style="background:${t.color}"></span>${nameButton(
          "team",
          t.name
        )}</li>`
    )
    .join("");
}

const INVALID_REASON_LABEL = {
  "out-of-bounds": "współrzędne leżą poza spodziewanym obszarem",
  unparseable: "nie udało się odczytać współrzędnych z tekstu",
};

function renderInvalidPanel(data) {
  const el = document.getElementById("invalid-list");
  const count = document.getElementById("invalid-count");
  count.textContent = data.invalidGeocaches.length;
  el.innerHTML = data.invalidGeocaches.length
    ? data.invalidGeocaches
        .map((g) => {
          const reason = INVALID_REASON_LABEL[g.invalidReason] || "nieznany problem";
          return `
        <li>
          <strong>${g.cacheName}</strong> (${nameButton("team", g.creatorTeam)})
          — <span class="invalid-reason">${reason}</span>:
          <code>${g.rawLocation || "(puste)"}</code>
        </li>`;
        })
        .join("")
    : "<li class=\"muted\">Brak nieprawidłowych lokalizacji.</li>";
}

function initInvalidPanelToggle() {
  const btn = document.getElementById("invalid-toggle");
  const panel = document.getElementById("invalid-panel");
  btn.addEventListener("click", () => panel.classList.toggle("hidden"));
}

async function init() {
  initInvalidPanelToggle();
  showLoading();
  try {
    const data = await fetchLeagueData();
    renderMap(data);
    renderLegend(data);
    renderInvalidPanel(data);
  } catch (err) {
    document.getElementById("load-error").classList.remove("hidden");
    document.getElementById("load-error").textContent =
      "Nie udało się pobrać danych: " + err.message;
    console.error(err);
  } finally {
    hideLoading();
  }
}

init();
