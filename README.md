# Liga Geocachingowa

Statyczna strona ligi geocachingowej dla zastępów starszoharcerskich. Interakcja odbywa się przez Google Forms a strona pobiera dane z publicznego endpointu Google Apps Script (adres w `js/data.js`).

## Strony

- `rules.html` — zasady ligi
- `leaderboard.html` — ranking drużyn + lista wszystkich skrytek, oba klikalne do pełnych statystyk
- `map.html` — mapa skrytek (Leaflet + OpenStreetMap), plus panel skrytek o nieprawidłowej lokalizacji

## Jak to działa

`js/data.js` pobiera dane raz na wejście i buduje jeden spójny model, z którego korzystają obie dynamiczne strony — reszta plików JS tylko renderuje. Współrzędne akceptowane są w formacie DMS lub dziesiętnym; te niepoprawne albo leżące poza Poznaniem (stała `BOUNDS` w `data.js`) trafiają do panelu "nieprawidłowe lokalizacje" zamiast na mapę.

## Publikacja

Zwykły GitHub Pages z głównej gałęzi — brak kroku budowania.
Skrypty to moduły ES (`<script type="module">`), więc trzeba otwierać przez np. live server
