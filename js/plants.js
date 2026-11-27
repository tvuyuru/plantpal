/* ==========================================================
   PlantPal - plants.js  (used on plants.html / "My Plants")

   What it does:
     1. Asks the server for the logged-in user's plants (GET /api/plants) - the READ part of CRUD
     2. Draws one card per plant, with an Edit link and a Delete button
     3. Delete asks for confirmation first, then calls DELETE /api/plants/:id and removes the card
     4. Shows an empty-state card when the user has no plants yet
   All plant text is put on the page with textContent (never innerHTML), so a plant named
   like "<script>" is shown as plain text and can never run as HTML.
   ========================================================== */

// The grid the cards go into, the empty-state card, and the box at the top for errors
const listEl = document.querySelector("#plant_list");
const emptyEl = document.querySelector("#empty_state");
const messageEl = document.querySelector("#plant_message");

// Shows a one-line error in the box at the top of the page (used when a request fails)
function showError(text) {
  messageEl.textContent = text;
  messageEl.hidden = false; // the box is hidden until there is something to say
}

// Works out a short "next watering" label from the last watered date and the interval
function nextWateringLabel(plant) {
  // A plant with no last-watered date or no interval has no schedule to work out
  if (!plant.last_watered || !plant.water_every_days) return "No schedule";
  // last_watered arrives as "YYYY-MM-DD" text (the server sets dateStrings), so we build the
  // date from its parts, not new Date("2026-11-20"), which would shift a day with the time zone
  const parts = plant.last_watered.split("-");
  const next = new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2]),
  );
  next.setDate(next.getDate() + Number(plant.water_every_days)); // last watered + the interval
  const today = new Date();
  today.setHours(0, 0, 0, 0); // compare whole days, so the time of day does not matter
  const days = Math.round((next - today) / (1000 * 60 * 60 * 24)); // days from today (negative = overdue)
  if (days < 0)
    return "Overdue by " + -days + " day" + (-days === 1 ? "" : "s");
  if (days === 0) return "Water today";
  if (days === 1) return "Tomorrow";
  return "In " + days + " days";
}

// Builds one plant card as a DOM element (not an HTML string, so the text stays text)
function makeCard(plant) {
  const card = document.createElement("div");
  card.className = "plant-card";

  // The plant's name is the card heading
  const title = document.createElement("h3");
  title.className = "plant-card-name";
  title.textContent = plant.name; // textContent so a name can never run as HTML
  card.appendChild(title);

  // The species line is shown under the name, but only when the user gave one
  if (plant.species) {
    const sp = document.createElement("p");
    sp.className = "plant-card-species";
    sp.textContent = plant.species;
    card.appendChild(sp);
  }

  // A small label/value list of the plant's details
  const details = document.createElement("dl");
  details.className = "plant-card-details";
  // Adds one label + value row; skips the row entirely when the value is empty
  function addDetail(label, value) {
    if (!value) return; // leave out empty optional fields instead of showing a blank row
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    details.appendChild(dt);
    details.appendChild(dd);
  }
  addDetail("Location", plant.location);
  addDetail("Next watering", nextWateringLabel(plant));
  if (plant.notes) addDetail("Notes", plant.notes);
  card.appendChild(details);

  // Actions row: Edit opens the form, Delete removes the plant
  const actions = document.createElement("div");
  actions.className = "plant-card-actions";

  // Edit is a link to the form with ?id=..., which tells add-plant.js to edit this plant
  const edit = document.createElement("a");
  edit.className = "btn btn-small";
  edit.href = "/add-plant?id=" + plant.id;
  edit.textContent = "Edit";
  actions.appendChild(edit);

  // Delete is a button; its click runs deletePlant for this plant and its card
  const del = document.createElement("button");
  del.type = "button";
  del.className = "btn btn-small btn-danger";
  del.textContent = "Delete";
  del.addEventListener("click", function () {
    deletePlant(plant, card);
  });
  actions.appendChild(del);

  card.appendChild(actions);
  return card;
}

// Deletes one plant after asking the user to confirm
function deletePlant(plant, card) {
  // window.confirm stops here unless the user clicks OK
  if (!window.confirm('Delete "' + plant.name + '"? This cannot be undone.'))
    return;
  fetch("/api/plants/" + plant.id, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  })
    .then(function (r) {
      if (!r.ok) throw new Error("delete failed"); // the server did not confirm the delete
      card.remove(); // take the card off the page, no reload
      // If that was the last card, show the empty-state card
      if (!listEl.querySelector(".plant-card")) emptyEl.hidden = false;
    })
    .catch(function () {
      showError("Could not delete that plant. Please try again.");
    });
}

// Runs on page load: ask the server for the plants and draw them
fetch("/api/plants", { headers: { Accept: "application/json" } })
  .then(function (r) {
    // 401 means there is no session, so send the person to the login page
    if (r.status === 401) {
      window.location.href = "/login.html";
      return null;
    }
    return r.json();
  })
  .then(function (plants) {
    if (!plants) return; // we were redirected to login, so there is nothing to draw
    if (plants.length === 0) {
      emptyEl.hidden = false;
      return;
    } // no plants yet: show the empty state
    plants.forEach(function (p) {
      listEl.appendChild(makeCard(p));
    }); // one card per plant
  })
  .catch(function () {
    showError("Could not load your plants. Please try again.");
  });
