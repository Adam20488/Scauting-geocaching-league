// Small shared loading overlay — the Apps Script endpoint can take a few
// seconds to respond, so give some feedback instead of a blank page.

function showLoading() {
  let el = document.getElementById("loading-overlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "loading-overlay";
    el.innerHTML = `<div class="spinner"></div><p>Wczytywanie danych…</p>`;
    document.body.appendChild(el);
  }
  el.classList.remove("hidden");
}

function hideLoading() {
  const el = document.getElementById("loading-overlay");
  if (el) el.classList.add("hidden");
}
