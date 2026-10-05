import { formButton } from "./forms.js";

const FORM_KEYS = ["createHiding", "findHiding", "reportNotFound", "fixNotFound"];

document.getElementById("forms-container").innerHTML = FORM_KEYS.map((key) => formButton(key)).join("");
