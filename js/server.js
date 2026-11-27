/* -- Plant Pal server -- 
What it does:
    1. Serves the site's HTML pages, CSS, images, and selected public JavaScript files.
    2. Provides GET /users, /me, /profile, and /logout, plus POST /register and /login.
    3. Login-gated pages (/dashboard, /plants, /add-plant, /diagnose) and the plant
       CRUD API (GET/POST/PUT/DELETE /api/plants), all scoped to the logged-in user.
    4. AI plant diagnosis: POST /api/diagnose calls the Claude API and saves the result.
    5. Connects to the plant_pal MySQL database; hashes passwords at registration
       and verifies them during login.
How to run it:
    1. Install Node.js (https://nodejs.org/en/download/) and MySQL
       (https://dev.mysql.com/downloads/mysql/).
    2. Add the plant tables.
    3. Set the ROOTPASS environment variable to the MySQL root password,
       and ANTHROPIC_API_KEY for the AI diagnosis.
    4. In a terminal, go to the js folder and run "npm install" to install dependencies.
    5. Run "node server.js" from that folder, then open http://localhost:3000/.
*/
const express = require("express"); //imports the express module
const path = require("path"); //built-in module for building file paths
const crypto = require("crypto"); //built-in module used to hash passwords
const app = express(); //creates the express application object
const session = require("express-session"); //built-in module for managing user sessions
const fs = require("fs"); //built-in module for reading files (used to read profile.html and insert the user's name)
app.use(express.urlencoded({ extended: true })); //lets us read the form fields from req.body
app.use(express.json({ limit: "12mb" })); //lets us read JSON bodies (plant data and the base64 photo for AI diagnosis)

// The session middleware keeps track of logged-in users. It stores a session ID in a cookie, and keeps the session data on the server. The cookie is httpOnly so it cannot be read by JavaScript, and secure is false because this site is not served over HTTPS.
app.use(
  session({
    secret: process.env.SESSION_SECRET || "plantpal_default-secret", // used to sign the session ID cookie; should be set to a random value in production
    resave: false, // don't save the session if nothing changed
    saveUninitialized: false, // don't create a session until something is stored
    cookie: {
      // No maxAge/expires means this is a session cookie: the login lasts until the
      // browser is closed or the user logs out.
      httpOnly: true, // prevents JavaScript from reading the cookie
      secure: false, // set to true if the site is served over HTTPS
    },
  }),
);

// The website files (html pages, css, images) are in the folder above this js folder.
const site = path.join(__dirname, "..");

// requireLogin blocks a page for logged-out visitors by sending them to the login page.
// It runs before every gated route below.
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login.html");
  next();
}

// Only these files are public. The js folder is not served as a whole because it contains
// the server code and node_modules. The server file is intentionally not exposed because it
// contains app configuration and environment-based settings. Only theme.js, user.js, login.js,
// and register.js are served.
app.use("/css", express.static(path.join(site, "css")));
app.use("/images", express.static(path.join(site, "images")));
app.get(
  [
    "/js/theme.js",
    "/js/user.js",
    "/js/login.js",
    "/js/register.js",
    "/js/plants.js",
    "/js/add-plant.js",
    "/js/dashboard.js",
    "/js/diagnose.js",
  ],
  function (req, res) {
    res.sendFile(path.basename(req.path).toLowerCase(), { root: __dirname });
  },
);

// The main pages are served by name, and the root path serves index.html
app.get("/", function (req, res) {
  res.sendFile("index.html", { root: site });
});
app.get(/^\/(index|login|register)\.html$/, function (req, res) {
  res.sendFile(req.path.slice(1), { root: site });
});

// Gated pages: only logged-in users get them; everyone else is redirected to login.
// The HTML files still live in the site folder; these routes guard them.
app.get("/dashboard", requireLogin, function (req, res) {
  res.sendFile("dashboard.html", { root: site });
});
app.get("/plants", requireLogin, function (req, res) {
  res.sendFile("plants.html", { root: site });
});
app.get("/add-plant", requireLogin, function (req, res) {
  res.sendFile("add-plant.html", { root: site });
});
app.get("/diagnose", requireLogin, function (req, res) {
  res.sendFile("diagnose.html", { root: site });
});

