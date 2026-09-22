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

// --- Photo strip + lightbox (used only in the geocache modal) -----------

function photoStripHtml(photos) {
  if (!photos.length) return "";
  const thumbs = photos
    .map(
      (url, i) => `
      <button class="photo-thumb" data-index="${i}" aria-label="Powiększ zdjęcie ${i + 1}">
        <span class="photo-spinner"></span>
        <img src="${url}" alt="Zdjęcie skrytki ${i + 1}" loading="lazy" />
      </button>`
    )
    .join("");
  return `
    <h3>Zdjęcia <span class="badge">${photos.length}</span></h3>
    <div class="photo-strip">${thumbs}</div>`;
}

// Photos can be up to ~100MB, so each thumbnail shows its own spinner until
// its 'load'/'error' fires — these events don't bubble, so they're wired up
// individually right after the modal HTML is inserted.
function bindPhotoStrip(photos) {
  if (!photos.length) return;
  const thumbs = document.querySelectorAll("#detail-modal-root .photo-thumb");
  thumbs.forEach((btn, i) => {
    const img = btn.querySelector("img");
    const markLoaded = () => btn.classList.add("loaded");
    const markError = () => btn.classList.add("errored");
    if (img.complete && img.naturalWidth) markLoaded();
    else {
      img.addEventListener("load", markLoaded);
      img.addEventListener("error", markError);
    }
    btn.addEventListener("click", () => openPhotoLightbox(photos, i));
  });
}

let lightboxState = { photos: [], index: 0 };

function ensureLightboxRoot() {
  let root = document.getElementById("photo-lightbox-root");
  if (root) return root;
  root = document.createElement("div");
  root.id = "photo-lightbox-root";
  root.className = "lightbox-overlay hidden";
  root.innerHTML = `
    <button class="lightbox-close" aria-label="Zamknij">&times;</button>
    <button class="lightbox-nav lightbox-prev" aria-label="Poprzednie zdjęcie">&#8249;</button>
    <div class="lightbox-image-wrap">
      <span class="photo-spinner"></span>
      <img class="lightbox-img" alt="" />
    </div>
    <button class="lightbox-nav lightbox-next" aria-label="Następne zdjęcie">&#8250;</button>`;
  document.body.appendChild(root);
  root.addEventListener("click", (e) => {
    if (e.target === root) closeLightbox();
  });
  root.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
  root.querySelector(".lightbox-prev").addEventListener("click", () => navigateLightbox(-1));
  root.querySelector(".lightbox-next").addEventListener("click", () => navigateLightbox(1));
  document.addEventListener("keydown", (e) => {
    if (root.classList.contains("hidden")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") navigateLightbox(-1);
    if (e.key === "ArrowRight") navigateLightbox(1);
  });
  return root;
}

function renderLightboxImage() {
  const root = ensureLightboxRoot();
  const wrap = root.querySelector(".lightbox-image-wrap");
  const img = root.querySelector(".lightbox-img");
  const multi = lightboxState.photos.length > 1;
  root.querySelector(".lightbox-prev").classList.toggle("hidden", !multi);
  root.querySelector(".lightbox-next").classList.toggle("hidden", !multi);

  wrap.classList.remove("loaded");
  img.classList.remove("loaded");
  img.src = lightboxState.photos[lightboxState.index];
  img.onload = () => {
    wrap.classList.add("loaded");
    img.classList.add("loaded");
  };
  img.onerror = () => {
    wrap.classList.add("loaded", "errored");
  };
}

function openPhotoLightbox(photos, index) {
  lightboxState = { photos, index };
  const root = ensureLightboxRoot();
  renderLightboxImage();
  root.classList.remove("hidden");
}

function closeLightbox() {
  const root = document.getElementById("photo-lightbox-root");
  if (root) root.classList.add("hidden");
}

function navigateLightbox(delta) {
  const count = lightboxState.photos.length;
  if (!count) return;
  lightboxState.index = (lightboxState.index + delta + count) % count;
  renderLightboxImage();
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
    <p class="score-line">Wynik: <strong>${formatScore(team.score)}</strong>
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
    <p class="stats-line">Znalazły: <strong>${geocache.finders.length}</strong> &nbsp;·&nbsp;
      Nie znalazły: <strong>${geocache.lacks}</strong></p>
    ${photoStripHtml(geocache.photos)}
    <h3>Zespoły, które znalazły <span class="badge">${geocache.finders.length}</span></h3>
    ${finders}
    <div class="form-btn-row">
      ${formButton("findHiding")}
      ${formButton("reportNotFound")}
    </div>
  `);
  bindPhotoStrip(geocache.photos);
}
