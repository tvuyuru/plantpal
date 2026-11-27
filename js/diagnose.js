/* ==========================================================
   PlantPal - diagnose.js  (used on diagnose.html)

   What it does:
     1. Fills the plant dropdown from the user's plants (GET /api/plants)
     2. Lets the user describe symptoms and optionally attach a photo
     3. POSTs it all to /api/diagnose and shows the AI's diagnosis + steps
   If the page is opened as /diagnose?plant=123 the matching plant is pre-selected.
   The result comes back as plain text and is shown with textContent (never
   innerHTML), so it is always shown as plain text and can never run as HTML.
   ========================================================== */

const diagPlant = document.querySelector("#diag_plant");
const diagSymptoms = document.querySelector("#diag_symptoms");
const diagPhoto = document.querySelector("#diag_photo");
const diagBtn = document.querySelector("#diag_btn");
const diagMsg = document.querySelector("#diag_message");
const diagResult = document.querySelector("#diag_result");

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
// Hides a message box and empties it (used at the start of each diagnose)
function hideBox(box) {
  box.hidden = true;
  box.replaceChildren();
}

// Optional ?plant=123 in the URL lets another page link straight here with a plant chosen
const preselectId = new URLSearchParams(window.location.search).get("plant");

// Fill the plant dropdown from the user's plants, so they pick which plant to diagnose
fetch("/api/plants", { headers: { Accept: "application/json" } })
  .then(function (r) {
    if (r.status === 401) {
      window.location.href = "/login.html";
      return null;
    } // no session: go log in
    return r.ok ? r.json() : []; // on any other error, fall back to an empty list
  })
  .then(function (plants) {
    if (!plants) return; // we were redirected to login, so there is nothing to fill
    if (!plants.length) {
      // No plants yet: there is nothing to diagnose, so show a hint and turn the dropdown off
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Add a plant first";
      diagPlant.appendChild(opt);
      diagPlant.disabled = true;
      diagBtn.disabled = true; // nothing to diagnose, so block the button too
      return;
    }
    plants.forEach(function (p) {
      const opt = document.createElement("option");
      opt.value = p.id; // the value we send is the plant's id
      opt.textContent = p.name + (p.species ? " (" + p.species + ")" : ""); // show species in brackets when known
      diagPlant.appendChild(opt);
    });
    if (preselectId) diagPlant.value = preselectId; // pre-select the plant from ?plant=... when given
  });

// Reads the chosen photo file and turns it into base64 text the API can accept
function readPhoto() {
  return new Promise(function (resolve, reject) {
    const file = diagPhoto.files[0];
    if (!file) return resolve(null); // the photo is optional, so "no file" is a normal, valid answer
    // Guard the size here so we never try to send a huge base64 string to the server
    if (file.size > 4 * 1024 * 1024)
      return reject(new Error("The photo must be under 4 MB."));
    const reader = new FileReader();
    reader.onload = function () {
      const result = String(reader.result); // looks like "data:image/jpeg;base64,AAAA..."
      const comma = result.indexOf(","); // the real base64 starts after the first comma
      // The API wants the media type and the raw base64 on their own, without the "data:...," prefix
      resolve({ media_type: file.type, data: result.slice(comma + 1) });
    };
    reader.onerror = function () {
      reject(new Error("Could not read the photo."));
    };
    reader.readAsDataURL(file); // this is what fires onload above with the base64 result
  });
}

// Diagnose button: validate, optionally read the photo, then POST everything to /api/diagnose
diagBtn.addEventListener("click", function () {
  hideBox(diagMsg);
  diagResult.hidden = true; // hide any diagnosis from a previous run
  diagResult.replaceChildren();

  const plantId = diagPlant.value;
  const symptoms = diagSymptoms.value.trim();
  if (!plantId) {
    setBox(diagMsg, "error", [
      "Please add a plant first, then choose it here.",
    ]);
    return;
  }
  if (symptoms.length < 5) {
    setBox(diagMsg, "error", ["Please describe the symptoms."]);
    return;
  } // need something to go on

  diagBtn.disabled = true; // the AI call takes a few seconds; block a second click
  diagBtn.textContent = "Diagnosing..."; // and tell the user it is working

  readPhoto()
    .then(function (image) {
      const payload = { plant_id: plantId, symptoms: symptoms };
      if (image) payload.image = image; // only include the photo key when there actually is a photo
      return fetch("/api/diagnose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
    })
    .then(function (r) {
      if (r.status === 401) {
        window.location.href = "/login.html";
        return;
      } // session ended
      return r.json().then(function (body) {
        return { status: r.status, body: body };
      });
    })
    .then(function (resp) {
      if (!resp) return;
      if (resp.status === 200 && resp.body.diagnosis) {
        diagResult.textContent = resp.body.diagnosis; // textContent + CSS pre-wrap keeps the model's line breaks
        diagResult.hidden = false;
      } else {
        setBox(diagMsg, "error", [
          resp.body.error || "The diagnosis could not be completed.",
        ]);
      }
    })
    .catch(function (e) {
      setBox(diagMsg, "error", [e.message || "Something went wrong."]);
    }) // e.g. the photo-too-big error
    .then(function () {
      diagBtn.disabled = false;
      diagBtn.textContent = "Diagnose";
    }); // always re-enable, success or fail
});