//---------- Step 1: connect to the database ----------
const mysql = require("mysql2"); //uses new mysql package
const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: process.env.ROOTPASS,
  database: "plant_pal",
  dateStrings: true,
});

conn.connect(function (err) {
  if (err) console.log("Couldnt connect to MySQL", err);
  else console.log("Database connection established");
});

// The server listens on port 3000 and opens the default browser to the site.
app.listen(3000, async function () {
  const { default: open } = await import("open"); // dynamic import because open() is an ES module
  console.log("PlantPal is running at http://localhost:3000/");
  open("http://localhost:3000/"); // opens the default browser to the site
});

// GET /users returns a list of all users, but without their password hashes or e-mails.
app.get("/users", function (req, res) {
  conn.query(
    "SELECT id, name, email, created_at FROM users",
    function (err, rows) {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(rows);
    },
  );
});

/* ---------- Step 2: password helpers ---------- */

// Turn a password into "salt:hash". A new random salt for every user means
// two users with the same password still get different hashes.
function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(plain, salt, 100000, 64, "sha512")
    .toString("hex");
  return salt + ":" + hash;
}

// Hash the typed password with the stored salt and compare it to the stored hash
function checkPassword(plain, stored) {
  const parts = stored.split(":");
  // Rows that are not in "salt:hash" form (like the made-up dummy hashes) can never match
  if (parts.length !== 2 || parts[1].length !== 128) return false;
  const hash = crypto.pbkdf2Sync(plain, parts[0], 100000, 64, "sha512");
  return crypto.timingSafeEqual(hash, Buffer.from(parts[1], "hex"));
}

// A fake stored value, used so a wrong username takes as long to answer as a wrong password
const DUMMY = hashPassword("not-a-real-password");

/* ---------- Replies and checks shared by /register and /login ---------- */

// The pages ask for JSON (Accept: application/json) and show the message on the page itself.
// A plain form post without JavaScript still gets the small HTML page the assignment describes.
function reply(req, res, status, errors, message, link, extra) {
  if ((req.get("Accept") || "").includes("application/json"))
    return res
      .status(status)
      .json(
        Object.assign(
          { ok: status < 400, message: message, errors: errors },
          extra,
        ),
      );
  res
    .status(status)
    .send(
      "<p>" + message + '</p><a href="' + link[0] + '">' + link[1] + "</a>",
    );
}

// The server checks the same rules as the browser, because anyone can send a request without using the page.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/;

// Returns a list of problems with the sign up fields (an empty list means all good).
// js/register.js applies the same rules in the browser, but the server must check again
// because anyone can send a request without using the page.
function checkRegistration(f) {
  const errors = [];
  if (!f.firstName) errors.push("Please enter your first name.");
  else if (f.firstName.length > 50)
    errors.push("First name can be at most 50 characters.");
  if (!f.lastName) errors.push("Please enter your last name.");
  else if (f.lastName.length > 50)
    errors.push("Last name can be at most 50 characters.");
  if (!USERNAME_RE.test(f.username))
    errors.push("Username must be 3 to 30 letters, numbers or underscores.");
  if (!EMAIL_RE.test(f.email) || f.email.length > 255)
    errors.push("Please enter a valid e-mail address.");
  if (
    f.password.length < 8 ||
    f.password.length > 100 ||
    !/[A-Za-z]/.test(f.password) ||
    !/[0-9]/.test(f.password)
  )
    errors.push(
      "Password must be at least 8 characters with a letter and a number.",
    );
  if (f.zip !== "" && !/^[0-9]{5}$/.test(f.zip))
    errors.push("Zip code must be 5 digits, or leave it empty.");
  return errors;
}

