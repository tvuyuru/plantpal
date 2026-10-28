/* -- Plant Pal server -- 
What it does:
    1. Serves the site's HTML pages, CSS, images, and selected public JavaScript files.
    2. Provides GET /users and handles POST /register and POST /login.
    3. Connects to the plant_pal MySQL database; hashes passwords at registration
       and verifies them during login.
How to run it:
    1. Install Node.js (https://nodejs.org/en/download/) and MySQL
       (https://dev.mysql.com/downloads/mysql/).
    2. Create the database and tables using plant_pal.sql.
    3. Set the ROOTPASS environment variable to the MySQL root password.
    4. In a terminal, go to the js folder and run "npm install" to install dependencies.
    5. Run "node server.js" from that folder, then open http://localhost:3000/.
*/
const express = require("express"); //imports the express module
const path = require("path"); //built-in module for building file paths
const crypto = require("crypto"); //built-in module used to hash passwords
const app = express(); //creates the express application object
app.use(express.urlencoded({ extended: true })); //lets us read the form fields from req.body

// The website files (html pages, css, images) are in the folder above this js folder.
const site = path.join(__dirname, "..");

// Only these files are public. The js folder is not served as a whole because it contains
// the server code and node_modules. The server file is intentionally not exposed because it
// contains app configuration and environment-based settings. Only theme.js, user.js, login.js,
// and register.js are served.
app.use("/css", express.static(path.join(site, "css")));
app.use("/images", express.static(path.join(site, "images")));
app.get(["/js/theme.js", "/js/user.js", "/js/login.js", "/js/register.js"], function (req, res) {
    res.sendFile(path.basename(req.path).toLowerCase(), { root: __dirname });
});

// The main pages are served by name, and the root path serves index.html
app.get("/", function (req, res) {
    res.sendFile("index.html", { root: site });
});
app.get(/^\/(index|login|register|dashboard|plants|add-plant|profile)\.html$/, function (req, res) {
    res.sendFile(req.path.slice(1), { root: site });
});

//---------- Step 1: connect to the database ----------
const mysql = require("mysql2"); //uses new mysql package
const conn = mysql.createConnection(
{host:"localhost",user:"root",password:process.env.ROOTPASS,database:"plant_pal",port:3306});

conn.connect(function(err)
{
	if(err)
		console.log("Couldnt connect to MySQL",err);
	else
		console.log("Database connection established");
	
});
app.listen(3000);

// GET /users returns a list of all users, but without their password hashes or e-mails.
app.get("/users", function (req, res) {
    conn.query("SELECT id, name, email, created_at FROM users", function (err, rows) {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(rows);
    });
});

/* ---------- Step 2: password helpers ---------- */

// Turn a password into "salt:hash". A new random salt for every user means
// two users with the same password still get different hashes.
function hashPassword(plain) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(plain, salt, 100000, 64, "sha512").toString("hex");
    return salt + ":" + hash;
}

// Hash the typed password with the stored salt and compare it to the stored hash
function checkPassword(plain, stored) {
    const parts = stored.split(":");
    // Rows that are not in "salt:hash" form (like the made-up dummy hashes) can never match
    if (parts.length !== 2 || parts[1].length !== 128)
        return false;
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
        return res.status(status).json(Object.assign({ ok: status < 400, message: message, errors: errors }, extra));
    res.status(status).send("<p>" + message + '</p><a href="' + link[0] + '">' + link[1] + "</a>");
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
    else if (f.firstName.length > 50) errors.push("First name can be at most 50 characters.");
    if (!f.lastName) errors.push("Please enter your last name.");
    else if (f.lastName.length > 50) errors.push("Last name can be at most 50 characters.");
    if (!USERNAME_RE.test(f.username)) errors.push("Username must be 3 to 30 letters, numbers or underscores.");
    if (!EMAIL_RE.test(f.email) || f.email.length > 255) errors.push("Please enter a valid e-mail address.");
    if (f.password.length < 8 || f.password.length > 100 || !/[A-Za-z]/.test(f.password) || !/[0-9]/.test(f.password))
        errors.push("Password must be at least 8 characters with a letter and a number.");
    if (f.zip !== "" && !/^[0-9]{5}$/.test(f.zip)) errors.push("Zip code must be 5 digits, or leave it empty.");
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
        zip: (req.body.zip_code || "").trim() // optional
    };

    const errors = checkRegistration(f);
    if (errors.length > 0)
        return reply(req, res, 400, errors, errors.join(" "), ["register.html", "Back to sign up"]);

    // name (the display name shown on the site) is built from the first and last name
    const sql = "INSERT INTO users (username, first_name, last_name, name, email, zip_code, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)";
    const values = [f.username, f.firstName, f.lastName, f.firstName + " " + f.lastName, f.email, f.zip === "" ? null : f.zip, hashPassword(f.password)];
    conn.query(sql, values, function (err) {
        if (err) {
            // Username or e-mail is already in the table (both columns are unique); the key name says which
            if (err.code === "ER_DUP_ENTRY") {
                const key = ((/for key '([^']+)'/.exec(err.sqlMessage || "") || [])[1] || "").toLowerCase();
                const msg = key.includes("email") ? "That e-mail is already registered."
                          : key.includes("username") ? "That username is already taken."
                          : "That username or e-mail is already registered.";
                return reply(req, res, 409, [msg], msg, ["register.html", "Back to sign up"]);
            }
            console.log("There was an error registering a user", err);
            return reply(req, res, 500, ["Something went wrong. Please try again."], "Something went wrong. Please try again.", ["register.html", "Back to sign up"]);
        }
        // Success! The server does not keep a session yet, so the user is not logged in automatically.
        reply(req, res, 200, [], "You have successfully registered", ["login.html", "Go to the login page"]);
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
    const sql = "SELECT id, username, first_name, password_hash FROM users WHERE username = ? AND auth_provider = 'local' AND password_hash IS NOT NULL";
    conn.query(sql, [username], function (err, rows) {
        if (err) {
            console.log("There was an error during login", err);
            return reply(req, res, 500, ["Something went wrong. Please try again."], "Something went wrong. Please try again.", ["login.html", "Back to login"]);
        }

        // Unknown username: still run one hash check, then fail
        const found = rows.length > 0;
        const ok = checkPassword(password, found ? rows[0].password_hash : DUMMY) && found;

        if (!ok) {
            const msg = "Your login credentials were incorrect";
            return reply(req, res, 401, [msg], msg, ["login.html", "Back to login"]);
        }

        // Remember when this user last logged in
        conn.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [rows[0].id]);
        reply(req, res, 200, [], "You have logged in successfully", ["dashboard.html", "Go to the dashboard"],
              { username: rows[0].username, first_name: rows[0].first_name });
    });
});