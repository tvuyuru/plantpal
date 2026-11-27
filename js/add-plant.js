/* ==========================================================
   PlantPal - add-plant.js  (used on add-plant.html)

   What it does:
     The plant form - CREATE a new plant (POST /api/plants) or UPDATE an
     existing one (PUT /api/plants/:id). These are the C and U of CRUD.
     Edit mode is on when the page is opened as /add-plant?id=123: the form
     is pre-filled from GET /api/plants/123 so the user edits real values.
   (The AI diagnosis lives on its own page now - see js/diagnose.js.)
   All text that comes back from the server is put on the page with textContent
   (never innerHTML), so it is always shown as plain text and can never run.
   ========================================================== */

/* ---------- small helpers ---------- */

// Shows a message box with one or more lines. type is "error" (red) or "success" (green).
function setBox(box, type, lines) {
  box.className = "form-message " + type; // swap the colour class to match the message type
  box.replaceChildren(); // clear anything shown from a previous attempt
  lines.forEach(function (line) {
    const div = document.createElement("div");
    div.textContent = line; // textContent so server text can't run as HTML
    box.appendChild(div);
  });
  box.hidden = false; // the box stays hidden until there is something to say
}
// Hides a message box and empties it (used at the start of each submit)
function hideBox(box) {
  box.hidden = true;
  box.replaceChildren();
}

/* ---------- the plant form: create (POST) or update (PUT) ---------- */

const form = document.querySelector("#plant_form");
const formMsg = document.querySelector("#form_message");
const formTitle = document.querySelector("#form_title");
const saveBtn = document.querySelector("#save_btn");

// Is there an ?id= in the URL? If so we are editing that plant, not adding a new one
const editId = new URLSearchParams(window.location.search).get("id");

// Edit mode: change the heading/button wording and load the plant so the form starts filled
if (editId) {
  formTitle.textContent = "Edit Plant";
  saveBtn.textContent = "Update plant";
  fetch("/api/plants/" + editId, { headers: { Accept: "application/json" } })
    .then(function (r) {
      if (r.status === 401) {
        window.location.href = "/login.html";
        return null;
      } // no session: go log in
      if (r.status === 404) {
        setBox(formMsg, "error", ["That plant was not found."]);
        return null;
      } // not this user's plant
      return r.json();
    })
    .then(function (p) {
      if (!p) return; // we were redirected or the plant was missing, so there is nothing to fill
      // Fill each field; "|| ''" leaves the box empty instead of showing "null" for missing values
      document.querySelector("#name").value = p.name || "";
      document.querySelector("#species").value = p.species || "";
      document.querySelector("#location").value = p.location || "";
      document.querySelector("#last_watered").value = p.last_watered || ""; // already "YYYY-MM-DD" text
      document.querySelector("#water_every_days").value =
        p.water_every_days || "";
      document.querySelector("#notes").value = p.notes || "";
    })
    .catch(function () {
      setBox(formMsg, "error", ["Could not load that plant."]);
    });
}

// Reads the form values into a plain object ready to send as JSON
function readForm() {
  return {
    name: document.querySelector("#name").value.trim(), // trim so " Fern " is stored as "Fern"
    species: document.querySelector("#species").value.trim(),
    location: document.querySelector("#location").value.trim(),
    last_watered: document.querySelector("#last_watered").value, // "YYYY-MM-DD" or "" if left blank
    water_every_days: document.querySelector("#water_every_days").value,
    notes: document.querySelector("#notes").value.trim(),
  };
}

// On submit: send a create (POST) or an update (PUT) depending on edit mode
form.addEventListener("submit", function (e) {
  e.preventDefault(); // stop the browser from doing its own page-reloading form submit
  hideBox(formMsg); // clear any message from a previous try

  const data = readForm();
  // A name is the one required field, so check it here before bothering the server
  if (!data.name) {
    setBox(formMsg, "error", ["Please enter a name for the plant."]);
    return;
  }

  // Same form, two jobs: edit mode PUTs to this plant's id, add mode POSTs to the collection
  const url = editId ? "/api/plants/" + editId : "/api/plants";
  const method = editId ? "PUT" : "POST";
  saveBtn.disabled = true; // stop a double click from saving the same plant twice

  fetch(url, {
    method: method,
    headers: { "Content-Type": "application/json", Accept: "application/json" }, // we are sending JSON
    body: JSON.stringify(data),
  })
    .then(function (r) {
      if (r.status === 401) {
        window.location.href = "/login.html";
        return;
      } // session ended mid-edit
      // Keep the status next to the body so the next step can tell success from a validation error
      return r.json().then(function (body) {
        return { status: r.status, body: body };
      });
    })
    .then(function (resp) {
      if (!resp) return; // we were redirected to login, so stop here
      if (resp.status === 200 || resp.status === 201) {
        // 201 = created, 200 = updated
        window.location.href = "/plants"; // saved: go back to the list
        return;
      }
      // Not saved: show the server's field errors, or a fallback line if it sent none
      const errs = (resp.body && resp.body.errors) || [
        (resp.body && resp.body.error) || "Could not save the plant.",
      ];
      setBox(formMsg, "error", errs);
      saveBtn.disabled = false; // let the user fix it and try again
    })
    .catch(function () {
      setBox(formMsg, "error", ["Could not reach the server."]);
      saveBtn.disabled = false;
    });
});