/* ---------- Step 3: POST /register ---------- */
// The server receives the fields, checks them, and either adds the user to the database or returns an error.
app.post("/register", function (req, res) {
  const f = {
    username: (req.body.username || "").trim(),
    firstName: (req.body.first_name || "").trim(),
    lastName: (req.body.last_name || "").trim(),
    email: (req.body.email || "").trim().toLowerCase(), // emails are stored in lowercase
    password: req.body.password || "",
    zip: (req.body.zip_code || "").trim(), // optional
  };

  const errors = checkRegistration(f);
  if (errors.length > 0)
    return reply(req, res, 400, errors, errors.join(" "), [
      "register.html",
      "Back to sign up",
    ]);

  // name (the display name shown on the site) is built from the first and last name
  const sql =
    "INSERT INTO users (username, first_name, last_name, name, email, zip_code, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)";
  const values = [
    f.username,
    f.firstName,
    f.lastName,
    f.firstName + " " + f.lastName,
    f.email,
    f.zip === "" ? null : f.zip,
    hashPassword(f.password),
  ];
  conn.query(sql, values, function (err) {
    if (err) {
      // Username or e-mail is already in the table (both columns are unique); the key name says which
      if (err.code === "ER_DUP_ENTRY") {
        const key = (
          (/for key '([^']+)'/.exec(err.sqlMessage || "") || [])[1] || ""
        ).toLowerCase();
        const msg = key.includes("email")
          ? "That e-mail is already registered."
          : key.includes("username")
            ? "That username is already taken."
            : "That username or e-mail is already registered.";
        return reply(req, res, 409, [msg], msg, [
          "register.html",
          "Back to sign up",
        ]);
      }
      console.log("There was an error registering a user", err);
      return reply(
        req,
        res,
        500,
        ["Something went wrong. Please try again."],
        "Something went wrong. Please try again.",
        ["register.html", "Back to sign up"],
      );
    }
    // Success! The server does not keep a session yet, so the user is not logged in automatically.
    reply(req, res, 200, [], "You have successfully registered", [
      "login.html",
      "Go to the login page",
    ]);
  });
});

/* ---------- Step 4: POST /login ---------- */
// The server receives the username and password, checks them, and either returns an error or a success message.
app.post("/login", function (req, res) {
  const username = (req.body.username || "").trim();
  const password = req.body.password || "";

  // Both fields must be filled in. The browser already checks this, but anyone can send a request without using the page.
  if (!username || !password) {
    const msg = "Please enter your username and password.";
    return reply(req, res, 400, [msg], msg, ["login.html", "Back to login"]);
  }

  // Only accounts created with a password can log in here (Google accounts have no password_hash)
  const sql =
    "SELECT id, username, first_name, last_name, password_hash FROM users WHERE username = ? AND auth_provider = 'local' AND password_hash IS NOT NULL";
  conn.query(sql, [username], function (err, rows) {
    if (err) {
      console.log("There was an error during login", err);
      return reply(
        req,
        res,
        500,
        ["Something went wrong. Please try again."],
        "Something went wrong. Please try again.",
        ["login.html", "Back to login"],
      );
    }

    // Unknown username: still run one hash check, then fail
    const found = rows.length > 0;
    const ok =
      checkPassword(password, found ? rows[0].password_hash : DUMMY) && found;

    if (!ok) {
      const msg = "Your login credentials were incorrect";
      return reply(req, res, 401, [msg], msg, ["login.html", "Back to login"]);
    }

    // Remember when this user last logged in
    conn.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [
      rows[0].id,
    ]);
    req.session.user = {
      id: rows[0].id,
      username: rows[0].username,
      first_name: rows[0].first_name,
      last_name: rows[0].last_name,
    }; // save the user info in the session
    reply(
      req,
      res,
      200,
      [],
      "You have logged in successfully",
      ["/dashboard", "Go to the dashboard"],
      { username: rows[0].username, first_name: rows[0].first_name },
    );
  });
});

/* ---------- Step 5: GET /profile ---------- */
// Turns characters like < and > into safe text, so a name or email can't run as HTML
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}

