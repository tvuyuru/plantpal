/* ==========================================================
   PlantPal - login.js (used only by login.html)
 
   What it does:
     1. Runs when the login form is submitted
     2. Saves the email in sessionStorage as the logged-in user
     3. Opens the Dashboard
 
   IMPORTANT: this is still in development. There is no server yet, so
   nothing is checked and any email and password are accepted.
   The password is never saved. Real login comes with the back end.
   ========================================================== */
 
// Grab the form from the page
let login_form = document.querySelector('#login_form');
 
// Runs when the Log in button is pressed (or Enter is pressed in a box).
// The browser has already checked that both boxes are filled in and that
// the email looks like an email, because of "required" and type="email".
login_form.addEventListener('submit', function (event) {
  // Stop the browser from sending the form itself (that would put the
  // email and password in the address bar)
  event.preventDefault();
 
  // Save who logged in. sessionStorage keeps it while the browser tab is open,
  // and it is cleared when the tab or browser is closed.
  // TEMPORARY: saving the email in the browser is only temporary until the real
  // login is built. Later the server will check the email and password and
  // start the session.
  let email = document.querySelector('#email').value.trim();
  sessionStorage.setItem('plantpal_user', email);
 
  // Go to the Dashboard
  window.location.href = 'dashboard.html';
});