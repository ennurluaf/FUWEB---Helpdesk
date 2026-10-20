// app-00.js
// Small helpers that apply to every lesson on the page.
// Load it before the lesson scripts: <script src="app-00.js"></script>
//
// To add a helper: write a function below and call it in the list at the end.

/**
 * Right-click a text field to clear it.
 * Shift + right-click still opens the normal browser menu (copy, paste, …).
 * Disabled and read-only fields are left alone.
 */
function clearFieldOnRightClick() {
  const TYPES = ["checkbox", "radio", "button", "submit"];
  const NOT = TYPES.map((t) => `:not([type="${t}"])`).join("");
  const CLEARABLE = `input${NOT}, textarea`;

  document.addEventListener("contextmenu", (event) => {
    const field = event.target.closest(CLEARABLE);
    if (!field || event.shiftKey || field.disabled || field.readOnly) return;

    event.preventDefault();
    if (field.value === "") return;

    field.value = "";
    field.focus();
    // Let other scripts know the value changed (live previews, validation, …).
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

/**
 * Clicking a link to a lesson (e.g. <a href="#lesson-03">) opens that lesson's
 * <details> before the page scrolls to it. Works for the id on the <details>
 * itself or on any element inside it, also when the page is opened with
 * #lesson-03 in the address or when going back/forward.
 */
function openDetailsForLinks() {
  function openTarget(hash) {
    if (!hash || hash === "#") return;

    const target = document.getElementById(location.hash.slice(1));
    if (!target) return;

    // Close all details
    document.querySelectorAll("details").forEach((d) => {
      d.open = false;
    });

    // Open the target's details and all parent details
    let details = target.closest("details");
    while (details) {
      details.open = true;
      details = details.parentElement?.closest("details");
    }
  }

  const openDetails = (detail) => (other) => {
    if (other !== detail) other.open = false;
  };
  document.querySelectorAll("details").forEach((detail) => {
    detail.addEventListener("toggle", () => {
      if (!detail.open) return;
      document.querySelectorAll("details").forEach(openDetails(detail));
    });
  });
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link) openTarget(link.getAttribute("href"));
  });
  window.addEventListener("hashchange", () => {
    const uriID = decodeURIComponent(location.hash.slice(1));
    openTarget(location.hash);
    document.getElementById(uriID)?.scrollIntoView();
  });
  openTarget(location.hash);
}

// ---------- turn helpers on ----------
clearFieldOnRightClick();
openDetailsForLinks();
