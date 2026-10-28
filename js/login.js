/* ==========================================================
   PlantPal - login.js (used on login.html)

   What it does:
     1. Checks that the username and password are filled in, as the person types and when
        they leave a field, and shows a red error right under the field
     2. Sends them to the server (POST /login) without leaving the page
     3. If the server says no, shows its message in a red box at the top of the form,
        with a "Back to login" link
     4. On success it saves the first name in sessionStorage, so js/user.js can show
        "Hi, name" and the Log out link, saves the server's message "You have logged in successfully"
        for the Dashboard to show once, and opens the Dashboard
        TEMPORARY: the server does not keep a session yet. That comes in the next assignment.
   ========================================================== */

// The form, the box at the top of the form, and the submit button
let form = document.querySelector('#login_form');
let message = document.querySelector('#form_message');
let button = form.querySelector('button[type="submit"]');

// Shows a message in the box at the top of the form (used for the server's answers).
// type is "error" (red) or "success" (green); lines is a list of sentences, one per line.
// link (optional) is { href, text }: a link shown under the message.
function showMessage(type, lines, link) {
  // The box is hidden when empty, so it does not take up space when there is no message
  message.className = 'form-message ' + type;
  message.replaceChildren(); // empty the box first
  // Add each line of the message as a separate div, so it wraps nicely
  lines.forEach(function (line) {
    let div = document.createElement('div');
    div.textContent = line; // textContent (not innerHTML) so server text can never run as HTML
    message.appendChild(div);
  });
  // If the server sent a link, show it under the message
  if (link) {
    let a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.text;
    message.appendChild(a);
  }
  message.hidden = false;
}

// js/register.js sends people here with ?registered=1 after a successful sign up
if (new URLSearchParams(window.location.search).get('registered') === '1') {
  showMessage('success', ['You have successfully registered. Please log in.']);
}

// One rule per field: returns an error sentence, or '' when the value is fine
let rules = {
  username: function (v) { return v === '' ? 'Please enter your username.' : ''; },
  password: function (v) { return v === '' ? 'Please enter your password.' : ''; }
};

// Returns a field's current value (the password is left exactly as typed, the others are trimmed)
function valueOf(name) {
  let value = document.querySelector('#' + name).value;
  return name === 'password' ? value : value.trim();
}

// Checks one field and shows or clears the red error text right under it.
// Returns true when the field is fine.
function checkField(name) {
  let input = document.querySelector('#' + name);
  let error = rules[name](valueOf(name));

  // The error line is created the first time it is needed, right after the input
  let note = document.querySelector('#' + name + '_error');
  if (!note) {
    note = document.createElement('p');
    note.id = name + '_error';
    note.className = 'field-error';
    input.insertAdjacentElement('afterend', note);
  }
  // Show or hide the error line, and add or remove the red border on the field
  note.textContent = error;
  note.hidden = (error === '');
  input.classList.toggle('invalid', error !== ''); // red border while there is an error
  input.setAttribute('aria-invalid', error !== '' ? 'true' : 'false');

  // The gray hint under the field is hidden while its red error is showing
  let hint = note.nextElementSibling;
  if (hint && hint.classList.contains('form-hint')) hint.hidden = (error !== '');
  return error === '';
}

// Check each field while the person types, and when they leave the field,
// so errors show up without having to click the button
Object.keys(rules).forEach(function (name) {
  let input = document.querySelector('#' + name);
  let left = false; // true once the person has left this field at least once
  // When the person leaves the field, check it once
  input.addEventListener('blur', function () {
    left = true;
    checkField(name);
  });
  // When the person types, check it once if they have left the field at least once,
  // or if they are clearing an error that is showing, or if they are typing something for the first time
  input.addEventListener('input', function () {
    let note = document.querySelector('#' + name + '_error');
    let errorShowing = note !== null && !note.hidden;
    // Check once there is something typed, after leaving the field, or to clear an error that is showing
    if (left || input.value !== '' || errorShowing) checkField(name);
  });
});

// When the person clicks the button, check both fields and send them to the server if they are fine
form.addEventListener('submit', function (event) {
  event.preventDefault(); // stay on the page and send the form with fetch instead
  message.hidden = true;

  // Check both fields. Each wrong one shows its own error, and the first wrong one gets the cursor.
  let firstWrong = null;
  Object.keys(rules).forEach(function (name) {
    if (!checkField(name) && firstWrong === null) firstWrong = name;
  });
  if (firstWrong !== null) {
    document.querySelector('#' + firstWrong).focus();
    return;
  }

  button.disabled = true; // stops a double click from sending twice
  // Send the username and password to the server, and wait for its answer
  fetch('/login', {
    method: 'POST',
    headers: { 'Accept': 'application/json' }, // asks the server for JSON instead of a small page
    body: new URLSearchParams({ username: valueOf('username'), password: valueOf('password') })
  })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (!data.ok) {
        // The link opens a fresh login page (empty form, message gone)
        showMessage('error', data.errors, { href: 'login.html', text: 'Back to login' });
        button.disabled = false;
        return;
      }
      sessionStorage.setItem('plantpal_user', data.first_name);
      // The Dashboard shows this message once (js/user.js), then forgets it
      sessionStorage.setItem('plantpal_flash', data.message);
      // Logged in: go straight to the Dashboard (its header shows "Hi, name" and Log out)
      window.location.href = 'dashboard.html';
    })
    .catch(function () {
      // The server is not running, or the network is down, or the server did not answer with JSON
      showMessage('error', ['Could not reach the server. Is it running?']);
      button.disabled = false;
    });
});