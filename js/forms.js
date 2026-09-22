// Central place for the Google Form links so every page/button stays in sync.

const FORM_LINKS = {
  registerTeam: {
    url: "https://docs.google.com/forms/d/e/1FAIpQLSeTbc67rvu7Gcw2Y43oSrDB6xCHAtB3Asi16yARJkbVrgZKmg/viewform",
    label: "Zarejestruj drużynę",
  },
  createHiding: {
    url: "https://docs.google.com/forms/d/e/1FAIpQLSfqewBwLnQC4EF3ww-1W0t8qDGcQRSBQDi26v5dCQy_HxsCcg/viewform",
    label: "Zgłoś nową skrytkę",
  },
  findHiding: {
    url: "https://docs.google.com/forms/d/e/1FAIpQLSeWH1LNIrWqHchUs_A4InI_fBILQAeORv5Gt1TRm7vORZ9RUg/viewform",
    label: "Zgłoś znalezienie skrytki",
  },
  reportNotFound: {
    url: "https://docs.google.com/forms/d/e/1FAIpQLSfwpC-urzXWutONTkbBrNpi6lDllZheQCeCj2nMoitFOfbwHA/viewform",
    label: "Zgłoś brak skrytki",
  },
  fixNotFound: {
    url: "https://docs.google.com/forms/d/e/1FAIpQLSfEtWi4AxMDWbMeTOsZZK0sXbQ0jSwiLSqHA_vRNWcDiJPQtA/viewform",
    label: "Popraw/wycofaj zgłoszenie braku",
  },
};

function formButton(key, extraClass) {
  const form = FORM_LINKS[key];
  if (!form) return "";
  return `<a class="form-btn${extraClass ? " " + extraClass : ""}" href="${form.url}" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 2.5L18.5 9H14V4.5zM8 13h8v1.5H8V13zm0 3.5h8V18H8v-1.5zM8 9.5h3V11H8V9.5z"/>
      </svg>
      ${form.label}
    </a>`;
}
