// 'ok' = has at least one valid hiding, 'bad' = has hidings but all invalid,
// 'none' = hasn't created any hidings yet.
function teamLocationStatus(team) {
  if (team.createdCaches.length === 0) return "none";
  return team.createdCaches.some((g) => g.isValid) ? "ok" : "bad";
}

const STATUS_ICON = { ok: "✅", bad: "⚠️", none: "❌" };
const STATUS_LABEL = {
  ok: "Przynajmniej jedna prawidłowa lokalizacja skrytki",
  bad: "Wszystkie skrytki mają nieprawidłową lokalizację",
  none: "Drużyna nie utworzyła jeszcze żadnej skrytki",
};

function renderLeaderboard(data) {
  const tbody = document.querySelector("#leaderboard-table tbody");
  tbody.innerHTML = data.teamList
    .map((team, i) => {
      const status = teamLocationStatus(team);
      return `
      <tr>
        <td class="col-num">${i + 1}</td>
        <td class="col-name"><span class="color-dot" style="background:${team.color}"></span>
            ${nameButton("team", team.name)}</td>
        <td class="col-num"><strong>${team.score}</strong></td>
        <td class="col-num">${team.foundCaches.length}</td>
        <td class="col-num" title="${STATUS_LABEL[status]}">${STATUS_ICON[status]}</td>
      </tr>`;
    })
    .join("");
}

function renderGeocacheList(data) {
  const tbody = document.querySelector("#geocache-table tbody");
  const sorted = [...data.geocacheList].sort((a, b) => b.finders.length - a.finders.length);
  tbody.innerHTML = sorted
    .map((g) => {
      const locationTitle = g.isValid
        ? ""
        : g.invalidReason === "out-of-bounds"
        ? "Współrzędne leżą poza spodziewanym obszarem"
        : "Nie udało się odczytać współrzędnych";
      return `
      <tr>
        <td class="col-name">${nameButton("geocache", g.fullName)}</td>
        <td class="col-name">${nameButton("team", g.creatorTeam)}</td>
        <td class="col-num">${g.finders.length}</td>
        <td class="col-num" title="${locationTitle}">${g.isValid ? "✅" : "⚠️"}</td>
      </tr>`;
    })
    .join("");
}

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.remove("hidden");
    });
  });
}

async function init() {
  initTabs();
  showLoading();
  try {
    const data = await fetchLeagueData();
    renderLeaderboard(data);
    renderGeocacheList(data);
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
