import { fetchLeagueData } from "./data.js";
import { showLoading, hideLoading } from "./loading.js";
import { nameButton, lackBadge, openGeocacheModal } from "./detail-modal.js";
import { escapeHtml } from "./security.js";

// Leaflet is loaded as a classic <script> in map.html, so `L` is a global.

// The hover popup must never need scrolling (there's no comfortable way to
// scroll a hover-only element), so the hint gets hard-truncated here — the
// full text is still in the click-through modal.
function truncateForPopup(text, maxLen) {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + "…" : text;
}

function coloredDivIcon(color) {
  return L.divIcon({
    className: "team-marker",
    html: `<span style="background:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

// Leaflet throws if the same container is initialised twice, so the map is
// created once and only its marker layer is rebuilt on refresh.
let map = null;
let markerLayer = null;

function ensureMap() {
  if (map) return;
  map = L.map("map").setView([52.4064, 16.9252], 12); // Poznań
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
}

function renderMap(data) {
  ensureMap();
  markerLayer.clearLayers();

  const validCaches = data.geocacheList.filter((g) => g.isValid);

  // Real hover only exists on mouse-driven devices — on touch, a tap can
  // fire a synthetic "mouseover" right before "click", which is what made
  // the quick-preview popup flash distractingly before the full modal took
  // over. Skip hover there entirely; click still opens the modal directly.
  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  validCaches.forEach((g) => {
    const team = data.teams.get(g.creatorTeam);
    const color = team ? team.color : "#888";
    const marker = L.marker([g.coords.lat, g.coords.lon], {
      icon: coloredDivIcon(color),
      keyboard: false, // avoid focus-triggered auto-scroll on tap
    }).addTo(markerLayer);

    marker.bindPopup(
      `
        <div class="popup-content">
          <h3>${escapeHtml(g.fullName)} ${lackBadge(g.lacks)}</h3>
          <p class="popup-hint">${
            g.hint ? escapeHtml(truncateForPopup(g.hint, 140)) : "<span class=\"muted\">brak wskazówki</span>"
          }</p>
          <p class="popup-stats">Znalazło zespołów: <strong>${g.finders.length}</strong></p>
        </div>`,
      // autoPan off — panning the map on every hover felt jumpy/unwanted.
      // No Google Maps link here — the popup closes on mouseout before a
      // click could ever land on it, so it was dead weight.
      { maxHeight: 260, autoPan: false }
    );

    // Quick preview on hover (mouse-driven devices only), full stats modal
    // on click/tap — the leaflet popup's own click-to-open is removed so
    // it doesn't fight with that.
    marker.off("click");
    if (supportsHover) {
      marker.on("mouseover", () => marker.openPopup());
      marker.on("mouseout", () => marker.closePopup());
    }
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
          <strong>${escapeHtml(g.cacheName)}</strong> (${nameButton("team", g.creatorTeam)})
          — <span class="invalid-reason">${reason}</span>:
          <code>${g.rawLocation ? escapeHtml(g.rawLocation) : "(puste)"}</code>
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

async function load({ force = false } = {}) {
  showLoading();
  try {
    const data = await fetchLeagueData({ force });
    renderMap(data);
    renderLegend(data);
    renderInvalidPanel(data);
    document.getElementById("load-error").classList.add("hidden");
  } catch (err) {
    document.getElementById("load-error").classList.remove("hidden");
    document.getElementById("load-error").textContent =
      "Nie udało się pobrać danych: " + err.message;
    console.error(err);
  } finally {
    hideLoading();
  }
}

initInvalidPanelToggle();
document.getElementById("refresh-btn").addEventListener("click", () => load({ force: true }));
load();
