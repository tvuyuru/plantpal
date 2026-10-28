/* ==========================================================
   PlantPal - user.js (vanilla JavaScript, used on every page)

   What it does:
     1. Looks for a saved login in sessionStorage (saved by js/login.js)
     2. If there is one: shows "Hi, <first name>" and a Log out link in the
        header bar, and hides the Sign Up and Login links
     3. If there is none, the header stays as it is (Sign Up and Login links only)
     4. Clicking Log out clears the saved login
     5. If js/login.js left a one-time message (like "You have logged in successfully"),
        shows it in a green box at the top of the page, once
   ========================================================== */

// Read the logged-in user's first name (null if nobody has logged in)
// TEMPORARY: this reads the first name that js/login.js saved in the browser.
// Later the server will say who is logged in, and this line will be replaced.
let user = sessionStorage.getItem('plantpal_user');

if (user !== null) {
  // Find the header pieces: the hidden name, the hidden Log out link and the Login and Sign Up links
  let user_name = document.querySelector('#user_name');
  let logout_link = document.querySelector('#logout_link');
  let login_link = document.querySelector('#login_link');
  let signup_link = document.querySelector('#signup_link');

  // Show the name and the Log out link, and hide the Login and Sign Up links
  user_name.textContent = 'Hi, ' + user;
  user_name.hidden = false;
  logout_link.hidden = false;
  login_link.hidden = true;
  signup_link.hidden = true;

  // Log out: clear the saved login. The link's own address (index.html)
  // then opens the Home page.
  // TEMPORARY: later the server will end the session instead.
  logout_link.addEventListener('click', function () {
    sessionStorage.removeItem('plantpal_user');
  });
}

// One-time message from js/login.js: show it at the top of the page, then forget it
// so it does not appear again when the page is reloaded or another page is opened
let flash = sessionStorage.getItem('plantpal_flash');
if (flash !== null) {
  sessionStorage.removeItem('plantpal_flash');
  let box = document.createElement('div');
  box.className = 'form-message success flash';
  box.setAttribute('role', 'status');
  box.textContent = flash; // textContent (not innerHTML) so the text can never run as HTML
  document.querySelector('.wrap').prepend(box);
}