// The profile page is only accessible to logged-in users. It shows their name, username, email, zip code, and when they joined. The server reads profile.html and replaces {{field}} with the user's data.
app.get("/profile", function (req, res) {
  if (!req.session.user) return res.redirect("/login.html"); // redirect to login if not logged in

  const sql =
    "SELECT username, first_name, last_name, email, zip_code, created_at FROM users WHERE username = ?";
  conn.query(sql, [req.session.user.username], function (err, rows) {
    if (err || rows.length === 0) {
      console.log("There was an error loading the profile", err);
      return res.status(500).send("Error loading profile");
    }
    const u = rows[0];
    // Read profile.html and replace {{field}} with the user's data
    fs.readFile(
      path.join(site, "profile.html"),
      "utf8",
      function (readErr, html) {
        if (readErr) return res.status(500).send("Error loading profile");

        // Build the data object with the user's information, including initials and formatted member since date
        const initials = (
          (u.first_name[0] || "") + (u.last_name ? u.last_name[0] : "")
        ).toUpperCase();
        const memberSince = new Date(u.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const data = {
          initials: initials,
          full_name: (u.first_name + " " + (u.last_name || "")).trim(),
          username: u.username,
          email: u.email,
          zip: u.zip_code || "Not set", // zip is optional
          member_since: memberSince,
        };

        // Replace each {{field}} with its value, escaped so a name/email can't inject HTML
        const page = html.replace(/\{\{(\w+)\}\}/g, function (m, key) {
          return data[key] !== undefined ? escapeHtml(String(data[key])) : "";
        });
        res.send(page);
      },
    );
  });
});

/* ---------- Step 6: GET /logout ---------- */
// The logout link clears the session and redirects to the login page. The cookie is cleared so the browser does not send it again.
app.get("/logout", function (req, res) {
  req.session.destroy(function (err) {
    if (err) return res.send("Error logging out");
    res.clearCookie("connect.sid"); // connect.sid is the session cookie's name
    res.redirect("/login.html"); // send them to the login page
  });
});

/* ---------- Step 7: GET /me ---------- */
// The /me endpoint is used by js/user.js to find out if someone is logged in, and if so, what their name is. It returns JSON.
app.get("/me", function (req, res) {
  if (!req.session.user) return res.json({ loggedIn: false });
  res.json({
    loggedIn: true,
    username: req.session.user.username,
    first_name: req.session.user.first_name,
    last_name: req.session.user.last_name,
  });
});

/* ---------- Step 8: plant CRUD (create, read, update, delete) ---------- */
// Plants are the "content" for this site. Every route here runs requireLogin first and
// filters by the logged-in user's id, so a user can only read, change or delete their own plants.

// Checks the plant fields from the browser. Returns { ok, errors, values }.
// The browser checks the same things, but the server must check again because
// anyone can send a request without using the page.
function checkPlant(body) {
  const errors = [];
  const name = (body.name || "").trim();
  const species = (body.species || "").trim();
  const location = (body.location || "").trim();
  const notes = (body.notes || "").trim();
  const lastWatered = (body.last_watered || "").trim(); // "YYYY-MM-DD" or ""
  let waterEvery = body.water_every_days;

  if (!name) errors.push("Please enter a name for the plant.");
  else if (name.length > 100)
    errors.push("Name can be at most 100 characters.");
  if (species.length > 100)
    errors.push("Species can be at most 100 characters.");
  if (location.length > 100)
    errors.push("Location can be at most 100 characters.");
  if (notes.length > 1000) errors.push("Notes can be at most 1000 characters.");
  if (lastWatered !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(lastWatered))
    errors.push("Last watered must be a date.");

  if (waterEvery === "" || waterEvery === null || waterEvery === undefined) {
    waterEvery = null; // optional
  } else {
    waterEvery = Number(waterEvery);
    if (!Number.isInteger(waterEvery) || waterEvery < 1 || waterEvery > 365)
      errors.push("Water every N days must be a whole number from 1 to 365.");
  }

  return {
    ok: errors.length === 0,
    errors: errors,
    values: {
      name,
      species: species || null,
      location: location || null,
      notes: notes || null,
      last_watered: lastWatered || null,
      water_every_days: waterEvery,
    },
  };
}

// READ (list): the logged-in user's plants, newest first
app.get("/api/plants", requireLogin, function (req, res) {
  conn.query(
    "SELECT * FROM plants WHERE user_id = ? ORDER BY created_at DESC",
    [req.session.user.id],
    function (err, rows) {
      if (err) {
        console.log("Error listing plants", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(rows);
    },
  );
});

// READ (one): fills the edit form. 404 if the plant isn't this user's.
app.get("/api/plants/:id", requireLogin, function (req, res) {
  conn.query(
    "SELECT * FROM plants WHERE id = ? AND user_id = ?",
    [req.params.id, req.session.user.id],
    function (err, rows) {
      if (err) {
        console.log("Error reading plant", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (rows.length === 0)
        return res.status(404).json({ error: "Plant not found" });
      res.json(rows[0]);
    },
  );
});

// CREATE: add a plant for the logged-in user
app.post("/api/plants", requireLogin, function (req, res) {
  const check = checkPlant(req.body);
  if (!check.ok) return res.status(400).json({ errors: check.errors });
  const v = check.values;
  const sql =
    "INSERT INTO plants (user_id, name, species, location, notes, last_watered, water_every_days) VALUES (?, ?, ?, ?, ?, ?, ?)";
  conn.query(
    sql,
    [
      req.session.user.id,
      v.name,
      v.species,
      v.location,
      v.notes,
      v.last_watered,
      v.water_every_days,
    ],
    function (err, result) {
      if (err) {
        console.log("Error creating plant", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.status(201).json({ ok: true, id: result.insertId });
    },
  );
});

// UPDATE: change one of the user's plants.
app.put("/api/plants/:id", requireLogin, function (req, res) {
  const check = checkPlant(req.body);
  if (!check.ok) return res.status(400).json({ errors: check.errors });
  const v = check.values;
  const sql =
    "UPDATE plants SET name = ?, species = ?, location = ?, notes = ?, last_watered = ?, water_every_days = ? WHERE id = ? AND user_id = ?";
  conn.query(
    sql,
    [
      v.name,
      v.species,
      v.location,
      v.notes,
      v.last_watered,
      v.water_every_days,
      req.params.id,
      req.session.user.id,
    ],
    function (err, result) {
      if (err) {
        console.log("Error updating plant", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Plant not found" });
      res.json({ ok: true });
    },
  );
});

// DELETE: remove one of the user's plants
app.delete("/api/plants/:id", requireLogin, function (req, res) {
  conn.query(
    "DELETE FROM plants WHERE id = ? AND user_id = ?",
    [req.params.id, req.session.user.id],
    function (err, result) {
      if (err) {
        console.log("Error deleting plant", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Plant not found" });
      res.json({ ok: true });
    },
  );
});

/* ---------- Step 9: AI diagnosis (Claude API) ---------- */
// POST /api/diagnose takes a plant id, the user's typed symptoms and an optional photo (base64).
// It gathers the plant's details and its recent diagnoses as context, asks the Claude API for a
// concise diagnosis with steps, saves the result for history, and returns it.
const AI_MODEL = process.env.AI_MODEL || "claude-haiku-5-5"; // set AI_MODEL=claude-opus-5-5 for higher quality
const AI_VERSION = process.env.AI_ANTHROPIC_VERSION || "2023-06-01"; // Anthropic API version header
const AI_URL =
  process.env.AI_API_URL || "https://api.anthropic.com/v1/messages"; // the Claude Messages API
const ALLOWED_MEDIA = ["image/jpeg", "image/png", "image/gif", "image/webp"];

app.post("/api/diagnose", requireLogin, function (req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return res.status(500).json({
      error:
        "The AI key is not set. Set the ANTHROPIC_API_KEY environment variable and restart the server.",
    });

  const plantId = req.body.plant_id;
  const symptoms = (req.body.symptoms || "").trim();
  const image = req.body.image; // optional { media_type, data }  (data = base64 with no data: prefix)

  if (symptoms.length < 5)
    return res
      .status(400)
      .json({ error: "Please describe the symptoms (at least a few words)." });
  if (symptoms.length > 2000)
    return res
      .status(400)
      .json({ error: "Symptoms are too long (max 2000 characters)." });
  const hasImage =
    image &&
    ALLOWED_MEDIA.includes(image.media_type) &&
    typeof image.data === "string" &&
    image.data.length > 0;

  // The plant must belong to the logged-in user.
  conn.query(
    "SELECT * FROM plants WHERE id = ? AND user_id = ?",
    [plantId, req.session.user.id],
    function (err, rows) {
      if (err) {
        console.log("Diagnose: db error", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (rows.length === 0)
        return res.status(404).json({ error: "Plant not found" });
      const plant = rows[0];

      // Recent diagnosis history for this plant, used as extra context.
      conn.query(
        "SELECT symptoms, result, created_at FROM diagnoses WHERE plant_id = ? ORDER BY created_at DESC LIMIT 3",
        [plantId],
        function (hErr, history) {
          if (hErr) history = [];

          let context = "Plant name: " + plant.name + "\n";
          if (plant.species) context += "Species: " + plant.species + "\n";
          if (plant.location) context += "Location: " + plant.location + "\n";
          if (plant.water_every_days)
            context +=
              "Watering interval: every " + plant.water_every_days + " days\n";
          if (plant.last_watered)
            context += "Last watered: " + plant.last_watered + "\n";
          if (plant.notes) context += "Owner notes: " + plant.notes + "\n";
          if (history && history.length) {
            context += "\nPast diagnoses (most recent first):\n";
            history.forEach(function (h) {
              context +=
                "- " +
                h.created_at +
                ': symptoms "' +
                h.symptoms +
                '" -> ' +
                String(h.result).slice(0, 300) +
                "\n";
            });
          }

          const system =
            "You are a helpful houseplant care expert. Given a plant's details, its history, an optional photo and the owner's described symptoms, give a concise diagnosis of what is most likely wrong, then clear step-by-step actions to fix it. Keep it short and practical. If a photo is provided, use what you can see in it. If you are unsure, say so and suggest what to check. Only give plant-care advice.";
          const userText =
            context +
            "\nOwner's described symptoms: " +
            symptoms +
            "\n\nPlease respond with: (1) a one or two sentence diagnosis, then (2) a short numbered list of steps to fix it.";

          const content = [];
          if (hasImage)
            content.push({
              type: "image",
              source: {
                type: "base64",
                media_type: image.media_type,
                data: image.data,
              },
            });
          content.push({ type: "text", text: userText });

          const payload = {
            model: AI_MODEL,
            max_tokens: 1500,
            system: system,
            messages: [{ role: "user", content: content }],
          };

          fetch(AI_URL, {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": AI_VERSION,
              "content-type": "application/json",
            },
            body: JSON.stringify(payload),
          })
            .then(function (r) {
              return r.json().then(function (j) {
                return { status: r.status, body: j };
              });
            })
            .then(function (resp) {
              if (resp.status !== 200) {
                console.log("AI API error", resp.status, resp.body);
                const m =
                  (resp.body && resp.body.error && resp.body.error.message) ||
                  "The AI service returned an error.";
                return res.status(502).json({ error: m });
              }
              const text = (resp.body.content || [])
                .filter(function (c) {
                  return c.type === "text";
                })
                .map(function (c) {
                  return c.text;
                })
                .join("\n")
                .trim();
              if (!text)
                return res.status(502).json({
                  error: "The AI service returned an empty response.",
                });

              // Save the diagnosis so the plant keeps a history (used as context next time).
              conn.query(
                "INSERT INTO diagnoses (plant_id, user_id, symptoms, result) VALUES (?, ?, ?, ?)",
                [plantId, req.session.user.id, symptoms, text],
                function () {},
              );

              res.json({ ok: true, diagnosis: text });
            })
            .catch(function (e) {
              console.log("AI request failed", e);
              res.status(502).json({
                error: "Could not reach the AI service. Please try again.",
              });
            });
        },
      );
    },
  );
});

// READ the saved diagnosis history for one of the user's plants (newest first)
app.get("/api/plants/:id/diagnoses", requireLogin, function (req, res) {
  const sql =
    "SELECT d.id, d.symptoms, d.result, d.created_at FROM diagnoses d " +
    "JOIN plants p ON p.id = d.plant_id WHERE d.plant_id = ? AND p.user_id = ? ORDER BY d.created_at DESC";
  conn.query(sql, [req.params.id, req.session.user.id], function (err, rows) {
    if (err) {
      console.log("Error listing diagnoses", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});
