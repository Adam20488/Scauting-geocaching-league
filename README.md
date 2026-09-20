# Liga Geocachingowa

Statyczna strona ligi geocachingowej dla zastępów/drużyn harcerskich. Bez backendu — cała treść (drużyny, skrytki, znalezienia) jest pobierana przy każdym wejściu na stronę z publicznego endpointu Google Apps Script (adres w `js/data.js`).

## Strony

- `rules.html` — regulamin (do uzupełnienia własną treścią)
- `leaderboard.html` — ranking drużyn + lista wszystkich skrytek, oba klikalne do pełnych statystyk
- `map.html` — mapa skrytek (Leaflet + OpenStreetMap), kolor znacznika zależny od drużyny-twórcy, plus panel skrytek o nieprawidłowej lokalizacji

## Jak to działa

`js/data.js` pobiera dane raz na wejście i buduje jeden spójny model (drużyny ↔ skrytki ↔ znalezienia), z którego korzystają obie dynamiczne strony — reszta plików JS tylko renderuje. Kolory drużyn są deterministyczne (kąt złoty, wg kolejności rejestracji w arkuszu), więc zawsze te same. Współrzędne akceptowane są w formacie DMS lub dziesiętnym; te niepoprawne albo leżące poza Poznaniem (stała `BOUNDS` w `data.js`) trafiają do panelu "nieprawidłowe lokalizacje" zamiast na mapę.

## Publikacja

Zwykły GitHub Pages z głównej gałęzi — brak kroku budowania.
