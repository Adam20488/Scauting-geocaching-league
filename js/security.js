// Shared defenses against data from the public sheet (any scout can type
// anything into those forms) ending up as live HTML/JS in the page.

// Use before inserting any sheet-sourced text into innerHTML — as text
// content or inside an attribute (it escapes quotes too, so it's safe
// either way the attribute is delimited).
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Only plain http(s) URLs are allowed into src/href attributes — blocks
// javascript:, data:, vbscript: and similar script-executing schemes that
// could otherwise ride in through a sheet field (e.g. the photo list).
export function isSafeHttpUrl(url) {
  if (typeof url !== "string" || !url) return false;
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
