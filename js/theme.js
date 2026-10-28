/* ==========================================================
   PlantPal - theme.js (vanilla JavaScript)

   Light / dark theme switch, following the dev.to
   "dark theme in 5 minutes" article:
     1. css/style.css keeps every color in CSS variables
     2. The dark values apply when <html> has the class "dark_mode"
     3. This script toggles that class and saves the choice in localStorage

   It is loaded in each page's <head>, so the saved theme is
   applied before the page paints (no flash of the wrong theme).
   ========================================================== */

// Is dark mode on right now?
function is_dark() {
  return document.documentElement.classList.contains('dark_mode');
}

// Update the toggle button's label and its screen-reader state
function update_button() {
  let theme_toggler = document.querySelector('#theme_toggler');
  if (theme_toggler === null) {
    return; // the button does not exist yet while this script runs in the <head>
  }
  theme_toggler.textContent = is_dark() ? '☀️ Light' : '🌙 Dark';
  theme_toggler.setAttribute('aria-pressed', String(is_dark()));
}

// Read the saved choice ("dark_mode" or "default") and apply it.
// If nothing is saved yet, the page stays in the light theme.
function retrieve_theme() {
  let theme = localStorage.getItem('website_theme');
  if (theme !== null) {
    document.documentElement.classList.remove('default', 'dark_mode');
    document.documentElement.classList.add(theme);
  }
  update_button();
}

// Apply the saved theme right away, before the page paints
retrieve_theme();

// Once the page has loaded, set the button label and listen for clicks
document.addEventListener('DOMContentLoaded', function () {
  update_button();

  let theme_toggler = document.querySelector('#theme_toggler');
  theme_toggler.addEventListener('click', function () {
    // Flip the class: the CSS variables change, so the whole page re-colors
    document.documentElement.classList.toggle('dark_mode');

    // Save the choice so it stays after a refresh and on every other page
    if (is_dark()) {
      localStorage.setItem('website_theme', 'dark_mode');
    } else {
      localStorage.setItem('website_theme', 'default');
    }
    update_button();
  });
});

// Another tab or window of this same site changed the theme: apply it here too
window.addEventListener('storage', function () {
  retrieve_theme();
}, false);