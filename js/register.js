/* ==========================================================
   PlantPal - register.js (used on register.html)

   What it does:
     1. Checks each field as the person types and when they leave it, and shows a red
        error right under the field (no need to click the button first)
     2. When Sign up is clicked, checks every field again and stops if any is wrong
     3. Sends the fields to the server (POST /register) without leaving the page
     4. Shows the server's answer in the box at the top of the form
        (for example "That username is already taken.")
     5. On success it opens the login page, which shows "You have successfully registered"
   ========================================================== */

// The form, the box at the top of the form, and the submit button
let form = document.querySelector('#register_form');
let message = document.querySelector('#form_message');
let button = form.querySelector('button[type="submit"]');

// Shows a message in the box at the top of the form (used for the server's answers).
// type is "error" (red) or "success" (green); lines is a list of sentences, one per line.
function showMessage(type, lines) {
  // The box is hidden when empty, so it does not take up space when there is no message
  message.className = 'form-message ' + type;
  message.replaceChildren(); // empty the box first
  // Add each line of the message as a separate div, so it wraps nicely
  lines.forEach(function (line) {
    let div = document.createElement('div');
    div.textContent = line; // textContent (not innerHTML) so server text can never run as HTML
    message.appendChild(div);
  });
  message.hidden = false;
}

// One rule per field: returns an error sentence, or '' when the value is fine.
// The server checks the same rules again (js/server.js), because anyone can skip this page.
let rules = {
  // The first name and last name rules are the same as the server's: must not be empty
  first_name: function (v) { return v === '' ? 'Please enter your first name.' : ''; },
  last_name: function (v) { return v === '' ? 'Please enter your last name.' : ''; },
  // The username rules are the same as the server's: 3 to 30 letters, numbers or underscores
  username: function (v) {
    return /^[A-Za-z0-9_]{3,30}$/.test(v) ? '' : 'Username must be 3 to 30 letters, numbers or underscores.';
  },
  // The e-mail rules are the same as the server's: must have an @ and a dot, and no spaces
  email: function (v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Please enter a valid e-mail address.';
  },
  // The password rules are the same as the server's: at least 8 characters, with a letter and a number
  password: function (v) {
    return (v.length >= 8 && /[A-Za-z]/.test(v) && /[0-9]/.test(v)) ? '' : 'Password must be at least 8 characters with a letter and a number.';
  },
  // The zip code rules are the same as the server's: must be 5 digits, or empty
  zip_code: function (v) {
    return (v === '' || /^[0-9]{5}$/.test(v)) ? '' : 'Zip code must be 5 digits, or leave it empty.';
  }
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

// When the person clicks Sign up, check every field again, and if all are fine, send them to the server
form.addEventListener('submit', function (event) {
  event.preventDefault(); // stay on the page and send the form with fetch instead
  message.hidden = true;

  // Check every field. Each wrong one shows its own error, and the first wrong one gets the cursor.
  let firstWrong = null;
  Object.keys(rules).forEach(function (name) {
    if (!checkField(name) && firstWrong === null) firstWrong = name;
  });
  if (firstWrong !== null) {
    document.querySelector('#' + firstWrong).focus();
    return;
  }

  let fields = {};
  Object.keys(rules).forEach(function (name) { fields[name] = valueOf(name); });

  button.disabled = true; // stops a double click from sending twice
  // Send the fields to the server, and show the server's answer in the box at the top of the form
  fetch('/register', {
    method: 'POST',
    headers: { 'Accept': 'application/json' }, // asks the server for JSON instead of a small page
    body: new URLSearchParams(fields)
  })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      // The server's answer is in data.ok (true or false) and data.errors (a list of sentences)
      if (!data.ok) {
        showMessage('error', data.errors);
        button.disabled = false;
        return;
      }
      // Registered: go to the login page, which shows the success message
      window.location.href = 'login.html?registered=1';
    })
    .catch(function () {
      // The server could not be reached (for example it is not running)
      showMessage('error', ['Could not reach the server. Is it running?']);
      button.disabled = false;
    });
});