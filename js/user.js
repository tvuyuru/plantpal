/* ==========================================================
   PlantPal - user.js (used on every page)

   What it does:
     1. Looks for a saved login in sessionStorage (saved by js/login.js)
     2. If there is one: shows "Hi, <email>" and a Log out link in the
        header bar, and hides the Login link
     3. If there is none, the header stays as it is (Login link only)
     4. Clicking Log out clears the saved login
   ========================================================== */

// Read the logged-in user's email (null if nobody has logged in)
// TEMPORARY: this reads the email that js/login.js saved in the browser.
// Later the server will say who is logged in.
let user = sessionStorage.getItem('plantpal_user');

if (user !== null) {
  // Find the header pieces: the hidden name, the hidden Log out link and the Login link
  let user_name = document.querySelector('#user_name');
  let logout_link = document.querySelector('#logout_link');
  let login_link = document.querySelector('#login_link');

  // Show the name and the Log out link, and hide the Login link
  user_name.textContent = 'Hi, ' + user;
  user_name.hidden = false;
  logout_link.hidden = false;
  login_link.hidden = true;

  // Log out: clear the saved login. The link's own address (index.html)
  // then opens the Home page.
  // TEMPORARY: later the server will end the session instead.
  logout_link.addEventListener('click', function () {
    sessionStorage.removeItem('plantpal_user');
  });
}