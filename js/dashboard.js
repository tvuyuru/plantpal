/* ==========================================================
   PlantPal - dashboard.js  (used on dashboard.html)

   What it does:
     1. Asks the server for the logged-in user's plants (GET /api/plants)
     2. Fills the two stat numbers: "Total plants" and "Need water this week"
     3. Builds the "WATER TODAY" checklist (plants due today or overdue)
     4. Builds the "Upcoming watering" table (plants that have a schedule, soonest first)
   This page only reads data - the add/edit/delete actions live on the other pages.
   All plant text is put on the page with textContent (never innerHTML), so a plant
   named like "<script>" is shown as plain text and can never run as HTML.
   ========================================================== */

// Works out a plant's next watering date from its last-watered date and interval
function nextDate(p) {
  if (!p.last_watered || !p.water_every_days) return null; // no date or no interval = no schedule
  // last_watered is "YYYY-MM-DD" text, so build the date from its parts to avoid a time-zone day shift
  const parts = p.last_watered.split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])); // month is 0-based here
  d.setDate(d.getDate() + Number(p.water_every_days)); // last watered + the interval = next due date
  return d;
}
// Returns how many days from today a date is (negative = overdue, 0 = today)
function daysFromToday(dt) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // compare whole days, ignore the time of day
  return Math.round((dt - today) / (1000 * 60 * 60 * 24)); // milliseconds between the two, turned into days
}
// Turns a day count into a short human label for the table
function label(days) {
  if (days < 0)
    return "Overdue by " + -days + " day" + (-days === 1 ? "" : "s"); // "day" vs "days"
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return "In " + days + " days";
}

// Load the plants, then build every part of the dashboard from them
fetch("/api/plants", { headers: { Accept: "application/json" } })
  .then(function (r) {
    if (r.status === 401) {
      window.location.href = "/login.html";
      return null;
    } // no session: go log in
    return r.json();
  })
  .then(function (plants) {
    if (!plants) return; // we were redirected to login, so there is nothing to draw

    // Pair each plant with its next watering date once, so we don't recompute it below
    const withNext = plants.map(function (p) {
      return { plant: p, next: nextDate(p) };
    });

    // --- the two stat numbers ---
    document.querySelector("#stat_total").textContent = plants.length; // total plants
    // "this week" = has a schedule and the next due date is 7 or fewer days away (overdue counts)
    const dueWeek = withNext.filter(function (x) {
      return x.next && daysFromToday(x.next) <= 7;
    });
    document.querySelector("#stat_week").textContent = dueWeek.length;

    // --- WATER TODAY checklist (due today or already overdue) ---
    const waterEl = document.querySelector("#water_today");
    const dueToday = withNext.filter(function (x) {
      return x.next && daysFromToday(x.next) <= 0;
    });
    if (dueToday.length === 0) {
      // Nothing due: show a friendly note instead of an empty box
      const note = document.createElement("p");
      note.className = "form-hint";
      note.textContent = "Nothing to water today.";
      waterEl.appendChild(note);
    } else {
      dueToday.forEach(function (x) {
        // One checkbox row per plant; the checkbox is a visual tick only (nothing is saved)
        const p = document.createElement("p");
        const lab = document.createElement("label");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "check-round";
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(" " + x.plant.name)); // text node so the name stays plain text
        p.appendChild(lab);
        waterEl.appendChild(p);
      });
    }

    // --- Upcoming watering table (only plants that have a schedule, soonest first) ---
    const table = document.querySelector("#upcoming_table");
    const scheduled = withNext
      .filter(function (x) {
        return x.next;
      }) // drop plants with no schedule
      .sort(function (a, b) {
        return a.next - b.next;
      }); // earliest due date first
    if (scheduled.length === 0) {
      // No schedules at all: show one row explaining how to get plants onto this table
      const tr = table.insertRow();
      const td = tr.insertCell();
      td.colSpan = 3; // span all three columns
      td.textContent =
        "No watering schedules yet. Add a last-watered date and interval to a plant.";
    } else {
      scheduled.forEach(function (x) {
        const tr = table.insertRow();
        tr.insertCell().textContent = x.plant.name; // Plant
        tr.insertCell().textContent = label(daysFromToday(x.next)); // When (Today / In 3 days / Overdue...)
        tr.insertCell().textContent = x.plant.notes || ""; // Notes (blank if none)
      });
    }
  })
  .catch(function () {
    /* on a network error just leave the dashboard blank rather than showing a broken page */
  });
