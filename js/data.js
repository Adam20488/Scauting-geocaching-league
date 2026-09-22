// Central data layer: fetches the league endpoint once and builds a fully
// cross-linked in-memory model that every page reads from. No DOM code here.

const ENDPOINT_URL =
  "https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnTR3vh8s1nyNuK40IXgKUbVGjj5QXlitWE6_kG1NGBTD37aBCCzPIInzbQDeTKVvblI8JcY6kgy3bgUdDNN6b0JmActxQ63Qsf29CsaUA4RaLghUJSiPtN3ZFqdduoSbUrS-kObUc-NGn7-hA1f3ClLABDbjpY5Od-YMuGhQRUUQKKzBVt4gCFe_hUBi9c4XSIPrmsuWIkHweR5Rrj0gAZ1ncV1XQMepQxWxfZPLS6mTjOqIABW2HnsW2CQosvMzkZXrtNRu0R_8y4AlL6HCq8r_waZog&lib=MFp1IkcbZkiqOZNIX9XpwU9ZMTqRCn_1T";

// Plausibility box around Poznań — catches parseable-but-wrong coordinates
// (swapped lat/lon, fat-fingered digits) without depending on exact matches.
const BOUNDS = { minLat: 52.25, maxLat: 52.55, minLon: 16.75, maxLon: 17.1 };

const FIELD = {
  teamName: "Nazwa zastępu/drużyny",
  location: "Lokalizacja - skopiowane koordynaty z Google Maps",
  cacheName: "Nazwa skrytki",
  hint: "Wskazówki skrytki",
  photos: "zdjęcia",
  fullName: "Pełna nazwa",
};

// --- Coordinate parsing -----------------------------------------------

function dmsToDecimal(deg, min, sec, hemisphere) {
  let value = Number(deg) + Number(min) / 60 + Number(sec) / 3600;
  if (/[SW]/i.test(hemisphere)) value = -value;
  return value;
}

function parseDms(raw) {
  const re =
    /(\d{1,3})\s*[°:]\s*(\d{1,2})\s*['’:]\s*(\d{1,2}(?:[.,]\d+)?)\s*["”]?\s*([NSns])[,;\s]+(\d{1,3})\s*[°:]\s*(\d{1,2})\s*['’:]\s*(\d{1,2}(?:[.,]\d+)?)\s*["”]?\s*([EWew])/;
  const m = raw.match(re);
  if (!m) return null;
  const lat = dmsToDecimal(m[1], m[2], m[3].replace(",", "."), m[4]);
  const lon = dmsToDecimal(m[5], m[6], m[7].replace(",", "."), m[8]);
  return { lat, lon };
}

function parseDecimalPair(raw) {
  // Standard "lat, lon" with dot decimals (Google Maps' own copy format).
  let m = raw.match(/^\s*(-?\d{1,3}\.\d+)\s*[,;\s]+\s*(-?\d{1,3}\.\d+)\s*$/);
  if (m) return { lat: Number(m[1]), lon: Number(m[2]) };
  // Comma-as-decimal-separator variant: "52,4122, 16,9103".
  m = raw.match(/^\s*(-?\d{1,3}),(\d+)\s*[,;\s]+\s*(-?\d{1,3}),(\d+)\s*$/);
  if (m) return { lat: Number(`${m[1]}.${m[2]}`), lon: Number(`${m[3]}.${m[4]}`) };
  return null;
}

function isPlausible(lat, lon) {
  return (
    lat >= BOUNDS.minLat &&
    lat <= BOUNDS.maxLat &&
    lon >= BOUNDS.minLon &&
    lon <= BOUNDS.maxLon
  );
}

// Returns { coords: {lat,lon}|null, reason: null|'unparseable'|'out-of-bounds' }
function parseLocation(raw) {
  if (!raw || typeof raw !== "string") return { coords: null, reason: "unparseable" };
  const trimmed = raw.trim();
  const parsed = parseDms(trimmed) || parseDecimalPair(trimmed);
  if (!parsed || Number.isNaN(parsed.lat) || Number.isNaN(parsed.lon)) {
    return { coords: null, reason: "unparseable" };
  }
  if (!isPlausible(parsed.lat, parsed.lon)) {
    return { coords: null, reason: "out-of-bounds" };
  }
  return { coords: parsed, reason: null };
}

// Integer scores show as-is; anything else rounds to 1 decimal (dzielnik can
// produce repeating decimals like 1/3).
function formatScore(score) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

// --- Main model builder --------------------------------------------------

async function fetchLeagueData() {
  const res = await fetch(ENDPOINT_URL);
  if (!res.ok) throw new Error(`Endpoint returned ${res.status}`);
  const raw = await res.json();

  const teams = new Map();
  (raw.scores || []).forEach((row, index) => {
    const name = row["zastęp"];
    teams.set(name, {
      name,
      order: index,
      color: teamColor(index),
      score: row.score,
      dzielnik: row.dzielnik,
      stworzenie: row.stworzenie,
      znalezienia: row.znalezienia,
      suma: row.suma,
      createdCaches: [],
      foundCaches: [],
    });
  });

  const geocaches = new Map();
  (raw.creation || []).forEach((row) => {
    const fullName = row[FIELD.fullName];
    const rawLocation = row[FIELD.location] || "";
    const { coords, reason } = parseLocation(rawLocation);
    const geocache = {
      fullName,
      cacheName: row[FIELD.cacheName],
      creatorTeam: row[FIELD.teamName],
      hint: row[FIELD.hint] || "",
      photos: Array.isArray(row[FIELD.photos]) ? row[FIELD.photos] : [],
      rawLocation,
      coords,
      invalidReason: reason,
      isValid: coords !== null,
      finders: [],
      lacks: 0,
    };
    geocaches.set(fullName, geocache);
    const creator = teams.get(geocache.creatorTeam);
    if (creator) creator.createdCaches.push(geocache);
  });

  (raw.findings || []).forEach((row) => {
    const finderName = row[FIELD.teamName];
    const targetFullName = row[FIELD.cacheName];
    const finder = teams.get(finderName);
    const geocache = geocaches.get(targetFullName);
    if (geocache) geocache.finders.push(finderName);
    if (finder && geocache) finder.foundCaches.push(geocache);
  });

  // "count " (with a trailing space) is exactly how the endpoint names it.
  (raw.lacksData || []).forEach((row) => {
    const geocache = geocaches.get(row["nazwa skrytki"]);
    if (geocache) geocache.lacks = row["count "] || 0;
  });

  const teamList = [...teams.values()].sort((a, b) => b.score - a.score);
  const geocacheList = [...geocaches.values()];
  const invalidGeocaches = geocacheList.filter((g) => !g.isValid);

  const model = { teams, geocaches, teamList, geocacheList, invalidGeocaches };
  window.LEAGUE_DATA = model;
  return model;
}
