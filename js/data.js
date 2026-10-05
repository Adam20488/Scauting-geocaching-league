// Central data layer: fetches the league endpoint once and builds a fully
// cross-linked in-memory model that every page reads from. No DOM code here.

import { teamColor } from "./colors.js";
import { isSafeHttpUrl } from "./security.js";

const ENDPOINT_URL =
  "https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnTR3vh8s1nyNuK40IXgKUbVGjj5QXlitWE6_kG1NGBTD37aBCCzPIInzbQDeTKVvblI8JcY6kgy3bgUdDNN6b0JmActxQ63Qsf29CsaUA4RaLghUJSiPtN3ZFqdduoSbUrS-kObUc-NGn7-hA1f3ClLABDbjpY5Od-YMuGhQRUUQKKzBVt4gCFe_hUBi9c4XSIPrmsuWIkHweR5Rrj0gAZ1ncV1XQMepQxWxfZPLS6mTjOqIABW2HnsW2CQosvMzkZXrtNRu0R_8y4AlL6HCq8r_waZog&lib=MFp1IkcbZkiqOZNIX9XpwU9ZMTqRCn_1T";

// Plausibility box around Poznań — catches parseable-but-wrong coordinates
// (swapped lat/lon, fat-fingered digits) without depending on exact matches.
const BOUNDS = { minLat: 52.3, maxLat: 52.5, minLon: 16.75, maxLon: 17.2 };

const FIELD = {
  // Registration + hiding-creation are one form now, so the team-name key
  // differs between that sheet ("creation") and the scores/findings sheets,
  // which still use the older combined key.
  creationTeamName: "Nazwa zastępu",
  scoreTeamName: "Nazwa zastępu/drużyny",
  troop: "Drużyna",
  location: `Lokalizacja
(format Google Maps, czyli np.:
52.379898, 16.947147
52°22'47.6"N 16°56'49.7"E)`,
  cacheName: "Nazwa skrytki",
  hint: "Wskazówki skrytki",
  photos: "zdjęcia",
  fullName: "Pełna nazwa",
  // "Adres e-mail" also comes through on this sheet (Google Forms' own
  // "collect email" setting) but is deliberately never read here — it's
  // the submitter's personal address and has no business in a public model.
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

// Score is always an integer now (finding count + 0 or 1), but this stays
// defensive in case a fractional value ever comes back from the endpoint.
export function formatScore(score) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

// --- Main model builder --------------------------------------------------

// The most recently fetched model, so UI modules (e.g. the detail modal) can
// look things up on demand without the data being passed through every call.
let leagueData = null;

export function getLeagueData() {
  return leagueData;
}

export async function fetchLeagueData() {
  const res = await fetch(ENDPOINT_URL);
  if (!res.ok) throw new Error(`Endpoint returned ${res.status}`);
  const raw = await res.json();

  const teams = new Map();
  (raw.scores || []).forEach((row, index) => {
    const name = row[FIELD.scoreTeamName];
    teams.set(name, {
      name,
      order: index,
      troop: null, // filled in below, once creation rows are processed
      color: null, // ditto — color is assigned per troop, not per team
      znalezienia: Number(row.znalezienia) || 0,
      creationPoint: 0,
      score: 0,
      createdCaches: [],
      foundCaches: [],
    });
  });

  // Troop ("Drużyna") owns the marker color now, not the individual team —
  // several teams/zastępy can belong to the same troop. Colors are assigned
  // in first-appearance order within this sheet (registration order, since
  // registration and hiding-creation are the same form submission now).
  const troopOrder = new Map();
  const geocaches = new Map();
  (raw.creation || []).forEach((row) => {
    const fullName = row[FIELD.fullName];
    const rawLocation = row[FIELD.location] || "";
    const { coords, reason } = parseLocation(rawLocation);
    const creatorTeam = row[FIELD.creationTeamName];
    const troop = row[FIELD.troop] || creatorTeam;
    if (!troopOrder.has(troop)) troopOrder.set(troop, troopOrder.size);

    const photos = Array.isArray(row[FIELD.photos])
      ? row[FIELD.photos].filter(isSafeHttpUrl)
      : [];

    const geocache = {
      fullName,
      cacheName: row[FIELD.cacheName],
      creatorTeam,
      troop,
      hint: row[FIELD.hint] || "",
      photos,
      rawLocation,
      coords,
      invalidReason: reason,
      isValid: coords !== null,
      finders: [],
      lacks: 0,
    };
    geocaches.set(fullName, geocache);
    const creator = teams.get(creatorTeam);
    if (creator) {
      creator.createdCaches.push(geocache);
      creator.troop = troop;
    }
  });

  (raw.findings || []).forEach((row) => {
    const finderName = row[FIELD.scoreTeamName];
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

  // Score = finding points + 1 if the team's own hiding has a valid
  // location, 0 otherwise (each team has exactly one hiding now, so this is
  // just "does any of its created caches validate" — normally just the one).
  teams.forEach((team) => {
    team.color = teamColor(team.troop != null ? troopOrder.get(team.troop) : team.order);
    team.creationPoint = team.createdCaches.some((g) => g.isValid) ? 1 : 0;
    team.score = team.znalezienia + team.creationPoint;
  });

  const teamList = [...teams.values()].sort((a, b) => b.score - a.score);
  const geocacheList = [...geocaches.values()];
  const invalidGeocaches = geocacheList.filter((g) => !g.isValid);

  const model = { teams, geocaches, teamList, geocacheList, invalidGeocaches };
  leagueData = model;
  return model;
}
